const express = require('express');
const app = express();
const dotenv = require('dotenv');
const connectDB = require('./Config/db.js');
const driverRoutes = require('./Routers/driverRoutes');
const packageRoutes = require('./Routers/packageRoutes');
const userRoutes = require('./Routers/userRoutes');

// loading the .env file variable 
dotenv.config();

const PORT = process.env.PORT || 3000;//define it after the config line to avoid error 


// loading the databse 
connectDB();
app.use(express.json());

const cors = require('cors');
app.use(cors()); // This tells the bouncer to let the Vite frontend talk to the Express backend!

 

app.use('/api/drivers', driverRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/user',userRoutes);


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})