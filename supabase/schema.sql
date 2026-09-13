-- Database Schema for Personal Job Outreach Automation Platform (Multi-Tenant)

create extension if not exists "uuid-ossp";

-- 1. Leads Table (with user_id & dynamic raw_data JSONB)
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) default auth.uid(),
  company text,
  location text,
  salary text,
  experience text,
  key_skills text,
  email text,
  contact_number text,
  apply_url text,              -- set when email column is a URL or NA
  has_valid_email boolean default false,
  source_file text,             -- original excel file name
  raw_data jsonb default '{}'::jsonb, -- dynamic custom columns from any uploaded excel
  imported_at timestamptz default now()
);

-- Unique index per user to prevent duplicate (company, email) entries
create unique index if not exists idx_leads_user_company_email on leads (coalesce(user_id, '00000000-0000-0000-0000-000000000000'), lower(trim(company)), lower(trim(email))) where email is not null and email != '';

-- 2. Resumes Table (with user_id)
create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) default auth.uid(),
  file_name text not null,
  storage_path text not null,            -- Supabase Storage path
  extracted_text text,
  uploaded_at timestamptz default now(),
  is_active boolean default true
);

-- 3. Email Drafts Table (with user_id)
create table if not exists email_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) default auth.uid(),
  lead_id uuid references leads(id) on delete cascade,
  resume_id uuid references resumes(id) on delete set null,
  ai_provider text default 'claude',              -- 'gemini' | 'claude'
  subject text,
  body text,
  status text default 'drafted', -- drafted | reviewed | approved | sent | failed
  edited_by_user boolean default false,
  error_message text,
  created_at timestamptz default now(),
  sent_at timestamptz
);

-- 4. User Settings Table (per-user dynamic prompts & credentials)
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) default auth.uid(),
  custom_system_prompt text,
  anthropic_api_key text,
  gemini_api_key text,
  smtp_host text,
  smtp_port text,
  smtp_user text,
  smtp_pass text,
  smtp_from_email text,
  candidate_name text,
  candidate_phone text,
  github_url text,
  linkedin_url text,
  updated_at timestamptz default now()
);

-- 5. API Usage Logs Table (AI tokenization & INR ₹ cost tracking)
create table if not exists api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) default auth.uid(),
  lead_id uuid references leads(id) on delete cascade,
  provider text not null,
  model_name text not null,
  input_tokens integer default 0,
  output_tokens integer default 0,
  total_tokens integer default 0,
  estimated_cost_inr numeric(10,4) default 0.0000,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table leads enable row level security;
alter table resumes enable row level security;
alter table email_drafts enable row level security;
alter table user_settings enable row level security;
alter table api_usage_logs enable row level security;

-- Multi-Tenant RLS Policies
create policy "User data isolation on leads" on leads for all using (auth.uid() = user_id or user_id is null) with check (auth.uid() = user_id or user_id is null);
create policy "User data isolation on resumes" on resumes for all using (auth.uid() = user_id or user_id is null) with check (auth.uid() = user_id or user_id is null);
create policy "User data isolation on email_drafts" on email_drafts for all using (auth.uid() = user_id or user_id is null) with check (auth.uid() = user_id or user_id is null);
create policy "User data isolation on user_settings" on user_settings for all using (auth.uid() = user_id or user_id is null) with check (auth.uid() = user_id or user_id is null);
create policy "User data isolation on api_usage_logs" on api_usage_logs for all using (auth.uid() = user_id or user_id is null) with check (auth.uid() = user_id or user_id is null);

-- Storage bucket for resumes
insert into storage.buckets (id, name, public) 
values ('resumes', 'resumes', true) 
on conflict (id) do nothing;

create policy "Public Access to Resumes Bucket" on storage.objects 
for all using (bucket_id = 'resumes') with check (bucket_id = 'resumes');

-- 6. LinkedIn Posts Table (Daily AI Tech Research & Posts)
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

-- 7. LinkedIn Accounts Table (OAuth credentials & profile per user)
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

-- Enable RLS for LinkedIn tables
alter table linkedin_posts enable row level security;
alter table linkedin_accounts enable row level security;

-- Multi-Tenant RLS Policies for LinkedIn tables
create policy "User data isolation on linkedin_posts" on linkedin_posts
  for all using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

create policy "User data isolation on linkedin_accounts" on linkedin_accounts
  for all using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

