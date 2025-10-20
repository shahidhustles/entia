import { useChat as useBaseChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useCallback } from "react";

/**
 * Custom useChat hook with Vercel AI SDK integration
 * Handles tool calls, streaming, and message management
 */
export function useChat() {
  const { messages, sendMessage, addToolResult, status, stop } = useBaseChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
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

      // For now, all tools are server-side and will be executed by the API
      // This handler will be extended when we add client-side tools
      switch (toolCall.toolName) {
        case "get_database_schema":
          console.log(
            "[TOOL CALL] get_database_schema - server-side execution"
          );
          break;
        case "query_database":
          console.log(
            "[TOOL CALL] query_database - server-side execution",
            toolCall.input
          );
          break;
        case "execute_sql":
          console.log(
            "[TOOL CALL] execute_sql - server-side execution",
            toolCall.input
          );
          break;
        case "save_diagram":
          console.log(
            "[TOOL CALL] save_diagram - server-side execution",
            toolCall.input
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
