// Routers/packageRoutes.js
const express = require('express');
const router = express.Router();

const { createPackage } = require('../controllers/packageController');
const { trackPackage } = require('../controllers/packageController');
const { completeDelivery } = require('../controllers/packageController');
const { pickUpPackage } = require('../controllers/packageController');
const { protect } = require('../Middlewares/authMiddleware');

// POST route to create a new package
router.post('/create',protect, createPackage);
router.get('/track/:packageId',protect, trackPackage);
router.put('/:packageId/complete',protect, completeDelivery);
router.put('/:packageId/pickup',protect, pickUpPackage);


module.exports = router;