import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const supabase = createAdminClient();

    // 1. Fetch total unique registered users
    const { data: usersCountData } = await supabase.from('user_settings').select('user_id', { count: 'exact' });
    const totalUsers = Math.max(1, usersCountData?.length || 1);

    // 2. Fetch usage logs
    let query = supabase
      .from('api_usage_logs')
      .select('*, leads(company, email)')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allLogs = logs || [];

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalTokensAllTime = 0;
    let totalTokensToday = 0;
    let totalTokensMonth = 0;

    let inputTokensAllTime = 0;
    let outputTokensAllTime = 0;

    let costINRAllTime = 0;
    let costINRToday = 0;
    let costINRMonth = 0;

    const modelBreakdown: Record<string, { count: number; totalTokens: number; costINR: number }> = {};

    for (const log of allLogs) {
      const input = log.input_tokens || 0;
      const output = log.output_tokens || 0;
      const total = log.total_tokens || input + output;
      const cost = parseFloat(log.estimated_cost_inr || '0');
      const createdAt = new Date(log.created_at);
      const createdStr = createdAt.toISOString().split('T')[0];

      totalTokensAllTime += total;
      inputTokensAllTime += input;
      outputTokensAllTime += output;
      costINRAllTime += cost;

      if (createdStr === todayStr) {
        totalTokensToday += total;
        costINRToday += cost;
      }

      if (createdAt >= firstDayOfMonth) {
        totalTokensMonth += total;
        costINRMonth += cost;
      }

      const modelKey = log.model_name || log.provider || 'unknown';
      if (!modelBreakdown[modelKey]) {
        modelBreakdown[modelKey] = { count: 0, totalTokens: 0, costINR: 0 };
      }
      modelBreakdown[modelKey].count += 1;
      modelBreakdown[modelKey].totalTokens += total;
      modelBreakdown[modelKey].costINR += cost;
    }

    const totalGenerations = allLogs.length;
    const avgCostPerEmailINR = totalGenerations > 0 ? costINRAllTime / totalGenerations : 0;

    return NextResponse.json({
      metrics: {
        totalUsers,
        totalGenerations,
        tokens: {
          today: totalTokensToday,
          month: totalTokensMonth,
          allTime: totalTokensAllTime,
          input: inputTokensAllTime,
          output: outputTokensAllTime,
        },
        billingINR: {
          today: Math.round(costINRToday * 10000) / 10000,
          month: Math.round(costINRMonth * 10000) / 10000,
          allTime: Math.round(costINRAllTime * 10000) / 10000,
          avgPerEmail: Math.round(avgCostPerEmailINR * 10000) / 10000,
        },
        modelBreakdown,
      },
      recentLogs: allLogs.slice(0, 20),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch analytics' }, { status: 500 });
  }
}
