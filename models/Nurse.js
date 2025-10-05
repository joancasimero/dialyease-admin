const mongoose = require('mongoose');

const nurseSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: { type: String }, 
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  gender: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  nurseLicenseNumber: { type: String, required: true, unique: true },
  shiftSchedule: { type: String, enum: ['morning', 'afternoon'], required: true },
  employeeId: { type: String, required: true, unique: true }, 
  role: { type: String, default: 'nurse' },
  approved: { type: Boolean, default: false },
  archived: { type: Boolean, default: false } // <-- Added archived field
});

module.exports = mongoose.model('Nurse', nurseSchema);