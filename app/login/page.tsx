import Link from 'next/link';
import { loginAction } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const message = params.error === 'config'
    ? 'متغیرهای ADMIN_EMAIL، ADMIN_PASSWORD_HASH و AUTH_SECRET هنوز تنظیم نشده‌اند.'
    : params.error === 'invalid'
      ? 'ایمیل یا رمز عبور صحیح نیست.'
      : null;

  return (
    <main className="login-shell">
      <div className="card login-card">
        <div className="brand">Paydar<span>•</span></div>
        <h1>ورود مدیریت</h1>
        <p className="muted">برای مدیریت Nodeها و اشتراک‌ها وارد شوید.</p>
        {message && <div className="notice">{message}</div>}
        <form action={loginAction} className="form">
          <label>ایمیل<input name="email" type="email" autoComplete="username" required /></label>
          <label>رمز عبور<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="button" type="submit">ورود</button>
        </form>
        <p className="muted"><Link href="/">بازگشت به سایت</Link></p>
      </div>
    </main>
  );
}
