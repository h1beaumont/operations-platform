import type { InsertLinenPackingItem } from "@shared/schema";
import Papa from "papaparse";
import fs from "fs";

interface LinenCSVRow {
  tables_record_id: string;
  tables_created_at: string;
  tables_updated_at: string;
  "Property Address": string;
  "Item Type": string;
  "Item Quantity": string;
  "Column 4": string;
  "Column 5": string;
}

/**
 * Parses the linen packing CSV file and returns structured data
 */
export async function parseLinenPackingCSV(csvContent: string): Promise<InsertLinenPackingItem[]> {
  return new Promise((resolve, reject) => {
    const items: InsertLinenPackingItem[] = [];

    Papa.parse<LinenCSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        for (const row of results.data) {
          // Skip rows with no property address or item type
          if (!row["Property Address"] || !row["Item Type"]) {
            continue;
          }

          const propertyAddress = row["Property Address"].trim();
          const itemType = row["Item Type"].trim();
          const quantity = row["Item Quantity"] ? parseFloat(row["Item Quantity"]) : 0;

          // Skip if quantity is 0 or NaN
          if (!quantity || quantity <= 0) {
            continue;
          }

          items.push({
            propertyAddress,
            itemType,
            quantity: quantity.toString(), // numeric type is stored as string
            notes: null,
          });
        }

        console.log(`[LINEN-IMPORTER] Successfully parsed ${items.length} items from CSV`);
        resolve(items);
      },
      error: (error) => {
        console.error("[LINEN-IMPORTER] Error parsing CSV:", error);
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

/**
 * Reads and parses the linen packing CSV file
 */
export async function importLinenPackingCSV(filePath: string): Promise<InsertLinenPackingItem[]> {
  try {
    console.log(`[LINEN-IMPORTER] Reading CSV file: ${filePath}`);
    const csvContent = fs.readFileSync(filePath, "utf-8");
    
    const items = await parseLinenPackingCSV(csvContent);
    return items;
  } catch (error) {
    console.error("[LINEN-IMPORTER] Error importing CSV:", error);
    throw error;
  }
}

/**
 * Get unique property addresses from items
 */
export function getUniqueProperties(items: InsertLinenPackingItem[]): string[] {
  const properties = new Set<string>();
  items.forEach(item => properties.add(item.propertyAddress));
  return Array.from(properties).sort();
}

/**
 * Get all unique item types
 */
export function getUniqueItemTypes(items: InsertLinenPackingItem[]): string[] {
  const types = new Set<string>();
  items.forEach(item => types.add(item.itemType));
  return Array.from(types).sort();
}
