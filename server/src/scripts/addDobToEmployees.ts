import mongoose from 'mongoose';
import { Employee } from '../models/Employee';
import dotenv from 'dotenv';

dotenv.config();

async function addDobToEmployees() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory');

    // Get all employees without DOB
    const employees = await Employee.find({
      $or: [
        { dob: { $exists: false } },
        { dob: null }
      ]
    });


    // Update each employee with a default DOB (set to 1990-01-01)
    for (const employee of employees) {
      employee.dob = new Date('1990-01-01');
      await employee.save();
    }

    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// Run migration
addDobToEmployees();