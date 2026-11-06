import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

// Helper to get user identifier from authenticated request
function getUserIdentifier(req: any): string {
  // For authenticated routes, use user ID
  if (req.user?.claims?.sub) {
    return `user:${req.user.claims.sub}`;
  }
  // For public routes, use IP address
  return `ip:${req.ip}`;
}

// Custom key generator that tracks by user ID for authenticated routes
// and by IP for public routes
const createKeyGenerator = (prefix: string) => {
  return (req: any): string => {
    const identifier = getUserIdentifier(req);
    return `${prefix}:${identifier}`;
  };
};

// Custom handler for rate limit violations with logging
const rateLimitHandler = (req: Request, res: Response) => {
  const identifier = getUserIdentifier(req as any);
  const endpoint = req.path;
  const method = req.method;
  
  // Log rate limit violation
  console.error(`[RATE LIMIT VIOLATION] ${new Date().toISOString()} - Endpoint: ${method} ${endpoint} - Identifier: ${identifier} - IP: ${req.ip}`);
  
  res.status(429).json({
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit for this endpoint. Please wait before trying again.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

// Configuration for different endpoint categories

// Helpdesk endpoints - 50 requests per 15 minutes
export const helpdeskRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit to 50 requests
  message: 'Too many helpdesk requests. Please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: createKeyGenerator('helpdesk'),
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Public chat endpoints - 20 requests per 15 minutes (stricter)
export const publicChatRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit to 20 requests
  message: 'Too many public chat requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator('public-chat'),
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Cleaning staff assistant - 50 requests per 15 minutes
export const cleaningStaffRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit to 50 requests
  message: 'Too many cleaning assistant requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator('cleaning-staff'),
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Management endpoints - 100 requests per 15 minutes (more lenient)
export const managementRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit to 100 requests
  message: 'Too many management requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator('management'),
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Guest support chat - 50 requests per 15 minutes
export const guestSupportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit to 50 requests
  message: 'Too many guest support requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator('guest-support'),
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Tenant communication - 50 requests per 15 minutes
export const tenantCommunicationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit to 50 requests
  message: 'Too many tenant communication requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator('tenant-comm'),
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// General AI endpoints fallback - 30 requests per 15 minutes
export const generalAIRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit to 30 requests
  message: 'Too many AI requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator('general-ai'),
  handler: rateLimitHandler,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Utility function to log rate limit info
export function logRateLimitInfo(endpoint: string, identifier: string, remaining: number, limit: number) {
  if (remaining <= 5) {
    console.warn(`[RATE LIMIT WARNING] ${endpoint} - ${identifier} - Requests remaining: ${remaining}/${limit}`);
  }
}

// Export all rate limiters as a collection for easy access
export const rateLimiters = {
  helpdesk: helpdeskRateLimiter,
  publicChat: publicChatRateLimiter,
  cleaningStaff: cleaningStaffRateLimiter,
  management: managementRateLimiter,
  guestSupport: guestSupportRateLimiter,
  tenantCommunication: tenantCommunicationRateLimiter,
  generalAI: generalAIRateLimiter,
};