-- LinkedIn Posts & Accounts Schema Migration
-- Run this in your Supabase Project SQL Editor if tables are not yet present.

create extension if not exists "uuid-ossp";

-- 6. LinkedIn Posts Table
create table if not exists linkedin_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) default auth.uid(),
  topic text not null,
  source_url text,
  source_title text,
  source_name text,
  post_content text not null,
  image_url text,
  image_source text default 'news',     -- 'news' | 'ai' | 'upload'
  status text default 'draft',           -- 'draft' | 'approved' | 'posted' | 'failed'
  linkedin_post_urn text,
  linkedin_post_url text,
  error_message text,
  ai_provider text default 'groq',       -- 'groq' | 'claude'
  model_name text,
  scheduled_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz default now()
);

-- 7. LinkedIn Accounts Table
create table if not exists linkedin_accounts (
  user_id uuid primary key references auth.users(id) default auth.uid(),
  linkedin_person_urn text,
  access_token text,
  token_expires_at timestamptz,
  profile_name text,
  profile_picture_url text,
  headline text,
  is_connected boolean default false,
  updated_at timestamptz default now()
);

-- Enable RLS
alter table linkedin_posts enable row level security;
alter table linkedin_accounts enable row level security;

-- Multi-Tenant RLS Policies
create policy "User data isolation on linkedin_posts" on linkedin_posts
  for all using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

create policy "User data isolation on linkedin_accounts" on linkedin_accounts
  for all using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);
