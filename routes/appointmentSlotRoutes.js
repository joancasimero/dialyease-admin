const express = require('express');
const router = express.Router();
const RescheduleRequest = require('../models/RescheduleRequest');
const AppointmentSlot = require('../models/AppointmentSlot');
const Machine = require('../models/Machine');
const Patient = require('../models/Patient');
const { sendRescheduleApprovalNotification, sendRescheduleDenialNotification } = require('../utils/notificationService');
const { protect } = require('../middlewares/authMiddleware');
// Submit a reschedule request (patient)
router.post('/reschedule-request', protect, async (req, res) => {
  try {
    const { patientId, requestedDate, originalScheduledDate } = req.body;
    if (!patientId || !requestedDate || !originalScheduledDate) {
      return res.status(400).json({ message: 'patientId, requestedDate, and originalScheduledDate are required.' });
    }

    const reqDoc = await RescheduleRequest.create({
      patient: patientId,
      requestedDate,
      originalScheduledDate,
      seen: false
    });
    res.status(201).json({ success: true, request: reqDoc });
  } catch (err) {
    console.error('Error submitting reschedule request:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// List all pending reschedule requests (admin)
router.get('/reschedule-requests', protect, async (req, res) => {
  try {
    const requests = await RescheduleRequest.find({ status: 'pending' })
      .populate('patient', 'firstName lastName pidNumber dialysisSchedule assignedTimeSlot');

    // No need to recalculate originalScheduledDate, just use what's in the model
    res.json({ success: true, requests });
  } catch (err) {
    console.error('Error fetching reschedule requests:', err); // Add this for debugging
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve a reschedule request (admin)
router.post('/reschedule-requests/:id/approve', protect, async (req, res) => {
  try {
    const request = await RescheduleRequest.findById(req.params.id).populate('patient');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

    request.status = 'approved';
    await request.save();

    // Send push notification to patient
    try {
      const patient = request.patient;
      if (patient) {
        const formattedDate = new Date(request.requestedDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        const notificationResult = await sendRescheduleApprovalNotification(patient, formattedDate);
        
        if (notificationResult.success) {
          console.log(`✅ Reschedule approval notification sent to ${patient.firstName} ${patient.lastName}`);
        } else {
          console.log(`⚠️ Could not send notification: ${notificationResult.reason}`);
        }
      }
    } catch (notifError) {
      console.error('Error sending reschedule approval notification:', notifError.message);
      // Don't fail the approval just because notification failed
    }

    // Find an available afternoon slot for the requested date
    const slot = await AppointmentSlot.findOne({
      date: request.requestedDate,
      timeSlot: 'afternoon',
      isBooked: false,
      isDisabled: { $ne: true }
    });

    if (!slot) {
      return res.json({
        success: true,
        request,
        message: 'Reschedule approved, but no available afternoon slot for this date.',
        notificationSent: true
      });
    }

    // Book the slot for the patient
    slot.patient = request.patient._id;
    slot.isBooked = true;
    slot.bookedAt = new Date();
    slot.status = 'booked';
    await slot.save();

    // Optionally update patient record (if you track slot info there)
    await Patient.findByIdAndUpdate(request.patient._id, {
      appointmentSlot: slot.slotNumber,
      assignedMachine: slot.machine,
      assignedTimeSlot: 'afternoon',
      slotBookedAt: new Date()
    });

    res.json({
      success: true,
      request,
      bookedSlot: {
        date: slot.date,
        timeSlot: slot.timeSlot,
        slotNumber: slot.slotNumber,
        machine: slot.machine,
        patient: slot.patient
      },
      message: 'Reschedule approved and afternoon slot claimed.',
      notificationSent: true
    });
  } catch (err) {
    console.error('Error approving reschedule request:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Deny a reschedule request (admin)
router.post('/reschedule-requests/:id/deny', protect, async (req, res) => {
  try {
    const request = await RescheduleRequest.findById(req.params.id).populate('patient');
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Request not found or already processed.' });
    }
    
    const reason = req.body.reason || 'Denied by admin.';
    request.status = 'denied';
    request.adminResponse = reason;
    await request.save();

    // Send push notification to patient
    try {
      const patient = request.patient;
      if (patient) {
        const originalDate = new Date(request.originalScheduledDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        const requestedDate = new Date(request.requestedDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        const notificationResult = await sendRescheduleDenialNotification(
          patient, 
          reason,
          originalDate,
          requestedDate
        );
        
        if (notificationResult.success) {
          console.log(`✅ Reschedule denial notification sent to ${patient.firstName} ${patient.lastName}`);
        } else {
          console.log(`⚠️ Could not send notification: ${notificationResult.reason}`);
        }
      }
    } catch (notifError) {
      console.error('Error sending reschedule denial notification:', notifError.message);
      // Don't fail the denial just because notification failed
    }

    res.json({ 
      success: true, 
      message: 'Reschedule request denied.',
      notificationSent: true
    });
  } catch (err) {
    console.error('Error denying reschedule request:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle disable/enable for a slot (admin only)
router.post('/:id/toggle-disable', protect, async (req, res) => {
  try {
    const slot = await AppointmentSlot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    slot.isDisabled = !slot.isDisabled;
    await slot.save();
    res.json({
      message: `Slot has been ${slot.isDisabled ? 'disabled' : 'enabled'} for booking`,
      slot
    });
  } catch (err) {
    console.error('Error toggling slot disable:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Initialize slots for a specific date
router.post('/initialize-slots', protect, async (req, res) => {
  try {
    const { date } = req.body; // Format: YYYY-MM-DD
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    // Check if slots already exist for this date
    const existingSlots = await AppointmentSlot.find({ date });
    if (existingSlots.length > 0) {
      return res.status(400).json({ message: 'Slots already initialized for this date' });
    }

    // Get all active machines
    const machines = await Machine.find({ isActive: true }).limit(15);
    if (machines.length < 15) {
      return res.status(400).json({ 
        message: `Need 15 active machines, but only ${machines.length} found` 
      });
    }

    const slots = [];

    // Create morning slots (1-15)
    for (let i = 1; i <= 15; i++) {
      slots.push({
        date,
        timeSlot: 'morning',
        slotNumber: i,
        machine: machines[i - 1]._id
      });
    }

    // Create afternoon slots (1-15)
    for (let i = 1; i <= 15; i++) {
      slots.push({
        date,
        timeSlot: 'afternoon',
        slotNumber: i,
        machine: machines[i - 1]._id
      });
    }

    await AppointmentSlot.insertMany(slots);

    res.status(201).json({
      message: 'Appointment slots initialized successfully',
      totalSlots: slots.length
    });
  } catch (err) {
    console.error('Error initializing slots:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get slots for a specific date
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    const slots = await AppointmentSlot.find({ date })
      .populate('machine', 'name')
      .populate('patient', 'firstName lastName pidNumber')
      .sort({ timeSlot: 1, slotNumber: 1 });

    const morningSlots = slots.filter(slot => slot.timeSlot === 'morning');
    const afternoonSlots = slots.filter(slot => slot.timeSlot === 'afternoon');

    res.json({
      date,
      morning: morningSlots,
      afternoon: afternoonSlots,
      totalSlots: slots.length,
      bookedSlots: slots.filter(slot => slot.isBooked).length,
      availableSlots: slots.filter(slot => !slot.isBooked).length
    });
  } catch (err) {
    console.error('Error fetching slots:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Book a slot (for mobile app)
router.post('/book', protect, async (req, res) => {
  try {
    const { date, timeSlot, slotNumber, patientId } = req.body;

    if (!date || !timeSlot || !slotNumber || !patientId) {
      return res.status(400).json({ 
        message: 'Date, timeSlot, slotNumber, and patientId are required' 
      });
    }

    // Check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }


    // Unassign any existing slot for this patient on this date (allow changing slot)
    const existingBooking = await AppointmentSlot.findOne({
      date,
      patient: patientId
    });
    if (existingBooking) {
      existingBooking.patient = null;
      existingBooking.isBooked = false;
      existingBooking.bookedAt = null;
      existingBooking.status = 'available';
      await existingBooking.save();
    }

    // Find the slot
    const slot = await AppointmentSlot.findOne({ 
      date, 
      timeSlot, 
      slotNumber 
    }).populate('machine');

    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    if (slot.isBooked) {
      return res.status(400).json({ message: 'Slot already booked' });
    }

    // Book the slot
    slot.patient = patientId;
    slot.isBooked = true;
    slot.bookedAt = new Date();
    slot.status = 'booked';
    await slot.save();

    // Update patient record
    await Patient.findByIdAndUpdate(patientId, {
      appointmentSlot: slotNumber,
      assignedMachine: slot.machine._id,
      slotBookedAt: new Date()
    });

    await slot.populate('patient', 'firstName lastName pidNumber');

    res.json({
      message: 'Slot booked successfully',
      slot: {
        date: slot.date,
        timeSlot: slot.timeSlot,
        slotNumber: slot.slotNumber,
        machine: slot.machine.name,
        patient: slot.patient
      }
    });
  } catch (err) {
    console.error('Error booking slot:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel a slot booking
router.post('/cancel', protect, async (req, res) => {
  try {
    const { date, patientId } = req.body;

    const slot = await AppointmentSlot.findOne({ 
      date, 
      patient: patientId 
    }).populate('machine');

    if (!slot) {
      return res.status(404).json({ message: 'No booking found for this patient on this date' });
    }

    // Clear the slot
    slot.patient = null;
    slot.isBooked = false;
    slot.bookedAt = null;
    slot.status = 'available';
    await slot.save();

    // Clear patient assignment
    await Patient.findByIdAndUpdate(patientId, {
      appointmentSlot: null,
      assignedMachine: null,
      slotBookedAt: null
    });

    res.json({
      message: 'Slot cancelled successfully',
      slot: {
        date: slot.date,
        timeSlot: slot.timeSlot,
        slotNumber: slot.slotNumber,
        machine: slot.machine.name
      }
    });
  } catch (err) {
    console.error('Error cancelling slot:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available slots for a patient
router.get('/available/:date/:patientId', async (req, res) => {
  try {
    const { date, patientId } = req.params;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Check if patient's schedule matches the current day
    const dayOfWeek = new Date(date).getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[dayOfWeek];

    let isScheduledDay = false;
    if (patient.dialysisSchedule === 'MWF') {
      isScheduledDay = ['Monday', 'Wednesday', 'Friday'].includes(currentDay);
    } else if (patient.dialysisSchedule === 'TTHS') {
      isScheduledDay = ['Tuesday', 'Thursday', 'Saturday'].includes(currentDay);
    }

    if (!isScheduledDay) {
      return res.json({
        message: 'Patient is not scheduled for dialysis on this day',
        availableSlots: []
      });
    }

    // Get all available slots for the date (both morning and afternoon)
    const availableSlots = await AppointmentSlot.find({
      date,
      isBooked: false
    }).populate('machine', 'name').sort({ timeSlot: 1, slotNumber: 1 });

    res.json({
      availableSlots,
      totalAvailable: availableSlots.length
    });
  } catch (err) {
    console.error('Error fetching available slots:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all reschedule requests for a specific patient (for mobile app)
router.get('/reschedule-requests/patient/:patientId', protect, async (req, res) => {
  const { patientId } = req.params;

  // Only allow patient to access their own requests
  if (req.userType === 'patient' && patientId !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const requests = await RescheduleRequest.find({ patient: patientId });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Mark all reschedule requests as seen for a patient
router.post('/reschedule-requests/patient/:patientId/mark-seen', async (req, res) => {
  try {
    const { patientId } = req.params;
    await RescheduleRequest.updateMany({ patient: patientId, seen: false }, { $set: { seen: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all confirmed appointments for a patient (history)
router.get('/patient/:patientId/history', async (req, res) => {
  try {
    const { patientId } = req.params;
    // Find all slots booked by this patient, status 'booked' or 'completed'
    const slots = await AppointmentSlot.find({
      patient: patientId,
      status: { $in: ['booked', 'completed'] }
    }).sort({ bookedAt: -1 });

    // Format for frontend
    const history = slots.map(slot => ({
      date: slot.date,
      timeSlot: slot.timeSlot,
      slotNumber: slot.slotNumber,
      bookedAt: slot.bookedAt,
      status: slot.status
    }));

    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get approved reschedule requests for a specific date
router.get('/reschedule-requests/approved-for-date', protect, async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    const approvedRequests = await RescheduleRequest.find({ 
      requestedDate: date,
      status: 'approved'
    }).populate('patient', 'firstName lastName pidNumber email phone');

    res.json({
      success: true,
      requests: approvedRequests
    });
  } catch (err) {
    console.error('Error fetching approved reschedule requests:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
