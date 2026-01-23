import { Router } from 'express';
import { getSupabase } from '../middleware/auth';

const router = Router();

// Get all salary history
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { employeeId } = req.query;
    let query = supabase
      .from('salary_history')
      .select('*')
      .order('effective_date', { ascending: false });
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create salary history
router.post('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const historyData = req.body;
    const { data, error } = await supabase
      .from('salary_history')
      .insert(historyData)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single salary history record
router.get('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { data, error } = await supabase
      .from('salary_history')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update salary history
router.patch('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const updateData = req.body;
    const { data, error } = await supabase
      .from('salary_history')
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

// Delete salary history
router.delete('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { error } = await supabase
      .from('salary_history')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ message: 'Salary history record deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
