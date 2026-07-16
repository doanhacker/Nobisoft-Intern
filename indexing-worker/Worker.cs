namespace indexing_worker;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;

    public Worker(ILogger<Worker> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Indexing Worker đã khởi động.");
        _logger.LogInformation("RABBITMQ_URL = {Url}", Environment.GetEnvironmentVariable("RABBITMQ_URL") ?? "(chưa cấu hình)");
        _logger.LogInformation("AI_SERVICE_URL = {Url}", Environment.GetEnvironmentVariable("AI_SERVICE_URL") ?? "(chưa cấu hình)");
        _logger.LogInformation("DATABASE_URL = {Url}", Environment.GetEnvironmentVariable("DATABASE_URL") != null ? "(đã cấu hình)" : "(chưa cấu hình)");
        _logger.LogInformation("QDRANT_URL = {Url}", Environment.GetEnvironmentVariable("QDRANT_URL") ?? "(chưa cấu hình)");
        _logger.LogInformation("STORAGE_DIR = {Dir}", Environment.GetEnvironmentVariable("STORAGE_DIR") ?? "(chưa cấu hình)");

        while (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("Worker đang chờ message từ RabbitMQ... ({Time})", DateTimeOffset.Now);
            await Task.Delay(10_000, stoppingToken);
        }

        _logger.LogInformation("Indexing Worker đã dừng.");
    }
}
