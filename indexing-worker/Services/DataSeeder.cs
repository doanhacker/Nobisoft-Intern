using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Dapper;
using Npgsql;

namespace indexing_worker.Services;

public class DataSeeder
{
    private readonly ILogger<DataSeeder> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    private readonly string _qdrantUrl;
    private readonly string _connectionString;
    private readonly string _dataDir;

    private const string QdrantCollection = "images";
    private const int VectorDimension = 512;
    private const int DbBatchSize = 2000;
    private const int QdrantBatchSize = 1000;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public DataSeeder(ILogger<DataSeeder> logger, IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;

        _qdrantUrl = Environment.GetEnvironmentVariable("QDRANT_URL") ?? "http://qdrant:6333";
        _dataDir = Environment.GetEnvironmentVariable("SEED_DATA_DIR") ?? "/app/datasets/exported-data";
        _connectionString = ParseConnectionString(
            Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? "postgresql://postgres:postgres@database:5432/VisualSearchEngine"
        );
    }

    public async Task RunAsync(bool shouldClear, CancellationToken ct)
    {
        _logger.LogInformation("DATA SEEDER — Import dữ liệu mẫu");
        
        if (shouldClear)
            _logger.LogWarning("Chế độ --clear: Xoá toàn bộ dữ liệu trước khi import");

        if (shouldClear)
            await ClearAllDataAsync(ct);

        var images = LoadJson<List<ExportedImage>>("images.json");
        var imageIndexes = LoadJson<List<ExportedImageIndex>>("image_index.json");
        var imageOcrs = LoadJson<List<ExportedImageOcr>>("image_ocr.json");

        await ImportPostgresAsync(images, imageIndexes, imageOcrs, ct);
        await ImportQdrantAsync(ct);

        _logger.LogInformation("IMPORT HOÀN TẤT!");
    }

    private async Task ClearAllDataAsync(CancellationToken ct)
    {
        _logger.LogInformation("Đang xoá toàn bộ dữ liệu...");

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        await conn.ExecuteAsync("DELETE FROM images");
        await conn.ExecuteAsync("DELETE FROM batch_index");

        var client = _httpClientFactory.CreateClient();
        await client.DeleteAsync($"{_qdrantUrl}/collections/{QdrantCollection}", ct);

        _logger.LogInformation("Hệ thống đã được làm sạch!");
    }

    private async Task ImportPostgresAsync(
        List<ExportedImage> images,
        List<ExportedImageIndex> imageIndexes,
        List<ExportedImageOcr> imageOcrs,
        CancellationToken ct)
    {
        _logger.LogInformation("Đang nạp dữ liệu vào PostgreSQL...");

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var batchId = await conn.QuerySingleAsync<Guid>(@"
            INSERT INTO batch_index (id, ""totalImages"", ""successCount"", ""failedCount"", status, ""createdAt"", ""updatedAt"")
            VALUES (gen_random_uuid(), @Total, @Total, 0, 'COMPLETED'::""BatchStatus"", NOW(), NOW())
            RETURNING id",
            new { Total = images.Count }
        );

        // Nạp bảng images
        var imageIds = new HashSet<string>(images.Select(i => i.Id));
        for (var i = 0; i < images.Count; i += DbBatchSize)
        {
            var batch = images.Skip(i).Take(DbBatchSize).ToList();
            foreach (var img in batch)
            {
                await conn.ExecuteAsync(@"
                    INSERT INTO images (id, path, width, height, ""fileSize"", ""fileFormat"", ""createdAt"")
                    VALUES (@Id::uuid, @Path, @Width, @Height, @FileSize, @FileFormat, @CreatedAt)
                    ON CONFLICT (id) DO NOTHING",
                    new
                    {
                        Id = img.Id,
                        Path = img.Path,
                        Width = img.Width,
                        Height = img.Height,
                        FileSize = img.FileSize,
                        FileFormat = img.FileFormat,
                        CreatedAt = ParseTimestamp(img.CreatedAt),
                    }
                );
            }
        }
        _logger.LogInformation("Nạp thành công {Count}/{Count} dữ liệu vào bảng images.", images.Count, images.Count);

        // Nạp bảng image_index
        var newIndexes = imageIndexes.Where(idx => imageIds.Contains(idx.ImageId)).ToList();
        var indexIdToNewId = new Dictionary<string, Guid>(); 

        for (var i = 0; i < newIndexes.Count; i += DbBatchSize)
        {
            var batch = newIndexes.Skip(i).Take(DbBatchSize).ToList();
            foreach (var idx in batch)
            {
                var newIndexId = await conn.QuerySingleOrDefaultAsync<Guid?>(@"
                    INSERT INTO image_index (id, ""imageId"", ""batchId"", status, ""indexedAt"")
                    VALUES (@Id::uuid, @ImageId::uuid, @BatchId, 'SUCCESS'::""IndexStatus"", @IndexedAt)
                    ON CONFLICT (""imageId"") DO NOTHING
                    RETURNING id",
                    new
                    {
                        Id = idx.Id,
                        ImageId = idx.ImageId,
                        BatchId = batchId,
                        IndexedAt = ParseTimestamp(idx.IndexedAt),
                    }
                );

                if (newIndexId.HasValue)
                    indexIdToNewId[idx.Id] = newIndexId.Value;
            }
        }
        _logger.LogInformation("Nạp thành công {Count}/{Count} dữ liệu vào bảng image_index.", newIndexes.Count, newIndexes.Count);

        // Nạp bảng image_ocr
        var newOcrs = imageOcrs.Where(ocr => indexIdToNewId.ContainsKey(ocr.ImageIndexId)).ToList();

        for (var i = 0; i < newOcrs.Count; i += DbBatchSize)
        {
            var batch = newOcrs.Skip(i).Take(DbBatchSize).ToList();
            foreach (var ocr in batch)
            {
                var boundingJson = ocr.BoundingBoxes != null
                    ? JsonSerializer.Serialize(ocr.BoundingBoxes)
                    : null;

                await conn.ExecuteAsync(@"
                    INSERT INTO image_ocr (id, ""imageIndexId"", ""rawText"", ""normalizedText"", ""confidenceScore"", ""boundingBoxes"")
                    VALUES (@Id::uuid, @ImageIndexId, @RawText, @NormalizedText, @ConfidenceScore, @BoundingBoxes::jsonb)
                    ON CONFLICT (id) DO NOTHING",
                    new
                    {
                        Id = ocr.Id,
                        ImageIndexId = indexIdToNewId[ocr.ImageIndexId],
                        RawText = ocr.RawText,
                        NormalizedText = ocr.NormalizedText,
                        ConfidenceScore = ocr.ConfidenceScore,
                        BoundingBoxes = boundingJson,
                    }
                );
            }
        }
        _logger.LogInformation("Nạp thành công {Count}/{Count} dữ liệu vào bảng image_ocr.", newOcrs.Count, newOcrs.Count);

        var actualCount = await conn.QuerySingleAsync<int>(
            @"SELECT COUNT(*) FROM image_index WHERE ""batchId"" = @BatchId",
            new { BatchId = batchId }
        );
        await conn.ExecuteAsync(@"
            UPDATE batch_index
            SET ""totalImages"" = @Count, ""successCount"" = @Count
            WHERE id = @BatchId",
            new { Count = actualCount, BatchId = batchId }
        );
    }

    private async Task ImportQdrantAsync(CancellationToken ct)
    {
        var qdrantFile = Path.Combine(_dataDir, "qdrant_vectors.json");
        if (!File.Exists(qdrantFile))
        {
            _logger.LogWarning("qdrant_vectors.json không tìm thấy, bỏ qua Qdrant import.");
            return;
        }

        await EnsureQdrantCollectionAsync(ct);
        
        _logger.LogInformation("Đang nạp dữ liệu vào Qdrant...");
        var vectors = LoadJson<List<ExportedQdrantPoint>>("qdrant_vectors.json");
        var client = _httpClientFactory.CreateClient();

        for (var i = 0; i < vectors.Count; i += QdrantBatchSize)
        {
            var batch = vectors.Skip(i).Take(QdrantBatchSize).ToList();
            var payload = new
            {
                points = batch.Select(v => new
                {
                    id = v.Id,
                    vector = v.Vector,
                    payload = v.Payload,
                }).ToList()
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PutAsync($"{_qdrantUrl}/collections/{QdrantCollection}/points", content, ct);
            response.EnsureSuccessStatusCode();
        }
        _logger.LogInformation("Nạp thành công {Count}/{Count} vector vào Qdrant.", vectors.Count, vectors.Count);
    }

    private async Task EnsureQdrantCollectionAsync(CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        var checkResponse = await client.GetAsync($"{_qdrantUrl}/collections/{QdrantCollection}", ct);
        if (checkResponse.IsSuccessStatusCode) return;

        var createPayload = new
        {
            vectors = new
            {
                size = VectorDimension,
                distance = "Cosine"
            }
        };
        var json = JsonSerializer.Serialize(createPayload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PutAsync($"{_qdrantUrl}/collections/{QdrantCollection}", content, ct);
        response.EnsureSuccessStatusCode();
    }

    private T LoadJson<T>(string filename)
    {
        var filepath = Path.Combine(_dataDir, filename);
        if (!File.Exists(filepath))
            throw new FileNotFoundException($"Không tìm thấy file: {filepath}");

        var json = File.ReadAllText(filepath);
        return JsonSerializer.Deserialize<T>(json, JsonOptions)
               ?? throw new InvalidOperationException($"Không thể parse file: {filepath}");
    }

    private static DateTime ParseTimestamp(string? timestamp)
    {
        if (string.IsNullOrWhiteSpace(timestamp))
            return DateTime.UtcNow;

        if (DateTimeOffset.TryParse(timestamp, out var dto))
            return dto.UtcDateTime;

        return DateTime.UtcNow;
    }

    private static string ParseConnectionString(string databaseUrl)
    {
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':');
        return $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]}";
    }

    private class ExportedImage
    {
        [JsonPropertyName("id")] public string Id { get; set; } = "";
        [JsonPropertyName("path")] public string Path { get; set; } = "";
        [JsonPropertyName("width")] public int? Width { get; set; }
        [JsonPropertyName("height")] public int? Height { get; set; }
        [JsonPropertyName("fileSize")] public int? FileSize { get; set; }
        [JsonPropertyName("fileFormat")] public string? FileFormat { get; set; }
        [JsonPropertyName("createdAt")] public string? CreatedAt { get; set; }
    }

    private class ExportedImageIndex
    {
        [JsonPropertyName("id")] public string Id { get; set; } = "";
        [JsonPropertyName("imageId")] public string ImageId { get; set; } = "";
        [JsonPropertyName("processDurationMs")] public int? ProcessDurationMs { get; set; }
        [JsonPropertyName("indexedAt")] public string? IndexedAt { get; set; }
    }

    private class ExportedImageOcr
    {
        [JsonPropertyName("id")] public string Id { get; set; } = "";
        [JsonPropertyName("imageIndexId")] public string ImageIndexId { get; set; } = "";
        [JsonPropertyName("rawText")] public string RawText { get; set; } = "";
        [JsonPropertyName("normalizedText")] public string NormalizedText { get; set; } = "";
        [JsonPropertyName("confidenceScore")] public double ConfidenceScore { get; set; }
        [JsonPropertyName("boundingBoxes")] public JsonElement? BoundingBoxes { get; set; }
    }

    private class ExportedQdrantPoint
    {
        [JsonPropertyName("id")] public string Id { get; set; } = "";
        [JsonPropertyName("vector")] public List<float> Vector { get; set; } = [];
        [JsonPropertyName("payload")] public Dictionary<string, JsonElement> Payload { get; set; } = [];
    }
}
