// migrate_reports.js - add projectId column to reports if missing
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sanzad.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(
    "ALTER TABLE reports ADD COLUMN projectId INTEGER",
    (err) => {
      if (err) {
        console.log('projectId:', err.message);
      } else {
        console.log('Added projectId to reports');
      }
    }
  );
});

db.close();
