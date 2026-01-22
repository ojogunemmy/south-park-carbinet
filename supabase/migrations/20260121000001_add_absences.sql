-- Add employee_absences table
CREATE TABLE IF NOT EXISTS employee_absences (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days_worked_per_week INTEGER DEFAULT 5,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE employee_absences ENABLE ROW LEVEL SECURITY;

-- Create policies (Simplified for now, similar to other tables)
CREATE POLICY "Enable read access for authenticated users" ON employee_absences
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON employee_absences
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON employee_absences
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON employee_absences
  FOR DELETE USING (auth.role() = 'authenticated');
