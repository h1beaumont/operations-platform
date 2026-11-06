import type { InsertCriticalInfo } from "@shared/schema";

interface ParsedLockboxData {
  propertyName: string;
  mainEntrance?: string;
  apartmentLockbox?: string;
  backup?: string;
  additionalNotes?: string;
}

/**
 * Parses lockbox codes from the property access codes document
 * Returns structured data ready for bulk import into critical info
 */
export function parseLockboxCodes(textContent: string, userEmail: string): InsertCriticalInfo[] {
  const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results: InsertCriticalInfo[] = [];
  
  // Property patterns to extract
  const propertyData: ParsedLockboxData[] = [
    { propertyName: "25 Swallow Gardens", apartmentLockbox: "3542" },
    { propertyName: "18 Commerce Square", apartmentLockbox: "5142", backup: "0" },
    { propertyName: "4BYARD", apartmentLockbox: "3812", backup: "1955" },
    { propertyName: "Apt 1, Wheelergate", mainEntrance: "keypad 2588", apartmentLockbox: "814" },
    { propertyName: "Apt 10, Wheelergate", mainEntrance: "keypad 2588", apartmentLockbox: "5281" },
    { propertyName: "186MELTON", apartmentLockbox: "1474" },
    { propertyName: "The Knitter House", mainEntrance: "Gate Entry Key: 1818", apartmentLockbox: "Smart Lock: 2368#" },
    { propertyName: "17KINGGEORGE", apartmentLockbox: "2006" },
    { propertyName: "Stanley House", mainEntrance: "Gate Code: CLEAR 1597", apartmentLockbox: "4679", backup: "Back Door Code: CLEAR" },
    { propertyName: "Apartment 57 Crusader House", mainEntrance: "3067", apartmentLockbox: "keypad 01258" },
    { propertyName: "86 PARKWEST", mainEntrance: "keypad 01258", apartmentLockbox: "keypad 01598" },
    { propertyName: "Apt 31, Stoneyard", apartmentLockbox: "4136" },
    { propertyName: "Apartment 4, The Picturehouse", mainEntrance: "Gate Code: *1066", apartmentLockbox: "1186" },
    { propertyName: "55 Morley", apartmentLockbox: "1869" },
    { propertyName: "513 Marco Island", mainEntrance: "Intercom Code: 513", apartmentLockbox: "1830" },
    { propertyName: "1BCAV", apartmentLockbox: "3099" },
    { propertyName: "COACHHMAG", mainEntrance: "Gate Code: 0704#", apartmentLockbox: "1660" },
    { propertyName: "The Coach House", apartmentLockbox: "6857" },
    { propertyName: "30 Mag", mainEntrance: "Front door 0602y", apartmentLockbox: "604" },
    { propertyName: "25 Bridlesmith Gate Apartment 1", mainEntrance: "Intercom Code: 07810", apartmentLockbox: "6070" },
    { propertyName: "25 Bridlesmith Gate Apartment 2", mainEntrance: "Intercom Code: 07810", apartmentLockbox: "6487" },
    { propertyName: "Parliament APT 2 Parliament House", apartmentLockbox: "2703", backup: "2703 Z" },
    { propertyName: "Parliament St, FLAT 2 LIBERTYS", mainEntrance: "Keypad code: 8585", apartmentLockbox: "9595", backup: "2703 Z" },
    { propertyName: "Parliament St, FLAT 12 LIBERTYS", mainEntrance: "Keypad code: 8585", apartmentLockbox: "9630", backup: "2703 Z" },
    { propertyName: "Parliament St FLAT 8 LIBERTYS", mainEntrance: "Keypad code: 8585", apartmentLockbox: "8546", backup: "2703 Z" },
    { propertyName: "Graduation Studios", mainEntrance: "CODE 3725 ENTER", backup: "Masterkey: C2703" },
    { propertyName: "Graduation Studios 36", mainEntrance: "CODE 3725 ENTER", apartmentLockbox: "6233", backup: "Masterkey: C2703" },
    { propertyName: "FLAT1DAGMAR", mainEntrance: "Keypad: 0201#", apartmentLockbox: "0201#" },
    { propertyName: "Flat2DAGMAR", mainEntrance: "Keypad: 0212#" },
    { propertyName: "Flat3DAGMAR", apartmentLockbox: "Smart lock code: 0223#" },
    { propertyName: "BridlesmithAPT1", mainEntrance: "Gate Code: C139, Fob: 0872", apartmentLockbox: "7512", backup: "C2570X" },
    { propertyName: "BridlesmithAPT4", mainEntrance: "Gate Code: C139, Fob: 6948", apartmentLockbox: "6948", backup: "C2570X" },
    { propertyName: "BridlesmithAPT6", mainEntrance: "Gate Code: C139, Fob: 0872", apartmentLockbox: "1811", backup: "C2570X" },
    { propertyName: "BridlesmithAPT8", mainEntrance: "Gate Code: C139, Fob: 0872", apartmentLockbox: "3111", backup: "C2570X" },
    { propertyName: "BridlesmithAPT9", mainEntrance: "Gate Code: C139, Fob: 0872", apartmentLockbox: "7212", backup: "C2570X" },
    { propertyName: "HICKING5", mainEntrance: "keypad 02156", apartmentLockbox: "2565" },
    { propertyName: "16HICK", mainEntrance: "keypad 02156", apartmentLockbox: "2246" },
    { propertyName: "HICKING50", mainEntrance: "keypad 02156", apartmentLockbox: "8082" },
    { propertyName: "HICKING6", mainEntrance: "keypad 02156", apartmentLockbox: "2066" },
    { propertyName: "F1B2HICKING", apartmentLockbox: "lockbox A 8776" },
    { propertyName: "Building C Apartment 3", mainEntrance: "keypad 3465#", apartmentLockbox: "keypad C7283y" },
    { propertyName: "Building C Apartment 4", mainEntrance: "keypad 3465#", apartmentLockbox: "keypad 3399" },
    { propertyName: "Building C Apartment 7", mainEntrance: "keypad 3465#", apartmentLockbox: "3552" },
    { propertyName: "Building C Apartment 8", mainEntrance: "keypad 3465#", apartmentLockbox: "5150" },
    { propertyName: "Building C Apartment 9", mainEntrance: "keypad 3465#", apartmentLockbox: "5741" },
    { propertyName: "Varsity Studio 1", mainEntrance: "C1246", apartmentLockbox: "1579" },
    { propertyName: "Varsity Studio 2", mainEntrance: "C1246", apartmentLockbox: "2348" },
    { propertyName: "Varsity Studio 3", mainEntrance: "C1246", apartmentLockbox: "7762" },
    { propertyName: "Varsity Studio 4", mainEntrance: "C1246", apartmentLockbox: "(0)410" },
    { propertyName: "32 Clifton", mainEntrance: "lockbox: 2355", apartmentLockbox: "combi lock: C1973" },
    { propertyName: "33 Clifton", apartmentLockbox: "5823" },
    { propertyName: "Flat 1 11 Market Street", mainEntrance: "Main Door Code: C1289", apartmentLockbox: "1990", backup: "2702" },
    { propertyName: "Flat 2 11 Market Street", mainEntrance: "Main Door Code: C1289", apartmentLockbox: "2170", backup: "2702" },
    { propertyName: "Flat 3 11 Market Street", mainEntrance: "Main Door Code: C1289", apartmentLockbox: "4785", backup: "2702" },
    { propertyName: "Flat 4 11 Market Street", mainEntrance: "Main Door Code: C1289", apartmentLockbox: "5890", backup: "2702" },
    { propertyName: "Flat 5 11 Market Street", mainEntrance: "Main Door Code: C1289", apartmentLockbox: "(0)504", backup: "2702" },
    { propertyName: "FLAT 1 MARKETSTREET15", mainEntrance: "9865#", apartmentLockbox: "2021" },
    { propertyName: "FLAT 2 MARKETSTREET15", mainEntrance: "9865#", apartmentLockbox: "2020" },
    { propertyName: "FLAT 3 MARKETSTREET15", mainEntrance: "9865#", apartmentLockbox: "5264" },
    { propertyName: "FLAT 4 MARKETSTREET15", mainEntrance: "9865#", apartmentLockbox: "8734" },
    { propertyName: "FLAT 5 MARKETSTREET15", mainEntrance: "9865#", apartmentLockbox: "9839" },
    { propertyName: "FLAT 6 MARKETSTREET15", mainEntrance: "9865#", apartmentLockbox: "7866" },
    { propertyName: "FLAT 7 MARKETSTREET15", mainEntrance: "9865#", apartmentLockbox: "8977" },
    { propertyName: "Apt 2, 13 Market st", mainEntrance: "Main Door Code: C2703Z, keypad: 02703", apartmentLockbox: "3698" },
    { propertyName: "Lister Gate Studio 3", mainEntrance: "Building code 02301 enter", apartmentLockbox: "1198" },
    { propertyName: "Lister Gate Studio 4", mainEntrance: "Building code 02301 enter", apartmentLockbox: "299" },
    { propertyName: "Lister Gate Studio 8", mainEntrance: "Building code 02301 enter", apartmentLockbox: "1712" },
    { propertyName: "Lister Gate Studio 9", mainEntrance: "Building code 02301 enter", apartmentLockbox: "6310" },
    { propertyName: "Lister Gate Studio 7", mainEntrance: "Building code 02301 enter", apartmentLockbox: "3910" },
    { propertyName: "Lister Gate Studio 11", mainEntrance: "Building code 02301 enter", apartmentLockbox: "5382" },
    { propertyName: "Lister Gate Studio 12", mainEntrance: "Building code 02301 enter", apartmentLockbox: "7869" },
    { propertyName: "ICON Cluster Flat 1", mainEntrance: "intercom: 1966", apartmentLockbox: "6730" },
    { propertyName: "ICON Cluster Flat 2", mainEntrance: "intercom: 1966", apartmentLockbox: "2454" },
    { propertyName: "Flat 5, 33 Long Row", mainEntrance: "*1066", apartmentLockbox: "2066", backup: "6348" },
    { propertyName: "Flat 6, 33 Long Row", mainEntrance: "*1066", apartmentLockbox: "1966" },
    { propertyName: "53 Wroxham Drive", mainEntrance: "7502", apartmentLockbox: "7502" },
    { propertyName: "F1 Pilcher Gate House", mainEntrance: "2486", apartmentLockbox: "3469*", backup: "C2367Y" },
    { propertyName: "F2 Pilcher Gate", mainEntrance: "2486", apartmentLockbox: "5674*", backup: "C2367Y" },
    { propertyName: "F3 Pilcher Gate", mainEntrance: "2486", apartmentLockbox: "7394*", backup: "C2367Y" },
    { propertyName: "F6 Pilcher Gate", mainEntrance: "2486", apartmentLockbox: "5387*", backup: "C2367Y" },
    { propertyName: "F7 Pilcher Gate", mainEntrance: "2486", apartmentLockbox: "6475*", backup: "C2367Y" },
    { propertyName: "F11 Pilcher Gate", mainEntrance: "2486", apartmentLockbox: "4371*", backup: "C2367Y" },
    { propertyName: "Penthouse Pilcher Gate", mainEntrance: "2486", apartmentLockbox: "9484", backup: "C2367Y" },
    { propertyName: "48–52 Bridlesmith Gate F1", mainEntrance: "02525", apartmentLockbox: "3414", backup: "3842" },
    { propertyName: "48–52 Bridlesmith Gate F2", mainEntrance: "02525", apartmentLockbox: "3532", backup: "6179" },
    { propertyName: "STANLEY HOUSE 40", apartmentLockbox: "54112483" },
    { propertyName: "STANLEY HOUSE 41", mainEntrance: "5791", apartmentLockbox: "78189428" },
    { propertyName: "STANLEY HOUSE 42", apartmentLockbox: "07567069" },
    { propertyName: "STANLEY HOUSE 43", apartmentLockbox: "56280366" },
    { propertyName: "STANLEY HOUSE 44", apartmentLockbox: "56391185" },
    { propertyName: "STANLEY HOUSE 45", apartmentLockbox: "23975458" },
  ];

  // Convert each property to critical info entries
  for (const property of propertyData) {
    const now = new Date();

    // Add main entrance code if exists
    if (property.mainEntrance) {
      results.push({
        category: "Gate Code",
        propertyName: property.propertyName,
        title: "Main Entrance",
        value: property.mainEntrance,
        notes: property.backup ? `Backup: ${property.backup}` : undefined,
        createdBy: userEmail,
        lastUpdated: now,
      });
    }

    // Add apartment lockbox if exists
    if (property.apartmentLockbox) {
      results.push({
        category: "Lockbox Code",
        propertyName: property.propertyName,
        title: "Apartment Lockbox",
        value: property.apartmentLockbox,
        notes: property.backup && !property.mainEntrance ? `Backup: ${property.backup}` : undefined,
        createdBy: userEmail,
        lastUpdated: now,
      });
    }

    // Add standalone backup codes as separate entry if they don't fit above
    if (property.backup && property.mainEntrance && property.apartmentLockbox) {
      results.push({
        category: "Other",
        propertyName: property.propertyName,
        title: "Backup Access",
        value: property.backup,
        notes: "Alternative access code",
        createdBy: userEmail,
        lastUpdated: now,
      });
    }
  }

  return results;
}
