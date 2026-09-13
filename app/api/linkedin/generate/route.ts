import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';
import { getUserCredentials } from '@/lib/user-credentials';
import { generateLinkedInPost } from '@/lib/linkedin-ai';
import { assertActiveSubscription } from '@/lib/subscription';
import {
  extractArticleImage,
  generateGeminiImage,
} from '@/lib/news-fetcher';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = await getUserIdFromRequest(req, body.userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in to generate posts.' },
        { status: 401 }
      );
    }

    const subCheck = await assertActiveSubscription(userId);
    if (!subCheck.allowed) {
      return NextResponse.json(
        { success: false, error: subCheck.error, code: 'SUBSCRIPTION_EXPIRED' },
        { status: 402 }
      );
    }

    const {
      topic,
      summary,
      sourceUrl,
      sourceName,
      tone = 'thought-leader',
      aiProvider = 'gemini',
      customImageUrl,
      preferNewsImage = false,
    } = body;

    if (!topic) {
      return NextResponse.json(
        { success: false, error: 'Topic is required' },
        { status: 400 }
      );
    }

    const creds = await getUserCredentials(userId);

    // 1. Generate LinkedIn Post with AI
    const generated = await generateLinkedInPost(
      {
        topic,
        summary,
        sourceUrl,
        sourceName,
        tone,
        aiProvider,
        authorName: creds.candidateName || 'Tech Innovator',
      },
      creds
    );

    // 2. Generate a custom, contextual image using Gemini matching the post content and lines
    const geminiImg = await generateGeminiImage(
      generated.postContent,
      topic,
      creds.geminiApiKey
    );
    const contextualPrompt = geminiImg.visualPrompt;
    const aiGeneratedImageUrl = geminiImg.imageUrl;

    // 3. Resolve Image according to user preference or availability
    let imageUrl = customImageUrl || null;
    let imageSource: 'news' | 'ai' | 'upload' = customImageUrl ? 'upload' : 'ai';
    let newsImageUrl: string | null = null;

    if (sourceUrl) {
      newsImageUrl = await extractArticleImage(sourceUrl);
    }

    if (!imageUrl) {
      if (preferNewsImage && newsImageUrl) {
        imageUrl = newsImageUrl;
        imageSource = 'news';
      } else {
        imageUrl = aiGeneratedImageUrl;
        imageSource = 'ai';
      }
    }

    const supabase = createAdminClient();
    const newPostData = {
      user_id: userId,
      topic,
      source_url: sourceUrl || null,
      source_title: summary || topic,
      source_name: sourceName || 'Tech News',
      post_content: generated.postContent,
      image_url: imageUrl,
      image_source: imageSource,
      status: 'draft',
      ai_provider: generated.provider,
      model_name: generated.modelUsed,
      created_at: new Date().toISOString(),
    };

    let savedPost: any = {
      id: `post-${Date.now()}`,
      ...newPostData,
      visual_prompt: contextualPrompt,
      news_image_url: newsImageUrl,
      ai_image_url: aiGeneratedImageUrl,
    };

    try {
      const { data, error } = await supabase
        .from('linkedin_posts')
        .insert(newPostData)
        .select()
        .single();

      if (!error && data) {
        savedPost = {
          ...data,
          visual_prompt: contextualPrompt,
          news_image_url: newsImageUrl,
          ai_image_url: aiGeneratedImageUrl,
        };
      }
    } catch (dbErr) {
      console.warn('Database insert to linkedin_posts skipped:', dbErr);
    }

    return NextResponse.json({
      success: true,
      post: savedPost,
      visualPrompt: contextualPrompt,
      newsImageUrl,
      aiImageUrl: aiGeneratedImageUrl,
      variants: geminiImg.variants,
    });
  } catch (err: any) {
    console.error('LinkedIn post generation error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate post' },
      { status: 500 }
    );
  }
}
