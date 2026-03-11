import React from 'react';  // Removed the unnecessary useContext import
import './styles/PlantList.css';
import './styles/Shared.css';

const PlantList = (props) => {

  return (
    <div className="plant-list-container">
      
        <div className="plant-list-image-container">
          {/* Dynamic image from props */}
          { props.image ? <img src={props.image} alt="Plant" width="200" height="200" /> : "Loading..." }
        </div>
        <div className="plant-list-info">
          <h2 className="plant-name">Plant Name</h2> {/* Replace with your dynamic data */}
          <p className="plant-origin">Origin: Tropical</p> {/* Replace with your dynamic data */}
          <p className="plant-type">Indoor / Outdoor: Indoor</p> {/* Replace with your dynamic data */}
          <p className="plant-watering">Watering: Moderate</p> {/* Replace with your dynamic data */}
          <p className="plant-sun">Sunlight: Partial Shade</p> {/* Replace with your dynamic data */}
        </div>
      

      <div className="plant-list-recommendations">
        <h3>Recommendations</h3>
        <p>Make sure to water the plant once a week.</p> {/* Replace with your dynamic data */}
        <p>Keep the plant in partial shade for optimal growth.</p> {/* Replace with your dynamic data */}
      </div>
    </div>
  );
};

export default PlantList;
