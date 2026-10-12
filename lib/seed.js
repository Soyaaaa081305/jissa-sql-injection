'use strict';
/* ==========================================================================
   seed.js — creates the disposable SQLite database for the lab.
   The database is recreated from scratch every time the server starts, so
   config.json is always the single source of truth.
   ========================================================================== */
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'lab.db');

function seedDatabase(config) {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Fresh, disposable database on every boot (demo hygiene).
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.rmSync(DB_PATH + suffix); } catch (_) { /* not there yet */ }
  }

  const db = new DatabaseSync(DB_PATH);

  db.exec(`
    CREATE TABLE users (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      student_number TEXT    NOT NULL UNIQUE,
      password       TEXT    NOT NULL,
      full_name      TEXT    NOT NULL,
      email          TEXT,
      role           TEXT,
      program        TEXT
    );
  `);

  const insert = db.prepare(
    'INSERT INTO users (student_number, password, full_name, email, role, program) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const u = config.demoUser;
  // The demo account must be id = 1 so that ' OR 1=1-- lands on it.
  insert.run(
    u.studentNumber,
    u.password,
    u.fullName,
    u.email,
    u.role || 'Student',
    u.program || 'BS Information Technology'
  );

  // Decoy rows — only exist so a UNION dump shows more than one record.
  insert.run('2024100001', 'Spring2026!', 'JUAN DELA CRUZ',
    'jdelacruz@student.mcl.edu.ph', 'Student', 'BS Information Technology');
  insert.run('2024100002', 'Crimson@2026', 'MARIA ISABEL SANTOS',
    'msantos@student.mcl.edu.ph', 'Student', 'BS Computer Science');

  return db;
}

module.exports = { seedDatabase, DB_PATH };
