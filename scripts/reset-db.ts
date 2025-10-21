// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

// Now import db after env vars are loaded
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(process.env.DATABASE_URL, { prepare: false });
const db = drizzle({ client });

async function resetDatabase() {
  try {
    console.log("🗑️  Dropping existing tables...");

    // Drop tables in correct order (child tables first)
    await db.execute(sql`DROP TABLE IF EXISTS messages CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS conversations CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);

    console.log("✅ Tables dropped successfully");

    console.log("📝 Creating new tables with TEXT IDs...");

    // Create users table with TEXT id (Clerk ID)
    await db.execute(sql`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        clerk_id TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create conversations table with TEXT id
    await db.execute(sql`
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT 'New Chat',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create messages table with TEXT id
    await db.execute(sql`
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log("✅ Tables created successfully");
    console.log("🎉 Database reset complete!");
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

resetDatabase();
