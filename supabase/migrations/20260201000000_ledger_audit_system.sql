-- Ledger Audit System: Append-only payments with reversal support
-- Created: 2026-02-01
-- Purpose: Implement accounting best practices - immutable ledger

-- Step 1: Add audit columns to payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
  ADD COLUMN IF NOT EXISTS reversed_by_payment_id TEXT REFERENCES payments(id),
  ADD COLUMN IF NOT EXISTS reverses_payment_id TEXT REFERENCES payments(id),
  ADD COLUMN IF NOT EXISTS is_correction BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_is_reversed ON payments(is_reversed);
CREATE INDEX IF NOT EXISTS idx_payments_reverses_payment_id ON payments(reverses_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_employee_date ON payments(employee_id, week_start_date);

-- Step 3: Add comments
COMMENT ON COLUMN payments.is_reversed IS 'TRUE if this transaction has been reversed';
COMMENT ON COLUMN payments.reversal_reason IS 'Why this transaction was reversed';
COMMENT ON COLUMN payments.reversed_by_payment_id IS 'ID of reversal entry that canceled this';
COMMENT ON COLUMN payments.reverses_payment_id IS 'ID of original payment being reversed (for reversal entries)';
COMMENT ON COLUMN payments.is_correction IS 'TRUE if this is a reversal/correction entry';

-- Step 4: Create audit log table
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT REFERENCES payments(id),
  action TEXT NOT NULL CHECK (action IN ('created', 'reversed', 'attempted_edit', 'attempted_delete')),
  user_id UUID REFERENCES auth.users(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_log_payment_id ON payment_audit_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_created_at ON payment_audit_log(created_at);

COMMENT ON TABLE payment_audit_log IS 'Complete audit trail for all payment operations';

-- Step 5: Create reversal function
CREATE OR REPLACE FUNCTION create_payment_reversal(
  p_original_payment_id TEXT,
  p_reason TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_original_payment payments%ROWTYPE;
  v_reversal_id TEXT;
BEGIN
  -- Get original payment
  SELECT * INTO v_original_payment
  FROM payments
  WHERE id = p_original_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_original_payment_id;
  END IF;

  IF v_original_payment.is_reversed THEN
    RAISE EXCEPTION 'Payment already reversed: %', p_original_payment_id;
  END IF;

  -- Generate reversal ID
  v_reversal_id := 'REV-' || p_original_payment_id;

  -- Create reversal entry (negative amount)
  INSERT INTO payments (
    id, employee_id, week_start_date, week_end_date,
    days_worked, weekly_rate, calculated_amount, final_amount, amount,
    status, paid_date, payment_method, notes,
    reverses_payment_id, is_correction, created_at
  ) VALUES (
    v_reversal_id,
    v_original_payment.employee_id,
    v_original_payment.week_start_date,
    v_original_payment.week_end_date,
    v_original_payment.days_worked,
    v_original_payment.weekly_rate,
    -v_original_payment.calculated_amount,
    -v_original_payment.final_amount,
    -v_original_payment.amount,
    'paid',
    CURRENT_DATE,
    'reversal',
    'REVERSAL: ' || COALESCE(p_reason, 'No reason') || ' [Original: ' || p_original_payment_id || ']',
    p_original_payment_id,
    TRUE,
    NOW()
  );

  -- Mark original as reversed
  UPDATE payments
  SET is_reversed = TRUE,
      reversed_by_payment_id = v_reversal_id,
      reversed_at = NOW(),
      reversal_reason = p_reason
  WHERE id = p_original_payment_id;

  -- Log action
  INSERT INTO payment_audit_log (payment_id, action, user_id, reason)
  VALUES (v_reversal_id, 'created', p_user_id, p_reason);

  RETURN v_reversal_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_payment_reversal IS 'Creates reversal entry for a payment (ONLY way to undo)';

-- Step 6: Create views
CREATE OR REPLACE VIEW active_payments AS
SELECT * FROM payments
WHERE is_reversed = FALSE AND is_correction = FALSE;

COMMENT ON VIEW active_payments IS 'Active payments only (excludes reversed and correction entries)';

CREATE OR REPLACE VIEW payment_ledger AS
SELECT
  employee_id,
  week_start_date,
  SUM(CASE WHEN is_reversed = FALSE THEN amount ELSE 0 END) as gross_amount,
  SUM(CASE WHEN is_correction = TRUE THEN amount ELSE 0 END) as correction_amount,
  SUM(amount) as net_amount,
  array_agg(id ORDER BY created_at) as transaction_ids
FROM payments
GROUP BY employee_id, week_start_date;

COMMENT ON VIEW payment_ledger IS 'Complete ledger with gross, corrections, and net amounts';

-- Step 7: Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies: drop-if-exists then create (Postgres doesn't support CREATE POLICY IF NOT EXISTS)
DROP POLICY IF EXISTS "Authenticated users can read payments" ON payments;
CREATE POLICY "Authenticated users can read payments"
  ON payments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can create payments" ON payments;
CREATE POLICY "Authenticated users can create payments"
  ON payments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON payment_audit_log;
CREATE POLICY "Authenticated users can read audit logs"
  ON payment_audit_log FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON payment_audit_log;
CREATE POLICY "Authenticated users can create audit logs"
  ON payment_audit_log FOR INSERT TO authenticated WITH CHECK (true);
