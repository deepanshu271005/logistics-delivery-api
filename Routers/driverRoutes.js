const express = require('express');
const router = express.Router();

// driver controller ko load kiya
const { registerDriver } = require('../Controllers/driverController');
const { getAllDrivers } = require('../Controllers/driverController');
const { updateDriverLocation }=require('../Controllers/driverController');
const { assignDriver } = require('../Controllers/driverAssigningController');
const { protect, adminOnly } = require('../Middlewares/authMiddleware');

 //is route or aane waali post querry ko direct kr do contorller ko
router.post('/',protect, registerDriver);
router.get('/',protect, adminOnly, getAllDrivers);
router.put('/:id/location', updateDriverLocation);
router.post('/assign-driver',assignDriver);


 
module.exports = router;