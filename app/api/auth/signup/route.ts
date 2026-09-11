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

    const cleanEmail = email.trim().toLowerCase();
    const supabase = createAdminClient();

    let newUser = null;

    // 1. Try creating user via admin API with email_confirm: true (bypasses email confirmation links)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        candidate_name: name || '',
        candidate_phone: phone || '',
      },
    });

    if (authError) {
      const isAlreadyRegistered =
        authError.message?.toLowerCase().includes('already been registered') ||
        authError.message?.toLowerCase().includes('email_exists') ||
        (authError as any).code === 'email_exists' ||
        (authError as any).status === 422;

      if (isAlreadyRegistered) {
        return NextResponse.json(
          {
            alreadyRegistered: true,
            error: 'An account with this email address has already been registered. Please click "Sign in here" below to log in.',
          },
          { status: 400 }
        );
      }

      // 2. Fallback: If admin.createUser hits a database error trigger, attempt standard signUp
      if (authError.message?.toLowerCase().includes('database error')) {
        console.warn('Admin createUser database trigger error. Attempting fallback auth.signUp...');
        const { data: fallbackData, error: fallbackError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              candidate_name: name || '',
              candidate_phone: phone || '',
            },
          },
        });

        if (fallbackError) {
          const isFallbackRegistered =
            fallbackError.message?.toLowerCase().includes('already been registered') ||
            (fallbackError as any).code === 'email_exists' ||
            (fallbackError as any).status === 422;

          if (isFallbackRegistered) {
            return NextResponse.json(
              {
                alreadyRegistered: true,
                error: 'An account with this email address has already been registered. Please click "Sign in here" below to log in.',
              },
              { status: 400 }
            );
          }
          return NextResponse.json({ error: fallbackError.message }, { status: 400 });
        }

        newUser = fallbackData.user;
      } else {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    } else {
      newUser = authData.user;
    }

    if (newUser) {
      try {
        // Initialize user_settings entry in Postgres
        await supabase.from('user_settings').upsert({
          user_id: newUser.id,
          candidate_name: name || '',
          candidate_phone: phone || '',
          custom_system_prompt: DEFAULT_SYSTEM_PROMPT,
          updated_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('Error setting up initial user_settings row:', dbErr);
      }
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

