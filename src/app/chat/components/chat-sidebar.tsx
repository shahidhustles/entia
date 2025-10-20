"use client";

import { useUser } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { User, Plus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export function ChatSidebar() {
  const { user } = useUser();

  // Get current time for greeting
  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <Sidebar className="border-r w-80">
      <SidebarHeader className="p-4">
        <div className="space-y-4">
          {/* Greeting */}
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">
              {getCurrentGreeting()}, {user?.firstName || "User"}
            </h2>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Action Buttons Row */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* New Chat Button */}
          <Link href="/chat" className="flex-1">
            <div className="group flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <div className="relative">
                <Plus className="h-4 w-4 transition-all duration-200 group-hover:bg-white group-hover:text-black group-hover:rounded-full group-hover:p-1 group-hover:h-6 group-hover:w-6" />
              </div>
              <span className="text-sm font-medium">New Chat</span>
            </div>
          </Link>

          {/* Profile Button */}
        </div>
      </div>

      <SidebarSeparator />

      <SidebarContent className="p-4">
        <div className="space-y-2">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Previous Conversations
          </div>

          {/* Placeholder for chat history */}
          <div className="space-y-2">
            <SidebarMenuButton asChild className="w-full justify-start">
              <Link
                href="/chat/example-1"
                className="flex items-center text-sm p-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <span className="truncate">
                  Database Schema Design Discussion
                </span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton asChild className="w-full justify-start">
              <Link
                href="/chat/example-2"
                className="flex items-center text-sm p-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <span className="truncate">
                  ER Diagram Generation for E-commerce
                </span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton asChild className="w-full justify-start">
              <Link
                href="/chat/example-3"
                className="flex items-center text-sm p-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <span className="truncate">
                  SQL Optimization and Query Planning
                </span>
              </Link>
            </SidebarMenuButton>
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                  {user?.imageUrl ? (
                    <Image
                      src={user.imageUrl}
                      alt={user.fullName || "User"}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium">
                    {user?.fullName || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Profile Settings
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
