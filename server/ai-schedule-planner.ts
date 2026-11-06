/**
 * AI Schedule Planner - Abstraction for AI-assisted schedule generation
 * Supports stub implementation and future OpenAI integration
 */

export interface ScheduleContext {
  weekStart: string;
  locationGroup?: { id: string; name: string };
  currentAssignments: Array<{
    date: string;
    propertyName: string;
    staffName: string;
    timeSlot: string;
  }>;
  staffAvailability: Array<{
    staffId: string;
    staffName: string;
    availableDates: string[];
  }>;
  unassignedProperties: Array<{
    propertyId: string;
    propertyName: string;
    date: string;
    estimatedDuration: number;
  }>;
  recentCompliance?: Array<{
    staffId: string;
    staffName: string;
    score: number;
  }>;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AIScheduleSuggestion {
  summary: string;
  assignments: Array<{
    staffId: string;
    propertyId: string;
    date: string;
    slotStart: string;
    slotEnd: string;
    source: "ai";
    reasoning?: string;
  }>;
}

export interface AISchedulePlanner {
  completeMessage(
    userMessage: string,
    conversationHistory: AIMessage[],
    context: ScheduleContext
  ): Promise<{ message: string; suggestion?: AIScheduleSuggestion }>;
}

/**
 * Stub implementation - returns templated responses
 * Can be swapped for OpenAI integration later
 */
export class StubSchedulePlanner implements AISchedulePlanner {
  async completeMessage(
    userMessage: string,
    conversationHistory: AIMessage[],
    context: ScheduleContext
  ): Promise<{ message: string; suggestion?: AIScheduleSuggestion }> {
    // Simple pattern matching for common requests
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes("schedule") || lowerMessage.includes("assign")) {
      return this.generateScheduleSuggestion(context);
    }
    
    if (lowerMessage.includes("availability") || lowerMessage.includes("who is available")) {
      return this.describeAvailability(context);
    }
    
    if (lowerMessage.includes("unassigned") || lowerMessage.includes("gaps")) {
      return this.describeGaps(context);
    }
    
    // Default response
    return {
      message: `I understand you asked: "${userMessage}". For week starting ${context.weekStart}, I can help you with:\n\n` +
        `• Create a schedule suggestion\n` +
        `• Check staff availability\n` +
        `• Identify unassigned properties\n\n` +
        `What would you like me to do?`
    };
  }
  
  private async generateScheduleSuggestion(context: ScheduleContext): Promise<{ message: string; suggestion: AIScheduleSuggestion }> {
    const assignments: AIScheduleSuggestion["assignments"] = [];
    
    // Simple algorithm: assign first available staff to each unassigned property
    for (const property of context.unassignedProperties.slice(0, 5)) {
      const availableStaff = context.staffAvailability.find(s => 
        s.availableDates.includes(property.date)
      );
      
      if (availableStaff) {
        assignments.push({
          staffId: availableStaff.staffId,
          propertyId: property.propertyId,
          date: property.date,
          slotStart: "10:00",
          slotEnd: "13:00",
          source: "ai",
          reasoning: `${availableStaff.staffName} is available on ${property.date}`
        });
      }
    }
    
    const summary = assignments.length > 0
      ? `Created schedule with ${assignments.length} assignments for week of ${context.weekStart}`
      : `No staff availability found for unassigned properties`;
    
    return {
      message: summary + "\n\nReview the draft below and let me know if you'd like any changes.",
      suggestion: { summary, assignments }
    };
  }
  
  private async describeAvailability(context: ScheduleContext): Promise<{ message: string }> {
    const summary = context.staffAvailability.map(s => 
      `• ${s.staffName}: ${s.availableDates.length} days available`
    ).join("\n");
    
    return {
      message: `Staff availability for week of ${context.weekStart}:\n\n${summary || "No availability data"}`
    };
  }
  
  private async describeGaps(context: ScheduleContext): Promise<{ message: string }> {
    const count = context.unassignedProperties.length;
    const message = count > 0
      ? `Found ${count} unassigned properties for week of ${context.weekStart}:\n\n` +
        context.unassignedProperties.slice(0, 5).map(p => 
          `• ${p.propertyName} on ${p.date}`
        ).join("\n") +
        (count > 5 ? `\n\n... and ${count - 5} more` : "")
      : `All properties are assigned for week of ${context.weekStart}! 🎉`;
    
    return { message };
  }
}

/**
 * Factory function to get AI planner instance
 * Can check env vars to return OpenAI provider when ready
 */
export function getAISchedulePlanner(): AISchedulePlanner {
  // TODO: Check for OPENAI_API_KEY and return OpenAI provider if present
  return new StubSchedulePlanner();
}
