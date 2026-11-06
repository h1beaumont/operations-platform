// Reference: javascript_database blueprint
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;
// Enable connection pooling with proper settings for persistence
neonConfig.poolQueryViaFetch = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with optimized settings for production
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 30000,
  max: 10, // Reduced from 20 to prevent overwhelming Neon
  idleTimeoutMillis: 30000, // Reduced to prevent stale connections
  application_name: 'staffflow',
  statement_timeout: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Add error handler for pool
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client', err);
});

// Add connection retry logic
pool.on('connect', () => {
  console.log('[DB Pool] New client connected');
});

pool.on('remove', () => {
  console.log('[DB Pool] Client removed from pool');
});

// Create drizzle instance with the pool
export const db = drizzle({ client: pool, schema });

// Helper function to ensure operations persist by using explicit transactions
export async function withTransaction<T>(
  operation: (tx: typeof db) => Promise<T>
): Promise<T> {
  try {
    const result = await db.transaction(async (tx) => {
      return await operation(tx);
    });
    return result;
  } catch (error) {
    console.error('[DB Transaction] Failed:', error);
    throw error;
  }
}