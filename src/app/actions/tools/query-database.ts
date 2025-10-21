"use server";

/**
 * Execute SELECT queries (read-only) to retrieve data from the user's database
 * @param query - The SQL SELECT query to execute
 * @returns { success: true, results: [...], rowCount: number } or { success: false, error: string }
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function queryDatabase(query: string): Promise<{
  success: boolean;
  results?: Array<Record<string, unknown>>;
  rowCount?: number;
  error?: string;
}> {
  try {
    // Placeholder: Will be implemented to execute SELECT queries via mysql2
    return {
      success: true,
      results: [],
      rowCount: 0,
    };
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
