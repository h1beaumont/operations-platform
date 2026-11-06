import { db } from "./db";
import { locationGroups, properties } from "@shared/schema";

const locationGroupsData = [
  { slug: "group-1-head-office", displayName: "Group 1 - Head Office Area", maxJobsPerDay: 10, travelTimeMinutes: 5 },
  { slug: "group-2-bridlesmith", displayName: "Group 2 - Bridlesmith Gate", maxJobsPerDay: 10, travelTimeMinutes: 5 },
  { slug: "group-3-lister-gate", displayName: "Group 3 - Lister Gate", maxJobsPerDay: 10, travelTimeMinutes: 10 },
  { slug: "group-4-market-street", displayName: "Group 4 - Market Street", maxJobsPerDay: 10, travelTimeMinutes: 5 },
  { slug: "group-5-liberties", displayName: "Group 5 - Liberties Area", maxJobsPerDay: 10, travelTimeMinutes: 10 },
  { slug: "group-6-stanley", displayName: "Group 6 - Stanley", maxJobsPerDay: 10, travelTimeMinutes: 15 },
  { slug: "group-7-long-row", displayName: "Group 7 - Long Row Area", maxJobsPerDay: 10, travelTimeMinutes: 5 },
  { slug: "group-8-stoneyard", displayName: "Group 8 - Stoneyard Area", maxJobsPerDay: 10, travelTimeMinutes: 10 },
  { slug: "group-9-graduation", displayName: "Group 9 - Graduation House Area", maxJobsPerDay: 10, travelTimeMinutes: 10 },
  { slug: "group-10-clifton", displayName: "Group 10 - Clifton", maxJobsPerDay: 10, travelTimeMinutes: 20 },
  { slug: "group-11-coachmag", displayName: "Group 11 - CoachMag Area", maxJobsPerDay: 10, travelTimeMinutes: 15 },
  { slug: "group-12-park-west", displayName: "Group 12 - Park West Area", maxJobsPerDay: 10, travelTimeMinutes: 15 },
];

const propertiesData = [
  // Group 1
  { name: "Head Office", address: "1 Example Street, York", slug: "group-1-head-office" },
  { name: "Building C 4", address: "Building C, York", slug: "group-1-head-office" },
  { name: "Building C 8", address: "Building C, York", slug: "group-1-head-office" },
  
  // Group 2
  { name: "48-51 Bridlesmith 1 & 2", address: "48-51 Bridlesmith Gate, Nottingham", slug: "group-2-bridlesmith" },
  { name: "25 Bridlesmith", address: "25 Bridlesmith Gate, Nottingham", slug: "group-2-bridlesmith" },
  
  // Group 3
  { name: "Lister Gate Studios", address: "Lister Gate, Nottingham", slug: "group-3-lister-gate" },
  
  // Group 4
  { name: "15 Market Street", address: "15 Market Street, Nottingham", slug: "group-4-market-street" },
  { name: "13 Market Street", address: "13 Market Street, Nottingham", slug: "group-4-market-street" },
  
  // Group 5
  { name: "Liberties", address: "Liberties, Nottingham", slug: "group-5-liberties" },
  { name: "Parliament", address: "Parliament Street, Nottingham", slug: "group-5-liberties" },
  
  // Group 6
  { name: "Stanley", address: "Stanley, Nottingham", slug: "group-6-stanley" },
  
  // Group 7
  { name: "Long Row", address: "Long Row, Nottingham", slug: "group-7-long-row" },
  { name: "Wheelergate", address: "Wheelergate, Nottingham", slug: "group-7-long-row" },
  
  // Group 8
  { name: "Stoneyard", address: "Stoneyard, Nottingham", slug: "group-8-stoneyard" },
  { name: "Houndsgate", address: "Houndsgate, Nottingham", slug: "group-8-stoneyard" },
  { name: "57 Crusader", address: "57 Crusader, Nottingham", slug: "group-8-stoneyard" },
  
  // Group 9
  { name: "Graduation House", address: "Graduation House, Nottingham", slug: "group-9-graduation" },
  { name: "72 Middle Street", address: "72 Middle Street, Nottingham", slug: "group-9-graduation" },
  
  // Group 10
  { name: "32 & 33 Clifton", address: "32 & 33 Clifton, Nottingham", slug: "group-10-clifton" },
  
  // Group 11
  { name: "CoachMag", address: "CoachMag, Nottingham", slug: "group-11-coachmag" },
  { name: "1B Cav", address: "1B Cav, Nottingham", slug: "group-11-coachmag" },
  
  // Group 12
  { name: "86 Park West", address: "86 Park West, Nottingham", slug: "group-12-park-west" },
  { name: "1, 2 & 3 Dagmar", address: "1, 2 & 3 Dagmar Grove, Nottingham", slug: "group-12-park-west" },
];

async function seedProperties() {
  try {
    console.log("Starting property seeding...");

    // Insert location groups
    console.log("Inserting location groups...");
    const insertedGroups = await db.insert(locationGroups).values(locationGroupsData).returning();
    console.log(`✓ Inserted ${insertedGroups.length} location groups`);

    // Create a map of slug to group ID
    const groupMap = new Map(insertedGroups.map(g => [g.slug, g.id]));

    // Insert properties with their location group IDs
    console.log("Inserting properties...");
    const propertiesToInsert = propertiesData.map(p => ({
      name: p.name,
      address: p.address,
      locationGroupId: groupMap.get(p.slug),
      active: true,
      defaultCleanDuration: 120,
      priorityRank: 0,
    }));

    const insertedProperties = await db.insert(properties).values(propertiesToInsert).returning();
    console.log(`✓ Inserted ${insertedProperties.length} properties`);

    console.log("\n✅ Seeding complete!");
    console.log(`Total: ${insertedGroups.length} location groups, ${insertedProperties.length} properties`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedProperties();
