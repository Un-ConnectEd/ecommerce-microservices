const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProductSchema = new Schema({
  _id: { type: Number },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  price: { type: Number, required: true },
  discountPercentage: { type: Number },
  rating: { type: Number, default: 0 },
  stock: { type: Number },
  tags: [{ type: String }],
  brand: { type: String },
  sku: { type: String },
  weight: { type: Number },
  dimensions: {
    width: Number,
    height: Number,
    depth: Number
  },
  warrantyInformation: { type: String },
  shippingInformation: { type: String },
  availabilityStatus: { type: String },
  returnPolicy: { type: String },
  minimumOrderQuantity: { type: Number },
  meta: {
    createdAt: { type: Date },
    updatedAt: { type: Date },
    barcode: { type: String },
    qrCode: { type: String }
  },
  images: [{ type: String }],
  thumbnail: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  seller: { type: String, ref: 'Seller', required: true }
});

module.exports = mongoose.model('Product', ProductSchema);
