"use server";

import { createConnection } from "mysql2/promise";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Execute SELECT queries (read-only) to retrieve data from the user's database
 * @param query - The SQL SELECT query to execute
 * @returns { success: true, results: [...], rowCount: number } or { success: false, error: string }
 */
export async function queryDatabase(query: string): Promise<{
  success: boolean;
  results?: Array<Record<string, unknown>>;
  rowCount?: number;
  error?: string;
}> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "Unauthorized - no user ID",
      };
    }

    // Fetch user's saved database connection URL
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId));

    if (!userRecord.length || !userRecord[0].databaseConnectionUrl) {
      return {
        success: false,
        error:
          "No database connection configured. Please add one in your profile.",
      };
    }

    const connectionUrl = userRecord[0].databaseConnectionUrl;

    // Validate that this is a SELECT query (read-only)
    const upperQuery = query.trim().toUpperCase();
    if (!upperQuery.startsWith("SELECT")) {
      return {
        success: false,
        error:
          "Only SELECT queries are allowed through query_database. Use execute_sql for other operations.",
      };
    }

    // Parse connection URL using lastIndexOf to handle multiple @ in password
    const urlWithoutProtocol = connectionUrl.replace("mysql://", "");
    const lastAtIndex = urlWithoutProtocol.lastIndexOf("@");

    if (lastAtIndex === -1) {
      return {
        success: false,
        error: "Invalid database connection URL format",
      };
    }

    const credentials = urlWithoutProtocol.substring(0, lastAtIndex);
    const hostDbInfo = urlWithoutProtocol.substring(lastAtIndex + 1);

    const [username, password] = credentials.split(":");
    const hostDbParts = hostDbInfo.split("/");
    const hostPortParts = hostDbParts[0].split(":");

    const host = hostPortParts[0];
    const port = hostPortParts[1] ? parseInt(hostPortParts[1]) : 3306;
    const database = hostDbParts[1] || "";

    if (!username || !password || !host || !database) {
      return {
        success: false,
        error: "Invalid database connection URL - missing required fields",
      };
    }

    console.log(
      `[QUERY] Connecting to ${host}:${port}/${database} as ${username}`
    );

    const connection = await createConnection({
      host,
      port,
      user: username,
      password,
      database,
    });

    try {
      // Split queries by semicolon and filter empty ones
      const queries = query
        .split(";")
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      if (queries.length === 0) {
        return {
          success: false,
          error: "No valid SQL query provided",
        };
      }

      // Validate all queries are SELECT
      for (const q of queries) {
        if (!q.toUpperCase().startsWith("SELECT")) {
          return {
            success: false,
            error: `Only SELECT queries are allowed. Found: ${q.substring(
              0,
              30
            )}...`,
          };
        }
      }

      console.log(`[QUERY] Executing ${queries.length} query(ies)`);

      // Execute each query and collect results
      const allResults: Array<Record<string, unknown>> = [];

      for (const q of queries) {
        console.log(`[QUERY] Executing: ${q}`);
        const [rows] = await connection.query(q);
        const resultArray = Array.isArray(rows) ? rows : [];
        allResults.push(...(resultArray as Array<Record<string, unknown>>));
      }

      console.log(`[QUERY] Success - ${allResults.length} total rows returned`);

      return {
        success: true,
        results: allResults,
        rowCount: allResults.length,
      };
    } finally {
      await connection.end();
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[QUERY DATABASE ERROR]", errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
