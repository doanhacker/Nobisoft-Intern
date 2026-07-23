import type { Request, Response } from 'express';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import { processImageUploads, getBatchStatus } from '../../services/upload.service.js';

export async function uploadImages(req: Request, res: Response) {
  try {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      const response: ApiResponse = {
        success: false,
        message: 'Vui lòng chọn ít nhất 1 ảnh',
      };
      res.status(400).json(response);
      return;
    }

    const batchId = req.body.batchId as string | undefined;
    const isLastChunk = req.body.isLastChunk === 'true';
    const userId = req.user?.id;

    const { batchId: resultBatchId, results } = await processImageUploads(files, batchId, isLastChunk, userId);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    const response: ApiResponse<any> = {
      success: true,
      message: `Upload hoàn tất: ${successCount} thành công, ${failCount} thất bại`,
      data: {
        batchId: resultBatchId,
        results,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload thất bại';
    console.error('Upload error:', error);
    res.status(400).json({ success: false, message });
  }
}

export async function getBatchStatusController(req: Request, res: Response) {
  try {
    const batchId = req.params.batchId as string;

    const status = await getBatchStatus(batchId);

    if (!status) {
      res.status(404).json({ success: false, message: 'Batch không tồn tại' });
      return;
    }

    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Get batch status error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}
