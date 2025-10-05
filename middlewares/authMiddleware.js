const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Patient = require('../models/Patient');
const Nurse = require('../models/Nurse');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    console.log('Decoded token:', decoded); // Debug log

    if (decoded.role === 'admin' || decoded.role === 'super_admin') {
      req.user = await Admin.findById(decoded.id).select('-password');
      req.userType = 'admin';
    } else if (decoded.role === 'patient') {
      req.user = await Patient.findById(decoded.id).select('-password');
      req.userType = 'patient';
    } else if (decoded.role === 'nurse') {
      req.user = await Nurse.findById(decoded.id).select('-password');
      req.userType = 'nurse';
    }

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('Authenticated user:', req.user.username, 'Role:', req.user.role); // Debug log
    next();
  } catch (err) {
    console.error('JWT Error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const adminOnly = async (req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admins only' });
  }
  next();
};

const nurseOnly = async (req, res, next) => {
  if (req.userType !== 'nurse') {
    return res.status(403).json({ message: 'Access denied: Nurses only' });
  }
  next();
};

module.exports = { protect, adminOnly, nurseOnly };