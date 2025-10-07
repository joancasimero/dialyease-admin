const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // You can use other services like 'outlook', 'yahoo', etc.
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASSWORD // Your app password
    }
  });
};

// Send OTP email
const sendOTPEmail = async (to, otp) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `DialyEase Admin <${process.env.EMAIL_USER}>`,
      to: to,
      subject: 'Password Reset OTP - DialyEase Admin',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 15px;
            }
            .logo {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo h1 {
              color: #4a6cf7;
              font-size: 32px;
              margin: 0;
              font-weight: 800;
            }
            .otp-box {
              background: linear-gradient(135deg, #4a6cf7 0%, #2a3f9d 100%);
              color: white;
              padding: 20px;
              border-radius: 12px;
              text-align: center;
              margin: 25px 0;
              font-size: 36px;
              font-weight: 800;
              letter-spacing: 8px;
              box-shadow: 0 4px 15px rgba(42, 63, 157, 0.3);
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              color: #92400e;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: white;
              font-size: 14px;
            }
            .footer a {
              color: white;
              text-decoration: none;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <div class="logo">
                <h1>🩺 DialyEase</h1>
                <p style="color: #64748b; margin: 5px 0;">Admin Portal</p>
              </div>
              
              <h2 style="color: #2a3f9d; margin-bottom: 15px;">Password Reset Request</h2>
              
              <p>Hello,</p>
              
              <p>We received a request to reset your password for your DialyEase Admin account. Use the OTP code below to complete the password reset process:</p>
              
              <div class="otp-box">
                ${otp}
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong> This OTP will expire in <strong>10 minutes</strong>. If you didn't request this password reset, please ignore this email or contact your system administrator.
              </div>
              
              <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
                For security reasons, never share this OTP with anyone. The DialyEase team will never ask for your OTP.
              </p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} DialyEase - Dialysis Management System</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

module.exports = {
  sendOTPEmail
};
