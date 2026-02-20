import express from 'express';
import {
  generateStudioContent,
  getStudioContent,
  deleteStudioContent,
} from '../controllers/studio.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/generate', authenticate, generateStudioContent);
router.get('/:chatId', authenticate, getStudioContent);
router.delete('/:chatId/:toolId', authenticate, deleteStudioContent);

export default router;
