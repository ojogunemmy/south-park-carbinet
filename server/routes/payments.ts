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

// REMOVED: PATCH and DELETE endpoints
// Payments are append-only ledger entries
// Use POST /api/payments/:id/reverse to create reversal entries

// Create reversal entry for a payment
router.post('/:id/reverse', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { reason, user_id } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Reversal reason is required' });
    }

    const { data, error } = await supabase
      .rpc('create_payment_reversal', {
        p_original_payment_id: id,
        p_reason: reason,
        p_user_id: user_id || null
      });

    if (error) throw error;

    res.json({ 
      message: 'Payment reversed successfully',
      reversalId: data,
      originalPaymentId: id
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get audit trail for a payment
router.get('/:id/audit', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('payment_audit_log')
      .select('*')
      .eq('payment_id', id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
