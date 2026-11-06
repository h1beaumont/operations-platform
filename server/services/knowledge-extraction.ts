import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ExtractedKnowledgeData {
  extractedContent: string;
  suggestedTitle: string;
  suggestedCategory: string;
  suggestedTags: string[];
  confidenceScore: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

export class KnowledgeExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KnowledgeExtractionError";
    Object.setPrototypeOf(this, KnowledgeExtractionError.prototype);
  }
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log("[PDF-EXTRACT] Starting PDF text extraction...");
    console.log("[PDF-EXTRACT] Buffer size:", buffer.length, "bytes");
    
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    
    console.log("[PDF-EXTRACT] pdf-parse loaded, parsing buffer...");
    
    const data = await pdfParse(buffer);
    const text = data.text;
    
    console.log("[PDF-EXTRACT] Successfully extracted text");
    console.log("[PDF-EXTRACT] Text length:", text.length, "characters");
    console.log("[PDF-EXTRACT] Total pages:", data.numpages);
    
    if (!text || text.trim().length === 0) {
      throw new Error("PDF appears to be empty or contains no extractable text");
    }
    
    return text;
  } catch (error: any) {
    console.error("[PDF-EXTRACT] Error extracting text from PDF:");
    console.error("[PDF-EXTRACT] Error message:", error?.message);
    throw new KnowledgeExtractionError(`Failed to extract text from PDF: ${error?.message || 'Unknown error'}`);
  }
}

export async function extractTextFromImage(buffer: Buffer, fileName: string): Promise<string> {
  try {
    console.log("[IMAGE-EXTRACT] Starting image text extraction with OpenAI Vision...");
    console.log("[IMAGE-EXTRACT] Buffer size:", buffer.length, "bytes");
    
    // Convert buffer to base64
    const base64Image = buffer.toString('base64');
    
    // Determine image type from first few bytes (magic numbers)
    let imageType = 'image/jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      imageType = 'image/png';
    }
    
    console.log("[IMAGE-EXTRACT] Detected image type:", imageType);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text content from this image. Return only the extracted text without any additional commentary or formatting.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${imageType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const extractedText = response.choices[0]?.message?.content?.trim() || "";
    
    console.log("[IMAGE-EXTRACT] Successfully extracted text");
    console.log("[IMAGE-EXTRACT] Text length:", extractedText.length, "characters");
    
    if (!extractedText || extractedText.length === 0) {
      throw new Error("No text found in image");
    }
    
    return extractedText;
  } catch (error: any) {
    console.error("[IMAGE-EXTRACT] Error extracting text from image:");
    console.error("[IMAGE-EXTRACT] Error message:", error?.message);
    throw new KnowledgeExtractionError(`Failed to extract text from image: ${error?.message || 'Unknown error'}`);
  }
}

export async function extractTextFromFile(
  buffer: Buffer,
  fileType: string,
  fileName: string
): Promise<string> {
  if (fileType === "pdf") {
    return await extractTextFromPDF(buffer);
  } else if (fileType === "image") {
    return await extractTextFromImage(buffer, fileName);
  } else if (fileType === "text") {
    return buffer.toString('utf-8');
  } else {
    throw new KnowledgeExtractionError(`Unsupported file type: ${fileType}`);
  }
}

export async function analyzeAndSuggestMetadata(
  extractedContent: string,
  chatbotType: string
): Promise<ExtractedKnowledgeData> {
  try {
    const systemContext = chatbotType === "cleaning_staff" 
      ? "You are analyzing content for a cleaning staff knowledge base. Focus on property cleaning procedures, equipment, linen management, and operational guidelines."
      : "You are analyzing content for an internal operations knowledge base. Focus on property management, staff procedures, maintenance protocols, and administrative processes.";

    const prompt = `${systemContext}

Analyze the following content and suggest appropriate metadata:

Content:
${extractedContent.substring(0, 4000)} ${extractedContent.length > 4000 ? '...(truncated)' : ''}

Please provide:
1. A short, descriptive title (max 100 characters)
2. Category (choose ONE from: property, staff, maintenance, procedures, general, manual)
3. Tags (3-5 relevant keywords)
4. Confidence score (0-1) indicating how confident you are in the categorization
5. If confidence < 0.6, indicate needsClarification: true and provide a clarification question

Return the data as a JSON object with this structure:
{
  "suggestedTitle": "string",
  "suggestedCategory": "property" | "staff" | "maintenance" | "procedures" | "general" | "manual",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "confidenceScore": number between 0 and 1,
  "needsClarification": boolean,
  "clarificationQuestion": "string (only if needsClarification is true)"
}

IMPORTANT: Return ONLY the JSON object, no additional text or explanation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a precise data extraction and categorization assistant. Extract and categorize knowledge base content and return it as valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    console.log("[AI-ANALYZE] Raw AI response:", content);
    
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    let analyzedData: any;
    try {
      analyzedData = JSON.parse(content);
      console.log("[AI-ANALYZE] Successfully parsed JSON directly");
    } catch (parseError) {
      console.log("[AI-ANALYZE] Direct JSON parse failed, trying to extract from markdown");
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        analyzedData = JSON.parse(jsonMatch[1]);
        console.log("[AI-ANALYZE] Successfully extracted JSON from markdown");
      } else {
        console.error("[AI-ANALYZE] Failed to parse response. Content:", content);
        throw new Error("Failed to parse JSON response from OpenAI");
      }
    }

    // Validate and sanitize the response
    const result: ExtractedKnowledgeData = {
      extractedContent,
      suggestedTitle: analyzedData.suggestedTitle || "Untitled Document",
      suggestedCategory: analyzedData.suggestedCategory || "general",
      suggestedTags: Array.isArray(analyzedData.suggestedTags) ? analyzedData.suggestedTags : [],
      confidenceScore: typeof analyzedData.confidenceScore === 'number' ? analyzedData.confidenceScore : 0.5,
      needsClarification: analyzedData.needsClarification || analyzedData.confidenceScore < 0.6,
      clarificationQuestion: analyzedData.clarificationQuestion || undefined,
    };

    // Generate clarification question if needed but not provided
    if (result.needsClarification && !result.clarificationQuestion) {
      result.clarificationQuestion = "The AI is uncertain about the categorization of this content. Please review the suggested title, category, and tags, and make any necessary adjustments.";
    }

    console.log("[AI-ANALYZE] Successfully analyzed content:", JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error("[AI-ANALYZE] Error analyzing content with AI:", error);
    
    // Return a default result with low confidence
    return {
      extractedContent,
      suggestedTitle: "Untitled Document",
      suggestedCategory: "general",
      suggestedTags: [],
      confidenceScore: 0.2,
      needsClarification: true,
      clarificationQuestion: "AI analysis failed. Please manually categorize this content and provide a title and tags.",
    };
  }
}

export async function processFileForKnowledge(
  buffer: Buffer,
  fileType: string,
  fileName: string,
  chatbotType: string
): Promise<ExtractedKnowledgeData> {
  console.log(`[KNOWLEDGE-PROCESS] Processing file: ${fileName}, type: ${fileType}`);
  
  // Step 1: Extract text from file
  const extractedText = await extractTextFromFile(buffer, fileType, fileName);
  
  // Step 2: Analyze and suggest metadata
  const result = await analyzeAndSuggestMetadata(extractedText, chatbotType);
  
  return result;
}
