import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/supabase-server';
import { getUserCredentials } from '@/lib/user-credentials';
import { generateGeminiImage } from '@/lib/news-fetcher';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postContent, topic = 'AI Research and Technology' } = body;

    if (!postContent) {
      return NextResponse.json(
        { success: false, error: 'postContent is required' },
        { status: 400 }
      );
    }

    const userId = await getUserIdFromRequest(req);
    const creds = await getUserCredentials(userId);

    // Generate fresh contextual visual prompts & styles using Gemini multi-key rotation
    const geminiImg = await generateGeminiImage(
      postContent,
      topic,
      creds.geminiApiKey
    );

    return NextResponse.json({
      success: true,
      visualPrompt: geminiImg.visualPrompt,
      imageUrl: geminiImg.imageUrl,
      variants: geminiImg.variants,
      source: geminiImg.source,
    });
  } catch (err: any) {
    console.error('Error generating visual with Gemini:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate visual' },
      { status: 500 }
    );
  }
}
