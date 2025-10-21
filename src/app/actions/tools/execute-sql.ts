"use server";

/**
 * Execute DDL/DML queries (CREATE, ALTER, INSERT, UPDATE, DELETE) on the user's database
 * @param query - The SQL query to execute (DDL or DML)
 * @returns { success: true, affectedRows: number } or { success: false, error: string }
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function executeSql(query: string): Promise<{
  success: boolean;
  affectedRows?: number;
  error?: string;
}> {
  try {
    // Placeholder: Will be implemented to execute DDL/DML queries via mysql2
    return {
      success: true,
      affectedRows: 0,
    };
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
