import React from 'react';
import './styles/HomePage.css';
import './styles/Shared.css';
import { getAuth, signOut } from 'firebase/auth';
import Header from './Header.jsx';
import NavBar from './NavBar.jsx';

const HomePage = () => {

  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        console.log('User signed out');  
      })
      .catch(error => {
        console.error('Error signing out: ', error);
      });
  }

  return (
    <div className="homepage">

      <Header />

      <div className="page-content">
        <button onClick={handleSignOut}>Sign Out</button>
      </div>

      <NavBar />

    </div>
  );

};

export default HomePage;

