import Link from 'next/link';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function loadPlans() {
  try {
    return await db.plan.findMany({ where: { enabled: true }, orderBy: { priceTomans: 'asc' } });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const plans = await loadPlans();

  return (
    <main>
      <div className="container">
        <nav className="nav">
          <div className="brand">Paydar<span>•</span></div>
          <div className="actions">
            <a className="button secondary" href="#plans">پلن‌ها</a>
            <Link className="button" href="/login">ورود مدیریت</Link>
          </div>
        </nav>

        <section className="hero">
          <div>
            <div className="badge">VLESS Subscription Control Plane</div>
            <h1>اشتراک پایدار، بدون وابستگی به یک Node.</h1>
            <p>
              مدیریت Nodeهای VLESS، ساخت اشتراک مستقل برای هر مشتری و تعویض سریع endpointها از یک پنل واحد.
              اگر یک Node از دسترس خارج شود، لازم نیست لینک اشتراک مشتری را عوض کنید؛ لیست Nodeها از سمت سرور به‌روزرسانی می‌شود.
            </p>
            <div className="actions">
              <Link className="button" href="/login">باز کردن پنل</Link>
              <a className="button secondary" href="#architecture">معماری</a>
            </div>
          </div>
          <div className="card">
            <div className="muted">مدل سرویس</div>
            <div className="metric">Multi-node VLESS</div>
            <p className="muted">Control plane جدا از data plane، UUID مستقل هر اشتراک، Nodeهای قابل تعویض و health status.</p>
            <div className="grid">
              <div><div className="muted">Transport</div><strong>REALITY</strong></div>
              <div><div className="muted">Subscription</div><strong>Remote</strong></div>
              <div><div className="muted">Failover</div><strong>Multi Node</strong></div>
            </div>
          </div>
        </section>

        <section id="architecture" className="section">
          <h2>معماری</h2>
          <div className="grid">
            <div className="card"><strong>Control Plane</strong><p className="muted">پنل، مشتریان، پلن‌ها، Subscription URL و وضعیت Nodeها.</p></div>
            <div className="card"><strong>Disposable Nodes</strong><p className="muted">Nodeهای VLESS مستقل که بدون تغییر لینک مشتری قابل اضافه یا غیرفعال‌شدن هستند.</p></div>
            <div className="card"><strong>Per-user UUID</strong><p className="muted">هر اشتراک شناسه VLESS مستقل دارد تا تمدید و لغو سرویس جداگانه انجام شود.</p></div>
          </div>
        </section>

        <section id="plans" className="section">
          <h2>پلن‌ها</h2>
          <div className="grid">
            {plans.length ? plans.map((plan) => (
              <div className="card" key={plan.id}>
                <div className="muted">{plan.durationDays} روزه</div>
                <div className="metric">{plan.name}</div>
                <p className="muted">{plan.trafficGb ? `${plan.trafficGb} گیگابایت` : 'حجم سفارشی'}</p>
                <strong>{plan.priceTomans ? `${Number(plan.priceTomans).toLocaleString('fa-IR')} تومان` : 'تماس بگیرید'}</strong>
              </div>
            )) : (
              <div className="card"><strong>هنوز پلنی ثبت نشده</strong><p className="muted">پس از ورود به پنل، اولین پلن فروش را ایجاد کنید.</p></div>
            )}
          </div>
        </section>
      </div>
      <footer className="footer"><div className="container">Paydar Control Plane — endpointها ممکن است مسدود یا مختل شوند؛ معماری برای بازیابی و تعویض سریع طراحی شده است.</div></footer>
    </main>
  );
}
