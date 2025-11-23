import mongoose, { Schema } from 'mongoose';
import { ILoyaltyPoints } from '../types';

const loyaltyTransactionSchema = new Schema({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order'
  },
  pointsEarned: {
    type: Number,
    min: [0, 'Points earned cannot be negative']
  },
  pointsSpent: {
    type: Number,
    min: [0, 'Points spent cannot be negative']
  },
  description: {
    type: String,
    required: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

const rewardSchema = new Schema({
  rewardId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    maxlength: [100, 'Reward name cannot exceed 100 characters']
  },
  pointsCost: {
    type: Number,
    required: true,
    min: [0, 'Points cost cannot be negative']
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedAt: Date
});

const loyaltyPointsSchema = new Schema<ILoyaltyPoints>({
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalPoints: {
    type: Number,
    default: 0,
    min: [0, 'Total points cannot be negative']
  },
  availablePoints: {
    type: Number,
    default: 0,
    min: [0, 'Available points cannot be negative']
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  lifetimeSpent: {
    type: Number,
    default: 0,
    min: [0, 'Lifetime spent cannot be negative']
  },
  transactions: [loyaltyTransactionSchema],
  rewards: [rewardSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
loyaltyPointsSchema.index({ customer: 1 }, { unique: true });
loyaltyPointsSchema.index({ tier: 1 });
loyaltyPointsSchema.index({ totalPoints: -1 });

// Static methods for tier management
loyaltyPointsSchema.statics.getTierThresholds = function() {
  return {
    bronze: { min: 0, multiplier: 1.0 },
    silver: { min: 500, multiplier: 1.25 },
    gold: { min: 1500, multiplier: 1.5 },
    platinum: { min: 3000, multiplier: 2.0 }
  };
};

// Method to calculate points for an order
loyaltyPointsSchema.methods.calculatePointsForOrder = function(orderAmount: number): number {
  const thresholds = this.constructor.getTierThresholds();
  const currentTier = thresholds[this.tier as keyof typeof thresholds];

  // 1 point per $1 spent, adjusted by tier multiplier
  const basePoints = Math.floor(orderAmount);
  const tierMultiplier = currentTier.multiplier;

  return Math.floor(basePoints * tierMultiplier);
};

// Method to update tier based on total points
loyaltyPointsSchema.methods.updateTier = function() {
  const thresholds = this.constructor.getTierThresholds();

  let newTier = 'bronze';
  for (const [tierName, threshold] of Object.entries(thresholds)) {
    if (this.totalPoints >= threshold.min) {
      newTier = tierName;
    }
  }

  if (newTier !== this.tier) {
    this.tier = newTier;
    return true; // Tier changed
  }

  return false; // No change
};

// Method to add points
loyaltyPointsSchema.methods.addPoints = function(points: number, description: string, orderId?: mongoose.Types.ObjectId) {
  this.totalPoints += points;
  this.availablePoints += points;

  this.transactions.push({
    orderId,
    pointsEarned: points,
    pointsSpent: 0,
    description,
    createdAt: new Date()
  });

  const tierChanged = this.updateTier();
  return { tierChanged, newTier: this.tier };
};

// Method to spend points
loyaltyPointsSchema.methods.spendPoints = function(points: number, description: string): boolean {
  if (this.availablePoints < points) {
    return false; // Not enough points
  }

  this.availablePoints -= points;

  this.transactions.push({
    pointsEarned: 0,
    pointsSpent: points,
    description,
    createdAt: new Date()
  });

  return true;
};

// Method to add reward
loyaltyPointsSchema.methods.addReward = function(rewardId: string, name: string, pointsCost: number) {
  this.rewards.push({
    rewardId,
    name,
    pointsCost,
    isUsed: false,
    usedAt: undefined
  });
};

// Method to use reward
loyaltyPointsSchema.methods.useReward = function(rewardId: string): boolean {
  const reward = this.rewards.find(r => r.rewardId === rewardId && !r.isUsed);

  if (!reward) {
    return false; // Reward not found or already used
  }

  reward.isUsed = true;
  reward.usedAt = new Date();

  return true;
};

// Virtual for next tier info
loyaltyPointsSchema.virtual('nextTier').get(function() {
  const thresholds = this.constructor.getTierThresholds();
  const tiers = Object.keys(thresholds);
  const currentIndex = tiers.indexOf(this.tier);

  if (currentIndex === tiers.length - 1) {
    return null; // Already at highest tier
  }

  const nextTierName = tiers[currentIndex + 1];
  const nextThreshold = thresholds[nextTierName as keyof typeof thresholds];

  return {
    name: nextTierName,
    pointsNeeded: nextThreshold.min - this.totalPoints,
    multiplier: nextThreshold.multiplier
  };
});

export const LoyaltyPoints = mongoose.model<ILoyaltyPoints>('LoyaltyPoints', loyaltyPointsSchema);