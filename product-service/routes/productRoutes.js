const express = require('express');
const axios = require('axios');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ==============================
// Get Product by ID (with DummyJSON fallback)
// ==============================
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id; // _id is an ObjectId string
    console.log(`Fetching product with ID: ${productId}`);

    let product = await Product.findById(productId);

    if (!product) {
      console.log(`Product ${productId} not found in DB, fetching from external API`);
      const response = await axios.get(`https://dummyjson.com/products/${productId}`);
      const productData = response.data;
      console.log("DummyJSON Response:", productData);

      // Create a new product. Mongoose will generate _id automatically.
      product = new Product({
        ...productData,
        seller_name: productData.seller || 'default-seller'
      });

      await product.save();
      console.log(`Saved new product with generated _id to DB`);
    }

    res.json(product);
  } catch (err) {
    console.error(`Error fetching product ${req.params.id}:`, err.message);
    res.status(400).json({ error: err.message });
  }
});

// ==============================
// Get All Products (limit optional)
// ==============================
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().limit(50);
    res.json(products);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==============================
// Seller: Add a New Product (Authenticated Sellers Only)
// Duplicate prevention is handled by the pre-save hook in the model.
// ==============================
router.post('/', authenticate, async (req, res) => {
  try {
    const sellerId = req.user.id;
    // Assign authenticated seller's ID to seller_id in the product
    req.body.seller_id = sellerId;
    
    const product = new Product({ ...req.body });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==============================
// Seller: Update Their Own Product
// ==============================
router.put('/:id', authenticate, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) return res.status(404).json({ error: "Product not found." });

    if (product.seller_id.toString() !== sellerId.toString()) {
      return res.status(403).json({ error: "Unauthorized to update this product." });
    }

    Object.assign(product, req.body, { updatedAt: new Date() });
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==============================
// Seller: Delete Their Own Product
// ==============================
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) return res.status(404).json({ error: "Product not found." });

    if (product.seller_id.toString() !== sellerId.toString()) {
      return res.status(403).json({ error: "Unauthorized to delete this product." });
    }

    await product.deleteOne();
    res.json({ message: "Product deleted successfully." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==============================
// Get All Products for an Authenticated Seller
// ==============================
router.get('/seller/products', authenticate, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const products = await Product.find({ seller_id: sellerId });
    res.json(products);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==============================
// Update Product Rating (Any User Can Rate)
// ==============================
router.put('/:id/rating', async (req, res) => {
  try {
    const { rating } = req.body;
    const productId = req.params.id;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { rating, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==============================
// Decrement Product Stock (Authenticated Sellers Only)
// ==============================
router.post('/decrement', authenticate, async (req, res) => {
  try {
    console.log("Decrement API hit");

    const { productId, quantity } = req.body;
    console.log("Received request:", req.body);

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid productId or quantity.' });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Not enough stock available.' });
    }

    product.stock -= quantity;
    await product.save();

    res.status(200).json({ message: 'Product inventory updated successfully.' });
  } catch (err) {
    console.error("Error in decrement API:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
