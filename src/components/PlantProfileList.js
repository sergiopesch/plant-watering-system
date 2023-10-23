import React, { useState, useEffect, useRef } from 'react';
import './styles/PlantProfileList.css';
import './styles/Shared.css';
import PlantList from './PlantList';

const MAX_PLANT_PROFILES = 3;
const CAMERA_DIMENSIONS = 300;

const PlantProfileList = ({ plants }) => {
  const [showModal, setShowModal] = useState(false);
  const [showSaveButton, setShowSaveButton] = useState(false); 
  const [plantProfiles, setPlantProfiles] = useState([]);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (showModal) {
      enableCamera();  
    }
  }, [showModal]);

  const enableCamera = async () => {
    try {
      setCameraEnabled(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Could not enable camera:", err);
      setCameraEnabled(false);
    }
  };

  const captureImage = () => {
    const context = canvasRef.current.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, CAMERA_DIMENSIONS, CAMERA_DIMENSIONS);
    const imageData = canvasRef.current.toDataURL();
    addPlantProfile({ image: imageData, id: new Date().getTime() });
    setShowModal(false);
  };

  const addPlantProfile = (profile) => {
    if (plantProfiles.length < MAX_PLANT_PROFILES) {
      setPlantProfiles([...plantProfiles, profile]);
    } else {
      alert(`You can only add up to ${MAX_PLANT_PROFILES} plant profiles.`);
    }
  };

  const deletePlantProfile = (id) => {
    const newProfiles = plantProfiles.filter(profile => profile.id !== id);
    setPlantProfiles(newProfiles);
  };

  return (
      <div className="plant-profile-list-container">
        {plantProfiles.map((profile) => (
          <div className="plant-card" key={profile.id}>
            <PlantList {...profile} />
            <div className="delete-icon" onClick={() => deletePlantProfile(profile.id)}>
            <span role="img" aria-label="delete">🗑️</span>
            </div>
          </div>
        ))}

        <button className="add-plant-button" onClick={() => setShowModal(true)}>
          <span className="add-plant-icon">+</span>
        </button>

      {showModal && (
        <div className="add-plant-modal">
          <div className="modal-content">
          <button className="close-modal-button" onClick={() => {setShowModal(false); setShowSaveButton(false);}}></button>
            <p className="start-message">Let's start with taking a picture of your home plant</p>
            {cameraEnabled && (
              <>
                <div className="camera-feed">
                  <video ref={videoRef} autoPlay={true} width={CAMERA_DIMENSIONS} height={CAMERA_DIMENSIONS}></video>
                </div>
                <button className="camera-icon-button iphone-camera-button" onClick={captureImage}></button>
                <canvas ref={canvasRef} width={CAMERA_DIMENSIONS} height={CAMERA_DIMENSIONS} style={{ display: 'none' }}></canvas>
              </>
            )}
            {showSaveButton && <button onClick={() => setShowModal(false)}>Save</button>}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantProfileList;
