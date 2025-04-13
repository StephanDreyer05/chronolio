-- SQL script to create the public_timeline_shares table
-- Run this script if the migrations don't work

CREATE TABLE IF NOT EXISTS "public_timeline_shares" (
  "id" serial PRIMARY KEY NOT NULL,
  "timeline_id" integer NOT NULL,
  "share_token" text NOT NULL UNIQUE,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp
);

-- Add foreign key constraint
ALTER TABLE "public_timeline_shares" ADD CONSTRAINT "public_timeline_shares_timeline_id_fkey" 
FOREIGN KEY ("timeline_id") REFERENCES "timelines"("id") ON DELETE CASCADE;

-- Grant permissions if needed
-- GRANT ALL PRIVILEGES ON TABLE public_timeline_shares TO your_database_user;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_timeline_shares_timeline_id ON "public_timeline_shares"("timeline_id");
CREATE UNIQUE INDEX IF NOT EXISTS idx_timeline_shares_token ON "public_timeline_shares"("share_token");

-- Check if the table was created successfully
SELECT 'Table creation successful - public_timeline_shares now exists' as result; 