const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  nurse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nurse',
    required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  appointmentSlot: {
    type: Number,
    required: true
  },

  // Pre-HD Assessment
  preHd: {
    type: {
      mentalStatus: { type: String },
      ambulationStatus: { type: String },
      subjectiveComplaint: { type: String },
      subjectiveComplaintInfo: { type: String },
      significantPEFindings: [{ type: String }],
      abnormalRhythmInfo: { type: String },
      edemaBipedal: { type: Boolean },
      ascitesInfo: { type: String },
      ralesInfo: { type: String },
      otherPEInfo: { type: String }
    },
    required: true
  },

  // Post-HD Assessment
  postHd: {
    type: {
      mentalStatus: { type: String },
      ambulationStatus: { type: String },
      subjectiveComplaint: { type: String },
      subjectiveComplaintInfo: { type: String },
      significantPEFindings: [{ type: String }],
      abnormalRhythmInfo: { type: String },
      edemaBipedal: { type: Boolean },
      ascitesInfo: { type: String },
      ralesInfo: { type: String },
      otherPEInfo: { type: String }
    },
    required: true
  },

  // Medication charting
  medications: {
    type: [{
      drug: { type: String },
      dosage: { type: String },
      route: { type: String }
    }],
    required: true
  },

  // Intra-HD Monitoring (multiple records over time)
  intraHdMonitoring: {
    type: [{
      time: { type: Date, default: Date.now },
      bloodPressure: { // store as systolic/diastolic
        systolic: { type: Number },
        diastolic: { type: Number }
      },
      temperature: { type: Number }, // Celsius
      heartRate: { type: Number },   // bpm
      vp: { type: Number },          // mmHg
      ufRemoved: { type: Number },   // mL total removed
      ufRate: { type: Number },      // mL/hr
      tmp: { type: Number },         // mmHg
      bfr: { type: Number },         // Blood Flow Rate (mL/min)
      heparin: { type: Number },     // Units
      other: { type: String }
    }],
    required: true
  },

  // Vascular Access Evaluation
  vascularAccessEvaluation: {
    type: {
      position: { type: String }, // e.g., "Right IJ"
      catheter: { type: String },
      catheterPorts: {
        arterial: { type: String },
        venous: { type: String }
      },
      avAccess: { type: String },
      avCondition: [{ type: String }],
      needleUsed: {
        arterial: { type: String },
        venous: { type: String }
      },
      cannulation: {
        attempts: { type: Number },
        arterial: { type: Number },
        venous: { type: Number }
      }
    },
    required: true
  },

  // Anticoagulation record
  anticoagulation: {
    type: {
      regularDose: { type: Boolean, default: false },
      lowDose: { type: Boolean, default: false },
      lmwh: {
        drug: { type: String },
        dose: { type: String }
      },
      nssFlushing: { type: String }
    },
    required: true
  },

  nurseNotes: { type: String }

}, { 
  timestamps: true 
});

// Index for efficient querying
vitalSchema.index({ patient: 1, appointmentDate: -1 });
vitalSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Vital', vitalSchema);
