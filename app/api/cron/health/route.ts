import net from 'net';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function probe(host: string, port: number, timeoutMs = 3000): Promise<{ ok: boolean; latencyMs: number | null }> {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = net.createConnection({ host, port });
    let finished = false;

    const done = (ok: boolean) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve({ ok, latencyMs: ok ? Date.now() - started : null });
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (!secret || authorization !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const nodes = await db.node.findMany({ where: { enabled: true } });
  const results = await Promise.all(nodes.map(async (node) => {
    const result = await probe(node.host, node.port);
    await db.node.update({
      where: { id: node.id },
      data: {
        status: result.ok ? 'ONLINE' : 'OFFLINE',
        latencyMs: result.latencyMs,
        lastCheckedAt: new Date(),
      },
    });
    return { id: node.id, name: node.name, ...result };
  }));

  return NextResponse.json({ checkedAt: new Date().toISOString(), results });
}
