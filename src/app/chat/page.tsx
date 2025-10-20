"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Prism from "@/components/Prism";
import { ChatInputLanding } from "@/components/chat-input-landing";
import { v4 as uuidv4 } from "uuid";

export default function ChatPage() {
  const router = useRouter();

  const handleSubmit = (message: string) => {
    // Generate UUID for chat ID and redirect to chat page with query in search params
    const chatId = uuidv4();
    const searchParams = new URLSearchParams();
    searchParams.set("q", message);
    router.push(`/chat/${chatId}?${searchParams.toString()}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none p-4 border-b">
        <div className="flex items-center">
          <SidebarTrigger />
        </div>
      </div>
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

            {/* Chat Input Component */}
            <ChatInputLanding onSubmit={handleSubmit} />

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
