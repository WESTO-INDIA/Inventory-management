import express, { Request, Response } from 'express';
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const router = express.Router();

// Get all attendance records
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date, employeeId, startDate, endDate } = req.query;
    let query: any = {};
    
    if (employeeId) {
      (query as any).employeeId = employeeId;
    }
    
    if (date) {
      const queryDate = new Date(date as string);
      queryDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(queryDate);
      nextDay.setDate(nextDay.getDate() + 1);
      (query as any).date = { $gte: queryDate, $lt: nextDay };
    } else if (startDate && endDate) {
      (query as any).date = { 
        $gte: new Date(startDate as string), 
        $lte: new Date(endDate as string) 
      };
    }
    
    const attendance = await Attendance.find(query).sort({ date: -1 });
    res.json(attendance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get today's attendance for an employee
router.get('/today/:employeeId', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const attendance = await Attendance.findOne({
      employeeId: req.params.employeeId,
      date: { $gte: today, $lt: tomorrow }
    });
    
    res.json(attendance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Check attendance for specific date
router.get('/check/:employeeId/:date', async (req: Request, res: Response) => {
  try {
    const { employeeId, date } = req.params;
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const attendance = await Attendance.findOne({
      employeeId,
      date: { $gte: queryDate, $lt: nextDay }
    });
    
    res.json({ attendance });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Mark attendance (simplified for employee portal)
router.post('/mark', async (req: Request, res: Response) => {
  try {
    const { employeeId, employeeName, date, status, checkIn, notes, photo } = req.body;
    
    // Get employee to verify
    const employee = await Employee.findOne({ 
      $or: [
        { employeeId: employeeId },
        { username: employeeId }
      ]
    });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Photo is required
    if (!photo) {
      return res.status(400).json({ message: 'Photo is required to mark attendance' });
    }
    
    // Check if already marked for this date
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: { $gte: queryDate, $lt: nextDay }
    });
    
    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for this date' });
    }
    
    const attendance = new Attendance({
      employeeId,
      employeeName: employee.name,
      date: queryDate,
      checkIn: checkIn ? new Date(checkIn) : (status === 'present' || status === 'late' ? new Date() : null),
      status,
      photo: photo, // Use the captured photo from request
      notes
    });
    
    await attendance.save();
    res.status(201).json({ attendance, message: `Attendance marked as ${status}` });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Checkout by attendance ID
router.put('/checkout/:id', async (req: Request, res: Response) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    if (attendance.checkOut) {
      return res.status(400).json({ message: 'Already checked out' });
    }
    
    attendance.checkOut = new Date();
    attendance.calculateWorkHours();
    await attendance.save();
    
    res.json({ attendance, message: 'Checked out successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Mark attendance (check-in)
router.post('/checkin', async (req: Request, res: Response) => {
  try {
    const { employeeId, location } = req.body;
    
    // Get employee details - check by employeeId or username
    const employee = await Employee.findOne({ 
      $or: [
        { employeeId: employeeId },
        { username: employeeId }
      ]
    });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    const actualEmployeeId = employee.employeeId || employee.username;
    
    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const existingAttendance = await Attendance.findOne({
      employeeId: actualEmployeeId,
      date: { $gte: today, $lt: tomorrow }
    });
    
    if (existingAttendance && !existingAttendance.checkOut) {
      return res.status(400).json({ message: 'Already checked in today' });
    }
    
    // Create new attendance record with employee's stored photo
    const attendance = new Attendance({
      employeeId: actualEmployeeId,
      employeeName: employee.name,
      date: today,
      checkIn: new Date(),
      photo: employee.photo, // Use employee's stored photo
      location,
      status: new Date().getHours() > 9 ? 'late' : 'present'
    });
    
    await attendance.save();
    res.status(201).json(attendance);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Mark checkout
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    
    // Find today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const attendance = await Attendance.findOne({
      employeeId,
      date: { $gte: today, $lt: tomorrow },
      checkOut: null
    });
    
    if (!attendance) {
      return res.status(404).json({ message: 'No check-in found for today' });
    }
    
    attendance.checkOut = new Date();
    attendance.calculateWorkHours();
    await attendance.save();
    
    res.json(attendance);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Get attendance summary for a period
router.get('/summary/:employeeId', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const { employeeId } = req.params;
    
    const attendance = await Attendance.find({
      employeeId,
      date: { 
        $gte: new Date(startDate as string), 
        $lte: new Date(endDate as string) 
      }
    });
    
    const summary = {
      totalDays: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      late: attendance.filter(a => a.status === 'late').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      leaves: attendance.filter(a => a.status === 'leave').length,
      totalHours: attendance.reduce((sum, a) => sum + (a.workHours || 0), 0)
    };
    
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update attendance record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    if (attendance.checkOut) {
      attendance.calculateWorkHours();
      await attendance.save();
    }
    
    res.json(attendance);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Delete attendance record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;