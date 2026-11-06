/**
 * Conversation Service - Orchestrates AI chatbot conversations for scheduling
 */

import { db } from "./db";
import { scheduleConversations, scheduleDrafts, cleaningAssignments, cleaningJobs } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAISchedulePlanner, AIMessage } from "./ai-schedule-planner";
import { buildScheduleContext } from "./schedule-context-builder";

/**
 * Create a new conversation for a given week
 */
export async function createConversation(
  userId: string,
  weekStart: string
): Promise<typeof scheduleConversations.$inferSelect> {
  const [conversation] = await db
    .insert(scheduleConversations)
    .values({
      userId,
      weekStart,
      messages: [],
      status: "active",
    })
    .returning();
  
  return conversation;
}

/**
 * Get conversation by ID with messages
 */
export async function getConversation(conversationId: string) {
  const conversation = await db.query.scheduleConversations.findFirst({
    where: eq(scheduleConversations.id, conversationId),
  });
  
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  
  // Get associated drafts
  const drafts = await db.query.scheduleDrafts.findMany({
    where: eq(scheduleDrafts.conversationId, conversationId),
    orderBy: desc(scheduleDrafts.createdAt),
  });
  
  return {
    ...conversation,
    drafts,
  };
}

/**
 * Send a message to the conversation and get AI response
 */
export async function sendMessage(
  conversationId: string,
  userMessage: string
) {
  // Get conversation
  const conversation = await db.query.scheduleConversations.findFirst({
    where: eq(scheduleConversations.id, conversationId),
  });
  
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  
  // Build context for the week
  const context = await buildScheduleContext(conversation.weekStart);
  
  // Add user message to history
  const userMsg: AIMessage = {
    role: "user",
    content: userMessage,
    timestamp: new Date().toISOString(),
  };
  
  const updatedMessages = [...conversation.messages, userMsg];
  
  // Get AI response
  const aiPlanner = getAISchedulePlanner();
  const aiResponse = await aiPlanner.completeMessage(
    userMessage,
    conversation.messages as AIMessage[],
    context
  );
  
  // Add assistant message
  const assistantMsg: AIMessage = {
    role: "assistant",
    content: aiResponse.message,
    timestamp: new Date().toISOString(),
  };
  
  const finalMessages = [...updatedMessages, assistantMsg];
  
  // Update conversation
  const [updatedConversation] = await db
    .update(scheduleConversations)
    .set({
      messages: finalMessages as any,
      updatedAt: new Date(),
    })
    .where(eq(scheduleConversations.id, conversationId))
    .returning();
  
  // If AI suggested a schedule, create a draft
  let newDraft = null;
  if (aiResponse.suggestion) {
    newDraft = await createDraft(
      conversationId,
      conversation.weekStart,
      aiResponse.suggestion.summary,
      aiResponse.suggestion.assignments
    );
    
    // Update conversation with current draft
    await db
      .update(scheduleConversations)
      .set({ currentDraftId: newDraft.id })
      .where(eq(scheduleConversations.id, conversationId));
  }
  
  return {
    conversation: updatedConversation,
    newDraft,
  };
}

/**
 * Create a new schedule draft
 */
export async function createDraft(
  conversationId: string,
  weekStart: string,
  summary: string,
  assignments: Array<{
    staffId: string;
    propertyId: string;
    date: string;
    slotStart: string;
    slotEnd: string;
    source: "ai" | "manual";
  }>
) {
  // Get existing drafts to determine version number
  const existingDrafts = await db.query.scheduleDrafts.findMany({
    where: eq(scheduleDrafts.conversationId, conversationId),
  });
  
  const draftNumber = existingDrafts.length + 1;
  
  const [draft] = await db
    .insert(scheduleDrafts)
    .values({
      conversationId,
      weekStart,
      draftNumber,
      summary,
      assignments: assignments as any,
      status: "draft",
    })
    .returning();
  
  return draft;
}

/**
 * Update an existing draft
 */
export async function updateDraft(
  draftId: string,
  updates: {
    summary?: string;
    assignments?: Array<{
      staffId: string;
      propertyId: string;
      date: string;
      slotStart: string;
      slotEnd: string;
      source: "ai" | "manual";
    }>;
    status?: "draft" | "reviewed" | "finalized" | "rejected";
  }
) {
  const [draft] = await db
    .update(scheduleDrafts)
    .set(updates as any)
    .where(eq(scheduleDrafts.id, draftId))
    .returning();
  
  return draft;
}

/**
 * Finalize a draft - convert to actual cleaning assignments
 */
export async function finalizeDraft(draftId: string) {
  const draft = await db.query.scheduleDrafts.findFirst({
    where: eq(scheduleDrafts.id, draftId),
  });
  
  if (!draft) {
    throw new Error("Draft not found");
  }
  
  if (draft.status === "finalized") {
    throw new Error("Draft already finalized");
  }
  
  if (!draft.assignments || draft.assignments.length === 0) {
    throw new Error("Cannot finalize empty draft");
  }
  
  // For each assignment in the draft, create a cleaning assignment
  const createdAssignments = [];
  const skippedAssignments = [];
  
  for (const assignment of draft.assignments) {
    // Find the cleaning job for this property/date
    const job = await db.query.cleaningJobs.findFirst({
      where: (jobs, { and, eq }) => and(
        eq(jobs.propertyId, assignment.propertyId),
        eq(jobs.scheduledDate, assignment.date)
      ),
    });
    
    if (!job) {
      console.warn(`No cleaning job found for property ${assignment.propertyId} on ${assignment.date}`);
      skippedAssignments.push({ reason: "no_job", assignment });
      continue;
    }
    
    // Check if assignment already exists for this job (idempotency)
    const existingAssignment = await db.query.cleaningAssignments.findFirst({
      where: (assignments, { eq }) => eq(assignments.cleaningJobId, job.id),
    });
    
    if (existingAssignment) {
      console.log(`Assignment already exists for job ${job.id}, skipping duplicate`);
      skippedAssignments.push({ reason: "already_exists", assignment });
      continue;
    }
    
    // Create the cleaning assignment
    const [createdAssignment] = await db
      .insert(cleaningAssignments)
      .values({
        cleaningJobId: job.id,
        staffId: assignment.staffId,
        assignedDate: assignment.date,
        assignedSlotStart: assignment.slotStart,
        assignedSlotEnd: assignment.slotEnd,
        assignmentMethod: assignment.source === "ai" ? "auto" : "manual",
        status: "draft",
        calendarEntry: {},
      })
      .returning();
    
    createdAssignments.push(createdAssignment);
  }
  
  // Mark draft as finalized
  await db
    .update(scheduleDrafts)
    .set({
      status: "finalized",
      finalizedAt: new Date(),
    })
    .where(eq(scheduleDrafts.id, draftId));
  
  // Mark conversation as finalized
  if (draft.conversationId) {
    await db
      .update(scheduleConversations)
      .set({ status: "finalized" })
      .where(eq(scheduleConversations.id, draft.conversationId));
  }
  
  return {
    draftId,
    assignmentsCreated: createdAssignments.length,
    assignments: createdAssignments,
    skipped: skippedAssignments.length,
  };
}
