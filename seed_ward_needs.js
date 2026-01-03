// seed_ward_needs.js - demo data for ward_needs
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sanzad.db');
const db = new sqlite3.Database(dbPath);

const now = new Date().toISOString();

const rows = [
  // Roads sector: higher = more need for roads
  { ward: 'Kibra', county: 'Nairobi', sector: 'roads', score: 90 },
  { ward: 'Mathare', county: 'Nairobi', sector: 'roads', score: 85 },
  { ward: 'Westlands', county: 'Nairobi', sector: 'roads', score: 40 },

  // Health sector: higher = more need for health services
  { ward: 'Kibra', county: 'Nairobi', sector: 'health', score: 75 },
  { ward: 'Mathare', county: 'Nairobi', sector: 'health', score: 80 },
  { ward: 'Westlands', county: 'Nairobi', sector: 'health', score: 30 },
];

db.serialize(() => {
  const stmt = db.prepare(
    `INSERT INTO ward_needs
     (ward, county, sector, score, data_source, lastUpdated)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  rows.forEach((r) => {
    stmt.run(
      r.ward,
      r.county,
      r.sector,
      r.score,
      'demo-seed',
      now
    );
  });

  stmt.finalize((err) => {
    if (err) {
      console.error('Error seeding ward_needs:', err.message);
    } else {
      console.log('Seeded ward_needs demo data.');
    }
  });
});

db.close();
