-- Migration to add missing functional columns to payments table
-- Generated on 2026-01-23

-- Add columns for banking and detailed accounting
ALTER TABLE payments ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS routing_number TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_type TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_last_four TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deduction_amount NUMERIC DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gross_amount NUMERIC;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS down_payment NUMERIC DEFAULT 0;

-- Add columns for severance tracking
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_severance BOOLEAN DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS severance_reason TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS severance_date DATE;

-- Optionally add an index for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_week_start ON payments(week_start_date);
