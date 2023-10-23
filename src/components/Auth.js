
// Assuming you have a firebase.js file with the necessary Firebase initialization
import firebase from '../firebase';
import React from 'react';
import { getAuth, GoogleAuthProvider, TwitterAuthProvider, signInWithPopup } from "firebase/auth";
import { getDatabase, ref, get, set } from "firebase/database";
import '../styles/Auth.css';
import 'font-awesome/css/font-awesome.min.css';
import logo from '../logo.png';

const Auth = () => {
  const auth = getAuth();

  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        const user = result.user;
        const db = getDatabase();
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
          if (snapshot.exists()) {
            // Existing user logic
            set(ref(db, 'users/' + user.uid), {
              profilePicture: user.photoURL,
              username: user.displayName,
              email: user.email,
              isNewUser: false
            });
          } else {
            // New user logic
            set(ref(db, 'users/' + user.uid), {
              profilePicture: user.photoURL,
              username: user.displayName,
              email: user.email,
              isNewUser: true
            });
          }
        });
      })
      .catch((error) => {
        console.error('Google Sign-In error:', error);
      });
  };

  const handleTwitterSignIn = () => {
    const provider = new TwitterAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        const user = result.user;
        const db = getDatabase();
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
          if (snapshot.exists()) {
            // Existing user logic
            set(ref(db, 'users/' + user.uid), {
              profilePicture: user.photoURL,
              username: user.displayName,
              email: user.email,
              isNewUser: false
            });
          } else {
            // New user logic
            set(ref(db, 'users/' + user.uid), {
              profilePicture: user.photoURL,
              username: user.displayName,
              email: user.email,
              isNewUser: true
            });
          }
        });
      })
      .catch((error) => {
        console.error('Twitter Sign-In error:', error);
      });
  };

  return (
    <div className="auth-container">
      <img src={logo} alt="Company Logo" className="logo" />
      <p className="sign-up-text">Sign Up with</p>
      <div className="icon-container">
        <i className="fa fa-google social-icon" style={{cursor: 'pointer'}} onClick={handleGoogleSignIn}></i>
        <i className="fa fa-twitter social-icon" style={{cursor: 'pointer'}} onClick={handleTwitterSignIn}></i>
      </div>
      <p className="sign-in-prompt">Already have an account? <span className="login-text" style={{color: 'green'}} onClick={handleGoogleSignIn}>Login</span></p>
      <p className="terms-notice">
        Click X or Google icons to agree to Watering Plant App's 
        <span className="link-text"> Terms of Service</span> and acknowledge that Watering Plant App's 
        <span className="link-text"> Privacy Policy</span> applies to you.
      </p>
    </div>
  );
};

export default Auth;
