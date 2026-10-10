import { findUserByEmail } from '../models/userModel.js';
import { getMeetingAccess } from '../models/meetingModel.js';
import {
  addCollaborator, listCollaborators, findCollaborator,
  updateCollaboratorRole, removeCollaborator, getSharedMeetings
} from '../models/collaboratorModel.js';

const ASSIGNABLE_ROLES = ['editor', 'viewer'];

export const listSharedMeetings = (req, res) => {
  res.json({ success: true, meetings: getSharedMeetings(req.user.id) });
};

// The handlers below run behind requireMeetingAccess('owner'), so req.meeting is the verified meeting.
export const getCollaborators = (req, res) => {
  res.json({ success: true, collaborators: listCollaborators(req.meeting.id) });
};

export const inviteCollaborator = (req, res) => {
  const { email, role } = req.body;

  if (typeof email !== 'string' || !email.trim()) {
    return res.status(422).json({ success: false, message: 'Email is required' });
  }
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return res.status(422).json({ success: false, message: "Role must be 'editor' or 'viewer'" });
  }

  const invitee = findUserByEmail(email.trim().toLowerCase());
  if (!invitee) {
    return res.status(404).json({ success: false, message: 'No account found for that email. Ask them to sign up first.' });
  }
  if (invitee.id === req.user.id) {
    return res.status(422).json({ success: false, message: 'You already own this meeting.' });
  }
  if (findCollaborator(req.meeting.id, invitee.id)) {
    return res.status(409).json({ success: false, message: 'That person already has access. Change their role instead.' });
  }

  addCollaborator(req.meeting.id, invitee.id, role, req.user.id);

  res.status(201).json({
    success: true,
    message: 'Collaborator added',
    collaborator: { user_id: invitee.id, name: invitee.name, email: invitee.email, role }
  });
};

export const changeCollaboratorRole = (req, res) => {
  const { role } = req.body;

  if (!ASSIGNABLE_ROLES.includes(role)) {
    return res.status(422).json({ success: false, message: "Role must be 'editor' or 'viewer'" });
  }

  const updated = updateCollaboratorRole(req.meeting.id, req.params.userId, role);
  if (!updated) return res.status(404).json({ success: false, message: 'Collaborator not found' });

  res.json({ success: true, message: 'Role updated' });
};

export const revokeCollaborator = (req, res) => {
  const removed = removeCollaborator(req.meeting.id, req.params.userId);
  if (!removed) return res.status(404).json({ success: false, message: 'Collaborator not found' });

  res.json({ success: true, message: 'Access removed' });
};

// Leaving is always allowed, even if the owner later vaulted the meeting,
// so it deliberately skips the vault check.
export const leaveMeeting = (req, res) => {
  const meeting = getMeetingAccess(req.params.id, req.user.id);
  if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

  if (meeting.access_role === 'owner') {
    return res.status(409).json({ success: false, message: 'Owners cannot leave their own meeting. Delete it instead.' });
  }

  removeCollaborator(meeting.id, req.user.id);
  res.json({ success: true, message: 'You left the meeting' });
};
