const Driver = require('../Models/Driver'); // loading the schema of the driver of this controller 

//async as the convo with the database takes time

//creating a new entry
const registerDriver = async (req, res) => {
    try {
        // 1->> get the data send by the frontend for creating a driver 
        const { name, email, vehicleType } = req.body;

        // 2->> is complete info?
        if (!name || !email || !vehicleType) {
            return res.status(400).json({ message: "Please provide all required fields." });
        }

        // 3->> is valid for new account ??
        const existingDriver = await Driver.findOne({ email });
        if (existingDriver) {
            return res.status(400).json({ message: "A driver with this email already exists!" });
        }

        // 4->> create an insert the new driver
        const newDriver = await Driver.create({
            name,
            email,
            vehicleType
        });

        // 5->> Send a success message back to the frontend
        res.status(201).json({
            message: "Driver registered successfully!",
            driver: newDriver
        });

    } catch (error) {
        console.error(error);
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
            { new: true }  //this tells to store the new data in the updated driver
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