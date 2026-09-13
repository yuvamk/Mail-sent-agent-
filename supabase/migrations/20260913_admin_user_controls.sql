-- Migration: Admin User Controls & Platform API Key Access Policy
-- Adds allow_platform_keys column to user_settings table

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS allow_platform_keys boolean DEFAULT true;

UPDATE user_settings 
SET allow_platform_keys = true 
WHERE allow_platform_keys IS NULL;
