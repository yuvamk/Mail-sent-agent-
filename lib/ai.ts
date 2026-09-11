import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { UserDynamicCredentials, getUserCredentials } from '@/lib/user-credentials';
import { calculateCostINR } from '@/lib/token-pricing';
import { createAdminClient } from '@/lib/supabase-server';

export interface LeadContext {
  id?: string;
  company: string;
  location?: string | null;
  salary?: string | null;
  experience?: string | null;
  key_skills?: string | null;
  raw_data?: Record<string, string> | null;
}

export interface DraftOutput {
  subject: string;
  body: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costINR: number;
    modelName: string;
  };
}

function cleanJsonResponse(raw: string): { subject: string; body: string } {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.subject && parsed.body) {
      return {
        subject: String(parsed.subject).trim(),
        body: String(parsed.body).trim(),
      };
    }
  } catch (err) {
    console.error('Failed to parse AI JSON response:', cleaned, err);
  }

  const lines = cleaned.split('\n');
  const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:')) || 'Application for Role at Company';
  const subject = subjectLine.replace(/^subject:/i, '').trim();
  const body = cleaned.replace(subjectLine, '').trim();

  return { subject, body };
}

function formatLeadDetails(lead: LeadContext): string {
  let details = `- Company: ${lead.company}
- Location: ${lead.location || 'N/A'}
- Experience Required: ${lead.experience || 'N/A'}
- Required Key Skills: ${lead.key_skills || 'N/A'}
- Offered Salary: ${lead.salary || 'N/A'}`;

  if (lead.raw_data && Object.keys(lead.raw_data).length > 0) {
    const customLines = Object.entries(lead.raw_data)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');
    details += `\n\nALL DYNAMIC EXCEL COLUMNS:\n${customLines}`;
  }

  return details;
}

export async function generateDraftWithGroq(
  lead: LeadContext,
  resumeText: string,
  creds: UserDynamicCredentials,
  groqModel: string = 'llama-3.3-70b-versatile'
): Promise<DraftOutput> {
  const apiKey = creds.groqApiKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key is not configured in Settings.');
  }

  const groq = new Groq({ apiKey });

  const fullSenderContext = `${creds.candidateName}\nPhone: ${creds.candidatePhone}\nGitHub: ${creds.githubUrl}\nLinkedIn: ${creds.linkedinUrl}`;

  const prompt = `Candidate Name & Portfolio:
${fullSenderContext}

CANDIDATE RESUME SUMMARY:
${resumeText.slice(0, 3000)}

JOB LEAD DETAILS:
${formatLeadDetails(lead)}

Respond ONLY with valid JSON with keys "subject" and "body".`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: creds.customSystemPrompt },
      { role: 'user', content: prompt },
    ],
    model: groqModel,
    response_format: { type: 'json_object' },
  });

  const responseText = chatCompletion.choices[0]?.message?.content || '';
  const draft = cleanJsonResponse(responseText);

  const usage = chatCompletion.usage;
  const inputTokens = usage?.prompt_tokens || Math.ceil(prompt.length / 4);
  const outputTokens = usage?.completion_tokens || Math.ceil(responseText.length / 4);
  const totalTokens = usage?.total_tokens || inputTokens + outputTokens;
  const costINR = calculateCostINR(groqModel, inputTokens, outputTokens);

  return {
    ...draft,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
      costINR,
      modelName: groqModel,
    },
  };
}

export async function generateDraftWithGemini(
  lead: LeadContext,
  resumeText: string,
  creds: UserDynamicCredentials
): Promise<DraftOutput> {
  const apiKey = creds.geminiApiKey;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured in Settings.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = 'gemini-1.5-flash';
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const fullSenderContext = `${creds.candidateName}\nPhone: ${creds.candidatePhone}\nGitHub: ${creds.githubUrl}\nLinkedIn: ${creds.linkedinUrl}`;

  const prompt = `${creds.customSystemPrompt}

Candidate Name & Portfolio:
${fullSenderContext}

CANDIDATE RESUME SUMMARY:
${resumeText.slice(0, 3000)}

JOB LEAD DETAILS:
${formatLeadDetails(lead)}

Respond with JSON format:
{
  "subject": "...",
  "body": "..."
}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  const draft = cleanJsonResponse(responseText);

  const usageMeta = result.response.usageMetadata;
  const inputTokens = usageMeta?.promptTokenCount || Math.ceil(prompt.length / 4);
  const outputTokens = usageMeta?.candidatesTokenCount || Math.ceil(responseText.length / 4);
  const totalTokens = inputTokens + outputTokens;
  const costINR = calculateCostINR(modelName, inputTokens, outputTokens);

  return {
    ...draft,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
      costINR,
      modelName,
    },
  };
}

export async function generateDraftWithClaude(
  lead: LeadContext,
  resumeText: string,
  creds: UserDynamicCredentials
): Promise<DraftOutput> {
  const apiKey = creds.anthropicApiKey;
  if (!apiKey) {
    throw new Error('Anthropic Claude API key is not configured in Settings.');
  }

  const anthropic = new Anthropic({ apiKey });
  const modelName = 'claude-haiku-4-5-20251001';

  const fullSenderContext = `${creds.candidateName}\nPhone: ${creds.candidatePhone}\nGitHub: ${creds.githubUrl}\nLinkedIn: ${creds.linkedinUrl}`;

  const prompt = `Candidate Name & Portfolio:
${fullSenderContext}

CANDIDATE RESUME SUMMARY:
${resumeText.slice(0, 3000)}

JOB LEAD DETAILS:
${formatLeadDetails(lead)}

Respond ONLY with valid JSON with keys "subject" and "body".`;

  const msg = await anthropic.messages.create({
    model: modelName,
    max_tokens: 1024,
    system: creds.customSystemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const contentBlock = msg.content[0];
  const responseText = contentBlock.type === 'text' ? contentBlock.text : '';
  const draft = cleanJsonResponse(responseText);

  const inputTokens = msg.usage?.input_tokens || Math.ceil(prompt.length / 4);
  const outputTokens = msg.usage?.output_tokens || Math.ceil(responseText.length / 4);
  const totalTokens = inputTokens + outputTokens;
  const costINR = calculateCostINR(modelName, inputTokens, outputTokens);

  return {
    ...draft,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
      costINR,
      modelName,
    },
  };
}

export async function generateEmailDraft(
  lead: LeadContext,
  resumeText: string,
  provider: 'gemini' | 'claude' | 'groq',
  userId?: string | null,
  groqModel?: string
): Promise<DraftOutput> {
  const creds = await getUserCredentials(userId);

  let draftResult: DraftOutput;
  if (provider === 'groq') {
    draftResult = await generateDraftWithGroq(lead, resumeText, creds, groqModel || 'llama-3.3-70b-versatile');
  } else if (provider === 'gemini') {
    draftResult = await generateDraftWithGemini(lead, resumeText, creds);
  } else {
    draftResult = await generateDraftWithClaude(lead, resumeText, creds);
  }

  // Record API token usage and estimated cost in INR (₹)
  if (draftResult.usage) {
    try {
      const supabase = createAdminClient();
      await supabase.from('api_usage_logs').insert({
        user_id: userId || null,
        lead_id: lead.id || null,
        provider,
        model_name: draftResult.usage.modelName,
        input_tokens: draftResult.usage.inputTokens,
        output_tokens: draftResult.usage.outputTokens,
        total_tokens: draftResult.usage.totalTokens,
        estimated_cost_inr: draftResult.usage.costINR,
      });
    } catch (e) {
      console.warn('Failed to log API token usage:', e);
    }
  }

  return draftResult;
}
