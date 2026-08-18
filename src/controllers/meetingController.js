import {
  getAllMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  archiveMeeting,
  restoreMeeting
} from '../models/meetingModel.js';

export const listMeetings = (req, res) => {
  const { search, archived } = req.query;
  const meetings = getAllMeetings(req.user.id, { search, archived });
  res.json({ success: true, meetings });
};

export const getMeeting = (req, res) => {
  const meeting = getMeetingById(req.params.id, req.user.id);
  if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
  res.json({ success: true, meeting });
};

export const patchMeeting = (req, res) => {
  const { title, date, participants, description } = req.body;
  const updated = updateMeeting(req.params.id, req.user.id, { title, date, participants, description });
  if (!updated) return res.status(404).json({ success: false, message: 'Meeting not found or no changes provided' });
  res.json({ success: true, message: 'Meeting updated' });
};

export const removeMeeting = (req, res) => {
  const deleted = deleteMeeting(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ success: false, message: 'Meeting not found' });
  res.json({ success: true, message: 'Meeting deleted' });
};

export const archiveMeetingHandler = (req, res) => {
  const archived = archiveMeeting(req.params.id, req.user.id);
  if (!archived) return res.status(404).json({ success: false, message: 'Meeting not found or already archived' });
  res.json({ success: true, message: 'Meeting archived' });
};

export const restoreMeetingHandler = (req, res) => {
  const restored = restoreMeeting(req.params.id, req.user.id);
  if (!restored) return res.status(404).json({ success: false, message: 'Meeting not found or not archived' });
  res.json({ success: true, message: 'Meeting restored' });
};