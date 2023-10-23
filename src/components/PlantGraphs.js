
import React from 'react';
import './styles/PlantGraphs.css';

const PlantGraphs = () => {
  return (
    <div className="plant-graphs-container">
      <h1>Plant Information Graphs</h1>
      <div className="graphs-section">
        <div className="graph-container">
          <h2>Watering History</h2>
          <div className="placeholder-graph watering-graph">
            {/* Replace with actual graph */}
          </div>
        </div>
        <div className="graph-container">
          <h2>Humidity History</h2>
          <div className="placeholder-graph humidity-graph">
            {/* Replace with actual graph */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlantGraphs;
