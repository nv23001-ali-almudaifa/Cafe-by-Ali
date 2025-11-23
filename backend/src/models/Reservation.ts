import mongoose, { Schema } from 'mongoose';
import { IReservation } from '../types';

const reservationSchema = new Schema<IReservation>({
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  partySize: {
    type: Number,
    required: [true, 'Party size is required'],
    min: [1, 'Party size must be at least 1'],
    max: [8, 'Party size cannot exceed 8 people'],
    validate: {
      validator: Number.isInteger,
      message: 'Party size must be an integer'
    }
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    validate: {
      validator: function(v: Date) {
        return v > new Date();
      },
      message: 'Reservation date must be in the future'
    }
  },
  time: {
    type: String,
    required: [true, 'Time is required'],
    validate: {
      validator: function(v: string) {
        // Validate HH:mm format
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Time must be in HH:mm format'
    }
  },
  duration: {
    type: Number,
    default: 90,
    min: [30, 'Duration must be at least 30 minutes'],
    max: [240, 'Duration cannot exceed 4 hours']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  tableNumber: {
    type: Number,
    min: [1, 'Table number must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Table number must be an integer'
    }
  },
  specialRequests: {
    type: String,
    maxlength: [500, 'Special requests cannot exceed 500 characters'],
    trim: true
  },
  contactPhone: {
    type: String,
    required: [true, 'Contact phone is required'],
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  contactEmail: {
    type: String,
    required: [true, 'Contact email is required'],
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  confirmationCode: {
    type: String,
    required: true,
    unique: true
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
reservationSchema.index({ customer: 1 });
reservationSchema.index({ date: 1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ confirmationCode: 1 }, { unique: true });
reservationSchema.index({ date: 1, time: 1 });

// Pre-save middleware to generate confirmation code
reservationSchema.pre('save', async function(next) {
  if (this.isNew && !this.confirmationCode) {
    // Generate 6-digit confirmation code
    this.confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

// Virtual for formatted date and time
reservationSchema.virtual('formattedDateTime').get(function() {
  const date = this.date;
  const time = this.time;
  return `${date.toLocaleDateString()} at ${time}`;
});

// Virtual for end time
reservationSchema.virtual('endTime').get(function() {
  const [hours, minutes] = this.time.split(':').map(Number);
  const endTime = new Date();
  endTime.setHours(hours, minutes + this.duration);
  return endTime.toTimeString().slice(0, 5);
});

// Static method to check availability
reservationSchema.statics.checkAvailability = async function(date: Date, time: string, partySize: number) {
  // Get all reservations for the same date and overlapping time
  const targetDateTime = new Date(`${date.toISOString().split('T')[0]}T${time}`);
  const duration = 90; // Default reservation duration

  const overlappingReservations = await this.find({
    date: date,
    status: { $in: ['pending', 'confirmed', 'seated'] },
    $or: [
      // Existing reservation starts during requested time
      {
        time: { $lte: time },
        $expr: {
          $lte: [
            { $add: [{ $dateFromString: { dateString: { $concat: [{ $dateToString: { format: "%Y-%m-%d", date: "$date" } }, " ", "$time"] } } }, duration * 60000] },
            { $dateFromString: { dateString: { $concat: [{ $dateToString: { format: "%Y-%m-%d", date: date } }, " ", time] } } }
          ]
        }
      },
      // Existing reservation overlaps requested time
      {
        $and: [
          { time: { $gt: time } },
          { $expr: { $lt: [{ $dateFromString: { dateString: { $concat: [{ $dateToString: { format: "%Y-%m-%d", date: "$date" } }, " ", "$time"] } } }, { $add: [targetDateTime, duration * 60000] }] } }
        ]
      }
    ]
  });

  // Calculate total party size for overlapping reservations
  const totalPartySize = overlappingReservations.reduce((sum: number, res: any) => sum + res.partySize, 0);

  // Assume restaurant capacity (you can make this configurable)
  const maxCapacity = 50;
  const tablesNeeded = Math.ceil(totalPartySize / 4); // Assume 4 people per table on average
  const availableCapacity = maxCapacity - totalPartySize;

  return {
    available: availableCapacity >= partySize,
    availableCapacity,
    overlappingReservations: overlappingReservations.length,
    recommendedTables: Math.ceil(partySize / 4)
  };
};

export const Reservation = mongoose.model<IReservation>('Reservation', reservationSchema);