const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // We use await because connecting to a database takes time
        const conn = await mongoose.connect(process.env.MONGO_URI);
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Database Connection Error: ${error.message}`);
        process.exit(1); // If the database fails to connect, shut down the server
    }
};

module.exports = connectDB;
// this file only works to connect my code with the database 