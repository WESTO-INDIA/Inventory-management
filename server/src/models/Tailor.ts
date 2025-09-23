import mongoose, { Document, Schema } from 'mongoose';

export interface ITailor extends Document {
  tailorId: string;
  name: string;
  mobile: string;
  address: string;
  work: string;
  status: string;
  joiningDate: Date;
  totalOrders?: number;
  completedOrders?: number;
  pendingOrders?: number;
}

const tailorSchema = new Schema<ITailor>({
  tailorId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobile: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  work: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'inactive']
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  completedOrders: {
    type: Number,
    default: 0
  },
  pendingOrders: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate tailor ID
tailorSchema.pre('save', async function(next) {
  if (!this.tailorId) {
    try {
      const count = await (this.constructor as any).countDocuments();
      this.tailorId = `TLR${String(count + 1).padStart(4, '0')}`;
    } catch (error: any) {
      return next(error);
    }
  }
  next();
});

const Tailor = mongoose.model<ITailor>('Tailor', tailorSchema);
export { Tailor };
export default Tailor;