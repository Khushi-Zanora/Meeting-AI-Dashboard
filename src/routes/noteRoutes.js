import express from 'express';
import { listAllNotes, patchNote, removeNote } from '../controllers/noteController.js';

const router = express.Router();

router.get('/', listAllNotes);
router.patch('/:id', patchNote);
router.delete('/:id', removeNote);

export default router;