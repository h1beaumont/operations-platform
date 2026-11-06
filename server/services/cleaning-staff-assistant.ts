import OpenAI from "openai";
import type { IStorage } from "../storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Define the tools available to the AI for cleaning staff
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getPropertyAccessInfo",
      description: "Get property access information including lockbox codes, WiFi passwords, parking details, and arrival instructions for a specific property",
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
      name: "getLinenPackingList",
      description: "Get the linen packing list for a specific property showing required quantities for each linen type",
      parameters: {
        type: "object",
        properties: {
          propertyName: {
            type: "string",
            description: "The property name or nickname to get linen requirements for",
          },
        },
        required: ["propertyName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchProperties",
      description: "Search for properties by name, address, or nickname. Use this when you're not sure of the exact property name.",
      parameters: {
        type: "object",
        properties: {
          searchTerm: {
            type: "string",
            description: "Search term to find properties (partial matches supported)",
          },
        },
        required: ["searchTerm"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCriticalInfo",
      description: "Get critical information like property links (Booking.com, Airbnb), WiFi passwords, lockbox codes, or parking instructions",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Category to filter by: property_links, wifi_passwords, lockbox_codes, parking_instructions, or other_info",
          },
        },
      },
    },
  },
];

// Tool implementation functions
async function getPropertyAccessInfo(propertyName: string, storage: IStorage): Promise<string> {
  try {
    const properties = await storage.getProperties();
    const property = properties.find(
      (p) =>
        p.propertyName?.toLowerCase().includes(propertyName.toLowerCase()) ||
        p.nickname?.toLowerCase().includes(propertyName.toLowerCase()) ||
        p.address?.toLowerCase().includes(propertyName.toLowerCase())
    );

    if (!property) {
      return `I couldn't find a property matching "${propertyName}". Please check the spelling or try searching with a different name.`;
    }

    let info = `**${property.nickname || property.propertyName}**\n`;
    info += `Address: ${property.address || "Not available"}\n\n`;
    
    if (property.accessInstructions) {
      info += `**Access Instructions:**\n${property.accessInstructions}\n\n`;
    }
    
    if (property.wifiName || property.wifiPassword) {
      info += `**WiFi:**\n`;
      info += property.wifiName ? `Network: ${property.wifiName}\n` : '';
      info += property.wifiPassword ? `Password: ${property.wifiPassword}\n\n` : '\n';
    }
    
    if (property.parkingInstructions) {
      info += `**Parking:**\n${property.parkingInstructions}\n\n`;
    }

    return info;
  } catch (error) {
    console.error("[CleaningAssistant] Error getting property access info:", error);
    return `I encountered an error while looking up property access information. Please try again.`;
  }
}

async function getLinenPackingList(propertyName: string, storage: IStorage): Promise<string> {
  try {
    const properties = await storage.getProperties();
    const property = properties.find(
      (p) =>
        p.propertyName?.toLowerCase().includes(propertyName.toLowerCase()) ||
        p.nickname?.toLowerCase().includes(propertyName.toLowerCase())
    );

    if (!property) {
      return `I couldn't find a property matching "${propertyName}". Please check the spelling.`;
    }

    const packingLists = await storage.getLinenPackingLists();
    const propertyList = packingLists.find(pl => pl.propertyId === property.id);

    if (!propertyList) {
      return `No linen packing list has been created for ${property.nickname || property.propertyName} yet.`;
    }

    let result = `**Linen Packing List for ${property.nickname || property.propertyName}**\n\n`;
    
    const items = propertyList.items as Array<{ type: string; quantity: number }>;
    items.forEach(item => {
      result += `• ${item.type}: ${item.quantity}\n`;
    });

    return result;
  } catch (error) {
    console.error("[CleaningAssistant] Error getting linen packing list:", error);
    return `I encountered an error while fetching the linen packing list. Please try again.`;
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
    matches.forEach((p, idx) => {
      result += `${idx + 1}. **${p.nickname || p.propertyName}** - ${p.address}\n`;
    });

    return result;
  } catch (error) {
    console.error("[CleaningAssistant] Error searching properties:", error);
    return `I encountered an error while searching properties. Please try again.`;
  }
}

async function getCriticalInfo(category: string | undefined, storage: IStorage): Promise<string> {
  try {
    const allEntries = await storage.getAllCriticalInfo();
    
    let filteredEntries = allEntries;
    if (category) {
      filteredEntries = allEntries.filter(e => e.category === category);
    }

    if (filteredEntries.length === 0) {
      return category 
        ? `No critical information found for category "${category}".`
        : "No critical information entries found.";
    }

    let result = category ? `**${category.replace(/_/g, ' ').toUpperCase()}**\n\n` : "**Critical Information**\n\n";
    
    filteredEntries.forEach(entry => {
      result += `**${entry.title}**: ${entry.value}\n`;
      if (entry.notes) {
        result += `Note: ${entry.notes}\n`;
      }
      result += `\n`;
    });

    return result;
  } catch (error) {
    console.error("[CleaningAssistant] Error getting critical info:", error);
    return `I encountered an error while fetching critical information. Please try again.`;
  }
}

// Main function to process cleaning staff assistant messages
export async function processCleaningStaffMessage(
  conversationHistory: Array<{ role: string; content: string }>,
  userMessage: string,
  storage: IStorage
): Promise<string> {
  try {
    // Convert history to OpenAI messages format
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are a helpful assistant for cleaning staff at Northstay. Your role is to help cleaners quickly find information about:

- Property access codes, WiFi passwords, and arrival instructions
- Linen packing lists for each property
- Parking information
- Property details and locations
- Critical information like booking platform links

You have access to live portal data through function calls. Always use these tools to provide accurate, up-to-date information.

Be friendly, concise, and helpful. Focus on providing practical information that helps cleaners do their job efficiently.`,
      },
      ...conversationHistory.map(msg => ({
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
      max_tokens: 1000,
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
          case "getPropertyAccessInfo":
            functionResult = await getPropertyAccessInfo(functionArgs.propertyName, storage);
            break;
          case "getLinenPackingList":
            functionResult = await getLinenPackingList(functionArgs.propertyName, storage);
            break;
          case "searchProperties":
            functionResult = await searchProperties(functionArgs.searchTerm, storage);
            break;
          case "getCriticalInfo":
            functionResult = await getCriticalInfo(functionArgs.category, storage);
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
        max_tokens: 1000,
      });

      return finalResponse.choices[0].message.content || "I couldn't generate a response.";
    }

    // No tool calls, return direct response
    return responseMessage.content || "I couldn't generate a response.";
  } catch (error) {
    console.error("[CleaningAssistant] Error processing message:", error);
    throw error;
  }
}
