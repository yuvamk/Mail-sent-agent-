import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';
import { runAutonomousRadarCycle } from '@/lib/autonomous-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow sufficient execution window for LLM evaluation

/**
 * Background Cron Job: AI Agent Launch Radar & Auto-Poster
 * Can be called by:
 * 1. External scheduler (Render Cron, Vercel Cron, cron-job.org, or curl)
 * 2. User on-demand from the UI via "Run Auto-Pilot Now"
 */
export async function POST(req: NextRequest) {
  return handleRadarExecution(req);
}

export async function GET(req: NextRequest) {
  return handleRadarExecution(req);
}

async function handleRadarExecution(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const url = new URL(req.url);

    // 1. Verify Authorization
    const authHeader = req.headers.get('authorization');
    const secretParam = url.searchParams.get('key') || url.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    let authorizedUserId: string | null = null;
    let isGlobalCron = false;

    // Check if secret matches configured CRON_SECRET
    if (cronSecret && (authHeader === `Bearer ${cronSecret}` || secretParam === cronSecret)) {
      isGlobalCron = true;
    }

    // Check if user is triggering from their authenticated session in the UI
    let body: any = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch {
        // empty body ok
      }
    }

    const sessionUserId = await getUserIdFromRequest(req, body.userId || url.searchParams.get('userId') || undefined);
    if (sessionUserId) {
      authorizedUserId = sessionUserId;
    }

    // If neither CRON_SECRET matched nor a session user exists, permit if no CRON_SECRET was configured on local/dev
    if (!isGlobalCron && !authorizedUserId) {
      if (process.env.NODE_ENV === 'development' || !cronSecret) {
        isGlobalCron = true;
      } else {
        return NextResponse.json(
          { success: false, error: 'Unauthorized. Provide valid Bearer token or sign in.' },
          { status: 401 }
        );
      }
    }

    const force = body.force === true || url.searchParams.get('force') === 'true';

    // 2. Scenario A: Trigger for a specific authenticated user (e.g. from UI "Run Auto-Pilot Now")
    if (authorizedUserId && !isGlobalCron) {
      const result = await runAutonomousRadarCycle(authorizedUserId, { force: force || true });
      return NextResponse.json({
        success: result.success,
        userId: authorizedUserId,
        executed: result.executed,
        mode: result.mode,
        decision: result.decision,
        postRecordId: result.postRecordId,
        linkedinPostUrl: result.linkedinPostUrl,
        reason: result.reason,
        error: result.error,
      });
    }

    // 3. Scenario B: Global Cron execution for all users who have auto_radar_enabled = true
    const { data: enabledUsers, error: usersErr } = await supabase
      .from('user_settings')
      .select('user_id, auto_radar_enabled, auto_radar_mode')
      .eq('auto_radar_enabled', true);

    if (usersErr) {
      return NextResponse.json({ success: false, error: usersErr.message }, { status: 500 });
    }

    if (!enabledUsers || enabledUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users currently have autonomous radar enabled.',
        usersProcessed: 0,
      });
    }

    const executionResults = [];

    for (const u of enabledUsers) {
      if (!u.user_id) continue;
      try {
        const cycleResult = await runAutonomousRadarCycle(u.user_id, { force: false });
        executionResults.push({
          userId: u.user_id,
          executed: cycleResult.executed,
          mode: cycleResult.mode,
          repoName: cycleResult.decision?.selectedRepo.name,
          status: cycleResult.success ? 'success' : 'failed',
          reason: cycleResult.reason,
          error: cycleResult.error,
        });
      } catch (err: any) {
        executionResults.push({
          userId: u.user_id,
          executed: false,
          status: 'error',
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      usersProcessed: executionResults.length,
      results: executionResults,
    });
  } catch (err: any) {
    console.error('Radar cron route error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error in radar cron route' },
      { status: 500 }
    );
  }
}
