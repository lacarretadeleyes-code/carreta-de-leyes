const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      area TEXT,
      emoji TEXT DEFAULT '👤',
      role TEXT DEFAULT 'empleado',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      user_name TEXT,
      user_area TEXT,
      week_date TEXT,
      submitted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      report_id INTEGER,
      titular TEXT,
      resumen TEXT,
      actores_clave TEXT,
      conclusion TEXT,
      tags TEXT DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS fuentes (
      id SERIAL PRIMARY KEY,
      entry_id INTEGER,
      url TEXT
    );
  `);
  console.log("Base de datos lista");
}

init().catch(console.error);

module.exports = pool;
