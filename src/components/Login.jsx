import React from 'react';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import app from '../firebase';

const provider = new GoogleAuthProvider();
const auth = getAuth(app);

const Login = () => {
  const handleSocialLogin = () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        console.log(result);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  return (
    <div>
      <h1>Login</h1>
      <button onClick={handleSocialLogin}>Sign in with Google</button>
    </div>
  );
};

export default Login;
