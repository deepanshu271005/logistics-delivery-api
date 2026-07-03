const Driver = require('../Models/Driver'); // loading the schema of the driver of this controller 

//async as the convo with the database takes time

//creating a new entry
const registerDriver = async (req, res) => {
    try {
        // 1. Get the logistic details from the frontend
        // Notice: No name or email needed! The central auth handles that.
        const { vehicleType, status, maxCapacity, location } = req.body;

        // 2. Check for the absolute required fields for logistics
        if (!vehicleType) {
            return res.status(400).json({ message: "Please provide a vehicle type." });
        }

        // 3. Prevent duplicate profiles
        // Check if this specific logged-in user already set up a driver profile.
        // We safely get their ID from req.user.userId (which the bouncer/middleware provided)
        const existingDriver = await Driver.findOne({ user: req.user.userId });
        if (existingDriver) {
            return res.status(400).json({ message: "You already have a driver profile set up!" });
        }

        // 4. Create the Driver profile and link it to the User's ID Card
        const newDriver = await Driver.create({
            user: req.user.userId, // This is the magical link to the central User model!
            vehicleType,
            status,      
            maxCapacity, 
            location     
        });

        // 5. Send a success message back to the frontend
        res.status(201).json({
            message: "Driver profile created successfully!",
            driver: newDriver
        });

    } catch (error) {
        console.error("Driver Profile Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

//reading all the driver info 
const getAllDrivers = async (req, res) => {
    try {
        // 1. Get the requested page from the URL query (default to 1)
        const page = parseInt(req.query.page) || 1;
        
        // 2. Set the limit, but ENFORCE a strict maximum of 10
        let limit = parseInt(req.query.limit) || 10;
        if (limit > 10) limit = 10;

        // 3. Calculate how many documents to skip
        // E.g., Page 1 skips 0. Page 2 skips 10. Page 3 skips 20.
        const skip = (page - 1) * limit;

        // 4. Apply .skip() and .limit() to the Mongoose query
        const drivers = await Driver.find()
            .populate('user', 'name email')
            .skip(skip)
            .limit(limit);

        // 5. Count total drivers in the DB (Crucial for the frontend to know how many pages exist)
        const totalDrivers = await Driver.countDocuments();

        // 6. Return a professional paginated response
        res.status(200).json({
            currentPage: page,
            totalPages: Math.ceil(totalDrivers / limit),
            totalDrivers: totalDrivers,
            returnedCount: drivers.length,
            drivers: drivers
        });
    } catch (error) {
        console.error("Error fetching drivers:", error);
        res.status(500).json({ error: "Internal server error while fetching drivers." });
    }
};

 
const updateDriverLocation = async (req, res) => {
    try {
        // 1. Get coordinates from the frontend
        const { longitude, latitude } = req.body;

        if (longitude === undefined || latitude === undefined) {
            return res.status(400).json({ message: "Longitude and latitude are required." });
        }

        // 2. Find THIS specific driver using their secure logged-in token ID!
        // We look for the Driver profile where the 'user' field matches req.user.userId
        const updatedDriver = await Driver.findOneAndUpdate(
            { user: req.user.userId }, 
            {
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude]  
                }
            },
            { returnDocument: 'after' } // Mongoose standard for returning the updated document
        );

        if (!updatedDriver) {
            return res.status(404).json({ message: "Driver profile not found. Please register as a driver first." });
        }

        res.status(200).json({
            message: "Location updated successfully!",
            driver: updatedDriver
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};



module.exports = { registerDriver, getAllDrivers, updateDriverLocation }; 