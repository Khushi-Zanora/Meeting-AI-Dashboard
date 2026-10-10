import {
  createNote, getNotesByMeeting, getAllNotesForUser,
  updateNote, deleteNote, getNoteContext
} from '../models/noteModel.js';
import { checkMeetingAccess } from '../services/accessService.js';

const deny = (res, result) => res.status(result.status).json({ success: false, code: result.code, message: result.message });

export const listAllNotes = (req, res) => {
  const { search, meetingId } = req.query;

  if (meetingId) {
    const access = checkMeetingAccess(req, meetingId, 'viewer');
    if (!access.ok) return deny(res, access);
    return res.json({ success: true, notes: getNotesByMeeting(access.meeting.id, { search }) });
  }

  res.json({ success: true, notes: getAllNotesForUser(req.user.id, { search }) });
};

// Access for the next two handlers is enforced by requireMeetingAccess on their routes
export const listMeetingNotes = (req, res) => {
  res.json({ success: true, notes: getNotesByMeeting(req.meeting.id) });
};

export const addMeetingNote = (req, res) => {
  const { content } = req.body;

  if (typeof content !== 'string' || !content.trim()) {
    return res.status(422).json({ success: false, message: 'Note content is required' });
  }

  const noteId = createNote(req.user.id, req.meeting.id, content.trim());
  res.status(201).json({ success: true, message: 'Note added', noteId });
};

// Editing a note needs editor access to its meeting. On top of that, only the meeting
// owner or the note's author may change it. Returns the note, or sends the error and returns null.
const guardNote = (req, res) => {
  const note = getNoteContext(req.params.id);
  if (!note) {
    res.status(404).json({ success: false, message: 'Note not found' });
    return null;
  }

  const access = checkMeetingAccess(req, note.meeting_id, 'editor');
  if (!access.ok) {
    if (access.status === 404) res.status(404).json({ success: false, message: 'Note not found' });
    else deny(res, access);
    return null;
  }

  if (access.role !== 'owner' && note.user_id !== req.user.id) {
    res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'You can only change your own notes.' });
    return null;
  }

  return note;
};

export const patchNote = (req, res) => {
  const note = guardNote(req, res);
  if (!note) return;

  const { content, isPinned } = req.body;

  if (content !== undefined && (typeof content !== 'string' || !content.trim())) {
    return res.status(422).json({ success: false, message: 'Note content cannot be empty' });
  }

  const updated = updateNote(note.id, note.meeting_id, {
    content: content === undefined ? undefined : content.trim(),
    isPinned
  });
  if (!updated) return res.status(404).json({ success: false, message: 'Note not found or no changes provided' });

  res.json({ success: true, message: 'Note updated' });
};

export const removeNote = (req, res) => {
  const note = guardNote(req, res);
  if (!note) return;

  deleteNote(note.id, note.meeting_id);
  res.json({ success: true, message: 'Note deleted' });
};
