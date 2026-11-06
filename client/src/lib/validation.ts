import { z } from "zod";
import validator from "validator";

/**
 * International Phone Number Validation using validator library
 * Accepts various international formats:
 * - +XXX XXXXXXXXX (international format with country code)
 * - 0XXXXXXXXXX (local UK format)
 * - +44 7XXX XXXXXX (UK mobile)
 * - +234 XXX XXX XXXX (Nigerian format)
 * Must have at least 7 digits (after removing spaces/hyphens)
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return true; // Allow empty for optional fields
  
  // Remove all spaces, hyphens, parentheses, dots, and leading apostrophes for validation
  let cleaned = phone.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith("'")) {
    cleaned = cleaned.substring(1);
  }
  
  // Use validator library for robust phone number validation
  if (cleaned.startsWith('+')) {
    // For international format, use validator
    const isValid = validator.isMobilePhone(cleaned, 'any', { strictMode: false });
    // Additional check: prevent invalid country codes like +0 or +00
    return isValid && !cleaned.match(/^\+0+/);
  }
  
  // Accept local UK format starting with 0 followed by 9-10 digits
  const localPattern = /^0\d{9,10}$/;
  return localPattern.test(cleaned);
}

/**
 * UK Phone Number Validation (+44 format)
 * Specifically validates UK phone numbers in international format
 */
export function validateUKPhoneNumber(phone: string): boolean {
  if (!phone) return true; // Allow empty for optional fields
  
  const cleaned = phone.replace(/[\s\-().]/g, '');
  
  // Must start with +44 or 0
  if (cleaned.startsWith('+44')) {
    return validator.isMobilePhone(cleaned, 'en-GB');
  } else if (cleaned.startsWith('0')) {
    // Convert to +44 format and validate
    const international = '+44' + cleaned.substring(1);
    return validator.isMobilePhone(international, 'en-GB');
  }
  
  return false;
}

/**
 * Zod schema for international phone number validation
 * Use with .refine() for optional fields or .min(1) for required fields
 */
export const phoneNumberSchema = z
  .string()
  .refine((val) => !val || validatePhoneNumber(val), {
    message: "Please enter a valid phone number (e.g., +234 XXX XXXX or +44 7XXX XXXXXX)",
  });

/**
 * Zod schema for currency amounts with optional max limit
 * @param max - Maximum allowed amount (optional)
 * @returns Zod schema for currency validation
 */
export function currencyAmountSchema(max?: number) {
  const baseSchema = z
    .string()
    .or(z.number())
    .refine(
      (val) => {
        // Allow empty string for optional fields
        if (val === '' || val === null || val === undefined) return true;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return !isNaN(num) && num >= 0;
      },
      {
        message: "Amount must be a positive number",
      }
    );

  if (max !== undefined) {
    return baseSchema.refine(
      (val) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return num <= max;
      },
      {
        message: `Amount cannot exceed £${max.toLocaleString()}`,
      }
    );
  }

  return baseSchema;
}

/**
 * Email validation using RFC 5322 standard
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  
  // RFC 5322 compliant regex for email validation
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailPattern.test(email.trim());
}

/**
 * Zod schema for email validation
 */
export const emailSchema = z
  .string()
  .email({ message: "Please enter a valid email address" })
  .refine((val) => validateEmail(val), {
    message: "Email format is invalid",
  });

/**
 * Date validation - ensures date is in YYYY-MM-DD format and is valid
 */
export function validateDateString(dateStr: string): boolean {
  if (!dateStr) return false;
  
  // Check format YYYY-MM-DD
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateStr)) return false;
  
  // Check if it's a valid date
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Zod schema for date validation (YYYY-MM-DD format)
 */
export const dateStringSchema = z
  .string()
  .refine((val) => validateDateString(val), {
    message: "Date must be in YYYY-MM-DD format and be a valid date",
  });

/**
 * Helper function to format currency for display
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(num);
}

/**
 * Hourly Rate Validation (£10 - £50)
 * Used for wage reports and staff hourly rates
 */
export const hourlyRateSchema = z
  .string()
  .or(z.number())
  .refine(
    (val) => {
      if (val === '' || val === null || val === undefined) return false;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return !isNaN(num) && num >= 10 && num <= 50;
    },
    {
      message: "Hourly rate must be between £10 and £50",
    }
  );

/**
 * Expense Amount Validation (£0.01 - £10,000)
 */
export const expenseAmountSchema = z
  .string()
  .or(z.number())
  .refine(
    (val) => {
      if (val === '' || val === null || val === undefined) return false;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return !isNaN(num) && num >= 0.01 && num <= 10000;
    },
    {
      message: "Expense amount must be between £0.01 and £10,000",
    }
  );

/**
 * Rent Amount Validation (£100 - £50,000 per month)
 */
export const rentAmountSchema = z
  .string()
  .or(z.number())
  .refine(
    (val) => {
      if (val === '' || val === null || val === undefined) return false;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return !isNaN(num) && num >= 100 && num <= 50000;
    },
    {
      message: "Rent amount must be between £100 and £50,000 per month",
    }
  );

/**
 * Deposit Amount Validation
 * Validates that deposit is reasonable (typically 5 weeks rent, max 8 weeks)
 * @param rentAmount - Monthly rent amount
 */
export function validateDepositAmount(depositAmount: number, rentAmount: number): {
  isValid: boolean;
  message?: string;
  warning?: string;
} {
  if (depositAmount < 0) {
    return { isValid: false, message: "Deposit cannot be negative" };
  }

  // Calculate 5 weeks rent (standard deposit)
  const weeklyRent = rentAmount / 4.33; // Average weeks per month
  const standardDeposit = weeklyRent * 5;
  const maxDeposit = weeklyRent * 8; // Legal maximum for most tenancies

  if (depositAmount > maxDeposit) {
    return {
      isValid: false,
      message: `Deposit cannot exceed 8 weeks rent (£${maxDeposit.toFixed(2)})`,
    };
  }

  if (depositAmount < standardDeposit * 0.8) {
    return {
      isValid: true,
      warning: `Deposit is below standard amount (typically 5 weeks rent: £${standardDeposit.toFixed(2)})`,
    };
  }

  if (depositAmount > standardDeposit * 1.5) {
    return {
      isValid: true,
      warning: `Deposit is higher than typical (5 weeks rent: £${standardDeposit.toFixed(2)})`,
    };
  }

  return { isValid: true };
}

/**
 * Date Range Validation - ensures end date is after start date
 */
export function validateDateRange(startDate: string, endDate: string): {
  isValid: boolean;
  message?: string;
} {
  if (!startDate || !endDate) {
    return { isValid: false, message: "Both start and end dates are required" };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, message: "Invalid date format" };
  }

  if (end <= start) {
    return { isValid: false, message: "End date must be after start date" };
  }

  return { isValid: true };
}

/**
 * Future Date Validation - ensures date is in the future
 */
export function validateFutureDate(dateStr: string): {
  isValid: boolean;
  message?: string;
} {
  if (!dateStr) {
    return { isValid: false, message: "Date is required" };
  }

  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset to start of day

  if (isNaN(date.getTime())) {
    return { isValid: false, message: "Invalid date format" };
  }

  if (date < now) {
    return { isValid: false, message: "Date must be in the future" };
  }

  return { isValid: true };
}

/**
 * Past Date Validation - ensures date is not in the past
 */
export function validateNotPastDate(dateStr: string): {
  isValid: boolean;
  message?: string;
} {
  if (!dateStr) {
    return { isValid: false, message: "Date is required" };
  }

  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset to start of day

  if (isNaN(date.getTime())) {
    return { isValid: false, message: "Invalid date format" };
  }

  if (date < now) {
    return { isValid: false, message: "Date cannot be in the past" };
  }

  return { isValid: true };
}

/**
 * Zod schema for date range validation
 */
export const dateRangeSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
}).refine(
  (data) => {
    const result = validateDateRange(data.startDate, data.endDate);
    return result.isValid;
  },
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

/**
 * Flag suspiciously high values for review
 */
export function flagHighValue(amount: number, category: string): {
  shouldFlag: boolean;
  warning?: string;
} {
  const thresholds: Record<string, number> = {
    'Maintenance Costs': 5000,
    'Contractor Fees': 10000,
    'Cleaning Costs': 2000,
    'Linen Costs': 1000,
    'Software Costs': 500,
    'Utilities': 3000,
    'Insurance': 5000,
    'Other Expenses': 5000,
    'Rental Income': 100000,
    'Management Fees': 20000,
    'Other Income': 10000,
  };

  const threshold = thresholds[category] || 5000;

  if (amount > threshold) {
    return {
      shouldFlag: true,
      warning: `This amount (£${amount.toFixed(2)}) is unusually high for ${category}. Please verify.`,
    };
  }

  return { shouldFlag: false };
}
