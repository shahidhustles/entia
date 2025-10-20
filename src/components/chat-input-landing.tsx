"use client";

import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useState } from "react";

export interface ChatInputLandingProps {
  onSubmit: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxHeight?: number;
  minHeight?: number;
}

export function ChatInputLanding({
  onSubmit,
  placeholder = "Describe your database schema, ask for SQL queries, or request ER diagrams...",
  disabled = false,
  maxHeight = 300,
  minHeight = 120,
}: ChatInputLandingProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;

    onSubmit(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || disabled) return;
      onSubmit(input);
      setInput("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative flex items-start">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pr-12 pl-3 py-4 text-base bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg focus:shadow-xl transition-shadow resize-none overflow-hidden scrollbar-hide disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            minHeight: `${minHeight}px`,
            maxHeight: `${maxHeight}px`,
          }}
          rows={4}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height =
              Math.min(target.scrollHeight, maxHeight) + "px";
          }}
        />
        <Button
          type="submit"
          size="sm"
          className="absolute right-2 top-2 h-8 w-8 p-0 rounded-lg"
          disabled={!input.trim() || disabled}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </form>
  );
}
