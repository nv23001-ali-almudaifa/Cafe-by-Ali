import mongoose, { Schema } from 'mongoose';
import { IOrder } from '../types';

const orderItemSchema = new Schema({
  menuItem: {
    type: Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be an integer'
    }
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  customizations: {
    milk: {
      type: String,
      enum: ['whole', 'oat', 'almond', 'soy']
    },
    size: {
      type: String,
      enum: ['small', 'medium', 'large']
    },
    extraShots: {
      type: Number,
      min: [0, 'Extra shots cannot be negative'],
      max: [5, 'Too many extra shots']
    },
    sweetness: {
      type: Number,
      min: [0, 'Sweetness cannot be negative'],
      max: [100, 'Sweetness cannot exceed 100']
    },
    temperature: {
      type: String,
      enum: ['hot', 'iced']
    }
  }
});

const paymentInfoSchema = new Schema({
  stripePaymentIntentId: String,
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed'],
    default: 'pending'
  },
  last4: String
});

const orderSchema = new Schema<IOrder>({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    type: Number,
    required: true,
    min: [0, 'Tax cannot be negative']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'pending'
  },
  pickupTime: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        return !v || v > new Date();
      },
      message: 'Pickup time must be in the future'
    }
  },
  estimatedReadyTime: Date,
  actualReadyTime: Date,
  paymentInfo: {
    type: paymentInfoSchema,
    default: () => ({})
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ customer: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ pickupTime: 1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const today = new Date();
    const yearMonth = today.getFullYear().toString().slice(-2) +
                      (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      }
    });

    const sequence = (count + 1).toString().padStart(3, '0');
    this.orderNumber = `COF${yearMonth}${day}-${sequence}`;
  }
  next();
});

// Virtual for formatted total
orderSchema.virtual('formattedTotal').get(function() {
  return `$${this.total.toFixed(2)}`;
});

// Method to calculate preparation time
orderSchema.methods.calculatePreparationTime = function(): number {
  let totalTime = 0;
  const itemTimes: { [key: string]: number } = {
    'coffee': 5,
    'complex': 8,
    'food': 10
  };

  // Group similar items for efficiency
  const itemGroups = new Map();
  this.items.forEach((item: any) => {
    // Simple categorization - in real app, this would be more sophisticated
    const category = 'coffee'; // This would come from the menuItem
    if (!itemGroups.has(category)) {
      itemGroups.set(category, []);
    }
    itemGroups.get(category).push(item);
  });

  // Calculate time with efficiency for multiple similar items
  itemGroups.forEach((items: any[], category: string) => {
    const baseTime = itemTimes[category] || 5;
    const overlapEfficiency = Math.min(items.length * 0.2, 0.6); // Up to 60% efficiency
    totalTime += baseTime * (1 + (items.length - 1) * (1 - overlapEfficiency));
  });

  // Add 2-3 minutes for orders with multiple items
  if (itemGroups.size > 1) {
    totalTime += Math.random() * 2 + 2;
  }

  return Math.ceil(totalTime);
};

export const Order = mongoose.model<IOrder>('Order', orderSchema);