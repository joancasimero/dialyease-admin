const express = require('express');
const router = express.Router();
const { registerNurse, loginNurse } = require('../controllers/nurseController');
const PDFDocument = require('pdfkit');
const Nurse = require('../models/Nurse');

router.post('/register', registerNurse);
router.post('/login', loginNurse);

// Get all non-archived nurses
router.get('/', async (req, res) => {
  try {
    const nurses = await Nurse.find({ archived: false }).select('-password');
    res.json(nurses);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get archived nurses
router.get('/archived', async (req, res) => {
  try {
    const archivedNurses = await Nurse.find({ archived: true }).select('-password');
    res.json({
      success: true,
      data: archivedNurses
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

// Get single nurse
router.get('/:id', async (req, res) => {
  try {
    const nurse = await Nurse.findById(req.params.id).select('-password');
    if (!nurse) {
      return res.status(404).json({ 
        success: false, 
        message: 'Nurse not found' 
      });
    }
    res.json({
      success: true,
      data: nurse
    });
  } catch (err) {
    console.error('Error fetching nurse:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

// Update nurse
router.put('/:id', async (req, res) => {
  try {
    const updateData = req.body;
    const { id } = req.params;

    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    if (updateData.password) {
      const bcrypt = require('bcryptjs');
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
      data: updatedNurse,
    });
  } catch (err) {
    console.error('Error updating nurse:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

// Archive nurse (same as delete but sets archived: true)
router.delete('/:id', async (req, res) => {
  try {
    const archivedNurse = await Nurse.findByIdAndUpdate(
      req.params.id,
      { archived: true },
      { new: true }
    );

    if (!archivedNurse) {
      return res.status(404).json({ 
        success: false, 
        message: 'Nurse not found' 
      });
    }

    res.json({
      success: true,
      message: 'Nurse archived successfully',
      data: archivedNurse
    });
  } catch (err) {
    console.error('Error archiving nurse:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

// Restore archived nurse
router.put('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const restoredNurse = await Nurse.findByIdAndUpdate(
      id,
      { archived: false },
      { new: true }
    ).select('-password');
    
    if (!restoredNurse) {
      return res.status(404).json({ 
        success: false,
        message: 'Nurse not found' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Nurse restored successfully', 
      data: restoredNurse 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

router.post('/export/pdf', async (req, res) => {
  try {
    const { nurses } = req.body;
    let nursesToExport;
    
    if (nurses && Array.isArray(nurses) && nurses.length > 0) {
      nursesToExport = nurses;
    } else {
      nursesToExport = await Nurse.find({ archived: false }).select('-password');
    }
    
    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="nurses.pdf"');
    doc.pipe(res);

    doc.fontSize(20).text('Nurses List', { align: 'center' });
    doc.moveDown();

    nursesToExport.forEach((n, idx) => {
      doc.fontSize(13).fillColor('#263a99').text(
        `${idx + 1}. ${n.firstName} ${n.middleName || ''} ${n.lastName}`,
        { continued: true }
      ).fillColor('black').text(`   (${n.gender})`);
      doc.fontSize(11);
      doc.text(`Email: ${n.email || ''}   Mobile: ${n.mobileNumber || ''}`);
      doc.text(`Birthday: ${n.dateOfBirth ? new Date(n.dateOfBirth).toLocaleDateString() : ''}`);
      doc.text(`License #: ${n.nurseLicenseNumber || ''}`);
      doc.text(`Shift: ${n.shiftSchedule || ''}`);
      doc.text(`Employee ID: ${n.employeeId || ''}`);
      doc.moveDown(1.2);
      doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.options.margin, doc.y).strokeColor('#e0e7ef').stroke();
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Failed to export PDF', error: err.message });
  }
});

module.exports = router;