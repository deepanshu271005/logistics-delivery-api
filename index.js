const express = require('express');
const app = express();
const dotenv = require('dotenv');
const connectDB = require('./Config/db.js');
const driverRoutes = require('./Routers/driverRoutes');
const packageRoutes = require('./Routers/packageRoutes');

// loading the .env file variable 
dotenv.config();

const PORT = process.env.PORT || 3000;//define it after the config line to avoid error 


// loading the databse 
connectDB();
app.use(express.json());


 

app.use('/api/drivers', driverRoutes);
app.use('/api/packages', packageRoutes);


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})