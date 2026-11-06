import OpenAI from "openai";
import { Storage } from "../storage";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateEmailParams {
  landlordName: string;
  propertyAddress: string;
  month: number;
  year: number;
  extractedData: any;
  maintenanceRequests: any[];
  reviews: any[];
  inspections: any[];
}

interface GeneratedEmail {
  subject: string;
  body: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export async function generateComprehensiveLandlordEmail(
  params: GenerateEmailParams
): Promise<GeneratedEmail> {
  const {
    landlordName,
    propertyAddress,
    month,
    year,
    extractedData,
    maintenanceRequests,
    reviews,
    inspections,
  } = params;

  const monthName = MONTH_NAMES[month - 1];

  const maintenanceContext = maintenanceRequests.length > 0
    ? `**Maintenance Work Performed:**
${maintenanceRequests.map((req, i) => `
${i + 1}. **${req.title}**
   - Status: ${req.status}
   - Priority: ${req.priority}
   - Cost: £${req.actualCost || req.estimatedCost || 0}
   - Description: ${req.description || "N/A"}
   - Reported: ${new Date(req.reportedDate).toLocaleDateString()}
`).join("\n")}`
    : "No maintenance work was required this month.";

  const reviewsContext = reviews.length > 0
    ? `**Guest Reviews:**
${reviews.map((review, i) => `
${i + 1}. **${review.type === "complaint" ? "Complaint" : "Review"}** - ${review.sentiment || "Neutral"} (Score: ${review.sentimentScore || "N/A"})
   - Date: ${new Date(review.createdAt).toLocaleDateString()}
   - Content: "${review.content}"
   - ${review.response ? `Response: "${review.response}"` : "No response yet"}
`).join("\n")}`
    : "No guest reviews received this month.";

  const inspectionsContext = inspections.length > 0
    ? `**Property Inspections:**
${inspections.map((insp, i) => `
${i + 1}. **Inspection on ${new Date(insp.inspectionDate).toLocaleDateString()}**
   - Overall Score: ${insp.overallScore}% Good
   - Inspector: ${insp.inspectorName || "N/A"}
   - ${insp.totalIssues > 0 ? `Issues Found: ${insp.totalIssues}` : "No issues found"}
   - Last Cleaner: ${insp.lastCleanerName || "N/A"}
`).join("\n")}`
    : "No inspections were conducted this month.";

  const prompt = `You are writing a professional, warm, and comprehensive email to a landlord about their monthly property management statement.

**Landlord Details:**
- Name: ${landlordName}
- Property: ${propertyAddress}
- Statement Period: ${monthName} ${year}

**Financial Summary from Statement:**
- Total Nights Booked: ${extractedData?.totalNights || "N/A"}
- Total Revenue: £${extractedData?.totalRevenue || "0"}
- Management Fees: £${extractedData?.managementFees || "0"}
- Channel Commission: £${extractedData?.channelCommission || "0"}
- Owner Payout: £${extractedData?.ownerPayout || "0"}

${extractedData?.bookings && extractedData.bookings.length > 0 ? `
**Bookings Breakdown:**
${extractedData.bookings.map((b: any, i: number) => `${i + 1}. ${b.guestName} via ${b.channel} - ${b.nights} night${b.nights > 1 ? 's' : ''} (${b.checkIn} to ${b.checkOut})`).join("\n")}
` : ""}

${maintenanceContext}

${reviewsContext}

${inspectionsContext}

**Email Requirements:**

1. **Subject Line:**
   - Professional and clear (e.g., "Your ${monthName} ${year} Statement - ${propertyAddress}")

2. **Email Body Structure:**
   - Warm greeting addressing the landlord by name
   - **Performance Summary**: Highlight the key metrics (nights booked, revenue, occupancy)
   - **Financial Breakdown**: Explain the payout calculation clearly
   - **Maintenance & Property Care**: If maintenance was performed, explain what was done and costs deducted
   - **Guest Feedback**: Mention any reviews/complaints and how they were handled
   - **Property Inspections**: Reference any inspection results and cleanliness scores
   - **Looking Forward**: Brief positive note about next month
   - Professional closing

3. **Tone:**
   - Professional yet friendly
   - Transparent about all costs and deductions
   - Highlight positives (good reviews, high occupancy, clean inspections)
   - Acknowledge challenges (complaints, maintenance issues) professionally
   - Build trust and confidence

4. **Format:**
   - Use clear sections with headings
   - Keep it concise but comprehensive
   - Make it easy to scan
   - HTML formatting with proper line breaks

Generate the email in HTML format with proper structure. Respond with JSON:
{
  "subject": "subject line here",
  "body": "full HTML email body here"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional property management communication specialist. Write clear, warm, and comprehensive emails to landlords.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result: GeneratedEmail = JSON.parse(content);
    return result;
  } catch (error) {
    console.error("Error generating landlord email:", error);
    throw new Error(`Failed to generate email: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function fetchContextForStatement(
  storage: Storage,
  landlordId: number,
  propertyAddress: string,
  month: number,
  year: number
): Promise<{
  maintenanceRequests: any[];
  reviews: any[];
  inspections: any[];
}> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Fetch maintenance requests for this landlord in this period
  const maintenance = await storage.getMaintenanceForLandlord(
    landlordId,
    startDate,
    endDate
  );

  // Fetch reviews for properties owned by this landlord in this period
  // (We'll need to match property address or implement a better property linking system)
  const allReviews = await storage.getReviewsAndComplaints({});
  const reviews = allReviews.filter(r => {
    const reviewDate = new Date(r.createdAt);
    return reviewDate >= startDate && reviewDate <= endDate;
    // TODO: Filter by property address when property linking is implemented
  });

  // Fetch RentCheck inspections for this property in this period
  const allInspections = await storage.getRentCheckInspections({});
  const inspections = allInspections.filter(insp => {
    const inspDate = new Date(insp.inspectionDate);
    // Fuzzy match property address
    const addressMatch = insp.propertyAddress?.toLowerCase().includes(propertyAddress.toLowerCase()) ||
                        propertyAddress.toLowerCase().includes(insp.propertyAddress?.toLowerCase() || "");
    return inspDate >= startDate && inspDate <= endDate && addressMatch;
  });

  return {
    maintenanceRequests: maintenance || [],
    reviews: reviews || [],
    inspections: inspections || [],
  };
}
