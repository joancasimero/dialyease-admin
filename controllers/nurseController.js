const Nurse = require('../models/Nurse');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registerNurse = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      password,
      mobileNumber,
      gender,
      dateOfBirth,
      nurseLicenseNumber,
      shiftSchedule,
      employeeId
    } = req.body;

    const existingNurse = await Nurse.findOne({
      $or: [{ email }, { nurseLicenseNumber }, { employeeId }]
    });
    if (existingNurse) {
      return res.status(400).json({ message: 'Nurse already exists (email, license number, or employee ID)' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nurse = await Nurse.create({
      firstName,
      middleName,
      lastName,
      email,
      password: hashedPassword,
      mobileNumber,
      gender,
      dateOfBirth,
      nurseLicenseNumber,
      shiftSchedule,
      employeeId
    });

    const token = jwt.sign({ id: nurse._id, role: 'nurse' }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
      nurse: {
        id: nurse._id,
        firstName,
        middleName,
        lastName,
        email,
        mobileNumber,
        gender,
        dateOfBirth,
        nurseLicenseNumber,
        shiftSchedule,
        employeeId
      },
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const loginNurse = async (req, res) => {
  try {
    const { email, password } = req.body;
    const nurse = await Nurse.findOne({ email });

    if (!nurse) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check if nurse is archived
    if (nurse.archived) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been archived. Please contact the administrator.'
      });
    }

    if (!(await bcrypt.compare(password, nurse.password))) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: nurse._id, role: 'nurse' }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
      nurse: {
        id: nurse._id,
        firstName: nurse.firstName,
        middleName: nurse.middleName,
        lastName: nurse.lastName,
        email: nurse.email,
        mobileNumber: nurse.mobileNumber,
        gender: nurse.gender,
        dateOfBirth: nurse.dateOfBirth,
        nurseLicenseNumber: nurse.nurseLicenseNumber,
        shiftSchedule: nurse.shiftSchedule,
        employeeId: nurse.employeeId
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateNurse = async (req, res) => {
  try {
    const updateData = req.body;
    const { id } = req.params;

    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    const updatedNurse = await Nurse.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password');

    if (!updatedNurse) {
      return res.status(404).json({ 
        success: false, 
        message: 'Nurse not found' 
      });
    }

    res.json({
      success: true,
      nurse: updatedNurse,
    });
  } catch (err) {
    console.error('Error updating nurse:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
};

const deleteNurse = async (req, res) => {
  try {
    const { id } = req.params;

    const archivedNurse = await Nurse.findByIdAndUpdate(
      id,
      { archived: true },
      { new: true }
    );

    if (!archivedNurse) {
      return res.status(404).json({ 
        success: false,
        message: 'Nurse not found' 
      });
    }

    res.status(200).json({ 
      success: true,
      message: 'Nurse archived successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error archiving nurse', 
      error: error.message 
    });
  }
};

module.exports = {
  registerNurse,
  loginNurse,
  updateNurse,
  deleteNurse
};