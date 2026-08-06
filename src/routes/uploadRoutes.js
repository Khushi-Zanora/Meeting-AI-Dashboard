import express from 'express';
import upload from '../middlewares/uploadMiddleware.js';
import { handleUpload } from '../controllers/uploadController.js';

const router = express.Router();

// 'audioFile' must match the field name the frontend sends
router.post('/', upload.single('audioFile'), handleUpload);

export default router;