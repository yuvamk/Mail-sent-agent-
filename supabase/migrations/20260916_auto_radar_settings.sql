-- Migration: Add autonomous launch radar & auto-pilot settings to user_settings
-- Run in Supabase SQL Editor

alter table if exists user_settings 
  add column if not exists auto_radar_enabled boolean default false,
  add column if not exists auto_radar_mode text default 'auto_draft',
  add column if not exists auto_radar_min_stars integer default 10,
  add column if not exists auto_radar_last_run timestamptz,
  add column if not exists auto_radar_posted_repos jsonb default '[]'::jsonb,
  add column if not exists auto_radar_last_decision jsonb;
