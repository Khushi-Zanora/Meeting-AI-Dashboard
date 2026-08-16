import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import uploadRoutes from './routes/uploadRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

app.use(cors({ origin: true, credentials: true })); // credentials: true is required for cookies to work cross-origin
app.use(cookieParser());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', taskRoutes);

export default app;