import type { IStorage } from "../storage";
import type { Contractor, Property } from "@shared/schema";

/**
 * Map service types to contractor specialties
 */
const SERVICE_TYPE_TO_SPECIALTY: Record<string, string[]> = {
  "electrician": ["electrical", "electrician"],
  "plumber": ["plumbing", "plumber"],
  "locksmith": ["locksmith", "lock", "security"],
  "waste_disposal": ["waste", "waste_disposal", "rubbish", "disposal"],
  "hvac": ["hvac", "heating", "cooling", "air_conditioning"],
  "general": ["general", "handyman", "maintenance"],
  "appliance_repair": ["appliance", "appliances", "repair"],
  "pest_control": ["pest", "pest_control", "exterminator"],
  "cleaning": ["cleaning", "deep_cleaning", "professional_cleaning"],
  "gardening": ["gardening", "landscaping", "grounds"],
  "painting": ["painting", "decorator"],
  "flooring": ["flooring", "carpet", "hardwood"],
};

/**
 * Suggests the best contractor for a maintenance request based on:
 * 1. Service type matching contractor specialties
 * 2. Property location matching contractor assignments
 * 3. Contractor priority and rating
 * 
 * @param serviceType - The type of service needed
 * @param propertyId - The property requiring service
 * @param storage - Storage instance
 * @returns The best matching contractor ID or null if no match found
 */
export async function suggestContractor(
  serviceType: string,
  propertyId: string,
  storage: IStorage
): Promise<string | null> {
  try {
    // Get the property to determine location group
    const property = await storage.getProperty(propertyId);
    if (!property) {
      console.warn(`[Contractor Suggestion] Property not found: ${propertyId}`);
      return null;
    }

    // Get all active contractors
    const allContractors = await storage.getContractors({ isActive: true });
    if (allContractors.length === 0) {
      console.warn(`[Contractor Suggestion] No active contractors found`);
      return null;
    }

    // Get matching specialties for the service type
    const relevantSpecialties = SERVICE_TYPE_TO_SPECIALTY[serviceType] || [];
    if (relevantSpecialties.length === 0) {
      console.warn(`[Contractor Suggestion] No specialties mapped for service type: ${serviceType}`);
      return null;
    }

    console.log(`[Contractor Suggestion] Looking for contractors with specialties: ${relevantSpecialties.join(", ")}`);

    // Filter and score contractors
    const scoredContractors = allContractors
      .map(contractor => {
        let score = 0;

        // Score 1: Specialty match (0-100 points)
        const hasMatchingSpecialty = contractor.specialties?.some(specialty =>
          relevantSpecialties.some(relevant =>
            specialty.toLowerCase().includes(relevant.toLowerCase())
          )
        );
        if (hasMatchingSpecialty) {
          score += 100;
        }

        // Score 2: Location match (0-50 points)
        const propertyLocationGroupId = property.locationGroupId;
        const isAssignedToLocation = contractor.assignedLocationGroupIds?.includes(propertyLocationGroupId || '');
        const isAssignedToProperty = contractor.assignedPropertyIds?.includes(propertyId);
        
        if (isAssignedToProperty) {
          score += 50; // Exact property match
        } else if (isAssignedToLocation && propertyLocationGroupId) {
          score += 30; // Location group match
        }

        // Score 3: Priority (0-10 points)
        score += (contractor.priority || 5);

        // Score 4: Rating (0-5 points)
        score += (contractor.rating || 0);

        return {
          contractor,
          score,
          hasSpecialtyMatch: hasMatchingSpecialty,
          hasLocationMatch: isAssignedToProperty || isAssignedToLocation,
        };
      })
      .filter(item => item.hasSpecialtyMatch) // Only contractors with matching specialty
      .sort((a, b) => b.score - a.score); // Sort by score descending

    if (scoredContractors.length === 0) {
      console.warn(`[Contractor Suggestion] No contractors found matching service type: ${serviceType}`);
      return null;
    }

    const bestMatch = scoredContractors[0];
    console.log(`[Contractor Suggestion] Best match: ${bestMatch.contractor.name} (Score: ${bestMatch.score})`);

    return bestMatch.contractor.id;
  } catch (error) {
    console.error(`[Contractor Suggestion] Error suggesting contractor:`, error);
    return null;
  }
}

/**
 * Get human-readable explanation for why a contractor was suggested
 */
export async function getContractorSuggestionReason(
  contractorId: string,
  serviceType: string,
  propertyId: string,
  storage: IStorage
): Promise<string> {
  try {
    const contractor = await storage.getContractor(contractorId);
    const property = await storage.getProperty(propertyId);
    
    if (!contractor || !property) {
      return "Auto-selected based on service type";
    }

    const reasons: string[] = [];

    // Check specialty match
    const relevantSpecialties = SERVICE_TYPE_TO_SPECIALTY[serviceType] || [];
    const hasMatchingSpecialty = contractor.specialties?.some(specialty =>
      relevantSpecialties.some(relevant =>
        specialty.toLowerCase().includes(relevant.toLowerCase())
      )
    );
    
    if (hasMatchingSpecialty) {
      const matchedSpecialty = contractor.specialties?.find(specialty =>
        relevantSpecialties.some(relevant =>
          specialty.toLowerCase().includes(relevant.toLowerCase())
        )
      );
      reasons.push(`Specializes in ${matchedSpecialty}`);
    }

    // Check location match
    const isAssignedToProperty = contractor.assignedPropertyIds?.includes(propertyId);
    const isAssignedToLocation = contractor.assignedLocationGroupIds?.includes(property.locationGroupId || '');
    
    if (isAssignedToProperty) {
      reasons.push(`Assigned to this property`);
    } else if (isAssignedToLocation) {
      reasons.push(`Assigned to this location group`);
    }

    // Add rating if high
    if (contractor.rating && contractor.rating >= 4.5) {
      reasons.push(`Highly rated (${contractor.rating}/5)`);
    }

    if (reasons.length === 0) {
      return "Auto-selected based on availability";
    }

    return reasons.join(" • ");
  } catch (error) {
    console.error(`[Contractor Suggestion] Error getting suggestion reason:`, error);
    return "Auto-selected";
  }
}
