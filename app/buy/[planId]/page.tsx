import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { createOrderAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function BuyPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await db.plan.findFirst({ where: { id: planId, enabled: true } });
  if (!plan) notFound();

  const submit = createOrderAction.bind(null, plan.id);

  return (
    <main>
      <div className="container narrow">
        <nav className="nav">
          <Link className="brand" href="/">Paydar<span>•</span></Link>
          <Link className="button secondary" href="/#plans">بازگشت</Link>
        </nav>

        <section className="section">
          <div className="card">
            <div className="badge">ثبت سفارش</div>
            <h1>{plan.name}</h1>
            <p className="muted">
              {plan.durationDays} روز · {plan.trafficGb ? `${plan.trafficGb} گیگابایت` : 'حجم سفارشی'}
            </p>
            <div className="metric">
              {plan.priceTomans ? `${Number(plan.priceTomans).toLocaleString('fa-IR')} تومان` : 'قیمت توافقی'}
            </div>

            <form action={submit} className="stack form-gap">
              <label>
                نام
                <input name="name" autoComplete="name" placeholder="نام خریدار" />
              </label>
              <label>
                شماره تماس
                <input name="phone" required inputMode="tel" autoComplete="tel" placeholder="0912..." />
              </label>
              <label>
                ایمیل
                <input name="email" type="email" autoComplete="email" placeholder="اختیاری" />
              </label>
              <button className="button" type="submit">ثبت سفارش</button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
