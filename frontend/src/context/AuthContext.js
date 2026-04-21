import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lockedSession');
    localStorage.removeItem('workingDate');
    localStorage.removeItem('workingDateEnabled');
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
