import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import {
  createCustomerAction,
  createNodeAction,
  createPlanAction,
  createSubscriptionAction,
  deleteNodeAction,
  logoutAction,
  toggleNodeAction,
  toggleSubscriptionAction,
} from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await requireAdmin();
  const [nodes, plans, customers, subscriptions, pendingOrders] = await Promise.all([
    db.node.findMany({ orderBy: [{ enabled: 'desc' }, { priority: 'asc' }, { createdAt: 'desc' }] }),
    db.plan.findMany({ orderBy: { createdAt: 'desc' } }),
    db.customer.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    db.subscription.findMany({
      include: { plan: true, customer: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.order.count({ where: { status: 'PENDING' } }),
  ]);
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');

  return (
    <main className="dashboard">
      <div className="container">
        <header className="dashboard-header">
          <div>
            <div className="brand">Paydar<span>•</span> Control</div>
            <div className="muted">{session.email}</div>
          </div>
          <div className="actions">
            <Link className="button" href="/admin/orders">سفارش‌ها {pendingOrders ? `(${pendingOrders})` : ''}</Link>
            <Link className="button secondary" href="/">مشاهده سایت</Link>
            <form action={logoutAction}><button className="button secondary" type="submit">خروج</button></form>
          </div>
        </header>

        <section className="grid section">
          <div className="card"><div className="muted">Node فعال</div><div className="metric">{nodes.filter(n => n.enabled).length}</div></div>
          <div className="card"><div className="muted">اشتراک فعال</div><div className="metric">{subscriptions.filter(s => s.enabled && s.expiresAt > new Date()).length}</div></div>
          <div className="card"><div className="muted">سفارش منتظر</div><div className="metric">{pendingOrders}</div></div>
        </section>

        <div className="stack">
          <section className="card">
            <h2>افزودن Node VLESS</h2>
            <form action={createNodeAction} className="form three">
              <label>نام Node<input name="name" placeholder="DE-01" required /></label>
              <label>کشور<input name="country" placeholder="Germany" /></label>
              <label>Host / IP<input name="host" dir="ltr" placeholder="edge.example.com" required /></label>
              <label>Port<input name="port" type="number" defaultValue="443" min="1" max="65535" required /></label>
              <label>Transport<select name="transport" defaultValue="raw"><option value="raw">RAW/TCP</option><option value="xhttp">XHTTP</option><option value="grpc">gRPC</option></select></label>
              <label>Security<select name="security" defaultValue="reality"><option value="reality">REALITY</option><option value="tls">TLS</option></select></label>
              <label>Flow<input name="flow" dir="ltr" defaultValue="xtls-rprx-vision" /></label>
              <label>SNI<input name="sni" dir="ltr" placeholder="www.example.com" /></label>
              <label>Fingerprint<input name="fingerprint" dir="ltr" defaultValue="chrome" /></label>
              <label>REALITY Public Key<input name="publicKey" dir="ltr" /></label>
              <label>REALITY Short ID<input name="shortId" dir="ltr" /></label>
              <label>Priority<input name="priority" type="number" defaultValue="100" /></label>
              <label>XHTTP Path<input name="path" dir="ltr" placeholder="/api/v1" /></label>
              <label>gRPC Service<input name="serviceName" dir="ltr" /></label>
              <div className="actions"><button className="button" type="submit">ذخیره Node</button></div>
            </form>
          </section>

          <section className="card">
            <h2>Nodeها</h2>
            <table>
              <thead><tr><th>نام</th><th>Endpoint</th><th>Transport</th><th>وضعیت</th><th>Priority</th><th>عملیات</th></tr></thead>
              <tbody>
                {nodes.map((node) => (
                  <tr key={node.id}>
                    <td><strong>{node.name}</strong><div className="muted">{node.country || '-'}</div></td>
                    <td className="copy">{node.host}:{node.port}</td>
                    <td>{node.transport} / {node.security}</td>
                    <td><span className={`status ${node.status}`}>{node.enabled ? node.status : 'DISABLED'}</span>{node.latencyMs ? <div className="muted">{node.latencyMs} ms</div> : null}</td>
                    <td>{node.priority}</td>
                    <td><div className="actions">
                      <Link className="button secondary" href={`/admin/nodes/${node.id}`}>ویرایش</Link>
                      <form action={toggleNodeAction.bind(null, node.id)}><button className="button secondary" type="submit">{node.enabled ? 'غیرفعال' : 'فعال'}</button></form>
                      <form action={deleteNodeAction.bind(null, node.id)}><button className="button danger" type="submit">حذف</button></form>
                    </div></td>
                  </tr>
                ))}
                {!nodes.length && <tr><td colSpan={6} className="muted">هنوز Node ثبت نشده است.</td></tr>}
              </tbody>
            </table>
          </section>

          <section className="grid">
            <div className="card">
              <h2>پلن فروش</h2>
              <form action={createPlanAction} className="form">
                <label>نام<input name="name" placeholder="یک ماهه 100GB" required /></label>
                <label>مدت (روز)<input name="durationDays" type="number" defaultValue="30" min="1" required /></label>
                <label>حجم GB — خالی/صفر یعنی سفارشی<input name="trafficGb" type="number" min="0" /></label>
                <label>قیمت تومان<input name="priceTomans" type="number" min="0" /></label>
                <button className="button" type="submit">ساخت پلن</button>
              </form>
            </div>
            <div className="card">
              <h2>مشتری</h2>
              <form action={createCustomerAction} className="form">
                <label>نام<input name="name" /></label>
                <label>ایمیل<input name="email" type="email" dir="ltr" /></label>
                <label>موبایل<input name="phone" dir="ltr" /></label>
                <button className="button" type="submit">ثبت مشتری</button>
              </form>
            </div>
            <div className="card">
              <h2>صدور اشتراک دستی</h2>
              <form action={createSubscriptionAction} className="form">
                <label>مشتری<select name="customerId" defaultValue=""><option value="">بدون مشتری</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name || c.email || c.phone || c.id}</option>)}</select></label>
                <label>پلن<select name="planId" required defaultValue=""><option value="" disabled>انتخاب پلن</option>{plans.filter(p => p.enabled).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                <label>یادداشت<input name="note" /></label>
                <button className="button" type="submit">ساخت Subscription</button>
              </form>
            </div>
          </section>

          <section className="card">
            <h2>اشتراک‌های اخیر</h2>
            <table>
              <thead><tr><th>مشتری</th><th>پلن</th><th>انقضا</th><th>UUID</th><th>Subscription URL</th><th>وضعیت</th></tr></thead>
              <tbody>
                {subscriptions.map((sub) => {
                  const url = `${baseUrl}/sub/${sub.token}`;
                  const active = sub.enabled && sub.expiresAt > new Date();
                  return <tr key={sub.id}>
                    <td>{sub.customer?.name || sub.customer?.email || sub.customer?.phone || '-'}</td>
                    <td>{sub.plan?.name || '-'}</td>
                    <td>{sub.expiresAt.toLocaleDateString('fa-IR')}</td>
                    <td className="copy">{sub.vlessUuid}</td>
                    <td className="copy">{url}</td>
                    <td><div className="actions"><span className={`status ${active ? 'ONLINE' : 'OFFLINE'}`}>{active ? 'ACTIVE' : 'INACTIVE'}</span><form action={toggleSubscriptionAction.bind(null, sub.id)}><button className="button secondary" type="submit">{sub.enabled ? 'تعلیق' : 'فعال'}</button></form></div></td>
                  </tr>;
                })}
                {!subscriptions.length && <tr><td colSpan={6} className="muted">هنوز اشتراکی صادر نشده است.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </main>
  );
}
