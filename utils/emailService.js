const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Send OTP email using SendGrid - Generic function for all user types
const sendOTPEmail = async (to, otp, userType = 'patient') => {
  try {
    // Validate email configuration
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key missing. Please set SENDGRID_API_KEY environment variable.');
    }

    if (!process.env.EMAIL_USER) {
      throw new Error('Sender email missing. Please set EMAIL_USER environment variable.');
    }

    console.log('📧 Attempting to send email to:', to);
    console.log('📧 Using SendGrid with sender:', process.env.EMAIL_USER);
    console.log('📧 User type:', userType);
    
    // Customize subject and portal name based on user type
    let portalName = 'DialyEase';
    let primaryColor = '#4a6cf7';
    let gradientStart = '#4a6cf7';
    let gradientEnd = '#2a3f9d';
    
    if (userType === 'admin') {
      portalName = 'DialyEase Admin Portal';
      primaryColor = '#273A99';
      gradientStart = '#273A99';
      gradientEnd = '#1a2570';
    } else if (userType === 'nurse') {
      portalName = 'DialyEase Nurse Portal';
      primaryColor = '#263A99';
      gradientStart = '#263A99';
      gradientEnd = '#1a2570';
    }
    
    const msg = {
      to: to,
      from: process.env.EMAIL_USER, // Must be verified in SendGrid
      subject: `Password Reset OTP - ${portalName}`,
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
              background: linear-gradient(135deg, ${gradientStart} 0%, #764ba2 100%);
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
              color: ${primaryColor};
              font-size: 32px;
              margin: 0;
              font-weight: 800;
            }
            .logo p {
              color: #64748b;
              margin: 5px 0;
              font-size: 14px;
            }
            .otp-box {
              background: linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%);
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
                <p>${portalName}</p>
              </div>
              
              <h2 style="color: ${gradientEnd}; margin-bottom: 15px;">Password Reset Request</h2>
              
              <p>Hello,</p>
              
              <p>We received a request to reset your password for your ${portalName} account. Use the OTP code below to complete the password reset process:</p>
              
              <div class="otp-box">
                ${otp}
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong> This OTP will expire in <strong>15 minutes</strong>. If you didn't request this password reset, please ignore this email or contact your system administrator.
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
    
    console.log('📧 Sending email via SendGrid...');
    const response = await sgMail.send(msg);
    console.log('✅ Email sent successfully via SendGrid');
    console.log('✅ Response status:', response[0].statusCode);
    return { success: true, messageId: response[0].headers['x-message-id'] };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error('❌ Error details:', {
      code: error.code,
      message: error.message,
      response: error.response?.body
    });
    throw error;
  }
};

module.exports = {
  sendOTPEmail
};
