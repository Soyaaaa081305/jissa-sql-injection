# JISSA · SQL Injection Lab

A **locally hosted 1:1 recreation of `mcl.blackboard.com`** with a real, deliberately
vulnerable login — built as a live demonstration of **SQL Injection** for the JISSA
General Assembly.

> ⚠️ **This is a simulation.** It binds to `127.0.0.1` only, it is not reachable from
> your network or the internet, and nothing ever leaves your machine. The page is
> watermarked *JISSA SIMULATION* so it can never be mistaken for the real Blackboard.

---

## Quick start

1. Double-click **`start.bat`**
2. Your browser opens `http://127.0.0.1:8080`
3. Press the **SQL Lab** button (bottom-left) → pick an **endpoint** and a mode → **Run**

Stop the server with `Ctrl+C` in the console window.

**Requirements:** Node.js only (no `npm install` for the lab itself — it uses Node's
built-in HTTP server and built-in SQLite).

---

## What the demo does

The lab panel has an **endpoint switch** at the top — the single most important
control in the demo, because it fires the *identical payload* at two implementations
of the same login:

| Endpoint | Implementation | Result |
|----------|----------------|--------|
| **Vulnerable** — `POST /api/login` | string concatenation | injection works |
| **Parameterised** — `POST /api/login/secure` | `?` placeholders bound as data | injection is blocked |

The vulnerable endpoint runs a query built by concatenation:

```sql
SELECT * FROM users WHERE student_number = '<USER INPUT>' LIMIT 1
```

The parameterised endpoint runs the same *logical* query with placeholders:

```sql
SELECT * FROM users WHERE student_number = ? LIMIT 1
```

The query view shows the difference directly: on the vulnerable endpoint the
payload is highlighted **inside** the SQL text; on the parameterised endpoint the
payload never appears there at all — it is listed underneath as
`bound as data → "..."`.

| # | Mode | Requests | What the audience sees |
|---|------|----------|------------------------|
| 01 | **Blind extraction** | ~85–90 | The password is **read out of the database** one character at a time using only the difference between *"Invalid username."* and *"Invalid password."*. Characters appear in the *Recovered password* field as they are found. |
| 02 | **Password guessing** | ~85 | A dictionary is generated (common passwords + student-number/year/school mutations) and submitted candidate-by-candidate until one is accepted. |
| 03 | **`' OR 1=1--` bypass** | 1 | The classic tautology: the password check is skipped in a single request. |
| 04 | **UNION SELECT dump** | 1 | The whole `users` table is appended to the query result and displayed as a dump. |

**Every mode ends the same way:** the recovered credentials are auto-filled into the
real login form → **Sign In** is pressed → the server validates them → the
**Courses** page loads with a banner:

> SQL injection demonstration complete · boolean blind extraction ·
> 86 requests sent · password: •••

Press **Run again** to sign out and try the next mode.

**The payoff:** run a mode on *Vulnerable* (it succeeds, you get in), then switch the
endpoint to *Parameterised* and run the exact same mode — it stops after one request
and reports *"Nothing was exploited."* Same payload, same form, same server; only the
query construction changed.

---

## Suggested GA talk track (≈5 minutes)

1. **Open the login page.** "This looks exactly like our Blackboard. It is a local
   copy — no real account, no real server." *(point at the SIMULATED badge)*
2. **Log in normally first** with a wrong password. "The site says *Invalid password*."
   Then sign out.
3. **Mode 03 — `' OR 1=1--`** on the **Vulnerable** endpoint (fast opener, 1 request).
   "The attacker didn't guess anything. They changed the *question* the database was asked."
4. **Mode 04 — UNION dump.** "Now they didn't just get in — they took the whole table."
5. **Mode 01 — Blind extraction** (the finale). "Watch the *Recovered password* field.
   The attacker never sees the password. They only ask the database hundreds of
   *yes/no* questions and write down the answers. This is what real attackers do
   when a site shows no output at all."
6. **Mode 02 — Guessing** as a bonus: "…and if injection failed, they'd just try
   every password they can think of."
7. **Switch the endpoint to *Parameterised* and re-run mode 03.** "Same payload, same
   form. Nothing happens." *(point at the query view — the payload is now listed under
   the query as bound data, not inside it.)*
8. **Show the architecture slides.** "Injection only happened because the UI layer
   built the SQL. The front end should send two values and render a result — it
   should never know a table or column name. That lives in the back end, and in
   SSMS." *(This is the part that carries into your Database 2 work: `SqlCommand`
   plus `SqlParameter`, every time.)*
9. **Close on the fix** (slide: parameterised queries) — "One line of code makes all
   four attacks impossible. Note what it does *not* fix: mode 02 still works here,
   because that was never injection — that's why we also hash passwords and rate-limit."

---

## Files

```
SQL Injection/
├─ start.bat                     ← double-click to run
├─ config.json                   ← demo account, port, lab aids
├─ server.js                     ← localhost-only HTTP server (127.0.0.1)
├─ lib/
│   ├─ vulnerable-login.js       ← vulnerable query + the parameterised FIX (both live)
│   └─ seed.js                   ← rebuilds data/lab.db on every boot
├─ public/
│   ├─ index.html                ← 1:1 login screen + the SQL Lab console
│   ├─ courses.html              ← 1:1 post-login Courses screen
│   ├─ css/  login · courses · lab
│   ├─ js/   login · lab · courses
│   └─ img/  scene.svg (campus backdrop) · favicon.svg
├─ tests/api.test.js             ← 31 automated checks (server must be running)
├─ slides/                       ← PowerPoint builder (npm install once)
└─ data/lab.db                   ← disposable SQLite database (recreated on boot)
```

---

## Configuration — `config.json`

```jsonc
{
  "port": 8080,                 // keep in sync with start.bat if you change it
  "openBrowser": true,          // auto-open the browser when the server starts
  "simulatedLatencyMs": 8,      // fake WAN latency so timings look realistic
  "labAids": true,              // guarantees mode 02 can always find the password
  "demoUser": {
    "studentNumber": "2024151326",
    "password": "MapuaMCL2026", // ← CHANGE THIS to your own demo password
    "fullName": "…", "shortName": "…", "email": "…", "role": "Student",
    "program": "BS Information Technology"
  }
}
```

* **Use a demo password, not your real one.** The whole point of the exercise is
  that the recovered password is printed on screen — that is the demonstration.
* Setting `"labAids": false` removes the dictionary shortcut so mode 02 becomes a
  genuinely hard brute-force exercise (mode 01 will still always work).
* The database is **recreated from `config.json` every time the server starts** —
  change the config, restart the server (`Ctrl+C`, `start.bat`).

---

## Verifying it yourself

With the server running:

```
node tests/api.test.js
```

Expected: `31/31 checks passed` — covers the static pages, both boolean responses,
the bypass, the UNION dump, sessions, the parameterised endpoint (all four payload
types blocked, real password still accepted, placeholders shown), and hardening
checks.

---

## Building the PowerPoint

```
cd slides
npm install        ← once
npm run build      ← writes SQL-Injection-101-JISSA.pptx
```

Output: **`slides/SQL-Injection-101-JISSA.pptx`** — 16 slides written for first-year
BS IT students, with speaker notes on every slide. Two of them (12 and 13) cover
layering: what the front end is allowed to know, and why the SQL belongs in the
back end with bound parameters.

---

## Safety notes

* Server binds to **`127.0.0.1`** — `0.0.0.0` is never used, so nothing is exposed
  to Wi-Fi/LAN. Don't change this.
* No outbound network calls, no analytics, no telemetry.
* Vulnerable code lives **only** in `lib/vulnerable-login.js`, heavily commented.
  The corrected parameterised version sits beside it in the same file and is served
  at `POST /api/login/secure`, so the fix can be demonstrated live, not just described.
* The login page title and a fixed on-screen badge both mark it as a simulation.
* **Ethics reminder for the audience:** run this only on this machine. Testing
  SQL injection against systems you do not own or have written permission to test
  is illegal — that is the whole reason JISSA teaches *authorized* testing.
