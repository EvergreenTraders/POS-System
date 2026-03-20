import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import config from '../config';

const StoreStatusContext = createContext();

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function StoreStatusProvider({ children }) {
  const [storeStatus, setStoreStatus] = useState('closed');
  const [storeSession, setStoreSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [businessHours, setBusinessHours] = useState([]);

  const fetchStoreStatus = useCallback(async () => {
    try {
      const [statusRes, hoursRes] = await Promise.all([
        fetch(`${config.apiUrl}/store-status`),
        fetch(`${config.apiUrl}/store-hours`),
      ]);
      if (statusRes.ok) {
        const data = await statusRes.json();
        setStoreStatus(data.status);
        setStoreSession(data.session || null);
      }
      if (hoursRes.ok) {
        setBusinessHours(await hoursRes.json());
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

  // Check if current time is past today's closing time while store is open
  const isPastBusinessHours = useMemo(() => {
    if (!isStoreOpen || !businessHours.length) return false;
    const now = new Date();
    const todayHours = businessHours.find(h => h.day_of_week === now.getDay());
    if (!todayHours || todayHours.is_closed || !todayHours.close_time) return false;
    const [closeHour, closeMin] = todayHours.close_time.substring(0, 5).split(':').map(Number);
    const closeDate = new Date();
    closeDate.setHours(closeHour, closeMin, 0, 0);
    return now > closeDate;
  }, [isStoreOpen, businessHours]);

  // Get today's hours for display
  const todayHours = useMemo(() => {
    if (!businessHours.length) return null;
    const now = new Date();
    const h = businessHours.find(h => h.day_of_week === now.getDay());
    if (!h) return null;
    return {
      ...h,
      day_name: DAY_NAMES[now.getDay()],
    };
  }, [businessHours]);

  const value = {
    storeStatus,
    storeSession,
    isStoreClosed,
    isStoreOpen,
    loading,
    refreshStatus: fetchStoreStatus,
    businessHours,
    isPastBusinessHours,
    todayHours,
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
