const jwt = require('jsonwebtoken');
const { Teacher, Student } = require('../models/models');

const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    if (decoded.role === 'teacher') {
      user = await Teacher.findById(decoded.id);
    } else if (decoded.role === 'student') {
      user = await Student.findById(decoded.id);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = authenticateToken;