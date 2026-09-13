import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { getAvailableGroqKeys } from '@/lib/ai';
import { UserDynamicCredentials } from '@/lib/user-credentials';
import { executeWithGeminiRotation } from '@/lib/gemini-keys';

export interface LinkedInPostOutput {
  topic: string;
  postContent: string;
  suggestedHashtags: string[];
  modelUsed: string;
  provider: 'gemini' | 'groq' | 'claude';
}

export interface PostGenerationOptions {
  topic: string;
  summary?: string;
  sourceUrl?: string;
  sourceName?: string;
  tone?: 'thought-leader' | 'technical' | 'conversational' | 'breaking-news';
  authorName?: string;
  aiProvider?: 'gemini' | 'groq' | 'claude';
}

export async function generateLinkedInPost(
  options: PostGenerationOptions,
  creds: UserDynamicCredentials
): Promise<LinkedInPostOutput> {
  const preferredProvider =
    options.aiProvider ||
    (creds.geminiApiKey || process.env.GEMINI_API_KEY ? 'gemini' : 'groq');
  const tone = options.tone || 'thought-leader';
  const author = creds.candidateName || options.authorName || 'AI & Tech Researcher';

  const systemPrompt = `You are a world-class AI researcher, tech strategist, and top LinkedIn voice.
Your goal is to write a high-impact, authentic, and viral LinkedIn post analyzing a cutting-edge AI or technology development.

Follow these strict LinkedIn formatting rules:
1. HOOK: Start with a 1-line powerful, counter-intuitive, or high-urgency hook that stops the scroll. Do not use generic greetings like "Hey everyone!" or "Excited to share".
2. SPACING: Leave an empty line between every 1-2 short sentences for effortless mobile reading.
3. SUBSTANCE: Clearly explain what happened, why it is technically significant, and what the real-world implications are for engineers, businesses, and AI builders.
4. TAKEAWAYS: Use bullet points (e.g. 🔹 or ▹ or •) to break down 3-4 key insights.
5. ENGAGEMENT: End with a thoughtful question that invites passionate debate or insight from other builders in the comments.
6. SOURCE & CREDITS: Include a small credit line at the bottom: "📰 Source: ${options.sourceName || 'Tech Industry Report'}"
7. HASHTAGS: Provide 4-5 high-relevance hashtags (e.g., #ArtificialIntelligence #MachineLearning #TechTrends #LLM #FutureOfWork).

Tone style: ${tone} (smart, authoritative yet approachable, zero fluff, high signal-to-noise ratio).
Author persona: ${author}.

Return ONLY the plain text of the post ready to publish on LinkedIn. Do NOT include any meta reasoning, scratchpad, or markdown backticks.`;

  const userMessage = `Topic: ${options.topic}
Context & Summary: ${options.summary || options.topic}
Source Publication: ${options.sourceName || 'Tech News'}
Source Link: ${options.sourceUrl || 'N/A'}

Write the ultimate LinkedIn post on this topic.`;

  // 1. Google Gemini (gemini-flash-latest with multi-key rotation)
  const tryGemini = async (): Promise<LinkedInPostOutput | null> => {
    try {
      const prompt = `${systemPrompt}\n\n${userMessage}`;
      const { result, modelUsed } = await executeWithGeminiRotation(
        async (model) => {
          return await model.generateContent(prompt);
        },
        'gemini-flash-latest',
        creds.geminiApiKey
      );
      const rawText = result.response.text();
      if (rawText) {
        const postContent = cleanPostText(rawText);
        return {
          topic: options.topic,
          postContent,
          suggestedHashtags: extractHashtags(postContent),
          modelUsed,
          provider: 'gemini',
        };
      }
    } catch (e) {
      console.warn('Gemini rotation attempt failed:', e);
    }
    return null;
  };

  // 2. Groq (groq/compound)
  const tryGroq = async (): Promise<LinkedInPostOutput | null> => {
    const keys = getAvailableGroqKeys(creds.groqApiKey);
    if (keys.length === 0) return null;

    for (let i = 0; i < keys.length; i++) {
      try {
        const groq = new Groq({ apiKey: keys[i] });
        const response = await groq.chat.completions.create({
          model: 'groq/compound',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 1200,
        });

        const rawContent = response.choices[0]?.message?.content?.trim() || '';
        if (rawContent) {
          const postContent = cleanPostText(rawContent);
          return {
            topic: options.topic,
            postContent,
            suggestedHashtags: extractHashtags(postContent),
            modelUsed: 'groq/compound',
            provider: 'groq',
          };
        }
      } catch (e) {
        console.warn(`Groq attempt ${i} failed:`, e);
      }
    }
    return null;
  };

  // 3. Anthropic Claude (claude-haiku-4-5-20251001)
  const tryClaude = async (): Promise<LinkedInPostOutput | null> => {
    const anthropicKey = creds.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) return null;

    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        temperature: 0.7,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const block = response.content[0];
      const rawText = block.type === 'text' ? block.text : '';
      if (rawText) {
        const postContent = cleanPostText(rawText);
        return {
          topic: options.topic,
          postContent,
          suggestedHashtags: extractHashtags(postContent),
          modelUsed: 'claude-haiku-4-5-20251001',
          provider: 'claude',
        };
      }
    } catch (e) {
      console.warn('Claude attempt failed:', e);
    }
    return null;
  };

  // Execution order based on preference
  const order =
    preferredProvider === 'gemini'
      ? [tryGemini, tryGroq, tryClaude]
      : preferredProvider === 'claude'
      ? [tryClaude, tryGemini, tryGroq]
      : [tryGroq, tryGemini, tryClaude];

  for (const fn of order) {
    const res = await fn();
    if (res) return res;
  }

  throw new Error('No AI provider succeeded. Please check your Gemini, Groq, or Anthropic API keys.');
}

function cleanPostText(raw: string): string {
  let text = raw.trim();

  // Strip <think>...</think> tags if present
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // If reasoning blocks are present e.g. "**Reasoning** ... **Result**"
  if (text.includes('**Result**')) {
    const parts = text.split('**Result**');
    text = parts[parts.length - 1].trim();
  }

  // Strip markdown code fences
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
  }

  return text;
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_]+/g);
  return matches ? Array.from(new Set(matches)) : ['#ArtificialIntelligence', '#TechNews', '#Innovation', '#FutureOfTech'];
}
