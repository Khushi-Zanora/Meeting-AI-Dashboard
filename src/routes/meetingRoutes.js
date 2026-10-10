import express from 'express';
import {
  listMeetings, getMeeting, patchMeeting, removeMeeting,
  archiveMeetingHandler, restoreMeetingHandler,
  lockInVault, unlockVault, removeFromVault
} from '../controllers/meetingController.js';
import {
  listSharedMeetings, getCollaborators, inviteCollaborator,
  changeCollaboratorRole, revokeCollaborator, leaveMeeting
} from '../controllers/collaboratorController.js';
import { listMeetingNotes, addMeetingNote } from '../controllers/noteController.js';
import { requireMeetingAccess } from '../middlewares/accessMiddleware.js';

const router = express.Router();

router.get('/', listMeetings);
router.get('/shared', listSharedMeetings); // must come before /:id

// Vault management: these verify the PIN themselves
router.post('/:id/vault', lockInVault);
router.post('/:id/vault/unlock', unlockVault);
router.delete('/:id/vault', removeFromVault);

router.delete('/:id/leave', leaveMeeting);

router.get('/:id', requireMeetingAccess('viewer'), getMeeting);
router.patch('/:id', requireMeetingAccess('editor'), patchMeeting);
router.delete('/:id', removeMeeting); // owner check lives in the handler, never needs the vault PIN
router.patch('/:id/archive', requireMeetingAccess('owner'), archiveMeetingHandler);
router.patch('/:id/restore', requireMeetingAccess('owner'), restoreMeetingHandler);

router.get('/:id/collaborators', requireMeetingAccess('owner'), getCollaborators);
router.post('/:id/collaborators', requireMeetingAccess('owner'), inviteCollaborator);
router.patch('/:id/collaborators/:userId', requireMeetingAccess('owner'), changeCollaboratorRole);
router.delete('/:id/collaborators/:userId', requireMeetingAccess('owner'), revokeCollaborator);

router.get('/:meetingId/notes', requireMeetingAccess('viewer'), listMeetingNotes);
router.post('/:meetingId/notes', requireMeetingAccess('editor'), addMeetingNote);

export default router;
