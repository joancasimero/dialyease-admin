const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const registerAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Password validation
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{9,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 9 characters, include an uppercase letter, a number, and a special character.'
      });
    }

    const adminExists = await Admin.findOne({ username });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const admin = await Admin.create({ username, password });

    if (admin) {
      res.status(201).json({
        _id: admin._id,
        username: admin.username,
        token: generateToken(admin._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid admin data' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const admin = await Admin.findOne({ username });
    console.log('Login attempt:', username, 'Found:', !!admin);
    if (admin) {
      const match = await bcrypt.compare(password, admin.password);
      console.log('Password match:', match);
    }
    
    if (admin && (await admin.comparePassword(password))) {
      // Check if admin account is active
      if (!admin.isActive) {
        return res.status(403).json({ message: 'Account has been disabled. Please contact an administrator.' });
      }
      
      res.json({
        _id: admin._id,
        username: admin.username,
        role: admin.role, // Make sure this is included
        token: generateToken(admin._id, admin.role) // Pass the role to token generation
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user._id).select('-password');
    res.json(admin);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllAdmins = async (req, res) => {
  try {
    // Get all admins including inactive ones for management purposes
    const admins = await Admin.find()
      .select('-password')
      .populate('createdBy', 'firstName lastName username')
      .sort({ createdAt: -1 });
    res.json(admins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { 
      username, 
      password, 
      firstName, 
      middleName, 
      lastName, 
      email, 
      contactNumber, 
      position, 
      department, 
      employeeId,
      role 
    } = req.body;

    // Password validation
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{9,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 9 characters, include an uppercase letter, a number, and a special character.'
      });
    }

    if (!department || !['Administration Office', 'HP Unit'].includes(department)) {
      return res.status(400).json({ message: 'Department is required and must be valid.' });
    }

    const adminExists = await Admin.findOne({ 
      $or: [{ username }, { email }] 
    });

    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const admin = await Admin.create({ 
      username, 
      password, 
      firstName, 
      middleName, 
      lastName, 
      email, 
      contactNumber, 
      position, 
      department, 
      employeeId,
      role: role || 'admin',
      createdBy: req.user._id
    });

    const adminData = admin.toObject();
    delete adminData.password;

    res.status(201).json({
      message: 'Admin created successfully',
      admin: adminData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateAdminRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    // Prevent admin from changing their own role
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }
    
    const admin = await Admin.findByIdAndUpdate(
      id, 
      { role }, 
      { new: true }
    ).select('-password');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json({ 
      message: 'Admin role updated successfully',
      admin 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const toggleAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot archive/activate your own account' });
    }
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    admin.isActive = !admin.isActive;
    await admin.save();
    res.json({ message: `Admin ${admin.isActive ? 'activated' : 'archived'} successfully`, admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateAdminInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    const admin = await Admin.findByIdAndUpdate(id, updateFields, { new: true }).select('-password');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json({ message: 'Admin info updated', admin });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getAdmin,
  getAllAdmins,
  createAdmin,
  updateAdminRole,
  toggleAdminStatus,
  updateAdminInfo,
};