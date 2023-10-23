
import React, { useState } from 'react';
import 'font-awesome/css/font-awesome.min.css';
import './styles/Home.css';
import { useGlobalContext } from '../GlobalContext';
import NavBar from './NavBar';
import HomePage from './HomePage';
import Header from './Header';
import './styles/Shared.css';

const Home = ({ user }) => {
  const [isNewUser, setIsNewUser] = useState(true);
  const { username } = useGlobalContext();

  return (
    <div className="home-container">
      <Header />
      <NavBar user={user} />
      <div className="toggle-container">
        <label>New User</label>
        <input 
          type="checkbox" 
          checked={isNewUser} 
          onChange={() => setIsNewUser(prevIsNewUser => !prevIsNewUser)}
        />
      </div>
      <div className="user-info">
        <img src={user?.profilePicture} alt="User Profile" className="user-profile-picture" />
        <p>Welcome, {user?.username || "User"}</p>
      </div>
      <HomePage isNewUser={isNewUser} username={username || user?.username || "User"} />
    </div>
  );
};

export default Home;
