import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import config from '../config';

const StoreStatusContext = createContext();

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getStoreTime(timezone) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);
  const get = (type) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  const hour = get('hour') % 24;
  const minute = get('minute');
  const dayOfWeek = new Date(get('year'), get('month') - 1, get('day')).getDay();
  return { hour, minute, dayOfWeek };
}

export function StoreStatusProvider({ children }) {
  const [storeStatus, setStoreStatus] = useState('closed');
  const [storeSession, setStoreSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [businessHours, setBusinessHours] = useState([]);
  const [storeTimezone, setStoreTimezone] = useState('UTC');

  const fetchStoreStatus = useCallback(async () => {
    try {
      const [statusRes, hoursRes, bizRes] = await Promise.all([
        fetch(`${config.apiUrl}/store-status`),
        fetch(`${config.apiUrl}/store-hours`),
        fetch(`${config.apiUrl}/business-info`),
      ]);
      if (statusRes.ok) {
        const data = await statusRes.json();
        setStoreStatus(data.status);
        setStoreSession(data.session || null);
      }
      if (hoursRes.ok) {
        setBusinessHours(await hoursRes.json());
      }
      if (bizRes.ok) {
        const bizData = await bizRes.json();
        setStoreTimezone(bizData.timezone || 'UTC');
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
    const { hour, minute, dayOfWeek } = getStoreTime(storeTimezone);
    const todayH = businessHours.find(h => h.day_of_week === dayOfWeek);
    if (!todayH || todayH.is_closed || !todayH.close_time) return false;
    const [closeHour, closeMin] = todayH.close_time.substring(0, 5).split(':').map(Number);
    return (hour * 60 + minute) > (closeHour * 60 + closeMin);
  }, [isStoreOpen, businessHours, storeTimezone]);

  // Get today's hours for display
  const todayHours = useMemo(() => {
    if (!businessHours.length) return null;
    const { dayOfWeek } = getStoreTime(storeTimezone);
    const h = businessHours.find(h => h.day_of_week === dayOfWeek);
    if (!h) return null;
    return {
      ...h,
      day_name: DAY_NAMES[dayOfWeek],
    };
  }, [businessHours, storeTimezone]);

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
    storeTimezone,
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
