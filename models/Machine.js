const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  averageProcessingTime: {
    type: Number,
    default: 15 // minutes
  }
});

module.exports = mongoose.model('Machine', machineSchema);