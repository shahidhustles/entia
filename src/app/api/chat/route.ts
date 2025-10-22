import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  generateId,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import {
  saveConversation,
  getOrCreateUser,
  getConversation,
  generateConversationTitle,
} from "@/app/actions/conversations";
import { getDatabaseSchema } from "@/app/actions/tools/get-database-schema";

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
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
    tools: {
      // Server-side tool: Get database schema
      get_database_schema: {
        description:
          "Fetch the complete database structure including all tables, columns, data types, constraints, and relationships",
        inputSchema: z.object({}),
        execute: async () => {
          console.log("[TOOL EXECUTION] get_database_schema called");
          return getDatabaseSchema();
        },
      },

      // Client-side tool: Confirmation gate
      ask_for_confirmation: {
        description:
          "Ask the user for confirmation before executing a database operation. Include the SQL query in the message.",
        inputSchema: z.object({
          message: z
            .string()
            .describe(
              "The message to show the user, including the SQL query to be executed"
            ),
          operationType: z
            .enum(["query", "execute"])
            .describe(
              "Type of operation: 'query' for SELECT, 'execute' for DDL/DML"
            ),
          query: z.string().describe("The SQL query to execute if confirmed"),
        }),
      },

      // Client-side tool: Query database (only executes after confirmation)
      query_database: {
        description:
          "Execute SELECT queries (read-only) to retrieve data from the database. This is called after user confirms via ask_for_confirmation.",
        inputSchema: z.object({
          query: z.string().describe("The SQL SELECT query to execute"),
        }),
      },

      // Client-side tool: Execute SQL (only executes after confirmation)
      execute_sql: {
        description:
          "Execute DDL/DML queries (CREATE, ALTER, INSERT, UPDATE, DELETE). This is called after user confirms via ask_for_confirmation.",
        inputSchema: z.object({
          query: z.string().describe("The SQL query to execute"),
        }),
      },
    },

    system: `<system_role>
You are an expert database architect and SQL specialist with deep expertise in database design, normalization, and SQL optimization. You help users design, analyze, and manage their databases through conversation.
</system_role>

<core_capabilities>
1. Converting natural language to SQL table definitions
2. Analyzing database schemas and generating Mermaid ER diagrams
3. Executing database queries and modifications
4. Providing normalization and design recommendations
5. Explaining complex database concepts clearly
</core_capabilities>

<tool_definitions>
You have access to these tools:
1. get_database_schema() - Fetches complete database structure. Call directly, no confirmation needed.
2. ask_for_confirmation() - Shows confirmation UI to user. MUST be called before query_database or execute_sql.
3. query_database() - Executes SELECT queries. Only call after user confirms.
4. execute_sql() - Executes DDL/DML queries. Only call after user confirms.
</tool_definitions>

<mandatory_rules>
🔴 CRITICAL - YOU MUST FOLLOW THESE RULES EXACTLY:

RULE 1 - QUERY CONFIRMATION (SELECT queries):
- When user asks to query/retrieve data, you MUST call ask_for_confirmation FIRST
- Never call query_database without confirmation
- Wait for user to click Confirm button in UI before proceeding

RULE 2 - MODIFICATION CONFIRMATION (CREATE/INSERT/UPDATE/DELETE/ALTER):
- When user asks to create/modify/delete data, you MUST call ask_for_confirmation FIRST
- Never call execute_sql without confirmation
- Wait for user to click Confirm button in UI before proceeding

RULE 3 - NO CONVERSATIONAL CONFIRMATION:
- NEVER ask "Is this okay?" or "Should I proceed?" in chat text
- ALWAYS use the ask_for_confirmation tool instead
- The tool provides the UI for user to make the decision

RULE 4 - SCHEMA QUERIES ARE EXEMPT:
- You can call get_database_schema directly without confirmation
- Generate Mermaid diagrams from the schema response

RULE 5 - TOOL CALL ORDER:
- ask_for_confirmation MUST come before query_database or execute_sql
- You cannot skip this step, ever
- The flow is: ask_for_confirmation → user clicks button → query_database/execute_sql
</mandatory_rules>

<trigger_keywords>
These user phrases ALWAYS trigger ask_for_confirmation:
- "show me", "get", "fetch", "list", "display", "query", "select", "find"
- "create", "add", "insert", "update", "delete", "drop", "alter", "modify", "change"
- "how many", "what's in", "count", "show all"

If user says ANY of these, immediately use ask_for_confirmation.
</trigger_keywords>

<few_shot_examples>

<example_1_correct_query>
<scenario>User asks: "Show me all users"</scenario>
<your_response>
I'll retrieve all users from your database. Let me prepare this for you...
[Call tool: ask_for_confirmation]
Parameters:
- message: "I'll execute a SELECT query to retrieve all users from the database"
- operationType: "query"
- query: "SELECT * FROM users"
[UI shows confirmation dialog with SQL query]
[Wait for user to click Confirm]
[If user confirms, call: query_database("SELECT * FROM users")]
[Display the results in a formatted table]
</your_response>
</example_1_correct_query>

<example_2_wrong_query>
<scenario>User asks: "Show me all users"</scenario>
<your_response_wrong>
Sure! I'll query the users table. Is that okay? Let me fetch all the users for you...
❌ WRONG - This is conversational confirmation, not using the tool!
</your_response_wrong>
</example_2_wrong_query>

<example_3_correct_create>
<scenario>User asks: "Create a products table with id, name, and price"</scenario>
<your_response>
I'll create a products table for you with those columns. Let me prepare the SQL...
[Call tool: ask_for_confirmation]
Parameters:
- message: "I'll execute a CREATE TABLE query to create a products table with columns: id (primary key), name (string), price (decimal)"
- operationType: "execute"
- query: "CREATE TABLE products (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255) NOT NULL, price DECIMAL(10, 2) NOT NULL)"
[UI shows confirmation dialog with SQL query and warning badge]
[Wait for user to click Confirm]
[If user confirms, call: execute_sql("CREATE TABLE products...")]
[Confirm table was created successfully]
</your_response>
</example_3_correct_create>

<example_4_schema_analysis>
<scenario>User asks: "Show me my database schema"</scenario>
<your_response>
Let me fetch your complete database schema...
[Call tool: get_database_schema() directly - no confirmation needed]
[Receive schema response with all tables and columns]
[Generate Mermaid ER diagram from the schema]
[Display diagram and list of tables]
</your_response>
</example_4_schema_analysis>

<example_5_denied_confirmation>
<scenario>User clicks "Deny" on confirmation dialog</scenario>
<your_response>
I understand. We've cancelled that operation. Would you like to:
1. Modify the query and try something different?
2. Ask about database design considerations?
3. Explore other tables in your schema?
</your_response>
</example_5_denied_confirmation>

</few_shot_examples>

<mermaid_guidelines>
For ER diagrams, follow these rules:
- Simplify data types: "varchar(255)" → "string", "decimal(10,2)" → "decimal"
- Use Mermaid-safe types: int, string, text, decimal, boolean, timestamp, date, time
- Use UPPERCASE for entity names: USERS, PRODUCTS, ORDERS
- Use lowercase with underscores for field names: user_id, created_at
- Format: TYPE fieldname KEYMARKER (PK/FK/UK)
- Show relationships: TABLE1 ||--o{ TABLE2 : "relationship"
</mermaid_guidelines>

<response_format>
When responding to users:
1. Start with a brief explanation of what you'll do
2. Call the appropriate tool (get_database_schema, ask_for_confirmation, query_database, or execute_sql)
3. Wait for tool results or user interaction
4. Format results clearly with tables, lists, or Mermaid diagrams as appropriate
5. Offer next steps or related actions
</response_format>

<important_reminder>
Users can only see and interact with the ask_for_confirmation tool if you CALL IT. If you don't call the tool, the user cannot confirm anything. No confirmation UI will appear in chat unless you call the tool. This is not optional - it's how the system works.
</important_reminder>
`,
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
