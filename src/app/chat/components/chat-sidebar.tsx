"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, User, Settings, X, MessageSquare, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { fetchUserConversations } from "@/app/actions/conversations";
import {
  searchConversations,
  type GroupedSearchResult,
} from "@/app/actions/search";

interface Conversation {
  id: string;
  title: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  userId: string;
}

export function ChatSidebar() {
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GroupedSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchConversations(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSearchResultClick = (conversationId: string) => {
    router.push(`/chat/${conversationId}`);
    clearSearch();
  };

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoading(true);
        const data = await fetchUserConversations();
        setConversations(data);
      } catch (error) {
        console.error("Failed to load conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();

    // Refresh conversations periodically (every 30 seconds)
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="flex flex-col gap-3">
          {/* New Chat Button */}
          <Link href="/chat" className="w-full">
            <div className="group flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <div className="relative">
                <Plus className="h-4 w-4 transition-all duration-200 group-hover:bg-white group-hover:text-black group-hover:rounded-full group-hover:p-1 group-hover:h-6 group-hover:w-6" />
              </div>
              <span className="text-sm font-medium">New Chat</span>
            </div>
          </Link>

          {/* Settings Button */}
          <Link href="/settings" className="w-full">
            <div className="group flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <Settings className="h-4 w-4 transition-all duration-200 group-hover:bg-white group-hover:text-black group-hover:rounded-full group-hover:p-1 group-hover:h-6 group-hover:w-6" />
              <span className="text-sm font-medium">Settings</span>
            </div>
          </Link>
        </div>
      </div>

      <SidebarSeparator />

      {/* Search with Command Component */}
      <div className="px-2 py-2">
        <Command className="rounded-lg border" shouldFilter={false}>
          <div className="relative">
            <CommandInput
              placeholder="Search conversations..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded z-10"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
          {searchQuery && (
            <CommandList className="max-h-[300px]">
              {isSearching ? (
                <div className="p-2 space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-muted rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <CommandEmpty>
                  No results found for &ldquo;{searchQuery}&rdquo;
                </CommandEmpty>
              ) : (
                searchResults.map((result) => (
                  <CommandGroup
                    key={result.conversationId}
                    heading={result.conversationTitle}
                  >
                    {result.matches.slice(0, 3).map((match) => (
                      <CommandItem
                        key={match.messageId}
                        value={`${result.conversationId}-${match.messageId}`}
                        onSelect={() =>
                          handleSearchResultClick(result.conversationId)
                        }
                        className="cursor-pointer"
                      >
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="line-clamp-1 text-xs">
                          {match.messageContent.slice(0, 80)}
                          {match.messageContent.length > 80 && "..."}
                        </span>
                      </CommandItem>
                    ))}
                    {result.matches.length > 3 && (
                      <CommandItem
                        value={`${result.conversationId}-more`}
                        onSelect={() =>
                          handleSearchResultClick(result.conversationId)
                        }
                        className="cursor-pointer text-muted-foreground"
                      >
                        <span className="text-xs">
                          +{result.matches.length - 3} more match
                          {result.matches.length > 4 ? "es" : ""}
                        </span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                ))
              )}
            </CommandList>
          )}
        </Command>
      </div>

      <SidebarSeparator />

      <SidebarContent className="p-4">
        <div className="space-y-2">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Previous Conversations
          </div>

          {/* Chat History */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 bg-muted rounded animate-pulse"
                  />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No conversations yet
              </p>
            ) : (
              conversations.map((conv) => (
                <SidebarMenuButton
                  key={conv.id}
                  asChild
                  className="w-full justify-start"
                >
                  <Link
                    href={`/chat/${conv.id}`}
                    className={`flex items-center text-sm p-3 rounded-lg transition-colors ${
                      pathname === `/chat/${conv.id}`
                        ? "bg-accent text-accent-foreground font-semibold"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <span className="truncate">{conv.title}</span>
                  </Link>
                </SidebarMenuButton>
              ))
            )}
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer">
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
                  Right-click for options
                </span>
              </div>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem asChild>
              <Link
                href="/settings"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <SignOutButton redirectUrl="/">
              <ContextMenuItem className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </ContextMenuItem>
            </SignOutButton>
          </ContextMenuContent>
        </ContextMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
