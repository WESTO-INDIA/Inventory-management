import mongoose from 'mongoose';
import { Employee } from '../models/Employee';
import dotenv from 'dotenv';

dotenv.config();

async function migrateEmployeeIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory');

    // Get all employees with old format IDs
    const employees = await Employee.find({
      employeeId: { $regex: /^EMP\d+$/ }
    });


    // Update each employee with new format
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      const year = new Date().getFullYear().toString().slice(-2);
      const newEmployeeId = `WI${year}EMP${String(i + 1).padStart(2, '0')}`;

      employee.employeeId = newEmployeeId;
      await employee.save();

    }

    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// Run migration
migrateEmployeeIds();