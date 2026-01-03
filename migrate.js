// migrate.js - one-off script to add columns to projects
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sanzad.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("ALTER TABLE projects ADD COLUMN fundingBody TEXT", (err) => {
    if (err) console.log('fundingBody:', err.message);
    else console.log('Added fundingBody');
  });

  db.run("ALTER TABLE projects ADD COLUMN initiatingLeader TEXT", (err) => {
    if (err) console.log('initiatingLeader:', err.message);
    else console.log('Added initiatingLeader');
  });

  db.run("ALTER TABLE projects ADD COLUMN description TEXT", (err) => {
    if (err) console.log('description:', err.message);
    else console.log('Added description');
  });

  db.run("ALTER TABLE projects ADD COLUMN media TEXT", (err) => {
    if (err) console.log('media:', err.message);
    else console.log('Added media');
  });
});

db.close();
