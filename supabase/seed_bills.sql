-- Seed filler bills for testing
INSERT INTO public.bills (id, vendor, description, category, amount, due_date, status, recurrent, created_at)
VALUES
  ('BILL-SEED-001', 'Home Depot', 'Lumber and plywood', 'Materials', 1250.00, '2026-02-15', 'pending', false, NOW()),
  ('BILL-SEED-002', 'Lowe''s', 'Cabinet hardware', 'Materials', 450.50, '2026-02-10', 'paid', false, NOW()),
  ('BILL-SEED-003', 'Staples', 'Printer paper and ink', 'Office Supplies', 89.99, '2026-01-28', 'pending', true, NOW()),
  ('BILL-SEED-004', 'Duke Energy', 'Monthly electricity', 'Energy', 345.20, '2026-02-05', 'pending', true, NOW()),
  ('BILL-SEED-005', 'Piedmont Natural Gas', 'Workshop heating', 'Gas', 120.75, '2026-02-08', 'pending', true, NOW()),
  ('BILL-SEED-006', 'City Water Services', 'Water bill', 'Water', 45.00, '2026-01-30', 'paid', true, NOW()),
  ('BILL-SEED-007', 'Green Thumb Landscaping', 'Lawn maintenance', 'Landscaping', 200.00, '2026-02-12', 'pending', true, NOW()),
  ('BILL-SEED-008', 'Waste Management', 'Dumpster service', 'Waste', 150.00, '2026-02-01', 'pending', true, NOW()),
  ('BILL-SEED-009', 'State Farm', 'Liability insurance', 'Insurance', 450.00, '2026-02-20', 'pending', true, NOW()),
  ('BILL-SEED-010', 'Commercial Properties Inc', 'Workshop rent', 'Rent & Lease Payments', 2500.00, '2026-02-01', 'pending', true, NOW()),
  ('BILL-SEED-011', 'H&R Block', 'Tax consultation', 'Accounting', 300.00, '2026-03-15', 'pending', false, NOW()),
  ('BILL-SEED-012', 'Maria Rodriguez CPA', 'Monthly bookkeeping', 'Contadora', 400.00, '2026-02-28', 'pending', true, NOW()),
  ('BILL-SEED-013', 'Google Ads', 'Online advertising', 'Advertising & Marketing', 500.00, '2026-02-15', 'pending', true, NOW()),
  ('BILL-SEED-014', 'TechSolutions', 'IT support contract', 'IT Services & Internet', 250.00, '2026-02-10', 'pending', true, NOW()),
  ('BILL-SEED-015', 'Cintas', 'Uniform cleaning', 'Uniforms & Staff Apparel', 125.00, '2026-02-05', 'pending', true, NOW()),
  ('BILL-SEED-016', 'Spectrum Business', 'Internet service', 'IT Services & Internet', 110.00, '2026-02-07', 'paid', true, NOW()),
  ('BILL-SEED-017', 'CleanTeam', 'Office cleaning', 'Staff & Technology Services', 180.00, '2026-02-03', 'pending', true, NOW()),
  ('BILL-SEED-018', 'Amazon Business', 'Miscellaneous tools', 'Multiple / Miscellaneous Services', 75.50, '2026-01-25', 'paid', false, NOW()),
  ('BILL-SEED-019', 'IRS', 'Quarterly estimated tax', 'Taxes', 3500.00, '2026-04-15', 'pending', false, NOW()),
  ('BILL-SEED-020', 'FastSigns', 'Vehicle decals', 'Advertising & Marketing', 320.00, '2026-02-18', 'pending', false, NOW()),
  ('BILL-SEED-021', 'Sherwin Williams', 'Paint and stains', 'Materials', 675.00, '2026-02-09', 'pending', false, NOW()),
  ('BILL-SEED-022', 'Wurth Wood Group', 'Cabinet hinges', 'Materials', 450.00, '2026-02-14', 'pending', false, NOW()),
  ('BILL-SEED-023', 'Office Depot', 'Paper towels and supplies', 'Office Supplies', 45.00, '2026-02-02', 'paid', false, NOW()),
  ('BILL-SEED-024', 'Shell Station', 'Fuel for delivery truck', 'Gas', 85.00, '2026-01-29', 'paid', false, NOW()),
  ('BILL-SEED-025', 'City of Charlotte', 'Business license renewal', 'Taxes', 150.00, '2026-03-01', 'pending', false, NOW())
ON CONFLICT (id) DO NOTHING;
