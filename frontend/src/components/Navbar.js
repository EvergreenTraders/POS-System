import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  styled,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  Alert,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Snackbar,
  TextField,
} from '@mui/material';
import axios from 'axios';
import {
  ShoppingCart as CartIcon,
  AccountCircle as AccountIcon,
  LockOutlined as LockIcon,
  Logout as LogoutIcon,
  AccessTime as ClockIcon,
  WarningAmber as WarningIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Restore as ResumeIcon,
  PlayArrow as PlayArrowIcon,
  Delete as DeleteIcon,
  LocalParking as ParkingIcon,
  Feedback as FeedbackIcon,
} from '@mui/icons-material';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWorkingDate } from '../context/WorkingDateContext';
import { useStoreStatus } from '../context/StoreStatusContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Cart from './Cart';
import CloseStoreIssuesDialog from './CloseStoreIssuesDialog';
import config from '../config';

const StyledAppBar = styled(AppBar)({
  zIndex: 1201, // Higher than drawer's z-index
});

function Navbar() {
  const [cartOpen, setCartOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  // Initialize with browser timezone immediately so time displays correctly from the start
  const [timezone, setTimezone] = useState(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [businessName, setBusinessName] = useState('POS System');
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [clockOutDialogOpen, setClockOutDialogOpen] = useState(false);
  const [storeClosingPromptOpen, setStoreClosingPromptOpen] = useState(false);
  const [balanceAlerts, setBalanceAlerts] = useState([]);
  const { cartItems } = useCart();
  const { user, logout, lockScreen } = useAuth();
  const { workingDate, isWorkingDateEnabled } = useWorkingDate();
  const { storeStatus, refreshStatus } = useStoreStatus();
  const isManagerOrOwner = user?.role === 'Store Manager' || user?.role === 'Store Owner';

  const [openStoreDialogOpen, setOpenStoreDialogOpen] = useState(false);
  const [closeStoreDialogOpen, setCloseStoreDialogOpen] = useState(false);
  const [storeActionLoading, setStoreActionLoading] = useState(false);
  const [storeActionError, setStoreActionError] = useState('');
  const [closeStoreClockedIn, setCloseStoreClockedIn] = useState([]);
  const [clockingOutId, setClockingOutId] = useState(null);
  const [isBackupComputer, setIsBackupComputer] = useState(false);
  const [deletingParkedId, setDeletingParkedId] = useState(null);
  const [closeStoreIssuesOpen, setCloseStoreIssuesOpen] = useState(false);
  const [closeStoreIssues, setCloseStoreIssues] = useState([]);
  const [closeStoreIssuesMessage, setCloseStoreIssuesMessage] = useState('');
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackNewAlert, setFeedbackNewAlert] = useState(null);
  const feedbackLastSeenIdRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const cartItemCount = cartItems.length; // Just count number of items, not quantity

  // Check employee clock-in status
  useEffect(() => {
    const checkClockStatus = async () => {
      if (!user || !user.id) return;

      try {
        const response = await fetch(`${config.apiUrl}/employee-sessions/clocked-in`);
        if (response.ok) {
          const clockedInEmployees = await response.json();
          const currentEmployeeSession = clockedInEmployees.find(
            emp => emp.employee_id == user.id
          );

          if (currentEmployeeSession) {
            setClockedIn(true);
            setClockInTime(new Date(currentEmployeeSession.clock_in_time));
          } else {
            setClockedIn(false);
            setClockInTime(null);
          }
        }
      } catch (error) {
        console.error('Failed to check clock status:', error);
      }
    };

    checkClockStatus();

    // Listen for clock status changes from other pages (e.g. TimeClock)
    window.addEventListener('clockStatusChanged', checkClockStatus);
    return () => {
      window.removeEventListener('clockStatusChanged', checkClockStatus);
    };
  }, [user]);

  // Poll for cash balance alerts (min and max)
  useEffect(() => {
    if (!user) return;

    const checkBalanceAlerts = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/cash-drawer/low-balance-alerts`);
        if (response.ok) {
          const alerts = await response.json();
          // Filter to alerts relevant to this employee
          const userId = parseInt(user.id);
          const myAlerts = alerts.filter(a =>
            a.connected_employee_ids.includes(userId)
          );
          setBalanceAlerts(myAlerts);
        }
      } catch (error) {
        // Silently fail - non-critical polling
      }
    };

    checkBalanceAlerts();
    const interval = setInterval(checkBalanceAlerts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const [parkedWorkspaces, setParkedWorkspaces] = useState([]);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [canResumeParkedWorkspaces, setCanResumeParkedWorkspaces] = useState(true);

  useEffect(() => {
    if (!user || !user.id) return;
    const token = localStorage.getItem('token');
    fetch(`${config.apiUrl}/employees`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => (res.ok ? res.json() : []))
      .then(list => {
        const me = (Array.isArray(list) ? list : []).find(e => e.employee_id == user.id);
        setCanResumeParkedWorkspaces(me ? me.can_resume_parked_workspaces !== false : true);
      })
      .catch(() => {});
  }, [user]);

  const fetchParkedWorkspaces = async () => {
    if (!user) return [];
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.apiUrl}/parked-workspaces`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setParkedWorkspaces(list);
        return list;
      }
    } catch {
      // non-critical
    }
    return [];
  };

  useEffect(() => {
    fetchParkedWorkspaces();
    const interval = setInterval(fetchParkedWorkspaces, 30000);
    window.addEventListener('parkedWorkspacesChanged', fetchParkedWorkspaces);
    return () => {
      clearInterval(interval);
      window.removeEventListener('parkedWorkspacesChanged', fetchParkedWorkspaces);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Alert the developer account as soon as any new feedback comes in, instead of
  // requiring her to go check SystemConfig's Feedback tab.
  useEffect(() => {
    if (user?.username !== 'pguntupalli') return;
    const storageKey = `feedbackLastSeenId_${user.username}`;
    feedbackLastSeenIdRef.current = parseInt(localStorage.getItem(storageKey) || '0', 10);

    const checkFeedback = async () => {
      try {
        const res = await axios.get(`${config.apiUrl}/feedback`);
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length === 0) return;
        const newestId = Math.max(...list.map(f => f.id));
        if (newestId > feedbackLastSeenIdRef.current) {
          const unseen = list
            .filter(f => f.id > feedbackLastSeenIdRef.current)
            .sort((a, b) => b.id - a.id);
          const latest = unseen[0];
          setFeedbackNewAlert(
            `New feedback from ${latest.employee_name || 'someone'}: "${latest.message.length > 100 ? latest.message.slice(0, 100) + '…' : latest.message}"` +
            (unseen.length > 1 ? ` (+${unseen.length - 1} more)` : '')
          );
          feedbackLastSeenIdRef.current = newestId;
          localStorage.setItem(storageKey, String(newestId));
        }
      } catch {
        // non-critical
      }
    };

    checkFeedback();
    const interval = setInterval(checkFeedback, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleOpenResumeDialog = () => {
    fetchParkedWorkspaces();
    setResumeDialogOpen(true);
  };

  const handleResume = async (pw) => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await fetch(`${config.apiUrl}/parked-workspaces/${pw.id}`, { method: 'DELETE', headers });
    } catch {
      // proceed anyway
    }
    setParkedWorkspaces(prev => prev.filter(p => p.id !== pw.id));
    setResumeDialogOpen(false);
    if (pw.parked_by_employee_id) {
      sessionStorage.setItem('parkedByEmployee', JSON.stringify({
        id: pw.parked_by_employee_id,
        name: pw.parked_by_employee_name || '',
      }));
    }
    navigate('/modern-transactions', {
      state: {
        resumedWorkspace: pw.workspace_data || [],
        resumedCustomerId: pw.customer_id,
      },
    });
  };

  const handleDiscardParked = async (pw) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${config.apiUrl}/parked-workspaces/${pw.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setParkedWorkspaces(prev => prev.filter(p => p.id !== pw.id));
    } catch {
      // non-critical
    }
  };

  // Poll for store closing notification
  useEffect(() => {
    if (!user || !clockedIn) return;

    let lastNotificationTime = null;

    const checkStoreClosingNotification = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/employee-sessions/closing-notification`);
        if (response.ok) {
          const data = await response.json();

          // Only show prompt if notification is active and we haven't seen this one yet
          if (data.active && data.timestamp) {
            const notificationTime = new Date(data.timestamp).getTime();

            // Check if this is a new notification
            if (!lastNotificationTime || notificationTime > lastNotificationTime) {
              setStoreClosingPromptOpen(true);
              lastNotificationTime = notificationTime;
            }
          }
        }
      } catch (error) {
        console.error('Failed to check store closing notification:', error);
      }
    };

    // Check immediately and then every 3 seconds
    checkStoreClosingNotification();
    const interval = setInterval(checkStoreClosingNotification, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [user, clockedIn]);

  // Get timezone and business name from business settings
  useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/business-info`);
        if (response.ok) {
          const data = await response.json();
          if (data.timezone) {
            setTimezone(data.timezone);
          }
          if (data.business_name) {
            setBusinessName(data.business_name);
          }
        }
      } catch (error) {
        // If API fails, keep defaults
        console.error('Failed to fetch business info:', error);
      }
    };
    fetchBusinessInfo();

    // Listen for business settings updates from SystemConfig
    const handleBusinessSettingsUpdate = (event) => {
      if (event.detail?.timezone) {
        setTimezone(event.detail.timezone);
      }
      if (event.detail?.businessName) {
        setBusinessName(event.detail.businessName);
      }
    };
    window.addEventListener('businessSettingsUpdated', handleBusinessSettingsUpdate);

    return () => {
      window.removeEventListener('businessSettingsUpdated', handleBusinessSettingsUpdate);
    };
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get time parts for the detected timezone
  const getTimeParts = () => {
    const timeString = currentTime.toLocaleString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });

    const [hours, minutes, seconds] = timeString.split(':').map(Number);

    return {
      hours: hours % 12 || 12, // Convert to 12-hour format
      minutes,
      seconds
    };
  };

  // Format time for display
  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Calculate clock hand angles
  const { hours, minutes, seconds } = getTimeParts();
  const secondAngle = seconds * 6; // 360 / 60 = 6 degrees per second
  const minuteAngle = minutes * 6 + seconds * 0.1; // 6 degrees per minute + smooth movement
  const hourAngle = (hours % 12) * 30 + minutes * 0.5; // 30 degrees per hour + smooth movement

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  const handleLockScreen = () => {
    handleClose();
    lockScreen();
  };

  const handleClockIn = async () => {
    if (!user || !user.id) return;

    setClockLoading(true);
    try {
      const response = await fetch(`${config.apiUrl}/employee-sessions/clock-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: user.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setClockedIn(true);
        setClockInTime(new Date(data.clock_in_time));
        window.dispatchEvent(new CustomEvent('clockStatusChanged'));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to clock in');
      }
    } catch (error) {
      console.error('Error clocking in:', error);
      alert('Failed to clock in');
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = () => {
    setClockOutDialogOpen(true);
  };

  const confirmClockOut = async () => {
    if (!user || !user.id) return;

    setClockLoading(true);
    setClockOutDialogOpen(false);
    try {
      const response = await fetch(`${config.apiUrl}/employee-sessions/clock-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: user.id
        })
      });

      if (response.ok) {
        setClockedIn(false);
        setClockInTime(null);
        window.dispatchEvent(new CustomEvent('clockStatusChanged'));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to clock out');
      }
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('Failed to clock out');
    } finally {
      setClockLoading(false);
    }
  };

  const handleStoreChipClick = async () => {
    if (!isManagerOrOwner) return;
    setStoreActionError('');
    if (storeStatus === 'open') {
      setStoreActionLoading(true);
      try {
        const [drawersResult, clockedInResult, parkedList] = await Promise.allSettled([
          axios.get(`${config.apiUrl}/store-sessions/check-open-drawers`),
          axios.get(`${config.apiUrl}/employee-sessions/clocked-in`),
          fetchParkedWorkspaces(),
        ]);
        const clockedInList = clockedInResult.status === 'fulfilled' ? (clockedInResult.value.data || []) : [];
        setCloseStoreClockedIn(clockedInList);
        const freshParked = parkedList.status === 'fulfilled' ? parkedList.value : [];

        if (drawersResult.status === 'rejected') {
          const err = drawersResult.reason;
          setCloseStoreIssuesMessage(err.response?.data?.error || 'Failed to check store closure prerequisites');
          setCloseStoreIssues(err.response?.data?.openDrawers || []);
          setCloseStoreIssuesOpen(true);
          return;
        }

        if (clockedInList.length > 0) {
          await axios.post(`${config.apiUrl}/employee-sessions/notify-closing`);
        }

        if (freshParked.length > 0) {
          setCloseStoreIssuesMessage('');
          setCloseStoreIssues([]);
          setCloseStoreIssuesOpen(true);
          return;
        }

        setIsBackupComputer(false);
        setCloseStoreDialogOpen(true);
      } finally {
        setStoreActionLoading(false);
      }
    } else {
      setOpenStoreDialogOpen(true);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    setFeedbackSubmitting(true);
    try {
      await axios.post(`${config.apiUrl}/feedback`, {
        employee_id: user?.id || user?.employee_id,
        message: feedbackMessage.trim(),
        page: location.pathname,
      });
      setFeedbackMessage('');
      setFeedbackDialogOpen(false);
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleClockOutEmployee = async (emp) => {
    setClockingOutId(emp.session_id);
    try {
      await axios.post(`${config.apiUrl}/employee-sessions/clock-out`, { employee_id: emp.employee_id });
      setCloseStoreClockedIn(prev => prev.filter(e => e.session_id !== emp.session_id));
    } catch (err) {
      setStoreActionError(err.response?.data?.error || 'Failed to clock out employee');
    } finally {
      setClockingOutId(null);
    }
  };

  const handleOpenStoreConfirm = async () => {
    setStoreActionLoading(true);
    try {
      await axios.post(`${config.apiUrl}/store-sessions/open`, {
        employee_id: user?.id || user?.employee_id,
      });
      await refreshStatus();
      window.dispatchEvent(new Event('storeStatusChanged'));
      setOpenStoreDialogOpen(false);
    } catch (err) {
      setStoreActionError(err.response?.data?.error || 'Failed to open store');
    } finally {
      setStoreActionLoading(false);
    }
  };

  const performCloseStore = async () => {
    setStoreActionLoading(true);
    try {
      await axios.post(`${config.apiUrl}/store-sessions/close`, {
        employee_id: user?.id || user?.employee_id,
      });
      await refreshStatus();
      window.dispatchEvent(new Event('storeStatusChanged'));
      setCloseStoreDialogOpen(false);
    } catch (err) {
      setStoreActionError(err.response?.data?.error || 'Failed to close store');
      setCloseStoreDialogOpen(true);
    } finally {
      setStoreActionLoading(false);
    }
  };

  const handleCloseStoreConfirm = async () => {
    await performCloseStore();
  };

  const handleDeleteParkedWorkspace = async (pw) => {
    setDeletingParkedId(pw.id);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${config.apiUrl}/parked-workspaces/${pw.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setParkedWorkspaces(prev => prev.filter(p => p.id !== pw.id));
    } catch {
      // non-critical
    } finally {
      setDeletingParkedId(null);
    }
  };

  const handleKeepParkedWorkspacesOnClose = () => {
    setCloseStoreIssuesOpen(false);
    setIsBackupComputer(false);
    setCloseStoreDialogOpen(true);
  };

  const handleCloseStoreIssuesDismiss = () => {
    if (closeStoreIssues.length === 0) {
      handleKeepParkedWorkspacesOnClose();
    } else {
      setCloseStoreIssuesOpen(false);
    }
  };

  return (
    <>
      <StyledAppBar position="fixed">
        <Toolbar>
          <Tooltip title="Go back">
            <IconButton color="inherit" size="small" onClick={() => navigate(-1)} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography
            variant="h6"
            sx={{
              cursor: 'pointer',
              mr: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              '&:hover': { opacity: 0.85 }
            }}
            onClick={() => navigate('/system-config/settings')}
          >
            {businessName}
            <Box
              component="span"
              onClick={isManagerOrOwner ? (e) => { e.stopPropagation(); handleStoreChipClick(); } : (e) => e.stopPropagation()}
              sx={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: storeStatus === 'open' ? 'success.main' : 'error.main',
                color: 'white',
                letterSpacing: '0.5px',
                cursor: isManagerOrOwner ? 'pointer' : 'default',
                '&:hover': isManagerOrOwner ? { opacity: 0.85 } : {},
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {storeActionLoading ? <CircularProgress size={10} color="inherit" /> : null}
              {storeStatus === 'open' ? 'OPEN' : 'CLOSED'}
            </Box>
          </Typography>

          {/* Analog Clock Display */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mr: 2
            }}
          >
            {/* Analog Clock */}
            <Box
              sx={{
                position: 'relative',
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '2px solid white',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* Clock center dot */}
              <Box
                sx={{
                  position: 'absolute',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  bgcolor: 'white',
                  zIndex: 3
                }}
              />

              {/* Hour hand */}
              <Box
                sx={{
                  position: 'absolute',
                  width: 2,
                  height: 10,
                  bgcolor: 'white',
                  bottom: '50%',
                  left: '50%',
                  transformOrigin: 'bottom center',
                  transform: `translateX(-50%) rotate(${hourAngle}deg)`,
                  borderRadius: '2px 2px 0 0',
                  zIndex: 2
                }}
              />

              {/* Minute hand */}
              <Box
                sx={{
                  position: 'absolute',
                  width: 1.5,
                  height: 14,
                  bgcolor: 'white',
                  bottom: '50%',
                  left: '50%',
                  transformOrigin: 'bottom center',
                  transform: `translateX(-50%) rotate(${minuteAngle}deg)`,
                  borderRadius: '2px 2px 0 0',
                  zIndex: 1
                }}
              />

              {/* Second hand */}
              <Box
                sx={{
                  position: 'absolute',
                  width: 1.5,
                  height: 16,
                  bgcolor: 'white',
                  bottom: '50%',
                  left: '50%',
                  transformOrigin: 'bottom center',
                  transform: `translateX(-50%) rotate(${secondAngle}deg)`,
                  borderRadius: '2px 2px 0 0'
                }}
              />
            </Box>

            {/* Digital Time Display */}
            <Typography
              variant="body1"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 500,
                letterSpacing: 0.5,
                minWidth: 95
              }}
            >
              {formatTime()}
            </Typography>

            {/* Forward navigation */}
            <Tooltip title="Go forward">
              <IconButton color="inherit" size="small" onClick={() => navigate(1)}>
                <ArrowForwardIcon />
              </IconButton>
            </Tooltip>

            {/* Working Date Indicator */}
            {isWorkingDateEnabled && (
              <Chip
                label={`Working: ${new Date(workingDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                size="small"
                sx={{
                  ml: 1,
                  bgcolor: '#ff9800',
                  color: 'white',
                  fontWeight: 600,
                  '& .MuiChip-label': {
                    px: 1
                  }
                }}
              />
            )}
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {user && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Clock In/Out Button */}
              {clockedIn ? (
                <Chip
                  icon={<ClockIcon />}
                  label={`Clocked in: ${clockInTime?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                  onClick={handleClockOut}
                  disabled={clockLoading}
                  sx={{
                    mr: 2,
                    bgcolor: 'success.main',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'success.dark',
                    },
                    '& .MuiChip-icon': {
                      color: 'white'
                    }
                  }}
                />
              ) : (
                <Chip
                  icon={<ClockIcon />}
                  label="Clock In"
                  onClick={handleClockIn}
                  disabled={clockLoading}
                  sx={{
                    mr: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '& .MuiChip-icon': {
                      color: 'white'
                    }
                  }}
                />
              )}

              {balanceAlerts.length > 0 && (
                <Tooltip
                  title={balanceAlerts.map(a => {
                    if (a.alert_type === 'below_minimum') {
                      return `${a.drawer_name}: $${parseFloat(a.current_balance).toFixed(2)} (min: $${parseFloat(a.min_close).toFixed(2)})`;
                    } else if (a.alert_type === 'above_maximum') {
                      return `${a.drawer_name}: $${parseFloat(a.current_balance).toFixed(2)} (max: $${parseFloat(a.max_close).toFixed(2)})`;
                    }
                    return `${a.drawer_name}: Balance alert`;
                  }).join('\n')}
                >
                  <IconButton
                    color="inherit"
                    onClick={() => navigate('/cash-drawer')}
                    sx={{ mr: 1 }}
                  >
                    <Badge badgeContent={balanceAlerts.length} color="error">
                      <WarningIcon sx={{ color: '#ffb74d' }} />
                    </Badge>
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title={
                !canResumeParkedWorkspaces
                  ? "You don't have permission to resume parked workspaces"
                  : parkedWorkspaces.length > 0
                    ? `${parkedWorkspaces.length} parked workspace${parkedWorkspaces.length !== 1 ? 's' : ''}`
                    : 'No parked workspaces'
              }>
                <span>
                  <IconButton
                    color="inherit"
                    onClick={handleOpenResumeDialog}
                    sx={{ mr: 1 }}
                    disabled={parkedWorkspaces.length === 0 || !canResumeParkedWorkspaces}
                  >
                    <Badge badgeContent={parkedWorkspaces.length || null} color="warning">
                      <ResumeIcon />
                    </Badge>
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Send Feedback">
                <IconButton
                  color="inherit"
                  onClick={() => setFeedbackDialogOpen(true)}
                  sx={{ mr: 1 }}
                >
                  <FeedbackIcon />
                </IconButton>
              </Tooltip>

              <IconButton
                color="inherit"
                onClick={() => setCartOpen(true)}
                sx={{ mr: 2 }}
              >
                <Badge badgeContent={cartItemCount} color="error">
                  <CartIcon />
                </Badge>
              </IconButton>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="body2">
                    {user.firstName} {user.lastName}
                  </Typography>
                  <Typography variant="body2" color="white">
                    {user.role}
                  </Typography>
                </Box>
                <IconButton
                  size="large"
                  onClick={handleMenu}
                  color="inherit"
                >
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: 'secondary.main',
                      border: 3,
                      borderColor: (user?.track_hours === false || clockedIn) ? '#4caf50' : '#f44336',
                    }}
                    src={user.image ? `data:image/jpeg;base64,${user.image}` : undefined}
                  >
                    {!user.image && (user.username ? user.username[0].toUpperCase() : <AccountIcon />)}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem disabled>
                    <Typography variant="body2">
                      Signed in as {user.username}
                    </Typography>
                  </MenuItem>
                  <MenuItem onClick={handleLockScreen}>
                    <LockIcon sx={{ mr: 1, fontSize: 20 }} />
                    Lock Screen
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
          )}
        </Toolbar>
      </StyledAppBar>
      <Cart open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Clock Out Confirmation Dialog */}
      <Dialog
        open={clockOutDialogOpen}
        onClose={() => setClockOutDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Clock Out</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to clock out?
          </Typography>
          {clockInTime && (
            <Typography variant="body2" color="text.secondary">
              You clocked in at {clockInTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setClockOutDialogOpen(false)}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={confirmClockOut}
            variant="contained"
            color="primary"
            disabled={clockLoading}
          >
            Confirm Clock Out
          </Button>
        </DialogActions>
      </Dialog>

      {/* Open Store Dialog */}
      <Dialog open={openStoreDialogOpen} onClose={() => { setOpenStoreDialogOpen(false); setStoreActionError(''); }} maxWidth="xs" fullWidth>
        <DialogTitle>Open Store</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Are you sure you want to open the store for business?
          </Typography>
          {storeActionError && <Alert severity="error" sx={{ mt: 1 }}>{storeActionError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenStoreDialogOpen(false); setStoreActionError(''); }}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleOpenStoreConfirm}
            disabled={storeActionLoading}
            startIcon={storeActionLoading ? <CircularProgress size={16} /> : null}
          >
            Open Store
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Store Dialog */}
      <Dialog open={closeStoreDialogOpen} onClose={() => { setCloseStoreDialogOpen(false); setStoreActionError(''); }} maxWidth="sm" fullWidth>
        <DialogTitle>Close Store</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Closing the store will disable all financial transactions until it is reopened.
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>Before closing the store, ensure:</Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <Typography component="li" variant="body2">All cash drawers and safes (except the master safe) are closed</Typography>
            <Typography component="li" variant="body2">End-of-day reports have been generated</Typography>
            <Typography component="li" variant="body2">All pending transactions are complete</Typography>
          </Box>
          {closeStoreClockedIn.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="warning" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Currently Clocked-In Employees ({closeStoreClockedIn.length}):
                </Typography>
              </Alert>
              <List dense sx={{ pt: 0 }}>
                {closeStoreClockedIn.map((emp) => (
                  <ListItem
                    key={emp.session_id}
                    disableGutters
                    secondaryAction={
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        disabled={clockingOutId === emp.session_id}
                        startIcon={clockingOutId === emp.session_id ? <CircularProgress size={14} /> : null}
                        onClick={() => handleClockOutEmployee(emp)}
                      >
                        Clock Out
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={emp.image ? `data:image/jpeg;base64,${emp.image}` : undefined}
                        sx={{ width: 32, height: 32 }}
                      >
                        {!emp.image && (emp.first_name ? emp.first_name[0].toUpperCase() : '?')}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={emp.employee_name}
                      secondary={`${emp.role} - since ${new Date(emp.clock_in_time).toLocaleTimeString()}`}
                      sx={{ pr: 10 }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          {storeActionError && <Alert severity="error" sx={{ mb: 2 }}>{storeActionError}</Alert>}
          <FormControlLabel
            control={
              <Checkbox
                checked={isBackupComputer}
                onChange={(e) => setIsBackupComputer(e.target.checked)}
                color="primary"
              />
            }
            label={<Typography variant="body2">I confirm this is the designated backup computer for end-of-day procedures</Typography>}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCloseStoreDialogOpen(false); setStoreActionError(''); }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCloseStoreConfirm}
            disabled={!isBackupComputer || storeActionLoading || !!storeActionError}
            startIcon={storeActionLoading ? <CircularProgress size={16} /> : null}
          >
            Close Store
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resume Parked Workspace Dialog */}
      <Dialog open={resumeDialogOpen} onClose={() => setResumeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ParkingIcon sx={{ color: '#f9a825' }} />
          Parked Workspaces
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {parkedWorkspaces.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <ParkingIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
              <Typography color="text.secondary">No parked workspaces</Typography>
            </Box>
          ) : (
            <Stack spacing={0} divider={<Divider />}>
              {parkedWorkspaces.map(pw => {
                const counts = {};
                (pw.workspace_data || []).forEach(tx => { counts[tx.type] = (counts[tx.type] || 0) + 1; });
                const summary = Object.entries(counts).map(([t, n]) => `${n} ${t[0] + t.slice(1).toLowerCase()}`).join(' · ') || 'Empty';
                const diff = Date.now() - new Date(pw.parked_at).getTime();
                const mins = Math.floor(diff / 60000);
                const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
                return (
                  <Box key={pw.id} sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#2e7d32', width: 42, height: 42, fontWeight: 700 }}>
                      {(pw.customer_name || '?')[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={700} noWrap>{pw.customer_name || 'Unknown Customer'}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{summary}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Parked by {pw.parked_by_employee_name || 'unknown'} · {ago}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="contained" color="success"
                        startIcon={<PlayArrowIcon />} onClick={() => handleResume(pw)}>
                        Resume
                      </Button>
                      <IconButton size="small" color="error" onClick={() => handleDiscardParked(pw)} title="Discard">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResumeDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Store Closing - Clock Out Reminder Dialog */}
      <Dialog
        open={storeClosingPromptOpen}
        onClose={() => setStoreClosingPromptOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#fff3cd',
            border: '2px solid #ff9800'
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: '#ff9800', color: 'white', fontWeight: 'bold' }}>
          Store Closing - Please Clock Out
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
            The store is being closed. Please clock out now.
          </Typography>
          {clockInTime && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You clocked in at {clockInTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </Typography>
          )}
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            If you need to stay for after-hours activities (training, inventory, etc.), you may dismiss this notification.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setStoreClosingPromptOpen(false)}
            color="inherit"
          >
            Stay Clocked In
          </Button>
          <Button
            onClick={async () => {
              setStoreClosingPromptOpen(false);
              await confirmClockOut();
            }}
            variant="contained"
            color="warning"
            disabled={clockLoading}
          >
            Clock Out Now
          </Button>
        </DialogActions>
      </Dialog>

      <CloseStoreIssuesDialog
        open={closeStoreIssuesOpen}
        onClose={handleCloseStoreIssuesDismiss}
        message={closeStoreIssuesMessage}
        issues={closeStoreIssues}
        clockedInEmployees={closeStoreClockedIn}
        onClockOut={handleClockOutEmployee}
        clockingOutId={clockingOutId}
        parkedWorkspaces={parkedWorkspaces}
        onDeleteParkedWorkspace={handleDeleteParkedWorkspace}
        deletingParkedId={deletingParkedId}
        onKeepParkedWorkspaces={handleKeepParkedWorkspacesOnClose}
      />

      <Dialog open={feedbackDialogOpen} onClose={() => setFeedbackDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Feedback</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Found a bug or have an idea? Let us know and we'll take a look.
          </Typography>
          <TextField
            autoFocus
            multiline
            minRows={4}
            fullWidth
            placeholder="What's on your mind?"
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitFeedback}
            disabled={!feedbackMessage.trim() || feedbackSubmitting}
            startIcon={feedbackSubmitting ? <CircularProgress size={16} /> : null}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={feedbackSubmitted}
        autoHideDuration={4000}
        onClose={() => setFeedbackSubmitted(false)}
      >
        <Alert severity="success" onClose={() => setFeedbackSubmitted(false)}>
          Thanks for your feedback!
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!feedbackNewAlert}
        autoHideDuration={10000}
        onClose={() => setFeedbackNewAlert(null)}
      >
        <Alert
          severity="info"
          onClose={() => setFeedbackNewAlert(null)}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setFeedbackNewAlert(null);
                navigate('/system-config/settings', { state: { initialTab: 8 } });
              }}
            >
              View
            </Button>
          }
        >
          {feedbackNewAlert}
        </Alert>
      </Snackbar>
    </>
  );
}

export default Navbar;
