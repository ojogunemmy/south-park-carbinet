-- Migration to fix payment ID generation error
-- Generated on 2026-01-24

-- Set default value for id column to auto-generate UUIDs
-- This fixes the "null value in column id" error when creating payments
ALTER TABLE payments ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
