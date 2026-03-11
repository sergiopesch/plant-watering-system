import { Routes, Route } from 'react-router-dom';
import Auth from './Auth.jsx'; 
import Home from './Home.jsx';
import PlantProfile from './PlantProfile.jsx';
import PlantList from './PlantList.jsx'; // import PlantList
import UserProfile from './UserProfile.jsx';
import Header from './Header.jsx';
import NavBar from './NavBar.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/home" element={<Home />} />
      <Route path="/plant-profile" element={<PlantProfile />} />
      <Route path="/plant-list" element={<PlantList />} />
      <Route path="/user-profile" element={<UserProfile />} />
      <Route path="/Header" element={<Header />} />
      <Route path="/NavBar" element={<NavBar />} />
    </Routes>
  );
}