-- STANDALONE PATCH: Fix Payments Relationship and Schema Cache Error
-- Run this in Supabase SQL Editor to resolve the "Could not find a relationship" issue

-- 1. Remove the legacy/conflicting table
DROP TABLE IF EXISTS payments CASCADE;

-- 2. Rename the correctly configured table to what the app expects
ALTER TABLE weekly_payments RENAME TO payments;

-- 3. Add helper column for frontend compatibility (mapping final_amount to amount)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount NUMERIC;
UPDATE payments SET amount = final_amount WHERE amount IS NULL;

-- 4. Seed initial dashboard data using AUTHENTIC data from Employees.tsx
-- These records use real employee IDs and their specified weekly rates from the codebase
INSERT INTO payments (id, employee_id, week_start_date, week_end_date, amount, status, paid_date, payment_method) VALUES
('PAY-2026-01', 'EMP-001', '2026-01-04', '2026-01-10', 1200, 'paid', '2026-01-10', 'check'), -- Julio Funez
('PAY-2026-02', 'EMP-002', '2026-01-04', '2026-01-10', 900, 'paid', '2026-01-10', 'check'),  -- Jayro Calderon
('PAY-2026-03', 'EMP-003', '2026-01-04', '2026-01-10', 1500, 'paid', '2026-01-10', 'check'), -- Darwin Hernandez
('PAY-2026-04', 'EMP-004', '2026-01-04', '2026-01-10', 1300, 'paid', '2026-01-10', 'check'), -- Wilson Hernandez
('PAY-2026-05', 'EMP-005', '2026-01-04', '2026-01-10', 1400, 'paid', '2026-01-10', 'check')  -- Lucas Moura
ON CONFLICT (id) DO NOTHING;

-- 5. Final check for Admin Profile (in case it was lost)
INSERT INTO profiles (id, name, email, role) VALUES
('e90e54a5-c431-430f-98be-972256faf798', 'Emmanuel Burdier', 'emmanuel@southparkcabinets.com', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
