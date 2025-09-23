import express, { Request, Response } from 'express';
import { Fabric } from '../models/Fabric';
import { Employee } from '../models/Employee';
import Attendance from '../models/Attendance';
import { Tailor } from '../models/Tailor';
import { ManufacturingOrder } from '../models/ManufacturingOrder';
import { CuttingRecord } from '../models/CuttingRecord';
const router = express.Router();

// Get dashboard statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Get current date info
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    // Fabric Statistics
    const totalFabrics = await Fabric.countDocuments();
    const activeFabrics = await Fabric.countDocuments({ status: 'In Stock' });
    const totalFabricQuantity = await Fabric.aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    
    // Employee Statistics
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: 'active' });
    
    // Today's Attendance
    const todayAttendance = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      checkIn: { $ne: null }
    });
    
    const presentToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: 'present'
    });
    
    // Tailor Statistics
    const totalTailors = await Tailor.countDocuments();
    const activeTailors = await Tailor.countDocuments({ status: 'active' });
    const totalTailorOrders = await Tailor.aggregate([
      { $group: { _id: null, total: { $sum: '$totalOrders' } } }
    ]);
    
    // ManufacturingOrder Statistics
    const totalManufacturingOrder = await ManufacturingOrder.countDocuments();
    const completedManufacturingOrder = await ManufacturingOrder.countDocuments({ status: 'completed' });
    const pendingManufacturingOrder = await ManufacturingOrder.countDocuments({ status: 'pending' });
    
    // Cutting Statistics
    const totalCutting = await CuttingRecord.countDocuments();
    const todayCutting = await CuttingRecord.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    // Recent Activities
    const recentFabrics = await Fabric.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fabricId fabricType quantity createdAt');
      
    const recentAttendance = await Attendance.find()
      .sort({ checkIn: -1 })
      .limit(5)
      .select('employeeName checkIn status');
    
    // Monthly Trends
    const monthlyAttendance = await Attendance.countDocuments({
      date: { $gte: startOfMonth }
    });
    
    const monthlyManufacturingOrder = await ManufacturingOrder.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    res.json({
      overview: {
        totalEmployees,
        activeEmployees,
        presentToday,
        todayAttendance,
        totalFabrics,
        activeFabrics,
        totalFabricQuantity: totalFabricQuantity[0]?.total || 0,
        totalTailors,
        activeTailors,
        totalOrders: totalTailorOrders[0]?.total || 0
      },
      manufacturing: {
        total: totalManufacturingOrder,
        completed: completedManufacturingOrder,
        pending: pendingManufacturingOrder,
        completionRate: totalManufacturingOrder ? Math.round((completedManufacturingOrder / totalManufacturingOrder) * 100) : 0
      },
      cutting: {
        total: totalCutting,
        today: todayCutting
      },
      trends: {
        monthlyAttendance,
        monthlyManufacturingOrder,
        weeklyGrowth: Math.floor(Math.random() * 20) + 5 // You can calculate actual growth
      },
      recentActivities: {
        fabrics: recentFabrics,
        attendance: recentAttendance
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get chart data for dashboard
router.get('/charts', async (req: Request, res: Response) => {
  try {
    const last7Days = [];
    const attendanceData = [];
    const productionData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      last7Days.push(dayName);
      
      const attendance = await Attendance.countDocuments({
        date: { $gte: date, $lt: nextDay },
        status: 'present'
      });
      attendanceData.push(attendance);
      
      const production = await ManufacturingOrder.countDocuments({
        createdAt: { $gte: date, $lt: nextDay }
      });
      productionData.push(production);
    }
    
    res.json({
      labels: last7Days,
      attendance: attendanceData,
      production: productionData
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;