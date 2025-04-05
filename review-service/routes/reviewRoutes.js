const express = require('express');
const router = express.Router();
const axios = require('axios');
const Review = require('../models/Review');


async function updateAverageRating(productId) {
  try {
    const reviews = await Review.find({ productId });
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length ? totalRating / reviews.length : 0;

    await axios.put(`http://localhost:3002/api/products/${productId}/rating`, { rating: averageRating });
    console.log(`Updated product ${productId} average rating to ${averageRating}`);
  } catch (err) {
    console.error('Error updating average rating:', err.message);
  }
}

router.post('/', async (req, res) => {
  try {
    const review = new Review(req.body);
    await review.save();
    updateAverageRating(review.productId);
    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    updateAverageRating(review.productId);
    res.json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId });
    res.json(reviews);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
