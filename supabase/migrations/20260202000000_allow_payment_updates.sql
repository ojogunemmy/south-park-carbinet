-- Add UPDATE policy for payments table
-- This allows authenticated users to update payment status and payment details
-- Date: 2026-02-02

DROP POLICY IF EXISTS "Authenticated users can update payments" ON payments;
CREATE POLICY "Authenticated users can update payments"
  ON payments FOR UPDATE TO authenticated 
  USING (true)
  WITH CHECK (true);
