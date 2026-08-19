namespace indexing_worker.Models;

// Message nhận từ RabbitMQ — chứa batchId và danh sách ảnh cần index.
public class IndexingMessage
{
    public string BatchId { get; set; } = string.Empty;
    public List<ImageItem> Images { get; set; } = [];
}

public class ImageItem
{
    public string Id { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
}
