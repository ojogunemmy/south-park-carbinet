import { Router } from 'express';
import { getSupabase } from '../middleware/auth';

const router = Router();

// Get all absences
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { employeeId } = req.query;
    let query = supabase
      .from('employee_absences')
      .select('*')
      .order('from_date', { ascending: false });
    
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

// Create absence
router.post('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const absenceData = req.body;
    const { data, error } = await supabase
      .from('employee_absences')
      .insert(absenceData)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single absence
router.get('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { data, error } = await supabase
      .from('employee_absences')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update absence
router.patch('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const updateData = req.body;
    const { data, error } = await supabase
      .from('employee_absences')
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

// Delete absence
router.delete('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { error } = await supabase
      .from('employee_absences')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ message: 'Absence deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
