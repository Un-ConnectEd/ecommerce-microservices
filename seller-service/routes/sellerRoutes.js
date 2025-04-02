const express = require('express');
const router = express.Router();
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Seller = require('../models/Seller');
const { authenticate, adminOnly } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
// URL for the product service API (adjust as needed)
const PRODUCT_SERVICE_URL = 'http://localhost:3002/api/products';

/* ====================================
   Seller Account Routes
==================================== */

// Seller Registration
router.post('/register', async (req, res) => {
  try {
    // Check if a seller with the same email exists
    const existingSeller = await Seller.findOne({ email: req.body.email });
    if (existingSeller) {
      return res.status(409).json({ error: 'Seller with this email already exists.' });
    }
    // Hash the provided password using virtual setter if not using pre-save hook
    // (Alternatively, you can rely on a pre-save hook in the model to do the hashing.)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(req.body.password, salt);

    const sellerData = {
      storeName: req.body.storeName,
      email: req.body.email,
      passwordHash, // store the hashed password
      phone: req.body.phone,
      address: req.body.address,
      website: req.body.website
    };

    const seller = new Seller(sellerData);
    await seller.save();
    res.status(201).json(seller);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Seller Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const seller = await Seller.findOne({ email });
    if (!seller) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const isMatch = await bcrypt.compare(password, seller.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    // Generate a JWT token with seller info
    const token = jwt.sign(
      { id: seller._id, email: seller.email, role: 'seller' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ seller, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get Seller Profile (Protected)
router.get('/profile', authenticate, async (req, res) => {
  try {
    const sellerId = req.user.id;
    // Exclude the passwordHash from the returned profile
    const seller = await Seller.findById(sellerId).select('-passwordHash');
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found.' });
    }
    res.json(seller);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Seller Info (Protected)
router.put('/profile', authenticate, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const updateFields = {
      storeName: req.body.storeName,
      phone: req.body.phone,
      address: req.body.address,
      website: req.body.website,
      updatedAt: Date.now()
    };

    // If a new password is provided, hash it before updating
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      updateFields.passwordHash = await bcrypt.hash(req.body.password, salt);
    }
    
    const updatedSeller = await Seller.findByIdAndUpdate(sellerId, updateFields, { new: true });
    if (!updatedSeller) {
      return res.status(404).json({ error: 'Seller not found.' });
    }
    const sellerResponse = updatedSeller.toObject();
    delete sellerResponse.passwordHash;
    res.json(sellerResponse);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ====================================
   Seller Product Routes (via Product Service)
==================================== */

// Create a new product by the authenticated seller
router.post('/products', authenticate, async (req, res) => {
  try {
    const sellerId = req.user.id; // Extract seller ID from JWT token
    req.body.seller = sellerId;   // Associate product with the seller
    const response = await axios.post(PRODUCT_SERVICE_URL, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(201).json(response.data);
  } catch (err) {
    res.status(400).json({ error: err.response?.data || err.message });
  }
});

// Update a product (only if it belongs to the authenticated seller)
router.put('/products/:id', authenticate, async (req, res) => {
  try {
    const sellerId = req.user.id;
    // Fetch the product details from the product service
    const productResponse = await axios.get(`${PRODUCT_SERVICE_URL}/${req.params.id}`);
    const product = productResponse.data;
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    if (product.seller !== sellerId) {
      return res.status(403).json({ error: "Not authorized to update this product." });
    }
    // Update the product; pass the token along if required by the product service
    const updateResponse = await axios.put(
      `${PRODUCT_SERVICE_URL}/${req.params.id}`,
      req.body,
      { headers: { Authorization: req.headers.authorization } }
    );
    res.json(updateResponse.data);
  } catch (err) {
    res.status(400).json({ error: err.response?.data || err.message });
  }
});

// Delete a product (only if it belongs to the authenticated seller)
router.delete('/products/:id', authenticate, async (req, res) => {
  try {
    const sellerId = req.user.id;
    // Retrieve the product to verify ownership
    const productResponse = await axios.get(`${PRODUCT_SERVICE_URL}/${req.params.id}`);
    const product = productResponse.data;
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    if (product.seller !== sellerId) {
      return res.status(403).json({ error: "Not authorized to delete this product." });
    }
    // Delete the product via the product service
    const deleteResponse = await axios.delete(`${PRODUCT_SERVICE_URL}/${req.params.id}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(deleteResponse.data);
  } catch (err) {
    res.status(400).json({ error: err.response?.data || err.message });
  }
});

// List all products for the authenticated seller
router.get('/products', authenticate, async (req, res) => {
  try {
    const sellerId = req.user.id;
    // Assuming the product service supports filtering by seller query parameter
    const response = await axios.get(`${PRODUCT_SERVICE_URL}?seller=${sellerId}`);
    res.json(response.data);
  } catch (err) {
    res.status(400).json({ error: err.response?.data || err.message });
  }
});



module.exports = router;
