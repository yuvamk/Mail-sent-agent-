# 🚀 Mail-Sent-Agent (ReachOut AI)

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&pause=1000&color=00E5FF&center=true&vCenter=true&width=600&lines=ReachOut+AI+%7C+Multi-Tenant+Job+Outreach;Claude-3.5+%2B+Gemini-1.5+%2B+Groq+Llama-3.3;Schema-Less+Dynamic+Excel+Parser;Token+Billing+Analytics+in+Rupees+(%E2%82%B9);Strict+Safety+Mode+%7C+Manual+Approval" alt="Typing Banner" />
</p>

<p align="center">
  <a href="https://github.com/yuvamk/Mail-sent-agent-"><img src="https://img.shields.io/github/stars/yuvamk/Mail-sent-agent-?style=for-the-badge&color=00E5FF" alt="Stars" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16.3.4-black?style=for-the-badge&logo=next.js" alt="Next.js" /></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-Postgres_RLS-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" /></a>
  <a href="https://groq.com"><img src="https://img.shields.io/badge/Groq_Cloud-Llama_3.3_70B-f55036?style=for-the-badge&logo=groq" alt="Groq" /></a>
  <a href="https://anthropic.com"><img src="https://img.shields.io/badge/Claude-Haiku_4.5-D97706?style=for-the-badge&logo=anthropic" alt="Anthropic" /></a>
  <a href="https://render.com"><img src="https://img.shields.io/badge/Render-Deployment_Ready-46E3B7?style=for-the-badge&logo=render" alt="Render" /></a>
</p>

---

## 🌟 Overview

**ReachOut AI** is an enterprise-grade, multi-tenant AI Outreach & Lead Generation Platform designed to automate personal job applications using **Groq Cloud (Llama 3.3 70B)**, **Anthropic Claude (Haiku 4.5)**, and **Google Gemini (1.5 Flash)**.

It features **100% Dynamic Per-User Settings**, **Schema-Less Excel Parsing**, **INR (₹) Token Billing Analytics**, **Sequential Batch Dispatching**, and **Strict Multi-Tenant Postgres Data Isolation (RLS)**.

---

## ⚡ Core Features

- 🔒 **Multi-Tenant Data Isolation (Postgres RLS)**: Every user's leads, resumes, draft emails, API keys, and sent history are completely private and isolated.
- ⚡ **Multi-Model AI Drafting**: Choose between **Groq (Llama 3.3 70B / Compound)**, **Claude (Haiku 4.5)**, or **Gemini (1.5 Flash)**.
- 🎨 **Dynamic Custom System Prompt Studio**: Customize prompt tone, bullet styles, and outreach constraints. Includes quick presets: *Ultra-Short*, *Formal*, *Recruiter Warm*, and *Default*.
- 📊 **Tokenization & INR (₹) Billing Dashboard**: Real-time tracking of input/output tokens, today's spend, monthly spend, and per-email cost in Indian Rupees (₹).
- 📁 **Schema-Less Excel Importer**: Upload any `.xlsx` table layout. Custom columns are saved into `raw_data jsonb` and automatically fed into the AI prompt context.
- ✉️ **Sequential Dispatch Queue & Send All**: Process draft queue sequentially with 200ms delay to prevent 429 rate limit errors. Approve one-by-one or click **Send All**.
- 📑 **Nodemailer PDF Attachments**: Automatically downloads active candidate PDF resumes from Supabase Storage and attaches them to outreach emails.

---

## 🏗️ Architecture Flow Diagram

```
┌─────────────────┐       ┌──────────────────────┐       ┌────────────────────────┐
│  Dynamic Excel  │ ────> │  Leads & Raw JSONB   │ ────> │   Multi-Model AI       │
│  (.xlsx upload) │       │   (Supabase RLS)     │       │ (Groq / Claude / Gen)  │
└─────────────────┘       └──────────────────────┘       └────────────────────────┘
                                                                      │
                                                                      ▼
┌─────────────────┐       ┌──────────────────────┐       ┌────────────────────────┐
│ INR Billing (₹) │ <──── │ Batch Send All Queue │ <──── │   Draft Review & Edit  │
│  Log Dashboard  │       │  (Nodemailer SMTP)   │       │  (One-click Approval)  │
└─────────────────┘       └──────────────────────┘       └────────────────────────┘
```

---

## 🛠️ Minimal Environment Setup (Render / Production)

Because **ReachOut AI** is 100% dynamic and multi-tenant, **you DO NOT need to configure AI API keys or SMTP passwords in server environment variables**. Every user enters their own keys in their private Settings UI, which are stored securely in Postgres.

Only the Supabase connection keys are required in `.env.local` or Render environment settings:

```env
# Required Supabase Database & Auth Keys ONLY
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

> **Note**: `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, and `SMTP_*` credentials are entered dynamically by each user in the app at `/settings` and stored in Supabase Postgres.

---

## 🗄️ Database Schema Setup (Supabase SQL)

Run the following in your Supabase **SQL Editor**:

```sql
-- Create leads table with dynamic raw_data JSONB
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  company text not null,
  location text,
  salary text,
  experience text,
  key_skills text,
  email text,
  contact_number text,
  raw_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on leads
alter table leads enable row level security;
create policy "User Leads Isolation" on leads for all using (user_id = auth.uid());

-- User Settings table for dynamic keys & prompts
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  custom_system_prompt text,
  anthropic_api_key text,
  gemini_api_key text,
  groq_api_key text,
  smtp_host text,
  smtp_port text,
  smtp_user text,
  smtp_pass text,
  smtp_from_email text,
  candidate_name text,
  candidate_phone text,
  github_url text,
  linkedinUrl text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on user_settings
alter table user_settings enable row level security;
create policy "User Settings Isolation" on user_settings for all using (user_id = auth.uid());
```

---

## 🌐 Deploying Live to Render

To host **ReachOut AI** live on **Render**:

1. **Push Code to GitHub**:
   ```bash
   git add .
   git commit -m "Configure 100% dynamic DB credentials for Render"
   git push origin main
   ```

2. **Create Web Service on Render**:
   - Go to [Render Dashboard](https://dashboard.render.com).
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository `yuvamk/Mail-sent-agent-`.

3. **Configure Settings**:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. **Add Environment Variables (Only 3 Supabase Keys Needed)**:
   In Render's **Environment** tab, add ONLY:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

5. **Deploy**:
   Click **Create Web Service**. Render will build and deploy your app! Each user who logs in will enter their own Groq/Claude/Gemini API keys and SMTP credentials dynamically in `/settings`.

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/yuvamk">Yuvam Kumar</a>
</p>
