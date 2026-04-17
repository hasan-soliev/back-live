const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const Live = require('./models/Live');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes

// Get all lives
app.get('/api/lives', async (req, res) => {
  try {
    const lives = await Live.find({}).sort({ date: -1, time: -1 });
    res.json(lives);
  } catch (error) {
    console.error('Error fetching lives:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single live by ID
app.get('/api/lives/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const live = await Live.findById(id);
    
    if (!live) {
      return res.status(404).json({ error: 'Live not found' });
    }
    
    res.json(live);
  } catch (error) {
    console.error('Error fetching live:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new live
app.post('/api/lives', async (req, res) => {
  try {
    const { img, liveUrl, title, time, date, about } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const newLive = new Live({
      img,
      liveUrl,
      title,
      time,
      date,
      about
    });
    
    const savedLive = await newLive.save();
    res.status(201).json(savedLive);
  } catch (error) {
    console.error('Error creating live:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update live
app.put('/api/lives/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { img, liveUrl, title, time, date, about } = req.body;
    
    const updatedLive = await Live.findByIdAndUpdate(
      id,
      { img, liveUrl, title, time, date, about },
      { new: true, runValidators: true }
    );
    
    if (!updatedLive) {
      return res.status(404).json({ error: 'Live not found' });
    }
    
    res.json(updatedLive);
  } catch (error) {
    console.error('Error updating live:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete live
app.delete('/api/lives/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedLive = await Live.findByIdAndDelete(id);
    
    if (!deletedLive) {
      return res.status(404).json({ error: 'Live not found' });
    }
    
    res.json({ message: 'Live deleted successfully' });
  } catch (error) {
    console.error('Error deleting live:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
