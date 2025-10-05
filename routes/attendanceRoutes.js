const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Patient = require('../models/Patient');
const AppointmentSlot = require('../models/AppointmentSlot'); // Import AppointmentSlot model
const { protect } = require('../middlewares/authMiddleware');

// Import the Socket.IO instance
let io;
const setSocketIO = (socketInstance) => {
  io = socketInstance;
};

// Helper function to get Philippines date string
const getPhilippineDateStr = () => {
  const now = new Date();
  const phTime = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60000);
  return phTime.toISOString().split('T')[0];
};

// Helper function to get Philippines time string
const getPhilippineTimeStr = () => {
  const now = new Date();
  const phTime = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60000);
  return phTime.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5);
};

router.post('/mark', protect, async (req, res) => {
  const { patientId, date, status, time } = req.body;
  if (!patientId || !date || !status) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const update = { status };
    if (status === 'present') {
      update.time = time || getPhilippineTimeStr(); 
    } else {
      update.time = undefined;
    }
    const record = await Attendance.findOneAndUpdate(
      { patient: patientId, date },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // If status is 'present' and admin marked it, emit socket event to patient
    if (status === 'present' && io) {
      try {
        // Get patient details for the notification
        const patient = await Patient.findById(patientId);
        if (patient) {
          // Find the patient's appointment slot and machine for today
          const slot = await AppointmentSlot.findOne({
            date: date,
            patient: patientId,
            isBooked: true
          }).populate('machine');

          const notificationData = {
            type: 'admin_check_in',
            patientId: patientId,
            patientName: `${patient.firstName} ${patient.lastName}`,
            date: date,
            time: update.time,
            machine: slot?.machine?.name || 'N/A',
            assignedTimeSlot: patient.assignedTimeSlot,
            appointmentSlot: patient.appointmentSlot
          };

          // Emit to specific patient room
          io.to(`patient_${patientId}`).emit('admin_marked_present', notificationData);
          console.log(`Emitted admin_marked_present to patient_${patientId}:`, notificationData);
        }
      } catch (socketError) {
        console.error('Error emitting socket event:', socketError);
        // Don't fail the request if socket emission fails
      }
    }

    res.json(record);
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark attendance', error: err.message });
  }
});
// Radar check-in: no auth required, but you may add auth if needed
router.post('/radar-checkin', async (req, res) => {
  const { patientId } = req.body;
  if (!patientId) {
    return res.status(400).json({ message: 'Missing patientId' });
  }
  try {
    // Get patient info
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    // Check if patient has a booked slot for today using Philippines time
    const yyyyMMdd = getPhilippineDateStr();

    // Find appointment slot for today
    const slot = await AppointmentSlot.findOne({
      date: yyyyMMdd,
      patient: patientId,
      isBooked: true,
      status: { $in: ['booked', 'completed'] }
    });

    if (!slot) {
      return res.status(403).json({ 
        success: false, 
        message: 'No confirmed appointment for today. Check-in not allowed.' 
      });
    }

    // Optionally: Check time slot (morning/afternoon) vs current time using Philippines time
    // Example: Only allow check-in during the correct time slot
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60000);
    const nowHour = phTime.getHours();
    if (slot.timeSlot === 'morning' && nowHour >= 12) {
      return res.status(403).json({ 
        success: false, 
        message: 'Morning slot check-in only allowed before 12pm.' 
      });
    }
    if (slot.timeSlot === 'afternoon' && nowHour < 12) {
      return res.status(403).json({ 
        success: false, 
        message: 'Afternoon slot check-in only allowed after 12pm.' 
      });
    }

    // Mark attendance as present using Philippines time
    const update = {
      status: 'present',
      time: getPhilippineTimeStr()
    };
    const record = await Attendance.findOneAndUpdate(
      { patient: patientId, date: yyyyMMdd },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, attendance: record });
  } catch (err) {
    return res.status(500).json({ message: 'Radar check-in failed', error: err.message });
  }
});

router.get('/', protect, async (req, res) => {
  let patientId;
  if (req.userType === 'patient') {
    patientId = req.user._id.toString();
  } else {
    patientId = req.query.patientId;
  }

  // Support date-based query for dashboard
  const { date, month, year } = req.query;

  const filter = {};
  if (patientId) filter.patient = patientId;
  if (date) {
    filter.date = date;
  } else if (month && year) {
    const monthStr = month.toString().padStart(2, '0');
    filter.date = { $regex: `^${year}-${monthStr}-` };
  }

  try {
    const records = await Attendance.find(filter).populate('patient');
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance', error: err.message });
  }
});

// This endpoint should be protected!
router.get('/api/attendance', protect, async (req, res) => {
  // Always use the logged-in patient's ID
  let patientId = req.query.patientId;
  if (req.userType === 'patient') {
    patientId = req.user._id.toString();
  }
  // Extract month and year from query parameters
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ message: 'Month and year are required.' });
  }

  const monthStr = month.toString().padStart(2, '0');

  const filter = {};
  if (patientId) filter.patient = patientId;
  if (month && year) {
    filter.date = { $regex: `^${year}-${month.padStart(2, '0')}-` };
  }
  try {
    const records = await Attendance.find(filter);
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance', error: err.message });
  }
});

// Update preWeight for a patient's attendance record
router.put('/pre-weight', async (req, res) => {
  const { patientId, date, preWeight } = req.body;
  if (!patientId || !date || preWeight === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const record = await Attendance.findOneAndUpdate(
      { patient: patientId, date },
      { preWeight },
      { new: true }
    );
    res.json({ success: true, attendance: record });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update pre-weight', error: err.message });
  }
});

// Update postWeight for a patient's attendance record
router.put('/post-weight', async (req, res) => {
  const { patientId, date, postWeight } = req.body;
  if (!patientId || !date || postWeight === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const record = await Attendance.findOneAndUpdate(
      { patient: patientId, date },
      { postWeight },
      { new: true }
    );
    res.json({ success: true, attendance: record });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update post-weight', error: err.message });
  }
});

// Export both the router and setSocketIO function
module.exports = router;
module.exports.setSocketIO = setSocketIO;