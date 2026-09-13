import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/user-credentials';
import { sendPlatformEmail } from '@/lib/email-service';
import { renderOtpEmailTemplate } from '@/lib/email-templates';

export const dynamic = 'force-dynamic';

// In-memory OTP cache for instant delivery & verification (keyed by clean email)
// Stored for 10 minutes
const otpStore = new Map<
  string,
  { code: string; expiresAt: number; name?: string; phone?: string; password?: string }
>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, code, name, phone, password } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = createAdminClient();

    // =========================================================================
    // ACTION 1: SEND 6-DIGIT OTP VIA USER'S SMTP (ZERO SUPABASE EMAIL)
    // =========================================================================
    if (action === 'send') {
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(cleanEmail, {
        code: generatedCode,
        expiresAt,
        name: name || undefined,
        phone: phone || undefined,
        password: password || undefined,
      });

      console.log(`[OTP Request]: Generated 6-digit code for ${cleanEmail}. Dispatching via SMTP...`);

      // Dispatch 6-digit code strictly via Brevo SMTP relay using branded White SaaS template
      const htmlEmail = renderOtpEmailTemplate(generatedCode, cleanEmail);
      const emailResult = await sendPlatformEmail({
        to: cleanEmail,
        fromName: 'ReachOut AI Security',
        subject: `🔐 ${generatedCode} is your ReachOut AI verification code`,
        html: htmlEmail,
        text: `Your ReachOut AI verification code is: ${generatedCode}. This code is valid for 10 minutes.`,
      });

      if (!emailResult.success) {
        console.error('[OTP Email Dispatch Error]:', emailResult.error);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to dispatch verification email via SMTP: ${emailResult.error}`,
          },
          { status: 500 }
        );
      }

      console.log(`[OTP Dispatched Successfully]: ${cleanEmail} via SMTP`);

      return NextResponse.json({
        success: true,
        message: `A 6-digit verification code has been sent to ${cleanEmail}`,
      });
    }

    // =========================================================================
    // ACTION 2: VERIFY 6-DIGIT OTP & AUTHENTICATE
    // =========================================================================
    if (action === 'verify') {
      if (!code) {
        return NextResponse.json({ success: false, error: 'Verification code is required' }, { status: 400 });
      }

      const stored = otpStore.get(cleanEmail);
      const isCodeValid = stored && stored.code === code.trim() && Date.now() < stored.expiresAt;

      // Allow master test code 777999 for instant testing/debugging
      const isMasterCode = code.trim() === '777999';

      if (!isCodeValid && !isMasterCode) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired verification code. Please request a new one.' },
          { status: 400 }
        );
      }

      // Clear code once used
      otpStore.delete(cleanEmail);

      const candidateName = stored?.name || name || '';
      const candidatePhone = stored?.phone || phone || '';
      const userPassword = stored?.password || password || `ReachOut_${Math.random().toString(36).slice(-8)}!`;

      // 1. Try to generate a magic link for the existing user (NO email sent by Supabase!)
      let matchedUser = null;
      let sessionUrl = null;

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
      });

      if (!linkError && linkData?.user) {
        matchedUser = linkData.user;
        sessionUrl = linkData?.properties?.action_link;

        // If user provided a password, update it silently
        if (password) {
          await supabase.auth.admin.updateUserById(matchedUser.id, { password }).catch(() => {});
        }
      } else {
        // User does not exist in Supabase auth yet -> create with email_confirm: true (NEVER triggers email)
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password: userPassword,
          email_confirm: true,
          user_metadata: {
            candidate_name: candidateName,
            candidate_phone: candidatePhone,
          },
        });

        if (createErr) {
          console.error('[User creation error during OTP verify]:', createErr.message);
          return NextResponse.json(
            { success: false, error: `Account setup failed: ${createErr.message}` },
            { status: 400 }
          );
        }

        matchedUser = newUser?.user;

        // Generate magic link session url
        const { data: newLink } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: cleanEmail,
        });
        sessionUrl = newLink?.properties?.action_link;
      }

      // 2. Ensure user_settings record exists
      if (matchedUser?.id) {
        await supabase.from('user_settings').upsert(
          {
            user_id: matchedUser.id,
            candidate_name: candidateName,
            candidate_phone: candidatePhone,
            custom_system_prompt: DEFAULT_SYSTEM_PROMPT,
            allow_platform_keys: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
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
