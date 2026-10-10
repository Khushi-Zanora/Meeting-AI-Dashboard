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

// Real entry points, so there is no guessing about which URL to visit
app.get('/', (req, res) => res.redirect('/public/landing.html'));
app.get('/app', (req, res) => res.redirect('/app/dashboard'));

// Serve the frontend
app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('/app/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'app', 'index.html'));
});

export default app;
