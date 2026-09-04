import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function configured(name: string) {
  const value = process.env[name];
  return Boolean(value && value.trim());
}

export async function GET() {
  const configReady = [
    'AUTH_SECRET',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD_HASH',
    'NODE_AGENT_SECRET',
    'CRON_SECRET',
  ].every(configured);

  let databaseReady = false;
  try {
    await db.$queryRaw`SELECT 1`;
    databaseReady = true;
  } catch {
    databaseReady = false;
  }

  const ready = configReady && databaseReady;
  return NextResponse.json(
    {
      service: 'paydar-control-plane',
      status: ready ? 'ok' : 'degraded',
      ready,
      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: { 'cache-control': 'no-store, max-age=0' },
    },
  );
}
