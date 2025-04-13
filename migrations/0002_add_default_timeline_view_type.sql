-- Migration: add default_timeline_view_type column to user_settings table
-- Created at: 2025-03-23

-- Add the column with a default value of 'list'
ALTER TABLE "user_settings" 
ADD COLUMN IF NOT EXISTS "default_timeline_view_type" TEXT NOT NULL DEFAULT 'list';