import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { getAvailableGroqKeys } from '@/lib/ai';
import { executeWithGeminiRotation, getAvailableGeminiKeys } from '@/lib/gemini-keys';

export interface TechNewsArticle {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  publishedAt: string;
  category: 'AI & LLMs' | 'Research & Science' | 'Open Source & Dev' | 'Tech Industry';
  imageUrl?: string | null;
}

/**
 * Clean HTML tags and decode HTML entities properly from text
 */
export function cleanHtml(raw: string): string {
  if (!raw) return '';
  // 1. Decode common HTML entities
  let text = raw
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

  // 2. Strip CDATA blocks and tags
  text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  text = text.replace(/<[^>]*>/g, '');

  // 3. Strip standalone URLs
  text = text.replace(/https?:\/\/\S+/g, '');

  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Fetch TechCrunch AI stories (Rich, verified tech journalism)
 */
export async function fetchTechCrunchAI(): Promise<TechNewsArticle[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://techcrunch.com/category/artificial-intelligence/feed/', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 ReachOutAI/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const xml = await res.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: TechNewsArticle[] = [];

    for (let i = 0; i < items.length && articles.length < 8; i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);

      const rawTitle = titleMatch ? titleMatch[1] : '';
      const link = linkMatch ? linkMatch[1] : '';
      const pubDate = pubDateMatch ? pubDateMatch[1] : new Date().toISOString();
      const rawDesc = descMatch ? descMatch[1] : '';

      const cleanTitleText = cleanHtml(rawTitle);
      const cleanDescText = cleanHtml(rawDesc);

      if (cleanTitleText && link) {
        articles.push({
          id: `tc-${Buffer.from(cleanTitleText.slice(0, 30)).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`,
          title: cleanTitleText,
          summary: cleanDescText || `Breaking tech reporting on ${cleanTitleText} from TechCrunch.`,
          sourceUrl: link,
          sourceName: 'TechCrunch',
          publishedAt: pubDate,
          category: 'AI & LLMs',
        });
      }
    }

    return articles;
  } catch (err) {
    console.warn('Error fetching TechCrunch feed:', err);
    return [];
  }
}

/**
 * Fetch latest AI research papers from arXiv (Actual scientific research)
 */
export async function fetchArxivAI(): Promise<TechNewsArticle[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=6',
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 ReachOutAI/1.0' },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return [];

    const xml = await res.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    const articles: TechNewsArticle[] = [];

    for (const entry of entries) {
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const idMatch = entry.match(/<id>(.*?)<\/id>/);
      const publishedMatch = entry.match(/<published>(.*?)<\/published>/);

      const rawTitle = titleMatch ? titleMatch[1] : '';
      const rawSummary = summaryMatch ? summaryMatch[1] : '';
      const url = idMatch ? idMatch[1] : 'https://arxiv.org';
      const pubDate = publishedMatch ? publishedMatch[1] : new Date().toISOString();

      const cleanTitleText = cleanHtml(rawTitle);
      const cleanSummaryText = cleanHtml(rawSummary);

      if (cleanTitleText) {
        articles.push({
          id: `arxiv-${Buffer.from(cleanTitleText.slice(0, 30)).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`,
          title: cleanTitleText,
          summary: cleanSummaryText ? cleanSummaryText.slice(0, 280) + '...' : `New machine learning paper: ${cleanTitleText}.`,
          sourceUrl: url,
          sourceName: 'arXiv AI Research',
          publishedAt: pubDate,
          category: 'Research & Science',
        });
      }
    }

    return articles;
  } catch (err) {
    console.warn('Error fetching arXiv papers:', err);
    return [];
  }
}

/**
 * Fetch breaking AI & Tech news across multiple focused categories via Google News RSS
 */
export async function fetchGoogleNewsCategory(
  query: string,
  category: TechNewsArticle['category'],
  limit: number = 6
): Promise<TechNewsArticle[]> {
  try {
    const encodedQuery = encodeURIComponent(`${query} when:2d`);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(rssUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const xml = await res.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: TechNewsArticle[] = [];

    for (let i = 0; i < items.length && articles.length < limit; i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const sourceMatch = item.match(/<source[^>]*>(.*?)<\/source>/);
      const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);

      const rawTitle = titleMatch ? titleMatch[1] : '';
      const link = linkMatch ? linkMatch[1] : '';
      const source = sourceMatch ? sourceMatch[1] : 'Tech News';
      const pubDate = pubDateMatch ? pubDateMatch[1] : new Date().toISOString();
      const rawDesc = descMatch ? descMatch[1] : '';

      let cleanTitleText = cleanHtml(rawTitle);
      if (cleanTitleText.includes(' - ')) {
        const parts = cleanTitleText.split(' - ');
        if (parts.length > 1) {
          parts.pop();
          cleanTitleText = parts.join(' - ');
        }
      }

      const cleanSourceText = cleanHtml(source) || 'Tech News';
      let cleanSummaryText = cleanHtml(rawDesc);
      
      // If summary is just the title or empty, provide a contextual briefing sentence
      if (!cleanSummaryText || cleanSummaryText.length < 35 || cleanSummaryText.toLowerCase() === cleanTitleText.toLowerCase()) {
        cleanSummaryText = `Key developments and industry analysis on ${cleanTitleText}, reported by ${cleanSourceText}. Ready to craft into an insight-rich post.`;
      }

      if (cleanTitleText && link) {
        articles.push({
          id: `gn-${Buffer.from(cleanTitleText.slice(0, 30)).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`,
          title: cleanTitleText,
          summary: cleanSummaryText,
          sourceUrl: link,
          sourceName: cleanSourceText,
          publishedAt: pubDate,
          category,
        });
      }
    }

    return articles;
  } catch (err) {
    console.warn(`Error fetching news for category ${category}:`, err);
    return [];
  }
}

/**
 * Fetch trending AI discussions from Hacker News
 */
export async function fetchHackerNews(): Promise<TechNewsArticle[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      'https://hn.algolia.com/api/v1/search_by_date?tags=story&query=AI+OR+LLM+OR+OpenSource&hitsPerPage=8',
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 ReachOutAI/1.0',
        },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();
    const hits = data.hits || [];
    const articles: TechNewsArticle[] = [];

    for (const hit of hits) {
      if (!hit.title) continue;
      const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
      articles.push({
        id: `hn-${hit.objectID}`,
        title: cleanHtml(hit.title),
        summary: `Trending developer discussion on Hacker News (${hit.points || 0} upvotes, ${hit.num_comments || 0} comments) regarding architecture, trade-offs, and open-source implementation.`,
        sourceUrl: url,
        sourceName: 'Hacker News',
        publishedAt: hit.created_at || new Date().toISOString(),
        category: 'Open Source & Dev',
      });
    }

    return articles;
  } catch (err) {
    console.warn('Error fetching Hacker News:', err);
    return [];
  }
}

/**
 * Combined harvester delivering 20-25 real-time, categorized tech and AI stories
 */
export async function fetchTrendingTopics(): Promise<TechNewsArticle[]> {
  const [tcArticles, arxivArticles, industryArticles, hnArticles, googleAiArticles] = await Promise.all([
    fetchTechCrunchAI(),
    fetchArxivAI(),
    fetchGoogleNewsCategory('Nvidia AI chip OR enterprise AI software funding OR cloud computing', 'Tech Industry', 5),
    fetchHackerNews(),
    fetchGoogleNewsCategory('Artificial Intelligence OR DeepSeek OR Claude OR OpenAI', 'AI & LLMs', 5),
  ]);

  const combined = [
    ...tcArticles,
    ...arxivArticles,
    ...googleAiArticles,
    ...hnArticles,
    ...industryArticles,
  ];

  const seenTitles = new Set<string>();
  const uniqueArticles: TechNewsArticle[] = [];

  for (const art of combined) {
    const norm = art.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 25);
    if (!seenTitles.has(norm)) {
      seenTitles.add(norm);
      uniqueArticles.push(art);
    }
  }

  // Fallback curated topics if network is restricted
  if (uniqueArticles.length === 0) {
    return [
      {
        id: 'fallback-1',
        title: 'DeepSeek & Open Source LLMs: The Shift Towards Local Reasoning Models',
        summary: 'How lightweight open-weight models with self-correction are disrupting multi-billion dollar proprietary enterprise AI architectures.',
        sourceUrl: 'https://huggingface.co',
        sourceName: 'AI Research Hub',
        publishedAt: new Date().toISOString(),
        category: 'Research & Science',
      },
      {
        id: 'fallback-2',
        title: 'Agentic Workflows vs Single-Prompt LLMs: The New Enterprise Standard',
        summary: 'Why autonomous multi-agent loops with tool calling and self-critique are outperforming single giant monolithic models in production.',
        sourceUrl: 'https://arxiv.org',
        sourceName: 'AI Frontiers',
        publishedAt: new Date().toISOString(),
        category: 'AI & LLMs',
      },
      {
        id: 'fallback-3',
        title: 'AI Code Assistants and the Future of Software Engineering',
        summary: 'From simple line autocompletion to autonomous repository refactoring: how developer productivity and software craft are multiplying.',
        sourceUrl: 'https://github.com/blog',
        sourceName: 'Developer Ecosystem',
        publishedAt: new Date().toISOString(),
        category: 'Open Source & Dev',
      },
      {
        id: 'fallback-4',
        title: 'Hardware Inference Scaling: Why Liquid Cooling & Custom Silicon Are the Real AI Bottleneck',
        summary: 'Power grid constraints and memory bandwidth limitations are shifting AI venture capital from algorithms to data center physics.',
        sourceUrl: 'https://techcrunch.com',
        sourceName: 'TechCrunch',
        publishedAt: new Date().toISOString(),
        category: 'Tech Industry',
      },
    ];
  }

  return uniqueArticles;
}

/**
 * Extract og:image or twitter:image from an article URL
 */
export async function extractArticleImage(url: string): Promise<string | null> {
  if (!url || !url.startsWith('http')) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();

    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (ogMatch && ogMatch[1] && ogMatch[1].startsWith('http')) {
      return ogMatch[1];
    }

    const twMatch =
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

    if (twMatch && twMatch[1] && twMatch[1].startsWith('http')) {
      return twMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a tailored, contextual image prompt directly from the post content and lines
 * using Google Gemini with multi-key rotation
 */
export async function generateContextualImagePrompt(
  postContent: string,
  topic: string,
  geminiKey?: string
): Promise<{ editorialPrompt: string; isometricPrompt: string; vectorPrompt: string }> {
  const systemInstruction = `You are an elite art director and visual designer for high-impact technology publications.
Your mission: Analyze the provided LinkedIn post and formulate descriptive visual prompts that visually illustrate the specific lines, concepts, and metaphors discussed in the post.

Rules:
1. Carefully read the post content. Capture the exact subject matter (e.g., if discussing Sam Altman delaying OpenAI IPO, depict a sleek high-tech boardroom overlooking glowing server racks sheltered from financial markets; if discussing GPU compilers, depict a microchip die with glowing CUDA data pathways; if discussing agentic AI, depict glowing interconnected architectural nodes).
2. NEVER include text, letters, typography, words, or logos in the visual description.
3. Provide 3 styles:
   - Editorial: Photorealistic, cinematic lighting, 8k, modern minimalist technology photography.
   - Isometric: 3D isometric tech render, dark obsidian podium, neon turquoise & magenta fiber optics, Octane render.
   - Vector: Minimalist tech vector illustration, sleek dark mode gradient, electric cyan lines.

Return ONLY a JSON object with this exact structure:
{
  "editorial": "...",
  "isometric": "...",
  "vector": "..."
}`;

  const userQuery = `LinkedIn Post Content:
"""
${postContent.slice(0, 1500)}
"""

Topic: ${topic}

Respond with JSON:`;

  // 1. Try Gemini with multi-key rotation pool
  try {
    const { result } = await executeWithGeminiRotation(
      async (model) => {
        return await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${userQuery}` }] }],
          generationConfig: { responseMimeType: 'application/json' },
        });
      },
      'gemini-flash-latest',
      geminiKey
    );

    const raw = result.response.text();
    if (raw) {
      const cleanJson = stripJsonFences(raw);
      const parsed = JSON.parse(cleanJson);
      if (parsed.editorial) {
        return {
          editorialPrompt: cleanPromptString(parsed.editorial),
          isometricPrompt: cleanPromptString(parsed.isometric || parsed.editorial),
          vectorPrompt: cleanPromptString(parsed.vector || parsed.editorial),
        };
      }
    }
  } catch (e) {
    console.warn('Gemini rotation visual prompt failed, trying Groq fallback:', e);
  }

  // 2. Try Groq fallback
  const groqKeys = getAvailableGroqKeys();
  if (groqKeys.length > 0) {
    try {
      const groq = new Groq({ apiKey: groqKeys[0] });
      const res = await groq.chat.completions.create({
        model: 'groq/compound',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userQuery },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 300,
      });
      const rawContent = res.choices[0]?.message?.content || '{}';
      const cleanJson = stripJsonFences(rawContent);
      const parsed = JSON.parse(cleanJson);
      if (parsed.editorial) {
        return {
          editorialPrompt: cleanPromptString(parsed.editorial),
          isometricPrompt: cleanPromptString(parsed.isometric || parsed.editorial),
          vectorPrompt: cleanPromptString(parsed.vector || parsed.editorial),
        };
      }
    } catch (e) {
      console.warn('Groq visual prompt fallback failed:', e);
    }
  }

  // 3. Fallback clean topic prompts
  const clean = topic.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().slice(0, 70);
  return {
    editorialPrompt: `cinematic editorial photograph illustrating ${clean}, artificial intelligence research, sleek modern technology aesthetic, cinematic lighting, 8k resolution`,
    isometricPrompt: `isometric 3D render of futuristic technology for ${clean}, glowing neon turquoise and violet circuits, dark obsidian background, octane render`,
    vectorPrompt: `minimalist modern vector illustration representing ${clean}, clean lines, electric blue and purple gradients, dark slate aesthetic`,
  };
}

function stripJsonFences(raw: string): string {
  if (!raw) return '{}';
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim() || '{}';
}

function cleanPromptString(str: string): string {
  if (!str) return '';
  return str.replace(/["\n\r]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 260);
}

/**
 * Render the image URL based on the contextual prompt using high-resolution Pollinations
 */
export function buildFluxImageUrl(prompt: string, seed?: number): string {
  const chosenSeed = seed || Math.floor(Math.random() * 100000);
  const cleanPrompt = prompt.replace(/[^\w\s,.-]/g, ' ').trim().slice(0, 240);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1200&height=630&nologo=true&seed=${chosenSeed}`;
}

export interface GeminiImageGenerationOutput {
  imageUrl: string;
  visualPrompt: string;
  source: 'gemini' | 'ai';
  variants: {
    editorial: string;
    isometric: string;
    vector: string;
  };
}

/**
 * Generate image using Google Gemini with multi-key rotation and multi-style synthesis
 */
export async function generateGeminiImage(
  postContent: string,
  topic: string,
  geminiKey?: string
): Promise<GeminiImageGenerationOutput> {
  // 1. Synthesize prompts matching the exact post lines using Gemini
  const prompts = await generateContextualImagePrompt(postContent, topic, geminiKey);
  const keys = getAvailableGeminiKeys(geminiKey);

  // 2. Try native Gemini image model if user key has quota
  for (const k of keys) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${k}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompts.editorialPrompt }] }],
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const part = data.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData?.data) {
          const base64 = part.inlineData.data;
          const mime = part.inlineData.mimeType || 'image/jpeg';
          const nativeDataUrl = `data:${mime};base64,${base64}`;
          return {
            imageUrl: nativeDataUrl,
            visualPrompt: prompts.editorialPrompt,
            source: 'gemini',
            variants: {
              editorial: nativeDataUrl,
              isometric: buildFluxImageUrl(prompts.isometricPrompt),
              vector: buildFluxImageUrl(prompts.vectorPrompt),
            },
          };
        }
      }
    } catch {
      // Continue to next key or fallback
    }
  }

  // 3. Render high-res visual variants using the Gemini-synthesized prompts
  const editorialUrl = buildFluxImageUrl(prompts.editorialPrompt);
  const isometricUrl = buildFluxImageUrl(prompts.isometricPrompt);
  const vectorUrl = buildFluxImageUrl(prompts.vectorPrompt);

  return {
    imageUrl: editorialUrl,
    visualPrompt: prompts.editorialPrompt,
    source: 'gemini',
    variants: {
      editorial: editorialUrl,
      isometric: isometricUrl,
      vector: vectorUrl,
    },
  };
}
