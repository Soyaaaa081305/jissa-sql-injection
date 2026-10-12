'use strict';
/* ==========================================================================
   API test for the JISSA SQL Injection Lab.
   Run with the server up:   node tests/api.test.js
   Reads the same config.json the server uses, so it stays valid if you
   change the demo account.
   ========================================================================== */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
const TARGET = config.demoUser.studentNumber;
const SECRET = config.demoUser.password;
const BASE = 'http://127.0.0.1:' + (config.port || 8080);

function req(p, opts = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request(BASE + p, { method: opts.method || 'GET', headers: opts.headers || {} }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: raw }));
    });
    r.on('error', reject);
    if (opts.body) r.write(opts.body);
    r.end();
  });
}

function post(p, obj, headers = {}) {
  const body = JSON.stringify(obj);
  return req(p, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, headers),
    body
  });
}

const results = [];
const check = (name, cond, extra) =>
  results.push((cond ? '  PASS  ' : '  FAIL  ') + name + (extra ? '   -> ' + extra : ''));

(async () => {
  /* ---------------------------------------------------------- static ---- */
  const page = await req('/');
  check('GET / serves the login page', page.status === 200 && page.body.includes('Login to Map'), page.status);
  check('student number injected server-side',
    page.body.includes(TARGET) && !page.body.includes('<!--LAB_USER-->'));
  check('page is labelled as a simulation', page.body.includes('JISSA SIMULATION'));
  check('courses page serves', (await req('/courses.html')).status === 200);

  /* --------------------------------------------- vulnerable responses --- */
  let r = await post('/api/login', { username: 'nobody', password: 'x' });
  let j = JSON.parse(r.body);
  check('unknown user -> Invalid username', !j.ok && j.error === 'Invalid username.', j.error);

  r = await post('/api/login', { username: TARGET, password: 'wrong' });
  j = JSON.parse(r.body);
  check('wrong password -> Invalid password', !j.ok && j.error === 'Invalid password.', j.error);
  const falseSize = r.body.length;

  r = await post('/api/login', {
    username: "' OR (SELECT length(password)>0 FROM users WHERE student_number='" + TARGET + "')-- ",
    password: 'zz'
  });
  j = JSON.parse(r.body);
  check('blind TRUE -> Invalid password', !j.ok && j.error === 'Invalid password.');
  check('blind TRUE/FALSE differ in size (boolean side-channel)',
    falseSize !== r.body.length, falseSize + 'B vs ' + r.body.length + 'B');

  /* ------------------------------------------------------ attack modes -- */
  r = await post('/api/login', { username: TARGET, password: "' OR 1=1-- " });
  j = JSON.parse(r.body);
  check("mode 03  ' OR 1=1-- bypass signs in", j.ok === true, j.ok ? j.user.full_name : j.error);
  check('mode 03  response leaks the stored row', j.ok && j.user.password === SECRET);

  const union = "' UNION SELECT 99,'UNION-LEAK',(SELECT group_concat(student_number||' :: '||password,' , ') FROM users),'JISSA UNION DUMP','leak@jissa.lab','admin','BSIT'-- ";
  r = await post('/api/login', { username: union, password: "' OR 1=1-- " });
  j = JSON.parse(r.body);
  check('mode 04  UNION dump returns every account',
    j.ok && j.user.password.includes(TARGET + ' :: ' + SECRET), j.ok ? j.user.password : j.error);

  /* ------------------------------------------------------ legit login --- */
  r = await post('/api/login', { username: TARGET, password: SECRET });
  j = JSON.parse(r.body);
  const cookie = (r.headers['set-cookie'] || [])[0];
  check('legitimate login succeeds', j.ok === true);
  check('session cookie issued', !!cookie && cookie.includes('jissa_sid'));

  /* ------------------------------------- fixed endpoint resists the same -- */
  const attacks = [
    ["' OR 1=1-- ", TARGET, 'bypass'],
    [union, "' OR 1=1-- ", 'UNION dump'],
    ["' OR (SELECT length(password)>0 FROM users WHERE student_number='" + TARGET + "')-- ", 'zz', 'blind probe']
  ];
  for (const [u, p, label] of attacks) {
    const fr = await post('/api/login/secure', { username: u, password: p });
    const fj = JSON.parse(fr.body);
    check('fixed endpoint blocks ' + label,
      fj.ok === false && fj.user === undefined && !fj.error.startsWith('Database error'),
      fj.ok ? 'SIGNED IN' : fj.error);
  }

  /* the same legitimate login must still work — the fix is not a lockout */
  r = await post('/api/login/secure', { username: TARGET, password: SECRET });
  j = JSON.parse(r.body);
  check('fixed endpoint still accepts the real password', j.ok === true, j.ok ? 'ok' : j.error);

  /* wrong password must not leak which half matched */
  r = await post('/api/login/secure', { username: TARGET, password: 'wrong' });
  j = JSON.parse(r.body);
  check('fixed endpoint -> Invalid password on wrong password',
    !j.ok && j.error === 'Invalid password.', j.error);

  /* the fixed endpoint must show placeholders, never interpolated input */
  check('fixed endpoint uses ? placeholders',
    typeof j.meta.query === 'string' && j.meta.query.includes('?') &&
    !j.meta.query.includes('wrong'),
    j.meta && j.meta.query);
  check('fixed endpoint reports the bound values separately',
    Array.isArray(j.meta.bound), JSON.stringify(j.meta && j.meta.bound));
  /* the vulnerable endpoint must still interpolate (the demo depends on it) */
  r = await post('/api/login', { username: TARGET, password: 'wrong' });
  j = JSON.parse(r.body);
  check('vulnerable endpoint still interpolates the input',
    typeof j.meta.query === 'string' && j.meta.query.includes("'wrong'"),
    j.meta && j.meta.query);

  let s = await req('/api/session', { headers: { Cookie: cookie.split(';')[0] } });
  check('GET /api/session authenticated', s.status === 200 &&
    JSON.parse(s.body).user.student_number === TARGET);
  check('session never exposes the password',
    s.status === 200 && !('password' in JSON.parse(s.body).user));
  check('GET /api/session without cookie -> 401', (await req('/api/session')).status === 401);

  /* ------------------------------------------------------ lab helpers --- */
  const info = JSON.parse((await req('/api/lab/info')).body);
  check('lab schema intel', info.table === 'users' && info.columns.length === 7);
  check('lab info advertises the fixed endpoint', info.fixedEndpoint === '/api/login/secure',
    info.fixedEndpoint);
  const hint = JSON.parse((await req('/api/lab/demo-hint')).body);
  check('lab aid hint present', hint.labAid === true);

  /* ------------------------------------------------- delivery / hygiene --- */
  check('lab panel uses SVG icons, not unicode glyphs',
    !page.body.includes('▶') && !page.body.includes('■') &&
    page.body.includes('<svg'), 'run/stop glyphs');
  check('no botched binary-search assignment in lab.js',
    !fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'lab.js'), 'utf8')
      .includes('cLo = cLo ='));

  /* ------------------------------------------------------- hardening ---- */
  check('path traversal blocked',
    (await req('/..%2f..%2fserver.js')).status !== 200 ||
    !(await req('/..%2f..%2fserver.js')).body.includes('seedDatabase'));
  check('server identifies itself as a lab',
    (await req('/api/health')).headers['x-jissa-lab'] === 'simulated-environment');

  console.log(results.join('\n'));
  const failed = results.filter((x) => x.startsWith('  FAIL')).length;
  console.log('\n' + (results.length - failed) + '/' + results.length + ' checks passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('TEST ERROR', e.message); process.exit(1); });
