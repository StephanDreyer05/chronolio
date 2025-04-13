-- Migration: add view_settings column to timelines table
-- Created at: 2025-03-24

-- Add the column with a default empty JSON value
ALTER TABLE "timelines" 
ADD COLUMN IF NOT EXISTS "view_settings" JSONB DEFAULT '{}'::jsonb;
