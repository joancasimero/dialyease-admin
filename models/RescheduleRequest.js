const mongoose = require('mongoose');

const rescheduleRequestSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  requestedDate: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  originalScheduledDate: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending'
  },
  adminResponse: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  seen: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('RescheduleRequest', rescheduleRequestSchema);
