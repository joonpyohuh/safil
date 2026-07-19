import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export function getDataDir(): string {
  const dir = process.env.SAFIL_DATA_DIR ?? path.join(process.cwd(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getUploadsDir(): string {
  const dir = path.join(getDataDir(), "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const BOOTSTRAP_DDL = `
CREATE TABLE IF NOT EXISTS cafe_profile (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  concept TEXT NOT NULL DEFAULT '',
  introduction TEXT NOT NULL DEFAULT '',
  menus TEXT NOT NULL DEFAULT '[]',
  tone TEXT NOT NULL DEFAULT 'warm',
  customer_type TEXT NOT NULL DEFAULT '',
  logo_path TEXT,
  photo_paths TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  input TEXT NOT NULL,
  options TEXT NOT NULL,
  selected_index INTEGER,
  copied INTEGER NOT NULL DEFAULT 0,
  downloaded INTEGER NOT NULL DEFAULT 0,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_generations_type_created
  ON generations (type, created_at DESC);
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  stored_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
`;

type Db = ReturnType<typeof createDb>;

function createDb() {
  const sqlite = new Database(path.join(getDataDir(), "safil.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(BOOTSTRAP_DDL);
  return drizzle(sqlite, { schema });
}

// Next.js dev reloads modules; keep one connection per process.
const globalForDb = globalThis as unknown as { __safilDb?: Db };

export function getDb(): Db {
  globalForDb.__safilDb ??= createDb();
  return globalForDb.__safilDb;
}

export { schema };
