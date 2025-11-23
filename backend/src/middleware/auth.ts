import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models';
import { logger } from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        userDocument?: any;
      };
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the token
    const decoded = verifyAccessToken(token);

    // Get the user from database to ensure they still exist and are active
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Attach user information to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      userDocument: user
    };

    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    // Get the user from database
    const user = await User.findById(decoded.userId).select('-password');
    if (user) {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        userDocument: user
      };
    }

    next();
  } catch (error: any) {
    // If token is invalid, continue without user
    logger.warn('Optional authentication failed:', error.message);
    next();
  }
};

// Rate limiting specifically for auth endpoints
export const authRateLimit = (maxRequests: number, windowMs: number) => {
  const requests = new Map();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    const userRequests = requests.get(key) || [];
    const validRequests = userRequests.filter((timestamp: number) => timestamp > windowStart);

    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts. Please try again later.'
      });
    }

    validRequests.push(now);
    requests.set(key, validRequests);

    next();
  };
};