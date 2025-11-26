"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface SearchResult {
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  messageContent: string;
  messageRole: string;
  messageCreatedAt: Date;
  relevanceRank: number;
}

export interface GroupedSearchResult {
  conversationId: string;
  conversationTitle: string;
  matches: {
    messageId: string;
    messageContent: string;
    messageRole: string;
    messageCreatedAt: Date;
    relevanceRank: number;
  }[];
}

/**
 * Search conversations using the full-text search PostgreSQL function
 */
export async function searchConversations(
  query: string,
  limit: number = 20
): Promise<GroupedSearchResult[]> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (!query || query.trim().length === 0) {
    return [];
  }

  // Get the user's internal ID
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!user) {
    return [];
  }

  // Call the PostgreSQL function we created
  const results = await db.execute(
    sql`SELECT * FROM search_conversations(${
      user.id
    }, ${query.trim()}, ${limit})`
  );

  // Group results by conversation
  const grouped = new Map<string, GroupedSearchResult>();

  for (const row of results as unknown as Array<{
    conversation_id: string;
    conversation_title: string;
    message_id: string;
    message_content: string;
    message_role: string;
    message_created_at: Date;
    relevance_rank: number;
  }>) {
    const existing = grouped.get(row.conversation_id);

    if (existing) {
      existing.matches.push({
        messageId: row.message_id,
        messageContent: row.message_content,
        messageRole: row.message_role,
        messageCreatedAt: row.message_created_at,
        relevanceRank: row.relevance_rank,
      });
    } else {
      grouped.set(row.conversation_id, {
        conversationId: row.conversation_id,
        conversationTitle: row.conversation_title,
        matches: [
          {
            messageId: row.message_id,
            messageContent: row.message_content,
            messageRole: row.message_role,
            messageCreatedAt: row.message_created_at,
            relevanceRank: row.relevance_rank,
          },
        ],
      });
    }
  }

  return Array.from(grouped.values());
}
