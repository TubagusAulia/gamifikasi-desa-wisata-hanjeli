const jwt = require('jsonwebtoken');
const ApiError = require('../utils/apiError');

/**
 * JWT Authentication middleware.
 * Extracts Bearer token from Authorization header and attaches user info to req.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

/**
 * Role-based authorization middleware factory.
 * Usage: authorize('admin'), authorize('admin', 'worker')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
