const express = require('express');
const router = express.Router();

// Just a placeholder route
router.get('/', (req, res) => {
    res.json({ message: 'User routes placeholder' });
});

module.exports = router; 