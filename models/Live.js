const mongoose = require('mongoose');

const liveSchema = new mongoose.Schema({
  img: {
    type: String,
    default: null
  },
  liveUrl: {
    type: String,
    default: null
  },
  title: {
    type: String,
    required: [true, 'Title is required']
  },
  time: {
    type: String,
    default: null
  },
  date: {
    type: String,
    default: null
  },
  about: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['match', 'channel', 'event', 'review'],
    default: 'match'
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Virtual for formatted data
liveSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtuals are serialized
liveSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

liveSchema.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Live', liveSchema);
