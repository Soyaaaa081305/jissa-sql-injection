'use strict';
/* ==========================================================================
   JISSA · SQL Injection Lab  —  local web server
   ---------------------------------------------------------------------------
   * Binds to 127.0.0.1 ONLY — it can never be reached from your network.
   * Serves the 1:1 Blackboard recreation from /public.
   * Exposes POST /api/login, which is deliberately vulnerable (see
     lib/vulnerable-login.js) so the SQL injection demo is the real thing
     and not a fake animation.
   ========================================================================== */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { seedDatabase } = require('./lib/seed');
const { runLogin, runLoginSecure } = require('./lib/vulnerable-login');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const PORT = Number(config.port) || 8080;
const HOST = '127.0.0.1';
const LATENCY = Math.max(0, Number(config.simulatedLatencyMs) || 0);
const SESSION_TTL = 1000 * 60 * 60 * 2; // 2 hours

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

const db = seedDatabase(config);
const sessions = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function sendJson(res, code, obj, headers = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-JISSA-Lab': 'simulated-environment',
    ...headers
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1e6) { reject(new Error('payload too large')); req.destroy(); return; }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function getSession(req) {
  const sid = parseCookies(req).jissa_sid;
  if (!sid) return null;
  const s = sessions.get(sid);
  if (!s) return null;
  if (Date.now() > s.exp) { sessions.delete(sid); return null; }
  return { sid, ...s };
}

function safeUser(user) {
  const { password, ...rest } = user || {};
  return rest;
}

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${HOST}:${PORT}`);
  } catch (_) {
    return sendJson(res, 400, { error: 'bad request' });
  }
  const p = decodeURIComponent(url.pathname);

  try {
    /* ---------------------------------------------------------------- API */
    /* Two login endpoints, identical response shape, so the lab console can
       fire the same payload at both and show the difference:
         POST /api/login        -> runLogin()        (deliberately vulnerable)
         POST /api/login/secure -> runLoginSecure()  (parameterised, the fix)
    */
    if ((p === '/api/login' || p === '/api/login/secure') && req.method === 'POST') {
      const secure = p === '/api/login/secure';
      const body = await readJson(req);
      const username = body.username == null ? '' : String(body.username);
      const password = body.password == null ? '' : String(body.password);

      if (LATENCY) await sleep(LATENCY + Math.random() * LATENCY); // fake WAN

      const t0 = performance.now();
      const result = secure ? runLoginSecure(db, username, password) : runLogin(db, username, password);
      const ms = Math.round((performance.now() - t0) * 100) / 100;

      const meta = {
        query: result.query,
        query1: result.query1,
        bound: result.bound || null,
        ms,
        endpoint: secure ? '/api/login/secure' : '/api/login'
      };

      if (result.ok) {
        const sid = crypto.randomBytes(24).toString('hex');
        sessions.set(sid, { user: result.user, exp: Date.now() + SESSION_TTL });
        return sendJson(res, 200, { ok: true, user: result.user, meta },
          { 'Set-Cookie': `jissa_sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200` });
      }

      return sendJson(res, 200, { ok: false, error: result.error, meta });
    }

    if (p === '/api/session' && req.method === 'GET') {
      const s = getSession(req);
      if (!s) return sendJson(res, 401, { ok: false, error: 'Not signed in.' });
      return sendJson(res, 200, { ok: true, user: safeUser(s.user) });
    }

    if (p === '/api/logout' && req.method === 'POST') {
      const s = getSession(req);
      if (s) sessions.delete(s.sid);
      return sendJson(res, 200, { ok: true },
        { 'Set-Cookie': 'jissa_sid=; HttpOnly; Path=/; Max-Age=0' });
    }

    // Schema intel for the lab panel header (a real attacker would infer this).
    if (p === '/api/lab/info' && req.method === 'GET') {
      return sendJson(res, 200, {
        endpoint: '/api/login',
        fixedEndpoint: '/api/login/secure',
        method: 'POST',
        table: 'users',
        columns: ['id', 'student_number', 'password', 'full_name', 'email', 'role', 'program'],
        simulate: 'Sqlite3'
      });
    }

    // Lab aid: guarantees the "guessing" demo can always land on the configured
    // password, whatever the presenter sets in config.json.
    // Set  "labAids": false  in config.json for a stricter exercise.
    if (p === '/api/lab/demo-hint' && req.method === 'GET') {
      if (config.labAids === false) return sendJson(res, 403, { ok: false, error: 'Lab aids disabled.' });
      return sendJson(res, 200, { ok: true, password: config.demoUser.password, labAid: true });
    }

    if (p === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, { ok: true, uptime: process.uptime() });
    }

    /* ----------------------------------------------------------- STATIC */
    if (req.method === 'GET' || req.method === 'HEAD') {
      let rel = p === '/' ? '/index.html' : p;
      const normalised = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
      const file = path.join(PUBLIC_DIR, normalised);

      if (file.startsWith(PUBLIC_DIR) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        let buf = fs.readFileSync(file);

        if (path.basename(file) === 'index.html') {
          const u = config.demoUser || {};
          let html = buf.toString('utf8')
            .replace('<!--LAB_USER-->', esc(u.studentNumber || ''))
            .replace('<!--LAB_NAME-->', esc(u.shortName || u.fullName || ''));
          buf = Buffer.from(html, 'utf8');
        }

        res.writeHead(200, {
          'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'Content-Length': buf.length,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-JISSA-Lab': 'simulated-environment'
        });
        return req.method === 'HEAD' ? res.end() : res.end(buf);
      }

      // Friendly route for the post-login screen.
      if (p === '/ultra/course' || p === '/courses') {
        return res.writeHead(302, { Location: '/courses.html' }).end();
      }

      return sendJson(res, 404, { ok: false, error: `Not found: ${p}` });
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: String(err && err.message || err) });
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use. Change "port" in config.json and try again.\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const banner = [
    '',
    '  ==========================================================',
    '   JISSA - SQL INJECTION LAB   (simulated Blackboard)',
    '  ==========================================================',
    `   URL      http://${HOST}:${PORT}`,
    '   Scope    127.0.0.1 only - not reachable from any network',
    `   Account  ${config.demoUser.studentNumber}  /  (see config.json)`,
    '   Stop     Ctrl+C',
    '  ==========================================================',
    ''
  ].join('\n');
  console.log(banner);

  if (config.openBrowser && process.platform === 'win32') {
    setTimeout(() => {
      try {
        require('node:child_process').exec(`start "" "http://${HOST}:${PORT}/"`);
      } catch (_) { /* ignore */ }
    }, 500);
  }
});
