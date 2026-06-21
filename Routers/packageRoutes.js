// Routers/packageRoutes.js
const express = require('express');
const router = express.Router();

const { createPackage } = require('../Controllers/packageController');

// POST route to create a new package
router.post('/create', createPackage);

module.exports = router;