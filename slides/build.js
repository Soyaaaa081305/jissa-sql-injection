'use strict';
/* ==========================================================================
   Builds slides/SQL-Injection-101-JISSA.pptx
   Audience: first-year BS IT students, JISSA General Assembly.
   Run:  npm run build   (inside the slides folder)
   ========================================================================== */
const pptxgen = require('pptxgenjs');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9';           // 10 x 5.625 in
pptx.author = 'JISSA';
pptx.company = 'JISSA — ethical hacking organization';
pptx.title = 'SQL Injection 101';

const Shape = pptx.ShapeType || pptxgen.ShapeType || { rect: 'rect', roundRect: 'roundRect', line: 'line' };

const NAVY = '0A1D38', NAVY2 = '123156', RED = 'E2231A';
const LIGHT = 'F5F7FA', INK = '1B1B1B', MUTED = '5A6474';
const GREEN = '1E9E5A', GREENBG = 'EAF7F0', REDBG = 'FDEDEC';
const CODEBG = '070B16', CODEFG = 'CFE0FF', DIM = '7D8CA8', INJ = 'FF5F56';
const FONT = 'Segoe UI', MONO = 'Consolas';

let pageNo = 0;

/* ------------------------------------------------------------- helpers -- */
function bg(slide, color) { slide.background = { color }; }

function chrome(slide, kicker, title, dark) {
  slide.addText(kicker.toUpperCase(), {
    x: 0.55, y: 0.34, w: 8.9, h: 0.26, fontFace: FONT, fontSize: 10.5,
    bold: true, color: RED, charSpacing: 2.4
  });
  slide.addText(title, {
    x: 0.55, y: 0.6, w: 8.9, h: 0.72, fontFace: FONT, fontSize: 27,
    bold: true, color: dark ? 'FFFFFF' : INK
  });
  slide.addShape(Shape.rect, { x: 0.55, y: 1.34, w: 1.1, h: 0.045, fill: { color: RED } });
}

function footer(slide, dark) {
  pageNo += 1;
  const c = dark ? '6F82A8' : 'A3ABB8';
  slide.addText('JISSA  ·  SQL Injection 101  ·  simulated lab, localhost only', {
    x: 0.55, y: 5.24, w: 7, h: 0.26, fontFace: FONT, fontSize: 8.5, color: c
  });
  slide.addText(String(pageNo), {
    x: 9.0, y: 5.24, w: 0.45, h: 0.26, fontFace: FONT, fontSize: 8.5, color: c, align: 'right'
  });
}

function newSlide(kicker, title, dark) {
  const s = pptx.addSlide();
  bg(s, dark ? NAVY : 'FFFFFF');
  if (kicker) chrome(s, kicker, title, dark);
  footer(s, dark);
  return s;
}

/* runs: [{t:'text', c:hex, b:bold, br:lineBreakAfter}] */
/* Consolas advances ~0.55em; PowerPoint renders a line at ~1.2em. These are
   estimates, but they catch a block that is obviously too tall or too wide for
   its frame before the deck gets opened on a projector. */
function checkFit(tag, runs, w, h, fontSize) {
  const pt = fontSize || 13;
  const innerW = w - 0.4, innerH = h - 0.28;
  const cap = Math.floor(innerW / (pt * 0.55 / 72));
  const lines = [];
  runs.forEach((r) => lines.push(r.t));
  const longest = Math.max.apply(null, lines.map((l) => l.length));
  const need = lines.length * (pt * 1.2 / 72);
  if (need > innerH + 0.02) {
    console.log('  WARN  ' + tag + '  too tall: needs ' + need.toFixed(2) + 'in, frame ' + innerH.toFixed(2) + 'in (' + lines.length + ' lines @' + pt + 'pt)');
  }
  if (longest > cap) {
    console.log('  WARN  ' + tag + '  too wide: ' + longest + ' chars, fits ' + cap + ' @' + pt + 'pt');
  }
}

function codeBlock(s, x, y, w, h, runs, fontSize) {
  checkFit('x' + x + 'y' + y, runs, w, h, fontSize);
  s.addShape(Shape.roundRect, {
    x, y, w, h, rectRadius: 0.06,
    fill: { color: CODEBG }, line: { color: '1B2540', width: 1 }
  });
  s.addText(runs.map((r) => ({
    text: r.t,
    options: { breakLine: r.br !== false, color: r.c || CODEFG, bold: !!r.b }
  })), {
    x: x + 0.2, y: y + 0.14, w: w - 0.4, h: h - 0.28,
    fontFace: MONO, fontSize: fontSize || 13, valign: 'top', align: 'left'
  });
}

function bullets(s, items, opts) {
  const o = Object.assign({ x: 0.55, y: 1.7, w: 8.9, h: 3.2, fontSize: 15, color: INK }, opts || {});
  s.addText(items.map((it) => ({
    text: typeof it === 'string' ? it : it.t,
    options: {
      breakLine: true,
      bullet: { code: '25AA', indent: 16 },
      bold: !!(typeof it !== 'string' && it.b),
      color: (typeof it !== 'string' && it.c) || o.color
    }
  })), {
    x: o.x, y: o.y, w: o.w, h: o.h, fontFace: FONT, fontSize: o.fontSize,
    valign: 'top', lineSpacingMultiple: 1.25, paraSpaceAfter: 8
  });
}

function chip(s, x, y, w, text, fill, color) {
  s.addShape(Shape.roundRect, { x, y, w, h: 0.42, rectRadius: 0.08, fill: { color: fill } });
  s.addText(text, {
    x, y, w, h: 0.42, fontFace: FONT, fontSize: 11.5, bold: true,
    color, align: 'center', valign: 'middle'
  });
}

function card(s, x, y, w, h, head, body, accent) {
  s.addShape(Shape.roundRect, {
    x, y, w, h, rectRadius: 0.05,
    fill: { color: LIGHT }, line: { color: 'E2E6EC', width: 1 }
  });
  s.addShape(Shape.rect, { x, y, w: 0.05, h, fill: { color: accent || RED } });
  s.addText(head, {
    x: x + 0.22, y: y + 0.14, w: w - 0.4, h: 0.3, fontFace: FONT,
    fontSize: 13, bold: true, color: INK
  });
  s.addText(body, {
    x: x + 0.22, y: y + 0.46, w: w - 0.4, h: h - 0.6, fontFace: FONT,
    fontSize: 11, color: MUTED, valign: 'top', lineSpacingMultiple: 1.2
  });
}

/* =========================================================== SLIDE 1 ==== */
{
  const s = pptx.addSlide();
  bg(s, NAVY);
  s.addShape(Shape.rect, { x: 0, y: 0, w: 10, h: 0.14, fill: { color: RED } });
  s.addShape(Shape.roundRect, {
    x: 0.7, y: 1.05, w: 2.5, h: 0.4, rectRadius: 0.08,
    fill: { color: '1A1030' }, line: { color: INJ, width: 1 }
  });
  s.addText("JISSA · GENERAL ASSEMBLY", {
    x: 0.7, y: 1.05, w: 2.5, h: 0.4, fontFace: MONO, fontSize: 10,
    bold: true, color: INJ, align: 'center', valign: 'middle'
  });

  s.addText('SQL Injection 101', {
    x: 0.7, y: 1.7, w: 8.6, h: 1.1, fontFace: FONT, fontSize: 54, bold: true, color: 'FFFFFF'
  });
  s.addText('How a login form can be talked into handing over the keys', {
    x: 0.72, y: 2.82, w: 8.4, h: 0.5, fontFace: FONT, fontSize: 20, color: 'A9BADA'
  });

  s.addShape(Shape.rect, { x: 0.72, y: 3.5, w: 3.4, h: 0.035, fill: { color: RED } });

  s.addText([
    { text: 'For first-year BS IT students', options: { breakLine: true, bold: true, color: 'FFFFFF' } },
    { text: 'Every attack in this deck runs live on a 1:1 local copy of mcl.blackboard.com', options: { color: '8FA3CC' } }
  ], { x: 0.72, y: 3.75, w: 8.4, h: 0.9, fontFace: FONT, fontSize: 14 });

  s.addShape(Shape.roundRect, {
    x: 0.72, y: 4.72, w: 5.6, h: 0.42, rectRadius: 0.08,
    fill: { color: '0E2748' }, line: { color: '24487C', width: 1 }
  });
  s.addText('SIMULATED ENVIRONMENT  ·  127.0.0.1  ·  no real account, no real server', {
    x: 0.72, y: 4.72, w: 5.6, h: 0.42, fontFace: MONO, fontSize: 9.5,
    color: '9DE8BC', align: 'center', valign: 'middle'
  });

  footer(s, true);
  s.addNotes(
    'Welcome. Before anything else: everything you will see today runs on this laptop only. ' +
    'It is a local copy of our Blackboard login page, served from 127.0.0.1 — it is not the real ' +
    'site, there is no real student record, and nothing leaves this machine. ' +
    'Goal for the next 4 minutes: understand what SQL injection is, watch four real attacks, and ' +
    'learn the one coding habit that stops all of them.'
  );
}

/* =========================================================== SLIDE 2 ==== */
{
  const s = newSlide('Agenda', 'What we will cover', false);
  bullets(s, [
    { t: '1.  How a login form talks to a database', b: true },
    { t: '2.  What SQL injection actually is', b: true },
    { t: '3.  Four attacks, live — from a single bypass to reading the password out of the database', b: true },
    { t: '4.  What it costs when it happens for real', b: true },
    { t: '5.  Where the SQL should live — front end vs back end', b: true },
    { t: '6.  The fix: parameterised queries (and why it is one line of code)', b: true },
    { t: '7.  Ethics — testing legally, and where to practise', b: true }
  ], { y: 1.66, fontSize: 14.5, h: 2.6 });

  s.addShape(Shape.roundRect, {
    x: 0.55, y: 4.35, w: 8.9, h: 0.62, rectRadius: 0.06,
    fill: { color: 'FFF4F3' }, line: { color: 'F6C9C5', width: 1 }
  });
  s.addText([
    { text: 'You do not need to code to follow this.  ', options: { bold: true, color: RED } },
    { text: 'You only need to understand that the database is being asked a question — and someone is changing the question.', options: { color: '6B3A36' } }
  ], { x: 0.75, y: 4.35, w: 8.5, h: 0.62, fontFace: FONT, fontSize: 12.5, valign: 'middle' });

  s.addNotes(
    'Run through the agenda quickly. Emphasise that no programming background is required — ' +
    'the whole talk reduces to one idea: the database is asked a question, and an attacker changes ' +
    'the question. Mention that slide 3 and 4 are the only technical slides; everything after is live.'
  );
}

/* =========================================================== SLIDE 3 ==== */
{
  const s = newSlide('The normal case', 'How a login is supposed to work', false);

  s.addText('Your browser sends what you typed. The server asks the database one question:', {
    x: 0.55, y: 1.6, w: 8.9, h: 0.4, fontFace: FONT, fontSize: 14.5, color: MUTED
  });

  codeBlock(s, 0.55, 2.1, 8.9, 1.7, [
    { t: 'SELECT * FROM users', c: '9DE8BC' },
    { t: " WHERE student_number = ", c: CODEFG },
    { t: "'2024151326'", c: 'FFD08A' },
    { t: "   AND password = ", c: CODEFG },
    { t: "'MapuaMCL2026'", c: 'FFD08A' },
    { t: ';', c: DIM }
  ], 14);

  card(s, 0.55, 3.9, 2.85, 1.15, 'A row comes back',
    '→ the answer is “yes, that account exists with that password” → you are signed in.', GREEN);
  card(s, 3.6, 3.9, 2.85, 1.15, 'No row comes back',
    '→ the answer is “no” → the form shows “Invalid username or password”.', MUTED);
  card(s, 6.65, 3.9, 2.8, 1.15, 'That is the whole login',
    'No magic. One question, one answer. Hold on to that.', NAVY2);

  s.addNotes(
    'Walk through the query line by line: SELECT * means “give me everything about the account”, ' +
    'FROM users means “look in the users table”, and the WHERE clause is the actual question. ' +
    'Two possible answers: a row comes back (login succeeds) or it does not (login fails). ' +
    'Ask the audience to remember this: everything later is about changing the WHERE clause.'
  );
}

/* =========================================================== SLIDE 4 ==== */
{
  const s = newSlide('The bug', 'The vulnerable code', false);

  s.addText('Most injection bugs come from one habit — pasting input into a query as text:', {
    x: 0.55, y: 1.58, w: 8.9, h: 0.4, fontFace: FONT, fontSize: 14.5, color: MUTED
  });

  codeBlock(s, 0.55, 2.08, 8.9, 1.95, [
    { t: '// JISSA lab — lib/vulnerable-login.js', c: '4F5F7D' },
    { t: 'const q = `SELECT * FROM users', c: CODEFG },
    { t: "         WHERE student_number = '${username}'", c: CODEFG },
    { t: "           AND password        = '${password}'`;", c: CODEFG },
    { t: '', c: CODEFG },
    { t: 'db.prepare(q).get();   ', c: 'FFC857' },
    { t: '// ← text you type becomes SQL', c: INJ, b: true }
  ], 14);

  s.addShape(Shape.roundRect, {
    x: 0.55, y: 4.15, w: 8.9, h: 0.85, rectRadius: 0.06,
    fill: { color: REDBG }, line: { color: 'F0B7B2', width: 1 }
  });
  s.addText([
    { text: 'The database has no idea which parts are your data and which parts are instructions. ', options: { bold: true, color: '9B1C14' } },
    { text: 'If you can type a quote, you can write the instructions yourself.', options: { color: '9B1C14' } }
  ], { x: 0.78, y: 4.15, w: 8.45, h: 0.85, fontFace: FONT, fontSize: 14, valign: 'middle' });

  s.addNotes(
    'Point at the backticks and the ${} placeholders. Explain: the developer built the query by ' +
    'string concatenation, assuming the user would only ever type a name and a password. ' +
    'The database engine receives one flat line of text and parses it — it cannot tell where your ' +
    'data ends and the query begins. This is exactly what OWASP calls Injection (A03), and it has ' +
    'been in the Top 10 since the list began.'
  );
}

/* =========================================================== SLIDE 5 ==== */
{
  const s = newSlide('The attack', "What the attacker types:  ' OR 1=1--", false);

  s.addShape(Shape.roundRect, {
    x: 0.55, y: 1.6, w: 3.0, h: 1.5, rectRadius: 0.06,
    fill: { color: LIGHT }, line: { color: 'E2E6EC', width: 1 }
  });
  s.addText('IN THE PASSWORD FIELD', {
    x: 0.75, y: 1.75, w: 2.6, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: MUTED, charSpacing: 1.5
  });
  s.addText("' OR 1=1--", {
    x: 0.75, y: 2.1, w: 2.6, h: 0.7, fontFace: MONO, fontSize: 26, bold: true, color: RED
  });

  s.addText('→', { x: 3.6, y: 2.05, w: 0.5, h: 0.6, fontFace: FONT, fontSize: 30, bold: true, color: MUTED, align: 'center' });

  codeBlock(s, 4.15, 1.6, 5.3, 1.5, [
    { t: 'SELECT * FROM users', c: '9DE8BC' },
    { t: ' WHERE id = 1 AND password = ', c: CODEFG },
    { t: "'' OR 1=1", c: INJ, b: true },
    { t: '-- ', c: INJ, b: true },
    { t: ' LIMIT 1;', c: DIM, br: false }
  ], 12.5);

  s.addText([
    { text: 'Read it out loud:  ', options: { bold: true, color: INK } },
    { text: '“id is 1 AND the password is empty” ', options: { color: MUTED } },
    { text: 'OR “1 equals 1”', options: { bold: true, color: RED } },
    { text: ' — and everything after ', options: { color: MUTED } },
    { text: '--', options: { bold: true, color: RED, fontFace: MONO } },
    { text: ' is a comment, so the password check is never finished.', options: { color: MUTED } }
  ], { x: 0.55, y: 3.3, w: 8.9, h: 0.7, fontFace: FONT, fontSize: 14 });

  const rows = [
    [{ text: 'What they wanted to prove', options: { bold: true, color: 'FFFFFF', fill: { color: NAVY2 } } },
     { text: 'What the database heard', options: { bold: true, color: 'FFFFFF', fill: { color: NAVY2 } } }],
    ['Is this the right password?', 'Is (empty password) OR 1=1 true?  → always true'],
    ['Answer: no → rejected', 'Answer: yes → a row comes back → signed in']
  ];
  s.addTable(rows, {
    x: 0.55, y: 4.1, w: 8.9, colW: [4.45, 4.45], fontSize: 12.5, fontFace: FONT,
    border: { type: 'solid', color: 'E2E6EC', pt: 1 }, color: INK, valign: 'middle',
    rowH: 0.34, margin: 4
  });

  s.addNotes(
    'This is the classic payload and it is decades old. Break it into three pieces: ' +
    "the single quote closes the value we were supposed to type; OR 1=1 adds a condition that is " +
    'always true; the double dash comments out the rest of the line so the real password comparison ' +
    'is never evaluated. Note the precedence rule: AND binds tighter than OR, so the query becomes ' +
    '(id=1 AND password=\'\') OR (1=1), and the right-hand side is unconditionally true. ' +
    'In the live demo this is mode 03 and it costs exactly one request.'
  );
}

/* =========================================================== SLIDE 6 ==== */
{
  const s = newSlide('Why it works', 'Three rules of SQL injection', false);

  card(s, 0.55, 1.65, 2.85, 2.5, "1.  '  closes your data",
    "The single quote marks the end of the value. Everything you type after it is parsed as query, not as a password.", RED);
  card(s, 3.6, 1.65, 2.85, 2.5, '2.  You may add instructions',
    'Because the engine cannot tell data from code, you can append WHERE, OR, UNION, SELECT — whatever the database understands.', RED);
  card(s, 6.65, 1.65, 2.8, 2.5, '3.  --  silences the rest',
    'A comment eats the remainder of the line — usually the part that was checking your password, or a closing quote.', RED);

  s.addShape(Shape.roundRect, {
    x: 0.55, y: 4.4, w: 8.9, h: 0.68, rectRadius: 0.06,
    fill: { color: NAVY }
  });
  s.addText([
    { text: 'Injection is not a database flaw.  ', options: { bold: true, color: 'FFFFFF' } },
    { text: 'It is an application flaw: the app failed to separate code from data.', options: { color: 'A9BADA' } }
  ], { x: 0.8, y: 4.4, w: 8.4, h: 0.68, fontFace: FONT, fontSize: 14, valign: 'middle' });

  s.addNotes(
    'Drive home rule 3: commenting is what makes injection so powerful — it lets the attacker ' +
    'delete the part of the query they do not want to run. Then read the navy banner: SQL injection ' +
    'is not a bug in MySQL/PostgreSQL/SQLite, it is a bug in the program that built the query. ' +
    'That is why the fix belongs in the application code.'
  );
}

/* =========================================================== SLIDE 7 ==== */
{
  const s = newSlide('Live demo', 'Four attacks we run against the clone', false);

  const head = ['#', 'Attack', 'Requests', 'What it proves'];
  const data = [
    ['03', "Tautology bypass  ' OR 1=1--", '1', 'Skip the password check entirely'],
    ['04', 'UNION SELECT dump', '1', 'Download the whole users table in one go'],
    ['01', 'Boolean blind extraction', '~90', 'Read the password out, character by character'],
    ['02', 'Dictionary / brute force', '~85', 'Keep trying until one candidate is accepted']
  ];
  const rows = [
    head.map((h) => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: NAVY2 }, fontSize: 12 } })),
    ...data.map((r, i) => r.map((c, j) => ({
      text: c,
      options: {
        fill: { color: i % 2 ? 'FFFFFF' : LIGHT },
        bold: j === 0, color: j === 0 ? RED : INK,
        fontFace: j === 0 || j === 2 ? MONO : FONT, fontSize: 12.5
      }
    })))
  ];
  s.addTable(rows, {
    x: 0.55, y: 1.62, w: 8.9, colW: [0.6, 3.3, 1.2, 3.8],
    border: { type: 'solid', color: 'E2E6EC', pt: 1 }, valign: 'middle',
    rowH: 0.5, margin: 5
  });

  s.addShape(Shape.roundRect, {
    x: 0.55, y: 4.15, w: 8.9, h: 0.85, rectRadius: 0.06,
    fill: { color: 'FFF4F3' }, line: { color: 'F6C9C5', width: 1 }
  });
  s.addText([
    { text: 'Notice the order: ', options: { bold: true, color: RED } },
    { text: 'the flashy one-request attacks come first, then the quiet one that needs ~90 requests — ', options: { color: '6B3A36' } },
    { text: 'that quiet one is what real attackers prefer when a site gives no feedback.', options: { color: '6B3A36', bold: true } }
  ], { x: 0.78, y: 4.15, w: 8.45, h: 0.85, fontFace: FONT, fontSize: 13, valign: 'middle' });

  s.addNotes(
    'This table is exactly the lab panel the audience will see. Suggest running them in this order ' +
    'during the demo: 03 first (instant wow), 04 (they take the whole table), 01 as the finale ' +
    '(the password visibly assembles itself in the Recovered password field), then 02 as a bonus. ' +
    'Every run ends by auto-filling the real login form and pressing Sign In — the Courses page ' +
    'only loads because the server genuinely accepted the credentials. ' +
    'The panel has an endpoint switch at the top: Vulnerable vs Parameterised. Running the same ' +
    'mode against the parameterised endpoint is the live proof for the fix slides.'
  );
}

/* =========================================================== SLIDE 8 ==== */
{
  const s = pptx.addSlide();
  bg(s, NAVY);
  chrome(s, 'Finale', 'Watch the password appear', true);
  footer(s, true);

  const steps = [
    ['1', 'The panel types a probe into the Username field and presses Sign In'],
    ['2', 'The server answers only “Invalid username.” or “Invalid password.”'],
    ['3', 'True / false is one bit — so the tool asks yes/no questions in binary search'],
    ['4', 'Each confirmed character lands in the Recovered password field, left to right']
  ];
  steps.forEach((st, i) => {
    const y = 1.66 + i * 0.66;
    s.addShape(Shape.roundRect, { x: 0.55, y, w: 0.44, h: 0.44, rectRadius: 0.06, fill: { color: RED } });
    s.addText(st[0], { x: 0.55, y, w: 0.44, h: 0.44, fontFace: FONT, fontSize: 15, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
    s.addText(st[1], { x: 1.15, y: y - 0.02, w: 8.3, h: 0.5, fontFace: FONT, fontSize: 15, color: 'DCE6F7', valign: 'middle' });
  });

  s.addShape(Shape.roundRect, {
    x: 0.55, y: 4.35, w: 8.9, h: 0.72, rectRadius: 0.06,
    fill: { color: '07111F' }, line: { color: '24487C', width: 1 }
  });
  s.addText([
    { text: 'RECOVERED  ', options: { color: DIM, fontFace: MONO, fontSize: 11, bold: true } },
    { text: 'M a p u a M C L 2 0 2 6', options: { color: '4ADE80', fontFace: MONO, fontSize: 17, bold: true } },
    { text: '    ← never guessed, never shown, simply read out', options: { color: '8FA3CC', fontFace: FONT, fontSize: 12 } }
  ], { x: 0.8, y: 4.35, w: 8.4, h: 0.72, valign: 'middle' });

  s.addNotes(
    'This slide is the script for mode 01. Two things to say while it runs: ' +
    '(1) the attacker never sees the password — there is no “here it is” screen; they only ever get ' +
    'yes or no, and they reconstruct the secret from those answers; ' +
    '(2) about 86 requests and roughly five seconds at normal speed. ' +
    'Then point at the value: “that string came out of the database, character by character, ' +
    'and the form below it is now being filled with it.”'
  );
}

/* =========================================================== SLIDE 9 ==== */
{
  const s = newSlide('How blind SQLi works', 'Yes / no is enough to read anything', false);

  s.addText('The form gives two different error messages — and that difference is a signal:', {
    x: 0.55, y: 1.58, w: 8.9, h: 0.36, fontFace: FONT, fontSize: 14, color: MUTED
  });

  codeBlock(s, 0.55, 2.02, 8.9, 1.75, [
    { t: "username: ", c: DIM },
    { t: "' OR (SELECT length(password) FROM users WHERE student_number='2024151326') > 10-- ", c: INJ, b: true },
    { t: '', c: CODEFG },
    { t: '  → “Invalid username.”  ', c: 'FF8F87' },
    { t: 'condition FALSE  (no row)', c: DIM },
    { t: '', c: CODEFG },
    { t: '  → “Invalid password.” ', c: '9DE8BC' },
    { t: 'condition TRUE   (row found)', c: DIM }
  ], 11);

  card(s, 0.55, 3.85, 2.85, 1.2, 'One probe = one bit',
    'Flip the test from > 10 to > 5 and ask again. The answer narrows the range every time.', NAVY2);
  card(s, 3.6, 3.85, 2.85, 1.2, 'Binary search',
    '95 possible characters → only 7 questions per position. Length first, then each character.', NAVY2);
  card(s, 6.65, 3.85, 2.8, 1.2, 'Cost in the lab',
    '~6 probes for the length + 7 per character ≈ 86 requests, about 5 seconds.', NAVY2);

  s.addNotes(
    'This is the technical heart of the talk, but keep it simple. The app has two failure messages: ' +
    '“Invalid username” when the lookup found nobody, and “Invalid password” when it found somebody. ' +
    'An attacker deliberately makes the lookup succeed or fail depending on a condition they choose — ' +
    'so the error message becomes a truth oracle. Binary search means we do not try every character: ' +
    '7 yes/no questions cover the 95 printable ASCII characters. Emphasise: no output window, no ' +
    'error dump, no logging needed — this works even on a well-built site that hides its errors.'
  );
}

/* =========================================================== SLIDE 10 === */
{
  const s = newSlide('The family', 'Other flavours of SQL injection', false);

  card(s, 0.55, 1.62, 4.35, 1.15, 'UNION-based',
    'Append your own SELECT so the result set includes the data you want (users, passwords, card numbers). Fastest when the output is visible. → mode 04', RED);
  card(s, 5.1, 1.62, 4.35, 1.15, 'Boolean blind',
    'No visible output: compare two error responses and rebuild the data bit by bit. → mode 01', RED);
  card(s, 0.55, 2.92, 4.35, 1.15, 'Time-based blind',
    'The payload makes the database sleep — “TRUE = slow, FALSE = fast”. Works even when the message is identical.', NAVY2);
  card(s, 5.1, 2.92, 4.35, 1.15, 'Error-based',
    'Force a conversion error and read the secret straight out of the error text. Happens when errors are shown to users.', NAVY2);
  card(s, 0.55, 4.22, 8.9, 0.78, 'Stacked queries & out-of-band',
    'Multiple statements (CREATE USER, DROP TABLE) or DNS/HTTP exfiltration — how injection turns into full server compromise, and why it stops being “just a database read”.', MUTED);

  s.addNotes(
    'Quick tour — do not dwell. The important contrast is UNION vs blind: UNION needs somewhere for ' +
    'the answer to be displayed, blind does not. Mention time-based briefly because it is the one ' +
    'that needs no distinct error messages at all: the attacker just measures how long the page takes. ' +
    'End on the last card: stacked queries are how a read-only injection becomes data destruction, ' +
    'and how it escalates to running commands on the server.'
  );
}

/* =========================================================== SLIDE 11 === */
{
  const s = newSlide('Impact', 'What it costs when it goes wrong', false);

  bullets(s, [
    { t: 'Every row the application can read — passwords, personal data, grades, message archives', b: true },
    { t: 'Account takeover, including administrative accounts', b: true },
    { t: 'Data destroyed or held for ransom; defaced pages', b: true },
    { t: 'A read-only bug that escalates into remote code execution on the database server', b: true },
    { t: 'Breach notification, DPPA obligations, suspension, and permanent reputational damage', b: true }
  ], { y: 1.7, fontSize: 15.5, h: 2.5 });

  s.addShape(Shape.roundRect, {
    x: 0.55, y: 4.15, w: 8.9, h: 0.85, rectRadius: 0.06, fill: { color: NAVY }
  });
  s.addText([
    { text: 'Injection has appeared in every OWASP Top 10 since 2003', options: { bold: true, color: 'FFFFFF' } },
    { text: ' — and it is still one of the most common findings in real penetration tests.', options: { color: 'A9BADA' } }
  ], { x: 0.8, y: 4.15, w: 8.4, h: 0.85, fontFace: FONT, fontSize: 14, valign: 'middle' });

  s.addNotes(
    'Keep this factual rather than dramatic. The key teaching point is escalation: an attacker who ' +
    'can only SELECT is annoying; one who can run stacked statements can drop tables or create a new ' +
    'administrator. In the Philippines the Data Privacy Act applies to personal data breaches, so this ' +
    'is also a legal and academic-integrity issue — not just a technical one. ' +
    'Reinforce that the OWASP Top 10 is what the industry actually tests against.'
  );
}

/* =========================================================== SLIDE 12 === */
{
  const s = newSlide('Architecture · part 1', 'Who owns the SQL?', false);

  s.addText('This is the same habit as before — but it is not JavaScript any more, and only one of the problems is injection:', {
    x: 0.55, y: 1.42, w: 8.9, h: 0.32, fontFace: FONT, fontSize: 13.5, color: MUTED
  });

  codeBlock(s, 0.55, 1.84, 8.9, 2.25, [
    { t: '//  Login.aspx.cs   —   the page itself builds the SQL', c: '4F5F7D' },
    { t: 'protected void btnLogin_Click(object sender, EventArgs e)', c: CODEFG },
    { t: '{', c: DIM },
    { t: '    string sql = "SELECT * FROM Users WHERE "', c: CODEFG },
    { t: "               + \"StudentNumber = '\" + txtUser.Text + \"' \"", c: 'FFD08A' },
    { t: "               + \"PasswordHash  = '\" + txtPass.Text + \"'\";", c: 'FFD08A' },
    { t: '    new SqlDataAdapter(sql, new SqlConnection(CONN))', c: CODEFG },
    { t: '        .Fill(table);           ', c: 'FFC857' },
    { t: '// ← the whole row, every column', c: INJ, b: true },
    { t: '}', c: DIM }
  ], 11.5);

  card(s, 0.55, 4.16, 2.85, 1.0, 'It knows the schema',
    'Table and column names are all typed into the .aspx.cs file.', RED);
  card(s, 3.6, 4.16, 2.85, 1.0, 'It knows where the data is',
    'The connection string sits in the page config.', RED);
  card(s, 6.65, 4.16, 2.8, 1.0, 'It rebuilds the plan every click',
    'A new query string each login means SQL Server plans it again.', NAVY2);

  s.addNotes(
    'This slide is the bridge from the attack section to the fix. The code above is ordinary ' +
    'ASP.NET Web Forms code-behind — the kind of thing you will write in your Database 2 and ' +
    'application-development subjects. Walk through it and point out that the SQL string is built ' +
    'in the same file as the textboxes. Three separate problems, and students usually only spot ' +
    'the first one. ' +
    '(1) It concatenates user input, so it is injectable — the same bug as slide 4, just in C#. ' +
    '(2) The UI layer now has to know the table name, every column name and the connection string. ' +
    'Rename one column in SSMS and this page breaks — and so does every other page that copied ' +
    'the same string. ' +
    '(3) The query text changes on every single click, so SQL Server cannot reuse a cached plan. ' +
    'That third one is the efficiency argument, and it is what the next slide fixes. ' +
    'Ask the audience: what should the front end actually know about the database? Answer: nothing.'
  );
}

/* =========================================================== SLIDE 13 === */
{
  const s = newSlide('Architecture · part 2', 'Front end passes values. Back end owns the query.', false);

  s.addText('Three layers. Only the middle one is allowed to mention a table.', {
    x: 0.55, y: 1.4, w: 8.9, h: 0.3, fontFace: FONT, fontSize: 13.5, color: MUTED
  });

  const label = (x, w, t, c) => s.addText(t, {
    x, y: 1.74, w, h: 0.26, fontFace: FONT, fontSize: 10, bold: true, color: c, charSpacing: 1.4
  });

  label(0.55, 2.35, '1 · FRONT END', MUTED);
  label(3.45, 3.05, '2 · BACK END  (C#)', RED);
  label(7.0, 2.45, '3 · DATABASE  (SSMS)', GREEN);

  codeBlock(s, 0.55, 2.02, 2.75, 2.33, [
    { t: '// Login.aspx.cs', c: '4F5F7D' },
    { t: '// the page sees two', c: '4F5F7D' },
    { t: '// strings — no table,', c: '4F5F7D' },
    { t: '// no columns, no SQL,', c: '4F5F7D' },
    { t: '// no connection string', c: '4F5F7D' },
    { t: '', c: CODEFG },
    { t: 'bool ok = AccountDal', c: CODEFG },
    { t: '    .Login(txtUser.Text,', c: CODEFG },
    { t: '           txtPass.Text);', c: CODEFG }
  ], 9);

  codeBlock(s, 3.45, 2.02, 3.45, 2.33, [
    { t: '// AccountDal.cs — only', c: '4F5F7D' },
    { t: '// this file names a table', c: '4F5F7D' },
    { t: 'string sql =', c: CODEFG },
    { t: '  "SELECT 1 FROM dbo.Users"', c: '9DE8BC' },
    { t: '  + " WHERE StudentNumber = @sn"', c: CODEFG },
    { t: '  + "   AND PasswordHash = @ph;";', c: CODEFG },
    { t: 'using var cmd =', c: CODEFG },
    { t: '  new SqlCommand(sql, con);', c: CODEFG },
    { t: 'cmd.Parameters.Add("@sn",', c: CODEFG },
    { t: '  SqlDbType.NVarChar, 20).Value = sn;', c: 'FFC857' },
    { t: 'cmd.Parameters.Add("@ph",', c: CODEFG },
    { t: '  SqlDbType.VarBinary, 64)', c: 'FFC857' },
    { t: '    .Value = Hash(pw);', c: 'FFC857' },
    { t: 'return cmd.ExecuteScalar() != null;', c: CODEFG }
  ], 8.5);

  codeBlock(s, 7.0, 2.02, 2.45, 2.33, [
    { t: '-- SSMS · JISSA_DB', c: '4F5F7D' },
    { t: 'CREATE TABLE dbo.Users (', c: '9DE8BC' },
    { t: '  Id int identity', c: CODEFG },
    { t: '    primary key,', c: CODEFG },
    { t: '  StudentNumber', c: CODEFG },
    { t: '    nvarchar(20) unique,', c: CODEFG },
    { t: '  PasswordHash', c: CODEFG },
    { t: '    varbinary(64),', c: CODEFG },
    { t: '  FullName nvarchar(100),', c: CODEFG },
    { t: '  IsActive bit', c: CODEFG },
    { t: ');', c: DIM }
  ], 8.5);

  s.addShape(Shape.roundRect, {
    x: 0.55, y: 4.48, w: 8.9, h: 0.72, rectRadius: 0.06, fill: { color: NAVY }
  });
  s.addText([
    { text: 'Parameterised is faster as well as safer.  ', options: { bold: true, color: 'FFFFFF' } },
    { text: 'The SQL text never changes, so the server plans it once and reuses the plan — and the page source contains no table or column name at all.', options: { color: 'A9BADA' } }
  ], { x: 0.8, y: 4.48, w: 8.4, h: 0.72, fontFace: FONT, fontSize: 12.5, valign: 'middle' });

  s.addNotes(
    'Read the three columns left to right as a request travelling inward. ' +
    'Column 1, the front end: all it does is collect two strings and hand them to the back end. ' +
    'It cannot leak the schema because it never sees it. ' +
    'Column 2, the back end: this is the only file that knows a table exists. The query is a ' +
    'constant string, and @sn and @ph are placeholders — the values travel to SQL Server in a ' +
    'separate parameters collection, never inside the SQL text. That is what makes it safe: a ' +
    'quote in the password is just a character inside a value, not a chance to rewrite the query. ' +
    'Column 3, SSMS: the schema lives in the database, where it belongs. Rename a column here and ' +
    'you edit one file, not every page in the project. ' +
    'Say the efficiency point out loud — it is the part students forget. Because the query text is ' +
    'identical on every login, SQL Server caches one execution plan and reuses it; the string-' +
    'concatenation version hands it a brand-new query each time and pays to parse and plan it again. ' +
    'The same idea appears as a stored procedure (dbo.usp_Login with @sn and @ph) if you would ' +
    'rather keep the SQL in the database. The syntax is identical in MySQL (PDO prepared ' +
    'statements), PostgreSQL (Npgsql) and Java (PreparedStatement) — the pattern does not change. ' +
    'Tie it to the course: this is exactly what Database 2 drills — ADO.NET, SqlCommand, and ' +
    'parameterised queries as the default, not the exception. ' +
    'Then SWITCH TO THE LIVE LAB: the panel has an endpoint switch. Re-run the same payload ' +
    'against the parameterised endpoint and the payload is listed underneath as bound data, not ' +
    'inside the query.'
  );
}

/* =========================================================== SLIDE 14 === */
{
  const s = newSlide('The fix', 'Parameterised queries — one line of code', false);

  s.addShape(Shape.roundRect, {
    x: 0.55, y: 1.6, w: 4.35, h: 1.95, rectRadius: 0.06,
    fill: { color: REDBG }, line: { color: 'F0B7B2', width: 1 }
  });
  s.addText('✗  VULNERABLE — paste input into the query', {
    x: 0.75, y: 1.72, w: 4, h: 0.3, fontFace: FONT, fontSize: 11.5, bold: true, color: '9B1C14'
  });
  s.addText(
    'const q = `SELECT * FROM users\n' +
    "  WHERE sn = '${user}'\n" +
    "    AND pw = '${pass}'`;\n" +
    'db.query(q);',
    { x: 0.75, y: 2.05, w: 4, h: 1.35, fontFace: MONO, fontSize: 11.5, color: '6B2019', valign: 'top' }
  );

  s.addShape(Shape.roundRect, {
    x: 5.1, y: 1.6, w: 4.35, h: 1.95, rectRadius: 0.06,
    fill: { color: GREENBG }, line: { color: 'A9DCC3', width: 1 }
  });
  s.addText('✓  SAFE — bind the values as data', {
    x: 5.3, y: 1.72, w: 4, h: 0.3, fontFace: FONT, fontSize: 11.5, bold: true, color: '146C40'
  });
  s.addText(
    'const row = db.prepare(\n' +
    '  \'SELECT * FROM users\n' +
    '   WHERE sn = ? AND pw = ?\'\n' +
    ').get(user, pass);',
    { x: 5.3, y: 2.05, w: 4, h: 1.35, fontFace: MONO, fontSize: 11.5, color: '146C40', valign: 'top' }
  );

  s.addText('The placeholders are sent separately — the database never re-parses them as SQL.', {
    x: 0.55, y: 3.68, w: 8.9, h: 0.36, fontFace: FONT, fontSize: 13.5, bold: true, color: INK
  });

  bullets(s, [
    { t: 'Hash passwords (argon2 / bcrypt) — never store plain text', b: true },
    { t: 'Give the database account only the privileges it needs', b: true },
    { t: 'Show generic error messages to users, log the detail server-side', b: true },
    { t: 'Validate input against an allow-list, and keep a WAF as defence in depth', b: true }
  ], { y: 4.1, fontSize: 13.5, h: 1.1, color: MUTED });

  s.addNotes(
    'The punchline of the whole talk. Show both boxes side by side: the only difference is that the ' +
    'second one sends the query structure and the values separately, so a quote inside a value is ' +
    'just a quote. Parameterised queries (prepared statements) defeat every INJECTION attack in ' +
    'this deck — bypass, UNION and blind alike — because there is no longer any way to make the ' +
    'database treat data as code. ' +
    'NOW SWITCH TO THE LIVE DEMO: the lab panel has an endpoint switch (Vulnerable / ' +
    'Parameterised). Re-run mode 03 against the parameterised endpoint. Same payload, same form, ' +
    'one request, and the panel reports “Nothing was exploited.” Point at the query view: the ' +
    'payload is no longer inside the SQL — it is listed underneath as bound data. ' +
    'Be honest about the limit: switching the endpoint does NOT stop mode 02. Guessing the real ' +
    'password still logs in, because that was never injection. Which is why the next four ' +
    'bullets matter — parameterisation fixes injection; hashing, least privilege, generic errors ' +
    'and allow-lists reduce the blast radius of everything else.'
  );
}

/* =========================================================== SLIDE 15 === */
{
  const s = pptx.addSlide();
  bg(s, NAVY);
  chrome(s, 'Ethics', 'Test only what you are allowed to test', true);
  footer(s, true);

  card(s, 0.55, 1.65, 4.35, 1.5, 'Authorised, always',
    'Written permission, a defined scope, and agreed rules of engagement — for every engagement, no exceptions.', RED);
  card(s, 5.1, 1.65, 4.35, 1.5, 'Your own lab is fair game',
    'Local clones, deliberately vulnerable apps, CTF platforms — practise there, as much as you like.', GREEN);
  card(s, 0.55, 3.3, 4.35, 1.5, 'Everything else is a crime',
    '“I was just curious” is not a defence. Unauthorised access violates the Cybercrime Prevention Act — it can end your career before it starts.', MUTED);
  card(s, 5.1, 3.3, 4.35, 1.5, 'Report, do not exploit',
    'Found something real? Tell the owner privately. Responsible disclosure protects students, staff and your record.', NAVY2);

  s.addText('Practise legally:  PortSwigger Web Security Academy  ·  DVWA  ·  SQLi-Labs  ·  Hack The Box  ·  TryHackMe', {
    x: 0.55, y: 4.95, w: 8.9, h: 0.3, fontFace: MONO, fontSize: 10.5, color: '8FA3CC', align: 'center'
  });

  s.addNotes(
    'Slow down here — this is the most important slide of the session. ' +
    'Everything demonstrated today happened on a local simulation of a login page, on one machine, ' +
    'with no real data. The same payloads pointed at a system you do not own, without written ' +
    'authorisation, is a criminal offence in the Philippines under RA 10175 regardless of intent or ' +
    'harm caused. Encourage the audience to build their own lab and to disclose findings responsibly. ' +
    'Close by naming where they can legally practise.'
  );
}

/* =========================================================== SLIDE 16 === */
{
  const s = pptx.addSlide();
  bg(s, RED);
  s.addText('Recap', {
    x: 0.7, y: 0.7, w: 8.6, h: 0.8, fontFace: FONT, fontSize: 40, bold: true, color: 'FFFFFF'
  });

  const qs = [
    ['Q1', "What does the single quote in  ' OR 1=1--  actually do?"],
    ['Q2', 'Why does blind injection need ~90 requests to recover one password?'],
    ['Q3', 'What is the one-line fix that defeats all four attacks?'],
    ['Q4', 'Which layer is allowed to know the table and column names?']
  ];
  qs.forEach((q, i) => {
    const y = 1.66 + i * 0.62;
    s.addShape(Shape.roundRect, { x: 0.7, y, w: 0.72, h: 0.48, rectRadius: 0.06, fill: { color: 'FFFFFF' } });
    s.addText(q[0], { x: 0.7, y, w: 0.72, h: 0.48, fontFace: FONT, fontSize: 13, bold: true, color: RED, align: 'center', valign: 'middle' });
    s.addText(q[1], { x: 1.6, y, w: 7.7, h: 0.48, fontFace: FONT, fontSize: 15, color: 'FFFFFF', valign: 'middle' });
  });

  s.addShape(Shape.rect, { x: 0.7, y: 4.25, w: 8.6, h: 0.03, fill: { color: 'FFFFFF' } });

  s.addText([
    { text: 'JISSA  ', options: { bold: true, fontSize: 24, color: 'FFFFFF' } },
    { text: '— Junior Information Systems Security Association', options: { fontSize: 15, color: 'FFE0DE' } }
  ], { x: 0.7, y: 4.45, w: 8.6, h: 0.5, fontFace: FONT });

  s.addText('Questions?  ·  Bring your laptop to the hands-on session and break a clone with us.', {
    x: 0.7, y: 4.95, w: 8.6, h: 0.4, fontFace: FONT, fontSize: 13, color: 'FFE0DE'
  });

  s.addNotes(
    'Answers — Q1: it closes the value the app meant to treat as data, so the rest of what you type ' +
    'is parsed as query, and the double dash comments out the password check. ' +
    'Q2: because the only feedback is yes/no, so it is binary search — roughly 7 questions per ' +
    'character plus the length. ' +
    'Q3: a parameterised query / prepared statement (hashing passwords is the bonus answer). ' +
    'Q4: the back end only. The front end should send values and render results — it should never ' +
    'know a table or column name. ' +
    'Then invite questions and mention the hands-on session.'
  );
}

/* --------------------------------------------------------------- write -- */
const OUT = require('node:path').join(__dirname, 'SQL-Injection-101-JISSA.pptx');
pptx.writeFile({ fileName: OUT }).then((file) => {
  console.log('Wrote ' + (file || OUT));
}).catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
