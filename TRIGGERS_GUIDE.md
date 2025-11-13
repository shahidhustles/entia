# Database Triggers Implementation Guide

## Overview

Your project has **two separate databases**:

1. **Supabase PostgreSQL** (App Database) - Managed via Drizzle ORM
2. **User's MySQL/PostgreSQL** (Direct Access) - Accessed via mysql2/promise

Triggers can be added to **BOTH** databases, each with different approaches.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Entia Application                         │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌──────────────────────┐         ┌──────────────────────────┐
│ Supabase PostgreSQL  │         │ User's MySQL/PostgreSQL   │
│ (App Database)       │         │ (Direct Access)           │
├──────────────────────┤         ├──────────────────────────┤
│ - users              │         │ - User's custom tables    │
│ - conversations      │         │ - Any schema             │
│ - messages           │         │ (trigger support varies) │
│ (Managed via Drizzle)│         │ (Direct SQL execution)   │
└──────────────────────┘         └──────────────────────────┘
        ▲                                     ▲
        │                                     │
   Drizzle ORM                          mysql2/promise
   (Type-safe)                          (Raw SQL)
```

---

## Part 1: Triggers in User's MySQL/PostgreSQL Database

### How Triggers Work

Users can ask the AI to create triggers directly in their own databases through the **execute_sql** tool.

### Example Flows

#### **Flow 1: Create a trigger via AI Chat**

```
User: "Create a trigger that logs all updates to the users table"
        ↓
AI: [Calls ask_for_confirmation with CREATE TRIGGER SQL]
        ↓
User: [Clicks Confirm in UI]
        ↓
AI: [Calls execute_sql with the CREATE TRIGGER statement]
        ↓
Trigger is created in user's database
```

#### **Flow 2: Create an audit log trigger**

User can ask to create an audit table + trigger:

```sql
-- Table for audit log
CREATE TABLE user_audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(10),
  old_email VARCHAR(255),
  new_email VARCHAR(255),
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Trigger on UPDATE
CREATE TRIGGER user_email_audit
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
  IF NEW.email != OLD.email THEN
    INSERT INTO user_audit_log (user_id, action, old_email, new_email)
    VALUES (NEW.id, 'UPDATE', OLD.email, NEW.email);
  END IF;
END;
```

### Current Implementation Status

✅ **Already Supported** - Users can create triggers via the chat interface:

1. User asks to create a trigger
2. AI generates trigger SQL
3. AI calls `ask_for_confirmation` tool
4. User confirms
5. AI calls `execute_sql` with trigger code
6. Trigger is created in user's database

**File involved:** `/src/app/actions/tools/execute-sql.ts` - Already handles this!

### Example Trigger Commands

Users can ask:

- "Create a trigger to log changes to the products table"
- "Add an audit trigger for the orders table"
- "Create a trigger that updates last_modified timestamp"
- "Set up an auto-increment trigger"

---

## Part 2: Triggers in Supabase PostgreSQL (App Database)

### Current Implementation Status

❌ **NOT IMPLEMENTED** - Currently no triggers in the app database

### Where to Add Triggers

Triggers for the app database should be added in **migration files**:

```
/drizzle/migrations/
├── 0001_initial_schema.sql
├── 0002_add_triggers.sql  ← Add here
└── ...
```

### Implementation Steps

#### Step 1: Create a new migration file

```bash
# Generate migration file
npm run db:migrate
```

This creates: `/drizzle/migrations/0002_add_triggers.sql`

#### Step 2: Add trigger definitions

Edit the migration file with your triggers:

```sql
-- Trigger to auto-update conversation title based on first message
CREATE OR REPLACE FUNCTION update_conversation_title()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET title = SUBSTRING(NEW.content, 1, 50)
  WHERE id = NEW.conversation_id
  AND title = 'New Chat';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_conversation_title
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_title();
```

#### Step 3: Push migration

```bash
npm run db:push
```

### Suggested Triggers for Your App

#### **1. Auto-timestamp messages**

```sql
CREATE OR REPLACE FUNCTION set_message_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_created_at
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION set_message_timestamp();
```

#### **2. Update conversation last modified**

```sql
CREATE OR REPLACE FUNCTION update_conversation_modified()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conv_on_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_modified();
```

#### **3. Audit user changes**

```sql
CREATE TABLE user_audit (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION audit_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    INSERT INTO user_audit (user_id, field_changed, old_value, new_value)
    VALUES (NEW.id, 'email', OLD.email, NEW.email);
  END IF;

  IF NEW.name IS DISTINCT FROM OLD.name THEN
    INSERT INTO user_audit (user_id, field_changed, old_value, new_value)
    VALUES (NEW.id, 'name', OLD.name, NEW.name);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_changes_audit
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION audit_user_changes();
```

#### **4. Prevent empty conversation titles**

```sql
CREATE OR REPLACE FUNCTION validate_conversation_title()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.title IS NULL OR NEW.title = '' THEN
    NEW.title := 'Untitled Chat';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_conversation_title
BEFORE INSERT OR UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION validate_conversation_title();
```

---

## Part 3: AI-Assisted Trigger Generation

### How to Use Through Chat

The AI can already help users create triggers. Here's what you can tell users:

#### **Query Current Triggers**

User: "Show me what triggers exist in my database"

```
AI will call: get_database_schema → Parse schema information
AI generates: Information_schema query to list triggers
```

#### **Create New Triggers**

User: "Add a trigger that timestamps all updates to the products table"

```
AI generates:
CREATE TRIGGER products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
BEGIN
  SET NEW.updated_at = NOW();
END;

AI calls: ask_for_confirmation
User: [Clicks Confirm]
AI calls: execute_sql
Result: Trigger created ✅
```

#### **Describe Trigger Logic**

User: "What triggers do I have and what do they do?"

```
AI calls: get_database_schema
AI parses: Information_schema.triggers table
AI explains: Purpose of each trigger
AI shows: Trigger code
```

---

## Part 4: Adding Trigger Support to System Prompt

To make the AI more helpful with triggers, update the system prompt in `/src/app/api/chat/route.ts`:

```xml
<trigger_capabilities>
You can help users create, modify, and analyze database triggers:

1. CREATE TRIGGER queries - When user asks to create triggers
   - Generate trigger code with proper syntax
   - Explain what the trigger will do
   - Use ask_for_confirmation before executing
   - Execute with execute_sql tool

2. VIEW TRIGGERS - Use get_database_schema to understand structure
   - Parse INFORMATION_SCHEMA.TRIGGERS for MySQL
   - Parse pg_trigger for PostgreSQL
   - Display trigger purpose and code

3. TRIGGER PATTERNS - Provide common trigger templates:
   - Auto-timestamp on INSERT/UPDATE
   - Audit logging on data changes
   - Cascade updates/deletes
   - Data validation on INSERT
   - Prevent duplicate entries

Common trigger examples:
- Auto-update timestamp columns (updated_at)
- Maintain audit/history tables
- Enforce business logic at database level
- Calculate computed columns
- Maintain referential integrity
</trigger_capabilities>
```

---

## Part 5: File Organization

Where triggers fit in your current structure:

```
/src/app/actions/tools/
├── get-database-schema.ts     ✅ Fetch trigger info
├── query-database.ts          ✅ Query trigger info
├── execute-sql.ts             ✅ Execute CREATE TRIGGER
└── [Could add] manage-triggers.ts (optional - for advanced trigger management)

/drizzle/migrations/
├── 0001_initial.sql
└── [Add] 0002_add_app_triggers.sql  ← App database triggers

/src/db/schema.ts              - Add audit_log table if needed
```

---

## Part 6: Best Practices

### For User's Database (MySQL/PostgreSQL)

✅ **DO:**

- Ask user to confirm before creating triggers
- Explain what the trigger does in plain English
- Show trigger code before execution
- Test with sample data first

❌ **DON'T:**

- Create triggers without confirmation
- Use complex logic that's hard to debug
- Create triggers that block transactions
- Ignore performance implications

### For App Database (Supabase)

✅ **DO:**

- Put triggers in migration files
- Document what each trigger does
- Use versioned migrations
- Test migrations locally first
- Back up before applying

❌ **DON'T:**

- Modify production database directly
- Create triggers without documentation
- Use triggers for business logic (use application code instead)

---

## Part 7: Testing Triggers

### Test User's Triggers via Chat

User: "Create a test trigger and show me it works"

```
1. Create trigger
2. Insert/update test data
3. Query to verify trigger executed
4. Show results in chat
```

### Example Test Flow

```sql
-- Step 1: Create trigger (user confirms)
CREATE TRIGGER test_trigger
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  INSERT INTO audit_log VALUES (NULL, NEW.id, 'INSERT', NOW());
END;

-- Step 2: Insert test data (AI executes)
INSERT INTO users (email, name) VALUES ('test@example.com', 'Test User');

-- Step 3: Verify trigger fired (AI queries)
SELECT * FROM audit_log ORDER BY id DESC LIMIT 1;

-- Result: Shows that trigger executed automatically
```

---

## Implementation Roadmap

### Phase 1: ✅ User Can Create Triggers

- Already works via execute_sql tool
- Users can create triggers in their own databases
- No new code needed

### Phase 2: Add App Database Triggers

```
1. Create migration file with trigger definitions
2. Run: npm run db:push
3. Triggers active in Supabase
```

### Phase 3: AI Trigger Management (Future)

```
- Create tool: create_trigger_safely()
- Create tool: analyze_triggers()
- Create tool: delete_trigger()
- Enhanced trigger debugging
```

### Phase 4: Trigger Templates (Future)

```
- Pre-built trigger templates
- Drag-and-drop trigger builder
- Visual trigger designer
- Performance analysis
```

---

## Quick Start

### To create triggers in user's MySQL database:

**User says in chat:**

```
"Create a trigger that logs every INSERT into the users table to an audit_log table"
```

**What happens automatically:**

1. ✅ AI generates trigger SQL
2. ✅ Calls ask_for_confirmation tool
3. ✅ User clicks Confirm button
4. ✅ execute_sql tool runs the trigger creation
5. ✅ Trigger is live in user's database

**No additional code needed!**

---

## Summary

| Aspect            | Status     | How to Use                           |
| ----------------- | ---------- | ------------------------------------ |
| User's Triggers   | ✅ Ready   | Ask AI to create them via chat       |
| App Triggers      | ❌ Not yet | Add to `/drizzle/migrations/`        |
| Trigger Info      | ✅ Ready   | AI can fetch via get_database_schema |
| Trigger Templates | ❌ Future  | Can add to system prompt             |
| Trigger UI        | ❌ Future  | Could build visual trigger builder   |

**Next Step:** Would you like me to:

1. Add triggers to your Supabase database?
2. Create a dedicated trigger management tool?
3. Update the system prompt with trigger examples?
