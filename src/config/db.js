import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname doesn't exist by default in ES Modules, so we rebuild it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB file will live at the project root, e.g. Meeting-AI-Dashboard/meetings.db
const dbPath = path.join(__dirname, '..', '..', 'meetings.db');

const db = new Database(dbPath);

// Create tables if they don't already exist
db.exec(`
  CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    transcript TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id INTEGER,
    task TEXT NOT NULL,
    owner TEXT,
    deadline TEXT,
    priority TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id)
  );
`);

export default db;