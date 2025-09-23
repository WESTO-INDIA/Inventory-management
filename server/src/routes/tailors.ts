import express, { Request, Response } from 'express';
import { Tailor } from '../models/Tailor';
const router = express.Router();

// Get all tailors
router.get('/', async (req: Request, res: Response) => {
  try {
    const tailors = await Tailor.find().sort({ createdAt: -1 });
    res.json(tailors);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get single tailor
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tailor = await Tailor.findById(req.params.id);
    if (!tailor) {
      return res.status(404).json({ message: 'Tailor not found' });
    }
    res.json(tailor);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create tailor
router.post('/', async (req: Request, res: Response) => {
  try {
    
    const tailor = new Tailor(req.body);
    await tailor.save();
    
    res.status(201).json(tailor);
  } catch (error: any) {
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Tailor ID already exists' 
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({ 
        message: `Validation failed: ${messages.join(', ')}` 
      });
    }
    
    res.status(400).json({ message: error.message || 'Failed to create tailor' });
  }
});

// Update tailor
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tailor = await Tailor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!tailor) {
      return res.status(404).json({ message: 'Tailor not found' });
    }
    
    res.json(tailor);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Delete tailor
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tailor = await Tailor.findByIdAndDelete(req.params.id);
    
    if (!tailor) {
      return res.status(404).json({ message: 'Tailor not found' });
    }
    
    res.json({ message: 'Tailor deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update tailor stats
router.put('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { totalOrders, completedOrders, pendingOrders } = req.body;
    
    const tailor = await Tailor.findByIdAndUpdate(
      req.params.id,
      { 
        totalOrders,
        completedOrders,
        pendingOrders
      },
      { new: true }
    );
    
    if (!tailor) {
      return res.status(404).json({ message: 'Tailor not found' });
    }
    
    res.json(tailor);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;