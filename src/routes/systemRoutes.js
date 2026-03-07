const express = require('express');

function createSystemRoutes() {
  const router = express.Router();

  // GET /api/health - Health check.
  router.get('/health', (req, res) => {
    res.json({ status: 'OK' });
  });

  return router;
}

module.exports = createSystemRoutes;
