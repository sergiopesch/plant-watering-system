import React, { useState, useEffect } from 'react';
import { getSensorData } from '../services/api';

const Dashboard = () => {
  const [sensorData, setSensorData] = useState({});

  useEffect(() => {
    // Fetch sensor data periodically
    const interval = setInterval(() => {
      getSensorData().then((response) => {
        setSensorData(response.data);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Moisture Level: {sensorData.moisture}</p>
      {/* Add more sensor data as needed */}
    </div>
  );
};

export default Dashboard;
