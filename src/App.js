
import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Home from './components/Home';
import PlantProfile from './components/PlantProfile';
import PlantList from './components/PlantList';
import PlantProfileList from './components/PlantProfileList';
import NavBar from './components/NavBar';
import Header from './components/Header';
import UserProfile from './components/UserProfile';
import { GlobalProvider } from './GlobalContext';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PlantGraphs from './components/PlantGraphs';
import { getDatabase, ref, get } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import HomePage from './components/HomePage';

const Content = ({ user }) => {
  const location = useLocation();
  return (
    <>
      {location.pathname !== '/' && <Header />}
      {location.pathname !== '/' && <NavBar />}
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/home" element={<Home user={user} />} />
        <Route path="/plant-profile" element={<PlantProfile />} />
        <Route path="/plant-list" element={<PlantList />} />
        <Route path="/plant-profile-list" element={<PlantProfileList />} />
        <Route path="/user-profile" element={<UserProfile user={user} />} />
        <Route path="/plant-graphs" element={<PlantGraphs />} />
      </Routes>
    </>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        const db = getDatabase();
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
          if (snapshot.exists()) {
            setIsNewUser(snapshot.val().isNewUser);
          }
        });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <GlobalProvider>
      <Router>
        <div className="App">
          {user ? <HomePage isNewUser={isNewUser} username={user.displayName} /> : <Content user={user} />}
        </div>
      </Router>
    </GlobalProvider>
  );
}

export default App;
