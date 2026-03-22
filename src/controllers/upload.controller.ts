import { Response, Request } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import path from 'path';
import fs from 'fs';

const saveFile = (buffer: Buffer, originalName: string, prefix: string): string => {
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const ext = path.extname(originalName).toLowerCase();
  const filename = `${prefix}_${Date.now()}${ext}`;
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, buffer);

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${baseUrl}/uploads/${filename}`;
};

export const uploadFile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded');
    const url = saveFile(req.file.buffer, req.file.originalname, req.user!.tenantId);
    return sendSuccess(res, 'File uploaded successfully', {
      url,
      filename: path.basename(url),
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return sendError(res, 'Upload failed', 500);
  }
};

export const uploadPublic = async (req: Request, res: Response) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded');
    const url = saveFile(req.file.buffer, req.file.originalname, 'public');
    return sendSuccess(res, 'File uploaded successfully', {
      url,
      filename: path.basename(url),
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    return sendError(res, 'Upload failed', 500);
  }
};
