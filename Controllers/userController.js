
const User = require('../models/User');  
const bcrypt = require('bcryptjs');


const loginUser = async (req, res) => {
    try {
        // 1. Get the input from the request body
        const { email, password } = req.body;

        // Check if the user actually typed both fields
        if (!email || !password) {
            return res.status(400).json({ error: "Please provide both email and password." });
        }

        // 2. Check if they are present in the database
        const user = await User.findOne({ email });
        
        if (!user) {
            // Security Best Practice: Do not say "Email not found". 
            // It tells hackers which emails exist in your system. Use a vague error.
            return res.status(401).json({ error: "Invalid email or password." });
        }

        // 3. Check if the password is correct
        // We throw the typed password into the bcrypt meat grinder and compare it to the DB hash
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        // 4. Create the JWT Wristband
        const token = jwt.sign(
            { userId: user._id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // 5. Return data as JSON (Yes, returning the token + safe user data is the industry standard!)
        res.status(200).json({
            message: "Login successful!",
            token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Server error during login." });
    }
};



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



const getUserProfile = async (req, res) => {
    try {
        // req.user was securely attached to the request by your 'protect' bouncer!
        // We use .select('-password') so the hash never accidentally leaks to the frontend
        const user = await User.findById(req.user.userId).select('-password');

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        // Send the clean user data to the frontend
        res.status(200).json({
            message: "Profile fetched successfully",
            user: user
        });

    } catch (error) {
        console.error("Profile Fetch Error:", error);
        res.status(500).json({ error: "Internal server error fetching profile." });
    }
};

module.exports = {
    registerUser,getUserProfile,loginUser
};