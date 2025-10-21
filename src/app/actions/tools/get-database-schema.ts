"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import mysql from "mysql2/promise";
import { RowDataPacket } from "mysql2/promise";

/**
 * Fetch the complete database structure including all tables, columns, data types, constraints, and relationships
 * @returns { success: true, schema: { tables: [...] } } or { success: false, error: string }
 */
export async function getDatabaseSchema(): Promise<{
  success: boolean;
  schema?: {
    tables: Array<{
      tableName: string;
      columns: Array<{
        columnName: string;
        dataType: string;
        isNullable: boolean;
        columnKey: string;
      }>;
    }>;
  };
  error?: string;
}> {
  try {
    // Get authenticated user
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized: No user found",
      };
    }

    console.log("[GET SCHEMA] User ID:", userId);

    // Fetch user's saved connection string from database
    const user = await db
      .select({ databaseConnectionUrl: users.databaseConnectionUrl })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    console.log("[GET SCHEMA] User from DB:", user);

    if (!user.length || !user[0].databaseConnectionUrl) {
      return {
        success: false,
        error:
          "No database connection saved. Please configure one in settings.",
      };
    }

    const connectionUrl = user[0].databaseConnectionUrl;
    console.log("[GET SCHEMA] Connection URL from DB:", connectionUrl);

    // Parse connection string - handle @ in password by finding the LAST @
    const withoutProtocol = connectionUrl.replace(/^mysql:\/\//, "");
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

    const user_cred = credentials.substring(0, colonIndex);
    const password_cred = credentials.substring(colonIndex + 1);

    // Parse host info (host:port/database)
    const slashIndex = hostInfo.indexOf("/");
    if (slashIndex === -1) {
      throw new Error("Invalid host info: missing database");
    }

    const hostPort = hostInfo.substring(0, slashIndex);
    const database_name = hostInfo.substring(slashIndex + 1);

    const colonHostIndex = hostPort.indexOf(":");
    const host_cred = hostPort.substring(0, colonHostIndex);
    const port_cred = parseInt(hostPort.substring(colonHostIndex + 1), 10);

    console.log("[GET SCHEMA] Parsed Connection String:", {
      user: user_cred,
      password: password_cred ? "***hidden***" : "empty",
      host: host_cred,
      port: port_cred,
      database: database_name,
    });

    const config = {
      host: host_cred,
      port: port_cred,
      user: user_cred,
      password: password_cred,
      database: database_name,
    };

    console.log("[GET SCHEMA] Final Connection Config:", {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password ? "***hidden***" : "empty",
      database: config.database,
    });

    // Create connection
    console.log("[GET SCHEMA] Attempting MySQL connection...");
    const connection = await mysql.createConnection(config);
    console.log("[GET SCHEMA] MySQL connection successful!");

    try {
      // Query INFORMATION_SCHEMA to get all tables
      const [tables] = await connection.execute(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
        [config.database]
      );

      const schemaData = {
        tables: [] as Array<{
          tableName: string;
          columns: Array<{
            columnName: string;
            dataType: string;
            isNullable: boolean;
            columnKey: string;
          }>;
        }>,
      };

      // For each table, fetch its columns
      for (const table of tables as RowDataPacket[]) {
        const [columns] = await connection.execute(
          `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
          [config.database, table.TABLE_NAME]
        );

        schemaData.tables.push({
          tableName: table.TABLE_NAME,
          columns: (columns as RowDataPacket[]).map((col) => ({
            columnName: col.COLUMN_NAME,
            dataType: col.COLUMN_TYPE,
            isNullable: col.IS_NULLABLE === "YES",
            columnKey: col.COLUMN_KEY || "",
          })),
        });
      }

      return {
        success: true,
        schema: schemaData,
      };
    } finally {
      await connection.end();
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    console.error("[GET DATABASE SCHEMA ERROR]", {
      message: errorMessage,
      code: err?.code || "N/A",
      errno: err?.errno || "N/A",
      fullError: error,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}
