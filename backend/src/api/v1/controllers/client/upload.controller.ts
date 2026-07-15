import type { Request, Response } from 'express';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import { processImageUploads } from '../../services/upload.service.js';

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

    const results = await processImageUploads(files);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    const response: ApiResponse<typeof results> = {
      success: true,
      message: `Upload hoàn tất: ${successCount} thành công, ${failCount} thất bại`,
      data: results,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload thất bại' });
  }
}
