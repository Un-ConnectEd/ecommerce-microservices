const express = require('express');
const axios = require('axios');  // For interacting with the product service
const router = express.Router();
const Order = require('../models/Order');
const OrderLine = require('../models/OrderLine');
const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const { authenticate, authorize } = require('../middleware/auth');

// Helper function to get the active cart for a user
async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ createdBy: userId });
  if (!cart) {
    cart = new Cart({ createdBy: userId });
    await cart.save();
  }
  return cart;
}

// Checkout: Convert active cart into an order
router.post('/checkout', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentMethod, deliveryAddress } = req.body;

    if (!paymentMethod || !deliveryAddress) {
      return res.status(400).json({ error: 'Payment method and delivery address are required.' });
    }

    const cart = await getOrCreateCart(userId);
    const cartItems = await CartItem.find({ cartId: cart._id });

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty. Cannot proceed with checkout.' });
    }

    const order = new Order({
      userId,
      paymentMethod,
      deliveryAddress,
      paymentStatus: 'Pending',
      deliveryStatus: 'Pending',
      orderPlacedTime: new Date(),
      deliveryTime: new Date(new Date().setDate(new Date().getDate() + 7))
    });
    await order.save();

    let orderLines = [];
    let errors = [];

    for (const item of cartItems) {
      try {
        console.log(`Processing product ${item.productId}`);

        const productResponse = await axios.get(`http://localhost:3002/api/products/${item.productId}`);
        const product = productResponse.data;

        if (product.stock < item.quantity) {
          errors.push(`Not enough stock for product ${item.productId}.`);
          continue;
        }

        const orderLine = new OrderLine({
          orderId: order._id,
          productId: item.productId,
          price: item.price,
          quantity: item.quantity
        });

        await orderLine.save();
        orderLines.push(orderLine);
        console.log('Incoming Headers:', req.headers);

        console.log(`Decrementing stock for product ${item.productId}`);
        await axios.patch(
          'http://localhost:3002/api/products/decrement',
          { productId: item.productId, quantity: item.quantity },
          {
            headers: {
              'Authorization': req.headers.authorization,
              'Content-Type': 'application/json'
            }          
          }
        );

      } catch (error) {
        console.error(`Error processing product ${item.productId}:`, error.response?.data || error.message);
        errors.push(`Error processing product ${item.productId}.`);
      }
    }

    if (errors.length > 0) {
      console.error("Checkout Errors:", errors);
      return res.status(400).json({ error: errors });
    }

    await CartItem.deleteMany({ cartId: cart._id });

    res.status(201).json({
      message: 'Order created successfully.',
      order,
      orderLines
    });

  } catch (err) {
    console.error("Checkout Error:", err);
    res.status(500).json({ error: err.message });
  }
});





// Get orders for a user
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId });
    res.json(orders);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
