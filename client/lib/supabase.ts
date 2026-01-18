import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Employee = {
  id: string;
  name: string;
  position: string | null;
  weekly_rate: number | null;
  hire_date: string | null;
  payment_method: 'direct_deposit' | 'check' | 'cash' | 'ach' | 'wire' | null;
  bank_details: any;
  status: 'active' | 'paused' | 'leaving' | 'laid_off';
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  employee_id: string;
  week_start_date: string;
  week_end_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'canceled';
  payment_method: string | null;
  check_number: string | null;
  bank_name: string | null;
  account_last_four: string | null;
  deduction_amount: number;
  days_worked: number;
  paid_date: string | null;
  created_at: string;
  updated_at: string;
};

export type Contract = {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  client_address: string | null;
  project_name: string;
  project_address: string | null;
  total_value: number;
  deposit_amount: number | null;
  start_date: string | null;
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  materials: any;
  labor_cost: number;
  misc_cost: number;
  profit_margin: number | null;
  created_at: string;
  updated_at: string;
};

export type Bill = {
  id: string;
  vendor: string;
  invoice_number: string | null;
  amount: number;
  category: 'materials' | 'labor' | 'permits' | 'other' | null;
  purchase_date: string;
  due_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
  paid_date: string | null;
  notes: string | null;
  contract_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Material = {
  id: string;
  code: string | null;
  name: string;
  category: string | null;
  unit_price: number;
  unit: string | null;
  supplier: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Settings = {
  id: string;
  company_name: string | null;
  company_address: string | null;
  company_phone: string | null;
  bank_name: string | null;
  routing_number: string | null;
  account_number: string | null;
  check_template: any;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'employee';
  created_at: string;
  updated_at: string;
};
