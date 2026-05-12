const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const admin = require('firebase-admin');
const connectDB = require('./config/database');
const Live = require('./models/Live');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Firebase Admin
const serviceAccount = require('./live-ae64d-firebase-adminsdk-fbsvc-f1e352f47f.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Отправка FCM уведомления в тему 'live'
async function sendMatchNotification(match, index) {
  const channel = match.channelId && typeof match.channelId === 'object'
    ? match.channelId
    : null;

  const message = {
    topic: 'live',
    notification: {
      title: '🏆 ' + match.title,
      body: match.about || (match.time ? `Начало в ${match.time}` : 'Матч начинается!'),
    },
    data: {
      matchId:    String(match._id || match.id),
      title:      match.title || '',
      img:        match.img || '',
      liveUrl:    match.liveUrl || '',
      date:       match.date || '',
      time:       match.time || '',
      about:      match.about || '',
      channelId:  channel ? String(channel._id || channel.id) : '',
      channelName: channel ? (channel.title || '') : '',
      index:      String(index),
      type:       'match',
    },
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  };

  await admin.messaging().send(message);
  console.log(`[FCM] Sent for "${match.title}", index=${index}`);
}

// UTC+5 (Dushanbe). Меняй TZ_OFFSET в env если нужно другой часовой пояс
const TZ_OFFSET = parseInt(process.env.TZ_OFFSET ?? '5', 10);

// Сдвигаем UTC на нужное количество часов и берём UTC-методы — не зависит от timezone сервера
function localNow() {
  return new Date(Date.now() + TZ_OFFSET * 60 * 60 * 1000);
}

// Cron: каждую минуту проверяем матчи у которых настало время
cron.schedule('* * * * *', async () => {
  const now = localNow();
  const todayDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;

  console.log(`[Cron] tick ${todayDate} ${currentTime}`);

  try {
    const pending = await Live.find({
      type: 'match',
      date: todayDate,
      time: currentTime,
      $or: [{ notificationSent: false }, { notificationSent: { $exists: false } }],
    }).populate('channelId', 'title img liveUrl');

    if (pending.length === 0) return;

    // Индекс = количество всех матчей в списке на момент отправки
    const totalMatches = await Live.countDocuments({ type: 'match' });

    for (let i = 0; i < pending.length; i++) {
      const match = pending[i];
      const index = totalMatches - pending.length + i; // порядковый номер

      try {
        await sendMatchNotification(match, index);
        await Live.findByIdAndUpdate(match._id, { notificationSent: true });
      } catch (err) {
        console.error(`[FCM] Error for "${match.title}":`, err.message);
      }
    }
  } catch (err) {
    console.error('[Cron] Error:', err.message);
  }
});

connectDB().then(async () => {
  await Live.updateMany(
    { $or: [{ type: { $exists: false } }, { type: null }] },
    { $set: { type: 'match' } }
  ).catch(() => {});
});

app.use(cors());
app.use(express.json());

// POST /api/test-notification — немедленная отправка тестового уведомления
app.post('/api/test-notification', async (req, res) => {
  try {
    const { title, body, img, liveUrl, channelName, index, date, time } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const message = {
      topic: 'live',
      notification: {
        title: '🏆 ' + title,
        body: body || (time ? `Начало в ${time}` : 'Тестовое уведомление'),
      },
      data: {
        title:       title || '',
        img:         img || '',
        liveUrl:     liveUrl || '',
        date:        date || '',
        time:        time || '',
        about:       body || '',
        channelName: channelName || '',
        index:       String(index ?? 0),
        type:        'match',
      },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    };

    await admin.messaging().send(message);
    res.json({ success: true, message: 'Уведомление отправлено в тему live' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/channels
app.get('/api/channels', async (req, res) => {
  try {
    const channels = await Live.find({ type: 'channel' })
      .select('title img liveUrl')
      .sort({ title: 1 });
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lives?type=match|channel|event|review
app.get('/api/lives', async (req, res) => {
  try {
    const { type } = req.query;
    let filter = {};
    if (type) {
      filter = type === 'match'
        ? { $or: [{ type: 'match' }, { type: { $exists: false } }, { type: null }] }
        : { type };
    }
    const lives = await Live.find(filter)
      .populate('channelId', 'title img liveUrl')
      .sort({ date: -1, time: -1 });
    res.json(lives);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/lives/:id', async (req, res) => {
  try {
    const live = await Live.findById(req.params.id)
      .populate('channelId', 'title img liveUrl');
    if (!live) return res.status(404).json({ error: 'Live not found' });
    res.json(live);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lives', async (req, res) => {
  try {
    const { img, liveUrl, title, time, date, about, type, channelId } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const newLive = new Live({
      img, liveUrl, title, time, date, about, type,
      channelId: channelId || null,
    });
    const saved = await newLive.save();
    const populated = await saved.populate('channelId', 'title img liveUrl');

    // Отправить уведомление сразу при создании матча
    if (type === 'match') {
      const totalMatches = await Live.countDocuments({ type: 'match' });
      const index = totalMatches - 1;
      sendMatchNotification(populated, index)
        .catch(err => console.error('[FCM] Send error:', err.message));
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/lives/:id', async (req, res) => {
  try {
    const { img, liveUrl, title, time, date, about, type, channelId } = req.body;

    // Если дата/время изменились — сбросить флаг уведомления
    const existing = await Live.findById(req.params.id);
    const resetNotification = existing &&
      (existing.date !== date || existing.time !== time) &&
      type === 'match';

    const updated = await Live.findByIdAndUpdate(
      req.params.id,
      {
        img, liveUrl, title, time, date, about, type,
        channelId: channelId || null,
        ...(resetNotification ? { notificationSent: false } : {}),
      },
      { new: true, runValidators: true }
    ).populate('channelId', 'title img liveUrl');

    if (!updated) return res.status(404).json({ error: 'Live not found' });
    res.json(updated);
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
