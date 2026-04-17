const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const db = new sqlite3.Database(process.env.DB_PATH || './database.db', (err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to SQLite database');
});

// Create table if not exists
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS lives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    img TEXT,
    liveUrl TEXT,
    title TEXT NOT NULL,
    time TEXT,
    date TEXT,
    about TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

db.run(createTableQuery, (err) => {
  if (err) {
    console.error('Error creating table:', err);
  } else {
    console.log('Table "lives" is ready');
  }
});

// API Routes

// Get all lives
app.get('/api/lives', (req, res) => {
  const query = 'SELECT * FROM lives ORDER BY date DESC, time DESC';
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get single live by ID
app.get('/api/lives/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM lives WHERE id = ?';
  
  db.get(query, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Live not found' });
      return;
    }
    res.json(row);
  });
});

// Create new live
app.post('/api/lives', (req, res) => {
  const { img, liveUrl, title, time, date, about } = req.body;
  
  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }
  
  const query = `
    INSERT INTO lives (img, liveUrl, title, time, date, about)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [img, liveUrl, title, time, date, about], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({
      id: this.lastID,
      img,
      liveUrl,
      title,
      time,
      date,
      about
    });
  });
});

// Update live
app.put('/api/lives/:id', (req, res) => {
  const { id } = req.params;
  const { img, liveUrl, title, time, date, about } = req.body;
  
  const query = `
    UPDATE lives 
    SET img = ?, liveUrl = ?, title = ?, time = ?, date = ?, about = ?
    WHERE id = ?
  `;
  
  db.run(query, [img, liveUrl, title, time, date, about, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Live not found' });
      return;
    }
    res.json({ message: 'Live updated successfully' });
  });
});

// Delete live
app.delete('/api/lives/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM lives WHERE id = ?';
  
  db.run(query, [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Live not found' });
      return;
    }
    res.json({ message: 'Live deleted successfully' });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
