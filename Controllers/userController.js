
const User = require('../models/User');  
const bcrypt = require('bcryptjs');

const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // 1. Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                error: "A user with this email already exists. Please log in." 
            });
        }

        // 2. Security Step: Hash the password
        // The "salt" adds random data to the password before hashing it, making it uncrackable.
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Create the new user with the SCRAMBLED password
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'Customer'  
        });

        await newUser.save();

        // 4. Return success (Never send the password back in the response)
        res.status(201).json({
            message: "User registered successfully!",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ error: "Internal server error during registration." });
    }
};

module.exports = {
    registerUser
};