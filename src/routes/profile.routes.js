import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
} from '../controllers/profile.controller.js';

const router = Router();

// Multer config for in-memory storage (or use diskStorage if you prefer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Secure all routes
router.use(authenticate);

// Profile routes
router.get('/', getProfile);
router.patch('/', updateProfile);

// Upload avatar (single file, field name 'avatar')
router.post('/upload', upload.single('avatar'), uploadAvatar);

export default router;
