import express from 'express';
import { getTasks, updateTask } from '../controllers/taskController.js';

const router = express.Router();

router.get('/tasks', getTasks);
router.patch('/tasks/:id', updateTask);

export default router;