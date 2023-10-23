import { Routes, Route } from 'react-router-dom';
import Auth from './Auth'; 
import Home from './Home';
import PlantProfile from './PlantProfile';
import PlantList from './PlantList'; // import PlantList
import UserProfile from './UserProfile';
import Header from './Header';
import NavBar from './NavBar';

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