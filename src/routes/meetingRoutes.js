import express from 'express';
import {
  listMeetings, getMeeting, patchMeeting, removeMeeting,
  archiveMeetingHandler, restoreMeetingHandler
} from '../controllers/meetingController.js';
import { listMeetingNotes, addMeetingNote } from '../controllers/noteController.js';

const router = express.Router();

router.get('/', listMeetings);
router.get('/:id', getMeeting);
router.patch('/:id', patchMeeting);
router.delete('/:id', removeMeeting);
router.patch('/:id/archive', archiveMeetingHandler);
router.patch('/:id/restore', restoreMeetingHandler);

router.get('/:meetingId/notes', listMeetingNotes);
router.post('/:meetingId/notes', addMeetingNote);

export default router;