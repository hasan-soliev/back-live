const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const Live = require('./models/Live');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

connectDB().then(async () => {
  // Проставить type='match' всем старым документам без поля type
  await Live.updateMany(
    { $or: [{ type: { $exists: false } }, { type: null }] },
    { $set: { type: 'match' } }
  ).catch(() => {});
});

app.use(cors());
app.use(express.json());

// GET /api/lives?type=match|channel|event|review
app.get('/api/lives', async (req, res) => {
  try {
    const { type } = req.query;
    let filter = {};
    if (type) {
      // match — включаем и документы без поля type (старые данные)
      filter = type === 'match'
        ? { $or: [{ type: 'match' }, { type: { $exists: false } }, { type: null }] }
        : { type };
    }
    const lives = await Live.find(filter).sort({ date: -1, time: -1 });
    res.json(lives);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/lives/:id', async (req, res) => {
  try {
    const live = await Live.findById(req.params.id);
    if (!live) return res.status(404).json({ error: 'Live not found' });
    res.json(live);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lives', async (req, res) => {
  try {
    const { img, liveUrl, title, time, date, about, type } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const newLive = new Live({ img, liveUrl, title, time, date, about, type });
    const savedLive = await newLive.save();
    res.status(201).json(savedLive);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/lives/:id', async (req, res) => {
  try {
    const { img, liveUrl, title, time, date, about, type } = req.body;
    const updatedLive = await Live.findByIdAndUpdate(
      req.params.id,
      { img, liveUrl, title, time, date, about, type },
      { new: true, runValidators: true }
    );
    if (!updatedLive) return res.status(404).json({ error: 'Live not found' });
    res.json(updatedLive);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/lives/:id', async (req, res) => {
  try {
    const deleted = await Live.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Live not found' });
    res.json({ message: 'Live deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
