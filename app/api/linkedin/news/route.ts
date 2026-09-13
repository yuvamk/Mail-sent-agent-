import { NextResponse } from 'next/server';
import { fetchTrendingTopics } from '@/lib/news-fetcher';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const articles = await fetchTrendingTopics();
    return NextResponse.json({
      success: true,
      count: articles.length,
      articles,
    });
  } catch (err: any) {
    console.error('Failed to fetch trending topics:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
