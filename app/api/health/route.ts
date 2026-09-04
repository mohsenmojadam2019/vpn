import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function configured(name: string) {
  const value = process.env[name];
  return Boolean(value && value.trim());
}

export async function GET() {
  const checks = {
    database: false,
    authSecret: configured('AUTH_SECRET'),
    adminEmail: configured('ADMIN_EMAIL'),
    adminPasswordHash: configured('ADMIN_PASSWORD_HASH'),
    nodeAgentSecret: configured('NODE_AGENT_SECRET'),
    cronSecret: configured('CRON_SECRET'),
  };

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  const ready = Object.values(checks).every(Boolean);
  return NextResponse.json(
    {
      service: 'paydar-control-plane',
      status: ready ? 'ok' : 'degraded',
      ready,
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: { 'cache-control': 'no-store, max-age=0' },
    },
  );
}
