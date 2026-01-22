-- Migration: add payment_details column to bills

ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}'::jsonb;

-- Ensure existing seed insertion won't fail if code expects the column
UPDATE bills SET payment_details = '{}'::jsonb WHERE payment_details IS NULL;
