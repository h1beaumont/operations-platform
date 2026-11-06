/**
 * Calendar Token Service - Manages secure token-based access to staff calendars
 */

import crypto from 'crypto';
import { db } from "./db";
import { staffScheduleTokens, cleaningAssignments, cleaningJobs, properties } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token for secure storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a new calendar access token for a staff member
 */
export async function generateCalendarToken(
  staffId: string,
  expiresInDays?: number
): Promise<{ token: string; tokenHash: string; id: string }> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;
  
  const [tokenRecord] = await db
    .insert(staffScheduleTokens)
    .values({
      staffId,
      tokenHash,
      expiresAt,
      accessCount: 0,
    })
    .returning();
  
  return {
    token, // Plain token to send to staff (only returned once!)
    tokenHash,
    id: tokenRecord.id,
  };
}

/**
 * Verify a token and return the associated staff ID
 */
export async function verifyCalendarToken(token: string): Promise<{ staffId: string; valid: boolean }> {
  const tokenHash = hashToken(token);
  
  const tokenRecord = await db.query.staffScheduleTokens.findFirst({
    where: eq(staffScheduleTokens.tokenHash, tokenHash),
  });
  
  if (!tokenRecord) {
    return { staffId: '', valid: false };
  }
  
  // Check if token is expired
  if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
    return { staffId: '', valid: false };
  }
  
  // Update access stats
  await db
    .update(staffScheduleTokens)
    .set({
      lastAccessedAt: new Date(),
      accessCount: tokenRecord.accessCount + 1,
    })
    .where(eq(staffScheduleTokens.id, tokenRecord.id));
  
  return { staffId: tokenRecord.staffId, valid: true };
}

/**
 * Get staff calendar assignments for a given week
 */
export async function getStaffCalendar(
  staffId: string,
  weekStart: string
) {
  // Validate weekStart format (YYYY-MM-DD)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(weekStart)) {
    throw new Error("Invalid weekStart format. Expected YYYY-MM-DD");
  }
  
  // Calculate week end (7 days from start)
  const weekStartDate = new Date(weekStart);
  
  // Check if date is valid
  if (isNaN(weekStartDate.getTime())) {
    throw new Error("Invalid date value for weekStart");
  }
  
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEnd = weekEndDate.toISOString().split("T")[0];
  
  const assignments = await db
    .select({
      id: cleaningAssignments.id,
      date: cleaningAssignments.assignedDate,
      slotStart: cleaningAssignments.assignedSlotStart,
      slotEnd: cleaningAssignments.assignedSlotEnd,
      status: cleaningAssignments.status,
      propertyName: properties.name,
      propertyAddress: properties.address,
      estimatedDuration: cleaningJobs.estimatedDuration,
      notes: cleaningAssignments.notes,
      calendarEntry: cleaningAssignments.calendarEntry,
    })
    .from(cleaningAssignments)
    .innerJoin(cleaningJobs, eq(cleaningAssignments.cleaningJobId, cleaningJobs.id))
    .innerJoin(properties, eq(cleaningJobs.propertyId, properties.id))
    .where(
      and(
        eq(cleaningAssignments.staffId, staffId),
        gte(cleaningAssignments.assignedDate, weekStart),
        lte(cleaningAssignments.assignedDate, weekEnd)
      )
    )
    .orderBy(cleaningAssignments.assignedDate);
  
  return assignments;
}

/**
 * Revoke a calendar token
 */
export async function revokeCalendarToken(tokenId: string): Promise<boolean> {
  const result = await db
    .delete(staffScheduleTokens)
    .where(eq(staffScheduleTokens.id, tokenId))
    .returning();
  
  return result.length > 0;
}
