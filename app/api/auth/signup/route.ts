import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/user-credentials';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Create user with email_confirm: true so NO verification email is sent/required
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        candidate_name: name || '',
        candidate_phone: phone || '',
      },
    });

    if (authError) {
      console.error('Admin signup error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const newUser = authData.user;

    if (newUser) {
      // Initialize user_settings entry in Postgres
      await supabase.from('user_settings').upsert({
        user_id: newUser.id,
        candidate_name: name || '',
        candidate_phone: phone || '',
        custom_system_prompt: DEFAULT_SYSTEM_PROMPT,
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! You can now sign in immediately.',
    });
  } catch (error: any) {
    console.error('Signup endpoint error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create account' }, { status: 500 });
  }
}
