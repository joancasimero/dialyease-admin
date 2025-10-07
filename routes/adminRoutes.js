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
  updateAdminInfo,
  requestPasswordReset,
  verifyOTP,
  resetPasswordWithOTP
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

// Debug route to list admin usernames (temporary)
router.get('/debug-users', async (req, res) => {
  try {
    const Admin = require('../models/Admin');
    const admins = await Admin.find({}, 'username isActive role');
    res.json({ 
      count: admins.length,
      users: admins.map(admin => ({
        username: admin.username,
        isActive: admin.isActive,
        role: admin.role
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Emergency password reset route (temporary for debugging)
router.post('/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    const Admin = require('../models/Admin');
    
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Set password directly and let the pre-save hook handle hashing
    admin.password = newPassword;
    await admin.save();
    
    res.json({ message: `Password reset for ${username}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot password routes (no authentication required)
router.post('/forgot-password', requestPasswordReset);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password-otp', resetPasswordWithOTP);

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