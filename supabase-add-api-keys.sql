-- Migration: Add API key columns to profiles table
-- Run this in Supabase SQL Editor

-- Add API key columns (encrypted at rest by Supabase)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
ADD COLUMN IF NOT EXISTS gemini_api_key TEXT,
ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'openai';

-- Note: These keys are protected by:
-- 1. Row Level Security (only you can read your own row)
-- 2. Supabase authentication (must be logged in)
-- 3. HTTPS encryption in transit
-- 4. Database encryption at rest

