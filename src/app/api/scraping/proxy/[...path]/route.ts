// Proxies requests to the VPS scrape server using server-side secret token

export async function GET(req: Request, context: { params: { path: string[] } }) {
  const baseUrl = process.env.SCRAPE_API_URL;
  const token = process.env.SCRAPE_API_TOKEN;
  if (!baseUrl || !token) {
    return new Response('SCRAPE_API_URL or SCRAPE_API_TOKEN not configured', { status: 500 });
  }
  const params = context?.params || { path: [] };
  const target = `${baseUrl}/${(params.path || []).join('/')}`;
  const resp = await fetch(target, { headers: { 'X-Auth-Token': token } });
  const body = await resp.text();
  return new Response(body, { status: resp.status, headers: { 'Content-Type': resp.headers.get('Content-Type') || 'text/plain' } });
}

export async function POST(req: Request, context: { params: { path: string[] } }) {
  const baseUrl = process.env.SCRAPE_API_URL;
  const token = process.env.SCRAPE_API_TOKEN;
  if (!baseUrl || !token) {
    return new Response('SCRAPE_API_URL or SCRAPE_API_TOKEN not configured', { status: 500 });
  }
  const params = context?.params || { path: [] };
  const target = `${baseUrl}/${(params.path || []).join('/')}`;
  const resp = await fetch(target, { method: 'POST', headers: { 'X-Auth-Token': token } });
  const body = await resp.text();
  return new Response(body, { status: resp.status, headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json' } });
}


