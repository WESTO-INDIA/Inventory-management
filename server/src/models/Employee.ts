import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IEmployee extends Document {
  username: string;
  password: string;
  name: string;
  email: string;
  mobile: string;
  dob: Date;
  aadharNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  salary?: number;
  work: string;
  photo?: string;
  employeeId: string;
  role: 'admin' | 'employee';
  joiningDate: Date;
  status: 'active' | 'inactive' | 'terminated';
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const employeeSchema = new Schema<IEmployee>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  mobile: {
    type: String,
    required: true
  },
  dob: {
    type: Date,
    required: true
  },
  aadharNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        // If empty or null, it's valid (optional field)
        if (!v || v.trim() === '') return true;
        // If provided, must be 12 digits
        return /^\d{12}$/.test(v);
      },
      message: 'Aadhar number must be 12 digits'
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  salary: {
    type: Number,
    default: 0
  },
  work: {
    type: String,
    required: true
  },
  photo: {
    type: String, // Base64 encoded photo
    default: null
  },
  employeeId: {
    type: String,
    unique: true
  },
  role: {
    type: String,
    default: 'employee',
    enum: ['employee', 'admin']
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'inactive', 'terminated']
  }
}, {
  timestamps: true
});

// Hash password before saving
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Generate employee ID with format WI25EMP01
employeeSchema.pre('save', async function(next) {
  if (!this.employeeId) {
    try {
      const year = new Date().getFullYear().toString().slice(-2); // Get last 2 digits of year
      const prefix = `WI${year}EMP`;

      // Find the highest existing employee number with this prefix
      const lastEmployee = await (this.constructor as any)
        .findOne({ employeeId: { $regex: `^${prefix}` } })
        .sort({ employeeId: -1 });

      let nextNumber = 1;
      if (lastEmployee && lastEmployee.employeeId) {
        const match = lastEmployee.employeeId.match(/WI\d{2}EMP(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      this.employeeId = `${prefix}${String(nextNumber).padStart(2, '0')}`;
    } catch (error: any) {
      return next(error);
    }
  }
  next();
});

// Compare password method
employeeSchema.methods.comparePassword = async function(candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Employee = mongoose.model<IEmployee>('Employee', employeeSchema);
export { Employee };
export default Employee;