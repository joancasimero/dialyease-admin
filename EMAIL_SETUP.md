# Email Setup for DialyEase Admin - OTP Feature (SendGrid)

## Overview
The forgot password feature uses SendGrid to send OTP (One-Time Password) codes to admin users for password reset. SendGrid is free for up to 100 emails/day and works reliably with cloud hosting platforms like Render.

## SendGrid Setup Instructions (Recommended)

### Step 1: Create SendGrid Account
1. Go to [SendGrid](https://signup.sendgrid.com/)
2. Sign up for a free account (no credit card required)
3. Verify your email address
4. Complete the onboarding survey

### Step 2: Verify a Sender Email
1. In SendGrid dashboard, go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in the form with your details:
   - From Name: `DialyEase Admin`
   - From Email Address: Your email (e.g., `trustcapstonegroup@gmail.com`)
   - Reply To: Same email
   - Company/Organization: Your institution name
   - Address, City, Country, etc.
4. Click **Create**
5. **Check your email** and click the verification link
6. Wait for verification to complete (usually instant)

### Step 3: Create API Key
1. In SendGrid dashboard, go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it: `DialyEase Admin`
4. Choose **Full Access** (or at minimum **Mail Send** access)
5. Click **Create & View**
6. **Copy the API key** - you'll only see it once!
   - It looks like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 4: Add to Render Environment Variables

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your backend service (dialyease-admin)
3. Go to **Environment** tab
4. Add these environment variables:

   **First Variable:**
   - Key: `SENDGRID_API_KEY`
   - Value: `SG.xxxxxxxxxxxxx...` (paste your API key)

   **Second Variable:**
   - Key: `EMAIL_USER`
   - Value: `trustcapstonegroup@gmail.com` (your verified sender email)

5. Click **Save Changes**
6. Render will automatically redeploy (wait 1-2 minutes)

### Step 5: Test
1. Go to Forgot Password page
2. Enter an admin email address
3. Check the email inbox for the OTP
4. The email should arrive within seconds!

## Troubleshooting

### "SendGrid API key missing" error
- Verify `SENDGRID_API_KEY` is set in Render environment variables
- Make sure you copied the entire API key (starts with `SG.`)
- Check for extra spaces or characters

### "Sender email not verified" error
- Go to SendGrid → Settings → Sender Authentication
- Make sure your email shows as "Verified"
- The `EMAIL_USER` must match the verified sender email exactly

### OTP not received
- Check spam/junk folder
- Verify the admin email exists in the database
- Check Render logs for SendGrid errors
- Make sure SendGrid account is active

### Rate limit errors
- Free tier: 100 emails/day
- If exceeded, wait 24 hours or upgrade SendGrid plan

## Why SendGrid Instead of Gmail?

- ✅ **Works with Render free tier** (no SMTP port blocking)
- ✅ **100 emails/day free** (enough for most use cases)
- ✅ **More reliable delivery** (dedicated email service)
- ✅ **Better for production** (proper email infrastructure)
- ✅ **No 2FA required** (just API key)

## Security Notes

⚠️ **Important:**
- Never commit your `.env` file to Git
- Keep your SendGrid API key secure
- Regenerate API keys if compromised
- Monitor your SendGrid dashboard for usage
- The OTP expires after 10 minutes for security

## Support

For issues related to:
- SendGrid setup: [SendGrid Documentation](https://docs.sendgrid.com/)
- Email delivery: Check SendGrid Activity Feed in dashboard
- Application errors: Check Render logs or console output
