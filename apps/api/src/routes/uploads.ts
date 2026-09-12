import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';

const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? '/app/uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({ destination: uploadDir, filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`) });
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 8 }, fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) });
export const uploadsRouter = Router();
uploadsRouter.post('/', requireAuth, upload.array('images', 8), (req, res) => {
  const files = (req.files as Express.Multer.File[] ?? []).map((file) => ({ url: `/uploads/${file.filename}`, filename: file.filename, size: file.size, mimeType: file.mimetype }));
  return res.status(201).json({ files });
});
