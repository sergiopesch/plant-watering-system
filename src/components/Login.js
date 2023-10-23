import React from 'react';
import firebase from '../firebase';

const provider = new firebase.auth.GoogleAuthProvider();

const Login = () => {
  const handleSocialLogin = () => {
    firebase.auth().signInWithPopup(provider).then((result) => {
      // You can retrieve user info from 'result'
      console.log(result);
    }).catch((error) => {
      console.log(error);
    });
  };

  return (
    <div>
      <h1>Login</h1>
      <button onClick={handleSocialLogin}>Sign in with Google</button>
      {/* Add more social media login buttons here */}
    </div>
  );
};

export default Login;
