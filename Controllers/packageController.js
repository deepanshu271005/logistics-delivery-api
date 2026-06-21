// Controllers/packageController.js
const Package = require('../models/Package');

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

module.exports = {
    createPackage
};