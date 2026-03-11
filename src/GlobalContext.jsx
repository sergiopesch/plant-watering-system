import React, { createContext, useState, useContext } from 'react';

export const GlobalContext = createContext();

export const GlobalProvider = ({ children }) => {
  const [plantImage, setPlantImage] = useState(null);

  return (
    <GlobalContext.Provider value={{ plantImage, setPlantImage }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};
