import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractedStatementData {
  statementNumber?: string;
  statementDate?: string;
  statementPeriod?: { start: string; end: string };
  propertyAddress?: string;
  propertyName?: string;
  totalNights?: number;
  totalRevenue?: number;
  managementFees?: number;
  channelCommission?: number;
  ownerPayout?: number;
  bookings?: Array<{
    guestName: string;
    channel: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    accommodation: number;
    cleaningFee: number;
    extraCharges: number;
    total: number;
  }>;
  expenses?: Array<{
    description: string;
    amount: number;
  }>;
}

export async function extractStatementDataFromPDF(
  pdfBuffer: Buffer
): Promise<ExtractedStatementData> {
  // Dynamic import for ESM compatibility - pdf-parse exports function directly
  const pdfParse = await import('pdf-parse') as any;
  const parsedPDF = await pdfParse(pdfBuffer);
  const pdfText = parsedPDF.text;

  const prompt = `You are a financial data extraction specialist. Extract structured data from this landlord/client property management statement.

Extract the following information:

1. **Statement Metadata:**
   - Statement number
   - Statement date
   - Statement period (start and end dates)

2. **Property Information:**
   - Property address
   - Property name/identifier (e.g., "COACHHMAG", "Studio 6")

3. **Financial Summary:**
   - Total nights booked (sum of all booking nights)
   - Total revenue (from "Total Revenue" section)
   - Management fees (from "Management fee" or "Management Fees")
   - Channel commission (from "Channel commission" or booking fees)
   - Owner payout (final amount paid to owner)

4. **Individual Bookings:**
   For each booking, extract:
   - Guest name
   - Booking channel (e.g., "Airbnb", "Booking.com")
   - Check-in date
   - Check-out date
   - Number of nights
   - Accommodation amount
   - Cleaning fee
   - Extra charges
   - Total booking payout

5. **Other Expenses:**
   Extract any expense items with description and amount

**Important Guidelines:**
- Extract amounts as numbers WITHOUT currency symbols
- Dates should be in YYYY-MM-DD format
- If a field is not present, omit it from the response
- Sum up total nights from all bookings
- Guest names are usually at the start of each booking line

PDF Content:
${pdfText}

Respond ONLY with valid JSON matching this structure (no markdown, no explanations):
{
  "statementNumber": "string",
  "statementDate": "YYYY-MM-DD",
  "statementPeriod": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "propertyAddress": "string",
  "propertyName": "string",
  "totalNights": number,
  "totalRevenue": number,
  "managementFees": number,
  "channelCommission": number,
  "ownerPayout": number,
  "bookings": [
    {
      "guestName": "string",
      "channel": "string",
      "checkIn": "YYYY-MM-DD",
      "checkOut": "YYYY-MM-DD",
      "nights": number,
      "accommodation": number,
      "cleaningFee": number,
      "extraCharges": number,
      "total": number
    }
  ],
  "expenses": [
    {
      "description": "string",
      "amount": number
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a precise data extraction assistant. Extract financial data from property management statements and respond ONLY with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("No response from OpenAI");
    }

    // Clean and parse JSON response
    let parsed: any;
    try {
      const cleanedContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('[Statement Extraction] JSON parse error:', parseError);
      console.error('[Statement Extraction] Raw content:', rawContent.substring(0, 500));
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
    }

    const extractedData: ExtractedStatementData = parsed;
    return extractedData;
  } catch (error) {
    console.error("Error extracting statement data:", error);
    throw new Error(`Failed to extract statement data: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}