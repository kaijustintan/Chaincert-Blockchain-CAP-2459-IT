const express = require('express');

const router = express.Router();

// GET /api/health
// Health check route.
router.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

module.exports = router;