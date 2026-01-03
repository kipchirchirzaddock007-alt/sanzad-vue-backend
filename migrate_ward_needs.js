// migrate_ward_needs.js - create ward_needs table if missing
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sanzad.db');
console.log('Using DB:', dbPath);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
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
      if (err) {
        console.error('Error creating ward_needs:', err.message);
      } else {
        console.log('ward_needs table ready.');
      }
    }
  );
});

db.close();
