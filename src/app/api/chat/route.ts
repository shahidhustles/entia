import { streamText, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const { userId } = await auth();

  console.log("[CHAT API] Messages array:", JSON.stringify(messages, null, 2));
  console.log("[CHAT API] Messages length:", messages.length);

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = streamText({
    model: google("gemini-2.5-pro"),
    messages: convertToModelMessages(messages),
    providerOptions: {
      google: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget: 8192,
        },
      } satisfies GoogleGenerativeAIProviderOptions,
    },
    tools: {
      // Server-side tool: Get database schema
      get_database_schema: {
        description:
          "Fetch the complete database structure including all tables, columns, data types, constraints, and relationships",
        inputSchema: z.object({}),
        execute: async () => {
          console.log("[TOOL EXECUTION] get_database_schema called");
          // Placeholder: Will be implemented to connect to user's MySQL database
          return {
            tables: [],
            schema: {},
            message: "Database schema retrieval - placeholder implementation",
          };
        },
      },

      // Server-side tool: Query database
      query_database: {
        description:
          "Execute SELECT queries (read-only) to retrieve data from the database",
        inputSchema: z.object({
          query: z.string().describe("The SQL SELECT query to execute"),
        }),
        execute: async ({ query }: { query: string }) => {
          console.log(
            "[TOOL EXECUTION] query_database called with query:",
            query
          );
          // Placeholder: Will be implemented to execute SELECT queries via mysql2
          return {
            results: [],
            rowCount: 0,
            message: "Query execution - placeholder implementation",
          };
        },
      },

      // Server-side tool: Execute SQL
      execute_sql: {
        description:
          "Execute DDL/DML queries (CREATE, ALTER, INSERT, UPDATE, DELETE) - requires client confirmation for dangerous operations",
        inputSchema: z.object({
          query: z.string().describe("The SQL query to execute"),
          isDangerous: z
            .boolean()
            .optional()
            .describe(
              "Whether this operation is dangerous (DROP, DELETE, TRUNCATE, ALTER)"
            ),
          confirmationRequired: z
            .boolean()
            .optional()
            .describe("Whether user confirmation is required"),
        }),
        execute: async ({
          query,
          isDangerous,
          confirmationRequired,
        }: {
          query: string;
          isDangerous?: boolean;
          confirmationRequired?: boolean;
        }) => {
          console.log("[TOOL EXECUTION] execute_sql called with:", {
            query,
            isDangerous,
            confirmationRequired,
          });
          // Placeholder: Will be implemented to execute DDL/DML queries via mysql2
          return {
            success: true,
            affectedRows: 0,
            message: "SQL execution - placeholder implementation",
          };
        },
      },

      // Server-side tool: Save diagram
      save_diagram: {
        description:
          "Save an ER diagram to the user's diagram history in the database",
        inputSchema: z.object({
          title: z.string().describe("Title of the diagram"),
          mermaidCode: z.string().describe("Mermaid diagram code"),
          description: z
            .string()
            .optional()
            .describe("Optional description of the diagram"),
        }),
        execute: async ({
          title,
          mermaidCode,
          description,
        }: {
          title: string;
          mermaidCode: string;
          description?: string;
        }) => {
          console.log("[TOOL EXECUTION] save_diagram called with:", {
            title,
            mermaidCodeLength: mermaidCode.length,
            description,
          });
          // Placeholder: Will be implemented to save diagram to Supabase via Drizzle ORM
          return {
            diagramId: "diagram_placeholder_id",
            saved: true,
            message: "Diagram saved - placeholder implementation",
          };
        },
      },
    },

    system: `You are an expert database architect and SQL specialist.

You help users design, analyze, and manage their databases through conversation.

Your capabilities include:
1. Converting natural language descriptions to SQL table definitions
2. Analyzing existing database schemas and generating ER diagrams in Mermaid format
3. Executing queries and database operations
4. Providing normalization and design recommendations
5. Saving ER diagrams for future reference

Guidelines:
- Always explain what you're doing before making tool calls
- Generate Mermaid ER diagrams when analyzing or creating schemas
- Provide SQL in markdown code blocks
- For dangerous operations (DROP, DELETE without WHERE), inform the user that confirmation is needed
- Use proper SQL syntax and best practices
- Consider normalization when creating new tables
- Show data types and constraints clearly in your responses

When the user asks to:
- "Show my database" → Use get_database_schema and generate a Mermaid ER diagram
- "Create a [Table] table with..." → Generate SQL and prepare for execute_sql
- "What's in [Table]" → Use query_database
- "Add a relationship" → Use execute_sql for ALTER TABLE
- "Save this diagram" → Use save_diagram tool`,
  });

  return result.toUIMessageStreamResponse();
}
