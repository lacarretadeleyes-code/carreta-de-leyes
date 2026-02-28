const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "carreta.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    area TEXT,
    emoji TEXT DEFAULT '👤',
    role TEXT DEFAULT 'empleado',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    user_area TEXT,
    week_date TEXT,
    submitted_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER,
    titular TEXT,
    resumen TEXT,
    actores_clave TEXT,
    conclusion TEXT,
    tags TEXT DEFAULT '[]',
    FOREIGN KEY(report_id) REFERENCES reports(id)
  );
  CREATE TABLE IF NOT EXISTS fuentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER,
    url TEXT,
    FOREIGN KEY(entry_id) REFERENCES entries(id)
  );
`);

module.exports = db;
