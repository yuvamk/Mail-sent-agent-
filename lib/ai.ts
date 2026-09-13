import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { UserDynamicCredentials, getUserCredentials } from '@/lib/user-credentials';
import { calculateCostINR } from '@/lib/token-pricing';
import { createAdminClient } from '@/lib/supabase-server';
import { executeWithGeminiRotation, getAvailableGeminiKeys } from '@/lib/gemini-keys';

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

/**
 * Global Groq Key Rotation Pool
 * Supports automatic round-robin load-balancing and instant failover on rate limits (429/TPM/RPM limits)
 */
let groqRoundRobinPointer = 0;

export function getAvailableGroqKeys(userKey?: string, allowPlatformFallback: boolean = true): string[] {
  const candidateKeys = [
    ...(userKey ? userKey.split(/[\n,]+/).map((k) => k.trim()) : []),
    ...(allowPlatformFallback
      ? [
          process.env.GROQ_API_KEY,
          process.env.GROQ_API_KEY_1,
          process.env.GROQ_API_KEY_2,
          process.env.GROQ_API_KEY_3,
        ]
      : []),
  ];

  // Filter non-empty, deduplicate
  const seen = new Set<string>();
  const validKeys: string[] = [];
  for (const k of candidateKeys) {
    if (k && k.startsWith('gsk_') && !seen.has(k)) {
      seen.add(k);
      validKeys.push(k);
    }
  }

  return validKeys;
}

export async function generateDraftWithGroq(
  lead: LeadContext,
  resumeText: string,
  creds: UserDynamicCredentials,
  groqModel: string = 'groq/compound'
): Promise<DraftOutput> {
  const allKeys = getAvailableGroqKeys(creds.groqApiKey, creds.allowPlatformKeys);

  if (allKeys.length === 0) {
    throw new Error(
      creds.allowPlatformKeys
        ? 'No Groq API keys found. Please configure Groq API keys in Settings or .env.local.'
        : 'Your account policy requires you to supply your own Groq API key. Please configure it in Settings.'
    );
  }

  const fullSenderContext = `${creds.candidateName}\nPhone: ${creds.candidatePhone}\nGitHub: ${creds.githubUrl}\nLinkedIn: ${creds.linkedinUrl}`;

  const prompt = `Candidate Name & Portfolio:
${fullSenderContext}

CANDIDATE RESUME SUMMARY:
${resumeText.slice(0, 3000)}

JOB LEAD DETAILS:
${formatLeadDetails(lead)}

Respond ONLY with valid JSON with keys "subject" and "body".`;

  let modelToUse = groqModel || 'groq/compound';
  let chatCompletion: any;
  let lastError: any = null;

  // Start with the next key in round-robin sequence to distribute load across all 3 keys
  const startIndex = groqRoundRobinPointer % allKeys.length;
  groqRoundRobinPointer = (groqRoundRobinPointer + 1) % allKeys.length;

  // Try each available key in the pool if rate limit (429) or temporary error occurs
  for (let attempt = 0; attempt < allKeys.length; attempt++) {
    const currentKeyIndex = (startIndex + attempt) % allKeys.length;
    const currentApiKey = allKeys[currentKeyIndex];
    const groq = new Groq({ apiKey: currentApiKey });

    try {
      chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: creds.customSystemPrompt },
          { role: 'user', content: prompt },
        ],
        model: modelToUse,
        response_format: { type: 'json_object' },
      });

      // If successful, clear lastError and proceed
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;

      // Check if it was a model_not_found error (fallback to groq/compound)
      if (
        err?.message?.includes('model_not_found') ||
        err?.message?.includes('does not exist') ||
        err?.status === 404
      ) {
        console.warn(`Groq model ${modelToUse} not available, switching to groq/compound`);
        modelToUse = 'groq/compound';
        try {
          chatCompletion = await groq.chat.completions.create({
            messages: [
              { role: 'system', content: creds.customSystemPrompt },
              { role: 'user', content: prompt },
            ],
            model: modelToUse,
            response_format: { type: 'json_object' },
          });
          lastError = null;
          break;
        } catch (retryErr: any) {
          lastError = retryErr;
        }
      }

      // Check for rate limit or quota exceeded (429)
      const isRateLimit =
        err?.status === 429 ||
        err?.message?.includes('rate_limit') ||
        err?.message?.includes('tokens per minute') ||
        err?.message?.includes('requests per minute') ||
        err?.message?.includes('Rate limit reached');

      if (isRateLimit && allKeys.length > 1) {
        console.warn(
          `⚠️ Groq Key #${currentKeyIndex + 1} (${currentApiKey.slice(0, 10)}...) hit rate limit. Auto-rotating to next key in pool (${attempt + 1}/${allKeys.length})...`
        );
        // Continue to next key in loop immediately
        continue;
      }

      // If it's a 5xx server error, also retry with next key
      if (attempt < allKeys.length - 1 && err?.status >= 500) {
        console.warn(`Groq server error on key #${currentKeyIndex + 1}, trying next key...`);
        continue;
      }

      // Other fatal client errors, break
      break;
    }
  }

  if (lastError || !chatCompletion) {
    throw lastError || new Error('Failed to generate draft with all available Groq keys in pool.');
  }

  const responseText = chatCompletion.choices[0]?.message?.content || '';
  const draft = cleanJsonResponse(responseText);

  const usage = chatCompletion.usage;
  const inputTokens = usage?.prompt_tokens || Math.ceil(prompt.length / 4);
  const outputTokens = usage?.completion_tokens || Math.ceil(responseText.length / 4);
  const totalTokens = usage?.total_tokens || inputTokens + outputTokens;
  const costINR = calculateCostINR(modelToUse, inputTokens, outputTokens);

  return {
    ...draft,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
      costINR,
      modelName: modelToUse,
    },
  };
}

export async function generateDraftWithGemini(
  lead: LeadContext,
  resumeText: string,
  creds: UserDynamicCredentials
): Promise<DraftOutput> {
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

  const { result, modelUsed } = await executeWithGeminiRotation(
    async (model) => {
      const res = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      return res;
    },
    'gemini-flash-latest',
    creds.geminiApiKey,
    creds.allowPlatformKeys
  );

  const responseText = result.response.text();
  const draft = cleanJsonResponse(responseText);

  const usageMeta = result.response.usageMetadata;
  const inputTokens = usageMeta?.promptTokenCount || Math.ceil(prompt.length / 4);
  const outputTokens = usageMeta?.candidatesTokenCount || Math.ceil(responseText.length / 4);
  const totalTokens = inputTokens + outputTokens;
  const costINR = calculateCostINR(modelUsed, inputTokens, outputTokens);

  return {
    ...draft,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
      costINR,
      modelName: modelUsed,
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
    throw new Error(
      creds.allowPlatformKeys
        ? 'Anthropic Claude API key is not configured in Settings.'
        : 'Your account policy requires you to supply your own Anthropic Claude API key. Please configure it in Settings.'
    );
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
    draftResult = await generateDraftWithGroq(lead, resumeText, creds, groqModel || 'groq/compound');
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
