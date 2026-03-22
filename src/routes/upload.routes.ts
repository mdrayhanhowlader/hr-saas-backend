import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import multer from 'multer';
import { uploadFile, uploadPublic } from '../controllers/upload.controller';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images, PDF, DOC, DOCX allowed'));
  },
});

const handleUpload = (req: any, res: any, next: any) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

const router = Router();

router.post('/', authenticate, handleUpload, uploadFile);
router.post('/public', handleUpload, uploadPublic);

export default router;
