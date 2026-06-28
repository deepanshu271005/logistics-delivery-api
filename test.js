require('dotenv').config();
const { getCoordinates } = require('./utils/geoService');

getCoordinates("Dehradun, India")
    .then(coords => console.log("Success! Coordinates:", coords))
    .catch(err => console.error("Error:", err.message));