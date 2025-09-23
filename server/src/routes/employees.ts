import { Router, Request, Response } from 'express';
import { Employee } from '../models/Employee';

const router = Router();

// Get all employees (only active employees)
router.get('/', async (req: Request, res: Response) => {
  try {
    const employees = await Employee.find({ status: 'active' }).select('-password');
    res.json(employees);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get single employee
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-password');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create employee
router.post('/', async (req: Request, res: Response) => {
  try {
    
    // Ensure required fields are present
    if (!req.body.username || !req.body.password || !req.body.name || !req.body.dob) {
      return res.status(400).json({
        message: 'Username, password, name, and date of birth are required'
      });
    }
    
    const employee = new Employee(req.body);
    await employee.save();
    
    const savedEmployee = await Employee.findById(employee._id).select('-password');
    res.status(201).json(savedEmployee);
  } catch (error: any) {
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field === 'username' ? 'Username' : 'Email'} already exists` 
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({ 
        message: `Validation failed: ${messages.join(', ')}` 
      });
    }
    
    res.status(400).json({ message: error.message || 'Failed to create employee' });
  }
});

// Update employee
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { password, ...updateData } = req.body;
    
    // If password is provided and not empty, update it separately
    if (password && password.trim() !== '') {
      const employee = await Employee.findById(req.params.id);
      if (employee) {
        employee.password = password;
        await employee.save();
      }
    }
    
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    res.json(employee);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Update employee password
router.put('/:id/password', async (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    employee.password = newPassword;
    await employee.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Delete employee (soft delete - changes status to inactive)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Login employee
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    const employee = await Employee.findOne({ username });
    if (!employee) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await employee.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    if (employee.status !== 'active') {
      return res.status(401).json({ message: 'Account is not active' });
    }
    
    const employeeData = employee.toObject();
    delete employeeData.password;
    
    res.json({
      message: 'Login successful',
      employee: employeeData
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;