import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';
import { getUserCredentials, DEFAULT_SYSTEM_PROMPT } from '@/lib/user-credentials';

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
        DEFAULT_PROMPT_TEMPLATE: DEFAULT_SYSTEM_PROMPT,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in first.' }, { status: 401 });
    }

    const body = await req.json();
    const { ...fields } = body;

    const supabase = createAdminClient();

    const payload = {
      user_id: userId,
      custom_system_prompt: fields.CUSTOM_SYSTEM_PROMPT,
      anthropic_api_key: fields.ANTHROPIC_API_KEY,
      gemini_api_key: fields.GEMINI_API_KEY,
      groq_api_key: fields.GROQ_API_KEY,
      smtp_host: fields.SMTP_HOST,
      smtp_port: fields.SMTP_PORT,
      smtp_user: fields.SMTP_USER,
      smtp_pass: fields.SMTP_PASS,
      smtp_from_email: fields.SMTP_FROM_EMAIL,
      candidate_name: fields.MY_NAME,
      candidate_phone: fields.MY_PHONE,
      github_url: fields.MY_GITHUB,
      linkedin_url: fields.MY_LINKEDIN,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_settings')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save user settings' }, { status: 500 });
  }
}
