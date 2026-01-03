const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');

const app = express();
const PORT = 3000;

// ===== DB SETUP =====
const dbPath = path.join(__dirname, 'sanzad.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to DB:', dbPath);
  }
});

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// serve uploaded files
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// multer setup (disk storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safeName);
  },
});
const upload = multer({ storage });

// ===== PROJECTS ROUTES =====

// Get all projects
app.get('/api/projects', (req, res) => {
  const sql = 'SELECT * FROM projects';
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('DB error /api/projects:', err);
      return res.status(500).json({ error: 'DB error' });
    }

    // best-effort parse media JSON
    const projects = rows.map((row) => {
      let media = [];
      try {
        media = row.media ? JSON.parse(row.media) : [];
      } catch {
        media = [];
      }
      return { ...row, media };
    });

    res.json(projects);
  });
});

// Create a new project (simple JSON path, no files)
app.post('/api/projects', (req, res) => {
  const {
    name,
    ward,
    county,
    type,
    budget,
    fundingBody,
    initiatingLeader,
    managingAgency,
    startDate,
    endDate,
    description,
    lat,
    lng,
    status,
  } = req.body;

  const sql = `
    INSERT INTO projects
      (
        name,
        ward,
        county,
        type,
        budget,
        startDate,
        endDate,
        managingAgency,
        lat,
        lng,
        status,
        createdAt,
        fundingBody,
        initiatingLeader,
        description,
        media
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, '[]')
  `;

  db.run(
    sql,
    [
      name,
      ward,
      county,
      type,
      budget ?? null,
      startDate || null,
      endDate || null,
      managingAgency || '',
      lat ?? null,
      lng ?? null,
      status || 'planned',
      fundingBody || '',
      initiatingLeader || '',
      description || '',
    ],
    function (err) {
      if (err) {
        console.error('DB error POST /api/projects:', err);
        return res.status(500).json({ error: 'DB error' });
      }

      res.status(201).json({
        id: this.lastID,
        name,
        ward,
        county,
        type,
        budget: budget ?? null,
        startDate: startDate || null,
        endDate: endDate || null,
        managingAgency: managingAgency || '',
        lat,
        lng,
        status: status || 'planned',
        createdAt: new Date().toISOString(),
        fundingBody: fundingBody || '',
        initiatingLeader: initiatingLeader || '',
        description: description || '',
        media: [],
      });
    }
  );
});

// Get a single project
app.get('/api/projects/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'SELECT * FROM projects WHERE id = ?';
  db.get(sql, [id], (err, project) => {
    if (err) {
      console.error('DB error /api/projects/:id:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let media = [];
    try {
      media = project.media ? JSON.parse(project.media) : [];
    } catch {
      media = [];
    }

    res.json({
      project: {
        ...project,
        media,
      },
    });
  });
});

// ===== PROJECT MEDIA ROUTES (existing citizen/admin uploads) =====

// Get media array for a project
app.get('/api/projects/:id/media', (req, res) => {
  const id = req.params.id;
  const sql = 'SELECT media FROM projects WHERE id = ?';

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('DB error GET /api/projects/:id/media:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let media = [];
    try {
      media = row.media ? JSON.parse(row.media) : [];
    } catch {
      media = [];
    }

    res.json({ media });
  });
});

// Upload single media file to existing project (citizen or admin)
app.post('/api/projects/:id/media', upload.single('file'), (req, res) => {
  const id = req.params.id;
  const file = req.file;
  const { caption, type } = req.body;

  if (!file) {
    console.error('No file in request body');
    return res.status(400).json({ error: 'file is required' });
  }

  const url = `/uploads/${file.filename}`;

  const selectSql = 'SELECT media FROM projects WHERE id = ?';
  db.get(selectSql, [id], (err, row) => {
    if (err) {
      console.error('DB error SELECT media /api/projects/:id/media:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let mediaArr = [];
    try {
      const parsed = row.media ? JSON.parse(row.media) : [];
      mediaArr = Array.isArray(parsed) ? parsed : [];
    } catch {
      mediaArr = [];
    }

    const newItem = {
      url,
      type: type || 'image',
      caption: caption || '',
      uploadedAt: new Date().toISOString(),
    };
    mediaArr.push(newItem);

    const updateSql = 'UPDATE projects SET media = ? WHERE id = ?';
    db.run(updateSql, [JSON.stringify(mediaArr), id], function (err2) {
      if (err2) {
        console.error('DB error UPDATE media /api/projects/:id/media:', err2);
        return res.status(500).json({ error: 'DB error' });
      }

      res.status(201).json({ media: mediaArr });
    });
  });
});

// ===== PROJECTS WITH GEOMETRY + FILES (ADMIN EDITOR) =====

// Expect multipart/form-data with:
// - project: JSON string containing all fields, including geometry + notes
// - allocationFiles[0..n]
// - designFiles[0..n]
app.post(
  '/api/projects-with-files',
  upload.any(), // accept any file fields; we'll filter by name
  (req, res) => {
    try {
      if (!req.body.project) {
        return res.status(400).json({ error: 'project field is required' });
      }

      const projectData = JSON.parse(req.body.project || '{}');

      const {
        name,
        ward,
        county,
        type,
        budget,
        fundingBody,
        initiatingLeader,
        managingAgency,
        startDate,
        endDate,
        description,
        lat,
        lng,
        status,
        implementationLevel,
        mdaCode,
        contractId,
        contractorName,
        roadSurface,
        allocationNotes,
        designNotes,
        roadGeometry,
        infraSymbols,
        polygons,
      } = projectData;

      // base geometry + metadata payload stored in media column
      const geometryPayload = {
        roadSurface: roadSurface || 'highway',
        roadGeometry: roadGeometry || [],
        infraSymbols: infraSymbols || [],
        polygons: polygons || [],
        allocationNotes: allocationNotes || '',
        designNotes: designNotes || '',
        allocations: [],
        designs: [],
      };

      const files = req.files || [];
      const toUrl = (file) => `/uploads/${file.filename}`;

      const allocationFiles = files.filter((f) =>
        f.fieldname.startsWith('allocationFiles')
      );
      const designFiles = files.filter((f) =>
        f.fieldname.startsWith('designFiles')
      );

      geometryPayload.allocations = allocationFiles.map((f) => ({
        url: toUrl(f),
        originalName: f.originalname,
        type: 'allocation',
        uploadedAt: new Date().toISOString(),
      }));

      geometryPayload.designs = designFiles.map((f) => ({
        url: toUrl(f),
        originalName: f.originalname,
        type: 'design',
        uploadedAt: new Date().toISOString(),
      }));

      const sql = `
        INSERT INTO projects
          (
            name,
            ward,
            county,
            type,
            budget,
            startDate,
            endDate,
            managingAgency,
            lat,
            lng,
            status,
            createdAt,
            fundingBody,
            initiatingLeader,
            description,
            media
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)
      `;

      db.run(
        sql,
        [
          name,
          ward,
          county,
          type,
          budget ?? null,
          startDate || null,
          endDate || null,
          managingAgency || '',
          lat ?? null,
          lng ?? null,
          status || 'planned',
          fundingBody || '',
          initiatingLeader || '',
          description || '',
          JSON.stringify(geometryPayload),
        ],
        function (err) {
          if (err) {
            console.error('DB error POST /api/projects-with-files:', err);
            return res.status(500).json({ error: 'DB error' });
          }

          res.status(201).json({
            id: this.lastID,
            name,
            ward,
            county,
            type,
            budget: budget ?? null,
            startDate: startDate || null,
            endDate: endDate || null,
            managingAgency: managingAgency || '',
            lat,
            lng,
            status: status || 'planned',
            createdAt: new Date().toISOString(),
            fundingBody: fundingBody || '',
            initiatingLeader: initiatingLeader || '',
            description: description || '',
            media: geometryPayload,
          });
        }
      );
    } catch (e) {
      console.error('Error in /api/projects-with-files:', e);
      return res.status(400).json({ error: 'Invalid project payload' });
    }
  }
);

// ===== METRICS ROUTES =====

// Simple summary metrics for dashboard
app.get('/api/metrics/summary', (req, res) => {
  const sqlTotalProjects = 'SELECT COUNT(*) AS total FROM projects';
  const sqlByStatus = `
    SELECT status, COUNT(*) AS count
    FROM projects
    GROUP BY status
  `;
  const sqlTotalReports = 'SELECT COUNT(*) AS total FROM reports';

  db.all(sqlTotalProjects, [], (err, totalProjectsRows) => {
    if (err) {
      console.error('DB error /api/metrics/summary totalProjects:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    db.all(sqlByStatus, [], (err2, byStatusRows) => {
      if (err2) {
        console.error('DB error /api/metrics/summary byStatus:', err2);
        return res.status(500).json({ error: 'DB error' });
      }
      db.all(sqlTotalReports, [], (err3, totalReportsRows) => {
        if (err3) {
          console.error('DB error /api/metrics/summary totalReports:', err3);
          return res.status(500).json({ error: 'DB error' });
        }

        const totalProjects = totalProjectsRows[0]?.total || 0;
        const totalReports = totalReportsRows[0]?.total || 0;

        const byStatus = {};
        for (const row of byStatusRows) {
          byStatus[row.status] = row.count;
        }

        res.json({
          totalProjects,
          totalReports,
          byStatus,
        });
      });
    });
  });
});

// ===== REPORTS ROUTES =====

// List reports
app.get('/api/reports', (req, res) => {
  const sql = 'SELECT * FROM reports ORDER BY createdAt DESC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('DB error /api/reports:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json(rows);
  });
});

// Create report
app.post('/api/reports', (req, res) => {
  const {
    reporterName,
    contact,
    location,
    issueType,
    description,
    evidenceUrl,
  } = req.body;

  const sql = `
    INSERT INTO reports
      (reporterName, contact, location, issueType, description, evidenceUrl, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
  `;

  db.run(
    sql,
    [reporterName, contact, location, issueType, description, evidenceUrl],
    function (err) {
      if (err) {
        console.error('DB error POST /api/reports:', err);
        return res.status(500).json({ error: 'DB error' });
      }
      res.status(201).json({
        id: this.lastID,
        reporterName,
        contact,
        location,
        issueType,
        description,
        evidenceUrl,
        status: 'pending',
      });
    }
  );
});

// Update report status + leader note
app.patch('/api/reports/:id/status', (req, res) => {
  const id = req.params.id;
  const { status, leaderNote } = req.body;

  const sql = `
    UPDATE reports
    SET status = ?, leaderNote = ?
    WHERE id = ?
  `;

  db.run(sql, [status, leaderNote || '', id], function (err) {
    if (err) {
      console.error('DB error PATCH /api/reports/:id/status:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    db.get('SELECT * FROM reports WHERE id = ?', [id], (err2, row) => {
      if (err2) {
        console.error('DB error fetching updated report:', err2);
        return res.status(500).json({ error: 'DB error' });
      }
      res.json(row);
    });
  });
});

// ===== WARD NEEDS ROUTES =====

// List all wards for a sector
app.get('/api/ward-needs', (req, res) => {
  const sector = req.query.sector || 'roads';
  const sql = `
    SELECT ward, county, sector, score, data_source, lastUpdated
    FROM ward_needs
    WHERE sector = ?
    ORDER BY score DESC
  `;
  db.all(sql, [sector], (err, rows) => {
    if (err) {
      console.error('DB error /api/ward-needs:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json(rows);
  });
});

// Top N wards for a sector
app.get('/api/ward-needs/top', (req, res) => {
  const sector = req.query.sector || 'roads';
  const limit = parseInt(req.query.limit || '10', 10);
  const sql = `
    SELECT ward, county, sector, score, data_source, lastUpdated
    FROM ward_needs
    WHERE sector = ?
    ORDER BY score DESC
    LIMIT ?
  `;
  db.all(sql, [sector, limit], (err, rows) => {
    if (err) {
      console.error('DB error /api/ward-needs/top:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json(rows);
  });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`Sanzad backend listening on http://localhost:${PORT}`);
});
