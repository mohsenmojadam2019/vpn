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
            <a className="button secondary" href="#plans">خرید اشتراک</a>
            <Link className="button" href="/login">ورود مدیریت</Link>
          </div>
        </nav>

        <section className="hero">
          <div>
            <div className="badge">Multi-node VLESS Subscription</div>
            <h1>یک لینک اشتراک؛ چند Node قابل تعویض.</h1>
            <p>
              Paydar برای مدیریت و فروش اشتراک VLESS چندنودی ساخته شده است. Nodeها از پنل قابل تغییرند و لینک اشتراک مشتری ثابت می‌ماند.
              هیچ endpoint اینترنتی تضمین همیشگی ندارد؛ طراحی سرویس بر افزونگی، health check و تعویض سریع Node تکیه می‌کند.
            </p>
            <div className="actions">
              <a className="button" href="#plans">مشاهده پلن‌ها</a>
              <a className="button secondary" href="#architecture">معماری</a>
            </div>
          </div>
          <div className="card">
            <div className="muted">مدل سرویس</div>
            <div className="metric">Multi-node VLESS</div>
            <p className="muted">Control plane جدا از data plane، UUID مستقل هر اشتراک، Nodeهای قابل تعویض و health status.</p>
            <div className="grid">
              <div><div className="muted">Transport</div><strong>VLESS</strong></div>
              <div><div className="muted">Subscription</div><strong>Remote</strong></div>
              <div><div className="muted">Recovery</div><strong>Multi Node</strong></div>
            </div>
          </div>
        </section>

        <section id="architecture" className="section">
          <h2>معماری</h2>
          <div className="grid">
            <div className="card"><strong>Control Plane</strong><p className="muted">پنل، مشتریان، پلن‌ها، سفارش‌ها، Subscription URL و وضعیت Nodeها.</p></div>
            <div className="card"><strong>Replaceable Nodes</strong><p className="muted">Nodeهای مستقل که بدون تغییر لینک مشتری قابل اضافه یا غیرفعال‌شدن هستند.</p></div>
            <div className="card"><strong>Per-user UUID</strong><p className="muted">هر اشتراک شناسه مستقل دارد تا تمدید، محدودسازی و لغو جداگانه انجام شود.</p></div>
          </div>
        </section>

        <section id="plans" className="section">
          <h2>خرید اشتراک</h2>
          <div className="grid">
            {plans.length ? plans.map((plan) => (
              <div className="card stack form-gap" key={plan.id}>
                <div className="muted">{plan.durationDays} روزه</div>
                <div className="metric">{plan.name}</div>
                <p className="muted">{plan.trafficGb ? `${plan.trafficGb} گیگابایت` : 'حجم سفارشی'}</p>
                <strong>{plan.priceTomans ? `${Number(plan.priceTomans).toLocaleString('fa-IR')} تومان` : 'قیمت توافقی'}</strong>
                <Link className="button" href={`/buy/${plan.id}`}>ثبت سفارش</Link>
              </div>
            )) : (
              <div className="card"><strong>هنوز پلنی ثبت نشده</strong><p className="muted">پس از ورود به پنل، اولین پلن فروش را ایجاد کنید.</p></div>
            )}
          </div>
        </section>
      </div>
      <footer className="footer"><div className="container">Paydar — سرویس چندنودی برای مدیریت و بازیابی سریع اتصال؛ بدون ادعای «غیرقابل‌مسدودشدن».</div></footer>
    </main>
  );
}
