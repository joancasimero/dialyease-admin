const express = require('express');
const router = express.Router();
const Vital = require('../models/Vital');
const { protect } = require('../middlewares/authMiddleware');
const admin = require('firebase-admin'); // Already initialized in server.js

router.post('/', protect, async (req, res) => {
  try {
    // Validate required fields
    const requiredFields = ['patient', 'appointmentDate', 'preHd', 'postHd', 'medications', 'intraHdMonitoring', 'vascularAccessEvaluation', 'anticoagulation'];
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

    let vital;
    let isUpdate = false;

    if (existingVital) {
      // Update existing vital
      vital = await Vital.findByIdAndUpdate(
        existingVital._id,
        {
          ...req.body,
          nurse: req.user._id,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );
      isUpdate = true;
    } else {
      // Create new vital
      const vitalData = {
        ...req.body,
        nurse: req.user._id
      };
      vital = await Vital.create(vitalData);
    }

    // Sync to Firestore
    try {
      const firestoreQuery = await admin.firestore()
        .collection('vitals')
        .where('patient', '==', req.body.patient?.toString())
        .where('appointmentDate', '==', req.body.appointmentDate)
        .get();

      const firestoreData = {
        patient: req.body.patient?.toString(),
        nurse: req.user._id?.toString(),
        appointmentDate: req.body.appointmentDate,
        appointmentSlot: req.body.appointmentSlot,
        preHd: req.body.preHd,
        postHd: req.body.postHd,
        medications: req.body.medications,
        intraHdMonitoring: req.body.intraHdMonitoring,
        vascularAccessEvaluation: req.body.vascularAccessEvaluation,
        anticoagulation: req.body.anticoagulation,
        nurseNotes: req.body.nurseNotes,
        updatedAt: new Date()
      };

      if (!firestoreQuery.empty) {
        // Update existing Firestore document
        const docId = firestoreQuery.docs[0].id;
        await admin.firestore().collection('vitals').doc(docId).update(firestoreData);
      } else {
        // Create new Firestore document
        await admin.firestore().collection('vitals').add({
          ...firestoreData,
          createdAt: new Date()
        });
      }
    } catch (firestoreErr) {
      console.error('Firestore error:', firestoreErr);
      // Continue even if Firestore sync fails
    }

    res.status(isUpdate ? 200 : 201).json({ 
      success: true, 
      vital,
      message: isUpdate ? 'Vital record updated successfully' : 'Vital record created successfully'
    });
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

    // Check if vital has complete data (not just partial submissions)
    let isComplete = false;
    if (existingVital) {
      // Consider vital complete if it has at least 2 of the main sections filled
      // or if it has all critical sections (preHd, postHd, intraHdMonitoring)
      const hasPreHd = existingVital.preHd && Object.keys(existingVital.preHd).length > 0 && 
                       (existingVital.preHd.mentalStatus || existingVital.preHd.ambulationStatus);
      const hasPostHd = existingVital.postHd && Object.keys(existingVital.postHd).length > 0 && 
                        (existingVital.postHd.mentalStatus || existingVital.postHd.ambulationStatus);
      const hasMedications = existingVital.medications && existingVital.medications.length > 0;
      const hasIntraHd = existingVital.intraHdMonitoring && existingVital.intraHdMonitoring.length > 0;
      const hasAccessAc = existingVital.vascularAccessEvaluation && 
                          Object.keys(existingVital.vascularAccessEvaluation).length > 0 &&
                          (existingVital.vascularAccessEvaluation.position || 
                           existingVital.vascularAccessEvaluation.catheter);
      
      const filledSections = [hasPreHd, hasPostHd, hasMedications, hasIntraHd, hasAccessAc].filter(Boolean).length;
      
      // Consider complete if at least 3 major sections are filled
      // This means nurses can't enter the form if most of it is already done
      isComplete = filledSections >= 3;
    }

    res.json({ 
      success: true, 
      exists: !!existingVital && isComplete,
      vital: existingVital && isComplete ? {
        _id: existingVital._id,
        createdAt: existingVital.createdAt,
        nurse: existingVital.nurse
      } : null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update vital record by ID
router.put('/:vitalId', protect, async (req, res) => {
  try {
    const { vitalId } = req.params;

    // Validate required fields
    const requiredFields = ['preHd', 'postHd', 'medications', 'intraHdMonitoring', 'vascularAccessEvaluation', 'anticoagulation'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // Find and update the vital
    const updatedVital = await Vital.findByIdAndUpdate(
      vitalId,
      {
        ...req.body,
        nurse: req.user._id, // Update nurse field
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedVital) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vital record not found' 
      });
    }

    // Update in Firestore as well
    try {
      const firestoreQuery = await admin.firestore()
        .collection('vitals')
        .where('patient', '==', req.body.patient?.toString())
        .where('appointmentDate', '==', req.body.appointmentDate)
        .get();

      if (!firestoreQuery.empty) {
        const docId = firestoreQuery.docs[0].id;
        await admin.firestore().collection('vitals').doc(docId).update({
          nurse: req.user._id?.toString(),
          preHd: req.body.preHd,
          postHd: req.body.postHd,
          medications: req.body.medications,
          intraHdMonitoring: req.body.intraHdMonitoring,
          vascularAccessEvaluation: req.body.vascularAccessEvaluation,
          anticoagulation: req.body.anticoagulation,
          nurseNotes: req.body.nurseNotes,
          updatedAt: new Date()
        });
      }
    } catch (firestoreErr) {
      console.error('Firestore update error:', firestoreErr);
      // Continue even if Firestore update fails
    }

    res.json({ success: true, vital: updatedVital });
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