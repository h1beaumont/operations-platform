import OpenAI from "openai";
import type { IStorage } from "../storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Define the tools available to the AI for guest support
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getPropertyDetails",
      description: "Get detailed information about a property including address, amenities, WiFi, access codes, and check-in instructions",
      parameters: {
        type: "object",
        properties: {
          propertyName: {
            type: "string",
            description: "The name, nickname, or address of the property",
          },
        },
        required: ["propertyName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMaintenanceInfo",
      description: "Get information about maintenance requests, their status, and resolution timelines",
      parameters: {
        type: "object",
        properties: {
          propertyName: {
            type: "string",
            description: "Optional property name to filter maintenance requests",
          },
          status: {
            type: "string",
            description: "Optional status filter: pending, in_progress, completed",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchProperties",
      description: "Search for properties by name, address, or nickname",
      parameters: {
        type: "object",
        properties: {
          searchTerm: {
            type: "string",
            description: "Search term to find properties",
          },
        },
        required: ["searchTerm"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getStaffContact",
      description: "Get contact information for staff members to help guests with specific issues",
      parameters: {
        type: "object",
        properties: {
          role: {
            type: "string",
            description: "Optional role filter (e.g., cleaner, maintenance, manager)",
          },
        },
      },
    },
  },
];

// Tool implementation functions
async function getPropertyDetails(propertyName: string, storage: IStorage): Promise<string> {
  try {
    const properties = await storage.getProperties();
    const property = properties.find(
      (p) =>
        p.propertyName?.toLowerCase().includes(propertyName.toLowerCase()) ||
        p.nickname?.toLowerCase().includes(propertyName.toLowerCase()) ||
        p.address?.toLowerCase().includes(propertyName.toLowerCase())
    );

    if (!property) {
      return `I couldn't find a property matching "${propertyName}". Please provide more details or check the spelling.`;
    }

    let details = `**${property.nickname || property.propertyName}**\n\n`;
    details += `**Address:** ${property.address || "Not available"}\n`;
    details += `**Bedrooms:** ${property.bedrooms || "Not specified"}\n`;
    details += `**Bathrooms:** ${property.bathrooms || "Not specified"}\n\n`;
    
    if (property.amenities && property.amenities.length > 0) {
      details += `**Amenities:**\n${property.amenities.map(a => `• ${a}`).join('\n')}\n\n`;
    }
    
    if (property.wifiName || property.wifiPassword) {
      details += `**WiFi:**\n`;
      details += property.wifiName ? `Network: ${property.wifiName}\n` : '';
      details += property.wifiPassword ? `Password: ${property.wifiPassword}\n\n` : '\n';
    }
    
    if (property.accessInstructions) {
      details += `**Check-in Instructions:**\n${property.accessInstructions}\n\n`;
    }
    
    if (property.parkingInstructions) {
      details += `**Parking:**\n${property.parkingInstructions}\n`;
    }

    return details;
  } catch (error) {
    console.error("[GuestSupport] Error getting property details:", error);
    return `I encountered an error while looking up property details. Please try again.`;
  }
}

async function getMaintenanceInfo(
  propertyName: string | undefined,
  status: string | undefined,
  storage: IStorage
): Promise<string> {
  try {
    let requests = await storage.getAllMaintenanceRequests();
    
    if (propertyName) {
      requests = requests.filter(r => 
        r.property?.toLowerCase().includes(propertyName.toLowerCase())
      );
    }
    
    if (status) {
      requests = requests.filter(r => r.status === status);
    }

    if (requests.length === 0) {
      return propertyName 
        ? `No maintenance requests found for "${propertyName}".`
        : "No maintenance requests found matching your criteria.";
    }

    let result = `**Maintenance Requests** (${requests.length} found):\n\n`;
    
    requests.slice(0, 10).forEach((req, idx) => {
      result += `${idx + 1}. **${req.property}** - ${req.serviceCategory}\n`;
      result += `   Status: ${req.status || "pending"}\n`;
      result += `   Issue: ${req.description?.substring(0, 100)}${req.description && req.description.length > 100 ? '...' : ''}\n`;
      if (req.assignedTo) {
        result += `   Assigned to: ${req.assignedTo}\n`;
      }
      result += `\n`;
    });

    if (requests.length > 10) {
      result += `\n_Showing first 10 of ${requests.length} requests_`;
    }

    return result;
  } catch (error) {
    console.error("[GuestSupport] Error getting maintenance info:", error);
    return `I encountered an error while fetching maintenance information. Please try again.`;
  }
}

async function searchProperties(searchTerm: string, storage: IStorage): Promise<string> {
  try {
    const properties = await storage.getProperties();
    const matches = properties.filter(
      (p) =>
        p.propertyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (matches.length === 0) {
      return `No properties found matching "${searchTerm}".`;
    }

    if (matches.length === 1) {
      return `I found: **${matches[0].nickname || matches[0].propertyName}** (${matches[0].address})`;
    }

    let result = `I found ${matches.length} properties matching "${searchTerm}":\n\n`;
    matches.slice(0, 10).forEach((p, idx) => {
      result += `${idx + 1}. **${p.nickname || p.propertyName}** - ${p.address}\n`;
    });

    if (matches.length > 10) {
      result += `\n_Showing first 10 of ${matches.length} properties_`;
    }

    return result;
  } catch (error) {
    console.error("[GuestSupport] Error searching properties:", error);
    return `I encountered an error while searching properties. Please try again.`;
  }
}

async function getStaffContact(role: string | undefined, storage: IStorage): Promise<string> {
  try {
    let staff = await storage.getAllStaff();
    
    if (role) {
      staff = staff.filter(s => 
        s.roleType?.toLowerCase().includes(role.toLowerCase())
      );
    }

    if (staff.length === 0) {
      return role 
        ? `No staff members found with role "${role}".`
        : "No staff contact information available.";
    }

    let result = role 
      ? `**${role.charAt(0).toUpperCase() + role.slice(1)} Staff:**\n\n`
      : "**Staff Contacts:**\n\n";
    
    staff.slice(0, 5).forEach((s, idx) => {
      result += `${idx + 1}. **${s.fullName}**\n`;
      if (s.email) result += `   Email: ${s.email}\n`;
      if (s.phone) result += `   Phone: ${s.phone}\n`;
      if (s.roleType) result += `   Role: ${s.roleType}\n`;
      result += `\n`;
    });

    if (staff.length > 5) {
      result += `\n_Showing first 5 of ${staff.length} staff members_`;
    }

    return result;
  } catch (error) {
    console.error("[GuestSupport] Error getting staff contact:", error);
    return `I encountered an error while fetching staff contacts. Please try again.`;
  }
}

// Main function to process guest support messages
export async function processGuestSupportMessage(
  sessionId: string,
  userMessage: string,
  storage: IStorage
): Promise<string> {
  try {
    // Get chat history
    const history = await storage.getGuestSupportChatMessages(sessionId);

    // Convert history to OpenAI messages format
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are a helpful guest support assistant for Northstay. Your role is to help guests with:

- Property information (WiFi, access codes, check-in instructions, amenities)
- Maintenance requests and their status
- Finding property details and locations
- General inquiries about their stay

You have access to live portal data through function calls. Always use these tools to provide accurate, up-to-date information.

Be professional, friendly, and empathetic. Focus on resolving guest concerns quickly and efficiently. If a guest has a complaint or serious issue, acknowledge it and provide helpful information while suggesting they contact management directly for urgent matters.`,
      },
      ...history.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user",
        content: userMessage,
      },
    ];

    // First API call with tools
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      temperature: 0.7,
      max_tokens: 1200,
    });

    const responseMessage = response.choices[0].message;

    // Handle tool calls if present
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      // Add assistant's response to messages
      messages.push(responseMessage);

      // Execute all tool calls
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        let functionResult = "";

        switch (functionName) {
          case "getPropertyDetails":
            functionResult = await getPropertyDetails(functionArgs.propertyName, storage);
            break;
          case "getMaintenanceInfo":
            functionResult = await getMaintenanceInfo(
              functionArgs.propertyName,
              functionArgs.status,
              storage
            );
            break;
          case "searchProperties":
            functionResult = await searchProperties(functionArgs.searchTerm, storage);
            break;
          case "getStaffContact":
            functionResult = await getStaffContact(functionArgs.role, storage);
            break;
          default:
            functionResult = `Function ${functionName} not found`;
        }

        // Add function result to messages
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: functionResult,
        });
      }

      // Get final response from AI with function results
      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1200,
      });

      return finalResponse.choices[0].message.content || "I couldn't generate a response.";
    }

    // No tool calls, return direct response
    return responseMessage.content || "I couldn't generate a response.";
  } catch (error) {
    console.error("[GuestSupport] Error processing message:", error);
    throw error;
  }
}
