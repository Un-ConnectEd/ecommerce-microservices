const express = require('express');
const mongoose = require('mongoose');
const sellerRoutes = require('./routes/sellerRoutes');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv').config()
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to the Seller database
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('User Service (with orders & carts) MongoDB connected'))
  .catch(err => console.error(err));


app.use('/api/seller', sellerRoutes);

app.get('/', (req, res) => {
  res.send('Seller Service Running');
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Seller Service running on port ${PORT}`));
