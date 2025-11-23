import mongoose, { Schema } from 'mongoose';
import { IMenuItem } from '../types';

const menuItemSchema = new Schema<IMenuItem>({
  name: {
    type: String,
    required: [true, 'Menu item name is required'],
    trim: true,
    maxlength: [100, 'Menu item name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: function(v: number) {
        return v > 0;
      },
      message: 'Price must be greater than 0'
    }
  },
  imageUrl: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Please provide a valid image URL'
    }
  },
  allergens: [{
    type: String,
    enum: ['nuts', 'dairy', 'gluten', 'soy', 'eggs', 'fish', 'shellfish']
  }],
  ingredients: [{
    type: String,
    trim: true,
    maxlength: [50, 'Ingredient name cannot exceed 50 characters']
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  preparationTime: {
    type: Number,
    required: [true, 'Preparation time is required'],
    min: [1, 'Preparation time must be at least 1 minute'],
    max: [60, 'Preparation time cannot exceed 60 minutes']
  },
  nutritionalInfo: {
    calories: {
      type: Number,
      min: [0, 'Calories cannot be negative'],
      max: [5000, 'Calories seem too high']
    },
    protein: {
      type: Number,
      min: [0, 'Protein cannot be negative'],
      max: [200, 'Protein value seems too high']
    },
    carbs: {
      type: Number,
      min: [0, 'Carbs cannot be negative'],
      max: [500, 'Carbs value seems too high']
    },
    fat: {
      type: Number,
      min: [0, 'Fat cannot be negative'],
      max: [200, 'Fat value seems too high']
    }
  },
  orderCount: {
    type: Number,
    default: 0,
    min: [0, 'Order count cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
menuItemSchema.index({ category: 1 });
menuItemSchema.index({ isAvailable: 1 });
menuItemSchema.index({ orderCount: -1 });
menuItemSchema.index({ price: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

// Virtual for formatted price
menuItemSchema.virtual('formattedPrice').get(function() {
  return `$${this.price.toFixed(2)}`;
});

// Middleware to update category item count
menuItemSchema.post('save', async function() {
  await mongoose.model('Category').findByIdAndUpdate(
    this.category,
    { $inc: { itemCount: 1 } }
  );
});

menuItemSchema.post('remove', async function() {
  await mongoose.model('Category').findByIdAndUpdate(
    this.category,
    { $inc: { itemCount: -1 } }
  );
});

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', menuItemSchema);