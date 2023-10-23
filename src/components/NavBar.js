import React from 'react';
import { Link } from 'react-router-dom';
import './styles/NavBar.css';
import './styles/Shared.css';


const NavBar = () => {
  return (
    <div className="nav-container">
      <div className="nav-item">
        <Link to="/plant-profile-list">
          <i className="fa fa-leaf fa-2x"></i>
          <i className="fa fa-shared fa-2x"></i>
        </Link>
      </div>
      <div className="nav-item">
        <Link to="/plant-graphs">
          <i className="fa fa-bar-chart fa-2x"></i>  {/* Or any other dashboard/metrics-related icon */}
        </Link>
      </div>
      <div className="nav-item">
        <Link to="/settings">
          <i className="fa fa-cog fa-2x"></i>
        </Link>
      </div>
    </div>
  );
};

export default NavBar;
