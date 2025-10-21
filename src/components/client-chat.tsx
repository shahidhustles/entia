"use client";

import { useEffect, useRef } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/ai/conversation";
import {
  Message,
  MessageContent,
  MessageAvatar,
} from "@/components/ui/ai/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ui/ai/tool";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ui/ai/reasoning";
import { Response } from "@/components/ui/ai/response";
import { useChat } from "@/hooks/use-chat";
import { ChatInput } from "@/components/chat-input";
import type { UIMessage } from "ai";

interface ClientChatComponentProps {
  chatId: string;
  initialMessages: UIMessage[];
  initialQuery: string | null;
  userAvatar: string | null;
  userName: string;
}

export function ClientChatComponent({
  chatId,
  initialMessages,
  initialQuery,
  userAvatar,
  userName,
}: ClientChatComponentProps) {
  const hasInitialized = useRef(false);
  const hasSentInitialMessage = useRef(false);

  const { messages, sendMessage, status } = useChat(chatId, initialMessages);

  // Send initial query ONLY if:
  // 1. We have a query param
  // 2. No existing messages were loaded
  // 3. Haven't sent this query yet
  useEffect(() => {
    if (
      !hasInitialized.current &&
      !hasSentInitialMessage.current &&
      initialQuery &&
      initialMessages.length === 0
    ) {
      console.log("[CLIENT_CHAT] Sending initial query:", initialQuery);
      sendMessage(initialQuery);
      hasInitialized.current = true;
      hasSentInitialMessage.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Helper function to render message parts
  const renderMessageParts = (parts: UIMessage["parts"]) => {
    return parts.map((part, index: number) => {
      switch (part.type) {
        case "text":
          return <Response key={index}>{part.text}</Response>;

        case "reasoning":
          return (
            <Reasoning key={index} defaultOpen={false}>
              <ReasoningTrigger />
              <ReasoningContent>{part.text}</ReasoningContent>
            </Reasoning>
          );

        case "tool-get_database_schema":
        case "tool-query_database":
        case "tool-execute_sql":
        case "tool-save_diagram":
          return (
            <Tool key={index} defaultOpen={true}>
              <ToolHeader
                state={
                  part.state as
                    | "input-streaming"
                    | "input-available"
                    | "output-available"
                    | "output-error"
                }
                type={part.type}
              />
              <ToolContent>
                {(part.state === "input-streaming" ||
                  part.state === "input-available") && (
                  <ToolInput input={part.input} />
                )}
                {(part.state === "output-available" ||
                  part.state === "output-error") && (
                  <ToolOutput
                    errorText={part.errorText}
                    output={
                      part.output ? (
                        <Response>
                          {JSON.stringify(part.output, null, 2)}
                        </Response>
                      ) : undefined
                    }
                  />
                )}
              </ToolContent>
            </Tool>
          );

        default:
          return null;
      }
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Header with Sidebar Trigger */}
      <div className="flex-none p-4 border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="h-9 w-9" />
        </div>
      </div>

      {/* Messages Area - Scrollable using Conversation Component */}
      <Conversation className="flex-1">
        <ConversationContent className="px-4 sm:px-6 md:px-8 py-8">
          <div className="max-w-4xl mx-auto w-full">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {initialMessages.length > 0
                  ? "Loading conversation..."
                  : "Starting a new conversation..."}
              </div>
            ) : (
              <>
                {/* Show all messages (includes initial + new) */}
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    from={message.role as "user" | "assistant"}
                  >
                    <MessageContent>
                      {renderMessageParts(message.parts)}
                    </MessageContent>
                    <MessageAvatar
                      name={message.role === "user" ? userName : "Assistant"}
                      src={
                        message.role === "user"
                          ? userAvatar || "https://github.com/user.png"
                          : "https://github.com/openai.png"
                      }
                    />
                  </Message>
                ))}
              </>
            )}
          </div>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Chat Input Component */}
      <ChatInput
        onSubmit={(message) => {
          sendMessage(message);
        }}
        status={status}
      />
    </div>
  );
}
