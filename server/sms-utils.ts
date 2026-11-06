import { db } from "./db";
import { staff } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Check if staff member has opted in to SMS notifications
 */
export async function checkStaffOptIn(staffId: string): Promise<boolean> {
  const staffMember = await db.query.staff.findFirst({
    where: eq(staff.id, staffId),
    columns: { contactOptIn: true }
  });
  
  return staffMember?.contactOptIn !== false; // Default to true if not set
}

/**
 * Validate that assignments list is not empty
 */
export function validateAssignments<T>(assignments: T[]): boolean {
  return assignments && assignments.length > 0;
}
