/**
 * Manual Onboarding Service - SMS-based data collection for new hires
 */

import crypto from 'crypto';
import { db } from "./db";
import { manualOnboardingRequests, staff } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { sendManualOnboardingDataRequestSMS } from "./twilio";

/**
 * Hash a token for secure storage
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Send manual onboarding request via SMS
 */
export async function sendOnboardingRequest(
  staffId: string,
  requestedFields: string[]
): Promise<{ requestId: string; token: string }> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  
  // Get staff details for SMS
  const staffMember = await db.query.staff.findFirst({
    where: eq(staff.id, staffId),
  });
  
  if (!staffMember) {
    throw new Error("Staff member not found");
  }
  
  if (!staffMember.phoneNumber) {
    throw new Error("Staff member has no phone number");
  }
  
  // Create onboarding request
  const [request] = await db
    .insert(manualOnboardingRequests)
    .values({
      staffId,
      tokenHash,
      requestedFields,
      status: "pending",
    })
    .returning();
  
  // Send SMS with token link
  const formLink = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://your-app.replit.app'}/onboarding/${token}`;
  
  await sendManualOnboardingDataRequestSMS(
    staffMember.phoneNumber,
    staffMember.name,
    formLink,
    requestedFields
  );
  
  return {
    requestId: request.id,
    token, // For testing/logging only
  };
}

/**
 * Verify onboarding token and return request details
 */
export async function verifyOnboardingToken(token: string) {
  const tokenHash = hashToken(token);
  
  const request = await db.query.manualOnboardingRequests.findFirst({
    where: eq(manualOnboardingRequests.tokenHash, tokenHash),
  });
  
  if (!request) {
    return { valid: false, request: null };
  }
  
  // Check if already completed
  if (request.status === "completed") {
    return { valid: false, request: null, message: "This form has already been completed" };
  }
  
  // Check if expired (24 hours)
  const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
  const isExpired = Date.now() - new Date(request.createdAt).getTime() > expiryTime;
  
  if (isExpired) {
    // Mark as expired
    await db
      .update(manualOnboardingRequests)
      .set({ status: "expired" })
      .where(eq(manualOnboardingRequests.id, request.id));
    
    return { valid: false, request: null, message: "This form has expired" };
  }
  
  return { valid: true, request };
}

/**
 * Submit onboarding data and update staff record
 */
export async function submitOnboardingData(
  token: string,
  data: Record<string, any>
) {
  const verification = await verifyOnboardingToken(token);
  
  if (!verification.valid || !verification.request) {
    throw new Error(verification.message || "Invalid or expired token");
  }
  
  const request = verification.request;
  
  // Update onboarding request with submitted data
  await db
    .update(manualOnboardingRequests)
    .set({
      submittedData: data,
      status: "completed",
    })
    .where(eq(manualOnboardingRequests.id, request.id));
  
  // Update staff record with submitted data
  const staffUpdates: any = {};
  
  // Map submitted data to staff fields
  if (data.phoneNumber) staffUpdates.phoneNumber = data.phoneNumber;
  if (data.email) staffUpdates.email = data.email;
  if (data.address) staffUpdates.address = data.address;
  if (data.emergencyContact) staffUpdates.emergencyContact = data.emergencyContact;
  if (data.emergencyPhone) staffUpdates.emergencyPhone = data.emergencyPhone;
  if (data.dateOfBirth) staffUpdates.dateOfBirth = data.dateOfBirth;
  if (data.nationalInsurance) staffUpdates.nationalInsurance = data.nationalInsurance;
  if (data.bankAccount) staffUpdates.bankAccount = data.bankAccount;
  if (data.sortCode) staffUpdates.sortCode = data.sortCode;
  
  if (Object.keys(staffUpdates).length > 0) {
    await db
      .update(staff)
      .set(staffUpdates)
      .where(eq(staff.id, request.staffId));
  }
  
  return { success: true, staffId: request.staffId };
}

/**
 * Get all onboarding requests for a staff member
 */
export async function getStaffOnboardingRequests(staffId: string) {
  return await db.query.manualOnboardingRequests.findMany({
    where: eq(manualOnboardingRequests.staffId, staffId),
  });
}
