-- Definitive Schema and 100% Data Seed for South Park Cabinets
-- Generated on 2026-01-21

-- 1. CLEANUP (Ensuring clean slate for type consistency)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS weekly_payments CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- 2. CREATE TABLES

-- Profiles table for user management
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'worker' CHECK (role IN ('admin', 'manager', 'worker')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees table
CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT,
  weekly_rate NUMERIC DEFAULT 0,
  hire_date DATE,
  payment_start_date DATE,
  ssn TEXT,
  address TEXT,
  telephone TEXT,
  email TEXT,
  payment_method TEXT DEFAULT 'check',
  payment_day TEXT DEFAULT 'wednesday',
  payment_status TEXT DEFAULT 'active' CHECK (payment_status IN ('active', 'paused', 'leaving', 'laid_off')),
  bank_details JSONB DEFAULT '{}'::jsonb,
  direct_deposit BOOLEAN DEFAULT FALSE,
  default_days_worked INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materials table
CREATE TABLE materials (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT DEFAULT 'EA',
  unit_price NUMERIC DEFAULT 0,
  description TEXT,
  supplier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts table
CREATE TABLE contracts (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_address TEXT,
  client_city TEXT,
  client_state TEXT,
  client_zip TEXT,
  project_location TEXT,
  client_phone TEXT,
  client_email TEXT,
  project_description TEXT,
  project_name TEXT,
  deposit_amount NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  start_date DATE,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  cabinet_type TEXT,
  material TEXT,
  custom_finish TEXT,
  installation_included BOOLEAN DEFAULT TRUE,
  additional_notes TEXT,
  cost_tracking JSONB DEFAULT '{}'::jsonb,
  payment_schedule JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  down_payments JSONB DEFAULT '[]'::jsonb,
  expenses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bills table
CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  category TEXT,
  vendor TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  due_date DATE,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
  recurrent BOOLEAN DEFAULT FALSE,
  payment_method TEXT,
  payment_date DATE,
  autopay BOOLEAN DEFAULT FALSE,
  invoice_number TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE SET NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments (Weekly Employee Payments)
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE,
  days_worked INTEGER DEFAULT 5,
  weekly_rate NUMERIC,
  calculated_amount NUMERIC,
  final_amount NUMERIC,
  amount NUMERIC, -- Map to final_amount for easier frontend usage
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_date DATE,
  payment_method TEXT,
  check_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  company_name TEXT DEFAULT 'South Park Cabinets',
  company_address TEXT,
  company_phone TEXT,
  bank_name TEXT,
  routing_number TEXT,
  account_number TEXT,
  check_template TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- 3. SEEDING (100% Core Dummy Data)

-- 3.1 Materials (From Materials.tsx)
INSERT INTO materials (id, code, name, category, unit, unit_price, description, supplier) VALUES
('MAT-001', 'PL170', 'Plywood Birch Prefinished 3/4" 4x8 C2', 'Plywood', 'EA', 38.51, 'Prefinished birch plywood', 'Imeca Charlotte'),
('MAT-002', 'PL71', 'Plywood Birch Prefinished 1/4" 4x8', 'Plywood', 'EA', 22.83, '1/4 inch birch plywood sheet', 'Imeca Charlotte'),
('MAT-003', 'PL119', 'Plywood White Oak Natural 1/4" 4x8 Rifcut', 'Plywood', 'EA', 52.00, 'White oak rift cut plywood', 'Imeca Charlotte'),
('MAT-004', 'PL118RC', 'Plywood White Oak Natural 3/4" 4x8 Rifcut B2', 'Plywood', 'EA', 110.01, 'Premium white oak rift cut plywood', 'Imeca Charlotte'),
('MAT-005', 'PL6134-410-GAR', 'Plywood White Oak 3/4" 4x10 A1 Rift Cut Garnica', 'Plywood', 'EA', 219.95, 'Premium white oak rift cut garnica', 'Imeca Charlotte'),
('MAT-006', 'LUM69', 'Lumber Poplar S3S 16'' 13/16" 12"+', 'Lumber', 'EA', 2.86, 'Poplar dimensional lumber', 'Imeca Charlotte'),
('MAT-007', 'LUM71', 'Lumber Soft Maple UNS 13/16" Stain Grade S3S 14''', 'Lumber', 'EA', 3.65, 'Soft maple stain grade lumber', 'Imeca Charlotte'),
('MAT-008', 'LUM48', 'Lumber White Oak R1E 13/16" S3S', 'Lumber', 'EA', 6.99, 'White oak rough lumber', 'Imeca Charlotte'),
('MAT-009', 'LUM58', 'Lumber White Oak Rift Cut 13/16" S3S', 'Lumber', 'EA', 13.98, 'White oak rift cut lumber', 'Imeca Charlotte'),
('MAT-010', 'DS58RW04P800', 'Drawer Side 4"x96" 5/8" Rubberwood Flat Edge UV 3-Sides w/ 1/4" Groove', 'Drawer Parts', 'EA', 11.37, 'Rubberwood drawer side', 'Imeca Charlotte'),
('MAT-011', 'DS58RW06P800', 'Drawer Side 6"x96" 5/8" Rubberwood Flat Edge UV 3-Sides w/ 1/4" Groove', 'Drawer Parts', 'EA', 19.12, 'Rubberwood drawer side 6 inch', 'Imeca Charlotte'),
('MAT-012', 'DS58RW08P800', 'Drawer Side 8"x96" 5/8" Rubberwood Flat Edge UV 3-Sides w/ 1/4" Groove', 'Drawer Parts', 'EA', 21.65, 'Rubberwood drawer side 8 inch', 'Imeca Charlotte'),
('MAT-013', 'DS58RW10P800', 'Drawer Side 10"x96" 5/8" Rubberwood Flat Edge UV 3-Sides w/ 1/4" Groove', 'Drawer Parts', 'EA', 25.34, 'Rubberwood drawer side 10 inch', 'Imeca Charlotte'),
('MAT-014', '563H5330B', 'Tandem Plus Blumotion 563 Full Extension Drawer Runners 21" Zinc-Plated', 'Hardware', 'EA', 18.90, 'Blum drawer runner system', 'Imeca Charlotte'),
('MAT-015', '563H4570B', 'Tandem Plus Blumotion 563 Full Extension Drawer Runners 18" Zinc-Plated', 'Hardware', 'EA', 17.70, 'Blum drawer runner 18 inch', 'Imeca Charlotte'),
('MAT-016', '563H3810B', 'Tandem Plus Blumotion 563 Full Extension Drawer Runners 15" Zinc-Plated', 'Hardware', 'EA', 19.94, 'Blum drawer runner 15 inch', 'Imeca Charlotte'),
('MAT-017', '71B3590', 'Blum Clip Top Blumotion 110° Hinges Full Overlay Inserta Nickel', 'Hardware', 'EA', 3.95, 'Blum cabinet hinges', 'Imeca Charlotte'),
('MAT-018', '175H6000', 'Clip Mounting Plates Cam Height Adjustable 0mm Nickel', 'Hardware', 'EA', 0.87, 'Cabinet hinge mounting plates', 'Imeca Charlotte'),
('MAT-019', 'MDF1-D', 'MDF Raw 3/4" 4x8 A1 Door Core', 'MDF/Panels', 'EA', 45.33, 'Medium density fiberboard', 'Imeca Charlotte'),
('MAT-020', 'MDF-U38-48', 'MDF Ultra Light 3/8" 4x8', 'MDF/Panels', 'EA', 24.25, 'Ultra light MDF sheet', 'Imeca Charlotte'),
('MAT-021', '056815', 'Plywood Birch 18mm 4x8 C2 WPF UV1S Prefinished VC', 'Plywood', 'EA', 39.39, 'Prefinished birch plywood 18mm', 'Atlantic Plywood'),
('MAT-022', '056820', 'Plywood Birch 18mm 4x8 C2 WPF UV2S Prefinished VC', 'Plywood', 'EA', 41.78, 'Prefinished birch plywood 18mm UV2S', 'Atlantic Plywood'),
('MAT-023', '055150', 'Plywood White Oak 3/4" 4x8 A1 Rift Cut Prefinished VC', 'Plywood', 'EA', 134.13, 'White oak rift cut prefinished plywood', 'Atlantic Plywood'),
('MAT-024', '055200', 'Plywood White Oak 3/4" 4x10 A1 Rift Cut Prefinished VC', 'Plywood', 'EA', 239.98, 'White oak rift cut prefinished plywood 4x10', 'Atlantic Plywood'),
('MAT-025', '71B3590-AP', 'Blum Clip Top Hinge 110 Blumotion F-OL Inserta', 'Hardware', 'EA', 3.70, 'Blum hinges full overlay inserta', 'Atlantic Plywood'),
('MAT-026', '563H5330B-AP', 'Tandem Plus Blumotion 563H 21" Full Ext Drawer Zinc', 'Hardware', 'EA', 17.82, 'Blum drawer runner 21 inch full extension', 'Atlantic Plywood'),
('MAT-027', '563H4570B-AP', 'Tandem Plus Blumotion 563H 18" Full Ext Drawer Zinc', 'Hardware', 'EA', 16.97, 'Blum drawer runner 18 inch full extension', 'Atlantic Plywood'),
('MAT-028', 'T51.1901L', 'Tandem Plus Blumotion 563/9 Locking Device Left', 'Hardware', 'EA', 1.33, 'Blum locking device left', 'Atlantic Plywood'),
('MAT-029', 'T51.1901R', 'Tandem Plus Blumotion 563/9 Locking Device Right', 'Hardware', 'EA', 1.33, 'Blum locking device right', 'Atlantic Plywood'),
('MAT-030', 'PLATES-AP', 'Blum Plates', 'Hardware', 'EA', 0.80, 'Blum Plates', 'Atlantic Plywood');

-- 3.2 Employees (From Employees.tsx)
INSERT INTO employees (id, name, position, weekly_rate, hire_date, payment_start_date, address, telephone, email, payment_method, payment_status, default_days_worked) VALUES
('EMP-001', 'Julio Funez', 'Assembler', 1200, '2025-01-12', '2026-01-04', '197 lamplighter Winnsboro SC', '(984) 245-6558', 'juliofunez@gmail.com', 'check', 'active', 5),
('EMP-002', 'Jayro Calderon', 'Assistant', 900, '2025-11-20', '2026-01-04', '197 lamplighter Winnsboro SC', '(714) 760-1310', 'lopeznahun85@gmail.com', 'check', 'active', 5),
('EMP-003', 'Darwin Hernandez', 'Assembler', 1500, '2022-04-18', '2026-01-04', '12831 wedgefield dr', '(702) 984-9684', 'darwin.hernandez@example.com', 'check', 'active', 5),
('EMP-004', 'Nahum Lopez', 'Lead Carpenter', 1300, '2024-03-15', '2024-03-15', '197 lamplighter Winnsboro SC', '(803) 555-0101', 'nahum.lopez@example.com', 'direct_deposit', 'active', 5),
('EMP-005', 'Jose Martinez', 'Carpenter', 1100, '2024-05-20', '2024-05-20', 'Charlotte, NC', '(704) 555-0102', 'jose.martinez@example.com', 'check', 'active', 5),
('EMP-006', 'Luis Rodriguez', 'Helper', 800, '2024-06-10', '2024-06-10', 'Charlotte, NC', '(704) 555-0103', 'luis.rodriguez@example.com', 'check', 'active', 5),
('EMP-007', 'Carlos Gomez', 'Installer', 1200, '2024-02-05', '2024-02-05', 'Rock Hill, SC', '(803) 555-0104', 'carlos.gomez@example.com', 'direct_deposit', 'active', 5),
('EMP-008', 'Miguel Angel', 'Painter', 1050, '2024-04-12', '2024-04-12', 'Gastonia, NC', '(704) 555-0105', 'miguel.angel@example.com', 'check', 'active', 5),
('EMP-009', 'Francisco J', 'Assembler', 1150, '2024-07-01', '2024-07-01', 'Concord, NC', '(704) 555-0106', 'francisco.j@example.com', 'check', 'active', 5),
('EMP-010', 'Antonio S', 'Assistant', 850, '2024-08-15', '2024-08-15', 'Charlotte, NC', '(704) 555-0107', 'antonio.s@example.com', 'check', 'active', 5),
('EMP-011', 'Jorge Hernandez', 'Lead Installer', 1400, '2023-11-20', '2023-11-20', 'Fort Mill, SC', '(803) 555-0108', 'jorge.hernandez@example.com', 'direct_deposit', 'active', 5),
('EMP-012', 'Ricardo M', 'Carpenter', 1100, '2024-09-05', '2024-09-05', 'Charlotte, NC', '(704) 555-0109', 'ricardo.m@example.com', 'check', 'active', 5),
('EMP-013', 'Emmanuel Alejandro Camarena Burdier', 'Digital Strategist', 1000, '2026-01-06', '2026-01-04', '690 Chestnut Dr, Denver, CO 80214', '(303) 555-3567', 'emmanuel.camarena@example.com', 'direct_deposit', 'active', 5),
('EMP-014', 'Test 1', 'fdr', 0, '2026-01-06', '2026-01-06', '', '', '', 'check', 'active', 5),
('EMP-015', 'Test 2', 'vds', 0, '2025-01-12', '2026-01-12', '', '', '', 'check', 'active', 5),
('EMP-016', 'Test 3', 'Assistant', 500, '2026-01-13', '2026-01-13', '', '', '', 'check', 'active', 5);

-- 3.3 Contracts (From Contracts.tsx)
INSERT INTO contracts (id, client_name, client_address, client_city, client_state, client_zip, project_location, project_name, total_value, deposit_amount, start_date, due_date, status, cabinet_type, material, installation_included, cost_tracking, payment_schedule, down_payments) VALUES
('CON-001', 'Marconi', '2231 Hessell pl', 'Charlotte', 'NC', '28202', '2231 Hessell pl Charlotte', '2231 Hessell pl Charlotte', 7600, 0, '2026-01-01', '2026-01-31', 'pending', 'Kitchen', 'Wood', TRUE, '{"materials": [{"id": "MAT-001", "name": "Materials", "unit": "lot", "quantity": 1, "supplier": "Marconi", "unitPrice": 1042.96}], "laborCost": {"amount": 1000, "description": "Labor costs", "calculationMethod": "manual"}, "miscellaneous": [], "profitMarginPercent": 73.1}', '[{"id": "PAY-001-1", "description": "Full Payment", "amount": 7600, "dueDate": "2026-01-31", "status": "pending"}]', '[]'),
('CON-002', 'PSR Construction', '709 Woodcliff', 'Charlotte', 'NC', '28202', '709 woodcliff709', '709 Woodcliff', 14600, 7300, '2026-01-05', '2026-01-28', 'pending', 'Kitchen', 'Wood', TRUE, '{"materials": [{"id": "MAT-001", "name": "Plywood Birch Prefinished 3/4\" 4x8 C2", "unitPrice": 38.51, "quantity": 25, "unit": "EA", "supplier": "Imeca Charlotte"}, {"id": "MAT-012", "name": "Drawer Side 8\"x96\" 5/8\" Rubberwood Flat Edge UV", "unitPrice": 21.65, "quantity": 15, "unit": "EA", "supplier": "Atlantic Plywood"}], "laborCost": {"calculationMethod": "manual", "amount": 3000, "description": "Labor costs"}, "miscellaneous": [], "profitMarginPercent": 35.0}', '[{"id": "PAY-002-1", "description": "50% Down Payment", "amount": 7300, "dueDate": "2026-01-05", "status": "pending"}, {"id": "PAY-002-2", "description": "25% First Installment", "amount": 3650, "dueDate": "2026-01-18", "status": "pending"}, {"id": "PAY-002-3", "description": "25% Final Payment", "amount": 3650, "dueDate": "2026-01-28", "status": "pending"}]', '[]'),
('CON-003', 'PRS Construction', '207 bellmeade Ct', 'Charlotte', 'NC', '28202', '207 bellmeade Ct Charlotte', '207 bellmeade Ct', 78000, 39000, '2026-01-01', '2026-01-09', 'pending', 'Kitchen', 'Wood', TRUE, '{"materials": [{"id": "MAT-001", "name": "Materials", "unitPrice": 25000, "quantity": 1, "unit": "lot", "supplier": "Various"}], "laborCost": {"calculationMethod": "manual", "amount": 15000, "description": "Labor costs"}, "miscellaneous": [], "profitMarginPercent": 38.0}', '[{"id": "PAY-003-1", "description": "50% Down Payment", "amount": 39000, "dueDate": "2026-01-01", "status": "pending"}, {"id": "PAY-003-2", "description": "25% First Installment", "amount": 19500, "dueDate": "2026-01-04", "status": "pending"}, {"id": "PAY-003-3", "description": "25% Final Payment", "amount": 19500, "dueDate": "2026-01-09", "status": "pending"}]', '[{"id": "DP-003-1", "amount": 21000, "date": "2026-01-12", "method": "wire_transfer", "description": "First down payment - wire transfer"}, {"id": "DP-003-2", "amount": 15000, "date": "2025-11-26", "method": "wire_transfer", "description": "Second down payment - wire transfer"}, {"id": "DP-003-3", "amount": 18000, "date": "2026-01-11", "method": "wire_transfer", "description": "This week payment"}]'),
('CON-004', 'Onnit Construction', '2125 mirow PL', 'Charlotte', 'NC', '', '', '', 47500, 23750, '2026-01-01', '2026-01-31', 'pending', 'Kitchen', 'Wood', TRUE, '{"materials": [], "laborCost": {"calculationMethod": "hours", "amount": 15000, "hourlyRate": 50, "hours": 300, "description": "300 hrs fabrication, assembly, and preparation"}, "miscellaneous": [], "profitMarginPercent": 0}', '[]', '[{"id": "DP-004-1", "amount": 23750, "date": "2026-01-14", "method": "check", "description": "Check #1243 - BOA (Bank of America)"}]');

-- 3.4 Bills (From Bills.tsx)
INSERT INTO bills (id, category, vendor, amount, due_date, description, status, payment_method, payment_date) VALUES
('BILL-17678-1', 'Materials', 'Wurth', 12.21, '2026-01-07', 'Materials', 'paid', 'debit_card', '2026-01-07'),
('BILL-17678-2', 'Materials', 'Wurth', 684.28, '2026-01-07', 'Materials', 'paid', 'debit_card', '2026-01-07'),
('BILL-17678-3', 'Materials', 'Eastway Paint & Materials', 487.41, '2026-01-07', 'Materials', 'paid', 'debit_card', '2026-01-07'),
('BILL-17678-4', 'Materials', 'Office Depot', 217.77, '2026-01-07', 'Office materials', 'paid', 'debit_card', '2026-01-07'),
('BILL-17678-5', 'Materials', 'Wurth', 233.65, '2026-01-06', 'Materials', 'paid', 'debit_card', '2026-01-06'),
('BILL-17677-1', 'Materials', 'Home Depot', 326.57, '2026-01-05', 'Miscellaneous', 'paid', 'debit_card', '2026-01-05'),
('BILL-17677-2', 'Other', 'Quicktrip', 54.22, '2026-01-05', 'Gasoline', 'paid', 'debit_card', '2026-01-05'),
('BILL-17677-3', 'Other', 'Quicktrip', 46.23, '2026-01-05', 'Gasoline', 'paid', 'debit_card', '2026-01-05');

-- 3.5 Settings (Initial)
INSERT INTO settings (id, company_name, company_address, company_phone) VALUES
(1, 'South Park Cabinets', '456 Business Blvd, Charlotte, NC 28202', '(704) 555-0100')
ON CONFLICT (id) DO NOTHING;

-- 3.6 Payments (Sample for Dashboard)
INSERT INTO payments (id, employee_id, week_start_date, week_end_date, amount, status, paid_date, payment_method) VALUES
('PAY-2026-01', 'EMP-001', '2026-01-04', '2026-01-10', 1200, 'paid', '2026-01-10', 'check'),
('PAY-2026-02', 'EMP-002', '2026-01-04', '2026-01-10', 900, 'paid', '2026-01-10', 'check'),
('PAY-2026-03', 'EMP-003', '2026-01-04', '2026-01-10', 1500, 'paid', '2026-01-10', 'check');

-- 3.7 Profiles (From AuthContext.tsx - Requires manual linking to Auth Schema)
-- Note: This only seeds the Profile. The Auth.Users entry must be created via Supabase API/Console.
INSERT INTO profiles (id, name, email, role) VALUES
('e90e54a5-c431-430f-98be-972256faf798', 'Emmanuel Burdier', 'emmanuel@southparkcabinets.com', 'admin');
