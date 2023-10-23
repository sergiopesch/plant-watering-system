import React, { useContext } from 'react';
import { GlobalContext } from '../GlobalContext';  // Import GlobalContext
import './styles/PlantProfile.css';
import './styles/Shared.css';

const PlantProfile = () => {
  const { plantImage } = useContext(GlobalContext);  // Access the global state for plantImage

  return (
    <div className="plant-profile-container">
      <div className="plant-profile-card">
        <div className="plant-profile-image-container">
          {/* Dynamic image from global state */}
          { plantImage ? <img src={plantImage} alt="Plant" width="200" height="200" /> : "Loading..." }
        </div>
        <div className="plant-profile-info">
          <h2 className="plant-name">Plant Name</h2> {/* Replace with your dynamic data */}
          <p className="plant-origin">Origin: Tropical</p> {/* Replace with your dynamic data */}
          <p className="plant-type">Indoor / Outdoor: Indoor</p> {/* Replace with your dynamic data */}
          <p className="plant-watering">Watering: Moderate</p> {/* Replace with your dynamic data */}
          <p className="plant-sun">Sunlight: Partial Shade</p> {/* Replace with your dynamic data */}
        </div>
      </div>

      <div className="plant-profile-recommendations">
        <h3>Recommendations</h3>
        <p>Make sure to water the plant once a week.</p> {/* Replace with your dynamic data */}
        <p>Keep the plant in partial shade for optimal growth.</p> {/* Replace with your dynamic data */}
      </div>
    </div>
  );
};

export default PlantProfile;
