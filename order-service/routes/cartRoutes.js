const express = require('express');
const axios = require('axios');
const router = express.Router();
const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const { authenticate } = require('../middleware/auth');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3000/products';

// create or find the cart
async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ createdBy: userId });
  if (!cart) {
    cart = new Cart({ createdBy: userId });
    await cart.save();
  }
  return cart;
}
//check products
async function fetchProduct(productId) {
  try {
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/api/products/${productId}`);
    return response.data;
  } catch (err) {
    throw new Error('Product not found or service unavailable.');
  }
}

// Add or update an item
router.post('/items', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Missing or invalid productId or quantity.' });
    }

    const product = await fetchProduct(productId);
    const minOrderSize = product.minimum_order_size || 1;

    const cart = await getOrCreateCart(userId);
    let cartItem = await CartItem.findOne({ cartId: cart._id, productId });

    if (!cartItem) {
      if (quantity < minOrderSize) {
        return res.status(400).json({
          error: `Minimum order quantity for this product is ${minOrderSize}.`
        });
      }

      cartItem = new CartItem({
        cartId: cart._id,
        productId,
        price: parseFloat(product.final_price),
        quantity,
      });
    } else {
      cartItem.quantity += quantity;
    }

    await cartItem.save();
    res.status(200).json(cartItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Increase item quantity
router.post('/items/increase', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Missing productId.' });
    }

    const cart = await getOrCreateCart(userId);
    const cartItem = await CartItem.findOne({ cartId: cart._id, productId });

    if (!cartItem) {
      return res.status(404).json({ error: 'Item not found in cart.' });
    }

    cartItem.quantity += 1;
    await cartItem.save();
    res.status(200).json(cartItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Decrease item quantity
router.post('/items/decrease', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Missing productId.' });
    }

    const cart = await getOrCreateCart(userId);
    const cartItem = await CartItem.findOne({ cartId: cart._id, productId });

    if (!cartItem) {
      return res.status(404).json({ error: 'Item not found in cart.' });
    }

    if (cartItem.quantity > 1) {
      cartItem.quantity -= 1;
      await cartItem.save();
    } else {
      await CartItem.deleteOne({ cartId: cart._id, productId });
    }

    res.status(200).json(cartItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove an item
router.post('/items/remove', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Missing productId.' });
    }

    const cart = await getOrCreateCart(userId);
    const cartItem = await CartItem.findOneAndDelete({ cartId: cart._id, productId });

    if (!cartItem) {
      return res.status(404).json({ error: 'Item not found in cart.' });
    }

    res.json({ message: 'Item removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all items in the cart
router.get('/items', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await getOrCreateCart(userId);
    const items = await CartItem.find({ cartId: cart._id });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete the cart and its items
router.delete('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOneAndDelete({ createdBy: userId });

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found.' });
    }

    await CartItem.deleteMany({ cartId: cart._id });
    res.json({ message: 'Cart and items deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
