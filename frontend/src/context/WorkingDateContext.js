import React, { createContext, useContext, useState, useEffect } from 'react';

const WorkingDateContext = createContext();

export function WorkingDateProvider({ children }) {
  // Initialize from localStorage or default to actual date
  const [workingDate, setWorkingDate] = useState(() => {
    const saved = localStorage.getItem('workingDate');
    return saved || new Date().toISOString().split('T')[0];
  });

  const [isWorkingDateEnabled, setIsWorkingDateEnabled] = useState(() => {
    return localStorage.getItem('workingDateEnabled') === 'true';
  });

  // Sync with localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('workingDate', workingDate);
  }, [workingDate]);

  useEffect(() => {
    localStorage.setItem('workingDateEnabled', isWorkingDateEnabled.toString());
  }, [isWorkingDateEnabled]);

  // Helper function to get current working date as YYYY-MM-DD string
  const getCurrentDate = () => {
    if (isWorkingDateEnabled) {
      return workingDate;
    }
    return new Date().toISOString().split('T')[0];
  };

  // Helper function to get current working date as Date object
  const getCurrentDateObject = () => {
    if (isWorkingDateEnabled) {
      // Parse as local date (not UTC) by using the date string with time
      const [year, month, day] = workingDate.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  };

  // Helper to clear working date settings (used on logout)
  const clearWorkingDate = () => {
    localStorage.removeItem('workingDate');
    localStorage.removeItem('workingDateEnabled');
    setWorkingDate(new Date().toISOString().split('T')[0]);
    setIsWorkingDateEnabled(false);
  };

  const value = {
    workingDate,
    setWorkingDate,
    isWorkingDateEnabled,
    setIsWorkingDateEnabled,
    getCurrentDate,
    getCurrentDateObject,
    clearWorkingDate
  };

  return (
    <WorkingDateContext.Provider value={value}>
      {children}
    </WorkingDateContext.Provider>
  );
}

export function useWorkingDate() {
  const context = useContext(WorkingDateContext);
  if (!context) {
    throw new Error('useWorkingDate must be used within a WorkingDateProvider');
  }
  return context;
}
