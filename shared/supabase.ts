import { createClient } from '@supabase/supabase-js';

// These should be set in the environment
// For the server, use process.env. For the client, use import.meta.env (handled by Vite)
const supabaseUrl = typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const createSharedSupabaseClient = (url?: string, key?: string) => {
  const finalUrl = url || supabaseUrl;
  const finalKey = key || supabaseAnonKey;
  
  if (!finalUrl || !finalKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(finalUrl, finalKey);
};

// Database types
export type Employee = {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  position: string | null;
  weekly_rate: number | null;
  hire_date: string | null;
  payment_start_date: string | null;
  ssn: string | null;
  address: string | null;
  telephone: string | null;
  payment_method: 'direct_deposit' | 'check' | 'cash' | 'ach' | 'wire' | null;
  payment_day: string | null;
  payment_status: 'active' | 'paused' | 'leaving' | 'laid_off';
  bank_details: any;
  direct_deposit: boolean;
  default_days_worked: number;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  employee_id: string;
  amount: number;
  status: "pending" | "paid" | "canceled";
  week_start_date: string;
  week_end_date: string;
  due_date: string;
  paid_date: string | null;
  payment_method: string | null;
  bank_name: string | null;
  routing_number: string | null;
  account_number: string | null;
  account_type: string | null;
  account_last_four: string | null;
  days_worked: number;
  deduction_amount: number;
  check_number: string | null;
  down_payment: number | null;
  notes: string | null;
  gross_amount: number | null;
  bonus_amount: number | null;
  created_at?: string;
  updated_at?: string;
};

export type EmployeeAbsence = {
  id: string;
  employee_id: string;
  from_date: string;
  to_date: string;
  days_worked_per_week: number;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type Contract = {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  client_address: string | null;
  client_city: string | null;
  client_state: string | null;
  client_zip: string | null;
  project_name: string;
  project_location: string | null;
  project_description: string | null;
  total_value: number;
  deposit_amount: number | null;
  start_date: string | null;
  due_date: string | null;
  status: 'pending' | 'in-progress' | 'completed';
  cabinet_type: string | null;
  material: string | null;
  custom_finish: string | null;
  installation_included: boolean | null;
  additional_notes: string | null;
  cost_tracking: any;
  payment_schedule: any;
  attachments: any;
  down_payments: any;
  expenses: any;
  created_at: string;
  updated_at: string;
};

export type Bill = {
  id: string;
  vendor: string;
  invoice_number: string | null;
  amount: number;
  category: string | null;
  due_date: string | null;
  description: string | null;
  status: 'pending' | 'paid' | 'overdue';
  recurrent: boolean;
  payment_method: string | null;
  payment_date: string | null;
  autopay: boolean;
  payment_details: any;
  contract_id: string | null;
  attachments: any;
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
  check_start_number: number | null;
  check_template: any;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'worker' | 'employee';
  is_verified: boolean | null;
  created_at: string;
  updated_at: string;
};

export type SalaryHistory = {
  id: string;
  employee_id: string;
  effective_date: string;
  previous_salary: number;
  new_salary: number;
  reason: string | null;
  is_retroactive: boolean;
  created_at: string;
  updated_at: string;
};
