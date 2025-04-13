-- Migration script to add last_modified field to timeline_vendors and timeline_event_vendors tables

-- Check if last_modified column exists in timeline_vendors table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'timeline_vendors' AND column_name = 'last_modified'
    ) THEN
        -- Add last_modified column to timeline_vendors
        ALTER TABLE timeline_vendors ADD COLUMN last_modified TIMESTAMP DEFAULT NOW() NOT NULL;
    END IF;
END $$;

-- Check if last_modified column exists in timeline_event_vendors table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'timeline_event_vendors' AND column_name = 'last_modified'
    ) THEN
        -- Add last_modified column to timeline_event_vendors
        ALTER TABLE timeline_event_vendors ADD COLUMN last_modified TIMESTAMP DEFAULT NOW() NOT NULL;
    END IF;
END $$;

-- Update existing rows to set last_modified to match updated_at if needed
UPDATE timeline_vendors SET last_modified = updated_at WHERE last_modified IS NULL;
UPDATE timeline_event_vendors SET last_modified = updated_at WHERE last_modified IS NULL;