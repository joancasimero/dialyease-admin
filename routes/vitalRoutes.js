const express = require('express');
const router = express.Router();
const Vital = require('../models/Vital');
const { protect } = require('../middlewares/authMiddleware');
const admin = require('firebase-admin'); // Already initialized in server.js

router.post('/', protect, async (req, res) => {
  try {
    // Validate required fields
    const requiredFields = ['preHd', 'postHd', 'medications', 'intraHdMonitoring', 'vascularAccessEvaluation', 'anticoagulation'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // Check if vital already exists for this patient on this date
    const appointmentDate = new Date(req.body.appointmentDate);
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingVital = await Vital.findOne({
      patient: req.body.patient,
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (existingVital) {
      return res.status(400).json({ 
        success: false, 
        message: 'A vital record already exists for this patient today. Each patient can only have one vital record per day.' 
      });
    }

    // Add nurse field from req.user (set by authMiddleware)
    const vitalData = {
      ...req.body,
      nurse: req.user._id // <-- Add this line
    };
    const vital = await Vital.create(vitalData);

    // After saving to MongoDB
    try {
      await admin.firestore().collection('vitals').add({
  patient: req.body.patient?.toString(), // convert ObjectId to string
  nurse: req.user._id?.toString(),       // convert ObjectId to string
  appointmentDate: req.body.appointmentDate,
  appointmentSlot: req.body.appointmentSlot,
  preHd: req.body.preHd,
  postHd: req.body.postHd,
  medications: req.body.medications,
  intraHdMonitoring: req.body.intraHdMonitoring,
  vascularAccessEvaluation: req.body.vascularAccessEvaluation,
  anticoagulation: req.body.anticoagulation,
  nurseNotes: req.body.nurseNotes,
  createdAt: new Date()
});
    } catch (firestoreErr) {
      console.error('Firestore error:', firestoreErr);
      // Optionally, return error or continue
    }

    res.status(201).json({ success: true, vital });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});



// Check if vital exists for patient on specific date
router.get('/check-exists/:patientId/:date', protect, async (req, res) => {
  try {
    const { patientId, date } = req.params;
    
    const appointmentDate = new Date(date);
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingVital = await Vital.findOne({
      patient: patientId,
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    res.json({ 
      success: true, 
      exists: !!existingVital,
      vital: existingVital ? {
        _id: existingVital._id,
        createdAt: existingVital.createdAt,
        nurse: existingVital.nurse
      } : null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get vitals for a specific patient
router.get('/patient/:patientId', protect, async (req, res) => {
  try {
    const { patientId } = req.params;
    const vitals = await Vital.find({ patient: patientId })
      .populate('nurse', 'firstName lastName')
      .sort({ createdAt: -1 }); // Sort by newest first

    res.json({ success: true, vitals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;