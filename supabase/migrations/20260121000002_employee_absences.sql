-- Add employee_absences table
CREATE TABLE IF NOT EXISTS employee_absences (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days_worked_per_week INTEGER DEFAULT 5,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (from_date <= to_date)
);

-- Note: Ensure payments table has all legacy fields for 100% data fidelity
-- (This column may have been added in a previous patch, adding safely here)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS calculated_amount NUMERIC;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS final_amount NUMERIC;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS days_worked INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS weekly_rate NUMERIC;
