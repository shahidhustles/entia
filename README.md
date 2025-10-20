# ER Diagram to SQL and SQL to ER with AI

## 📌 Project Overview

**ER Diagram to SQL** is an intelligent database design platform that uses AI (Google Gemini) to enable seamless conversion between Natural Language, SQL queries, and ER diagrams. Built as a web application with real-time database interaction capabilities.

### Core Purpose

- Convert **Natural Language** → **SQL** → **Database**
- Generate **ER Diagrams** from existing database schemas
- Create **SQL Tables** from ER diagrams and descriptions
- Execute queries on user's actual database in real-time

**Course**: DBMS Course Project  
**Institution**: Database Management Systems

---

## 🎯 Key Features

### 1. **Chat-Based AI Interface**

- Single `/api/chat` endpoint for all AI interactions
- Conversational interface with message history
- Real-time AI responses with streaming support
- Context-aware responses based on user's database schema

### 2. **NLP to SQL Conversion**

- User describes database requirements in natural language
- AI generates optimized SQL CREATE TABLE statements
- Automatic table creation in user's database
- Visual confirmation with schema preview

### 3. **SQL to ER Diagram Generation**

- Automatic schema analysis from user's database
- Generates Mermaid ER diagrams showing:
  - Tables and columns
  - Primary and foreign key relationships
  - Cardinalities (1-to-1, 1-to-many, many-to-many)
  - Data types and constraints
- Direct rendering in chat interface

### 4. **ER Diagram to SQL Generation**

- User describes entities and relationships
- AI generates normalized SQL DDL statements
- Support for proper normalization (1NF, 2NF, 3NF)
- One-click execution to create actual database tables

### 5. **Real-Time Database Operations**

- Query user's database to fetch schema information
- Execute DDL operations (CREATE, ALTER, DROP tables)
- **Client-side confirmation for dangerous operations** (DROP, DELETE)
- Direct connection to MySQL/PostgreSQL databases

### 6. **Conversation & History Management**

- Persistent chat conversation history
- Sidebar display of chat sessions
- Full conversation context for multi-step operations
- Save important ER diagrams with metadata

### 7. **Database Connection Management**

- One database per user (single connection URL)
- Secure encrypted storage of connection strings
- Support for:
  - **Local MySQL** (e.g., `localhost:3306`)
  - **Local PostgreSQL** (future support)
  - Remote MySQL/PostgreSQL servers
- Connection validation before storage
- Easy update/edit of database URL in profile

---

## 🏗️ Architecture

### **Two Separate Databases**

```
┌─────────────────────────────────────────────────────────┐
│                    Your Web App                          │
└─────────────────────────────────────────────────────────┘
          │                                    │
          │                                    │
    ┌─────▼──────┐                    ┌──────▼────────┐
    │   USER'S    │                    │  SUPABASE     │
    │   MySQL     │                    │  PostgreSQL   │
    │ (Local or   │                    │  (App DB)     │
    │  Remote)    │                    │               │
    │             │                    │  Drizzle ORM  │
    │ Direct SQL  │                    │  - Users      │
    │ Execution   │                    │  - Diagrams   │
    │ No ORM      │                    │  - Chats      │
    │ (mysql2)    │                    │  - Metadata   │
    └─────────────┘                    └───────────────┘
```

### **User Flow**

```
1. AUTHENTICATION (Protected by Clerk)
   └─ User logs in via Clerk
   └─ Chat page auto-protected, redirects if not authenticated

2. SETUP (Profile Page)
   └─ User enters database connection URL (MySQL/PostgreSQL)
   └─ System validates connection
   └─ Encrypted storage of credentials (in Supabase PostgreSQL)

3. INTERACTION (Chat Page)
   └─ User sends message to AI
   └─ AI accesses user's database schema (via mysql2)
   └─ AI generates SQL/Mermaid code
   └─ AI makes tool calls (query/execute on user's DB)
   └─ Results displayed in chat
   └─ Conversation saved to Supabase (via Drizzle ORM)
```

### **Request/Response Flow**

```
User Message
    ↓
POST /api/chat (with userId + message)
    ↓
Backend:
  1. Fetch user (Clerk auth)
  2. Fetch user's MySQL connection string from Supabase (Drizzle)
  3. Get user's database schema via mysql2 (direct SQL)
  4. Call Gemini API with:
     - User message
     - Available AI tool definitions
     - Database schema context
    ↓
Gemini Response with Tool Calls:
  - Text explanation
  - Tool calls (query_database, execute_sql, etc.)
    ↓
Backend Executes Tools (Direct SQL via mysql2):
  - get_database_schema → Direct SQL query to user's MySQL
  - query_database → Direct SQL SELECT execution
  - execute_sql → Direct SQL DDL/DML execution
  - Collect results
    ↓
Send Results Back to Gemini
    ↓
Gemini Generates Final Response:
  - Chat message with explanation
  - Mermaid diagram code (if applicable)
  - SQL snippets (if applicable)
    ↓
Save Conversation to Supabase (Drizzle ORM):
  - Store message, role, mermaid code, SQL snippets
    ↓
Stream Response to Frontend
    ↓
Frontend Renders:
  - Chat message
  - Mermaid diagram (live rendering)
  - SQL code blocks with copy buttons
  - Save diagram button
```

---

## 🛠️ AI Tool Calls

Gemini has access to these tools for database operations:

### **1. `get_database_schema`**

- **Purpose**: Fetch complete database structure
- **Input**: None (uses user's stored connection)
- **Output**: All tables, columns, data types, constraints, relationships
- **Use Case**: Analyze database, generate ER diagrams, understand structure

### **2. `query_database`**

- **Purpose**: Execute SELECT queries (read-only)
- **Input**: SQL query string
- **Output**: Query results as JSON rows
- **Use Case**: Analyze data, fetch table info, understand relationships

### **3. `execute_sql`**

- **Purpose**: Execute DDL/DML queries (CREATE, ALTER, INSERT, UPDATE)
- **Input**: SQL query string + confirmation flag
- **Output**: Success status, affected rows, error messages
- **Use Case**: Create tables, modify schemas, insert data
- **Security**: **Requires client-side confirmation for dangerous operations**

### **4. `save_diagram`**

- **Purpose**: Save ER diagram to user's diagram history
- **Input**: Title, Mermaid code, description
- **Output**: Diagram ID
- **Use Case**: Store generated ER diagrams for future reference

---

## � Implementation Details

### **User's Database (Direct SQL via mysql2)**

**No ORM Layer** - All operations use raw SQL:

```typescript
// lib/mysqlClient.ts
import mysql from "mysql2/promise";

export async function connectToUserDatabase(connectionString: string) {
  const connection = await mysql.createConnection(connectionString);
  return connection;
}

export async function executeQuery(connection, sql: string) {
  const [results] = await connection.execute(sql);
  return results;
}

export async function getDatabaseSchema(connection) {
  const [tables] = await connection.execute(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
  `);
  return tables;
}
```

### **App Database (Drizzle ORM + Supabase PostgreSQL)**

**Type-Safe Queries** - All app logic:

```typescript
// drizzle/schema.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name"),
  mysqlConnectionString: text("mysql_connection_string"), // encrypted
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  mermaidCode: text("mermaid_code"),
  sqlSnippets: text("sql_snippets"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const savedDiagrams = pgTable("saved_diagrams", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  mermaidCode: text("mermaid_code").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## �💾 Data Models

### **Supabase PostgreSQL + Drizzle ORM** (App Database)

#### **User**

```
├── id (UUID primary key)
├── clerkId (unique)
├── email (unique)
├── name
├── mysqlConnectionString (encrypted - MySQL/PostgreSQL)
├── createdAt
└── updatedAt
```

#### **Conversation** (Chat Sessions)

```
├── id (UUID primary key)
├── userId (foreign key → users)
├── title
├── createdAt
└── updatedAt
```

#### **Message**

```
├── id (UUID primary key)
├── conversationId (foreign key → conversations)
├── role (user / assistant)
├── content (text)
├── mermaidCode (nullable - ER diagram)
├── sqlSnippets (nullable - SQL code)
└── timestamp
```

#### **SavedDiagram** (ER Diagram History)

```
├── id (UUID primary key)
├── userId (foreign key → users)
├── title
├── mermaidCode
├── description
└── createdAt
```

### **User's MySQL Database** (Direct Access - No ORM)

- ❌ **No ORM Layer** - Direct SQL execution via `mysql2`
- ✅ **Any User Schema** - No restrictions on table structure
- ✅ **Transparent Operations** - All SQL visible and auditable
- ✅ **Real Database** - Actual CREATE, ALTER, DROP operations
- ✅ **Educational** - Perfect for showing DBMS concepts

The user's database is treated as an **external resource** that the app interacts with via direct SQL queries.

---

## 📍 Pages & Routes

### **Frontend Pages** (Protected by Clerk)

| Page    | Route      | Purpose                 |
| ------- | ---------- | ----------------------- |
| Chat    | `/chat`    | Main AI chat interface  |
| Profile | `/profile` | Database URL management |
| Home    | `/`        | Public landing page     |

### **Backend API Routes**

| Endpoint            | Method         | Purpose                                          |
| ------------------- | -------------- | ------------------------------------------------ |
| `/api/chat`         | POST           | Send message to AI, get response with tool calls |
| `/api/user/profile` | GET/PUT        | Get/update user database connection              |
| `/api/diagrams`     | GET            | List user's saved ER diagrams                    |
| `/api/diagrams/:id` | GET/PUT/DELETE | Manage individual diagrams                       |

---

## 🔐 Security & Safety

### **Database Credentials**

- Encrypted storage using environment-based encryption
- Never exposed to frontend
- Only backend accesses database

### **SQL Injection Prevention**

- All AI-generated SQL is validated before execution
- Parameterized queries when possible
- SQL parsing to detect dangerous patterns

### **Dangerous Operations**

- **Client-side confirmation required** for:
  - DROP TABLE
  - DELETE FROM (without WHERE clause)
  - TRUNCATE TABLE
  - ALTER TABLE (structural changes)
- User must explicitly confirm before backend executes

### **Rate Limiting**

- Limit API calls per user per minute
- Prevent abuse of database operations

### **Connection Validation**

- Test connection before storing credentials
- Verify access permissions
- Handle connection errors gracefully

---

## 💬 System Prompt for Gemini

```
You are an expert database architect and SQL specialist.

User's Database:
- Connection: {database_url}
- Current Tables: {table_list}
- Schema: {schema_info}

Available Tools:
1. get_database_schema - Fetch full database structure
2. query_database - Execute SELECT queries
3. execute_sql - Execute CREATE/ALTER/INSERT/UPDATE queries
4. save_diagram - Save ER diagrams

Guidelines:
- Always explain what you're doing before making tool calls
- Generate Mermaid ER diagrams when analyzing or creating schemas
- Provide SQL in markdown code blocks
- For dangerous operations, always inform the user that confirmation is needed
- Use proper SQL syntax and best practices
- Consider normalization when creating new tables
- Show data types and constraints clearly

When user asks to:
- "Show my database" → Use get_database_schema + generate Mermaid
- "Create a Users table with..." → Generate SQL + prepare for execute_sql
- "What's in X table" → Use query_database
- "Add a relationship" → Use execute_sql for ALTER TABLE
- "Save this diagram" → Use save_diagram tool
```

---

## 🚀 Technology Stack

### **Frontend**

- Next.js 15 (React 19)
- TypeScript
- Tailwind CSS
- Clerk Authentication
- Mermaid (ER diagram rendering)
- React Query / Zustand (state management)
- Sonner (toast notifications)

### **Backend**

- Next.js API Routes
- Vercel AI SDK
- Google Gemini API (with function calling)
- **mysql2/promise** - Direct SQL execution for user's database
- **Drizzle ORM** - Type-safe queries for app database

### **Databases**

- **User's Database**: MySQL (local or remote) - Direct SQL access via mysql2 (No ORM)
- **App Database**: Supabase PostgreSQL - Managed via Drizzle ORM

### **ORM & Database Tools**

- Drizzle ORM (for Supabase PostgreSQL)
- Drizzle Kit (migrations and schema management)
- mysql2/promise (direct database client for user's MySQL)

### **AI**

- Google Gemini API (with function calling)
- Vercel AI SDK (streaming support)

- Google Gemini (with tool calling)
- Vercel AI SDK (streaming support)

---

## 🔄 User Interaction Examples

### **Example 1: NLP to SQL**

```
User: "I need a table to store blog posts with title, content, and author"

AI: "I'll create a blog posts table for you. Let me generate the SQL..."

AI Tool Call: execute_sql
SQL Generated:
CREATE TABLE blog_posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  author_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Result: "✓ Table created successfully!"
        [Shows Mermaid diagram of new schema]
```

### **Example 2: SQL to ER Diagram**

```
User: "Show me an ER diagram of my entire database"

AI: "Let me fetch your database schema..."

AI Tool Call: get_database_schema
Result: [Generates Mermaid ER diagram showing all tables and relationships]

[Chat displays: Beautiful ER diagram with all tables, relationships, and cardinalities]
```

### **Example 3: Dangerous Operation with Confirmation**

```
User: "Delete old records from the logs table"

AI: "⚠️ This will delete data. I need your confirmation."
    "Command: DELETE FROM logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)"

[Client-side dialog appears]
User: [Clicks "Confirm"]

AI Tool Call: execute_sql (with confirmed = true)
Result: "✓ Deleted X records"
```

---

## 📋 Development Roadmap

### **Phase 1: Core Features** (Current)

- ✅ Clerk Authentication
- ✅ Chat interface with Gemini
- ✅ MySQL database connection
- ✅ Basic CRUD operations
- ✅ Mermaid ER diagram generation

### **Phase 2: Enhancements**

- PostgreSQL support
- Advanced query optimization suggestions
- Diagram export (PNG/SVG)
- SQL query history and optimization tips
- Batch operations

### **Phase 3: Advanced Features**

- Voice input (Web Speech API)
- Collaborative database design
- Performance analysis
- Index recommendations
- Database backup/restore suggestions

---

## 🎓 Course Project Notes

This project is built for the **DBMS (Database Management Systems) Course** and demonstrates:

1. **Database Design**: ER models, normalization, relationships
2. **SQL Mastery**: DDL, DML, complex queries, joins
3. **Real-World Integration**: Connecting web apps to databases
4. **AI Integration**: Using modern AI for database tasks
5. **Full-Stack Development**: Frontend + Backend + Database
6. **Security**: Credential management, SQL injection prevention
7. **User Experience**: Chat-based interface for non-technical users

---

## 📝 Architecture Notes

### **Database Separation**

- **User's MySQL**: Direct SQL access via mysql2 (no ORM) - treats as external resource
- **Supabase PostgreSQL**: App database with Drizzle ORM - users, conversations, diagrams
- **Why This Approach**: Clean separation, type safety for app logic, transparency for user DB operations

### **Connection & Execution**

- **Localhost MySQL**: Fully supported for development. Dev server can access `localhost:3306` with credentials
- **Connection String Formats**:
  - MySQL: `mysql://user:password@localhost:3306/database`
  - PostgreSQL: `postgresql://user:password@localhost:5432/database`
- **Direct SQL**: All user database operations use raw SQL via mysql2, no ORM translation
- **No Prisma**: Chose direct mysql2 for simplicity and SQL transparency (better for DBMS course)

### **Tool Execution**

- **get_database_schema**: Direct SQL query to INFORMATION_SCHEMA
- **query_database**: Direct SELECT execution via mysql2
- **execute_sql**: Direct DDL/DML execution via mysql2
- **save_diagram**: Drizzle ORM query to Supabase PostgreSQL

### **Safety & Confirmation**

- **Client-side confirmation**: Required for DROP, DELETE, TRUNCATE, ALTER TABLE operations
- All dangerous SQL operations must be explicitly approved by user before execution
- **Single Database**: One connection per user at a time
- **Conversation History**: All chats saved to Supabase (Drizzle ORM)

---

## 🤝 Contributing

This is a course project. Feel free to enhance features and add improvements!

---

## 📞 Support

For questions about the project architecture or implementation, refer to the sections above or check the inline code documentation.

---

**Last Updated**: October 19, 2025  
**Status**: In Development
