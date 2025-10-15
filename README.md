# Westo India - Inventory Management System

A simple and efficient inventory management system for garment manufacturing. Track fabrics, manage production, and handle stock with QR codes.

## Login Credentials

**Admin Portal:**
- Username: `westoindia`
- Password: `xxxxxxxxx`

**Employee Portal:**
- Contact your admin for employee credentials

> Change admin credentials in the server's `.env` file before deploying to production.

## What It Does

- **Stock Management** - Keep track of fabrics, cutting, and finished garments
- **QR System** - Generate QR codes for products and scan them for quick stock in/out
- **Employee Access** - Employees get a simple QR scanner interface
- **Admin Dashboard** - Full control panel for admins to manage everything
- **Transaction History** - See who did what and when
- **Manufacturing Flow** - From fabric to cutting to tailoring to finished products

## How to Run Locally

**You'll need:**
- Node.js (version 18 or higher)
- MongoDB (running locally or connection string)

**Setup:**

1. Clone this project
```bash
git clone https://github.com/WESTO-INDIA/Inventory-management.git
cd inventory-management
```

2. Start the backend
```bash
cd server
npm install
cp .env.example .env
# Edit .env file with your MongoDB connection
npm run dev
```

3. Start the frontend (in a new terminal)
```bash
cd client
npm install
npm run dev
```

4. Open your browser
- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## Tech Stack

**Frontend:** React, TypeScript, TailwindCSS, QR Scanner
**Backend:** Node.js, Express, MongoDB
**Security:** JWT auth, bcrypt password hashing

## Key Features Explained

**For Admins:**
- Full dashboard with all pages
- Manage inventory across all stages
- Add/edit employees
- View all transactions
- Generate QR codes for products

**For Employees:**
- Clean, simple interface
- Only QR scanner access
- Scan to add or remove stock
- All transactions are tracked with their name

## Deployment

**Backend (Render):**
```bash
Build: cd server && npm install && npm run build
Start: cd server && npm start
Add MONGODB_URI in environment variables
```

**Frontend (Vercel):**
```bash
Root directory: client
Framework: Vite
Add VITE_API_URL in environment variables
```

## Project Structure

```
inventory-management/
├── client/          # React frontend
│   ├── src/
│   │   ├── pages/   # All pages (Inventory, QR Scanner, etc)
│   │   └── components/
├── server/          # Node.js backend
│   ├── src/
│   │   ├── models/  # Database schemas
│   │   └── routes/  # API endpoints
```

## Need Help?

Check your MongoDB connection if the backend won't start. Make sure both frontend and backend are running on different ports. The frontend talks to the backend via the API URL.

---

**License:** MIT
