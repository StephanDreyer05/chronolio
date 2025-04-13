-- SQL script to create the public_timeline_shares table
-- To use this script:
-- 1. In your terminal, connect to your database: sqlite3 your_database_file.db
-- 2. Run: .read install-tables.sql

-- Check if the public_timeline_shares table already exists
SELECT name FROM sqlite_master WHERE type='table' AND name='public_timeline_shares';

-- Create the public_timeline_shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS public_timeline_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timeline_id INTEGER NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  show_vendors BOOLEAN DEFAULT FALSE NOT NULL,
  FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timeline_shares_timeline_id ON public_timeline_shares(timeline_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_timeline_shares_token ON public_timeline_shares(share_token);

-- Verify the table was created
SELECT name FROM sqlite_master WHERE type='table' AND name='public_timeline_shares';

-- Let the user know the installation was successful
SELECT 'Public timeline shares table installed successfully' AS message; 