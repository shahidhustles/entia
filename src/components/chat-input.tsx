"use client";

import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useState } from "react";
import type { ChatStatus } from "ai";

export interface ChatInputProps {
  onSubmit: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  status?: ChatStatus;
}

export function ChatInput({
  onSubmit,
  placeholder = "Ask anything about your database...",
  disabled = false,
  status = "ready",
}: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || disabled || status === "streaming") return;

    onSubmit(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || disabled || status === "streaming") return;
      onSubmit(input);
      setInput("");
    }
  };

  return (
    <div className="flex-none p-4 sm:p-6 md:p-8 border-t border-border bg-background/50 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || status === "streaming"}
              className="flex-1 pr-12 pl-4 py-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 focus:ring-offset-background resize-none min-h-[44px] max-h-[200px] overflow-y-auto scrollbar-hide disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 200) + "px";
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 flex-shrink-0 rounded-lg"
              disabled={!input.trim() || disabled || status === "streaming"}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
