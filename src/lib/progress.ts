import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.PYTHIA_DB_PATH ?? './data/progress.db';

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS progress (
      lesson_slug TEXT PRIMARY KEY,
      completed_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_slug TEXT NOT NULL,
      verdict TEXT NOT NULL,
      at TEXT NOT NULL
    );
  `);
  return db;
}

export function recordAttempt(slug: string, verdict: string): void {
  const now = new Date().toISOString();
  const d = getDb();
  d.prepare('INSERT INTO attempts (lesson_slug, verdict, at) VALUES (?, ?, ?)').run(
    slug,
    verdict,
    now,
  );
  if (verdict === 'Accepted') {
    const attempts = d
      .prepare('SELECT COUNT(*) AS count FROM attempts WHERE lesson_slug = ?')
      .get(slug) as { count: number };
    d.prepare(
      `INSERT INTO progress (lesson_slug, completed_at, attempts)
       VALUES (?, ?, ?)
       ON CONFLICT(lesson_slug) DO UPDATE SET
         completed_at = excluded.completed_at,
         attempts = excluded.attempts`,
    ).run(slug, now, attempts.count);
  }
}

export function completedSlugs(): Set<string> {
  const rows = getDb()
    .prepare('SELECT lesson_slug FROM progress')
    .all() as { lesson_slug: string }[];
  return new Set(rows.map((r) => r.lesson_slug));
}

export function isCompleted(slug: string): boolean {
  const row = getDb()
    .prepare('SELECT 1 FROM progress WHERE lesson_slug = ?')
    .get(slug);
  return row !== undefined;
}
