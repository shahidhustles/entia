import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  generateId,
} from "ai";
import { google } from "@ai-sdk/google";
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import {
  saveConversation,
  getOrCreateUser,
  getConversation,
  generateConversationTitle,
} from "@/app/actions/conversations";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

/**
 * Helper: Extract text content from UIMessage parts
 */
function extractTextFromParts(parts: UIMessage["parts"]): string {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join(" ")
    .trim();
}

export async function POST(req: Request) {
  const { messages, id: conversationId } = await req.json();
  const { userId } = await auth();

  console.log("[CHAT API] Received conversation ID:", conversationId);
  console.log("[CHAT API] Messages length:", messages.length);

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get or create user in database
  let dbUser;
  try {
    dbUser = await getOrCreateUser(userId);
  } catch (error) {
    console.error("[CHAT API] Error getting/creating user:", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  // Check if conversation exists
  const existingConversation = conversationId
    ? await getConversation(conversationId)
    : null;

  const isFirstExchange = !existingConversation;

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
- Generate Mermaid ER diagrams wrapped in \`\`\`mermaid code blocks (e.g. \`\`\`mermaid ... \`\`\`)
- Provide SQL in markdown code blocks (e.g. \`\`\`sql ... \`\`\`)
- For dangerous operations (DROP, DELETE without WHERE), inform the user that confirmation is needed
- Use proper SQL syntax and best practices
- Consider normalization when creating new tables
- Show data types and constraints clearly in your responses

When the user asks to:
- "Show my database" → Use get_database_schema and generate a Mermaid ER diagram in \`\`\`mermaid code fence
- "Create a [Table] table with..." → Generate SQL in \`\`\`sql code fence and prepare for execute_sql
- "What's in [Table]" → Use query_database
- "Add a relationship" → Use execute_sql for ALTER TABLE
- "Save this diagram" → Use save_diagram tool`,
  });

  // Ensure stream runs to completion even if client disconnects
  result.consumeStream();

  return result.toUIMessageStreamResponse({
    originalMessages: messages, // ✅ Prevents duplicate message IDs
    generateMessageId: generateId, // ✅ Generate proper IDs for all messages
    onFinish: async ({ messages: finalMessages }) => {
      // Don't block streaming if save fails
      try {
        console.log("[CHAT SAVE] Starting save process");
        console.log("[CHAT SAVE] Final messages count:", finalMessages.length);
        console.log("[CHAT SAVE] Is first exchange:", isFirstExchange);

        let title = existingConversation?.title || "New Chat";

        // Generate title on first exchange
        if (isFirstExchange && finalMessages.length >= 2) {
          try {
            const firstUserMsg = extractTextFromParts(finalMessages[0].parts);
            const firstAiMsg = extractTextFromParts(finalMessages[1].parts);

            console.log(
              "[CHAT SAVE] Generating title from:",
              firstUserMsg.substring(0, 50)
            );

            title = await generateConversationTitle(firstUserMsg, firstAiMsg);
            console.log("[CHAT SAVE] Generated title:", title);
          } catch (titleError) {
            console.error("[CHAT SAVE] Title generation failed:", titleError);
            // Use default title if generation fails
            title = "New Chat";
          }
        }

        // Save conversation and messages
        await saveConversation({
          conversationId: conversationId || "unknown",
          userId: dbUser.id,
          title,
          messages: finalMessages,
        });

        console.log("[CHAT SAVE] Successfully saved conversation");
      } catch (error) {
        console.error("[CHAT SAVE] Error saving conversation:", error);
        // Don't throw - we want streaming to complete even if DB save fails
      }
    },
  });
}
