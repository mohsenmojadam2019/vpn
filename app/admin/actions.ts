'use server';

import { randomBytes, randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { clearAdminSession, requireAdmin } from '@/lib/auth';

const transports = new Set(['raw', 'xhttp', 'grpc']);
const securities = new Set(['reality', 'tls']);

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) || '').trim();
  return value || null;
}

function int(formData: FormData, key: string, fallback: number) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function nodeData(formData: FormData) {
  const name = text(formData, 'name');
  const host = text(formData, 'host');
  const transport = text(formData, 'transport') || 'raw';
  const security = text(formData, 'security') || 'reality';
  const port = int(formData, 'port', 443);
  const sni = text(formData, 'sni');
  const publicKey = text(formData, 'publicKey');
  const shortId = text(formData, 'shortId');

  if (!name || !host || /[\s/]/.test(host) || port < 1 || port > 65535 || !transports.has(transport) || !securities.has(security)) {
    throw new Error('Invalid node configuration.');
  }
  if (security === 'reality' && (!sni || !publicKey || !shortId)) {
    throw new Error('REALITY requires SNI, public key and short ID.');
  }
  if (security === 'tls' && !sni) {
    throw new Error('TLS requires SNI.');
  }

  return {
    name,
    host,
    port,
    country: text(formData, 'country'),
    transport,
    security,
    flow: transport === 'raw' ? text(formData, 'flow') : null,
    sni,
    fingerprint: text(formData, 'fingerprint') || 'chrome',
    publicKey: security === 'reality' ? publicKey : null,
    shortId: security === 'reality' ? shortId : null,
    path: transport === 'xhttp' ? (text(formData, 'path') || '/') : null,
    serviceName: transport === 'grpc' ? text(formData, 'serviceName') : null,
    priority: int(formData, 'priority', 100),
  };
}

export async function logoutAction() {
  await clearAdminSession();
  redirect('/login');
}

export async function createNodeAction(formData: FormData) {
  await requireAdmin();
  await db.node.create({ data: nodeData(formData) });
  revalidatePath('/admin');
}

export async function updateNodeAction(nodeId: string, formData: FormData) {
  await requireAdmin();
  await db.node.update({ where: { id: nodeId }, data: nodeData(formData) });
  revalidatePath('/admin');
  revalidatePath(`/admin/nodes/${nodeId}`);
}

export async function toggleNodeAction(nodeId: string) {
  await requireAdmin();
  const node = await db.node.findUniqueOrThrow({ where: { id: nodeId } });
  await db.node.update({ where: { id: nodeId }, data: { enabled: !node.enabled } });
  revalidatePath('/admin');
}

export async function deleteNodeAction(nodeId: string) {
  await requireAdmin();
  await db.node.delete({ where: { id: nodeId } });
  revalidatePath('/admin');
}

export async function createPlanAction(formData: FormData) {
  await requireAdmin();
  const name = text(formData, 'name');
  const durationDays = int(formData, 'durationDays', 30);
  const trafficGb = int(formData, 'trafficGb', 0);
  const rawPrice = text(formData, 'priceTomans');

  if (!name || durationDays < 1) throw new Error('Invalid plan.');
  if (rawPrice && !/^\d+$/.test(rawPrice)) throw new Error('Invalid price.');

  await db.plan.create({
    data: {
      name,
      durationDays,
      trafficGb: trafficGb > 0 ? trafficGb : null,
      priceTomans: rawPrice ? BigInt(rawPrice) : null,
    },
  });

  revalidatePath('/admin');
  revalidatePath('/');
}

export async function createCustomerAction(formData: FormData) {
  await requireAdmin();
  const name = text(formData, 'name');
  const email = text(formData, 'email')?.toLowerCase() || null;
  const phone = text(formData, 'phone');
  if (!name && !email && !phone) throw new Error('Customer needs at least one identifier.');

  await db.customer.create({ data: { name, email, phone } });
  revalidatePath('/admin');
}

export async function createSubscriptionAction(formData: FormData) {
  await requireAdmin();
  const customerId = text(formData, 'customerId');
  const planId = text(formData, 'planId');
  if (!planId) throw new Error('Plan is required.');

  const plan = await db.plan.findUniqueOrThrow({ where: { id: planId } });
  const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
  const trafficLimitBytes = plan.trafficGb
    ? BigInt(plan.trafficGb) * BigInt(1024 * 1024 * 1024)
    : null;

  await db.subscription.create({
    data: {
      token: randomBytes(24).toString('base64url'),
      vlessUuid: randomUUID(),
      customerId,
      planId,
      expiresAt,
      trafficLimitBytes,
      note: text(formData, 'note'),
    },
  });

  revalidatePath('/admin');
}

export async function toggleSubscriptionAction(subscriptionId: string) {
  await requireAdmin();
  const sub = await db.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
  await db.subscription.update({ where: { id: subscriptionId }, data: { enabled: !sub.enabled } });
  revalidatePath('/admin');
}
