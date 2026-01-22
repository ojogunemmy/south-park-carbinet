import { Request, Response, NextFunction } from 'express';
import { createSharedSupabaseClient } from '../../shared/supabase';

let supabaseClient: any = null;

export const getSupabase = () => {
  if (!supabaseClient) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error("Missing Supabase environment variables in Auth Middleware");
    }
    supabaseClient = createSharedSupabaseClient(url, key);
  }
  return supabaseClient;
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Supabase
    const supabase = getSupabase();
    console.log(`[AuthMiddleware] Verifying token for request to ${req.path}`);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("[AuthMiddleware] Token verification failed:", error?.message || "No user found");
      if (error) {
         console.error("[AuthMiddleware] Supabase error details:", JSON.stringify(error));
      }
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error: any) {
    console.error("Auth Middleware Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Check profile role
    const supabase = getSupabase();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
