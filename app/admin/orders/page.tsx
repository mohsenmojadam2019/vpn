import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { approveOrderAction, cancelOrderAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  await requireAdmin();
  const orders = await db.order.findMany({
    include: { plan: true, subscription: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <main>
      <div className="container">
        <nav className="nav">
          <Link className="brand" href="/admin">Paydar<span>•</span></Link>
          <div className="actions">
            <Link className="button secondary" href="/admin">داشبورد</Link>
            <Link className="button secondary" href="/">سایت</Link>
          </div>
        </nav>

        <section className="section">
          <h1>سفارش‌ها</h1>
          <div className="stack">
            {orders.length ? orders.map((order) => {
              const approve = approveOrderAction.bind(null, order.id);
              const cancel = cancelOrderAction.bind(null, order.id);
              return (
                <div className="card" key={order.id}>
                  <div className="row between wrap gap">
                    <div>
                      <strong dir="ltr">{order.code}</strong>
                      <div className="muted">{order.customerName || 'بدون نام'} · {order.phone}</div>
                      <div className="muted">{order.plan.name} · {order.amountTomans ? `${Number(order.amountTomans).toLocaleString('fa-IR')} تومان` : 'توافقی'}</div>
                    </div>
                    <div className="actions">
                      <span className="badge">{order.status}</span>
                      {order.status === 'PENDING' ? (
                        <>
                          <form action={approve}><button className="button" type="submit">تأیید و صدور</button></form>
                          <form action={cancel}><button className="button secondary" type="submit">لغو</button></form>
                        </>
                      ) : null}
                      {order.subscription ? <Link className="button secondary" href={`/orders/${order.code}`}>مشاهده اشتراک</Link> : null}
                    </div>
                  </div>
                </div>
              );
            }) : <div className="card">هنوز سفارشی ثبت نشده است.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
