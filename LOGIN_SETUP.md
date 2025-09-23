# Login Setup Guide

## Required Environment Variables

Create a `.env` file in the server directory with the following variables:

```bash
# Server Configuration
PORT=4000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/inventory

# Security Keys (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-change-this
SESSION_SECRET=your-session-secret-change-this

# Admin Credentials (REQUIRED)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-admin-password
ADMIN_EMAIL=admin@company.com

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173
```

## Default Login Credentials

### Admin Login
- Username: `admin` (or whatever you set in ADMIN_USERNAME)
- Password: (whatever you set in ADMIN_PASSWORD)

### Testing the Login

1. **Start the server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Start the client:**
   ```bash
   cd client
   npm run dev
   ```

3. **Verify server is running:**
   - Open browser to http://localhost:4000
   - You should see a response

4. **Login:**
   - Navigate to http://localhost:5173/login
   - Enter admin credentials

## Troubleshooting

### "Login Failed" Error
1. Check if server is running on port 4000
2. Verify `.env` file exists in server directory
3. Ensure ADMIN_USERNAME and ADMIN_PASSWORD are set
4. Check JWT_SECRET is defined

### "Server configuration error"
This means environment variables are missing. Make sure:
- `.env` file exists in server directory
- All required variables are set (especially JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD)

### "Cannot connect to server"
1. Ensure server is running (`npm run dev` in server directory)
2. Check if port 4000 is available
3. Verify CORS is properly configured

### Network Error
1. Server is not running
2. Wrong API URL in client `.env`
3. Firewall blocking connection

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env` file to git
- Use strong passwords in production
- Change all default values
- Use secure JWT_SECRET (at least 32 characters)