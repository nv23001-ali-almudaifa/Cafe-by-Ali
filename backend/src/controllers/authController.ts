import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models';
import { LoyaltyPoints } from '../models/LoyaltyPoints';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// Validation middleware
export const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Controller functions
export const register = async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      phone
    });

    await user.save();

    // Create loyalty points account for new user
    const loyaltyPoints = new LoyaltyPoints({
      customer: user._id,
      totalPoints: 50, // Welcome bonus
      availablePoints: 50
    });

    await loyaltyPoints.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Get user without password
    const userResponse = user.toSafeObject();

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: userResponse,
        accessToken,
        refreshToken,
        loyaltyPoints: {
          totalPoints: loyaltyPoints.totalPoints,
          availablePoints: loyaltyPoints.availablePoints,
          tier: loyaltyPoints.tier
        }
      }
    });
  } catch (error: any) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Registration failed'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Get loyalty points
    let loyaltyPoints = null;
    try {
      loyaltyPoints = await LoyaltyPoints.findOne({ customer: user._id });
    } catch (error) {
      logger.warn('Could not fetch loyalty points for user:', user._id);
    }

    // Get user without password
    const userResponse = user.toSafeObject();

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        accessToken,
        refreshToken,
        loyaltyPoints: loyaltyPoints ? {
          totalPoints: loyaltyPoints.totalPoints,
          availablePoints: loyaltyPoints.availablePoints,
          tier: loyaltyPoints.tier
        } : null
      }
    });
  } catch (error: any) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Login failed'
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // For now, we'll implement a simple refresh token verification
    // In production, you'd want to store refresh tokens in the database
    // and validate them against stored tokens with token versioning

    res.json({
      success: false,
      error: 'Refresh token functionality to be implemented'
    });
  } catch (error: any) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Token refresh failed'
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token (in a real implementation, you'd send this via email)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token in user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    logger.info(`Password reset requested for: ${email}`);

    // In production, you'd send an email with the reset link
    res.json({
      success: true,
      message: 'Password reset instructions have been sent to your email',
      // In development, return the token for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (error: any) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process password reset request'
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    logger.info(`Password reset completed for: ${user.email}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error: any) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset password'
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // In a production environment, you'd want to implement token blacklisting
    // or store refresh tokens in the database to invalidate them

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Logout failed'
    });
  }
};