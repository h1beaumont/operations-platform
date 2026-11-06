import OpenAI from "openai";
import { storage, db } from "../storage";
import { inspectionStorage } from "../object-storage";
import { inspectionReports, inspectionItems, inspectionIssues, cleaningAssignments, cleaningJobs } from "@shared/schema";
import { eq, and, lte, desc } from "drizzle-orm";
import { checkAndSendNotifications } from "./inspection-notifications";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ExtractedInspectionData {
  propertyIdentifier?: string;
  inspectionDate?: string;
  overallScore?: number;
  inspector?: string;
  checklist?: Array<{
    category: string;
    item: string;
    score?: number;
    notes?: string;
  }>;
  issues?: Array<{
    severity: "minor" | "major" | "critical";
    description: string;
  }>;
  photos?: Array<{
    description: string;
    pageNumber?: number;
  }>;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import for ESM compatibility - pdf-parse exports function directly
    const pdfParse = await import('pdf-parse') as any;
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error("[PDF-EXTRACT] Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

export async function extractInspectionDataWithAI(pdfText: string): Promise<ExtractedInspectionData> {
  try {
    const prompt = `You are an inspection report data extraction assistant. Extract the following information from this RentCheck property inspection report:

- Property identifier (address or property name)
- Inspection date (in ISO date format YYYY-MM-DD)
- Overall score (0-100 scale)
- Inspector name
- Checklist items (array of inspection items with category, item description, score if present, and notes)
- Issues found (array of issues with severity level: minor, major, or critical, and description)
- Photos referenced (array of photo descriptions and page numbers if mentioned)

Return the data as a JSON object with the following structure:
{
  "propertyIdentifier": "string or null",
  "inspectionDate": "YYYY-MM-DD or null",
  "overallScore": number (0-100) or null,
  "inspector": "string or null",
  "checklist": [
    {
      "category": "string (e.g., Kitchen, Bedroom, Bathroom, Living Area)",
      "item": "string (description of what was inspected)",
      "score": number or null,
      "notes": "string or null"
    }
  ],
  "issues": [
    {
      "severity": "minor" | "major" | "critical",
      "description": "string"
    }
  ],
  "photos": [
    {
      "description": "string",
      "pageNumber": number or null
    }
  ]
}

Inspection report text:
${pdfText}

IMPORTANT: Return ONLY the JSON object, no additional text or explanation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a precise data extraction assistant specialized in property inspection reports. Extract information and return it as valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    let extractedData: ExtractedInspectionData;
    try {
      extractedData = JSON.parse(content);
    } catch (parseError) {
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("Failed to parse JSON response from OpenAI");
      }
    }

    console.log("[AI-EXTRACT] Successfully extracted inspection data:", extractedData);
    return extractedData;
  } catch (error) {
    console.error("[AI-EXTRACT] Error extracting inspection data with AI:", error);
    throw new Error("Failed to extract inspection data with AI");
  }
}

/**
 * Find the most recent cleaner who cleaned a property before the inspection date
 */
async function findMostRecentCleaner(propertyId: string, inspectionDate: Date): Promise<string | null> {
  try {
    console.log(`[INSPECTION-EXTRACT] Finding most recent cleaner for property ${propertyId} before ${inspectionDate.toISOString()}`);
    
    // Query cleaning assignments joined with cleaning jobs to find the most recent cleaner
    const recentAssignments = await db
      .select({
        staffId: cleaningAssignments.staffId,
        assignedDate: cleaningAssignments.assignedDate,
      })
      .from(cleaningAssignments)
      .innerJoin(cleaningJobs, eq(cleaningAssignments.cleaningJobId, cleaningJobs.id))
      .where(
        and(
          eq(cleaningJobs.propertyId, propertyId),
          lte(cleaningAssignments.assignedDate, inspectionDate.toISOString().split('T')[0]) // Compare dates only
        )
      )
      .orderBy(desc(cleaningAssignments.assignedDate))
      .limit(1);

    if (recentAssignments.length > 0) {
      const cleanerId = recentAssignments[0].staffId;
      console.log(`[INSPECTION-EXTRACT] Found most recent cleaner: ${cleanerId} (cleaned on ${recentAssignments[0].assignedDate})`);
      return cleanerId;
    }

    console.log(`[INSPECTION-EXTRACT] No recent cleaner found for property ${propertyId}`);
    return null;
  } catch (error) {
    console.error("[INSPECTION-EXTRACT] Error finding most recent cleaner:", error);
    return null; // Don't fail the entire extraction if cleaner lookup fails
  }
}

export async function extractInspectionData(inspectionId: string): Promise<void> {
  try {
    console.log(`[INSPECTION-EXTRACT] Starting extraction for inspection ${inspectionId}`);
    
    const inspection = await storage.getInspectionReport(inspectionId);
    if (!inspection) {
      throw new Error(`Inspection report ${inspectionId} not found`);
    }

    if (!inspection.pdfUrl) {
      throw new Error(`Inspection report ${inspectionId} has no PDF URL`);
    }

    console.log("[INSPECTION-EXTRACT] Downloading PDF from object storage...");
    const pdfBuffer = await inspectionStorage.downloadInspectionPdf(inspection.pdfUrl);

    console.log("[INSPECTION-EXTRACT] Extracting text from PDF...");
    const pdfText = await extractTextFromPDF(pdfBuffer);

    console.log("[INSPECTION-EXTRACT] Extracting inspection data with AI...");
    const extractedData = await extractInspectionDataWithAI(pdfText);

    // Find the most recent cleaner for this property
    const inspectionDate = extractedData.inspectionDate 
      ? new Date(extractedData.inspectionDate)
      : new Date(inspection.date);
    const assignedCleanerId = await findMostRecentCleaner(inspection.propertyId, inspectionDate);
    
    if (assignedCleanerId) {
      console.log(`[INSPECTION-EXTRACT] Linking inspection to cleaner ${assignedCleanerId}`);
    }

    // INTEGRATION POINT: Match property from AI-extracted data
    // Example usage:
    // import { matchProperty } from "./property-matcher";
    // const matchedPropertyId = await matchProperty({
    //   propertyId: extractedData.propertyIdentifier, // If AI extracted a UUID
    //   address: extractedData.propertyIdentifier,    // If AI extracted an address/name
    //   name: extractedData.propertyIdentifier,
    // });
    // Then use matchedPropertyId when creating/updating the inspection report

    // Wrap all database writes in a transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // Create all checklist items
      if (extractedData.checklist && extractedData.checklist.length > 0) {
        console.log(`[INSPECTION-EXTRACT] Creating ${extractedData.checklist.length} checklist items...`);
        for (const item of extractedData.checklist) {
          await tx.insert(inspectionItems).values({
            reportId: inspectionId,
            itemCategory: item.category,
            itemDescription: item.item,
            rating: item.score || null,
            notes: item.notes || null,
          });
        }
      }

      // Create all issues
      if (extractedData.issues && extractedData.issues.length > 0) {
        console.log(`[INSPECTION-EXTRACT] Creating ${extractedData.issues.length} issues...`);
        for (const issue of extractedData.issues) {
          await tx.insert(inspectionIssues).values({
            reportId: inspectionId,
            severity: issue.severity,
            description: issue.description,
          });
        }
      }

      // Update inspection with AI data, cleaner assignment, and mark completed
      console.log("[INSPECTION-EXTRACT] Updating inspection with extracted data and marking as completed...");
      await tx.update(inspectionReports)
        .set({
          aiExtractedData: extractedData,
          assignedCleanerId: assignedCleanerId || null,
          status: 'completed',
          overallScore: extractedData.overallScore || null,
          completedAt: new Date(),
        })
        .where(eq(inspectionReports.id, inspectionId));
    });

    // Check and send notifications after transaction completes successfully
    console.log("[INSPECTION-EXTRACT] Checking notification settings...");
    try {
      await checkAndSendNotifications(inspectionId);
    } catch (notificationError) {
      // Log but don't fail the extraction if notifications fail
      console.error("[INSPECTION-EXTRACT] Error sending notifications:", notificationError);
    }

    console.log(`[INSPECTION-EXTRACT] Successfully completed extraction for inspection ${inspectionId}`);
  } catch (error) {
    console.error(`[INSPECTION-EXTRACT] Error extracting inspection ${inspectionId}:`, error);
    
    await storage.updateInspectionReport(inspectionId, {
      status: "pending",
      notes: `AI extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
    
    throw error;
  }
}
