const mongoose = require('mongoose');

const appointmentSlotSchema = new mongoose.Schema({
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  timeSlot: {
    type: String,
    required: true,
    enum: ['morning', 'afternoon']
  },
  slotNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 15
  },
  machine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    default: null
  },
  isBooked: {
    type: Boolean,
    default: false
  },
  bookedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['available', 'booked', 'completed', 'cancelled'],
    default: 'available'
  },
  isDisabled: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index to ensure unique slots per date/timeSlot/slotNumber
appointmentSlotSchema.index({ date: 1, timeSlot: 1, slotNumber: 1 }, { unique: true });

module.exports = mongoose.model('AppointmentSlot', appointmentSlotSchema);
