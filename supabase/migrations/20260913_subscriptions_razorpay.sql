-- Migration: Create user_subscriptions table and indexes
-- Supports Razorpay orders, payments, plan statuses, and invoices

create table if not exists user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id text not null default 'free_trial', -- 'pro_monthly' | 'pro_annual' | 'enterprise' | 'free_trial'
  plan_name text not null default 'Free Trial',
  status text not null default 'trial',       -- 'trial' | 'active' | 'expiring_soon' | 'expired' | 'cancelled'
  amount numeric not null default 0,
  currency text not null default 'INR',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '3 days'),
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  invoice_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast user lookup
create index if not exists idx_user_subscriptions_user_id on user_subscriptions(user_id);
create index if not exists idx_user_subscriptions_status on user_subscriptions(status);

-- Enable RLS
alter table user_subscriptions enable row level security;

-- RLS Policy: Users can view their own subscription
drop policy if exists "Users can view own subscription" on user_subscriptions;
create policy "Users can view own subscription" on user_subscriptions
  for select
  using (auth.uid() = user_id or user_id is null);

-- RLS Policy: Users can insert their subscription
drop policy if exists "Users can insert own subscription" on user_subscriptions;
create policy "Users can insert own subscription" on user_subscriptions
  for insert
  with check (auth.uid() = user_id or user_id is null);

-- RLS Policy: Users can update their subscription
drop policy if exists "Users can update own subscription" on user_subscriptions;
create policy "Users can update own subscription" on user_subscriptions
  for update
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

-- Ensure admin accounts bypass
drop policy if exists "Admin full control on user_subscriptions" on user_subscriptions;
create policy "Admin full control on user_subscriptions" on user_subscriptions
  for all
  using (
    exists (
      select 1 from user_settings 
      where user_settings.user_id = auth.uid() 
      and user_settings.is_admin = true
    )
  );
