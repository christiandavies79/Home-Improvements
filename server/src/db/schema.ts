import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', '..', 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure directories exist
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'homeforge.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDb(db);
  }
  return db;
}

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}

function initializeDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#C2603A',
      is_admin INTEGER NOT NULL DEFAULT 0,
      pin_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS spaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'home',
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
      status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','planning','in_progress','almost_done','complete')),
      assigned_to TEXT DEFAULT NULL,
      estimated_budget REAL DEFAULT 0,
      spent_budget REAL DEFAULT 0,
      time_estimate TEXT DEFAULT '',
      due_date TEXT DEFAULT NULL,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_tags (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      tag_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_photos (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      caption TEXT DEFAULT '',
      photo_type TEXT NOT NULL DEFAULT 'general' CHECK(photo_type IN ('before','during','after','inspiration','general')),
      uploaded_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS design_board_items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL CHECK(item_type IN ('link','photo','note')),
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      url TEXT DEFAULT '',
      file_path TEXT DEFAULT '',
      added_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS design_board_comments (
      id TEXT PRIMARY KEY,
      board_item_id TEXT NOT NULL REFERENCES design_board_items(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      comment_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_comments (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      comment_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      details TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed default spaces if none exist
  const spaceCount = db.prepare('SELECT COUNT(*) as count FROM spaces').get() as { count: number };
  if (spaceCount.count === 0) {
    const insertSpace = db.prepare('INSERT INTO spaces (id, name, icon) VALUES (?, ?, ?)');
    const defaultSpaces = [
      ['sp_kitchen', 'Kitchen', 'cooking-pot'],
      ['sp_bedroom', 'Bedroom', 'bed-double'],
      ['sp_bathroom', 'Bathroom', 'bath'],
      ['sp_living', 'Living Room', 'sofa'],
      ['sp_outdoor', 'Outdoors', 'trees'],
      ['sp_garage', 'Garage', 'warehouse'],
      ['sp_office', 'Office', 'monitor'],
      ['sp_hallway', 'Hallway & Stairs', 'door-open'],
      ['sp_dining', 'Dining Room', 'utensils'],
      ['sp_general', 'General / Whole House', 'home'],
    ];
    const insertMany = db.transaction(() => {
      for (const [id, name, icon] of defaultSpaces) {
        insertSpace.run(id, name, icon);
      }
    });
    insertMany();
  }
}
