
import React from 'react';
import './styles/UserProfile.css';

const UserProfile = ({ user }) => {
  // Use actual data for the user's profile
  const profilePicture = user?.profilePicture || 'https://via.placeholder.com/150';
  const name = user?.username || 'User Name';
  const email = user?.email || 'user.name@example.com';
  const bio = "A software developer passionate about AI and web development.";  // Placeholder bio

  return (
    <div className="user-profile-container">
      <div className="user-profile-header">
        <img src={profilePicture} alt="User Profile" className="user-profile-image" />
        <h1>{name}</h1>
      </div>
      <div className="user-profile-details">
        <p><strong>Email:</strong> {email}</p>
        <p><strong>Bio:</strong> {bio}</p>
      </div>
    </div>
  );
};

export default UserProfile;
