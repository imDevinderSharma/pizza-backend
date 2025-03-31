const express = require('express');
const router = express.Router();
const {
  getPizzas,
  getPizzaById,
  getFeaturedPizzas,
} = require('../controllers/pizzaController');

// Public routes
router.get('/', getPizzas);
router.get('/featured', getFeaturedPizzas);
router.get('/:id', getPizzaById);

module.exports = router; 