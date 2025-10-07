# Email Setup for DialyEase Admin - OTP Feature

## Overview
The forgot password feature uses email to send OTP (One-Time Password) codes to admin users for password reset.

## Gmail Setup Instructions

### Step 1: Enable 2-Step Verification
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click on **Security** in the left sidebar
3. Under "Signing in to Google", click on **2-Step Verification**
4. Follow the steps to enable 2-Step Verification

### Step 2: Generate App Password
1. After enabling 2-Step Verification, go back to **Security** settings
2. Under "Signing in to Google", click on **App passwords**
3. You may need to verify your password again
4. In the "Select app" dropdown, choose **Mail**
5. In the "Select device" dropdown, choose **Other (Custom name)**
6. Enter a name like "DialyEase Admin"
7. Click **Generate**
8. Google will show you a 16-character password (e.g., `abcd efgh ijkl mnop`)
9. **Copy this password** - you won't be able to see it again!

### Step 3: Add to Environment Variables

#### For Render (Production):
1. Go to your Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add these environment variables:
   - `EMAIL_USER` = your Gmail address (e.g., `youremail@gmail.com`)
   - `EMAIL_PASSWORD` = the 16-character app password (remove spaces, e.g., `abcdefghijklmnop`)

#### For Local Development:
Add to your `.env` file:
```
EMAIL_USER=youremail@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
```

### Step 4: Restart Your Server
- **Render**: The service will auto-restart after adding environment variables
- **Local**: Stop and restart your server with `npm start`

## Using Other Email Services

### Outlook/Hotmail
```javascript
service: 'hotmail'
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

### Yahoo Mail
```javascript
service: 'yahoo'
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
```

### Custom SMTP Server
Modify `utils/emailService.js`:
```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

## Testing

1. Go to the Forgot Password page
2. Enter an admin email address
3. Check the email inbox for the OTP
4. If email doesn't arrive:
   - Check spam/junk folder
   - Verify environment variables are set correctly
   - Check Render logs for email errors
   - In development mode, OTP will be logged to console as fallback

## Troubleshooting

### "Invalid login" error
- Make sure you're using an **App Password**, not your regular Gmail password
- Verify 2-Step Verification is enabled

### "Email service unavailable"
- Check your `EMAIL_USER` and `EMAIL_PASSWORD` in environment variables
- Ensure there are no spaces in the app password
- Check Render logs for detailed error messages

### OTP not received
- Check spam/junk folder
- Verify the admin email exists in the database
- Check Render logs to see if email was sent successfully
- In development mode, OTP will be shown in console

## Security Notes

⚠️ **Important:**
- Never commit your `.env` file to Git
- Keep your app password secure
- Rotate app passwords periodically
- Monitor your Google account for suspicious activity
- The OTP expires after 10 minutes for security

## Support

For issues related to:
- Gmail setup: [Google Support](https://support.google.com/accounts/answer/185833)
- Email delivery: Check your email service provider's documentation
- Application errors: Check Render logs or console output
