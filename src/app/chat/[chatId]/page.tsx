import { loadConversationMessages } from "@/app/actions/conversations";
import { ClientChatComponent } from "@/components/client-chat";
import { currentUser } from "@clerk/nextjs/server";
import type { UIMessage } from "ai";

export default async function ChatIdPage({
  params,
  searchParams,
}: {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { chatId } = await params;
  const { q: initialQuery } = await searchParams;

  // Get current user for avatar
  const user = await currentUser();
  const userAvatar = user?.imageUrl || null;
  const userName = user?.fullName || user?.firstName || "You";

  // Load existing messages (if any)
  let storedMessages: UIMessage[] = [];
  try {
    storedMessages = await loadConversationMessages(chatId);
    console.log("[CHAT_PAGE] Loaded", storedMessages.length, "stored messages");
  } catch {
    // New conversation - that's ok
    console.log("[CHAT_PAGE] New conversation, no stored messages");
  }

  return (
    <ClientChatComponent
      chatId={chatId}
      initialMessages={storedMessages}
      initialQuery={initialQuery || null}
      userAvatar={userAvatar}
      userName={userName}
    />
  );
}
