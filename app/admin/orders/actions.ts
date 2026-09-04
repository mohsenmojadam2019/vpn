'use server';

import { randomBytes, randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function approveOrderAction(orderId: string) {
  await requireAdmin();

  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { plan: true },
    });

    if (!order) throw new Error('Order not found.');
    if (order.status === 'PAID') return;
    if (order.status === 'CANCELLED') throw new Error('Cancelled order cannot be approved.');

    const customer = await tx.customer.findFirst({
      where: {
        OR: [
          { phone: order.phone },
          ...(order.email ? [{ email: order.email }] : []),
        ],
      },
    });

    const resolvedCustomer = customer || await tx.customer.create({
      data: {
        name: order.customerName,
        phone: order.phone,
        email: order.email,
      },
    });

    const expiresAt = new Date(Date.now() + order.plan.durationDays * 24 * 60 * 60 * 1000);
    const trafficLimitBytes = order.plan.trafficGb
      ? BigInt(order.plan.trafficGb) * BigInt(1024 * 1024 * 1024)
      : null;

    const subscription = await tx.subscription.create({
      data: {
        token: randomBytes(24).toString('base64url'),
        vlessUuid: randomUUID(),
        customerId: resolvedCustomer.id,
        planId: order.planId,
        expiresAt,
        trafficLimitBytes,
        note: `Order ${order.code}`,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        customerId: resolvedCustomer.id,
        subscriptionId: subscription.id,
      },
    });
  });

  revalidatePath('/admin');
  revalidatePath('/admin/orders');
}

export async function cancelOrderAction(orderId: string) {
  await requireAdmin();
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.status === 'PAID') throw new Error('Paid order cannot be cancelled.');
  await db.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
  revalidatePath('/admin/orders');
}
