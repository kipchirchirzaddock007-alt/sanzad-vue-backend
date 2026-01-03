// db.js
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'sanzad.db');
const db = new sqlite3.Database(dbPath);

// Create tables if not exists
db.serialize(() => {
  // Projects table
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ward TEXT NOT NULL,
      county TEXT NOT NULL,
      type TEXT NOT NULL,
      budget REAL,
      startDate TEXT,
      endDate TEXT,
      managingAgency TEXT,
      lat REAL,
      lng REAL,
      status TEXT NOT NULL DEFAULT 'planned',
      createdAt TEXT NOT NULL
    )
  `);

  // Reports table
  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER,
      reporterName TEXT NOT NULL,
      contact TEXT,
      location TEXT NOT NULL,
      issueType TEXT NOT NULL,
      description TEXT NOT NULL,
      evidenceUrl TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      leaderNote TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id)
    )
  `);
});

module.exports = db;
