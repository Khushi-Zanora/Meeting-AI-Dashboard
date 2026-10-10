import { checkMeetingAccess } from '../services/accessService.js';

// Usage: router.patch('/:id', requireMeetingAccess('editor'), handler)
// Works with both :id and :meetingId route params.
export const requireMeetingAccess = (minRole = 'viewer') => (req, res, next) => {
  const meetingId = req.params.meetingId || req.params.id;
  const result = checkMeetingAccess(req, meetingId, minRole);

  if (!result.ok) {
    return res.status(result.status).json({ success: false, code: result.code, message: result.message });
  }

  req.meeting = result.meeting;   // handlers reuse this instead of querying again
  req.accessRole = result.role;
  next();
};
