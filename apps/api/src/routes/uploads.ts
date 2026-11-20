import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import { scanBufferWithClamAv } from '../lib/clamav.js';

const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? '/app/uploads');
mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIME = /^image\/(jpeg|png|webp|gif)$/;
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_MIME.test(file.mimetype)),
});

export const uploadsRouter = Router();

uploadsRouter.post('/', requireAuth, (req, res, next) => {
  upload.array('images', 8)(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5 MB or smaller.' : err.message });
    }
    if (err) return next(err);

    const incoming = (req.files as Express.Multer.File[]) ?? [];
    if (!incoming.length) {
      return res.status(400).json({ error: 'Please select at least one valid image (JPEG, PNG, WebP, or GIF).' });
    }

    try {
      for (const file of incoming) {
        const result = await scanBufferWithClamAv(file.buffer);
        if (!result.clean) {
          return res.status(422).json({
            error: `Upload rejected: malware detected in "${file.originalname}" (${result.virus}).`,
          });
        }
      }
    } catch (scanErr) {
      console.error('ClamAV scan error:', scanErr);
      return res.status(503).json({
        error: 'Image virus scanner is currently unavailable. Please try again shortly.',
      });
    }

    try {
      const saved = await Promise.all(
        incoming.map(async (file) => {
          const ext = MIME_TO_EXT[file.mimetype] ?? (path.extname(file.originalname).toLowerCase() || '.jpg');
          const filename = `${randomUUID()}${ext}`;
          await fs.writeFile(path.join(uploadDir, filename), file.buffer);
          return {
            url: `/uploads/${filename}`,
            filename,
            size: file.size,
            mimeType: file.mimetype,
          };
        }),
      );
      return res.status(201).json({ files: saved });
    } catch (writeErr) {
      return next(writeErr);
    }
  });
});
