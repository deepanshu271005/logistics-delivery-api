// Routers/packageRoutes.js
const express = require('express');
const router = express.Router();

const { createPackage } = require('../Controllers/packageController');
const { trackPackage } = require('../controllers/packageController');

// POST route to create a new package
router.post('/create', createPackage);
router.get('/track/:packageId', trackPackage);

module.exports = router;