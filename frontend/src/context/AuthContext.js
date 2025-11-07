import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for user data in localStorage on component mount
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lockedSession');
    sessionStorage.removeItem('redirectAfterLogin');
    setUser(null);
    navigate('/login');
  };

  const lockScreen = () => {
    // Save current location and session state
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('redirectAfterLogin', currentPath);
    localStorage.setItem('lockedSession', 'true');

    // Clear user state temporarily but keep in localStorage for unlock
    setUser(null);

    // Navigate to login without clearing user data from localStorage
    navigate('/login');
  };

  const value = {
    user,
    setUser,
    logout,
    lockScreen
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
