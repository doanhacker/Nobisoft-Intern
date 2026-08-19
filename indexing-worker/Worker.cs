using System.Text;
using System.Text.Json;
using indexing_worker.Models;
using indexing_worker.Services;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace indexing_worker;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly ImageProcessor _processor;

    private readonly string _rabbitMqUrl;
    private const string QueueName = "image_indexing_queue";

    private IConnection? _connection;
    private IModel? _channel;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public Worker(ILogger<Worker> logger, ImageProcessor processor)
    {
        _logger = logger;
        _processor = processor;
        _rabbitMqUrl = Environment.GetEnvironmentVariable("RABBITMQ_URL")
                       ?? "amqp://guest:guest@localhost:5672";
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Chờ RabbitMQ sẵn sàng
        await ConnectWithRetryAsync(stoppingToken);

        if (_channel == null)
        {
            _logger.LogCritical("Không thể kết nối RabbitMQ. Worker dừng.");
            return;
        }

        // Đảm bảo queue tồn tại
        _channel.QueueDeclare(queue: QueueName, durable: true, exclusive: false, autoDelete: false);

        // Prefetch 1 message tại 1 thời điểm
        _channel.BasicQos(prefetchSize: 0, prefetchCount: 1, global: false);

        var consumer = new EventingBasicConsumer(_channel);
        consumer.Received += async (_, ea) =>
        {
            await HandleMessageAsync(ea, stoppingToken);
        };

        _channel.BasicConsume(queue: QueueName, autoAck: false, consumer: consumer);
        _logger.LogInformation("Đang lắng nghe queue '{Queue}'...", QueueName);

        // Giữ worker chạy cho đến khi bị cancel
        try
        {
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (OperationCanceledException)
        {
        }
    }

    private const int MaxRetryCount = 3;

    private async Task HandleMessageAsync(BasicDeliverEventArgs ea, CancellationToken ct)
    {
        var body = Encoding.UTF8.GetString(ea.Body.ToArray());
        IndexingMessage? message = null;

        try
        {
            message = JsonSerializer.Deserialize<IndexingMessage>(body, JsonOptions);

            if (message == null || message.Images.Count == 0 || string.IsNullOrEmpty(message.BatchId))
            {
                // Lỗi không thể khắc phục → ACK và bỏ qua
                _logger.LogWarning("Message không hợp lệ hoặc thiếu dữ liệu. ACK và bỏ qua.");
                _channel?.BasicAck(ea.DeliveryTag, multiple: false);
                return;
            }

            if (message.RetryCount > 0)
            {
                _logger.LogInformation("Retry lần {Retry}/{Max} cho {Count} ảnh (batch {BatchId}).",
                    message.RetryCount, MaxRetryCount, message.Images.Count, message.BatchId);
            }
            else
            {
                _logger.LogInformation("Nhận {Count} ảnh (batch {BatchId}) từ RabbitMQ.",
                    message.Images.Count, message.BatchId);
            }

            // ProcessBatchAsync xử lý lỗi ở cấp độ từng ảnh:
            // - Lỗi không thể khắc phục (file hỏng/thiếu/URL lỗi) -> ERROR trong DB, tính vào failedCount
            // - Lỗi từ AI Service -> FAILED trong DB, gom vào danh sách AiFailedImages để retry
            var result = await _processor.ProcessBatchAsync(message.BatchId, message.Images, ct);

            _logger.LogInformation("Hoàn tất {Count} ảnh (batch {BatchId}): {Success} thành công, {Failed} thất bại.",
                message.Images.Count, message.BatchId, result.Success, result.Failed);

            // Xử lý các ảnh bị lỗi do AI Service (cần retry)
            if (result.AiFailedImages.Count > 0)
            {
                if (message.RetryCount < MaxRetryCount)
                {
                    var nextRetry = message.RetryCount + 1;
                    _logger.LogWarning("Republish {Count} ảnh AI-failed (retry {Retry}/{Max}) cho batch {BatchId}.",
                        result.AiFailedImages.Count, nextRetry, MaxRetryCount, message.BatchId);

                    PublishRetryMessage(message.BatchId, result.AiFailedImages, nextRetry);
                }
                else
                {
                    _logger.LogError("{Count} ảnh trong batch {BatchId} đã retry {Max} lần thất bại. Đổi status thành ERROR.",
                        result.AiFailedImages.Count, MaxRetryCount, message.BatchId);

                    foreach (var img in result.AiFailedImages)
                    {
                        await _processor.MarkImageAsErrorAsync(message.BatchId, img.Id);
                    }
                }
            }

            // ACK message hiện tại sau khi đã xử lý xong và republish các ảnh cần retry
            _channel?.BasicAck(ea.DeliveryTag, multiple: false);
        }
        catch (JsonException ex)
        {
            // Message sai format JSON → không thể parse → ACK và bỏ qua
            _logger.LogError(ex, "Lỗi parse JSON (bỏ qua message): {Body}", body);
            _channel?.BasicAck(ea.DeliveryTag, multiple: false);
        }
        catch (AiServiceUnavailableException ex)
        {
            // AI Service không phục hồi sau thời gian chờ tối đa (5 phút)
            // Phương án B: Republish lại danh sách ảnh với retryCount giữ nguyên để xử lý sau khi AI sống lại
            _logger.LogError(ex, "AI Service không khả dụng sau thời gian chờ tối đa. Trả {Count} ảnh vào queue với retry giữ nguyên.",
                message?.Images.Count ?? 0);

            if (message != null && message.Images.Count > 0)
            {
                PublishRetryMessage(message.BatchId, message.Images, message.RetryCount);
            }

            _channel?.BasicAck(ea.DeliveryTag, multiple: false);
        }
        catch (OperationCanceledException)
        {
            // Worker đang shutdown → trả message lại queue để worker khác xử lý
            _logger.LogWarning("Worker đang dừng, trả message lại queue.");
            _channel?.BasicNack(ea.DeliveryTag, multiple: false, requeue: true);
        }
        catch (Exception ex)
        {
            // Lỗi không mong đợi
            _logger.LogError(ex, "Lỗi không mong đợi khi xử lý message. ACK để tránh duplicate.");
            _channel?.BasicAck(ea.DeliveryTag, multiple: false);
        }
    }

    private void PublishRetryMessage(string batchId, List<ImageItem> images, int retryCount)
    {
        if (_channel == null || images.Count == 0) return;

        var retryMessage = new IndexingMessage
        {
            BatchId = batchId,
            Images = images,
            RetryCount = retryCount
        };

        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(retryMessage, JsonOptions));
        var properties = _channel.CreateBasicProperties();
        properties.Persistent = true;

        _channel.BasicPublish(
            exchange: "",
            routingKey: QueueName,
            basicProperties: properties,
            body: body
        );
    }

    // Kết nối với RabbitMQ
    private async Task ConnectWithRetryAsync(CancellationToken ct)
    {
        var factory = new ConnectionFactory { Uri = new Uri(_rabbitMqUrl) };
        const int maxRetries = 10;

        for (var i = 1; i <= maxRetries; i++)
        {
            try
            {
                _connection = factory.CreateConnection();
                _channel = _connection.CreateModel();
                _logger.LogInformation("Kết nối RabbitMQ thành công.");
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi kết nối RabbitMQ (lần {Attempt}/{Max})...", i, maxRetries);
                if (i < maxRetries)
                    await Task.Delay(5000, ct);
            }
        }
    }

    public override void Dispose()
    {
        _channel?.Close();
        _connection?.Close();
        _channel?.Dispose();
        _connection?.Dispose();
        base.Dispose();
    }
}
