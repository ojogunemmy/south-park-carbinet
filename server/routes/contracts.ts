import { Router } from 'express';
import { getSupabase } from '../middleware/auth';

const router = Router();

// Get all contracts
router.get('/', async (_req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update contract
router.patch('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const updateData = req.body;
    const { data, error } = await supabase
      .from('contracts')
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

// Create contract
router.post('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const contractData = req.body;
    const { data, error } = await supabase
      .from('contracts')
      .insert(contractData)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete contract
router.delete('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ message: 'Contract deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
