import express from 'express';
import uploadRoutes from './routes/uploadRoutes.js';
import taskRoutes from './routes/taskRoutes.js';

const app = express();

// Parses incoming JSON request bodies (needed for PATCH /api/tasks/:id later)
//is a middleware — it runs on every incoming request and parses JSON bodies into req.body.
app.use(express.json()); 

// Temporary health-check route — proves the server is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use('/api/upload', uploadRoutes);
app.use('/api', taskRoutes);

export default app;