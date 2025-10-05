const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: { type: String }, 
  lastName: { type: String, required: true },
  birthday: { type: Date, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  password: { type: String, required: true },
  hospital: { type: String, required: true }, 
  bloodType: { 
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  gender: {type: String, required: true },
  emergencyContact: { 
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true }
  },
  weight: { type: Number, required: true }, 
  height: { type: Number, required: true }, 
  allergies: { type: [String], default: [] }, 
  currentMedications: { type: [String], default: [] }, 
  medicalHistory: { type: String }, 
  familyHistory: { type: String }, 
  pidNumber: { type: String, unique: true, sparse: true },
  dialysisSchedule: { 
    type: String,
    required: true,
    enum: ['MWF', 'TTHS']
  },
  appointmentSlot: {
    type: Number,
    // required: true, // <-- Remove or comment out this line
    min: 1,
    max: 15
  },
  assignedTimeSlot: {
    type: String,
    required: true, // Make required so users must choose
    enum: ['morning', 'afternoon']
  },
  assignedMachine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    default: null
  },
  slotBookedAt: {
    type: Date,
    default: null
  },
  archived: { type: Boolean, default: false },
  approved: { type: Boolean, default: false },
  deviceToken: { type: String },
  nextAppointment: { type: Date }
});

module.exports = mongoose.model('Patient', patientSchema);