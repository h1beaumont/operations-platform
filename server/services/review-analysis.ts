import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface DetectedTheme {
  theme: string;
  confidence: number;
}

export const AVAILABLE_THEMES = [
  "cleanliness",
  "location",
  "value_for_money",
  "communication",
  "amenities",
  "noise",
  "check_in_out",
  "maintenance",
] as const;

export type ThemeType = typeof AVAILABLE_THEMES[number];

/**
 * Analyze a review or complaint text and detect relevant themes using OpenAI
 * @param reviewText The full text content of the review/complaint
 * @param reviewTitle The title of the review/complaint
 * @param rating Optional rating (1-5)
 * @returns Array of detected themes with confidence scores
 */
export async function analyzeReviewThemes(
  reviewText: string,
  reviewTitle: string,
  rating?: number | null
): Promise<DetectedTheme[]> {
  try {
    const prompt = `You are a review analysis assistant for a serviced accommodation property management company. Analyze the following guest review/complaint and categorize it into one or more relevant themes.

**Available Themes:**
1. **cleanliness** - Issues or comments about property cleanliness, hygiene, cleaning quality
2. **location** - Comments about property location, neighborhood, accessibility, parking
3. **value_for_money** - Comments about pricing, value, worth, cost-effectiveness
4. **communication** - Issues about host communication, responsiveness, information provided
5. **amenities** - Comments about facilities, equipment, appliances, WiFi, utilities
6. **noise** - Complaints about noise levels, soundproofing, disturbances
7. **check_in_out** - Issues with check-in/check-out process, access, keys, instructions
8. **maintenance** - Issues with property maintenance, repairs, broken items, wear and tear

**Review Title:** ${reviewTitle}
**Review Content:** ${reviewText}
${rating ? `**Rating:** ${rating}/5 stars` : ''}

Analyze this review and return a JSON array of themes that are relevant. For each theme:
- Include only themes that are actually mentioned or clearly implied in the review
- Assign a confidence score between 0.0 and 1.0 (1.0 = very confident, 0.5 = somewhat relevant, 0.7+ = clearly mentioned)
- A review can have multiple themes if it discusses multiple topics
- Return an empty array if no specific themes are mentioned (generic reviews)

Return the data as a JSON array in this exact format:
[
  {
    "theme": "cleanliness",
    "confidence": 0.95
  },
  {
    "theme": "communication",
    "confidence": 0.80
  }
]

Guidelines:
- Only include themes with confidence >= 0.5
- Higher ratings (4-5 stars) discussing a topic suggest positive aspects
- Lower ratings (1-2 stars) discussing a topic suggest problems
- Be specific - don't add themes that aren't mentioned
- Generic praise/complaints without specifics should result in fewer or no themes`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing guest reviews and categorizing them into themes. Always return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content?.trim();
    if (!content) {
      console.warn("[Theme Analysis] Empty response from OpenAI");
      return [];
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("[Theme Analysis] Failed to parse OpenAI response:", content);
      return [];
    }

    // Handle both array and object with array property
    let themes: DetectedTheme[] = [];
    if (Array.isArray(parsed)) {
      themes = parsed;
    } else if (parsed.themes && Array.isArray(parsed.themes)) {
      themes = parsed.themes;
    } else {
      console.warn("[Theme Analysis] Unexpected response format:", parsed);
      return [];
    }

    // Validate themes
    const validatedThemes = themes
      .filter((t: any) => {
        if (!t.theme || !AVAILABLE_THEMES.includes(t.theme)) {
          console.warn(`[Theme Analysis] Invalid theme: ${t.theme}`);
          return false;
        }
        if (typeof t.confidence !== 'number' || t.confidence < 0.5 || t.confidence > 1.0) {
          console.warn(`[Theme Analysis] Invalid confidence for ${t.theme}: ${t.confidence}`);
          return false;
        }
        return true;
      })
      .map((t: any) => ({
        theme: t.theme,
        confidence: t.confidence,
      }));

    console.log(`[Theme Analysis] Detected ${validatedThemes.length} themes:`, validatedThemes);
    return validatedThemes;
  } catch (error) {
    console.error("[Theme Analysis] Error analyzing review themes:", error);
    throw new Error(`Failed to analyze review themes: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Batch analyze multiple reviews
 * @param reviews Array of reviews with id, title, content, and optional rating
 * @returns Map of review IDs to detected themes
 */
export async function batchAnalyzeReviewThemes(
  reviews: Array<{ id: string; title: string; content: string; rating?: number | null }>
): Promise<Map<string, DetectedTheme[]>> {
  const results = new Map<string, DetectedTheme[]>();
  
  console.log(`[Batch Theme Analysis] Starting analysis of ${reviews.length} reviews`);
  
  // Process reviews sequentially to avoid rate limiting
  // In production, you might want to implement batch processing with delays
  for (const review of reviews) {
    try {
      const themes = await analyzeReviewThemes(review.content, review.title, review.rating);
      results.set(review.id, themes);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[Batch Theme Analysis] Failed to analyze review ${review.id}:`, error);
      results.set(review.id, []);
    }
  }
  
  console.log(`[Batch Theme Analysis] Completed analysis of ${reviews.length} reviews`);
  return results;
}
