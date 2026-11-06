import { getTwilioClient, getTwilioFromPhoneNumber } from "../twilio";
import type { CleanerWage } from "@shared/schema";
import { storage } from "../storage";
import crypto from "crypto";

export interface WageSMSResult {
  success: boolean;
  error?: string;
  messageSid?: string;
}

/**
 * Send wage notification SMS to a cleaner
 */
export async function sendWageSMS(
  cleaner: CleanerWage,
  month: number,
  year: number
): Promise<WageSMSResult> {
  if (!cleaner.cleanerPhone) {
    return {
      success: false,
      error: "No phone number provided",
    };
  }

  // Validate phone number
  const phoneNumber = cleaner.cleanerPhone.trim();
  if (!phoneNumber.startsWith("+") && !phoneNumber.startsWith("44")) {
    return {
      success: false,
      error: "Invalid phone number format. Must start with + or country code",
    };
  }

  // Format phone number (ensure it starts with +)
  const formattedPhone = phoneNumber.startsWith("+")
    ? phoneNumber
    : `+${phoneNumber}`;

  // Get month name
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[month - 1];

  // Generate crypto token (16 bytes, hex)
  const token = crypto.randomBytes(16).toString('hex');

  // Set expiry to 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  try {
    // Create wage token in database
    await storage.createWageToken({
      cleanerWageId: cleaner.id,
      token,
      expiresAt,
    });

    // Build URL with proper https:// protocol
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const protocol = domain.includes('localhost') ? 'http://' : 'https://';
    const wageUrl = `${protocol}${domain}/cleaner/wage/${token}`;

    // Format amounts for SMS summary
    const totalAmount = parseFloat(cleaner.totalEarnings.toString()).toFixed(2);

    // Build SMS message with link
    let message = `Hi ${cleaner.cleanerName}, your wages for ${monthName} ${year} are ready.\n\n`;
    message += `Total: £${totalAmount}\n\n`;
    message += `View your detailed pay breakdown here:\n${wageUrl}\n\n`;
    message += `This link is valid for 7 days. Payment will be processed shortly.`;

    console.log("[Wage SMS] Sending to", cleaner.cleanerName, "at", formattedPhone);
    console.log("[Wage SMS] Wage URL generated (token masked for security)");

    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();

    const result = await client.messages.create({
      body: message,
      to: formattedPhone,
      from: fromNumber,
    });

    console.log("[Wage SMS] Sent successfully. SID:", result.sid);

    return {
      success: true,
      messageSid: result.sid,
    };
  } catch (error: any) {
    console.error("[Wage SMS] Error sending:", error);
    return {
      success: false,
      error: error.message || "Failed to send SMS",
    };
  }
}

/**
 * Send wage notifications to multiple cleaners
 */
export async function sendBulkWageSMS(
  cleaners: CleanerWage[],
  month: number,
  year: number
): Promise<{ success: number; failed: number; errors: string[] }> {
  console.log("[Bulk Wage SMS] Sending to", cleaners.length, "cleaners");

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const cleaner of cleaners) {
    const result = await sendWageSMS(cleaner, month, year);

    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push(`${cleaner.cleanerName}: ${result.error}`);
    }

    // Add delay between messages to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("[Bulk Wage SMS] Complete -", results.success, "sent,", results.failed, "failed");
  return results;
}