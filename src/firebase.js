import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Move these to environment variables in production
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
// Log for debugging purposes
console.log("Attempting to initialize Firebase");

let app;
// Make sure to call `initializeApp` only once
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized");
} else {
  app = getApp();
}

const auth = getAuth(app);
const analytics = getAnalytics(app);
console.log("API Key from .env:", process.env.REACT_APP_FIREBASE_API_KEY);
export { auth, analytics };
