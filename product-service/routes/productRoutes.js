const express = require('express');
const axios = require('axios');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * Generate a new _id for Product
 * Finds the highest _id in the database and increments it
 */
async function generateProductId() {
  const lastProduct = await Product.findOne().sort({ _id: -1 }); // Get the highest ID
  return lastProduct ? lastProduct._id + 1 : 1; // If no products exist, start from 1
}

// ==============================
// Get Product by ID (with DummyJSON fallback)
// ==============================



// router.get('/:id', async (req, res) => {
//   try {
//     const productId = parseInt(req.params.id); // Ensure it's a number
//     let product = await Product.findById(productId);

//     if (!product) {
//       const response = await axios.get(`https://dummyjson.com/products/${productId}`);
//       const productData = response.data;

//       // 🔴 FIXED: Generate _id manually
//       const newProductId = await generateProductId();
      
//       product = new Product({
//         _id: newProductId,
//         ...productData,
//         seller: productData.seller || 'default-seller',
//       });

//       await product.save();
//     }

//     res.json(product);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });




// Get Product by ID
router.get('/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    console.log(`Fetching product with ID: ${productId}`);

    let product = await Product.findById(productId);

    if (!product) {
      console.log(`Product ${productId} not found in DB, fetching from external API`);
      const response = await axios.get(`https://dummyjson.com/products/${productId}`);
      const productData = response.data;

      console.log("DummyJSON Response:", productData);

      const newProductId = await generateProductId();
      product = new Product({
        _id: newProductId,
        ...productData,
        seller: productData.seller || 'default-seller',
      });

      await product.save();
      console.log(`Saved new product ${newProductId} to DB`);
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
// ==============================
// ==============================
// Seller: Add a New Product (Prevent Duplicates)
// ==============================
router.post('/', authenticate, async (req, res) => {
  try {
    const sellerId = req.user.id;
    req.body.seller = sellerId;
    const { sku } = req.body;

    // Check if the seller already has a product with the same SKU
    const existingProduct = await Product.findOne({ seller: sellerId, sku });

    if (existingProduct) {
      return res.status(400).json({
        error: `A product with SKU "${sku}" already exists. Consider updating the existing product instead.`,
        existingProduct,
      });
    }

    // Generate a new numeric _id
    const newProductId = await generateProductId();

    const product = new Product({
      _id: newProductId,
      ...req.body,
    });

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
    const productId = parseInt(req.params.id);
    const product = await Product.findById(productId);

    if (!product) return res.status(404).json({ error: "Product not found." });

    if (product.seller.toString() !== sellerId.toString()) {
      return res.status(403).json({ error: "Unauthorized to update this product." });
    }

    Object.assign(product, req.body, { updatedAt: Date.now() });
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
    const productId = parseInt(req.params.id);
    const product = await Product.findById(productId);

    if (!product) return res.status(404).json({ error: "Product not found." });

    if (product.seller.toString() !== sellerId.toString()) {
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
    const products = await Product.find({ seller: sellerId });
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
    const productId = parseInt(req.params.id);
    
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { rating, updatedAt: Date.now() },
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


// Decrement the inventory for a product





// router.post('/products/decrement', authenticate, async (req, res) => {
//   try {
//     const { productId, quantity } = req.body;

//     if (!productId || !quantity || quantity <= 0) {
//       return res.status(400).json({ error: 'Invalid productId or quantity.' });
//     }

//     // Find the product in the database
//     const product = await Product.findOne({ _id: productId });

//     if (!product) {
//       return res.status(404).json({ error: 'Product not found.' });
//     }

//     // Check if there's enough stock
//     if (product.stock < quantity) {
//       return res.status(400).json({ error: 'Not enough stock available.' });
//     }

//     // Decrement the stock
//     product.stock -= quantity;

//     // Save the updated product
//     await product.save();

//     res.status(200).json({ message: 'Product inventory updated successfully.' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });


// Decrement the inventory for a product
// router.post('/products/decrement', authenticate, async (req, res) => {
//   try {
//     console.log("Decrement API hit");

//     const { productId, quantity } = req.body;
//     console.log("Received request:", req.body);

//     if (!productId || !quantity || quantity <= 0) {
//       console.log("Invalid request parameters");
//       return res.status(400).json({ error: 'Invalid productId or quantity.' });
//     }

//     const product = await Product.findOne({ _id: productId });

//     if (!product) {
//       console.log(`Product ${productId} not found`);
//       return res.status(404).json({ error: 'Product not found.' });
//     }

//     console.log(`Product ${productId} current stock:`, product.stock);

//     if (product.stock < quantity) {
//       console.log(`Not enough stock for product ${productId}`);
//       return res.status(400).json({ error: 'Not enough stock available.' });
//     }

//     product.stock -= quantity;
//     await product.save();

//     console.log(`Stock updated for product ${productId}, new stock: ${product.stock}`);
    
//     res.status(200).json({ message: 'Product inventory updated successfully.' });
//   } catch (err) {
//     console.error("Error in decrement API:", err.message);
//     res.status(500).json({ error: err.message });
//   }
// });







// module.exports = router;



router.patch('/decrement', authenticate, async (req, res) => {  // ✅ No "/api/products" prefix here
  try {
    console.log("Decrement API hit");

    const { productId, quantity } = req.body;
    console.log("Received request:", req.body);

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid productId or quantity.' });
    }

    const product = await Product.findOne({ _id: productId });

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