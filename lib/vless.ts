type VlessNode = {
  name: string;
  country: string | null;
  host: string;
  port: number;
  transport: string;
  security: string;
  flow: string | null;
  sni: string | null;
  fingerprint: string | null;
  publicKey: string | null;
  shortId: string | null;
  path: string | null;
  serviceName: string | null;
};

function endpointHost(host: string) {
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}

export function buildVlessUri(node: VlessNode, uuid: string) {
  const query = new URLSearchParams();
  const security = node.security || 'reality';
  query.set('encryption', 'none');
  query.set('security', security);

  if (node.sni && (security === 'reality' || security === 'tls')) query.set('sni', node.sni);
  if (node.fingerprint && (security === 'reality' || security === 'tls')) query.set('fp', node.fingerprint);

  if (security === 'reality') {
    if (node.publicKey) query.set('pbk', node.publicKey);
    if (node.shortId) query.set('sid', node.shortId);
    query.set('spx', '/');
  }

  switch (node.transport) {
    case 'xhttp':
      query.set('type', 'xhttp');
      if (node.path) query.set('path', node.path);
      query.set('mode', 'auto');
      break;
    case 'grpc':
      query.set('type', 'grpc');
      if (node.serviceName) query.set('serviceName', node.serviceName);
      break;
    default:
      query.set('type', 'tcp');
      if (node.flow) query.set('flow', node.flow);
      break;
  }

  const label = [node.country, node.name].filter(Boolean).join(' · ');
  return `vless://${uuid}@${endpointHost(node.host)}:${node.port}?${query.toString()}#${encodeURIComponent(label)}`;
}

export function buildBase64Subscription(links: string[]) {
  return Buffer.from(links.join('\n'), 'utf8').toString('base64');
}
