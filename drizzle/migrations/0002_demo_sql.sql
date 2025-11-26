-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.conversations (
  id text NOT NULL,
  user_id text NOT NULL,
  title text NOT NULL DEFAULT 'New Chat'::text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.email_change_audit (
  id bigint NOT NULL DEFAULT nextval('email_change_audit_id_seq'::regclass),
  user_id text NOT NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text NOT NULL,
  changed_at timestamp without time zone DEFAULT now(),
  CONSTRAINT email_change_audit_pkey PRIMARY KEY (id),
  CONSTRAINT email_change_audit_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.messages (
  id text NOT NULL,
  conversation_id text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.users (
  id text NOT NULL,
  clerk_id text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  name text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  database_connection_url text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);