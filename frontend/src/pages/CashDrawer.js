import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  History as HistoryIcon,
  AccountBalance as BankIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import axios from 'axios';
import config from '../config';

function CashDrawer() {
  const API_BASE_URL = config.apiUrl;
  const location = useLocation();
  const navigate = useNavigate();

  const [activeSession, setActiveSession] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]); // All active sessions (physical, safe, and master_safe)
  const [selectedSessionType, setSelectedSessionType] = useState('physical'); // 'physical', 'safe', or 'master_safe'
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [drawers, setDrawers] = useState([]);
  const [history, setHistory] = useState([]);
  const [sessionDetails, setSessionDetails] = useState(null);

  // Dialog states
  const [openDrawerDialog, setOpenDrawerDialog] = useState(false);
  const [drawerTypeFilter, setDrawerTypeFilter] = useState(null); // 'physical', 'safe', or 'master_safe'
  const [closeDrawerDialog, setCloseDrawerDialog] = useState(false);
  const [adjustmentDialog, setAdjustmentDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [discrepancyWarningDialog, setDiscrepancyWarningDialog] = useState(false);

  // Configuration
  const [discrepancyThreshold, setDiscrepancyThreshold] = useState(0.00);
  const [isBlindCount, setIsBlindCount] = useState(true);
  const [drawerBlindCountPrefs, setDrawerBlindCountPrefs] = useState({ drawers: true, safe: true });
  const [allDrawers, setAllDrawers] = useState([]); // Store all drawers including safe

  // Form states
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDrawer, setSelectedDrawer] = useState('');
  const [selectedDrawerType, setSelectedDrawerType] = useState(null);
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [actualBalance, setActualBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('bank_deposit');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Denomination states for Open Count mode
  const [openingDenominations, setOpeningDenominations] = useState({
    bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
    coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
  });
  const [closingDenominations, setClosingDenominations] = useState({
    bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
    coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchEmployees();
    fetchDrawers();
    fetchDiscrepancyThreshold();
    fetchBlindCountPreference();
    checkActiveSession();
    fetchHistory();
  }, []);

  // Update count mode when active session changes
  useEffect(() => {
    if (activeSession && activeSession.drawer_type && drawerBlindCountPrefs.drawers !== undefined) {
      const isSafe = activeSession.drawer_type === 'safe' || activeSession.drawer_type === 'master_safe';
      setIsBlindCount(isSafe ? drawerBlindCountPrefs.safe : drawerBlindCountPrefs.drawers);
      setSelectedDrawerType(activeSession.drawer_type);
    }
  }, [activeSession, drawerBlindCountPrefs]);

  // Show message if redirected from checkout
  useEffect(() => {
    if (location.state?.message) {
      showSnackbar(location.state.message, 'warning');
      // Clear the message from location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Auto-select current user when opening drawer dialog
  useEffect(() => {
    if (openDrawerDialog) {
      // Reset form when dialog opens
      setSelectedDrawer('');
      setOpeningBalance('');
      setOpeningNotes('');
      setOpeningDenominations({
        bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
        coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
      });
      
      // Auto-select current user if not already selected
      if (!selectedEmployee) {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (currentUser.id) {
          setSelectedEmployee(currentUser.id);
        }
      }
      
      // Set blind count mode based on drawer type filter
      if (drawerTypeFilter === 'safe' || drawerTypeFilter === 'master_safe') {
        setIsBlindCount(drawerBlindCountPrefs.safe);
      } else if (drawerTypeFilter === 'physical') {
        setIsBlindCount(drawerBlindCountPrefs.drawers);
      }
    }
  }, [openDrawerDialog, drawerTypeFilter, drawerBlindCountPrefs]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/employees`);
      setEmployees(response.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
      showSnackbar('Failed to load employees', 'error');
    }
  };

  const fetchDrawers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/drawers`);
      // Store all drawers including safe
      const allActiveDrawers = response.data.filter(drawer => drawer.is_active);
      setAllDrawers(allActiveDrawers);
      // Show all active drawers (physical, safe, and master_safe)
      setDrawers(allActiveDrawers);
    } catch (err) {
      console.error('Error fetching drawers:', err);
      showSnackbar('Failed to load drawers', 'error');
    }
  };

  const fetchDiscrepancyThreshold = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/discrepancy-threshold`);
      const thresholdValue = response.data.threshold_amount || 0.00;
      setDiscrepancyThreshold(thresholdValue);
    } catch (err) {
      console.error('Error fetching discrepancy threshold:', err);
      setDiscrepancyThreshold(0.00);
    }
  };

  const fetchBlindCountPreference = async () => {
    try {
      // Get both preferences
      const response = await axios.get(`${API_BASE_URL}/user_preferences`);
      const blindCountDrawersPreference = response.data.find(pref => pref.preference_name === 'blindCount_drawers');
      const blindCountSafePreference = response.data.find(pref => pref.preference_name === 'blindCount_safe');
      
      // Default to true if not found
      const blindCountDrawers = blindCountDrawersPreference ? blindCountDrawersPreference.preference_value === 'true' : true;
      const blindCountSafe = blindCountSafePreference ? blindCountSafePreference.preference_value === 'true' : true;
      
      // Store both preferences
      setDrawerBlindCountPrefs({
        drawers: blindCountDrawers,
        safe: blindCountSafe
      });
      
      // Set initial blind count based on current selection or default to drawers
      if (selectedDrawerType) {
        const isSafe = selectedDrawerType === 'safe' || selectedDrawerType === 'master_safe';
        setIsBlindCount(isSafe ? blindCountSafe : blindCountDrawers);
      } else {
        setIsBlindCount(blindCountDrawers); // Default to drawers preference
      }
    } catch (err) {
      console.error('Error fetching blind count preference:', err);
      setIsBlindCount(true); // Default to blind count
    }
  };

  const checkActiveSession = async () => {
    try {
      setLoading(true);
      // Get current logged-in employee from localStorage or context
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      if (currentUser.id) {
        const response = await axios.get(
          `${API_BASE_URL}/cash-drawer/employee/${currentUser.id}/active`
        );

        // Response is now an array of all active sessions
        const sessions = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);
        setActiveSessions(sessions);
        
        // Separate sessions by type
        const physicalSession = sessions.find(s => s.drawer_type === 'physical');
        const safeSession = sessions.find(s => s.drawer_type === 'safe');
        const masterSafeSession = sessions.find(s => s.drawer_type === 'master_safe');
        
        // Set active session - always prioritize physical drawer by default (used for transactions)
        let currentSession = null;
        if (selectedSessionType === 'safe' && safeSession) {
          // Show safe if user explicitly selected it via the button
          currentSession = safeSession;
        } else if (selectedSessionType === 'master_safe' && masterSafeSession) {
          // Show master safe if user explicitly selected it via the button
          currentSession = masterSafeSession;
        } else if (physicalSession) {
          // Always default to physical drawer when it exists (for transactions)
          currentSession = physicalSession;
          setSelectedSessionType('physical');
        } else if (safeSession) {
          // Show safe if no physical drawer exists
          currentSession = safeSession;
          setSelectedSessionType('safe');
        } else if (masterSafeSession) {
          // Show master safe if no physical or safe drawer exists
          currentSession = masterSafeSession;
          setSelectedSessionType('master_safe');
        } else if (sessions.length > 0) {
          // Fallback to first available session
          currentSession = sessions[0];
          if (currentSession.drawer_type === 'safe') {
            setSelectedSessionType('safe');
          } else if (currentSession.drawer_type === 'master_safe') {
            setSelectedSessionType('master_safe');
          } else {
            setSelectedSessionType('physical');
          }
        }
        
        setActiveSession(currentSession);
        
        // Update count mode based on drawer type if session exists
        if (currentSession && currentSession.drawer_type) {
          setSelectedDrawerType(currentSession.drawer_type);
          const isSafe = currentSession.drawer_type === 'safe' || currentSession.drawer_type === 'master_safe';
          setIsBlindCount(isSafe ? drawerBlindCountPrefs.safe : drawerBlindCountPrefs.drawers);
        }
      } else {
        setActiveSession(null);
        setActiveSessions([]);
      }
    } catch (err) {
      console.error('Error checking active session:', err);
      setActiveSession(null);
      setActiveSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cash-drawer/history`, {
        params: { limit: 50 }
      });
      setHistory(response.data);
    } catch (err) {
      console.error('Error fetching history:', err);
      showSnackbar('Failed to load history', 'error');
    }
  };

  const fetchSessionDetails = async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cash-drawer/${sessionId}/details`);
      setSessionDetails(response.data);
      setDetailsDialog(true);
    } catch (err) {
      console.error('Error fetching session details:', err);
      showSnackbar('Failed to load session details', 'error');
    }
  };

  const handleOpenDrawer = async () => {
    // Get current logged-in user
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = selectedEmployee || currentUser.id;

    // Calculate balance based on mode
    const calculatedBalance = isBlindCount
      ? parseFloat(openingBalance)
      : calculateDenominationTotal(openingDenominations);

    // Validation
    if (!employeeId || !selectedDrawer) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    if (isBlindCount && !openingBalance) {
      showSnackbar('Please enter the opening balance', 'error');
      return;
    }

    if (!isBlindCount && calculatedBalance === 0) {
      showSnackbar('Please enter denomination counts', 'error');
      return;
    }

    // Find the selected drawer to check its type
    const selectedDrawerInfo = allDrawers.find(d => d.drawer_id === selectedDrawer);
    if (!selectedDrawerInfo) {
      showSnackbar('Selected drawer not found', 'error');
      return;
    }

    const drawerType = selectedDrawerInfo.drawer_type;
    const isSafe = drawerType === 'safe' || drawerType === 'master_safe';

    // Check if there's already an active session for this EXACT drawer type
    // Each drawer type (physical, safe, master_safe) can have its own session
    const existingSession = activeSessions.find(s => {
      return s.drawer_type === drawerType;
    });

    if (existingSession) {
      let drawerTypeName = 'drawer';
      if (drawerType === 'safe') {
        drawerTypeName = 'safe drawer';
      } else if (drawerType === 'master_safe') {
        drawerTypeName = 'master safe';
      } else if (drawerType === 'physical') {
        drawerTypeName = 'physical drawer';
      }
      showSnackbar(`You already have an active ${drawerTypeName} session. Please close it before opening a new one.`, 'warning');
      return;
    }

    try {
      // Open the drawer
      const openResponse = await axios.post(`${API_BASE_URL}/cash-drawer/open`, {
        drawer_id: selectedDrawer,
        employee_id: employeeId,
        opening_balance: calculatedBalance,
        opening_notes: openingNotes || null
      });

      const sessionId = openResponse.data.session_id;

      // If Open Count mode, save denominations
      if (!isBlindCount) {
        await axios.post(`${API_BASE_URL}/cash-drawer/${sessionId}/denominations`, {
          denomination_type: 'opening',
          counted_by: employeeId,
          notes: openingNotes || null,
          ...openingDenominations
        });
      }

      const drawerTypeName = isSafe ? 'Safe' : 'Cash drawer';
      showSnackbar(`${drawerTypeName} opened successfully`, 'success');
      setOpenDrawerDialog(false);
      setDrawerTypeFilter(null);
      resetOpenForm();
      
      // Update selected session type and refresh sessions
      if (drawerType === 'master_safe') {
        setSelectedSessionType('master_safe');
      } else if (drawerType === 'safe') {
        setSelectedSessionType('safe');
      } else {
        setSelectedSessionType('physical');
      }
      await checkActiveSession();
    } catch (err) {
      console.error('Error opening drawer:', err);
      showSnackbar(err.response?.data?.error || 'Failed to open drawer', 'error');
    }
  };

  const handleCloseDrawer = async (forceClose = false) => {
    // Get current logged-in user
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = currentUser.id;

    // Calculate balance based on mode
    const calculatedBalance = isBlindCount
      ? parseFloat(actualBalance)
      : calculateDenominationTotal(closingDenominations);

    // Validation
    if (isBlindCount && !actualBalance) {
      showSnackbar('Please enter the actual balance', 'error');
      return;
    }

    if (!isBlindCount && calculatedBalance === 0) {
      showSnackbar('Please enter denomination counts', 'error');
      return;
    }

    // Calculate discrepancy before closing
    const expected = parseFloat(activeSession?.current_expected_balance || 0);
    const actual = calculatedBalance;
    const discrepancyAmount = Math.abs(actual - expected);
    const threshold = parseFloat(discrepancyThreshold || 0);

    // Check if discrepancy exceeds threshold and not forcing close
    if (!forceClose && discrepancyAmount > threshold) {
      setCloseDrawerDialog(false); // Close the original dialog
      setDiscrepancyWarningDialog(true);
      return;
    }

    try {
      // If Open Count mode, save denominations first
      if (!isBlindCount) {
        await axios.post(`${API_BASE_URL}/cash-drawer/${activeSession.session_id}/denominations`, {
          denomination_type: 'closing',
          counted_by: employeeId,
          notes: closingNotes || null,
          ...closingDenominations
        });
      }

      // Close the drawer
      const response = await axios.put(
        `${API_BASE_URL}/cash-drawer/${activeSession.session_id}/close`,
        {
          actual_balance: calculatedBalance,
          closing_notes: closingNotes || null
        }
      );

      const discrepancy = parseFloat(response.data.discrepancy) || 0;
      const transactionCount = response.data.transaction_count || 0;
      let message = `Cash drawer closed successfully - ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}`;

      if (discrepancy > 0) {
        message += ` (Overage: $${discrepancy.toFixed(2)})`;
      } else if (discrepancy < 0) {
        message += ` (Shortage: $${Math.abs(discrepancy).toFixed(2)})`;
      } else {
        message += ' (Balanced)';
      }

      showSnackbar(message, discrepancy === 0 ? 'success' : 'warning');
      setCloseDrawerDialog(false);
      setDiscrepancyWarningDialog(false);
      resetCloseForm();
      checkActiveSession();
      fetchHistory();
    } catch (err) {
      console.error('Error closing drawer:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to close drawer';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleAddAdjustment = async () => {
    if (!adjustmentAmount || !adjustmentReason) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      await axios.post(
        `${API_BASE_URL}/cash-drawer/${activeSession.session_id}/adjustment`,
        {
          amount: parseFloat(adjustmentAmount),
          adjustment_type: adjustmentType,
          reason: adjustmentReason,
          performed_by: currentUser.id
        }
      );

      showSnackbar('Adjustment added successfully', 'success');
      setAdjustmentDialog(false);
      resetAdjustmentForm();
      checkActiveSession();
    } catch (err) {
      console.error('Error adding adjustment:', err);
      showSnackbar(err.response?.data?.error || 'Failed to add adjustment', 'error');
    }
  };

  const resetOpenForm = () => {
    setSelectedEmployee('');
    setSelectedDrawer('');
    setSelectedDrawerType(null);
    setDrawerTypeFilter(null);
    setOpeningBalance('');
    setOpeningNotes('');
    setOpeningDenominations({
      bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
      coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
    });
  };

  const resetCloseForm = () => {
    setActualBalance('');
    setClosingNotes('');
    setClosingDenominations({
      bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
      coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
    });
  };

  const resetAdjustmentForm = () => {
    setAdjustmentAmount('');
    setAdjustmentType('bank_deposit');
    setAdjustmentReason('');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const calculateDenominationTotal = (denominations) => {
    return (
      (parseInt(denominations.bill_100 || 0) * 100) +
      (parseInt(denominations.bill_50 || 0) * 50) +
      (parseInt(denominations.bill_20 || 0) * 20) +
      (parseInt(denominations.bill_10 || 0) * 10) +
      (parseInt(denominations.bill_5 || 0) * 5) +
      (parseInt(denominations.coin_2 || 0) * 2) +
      (parseInt(denominations.coin_1 || 0) * 1) +
      (parseInt(denominations.coin_0_25 || 0) * 0.25) +
      (parseInt(denominations.coin_0_10 || 0) * 0.10) +
      (parseInt(denominations.coin_0_05 || 0) * 0.05)
    );
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusChip = (status) => {
    const statusColors = {
      open: 'success',
      closed: 'warning',
      reconciled: 'default'
    };

    return (
      <Chip
        label={status.toUpperCase()}
        color={statusColors[status] || 'default'}
        size="small"
      />
    );
  };

  const getDiscrepancyChip = (discrepancy) => {
    if (!discrepancy || discrepancy === 0) {
      return <Chip label="Balanced" color="success" size="small" icon={<CheckCircleIcon />} />;
    } else if (discrepancy > 0) {
      return <Chip label={`Overage ${formatCurrency(discrepancy)}`} color="info" size="small" />;
    } else {
      return <Chip label={`Shortage ${formatCurrency(Math.abs(discrepancy))}`} color="error" size="small" icon={<WarningIcon />} />;
    }
  };

  const renderDenominationEntry = (denominations, setDenominations, calculatedTotal) => {
    const handleDenominationChange = (field, value) => {
      setDenominations(prev => ({
        ...prev,
        [field]: parseInt(value) || 0
      }));
    };

    const denominationFields = [
      { label: '$100 Bills', field: 'bill_100', value: 100 },
      { label: '$50 Bills', field: 'bill_50', value: 50 },
      { label: '$20 Bills', field: 'bill_20', value: 20 },
      { label: '$10 Bills', field: 'bill_10', value: 10 },
      { label: '$5 Bills', field: 'bill_5', value: 5 },
      { label: '$2 Coins', field: 'coin_2', value: 2 },
      { label: '$1 Coins', field: 'coin_1', value: 1 },
      { label: '$0.25 Coins', field: 'coin_0_25', value: 0.25 },
      { label: '$0.10 Coins', field: 'coin_0_10', value: 0.10 },
      { label: '$0.05 Coins', field: 'coin_0_05', value: 0.05 },
    ];

    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
          Cash Denominations
        </Typography>
        <Grid container spacing={2}>
          {denominationFields.map((item) => (
            <Grid item xs={6} sm={4} md={3} key={item.field}>
              <TextField
                label={item.label}
                type="number"
                size="small"
                fullWidth
                value={denominations[item.field]}
                onChange={(e) => handleDenominationChange(item.field, e.target.value)}
                inputProps={{ min: 0, step: 1 }}
              />
            </Grid>
          ))}
        </Grid>
        <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
          <Typography variant="h6" color="primary">
            Total: {formatCurrency(calculatedTotal)}
          </Typography>
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  const handleBackToCheckout = () => {
    // Get items and customer from sessionStorage before navigating
    const checkoutItems = sessionStorage.getItem('checkoutItems');
    const selectedCustomer = sessionStorage.getItem('selectedCustomer');
    const cartItems = sessionStorage.getItem('cartItems');
    const parsedItems = checkoutItems ? JSON.parse(checkoutItems) : null;
    const parsedCustomer = selectedCustomer ? JSON.parse(selectedCustomer) : null;
    const parsedCartItems = cartItems ? JSON.parse(cartItems) : null;

    navigate('/checkout', {
      state: {
        items: parsedItems,
        customer: parsedCustomer,
        allCartItems: parsedCartItems,
        from: 'cash-drawer'
      }
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">
          Cash Drawer Management
        </Typography>
        {location.state?.returnTo === '/checkout' && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToCheckout}
          >
            Back to Checkout
          </Button>
        )}
      </Box>

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Active Session" />
        <Tab label="History" />
      </Tabs>

      {/* Active Session Tab */}
      {tabValue === 0 && (
        <>
          {activeSessions.length > 0 ? (
            <Grid container spacing={3}>
              {/* Session Type Selector - Show if multiple types exist */}
              {(() => {
                const hasPhysical = activeSessions.some(s => s.drawer_type === 'physical');
                const hasSafe = activeSessions.some(s => s.drawer_type === 'safe');
                const hasMasterSafe = activeSessions.some(s => s.drawer_type === 'master_safe');
                const sessionTypeCount = [hasPhysical, hasSafe, hasMasterSafe].filter(Boolean).length;
                
                return sessionTypeCount > 1 ? (
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {hasPhysical && (
                        <Button
                          variant={selectedSessionType === 'physical' ? 'contained' : 'outlined'}
                          onClick={() => {
                            const physicalSession = activeSessions.find(s => s.drawer_type === 'physical');
                            if (physicalSession) {
                              setSelectedSessionType('physical');
                              setActiveSession(physicalSession);
                              setIsBlindCount(drawerBlindCountPrefs.drawers);
                            }
                          }}
                        >
                          Physical Drawer Session
                        </Button>
                      )}
                      {hasSafe && (
                        <Button
                          variant={selectedSessionType === 'safe' ? 'contained' : 'outlined'}
                          onClick={() => {
                            const safeSession = activeSessions.find(s => s.drawer_type === 'safe');
                            if (safeSession) {
                              setSelectedSessionType('safe');
                              setActiveSession(safeSession);
                              setIsBlindCount(drawerBlindCountPrefs.safe);
                            }
                          }}
                        >
                          Safe Drawer Session
                        </Button>
                      )}
                      {hasMasterSafe && (
                        <Button
                          variant={selectedSessionType === 'master_safe' ? 'contained' : 'outlined'}
                          onClick={() => {
                            const masterSafeSession = activeSessions.find(s => s.drawer_type === 'master_safe');
                            if (masterSafeSession) {
                              setSelectedSessionType('master_safe');
                              setActiveSession(masterSafeSession);
                              setIsBlindCount(drawerBlindCountPrefs.safe);
                            }
                          }}
                        >
                          Master Safe Session
                        </Button>
                      )}
                    </Box>
                  </Grid>
                ) : null;
              })()}
              
              {/* Current Session Card */}
              {activeSession ? (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                          Active {activeSession.drawer_type === 'safe' || activeSession.drawer_type === 'master_safe' ? 'Safe' : 'Drawer'} Session
                          {activeSession.drawer_name && ` - ${activeSession.drawer_name}`}
                        </Typography>
                        {getStatusChip(activeSession.status)}
                      </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Drawer Type</Typography>
                        <Typography variant="body1">
                          {activeSession.drawer_type === 'safe' ? 'Safe/Vault' : 
                           activeSession.drawer_type === 'master_safe' ? 'Master Safe' : 
                           'Physical Drawer'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Opened At</Typography>
                        <Typography variant="body1">{formatDateTime(activeSession.opened_at)}</Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">Opening Balance</Typography>
                        <Typography variant="h6">{formatCurrency(activeSession.opening_balance)}</Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">Current Expected Balance</Typography>
                        <Typography variant="h6">{formatCurrency(activeSession.current_expected_balance)}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Transaction Count</Typography>
                        <Typography variant="body1">{activeSession.transaction_count || 0}</Typography>
                      </Grid>
                    </Grid>

                    <Box mt={3} display="flex" gap={2} flexWrap="wrap">
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setCloseDrawerDialog(true)}
                      >
                        Close {activeSession.drawer_type === 'safe' || activeSession.drawer_type === 'master_safe' ? 'Safe' : 'Drawer'}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setAdjustmentDialog(true)}
                      >
                        Add Adjustment
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<HistoryIcon />}
                        onClick={() => fetchSessionDetails(activeSession.session_id)}
                      >
                        View Details
                      </Button>
                      {activeSession.drawer_type === 'physical' && (
                        <>
                          {allDrawers.some(d => d.drawer_type === 'safe' && d.is_active) && (
                            <Button
                              variant="outlined"
                              color="secondary"
                              startIcon={<AddIcon />}
                              onClick={() => {
                                setDrawerTypeFilter('safe');
                                setOpenDrawerDialog(true);
                              }}
                            >
                              Open Safe Drawer
                            </Button>
                          )}
                          {allDrawers.some(d => d.drawer_type === 'master_safe' && d.is_active) && (
                            <Button
                              variant="outlined"
                              color="secondary"
                              startIcon={<AddIcon />}
                              onClick={() => {
                                setDrawerTypeFilter('master_safe');
                                setOpenDrawerDialog(true);
                              }}
                            >
                              Open Master Safe
                            </Button>
                          )}
                        </>
                      )}
                    </Box>
                  </CardContent>
                </Card>
                </Grid>
              ) : null}
            </Grid>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <MoneyIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Active Drawer Session
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Open a drawer to start managing cash
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setDrawerTypeFilter('physical');
                    setOpenDrawerDialog(true);
                  }}
                >
                  Open Cash Drawer
                </Button>
                {allDrawers.some(d => d.drawer_type === 'safe' && d.is_active) && (
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setDrawerTypeFilter('safe');
                      setOpenDrawerDialog(true);
                    }}
                  >
                    Open Safe Drawer
                  </Button>
                )}
                {allDrawers.some(d => d.drawer_type === 'master_safe' && d.is_active) && (
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setDrawerTypeFilter('master_safe');
                      setOpenDrawerDialog(true);
                    }}
                  >
                    Open Master Safe
                  </Button>
                )}
              </Box>
            </Paper>
          )}
        </>
      )}

      {/* History Tab */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Session ID</TableCell>
                <TableCell>Employee</TableCell>
                <TableCell>Opened</TableCell>
                <TableCell>Closed</TableCell>
                <TableCell align="right">Opening</TableCell>
                <TableCell align="right">Expected</TableCell>
                <TableCell align="right">Actual</TableCell>
                <TableCell>Discrepancy</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((session) => (
                <TableRow key={session.session_id}>
                  <TableCell>{session.session_id}</TableCell>
                  <TableCell>{session.employee_name}</TableCell>
                  <TableCell>{formatDateTime(session.opened_at)}</TableCell>
                  <TableCell>{formatDateTime(session.closed_at)}</TableCell>
                  <TableCell align="right">{formatCurrency(session.opening_balance)}</TableCell>
                  <TableCell align="right">{formatCurrency(session.expected_balance)}</TableCell>
                  <TableCell align="right">{formatCurrency(session.actual_balance)}</TableCell>
                  <TableCell>{getDiscrepancyChip(session.discrepancy)}</TableCell>
                  <TableCell>{getStatusChip(session.status)}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => fetchSessionDetails(session.session_id)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Open Drawer Dialog */}
      <Dialog open={openDrawerDialog} onClose={() => {
        setOpenDrawerDialog(false);
        setDrawerTypeFilter(null);
        resetOpenForm();
      }} maxWidth={isBlindCount ? "sm" : "md"} fullWidth>
        <DialogTitle>
          {drawerTypeFilter === 'master_safe' 
            ? 'Open Master Safe' 
            : drawerTypeFilter === 'safe'
            ? 'Open Safe Drawer'
            : 'Open Cash Drawer'}
          {!isBlindCount && ' (Open Count Mode)'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Select Drawer</InputLabel>
              <Select
                value={selectedDrawer}
                label="Select Drawer"
                onChange={(e) => {
                  const drawerId = e.target.value;
                  setSelectedDrawer(drawerId);
                  // Find the drawer type and update blind count accordingly
                  const drawer = allDrawers.find(d => d.drawer_id === drawerId);
                  if (drawer) {
                    setSelectedDrawerType(drawer.drawer_type);
                    const isSafe = drawer.drawer_type === 'safe' || drawer.drawer_type === 'master_safe';
                    setIsBlindCount(isSafe ? drawerBlindCountPrefs.safe : drawerBlindCountPrefs.drawers);
                  }
                }}
              >
                {allDrawers
                  .filter(drawer => {
                    // Filter drawers based on drawerTypeFilter
                    if (drawerTypeFilter === 'physical') {
                      return drawer.drawer_type === 'physical' && drawer.is_active;
                    } else if (drawerTypeFilter === 'safe') {
                      return drawer.drawer_type === 'safe' && drawer.is_active;
                    } else if (drawerTypeFilter === 'master_safe') {
                      return drawer.drawer_type === 'master_safe' && drawer.is_active;
                    }
                    // If no filter, show all active drawers
                    return drawer.is_active;
                  })
                  .map((drawer) => (
                    <MenuItem key={drawer.drawer_id} value={drawer.drawer_id}>
                      {drawer.drawer_name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {isBlindCount ? (
              <TextField
                label="Opening Balance"
                type="number"
                fullWidth
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                required
                inputProps={{ step: '0.01', min: '0' }}
              />
            ) : (
              <>
                {renderDenominationEntry(openingDenominations, setOpeningDenominations, calculateDenominationTotal(openingDenominations))}
                <Alert severity="info" sx={{ mt: 1 }}>
                  Opening balance will be automatically set to the total of counted denominations: {formatCurrency(calculateDenominationTotal(openingDenominations))}
                </Alert>
              </>
            )}

            <TextField
              label="Notes (Optional)"
              fullWidth
              multiline
              rows={3}
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDrawerDialog(false)}>Cancel</Button>
          <Button onClick={handleOpenDrawer} variant="contained" color="primary">
            Open Drawer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Drawer Dialog */}
      <Dialog open={closeDrawerDialog} onClose={() => setCloseDrawerDialog(false)} maxWidth={isBlindCount ? "sm" : "md"} fullWidth>
        <DialogTitle>
          Close {activeSession?.drawer_type === 'safe' || activeSession?.drawer_type === 'master_safe' ? 'Safe' : 'Cash Drawer'} 
          {!isBlindCount && ' (Open Count Mode)'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              Expected Balance: {formatCurrency(activeSession?.current_expected_balance)}
              <br />
              Transaction Count: {activeSession?.transaction_count || 0}
            </Alert>

            {isBlindCount ? (
              <>
                <TextField
                  label="Actual Balance (Counted)"
                  type="number"
                  fullWidth
                  value={actualBalance}
                  onChange={(e) => setActualBalance(e.target.value)}
                  required
                  inputProps={{ step: '0.01', min: '0' }}
                  autoFocus
                />
                {actualBalance && activeSession && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Discrepancy: {' '}
                      <strong>
                        {formatCurrency(parseFloat(actualBalance) - activeSession.current_expected_balance)}
                      </strong>
                    </Typography>
                  </Box>
                )}
              </>
            ) : (
              <>
                {renderDenominationEntry(closingDenominations, setClosingDenominations, calculateDenominationTotal(closingDenominations))}
                <Alert severity="info" sx={{ mt: 1 }}>
                  Actual balance will be automatically set to the total of counted denominations: {formatCurrency(calculateDenominationTotal(closingDenominations))}
                </Alert>
                {calculateDenominationTotal(closingDenominations) > 0 && activeSession && (
                  <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Expected Balance: {formatCurrency(activeSession.current_expected_balance)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Actual Balance (Counted): {formatCurrency(calculateDenominationTotal(closingDenominations))}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1 }} color={
                      Math.abs(calculateDenominationTotal(closingDenominations) - activeSession.current_expected_balance) === 0 ? 'success.main' : 'error.main'
                    }>
                      <strong>Discrepancy: {formatCurrency(calculateDenominationTotal(closingDenominations) - activeSession.current_expected_balance)}</strong>
                    </Typography>
                  </Box>
                )}
              </>
            )}

            <TextField
              label="Closing Notes (Optional)"
              fullWidth
              multiline
              rows={3}
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDrawerDialog(false)}>Cancel</Button>
          <Button onClick={() => handleCloseDrawer(false)} variant="contained" color="primary">
            Close Drawer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Discrepancy Warning Dialog */}
      <Dialog open={discrepancyWarningDialog} onClose={() => setDiscrepancyWarningDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Discrepancy Warning</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="warning">
              The discrepancy amount exceeds the acceptable threshold of ${Number(discrepancyThreshold || 0).toFixed(2)}.
            </Alert>
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Transaction Count:</strong> {activeSession?.transaction_count || 0}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Expected Balance:</strong> {formatCurrency(activeSession?.current_expected_balance)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Actual Balance:</strong> {formatCurrency(parseFloat(actualBalance || 0))}
              </Typography>
              <Typography variant="body1" color="error" gutterBottom>
                <strong>Discrepancy:</strong> {formatCurrency(Math.abs(parseFloat(actualBalance || 0) - parseFloat(activeSession?.current_expected_balance || 0)))}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Please recount the cash drawer to verify the balance. If the discrepancy is correct, you can proceed to close the drawer anyway.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscrepancyWarningDialog(false)}>
            Recount
          </Button>
          <Button onClick={() => handleCloseDrawer(true)} variant="contained" color="warning">
            Close Anyway
          </Button>
        </DialogActions>
      </Dialog>

      {/* Adjustment Dialog */}
      <Dialog open={adjustmentDialog} onClose={() => setAdjustmentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Cash Adjustment</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Adjustment Type</InputLabel>
              <Select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
                label="Adjustment Type"
              >
                <MenuItem value="bank_deposit">Bank Deposit (Remove Cash)</MenuItem>
                <MenuItem value="change_order">Change Order (Add Cash)</MenuItem>
                <MenuItem value="petty_cash">Petty Cash</MenuItem>
                <MenuItem value="correction">Correction</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Amount"
              type="number"
              fullWidth
              value={adjustmentAmount}
              onChange={(e) => setAdjustmentAmount(e.target.value)}
              required
              inputProps={{ step: '0.01' }}
              helperText="Positive for adding cash, negative for removing cash"
            />
            <TextField
              label="Reason"
              fullWidth
              multiline
              rows={3}
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustmentDialog(false)}>Cancel</Button>
          <Button onClick={handleAddAdjustment} variant="contained" color="primary">
            Add Adjustment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Session Details Dialog */}
      <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Drawer Session Details</DialogTitle>
        <DialogContent>
          {sessionDetails && (
            <Box sx={{ pt: 2 }}>
              {/* Session Info */}
              <Typography variant="h6" gutterBottom>Session Information</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Employee</Typography>
                  <Typography>{sessionDetails.session.employee_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  {getStatusChip(sessionDetails.session.status)}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Opened</Typography>
                  <Typography>{formatDateTime(sessionDetails.session.opened_at)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Closed</Typography>
                  <Typography>{formatDateTime(sessionDetails.session.closed_at)}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Balances */}
              <Typography variant="h6" gutterBottom>Balances</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Opening</Typography>
                  <Typography variant="h6">{formatCurrency(sessionDetails.session.opening_balance)}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Expected</Typography>
                  <Typography variant="h6">{formatCurrency(sessionDetails.session.expected_balance)}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Actual</Typography>
                  <Typography variant="h6">{formatCurrency(sessionDetails.session.actual_balance)}</Typography>
                </Grid>
              </Grid>

              {sessionDetails.adjustments.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>Adjustments</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell>Reason</TableCell>
                          <TableCell>Performed By</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sessionDetails.adjustments.map((adj) => (
                          <TableRow key={adj.adjustment_id}>
                            <TableCell>{adj.adjustment_type.replace('_', ' ')}</TableCell>
                            <TableCell align="right">{formatCurrency(adj.amount)}</TableCell>
                            <TableCell>{adj.reason}</TableCell>
                            <TableCell>{adj.performed_by_name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default CashDrawer;
