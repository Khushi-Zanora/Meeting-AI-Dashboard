import express from 'express';
import { getTasks, updateTask, getMeetings } from '../controllers/taskController.js';

const router = express.Router();

router.get('/tasks', getTasks);
router.patch('/tasks/:id', updateTask);
router.get('/meetings', getMeetings);

export default router;