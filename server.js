const RescheduleRequest = require('./models/RescheduleRequest');
const rescheduleRequestRoutes = require('./routes/rescheduleRequestRoutes');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const admin = require('firebase-admin');
const cron = require('node-cron');
const moment = require('moment-timezone');
const http = require('http');
const { Server } = require('socket.io');

// Initialize Firebase Admin (supports both env variable and file)
let firebaseInitialized = false;
try {
  let serviceAccount;
  
  // Try to get service account from environment variable first
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('📱 Loading Firebase config from FIREBASE_SERVICE_ACCOUNT environment variable...');
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Fallback to local file
    console.log('📱 Loading Firebase config from local file...');
    serviceAccount = require('./dialyease-e42ac-firebase-adminsdk-fbsvc-01418afe2b.json');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  firebaseInitialized = true;
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.log('⚠️ Firebase initialization failed:', error.message);
  console.log('⚠️ Firebase features (push notifications) will be disabled');
  console.log('💡 To enable: Set FIREBASE_SERVICE_ACCOUNT environment variable with your service account JSON');
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const otpStore = {};
const notifiedPatients = {}; // Keeps track of sent notifications

// Import SendGrid email service
const { sendOTPEmail } = require('./emailService');

// Auto-seed admin user function
async function seedAdminUser() {
  try {
    const bcrypt = require('bcryptjs');
    const Admin = require('./models/Admin');
    
    // Check all existing admins
    const allAdmins = await Admin.find({});
    console.log(`📊 Found ${allAdmins.length} admin(s) in database:`);
    allAdmins.forEach(admin => {
      console.log(`   - Username: ${admin.username}, ID: ${admin._id}`);
    });
    
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await Admin.create({
        username: 'admin',
        password: hashedPassword
      });
      console.log('✅ Admin user created successfully (username: admin, password: admin123)');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
}

// Models
const Patient = require('./models/Patient');
const Admin = require('./models/Admin');
const Machine = require('./models/Machine');
const Nurse = require('./models/Nurse'); 
const Attendance = require('./models/Attendance'); 
const AppointmentSlot = require('./models/AppointmentSlot');

// Routes
const machineRoutes = require('./routes/machineRoutes');
const nurseRoutes = require('./routes/nurseRoutes');
const adminRoutes = require('./routes/adminRoutes');
const appointmentSlotRoutes = require('./routes/appointmentSlotRoutes');
const vitalRoutes = require('./routes/vitalRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'DialyEase Admin API is running!',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

app.get('/api', (req, res) => {
  res.json({ 
    message: 'DialyEase Admin API',
    version: '1.0.0',
    endpoints: ['/api/admin/login', '/api/patients', '/api/nurses']
  });
});

// Register routes
app.use('/api/machines', machineRoutes);
app.use('/api/nurses', nurseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/appointment-slots', appointmentSlotRoutes);
app.use('/api/reschedule-requests', rescheduleRequestRoutes);
app.use('/api/vitals', vitalRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Auto-seed admin user
    await seedAdminUser();
    
    initializeDefaultMachines();
    initializeTodaySlots();
    // Initialize slots for the next 5 days (including today) on startup
    (async () => {
      const machines = await Machine.find({ isActive: true }).limit(15);
      if (machines.length < 15) {
        console.warn('Not enough active machines to initialize slots for startup');
        return;
      }
      for (let offset = 0; offset <= 5; offset++) {
        // FIX: Use Asia/Manila time for each date
        const dateStr = moment().tz('Asia/Manila').add(offset, 'days').format('YYYY-MM-DD');
        const existingSlots = await AppointmentSlot.find({ date: dateStr });
        if (existingSlots.length === 0) {
          const slots = [];
          for (let i = 1; i <= 15; i++) {
            slots.push({ date: dateStr, timeSlot: 'morning', slotNumber: i, machine: machines[i - 1]._id });
          }
          for (let i = 1; i <= 15; i++) {
            slots.push({ date: dateStr, timeSlot: 'afternoon', slotNumber: i, machine: machines[i - 1]._id });
          }
          await AppointmentSlot.insertMany(slots);
          console.log(`Initialized ${slots.length} slots for ${dateStr} on startup`);
        } else {
          console.log(`Slots already exist for ${dateStr}`);
        }
      }
    })();
  })
  .catch(err => console.error('MongoDB connection error:', err));

const initializeDefaultMachines = async () => {
  try {
    const count = await Machine.countDocuments();
    if (count === 0) {
      const defaultMachines = [];
      for (let i = 1; i <= 15; i++) {
        defaultMachines.push({
          name: `Machine ${i}`,
          averageProcessingTime: 3 
        });
      }
      await Machine.insertMany(defaultMachines);
      console.log('15 default machines added');
    }
  } catch (err) {
    console.error('Error initializing default machines:', err);
  }
};

// Initialize appointment slots for the current date if they don't exist
const initializeTodaySlots = async () => {
  try {
    // Use Asia/Manila time for today
    const today = moment().tz('Asia/Manila').format('YYYY-MM-DD');
    const existingSlots = await AppointmentSlot.find({ date: today });
    
    if (existingSlots.length === 0) {
      const machines = await Machine.find({ isActive: true }).limit(15);
      if (machines.length >= 15) {
        const slots = [];

        // Create morning slots (1-15)
        for (let i = 1; i <= 15; i++) {
          slots.push({
            date: today,
            timeSlot: 'morning',
            slotNumber: i,
            machine: machines[i - 1]._id
          });
        }

        // Create afternoon slots (1-15)
        for (let i = 1; i <= 15; i++) {
          slots.push({
            date: today,
            timeSlot: 'afternoon',
            slotNumber: i,
            machine: machines[i - 1]._id
          });
        }

        await AppointmentSlot.insertMany(slots);
        console.log(`Appointment slots initialized for ${today}`);
      }
    }
  } catch (err) {
    console.error('Error initializing today\'s slots:', err);
  }
};  

// Automatically initialize slots for the next day at midnight (Asia/Manila)
cron.schedule('0 0 * * *', async () => {
  const tomorrow = moment().tz('Asia/Manila').add(1, 'day').format('YYYY-MM-DD');
  try {
    const existingSlots = await AppointmentSlot.find({ date: tomorrow });
    if (existingSlots.length === 0) {
      const machines = await Machine.find({ isActive: true }).limit(15);
      if (machines.length >= 15) {
        const slots = [];
        for (let i = 1; i <= 15; i++) {
          slots.push({
            date: tomorrow,
            timeSlot: 'morning',
            slotNumber: i,
            machine: machines[i - 1]._id
          });
        }
        for (let i = 1; i <= 15; i++) {
          slots.push({
            date: tomorrow,
            timeSlot: 'afternoon',
            slotNumber: i,
            machine: machines[i - 1]._id
          });
        }
        await AppointmentSlot.insertMany(slots);
        console.log(`Appointment slots initialized for ${tomorrow}`);
      } else {
        console.warn('Not enough active machines to initialize slots for', tomorrow);
      }
    } else {
      console.log(`Slots already exist for ${tomorrow}`);
    }
  } catch (err) {
    console.error('Error initializing slots for next day:', err);
  }
});

// Automatically initialize slots for 5 days ahead at midnight (Asia/Manila)
cron.schedule('0 0 * * *', async () => {
  const futureDate = moment().tz('Asia/Manila').add(5, 'day').format('YYYY-MM-DD');
  try {
    const existingSlots = await AppointmentSlot.find({ date: futureDate });
    if (existingSlots.length === 0) {
      // Use the same logic as initializeTodaySlots, but for futureDate
      const machines = await Machine.find({ isActive: true }).limit(15);
      if (machines.length < 15) {
        console.warn(`Not enough active machines to initialize slots for ${futureDate}`);
        return;
      }
      const slots = [];
      for (let i = 1; i <= 15; i++) {
        slots.push({ date: futureDate, timeSlot: 'morning', slotNumber: i, machine: machines[i - 1]._id });
      }
      for (let i = 1; i <= 15; i++) {
        slots.push({ date: futureDate, timeSlot: 'afternoon', slotNumber: i, machine: machines[i - 1]._id });
      }
      await AppointmentSlot.insertMany(slots);
      console.log(`Initialized ${slots.length} slots for ${futureDate}`);
    }
  } catch (err) {
    console.error('Error initializing slots for 5 days ahead:', err);
  }
});

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Authorization header missing' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token missing' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user; 
    next();
  });
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465, // Use port 465 with SSL
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER || 'trustcapstonegroup@gmail.com',
    pass: process.env.EMAIL_PASS || 'qfkj ovlc ctox jtbj',
  },
  timeout: 30000, // 30 seconds timeout for email sending
  connectionTimeout: 30000, // 30 seconds connection timeout
  tls: {
    rejectUnauthorized: true
  }
});

// Verify nodemailer connection on startup
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Nodemailer connection error:', error);
  } else {
    console.log('✅ Nodemailer is ready to send emails');
  }
});

// Test endpoint to check if forgot password flow works without sending email
app.post('/api/auth/test-forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log('🧪 TEST - Forgot password request for:', email);
  
  try {
    const patient = await Patient.findOne({ email });
    if (!patient) {
      console.log('❌ TEST - Patient not found:', email);
      return res.status(400).json({ message: 'Patient not found', testMode: true });
    }
    
    const otp = generateOTP();
    console.log('✅ TEST - OTP generated:', otp);
    console.log('✅ TEST - Patient found:', patient.firstName, patient.lastName);
    
    res.json({ 
      message: 'Test successful - OTP would be sent',
      testMode: true,
      otp: otp,
      patientFound: true
    });
  } catch (err) {
    console.error('❌ TEST - Error:', err);
    res.status(500).json({ message: 'Test failed', error: err.message });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record || record.otp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ message: 'OTP has expired' });
  }

  delete otpStore[email]; 
  return res.status(200).json({ message: 'OTP verified' });
});

// Patient registration is now handled in patientRoutes.js

// Patient login is now handled in patientRoutes.js

// Patient routes are now handled in patientRoutes.js

app.get('/api/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const patientObj = patient.toObject();
    delete patientObj.password;
    res.json(patientObj);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.birthday) {
      updateData.birthday = new Date(updateData.birthday);
    }

    if (updateData.dialysisSchedule && !['MWF', 'TTHS'].includes(updateData.dialysisSchedule)) {
      return res.status(400).json({ 
        message: 'Invalid dialysis schedule. Must be either MWF or TTHS'
      });
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    if (updateData.dialysisSchedule) {
      const patient = await Patient.findById(id);
      const schedule = updateData.dialysisSchedule || patient.dialysisSchedule;
      updateData.nextAppointment = getNextAppointmentDate(schedule);
    }

    const updatedPatient = await Patient.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedPatient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const patientData = updatedPatient.toObject();
    delete patientData.password;

    res.json(patientData);
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const archivedPatient = await Patient.findByIdAndUpdate(
      id,
      { archived: true },
      { new: true }
    );

    if (!archivedPatient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({ message: 'Patient archived successfully' });
  } catch (error) {
    console.error('Archive patient error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log('📧 Forgot password request received for patient email:', email);

  try {
    const patient = await Patient.findOne({ email });
    if (!patient) {
      console.log('❌ Patient not found:', email);
      return res.status(400).json({ message: 'Patient not found' });
    }

    const otp = generateOTP();
    otpStore[email] = { otp, expiresAt: Date.now() + 15 * 60 * 1000 };
    console.log('✅ OTP generated for:', email);

    // Send response immediately, then send email in background using SendGrid
    res.json({ message: 'OTP sent to email' });
    console.log('✅ Response sent to client');

    // Send email asynchronously using SendGrid (don't await)
    sendOTPEmail(email, otp, 'patient')
      .then(() => {
        console.log('✅ Email sent successfully via SendGrid to:', email);
      })
      .catch((err) => {
        console.error('❌ SendGrid email sending failed:', err);
        // Don't fail the request if email fails - OTP is already stored
      });

  } catch (err) {
    console.error('❌ Forgot password error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/auth/change-password', authenticateJWT, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Old password and new password are required' });
  }

  try {
    const patient = await Patient.findById(req.user.id);
    if (!patient) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, patient.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    patient.password = hashed;
    await patient.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  const record = otpStore[email];
  if (!record) return res.status(400).json({ message: 'OTP not found or expired' });

  if (record.expiresAt < Date.now()) {
    delete otpStore[email];
    return res.status(400).json({ message: 'OTP expired' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  delete otpStore[email];

  res.json({ message: 'OTP verified' });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, new_password } = req.body;
  if (!email || !new_password) {
    return res.status(400).json({ message: 'Email and new password are required' });
  }
  try {
    const patient = await Patient.findOne({ email });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    const hashed = await bcrypt.hash(new_password, 10);
    patient.password = hashed;
    await patient.save();
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// --- NURSE FORGOT PASSWORD ENDPOINTS ---

// Nurse: Request OTP for password reset
app.post('/api/nurses/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log('📧 Forgot password request received for nurse email:', email);

  try {
    const nurse = await Nurse.findOne({ email });
    if (!nurse) {
      console.log('❌ Nurse not found:', email);
      return res.status(400).json({ message: 'Nurse not found' });
    }

    const otp = generateOTP();
    otpStore[email] = { otp, expiresAt: Date.now() + 15 * 60 * 1000 };
    console.log('✅ OTP generated for nurse:', email);

    // Send response immediately, then send email in background using SendGrid
    res.json({ message: 'OTP sent to email' });
    console.log('✅ Response sent to client');

    // Send email asynchronously using SendGrid (don't await)
    sendOTPEmail(email, otp, 'nurse')
      .then(() => {
        console.log('✅ Email sent successfully via SendGrid to nurse:', email);
      })
      .catch((err) => {
        console.error('❌ SendGrid nurse email sending failed:', err);
        // Don't fail the request if email fails - OTP is already stored
      });

  } catch (err) {
    console.error('❌ Nurse forgot password error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Nurse: Verify OTP
app.post('/api/nurses/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) return res.status(400).json({ message: 'OTP not found or expired' });

  if (record.expiresAt < Date.now()) {
    delete otpStore[email];
    return res.status(400).json({ message: 'OTP expired' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  delete otpStore[email];
  res.json({ message: 'OTP verified' });
});

// Nurse: Reset password
app.post('/api/nurses/reset-password', async (req, res) => {
  const { email, new_password } = req.body;
  if (!email || !new_password) {
    return res.status(400).json({ message: 'Email and new password are required' });
  }
  try {
    const nurse = await Nurse.findOne({ email });
    if (!nurse) {
      return res.status(404).json({ message: 'Nurse not found' });
    }
    const hashed = await bcrypt.hash(new_password, 10);
    nurse.password = hashed;
    await nurse.save();
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Nurse reset password error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle patient joining their personal room
  socket.on('join_patient_room', (patientId) => {
    const roomName = `patient_${patientId}`;
    socket.join(roomName);
    console.log(`Patient ${patientId} joined room: ${roomName}`);
  });

  // Handle patient leaving their room
  socket.on('leave_patient_room', (patientId) => {
    const roomName = `patient_${patientId}`;
    socket.leave(roomName);
    console.log(`Patient ${patientId} left room: ${roomName}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Pass the Socket.IO instance to attendance routes
attendanceRoutes.setSocketIO(io);
app.use('/api/attendance', attendanceRoutes);

app.post('/api/appointments/coming', async (req, res) => {
  const { userId, appointmentDate } = req.body;
  if (!userId || !appointmentDate) {
    return res.status(400).json({ message: 'userId and appointmentDate are required' });
  }
  try {
    const patient = await Patient.findByIdAndUpdate(
      userId,
      { $set: { nextAppointment: appointmentDate, appointmentStatus: 'coming' } },
      { new: true }
    );
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json({ message: 'Appointment marked as coming', patient });
  } catch (err) {
    console.error('Mark appointment coming error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/appointments/reschedule', async (req, res) => {
  const { userId, appointmentDate } = req.body;
  if (!userId || !appointmentDate) {
    return res.status(400).json({ message: 'userId and appointmentDate are required' });
  }
  try {
    const patient = await Patient.findByIdAndUpdate(
      userId,
      { $set: { nextAppointment: appointmentDate, appointmentStatus: 'reschedule_requested' } },
      { new: true }
    );
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json({ message: 'Reschedule requested', patient });
  } catch (err) {
    console.error('Request reschedule error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/appointments/update-status', async (req, res) => {
  const { userId, appointmentId, status } = req.body;
  await Appointment.updateOne(
    { _id: appointmentId, patient: userId },
    { $set: { status: status } }
  );
  res.json({ success: true });
});

app.post('/api/nurses/register', async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      password,
      mobileNumber,
      gender,
      dateOfBirth,
      nurseLicenseNumber,
      shiftSchedule,
      employeeId
    } = req.body;

    const existingNurse = await Nurse.findOne({
      $or: [{ email }, { nurseLicenseNumber }, { employeeId }]
    });
    if (existingNurse) {
      return res.status(400).json({ message: 'Nurse already exists (email, license number, or employee ID)' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nurse = await Nurse.create({
      firstName,
      middleName,
      lastName,
      email,
      password: hashedPassword,
      mobileNumber,
      gender,
      dateOfBirth,
      nurseLicenseNumber,
      shiftSchedule,
      employeeId,
      approved: false 
    });

    const token = jwt.sign({ id: nurse._id, role: 'nurse' }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
      nurse: {
        id: nurse._id,
        firstName,
        middleName,
        lastName,
        email,
        mobileNumber,
        gender,
        dateOfBirth,
        nurseLicenseNumber,
        shiftSchedule
      },
      token
    });
  } catch (err) {
    console.error('Nurse registration error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/nurses/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const nurse = await Nurse.findOne({ email });

    if (!nurse || !(await bcrypt.compare(password, nurse.password))) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (!nurse.approved) {
      return res.status(403).json({ message: 'Account pending approval by admin.' });
    }

    const token = jwt.sign({ id: nurse._id, role: 'nurse' }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
      nurse: {
        id: nurse._id,
        firstName: nurse.firstName,
        middleName: nurse.middleName,
        lastName: nurse.lastName,
        email: nurse.email,
        mobileNumber: nurse.mobileNumber,
        gender: nurse.gender,
        dateOfBirth: nurse.dateOfBirth,
        nurseLicenseNumber: nurse.nurseLicenseNumber,
        shiftSchedule: nurse.shiftSchedule,
        employeeId: nurse.employeeId 
      },
      token
    });
  } catch (err) {
    console.error('Nurse login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/nurse/register', async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      password,
      mobileNumber,
      gender,
      dateOfBirth,
      nurseLicenseNumber,
      shiftSchedule,
      employeeId
    } = req.body;

    const existingNurse = await Nurse.findOne({
      $or: [{ email }, { nurseLicenseNumber }, { employeeId }]
    });
    if (existingNurse) {
      return res.status(400).json({ message: 'Nurse already exists (email, license number, or employee ID)' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nurse = await Nurse.create({
      firstName,
      middleName,
      lastName,
      email,
      password: hashedPassword,
      mobileNumber,
      gender,
      dateOfBirth,
      nurseLicenseNumber,
      shiftSchedule,
      employeeId
    });

    const token = jwt.sign({ id: nurse._id, role: 'nurse' }, process.env.JWT_SECRET, { expiresIn: '30d' });
    return res.status(201).json({ message: 'Nurse registered successfully.' });
  } catch (err) {
    console.error('Nurse registration error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/nurse/login', async (req, res) => {
  const { emailOrMobile, password } = req.body;
  try {
    const nurse = await Nurse.findOne({
      $or: [{ email: emailOrMobile }, { mobileNumber: emailOrMobile }]
    });
    if (!nurse) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, nurse.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!nurse.approved) {
      return res.status(403).json({ message: 'Account pending approval by admin.' });
    }
    const token = jwt.sign({ id: nurse._id, role: 'nurse' }, process.env.JWT_SECRET, { expiresIn: '30d' });
    return res.json({
      nurse: {
        _id: nurse._id,
        firstName: nurse.firstName,
        middleName: nurse.middleName,
        lastName: nurse.lastName,
        email: nurse.email,
        mobileNumber: nurse.mobileNumber,
        gender: nurse.gender,
        dateOfBirth: nurse.dateOfBirth,
        nurseLicenseNumber: nurse.nurseLicenseNumber,
        shiftSchedule: nurse.shiftSchedule
      },
      token 
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/nurse/profile', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'nurse') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const nurse = await Nurse.findById(req.user.id).select('-password');
    if (!nurse) {
      return res.status(404).json({ message: 'Nurse not found' });
    }
    res.json({ nurse });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/nurses', async (req, res) => {
  try {
    const nurses = await Nurse.find({ archived: false }).select('-password');
    res.json(nurses);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add archived nurses endpoint
app.get('/api/nurses/archived', async (req, res) => {
  try {
    const archivedNurses = await Nurse.find({ archived: true }).select('-password');
    res.json(archivedNurses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add restore nurse endpoint
app.put('/api/nurses/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const restoredNurse = await Nurse.findByIdAndUpdate(
      id,
      { archived: false },
      { new: true }
    ).select('-password');
    if (!restoredNurse) {
      return res.status(404).json({ message: 'Nurse not found' });
    }
    res.json({ message: 'Nurse restored successfully', nurse: restoredNurse });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update approval endpoints to exclude archived nurses
app.get('/api/approval/patients', authenticateJWT, async (req, res) => {
  try {
    const patients = await Patient.find({ approved: false, archived: false });
    res.json(patients);
  } catch (err) {
    console.error('Error fetching pending patients:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/approval/nurses', authenticateJWT, async (req, res) => {
  try {
    const nurses = await Nurse.find({ approved: false, archived: false });
    res.json(nurses);
  } catch (err) {
    console.error('Error fetching pending nurses:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/approval/patient/:id/approve', authenticateJWT, async (req, res) => {
  await Patient.findByIdAndUpdate(req.params.id, { approved: true });
  res.json({ message: 'Patient approved' });
});

app.put('/api/approval/nurse/:id/approve', authenticateJWT, async (req, res) => {
  await Nurse.findByIdAndUpdate(req.params.id, { approved: true });
  res.json({ message: 'Nurse approved' });
});

app.delete('/api/approval/patient/:id', authenticateJWT, async (req, res) => {
  await Patient.findByIdAndDelete(req.params.id);
  res.json({ message: 'Patient deleted' });
});

app.delete('/api/approval/nurse/:id', authenticateJWT, async (req, res) => {
  await Nurse.findByIdAndDelete(req.params.id);
  res.json({ message: 'Nurse deleted' });
});

app.get('/send-notification', async (req, res) => {
  const deviceToken = 'dVUVelVtS8699VfNljCy7s:APA91bEhAHKYsYoDikJ1mci7qB6CHkXMi8dobuAsj3mh1S4amlXyzzb1BCuXZRaxQdrSc2a3rYeiMKaPX0iO8KB1Suw0SsSSo_4IqwQSw0bf_qE3qtXLao0';

  const message = {
    token: deviceToken,
    notification: {
      title: 'Appointment Reminder',
      body: "Don't forget your 4PM appointment!",
    },
  };

  try {
    if (firebaseInitialized) {
      const response = await admin.messaging().send(message);
      console.log('✅ Message sent:', response);
      res.send('Notification sent!');
    } else {
      console.log('Firebase not initialized - notification skipped');
      res.send('Notification skipped (Firebase not configured)');
    }
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).send('Failed to send notification');
  }
});

app.get('/api/attendance', authenticateJWT, async (req, res) => {
  const { date, status } = req.query;
  const filter = {};
  if (date) filter.date = date;
  if (status && status !== 'all') filter.status = status;
  console.log('Attendance filter:', filter);
  try {
    const records = await Attendance.find(filter).populate('patient');
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance', error: err.message });
  }
});

// Example GET /api/attendance?patientId=xxx&month=7&year=2025
app.get('/api/attendance', async (req, res) => {
  const { patientId, month, year } = req.query;
  const filter = {};
  if (patientId) filter.patient = patientId; // <-- Only fetch for this patient
  if (month && year) {
    filter.date = { $regex: `^${year}-${month.padStart(2, '0')}-` };
  }
  try {
    const records = await Attendance.find(filter);
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance', error: err.message });
  }
});

app.post('/api/attendance', authenticateJWT, async (req, res) => {
  const { patientId, date, status, time } = req.body;
  if (!patientId || !date || !status) {
    return res.status(400).json({ message: 'Patient ID, date, and status are required' });
  }
  try {
    const attendanceData = {
      patient: patientId,
      date,
      status,
      recordedBy: req.user.id
    };
    if (status === 'present') {
      attendanceData.time = time || new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5);
    }
    const record = await Attendance.create(attendanceData);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ message: 'Failed to record attendance', error: err.message });
  }
});

app.put('/api/attendance/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { date, status } = req.body;

  try {
    const record = await Attendance.findByIdAndUpdate(id, { date, status }, { new: true });
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update attendance', error: err.message });
  }
});

app.delete('/api/attendance/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const record = await Attendance.findByIdAndDelete(id);
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    res.json({ message: 'Attendance record deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete attendance', error: err.message });
  }
});

app.post('/api/attendance/export-pdf', authenticateJWT, async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ message: 'Date is required' });

  try {
    const records = await Attendance.find({ date }).populate('patient');
    if (!records.length) {
      return res.status(404).json({ message: 'No attendance records found for this date.' });
    }
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${date}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text(`Attendance Records for ${date}`, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(12);
    records.forEach((rec, idx) => {
      let line = `${idx + 1}. ${rec.patient?.firstName || ''} ${rec.patient?.lastName || ''} - ${rec.status.toUpperCase()}`;
      if (rec.status === 'present' && rec.time) {
        line += ` (Time: ${rec.time})`;
      }
      doc.text(line, { continued: false });
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Failed to export PDF', error: err.message });
  }
});

// Helper to send notification
async function sendAppointmentReminder(deviceToken, title, body) {
  if (!deviceToken) return;
  const message = {
    token: deviceToken,
    notification: { title, body },
  };
  try {
    if (firebaseInitialized) {
      await admin.messaging().send(message);
      console.log('Notification sent:', title, body);
    } else {
      console.log('Firebase not initialized - notification skipped:', title, body);
    }
  } catch (err) {
    console.error('Failed to send notification:', err.message);
  }
}

cron.schedule('* * * * *', async () => {
  const now = new Date();
  const patients = await Patient.find({ nextAppointment: { $exists: true }, deviceToken: { $exists: true, $ne: null } });

  patients.forEach(patient => {
    const appt = new Date(patient.nextAppointment);
    const diffMs = appt - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    let title = 'DialyEase Reminder';
    let body = '';
    let notifType = '';

    if (diffHours > 23 && diffHours < 25) {
      body = 'You have an appointment tomorrow at ' + appt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      notifType = '24hr';
    } else if (diffHours > 2 && diffHours < 4) {
      body = 'You have an appointment in 3 hours at ' + appt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      notifType = '3hr';
    } else if (diffHours > -0.05 && diffHours < 0.05) {
      body = 'You have an appointment today at ' + appt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      notifType = 'now';
    }

    if (body && patient._id && notifType) {
      const key = `${patient._id}_${patient.nextAppointment}_${notifType}`;
      if (!notifiedPatients[key]) {
        sendAppointmentReminder(patient.deviceToken, title, body);
        notifiedPatients[key] = true;
      }
    }
  });
});

cron.schedule('* * * * *', async () => {
  console.log('⏰ Running daily nextAppointment updater...');
  try {
    const patients = await Patient.find({ archived: false, approved: true });
    for (const patient of patients) {
      const nextAppt = getNextAppointmentDate(patient.dialysisSchedule);
      if (nextAppt) {
        patient.nextAppointment = nextAppt;
        await patient.save();
      }
    }
    console.log('✅ nextAppointment fields updated for all patients.');
  } catch (err) {
    console.error('❌ Error updating nextAppointment:', err);
  }
});

// Calculate the next appointment date based on schedule
function getNextAppointmentDate(dialysisSchedule) {
  const scheduleMap = {
    MWF: [1, 3, 5],    // Monday, Wednesday, Friday
    TTHS: [2, 4, 6],   // Tuesday, Thursday, Saturday
  };

  const now = moment.tz('Asia/Manila');
  for (let add = 0; add < 7; add++) {
    const candidate = now.clone().add(add, 'days');
    if (scheduleMap[dialysisSchedule]?.includes(candidate.day())) {
      candidate.hour(8).minute(0).second(0).millisecond(0); // Default to 8am
      if (add === 0 && now.isAfter(candidate)) continue;
      return candidate.toDate();
    }
  }
  return null;
}

app.post('/api/checkin', async (req, res) => {
  res.json({ message: 'Check-in received', data: req.body });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports.io = io;

// --- ADMIN FORGOT PASSWORD FLOW ---

// 1. Request OTP for admin
app.post('/api/admin/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log('📧 Admin forgot password request received for:', email);
  
  const admin = await Admin.findOne({ email });
  if (!admin) {
    console.log('❌ Admin not found:', email);
    return res.status(400).json({ message: 'Admin not found' });
  }

  const otp = generateOTP();
  otpStore[email] = { otp, expiresAt: Date.now() + 15 * 60 * 1000 };
  console.log('✅ OTP generated for admin:', email);

  // Send response immediately, then send email in background using SendGrid
  res.json({ message: 'OTP sent to email' });
  console.log('✅ Response sent to client');

  // Send email asynchronously using SendGrid (don't await)
  sendOTPEmail(email, otp, 'admin')
    .then(() => {
      console.log('✅ Email sent successfully via SendGrid to admin:', email);
    })
    .catch((err) => {
      console.error('❌ SendGrid admin email sending failed:', err);
      // Don't fail the request if email fails - OTP is already stored
    });
});

// 2. Verify OTP for admin
app.post('/api/admin/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];
  if (!record) return res.status(400).json({ message: 'OTP not found or expired' });
  if (record.expiresAt < Date.now()) {
    delete otpStore[email];
    return res.status(400).json({ message: 'OTP expired' });
  }
  if (record.otp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }
  delete otpStore[email];
  res.json({ message: 'OTP verified' });
});

// 3. Reset password for admin
app.post('/api/admin/reset-password', async (req, res) => {
  const { email, new_password } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(404).json({ message: 'Admin not found' });

  admin.password = new_password; // NOT hashed!
  await admin.save(); // The pre-save hook will hash it
  res.json({ message: 'Password reset successful' });
});

// Firestore listener (only if Firebase is initialized)
if (firebaseInitialized) {
  admin.firestore().collection('vitals')
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
        const vitals = change.doc.data();
        handleVitals(vitals);
        }
      });
    });
}

function handleVitals(vitals) {
  const patientId = vitals.patient;
  const intraHd = vitals.intraHdMonitoring || {};

  // Health tip rules
  if (parseFloat(intraHd.bloodPressure) > 140) {
    sendHealthTipNotification(
      patientId,
      'High Blood Pressure',
      'Your blood pressure is high. Please reduce salt intake and consult your doctor.'
    );
  }
  if (parseFloat(intraHd.bloodPressure) < 90) {
    sendHealthTipNotification(
      patientId,
      'Low Blood Pressure',
      'Your blood pressure is low. Stay hydrated and inform your nurse.'
    );
  }
  if (parseFloat(intraHd.heartRate) > 100) {
    sendHealthTipNotification(
      patientId,
      'High Heart Rate',
      'Your heart rate is high. Try to relax and rest.'
    );
  }
  if (parseFloat(intraHd.temperature) > 37.5) {
    sendHealthTipNotification(
      patientId,
      'High Temperature',
      'Your temperature is elevated. Monitor for fever and consult your doctor.'
    );
  }
  // Add more rules as needed
}

async function sendHealthTipNotification(patientId, title, message) {
  if (!firebaseInitialized) {
    console.log('Firebase not initialized - health tip notification skipped');
    return;
  }
  
  const patientDoc = await admin.firestore().collection('patients').doc(patientId).get();
  if (!patientDoc.exists) {
    console.error(`Patient Firestore doc not found for ID: ${patientId}`);
    return;
  }
  const deviceToken = patientDoc.data()?.deviceToken;
  if (!deviceToken) return;
  await admin.messaging().send({
    token: deviceToken,
    notification: { title, body: message },
  });
}

async function getDeviceToken(patientId) {
  if (!firebaseInitialized) {
    console.log('Firebase not initialized - cannot get device token');
    return null;
  }
  
  const patientDoc = await admin.firestore().collection('patients').doc(patientId).get();
  const deviceToken = patientDoc.exists ? patientDoc.data().deviceToken : null;
  return deviceToken;
}

// REMOVE THIS if you added it (we moved it to patientRoutes.js)
// app.get('/api/patients/today-appointments', authenticateJWT, async (req, res) => {
//   ... remove this entire block
// });
