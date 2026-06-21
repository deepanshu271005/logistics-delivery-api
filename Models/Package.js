const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    // 1. Who ordered it? (Links to the User.js file)
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
    },
     
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },
    
       //order kaha se pick krna h 

    pickupLocation: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true } 
    },


    //order kaha drop krna h 

    dropoffLocation: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true }
    },
     
    //status kya h order ka ->> kaha tak pahucha 
    status: {
        type: String,
        enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'],
        default: 'PENDING'
    }
}, { 
    timestamps: true 
});

packageSchema.index({ pickupLocation: "2dsphere" });
packageSchema.index({ dropoffLocation: "2dsphere" });

 
module.exports = mongoose.model('Package', packageSchema);