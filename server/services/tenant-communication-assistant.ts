import OpenAI from "openai";
import type { IStorage } from "../storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Define the tools available to the AI
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "searchProperties",
      description: "Search for property details including addresses, access codes, WiFi details, and other information. Works for both operational properties and AST properties.",
      parameters: {
        type: "object",
        properties: {
          searchTerm: {
            type: "string",
            description: "Property name, address, or partial match to search for",
          },
        },
        required: ["searchTerm"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getStaffInfo",
      description: "Look up staff member information including contact details, roles, and schedules.",
      parameters: {
        type: "object",
        properties: {
          searchTerm: {
            type: "string",
            description: "Staff name or email to search for",
          },
        },
        required: ["searchTerm"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMaintenanceRequests",
      description: "Get maintenance request information filtered by property, status, or service type.",
      parameters: {
        type: "object",
        properties: {
          propertyName: {
            type: "string",
            description: "Optional property name to filter by",
          },
          status: {
            type: "string",
            description: "Optional status to filter by (pending, in_progress, completed)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTenantsByProperty",
      description: "Get a list of tenants filtered by property name or building. Returns tenant IDs, names, emails, and their current tenancy details.",
      parameters: {
        type: "object",
        properties: {
          propertyIdentifier: {
            type: "string",
            description: "The property name, building name, or address to filter tenants by",
          },
        },
        required: ["propertyIdentifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTenantsByRoom",
      description: "Get tenants filtered by specific room or apartment within a property. Returns tenant IDs, names, emails, and their current tenancy details.",
      parameters: {
        type: "object",
        properties: {
          propertyIdentifier: {
            type: "string",
            description: "The property name or building name",
          },
          roomIdentifier: {
            type: "string",
            description: "The room number, apartment number, or unit identifier",
          },
        },
        required: ["propertyIdentifier", "roomIdentifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draftEmail",
      description: "Draft a professional email to tenants based on the user's request. This should be called after identifying the relevant tenants.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "The email subject line",
          },
          body: {
            type: "string",
            description: "The email body content, professionally formatted with appropriate greeting and closing",
          },
          recipientIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of tenant IDs who will receive this email",
          },
          propertyFilter: {
            type: "string",
            description: "The property identifier used to filter tenants (for reference)",
          },
          roomFilter: {
            type: "string",
            description: "The room identifier used to filter tenants (optional, for reference)",
          },
        },
        required: ["subject", "body", "recipientIds"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draftSms",
      description: "Draft an SMS message to send to tenants via Twilio SMS. SMS is ideal for urgent, short notifications. Keep messages concise (under 160 characters recommended).",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "SMS message text. Keep it concise - max 160 characters recommended for a single SMS.",
          },
          recipientIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of tenant IDs who will receive this SMS",
          },
          propertyFilter: {
            type: "string",
            description: "The property identifier used to filter tenants (for reference)",
          },
          roomFilter: {
            type: "string",
            description: "The room identifier used to filter tenants (optional, for reference)",
          },
        },
        required: ["message", "recipientIds"],
      },
    },
  },
];

// Tool implementation functions
async function searchProperties(searchTerm: string, storage: IStorage): Promise<string> {
  try {
    // Search operational properties
    const operationalProps = await storage.getProperties();
    const matchingOperational = operationalProps.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.address && p.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Search AST properties
    const astProps = await storage.getAstProperties();
    const matchingAst = astProps.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.address && p.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const results: any[] = [];

    // Format operational properties
    for (const prop of matchingOperational) {
      results.push({
        type: "Operational Property",
        name: prop.name,
        address: prop.address,
        propertyType: prop.propertyType,
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        notes: prop.notes,
      });
    }

    // Format AST properties
    for (const prop of matchingAst) {
      results.push({
        type: "AST Property (Long-term Rental)",
        name: prop.name,
        address: prop.address,
        propertyType: prop.propertyType,
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        landlordId: prop.landlordId,
      });
    }

    if (results.length === 0) {
      return JSON.stringify({
        success: false,
        message: `I couldn't find any properties matching "${searchTerm}". Please try a different search term.`,
        properties: [],
      });
    }

    return JSON.stringify({
      success: true,
      message: `Found ${results.length} propert${results.length === 1 ? 'y' : 'ies'} matching "${searchTerm}"`,
      properties: results,
    });
  } catch (error) {
    console.error("[TenantComm] Error searching properties:", error);
    return JSON.stringify({
      success: false,
      message: "I encountered an error while searching for properties. Please try again.",
      properties: [],
    });
  }
}

async function getStaffInfo(searchTerm: string, storage: IStorage): Promise<string> {
  try {
    const allStaff = await storage.getAllStaff();
    
    const matchingStaff = allStaff.filter(
      (s) =>
        (s.fullName && s.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (matchingStaff.length === 0) {
      return JSON.stringify({
        success: false,
        message: `I couldn't find any staff members matching "${searchTerm}".`,
        staff: [],
      });
    }

    const results = matchingStaff.map(s => ({
      name: s.fullName,
      email: s.email,
      phone: s.phone,
      roleType: s.roleType,
      status: s.status,
      hireDate: s.hireDate,
    }));

    return JSON.stringify({
      success: true,
      message: `Found ${results.length} staff member${results.length === 1 ? '' : 's'} matching "${searchTerm}"`,
      staff: results,
    });
  } catch (error) {
    console.error("[TenantComm] Error searching staff:", error);
    return JSON.stringify({
      success: false,
      message: "I encountered an error while searching for staff. Please try again.",
      staff: [],
    });
  }
}

async function getMaintenanceRequests(propertyName: string | undefined, status: string | undefined, storage: IStorage): Promise<string> {
  try {
    const requests = await storage.getMaintenanceRequests();
    
    let filtered = requests;
    
    // Filter by property if specified
    if (propertyName) {
      const properties = await storage.getProperties();
      const matchingProps = properties.filter(p => 
        p.name && p.name.toLowerCase().includes(propertyName.toLowerCase())
      );
      const propIds = matchingProps.map(p => p.id);
      filtered = filtered.filter(r => r.propertyId && propIds.includes(r.propertyId));
    }
    
    // Filter by status if specified
    if (status) {
      filtered = filtered.filter(r => r.status === status);
    }

    if (filtered.length === 0) {
      const message = propertyName && status
        ? `No ${status} maintenance requests found for properties matching "${propertyName}"`
        : propertyName
        ? `No maintenance requests found for properties matching "${propertyName}"`
        : status
        ? `No ${status} maintenance requests found`
        : "No maintenance requests found";
      
      return JSON.stringify({
        success: true,
        message,
        requests: [],
      });
    }

    // Get property names for display
    const properties = await storage.getProperties();
    const propertyMap = new Map(properties.map(p => [p.id, p.name]));

    const results = filtered.slice(0, 20).map(r => ({
      id: r.id,
      title: r.title,
      property: propertyMap.get(r.propertyId || '') || 'Unknown Property',
      status: r.status,
      priority: r.priority,
      serviceType: r.serviceType,
      reportedBy: r.reportedBy,
      createdAt: r.createdAt,
    }));

    return JSON.stringify({
      success: true,
      message: `Found ${filtered.length} maintenance request${filtered.length === 1 ? '' : 's'}${filtered.length > 20 ? ' (showing first 20)' : ''}`,
      requests: results,
      totalCount: filtered.length,
    });
  } catch (error) {
    console.error("[TenantComm] Error fetching maintenance requests:", error);
    return JSON.stringify({
      success: false,
      message: "I encountered an error while fetching maintenance requests. Please try again.",
      requests: [],
    });
  }
}

async function getTenantsByProperty(propertyIdentifier: string, storage: IStorage): Promise<string> {
  try {
    // Get all active tenancies
    const tenancies = await storage.getAstTenancies();
    const activetenancies = tenancies.filter(t => t.status === "active");
    
    // Get all AST properties
    const astProperties = await storage.getAstProperties();
    
    // Find matching properties (buildings or standalone properties)
    const matchingProperties = astProperties.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(propertyIdentifier.toLowerCase())) ||
        (p.address && p.address.toLowerCase().includes(propertyIdentifier.toLowerCase()))
    );

    if (matchingProperties.length === 0) {
      return JSON.stringify({
        success: false,
        summary: `I couldn't find any AST properties matching "${propertyIdentifier}". Could you provide more details?`,
        tenants: [],
        tenantIds: [],
      });
    }

    // Collect all tenants from matching properties
    const tenantResults: Array<{
      id: string;
      name: string;
      email: string;
      property: string;
      room?: string;
    }> = [];

    for (const property of matchingProperties) {
      // Filter tenancies for this property
      const propertyTenancies = activetenancies.filter(
        t => t.astPropertyId === property.id
      );

      for (const tenancy of propertyTenancies) {
        tenantResults.push({
          id: tenancy.id,
          name: tenancy.tenantName,
          email: tenancy.tenantEmail || '',
          property: property.name,
          room: tenancy.roomNumber || undefined,
        });
      }
    }

    if (tenantResults.length === 0) {
      return JSON.stringify({
        success: true,
        summary: `I found properties matching "${propertyIdentifier}" but no active tenants are currently registered.`,
        tenants: [],
        tenantIds: [],
      });
    }

    // Extract tenant IDs
    const tenantIds = tenantResults.map(t => t.id);

    // Return structured JSON
    return JSON.stringify({
      success: true,
      summary: `Found ${tenantResults.length} active tenant(s) in ${propertyIdentifier}`,
      tenants: tenantResults,
      tenantIds: tenantIds,
    });
  } catch (error) {
    console.error("[TenantComm] Error getting tenants by property:", error);
    return JSON.stringify({
      success: false,
      summary: "I encountered an error while looking up tenants. Please try again.",
      tenants: [],
      tenantIds: [],
    });
  }
}

async function getTenantsByRoom(
  propertyIdentifier: string,
  roomIdentifier: string,
  storage: IStorage
): Promise<string> {
  try {
    // Get all active tenancies
    const tenancies = await storage.getAstTenancies();
    const activeTenancies = tenancies.filter(t => t.status === "active");
    
    // Get all AST properties
    const astProperties = await storage.getAstProperties();
    
    // Find matching property
    const property = astProperties.find(
      (p) =>
        (p.name && p.name.toLowerCase().includes(propertyIdentifier.toLowerCase())) ||
        (p.address && p.address.toLowerCase().includes(propertyIdentifier.toLowerCase()))
    );

    if (!property) {
      return JSON.stringify({
        success: false,
        summary: `I couldn't find an AST property matching "${propertyIdentifier}".`,
        tenants: [],
        tenantIds: [],
      });
    }

    // Filter tenancies for this property and room
    const roomTenancies = activeTenancies.filter(
      t => t.astPropertyId === property.id && 
           t.roomNumber?.toLowerCase().includes(roomIdentifier.toLowerCase())
    );

    if (roomTenancies.length === 0) {
      return JSON.stringify({
        success: true,
        summary: `I found the property "${property.name}" but no active tenants in room/apartment "${roomIdentifier}".`,
        tenants: [],
        tenantIds: [],
      });
    }

    // Collect tenant results
    const tenantResults = roomTenancies.map(t => ({
      id: t.id,
      name: t.tenantName,
      email: t.tenantEmail || '',
      property: property.name,
      room: t.roomNumber || undefined,
    }));

    // Extract tenant IDs
    const tenantIds = tenantResults.map(t => t.id);

    // Return structured JSON
    return JSON.stringify({
      success: true,
      summary: `Found ${roomTenancies.length} active tenant(s) in ${property.name}, ${roomIdentifier}`,
      tenants: tenantResults,
      tenantIds: tenantIds,
    });
  } catch (error) {
    console.error("[TenantComm] Error getting tenants by room:", error);
    return JSON.stringify({
      success: false,
      summary: "I encountered an error while looking up tenants. Please try again.",
      tenants: [],
      tenantIds: [],
    });
  }
}

async function draftEmail(
  subject: string,
  body: string,
  recipientIds: string[],
  propertyFilter?: string,
  roomFilter?: string,
  storage?: IStorage
): Promise<string> {
  try {
    // Return a JSON representation of the draft email
    // The frontend will parse this and display it for approval
    const draft = {
      subject,
      body,
      recipientIds,
      propertyFilter,
      roomFilter,
    };
    
    return `DRAFT_EMAIL:${JSON.stringify(draft)}`;
  } catch (error) {
    console.error("[TenantComm] Error drafting email:", error);
    return `I encountered an error while drafting the email. Please try again.`;
  }
}

async function draftSms(
  message: string,
  recipientIds: string[],
  propertyFilter?: string,
  roomFilter?: string,
  storage?: IStorage
): Promise<string> {
  try {
    // Return a JSON representation of the draft SMS
    // The frontend will parse this and display it for approval
    const draft = {
      message,
      recipientIds,
      propertyFilter,
      roomFilter,
    };
    
    return `DRAFT_SMS:${JSON.stringify(draft)}`;
  } catch (error) {
    console.error("[TenantComm] Error drafting SMS:", error);
    return `I encountered an error while drafting the SMS. Please try again.`;
  }
}

// Main function to process tenant communication messages
export async function processTenantCommunicationMessage(
  sessionId: string,
  userMessage: string,
  storage: IStorage
): Promise<string> {
  try {
    // Get chat history
    const history = await storage.getTenantCommunicationChatHistory(sessionId);

    // Convert history to OpenAI messages format
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are a helpful assistant for Northstay property management portal with comprehensive access to all portal data.

Your capabilities include:
1. **Answer Questions**: Look up property addresses, staff information, maintenance requests, and other portal data
2. **Draft Communications**: Create professional emails and SMS messages for tenants
3. **Search & Retrieve**: Find information about properties, staff, maintenance, and tenancies
4. **Support Staff**: Help staff access information quickly without navigating the portal

AVAILABLE TOOLS:
- searchProperties: Find property details (addresses, access codes, WiFi details, etc.)
- getStaffInfo: Look up staff member contact information and details
- getMaintenanceRequests: View maintenance requests by property or status
- getTenantsByProperty: Find tenants in a specific property or building
- getTenantsByRoom: Find tenants in a specific room/apartment
- draftEmail: Create professional emails to tenants (via Gmail SMTP)
- draftSms: Create concise SMS messages (via Twilio)

WHEN TO USE EACH TOOL:
- User asks "What's the address of...?" → Use searchProperties
- User asks "Who is...?" or "Contact info for..." → Use getStaffInfo (for staff) or getTenantsByProperty (for tenants)
- User asks about maintenance → Use getMaintenanceRequests
- User wants to contact tenants → Use getTenants... then draftEmail or draftSms

COMMUNICATION CHANNELS:
- EMAIL: Use for detailed information, formal notices, or lengthy messages (via Gmail SMTP)
- SMS: Use for urgent, time-sensitive notifications via Twilio. Keep messages concise (under 160 characters)
- CALLING: For urgent voice communication, use JustCall (phone numbers are available in the system)

CRITICAL: PARSING JSON RESPONSES FROM TOOLS
When you call getTenantsByProperty or getTenantsByRoom, they return JSON strings in this format:
{
  "success": true,
  "summary": "Found 3 active tenant(s) in Building A",
  "tenants": [
    {"id": "abc123", "name": "John Doe", "email": "john@example.com", "property": "Building A", "room": "Apt 1"},
    {"id": "def456", "name": "Jane Smith", "email": "jane@example.com", "property": "Building A", "room": "Apt 2"}
  ],
  "tenantIds": ["abc123", "def456"]
}

YOU MUST:
1. Parse the JSON response to extract the data
2. Use the "summary" field to explain to the user what you found
3. List the tenants by name, email, property, and room
4. Extract the "tenantIds" array and use it directly in draftEmail or draftSms function's recipientIds parameter

WORKFLOW EXAMPLES:
- User: "Draft email to Building A about maintenance"
  → Call getTenantsByProperty("Building A")
  → Parse the JSON response to get tenantIds
  → Show the user the summary and tenant list
  → Call draftEmail with the tenantIds array in recipientIds parameter

- User: "Send SMS to Room 3 tenants about water shutdown"
  → Call getTenantsByRoom with property and room
  → Parse the JSON response to get tenantIds
  → Call draftSms with concise message (under 160 chars) and tenantIds array

- User: "Who are tenants in Room 3 of Building A?"
  → Call getTenantsByRoom("Building A", "Room 3")
  → Parse the JSON response
  → Show the user the summary and tenant details

IMPORTANT GUIDELINES:
- ALWAYS parse the JSON response from getTenantsByProperty and getTenantsByRoom
- ALWAYS use the tenantIds array when calling draftEmail or draftSms after finding tenants
- Show users the tenant details in a friendly format (names, emails, properties, rooms)
- For SMS: Keep messages under 160 characters to avoid multi-part messages
- Choose the appropriate communication channel based on urgency and message length
- Be helpful and action-oriented. When in doubt, draft the communication rather than asking more questions.`,
      },
    ];

    // Add chat history
    for (const msg of history) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add the new user message
    messages.push({
      role: "user",
      content: userMessage,
    });

    // Save user message to database
    await storage.saveTenantCommunicationChatMessage({
      sessionId,
      role: "user",
      content: userMessage,
    });

    // Call OpenAI with function calling
    let response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
    });

    let assistantMessage = response.choices[0].message;

    // Track draft email and SMS created during tool calls
    let trackedDraftEmail: any = undefined;
    let trackedDraftSms: any = undefined;

    // Handle tool calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Add assistant message with tool calls to history
      messages.push(assistantMessage);

      // Process each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        let result: string;

        if (functionName === "searchProperties") {
          result = await searchProperties(functionArgs.searchTerm, storage);
        } else if (functionName === "getStaffInfo") {
          result = await getStaffInfo(functionArgs.searchTerm, storage);
        } else if (functionName === "getMaintenanceRequests") {
          result = await getMaintenanceRequests(functionArgs.propertyName, functionArgs.status, storage);
        } else if (functionName === "getTenantsByProperty") {
          result = await getTenantsByProperty(functionArgs.propertyIdentifier, storage);
        } else if (functionName === "getTenantsByRoom") {
          result = await getTenantsByRoom(
            functionArgs.propertyIdentifier,
            functionArgs.roomIdentifier,
            storage
          );
        } else if (functionName === "draftEmail") {
          result = await draftEmail(
            functionArgs.subject,
            functionArgs.body,
            functionArgs.recipientIds,
            functionArgs.propertyFilter,
            functionArgs.roomFilter,
            storage
          );
          
          // Extract and track the draft email from the result
          if (result.startsWith("DRAFT_EMAIL:")) {
            try {
              trackedDraftEmail = JSON.parse(result.replace("DRAFT_EMAIL:", ""));
              console.log("[TenantComm] Draft email tracked:", trackedDraftEmail);
            } catch (error) {
              console.error("[TenantComm] Error parsing draft email:", error);
            }
          }
        } else if (functionName === "draftSms") {
          result = await draftSms(
            functionArgs.message,
            functionArgs.recipientIds,
            functionArgs.propertyFilter,
            functionArgs.roomFilter,
            storage
          );
          
          // Extract and track the draft SMS from the result
          if (result.startsWith("DRAFT_SMS:")) {
            try {
              trackedDraftSms = JSON.parse(result.replace("DRAFT_SMS:", ""));
              console.log("[TenantComm] Draft SMS tracked:", trackedDraftSms);
            } catch (error) {
              console.error("[TenantComm] Error parsing draft SMS:", error);
            }
          }
        } else {
          result = `Unknown function: ${functionName}`;
        }

        // Add tool response to messages
        messages.push({
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
        });
      }

      // Get next response from AI
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools,
        tool_choice: "auto",
      });

      assistantMessage = response.choices[0].message;
    }

    // Get final response content
    const finalResponse = assistantMessage.content || "I'm here to help you communicate with tenants. What would you like to do?";

    // Save assistant message to database with tracked draft email and SMS
    await storage.saveTenantCommunicationChatMessage({
      sessionId,
      role: "assistant",
      content: finalResponse,
      draftEmail: trackedDraftEmail,
      draftSms: trackedDraftSms,
    });

    return finalResponse;
  } catch (error) {
    console.error("[TenantComm] Error processing message:", error);
    
    // Save error response
    const errorMessage = "I apologize, but I encountered an error. Please try again or rephrase your request.";
    await storage.saveTenantCommunicationChatMessage({
      sessionId,
      role: "assistant",
      content: errorMessage,
    });
    
    return errorMessage;
  }
}
