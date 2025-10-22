"use server";

import { createConnection } from "mysql2/promise";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Execute DDL/DML queries (CREATE, ALTER, INSERT, UPDATE, DELETE) on the user's database
 * @param query - The SQL query to execute (DDL or DML)
 * @returns { success: true, affectedRows: number } or { success: false, error: string }
 */
export async function executeSql(query: string): Promise<{
  success: boolean;
  affectedRows?: number;
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
      `[EXECUTE] Connecting to ${host}:${port}/${database} as ${username}`
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

      console.log(`[EXECUTE] Executing ${queries.length} statement(s)`);

      let totalAffectedRows = 0;

      for (const q of queries) {
        console.log(`[EXECUTE] Executing: ${q}`);
        const [result] = await connection.execute(q);

        // Extract affected rows from the result
        const affectedRows = "affectedRows" in result ? result.affectedRows : 0;
        totalAffectedRows += affectedRows;
      }

      console.log(
        `[EXECUTE] Success - ${totalAffectedRows} total rows affected`
      );

      return {
        success: true,
        affectedRows: totalAffectedRows,
      };
    } finally {
      await connection.end();
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[EXECUTE SQL ERROR]", errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
