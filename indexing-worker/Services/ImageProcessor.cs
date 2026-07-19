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
    private const int BatchSize = 4;
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

    /// Xử lý danh sách ảnh: gom batch tối đa 4 ảnh, gọi AI Service 1 lần,
    /// rồi lưu từng kết quả vào Qdrant + PostgreSQL.
    /// Sau khi xử lý xong, kiểm tra và cập nhật trạng thái batch.
    public async Task<(int Success, int Failed)> ProcessBatchAsync(string batchId, List<ImageItem> images, CancellationToken ct)
    {
        var totalSuccess = 0;
        var totalFailed = 0;

        // Chia danh sách thành các batch nhỏ tối đa 4 ảnh
        for (var i = 0; i < images.Count; i += BatchSize)
        {
            var batch = images.Skip(i).Take(BatchSize).ToList();
            var (s, f) = await ProcessSingleBatchAsync(batchId, batch, ct);
            totalSuccess += s;
            totalFailed += f;
        }

        return (totalSuccess, totalFailed);
    }

    /// Xử lý theo batch: resize → gọi AI batch endpoint → lưu kết quả.
    private async Task<(int Success, int Failed)> ProcessSingleBatchAsync(string batchId, List<ImageItem> batch, CancellationToken ct)
    {
        var stopwatch = Stopwatch.StartNew();
        var success = 0;
        var failed = 0;

        // 1. Resize tất cả ảnh và chuẩn bị dữ liệu
        var preparedImages = new List<(ImageItem Message, byte[] Bytes, int OrigWidth, int OrigHeight, string Ext)>();

        foreach (var image in batch)
        {
            var filePath = ResolveFilePath(image.Path);
            if (!File.Exists(filePath))
            {
                _logger.LogError("File không tồn tại: {Path}", filePath);
                await UpdateIndexStatus(image.Id, "FAILED");
                await IncrementBatchProgressAsync(batchId, 0, 1);
                failed++;
                continue;
            }

            try
            {
                var (resizedBytes, originalWidth, originalHeight) = await ResizeImageAsync(filePath, ct);
                var ext = Path.GetExtension(filePath).TrimStart('.');
                preparedImages.Add((image, resizedBytes, originalWidth, originalHeight, ext));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi resize ảnh {Id}", image.Id);
                await UpdateIndexStatus(image.Id, "FAILED");
                await IncrementBatchProgressAsync(batchId, 0, 1);
                failed++;
            }
        }

        if (preparedImages.Count == 0)
            return (success, failed);

        // 2. Gọi AI Service batch endpoint
        BatchIndexingResponse? batchResponse;
        try
        {
            batchResponse = await CallAiBatchAsync(preparedImages, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI Service batch call thất bại");
            foreach (var img in preparedImages)
            {
                await UpdateIndexStatus(img.Message.Id, "FAILED");
                await IncrementBatchProgressAsync(batchId, 0, 1);
                failed++;
            }
            return (success, failed);
        }

        if (batchResponse == null || batchResponse.Results.Count == 0)
        {
            _logger.LogError("AI Service trả về response rỗng");
            foreach (var img in preparedImages)
            {
                await UpdateIndexStatus(img.Message.Id, "FAILED");
                await IncrementBatchProgressAsync(batchId, 0, 1);
                failed++;
            }
            return (success, failed);
        }

        // Lấy tổng thời gian xử lý AI cho batch này
        var batchDurationMs = (int)batchResponse.ProcessingTimeMs;

        // 3. Xử lý từng kết quả: lưu Qdrant + PostgreSQL
        var imageLookup = preparedImages.ToDictionary(p => p.Message.Id);

        foreach (var result in batchResponse.Results)
        {
            if (!result.Success || result.Embedding.Count == 0)
            {
                _logger.LogError("AI thất bại cho ảnh {Id}: {Err}", result.ImageId, result.Error);
                await UpdateIndexStatus(result.ImageId, "FAILED");
                await IncrementBatchProgressAsync(batchId, 0, 1);
                failed++;
                continue;
            }

            try
            {
                string originalExt;
                int originalWidth;
                int originalHeight;
                string imagePath;

                if (imageLookup.TryGetValue(result.ImageId, out var prepared))
                {
                    originalExt = prepared.Ext;
                    originalWidth = prepared.OrigWidth;
                    originalHeight = prepared.OrigHeight;
                    imagePath = prepared.Message.Path;
                }
                else
                {
                    originalExt = "jpg";
                    originalWidth = result.Metadata?.Width ?? 0;
                    originalHeight = result.Metadata?.Height ?? 0;
                    imagePath = "";
                }

                // Lưu vector vào Qdrant
                var hasOcr = result.OcrResults.Count > 0;
                await UpsertQdrantAsync(result.ImageId, result.Embedding, imagePath, originalExt, hasOcr, ct);

                // Lưu OCR + cập nhật status trong PostgreSQL
                await SaveToPostgresAsync(result.ImageId, result.OcrResults, originalWidth, originalHeight);

                _logger.LogInformation("Xử lý ảnh {Id} thành công ({OcrCount} dòng OCR)",
                    result.ImageId, result.OcrResults.Count);
                success++;
                await IncrementBatchProgressAsync(batchId, 1, 0);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi lưu kết quả ảnh {Id}", result.ImageId);
                await UpdateIndexStatus(result.ImageId, "FAILED");
                await IncrementBatchProgressAsync(batchId, 0, 1);
                failed++;
            }
        }

        // Cập nhật tổng thời gian cho batch này vào database
        await UpdateBatchDurationAsync(batchId, batchDurationMs);

        return (success, failed);
    }

    // ── Cập nhật tiến độ batch cộng dồn (Real-time) & check hoàn thành ──

    private async Task IncrementBatchProgressAsync(string batchId, int successInc, int failedInc)
    {
        try
        {
            var batchGuid = Guid.Parse(batchId);
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            // Cập nhật nguyên tử cộng dồn vào database và trả về trạng thái mới nhất
            var updatedBatch = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                UPDATE batch_index
                SET ""successCount"" = ""successCount"" + @SuccessInc,
                    ""failedCount"" = ""failedCount"" + @FailedInc,
                    ""updatedAt"" = NOW()
                WHERE id = @BatchId
                RETURNING ""successCount"", ""failedCount"", ""totalImages"", status::text AS status",
                new { SuccessInc = successInc, FailedInc = failedInc, BatchId = batchGuid }
            );

            if (updatedBatch == null) return;

            int currentProcessed = (int)updatedBatch.successCount + (int)updatedBatch.failedCount;
            int totalImages = (int)updatedBatch.totalImages;
            string status = updatedBatch.status;

            // Nếu FE đã đánh dấu hết ảnh upload (PROCESSING) và đã xử lý hết
            if (status == "PROCESSING" && currentProcessed >= totalImages)
            {
                await conn.ExecuteAsync(@"
                    UPDATE batch_index
                    SET status = 'COMPLETED'::""BatchStatus"",
                        ""updatedAt"" = NOW()
                    WHERE id = @BatchId",
                    new { BatchId = batchGuid }
                );
                _logger.LogInformation("Batch {BatchId} COMPLETED: {Success} thành công, {Failed} thất bại (tổng cộng).", batchId, (int)updatedBatch.successCount, (int)updatedBatch.failedCount);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi cập nhật tiến độ batch {BatchId}", batchId);
        }
    }

    private async Task UpdateBatchDurationAsync(string batchId, int durationMs)
    {
        try
        {
            var batchGuid = Guid.Parse(batchId);
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            await conn.ExecuteAsync(@"
                UPDATE batch_index
                SET ""totalDurationMs"" = COALESCE(""totalDurationMs"", 0) + @Duration,
                    ""updatedAt"" = NOW()
                WHERE id = @BatchId",
                new { Duration = durationMs, BatchId = batchGuid }
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi cập nhật thời gian xử lý cho batch {BatchId}", batchId);
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

    // ── Gọi AI Service batch endpoint ──

    private async Task<BatchIndexingResponse?> CallAiBatchAsync(
        List<(ImageItem Message, byte[] Bytes, int OrigWidth, int OrigHeight, string Ext)> preparedImages,
        CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        using var content = new MultipartFormDataContent();

        // Thêm image_ids dưới dạng JSON array
        var imageIds = preparedImages.Select(p => p.Message.Id).ToList();
        content.Add(new StringContent(JsonSerializer.Serialize(imageIds)), "image_ids");

        // Thêm từng file ảnh
        foreach (var (message, bytes, _, _, ext) in preparedImages)
        {
            var fileContent = new ByteArrayContent(bytes);
            fileContent.Headers.ContentType =
                new System.Net.Http.Headers.MediaTypeHeaderValue($"image/{(ext == "jpg" ? "jpeg" : ext)}");
            content.Add(fileContent, "images", $"{message.Id}.{ext}");
        }

        var response = await client.PostAsync($"{_aiServiceUrl}/api/indexing/batch", content, ct);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<BatchIndexingResponse>(cancellationToken: ct);
    }

    // ── Lưu vector vào Qdrant ──

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

    private async Task SaveToPostgresAsync(string imageId, List<OcrResultItem> ocrResults, int width, int height)
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
            foreach (var ocr in ocrResults)
            {
                var boundingJson = ocr.BoundingBox.Count > 0
                    ? JsonSerializer.Serialize(ocr.BoundingBox)
                    : null;

                await conn.ExecuteAsync(@"
                    INSERT INTO image_ocr (id, ""imageIndexId"", ""rawText"", ""normalizedText"", ""confidenceScore"", ""boundingBoxes"")
                    VALUES (gen_random_uuid(), @IndexId, @RawText, @NormalizedText, @ConfidenceScore, @BoundingBoxes::jsonb)",
                    new
                    {
                        IndexId = indexGuid.Value,
                        RawText = ocr.Text,
                        NormalizedText = ocr.NormalizedText,
                        ConfidenceScore = ocr.Confidence,
                        BoundingBoxes = boundingJson
                    }, tx
                );
            }

            // Cập nhật status thành SUCCESS
            await conn.ExecuteAsync(@"
                UPDATE image_index
                SET status = 'SUCCESS'::""IndexStatus"", ""indexedAt"" = NOW()
                WHERE ""imageId"" = @ImageId",
                new { ImageId = imageGuid }, tx
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
    private async Task UpdateIndexStatus(string imageId, string status)
    {
        try
        {
            var imageGuid = Guid.Parse(imageId);
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            await conn.ExecuteAsync(@"
                UPDATE image_index
                SET status = @Status::""IndexStatus"", ""indexedAt"" = NOW()
                WHERE ""imageId"" = @ImageId",
                new { Status = status, ImageId = imageGuid }
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
