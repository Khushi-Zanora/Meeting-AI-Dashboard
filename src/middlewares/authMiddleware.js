import jwt from 'jsonwebtoken';

// Each 401 carries a code so the frontend can tell "log in again" apart from other 401s
// (for example a wrong vault PIN), which must not trigger a token refresh.
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, code: 'TOKEN_EXPIRED', message: 'Access token expired' });
    }
    return res.status(401).json({ success: false, code: 'TOKEN_INVALID', message: 'Invalid authentication token' });
  }
};
