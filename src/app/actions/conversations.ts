"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { conversations, users, messages as messagesTable } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function fetchUserConversations() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    // Fetch user to get database user ID
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      return [];
    }

    // Fetch all conversations for the user, ordered by most recent first
    const userConversations = await db.query.conversations.findMany({
      where: eq(conversations.userId, user.id),
      orderBy: (conv) => [desc(conv.updatedAt)],
    });

    return userConversations;
  } catch (error) {
    console.error("Error fetching conversations:", error);
    throw error;
  }
}

export async function fetchConversationMessages(conversationId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    // Fetch user to get database user ID
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify conversation belongs to user
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, user.id)
      ),
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Fetch all messages for the conversation
    const msgs = await db.query.messages.findMany({
      where: eq(messagesTable.conversationId, conversationId),
      orderBy: (msg) => [msg.createdAt],
    });

    return msgs;
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
}
