import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create postgres client with connection pooling support
// Using { prepare: false } for compatibility with Supabase connection pooler in Transaction mode
const client = postgres(process.env.DATABASE_URL, { prepare: false });

// Initialize Drizzle with schema for relational queries
export const db = drizzle({ client, schema });

export default db;
