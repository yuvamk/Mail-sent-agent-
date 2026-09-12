import { createAdminClient } from '@/lib/supabase-server';

export interface UserDynamicCredentials {
  userId: string | null;
  customSystemPrompt: string;
  anthropicApiKey: string;
  geminiApiKey: string;
  groqApiKey: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFromEmail: string;
  brevoApiKey: string;
  candidateName: string;
  candidatePhone: string;
  githubUrl: string;
  linkedinUrl: string;
}

export const DEFAULT_SYSTEM_PROMPT = `You are a professional career outreach strategist writing cold job outreach emails to HR representatives or recruiters.
Write a concise, professional, highly tailored, and compelling email matching the candidate's resume to the job lead's requirements.

RULES:
1. Output MUST be strictly valid JSON with keys "subject" and "body". No markdown formatting outside JSON.
2. The email subject line should be catchy, professional, and clear.
3. The body should highlight 2-3 specific matching skills from the resume relevant to the lead's required skills.
4. Utilize all relevant information provided in the job details (including any dynamic custom Excel fields like Job Title, Tech Stack, Department, or Requirements).
5. Keep the body concise (120-180 words maximum).
6. End with a polite call-to-action and candidate signature using the candidate's name and portfolio details provided in context.
7. Do NOT include generic filler. Speak directly and professionally.`;

export async function getUserCredentials(userId?: string | null): Promise<UserDynamicCredentials> {
  const envDefaults: UserDynamicCredentials = {
    userId: userId || null,
    customSystemPrompt: DEFAULT_SYSTEM_PROMPT,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    groqApiKey: process.env.GROQ_API_KEY || '',
    smtpHost: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || 'b8decd001@smtp-brevo.com',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFromEmail: process.env.SMTP_FROM_EMAIL || 'yuvamk6@gmail.com',
    brevoApiKey: process.env.BREVO_API_KEY || '',
    candidateName: process.env.MY_NAME || 'Yuvam Kumar',
    candidatePhone: process.env.MY_PHONE || '8650825573',
    githubUrl: process.env.MY_GITHUB || 'https://github.com/yuvamk',
    linkedinUrl: process.env.MY_LINKEDIN || 'https://www.linkedin.com/in/yuvam-kumar-637712227',
  };

  if (!userId) return envDefaults;

  try {
    const supabase = createAdminClient();
    const { data: dbSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!dbSettings) return envDefaults;

    return {
      userId,
      customSystemPrompt: dbSettings.custom_system_prompt?.trim() || envDefaults.customSystemPrompt,
      anthropicApiKey: dbSettings.anthropic_api_key?.trim() || envDefaults.anthropicApiKey,
      geminiApiKey: dbSettings.gemini_api_key?.trim() || envDefaults.geminiApiKey,
      groqApiKey: dbSettings.groq_api_key?.trim() || envDefaults.groqApiKey,
      smtpHost: dbSettings.smtp_host?.trim() || envDefaults.smtpHost,
      smtpPort: dbSettings.smtp_port ? parseInt(dbSettings.smtp_port, 10) : envDefaults.smtpPort,
      smtpUser: dbSettings.smtp_user?.trim() || envDefaults.smtpUser,
      smtpPass: dbSettings.smtp_pass?.trim() || envDefaults.smtpPass,
      smtpFromEmail: dbSettings.smtp_from_email?.trim() || envDefaults.smtpFromEmail,
      brevoApiKey: dbSettings.brevo_api_key?.trim() || envDefaults.brevoApiKey,
      candidateName: dbSettings.candidate_name?.trim() || envDefaults.candidateName,
      candidatePhone: dbSettings.candidate_phone?.trim() || envDefaults.candidatePhone,
      githubUrl: dbSettings.github_url?.trim() || envDefaults.githubUrl,
      linkedinUrl: dbSettings.linkedin_url?.trim() || envDefaults.linkedinUrl,
    };
  } catch (e) {
    console.warn('Error fetching dynamic user credentials from DB, fallback to env:', e);
    return envDefaults;
  }
}
