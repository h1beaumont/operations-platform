import OpenAI from "openai";
import Papa from "papaparse";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ExtractedTransaction {
  date: string; // YYYY-MM-DD format
  description: string;
  amount: number;
  type: "debit" | "credit" | "income" | "expense";
  balance?: number;
  suggestedCategory: string;
  propertyReference?: string;
  confidence: number; // 0-1 confidence score
}

export interface BankStatementExtractionResult {
  transactions: ExtractedTransaction[];
  startDate?: string;
  endDate?: string;
  totalTransactions: number;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netChange: number;
  };
}

/**
 * Extract text from PDF bank statement
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse') as any;
    const data = await pdfParse(buffer);
    const text = data.text;
    
    console.log("[BANK-PDF-EXTRACT] Successfully extracted text. Text length:", text.length);
    console.log("[BANK-PDF-EXTRACT] Total pages:", data.numpages);
    console.log("[BANK-PDF-EXTRACT] First 1000 characters:", text.substring(0, 1000));
    
    return text;
  } catch (error) {
    console.error("[BANK-PDF-EXTRACT] Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF bank statement");
  }
}

/**
 * Parse CSV bank statement
 */
export async function parseCSVStatement(buffer: Buffer): Promise<Array<Record<string, string>>> {
  return new Promise((resolve, reject) => {
    const csvText = buffer.toString('utf-8');
    
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("[BANK-CSV-PARSE] Successfully parsed CSV. Rows:", results.data.length);
        console.log("[BANK-CSV-PARSE] Sample row:", results.data[0]);
        resolve(results.data as Array<Record<string, string>>);
      },
      error: (error) => {
        console.error("[BANK-CSV-PARSE] Error parsing CSV:", error);
        reject(new Error("Failed to parse CSV bank statement"));
      }
    });
  });
}

/**
 * Use AI to extract and categorize transactions from text
 */
export async function extractTransactionsWithAI(
  statementText: string,
  fileType: "pdf" | "csv"
): Promise<BankStatementExtractionResult> {
  try {
    const prompt = `You are a financial transaction categorization expert for a UK serviced accommodation business. Extract and categorize ALL transactions from this bank statement.

CATEGORIZATION RULES:
- "Airbnb", "Booking.com", "VRBO", rental income → "rental_income"
- "Uplisting", "Guesty", "Hospitable", property management software → "software_costs"
- Plumber, electrician, handyman, repairs → "contractor_fees"
- Cleaning services, cleaning supplies → "cleaning_costs"
- Linen, bedding, towels → "linen_costs"
- Gas, electric, water, council tax → "utilities"
- Insurance payments → "insurance"
- Management fees to agencies → "management_fees"
- Routine maintenance, repairs → "maintenance_costs"
- Bank fees, charges → "other_expense"
- Transfers between own accounts → Mark as "transfer" (to be reviewed)
- Unclear transactions → "other_expense" or "other_income"

PROPERTY REFERENCE DETECTION:
- Look for property names, addresses, or booking references in descriptions
- Extract property identifiers if found (e.g., "Flat 1", "16 High St", "Booking #12345")

Return a JSON object with this EXACT structure:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number (positive for income, negative for expenses),
      "type": "income" | "expense",
      "suggestedCategory": "rental_income" | "management_fees" | "maintenance_costs" | "software_costs" | "utilities" | "cleaning_costs" | "linen_costs" | "contractor_fees" | "insurance" | "other_income" | "other_expense",
      "propertyReference": "string or null",
      "confidence": number (0-1)
    }
  ],
  "startDate": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null"
}

IMPORTANT RULES:
1. Extract EVERY transaction, don't skip any
2. For income (credits/deposits): amount should be POSITIVE, type should be "income"
3. For expenses (debits/withdrawals): amount should be NEGATIVE, type should be "expense"
4. Use confidence 0.9+ for obvious matches, 0.5-0.8 for likely matches, <0.5 for unclear
5. Return ONLY valid JSON, no markdown, no explanations

Bank Statement Text:
${statementText}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a precise financial data extraction and categorization assistant. Extract ALL transactions accurately and return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    console.log("[BANK-AI-EXTRACT] Raw AI response length:", content?.length);
    
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    let extractedData: { transactions: ExtractedTransaction[]; startDate?: string; endDate?: string };
    try {
      extractedData = JSON.parse(content);
      console.log("[BANK-AI-EXTRACT] Successfully parsed JSON directly");
    } catch (parseError) {
      console.log("[BANK-AI-EXTRACT] Direct JSON parse failed, trying to extract from markdown");
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[1]);
        console.log("[BANK-AI-EXTRACT] Successfully extracted JSON from markdown");
      } else {
        console.error("[BANK-AI-EXTRACT] Failed to parse response. Content preview:", content.substring(0, 500));
        throw new Error("Failed to parse JSON response from OpenAI");
      }
    }

    // Calculate summary
    const totalIncome = extractedData.transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalExpenses = extractedData.transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const result: BankStatementExtractionResult = {
      transactions: extractedData.transactions,
      startDate: extractedData.startDate,
      endDate: extractedData.endDate,
      totalTransactions: extractedData.transactions.length,
      summary: {
        totalIncome,
        totalExpenses,
        netChange: totalIncome - totalExpenses,
      },
    };

    console.log("[BANK-AI-EXTRACT] Successfully extracted transactions:", {
      total: result.totalTransactions,
      income: totalIncome,
      expenses: totalExpenses,
      dateRange: `${result.startDate} to ${result.endDate}`,
    });

    return result;
  } catch (error) {
    console.error("[BANK-AI-EXTRACT] Error extracting transactions with AI:", error);
    throw new Error("Failed to extract transactions with AI");
  }
}

/**
 * Process CSV transactions with AI categorization
 */
export async function processCSVWithAI(
  csvData: Array<Record<string, string>>
): Promise<BankStatementExtractionResult> {
  // Convert CSV rows to a structured text format for AI
  const transactionText = csvData.map((row, index) => {
    const keys = Object.keys(row);
    return `Transaction ${index + 1}: ${keys.map(key => `${key}: ${row[key]}`).join(', ')}`;
  }).join('\n');

  console.log("[BANK-CSV-AI] Processing CSV with AI. Rows:", csvData.length);
  
  return extractTransactionsWithAI(transactionText, "csv");
}

/**
 * Extract Uplisting booking report - creates TWO transactions per booking
 */
export async function extractUplistingReport(
  statementText: string,
  fileType: "pdf" | "csv" | "xlsx"
): Promise<BankStatementExtractionResult> {
  try {
    const prompt = `You are a financial transaction extraction expert for Uplisting booking reports. Extract ALL bookings and create TWO transactions per booking.

UPLISTING REPORT STRUCTURE:
- Booking references
- Guest names
- Property names/IDs
- Check-in and check-out dates
- Gross booking amount (total paid by guest)
- Management fee (your commission, usually a percentage)
- Net amount to owner (gross - management fee)
- Platform fees
- Cleaning fees collected

TRANSACTION EXTRACTION RULES:
For EACH booking, create TWO transactions:
1. RENTAL INCOME transaction:
   - type: "income"
   - category: "rental_income"
   - amount: POSITIVE number (gross booking amount)
   - description: "Booking [ref] - [Guest Name] - [Property Name]"
   - date: Check-in date or booking date
   
2. MANAGEMENT FEE transaction:
   - type: "expense"
   - category: "management_fees"
   - amount: NEGATIVE number (management fee charged)
   - description: "Management Fee - [Property Name] - [Booking ref]"
   - date: Same as rental income date

PROPERTY REFERENCE:
- Extract property names, addresses, or IDs from each booking

Return a JSON object with this EXACT structure:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number (positive for income, negative for expenses),
      "type": "income" | "expense",
      "suggestedCategory": "rental_income" | "management_fees",
      "propertyReference": "string or null",
      "confidence": number (0-1)
    }
  ],
  "startDate": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null"
}

IMPORTANT RULES:
1. Create EXACTLY TWO transactions per booking (income + management fee)
2. For rental income: amount POSITIVE, type "income", category "rental_income"
3. For management fees: amount NEGATIVE, type "expense", category "management_fees"
4. Use high confidence (0.9+) for clear booking data
5. Extract property references from booking details
6. Return ONLY valid JSON, no markdown, no explanations

Uplisting Report Text:
${statementText}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a precise Uplisting booking data extraction assistant. Extract ALL bookings and create income + management fee transactions. Return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 6000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    console.log("[UPLISTING-AI-EXTRACT] Raw AI response length:", content?.length);
    
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    let extractedData: { transactions: ExtractedTransaction[]; startDate?: string; endDate?: string };
    try {
      extractedData = JSON.parse(content);
      console.log("[UPLISTING-AI-EXTRACT] Successfully parsed JSON directly");
    } catch (parseError) {
      console.log("[UPLISTING-AI-EXTRACT] Direct JSON parse failed, trying to extract from markdown");
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[1]);
        console.log("[UPLISTING-AI-EXTRACT] Successfully extracted JSON from markdown");
      } else {
        console.error("[UPLISTING-AI-EXTRACT] Failed to parse response. Content preview:", content.substring(0, 500));
        throw new Error("Failed to parse JSON response from OpenAI");
      }
    }

    // Calculate summary
    const totalIncome = extractedData.transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalExpenses = extractedData.transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const result: BankStatementExtractionResult = {
      transactions: extractedData.transactions,
      startDate: extractedData.startDate,
      endDate: extractedData.endDate,
      totalTransactions: extractedData.transactions.length,
      summary: {
        totalIncome,
        totalExpenses,
        netChange: totalIncome - totalExpenses,
      },
    };

    console.log("[UPLISTING-AI-EXTRACT] Successfully extracted bookings:", {
      total: result.totalTransactions,
      bookings: result.totalTransactions / 2, // Each booking = 2 transactions
      income: totalIncome,
      managementFees: totalExpenses,
      dateRange: `${result.startDate} to ${result.endDate}`,
    });

    return result;
  } catch (error) {
    console.error("[UPLISTING-AI-EXTRACT] Error extracting Uplisting report:", error);
    throw new Error("Failed to extract Uplisting report with AI");
  }
}

/**
 * Main entry point for financial document extraction
 */
export async function extractBankStatement(
  buffer: Buffer,
  fileName: string
): Promise<BankStatementExtractionResult> {
  const fileExtension = fileName.toLowerCase().split('.').pop();
  
  console.log("[BANK-EXTRACT] Starting extraction for file:", fileName, "Type:", fileExtension);

  if (fileExtension === 'pdf') {
    const text = await extractTextFromPDF(buffer);
    return extractTransactionsWithAI(text, "pdf");
  } else if (fileExtension === 'csv') {
    const csvData = await parseCSVStatement(buffer);
    return processCSVWithAI(csvData);
  } else if (fileExtension === 'xlsx') {
    throw new Error("Excel format not yet supported. Please convert to CSV first.");
  } else {
    throw new Error(`Unsupported file type: ${fileExtension}. Please upload PDF or CSV.`);
  }
}

/**
 * Main entry point for Uplisting report extraction
 */
export async function extractUplistingDocument(
  buffer: Buffer,
  fileName: string
): Promise<BankStatementExtractionResult> {
  const fileExtension = fileName.toLowerCase().split('.').pop();
  
  console.log("[UPLISTING-EXTRACT] Starting extraction for file:", fileName, "Type:", fileExtension);

  if (fileExtension === 'pdf') {
    const text = await extractTextFromPDF(buffer);
    return extractUplistingReport(text, "pdf");
  } else if (fileExtension === 'csv') {
    const csvData = await parseCSVStatement(buffer);
    const transactionText = csvData.map((row, index) => {
      const keys = Object.keys(row);
      return `Booking ${index + 1}: ${keys.map(key => `${key}: ${row[key]}`).join(', ')}`;
    }).join('\n');
    return extractUplistingReport(transactionText, "csv");
  } else if (fileExtension === 'xlsx') {
    throw new Error("Excel format not yet supported. Please convert to CSV first.");
  } else {
    throw new Error(`Unsupported file type: ${fileExtension}. Please upload PDF or CSV.`);
  }
}
