import { createNote, getNotesByMeeting, getAllNotesForUser, updateNote, deleteNote } from '../models/noteModel.js';
import { getMeetingById } from '../models/meetingModel.js';

export const listAllNotes = (req, res) => {
  const { search, meetingId } = req.query;
  const notes = getAllNotesForUser(req.user.id, { search, meetingId });
  res.json({ success: true, notes });
};

export const listMeetingNotes = (req, res) => {
  const meeting = getMeetingById(req.params.meetingId, req.user.id);
  if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

  const notes = getNotesByMeeting(req.params.meetingId, req.user.id);
  res.json({ success: true, notes });
};

export const addMeetingNote = (req, res) => {
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(422).json({ success: false, message: 'Note content is required' });
  }

  // Verify the meeting exists AND belongs to this user before attaching a note to it —
  // otherwise a user could create a note pointing at someone else's meeting_id
  const meeting = getMeetingById(req.params.meetingId, req.user.id);
  if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

  const noteId = createNote(req.user.id, req.params.meetingId, content.trim());
  res.status(201).json({ success: true, message: 'Note added', noteId });
};

export const patchNote = (req, res) => {
  const { content, isPinned } = req.body;

  if (content !== undefined && !content.trim()) {
    return res.status(422).json({ success: false, message: 'Note content cannot be empty' });
  }

  const updated = updateNote(req.params.id, req.user.id, { content: content?.trim(), isPinned });
  if (!updated) return res.status(404).json({ success: false, message: 'Note not found or no changes provided' });

  res.json({ success: true, message: 'Note updated' });
};

export const removeNote = (req, res) => {
  const deleted = deleteNote(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ success: false, message: 'Note not found' });
  res.json({ success: true, message: 'Note deleted' });
};