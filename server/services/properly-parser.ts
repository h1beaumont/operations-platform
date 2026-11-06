import Papa from 'papaparse';
import { BUILDING_RULES, type BuildingName } from './properly-allocation';

export interface ParsedProperlyTask {
  cleaningDate: string;
  building: BuildingName | null;
  roomUnit: string;
  propertyName: string;
  rawData: any;
}

/**
 * Detect building from property or room name
 * 
 * Looks for building identifiers in the combined property and room text:
 * - "Building A" → Building A
 * - "Building B" → Building B
 * - "Building C" or "St. Marys" → Building C
 * 
 * @param propertyName - Full property name from CSV
 * @param roomUnit - Room number or unit name
 * @returns Detected building name or null if not found
 */
export function detectBuilding(propertyName: string, roomUnit: string): BuildingName | null {
  const combined = `${propertyName} ${roomUnit}`.toLowerCase();
  
  if (combined.includes('dwell')) return 'Building A';
  if (combined.includes('heritage')) return 'Building B';
  if (combined.includes('st marys') || combined.includes('st. marys') || combined.includes('st mary')) return 'Building C';
  
  return null;
}

/**
 * Smart column detection for CSV headers
 * 
 * Auto-detects likely columns based on common naming patterns:
 * - Date column: contains 'date', 'scheduled', or 'clean'
 * - Room column: contains 'room', 'unit', or 'apartment'
 * - Property column: contains 'property', 'building', or 'name'
 * 
 * @param headers - CSV column headers
 * @returns Detected column names
 */
export function detectColumns(headers: string[]): {
  dateColumn: string | null;
  roomColumn: string | null;
  propertyColumn: string | null;
} {
  const lowerHeaders = headers.map(h => h.toLowerCase());
  
  // Find date column
  const dateColumn = headers.find((h, i) => 
    lowerHeaders[i].includes('date') || 
    lowerHeaders[i].includes('scheduled') ||
    lowerHeaders[i].includes('clean')
  ) || null;
  
  // Find room column
  const roomColumn = headers.find((h, i) => 
    lowerHeaders[i].includes('room') || 
    lowerHeaders[i].includes('unit') ||
    lowerHeaders[i].includes('apartment') ||
    lowerHeaders[i].includes('id')
  ) || null;
  
  // Find property column
  const propertyColumn = headers.find((h, i) => 
    lowerHeaders[i].includes('property') || 
    lowerHeaders[i].includes('building') ||
    lowerHeaders[i].includes('name')
  ) || null;
  
  return { dateColumn, roomColumn, propertyColumn };
}

/**
 * Parse Properly cleaning schedule CSV
 * 
 * Flexible CSV parser that:
 * 1. Auto-detects column headers
 * 2. Extracts cleaning dates, properties, and rooms
 * 3. Identifies building from property/room names
 * 4. Provides warnings for missing or invalid data
 * 
 * @param csvContent - Raw CSV content as string
 * @returns Parsed tasks, detected columns, and warnings
 */
export function parseProperlyCSV(csvContent: string): {
  tasks: ParsedProperlyTask[];
  detectedColumns: {
    dateColumn: string | null;
    roomColumn: string | null;
    propertyColumn: string | null;
  };
  warnings: string[];
} {
  const warnings: string[] = [];
  const tasks: ParsedProperlyTask[] = [];
  
  // Parse CSV using PapaParse
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parsing errors: ${parsed.errors.map(e => e.message).join(', ')}`);
  }

  if (!parsed.data || parsed.data.length === 0) {
    throw new Error('CSV file is empty or could not be parsed');
  }

  const headers = Object.keys(parsed.data[0] || {});
  const detectedColumns = detectColumns(headers);
  
  if (!detectedColumns.dateColumn) {
    warnings.push("Could not auto-detect date column. Please verify dates.");
  }
  
  if (!detectedColumns.roomColumn) {
    warnings.push("Could not auto-detect room/unit column. Using fallback detection.");
  }
  
  if (!detectedColumns.propertyColumn) {
    warnings.push("Could not auto-detect property column. Using fallback detection.");
  }
  
  for (const row of parsed.data as any[]) {
    // Try to extract data using detected columns or fallbacks
    const propertyName = detectedColumns.propertyColumn ? row[detectedColumns.propertyColumn] : 
                        (row.name || row.property_name || row.short_name || row.property || "Unknown");
    const roomUnit = detectedColumns.roomColumn ? row[detectedColumns.roomColumn] : 
                    (row.room || row.unit || row.id || row.apartment || "Unknown");
    const dateValue = detectedColumns.dateColumn ? row[detectedColumns.dateColumn] : 
                     (row.date || row.scheduled_date || row.cleaning_date || "");
    
    // Skip rows with missing critical data
    if (!propertyName || propertyName === "Unknown") {
      warnings.push(`Skipping row with missing property name`);
      continue;
    }
    
    if (!roomUnit || roomUnit === "Unknown") {
      warnings.push(`Skipping row with missing room/unit for property: ${propertyName}`);
      continue;
    }
    
    // Detect building
    const building = detectBuilding(propertyName, roomUnit);
    
    if (!building) {
      warnings.push(`Could not identify building for: ${propertyName} - ${roomUnit}`);
      continue;
    }
    
    // Extract date (YYYY-MM-DD format)
    let cleaningDate = "";
    if (dateValue) {
      try {
        const parsedDate = new Date(dateValue);
        if (isNaN(parsedDate.getTime())) {
          warnings.push(`Invalid date format: ${dateValue} for ${propertyName} - ${roomUnit}`);
          continue;
        }
        cleaningDate = parsedDate.toISOString().split('T')[0];
      } catch {
        warnings.push(`Invalid date format: ${dateValue} for ${propertyName} - ${roomUnit}`);
        continue;
      }
    } else {
      warnings.push(`Missing date for ${propertyName} - ${roomUnit}, using today's date`);
      cleaningDate = new Date().toISOString().split('T')[0];
    }
    
    tasks.push({
      cleaningDate,
      building,
      roomUnit,
      propertyName,
      rawData: row,
    });
  }
  
  return { tasks, detectedColumns, warnings };
}
