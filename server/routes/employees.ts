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

// Delete employee
router.delete('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    
    // Check if employee exists first
    const { data: existing, error: fetchError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', id)
      .single();
      
    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.json({ message: 'Employee deleted successfully' });
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

    // 3. Generate new employee ID
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id')
      .order('created_at', { ascending: false });

    let nextId = 1;
    if (allEmployees && allEmployees.length > 0) {
      // Extract numeric IDs and find the max
      const numericIds = allEmployees
        .map(emp => {
          const match = emp.id.match(/EMP-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);
      
      if (numericIds.length > 0) {
        nextId = Math.max(...numericIds) + 1;
      }
    }

    const newEmployeeId = `EMP-${String(nextId).padStart(3, '0')}`;

    // 4. Create new employee with generated ID
    const { error } = await supabase
      .from('employees')
      .insert({ ...employee, id: newEmployeeId });
    if (error) throw error;
    res.json({ message: 'Created new record', id: newEmployeeId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
