import express from 'express';
import { getTasks, patchTask, removeTask } from '../controllers/taskController.js';

const router = express.Router();

router.get('/tasks', getTasks);
router.patch('/tasks/:id', patchTask);
router.delete('/tasks/:id', removeTask);

export default router;