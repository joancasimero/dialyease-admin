require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  
  const adminExists = await Admin.findOne({ username: 'admin' });
  if (!adminExists) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    await Admin.create({
      username: 'admin',
      password: hashedPassword
    });
    console.log('Admin created successfully');
  } else {
    console.log('Admin already exists');
  }
  
  process.exit();
};

seedAdmin();