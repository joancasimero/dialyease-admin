# DialyEase Admin Panel Deployment Guide

## Prerequisites
1. MongoDB Atlas account
2. GitHub account
3. Render account
4. Vercel account

## Backend Deployment (Render)

### 1. Setup MongoDB Atlas
1. Create a MongoDB Atlas account at https://www.mongodb.com/atlas
2. Create a new cluster (free tier is fine)
3. Create a database user with read/write permissions
4. Get your connection string (it should look like: `mongodb+srv://username:password@cluster.mongodb.net/dialyease?retryWrites=true&w=majority`)

### 2. Deploy to Render
1. Push your code to GitHub
2. Go to https://render.com and connect your GitHub account
3. Create a new Web Service
4. Connect your repository: `your-username/dialyease-admin`
5. Configure the service:
   - **Name**: `dialyease-admin-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Auto-Deploy**: Yes

6. Add Environment Variables in Render dashboard:
   ```
   MONGO_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_strong_jwt_secret_key_here
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_gmail_app_password
   PORT=5000
   ```

7. Deploy and wait for the build to complete
8. Note your backend URL (e.g., `https://dialyease-admin-backend.onrender.com`)

### 3. Seed Admin User
After deployment, run the seed script to create the admin user:
1. Go to Render dashboard → your service → Shell
2. Run: `npm run seed`

## Frontend Deployment (Vercel)

### 1. Deploy to Vercel
1. Go to https://vercel.com and connect your GitHub account
2. Import your repository: `your-username/dialyease-admin`
3. Configure the project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

4. Add Environment Variables in Vercel dashboard:
   ```
   REACT_APP_API_URL=https://your-render-backend-url.onrender.com/api
   ```

5. Deploy and wait for the build to complete

## Post-Deployment Steps

### 1. Test the Application
1. Visit your Vercel frontend URL
2. Try logging in with:
   - Username: `admin`
   - Password: `admin123`

### 2. Update CORS Settings (if needed)
If you encounter CORS issues, update your backend's CORS configuration in `server.js` to include your Vercel domain.

### 3. Custom Domains (Optional)
- **Vercel**: Add custom domain in project settings
- **Render**: Add custom domain in service settings

## Environment Variables Summary

### Backend (Render)
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dialyease?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_specific_password
PORT=5000
```

### Frontend (Vercel)
```
REACT_APP_API_URL=https://your-render-app.onrender.com/api
```

## Maintenance
- **Render**: Free tier sleeps after 15 minutes of inactivity
- **Vercel**: Unlimited bandwidth on free tier
- **MongoDB Atlas**: Free tier has 512MB storage limit

## Troubleshooting
1. Check Render logs for backend issues
2. Check Vercel function logs for frontend issues
3. Ensure environment variables are set correctly
4. Verify MongoDB Atlas IP whitelist (set to 0.0.0.0/0 for simplicity)