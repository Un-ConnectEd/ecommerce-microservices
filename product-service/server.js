const express = require('express');
const mongoose = require('mongoose');
const productRoutes = require('./routes/productRoutes');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv').config()

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to the Product database
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Product Service MongoDB connected'))
  .catch(err => console.error(err));

app.use('/api/products', productRoutes);

app.get('/', (req, res) => {
  res.send('Product Service Running');
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Product Service running on port ${PORT}`));
