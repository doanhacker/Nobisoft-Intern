import type { Request, Response } from 'express';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import type { IndexingFileInput } from '../../../../types/indexing.type.js';
import { indexImages } from '../../services/indexing.service.js';

export async function batchIndexing(req: Request, res: Response) {
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

    const inputs: IndexingFileInput[] = files.map((f) => ({
      buffer: f.buffer,
      originalname: f.originalname,
      mimetype: f.mimetype,
    }));

    const results = await indexImages(inputs);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    const response: ApiResponse<typeof results> = {
      success: true,
      message: `Indexing hoàn tất: ${successCount} thành công, ${failCount} thất bại`,
      data: results,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Batch indexing error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Indexing thất bại',
    };

    res.status(500).json(response);
  }
}
