# Entia

> AI-powered database design through natural language. Convert plain English to SQL, generate ER diagrams, and execute queries on your MySQL database.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

![Entia Screenshot](/public/entia-dark.png)

## ✨ Features

- **Natural Language to SQL** — Describe what you want in plain English, get optimized SQL
- **ER Diagram Generation** — Auto-generate entity relationship diagrams from your schema
- **Direct Database Execution** — Run queries on your MySQL database with confirmation safeguards
- **Chat Interface** — Conversational AI that understands context and intent
- **Schema Visualization** — Mermaid-based diagrams rendered in real-time

## 🏗️ Architecture

Entia uses a **dual database architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                      Entia App                           │
└─────────────────────────────────────────────────────────┘
          │                                    │
          ▼                                    ▼
   ┌─────────────┐                    ┌─────────────────┐
   │  User's     │                    │   Supabase      │
   │  MySQL DB   │                    │   PostgreSQL    │
   │             │                    │                 │
   │  (queries   │                    │  (app data:     │
   │   executed  │                    │   users, chats, │
   │   here)     │                    │   messages)     │
   └─────────────┘                    └─────────────────┘
```

- **Supabase PostgreSQL** — Stores app data (users, conversations, messages) via Drizzle ORM
- **User's MySQL** — Connected via `mysql2/promise`, used for executing user queries

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- A Supabase project (free tier works)
- A Clerk account (free tier works)
- OpenAI API key

### 1. Clone the repository

```bash
git clone https://github.com/shahidhustles/entia.git
cd entia
```

### 2. Install dependencies

```bash
pnpm install
# or
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# OpenAI
OPENAI_API_KEY=sk-...

# Optional: Clerk redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### 4. Set up the database

Push the Drizzle schema to your Supabase database:

```bash
pnpm db:push
# or
npm run db:push
```

### 5. Run the development server

```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/
│   ├── actions/          # Server actions
│   │   ├── tools/        # AI tool implementations
│   │   │   ├── execute-sql.ts
│   │   │   ├── get-database-schema.ts
│   │   │   └── query-database.ts
│   │   ├── conversations.ts
│   │   └── search.ts
│   ├── api/
│   │   └── chat/
│   │       └── route.ts  # Main AI chat endpoint
│   ├── chat/             # Chat pages
│   └── settings/         # Settings page
├── components/
│   ├── ui/               # shadcn/ui components
│   │   └── ai/           # AI-specific components
│   ├── chat-input.tsx
│   └── client-chat.tsx
├── db/
│   ├── index.ts          # Drizzle client
│   └── schema.ts         # Database schema
├── hooks/
│   └── use-chat.ts       # Custom chat hook
└── lib/
    └── utils.ts
```

## 🔧 Available Scripts

| Command           | Description                             |
| ----------------- | --------------------------------------- |
| `pnpm dev`        | Start development server with Turbopack |
| `pnpm build`      | Build for production                    |
| `pnpm start`      | Start production server                 |
| `pnpm lint`       | Run ESLint                              |
| `pnpm db:push`    | Push Drizzle schema to database         |
| `pnpm db:migrate` | Run database migrations                 |

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL) + User's MySQL
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Auth**: [Clerk](https://clerk.com/)
- **AI**: [OpenAI](https://openai.com/) via [Vercel AI SDK](https://sdk.vercel.ai/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Diagrams**: [Mermaid](https://mermaid.js.org/)

## 🔐 Environment Variables

| Variable                            | Description                           | Required |
| ----------------------------------- | ------------------------------------- | -------- |
| `DATABASE_URL`                      | Supabase PostgreSQL connection string | ✅       |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key                 | ✅       |
| `CLERK_SECRET_KEY`                  | Clerk secret key                      | ✅       |
| `OPENAI_API_KEY`                    | OpenAI API key                        | ✅       |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Shahid Patel**

- GitHub: [@shahidhustles](https://github.com/shahidhustles)

---

<p align="center">
  Made with ❤️ using Next.js and AI
</p>
