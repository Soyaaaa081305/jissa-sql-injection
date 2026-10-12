/* ==========================================================================
   mcl.blackboard.com — post-login application (1:1 recreation for JISSA)
   Everything below is a local simulation: no data leaves 127.0.0.1.
   ========================================================================== */
(function () {
  'use strict';

  const main = document.getElementById('main');
  const title = document.getElementById('bbTitle');
  const toastEl = document.getElementById('bbToast');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gid = () => 'g' + Math.random().toString(36).slice(2, 8);

  let session = null;
  let toastTimer = null;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3000);
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-toast]');
    if (t) { e.preventDefault(); toast(t.dataset.toast); }
  });

  /* ======================================================== course data === */
  const COURSES = [
    {
      id: 'cs125l', code: 'CS125L.CIS341.1T.26.27', term: '1T AY2026-2027',
      title: 'ARCHITECTURE AND ORGANIZATION (LABORATORY)-Section CIS341',
      teacher: 'Dennis Martillano', banner: 'forest', grade: '1.25'
    },
    {
      id: 'ccna', code: 'CCNA171P-2.CIS341.1T.26.27', term: '1T AY2026-2027',
      title: 'CCNA171P-2.CIS341 - CCNA ROUTING AND SWITCHING 2 | M 0500-0615P V035, F…',
      teacher: 'Leonnel De Mesa', grade: '1.50',
      banner: { big: 'CCNA171P-2.CIS341', align: 'right', crest: true,
                red: ['CCNA: Switching, Routing,', 'and Wireless Essentials'],
                foot: 'College of Computer and Information Science' }
    },
    {
      id: 'cs125', code: 'CS125.CIS341.1T.26.27', term: '1T AY2026-2027',
      title: 'CS125-CIS341: ARCHITECTURE AND ORGANIZATION',
      teacher: 'Belen Ladesma', banner: 'meadow', link: true, grade: '1.75'
    },
    {
      id: 'it190', code: 'IT190-1.CIS341.1T.26.27', term: '1T AY2026-2027',
      title: 'ETHICAL HACKING-Section CIS341',
      teacher: 'Leonnel De Mesa', banner: 'sunset', grade: '1.00'
    },
    {
      id: 'it129', code: 'IT129.CIS341.1T.26.27', term: '1T AY2026-2027',
      title: 'IT129.CIS341 - INFORMATION ASSURANCE AND SECURITY | M 1045-0115P E402 | T…',
      teacher: 'Leonnel De Mesa', grade: '1.25',
      banner: { big: 'IT129.CIS341', align: 'right', crest: true,
                red: ['Information Assurance and Security 2'],
                foot: 'College of Computer and Information Science' }
    },
    {
      id: 'veo33', code: 'VEO33.MET301.1T.26.27', term: '1T AY2026-2027',
      title: 'LEADERSHIP AND ETHICAL RESPONSIBILITY-Section MET301',
      teacher: 'Marjorie Caridad', grade: '1.25',
      banner: { big: 'VEO33 [MET301] MON | 1:15 – 2:45', align: 'left', crest: false,
                red: ['Leadership and Ethical Responsibility'], band: true }
    },
    {
      id: 'cs151', code: 'CS151.CIS301.1T.26.27', term: '1T AY2026-2027',
      title: 'OPERATING SYSTEMS-Section CIS301- 3:45 PM - 5:00 PM @ E311 / MWF',
      teacher: 'Aurelia Sharlene Delos Santos', grade: '2.00',
      banner: { big: 'CS151', align: 'right', crest: true,
                red: ['Operating Systems'],
                foot: 'College of Computer and Information Science' }
    },
    {
      id: 'ss036', code: 'SS036.CIS341.1T.26.27', term: '1T AY2026-2027',
      title: 'SCIENCE, TECHNOLOGY AND SOCIETY-Section CIS341',
      teacher: 'Imelda Cariño', grade: '1.25',
      banner: { big: 'SS036', align: 'right', crest: true, band: true,
                red: ['Science, Technology and Society'] }
    }
  ];

  const STARRED = Object.create(null);

  /* ========================================================== banners ===== */
  function crest(x, y, s) {
    return `<g transform="translate(${x},${y}) scale(${s})">
      <path d="M-22 1c2 13 11 21 22 25 11-4 20-12 22-25" fill="none" stroke="#e2231a" stroke-width="3" stroke-linecap="round"/>
      <path d="M0 -24 L18 -17 L18 2 C18 14 8 23 0 27 C-8 23 -18 14 -18 2 L-18 -17 Z" fill="#fff" stroke="#1b3f7a" stroke-width="2.4"/>
      <path d="M0 -18 L13 -13 L13 1 C13 10 6 16 0 19 C-6 16 -13 10 -13 1 L-13 -13 Z" fill="#e2231a"/>
      <path d="M-6 10 L-6 -7 L0 -2 L6 -7 L6 10" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
  }

  function bannerTitle(o) {
    const g = gid();
    const anchor = o.align === 'left' ? 'start' : 'end';
    const x = o.align === 'left' ? 10 : 310;
    const bigSize = o.big.length > 24 ? 11.5 : (o.big.length > 14 ? 14 : 17);
    const redLines = (o.red || []).map((t, i) =>
      `<text x="${x}" y="${58 + i * 15}" text-anchor="${anchor}" font-size="12.5" font-weight="800" fill="#e2231a">${esc(t)}</text>`
    ).join('');
    return `<svg viewBox="0 0 320 130" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="130" fill="#ffffff"/>
      <rect width="320" height="130" fill="none" stroke="#ececec"/>
      ${o.crest ? crest(24, 30, 0.5) : ''}
      ${o.crest ? `<text x="44" y="16" font-size="6.4" font-weight="700" fill="#b8322a" letter-spacing=".2">MAPÚÁ MALAYAN COLLEGES LAGUNA</text>
                   <rect x="8" y="44" width="96" height="3" fill="#e2231a"/>` : ''}
      <text x="${x}" y="${o.crest ? 30 : 34}" text-anchor="${anchor}" font-size="${bigSize}"
            font-weight="800" fill="#12325c" font-family="Segoe UI,Arial,sans-serif">${esc(o.big)}</text>
      ${redLines}
      ${o.foot ? `<text x="${x}" y="104" text-anchor="${anchor}" font-size="6.6" fill="#7c7c7c">${esc(o.foot)}</text>` : ''}
      ${o.band ? `<rect y="110" width="320" height="20" fill="#f2f4f7"/>
                  <text x="160" y="123" text-anchor="middle" font-size="6.2" fill="#9aa3ad" letter-spacing=".5">CENTRALIZED COURSE CONTENT AND CONSTRUCTION</text>` : ''}
      <rect x="0" y="129" width="320" height="1" fill="#e9ecef"/>
      <defs><linearGradient id="${g}v" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(255,255,255,0)"/><stop offset="1" stop-color="rgba(0,0,0,.05)"/>
      </linearGradient></defs>
      <rect width="320" height="130" fill="url(#${g}v)"/>
    </svg>`;
  }

  function bannerForest() {
    const g = gid();
    return `<svg viewBox="0 0 320 130" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a8cf7c"/><stop offset="55%" stop-color="#4e8a4b"/><stop offset="1" stop-color="#1d4128"/>
      </linearGradient></defs>
      <rect width="320" height="130" fill="url(#${g})"/>
      <g fill="#2f6237" opacity=".85">
        <ellipse cx="40" cy="34" rx="46" ry="30"/><ellipse cx="120" cy="24" rx="52" ry="28"/>
        <ellipse cx="210" cy="34" rx="56" ry="30"/><ellipse cx="296" cy="26" rx="48" ry="26"/>
      </g>
      <g fill="#1b4028" opacity=".8">
        <ellipse cx="76" cy="58" rx="44" ry="24"/><ellipse cx="176" cy="54" rx="50" ry="26"/>
        <ellipse cx="264" cy="62" rx="46" ry="24"/>
      </g>
      <g fill="#6b4a2b">
        <rect x="52" y="58" width="7" height="72"/><rect x="146" y="54" width="8" height="76"/>
        <rect x="238" y="60" width="7" height="70"/><rect x="292" y="66" width="6" height="64"/>
      </g>
      <path d="M0 104h320v26H0z" fill="#2a3d22"/>
      <g stroke="#c9e6a0" stroke-width="2" opacity=".35">
        <path d="M10 0 L64 130"/><path d="M96 0 L150 130"/><path d="M188 0 L242 130"/>
      </g>
    </svg>`;
  }

  function bannerMeadow() {
    const g = gid();
    return `<svg viewBox="0 0 320 130" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8fc4e8"/><stop offset="70%" stop-color="#d9edf7"/><stop offset="1" stop-color="#f4f8ea"/>
      </linearGradient></defs>
      <rect width="320" height="130" fill="url(#${g})"/>
      <g fill="#ffffff" opacity=".7"><ellipse cx="70" cy="26" rx="42" ry="13"/><ellipse cx="230" cy="18" rx="52" ry="12"/></g>
      <path d="M0 84c40-16 78 6 120-4s70-22 116-12 60 6 84 0v62H0z" fill="#7fae4e"/>
      <path d="M0 100c50-10 92 8 146 2s96-16 174-6v34H0z" fill="#5d9038"/>
      <g fill="#37632c">
        <ellipse cx="44" cy="66" rx="30" ry="24"/><ellipse cx="96" cy="72" rx="24" ry="19"/>
        <ellipse cx="256" cy="62" rx="34" ry="26"/><ellipse cx="304" cy="74" rx="26" ry="20"/>
      </g>
      <g fill="#4e3b25"><rect x="41" y="80" width="6" height="24"/><rect x="253" y="78" width="7" height="26"/></g>
    </svg>`;
  }

  function bannerSunset() {
    const g = gid();
    return `<svg viewBox="0 0 320 130" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2f4f7a"/><stop offset="45%" stop-color="#8a7fa8"/>
        <stop offset="72%" stop-color="#e0a35c"/><stop offset="1" stop-color="#f2d79a"/>
      </linearGradient></defs>
      <rect width="320" height="130" fill="url(#${g})"/>
      <circle cx="238" cy="78" r="20" fill="#ffd68a" opacity=".9"/>
      <path d="M0 88c46-8 84 4 128 0s86-14 192-6v48H0z" fill="#3d3346"/>
      <path d="M0 104c60-6 108 6 172 2s90-8 148-4v28H0z" fill="#241f31"/>
      <g fill="#1d1a29">
        <ellipse cx="52" cy="70" rx="26" ry="20"/><rect x="49" y="76" width="6" height="26"/>
        <ellipse cx="120" cy="76" rx="20" ry="15"/><rect x="117" y="82" width="5" height="22"/>
      </g>
      <g stroke="#171426" stroke-width="2" opacity=".8">
        <path d="M10 130 L44 96"/><path d="M22 130 L56 100"/><path d="M296 130 L266 100"/>
      </g>
    </svg>`;
  }

  function bannerHtml(course) {
    const b = course.banner;
    if (b === 'forest') return bannerForest();
    if (b === 'meadow') return bannerMeadow();
    if (b === 'sunset') return bannerSunset();
    return bannerTitle(b);
  }

  /* ============================================================ icons ===== */
  const ICO = {
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-5"/><path d="M12 8h.01"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>'
  };

  /* ==================================================== courses view ====== */
  const filters = { q: '', term: '1T AY2026-2027', scope: 'Courses I am taking', per: '25', layout: 'grid' };

  function demoBannerHtml() {
    let raw = null;
    try { raw = sessionStorage.getItem('jissa:demo'); } catch (_) {}
    if (!raw) return '';
    let d;
    try { d = JSON.parse(raw); } catch (_) { return ''; }
    const MODE_LABEL = {
      blind: 'boolean blind extraction',
      guess: 'password guessing',
      bypass: "' OR 1=1 tautology bypass",
      union: 'UNION SELECT dump',
      manual: 'manual sign-in'
    };
    const bits = [];
    if (d.mode && d.mode !== 'manual') bits.push(MODE_LABEL[d.mode] || d.mode);
    if (d.endpoint === 'fixed') bits.push('parameterised endpoint');
    if (d.probes) bits.push(d.probes + (d.probes === 1 ? ' request' : ' requests') + ' sent');
    if (d.recovered) bits.push('password: ' + d.recovered);
    return `<div class="demo-banner">
      <b><svg viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 8.5l3.2 3.2L13 5"/></svg>SQL injection demonstration complete</b>
      <span>${esc(bits.join('  ·  ') || 'signed in')}</span>
      <button type="button" class="again" id="runAgain">Run again</button>
    </div>`;
  }

  function viewCourses() {
    title.textContent = 'Courses';
    main.innerHTML = `
      ${demoBannerHtml()}
      <div class="toolbar">
        <div class="view-toggle">
          <button type="button" id="tglList" title="List view">${ICO.list}</button>
          <button type="button" class="is-on" id="tglGrid" title="Grid view">${ICO.grid}</button>
        </div>
        <div class="search">
          ${ICO.search}
          <input type="search" id="q" placeholder="Search your courses" value="${esc(filters.q)}">
        </div>
        <div class="sel-out">
          <span>Terms</span>
          <select id="termSel">
            <option${filters.term === '1T AY2026-2027' ? ' selected' : ''}>1T AY2026-2027</option>
            <option${filters.term === '2T AY2025-2026' ? ' selected' : ''}>2T AY2025-2026</option>
            <option${filters.term === 'All terms' ? ' selected' : ''}>All terms</option>
          </select>
        </div>
        <div class="sel-out">
          <span>Filters</span>
          <select id="scopeSel">
            <option${filters.scope === 'Courses I am taking' ? ' selected' : ''}>Courses I am taking</option>
            <option${filters.scope === 'Courses I am teaching' ? ' selected' : ''}>Courses I am teaching</option>
            <option${filters.scope === 'All courses' ? ' selected' : ''}>All courses</option>
          </select>
        </div>
        <div class="per-page">
          <select id="perSel">
            <option>25</option><option>50</option><option>100</option>
          </select>
          <span>items per page</span>
        </div>
      </div>

      <div class="results">
        <span id="resultCount">8 results</span>
        <span class="chip" id="chipTerm">${esc(filters.term)} <button type="button" aria-label="Remove">×</button></span>
        <span class="chip" id="chipScope">${esc(filters.scope)} <button type="button" aria-label="Remove">×</button></span>
      </div>

      <div class="grid" id="courseGrid"></div>`;

    document.getElementById('q').addEventListener('input', (e) => {
      filters.q = e.target.value;
      renderGrid();
    });
    document.getElementById('termSel').addEventListener('change', (e) => {
      filters.term = e.target.value;
      document.getElementById('chipTerm').firstChild.textContent = filters.term + ' ';
      renderGrid();
    });
    document.getElementById('scopeSel').addEventListener('change', (e) => {
      filters.scope = e.target.value;
      document.getElementById('chipScope').firstChild.textContent = filters.scope + ' ';
      renderGrid();
    });
    document.getElementById('perSel').addEventListener('change', (e) => {
      filters.per = e.target.value;
      renderGrid();
    });
    document.getElementById('chipTerm').querySelector('button').addEventListener('click', () => {
      filters.term = 'All terms';
      document.getElementById('termSel').value = 'All terms';
      document.getElementById('chipTerm').firstChild.textContent = 'All terms ';
      renderGrid();
    });
    document.getElementById('chipScope').querySelector('button').addEventListener('click', () => {
      filters.scope = 'All courses';
      document.getElementById('scopeSel').value = 'All courses';
      document.getElementById('chipScope').firstChild.textContent = 'All courses ';
      renderGrid();
    });

    const tglGrid = document.getElementById('tglGrid');
    const tglList = document.getElementById('tglList');
    tglGrid.addEventListener('click', () => {
      filters.layout = 'grid';
      tglGrid.classList.add('is-on'); tglList.classList.remove('is-on');
      renderGrid();
    });
    tglList.addEventListener('click', () => {
      filters.layout = 'list';
      tglList.classList.add('is-on'); tglGrid.classList.remove('is-on');
      renderGrid();
    });

    const again = document.getElementById('runAgain');
    if (again) {
      again.addEventListener('click', async () => {
        try { sessionStorage.removeItem('jissa:demo'); await fetch('/api/logout', { method: 'POST' }); } catch (_) {}
        window.location.href = '/';
      });
    }

    renderGrid();
  }

  function renderGrid() {
    const grid = document.getElementById('courseGrid');
    if (!grid) return;
    const q = filters.q.trim().toLowerCase();
    const list = COURSES.filter((c) => {
      if (filters.term !== 'All terms' && c.term !== filters.term) return false;
      if (filters.scope === 'Courses I am teaching') return false;
      if (!q) return true;
      return (c.title + ' ' + c.code + ' ' + c.teacher).toLowerCase().includes(q);
    });

    const count = document.getElementById('resultCount');
    if (count) count.textContent = list.length + ' result' + (list.length === 1 ? '' : 's');

    grid.className = 'grid' + (filters.layout === 'list' ? ' is-list' : '');
    grid.innerHTML = list.length ? list.map(cardHtml).join('')
      : `<div class="empty">No courses match “${esc(filters.q)}” in ${esc(filters.term)}.</div>`;

    grid.querySelectorAll('.cc').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.cc-icons')) return;
        openCourse(card.dataset.id);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') openCourse(card.dataset.id);
      });
    });
    grid.querySelectorAll('.cc-icons > span').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.dataset.act === 'star') {
          const id = btn.closest('.cc').dataset.id;
          STARRED[id] = !STARRED[id];
          btn.toggleAttribute('data-on', STARRED[id]);
          toast(STARRED[id] ? 'Course added to favourites.' : 'Course removed from favourites.');
        } else {
          toast('Course information is not part of this simulation.');
        }
      });
    });
  }

  function cardHtml(c) {
    return `<article class="cc" data-id="${c.id}" tabindex="0">
      <div class="cc-img">${bannerHtml(c)}</div>
      <div class="cc-body">
        <div class="cc-code">${esc(c.code)}</div>
        <div class="cc-title${c.link ? ' is-link' : ''}">${esc(c.title)}</div>
        <div class="cc-open">Open</div>
        <div class="cc-foot">
          <span class="cc-teacher">${esc(c.teacher)}</span>
          <span class="cc-icons">
            <span data-act="info">${ICO.info}</span>
            <span data-act="star"${STARRED[c.id] ? ' data-on' : ''}>${ICO.star}</span>
          </span>
        </div>
      </div>
    </article>`;
  }

  /* ==================================================== course detail ===== */
  function openCourse(id) {
    const c = COURSES.find((x) => x.id === id);
    if (!c) return;
    title.textContent = 'Course';
    main.innerHTML = `
      <button type="button" class="back" id="backBtn">← Back to Courses</button>
      <div class="course-head">
        <div class="banner">${bannerHtml(c)}</div>
        <div>
          <div class="cc-code">${esc(c.code)}</div>
          <h2>${esc(c.title)}</h2>
          <div class="meta">${esc(c.teacher)} · Open · ${esc(c.term)}</div>
        </div>
      </div>
      <div class="tabs" id="courseTabs">
        <button type="button" class="is-on" data-tab="content">Course Content</button>
        <button type="button" data-tab="announcements">Announcements</button>
        <button type="button" data-tab="grades">Grades</button>
        <button type="button" data-tab="discussions">Discussions</button>
      </div>
      <div id="tabBody"></div>`;

    document.getElementById('backBtn').addEventListener('click', viewCourses);
    const tabs = document.getElementById('courseTabs');
    const body = document.getElementById('tabBody');
    const paint = (which) => {
      body.innerHTML = courseTab(c, which);
      tabs.querySelectorAll('button').forEach((b) =>
        b.classList.toggle('is-on', b.dataset.tab === which));
    };
    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) paint(b.dataset.tab);
    });
    paint('content');
    window.scrollTo(0, 0);
  }

  function courseTab(c, which) {
    if (which === 'announcements') {
      return `<div class="view"><div class="panel-card">
        <div class="announce"><span class="who">${esc(c.teacher.split(' ')[0][0] + (c.teacher.split(' ')[1] || '')[0])}</span>
          <div><h4>Week 5 — Midterm assessment window</h4>
          <p>The midterm examination is now open in the proctored quiz window. Bring your school ID.</p>
          <time>Oct 6, 2026</time></div></div>
        <div class="announce"><span class="who">${esc(c.teacher.split(' ')[0][0] + (c.teacher.split(' ')[1] || '')[0])}</span>
          <div><h4>Welcome to ${esc(c.code)}</h4>
          <p>Please read the syllabus and check the course content area for Week 1 materials.</p>
          <time>Sep 28, 2026</time></div></div>
      </div></div>`;
    }
    if (which === 'grades') {
      return `<div class="view"><div class="panel-card" style="padding:0">
        <table class="data">
          <thead><tr><th>Item</th><th>Category</th><th class="num">Score</th><th class="num">Out of</th></tr></thead>
          <tbody>
            <tr><td>M1 Assessment</td><td>Test</td><td class="num">42</td><td class="num">50</td></tr>
            <tr><td>Lab 1 — Assembly basics</td><td>Assignment</td><td class="num">18</td><td class="num">20</td></tr>
            <tr><td>Lab 2 — Memory addressing</td><td>Assignment</td><td class="num">19</td><td class="num">20</td></tr>
            <tr><td>Participation</td><td>Participation</td><td class="num">10</td><td class="num">10</td></tr>
          </tbody>
        </table></div>
        <div class="panel-card" style="margin-top:16px"><h3>Current grade</h3>
        <p style="margin:0;font-size:26px;font-weight:700">${esc(c.grade)} <span style="font-size:13px;font-weight:400;color:#777">· 89 / 100</span></p></div>
      </div>`;
    }
    if (which === 'discussions') {
      return `<div class="view"><div class="panel-card">
        <table class="data">
          <thead><tr><th>Forum</th><th>Threads</th><th>Posts</th><th>Last post</th></tr></thead>
          <tbody>
            <tr><td>General questions</td><td class="num">14</td><td class="num">52</td><td>Oct 11, 2026</td></tr>
            <tr><td>Assignment help</td><td class="num">23</td><td class="num">96</td><td>Oct 12, 2026</td></tr>
            <tr><td>Off-topic</td><td class="num">7</td><td class="num">31</td><td>Oct 9, 2026</td></tr>
          </tbody>
        </table></div></div>`;
    }
    return `<div class="view">
      <div class="panel-card"><h3>Module 1 — Foundations</h3>
        <ul>
          <li>Syllabus and course policies</li>
          <li>Week 1 lecture slides</li>
          <li>Lab 1 worksheet (due Oct 9)</li>
        </ul></div>
      <div class="panel-card"><h3>Module 2 — Core concepts</h3>
        <ul>
          <li>Week 3 lecture recording</li>
          <li>Reading: chapters 4 – 6</li>
          <li>M1 Assessment (opens Oct 7)</li>
        </ul></div>
      <div class="panel-card"><h3>Resources</h3>
        <ul><li>Virtual laboratory access</li><li>Style guide and formatting template</li></ul></div>
    </div>`;
  }

  /* ======================================================= other views ==== */
  function viewInstitution() {
    title.textContent = 'Institution Page';
    main.innerHTML = `<div class="view">
      <h2 class="vh">Announcements</h2>
      <p class="lead">Messages from the Office of the Vice Chancellor for Academic Affairs.</p>
      <div class="panel-card">
        <div class="announce"><span class="who">MCL</span><div>
          <h4>Enrolment for 2T AY2026-2027 opens November 3</h4>
          <p>Please clear all holds in the registrar before your scheduled enrolment slot.</p>
          <time>Oct 9, 2026</time></div></div>
        <div class="announce"><span class="who">MCL</span><div>
          <h4>Library hours extended during midterm week</h4>
          <p>The learning resource centre will stay open until 10:00 PM from October 5 to 16.</p>
          <time>Oct 3, 2026</time></div></div>
      </div>
      <div class="panel-card"><h3>Quick links</h3>
        <ul><li>Student handbook</li><li>Academic calendar</li><li>Registrar's office</li><li>Career services</li></ul>
      </div></div>`;
  }

  function viewActivity() {
    title.textContent = 'Activity';
    const rows = [
      ['Grade posted', 'IT190-1 — Quiz 2: Reconnaissance', '2 hours ago', true],
      ['Due soon', 'Fixed Point and Floating Point in Computer Architecture', 'due Oct 13', false],
      ['New content', 'CS151 — Module 4: Deadlock', 'yesterday', false],
      ['Message', 'Leonnel De Mesa replied in Assignment help', 'yesterday', true],
      ['Due', 'IT129 — Lab 3: Access control lists', 'due Oct 16', false]
    ];
    main.innerHTML = `<div class="view"><h2 class="vh">Activity stream</h2>
      <p class="lead">Everything that happened in your courses recently.</p>
      <div class="panel-card">${rows.map((r) => `
        <div class="announce"><span class="who" style="background:${r[3] ? '#1a66c9' : '#7a7a7a'}">${r[0][0]}</span>
          <div><h4>${esc(r[1])}</h4><p>${esc(r[0])}</p><time>${esc(r[2])}</time></div></div>`).join('')}
      </div></div>`;
  }

  function viewOrganizations() {
    title.textContent = 'Organizations';
    main.innerHTML = `<div class="view"><h2 class="vh">Organizations</h2>
      <p class="lead">Organisations you belong to outside of your courses.</p>
      <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        ${[['JISSA', 'Junior Information Systems Security Association', 'Adviser: Faculty'],
           ['CSS', 'Computer Science Society', 'Adviser: Faculty'],
           ['SKETS', 'Mapúa Student Chapters', 'Adviser: Faculty']].map((o) => `
        <article class="cc"><div class="cc-img">${bannerTitle({
          big: o[0], align: 'left', crest: false, red: [o[1]], foot: o[2], band: true })}</div>
          <div class="cc-body"><div class="cc-code">ORG.${o[0]}.AY2026</div>
          <div class="cc-title">${esc(o[1])}</div><div class="cc-open">Open</div></div></article>`).join('')}
      </div></div>`;
  }

  function viewCalendar() {
    title.textContent = 'Calendar';
    const events = {
      7: ['M1 Assessment', 'late'], 13: ['Architecture paper'],
      15: ['JISSA general assembly'], 20: ['Lab 3 due'],
      27: ['Ethical hacking demo'], 30: ['Leadership reflection']
    };
    const heads = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    let cells = heads.map((h) => `<div class="head">${h}</div>`).join('');
    for (let i = 0; i < 3; i++) cells += `<div class="out">${27 + i}</div>`;
    for (let d = 1; d <= 31; d++) {
      const ev = events[d];
      cells += `<div>${d}${ev ? `<span class="ev ${ev[1] || ''}">${esc(ev[0])}</span>` : ''}</div>`;
    }
    for (let i = 1; i <= 1; i++) cells += `<div class="out">${i}</div>`;
    main.innerHTML = `<div class="view"><h2 class="vh">October 2026</h2>
      <p class="lead">Institution and course events.</p>
      <div class="cal">${cells}</div></div>`;
  }

  function viewMessages() {
    title.textContent = 'Messages';
    const rows = [
      ['Leonnel De Mesa', 'Re: Question about the routing lab', '11:04 AM', true],
      ['Belen Ladesma', 'M1 assessment is now open', 'Yesterday', true],
      ['JISSA', 'General assembly agenda for October', 'Oct 10', false],
      ['Registrar', 'Enrolment schedule for 2T', 'Oct 9', false],
      ['Aurelia Sharlene Delos Santos', 'Lab 3 seating assignment', 'Oct 8', false]
    ];
    main.innerHTML = `<div class="view"><h2 class="vh">Inbox</h2>
      <p class="lead">Messages from instructors and organisations.</p>
      <div class="panel-card" style="padding:6px 8px">
        ${rows.map((r) => `<div class="msg-row${r[3] ? ' unread' : ''}">
          <span class="dot${r[3] ? '' : ' read'}"></span>
          <div style="min-width:0"><h4>${esc(r[0])}</h4><p>${esc(r[1])}</p></div>
          <time>${esc(r[2])}</time></div>`).join('')}
      </div></div>`;
    main.querySelectorAll('.msg-row').forEach((r) =>
      r.addEventListener('click', () => toast('Reading messages is not part of this simulation.')));
  }

  function viewGrades() {
    title.textContent = 'Grades';
    main.innerHTML = `<div class="view"><h2 class="vh">My grades</h2>
      <p class="lead">1T AY2026-2027 · grading period: 1st semester</p>
      <div class="panel-card" style="padding:0">
        <table class="data">
          <thead><tr><th>Course</th><th>Instructor</th><th class="num">Grade</th><th>Status</th></tr></thead>
          <tbody>${COURSES.map((c) => `<tr>
            <td>${esc(c.title)}</td><td>${esc(c.teacher)}</td>
            <td class="num">${esc(c.grade)}</td><td>In progress</td></tr>`).join('')}
          </tbody>
        </table></div></div>`;
  }

  function viewAssist() {
    title.textContent = 'Assist';
    main.innerHTML = `<div class="view"><h2 class="vh">Assist</h2>
      <p class="lead">Quick help for common student tasks.</p>
      <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
        ${['Reset my password', 'Check my enrolment status', 'Report a course problem',
           'Accessibility services', 'Download the mobile app', 'Contact technical support']
          .map((t) => `<div class="panel-card" style="margin:0;cursor:pointer" data-toast="Not part of this simulation.">
            <h3 style="margin:0">${esc(t)}</h3></div>`).join('')}
      </div></div>`;
  }

  function viewTools() {
    title.textContent = 'Tools';
    main.innerHTML = `<div class="view"><h2 class="vh">Tools</h2>
      <p class="lead">External tools available to your account.</p>
      <div class="panel-card" style="padding:0">
        <table class="data">
          <thead><tr><th>Tool</th><th>Description</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Panopto</td><td>Lecture recordings</td><td>Available</td></tr>
            <tr><td>Respondus LockDown</td><td>Proctored quizzes</td><td>Available</td></tr>
            <tr><td>Turnitin</td><td>Originality checking</td><td>Available</td></tr>
            <tr><td>Virtual lab</td><td>Remote laboratory desktops</td><td>Available</td></tr>
          </tbody>
        </table></div></div>`;
    main.querySelectorAll('[data-toast]').forEach((n) => n.addEventListener('click', () => {}));
  }

  /* ============================================================ router ==== */
  const ROUTES = {
    courses: viewCourses, institution: viewInstitution, activity: viewActivity,
    organizations: viewOrganizations, calendar: viewCalendar, messages: viewMessages,
    grades: viewGrades, assist: viewAssist, tools: viewTools
  };

  function go(view) {
    const fn = ROUTES[view] || viewCourses;
    document.querySelectorAll('.side-nav button').forEach((b) =>
      b.classList.toggle('is-active', b.dataset.view === view));
    fn();
    window.scrollTo(0, 0);
  }

  document.querySelectorAll('[data-view]').forEach((b) => {
    b.addEventListener('click', (e) => { e.preventDefault(); go(b.dataset.view); });
  });

  /* to-do collapse */
  document.querySelectorAll('.todo-head').forEach((h) => {
    h.addEventListener('click', () => h.closest('.todo-sec').classList.toggle('is-closed'));
  });

  /* sign out */
  document.getElementById('signOut').addEventListener('click', async () => {
    try { sessionStorage.removeItem('jissa:demo'); await fetch('/api/logout', { method: 'POST' }); } catch (_) {}
    window.location.href = '/';
  });

  /* ============================================================ boot ====== */
  (async function boot() {
    try {
      const res = await fetch('/api/session');
      if (!res.ok) { window.location.href = '/'; return; }
      session = (await res.json()).user;
    } catch (_) {
      main.innerHTML = '<div class="loading">Cannot reach the local lab server. Run start.bat first.</div>';
      return;
    }

    const name = session.full_name || 'Student';
    document.getElementById('sideName').textContent = name;
    document.getElementById('avatar').textContent =
      name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

    go('courses');
  })();
})();
