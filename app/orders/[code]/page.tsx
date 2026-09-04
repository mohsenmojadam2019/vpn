import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function statusLabel(status: string) {
  if (status === 'PAID') return 'تأیید و فعال شده';
  if (status === 'CANCELLED') return 'لغو شده';
  return 'در انتظار تأیید';
}

export default async function OrderStatusPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const order = await db.order.findUnique({
    where: { code: code.toUpperCase() },
    include: { plan: true, subscription: true },
  });

  if (!order) notFound();

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const subscriptionUrl = order.subscription
    ? `${baseUrl}/sub/${order.subscription.token}`
    : null;

  return (
    <main>
      <div className="container narrow">
        <nav className="nav">
          <Link className="brand" href="/">Paydar<span>•</span></Link>
          <Link className="button secondary" href="/">خانه</Link>
        </nav>
        <section className="section">
          <div className="card stack form-gap">
            <div className="badge">پیگیری سفارش</div>
            <h1>{statusLabel(order.status)}</h1>
            <div><span className="muted">کد سفارش:</span> <strong dir="ltr">{order.code}</strong></div>
            <div><span className="muted">پلن:</span> <strong>{order.plan.name}</strong></div>
            <div><span className="muted">مبلغ:</span> <strong>{order.amountTomans ? `${Number(order.amountTomans).toLocaleString('fa-IR')} تومان` : 'توافقی'}</strong></div>

            {subscriptionUrl ? (
              <>
                <div className="notice success">اشتراک صادر شده است. این لینک را در کلاینت سازگار با VLESS وارد کنید.</div>
                <input readOnly dir="ltr" value={subscriptionUrl} aria-label="Subscription URL" />
              </>
            ) : order.status === 'PENDING' ? (
              <div className="notice">پس از تأیید سفارش توسط مدیریت، لینک اشتراک در همین صفحه نمایش داده می‌شود.</div>
            ) : (
              <div className="notice danger">برای این سفارش اشتراکی صادر نشده است.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
