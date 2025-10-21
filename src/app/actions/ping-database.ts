"use server";

import { createConnection } from "mysql2/promise";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Validation schema for connection string
const connectionStringSchema = z
  .string()
  .regex(
    /^mysql:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^/]+$/,
    "Invalid MySQL connection string format"
  );

/**
 * Parse MySQL connection string into components
 * Format: mysql://user:password@host:port/database
 */
function parseConnectionString(connectionString: string): {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
} {
  // Remove protocol
  const withoutProtocol = connectionString.replace(/^mysql:\/\//, "");

  // Split by @ to separate credentials from host info
  const lastAtIndex = withoutProtocol.lastIndexOf("@");
  if (lastAtIndex === -1) {
    throw new Error("Invalid connection string: missing @ separator");
  }

  const credentials = withoutProtocol.substring(0, lastAtIndex);
  const hostInfo = withoutProtocol.substring(lastAtIndex + 1);

  // Parse credentials (user:password)
  const colonIndex = credentials.indexOf(":");
  if (colonIndex === -1) {
    throw new Error("Invalid credentials: missing password");
  }

  const user = credentials.substring(0, colonIndex);
  const password = credentials.substring(colonIndex + 1);

  // Parse host info (host:port/database)
  const slashIndex = hostInfo.indexOf("/");
  if (slashIndex === -1) {
    throw new Error("Invalid connection string: missing database");
  }

  const hostPort = hostInfo.substring(0, slashIndex);
  const database = hostInfo.substring(slashIndex + 1);

  const colonIndex2 = hostPort.indexOf(":");
  if (colonIndex2 === -1) {
    throw new Error("Invalid connection string: missing port");
  }

  const host = hostPort.substring(0, colonIndex2);
  const port = parseInt(hostPort.substring(colonIndex2 + 1), 10);

  if (isNaN(port)) {
    throw new Error("Invalid port number");
  }

  return { user, password, host, port, database };
}

/**
 * Test MySQL connection
 * @param connectionString - MySQL connection URL (mysql://user:password@host:port/database)
 * @returns { success, database, version } or { success, error }
 */
export async function testMySQLConnection(connectionString: string) {
  try {
    // Validate connection string format
    connectionStringSchema.parse(connectionString);

    // Parse connection string
    const { user, password, host, port, database } =
      parseConnectionString(connectionString);

    // Create connection
    const connection = await createConnection({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 1,
    });

    try {
      // Ping test - simple SELECT 1
      await connection.execute("SELECT 1");

      // Get database version and current database
      const [versionResult] = await connection.execute(
        "SELECT VERSION() as version"
      );

      const version = (versionResult as Array<{ version: string }>)[0]?.version;

      return {
        success: true,
        database,
        version: version || "Unknown",
        message: "✓ Successfully connected to database",
      };
    } finally {
      // Always close connection
      await connection.end();
    }
  } catch (error) {
    // Type guard for Error object
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorCode = (error as NodeJS.ErrnoException)?.code;

    // Provide user-friendly error messages
    let userMessage = "Connection failed";

    if (errorCode === "ECONNREFUSED") {
      userMessage =
        "MySQL server is not running or cannot be reached at this address";
    } else if (errorMessage.includes("Access denied")) {
      userMessage = "Access denied - check your username and password";
    } else if (errorMessage.includes("Unknown database")) {
      userMessage = `Database "${errorMessage.split("'")[1]}" not found`;
    } else if (errorMessage.includes("Invalid connection string")) {
      userMessage = errorMessage;
    } else if (errorCode === "ETIMEDOUT") {
      userMessage = "Connection timeout - host may be unreachable";
    } else if (errorCode === "ENOTFOUND") {
      userMessage = "Host not found - check the hostname/IP address";
    }

    console.error("[DB CONNECTION ERROR]", errorMessage);

    return {
      success: false,
      error: userMessage,
      details: errorMessage,
    };
  }
}

/**
 * Save MySQL connection URL to user profile
 * @param connectionString - MySQL connection URL to save
 * @returns { success, message } or { success: false, error }
 */
export async function saveMySQLConnection(
  connectionString: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Get authenticated user
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized - please log in first",
      };
    }

    // Validate connection string format
    connectionStringSchema.parse(connectionString);

    // Test connection first before saving
    const testResult = await testMySQLConnection(connectionString);
    if (!testResult.success) {
      return {
        success: false,
        error: "Connection test failed - unable to save invalid connection",
      };
    }

    // Save to database
    await db
      .update(users)
      .set({
        databaseConnectionUrl: connectionString,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      success: true,
      message: "Connection saved successfully",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[SAVE CONNECTION ERROR]", errorMessage);

    return {
      success: false,
      error:
        error instanceof z.ZodError
          ? "Invalid connection string format"
          : errorMessage,
    };
  }
}

/**
 * Get user's saved MySQL connection URL
 * @returns { connectionUrl } or { connectionUrl: null }
 */
export async function getUserDatabaseConnection(): Promise<{
  connectionUrl: string | null;
}> {
  try {
    // Get authenticated user
    const { userId } = await auth();
    if (!userId) {
      return { connectionUrl: null };
    }

    // Fetch user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return {
      connectionUrl: user?.databaseConnectionUrl || null,
    };
  } catch (error) {
    console.error("[GET CONNECTION ERROR]", error);
    return { connectionUrl: null };
  }
}
