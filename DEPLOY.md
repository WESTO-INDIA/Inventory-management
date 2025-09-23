# Deployment Guide for Render

This guide will help you deploy the Inventory Management System on Render.

## Prerequisites

1. GitHub account with your code pushed to a repository
2. Render account (sign up at https://render.com)
3. MongoDB Atlas account for database (or use Render's PostgreSQL)

## Step 1: Prepare MongoDB Atlas (Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Set up a database user with password
4. Whitelist all IPs (0.0.0.0/0) for Render access
5. Get your connection string (it looks like: `mongodb+srv://username:password@cluster.mongodb.net/inventory-management`)

## Step 2: Deploy to Render

### Option A: One-Click Deploy (Recommended)

1. Make sure your code is pushed to GitHub
2. Update the `render.yaml` file:
   - Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username
   - Commit and push the changes

3. Go to [Render Dashboard](https://dashboard.render.com)
4. Click "New +" → "Blueprint"
5. Connect your GitHub repository
6. Select your repository and branch
7. Render will automatically detect the `render.yaml` file
8. Click "Apply"

### Option B: Manual Setup

#### Deploy Backend:

1. Go to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: inventory-api
   - **Region**: Choose nearest to you
   - **Branch**: main (or your default branch)
   - **Root Directory**: Leave blank
   - **Runtime**: Node
   - **Build Command**: `cd server && npm install && npm run build`
   - **Start Command**: `cd server && npm start`

5. Add Environment Variables:
   - `NODE_ENV`: production
   - `PORT`: 4000
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Click "Generate" for a random value
   - `SESSION_SECRET`: Click "Generate" for a random value
   - `CLIENT_URL`: (Will be added after deploying frontend)

6. Click "Create Web Service"

#### Deploy Frontend:

1. Click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: inventory-client
   - **Branch**: main (or your default branch)
   - **Root Directory**: Leave blank
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/dist`

4. Add Environment Variables:
   - `VITE_API_URL`: Your backend URL (e.g., https://inventory-api.onrender.com)

5. Click "Create Static Site"

## Step 3: Update Environment Variables

1. After both services are deployed:
   - Go to your backend service settings
   - Add `CLIENT_URL` with your frontend URL (e.g., https://inventory-client.onrender.com)
   
2. Redeploy the backend service for changes to take effect

## Step 4: Verify Deployment

1. Check backend health: `https://your-api-url.onrender.com/api/health`
2. Visit your frontend: `https://your-client-url.onrender.com`
3. Try logging in with default admin credentials (if any)

## Important Notes

### Free Tier Limitations

- Services spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Limited to 750 hours/month of running time

### Production Recommendations

1. **Database**: Use MongoDB Atlas for better performance
2. **Plan**: Consider upgrading to paid plan to avoid spin-downs
3. **Monitoring**: Set up health checks in Render dashboard
4. **Secrets**: Never commit `.env` files to Git
5. **Backups**: Enable automatic backups for your database

## Troubleshooting

### Backend not starting?
- Check logs in Render dashboard
- Verify MongoDB connection string
- Ensure all environment variables are set

### Frontend not connecting to backend?
- Check CORS settings in backend
- Verify `VITE_API_URL` is correct
- Check browser console for errors

### Database connection issues?
- Verify MongoDB Atlas IP whitelist includes 0.0.0.0/0
- Check username/password in connection string
- Ensure database name is correct

## Environment Variables Summary

### Backend (.env)
```
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<generated>
SESSION_SECRET=<generated>
CLIENT_URL=https://your-frontend.onrender.com
```

### Frontend (.env)
```
VITE_API_URL=https://your-backend.onrender.com
```

## Support

For Render-specific issues: https://render.com/docs
For application issues: Check the repository issues section