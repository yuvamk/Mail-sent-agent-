import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function createAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  try {
    // 1. Check Authorization Bearer token header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        const supabase = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) return user.id;
      }
    }

    // 2. Check query param ?userId=
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId');
    if (queryUserId) return queryUserId;
  } catch (e) {
    console.warn('Error resolving user ID from request:', e);
  }

  return null;
}
