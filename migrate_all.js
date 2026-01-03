// migrate_all.js - ensure all tables exist
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sanzad.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // projects table
  db.run(
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      ward TEXT,
      county TEXT,
      type TEXT,
      status TEXT,
      fundingBody TEXT,
      initiatingLeader TEXT,
      media TEXT
    )`,
    (err) => {
      if (err) console.error('Error creating projects:', err.message);
      else console.log('projects table ready.');
    }
  );

  // reports table
  db.run(
    `CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporterName TEXT,
      contact TEXT,
      location TEXT,
      issueType TEXT,
      description TEXT,
      evidenceUrl TEXT,
      status TEXT,
      leaderNote TEXT,
      createdAt TEXT
    )`,
    (err) => {
      if (err) console.error('Error creating reports:', err.message);
      else console.log('reports table ready.');
    }
  );

  // ward_needs table
  db.run(
    `CREATE TABLE IF NOT EXISTS ward_needs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ward TEXT NOT NULL,
      county TEXT NOT NULL,
      sector TEXT NOT NULL,
      score REAL NOT NULL,
      data_source TEXT,
      lastUpdated TEXT
    )`,
    (err) => {
      if (err) console.error('Error creating ward_needs:', err.message);
      else console.log('ward_needs table ready.');
    }
  );
});

db.close();
