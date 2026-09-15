import { NextRequest, NextResponse } from 'next/server';
import { fetchAgentRepositories } from '@/lib/repo-fetcher';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const sort = (searchParams.get('sort') as 'launches' | 'trending' | 'newest') || 'launches';
    const category = searchParams.get('category') || 'All';

    const repos = await fetchAgentRepositories({
      query,
      sort,
      category,
    });

    return NextResponse.json({
      success: true,
      count: repos.length,
      repos,
      query,
      sort,
      category,
    });
  } catch (err: any) {
    console.error('Failed to fetch AI agent repos:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch AI agent repositories' },
      { status: 500 }
    );
  }
}
