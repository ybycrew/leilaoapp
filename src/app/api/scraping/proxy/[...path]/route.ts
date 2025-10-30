// Proxies requests to the VPS scrape server using server-side secret token

export async function GET(req: Request, context: any) {
  try {
    const baseUrl = process.env.SCRAPE_API_URL;
    const token = process.env.SCRAPE_API_TOKEN;
    if (!baseUrl || !token) {
      return new Response(JSON.stringify({ error: 'Missing SCRAPE_API_URL or SCRAPE_API_TOKEN' }), { status: 500 });
    }
    const params = (context && (context as any).params) || {};
    const pathParam = (params['path'] as string[] | undefined) || [];
    const suffix = pathParam.length > 0 ? `/${pathParam.join('/')}` : '';
    const target = `${baseUrl}${suffix}`;
    const resp = await fetch(target, { headers: { 'X-Auth-Token': token }, cache: 'no-store' });
    const body = await resp.text();
    return new Response(body, { status: resp.status, headers: { 'Content-Type': resp.headers.get('Content-Type') || 'text/plain' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Proxy GET error' }), { status: 500 });
  }
}

export async function POST(req: Request, context: any) {
  try {
    const baseUrl = process.env.SCRAPE_API_URL;
    const token = process.env.SCRAPE_API_TOKEN;
    if (!baseUrl || !token) {
      return new Response(JSON.stringify({ error: 'Missing SCRAPE_API_URL or SCRAPE_API_TOKEN' }), { status: 500 });
    }
    const params = (context && (context as any).params) || {};
    const pathParam = (params['path'] as string[] | undefined) || [];
    const suffix = pathParam.length > 0 ? `/${pathParam.join('/')}` : '';
    const target = `${baseUrl}${suffix}`;
    const contentType = req.headers.get('content-type') || 'application/json';
    const bodyText = await req.text();
    const resp = await fetch(target, { method: 'POST', headers: { 'X-Auth-Token': token, 'Content-Type': contentType }, body: bodyText, cache: 'no-store' });
    const body = await resp.text();
    return new Response(body, { status: resp.status, headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Proxy POST error' }), { status: 500 });
  }
}


