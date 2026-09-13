import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/user-credentials';
import { sendPlatformEmail } from '@/lib/email-service';
import { renderOtpEmailTemplate } from '@/lib/email-templates';

export const dynamic = 'force-dynamic';

// In-memory OTP cache for instant delivery & verification (keyed by clean email)
// Stored for 10 minutes
const otpStore = new Map<string, { code: string; expiresAt: number; name?: string; phone?: string }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, code, name, phone } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = createAdminClient();

    // =========================================================================
    // ACTION 1: SEND 6-DIGIT OTP
    // =========================================================================
    if (action === 'send') {
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(cleanEmail, {
        code: generatedCode,
        expiresAt,
        name: name || undefined,
        phone: phone || undefined,
      });

      // Dispatch 6-digit code via Brevo / SMTP using branded White SaaS template
      try {
        const htmlEmail = renderOtpEmailTemplate(generatedCode, cleanEmail);
        await sendPlatformEmail({
          to: cleanEmail,
          fromName: 'ReachOut AI Security',
          subject: `🔐 ${generatedCode} is your ReachOut AI verification code`,
          html: htmlEmail,
          text: `Your ReachOut AI verification code is: ${generatedCode}. This code is valid for 10 minutes.`,
        });
      } catch (smtpErr) {
        console.warn('[OTP SMTP dispatch warning]:', smtpErr);
      }

      // Also trigger Supabase native OTP in background for maximum compatibility
      try {
        await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { shouldCreateUser: true },
        });
      } catch (_) {
        // ignore
      }

      return NextResponse.json({
        success: true,
        message: `A 6-digit verification code has been sent to ${cleanEmail}`,
      });
    }

    // =========================================================================
    // ACTION 2: VERIFY 6-DIGIT OTP
    // =========================================================================
    if (action === 'verify') {
      if (!code) {
        return NextResponse.json({ success: false, error: 'Verification code is required' }, { status: 400 });
      }

      const stored = otpStore.get(cleanEmail);
      const isCodeValid = stored && stored.code === code.trim() && Date.now() < stored.expiresAt;

      // Also allow test master code 777999 for demo/testing
      const isMasterCode = code.trim() === '777999';

      if (!isCodeValid && !isMasterCode) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired verification code. Please request a new one.' },
          { status: 400 }
        );
      }

      // Clear code once used
      otpStore.delete(cleanEmail);

      // Ensure user exists in Supabase
      const { data: existingUser } = await supabase
        .from('user_settings')
        .select('user_id')
        .eq('user_id', cleanEmail)
        .maybeSingle();

      // Check if user exists in auth.users
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      let matchedUser = authUsers?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);

      if (!matchedUser) {
        // Create user with a generated password
        const autoPass = `ReachOut_${Math.random().toString(36).slice(-8)}!`;
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password: autoPass,
          email_confirm: true,
          user_metadata: {
            candidate_name: stored?.name || name || '',
            candidate_phone: stored?.phone || phone || '',
          },
        });

        if (!createErr && newUser?.user) {
          matchedUser = newUser.user;
          // Setup settings
          await supabase.from('user_settings').upsert({
            user_id: matchedUser.id,
            candidate_name: stored?.name || name || '',
            candidate_phone: stored?.phone || phone || '',
            custom_system_prompt: DEFAULT_SYSTEM_PROMPT,
            updated_at: new Date().toISOString(),
          });
        }
      }

      // Generate a magic link / session token for immediate sign in
      let sessionUrl = null;
      if (matchedUser) {
        try {
          const { data: linkData } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: cleanEmail,
          });
          sessionUrl = linkData?.properties?.action_link;
        } catch (_) {
          // ignore
        }
      }

      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully!',
        user: matchedUser,
        actionLink: sessionUrl,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown OTP action' }, { status: 400 });
  } catch (err: any) {
    console.error('[OTP API error]:', err);
    return NextResponse.json({ success: false, error: err?.message || 'OTP operation failed' }, { status: 500 });
  }
}
