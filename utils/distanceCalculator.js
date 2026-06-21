 

// Helper function to convert degrees to radians
const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Straight-line distance in km
    
    // Add a 30% "Wiggle Factor" to simulate real-world road turns
    const estimatedRoadDistance = distance * 1.3; 
    
    return estimatedRoadDistance;
};

const calculateETA = (distanceKm, averageSpeedKmh = 40) => {
    // Time = Distance / Speed (This gives us hours)
    const timeInHours = distanceKm / averageSpeedKmh;
    
    // Convert hours to minutes
    const timeInMinutes = timeInHours * 60;
    
    // Let's add a realistic 5-minute buffer for parking, picking up the package, etc.
    const realisticETA = Math.ceil(timeInMinutes) + 5; 
    
    return realisticETA;
};

// Update your export box at the bottom to include BOTH tools
module.exports = { calculateDistance, calculateETA };