-- =============================================
-- 1. Full-Text Search Function for Messages
-- =============================================
-- This function searches message content and returns 
-- matching conversations with relevance ranking

CREATE OR REPLACE FUNCTION public.search_conversations(
    p_user_id TEXT,
    p_search_query TEXT,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    conversation_id TEXT,
    conversation_title TEXT,
    message_id TEXT,
    message_content TEXT,
    message_role TEXT,
    message_created_at TIMESTAMP,
    relevance_rank REAL
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS conversation_id,
        c.title AS conversation_title,
        m.id AS message_id,
        m.content AS message_content,
        m.role AS message_role,
        m.created_at AS message_created_at,
        ts_rank(
            to_tsvector('english', m.content),
            plainto_tsquery('english', p_search_query)
        ) AS relevance_rank
    FROM public.messages m
    INNER JOIN public.conversations c ON c.id = m.conversation_id
    WHERE c.user_id = p_user_id
        AND to_tsvector('english', m.content) @@ plainto_tsquery('english', p_search_query)
    ORDER BY relevance_rank DESC, m.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Add a GIN index on messages.content for faster full-text search
CREATE INDEX IF NOT EXISTS idx_messages_content_fts 
ON public.messages 
USING GIN (to_tsvector('english', content));

-- =============================================
-- 2. Active Users View
-- =============================================
-- Shows users with their recent activity stats

CREATE OR REPLACE VIEW public.active_users AS
SELECT 
    u.id,
    u.clerk_id,
    u.email,
    u.name,
    u.created_at AS user_created_at,
    u.updated_at AS user_updated_at,
    COUNT(DISTINCT c.id) AS total_conversations,
    COUNT(m.id) AS total_messages,
    MAX(c.updated_at) AS last_conversation_activity,
    MAX(m.created_at) AS last_message_at,
    CASE 
        WHEN MAX(m.created_at) > NOW() - INTERVAL '24 hours' THEN 'active'
        WHEN MAX(m.created_at) > NOW() - INTERVAL '7 days' THEN 'recent'
        WHEN MAX(m.created_at) > NOW() - INTERVAL '30 days' THEN 'inactive'
        ELSE 'dormant'
    END AS activity_status
FROM public.users u
LEFT JOIN public.conversations c ON c.user_id = u.id
LEFT JOIN public.messages m ON m.conversation_id = c.id
GROUP BY u.id, u.clerk_id, u.email, u.name, u.created_at, u.updated_at
ORDER BY last_message_at DESC NULLS LAST;

-- =============================================
-- 3. Bonus: Conversation Summary View
-- =============================================
-- Useful for the sidebar - shows conversation with message count

CREATE OR REPLACE VIEW public.conversation_summary AS
SELECT 
    c.id,
    c.user_id,
    c.title,
    c.created_at,
    c.updated_at,
    COUNT(m.id) AS message_count,
    MIN(m.created_at) AS first_message_at,
    MAX(m.created_at) AS last_message_at
FROM public.conversations c
LEFT JOIN public.messages m ON m.conversation_id = c.id
GROUP BY c.id, c.user_id, c.title, c.created_at, c.updated_at
ORDER BY c.updated_at DESC;