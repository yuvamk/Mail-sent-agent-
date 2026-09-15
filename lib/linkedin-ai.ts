import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { getAvailableGroqKeys } from '@/lib/ai';
import { UserDynamicCredentials } from '@/lib/user-credentials';
import { executeWithGeminiRotation } from '@/lib/gemini-keys';

import { AgentRepo } from '@/lib/repo-fetcher';

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
  postType?: 'news' | 'repo_spotlight';
  repoData?: Partial<AgentRepo>;
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

  const isRepoSpotlight = options.postType === 'repo_spotlight' || Boolean(options.repoData);
  const repo = options.repoData;

  let systemPrompt = '';
  let userMessage = '';

  if (isRepoSpotlight && repo) {
    const isFresh = repo.isFreshLaunch || (repo.launchAgeText && !repo.launchAgeText.includes('Proven'));
    const freshLaunchDirective = isFresh
      ? `\n\n🚨 FRESH LAUNCH CONTEXT:
This open-source AI agent repository was freshly launched on GitHub (${repo.launchAgeText || 'Brand-New Launch'})!
Frame the hook and opening with high urgency and excitement about this brand-new open-source release:
- Hook example style: "🚨 NEW LAUNCH ALERT: Someone just open-sourced ${repo.name} on GitHub, and it solves one of the biggest headaches in AI agent development..." or "If you're building with AI agents, stop scrolling—${repo.name} just dropped on GitHub..."
- Emphasize why developers and builders should check out this freshly launched tool today.`
      : '';

    systemPrompt = `You are an elite AI engineer, open-source evangelist, and top developer voice on LinkedIn.
Your mission: Write a high-engagement, viral, and actionable LinkedIn post spotlighting an open-source AI agent repository that makes developers' and builders' work easy.${freshLaunchDirective}

Follow these strict LinkedIn formatting rules:
1. HOOK: Start with a 1-2 line powerful, problem-first hook${isFresh ? ' announcing this new open-source drop' : ''}. What painful task or bottleneck does this AI agent eliminate for developers/builders? Never use generic greetings ("Hey everyone", "I'm excited to share", "Check out this repo").
2. WHAT IT IS & WHAT IT DOES: In 2 crisp, high-signal sentences, explain what this repository is, why it was created, and what it does.
3. WHAT IT CAN DO (Superpowers): Use clean bullet points (e.g. 🔹 or ⚡ or 🚀) to highlight 3-4 concrete capabilities or features (e.g., autonomous DOM perception, multi-agent orchestration, infinite memory context, local privacy, auto-refactoring).
4. HOW TO USE IN YOUR PROJECT: Clearly explain how a developer or builder can start using it in their project today. Include practical guidance (e.g. installation command, quick-start code pattern, or architecture integration).
5. DIRECT REPO LINK: Include a clean, prominent callout with the exact repository link:
   ⭐ GitHub Repository: ${repo.repoUrl || options.sourceUrl || 'https://github.com'}
6. ENGAGEMENT QUESTION: End with a sharp, open question for fellow engineers and builders to discuss in the comments (e.g. asking how they are automating workflows or what they'd build with this).
7. HASHTAGS: Provide 4-5 high-relevance hashtags (e.g., #AIAgents #OpenSource #DeveloperTools #SoftwareEngineering #AI).
8. SPACING: Ensure generous empty lines between every 1-2 short sentences for mobile readability.

Tone style: ${tone} (developer-first, high technical signal, practical, zero corporate fluff).
Author persona: ${author}.

Return ONLY the plain text of the post ready to publish directly on LinkedIn. Do NOT include markdown code fences around the whole post, meta reasoning, or scratchpad tags.`;

    userMessage = `AI Agent Repository: ${repo.name || options.topic} (${repo.fullName || repo.name || ''})
Launch Timing: ${repo.launchAgeText || 'Active Open Source'} (Created: ${repo.createdAt || 'Recent'})
GitHub URL: ${repo.repoUrl || options.sourceUrl}
Primary Language: ${repo.language || 'Python / TypeScript'}
Stars: ⭐ ${repo.stars ? repo.stars.toLocaleString() : 'Trending'}
Category: ${repo.category || 'AI Agents & Automation'}
What It Does: ${repo.whatItDoes || repo.description || options.summary || ''}
Key Capabilities: ${Array.isArray(repo.whatItCanDo) ? repo.whatItCanDo.join('; ') : ''}
How To Use: ${repo.howToUse || ''}
Best For: ${repo.bestFor || 'Developers & AI Builders'}

Write the ultimate viral LinkedIn spotlight post explaining this repository, what it is about, what it can do, how developers can use it in their project, and linking directly to the repo.`;
  } else {
    systemPrompt = `You are a world-class AI researcher, tech strategist, and top LinkedIn voice.
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

    userMessage = `Topic: ${options.topic}
Context & Summary: ${options.summary || options.topic}
Source Publication: ${options.sourceName || 'Tech News'}
Source Link: ${options.sourceUrl || 'N/A'}

Write the ultimate LinkedIn post on this topic.`;
  }

  // 1. Google Gemini (gemini-flash-latest with multi-key rotation)
  const tryGemini = async (): Promise<LinkedInPostOutput | null> => {
    try {
      const prompt = `${systemPrompt}\n\n${userMessage}`;
      const { result, modelUsed } = await executeWithGeminiRotation(
        async (model) => {
          return await model.generateContent(prompt);
        },
        'gemini-flash-latest',
        creds.geminiApiKey,
        creds.allowPlatformKeys
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
    const keys = getAvailableGroqKeys(creds.groqApiKey, creds.allowPlatformKeys);
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
    const anthropicKey = creds.anthropicApiKey || (creds.allowPlatformKeys ? process.env.ANTHROPIC_API_KEY : '');
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
