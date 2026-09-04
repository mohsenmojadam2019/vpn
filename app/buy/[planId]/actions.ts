'use server';

import { randomBytes } from 'crypto';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function normalizePhone(input: string) {
  return input.replace(/[\s()-]/g, '');
}

export async function createOrderAction(planId: string, formData: FormData) {
  const customerName = value(formData, 'name');
  const emailRaw = value(formData, 'email');
  const phone = normalizePhone(value(formData, 'phone'));

  if (!/^\+?[0-9]{7,20}$/.test(phone)) {
    throw new Error('شماره تماس معتبر نیست.');
  }

  const email = emailRaw ? emailRaw.toLowerCase() : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ایمیل معتبر نیست.');
  }

  const plan = await db.plan.findFirst({ where: { id: planId, enabled: true } });
  if (!plan) throw new Error('پلن فعال پیدا نشد.');

  const recentCutoff = new Date(Date.now() - 10 * 60 * 1000);
  const recentPending = await db.order.findFirst({
    where: {
      planId: plan.id,
      phone,
      status: 'PENDING',
      createdAt: { gte: recentCutoff },
    },
    orderBy: { createdAt: 'desc' },
    select: { code: true },
  });

  if (recentPending) {
    redirect(`/orders/${recentPending.code}`);
  }

  let code: string | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const candidate = randomBytes(12).toString('hex').toUpperCase();
    const exists = await db.order.findUnique({ where: { code: candidate } });
    if (!exists) {
      code = candidate;
      break;
    }
  }

  if (!code) throw new Error('ساخت کد سفارش ناموفق بود.');

  await db.order.create({
    data: {
      code,
      planId: plan.id,
      customerName: customerName || null,
      email,
      phone,
      amountTomans: plan.priceTomans,
    },
  });

  redirect(`/orders/${code}`);
}
