const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient'); 
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');
const admin = require('firebase-admin');
const AppointmentSlot = require('../models/AppointmentSlot');
const RescheduleRequest = require('../models/RescheduleRequest');
const moment = require('moment-timezone');
const { 
  sendAccountApprovalNotification, 
  sendAccountRejectionNotification 
} = require('../utils/notificationService');

// Check if email already exists
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Check if email exists in database (case-insensitive)
    const existingPatient = await Patient.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    res.json({
      success: true,
      exists: existingPatient ? true : false,
      message: existingPatient 
        ? 'Email is already registered' 
        : 'Email is available'
    });
  } catch (err) {
    console.error('Email check error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error checking email', 
      error: err.message 
    });
  }
});

// Patient login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const patient = await Patient.findOne({ email });
    if (!patient) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if patient is approved
    if (!patient.approved) {
      return res.status(403).json({ success: false, message: 'Account not yet approved by admin' });
    }

    // Check if patient is archived
    if (patient.archived) {
      return res.status(403).json({ success: false, message: 'Account is archived. Please contact admin.' });
    }

    const isMatch = await bcrypt.compare(password, patient.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: patient._id, role: 'patient' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '30d' });

    const patientData = patient.toObject();
    delete patientData.password;

    res.json({
      success: true,
      patient: patientData,
      token
    });
  } catch (err) {
    console.error('Patient login error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Get available slots for a specific dialysis schedule
router.get('/available-slots/:schedule', async (req, res) => {
  try {
    const { schedule } = req.params;
    
    if (!['MWF', 'TTHS'].includes(schedule)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid dialysis schedule. Must be either MWF or TTHS'
      });
    }

    // Get all occupied slots for this schedule
    const occupiedSlots = await Patient.find({ 
      dialysisSchedule: schedule, 
      archived: false,
      appointmentSlot: { $exists: true },
      assignedTimeSlot: { $exists: true }
    }).select('appointmentSlot assignedTimeSlot');

    // Create available slots structure
    const availableSlots = {
      morning: [],
      afternoon: []
    };

    // Track occupied slots
    const occupied = {
      morning: new Set(),
      afternoon: new Set()
    };

    occupiedSlots.forEach(patient => {
      if (patient.assignedTimeSlot && patient.appointmentSlot) {
        occupied[patient.assignedTimeSlot].add(patient.appointmentSlot);
      }
    });

    // Generate available slots (1-15 for each time period)
    for (let slot = 1; slot <= 15; slot++) {
      if (!occupied.morning.has(slot)) {
        availableSlots.morning.push(slot);
      }
      if (!occupied.afternoon.has(slot)) {
        availableSlots.afternoon.push(slot);
      }
    }

    res.json({
      success: true,
      data: {
        schedule,
        availableSlots,
        occupiedCount: {
          morning: occupied.morning.size,
          afternoon: occupied.afternoon.size
        }
      }
    });
  } catch (err) {
    console.error('Error fetching available slots:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

// Check if PID number is already taken
router.post('/check-pid-availability', async (req, res) => {
  try {
    const { pidNumber } = req.body;

    if (!pidNumber || pidNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'PID number is required'
      });
    }

    // Check if PID already exists (excluding archived patients)
    const existingPatient = await Patient.findOne({
      pidNumber: pidNumber.trim(),
      archived: false
    });

    res.json({
      success: true,
      available: !existingPatient,
      message: existingPatient ? 'PID number is already taken' : 'PID number is available'
    });
  } catch (err) {
    console.error('Error checking PID availability:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// Check if a specific slot is available
router.post('/check-slot-availability', async (req, res) => {
  try {
    const { dialysisSchedule, appointmentSlot, assignedTimeSlot } = req.body;

    if (!dialysisSchedule || !appointmentSlot || !assignedTimeSlot) {
      return res.status(400).json({
        success: false,
        message: 'dialysisSchedule, appointmentSlot, and assignedTimeSlot are required'
      });
    }

    if (!['MWF', 'TTHS'].includes(dialysisSchedule)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dialysis schedule'
      });
    }

    if (!['morning', 'afternoon'].includes(assignedTimeSlot)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time slot'
      });
    }

    if (appointmentSlot < 1 || appointmentSlot > 15) {
      return res.status(400).json({
        success: false,
        message: 'Appointment slot must be between 1 and 15'
      });
    }

    // Check if slot is already taken
    const existingPatient = await Patient.findOne({
      dialysisSchedule,
      appointmentSlot,
      assignedTimeSlot,
      archived: false
    });

    res.json({
      success: true,
      available: !existingPatient,
      message: existingPatient ? 'Slot is already taken' : 'Slot is available'
    });
  } catch (err) {
    console.error('Error checking slot availability:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// Get today's appointments - MOVE THIS ABOVE THE /:id ROUTE
router.get('/today-appointments', async (req, res) => {
  try {
    const today = moment().tz('Asia/Manila').format('YYYY-MM-DD');
    
    // Get approved reschedule requests for today first
    const approvedReschedules = await RescheduleRequest.find({
      requestedDate: today,
      status: 'approved'
    }).populate('patient', 'firstName lastName pidNumber email phone');
    
    // Get the patient IDs who have approved reschedules for today
    const rescheduledPatientIds = approvedReschedules.map(req => req.patient._id.toString());
    
    // Get booked appointment slots for today, excluding patients who have reschedules
    const bookedSlots = await AppointmentSlot.find({ 
      date: today, 
      isBooked: true 
    }).populate('patient', 'firstName lastName pidNumber email phone');
    
    // Filter out patients who have approved reschedules
    const regularSlots = bookedSlots.filter(slot => 
      slot.patient && !rescheduledPatientIds.includes(slot.patient._id.toString())
    );
    
    // For reschedules, find their actual booked slots to get the real slot number
    const rescheduledAppointments = [];
    for (const reschedule of approvedReschedules) {
      // Find the slot that was booked for this rescheduled patient
      const rescheduledSlot = bookedSlots.find(slot => 
        slot.patient && slot.patient._id.toString() === reschedule.patient._id.toString()
      );
      
      rescheduledAppointments.push({
        _id: reschedule._id,
        patient: reschedule.patient,
        slotNumber: rescheduledSlot ? rescheduledSlot.slotNumber : 'TBD',
        timeSlot: rescheduledSlot ? rescheduledSlot.timeSlot : 'afternoon',
        type: 'reschedule',
        isReschedule: true
      });
    }
    
    // Combine both data sources
    const todayAppointments = [
      ...regularSlots.map(slot => ({
        _id: slot._id,
        patient: slot.patient,
        slotNumber: slot.slotNumber,
        timeSlot: slot.timeSlot,
        type: 'regular',
        isBooked: true
      })),
      ...rescheduledAppointments
    ];
    
    res.json({
      success: true,
      appointments: todayAppointments,
      date: today
    });
  } catch (err) {
    console.error('Error fetching today\'s appointments:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// Registration endpoint (separate from general POST to match Flutter app)
router.post('/register', async (req, res) => {
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
      familyHistory,
      pidNumber,     
      dialysisSchedule,
      assignedTimeSlot
    } = req.body;
    
    // Don't assign appointmentSlot during registration - patients book slots later
    let { appointmentSlot } = req.body;

    const requiredFields = [
      'firstName', 'lastName', 'birthday', 'email', 'phone', 'address', 'password',
      'hospital', 'bloodType', 'gender', 'emergencyContact', 'weight', 'height',
      'dialysisSchedule', 'assignedTimeSlot'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'All required fields must be provided',
        missingFields
      });
    }

    if (!emergencyContact.name || !emergencyContact.relationship || !emergencyContact.phone) {
      return res.status(400).json({ 
        success: false,
        message: 'Emergency contact must include name, relationship, and phone'
      });
    }

    if (!['MWF', 'TTHS'].includes(dialysisSchedule)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid dialysis schedule. Must be either MWF or TTHS'
      });
    }

    if (!['morning', 'afternoon'].includes(assignedTimeSlot)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time slot. Must be either morning or afternoon'
      });
    }

    // During registration, we don't assign specific appointment slots
    appointmentSlot = undefined; // Don't assign a slot during registration

    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res.status(400).json({ 
        success: false,
        message: 'Patient already exists' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newPatientData = {
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
      familyHistory,
      pidNumber,    
      dialysisSchedule,
      assignedTimeSlot
    };

    // Only include appointmentSlot if it's provided
    if (appointmentSlot !== undefined) {
      newPatientData.appointmentSlot = appointmentSlot;
      newPatientData.slotBookedAt = new Date();
    }

    const newPatient = new Patient(newPatientData);
    await newPatient.save();
    
    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: newPatient._id, role: 'patient' }, 
      process.env.JWT_SECRET || 'your-secret-key', 
      { expiresIn: '30d' }
    );
    
    const patientData = newPatient.toObject();
    delete patientData.password;

    // Return format expected by Flutter app
    res.status(201).json({
      success: true,
      patient: patientData,
      token: token
    });
  } catch (err) {
    console.error('Error registering patient:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

router.post('/', async (req, res) => {
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
      familyHistory,
      pidNumber,     
      dialysisSchedule,
      assignedTimeSlot
    } = req.body;
    
    // Don't assign appointmentSlot during registration - patients book slots later
    let { appointmentSlot } = req.body;

    const requiredFields = [
      'firstName', 'lastName', 'birthday', 'email', 'phone', 'address', 'password',
      'hospital', 'bloodType', 'gender', 'emergencyContact', 'weight', 'height',
      'dialysisSchedule', 'assignedTimeSlot'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'All required fields must be provided',
        missingFields
      });
    }

    if (!emergencyContact.name || !emergencyContact.relationship || !emergencyContact.phone) {
      return res.status(400).json({ 
        success: false,
        message: 'Emergency contact must include name, relationship, and phone'
      });
    }

    if (!['MWF', 'TTHS'].includes(dialysisSchedule)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid dialysis schedule. Must be either MWF or TTHS'
      });
    }

    if (!['morning', 'afternoon'].includes(assignedTimeSlot)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time slot. Must be either morning or afternoon'
      });
    }

    // During registration, we don't assign specific appointment slots
    // Patients will book specific slots later through the appointment system
    // We just store their schedule preference (MWF/TTHS) and time preference (morning/afternoon)
    appointmentSlot = undefined; // Don't assign a slot during registration

    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res.status(400).json({ 
        success: false,
        message: 'Patient already exists' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newPatientData = {
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
      familyHistory,
      pidNumber,    
      dialysisSchedule,
      assignedTimeSlot
    };

    // Only include appointmentSlot if it's provided
    if (appointmentSlot !== undefined) {
      newPatientData.appointmentSlot = appointmentSlot;
      newPatientData.slotBookedAt = new Date();
    }

    const newPatient = new Patient(newPatientData);

    await newPatient.save();
    
    const patientData = newPatient.toObject();
    delete patientData.password;

    res.status(201).json({
      success: true,
      data: patientData,
    });
  } catch (err) {
    console.error('Error registering patient:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const patients = await Patient.find().select('-password'); 
    res.json({
      success: true,
      data: patients
    });
  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

router.get('/archived', async (req, res) => {
  try {
    const archivedPatients = await Patient.find({ archived: true }).select('-password');
    res.json({
      success: true,
      data: archivedPatients
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

// IMPORTANT: Place all specific routes ABOVE this generic :id route
router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }
    res.json({
      success: true,
      data: patient
    });
  } catch (err) {
    console.error('Error fetching patient:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

router.put('/:id', async (req, res) => {
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

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
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
      data: updatedPatient,
    });
  } catch (err) {
    console.error('Error updating patient:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const archivedPatient = await Patient.findByIdAndUpdate(
      req.params.id,
      { archived: true },
      { new: true }
    );

    if (!archivedPatient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    res.json({
      success: true,
      message: 'Patient archived successfully',
      data: archivedPatient
    });
  } catch (err) {
    console.error('Error archiving patient:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

router.post('/export/pdf', async (req, res) => {
  try {
    const { patients } = req.body;
    if (!patients || !Array.isArray(patients) || patients.length === 0) {
      return res.status(400).json({ message: 'No patients provided' });
    }

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="patients.pdf"');
    doc.pipe(res);

    doc.fontSize(20).text('Patient List', { align: 'center' });
    doc.moveDown();

    patients.forEach((p, idx) => {
      doc
        .fontSize(13)
        .fillColor('#263a99')
        .text(`${idx + 1}. ${p.firstName} ${p.middleName || ''} ${p.lastName}`, { continued: true })
        .fillColor('black')
        .text(`   (${p.gender}, ${p.bloodType})`);
      doc.fontSize(11);
      doc.text(`Birthday: ${p.birthday ? new Date(p.birthday).toLocaleDateString() : ''}   Age: ${p.birthday ? Math.floor((Date.now() - new Date(p.birthday)) / (365.25 * 24 * 60 * 60 * 1000)) : ''} yrs`);
      doc.text(`Email: ${p.email || ''}   Phone: ${p.phone || ''}`);
      doc.text(`Address: ${p.address || ''}`);
      doc.text(`Height: ${p.height || ''} cm   Weight: ${p.weight || ''} kg   Hospital: ${p.hospital || ''}`);
      doc.text(`Dialysis Schedule: ${p.dialysisSchedule || ''}`);
      doc.text(`Allergies: ${Array.isArray(p.allergies) ? p.allergies.join(', ') : (p.allergies || '')}`);
      doc.text(`Current Medications: ${Array.isArray(p.currentMedications) ? p.currentMedications.join(', ') : (p.currentMedications || '')}`);
      doc.text(`Medical History: ${p.medicalHistory || ''}`);
      if (p.emergencyContact) {
        doc.text(
          `Emergency Contact: ${p.emergencyContact.name || ''} (${p.emergencyContact.relationship || ''}) - ${p.emergencyContact.phone || ''}`
        );
      }
      doc.moveDown(1.5);
      doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.options.margin, doc.y).strokeColor('#e0e7ef').stroke();
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Failed to export PDF', error: err.message });
  }
});

router.post('/device-token', async (req, res) => {
  try {
    const { patientId, deviceToken } = req.body;
    
    if (!patientId || !deviceToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'patientId and deviceToken are required' 
      });
    }
    
    // Update MongoDB
    const updatedPatient = await Patient.findByIdAndUpdate(
      patientId, 
      { deviceToken },
      { new: true }
    );
    
    if (!updatedPatient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }
    
    console.log(`📱 Device token saved for patient: ${updatedPatient.firstName} ${updatedPatient.lastName}`);
    
    // Optionally, update Firestore only if Firebase is initialized
    try {
      if (admin.apps.length > 0) {
        await admin.firestore().collection('patients').doc(patientId).set(
          { deviceToken },
          { merge: true }
        );
        console.log('✅ Device token also saved to Firestore');
      }
    } catch (firebaseError) {
      // Firebase is optional, don't fail if it's not available
      console.log('⚠️ Firestore update skipped (Firebase not initialized)');
    }
    
    res.json({ 
      success: true,
      message: 'Device token saved successfully' 
    });
  } catch (err) {
    console.error('Error saving device token:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

router.put('/:id/next-appointment', async (req, res) => {
  try {
    const { nextAppointment } = req.body;
    if (!nextAppointment) {
      return res.status(400).json({ success: false, message: 'nextAppointment is required' });
    }
    const updatedPatient = await Patient.findByIdAndUpdate(
      req.params.id,
      { nextAppointment: new Date(nextAppointment) },
      { new: true }
    ).select('-password');
    if (!updatedPatient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true, data: updatedPatient });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update nextAppointment', error: err.message });
  }
});

// PUT /api/patients/:id/reject - Reject patient registration
router.put('/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body; // Optional rejection reason
    
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ 
        success: false,
        message: 'Patient not found' 
      });
    }

    // Send push notification before updating/deleting
    try {
      const notificationResult = await sendAccountRejectionNotification(patient, reason);
      if (notificationResult.success) {
        console.log(`✅ Rejection notification sent to ${patient.firstName} ${patient.lastName}`);
      } else {
        console.log(`⚠️ Could not send notification: ${notificationResult.reason}`);
      }
    } catch (notifError) {
      console.error('Could not send notification:', notifError.message);
      // Don't fail the rejection just because notification failed
    }

    // Delete the patient (or you can mark as rejected instead)
    await Patient.findByIdAndDelete(req.params.id);

    res.status(200).json({ 
      success: true,
      message: 'Patient rejected successfully',
      notificationSent: true
    });
  } catch (error) {
    console.error('Error rejecting patient:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// This route should also be moved above /:id if it exists
router.get('/today-patients', async (req, res) => {
  const moment = require('moment-timezone');
  const today = moment().tz('Asia/Manila');
  const dayName = today.format('dddd'); // e.g., 'Sunday'

  const patients = await Patient.find({ archived: { $ne: true } });
  const todayPatients = patients.filter(patient => {
    if (patient.dialysisSchedule === 'MWF') {
      return ['Monday', 'Wednesday', 'Friday'].includes(dayName);
    }
    if (patient.dialysisSchedule === 'TTHS') {
      return ['Tuesday', 'Thursday', 'Saturday'].includes(dayName);
    }
    return false;
  });

  res.json(todayPatients);
});

// PUT /api/patients/:id/change-password - Change patient password (Super Admin only)
router.put('/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 9 characters long'
      });
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update patient password
    patient.password = hashedPassword;
    await patient.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing patient password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;