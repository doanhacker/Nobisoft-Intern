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

        // Đảm bảo queue tồn tại (durable = true, khớp với backend)
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

    private async Task HandleMessageAsync(BasicDeliverEventArgs ea, CancellationToken ct)
    {
        var body = Encoding.UTF8.GetString(ea.Body.ToArray());

        try
        {
            var images = JsonSerializer.Deserialize<List<ImageMessage>>(body, JsonOptions);

            if (images == null || images.Count == 0)
            {
                _logger.LogWarning("Message rỗng hoặc không parse được. Bỏ qua.");
                _channel?.BasicAck(ea.DeliveryTag, multiple: false);
                return;
            }

            _logger.LogInformation("Nhận batch {Count} ảnh từ RabbitMQ.", images.Count);

            // Gọi ProcessBatchAsync — tự động chia thành các batch tối đa 4 ảnh
            // và gọi AI Service batch endpoint cho mỗi batch
            var (success, failed) = await _processor.ProcessBatchAsync(images, ct);

            _logger.LogInformation("Batch hoàn tất: {Success} thành công, {Failed} thất bại.", success, failed);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Lỗi parse JSON message: {Body}", body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi không xác định khi xử lý message.");
        }
        finally
        {
            // Luôn ACK để tránh message bị kẹt trong queue
            _channel?.BasicAck(ea.DeliveryTag, multiple: false);
        }
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
