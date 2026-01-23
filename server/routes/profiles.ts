import { Router } from 'express';
import { getSupabase, adminOnly } from '../middleware/auth';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get profile by ID
router.get('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
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
      .from('profiles')
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

// Create user via Admin API (prevents session switching)
router.post('/', adminOnly, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        full_name: name, // Keep for backward compatibility (triggers)
        role: role || 'worker'
      }
    });

    if (authError) throw authError;

    // The trigger 'handle_new_user' should have created the profile automatically
    // But we fetch it to confirm and return it
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    res.status(201).json(profile || { message: 'User created successfully' });
  } catch (error: any) {
    console.error('Error in create user endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
