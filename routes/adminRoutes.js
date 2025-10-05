const express = require('express');
const router = express.Router();
const { 
  registerAdmin, 
  loginAdmin, 
  getAdmin,
  getAllAdmins,
  createAdmin,
  updateAdminRole,
  toggleAdminStatus,
  updateAdminInfo
} = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');

// Middleware to allow only super admins
const superAdminOnly = (req, res, next) => {
  console.log('SuperAdmin check - User role:', req.user?.role); // Debug log
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied: Super Admin privileges required' });
  }
  next();
};

// Test route to verify admin routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Admin routes are working!', timestamp: new Date().toISOString() });
});

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/me', protect, getAdmin);

// Routes below require super admin access
router.get('/all', protect, superAdminOnly, getAllAdmins);
router.post('/create', protect, superAdminOnly, createAdmin);
router.patch('/:id/toggle-status', protect, superAdminOnly, toggleAdminStatus);
router.patch('/:id/change-role', protect, superAdminOnly, updateAdminRole);
router.patch('/:id/update', protect, superAdminOnly, updateAdminInfo);

module.exports = router;