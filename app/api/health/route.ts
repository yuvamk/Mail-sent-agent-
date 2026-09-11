import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Mail-sent-agent ReachOut AI',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
