const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const ReviewSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  productId: { type: Number, ref: 'Product', required: true },
  userId: { type: String, ref: 'User' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  date: { type: Date, default: Date.now },
  reviewerName: { type: String },
  reviewerEmail: { type: String }
});

module.exports = mongoose.model('Review', ReviewSchema);
