    -- Create email_change_audit table
    CREATE TABLE IF NOT EXISTS "email_change_audit" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "field_changed" text NOT NULL,
    "old_value" text,
    "new_value" text NOT NULL,
    "changed_at" timestamp DEFAULT now()
    );

    -- Trigger 1: Auto-update conversation updated_at on new message
    -- This function is called whenever a message is inserted
    -- It updates the corresponding conversation's updated_at timestamp
    CREATE OR REPLACE FUNCTION public.update_conversation_last_activity()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY INVOKER
    AS $$
    BEGIN
    -- Update the conversation's updated_at timestamp
    UPDATE public."conversations"
    SET "updated_at" = now()
    WHERE "id" = NEW."conversation_id";
    
    RETURN NEW;
    END;
    $$;

    -- Attach the trigger to the messages table
    -- Fires AFTER INSERT to update the conversation timestamp
    CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON "messages"
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_activity();

    -- Trigger 2: Audit user email changes
    -- This function captures email changes before the update occurs
    -- and inserts them into the audit table
    CREATE OR REPLACE FUNCTION public.audit_user_email_change()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY INVOKER
    AS $$
    BEGIN
    -- Only audit if email has actually changed
    IF OLD."email" IS DISTINCT FROM NEW."email" THEN
        INSERT INTO public."email_change_audit" (
        "user_id",
        "field_changed",
        "old_value",
        "new_value",
        "changed_at"
        ) VALUES (
        NEW."id",
        'email',
        OLD."email",
        NEW."email",
        now()
        );
    END IF;
    
    RETURN NEW;
    END;
    $$;

    -- Attach the trigger to the users table
    -- Fires BEFORE UPDATE to capture the email change
    CREATE TRIGGER trigger_audit_email_changes
    BEFORE UPDATE ON "users"
    FOR EACH ROW
    EXECUTE FUNCTION audit_user_email_change();
