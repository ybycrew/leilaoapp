import http from 'http';
import https from 'https';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import url from 'url';

// Simple HTTP server to trigger scraping on VPS and expose logs
// Auth: header X-Auth-Token must match process.env.SCRAPE_API_TOKEN

const PORT = parseInt(process.env.SCRAPE_API_PORT || '4060', 10);
const AUTH_TOKEN = process.env.SCRAPE_API_TOKEN || '';

let currentProc: ChildProcessWithoutNullStreams | null = null;
let isRunning = false;
let logsBuffer: string[] = [];
const MAX_LINES = 2000;

function appendLog(line: string) {
  logsBuffer.push(line);
  if (logsBuffer.length > MAX_LINES) {
    logsBuffer.splice(0, logsBuffer.length - MAX_LINES);
  }
}

function auth(req: http.IncomingMessage): boolean {
  const token = req.headers['x-auth-token'];
  return typeof token === 'string' && token === AUTH_TOKEN;
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url || '/', true);

  // CORS for convenience
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (!AUTH_TOKEN) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'SCRAPE_API_TOKEN not configured' }));
  }

  if (parsed.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ running: isRunning }));
  }

  if (parsed.pathname === '/logs') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(logsBuffer.join('\n'));
  }

  if (parsed.pathname === '/stop' && req.method === 'POST') {
    if (!auth(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    if (isRunning && currentProc) {
      appendLog(`[server] stop requested at ${new Date().toISOString()}`);
      try {
        currentProc.kill('SIGTERM');
      } catch {}
      res.writeHead(202, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ stopped: true }));
    } else {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'No running scraping process' }));
    }
  }

  if (parsed.pathname === '/auctioneers' && req.method === 'GET') {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !supabaseKey) {
      // Fallback estático para não quebrar a UI caso envs não estejam setados
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify([
        { slug: 'sodre-santoro', name: 'Sodré Santoro', is_active: true },
        { slug: 'superbid', name: 'Superbid', is_active: true },
      ]));
    }
    const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/auctioneers?select=slug,name,is_active`;
    const u = new URL(endpoint);
    const isHttps = u.protocol === 'https:';
    const opts: any = {
      method: 'GET',
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: `${u.pathname}${u.search}`,
      headers: {
        apiKey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    };
    const client = isHttps ? https : http;
    const r = client.request(opts, (rr) => {
      let data = '';
      rr.on('data', (chunk) => (data += chunk));
      rr.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    });
    r.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    });
    r.end();
    return;
  }

  if (parsed.pathname === '/run' && req.method === 'POST') {
    if (!auth(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    if (isRunning) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Scrape already running' }));
    }

    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      let auctioneers: string[] | undefined;
      try {
        if (body) {
          const parsedBody = JSON.parse(body);
          if (Array.isArray(parsedBody?.auctioneers)) {
            auctioneers = parsedBody.auctioneers.map((s: any) => String(s));
          }
        }
      } catch {}

      logsBuffer = [];
      appendLog(`[server] starting scrape at ${new Date().toISOString()}${auctioneers?.length ? ` for: ${auctioneers.join(',')}` : ''}`);

      let env: any = { ...process.env };
      env.NODE_ENV = 'production';
      if (!env.SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_URL) {
        env.SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
      }
      env.PUPPETEER_EXECUTABLE_PATH = env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable';
      if (auctioneers && auctioneers.length > 0) {
        env.AUCTIONEERS = auctioneers.join(',');
      } else {
        delete env.AUCTIONEERS;
      }

      currentProc = spawn('node', ['--import', 'tsx', 'src/lib/scraping/index.ts'], {
        env: env as NodeJS.ProcessEnv,
        stdio: 'pipe',
      });

      isRunning = true;

      currentProc.stdout.on('data', (d) => {
        const line = d.toString();
        appendLog(line.trimEnd());
      });
      currentProc.stderr.on('data', (d) => {
        const line = d.toString();
        appendLog(line.trimEnd());
      });
      currentProc.on('close', (code) => {
        appendLog(`[server] scrape finished with code ${code}`);
        isRunning = false;
        currentProc = null;
      });

      res.writeHead(202, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ started: true, auctioneers }));
    });
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[scrape-server] listening on :${PORT}`);
});


