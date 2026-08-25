const AppError = require('../exceptions/AppError');
const { verifyToken } = require('../security/jwt');
const User = require('../models/entities/userModel');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid token', 401);
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      throw new AppError(err.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token', 401);
    }

    const user = await User.findById(decoded.userId);

    if (!user || user.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authMiddleware;

