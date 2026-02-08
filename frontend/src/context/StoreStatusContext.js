import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import config from '../config';

const StoreStatusContext = createContext();

export function StoreStatusProvider({ children }) {
  const [storeStatus, setStoreStatus] = useState('closed');
  const [storeSession, setStoreSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStoreStatus = useCallback(async () => {
    try {
      const response = await fetch(`${config.apiUrl}/store-status`);
      if (response.ok) {
        const data = await response.json();
        setStoreStatus(data.status);
        setStoreSession(data.session || null);
      }
    } catch (error) {
      console.error('Failed to fetch store status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreStatus();

    // Listen for store status changes (from SystemConfig)
    const handleStatusChange = () => fetchStoreStatus();
    window.addEventListener('storeStatusChanged', handleStatusChange);

    // Poll every 30 seconds for cross-session awareness
    const interval = setInterval(fetchStoreStatus, 30000);

    return () => {
      window.removeEventListener('storeStatusChanged', handleStatusChange);
      clearInterval(interval);
    };
  }, [fetchStoreStatus]);

  const isStoreClosed = storeStatus === 'closed';
  const isStoreOpen = storeStatus === 'open';

  const value = {
    storeStatus,
    storeSession,
    isStoreClosed,
    isStoreOpen,
    loading,
    refreshStatus: fetchStoreStatus,
  };

  return (
    <StoreStatusContext.Provider value={value}>
      {children}
    </StoreStatusContext.Provider>
  );
}

export function useStoreStatus() {
  const context = useContext(StoreStatusContext);
  if (!context) {
    throw new Error('useStoreStatus must be used within a StoreStatusProvider');
  }
  return context;
}
