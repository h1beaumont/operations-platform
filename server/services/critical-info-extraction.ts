import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ExtractedCriticalInfoItem {
  category: string; // "Lockbox Code", "WiFi Password", "Gate Code", "Emergency Contact", "Other"
  propertyName: string;
  title: string;
  value: string;
  notes?: string;
}

export async function extractCriticalInfo(inputText: string): Promise<ExtractedCriticalInfoItem[]> {
  try {
    const prompt = `You are a critical property information extraction assistant. Extract all critical information items from the provided text and organize them into structured data.

Extract and categorize the following types of information:
- Lockbox codes (access codes, key box codes, entry codes for lockboxes)
- WiFi passwords (WiFi credentials, network passwords, SSID and passwords)
- Gate codes (gate access codes, entry codes for gates/doors)
- Emergency contacts (emergency phone numbers, contact persons)
- Other important information (parking codes, building codes, special instructions, etc.)

For each item found, extract:
- category: One of "Lockbox Code", "WiFi Password", "Gate Code", "Emergency Contact", or "Other"
- propertyName: The property identifier (name, address, or any identifier mentioned)
- title: A brief descriptive title for this item (e.g., "Main Entrance Lockbox", "Guest WiFi", "Emergency Maintenance Contact")
- value: The actual code, password, contact number, or information
- notes: Any additional context or notes (optional)

Return the data as a JSON array with the following structure:
[
  {
    "category": "Lockbox Code" | "WiFi Password" | "Gate Code" | "Emergency Contact" | "Other",
    "propertyName": "string",
    "title": "string",
    "value": "string",
    "notes": "string or null"
  }
]

Input text (can be in various formats like CSV, paragraph form, bullet points, or tables):
${inputText}

Guidelines:
- If property name is not explicitly mentioned, try to infer it from context or use "Unknown Property"
- Be generous in extraction - if something looks like critical information, include it
- For WiFi, extract both SSID and password if available (you can create separate entries or combine them)
- For emergency contacts, include the contact name and number
- Categorize thoughtfully based on the content
- If you find multiple properties in the text, create separate entries for each

IMPORTANT: Return ONLY the JSON array, no additional text or explanation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a precise data extraction assistant specialized in extracting critical property information. Extract all relevant information and return it as a valid JSON array only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    let extractedData: ExtractedCriticalInfoItem[];
    try {
      extractedData = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks if wrapped
      const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("Failed to parse JSON response from OpenAI");
      }
    }

    // Validate that we got an array
    if (!Array.isArray(extractedData)) {
      throw new Error("AI response was not an array");
    }

    // Validate and clean each item
    extractedData = extractedData.map((item) => ({
      category: item.category || "Other",
      propertyName: item.propertyName || "Unknown Property",
      title: item.title || "Untitled",
      value: item.value || "",
      notes: item.notes || undefined,
    }));

    console.log(`[AI-EXTRACT] Successfully extracted ${extractedData.length} critical info items`);
    return extractedData;
  } catch (error) {
    console.error("[AI-EXTRACT] Error extracting critical info with AI:", error);
    throw new Error(`Failed to extract critical info with AI: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
