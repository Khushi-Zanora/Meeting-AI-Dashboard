import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from './middlewares/authMiddleware.js';
import uploadRoutes from './routes/uploadRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import authRoutes from './routes/authRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import noteRoutes from './routes/noteRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/meetings', authenticate, meetingRoutes);
app.use('/api/notes', authenticate, noteRoutes);
app.use('/api/upload', authenticate, uploadRoutes);
app.use('/api', authenticate, taskRoutes);

// Serve the frontend
app.use(express.static(path.join(__dirname, '..', 'client')));

// SPA fallback — any /app/* URL that isn't a real file gets the app shell,
// so the router (Stage 10c) can read the URL and decide what to render
app.get('/app/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'app', 'index.html'));
});

export default app;