const mongoose = require('mongoose');
const AttendanceSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  date: { type: String, required: true }, 
  status: { type: String, enum: ['present', 'absent'], required: true },
  time: { type: String },
  preWeight: { type: Number },
  postWeight: { type: Number }
});
module.exports = mongoose.model('Attendance', AttendanceSchema);