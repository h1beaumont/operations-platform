import DOMPurify from 'isomorphic-dompurify';

// Maximum message length
const MAX_MESSAGE_LENGTH = 5000;
const MAX_NAME_LENGTH = 100;

/**
 * Sanitize user input before sending to backend
 * Removes potentially dangerous HTML/JavaScript
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim and limit length
  let sanitized = input.trim().substring(0, MAX_MESSAGE_LENGTH);

  // Remove any HTML tags and dangerous content
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [], // No HTML tags allowed in user messages
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content, just remove tags
  });

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/\0/g, '');
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

/**
 * Sanitize user name input
 * More permissive than messages but still removes dangerous content
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Trim and limit length
  let sanitized = name.trim().substring(0, MAX_NAME_LENGTH);

  // Remove any HTML tags
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  // Allow common name characters but remove dangerous ones
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-\.']/g, '');

  return sanitized.trim();
}

/**
 * Sanitize AI response for safe rendering
 * Allows basic formatting but removes dangerous content
 */
export function sanitizeAIResponse(response: string): string {
  if (!response || typeof response !== 'string') {
    return '';
  }

  // Allow basic formatting tags that the AI might use
  const sanitized = DOMPurify.sanitize(response, {
    ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'br', 'p'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  return sanitized;
}

/**
 * Validate message before sending
 * Returns error message if invalid, null if valid
 */
export function validateMessage(message: string): string | null {
  if (!message || typeof message !== 'string') {
    return 'Please enter a message';
  }

  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return 'Message cannot be empty';
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`;
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /javascript:/i,
    /on\w+=/i, // Event handlers
    /<img.*?src.*?onerror/i,
    /alert\(/i,
    /prompt\(/i,
    /confirm\(/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      return 'Message contains invalid content';
    }
  }

  return null; // Valid message
}

/**
 * Detect if a message contains potential XSS attempts
 * Used for logging/monitoring purposes
 */
export function detectXSSPatterns(input: string): string[] {
  const patterns = [
    { name: 'script tag', pattern: /<script/i },
    { name: 'iframe', pattern: /<iframe/i },
    { name: 'javascript protocol', pattern: /javascript:/i },
    { name: 'event handler', pattern: /on\w+=/i },
    { name: 'eval', pattern: /eval\(/i },
    { name: 'document manipulation', pattern: /document\./i },
    { name: 'window manipulation', pattern: /window\./i },
    { name: 'alert/prompt/confirm', pattern: /(alert|prompt|confirm)\(/i },
  ];

  const detected: string[] = [];

  for (const { name, pattern } of patterns) {
    if (pattern.test(input)) {
      detected.push(name);
    }
  }

  return detected;
}

/**
 * Format message content with markdown-style formatting
 * Returns an object that can be used by React components to render formatted content
 */
export function formatMessageContent(content: string): { text: string; isBold: boolean }[] {
  // First sanitize the content
  const sanitized = sanitizeAIResponse(content);

  // Split by markdown bold pattern
  const parts = sanitized.split(/(\*\*.*?\*\*)/g);

  return parts.map(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold text
      return { text: part.slice(2, -2), isBold: true };
    }
    return { text: part, isBold: false };
  });
}

/**
 * Escape HTML for displaying as text
 * Used when we want to show code or HTML examples
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Re-export DOMPurify for direct use when needed
export { DOMPurify };