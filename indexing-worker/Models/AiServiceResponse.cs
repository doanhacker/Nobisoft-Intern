using System.Text.Json.Serialization;

namespace indexing_worker.Models;

// ── Response từ POST /api/indexing/batch ──

public class BatchIndexingResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("succeeded")]
    public int Succeeded { get; set; }

    [JsonPropertyName("failed")]
    public int Failed { get; set; }

    [JsonPropertyName("results")]
    public List<IndexingResult> Results { get; set; } = [];
}

public class IndexingResult
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("image_id")]
    public string ImageId { get; set; } = string.Empty;

    [JsonPropertyName("metadata")]
    public ImageMetadataResult? Metadata { get; set; }

    [JsonPropertyName("embedding")]
    public List<float> Embedding { get; set; } = [];

    [JsonPropertyName("ocr_results")]
    public List<OcrResultItem> OcrResults { get; set; } = [];

    [JsonPropertyName("processing_time_ms")]
    public double ProcessingTimeMs { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

public class ImageMetadataResult
{
    [JsonPropertyName("width")]
    public int Width { get; set; }

    [JsonPropertyName("height")]
    public int Height { get; set; }

    [JsonPropertyName("format")]
    public string Format { get; set; } = string.Empty;

    [JsonPropertyName("file_size")]
    public int FileSize { get; set; }
}

public class OcrResultItem
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    [JsonPropertyName("normalized_text")]
    public string NormalizedText { get; set; } = string.Empty;

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }

    [JsonPropertyName("bounding_box")]
    public List<List<int>> BoundingBox { get; set; } = [];
}
