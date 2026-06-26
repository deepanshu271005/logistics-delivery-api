const mongoose = require('mongoose');


// we are not attaching the location to the user so that 
//it will be flexible to the user to place pakage anywhere 

const userSchema = new mongoose.Schema({
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
    password: { 
        type: String, 
        required: true 
    },
    role: {
        type: String,
        enum: ['Customer', 'Admin','Driver'],  
        default: 'Customer'
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('User', userSchema);