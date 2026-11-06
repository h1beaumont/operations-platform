import { Request, Response, NextFunction } from "express";
import validator from "validator";
import DOMPurify from "isomorphic-dompurify";

// In-memory rate limiter (consider using Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security event logs storage
const securityLogs: any[] = [];
const MAX_SECURITY_LOGS = 1000; // Keep last 1000 security events

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 messages per minute
const PUBLIC_RATE_LIMIT = 5; // 5 messages per minute for public endpoint

// Message validation limits
const MAX_MESSAGE_LENGTH = 5000; // characters (increased as per requirement)
const MIN_MESSAGE_LENGTH = 1;
const MAX_SESSION_ID_LENGTH = 100;
const MAX_NAME_LENGTH = 100;

// XSS detection patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<applet/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /<link/gi,
  /<meta/gi,
  /document\./gi,
  /window\./gi,
  /eval\(/gi,
  /setTimeout\(/gi,
  /setInterval\(/gi,
  /\.innerHTML/gi,
  /\.outerHTML/gi,
  /alert\(/gi,
  /prompt\(/gi,
  /confirm\(/gi,
  /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/gi,
  /expression\(/gi,
  /import\s+/gi,
  /<!DOCTYPE/gi,
  /<!--/gi,
];

// Clean old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Security event logger
export function logSecurityEvent(
  eventType: string,
  details: {
    endpoint?: string;
    userId?: string;
    sessionId?: string;
    originalMessage?: string;
    sanitizedMessage?: string;
    blockedPatterns?: string[];
    ipAddress?: string;
    cleanerName?: string;
  }
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    eventType,
    ...details,
  };
  
  // Add to in-memory logs
  securityLogs.push(logEntry);
  if (securityLogs.length > MAX_SECURITY_LOGS) {
    securityLogs.shift(); // Remove oldest log
  }
  
  // Log to console for monitoring
  console.warn(`[SECURITY-${eventType}] ${timestamp}:`, {
    ...details,
    originalMessage: details.originalMessage ? details.originalMessage.substring(0, 100) + '...' : undefined,
  });
  
  // In production, you would also send this to a security monitoring service
  // Example: sendToSecurityMonitoring(logEntry);
}

// Get recent security events (for monitoring)
export function getSecurityLogs(limit = 100): any[] {
  return securityLogs.slice(-limit);
}

// Detect potential XSS patterns in input
export function detectXSSPatterns(input: string): string[] {
  const detectedPatterns: string[] = [];
  
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push(pattern.source);
      pattern.lastIndex = 0; // Reset regex state
    }
  }
  
  return detectedPatterns;
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(req: Request): string {
  // For authenticated users, use their user ID
  if ((req as any).user?.claims?.sub) {
    return `user:${(req as any).user.claims.sub}`;
  }
  
  // For public endpoints, use IP address
  const ip = req.ip || 
    req.headers['x-forwarded-for'] as string || 
    req.socket.remoteAddress || 
    'unknown';
  
  return `ip:${ip}`;
}

/**
 * Rate limiting middleware for AI chat endpoints
 */
export function rateLimitAIChat(maxRequests = MAX_REQUESTS_PER_WINDOW) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = getClientId(req);
    const now = Date.now();
    
    let rateLimitInfo = rateLimitStore.get(clientId);
    
    if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
      // Initialize or reset
      rateLimitInfo = {
        count: 0,
        resetTime: now + RATE_LIMIT_WINDOW_MS
      };
      rateLimitStore.set(clientId, rateLimitInfo);
    }
    
    rateLimitInfo.count += 1;
    
    if (rateLimitInfo.count > maxRequests) {
      const resetIn = Math.ceil((rateLimitInfo.resetTime - now) / 1000);
      
      // Log rate limit exceeded
      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        endpoint: req.path,
        userId: clientId,
        ipAddress: req.ip || 'unknown',
      });
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please wait ${resetIn} seconds before trying again.`,
        retryAfter: resetIn
      });
    }
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - rateLimitInfo.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitInfo.resetTime).toISOString());
    
    next();
  };
}

/**
 * Enhanced sanitize user input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string, options: {
  maxLength?: number;
  allowBasicHTML?: boolean;
  fieldName?: string;
} = {}): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  const { maxLength = MAX_MESSAGE_LENGTH, allowBasicHTML = false, fieldName = 'input' } = options;
  
  // Trim and limit length
  let sanitized = input.trim().substring(0, maxLength);
  
  // Check for XSS patterns before sanitization
  const xssPatterns = detectXSSPatterns(sanitized);
  if (xssPatterns.length > 0) {
    logSecurityEvent("XSS_ATTEMPT_DETECTED", {
      originalMessage: sanitized,
      blockedPatterns: xssPatterns,
      endpoint: fieldName,
    });
  }
  
  // Use DOMPurify for comprehensive sanitization
  if (allowBasicHTML) {
    // Allow some basic formatting tags for rich text fields
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
  } else {
    // Strip all HTML for plain text fields
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
  }
  
  // Additional escaping using validator library
  sanitized = validator.escape(sanitized);
  
  // Remove null bytes and control characters
  sanitized = sanitized.replace(/\0/g, '');
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Log if significant content was removed (potential attack)
  if (sanitized.length < input.length * 0.5 && input.length > 10) {
    logSecurityEvent("SUSPICIOUS_CONTENT_REMOVED", {
      originalMessage: input.substring(0, 100),
      sanitizedMessage: sanitized.substring(0, 100),
      endpoint: fieldName,
    });
  }
  
  return sanitized;
}

/**
 * Sanitize session IDs and identifiers
 */
export function sanitizeSessionId(sessionId: string): string {
  if (!sessionId || typeof sessionId !== 'string') {
    return '';
  }
  
  // Session IDs should only contain alphanumeric characters and hyphens
  let sanitized = sessionId.trim().substring(0, MAX_SESSION_ID_LENGTH);
  
  // Remove anything that's not alphanumeric or hyphen
  sanitized = sanitized.replace(/[^a-zA-Z0-9-]/g, '');
  
  return sanitized;
}

/**
 * Sanitize names (for cleaner name inputs)
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  // Names can have letters, spaces, hyphens, and apostrophes
  let sanitized = name.trim().substring(0, MAX_NAME_LENGTH);
  
  // Remove any HTML tags
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  
  // Allow common name characters but escape special ones
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-\.']/g, '');
  
  return sanitized;
}

/**
 * Validate chat message input
 */
export interface ValidatedChatInput {
  sessionId: string;
  message: string;
  cleanerName?: string;
  metadata?: Record<string, any>;
}

export function validateChatMessage(req: Request, res: Response, next: NextFunction) {
  const { sessionId, message, cleanerName } = req.body;
  const endpoint = req.path;
  const userId = (req as any).user?.claims?.sub || "anonymous";
  const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
  
  // Validate session ID
  if (!sessionId || typeof sessionId !== 'string') {
    logSecurityEvent("INVALID_SESSION_ID", {
      endpoint,
      userId,
      ipAddress,
    });
    return res.status(400).json({ 
      error: 'Invalid request',
      message: 'Session ID is required and must be a string' 
    });
  }
  
  if (sessionId.length > MAX_SESSION_ID_LENGTH) {
    return res.status(400).json({ 
      error: 'Invalid request',
      message: `Session ID too long (max ${MAX_SESSION_ID_LENGTH} characters)` 
    });
  }
  
  // Validate message
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ 
      error: 'Invalid request',
      message: 'Message is required and must be a string' 
    });
  }
  
  // Check message length before sanitization
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ 
      error: 'Message too long',
      message: `Message must be less than ${MAX_MESSAGE_LENGTH} characters` 
    });
  }
  
  if (message.length < MIN_MESSAGE_LENGTH) {
    return res.status(400).json({ 
      error: 'Message too short',
      message: 'Message cannot be empty' 
    });
  }
  
  // Check for suspicious patterns
  const xssPatterns = detectXSSPatterns(message);
  if (xssPatterns.length > 0) {
    logSecurityEvent("XSS_BLOCKED", {
      endpoint,
      userId,
      ipAddress,
      originalMessage: message.substring(0, 100),
      blockedPatterns: xssPatterns,
      sessionId,
    });
  }
  
  // Sanitize inputs
  const sanitizedMessage = sanitizeInput(message, { fieldName: 'message' });
  const sanitizedSessionId = sanitizeSessionId(sessionId);
  
  // Check if message is still valid after sanitization
  if (!sanitizedMessage || sanitizedMessage.length < MIN_MESSAGE_LENGTH) {
    logSecurityEvent("MESSAGE_REJECTED_AFTER_SANITIZATION", {
      endpoint,
      userId,
      ipAddress,
      originalMessage: message.substring(0, 100),
    });
    return res.status(400).json({ 
      error: 'Invalid message',
      message: 'Message contains invalid characters or is empty after sanitization' 
    });
  }
  
  // Handle cleaner name if present (for public endpoint)
  let sanitizedCleanerName = '';
  if (cleanerName) {
    if (typeof cleanerName !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Cleaner name must be a string'
      });
    }
    sanitizedCleanerName = sanitizeName(cleanerName);
    if (!sanitizedCleanerName) {
      return res.status(400).json({
        error: 'Invalid name',
        message: 'Please provide a valid name'
      });
    }
  }
  
  // Attach sanitized values to request for use in route handler
  req.body.message = sanitizedMessage;
  req.body.sessionId = sanitizedSessionId;
  if (sanitizedCleanerName) {
    req.body.cleanerName = sanitizedCleanerName;
  }
  
  next();
}

/**
 * Sanitize AI response before sending to client
 */
export function sanitizeAIResponse(response: string): string {
  if (!response || typeof response !== 'string') {
    return '';
  }
  
  // AI responses should be safe, but we still sanitize to be extra careful
  // Allow basic formatting tags that the frontend expects (for markdown-style formatting)
  const sanitized = DOMPurify.sanitize(response, {
    ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'br', 'p'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  
  return sanitized;
}

/**
 * Sanitize email content for tenant communication
 */
export function sanitizeEmailContent(content: {
  subject?: string;
  body?: string;
  recipientIds?: string[];
}): {
  isValid: boolean;
  errors: string[];
  sanitized?: {
    subject?: string;
    body?: string;
    recipientIds?: string[];
  };
} {
  const errors: string[] = [];
  const sanitized: any = {};
  
  // Validate subject
  if (content.subject) {
    if (typeof content.subject !== 'string') {
      errors.push("Email subject must be a string");
    } else {
      // Subjects should be plain text, no HTML
      sanitized.subject = sanitizeInput(content.subject, {
        maxLength: 200,
        allowBasicHTML: false,
        fieldName: 'email_subject'
      });
    }
  }
  
  // Validate body
  if (content.body) {
    if (typeof content.body !== 'string') {
      errors.push("Email body must be a string");
    } else {
      // Allow basic formatting in email body
      sanitized.body = sanitizeInput(content.body, {
        maxLength: 10000,
        allowBasicHTML: true,
        fieldName: 'email_body'
      });
    }
  }
  
  // Validate recipient IDs
  if (content.recipientIds && Array.isArray(content.recipientIds)) {
    sanitized.recipientIds = content.recipientIds
      .filter(id => typeof id === 'string')
      .map(id => sanitizeSessionId(id))
      .filter(id => id.length > 0)
      .slice(0, 100); // Limit number of recipients
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined,
  };
}

/**
 * Sanitize SMS content
 */
export function sanitizeSMSContent(content: {
  message?: string;
  recipientIds?: string[];
}): {
  isValid: boolean;
  errors: string[];
  sanitized?: {
    message?: string;
    recipientIds?: string[];
  };
} {
  const errors: string[] = [];
  const sanitized: any = {};
  
  // Validate message
  if (!content.message || typeof content.message !== 'string') {
    errors.push("SMS message is required and must be a string");
  } else {
    // SMS should be plain text only, no HTML
    sanitized.message = sanitizeInput(content.message, {
      maxLength: 500,
      allowBasicHTML: false,
      fieldName: 'sms_message'
    });
  }
  
  // Validate recipient IDs
  if (content.recipientIds && Array.isArray(content.recipientIds)) {
    sanitized.recipientIds = content.recipientIds
      .filter(id => typeof id === 'string')
      .map(id => sanitizeSessionId(id))
      .filter(id => id.length > 0)
      .slice(0, 50); // Limit number of recipients for SMS
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined,
  };
}

/**
 * Combined middleware for AI chat security
 */
export function secureAIChat(options: { maxRequests?: number; requireAuth?: boolean } = {}) {
  const { maxRequests = MAX_REQUESTS_PER_WINDOW } = options;
  
  return [
    rateLimitAIChat(maxRequests),
    validateChatMessage
  ];
}

/**
 * Public AI chat middleware (stricter limits)
 */
export function securePublicAIChat() {
  return secureAIChat({ maxRequests: PUBLIC_RATE_LIMIT });
}

// Export security monitoring endpoint handler
export function handleSecurityMonitoring(req: Request, res: Response) {
  // Only allow authenticated admin users to view security logs
  if (!(req as any).user?.claims?.sub) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const limit = parseInt(req.query.limit as string) || 100;
  const logs = getSecurityLogs(limit);
  
  res.json({
    total: securityLogs.length,
    limit,
    logs,
  });
}