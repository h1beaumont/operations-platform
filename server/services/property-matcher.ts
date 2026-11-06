import { storage } from "../storage";

interface PropertyMatchInput {
  propertyId?: string;
  uplistingId?: string;
  address?: string;
  name?: string;
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Normalize whitespace
}

function calculateWordSimilarity(str1: string, str2: string): number {
  const words1 = new Set(normalizeString(str1).split(' '));
  const words2 = new Set(normalizeString(str2).split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  if (union.size === 0) return 0;
  
  return intersection.size / union.size;
}

function containsMatch(str1: string, str2: string): boolean {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  
  return normalized1.includes(normalized2) || normalized2.includes(normalized1);
}

export async function matchProperty(input: PropertyMatchInput): Promise<string | null> {
  console.log("[PROPERTY-MATCHER] Starting property match with input:", input);
  
  // Strategy 1: Exact ID match
  if (input.propertyId) {
    console.log("[PROPERTY-MATCHER] Attempting exact ID match:", input.propertyId);
    const property = await storage.getProperty(input.propertyId);
    if (property) {
      console.log("[PROPERTY-MATCHER] ✓ Exact ID match found:", property.id);
      return property.id;
    }
    console.log("[PROPERTY-MATCHER] ✗ Exact ID match failed");
  }
  
  // Strategy 2: Uplisting ID match
  if (input.uplistingId) {
    console.log("[PROPERTY-MATCHER] Attempting Uplisting ID match:", input.uplistingId);
    const property = await storage.findPropertyByUplistingId(input.uplistingId);
    if (property) {
      console.log("[PROPERTY-MATCHER] ✓ Uplisting ID match found:", property.id);
      return property.id;
    }
    console.log("[PROPERTY-MATCHER] ✗ Uplisting ID match failed");
  }
  
  // For strategies 3-4, we need all properties
  const allProperties = await storage.getProperties();
  console.log(`[PROPERTY-MATCHER] Loaded ${allProperties.length} properties for fuzzy matching`);
  
  // Strategy 3: Alias lookup
  if (input.name || input.address) {
    console.log("[PROPERTY-MATCHER] Attempting alias lookup");
    const searchTerms = [input.name, input.address].filter(Boolean) as string[];
    
    for (const property of allProperties) {
      const aliases = await storage.getPropertyAliases(property.id);
      
      for (const alias of aliases) {
        for (const searchTerm of searchTerms) {
          const normalized = normalizeString(searchTerm);
          const normalizedAlias = normalizeString(alias.aliasName);
          
          if (normalized === normalizedAlias) {
            console.log("[PROPERTY-MATCHER] ✓ Exact alias match found:", property.id, "via alias:", alias.aliasName);
            return property.id;
          }
        }
      }
    }
    console.log("[PROPERTY-MATCHER] ✗ Alias lookup failed");
  }
  
  // Strategy 4: Fuzzy address/name match
  if (input.address || input.name) {
    console.log("[PROPERTY-MATCHER] Attempting fuzzy match");
    const searchText = input.address || input.name || "";
    let bestMatch: { propertyId: string; score: number } | null = null;
    const SIMILARITY_THRESHOLD = 0.6; // 60% word overlap required
    
    for (const property of allProperties) {
      // Try matching against property name
      let nameScore = 0;
      if (property.name) {
        nameScore = calculateWordSimilarity(searchText, property.name);
        
        // Also check for substring match (stronger signal)
        if (containsMatch(searchText, property.name)) {
          nameScore = Math.max(nameScore, 0.75);
        }
      }
      
      // Try matching against property address
      let addressScore = 0;
      if (property.address) {
        addressScore = calculateWordSimilarity(searchText, property.address);
        
        // Also check for substring match (stronger signal)
        if (containsMatch(searchText, property.address)) {
          addressScore = Math.max(addressScore, 0.75);
        }
      }
      
      // Take the best score between name and address
      const score = Math.max(nameScore, addressScore);
      
      if (score >= SIMILARITY_THRESHOLD) {
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { propertyId: property.id, score };
          console.log(`[PROPERTY-MATCHER] Found potential match: ${property.name} (score: ${score.toFixed(2)})`);
        }
      }
    }
    
    if (bestMatch) {
      console.log("[PROPERTY-MATCHER] ✓ Fuzzy match found:", bestMatch.propertyId, "with score:", bestMatch.score.toFixed(2));
      return bestMatch.propertyId;
    }
    
    console.log("[PROPERTY-MATCHER] ✗ Fuzzy match failed (no match above threshold)");
  }
  
  // Strategy 5: Return null for manual assignment
  console.log("[PROPERTY-MATCHER] ✗ No match found, returning null for manual assignment");
  return null;
}
