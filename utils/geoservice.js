const axios = require('axios');

const getCoordinates = async (address) => {
    // This pulls exactly from your .env file
    const apiKey = process.env.GEOAPIFY_KEY; 
    
    if (!apiKey) {
        throw new Error("Missing API Key. Check your .env file.");
    }

    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&apiKey=${apiKey}`;
    
    const response = await axios.get(url);
    
    if (response.data.features.length === 0) {
        throw new Error("Address not found.");
    }

    const [lon, lat] = response.data.features[0].geometry.coordinates;
    return { lon, lat };
};

module.exports = { getCoordinates };