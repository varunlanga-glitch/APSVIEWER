const UPSTREAM = 'https://aps-codepen.autodesk.io';

// Allow-list headers safe to forward — omitting 'host' is intentional:
// it must reflect the upstream origin, not the Pages domain.
// CF-internal headers (cf-*, x-forwarded-*) are also dropped.
const FORWARDED_HEADERS = new Set([
  'accept',
  'accept-language',
  'accept-encoding',
  'content-type',
  'content-length',
  'cache-control',
  'user-agent',
]);

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Rewrite origin to upstream, preserve pathname + search
  url.hostname = new URL(UPSTREAM).hostname;
  url.protocol = new URL(UPSTREAM).protocol;
  url.port = '';

  const headers = new Headers();
  for (const [k, v] of context.request.headers.entries()) {
    if (FORWARDED_HEADERS.has(k.toLowerCase())) headers.set(k, v);
  }

  const upstreamReq = new Request(url.toString(), {
    method: context.request.method,
    headers,
    body: ['GET', 'HEAD'].includes(context.request.method) ? undefined : context.request.body,
    redirect: 'follow',
  });

  const res = await fetch(upstreamReq);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
