const express = require('express');
const mongoose = require('mongoose');
const reviewRoutes = require('./routes/reviewRoutes');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv').config()

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to the Review database
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Review Service MongoDB connected'))
  .catch(err => console.error(err));

app.use('/api/reviews', reviewRoutes);

app.get('/', (req, res) => {
  res.send('Review Service Running');
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => console.log(`Review Service running on port ${PORT}`));
