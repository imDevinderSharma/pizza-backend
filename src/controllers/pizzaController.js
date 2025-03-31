const Pizza = require('../models/Pizza');

// @desc    Get all pizzas
// @route   GET /api/pizzas
// @access  Public
const getPizzas = async (req, res) => {
  try {
    // Extract query parameters for filtering
    const { category } = req.query;
    
    // Build filter object
    const filter = {};
    if (category) {
      filter.category = category;
    }
    
    // Add filter for availability
    filter.isAvailable = true;
    
    const pizzas = await Pizza.find(filter);
    
    res.json(pizzas);
  } catch (error) {
    console.error('Error fetching pizzas:', error);
    res.status(500).json({ message: 'Server error while fetching pizzas' });
  }
};

// @desc    Get single pizza by ID
// @route   GET /api/pizzas/:id
// @access  Public
const getPizzaById = async (req, res) => {
  try {
    const pizza = await Pizza.findById(req.params.id);
    
    if (pizza) {
      res.json(pizza);
    } else {
      res.status(404).json({ message: 'Pizza not found' });
    }
  } catch (error) {
    console.error('Error fetching pizza by ID:', error);
    res.status(500).json({ message: 'Server error while fetching pizza' });
  }
};

// @desc    Get featured/popular pizzas
// @route   GET /api/pizzas/featured
// @access  Public
const getFeaturedPizzas = async (req, res) => {
  try {
    const featuredPizzas = await Pizza.find({ 
      isAvailable: true,
      isPopular: true 
    }).limit(4);
    
    res.json(featuredPizzas);
  } catch (error) {
    console.error('Error fetching featured pizzas:', error);
    res.status(500).json({ message: 'Server error while fetching featured pizzas' });
  }
};

module.exports = {
  getPizzas,
  getPizzaById,
  getFeaturedPizzas,
}; 