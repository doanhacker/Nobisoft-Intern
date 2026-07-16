using System.Diagnostics;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Dapper;
using ImageMagick;
using indexing_worker.Models;
using Npgsql;

namespace indexing_worker.Services;

public class ImageProcessor
{
    private readonly ILogger<ImageProcessor> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    private readonly string _aiServiceUrl;
    private readonly string _qdrantUrl;
    private readonly string _connectionString;
    private readonly string _storageDir;

    private const int MaxResizeDimension = 1024;
    private const string QdrantCollection = "images";

    public ImageProcessor(ILogger<ImageProcessor> logger, IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;

        _aiServiceUrl = Environment.GetEnvironmentVariable("AI_SERVICE_URL") ?? "http://ai-service:9000";
        _qdrantUrl = Environment.GetEnvironmentVariable("QDRANT_URL") ?? "http://qdrant:6333";
        _storageDir = Environment.GetEnvironmentVariable("STORAGE_DIR") ?? "./storage";
        _connectionString = ParseConnectionString(
            Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? "postgresql://postgres:postgres@database:5432/VisualSearchEngine"
        );
    }

    public async Task<bool> ProcessAsync(ImageMessage image, CancellationToken ct)
    {
        var stopwatch = Stopwatch.StartNew();

        // 1. Đọc file ảnh
        var filePath = ResolveFilePath(image.Path);
        if (!File.Exists(filePath))
        {
            _logger.LogError("File không tồn tại: {Path}", filePath);
            await UpdateIndexStatus(image.Id, "FAILED", 0);
            return false;
        }

        try
        {
            // 2. Resize ảnh và lấy kích thước nguyên bản
            var (resizedBytes, originalWidth, originalHeight) = await ResizeImageAsync(filePath, ct);
            var originalExt = Path.GetExtension(filePath).TrimStart('.');

            // 3. Gọi AI Service
            var aiResult = await CallAiServiceAsync(resizedBytes, image.Id, originalExt, ct);
            if (aiResult == null || !aiResult.Success || aiResult.Data == null)
            {
                _logger.LogError("AI Service thất bại cho ảnh {Id}: {Err}", image.Id, aiResult?.ErrorMessage);
                await UpdateIndexStatus(image.Id, "FAILED", (int)stopwatch.ElapsedMilliseconds);
                return false;
            }

            // 4. Lưu vector vào Qdrant
            var hasOcr = aiResult.Data.OcrLines.Count > 0;
            await UpsertQdrantAsync(image.Id, aiResult.Data.Embedding, image.Path, originalExt, hasOcr, ct);

            // 5. Lưu OCR + cập nhật status và kích thước trong PostgreSQL
            await SaveToPostgresAsync(image.Id, aiResult.Data.OcrLines, (int)stopwatch.ElapsedMilliseconds, originalWidth, originalHeight);

            _logger.LogInformation("Xử lý ảnh {Id} thành công ({Ms}ms, {OcrCount} dòng OCR)",
                image.Id, stopwatch.ElapsedMilliseconds, aiResult.Data.OcrLines.Count);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi xử lý ảnh {Id}", image.Id);
            await UpdateIndexStatus(image.Id, "FAILED", (int)stopwatch.ElapsedMilliseconds);
            return false;
        }
    }

    // ── Resize ảnh (giảm kích thước trước khi gửi AI) ──

    private async Task<(byte[] Bytes, int Width, int Height)> ResizeImageAsync(string filePath, CancellationToken ct)
    {
        return await Task.Run(() =>
        {
            using var image = new MagickImage(filePath);
            int originalWidth = (int)image.Width;
            int originalHeight = (int)image.Height;

            if (image.Width > MaxResizeDimension || image.Height > MaxResizeDimension)
            {
                var size = new MagickGeometry(MaxResizeDimension, MaxResizeDimension);
                image.Resize(size);
                _logger.LogInformation("Resize ảnh (ImageMagick): {W}x{H} → {MaxDim}px max", originalWidth, originalHeight, MaxResizeDimension);
            }

            image.Format = MagickFormat.Jpeg; // Đảm bảo đầu ra luôn là JPEG
            return (image.ToByteArray(), originalWidth, originalHeight);
        }, ct);
    }

    // Gọi AI Service

    private async Task<AiProcessResponse?> CallAiServiceAsync(byte[] imageBytes, string imageId, string ext, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(imageBytes);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue($"image/{(ext == "jpg" ? "jpeg" : ext)}");
        content.Add(fileContent, "image", $"{imageId}.{ext}");

        var response = await client.PostAsync($"{_aiServiceUrl}/api/process-image", content, ct);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<AiProcessResponse>(cancellationToken: ct);
    }

    // Lưu vector vào Qdrant

    private async Task UpsertQdrantAsync(string imageId, List<float> embedding, string path, string fileFormat, bool hasOcr, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        var payload = new
        {
            points = new[]
            {
                new
                {
                    id = imageId,
                    vector = embedding,
                    payload = new { imageId, path, fileFormat, hasOcr }
                }
            }
        };

        var json = JsonSerializer.Serialize(payload);
        var httpContent = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PutAsync($"{_qdrantUrl}/collections/{QdrantCollection}/points", httpContent, ct);
        response.EnsureSuccessStatusCode();
    }

    // ── Lưu kết quả vào PostgreSQL ──

    private async Task SaveToPostgresAsync(string imageId, List<OcrLineResult> ocrLines, int durationMs, int width, int height)
    {
        var imageGuid = Guid.Parse(imageId);
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        try
        {
            // Lấy imageIndex ID dưới dạng Guid
            var indexGuid = await conn.QuerySingleOrDefaultAsync<Guid?>(
                "SELECT id FROM image_index WHERE \"imageId\" = @ImageId",
                new { ImageId = imageGuid }, tx
            );

            if (indexGuid == null)
            {
                _logger.LogError("Không tìm thấy image_index cho ảnh {Id}", imageId);
                await tx.RollbackAsync();
                return;
            }

            // Cập nhật width, height của ảnh gốc trong bảng images
            await conn.ExecuteAsync(@"
                UPDATE images
                SET width = @Width, height = @Height
                WHERE id = @ImageId",
                new { Width = width, Height = height, ImageId = imageGuid }, tx
            );

            // Insert OCR lines
            foreach (var line in ocrLines)
            {
                var boundingJson = line.BoundingBox != null
                    ? JsonSerializer.Serialize(line.BoundingBox)
                    : null;

                await conn.ExecuteAsync(@"
                    INSERT INTO image_ocr (id, ""imageIndexId"", ""rawText"", ""normalizedText"", ""confidenceScore"", ""boundingBoxes"")
                    VALUES (gen_random_uuid(), @IndexId, @RawText, @NormalizedText, @ConfidenceScore, @BoundingBoxes::jsonb)",
                    new
                    {
                        IndexId = indexGuid.Value,
                        line.RawText,
                        NormalizedText = line.RawText.ToLowerInvariant().Trim(),
                        line.ConfidenceScore,
                        BoundingBoxes = boundingJson
                    }, tx
                );
            }

            // Cập nhật status thành SUCCESS
            await conn.ExecuteAsync(@"
                UPDATE image_index
                SET status = 'SUCCESS'::""IndexStatus"", ""processDurationMs"" = @Duration, ""indexedAt"" = NOW()
                WHERE ""imageId"" = @ImageId",
                new { Duration = durationMs, ImageId = imageGuid }, tx
            );

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // Cập nhật trạng thái FAILED khi lỗi
    private async Task UpdateIndexStatus(string imageId, string status, int durationMs)
    {
        try
        {
            var imageGuid = Guid.Parse(imageId);
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            await conn.ExecuteAsync(@"
                UPDATE image_index
                SET status = @Status::""IndexStatus"", ""processDurationMs"" = @Duration, ""indexedAt"" = NOW()
                WHERE ""imageId"" = @ImageId",
                new { Status = status, Duration = durationMs, ImageId = imageGuid }
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Không thể cập nhật status cho ảnh {Id}", imageId);
        }
    }

    // Helpers

    private string ResolveFilePath(string messagePath)
    {
        var fileName = Path.GetFileName(messagePath);
        return Path.Combine(_storageDir, "images", "index", fileName);
    }

    private static string ParseConnectionString(string databaseUrl)
    {
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':');
        return $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]}";
    }
}
