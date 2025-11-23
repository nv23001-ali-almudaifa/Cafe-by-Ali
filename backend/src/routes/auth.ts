import express from 'express';
import {
  register,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  logout,
  validateRegistration,
  validateLogin,
  validatePasswordReset
} from '../controllers/authController';
import { authRateLimit } from '../middleware/auth';

const router = express.Router();

// Apply rate limiting to auth routes
router.use(authRateLimit(5, 15 * 60 * 1000)); // 5 attempts per 15 minutes

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validateRegistration, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateLogin, login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', refreshToken);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', validatePasswordReset, resetPassword);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private (will require authentication middleware in production)
 */
router.post('/logout', logout);

export default router;