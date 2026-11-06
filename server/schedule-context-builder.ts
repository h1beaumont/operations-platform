/**
 * Schedule Context Builder - Assembles contextual data for AI schedule planning
 */

import { db } from "./db";
import { staff, cleaningAssignments, cleaningJobs, properties, availabilityResponses, complianceEvents } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { ScheduleContext } from "./ai-schedule-planner";

/**
 * Build complete context for a given week
 */
export async function buildScheduleContext(
  weekStart: string,
  locationGroupId?: string
): Promise<ScheduleContext> {
  // Calculate week end (7 days from start)
  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEnd = weekEndDate.toISOString().split("T")[0];
  
  // Fetch current assignments for this week
  const existingAssignments = await db
    .select({
      date: cleaningAssignments.assignedDate,
      propertyName: properties.name,
      staffName: staff.fullName,
      slotStart: cleaningAssignments.assignedSlotStart,
      slotEnd: cleaningAssignments.assignedSlotEnd,
    })
    .from(cleaningAssignments)
    .innerJoin(cleaningJobs, eq(cleaningAssignments.cleaningJobId, cleaningJobs.id))
    .innerJoin(properties, eq(cleaningJobs.propertyId, properties.id))
    .innerJoin(staff, eq(cleaningAssignments.staffId, staff.id))
    .where(
      and(
        gte(cleaningAssignments.assignedDate, weekStart),
        lte(cleaningAssignments.assignedDate, weekEnd)
      )
    );
  
  // Fetch staff availability for this week
  const staffAvailabilityData = await db
    .select({
      staffId: staff.id,
      staffName: staff.fullName,
      availableDates: sql<string[]>`
        COALESCE(
          array_agg(DISTINCT ${availabilityResponses.date}::text) 
          FILTER (WHERE ${availabilityResponses.isAvailable} = true),
          ARRAY[]::text[]
        )
      `.as("available_dates"),
    })
    .from(staff)
    .leftJoin(
      availabilityResponses,
      and(
        eq(availabilityResponses.staffId, staff.id),
        gte(availabilityResponses.date, weekStart),
        lte(availabilityResponses.date, weekEnd)
      )
    )
    .where(eq(staff.role, "cleaner"))
    .groupBy(staff.id, staff.fullName);
  
  // Fetch unassigned properties/jobs for this week
  const allJobs = await db
    .select({
      jobId: cleaningJobs.id,
      propertyId: properties.id,
      propertyName: properties.name,
      date: cleaningJobs.scheduledDate,
      estimatedDuration: cleaningJobs.estimatedDuration,
    })
    .from(cleaningJobs)
    .innerJoin(properties, eq(cleaningJobs.propertyId, properties.id))
    .where(
      and(
        gte(cleaningJobs.scheduledDate, weekStart),
        lte(cleaningJobs.scheduledDate, weekEnd)
      )
    );
  
  const assignedJobIds = await db
    .select({ jobId: cleaningAssignments.cleaningJobId })
    .from(cleaningAssignments)
    .where(
      and(
        gte(cleaningAssignments.assignedDate, weekStart),
        lte(cleaningAssignments.assignedDate, weekEnd)
      )
    );
  
  const assignedJobIdSet = new Set(assignedJobIds.map(a => a.jobId));
  const unassignedProperties = allJobs
    .filter(job => !assignedJobIdSet.has(job.jobId))
    .map(job => ({
      propertyId: job.propertyId,
      propertyName: job.propertyName,
      date: job.date,
      estimatedDuration: job.estimatedDuration || 120,
    }));
  
  // Fetch recent compliance scores (last 2 weeks)
  const twoWeeksAgo = new Date(weekStartDate);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const complianceScores = await db
    .select({
      staffId: staff.id,
      staffName: staff.fullName,
      totalPoints: sql<number>`SUM(${complianceEvents.points})`.as("total_points"),
    })
    .from(staff)
    .leftJoin(
      complianceEvents,
      and(
        eq(complianceEvents.staffId, staff.id),
        gte(complianceEvents.date, twoWeeksAgo.toISOString().split("T")[0])
      )
    )
    .where(eq(staff.role, "cleaner"))
    .groupBy(staff.id, staff.fullName);
  
  return {
    weekStart,
    currentAssignments: existingAssignments.map(a => ({
      date: a.date,
      propertyName: a.propertyName,
      staffName: a.staffName,
      timeSlot: a.slotStart && a.slotEnd ? `${a.slotStart}-${a.slotEnd}` : "TBD",
    })),
    staffAvailability: staffAvailabilityData.map(s => ({
      staffId: s.staffId,
      staffName: s.staffName,
      availableDates: s.availableDates || [],
    })),
    unassignedProperties,
    recentCompliance: complianceScores.map(s => ({
      staffId: s.staffId,
      staffName: s.staffName,
      score: Number(s.totalPoints) || 0,
    })),
  };
}
