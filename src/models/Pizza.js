const mongoose = require('mongoose');

const pizzaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    prices: {
      small: {
        type: Number,
        required: true,
      },
      medium: {
        type: Number,
        required: true,
      },
      large: {
        type: Number,
        required: true,
      },
    },
    ingredients: [String],
    category: {
      type: String,
      enum: ['vegetarian', 'non-vegetarian', 'specialty'],
      default: 'specialty',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Pizza = mongoose.model('Pizza', pizzaSchema);

module.exports = Pizza; 