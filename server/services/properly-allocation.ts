import type { IStorage } from "../storage";
import type { Staff } from "@shared/schema";

// Building rules and configuration
export const BUILDING_RULES = {
  "Building A": {
    maxRooms: 5,
    durationPerRoom: 45, // minutes
    preferredCleaners: ["Cleaner A", "Cleaner B", "Cleaner C"],
  },
  "Building B": {
    maxRooms: 4,
    durationPerRoom: 45,
    preferredCleaners: ["Cleaner A", "Cleaner B", "Cleaner C"],
  },
  "Building C": {
    maxRooms: 4,
    durationPerRoom: 60,
    preferredCleaners: ["Cleaner A", "Cleaner B", "Cleaner C"],
  },
} as const;

export type BuildingName = keyof typeof BUILDING_RULES;

interface TaskToAllocate {
  id: string;
  building: BuildingName;
  cleaningDate: string;
  roomUnit: string;
  estimatedDuration: number;
}

interface CleanerInfo {
  id: string;
  name: string;
  building: BuildingName;
  preferenceLevel: number;
  currentLoad: number; // number of rooms already assigned
  totalDuration: number; // total minutes assigned
}

/**
 * Intelligent cleaner allocation algorithm with canonical roster-based overflow
 * 
 * Business Rules (Using BUILDING_RULES Canonical Rosters):
 * - Building A cleaners (from BUILDING_RULES["Building A"].preferredCleaners) can ONLY work Building A (EXCLUSIVE)
 * - Building C cleaners (from BUILDING_RULES["Building C"].preferredCleaners) can work Building C OR help Building A
 * - Building B cleaners (from BUILDING_RULES["Building B"].preferredCleaners) can work anywhere (flexible)
 * - Other cleaners can help Building C and Building B (but NOT Building A)
 * 
 * Overflow Logic:
 * - Building A overflow: ONLY Building C cleaners can help (NOT Building B, NOT others)
 * - Building C overflow: Building B cleaners + general pool (NEVER Building A cleaners!)
 * - Building B overflow: Building C cleaners + general pool (NEVER Building A cleaners!)
 * 
 * Key Design:
 * - Building assignments are determined by BUILDING_RULES.preferredCleaners (immutable)
 * - Preference levels only affect priority WITHIN eligible cleaners
 * - Historical learning adjusts preference levels but cannot move cleaners between buildings
 * - Building A cleaners are NEVER allowed outside Building A (enforced exclusivity)
 * 
 * @param tasks - Tasks to allocate
 * @param building - Building name
 * @param cleaningDate - Date for cleaning
 * @param storage - Storage interface
 * @returns Map of task IDs to cleaner IDs
 */
export async function allocateCleaner(
  tasks: TaskToAllocate[],
  building: BuildingName,
  cleaningDate: string,
  storage: IStorage,
  existingAllocations: Map<string, number> = new Map() // cleanerId -> number of rooms already assigned
): Promise<Map<string, string>> {
  
  const allocations = new Map<string, string>();
  const buildingRules = BUILDING_RULES[building];
  
  // Get all staff
  const allStaff = await storage.getAllStaff();
  
  // Create canonical building assignment Sets (based on BUILDING_RULES, not mutable preferences)
  const dwellCleaners = new Set<string>();
  const stMarysCleaners = new Set<string>();
  const heritageCleaners = new Set<string>();
  
  for (const cleanerName of BUILDING_RULES["Building A"].preferredCleaners) {
    const staff = allStaff.find((s: any) => s.fullName === cleanerName);
    if (staff) dwellCleaners.add(staff.id);
  }
  
  for (const cleanerName of BUILDING_RULES["Building C"].preferredCleaners) {
    const staff = allStaff.find((s: any) => s.fullName === cleanerName);
    if (staff) stMarysCleaners.add(staff.id);
  }
  
  for (const cleanerName of BUILDING_RULES["Building B"].preferredCleaners) {
    const staff = allStaff.find((s: any) => s.fullName === cleanerName);
    if (staff) heritageCleaners.add(staff.id);
  }
  
  // Step 1: Get PRIMARY cleaners for this building (using canonical rosters)
  const primaryCleaners: CleanerInfo[] = [];
  const primarySet = building === 'Building A' ? dwellCleaners :
                     building === 'Building C' ? stMarysCleaners :
                     heritageCleaners;
  
  for (const staffId of primarySet) {
    const staff = allStaff.find((s: any) => s.id === staffId);
    if (!staff) continue;
    
    const isAvailable = await storage.checkCleanerAvailability(staffId, cleaningDate);
    if (isAvailable) {
      // Check preference level for priority ordering (doesn't affect eligibility)
      const prefs = await storage.getCleanerBuildingPreferences(building);
      const pref = prefs.find((p: any) => p.staffId === staffId);
      const preferenceLevel = pref?.preferenceLevel || 1;
      
      primaryCleaners.push({
        id: staff.id,
        name: staff.fullName,
        building,
        preferenceLevel,
        currentLoad: 0,
        totalDuration: 0,
      });
    }
  }
  
  // Step 2: Get OVERFLOW cleaners based on building rules
  const overflowCleaners: CleanerInfo[] = [];
  
  if (building === 'Building A') {
    // Building A overflow: ONLY Building C cleaners can help (NOT Building B, NOT others)
    for (const staffId of stMarysCleaners) {
      const staff = allStaff.find((s: any) => s.id === staffId);
      if (!staff) continue;
      
      const isAvailable = await storage.checkCleanerAvailability(staffId, cleaningDate);
      if (isAvailable) {
        overflowCleaners.push({
          id: staff.id,
          name: staff.fullName,
          building: 'Building A',
          preferenceLevel: 2, // Secondary priority
          currentLoad: 0,
          totalDuration: 0,
        });
      }
    }
  } else if (building === 'Building C') {
    // Building C overflow: Building B cleaners and general pool (NEVER Building A cleaners!)
    
    // First: Building B cleaners (priority 2)
    for (const staffId of heritageCleaners) {
      const staff = allStaff.find((s: any) => s.id === staffId);
      if (!staff) continue;
      
      const isAvailable = await storage.checkCleanerAvailability(staffId, cleaningDate);
      if (isAvailable) {
        overflowCleaners.push({
          id: staff.id,
          name: staff.fullName,
          building: 'Building C',
          preferenceLevel: 2,
          currentLoad: 0,
          totalDuration: 0,
        });
      }
    }
    
    // Second: General pool EXCLUDING Building A cleaners (priority 3)
    for (const staff of allStaff) {
      // Skip if already in primary or overflow
      if (primaryCleaners.some(c => c.id === staff.id)) continue;
      if (overflowCleaners.some(c => c.id === staff.id)) continue;
      
      // CRITICAL: Skip Building A-only cleaners
      if (dwellCleaners.has(staff.id)) continue;
      
      const isAvailable = await storage.checkCleanerAvailability(staff.id, cleaningDate);
      if (isAvailable) {
        overflowCleaners.push({
          id: staff.id,
          name: staff.fullName,
          building: 'Building C',
          preferenceLevel: 3,
          currentLoad: 0,
          totalDuration: 0,
        });
      }
    }
  } else if (building === 'Building B') {
    // Building B overflow: Building C and general pool (NEVER Building A cleaners!)
    
    // First: Building C cleaners (priority 2)
    for (const staffId of stMarysCleaners) {
      const staff = allStaff.find((s: any) => s.id === staffId);
      if (!staff) continue;
      
      const isAvailable = await storage.checkCleanerAvailability(staffId, cleaningDate);
      if (isAvailable) {
        overflowCleaners.push({
          id: staff.id,
          name: staff.fullName,
          building: 'Building B',
          preferenceLevel: 2,
          currentLoad: 0,
          totalDuration: 0,
        });
      }
    }
    
    // Second: General pool EXCLUDING Building A cleaners (priority 3)
    for (const staff of allStaff) {
      // Skip if already in primary or overflow
      if (primaryCleaners.some(c => c.id === staff.id)) continue;
      if (overflowCleaners.some(c => c.id === staff.id)) continue;
      
      // CRITICAL: Skip Building A-only cleaners
      if (dwellCleaners.has(staff.id)) continue;
      
      const isAvailable = await storage.checkCleanerAvailability(staff.id, cleaningDate);
      if (isAvailable) {
        overflowCleaners.push({
          id: staff.id,
          name: staff.fullName,
          building: 'Building B',
          preferenceLevel: 3,
          currentLoad: 0,
          totalDuration: 0,
        });
      }
    }
  }
  
  // Combine cleaners: primary first, then overflow
  const allCleaners = [...primaryCleaners, ...overflowCleaners];
  
  // Initialize loads from existing allocations
  for (const cleaner of allCleaners) {
    const existingLoad = existingAllocations.get(cleaner.id) || 0;
    cleaner.currentLoad = existingLoad;
  }
  
  // Step 3: Allocate tasks
  for (const task of tasks) {
    const available = allCleaners.filter(c => 
      c.currentLoad < buildingRules.maxRooms
    );
    
    if (available.length === 0) {
      console.warn(`No available cleaners for ${building} task ${task.id}`);
      continue;
    }
    
    // Sort by preference level (1=best), then by current load (balance)
    available.sort((a, b) => {
      if (a.preferenceLevel !== b.preferenceLevel) {
        return a.preferenceLevel - b.preferenceLevel;
      }
      return a.currentLoad - b.currentLoad;
    });
    
    const selected = available[0];
    allocations.set(task.id, selected.id);
    selected.currentLoad += 1;
    selected.totalDuration += task.estimatedDuration;
  }
  
  return allocations;
}

/**
 * Get allocation statistics for a given set of tasks and allocations
 */
export function getAllocationStats(
  tasks: TaskToAllocate[],
  allocations: Map<string, string>,
  cleaners: Staff[]
) {
  const cleanerStats = new Map<string, {
    name: string;
    tasksAssigned: number;
    totalDuration: number;
    rooms: string[];
  }>();
  
  for (const [taskId, cleanerId] of allocations.entries()) {
    const task = tasks.find(t => t.id === taskId);
    const cleaner = cleaners.find(c => c.id === cleanerId);
    
    if (!task || !cleaner) continue;
    
    if (!cleanerStats.has(cleanerId)) {
      cleanerStats.set(cleanerId, {
        name: cleaner.fullName,
        tasksAssigned: 0,
        totalDuration: 0,
        rooms: [],
      });
    }
    
    const stats = cleanerStats.get(cleanerId)!;
    stats.tasksAssigned += 1;
    stats.totalDuration += task.estimatedDuration;
    stats.rooms.push(task.roomUnit);
  }
  
  return Array.from(cleanerStats.entries()).map(([cleanerId, stats]) => ({
    cleanerId,
    ...stats,
  }));
}

/**
 * Adjust cleaner building preferences based on historical performance
 * 
 * This function learns from allocation history and automatically promotes
 * or demotes cleaners based on their performance scores and manual overrides.
 * 
 * Scoring system:
 * - Manual override: -5 points
 * - Performance score provided: 1-5 points
 * - Default (no score): 3 points
 * 
 * Preference levels:
 * - Score >= 20: Level 1 (Preferred)
 * - Score 0-19: Level 2 (Can work if needed)
 * - Score < 0: Level 3 (Emergency backup only)
 * 
 * @param building - Building name to adjust preferences for
 * @param storage - Storage interface
 */
export async function adjustPreferencesFromHistory(
  building: BuildingName,
  storage: IStorage
): Promise<void> {
  const history = await storage.getAllocationHistory({ building });
  
  // Calculate performance scores per cleaner
  const cleanerScores = new Map<string, number>();
  for (const record of history) {
    const currentScore = cleanerScores.get(record.cleanerId) || 0;
    const points = record.wasManuallyOverridden ? -5 : 
                   record.performanceScore ? record.performanceScore : 3;
    cleanerScores.set(record.cleanerId, currentScore + points);
  }
  
  // Update preference levels based on scores
  for (const [cleanerId, score] of cleanerScores.entries()) {
    let newLevel = 2; // default
    if (score >= 20) newLevel = 1; // promote to preferred
    if (score < 0) newLevel = 3; // demote to backup
    
    await storage.updateCleanerBuildingPreference(cleanerId, building, newLevel);
  }
}
