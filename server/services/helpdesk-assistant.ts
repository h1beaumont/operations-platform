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
      name: "lookupPropertyOwner",
      description: "Find the landlord/owner email and contact information for an AST (Assured Shorthold Tenancy) property by property name or address",
      parameters: {
        type: "object",
        properties: {
          propertyName: {
            type: "string",
            description: "The name or address of the property to look up",
          },
        },
        required: ["propertyName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookupPropertyDetails",
      description: "Get detailed information about a property including address, amenities, access codes, and status",
      parameters: {
        type: "object",
        properties: {
          propertyName: {
            type: "string",
            description: "The name or nickname of the property to look up",
          },
        },
        required: ["propertyName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookupStaffByName",
      description: "Find staff member contact information by their full name or first name",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The full name or first name of the staff member",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookupContractor",
      description: "Find contractors by their trade or specialty (e.g., plumber, electrician, carpenter)",
      parameters: {
        type: "object",
        properties: {
          trade: {
            type: "string",
            description: "The trade or specialty of the contractor (e.g., plumbing, electrical, carpentry)",
          },
        },
        required: ["trade"],
      },
    },
  },
];

// Tool implementation functions
async function lookupPropertyOwner(propertyName: string, storage: IStorage): Promise<string> {
  try {
    // Search in AST properties
    const astProperties = await storage.getAllASTProperties();
    const property = astProperties.find(
      (p) =>
        p.propertyName.toLowerCase().includes(propertyName.toLowerCase()) ||
        p.address.toLowerCase().includes(propertyName.toLowerCase())
    );

    if (!property) {
      return `I couldn't find an AST property matching "${propertyName}". Could you provide more details or check the spelling?`;
    }

    // Get landlord information
    if (property.landlordId) {
      const landlord = await storage.getLandlord(property.landlordId);
      if (landlord) {
        return `The owner of ${property.propertyName} is **${landlord.name}** (${landlord.email}${landlord.phone ? `, ${landlord.phone}` : ""})`;
      }
    }

    return `I found the property "${property.propertyName}" but no landlord information is available in the system.`;
  } catch (error) {
    console.error("[Helpdesk] Error looking up property owner:", error);
    return `I encountered an error while looking up the property owner. Please try again.`;
  }
}

async function lookupPropertyDetails(propertyName: string, storage: IStorage): Promise<string> {
  try {
    // Search in regular properties (serviced accommodation)
    const properties = await storage.getProperties();
    const property = properties.find(
      (p) =>
        p.propertyName?.toLowerCase().includes(propertyName.toLowerCase()) ||
        p.nickname?.toLowerCase().includes(propertyName.toLowerCase()) ||
        p.address?.toLowerCase().includes(propertyName.toLowerCase())
    );

    if (!property) {
      return `I couldn't find a property matching "${propertyName}". Could you provide more details or try a different name?`;
    }

    let details = `**${property.nickname || property.propertyName}**\n`;
    details += `Address: ${property.address || "Not available"}\n`;
    details += `Bedrooms: ${property.bedrooms || "Not specified"}\n`;
    details += `Bathrooms: ${property.bathrooms || "Not specified"}\n`;
    details += `Status: ${property.status || "Not specified"}\n`;
    
    if (property.amenities && property.amenities.length > 0) {
      details += `Amenities: ${property.amenities.join(", ")}\n`;
    }

    return details;
  } catch (error) {
    console.error("[Helpdesk] Error looking up property details:", error);
    return `I encountered an error while looking up property details. Please try again.`;
  }
}

async function lookupStaffByName(name: string, storage: IStorage): Promise<string> {
  try {
    const allStaff = await storage.getAllStaff();
    const matchingStaff = allStaff.filter(
      (s) =>
        s.fullName.toLowerCase().includes(name.toLowerCase()) ||
        s.firstName?.toLowerCase().includes(name.toLowerCase()) ||
        s.lastName?.toLowerCase().includes(name.toLowerCase())
    );

    if (matchingStaff.length === 0) {
      return `I couldn't find any staff member matching "${name}". Could you check the spelling or try a different name?`;
    }

    if (matchingStaff.length === 1) {
      const staff = matchingStaff[0];
      return `**${staff.fullName}**\nEmail: ${staff.email || "Not available"}\nPhone: ${staff.phone || "Not available"}\nRole: ${staff.roleType || "Not specified"}`;
    }

    // Multiple matches
    let result = `I found ${matchingStaff.length} staff members matching "${name}":\n\n`;
    matchingStaff.forEach((staff, index) => {
      result += `${index + 1}. **${staff.fullName}** - ${staff.email || "No email"} - ${staff.phone || "No phone"}\n`;
    });
    return result;
  } catch (error) {
    console.error("[Helpdesk] Error looking up staff:", error);
    return `I encountered an error while looking up staff information. Please try again.`;
  }
}

async function lookupContractor(trade: string, storage: IStorage): Promise<string> {
  try {
    const contractors = await storage.getAllContractors();
    const matchingContractors = contractors.filter(
      (c) =>
        c.trade.toLowerCase().includes(trade.toLowerCase()) ||
        c.specialties?.some((s) => s.toLowerCase().includes(trade.toLowerCase()))
    );

    if (matchingContractors.length === 0) {
      return `I couldn't find any contractors specializing in "${trade}". You might want to check the Contractors page for a full list.`;
    }

    let result = `I found ${matchingContractors.length} contractor(s) for **${trade}**:\n\n`;
    matchingContractors.forEach((contractor, index) => {
      result += `${index + 1}. **${contractor.name}**\n`;
      result += `   Trade: ${contractor.trade}\n`;
      result += `   Contact: ${contractor.phone || "No phone"} ${contractor.email ? `| ${contractor.email}` : ""}\n`;
      if (contractor.specialties && contractor.specialties.length > 0) {
        result += `   Specialties: ${contractor.specialties.join(", ")}\n`;
      }
      result += `\n`;
    });

    return result;
  } catch (error) {
    console.error("[Helpdesk] Error looking up contractor:", error);
    return `I encountered an error while looking up contractors. Please try again.`;
  }
}

// Main function to process helpdesk messages
export async function processHelpdeskMessage(
  sessionId: string,
  userMessage: string,
  storage: IStorage
): Promise<string> {
  try {
    // Get chat history
    const history = await storage.getHelpdeskChatHistory(sessionId);

    // Load knowledge base from database for additional context
    const knowledgeEntries = await storage.getActiveKnowledgeBaseEntries();
    const knowledgeContext = knowledgeEntries.length > 0
      ? `\n\nADDITIONAL KNOWLEDGE BASE:\n${knowledgeEntries.map(entry => `## ${entry.title}\n${entry.content}`).join('\n\n')}`
      : '';

    // Convert history to OpenAI messages format
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are a helpful internal helpdesk assistant for Northstay staff members. Your role is to help staff quickly find information about:
- Property owners/landlords and their contact details
- Property information (addresses, amenities, access codes)
- Staff contact information
- Contractor details

Be conversational, friendly, and professional. After answering a question about contact information, ask a follow-up question like "What's the reason you need this contact?" or "Is there anything specific you'd like me to help you with?"

When the user mentions they need to communicate with someone (guest, landlord, contractor) about an issue or to draft a formal message, suggest they use the **Guest Support Assistant** which can help compose professional communications and log issues. The Guest Support Assistant is available at /operations/guest-support-chat

Keep your responses concise but helpful. Use the available tools to query the database for accurate, real-time information.${knowledgeContext}`,
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
    await storage.saveHelpdeskChatMessage({
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
      temperature: 0.7,
      max_tokens: 500,
    });

    let assistantMessage = response.choices[0].message;

    // Handle function calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Add assistant's message with tool calls to history
      messages.push(assistantMessage);

      // Process each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`[Helpdesk] Calling function: ${functionName}`, functionArgs);

        let functionResult: string;

        switch (functionName) {
          case "lookupPropertyOwner":
            functionResult = await lookupPropertyOwner(functionArgs.propertyName, storage);
            break;
          case "lookupPropertyDetails":
            functionResult = await lookupPropertyDetails(functionArgs.propertyName, storage);
            break;
          case "lookupStaffByName":
            functionResult = await lookupStaffByName(functionArgs.name, storage);
            break;
          case "lookupContractor":
            functionResult = await lookupContractor(functionArgs.trade, storage);
            break;
          default:
            functionResult = `Unknown function: ${functionName}`;
        }

        // Add function result to messages
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: functionResult,
        });
      }

      // Get the next response from the AI
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 500,
      });

      assistantMessage = response.choices[0].message;
    }

    // Get the final assistant response
    const finalResponse = assistantMessage.content || "I'm sorry, I couldn't generate a response.";

    // Save assistant message to database
    await storage.saveHelpdeskChatMessage({
      sessionId,
      role: "assistant",
      content: finalResponse,
    });

    return finalResponse;
  } catch (error) {
    console.error("[Helpdesk] Error processing message:", error);
    throw new Error("Failed to process helpdesk message");
  }
}
