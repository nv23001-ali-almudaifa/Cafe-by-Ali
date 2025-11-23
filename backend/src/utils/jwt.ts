import jwt from 'jsonwebtoken';
import { IUser } from '../types';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
}

export const generateAccessToken = (user: IUser): string => {
  const payload: JWTPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
    issuer: 'coffee-by-ali',
    audience: 'coffee-by-ali-client'
  });
};

export const generateRefreshToken = (user: IUser, tokenVersion: number = 0): string => {
  const payload: RefreshTokenPayload = {
    userId: user._id.toString(),
    tokenVersion
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    issuer: 'coffee-by-ali',
    audience: 'coffee-by-ali-client'
  });
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!, {
      issuer: 'coffee-by-ali',
      audience: 'coffee-by-ali-client'
    }) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
      issuer: 'coffee-by-ali',
      audience: 'coffee-by-ali-client'
    }) as RefreshTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error('Refresh token verification failed');
    }
  }
};

export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};

export const getTokenExpiration = (token: string): Date | null => {
  const decoded = decodeToken(token);
  if (decoded && typeof decoded === 'object' && 'exp' in decoded) {
    return new Date(decoded.exp * 1000);
  }
  return null;
};