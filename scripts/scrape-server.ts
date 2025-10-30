import http from 'http';
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

  if (parsed.pathname === '/run' && req.method === 'POST') {
    if (!auth(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    if (isRunning) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Scrape already running' }));
    }

    logsBuffer = [];
    appendLog(`[server] starting scrape at ${new Date().toISOString()}`);

    // Use the same command used manually on the VPS
    const env = { ...process.env };
    env.NODE_ENV = 'production';
    if (!env.SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_URL) {
      env.SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
    }
    env.PUPPETEER_EXECUTABLE_PATH = env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable';

    currentProc = spawn('node', ['--import', 'tsx', 'src/lib/scraping/index.ts'], {
      env,
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
    return res.end(JSON.stringify({ started: true }));
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[scrape-server] listening on :${PORT}`);
});


