import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { updateNodeAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function EditNodePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const node = await db.node.findUnique({ where: { id } });
  if (!node) notFound();
  const action = updateNodeAction.bind(null, node.id);

  return (
    <main className="dashboard">
      <div className="container">
        <header className="dashboard-header">
          <div><div className="brand">ویرایش {node.name}</div><div className="muted">تغییرات بلافاصله در Subscriptionهای بعدی دیده می‌شوند.</div></div>
          <Link className="button secondary" href="/admin">بازگشت</Link>
        </header>
        <section className="card">
          <form action={action} className="form three">
            <label>نام Node<input name="name" defaultValue={node.name} required /></label>
            <label>کشور<input name="country" defaultValue={node.country || ''} /></label>
            <label>Host / IP<input name="host" dir="ltr" defaultValue={node.host} required /></label>
            <label>Port<input name="port" type="number" defaultValue={node.port} min="1" max="65535" required /></label>
            <label>Transport<select name="transport" defaultValue={node.transport}><option value="raw">RAW/TCP</option><option value="xhttp">XHTTP</option><option value="grpc">gRPC</option></select></label>
            <label>Security<select name="security" defaultValue={node.security}><option value="reality">REALITY</option><option value="tls">TLS</option></select></label>
            <label>Flow<input name="flow" dir="ltr" defaultValue={node.flow || ''} /></label>
            <label>SNI<input name="sni" dir="ltr" defaultValue={node.sni || ''} /></label>
            <label>Fingerprint<input name="fingerprint" dir="ltr" defaultValue={node.fingerprint || ''} /></label>
            <label>REALITY Public Key<input name="publicKey" dir="ltr" defaultValue={node.publicKey || ''} /></label>
            <label>REALITY Short ID<input name="shortId" dir="ltr" defaultValue={node.shortId || ''} /></label>
            <label>Priority<input name="priority" type="number" defaultValue={node.priority} /></label>
            <label>XHTTP Path<input name="path" dir="ltr" defaultValue={node.path || ''} /></label>
            <label>gRPC Service<input name="serviceName" dir="ltr" defaultValue={node.serviceName || ''} /></label>
            <div className="actions"><button className="button" type="submit">ذخیره تغییرات</button></div>
          </form>
        </section>
      </div>
    </main>
  );
}
