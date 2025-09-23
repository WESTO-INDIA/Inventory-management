# Inventory Management System

A modern full-stack inventory management system with real-time tracking, employee management, and manufacturing workflow.

## 🔐 Default Admin Credentials

The admin credentials are configured via environment variables for better security.

**Default Login:**
- Username: `admin`
- Password: `admin123`

To change admin credentials, update these values in the server's `.env` file:
```env
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password
ADMIN_EMAIL=admin@yourcompany.com
```

**⚠️ Important:** Always change the default credentials in production!

## 🚀 Features

- **Inventory Management** - Track fabrics, materials, and products
- **Employee Portal** - Attendance tracking with photo verification
- **Manufacturing** - Track cutting and production processes
- **QR Code System** - Generate and scan product QR codes
- **Real-time Dashboard** - Live statistics and metrics
- **Tailor Management** - Manage tailors and work assignments

## 📁 Project Structure

```
inventory-management/
├── client/                # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/   # Reusable components
│   │   ├── stores/       # State management
│   │   └── config/       # Configuration
│   └── dist/            # Production build
├── server/               # Node.js + Express backend
│   ├── src/
│   │   ├── models/      # MongoDB schemas
│   │   ├── routes/      # REST API endpoints
│   │   └── middleware/  # Auth & validation
│   └── dist/           # Compiled TypeScript
├── render.yaml          # Render deployment config
└── DEPLOY.md           # Deployment guide
```

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- TailwindCSS
- QR Code Generation & Scanning

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- REST API
- JWT Authentication
- Bcrypt Password Hashing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- Git

### Local Development

1. **Clone and install:**
```bash
git clone https://github.com/YOUR_USERNAME/inventory-management.git
cd inventory-management
```

2. **Setup Backend:**
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm run dev
```
 
3. **Setup Frontend:**
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

4. **Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- GraphQL: http://localhost:4000/graphql

## 🌐 Deployment on Render

### Easy Deploy with render.yaml

1. Push code to GitHub
2. Update `render.yaml` with your repo URL
3. Go to Render Dashboard → New Blueprint
4. Connect repository
5. Deploy automatically

See [DEPLOY.md](./DEPLOY.md) for detailed instructions.

## 🔐 Environment Variables

**Backend (.env):**
```
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb://...
JWT_SECRET=<generated>
SESSION_SECRET=<generated>
CLIENT_URL=https://your-frontend.onrender.com
```

**Frontend (.env):**
```
VITE_API_URL=https://your-backend.onrender.com
```

## 📝 License

MIT License - see LICENSE file for details