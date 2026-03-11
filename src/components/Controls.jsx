import React from 'react';
import { waterPlant, toggleWatering } from '../services/api';

const Controls = () => {
  const handleWaterPlant = () => {
    waterPlant();
  };

  const handleToggleWatering = (status) => {
    toggleWatering(status);
  };

  return (
    <div>
      <button onClick={handleWaterPlant}>Water Plant</button>
      <button onClick={() => handleToggleWatering(true)}>Start Auto-Watering</button>
      <button onClick={() => handleToggleWatering(false)}>Stop Auto-Watering</button>
    </div>
  );
};

export default Controls;
