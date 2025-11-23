import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'customer' | 'admin';
  avatar?: string;
  preferences: {
    dietaryRestrictions: string[];
    favoriteItems: Types.ObjectId[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMenuItem extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  category: Types.ObjectId;
  price: number;
  imageUrl?: string;
  allergens: string[];
  ingredients: string[];
  isAvailable: boolean;
  preparationTime: number;
  nutritionalInfo: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  orderCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderItem {
  menuItem: Types.ObjectId;
  quantity: number;
  price: number;
  customizations: {
    milk?: 'whole' | 'oat' | 'almond' | 'soy';
    size?: 'small' | 'medium' | 'large';
    extraShots?: number;
    sweetness?: number;
    temperature?: 'hot' | 'iced';
  };
}

export interface IPaymentInfo {
  stripePaymentIntentId?: string;
  status: 'pending' | 'succeeded' | 'failed';
  last4?: string;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  customer: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  pickupTime?: Date;
  estimatedReadyTime?: Date;
  actualReadyTime?: Date;
  paymentInfo: IPaymentInfo;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReservation extends Document {
  _id: Types.ObjectId;
  customer: Types.ObjectId;
  partySize: number;
  date: Date;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no-show';
  tableNumber?: number;
  specialRequests?: string;
  contactPhone: string;
  contactEmail: string;
  confirmationCode: string;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoyaltyTransaction {
  orderId?: Types.ObjectId;
  pointsEarned: number;
  pointsSpent: number;
  description: string;
  createdAt: Date;
}

export interface IReward {
  rewardId: string;
  name: string;
  pointsCost: number;
  isUsed: boolean;
  usedAt?: Date;
}

export interface ILoyaltyPoints extends Document {
  _id: Types.ObjectId;
  customer: Types.ObjectId;
  totalPoints: number;
  availablePoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  lifetimeSpent: number;
  transactions: ILoyaltyTransaction[];
  rewards: IReward[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAdminStats {
  todayOrders: number;
  totalRevenue: number;
  activeReservations: number;
  popularItems: Array<{
    itemId: Types.ObjectId;
    name: string;
    orderCount: number;
  }>;
  recentOrders: IOrder[];
  upcomingReservations: IReservation[];
}