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

export async function getUserIdFromRequest(req: NextRequest, fallbackUserId?: string | null): Promise<string | null> {
  try {
    // 1. Check Authorization Bearer token header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        const supabase = createAdminClient();
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user) return user.id;
        if (error) console.warn('getUser from Bearer token failed:', error.message);
      }
    }

    // 2. Check x-user-id custom header
    const xUserId = req.headers.get('x-user-id');
    if (xUserId?.trim()) return xUserId.trim();

    // 3. Check query param ?userId=
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId');
    if (queryUserId?.trim()) return queryUserId.trim();

    // 4. Check explicit fallback (e.g. from JSON body)
    if (fallbackUserId?.trim()) return fallbackUserId.trim();

    // 5. Check Supabase cookies if present
    const cookieHeader = req.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/sb-[a-zA-Z0-9]+-auth-token=([^;]+)/);
    if (tokenMatch && tokenMatch[1]) {
      try {
        const decoded = JSON.parse(decodeURIComponent(tokenMatch[1]));
        const token = Array.isArray(decoded) ? decoded[0] : decoded?.access_token;
        if (token) {
          const supabase = createAdminClient();
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) return user.id;
        }
      } catch {
        // ignore cookie parse error
      }
    }
  } catch (e) {
    console.warn('Error resolving user ID from request:', e);
  }

  return fallbackUserId || null;
}
