import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const LANDLORD_JWT_SECRET = process.env.LANDLORD_JWT_SECRET || 'landlord-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

export interface LandlordJWTPayload {
  landlordId: number;
  email: string;
}

export interface AuthenticatedLandlordRequest extends Request {
  landlord?: LandlordJWTPayload;
}

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a plain text password against a hashed password
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a JWT token for a landlord
 */
export function generateLandlordToken(landlordId: number, email: string): string {
  const payload: LandlordJWTPayload = {
    landlordId,
    email,
  };
  
  return jwt.sign(payload, LANDLORD_JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a landlord JWT token
 */
export function verifyLandlordToken(token: string): LandlordJWTPayload | null {
  try {
    const decoded = jwt.verify(token, LANDLORD_JWT_SECRET) as LandlordJWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Middleware to require landlord authentication
 * Extracts JWT from cookie and verifies it
 */
export function requireLandlordAuth(
  req: AuthenticatedLandlordRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from cookie
    const token = req.cookies?.landlord_token;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify token
    const payload = verifyLandlordToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Attach landlord info to request
    req.landlord = payload;
    next();
  } catch (error) {
    console.error('Landlord auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Generate a cryptographically secure random password reset token
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
