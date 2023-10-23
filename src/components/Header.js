import React from 'react';
import { Link } from 'react-router-dom';
import './styles/Header.css';


const Header = () => {
  return (
    <div className="header-container">
      <div className="header-logo-container">
        <Link to="/home">
            <i className="fa fa-shared fa-2x"></i>
          <img src="../logo.png" alt="App Logo" className="header-app-logo" />
        </Link>
      </div>
      <div className="header-items-container">
        <div className="header-item">
          <Link to="/home">
            <i className="fa fa-home fa-2x"></i>
          </Link>
        </div>
        
        <div className="header-item">
          <Link to="/user-profile">
            <i className="fa fa-user fa-2x"></i>
          </Link>
        </div>
        <div className="header-item">
          <Link to="/notifications">
            <i className="fa fa-bell fa-2x"></i>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Header;