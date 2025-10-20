"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Send } from "lucide-react";
import Prism from "@/components/Prism";

export default function ChatPage() {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // For now, just clear the input (functionality will be added later)
    console.log("User query:", input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none p-4 border-b">
        <div className="flex items-center">
          <SidebarTrigger />
        </div>
      </div>{" "}
      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Prism Background */}
        <div className="absolute inset-0 w-full h-full">
          <Prism
            animationType="rotate"
            timeScale={0.5}
            height={3.5}
            baseWidth={5.5}
            scale={3.6}
            hueShift={0}
            colorFrequency={1}
            noise={0.5}
            glow={1}
          />
        </div>

        {/* Chat Input Overlay */}
        <div className="relative z-10 flex items-center justify-center h-full p-6">
          <div className="w-full max-w-3xl">
            {/* Heading */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Database Design Made Simple
              </h1>
              <p className="text-white/80 text-lg">
                Convert natural language to SQL, generate ER diagrams, and
                design databases with AI
              </p>
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative flex items-start">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe your database schema, ask for SQL queries, or request ER diagrams..."
                  className="w-full pr-12 pl-3 py-4 text-base bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg focus:shadow-xl transition-shadow resize-none min-h-[120px] max-h-[300px] overflow-hidden scrollbar-hide"
                  rows={4}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height =
                      Math.min(target.scrollHeight, 300) + "px";
                  }}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="absolute right-2 top-2 h-8 w-8 p-0 rounded-lg"
                  disabled={!input.trim()}
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              </div>
            </form>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-start">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-background/95 backdrop-blur-sm"
              >
                <span>Attach Files</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
