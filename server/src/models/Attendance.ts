import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'holiday', 'leave'],
    default: 'present'
  },
  photo: {
    type: String, // Base64 encoded photo captured during check-in
    required: true
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  notes: String,
  workHours: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate work hours when checking out
attendanceSchema.methods.calculateWorkHours = function() {
  if (this.checkIn && this.checkOut) {
    const diff = this.checkOut - this.checkIn;
    this.workHours = diff / (1000 * 60 * 60); // Convert to hours
  }
};

// Create compound index for employee and date
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);