import { Router } from 'express';
import { getSupabase } from '../middleware/auth';

const router = Router();

// Get all payments
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { employeeId } = req.query;
    let query = supabase
      .from('payments')
      .select('*, employees(*)')
      .order('week_start_date', { ascending: false });
    
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

router.post('/bulk', async (req, res) => {
  try {
    const supabase = getSupabase();
    const payments = req.body;
    const { data, error } = await supabase
      .from('payments')
      .insert(payments)
      .select();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create payment
router.post('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const paymentData = req.body;
    const { data, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single payment
router.get('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { data, error } = await supabase
      .from('payments')
      .select('*, employees(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const updateData = req.body;
    const { data, error } = await supabase
      .from('payments')
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

// Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ message: 'Payment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
