// Add this to your routes folder if not present
const express = require('express');
const router = express.Router();
const RescheduleRequest = require('../models/RescheduleRequest');
const AppointmentSlot = require('../models/AppointmentSlot'); // Ensure this path is correct

// You can add more endpoints here if you want to separate admin/patient logic

router.post('/create', async (req, res) => {
  try {
    const { patient, requestedDate, originalScheduledDate } = req.body;
    // No need to fetch slot anymore
    const request = new RescheduleRequest({
      patient,
      requestedDate,
      originalScheduledDate
    });
    await request.save();
    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all reschedule requests for a patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const requests = await RescheduleRequest.find({ patient: patientId });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
