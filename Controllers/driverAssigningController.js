// controllers/matchmakingController.js
const Driver = require('../models/Driver');
const Package = require('../models/Package');
const { calculateDistance, calculateETA } = require('../utils/distanceCalculator')
 
const assignDriver = async (req, res) => {
    try {
        const { packageId } = req.body;

        // 1. Find the package to get its pickup location
        const deliveryPackage = await Package.findById(packageId);
        if (!deliveryPackage) {
            return res.status(404).json({ error: "Package not found." });
        }

        if (deliveryPackage.status !== 'PENDING') {
            return res.status(400).json({ 
                error: `Assignment failed. This package is currently marked as ${deliveryPackage.status}.`,
                assignedDriverId: deliveryPackage.driverId
            });
        }

        // FIX 2: Renamed variables to match the math formula below
        const [pickupLon, pickupLat] = deliveryPackage.pickupLocation.coordinates;

        // 2. The $near Query: Find the closest driver with capacity
        const nearestDriver = await Driver.findOne({
            status: 'AVAILABLE',
            $expr: { $lt: ['$currentLoad', '$maxCapacity'] },
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [pickupLon, pickupLat]
                    }
                }
            }
        });

        // 3. Handle No Match
        if (!nearestDriver) {
            return res.status(404).json({ 
                message: "No drivers are currently available or nearby." 
            });
        }

        // Leg A: Driver to Restaurant
        const driverToPickupKm = calculateDistance(
            nearestDriver.location.coordinates[1],
            nearestDriver.location.coordinates[0],
            pickupLat,
            pickupLon
        );

        // Leg B: Restaurant to Customer
        const [dropLon, dropLat] = deliveryPackage.dropoffLocation.coordinates;
        const pickupToDropoffKm = calculateDistance(
            pickupLat,
            pickupLon,
            dropLat,
            dropLon
        );

       // Calculate total distance (Leg A + Leg B)
        const totalDistanceKm = driverToPickupKm + pickupToDropoffKm;
        
        // Pass the TOTAL distance into your ETA tool
        const estimatedTimeMins = calculateETA(totalDistanceKm);

        // 4. Calculate capacity status
        const isNowFull = (nearestDriver.currentLoad + 1) >= nearestDriver.maxCapacity;
        const newStatus = isNowFull ? 'BUSY' : 'AVAILABLE';

        // 5. Atomic Update: Driver
        await Driver.findByIdAndUpdate(nearestDriver._id, {
            $inc: { currentLoad: 1 },
            status: newStatus
        });

        // 6. Atomic Update: Package
        const updatedPackage = await Package.findByIdAndUpdate(packageId, {
            driverId: nearestDriver._id,
            status: 'ASSIGNED'
        }, { new: true }); 

        // 7. Success Response
        res.status(200).json({
            message: "Driver successfully assigned!",
            driverAssigned: nearestDriver.name,
            distances: {
                driverToPickupKm: driverToPickupKm.toFixed(2),
                deliveryRouteKm: pickupToDropoffKm.toFixed(2),
                totalDistanceKm: totalDistanceKm.toFixed(2) // Good to send this to the frontend!
            },
            estimatedTotalTime: `${estimatedTimeMins} mins`,
            packageDetails: updatedPackage
        });

    } catch (error) {
        console.error("Matchmaking Error:", error);
        res.status(500).json({ error: "Internal server error during assignment." });
    }
};

module.exports = { assignDriver };