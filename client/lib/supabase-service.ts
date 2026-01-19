import { supabase, type Employee, type Payment, type Contract, type Bill, type Material, type Settings, type Profile } from './supabase';

// ============================================
// EMPLOYEES SERVICE
// ============================================
export const employeesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Employee[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Employee;
  },

  async create(employee: Partial<Employee>) {
    const { data, error } = await supabase
      .from('employees')
      .insert(employee)
      .select()
      .single();
    if (error) throw error;
    return data as Employee;
  },

  // Public submission with deduplication logic
  async upsertPublic(employee: Partial<Employee>) {
    // 1. Try to find existing employee by email
    if (employee.email) {
      const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .eq('email', employee.email)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('employees')
          .update({ ...employee, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
        return;
      }
    }

    // 2. Fallback to name-based match if email not found but name provided
    if (employee.name) {
      const { data: existingByName } = await supabase
        .from('employees')
        .select('id')
        .eq('name', employee.name)
        .is('user_id', null) // Only link to unlinked records
        .maybeSingle();

      if (existingByName) {
        const { error } = await supabase
          .from('employees')
          .update({ ...employee, updated_at: new Date().toISOString() })
          .eq('id', existingByName.id);
        if (error) throw error;
        return;
      }
    }

    // 3. Create new if no match found
    const { error } = await supabase.from('employees').insert(employee);
    if (error) throw error;
  },

  // Public submission (legacy fallback)
  async createPublic(employee: Partial<Employee>) {
    const { error } = await supabase.from('employees').insert(employee);
    if (error) throw error;
  },

  async update(id: string, employee: Partial<Employee>) {
    const { data, error } = await supabase
      .from('employees')
      .update({ ...employee, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as Employee;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// ============================================
// PROFILES SERVICE
// ============================================
export const profilesService = {
  async update(id: string, profile: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...profile, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as Profile;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    if (error) throw error;
    return data as Profile[];
  }
};

// ============================================
// PAYMENTS SERVICE
// ============================================
export const paymentsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('payments')
      .select('*, employees(*)')
      .order('week_start_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getByEmployee(employeeId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('employee_id', employeeId)
      .order('week_start_date', { ascending: false });
    if (error) throw error;
    return data as Payment[];
  },

  async create(payment: Partial<Payment>) {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select()
      .single();
    if (error) throw error;
    return data as Payment;
  },

  async createBulk(payments: Partial<Payment>[]) {
    const { data, error } = await supabase
      .from('payments')
      .insert(payments)
      .select();
    if (error) throw error;
    return data as Payment[];
  },

  async update(id: string, payment: Partial<Payment>) {
    const { data, error } = await supabase
      .from('payments')
      .update({ ...payment, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Payment;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// ============================================
// CONTRACTS SERVICE
// ============================================
export const contractsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Contract[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Contract;
  },

  async create(contract: Partial<Contract>) {
    const { data, error } = await supabase
      .from('contracts')
      .insert(contract)
      .select()
      .single();
    if (error) throw error;
    return data as Contract;
  },

  async update(id: string, contract: Partial<Contract>) {
    const { data, error } = await supabase
      .from('contracts')
      .update({ ...contract, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Contract;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// ============================================
// BILLS SERVICE
// ============================================
export const billsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .order('purchase_date', { ascending: false });
    if (error) throw error;
    return data as Bill[];
  },

  async create(bill: Partial<Bill>) {
    const { data, error } = await supabase
      .from('bills')
      .insert(bill)
      .select()
      .single();
    if (error) throw error;
    return data as Bill;
  },

  async update(id: string, bill: Partial<Bill>) {
    const { data, error } = await supabase
      .from('bills')
      .update({ ...bill, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Bill;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('bills')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// ============================================
// MATERIALS SERVICE
// ============================================
export const materialsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data as Material[];
  },

  async create(material: Partial<Material>) {
    const { data, error } = await supabase
      .from('materials')
      .insert(material)
      .select()
      .single();
    if (error) throw error;
    return data as Material;
  },

  async update(id: string, material: Partial<Material>) {
    const { data, error } = await supabase
      .from('materials')
      .update({ ...material, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Material;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// ============================================
// SETTINGS SERVICE
// ============================================
export const settingsService = {
  async get() {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .single();
    if (error) throw error;
    return data as Settings;
  },

  async update(settings: Partial<Settings>) {
    // Get the first settings record
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .limit(1)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('settings')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data as Settings;
    } else {
      // Create if doesn't exist
      const { data, error } = await supabase
        .from('settings')
        .insert(settings)
        .select()
        .single();
      if (error) throw error;
      return data as Settings;
    }
  }
};
