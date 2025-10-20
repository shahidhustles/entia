"use client";

import { useEffect, useState } from "react";
import { fetchConversationMessages } from "@/app/actions/conversations";

interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date | null;
}

export function useConversationMessages(conversationId: string | null) {
  const [storedMessages, setStoredMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setStoredMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const messages = await fetchConversationMessages(conversationId);
        setStoredMessages(messages as Message[]);
      } catch (err) {
        console.error("Error loading conversation messages:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load messages"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [conversationId]);

  return { storedMessages, isLoading, error };
}
