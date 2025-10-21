import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar";
import { ChatSidebar } from "./components/chat-sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarProvider>
        <Sidebar className="z-50">
          <SidebarContent>
            <ChatSidebar />
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 overflow-hidden w-full">{children}</main>
      </SidebarProvider>
    </div>
  );
}
