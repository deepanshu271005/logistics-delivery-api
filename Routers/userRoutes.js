const express = require('express');
const router = express.Router();

//collecting the controller

const { registerUser } = require('../Controllers/userController');



//calling the particular routes 
router.post('/create',registerUser);




module.exports = router;