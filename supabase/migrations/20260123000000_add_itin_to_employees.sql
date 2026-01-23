-- Migration to add ITIN field to employees table
-- Generated on 2026-01-23

-- Add itin column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS itin TEXT;

-- Populate existing employees with default ITIN
UPDATE employees SET itin = '123-45-6789' WHERE itin IS NULL;

-- Set default for new records if desired (optional, handled by frontend usually)
ALTER TABLE employees ALTER COLUMN itin SET DEFAULT '123-45-6789';
