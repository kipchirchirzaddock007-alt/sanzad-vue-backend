const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Point to the same DB file your server uses
const dbPath = path.join(__dirname, 'sanzad.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to DB:', dbPath);
  }
});

db.all("PRAGMA table_info(projects);", [], (err, rows) => {
  if (err) {
    console.error('Error running PRAGMA table_info(projects):', err);
  } else {
    console.log('Schema for projects table:');
    console.log(rows);
  }
  db.close();
});
