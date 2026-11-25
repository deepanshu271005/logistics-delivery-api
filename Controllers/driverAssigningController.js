// controllers/matchmakingController.js
const Driver = require('../Models/Driver');
const Package = require('../Models/Package');
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

        // 2. ATOMIC Find + Update: Find the closest available driver AND claim them in ONE operation
        // This prevents race conditions — two orders can't grab the same driver
        const nearestDriver = await Driver.findOneAndUpdate(
            {
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
            },
            {
                $inc: { currentLoad: 1 }  // Claim this driver immediately!
            },
            { returnDocument: 'after' }   // Return the UPDATED driver document
        );

        // 3. Handle No Match
        if (!nearestDriver) {
            return res.status(404).json({ 
                message: "No drivers are currently available or nearby." 
            });
        }

        // 4. Now update the driver's status based on new load (already incremented above)
        const isNowFull = nearestDriver.currentLoad >= nearestDriver.maxCapacity;
        if (isNowFull) {
            await Driver.findByIdAndUpdate(nearestDriver._id, { status: 'BUSY' });
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

        // 6. Atomic Update: Package
        const updatedPackage = await Package.findByIdAndUpdate(packageId, {
            driverId: nearestDriver._id,
            status: 'ASSIGNED'
        }, { returnDocument: 'after' }); 

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