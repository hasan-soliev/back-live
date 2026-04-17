# MongoDB Backend Setup

## Overview
Backend has been migrated from SQLite to MongoDB using Mongoose ODM.

## Files Created/Modified

### New Files:
- `config/database.js` - MongoDB connection configuration
- `models/Live.js` - Mongoose schema for live streams
- `server-mongodb.js` - MongoDB-based server

### Modified Files:
- `package.json` - Added mongoose dependency and new scripts
- `.env` - Added MongoDB URI

## Installation

1. Install MongoDB on your system:
   ```bash
   # macOS with Homebrew
   brew install mongodb-community
   brew services start mongodb-community
   
   # Ubuntu/Debian
   sudo apt-get install mongodb
   sudo systemctl start mongodb
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Environment Variables

Update your `.env` file:
```env
DB_PATH=./database.db          # SQLite (legacy)
MONGODB_URI=mongodb://localhost:27017/live_db  # MongoDB
PORT=3001
```

## Running the Server

### MongoDB Version (Recommended):
```bash
npm run dev     # Development with nodemon
npm start       # Production
```

### SQLite Version (Legacy):
```bash
npm run dev-sqlite
npm run start-sqlite
```

## API Endpoints

All endpoints remain the same, now powered by MongoDB:

- `GET /api/lives` - Get all live streams
- `GET /api/lives/:id` - Get single live stream
- `POST /api/lives` - Create new live stream
- `PUT /api/lives/:id` - Update live stream
- `DELETE /api/lives/:id` - Delete live stream

## Database Schema

```javascript
{
  img: String,        // Image URL (optional)
  liveUrl: String,    // Stream URL (optional)
  title: String,      // Required field
  time: String,       // Time string (optional)
  date: String,       // Date string (optional)
  about: String,      // Description (optional)
  created_at: Date,   // Auto-generated
  updated_at: Date    // Auto-generated
}
```

## Migration from SQLite

If you have existing data in SQLite, you can migrate it:

1. Run the SQLite server to export data
2. Use the migration script (if available) or manually import data
3. Switch to MongoDB server

## Benefits of MongoDB

- Better scalability
- Flexible schema
- Rich querying capabilities
- Better performance for large datasets
- Easier deployment with cloud services

## Troubleshooting

### Connection Issues
```bash
# Check if MongoDB is running
brew services list | grep mongodb  # macOS
sudo systemctl status mongodb     # Linux

# Start MongoDB if not running
brew services start mongodb-community  # macOS
sudo systemctl start mongodb           # Linux
```

### Database Creation
MongoDB automatically creates the database and collection on first use.

### Port Conflicts
If port 27017 is already in use, update the MONGODB_URI:
```env
MONGODB_URI=mongodb://localhost:27018/live_db
```
