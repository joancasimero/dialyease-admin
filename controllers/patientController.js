const Patient = require('../models/Patient');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const registerPatient = async (req, res) => {
  try {
    const { 
      firstName,
      middleName,
      lastName,
      birthday,
      email,
      phone,
      address,
      password,
      hospital,
      bloodType,
      gender,
      emergencyContact,
      weight,
      height,
      allergies,
      currentMedications,
      medicalHistory,
      familyHistory, // <-- Added
      pidNumber,     // <-- Added
      dialysisSchedule,
      assignedTimeSlot // <-- Changed from timeSlot to assignedTimeSlot
    } = req.body;

    const requiredFields = [
      'firstName', 'lastName', 'birthday', 'email', 'phone', 'address', 'password',
      'hospital', 'bloodType', 'gender', 'emergencyContact', 'weight', 'height',
      'dialysisSchedule', 'assignedTimeSlot' // <-- Changed from 'timeSlot' to 'assignedTimeSlot'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'All required fields must be provided',
        missingFields
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    if (!emergencyContact.name || !emergencyContact.relationship || !emergencyContact.phone) {
      return res.status(400).json({ 
        message: 'Emergency contact must include name, relationship, and phone'
      });
    }

    if (!['MWF', 'TTHS'].includes(dialysisSchedule)) {
      return res.status(400).json({ 
        message: 'Invalid dialysis schedule. Must be either MWF or TTHS'
      });
    }

    if (!['morning', 'afternoon'].includes(assignedTimeSlot)) {
      return res.status(400).json({ 
        message: 'Invalid time slot. Must be either morning or afternoon'
      });
    }

    const patientExists = await Patient.findOne({ email });
    if (patientExists) {
      return res.status(400).json({ message: 'Patient already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const patient = await Patient.create({ 
      firstName,
      middleName,
      lastName,
      birthday: new Date(birthday),
      email,
      phone,
      address,
      password: hashedPassword,
      hospital,
      bloodType,
      gender,
      emergencyContact,
      weight,
      height,
      allergies: allergies || [],
      currentMedications: currentMedications || [],
      medicalHistory,
      familyHistory, // <-- Added
      pidNumber,     // <-- Added
      dialysisSchedule,
      assignedTimeSlot // <-- Changed from timeSlot to assignedTimeSlot
    });

    const patientData = patient.toObject();
    delete patientData.password;

    res.status(201).json({
      success: true,
      patient: patientData,
      token: generateToken(patient._id)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: err.message || 'Server error occurred' 
    });
  }
};

const loginPatient = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const patient = await Patient.findOne({ email });
    
    if (patient && patient.archived) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been archived. Please contact the administrator.'
      });
    }

    if (patient && (await bcrypt.compare(password, patient.password))) {
      const patientData = patient.toObject();
      delete patientData.password;

      res.json({
        success: true,
        patient: patientData,
        token: generateToken(patient._id)
      });
    } else {
      res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: err.message 
    });
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const updatePatient = async (req, res) => {
  try {
    const updateData = req.body;
    const { id } = req.params;

    if (updateData.birthday) {
      updateData.birthday = new Date(updateData.birthday);
    }

    if (updateData.dialysisSchedule && !['MWF', 'TTHS'].includes(updateData.dialysisSchedule)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid dialysis schedule. Must be either MWF or TTHS'
      });
    }

    if (updateData.assignedTimeSlot && !['morning', 'afternoon'].includes(updateData.assignedTimeSlot)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid time slot. Must be either morning or afternoon'
      });
    }

    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password');

    if (!updatedPatient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    res.json({
      success: true,
      patient: updatedPatient,
    });
  } catch (err) {
    console.error('Error updating patient:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
};

const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPatient = await Patient.findByIdAndDelete(id);

    if (!deletedPatient) {
      return res.status(404).json({ 
        success: false,
        message: 'Patient not found' 
      });
    }

    res.status(200).json({ 
      success: true,
      message: 'Patient deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error deleting patient', 
      error: error.message 
    });
  }
};

module.exports = {
  registerPatient,
  loginPatient,
  updatePatient,
  deletePatient
};