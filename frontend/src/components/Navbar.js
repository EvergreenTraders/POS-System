import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
  AccountCircle as AccountIcon,
  LockOutlined as LockIcon,
  Logout as LogoutIcon,
  AccessTime as ClockIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWorkingDate } from '../context/WorkingDateContext';
import { useStoreStatus } from '../context/StoreStatusContext';
import { useNavigate } from 'react-router-dom';
import Cart from './Cart';
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
  const { storeStatus } = useStoreStatus();
  const navigate = useNavigate();

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
            emp => emp.employee_id === user.id
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

  return (
    <>
      <StyledAppBar position="fixed">
        <Toolbar>
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
              sx={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: storeStatus === 'open' ? 'success.main' : 'error.main',
                color: 'white',
                letterSpacing: '0.5px'
              }}
            >
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
    </>
  );
}

export default Navbar;
