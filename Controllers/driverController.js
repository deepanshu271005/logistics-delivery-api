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
        
        const drivers = await Driver.find();
        
       
        res.status(200).json({
            count: drivers.length,
            drivers: drivers
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


 
const updateDriverLocation = async (req, res) => {
    try {
         
        // 1-> get the id form the url using the params
        const { id } = req.params;
        
        // 2->> collect the data that frontends send that is the current location 
        const { longitude, latitude } = req.body;

        //checking valid or not 
        if (longitude === undefined || latitude === undefined) {
            return res.status(400).json({ message: "Longitude and latitude are required." });
        }

        // 3.->> find the driver and then update is location 
        const updatedDriver = await Driver.findByIdAndUpdate(
            id,
            {
                //overwriting the prev location with the curr coordinate
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude]  
                }
            },
           { returnDocument: 'after' } //this tells to store the new data in the updated driver
        );

        if (!updatedDriver) {
            return res.status(404).json({ message: "Driver not found" });
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