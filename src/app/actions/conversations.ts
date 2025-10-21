"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { conversations, users, messages as messagesTable } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { UIMessage } from "ai";

/**
 * Utility: Retry database operations with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on authentication or validation errors
      if (
        error instanceof Error &&
        (error.message.includes("Unauthorized") ||
          error.message.includes("not found") ||
          error.message.includes("invalid"))
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(
          `[DB] Operation failed, retrying in ${delay}ms (attempt ${
            attempt + 1
          }/${maxRetries + 1})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

export async function fetchUserConversations() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return withRetry(async () => {
    // TODO: User should already exist from authentication flow
    // For now, create user if doesn't exist to avoid blocking sidebar
    // Implement proper user creation on auth callback later
    let user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      console.log("[USER] Creating user:", userId);
      // Get user details from Clerk
      const clerkUser = await currentUser();

      // Create user with real Clerk data, using clerkId as primary key
      const [newUser] = await db
        .insert(users)
        .values({
          id: userId, // Use Clerk ID as primary key
          clerkId: userId,
          email:
            clerkUser?.emailAddresses[0]?.emailAddress ||
            `${userId}@unknown.com`,
          name: clerkUser?.fullName || clerkUser?.firstName || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      user = newUser;
    }

    // Fetch all conversations for the user, ordered by most recent first
    const userConversations = await db.query.conversations.findMany({
      where: eq(conversations.userId, user.id),
      orderBy: (conv) => [desc(conv.updatedAt)],
    });

    return userConversations;
  });
}

export async function fetchConversationMessages(conversationId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return withRetry(async () => {
    // TODO: User should already exist from authentication flow
    // For now, create user if doesn't exist
    // Implement proper user creation on auth callback later
    let user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      console.log("[USER] Creating user:", userId);
      // Get user details from Clerk
      const clerkUser = await currentUser();

      // Create user with real Clerk data, using clerkId as primary key
      const [newUser] = await db
        .insert(users)
        .values({
          id: userId, // Use Clerk ID as primary key
          clerkId: userId,
          email:
            clerkUser?.emailAddresses[0]?.emailAddress ||
            `${userId}@unknown.com`,
          name: clerkUser?.fullName || clerkUser?.firstName || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      user = newUser;
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
  });
}

/**
 * Helper: Extract text content from UIMessage parts
 */
function extractTextFromParts(parts: UIMessage["parts"]): string {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join(" ")
    .trim();
}

/**
 * Load conversation messages as UIMessage[] format
 */
export async function loadConversationMessages(
  conversationId: string
): Promise<UIMessage[]> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return withRetry(async () => {
    // TODO: User should already exist from authentication flow
    // For now, create user if doesn't exist to avoid blocking conversation loading
    // Implement proper user creation on auth callback later
    let user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      console.log("[USER] Creating user:", userId);
      // Get user details from Clerk
      const clerkUser = await currentUser();

      // Create user with real Clerk data, using clerkId as primary key
      const [newUser] = await db
        .insert(users)
        .values({
          id: userId, // Use Clerk ID as primary key
          clerkId: userId,
          email:
            clerkUser?.emailAddresses[0]?.emailAddress ||
            `${userId}@unknown.com`,
          name: clerkUser?.fullName || clerkUser?.firstName || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      user = newUser;
    }

    // Verify conversation belongs to user (or doesn't exist yet for new conversations)
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, user.id)
      ),
    });

    // If conversation doesn't exist yet, return empty array (new conversation)
    if (!conversation) {
      return [];
    }

    // Fetch all messages for the conversation
    const msgs = await db.query.messages.findMany({
      where: eq(messagesTable.conversationId, conversationId),
      orderBy: (msg) => [msg.createdAt],
    });

    // Convert to UIMessage format
    return msgs.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts: [
        {
          type: "text" as const,
          text: msg.content,
        },
      ],
    }));
  });
}

/**
 * Generate a conversation title from first exchange
 */
export async function generateConversationTitle(
  firstUserMsg: string,
  firstAiMsg: string
): Promise<string> {
  try {
    const prompt = `Create a concise 3-4 word title for this conversation. Use the user's message and the assistant's reply to produce a short descriptive title. Output ONLY the title (no punctuation, no quotes), 3 to 4 words.

User: ${firstUserMsg}
Assistant: ${firstAiMsg}`;

    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt,
      temperature: 0.2,
    });

    // Clean up the title
    let title = (text ?? "").replace(/\s+/g, " ").trim();
    // Remove punctuation
    title = title.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
    const words = title.split(" ").filter(Boolean);

    if (words.length === 0) return "New Chat";
    if (words.length > 4) title = words.slice(0, 4).join(" ");
    if (words.length < 3) {
      // If too short, try to expand by appending important words from user message
      const extra = firstUserMsg
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 3 - words.length);
      title = [...words, ...extra].slice(0, 4).join(" ");
    }

    return title || "New Chat";
  } catch (error) {
    console.error("Error generating title:", error);
    return "New Chat";
  }
}

/**
 * Save complete conversation with messages
 * Uses upsert pattern - creates conversation if doesn't exist, updates if it does
 */
export async function saveConversation({
  conversationId,
  userId,
  title,
  messages,
}: {
  conversationId: string;
  userId: string;
  title?: string;
  messages: UIMessage[];
}): Promise<void> {
  return withRetry(async () => {
    console.log("[SAVE_CONV] Saving conversation:", {
      conversationId,
      userId,
      title,
      messageCount: messages.length,
    });

    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      // Check if conversation exists
      const existingConversation = await tx.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
      });

      if (!existingConversation) {
        // Create new conversation
        await tx.insert(conversations).values({
          id: conversationId,
          userId,
          title: title || "New Chat",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log("[SAVE_CONV] Created new conversation");
      } else {
        // Update existing conversation
        await tx
          .update(conversations)
          .set({
            title: title || existingConversation.title,
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, conversationId));
        console.log("[SAVE_CONV] Updated existing conversation");
      }

      // Upsert messages (insert new, update existing)
      if (messages.length > 0) {
        for (const msg of messages) {
          const content = extractTextFromParts(msg.parts);

          await tx
            .insert(messagesTable)
            .values({
              id: msg.id,
              conversationId,
              role: msg.role,
              content,
              createdAt: new Date(),
            })
            .onConflictDoUpdate({
              target: messagesTable.id,
              set: {
                content,
                role: msg.role,
              },
            });
        }
        console.log("[SAVE_CONV] Saved", messages.length, "messages");
      }
    });

    console.log("[SAVE_CONV] Transaction completed successfully");
  });
}

/**
 * Get or create user in database
 */
export async function getOrCreateUser(clerkUserId: string, email?: string) {
  return withRetry(async () => {
    // Try to find existing user
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkUserId),
    });

    if (existingUser) {
      return existingUser;
    }

    // Get user details from Clerk
    const clerkUser = await currentUser();

    // Create new user with real Clerk data, using clerkId as primary key
    const [newUser] = await db
      .insert(users)
      .values({
        id: clerkUserId, // Use Clerk ID as primary key
        clerkId: clerkUserId,
        email:
          clerkUser?.emailAddresses[0]?.emailAddress ||
          email ||
          `${clerkUserId}@unknown.com`,
        name: clerkUser?.fullName || clerkUser?.firstName || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log("[USER] Created new user:", newUser.id, newUser.email);
    return newUser;
  });
}

/**
 * Get conversation by ID (without auth check - used internally)
 */
export async function getConversation(conversationId: string) {
  return withRetry(async () => {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });
    return conversation;
  });
}
