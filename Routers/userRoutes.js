const express = require('express');
const router = express.Router();

//collecting the controller

const { registerUser } = require('../Controllers/userController');
const { getUserProfile } = require('../Controllers/userController');
const { protect } = require('../Middlewares/authMiddleware');




//calling the particular routes 
router.post('/create',registerUser);
router.get('/me', protect, getUserProfile);




module.exports = router;