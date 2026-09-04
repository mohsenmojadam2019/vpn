import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = process.env.NODE_AGENT_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const now = new Date();
  const subscriptions = await db.subscription.findMany({
    where: {
      enabled: true,
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      vlessUuid: true,
      expiresAt: true,
      trafficLimitBytes: true,
      trafficUsedBytes: true,
      customer: { select: { name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const users = subscriptions
    .filter((sub) => !sub.trafficLimitBytes || sub.trafficUsedBytes < sub.trafficLimitBytes)
    .map((sub) => ({
      id: sub.id,
      uuid: sub.vlessUuid,
      label: sub.customer?.name || sub.customer?.email || sub.customer?.phone || sub.id,
      expiresAt: sub.expiresAt.toISOString(),
    }));

  return NextResponse.json(
    { generatedAt: new Date().toISOString(), users },
    { headers: { 'cache-control': 'no-store, max-age=0' } },
  );
}
