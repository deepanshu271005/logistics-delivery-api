// Controllers/packageController.js
const Package = require('../models/Package');
const Driver = require('../models/Driver');
const { calculateDistance, calculateETA } = require('../utils/distanceCalculator');

const createPackage = async (req, res) => {
    try {
        const { customerId, pickupLocation, dropoffLocation } = req.body;

        // Create the new package in the database
        const newPackage = await Package.create({
            customerId,
            pickupLocation,
            dropoffLocation
        });

        // Return the created package so we can copy its ID for testing
        res.status(201).json({
            message: "Package successfully created",
            packageDetails: newPackage
        });

    } catch (error) {
        console.error("Error creating package:", error);
        res.status(500).json({ error: "Internal server error while creating package." });
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

        // 2. Ensure a driver is actually assigned
        if (deliveryPackage.status === 'PENDING' || !deliveryPackage.driverId) {
            return res.status(400).json({ 
                message: "Package is not assigned to a driver yet.",
                status: deliveryPackage.status
            });
        }

        // 3. Find the driver to get their CURRENT location
        const driver = await Driver.findById(deliveryPackage.driverId);
        if (!driver) {
            return res.status(404).json({ error: "Assigned driver not found in database." });
        }

        //Calculating the ETA and the Distance with the [lat,long] obtained 
        let targetCoordinates;
        let trackingStage;
        if (deliveryPackage.status === 'ASSIGNED') {
            // Driver is moving toward the pickup location
            targetCoordinates = deliveryPackage.pickupLocation.coordinates;
            trackingStage = "Driver heading to pickup location";
        } else {
            // Driver has picked up the item and is moving toward the customer dropoff location
            targetCoordinates = deliveryPackage.dropoffLocation.coordinates;
            trackingStage = "Driver heading to dropoff destination";
        }

        const distanceRemainingKm = calculateDistance(
            driver.location.coordinates[1], // Driver current Latitude
            driver.location.coordinates[0], // Driver current Longitude
            targetCoordinates[1],           // Next Target Latitude
            targetCoordinates[0]            // Next Target Longitude
        );
        const etaRemainingMins = calculateETA(distanceRemainingKm);


        // 4. Return the clean, live tracking data
        res.status(200).json({
            packageId: deliveryPackage._id,
            status: deliveryPackage.status,
            trackingStage,
            driverName: driver.name,
            liveLocation: {
                type: "Point",
                // Remember: MongoDB stores as [Longitude, Latitude]
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


module.exports = {
    createPackage,trackPackage
};