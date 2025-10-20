import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatSidebar } from "./components/chat-sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <ChatSidebar />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </SidebarProvider>
    </div>
  );
}
