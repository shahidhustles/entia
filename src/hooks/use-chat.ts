import { useChat as useBaseChat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithToolCalls, UIMessage } from "ai";
import { useCallback } from "react";
import { queryDatabase } from "@/app/actions/tools/query-database";
import { executeSql } from "@/app/actions/tools/execute-sql";

/**
 * Custom useChat hook with Vercel AI SDK integration
 * Handles tool calls, streaming, and message management
 * @param conversationId - Optional conversation ID for persistence
 * @param initialMessages - Optional initial messages to load
 */
export function useChat(
  conversationId?: string,
  initialMessages?: UIMessage[]
) {
  const { messages, sendMessage, addToolResult, status, stop } = useBaseChat({
    id: conversationId, // ✅ Pass conversation ID to SDK - automatically included in requests
    messages: initialMessages, // ✅ Load initial messages
    onFinish: () => {
      // Remove query parameter from URL when chat completes (without reload)
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("q")) {
          url.searchParams.delete("q");
          // Use window.history.replaceState to update URL without reload
          window.history.replaceState(null, "", url.pathname);
        }
      }
    },
    // Automatically submit when all tool results are available
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    // Handle client-side tools and automatically executed tools
    onToolCall: async ({ toolCall }) => {
      console.log("[TOOL CALL] Received tool call:", toolCall.toolName);

      // Check if it's a dynamic tool first for proper type narrowing
      if (toolCall.dynamic) {
        console.log("[TOOL CALL] Dynamic tool - no automatic execution");
        return;
      }

      // Handle client-side tools that auto-execute
      switch (toolCall.toolName) {
        case "ask_for_confirmation":
          console.log(
            "[TOOL CALL] ask_for_confirmation - rendered as UI, waiting for user input"
          );
          break;

        case "query_database":
          console.log(
            "[TOOL CALL] query_database - executing SELECT query",
            toolCall.input
          );
          try {
            const result = await queryDatabase(
              (toolCall.input as { query: string }).query
            );
            // No await here to avoid deadlocks per Vercel AI SDK docs
            addToolResult({
              tool: "query_database",
              toolCallId: toolCall.toolCallId,
              output: result,
            });
          } catch (err) {
            addToolResult({
              tool: "query_database",
              toolCallId: toolCall.toolCallId,
              state: "output-error",
              errorText: `Failed to execute query: ${
                err instanceof Error ? err.message : "Unknown error"
              }`,
            });
          }
          break;

        case "execute_sql":
          console.log(
            "[TOOL CALL] execute_sql - executing DDL/DML query",
            toolCall.input
          );
          try {
            const result = await executeSql(
              (toolCall.input as { query: string }).query
            );
            // No await here to avoid deadlocks per Vercel AI SDK docs
            addToolResult({
              tool: "execute_sql",
              toolCallId: toolCall.toolCallId,
              output: result,
            });
          } catch (err) {
            addToolResult({
              tool: "execute_sql",
              toolCallId: toolCall.toolCallId,
              state: "output-error",
              errorText: `Failed to execute query: ${
                err instanceof Error ? err.message : "Unknown error"
              }`,
            });
          }
          break;

        case "get_database_schema":
          console.log(
            "[TOOL CALL] get_database_schema - server-side execution"
          );
          break;

        default:
          console.log("[TOOL CALL] Unknown tool:", toolCall.toolName);
      }
    },
  });

  // Wrapper for sendMessage to ensure proper formatting
  const sendUserMessage = useCallback(
    (content: string) => {
      if (!content.trim()) {
        console.warn("[CHAT] Empty message ignored");
        return;
      }
      console.log("[CHAT] Sending user message:", content);
      sendMessage({ text: content });
    },
    [sendMessage]
  );

  return {
    messages,
    sendMessage: sendUserMessage,
    addToolResult,
    status,
    stop,
  };
}
