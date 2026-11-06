import OpenAI from "openai";
import { createRequire } from 'module';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Load CommonJS module using createRequire
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export interface ExtractedContractData {
  tenantName?: string;
  propertyAddress?: string;
  rentAmount?: number;
  rentFrequency?: string;
  depositAmount?: number;
  startDate?: string;
  endDate?: string;
  tenantEmail?: string;
  tenantPhone?: string;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log("[PDF-EXTRACT] Starting PDF text extraction...");
    console.log("[PDF-EXTRACT] Buffer size:", buffer.length, "bytes");

    if (!buffer || buffer.length === 0) {
      throw new Error("PDF buffer is empty");
    }

    // Check if buffer starts with PDF header
    const header = buffer.toString('utf8', 0, 8);
    console.log("[PDF-EXTRACT] PDF header:", header);
    if (!header.includes('%PDF')) {
      throw new Error("File is not a valid PDF (missing PDF header)");
    }

    console.log("[PDF-EXTRACT] Parsing PDF buffer with pdf-parse...");

    console.log("[PDF-EXTRACT] Parsing PDF buffer...");

    // Parse the PDF buffer with options to handle various PDF structures
    const data = await pdfParse(buffer, {
      // Don't limit the buffer size
      max: 0,
      // Disable version checking
      version: 'default'
    });

    console.log("[PDF-EXTRACT] PDF parsed successfully");
    console.log("[PDF-EXTRACT] Number of pages:", data.numpages);
    console.log("[PDF-EXTRACT] PDF info:", JSON.stringify(data.info, null, 2));

    const text = data.text;

    console.log("[PDF-EXTRACT] Text extraction complete");
    console.log("[PDF-EXTRACT] Text length:", text ? text.length : 0, "characters");

    if (text && text.length > 0) {
      console.log("[PDF-EXTRACT] First 500 characters:", text.substring(0, Math.min(500, text.length)));
    }

    if (!text || text.trim().length === 0) {
      throw new Error("PDF contains no extractable text. The PDF may be scanned images or password-protected.");
    }

    console.log("[PDF-EXTRACT] Successfully extracted text from PDF");
    return text;
  } catch (error: any) {
    console.error("[PDF-EXTRACT] ===== PDF EXTRACTION ERROR =====");
    console.error("[PDF-EXTRACT] Error type:", error?.constructor?.name);
    console.error("[PDF-EXTRACT] Error message:", error?.message);
    console.error("[PDF-EXTRACT] Error stack:", error?.stack);
    console.error("[PDF-EXTRACT] ================================");

    // Provide more helpful error messages for common issues
    let errorMessage = error?.message || 'Unknown error during PDF parsing';

    if (errorMessage.includes('pdfRaw') || errorMessage.includes('iterable') || errorMessage.includes('not iterable')) {
      errorMessage = "This PDF format is not supported. Please try a different PDF or save it in a standard PDF format.";
    } else if (errorMessage.includes('encrypted') || errorMessage.includes('password')) {
      errorMessage = "PDF is password-protected. Please provide an unencrypted version.";
    } else if (errorMessage.includes('Invalid PDF structure')) {
      errorMessage = "PDF structure is invalid. The file may be corrupted.";
    } else if (errorMessage.includes('PDF header')) {
      errorMessage = "File is not a valid PDF document.";
    } else if (errorMessage.includes('parser failed')) {
      errorMessage = "PDF parsing library failed to initialize. Please try again.";
    }

    throw new Error(errorMessage);
  }
}

export async function extractContractDataWithAI(pdfText: string): Promise<ExtractedContractData> {
  try {
    const prompt = `You are a contract data extraction assistant. Extract the following information from this tenancy agreement contract:

- Tenant name(s) (full name of the tenant or tenants)
- Property address (full address of the rental property)
- Rent amount (numeric value only, no currency symbols)
- Rent frequency (weekly, monthly, or quarterly)
- Deposit amount (numeric value only, no currency symbols)
- Tenancy start date (in YYYY-MM-DD format)
- Tenancy end date (in YYYY-MM-DD format if present)
- Tenant email (if present in the contract)
- Tenant phone (if present in the contract)

Return the data as a JSON object with the following structure:
{
  "tenantName": "string or null",
  "propertyAddress": "string or null",
  "rentAmount": number or null,
  "rentFrequency": "weekly" | "monthly" | "quarterly" or null,
  "depositAmount": number or null,
  "startDate": "YYYY-MM-DD" or null,
  "endDate": "YYYY-MM-DD" or null,
  "tenantEmail": "string or null",
  "tenantPhone": "string or null"
}

Contract text:
${pdfText}

IMPORTANT: Return ONLY the JSON object, no additional text or explanation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a precise data extraction assistant. Extract contract information and return it as valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Safe JSON parsing with markdown cleanup
    let extraction: any;
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extraction = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('[Contract Extraction] JSON parse error:', parseError);
      console.error('[Contract Extraction] Raw content:', content.substring(0, 500));
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
    }

    console.log('[Contract Extraction] Extraction completed');
    console.log('[Contract Extraction] Confidence:', extraction.extractionConfidence);

    return extraction as ExtractedContractData;
  } catch (error) {
    console.error("[AI-EXTRACT] Error extracting contract data with AI:", error);
    throw new Error("Failed to extract contract data with AI");
  }
}