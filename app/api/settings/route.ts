import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';
import { getUserCredentials, DEFAULT_SYSTEM_PROMPT } from '@/lib/user-credentials';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({
        settings: {
          CUSTOM_SYSTEM_PROMPT: DEFAULT_SYSTEM_PROMPT,
          ANTHROPIC_API_KEY: '',
          GEMINI_API_KEY: '',
          GROQ_API_KEY: '',
          SMTP_HOST: '',
          SMTP_PORT: '587',
          SMTP_USER: '',
          SMTP_PASS: '',
          SMTP_FROM_EMAIL: '',
          BREVO_API_KEY: '',
          MY_NAME: '',
          MY_PHONE: '',
          MY_GITHUB: '',
          MY_LINKEDIN: '',
          LINKEDIN_ACCESS_TOKEN: '',
          LINKEDIN_PERSON_URN: '',
          IS_ADMIN: false,
          DEFAULT_PROMPT_TEMPLATE: DEFAULT_SYSTEM_PROMPT,
        },
      });
    }

    const creds = await getUserCredentials(userId);

    return NextResponse.json({
      settings: {
        CUSTOM_SYSTEM_PROMPT: creds.customSystemPrompt,
        ANTHROPIC_API_KEY: creds.anthropicApiKey,
        GEMINI_API_KEY: creds.geminiApiKey,
        GROQ_API_KEY: creds.groqApiKey,
        SMTP_HOST: creds.smtpHost,
        SMTP_PORT: String(creds.smtpPort),
        SMTP_USER: creds.smtpUser,
        SMTP_PASS: creds.smtpPass,
        SMTP_FROM_EMAIL: creds.smtpFromEmail,
        BREVO_API_KEY: creds.brevoApiKey,
        MY_NAME: creds.candidateName,
        MY_PHONE: creds.candidatePhone,
        MY_GITHUB: creds.githubUrl,
        MY_LINKEDIN: creds.linkedinUrl,
        LINKEDIN_ACCESS_TOKEN: creds.linkedinAccessToken,
        LINKEDIN_PERSON_URN: creds.linkedinPersonUrn,
        IS_ADMIN: creds.isAdmin,
        DEFAULT_PROMPT_TEMPLATE: DEFAULT_SYSTEM_PROMPT,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = await getUserIdFromRequest(req, body.userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Unable to resolve user identity. Please sign in.' },
        { status: 401 }
      );
    }

    const { ...fields } = body;
    const supabase = createAdminClient();

    const payload: Record<string, any> = {
      user_id: userId,
      custom_system_prompt: fields.CUSTOM_SYSTEM_PROMPT ?? null,
      anthropic_api_key: fields.ANTHROPIC_API_KEY ?? null,
      gemini_api_key: fields.GEMINI_API_KEY ?? null,
      groq_api_key: fields.GROQ_API_KEY ?? null,
      brevo_api_key: fields.BREVO_API_KEY ?? null,
      smtp_host: fields.SMTP_HOST ?? null,
      smtp_port: fields.SMTP_PORT ? String(fields.SMTP_PORT) : null,
      smtp_user: fields.SMTP_USER ?? null,
      smtp_pass: fields.SMTP_PASS ?? null,
      smtp_from_email: fields.SMTP_FROM_EMAIL ?? null,
      candidate_name: fields.MY_NAME ?? null,
      candidate_phone: fields.MY_PHONE ?? null,
      github_url: fields.MY_GITHUB ?? null,
      linkedin_url: fields.MY_LINKEDIN ?? null,
      linkedin_access_token: fields.LINKEDIN_ACCESS_TOKEN ?? null,
      linkedin_person_urn: fields.LINKEDIN_PERSON_URN ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_settings')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.error('user_settings upsert error:', error);
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error: any) {
    console.error('Settings POST route error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save user settings' }, { status: 500 });
  }
}
