import { Router } from 'express';
import { getSupabase } from '../middleware/auth';

const router = Router();

// Get all employees
router.get('/', async (_req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update employee
router.patch('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const updateData = req.body;
    
    const { data, error } = await supabase
      .from('employees')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create employee (HR record)
router.post('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const employeeData = req.body;
    const { data, error } = await supabase
      .from('employees')
      .insert(employeeData)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upsert Public (Onboarding)
router.post('/upsert-public', async (req, res) => {
  try {
    const supabase = getSupabase();
    const employee = req.body;
    
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
        return res.json({ message: 'Updated existing record' });
      }
    }

    // 2. Fallback to name-based match
    if (employee.name) {
      const { data: existingByName } = await supabase
        .from('employees')
        .select('id')
        .eq('name', employee.name)
        .is('user_id', null)
        .maybeSingle();

      if (existingByName) {
        const { error } = await supabase
          .from('employees')
          .update({ ...employee, updated_at: new Date().toISOString() })
          .eq('id', existingByName.id);
        if (error) throw error;
        return res.json({ message: 'Updated existing record by name' });
      }
    }

    // 3. Create new
    const { error } = await supabase.from('employees').insert(employee);
    if (error) throw error;
    res.json({ message: 'Created new record' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
