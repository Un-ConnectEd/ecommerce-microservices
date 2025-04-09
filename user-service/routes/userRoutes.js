const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many attempts, please try again later'
});
// Register a new user
router.post('/register', async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }

    const user = new User(req.body);
    delete user.role;

    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 3600000, // 1 hour
    });
    
    const userDetails = {
      _id: user._id,
      email: user.email,
      role: user.role
    };
    res.status(201).json({ user: userDetails});
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login user
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 3600000,
    });

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout user
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.status(200).json({ message: 'Logged out successfully' });
});

// Check if user is logged in
router.get('/check', (req, res) => {
  const token = req.cookies.authToken;
  if (!token) return res.status(200).json({ loggedIn: false });

  try {
    jwt.verify(token, JWT_SECRET);
    res.status(200).json({ loggedIn: true });
  } catch (err) {
    res.status(200).json({ loggedIn: false });
  }
});

// Get user by ID (protected route)
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
