import { OpenAI } from "openai";
import Papa from "papaparse";
import { promises as fs } from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedProperlyData {
  cleanerName: string;
  property: string;
  amount: number;
  date: string;
}

export interface ExtractedConnectData {
  cleanerName: string;
  hours: number;
  hourlyRate: number; // Extract hourly rate from Connect report
  date: string;
  location: string;
}

// Helper function to validate and normalize phone numbers
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[\s\-().]/g, '');
  // Validate international format (+XXX...) or UK format (0XXX...)
  const internationalPattern = /^\+\d{7,15}$/;
  const localPattern = /^0\d{9,10}$/;
  
  if (internationalPattern.test(cleaned) || localPattern.test(cleaned)) {
    return cleaned;
  }
  return ''; // Return empty string for invalid numbers
}

export interface CleanerEarnings {
  cleanerName: string;
  fixedCleaningEarnings: number;
  fixedCleaningJobs: number;
  hourlyEarnings: number;
  hourlyHours: number;
  totalEarnings: number;
}

/**
 * Extract cleaner data from Properly reports (fixed-price cleaning)
 * Properly reports contain: Cleaner name, Property, Fixed price, Date
 */
export async function extractProperlyReport(filePath: string): Promise<ExtractedProperlyData[]> {
  console.log("[Properly Extraction] Starting extraction for:", filePath);
  
  const fileExt = path.extname(filePath).toLowerCase();
  let fileContent = "";
  
  try {
    if (fileExt === ".pdf") {
      const dataBuffer = await fs.readFile(filePath);
      // Dynamic import for ESM compatibility - pdf-parse exports function directly
      const pdfParse = await import('pdf-parse') as any;
      const data = await pdfParse(dataBuffer);
      fileContent = data.text;
    } else if (fileExt === ".csv") {
      const csvContent = await fs.readFile(filePath, "utf-8");
      fileContent = csvContent;
    } else {
      // For Excel files, we'll read them as text for now
      // In production, you'd use xlsx library
      const buffer = await fs.readFile(filePath);
      fileContent = buffer.toString("utf-8");
    }
  } catch (error) {
    console.error("[Properly Extraction] Error reading file:", error);
    throw new Error("Failed to read file");
  }

  // Use OpenAI to extract structured data
  const prompt = `You are a data extraction assistant. Extract cleaning job data from this Properly report.

Extract all entries with:
- Cleaner name (the person who did the cleaning)
- Property cleaned (property name/address)
- Fixed price amount (in GBP, numbers only)
- Date of clean (YYYY-MM-DD format)

Return ONLY a JSON array with this exact structure:
[
  {
    "cleanerName": "John Smith",
    "property": "Flat 1, Property Name",
    "amount": 25.50,
    "date": "2025-10-15"
  }
]

Document content:
${fileContent.substring(0, 10000)}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a precise data extraction assistant. Extract cleaning job data and return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    const parsed = JSON.parse(result);
    const data: ExtractedProperlyData[] = Array.isArray(parsed) ? parsed : parsed.data || [];
    
    console.log("[Properly Extraction] Extracted", data.length, "entries");
    return data;
  } catch (error) {
    console.error("[Properly Extraction] OpenAI error:", error);
    
    // Fallback: Try to parse as CSV
    if (fileExt === ".csv") {
      return parseProperlyCSV(fileContent);
    }
    
    throw new Error("Failed to extract Properly report data");
  }
}

/**
 * Extract cleaner data from Connect reports (hourly cleaning)
 * Connect reports contain: Cleaner name, Hours worked, Hourly rate, Date, Location
 * NOTE: Hourly rates should be extracted from the report, not hard-coded
 */
export async function extractConnectReport(filePath: string): Promise<ExtractedConnectData[]> {
  console.log("[Connect Extraction] Starting extraction for:", filePath);
  
  const fileExt = path.extname(filePath).toLowerCase();
  let fileContent = "";
  
  try {
    if (fileExt === ".pdf") {
      const dataBuffer = await fs.readFile(filePath);
      // Dynamic import for ESM compatibility - pdf-parse exports function directly
      const pdfParse = await import('pdf-parse') as any;
      const data = await pdfParse(dataBuffer);
      fileContent = data.text;
    } else if (fileExt === ".csv") {
      const csvContent = await fs.readFile(filePath, "utf-8");
      fileContent = csvContent;
    } else {
      const buffer = await fs.readFile(filePath);
      fileContent = buffer.toString("utf-8");
    }
  } catch (error) {
    console.error("[Connect Extraction] Error reading file:", error);
    throw new Error("Failed to read file");
  }

  // Use OpenAI to extract structured data
  const prompt = `You are a data extraction assistant. Extract hourly work data from this Connect report.

Extract all entries with:
- Cleaner name (the person who worked)
- Hours worked (decimal number, e.g., 8.5)
- Hourly rate (£/hour, decimal number, e.g., 15.50)
- Date (YYYY-MM-DD format)
- Location (e.g., "St Mary's Quarters", property name)

Return ONLY a JSON array with this exact structure:
[
  {
    "cleanerName": "Jane Doe",
    "hours": 8.5,
    "hourlyRate": 15.50,
    "date": "2025-10-15",
    "location": "St Mary's Quarters"
  }
]

Document content:
${fileContent.substring(0, 10000)}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a precise data extraction assistant. Extract hourly work data and return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    const parsed = JSON.parse(result);
    const data: ExtractedConnectData[] = Array.isArray(parsed) ? parsed : parsed.data || [];
    
    console.log("[Connect Extraction] Extracted", data.length, "entries");
    return data;
  } catch (error) {
    console.error("[Connect Extraction] OpenAI error:", error);
    
    // Fallback: Try to parse as CSV
    if (fileExt === ".csv") {
      return parseConnectCSV(fileContent);
    }
    
    throw new Error("Failed to extract Connect report data");
  }
}

/**
 * Combine Properly and Connect data to calculate total earnings per cleaner
 */
export function combineCleanerEarnings(
  properlyData: ExtractedProperlyData[],
  connectData: ExtractedConnectData[]
): CleanerEarnings[] {
  console.log("[Combine] Combining data -", properlyData.length, "Properly entries,", connectData.length, "Connect entries");
  
  const cleanerMap = new Map<string, CleanerEarnings>();

  // Process Properly data (fixed-price jobs)
  for (const entry of properlyData) {
    const cleanerName = normalizeCleanerName(entry.cleanerName);
    
    if (!cleanerMap.has(cleanerName)) {
      cleanerMap.set(cleanerName, {
        cleanerName: entry.cleanerName, // Use original name
        fixedCleaningEarnings: 0,
        fixedCleaningJobs: 0,
        hourlyEarnings: 0,
        hourlyHours: 0,
        totalEarnings: 0,
      });
    }
    
    const cleaner = cleanerMap.get(cleanerName)!;
    cleaner.fixedCleaningEarnings += entry.amount;
    cleaner.fixedCleaningJobs += 1;
  }

  // Process Connect data (hourly work)
  for (const entry of connectData) {
    const cleanerName = normalizeCleanerName(entry.cleanerName);
    
    if (!cleanerMap.has(cleanerName)) {
      cleanerMap.set(cleanerName, {
        cleanerName: entry.cleanerName, // Use original name
        fixedCleaningEarnings: 0,
        fixedCleaningJobs: 0,
        hourlyEarnings: 0,
        hourlyHours: 0,
        totalEarnings: 0,
      });
    }
    
    const cleaner = cleanerMap.get(cleanerName)!;
    const earnings = entry.hours * entry.hourlyRate;
    cleaner.hourlyEarnings += earnings;
    cleaner.hourlyHours += entry.hours;
  }

  // Calculate totals
  for (const cleaner of cleanerMap.values()) {
    cleaner.totalEarnings = cleaner.fixedCleaningEarnings + cleaner.hourlyEarnings;
  }

  const result = Array.from(cleanerMap.values());
  console.log("[Combine] Combined data for", result.length, "cleaners");
  return result;
}

/**
 * Normalize cleaner name for matching (handles variations in capitalization, spacing, etc.)
 */
function normalizeCleanerName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Fallback CSV parser for Properly reports
 */
function parseProperlyCSV(content: string): ExtractedProperlyData[] {
  const results: ExtractedProperlyData[] = [];
  
  try {
    const parsed = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
    });

    for (const row of parsed.data as any[]) {
      // Try to find relevant columns
      const cleanerName = row["Cleaner"] || row["Name"] || row["Staff"] || row["cleaner_name"];
      const property = row["Property"] || row["Address"] || row["Location"] || row["property"];
      const amount = parseFloat(row["Amount"] || row["Price"] || row["Pay"] || row["amount"] || "0");
      const date = row["Date"] || row["date"] || new Date().toISOString().split("T")[0];

      if (cleanerName && amount > 0) {
        results.push({
          cleanerName: cleanerName.trim(),
          property: property?.trim() || "Unknown",
          amount,
          date,
        });
      }
    }
  } catch (error) {
    console.error("[CSV Parse] Error parsing Properly CSV:", error);
  }

  return results;
}

/**
 * Fallback CSV parser for Connect reports
 */
function parseConnectCSV(content: string): ExtractedConnectData[] {
  const results: ExtractedConnectData[] = [];
  
  try {
    const parsed = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
    });

    for (const row of parsed.data as any[]) {
      // Try to find relevant columns
      const cleanerName = row["Cleaner"] || row["Name"] || row["Staff"] || row["cleaner_name"];
      const hours = parseFloat(row["Hours"] || row["hours"] || row["Time"] || "0");
      const hourlyRate = parseFloat(row["Rate"] || row["Hourly Rate"] || row["hourly_rate"] || row["Pay Rate"] || "0");
      const date = row["Date"] || row["date"] || new Date().toISOString().split("T")[0];
      const location = row["Location"] || row["Property"] || row["Site"] || row["location"] || "Unknown";

      if (cleanerName && hours > 0 && hourlyRate > 0) {
        results.push({
          cleanerName: cleanerName.trim(),
          hours,
          hourlyRate,
          date,
          location: location.trim(),
        });
      }
    }
  } catch (error) {
    console.error("[CSV Parse] Error parsing Connect CSV:", error);
  }

  return results;
}
