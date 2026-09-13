import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/user-credentials';
import { sendPlatformEmail } from '@/lib/email-service';
import { renderWelcomeEmailTemplate } from '@/lib/email-templates';

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

      return NextResponse.json({ error: authError.message }, { status: 400 });
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
        // Dispatch branded Welcome Onboarding email via platform Brevo SMTP
        try {
          const welcomeHtml = renderWelcomeEmailTemplate(name || 'Job Seeker', cleanEmail);
          await sendPlatformEmail({
            to: cleanEmail,
            subject: '🚀 Welcome to ReachOut AI - Your Career Automation Platform',
            html: welcomeHtml,
            text: `Welcome to ReachOut AI, ${name || 'Job Seeker'}! Get started by uploading your resume and importing recruiter leads.`,
          });
        } catch (welcomeErr) {
          console.warn('Welcome email dispatch notice:', welcomeErr);
        }
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

