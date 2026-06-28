// Controllers/packageController.js
const Package = require('../models/Package');
const Driver = require('../models/Driver');
const { calculateDistance, calculateETA } = require('../utils/distanceCalculator');

const createPackage = async (req, res) => {
    try {
        // We DON'T pull customerId from req.body anymore
        const { pickupLocation, dropoffLocation } = req.body;

        // Create the new package
        const newPackage = await Package.create({
            // We pull it from the 'protect' middleware's data instead!
            customerId: req.user.userId, 
            pickupLocation,
            dropoffLocation
        });

        res.status(201).json({
            message: "Package successfully created",
            packageDetails: newPackage
        });

    } catch (error) {
        // This log will now show the REAL error from Mongoose
        console.error("Error creating package:", error);
        res.status(500).json({ error: error.message });
    }
};


const trackPackage = async (req, res) => {
    try {
        const { packageId } = req.params;

        // 1. Find the package
        const deliveryPackage = await Package.findById(packageId);
        if (!deliveryPackage) {
            return res.status(404).json({ error: "Package not found." });
        }

        // 2. Prevent action on already delivered packages
        if (deliveryPackage.status === 'DELIVERED') {
            return res.status(400).json({ 
                message: "This package has already been delivered.",
                packageId: deliveryPackage._id
            });
        }

        // 3. Ensure a driver is actually assigned
        if (deliveryPackage.status === 'PENDING' || !deliveryPackage.driverId) {
            return res.status(400).json({ 
                message: "Package is not assigned to a driver yet.",
                status: deliveryPackage.status
            });
        }

        // 4. Find the driver to get their CURRENT location
        const driver = await Driver.findById(deliveryPackage.driverId);
        if (!driver) {
            return res.status(404).json({ error: "Assigned driver not found in database." });
        }

        // 5. Dynamic Target System: Calculate TOTAL remaining trip
        let distanceRemainingKm = 0;
        let trackingStage = "";

        if (deliveryPackage.status === 'ASSIGNED') {
            trackingStage = "Driver heading to pickup location";
            
            // Leg A: Driver Current Location to Restaurant
            const driverToPickup = calculateDistance(
                driver.location.coordinates[1], driver.location.coordinates[0],
                deliveryPackage.pickupLocation.coordinates[1], deliveryPackage.pickupLocation.coordinates[0]
            );
            
            // Leg B: Restaurant to Customer
            const pickupToDropoff = calculateDistance(
                deliveryPackage.pickupLocation.coordinates[1], deliveryPackage.pickupLocation.coordinates[0],
                deliveryPackage.dropoffLocation.coordinates[1], deliveryPackage.dropoffLocation.coordinates[0]
            );
            
            // THE UNIFIED MATH: Add both legs together!
            distanceRemainingKm = driverToPickup + pickupToDropoff;

        } else if (deliveryPackage.status === 'IN_TRANSIT') {
            trackingStage = "Driver heading to dropoff destination";
            
            // Driver already has the package, Leg A is finished.
            // We only calculate Leg B: Driver to Customer
            distanceRemainingKm = calculateDistance(
                driver.location.coordinates[1], driver.location.coordinates[0],
                deliveryPackage.dropoffLocation.coordinates[1], deliveryPackage.dropoffLocation.coordinates[0]
            );
        }

        // 6. Run the live ETA calculation on the synchronized distance
        const etaRemainingMins = calculateETA(distanceRemainingKm);

        // 7. Return the synchronized JSON response
        res.status(200).json({
            packageId: deliveryPackage._id,
            status: deliveryPackage.status,
            trackingStage,
            driverName: driver.name,
            liveLocation: {
                type: "Point",
                coordinates: driver.location.coordinates
            },
            liveMetrics: {
                distanceRemainingKm: distanceRemainingKm.toFixed(2),
                etaRemainingMins: `${etaRemainingMins} mins`
            }
        });

    } catch (error) {
        console.error("Tracking Error:", error);
        res.status(500).json({ error: "Internal server error during tracking." });
    }
};




const pickUpPackage = async (req, res) => {
    try {
        const { packageId } = req.params;
        const userId = req.user.userId; // 1. Grab the ID from the wristband

        // 2. Translate the user ID into the Driver profile
        const loggedInDriver = await Driver.findOne({ user: userId });
        if (!loggedInDriver) {
            return res.status(403).json({ message: "Access denied. You are not registered as a driver." });
        }

        // 3. Find the package
        const deliveryPackage = await Package.findById(packageId);
        if (!deliveryPackage) {
            return res.status(404).json({ error: "Package not found." });
        }


        // 5. The package MUST be ASSIGNED before it can be picked up
        if (deliveryPackage.status !== 'ASSIGNED') {
            return res.status(400).json({ 
                error: `Cannot pick up package. Current status is: ${deliveryPackage.status}` 
            });
        }


        // 4. THE BIG SECURITY CHECK!
        // Is the person making this request the actual driver assigned to the package?
        if (deliveryPackage.driverId.toString() !== loggedInDriver._id.toString()) {
            return res.status(403).json({ message: "Access denied. You are not assigned to pick up this package!" });
        }

   
        // 6. Update status to IN_TRANSIT
        deliveryPackage.status = 'IN_TRANSIT';
        await deliveryPackage.save();

        res.status(200).json({
            message: "Package picked up successfully! Driver is on route to customer.",
            packageId: deliveryPackage._id,
            status: deliveryPackage.status
        });

    } catch (error) {
        console.error("Pickup Error:", error);
        res.status(500).json({ error: "Internal server error during pickup." });
    }
};



const completeDelivery = async (req, res) => {
    try {
        const { packageId } = req.params;
        const userId = req.user.userId; // Grab the ID Card from the secure wristband

        // 1. Translate the ID Card into the Work Uniform (Find the logged-in Driver)
        const loggedInDriver = await Driver.findOne({ user: userId });//this tell the findone to check the user object in the driver DB and check the user->>UserId of driver DB
        if (!loggedInDriver) {
            return res.status(403).json({ message: "You are not registered as a driver." });
        }

        // 2. Find the package
        const deliveryPackage = await Package.findById(packageId);
        if (!deliveryPackage) {
            return res.status(404).json({ error: "Package not found." });
        }

        // 3. THE BIG SECURITY CHECK!
        // Does the package's assigned driver match the person making this request?
        if (deliveryPackage.driverId.toString() !== loggedInDriver._id.toString()) {
            return res.status(403).json({ message: "Access denied. You are not assigned to this package!" });
        }

        // 4. Prevent double-deliveries
        if (deliveryPackage.status === 'DELIVERED') {
            return res.status(400).json({ error: "Package has already been delivered." });
        }

        // 5. Update the Package
        deliveryPackage.status = 'DELIVERED';
        await deliveryPackage.save();

        // 6. Update the Driver's capacity Atomically (Using the ID we already verified!)
        const updatedDriver = await Driver.findByIdAndUpdate(
            loggedInDriver._id, 
            { 
                $inc: { currentLoad: -1 }, 
                $set: { status: 'AVAILABLE' } 
            }, 
            { returnDocument: 'after' } // Mongoose standard to return the updated document
        ).populate('user', 'name'); // We populate the user so we can send their name back!

        // 7. Return Success Response
        res.status(200).json({
            message: "Delivery completed successfully!",
            packageId: deliveryPackage._id,
            packageStatus: deliveryPackage.status,
            driverDetails: {
                name: updatedDriver.user?.name || "Unknown Driver", // Safely grabbing the name from the populated user
                newLoad: updatedDriver.currentLoad,
                driverNewStatus: updatedDriver.status
            }
        });

    } catch (error) {
        console.error("Completion Error:", error);
        res.status(500).json({ error: "Internal server error completing delivery." });
    }
};


module.exports = {
    createPackage,trackPackage,completeDelivery,pickUpPackage
};