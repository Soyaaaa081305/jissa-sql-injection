'use strict';
/* ==========================================================================
   !!!  DELIBERATELY VULNERABLE  —  JISSA EDUCATIONAL LAB ONLY  !!!
   !!!  NEVER COPY THIS PATTERN INTO REAL SOFTWARE.              !!!
   --------------------------------------------------------------------------
   Why it is vulnerable
   ---------------------------------------------------------------------------
   User input is glued straight into the SQL text with string concatenation.
   The database cannot tell the difference between "data" and "instructions",
   so an attacker can close the quote early and add their own SQL.

       SELECT * FROM users WHERE student_number = '<USER INPUT>'

   becomes, for the payload   ' OR 1=1--

       SELECT * FROM users WHERE student_number = '' OR 1=1--

   The fixed version (parameterised query / prepared statement) is shown at
   the bottom of this file — that is the fix you should teach.
   ========================================================================== */

/**
 * Step 1 — look the account up. VULNERABLE: username is concatenated.
 * Step 2 — check the password.   VULNERABLE: password is concatenated.
 *
 * The two-step shape is what gives the demo its boolean side-channel:
 *   - no row found  -> "Invalid username."
 *   - row, bad pass -> "Invalid password."
 * Those two different responses are exactly what a blind SQLi attacker
 * measures (response text / response length) to read data bit by bit.
 */
function runLogin(db, username, password) {
  // ---- STEP 1: username lookup (string concatenation = SQL injection) -----
  const q1 = `SELECT * FROM users WHERE student_number = '${username}' LIMIT 1`;
  let user;
  try {
    user = db.prepare(q1).get();
  } catch (err) {
    // Verbose database errors are their own vulnerability (error-based SQLi).
    return { ok: false, error: `Database error: ${err.message}`, query: q1 };
  }

  if (!user) {
    return { ok: false, error: 'Invalid username.', query: q1, query1: q1 };
  }

  // ---- STEP 2: password check (string concatenation = SQL injection) ------
  const q2 = `SELECT * FROM users WHERE id = ${user.id} AND password = '${password}' LIMIT 1`;
  let row;
  try {
    row = db.prepare(q2).get();
  } catch (err) {
    return { ok: false, error: `Database error: ${err.message}`, query: q2 };
  }

  if (!row) {
    return { ok: false, error: 'Invalid password.', query: q2, query1: q1 };
  }

  // NOTE: we sign in as the row returned by STEP 1, not by STEP 2. That is
  // what makes a UNION SELECT payload able to forge an entire user object.
  return { ok: true, user, query: q2, query1: q1 };
}

/* ==========================================================================
   THE FIX — the same two steps written with placeholders (?).

   A placeholder is bound as *data*. The SQL parser never sees the value, so
   closing a quote and writing `OR 1=1--` inside it is just a weird password
   string, never an instruction.

   Served at POST /api/login/secure so the demo can fire the same payload at
   both endpoints and show it fail here.

   Also note what the fix does NOT stop: guessing a real password still works
   (that is what hashing + rate limiting are for). It stops injection.
   ========================================================================== */

function runLoginSecure(db, username, password) {
  const q1 = 'SELECT * FROM users WHERE student_number = ? LIMIT 1';
  let user;
  try {
    user = db.prepare(q1).get(username);          // username bound as data
  } catch (err) {
    return { ok: false, error: 'Invalid username.', query: q1, bound: [username] };
  }

  if (!user) {
    return { ok: false, error: 'Invalid username.', query: q1, bound: [username] };
  }

  const q2 = 'SELECT * FROM users WHERE id = ? AND password = ? LIMIT 1';
  let row;
  try {
    row = db.prepare(q2).get(user.id, password);  // password bound as data
  } catch (err) {
    return { ok: false, error: 'Invalid password.', query: q2, bound: [user.id, password] };
  }

  if (!row) {
    return { ok: false, error: 'Invalid password.', query: q2, bound: [user.id, password] };
  }

  return { ok: true, user, query: q2, bound: [user.id, password] };
}

module.exports = { runLogin, runLoginSecure };
