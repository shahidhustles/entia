"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
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

export default function ChatIdPage() {
  const searchParams = useSearchParams();
  const hasInitialized = useRef(false);
  const hasSentInitialMessage = useRef(false);

  const initialQuery = searchParams.get("q");
  const hasQueryParam = !!initialQuery;

  const { messages, sendMessage, status } = useChat();

  // Extract query from search params and send initial message (for new chats)
  // Only run ONCE when component mounts with query param
  useEffect(() => {
    if (
      !hasInitialized.current &&
      !hasSentInitialMessage.current &&
      hasQueryParam &&
      initialQuery
    ) {
      console.log("[CHAT_PAGE] Sending initial query:", initialQuery);
      sendMessage(initialQuery);
      hasInitialized.current = true;
      hasSentInitialMessage.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount to prevent duplicate messages

  // Helper function to render message parts
  const renderMessageParts = (parts: Record<string, unknown>[]) => {
    return parts.map((part: Record<string, unknown>, index: number) => {
      switch (String(part.type)) {
        case "text":
          return <Response key={index}>{String(part.text)}</Response>;

        case "reasoning":
          return (
            <Reasoning key={index} defaultOpen={false}>
              <ReasoningTrigger />
              <ReasoningContent>{String(part.text)}</ReasoningContent>
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
                  String(part.state) as
                    | "input-streaming"
                    | "input-available"
                    | "output-available"
                    | "output-error"
                }
                type={String(part.type) as `tool-${string}`}
              />
              <ToolContent>
                {(String(part.state) === "input-streaming" ||
                  String(part.state) === "input-available") && (
                  <ToolInput input={part.input} />
                )}
                {(String(part.state) === "output-available" ||
                  String(part.state) === "output-error") && (
                  <ToolOutput
                    errorText={
                      part.errorText ? String(part.errorText) : undefined
                    }
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
                Starting a new conversation...
              </div>
            ) : (
              <>
                {/* Show messages from current session */}
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    from={message.role as "user" | "assistant"}
                  >
                    <MessageContent>
                      {renderMessageParts(message.parts)}
                    </MessageContent>
                    <MessageAvatar
                      name={message.role === "user" ? "You" : "Assistant"}
                      src={
                        message.role === "user"
                          ? "https://github.com/user.png"
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
