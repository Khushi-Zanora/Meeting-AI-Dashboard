import express from 'express';
import {
  listMeetings, getMeeting, patchMeeting, removeMeeting,
  archiveMeetingHandler, restoreMeetingHandler
} from '../controllers/meetingController.js';

const router = express.Router();

router.get('/', listMeetings);
router.get('/:id', getMeeting);
router.patch('/:id', patchMeeting);
router.delete('/:id', removeMeeting);
router.patch('/:id/archive', archiveMeetingHandler);
router.patch('/:id/restore', restoreMeetingHandler);

export default router;