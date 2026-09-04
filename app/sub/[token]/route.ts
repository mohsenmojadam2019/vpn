import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildBase64Subscription, buildVlessUri } from '@/lib/vless';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const subscription = await db.subscription.findUnique({ where: { token } });

  if (!subscription || !subscription.enabled || subscription.expiresAt <= new Date()) {
    return new NextResponse('Subscription expired or disabled.', { status: 404 });
  }

  if (subscription.trafficLimitBytes && subscription.trafficUsedBytes >= subscription.trafficLimitBytes) {
    return new NextResponse('Traffic limit reached.', { status: 403 });
  }

  const nodes = await db.node.findMany({
    where: { enabled: true },
    orderBy: [{ priority: 'asc' }, { latencyMs: 'asc' }, { createdAt: 'asc' }],
  });

  if (!nodes.length) {
    return new NextResponse('No active nodes.', { status: 503 });
  }

  const links = nodes.map((node) => buildVlessUri(node, subscription.vlessUuid));
  const format = request.nextUrl.searchParams.get('format');
  const body = format === 'raw' ? links.join('\n') : buildBase64Subscription(links);
  const total = subscription.trafficLimitBytes?.toString() || '0';
  const used = subscription.trafficUsedBytes.toString();
  const expire = Math.floor(subscription.expiresAt.getTime() / 1000);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'subscription-userinfo': `upload=0; download=${used}; total=${total}; expire=${expire}`,
      'profile-title': 'base64:UGF5ZGFy',
    },
  });
}
