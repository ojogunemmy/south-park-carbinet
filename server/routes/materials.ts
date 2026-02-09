import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getSupabase } from '../middleware/auth';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const materialData = req.body;
    const now = new Date().toISOString();
    const bodyId = materialData?.id;
    const id = bodyId || randomUUID();
    // Prevent client-provided null/undefined id overwriting generated id
    const { id: _ignoredId, ...materialWithoutId } = (materialData ?? {}) as Record<string, unknown>;
    const { data, error } = await supabase
      .from('materials')
      .insert({
        ...materialWithoutId,
        id,
        created_at: materialData?.created_at ?? now,
        updated_at: materialData?.updated_at ?? now,
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    const message =
      error?.message ||
      error?.details ||
      error?.hint ||
      'Failed to create material';
    res.status(500).json({ error: message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const updateData = req.body;
    const { data, error } = await supabase
      .from('materials')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    const message =
      error?.message ||
      error?.details ||
      error?.hint ||
      'Failed to update material';
    res.status(500).json({ error: message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
