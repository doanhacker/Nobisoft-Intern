using System.Text.Json.Serialization;

namespace indexing_worker.Models;

public class AiProcessResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("data")]
    public AiProcessData? Data { get; set; }

    [JsonPropertyName("error_message")]
    public string? ErrorMessage { get; set; }

    [JsonPropertyName("processing_time_ms")]
    public double ProcessingTimeMs { get; set; }
}

public class AiProcessData
{
    [JsonPropertyName("embedding")]
    public List<float> Embedding { get; set; } = [];

    [JsonPropertyName("ocrLines")]
    public List<OcrLineResult> OcrLines { get; set; } = [];
}

public class OcrLineResult
{
    [JsonPropertyName("rawText")]
    public string RawText { get; set; } = string.Empty;

    [JsonPropertyName("confidenceScore")]
    public double ConfidenceScore { get; set; }

    [JsonPropertyName("boundingBox")]
    public Dictionary<string, object>? BoundingBox { get; set; }
}
