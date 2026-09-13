-- Migration: Add missing columns to user_settings and configure admin role
-- Run this in your Supabase SQL Editor

-- 1. Ensure required extensions
create extension if not exists "uuid-ossp";

-- 2. Add columns to user_settings if not exist
alter table if exists user_settings 
  add column if not exists groq_api_key text,
  add column if not exists brevo_api_key text,
  add column if not exists linkedin_access_token text,
  add column if not exists linkedin_person_urn text,
  add column if not exists is_admin boolean default false;

-- 3. Set yuvamk6@gmail.com as Admin
update user_settings 
set is_admin = true 
where user_id in (
  select id from auth.users where lower(email) = 'yuvamk6@gmail.com'
);

-- 4. Verify RLS policies on user_settings
alter table user_settings enable row level security;

drop policy if exists "User data isolation on user_settings" on user_settings;
create policy "User data isolation on user_settings" on user_settings
  for all 
  using (auth.uid() = user_id or user_id is null) 
  with check (auth.uid() = user_id or user_id is null);

-- 5. Ensure linkedin_posts table exists with strict RLS
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
  ai_provider text default 'gemini',     -- 'gemini' | 'groq' | 'claude'
  model_name text,
  scheduled_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz default now()
);

alter table linkedin_posts enable row level security;

drop policy if exists "User data isolation on linkedin_posts" on linkedin_posts;
create policy "User data isolation on linkedin_posts" on linkedin_posts
  for all 
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

-- 6. Ensure linkedin_accounts table exists with strict RLS
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

alter table linkedin_accounts enable row level security;

drop policy if exists "User data isolation on linkedin_accounts" on linkedin_accounts;
create policy "User data isolation on linkedin_accounts" on linkedin_accounts
  for all 
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);
