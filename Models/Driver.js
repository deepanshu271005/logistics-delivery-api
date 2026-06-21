const mongoose = require('mongoose');

//driver->>we need unique identification ,availability,postion 


const driverSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true 
    },
    vehicleType: {
        type: String,
        enum: ['bike', 'car', 'van'],  
        required: true
    },
    status: {
        type: String,
        enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
        default: 'AVAILABLE'
    },
     currentLoad: {
        type: Number,
        default: 0
    },
    maxCapacity: {
        type: Number,
        required: true,
        default: 1 // Default to 1, but you can set this higher for vans/cars
    },
    

    //location will be identified by lat and long 
    // but thery are stored in form of point for heavy computing 
    
    location: {
        type: {
            type: String,
            enum: ['Point'], 
            default: 'Point'
        },
        coordinates: {
            type: [Number], // Always [longitude, latitude]
            default: [0, 0]
        }
    }
}, { 
    timestamps: true 
});

 driverSchema.index({ location: "2dsphere" });
 // this above line divide the earth in the grid
 // this save time for searching instead linearly to search by indexing 

module.exports = mongoose.models.Driver || mongoose.model('Driver', driverSchema);