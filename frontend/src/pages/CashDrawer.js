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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  History as HistoryIcon,
  AccountBalance as BankIcon,
  Store as StoreIcon,
} from '@mui/icons-material';
import axios from 'axios';
import config from '../config';
import { useStoreStatus } from '../context/StoreStatusContext';

function CashDrawer() {
  const API_BASE_URL = config.apiUrl;
  const location = useLocation();
  const navigate = useNavigate();
  const { isStoreClosed } = useStoreStatus();

  const [activeSession, setActiveSession] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]); // All active sessions (physical, safe, and master_safe)
  const [allActiveSessions, setAllActiveSessions] = useState([]); // All active sessions from all employees (for transfers)
  const [selectedSessionType, setSelectedSessionType] = useState('physical'); // 'physical', 'safe', or 'master_safe'
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [drawers, setDrawers] = useState([]);
  const [history, setHistory] = useState([]);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [overviewData, setOverviewData] = useState({ safes: [], drawers: [] });

  // Store status states
  const [storeStatus, setStoreStatus] = useState({ status: 'closed', session: null, lastClosed: null });
  const [storeStatusLoading, setStoreStatusLoading] = useState(false);
  const [closeStoreDialogOpen, setCloseStoreDialogOpen] = useState(false);
  const [isBackupComputer, setIsBackupComputer] = useState(false);
  const [clockedInEmployees, setClockedInEmployees] = useState([]);

  // Dialog states
  const [openDrawerDialog, setOpenDrawerDialog] = useState(false);
  const [drawerTypeFilter, setDrawerTypeFilter] = useState(null); // 'physical', 'safe', or 'master_safe'
  const [closeDrawerDialog, setCloseDrawerDialog] = useState(false);
  const [adjustmentDialog, setAdjustmentDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [discrepancyWarningDialog, setDiscrepancyWarningDialog] = useState(false);
  const [managerApprovalDialog, setManagerApprovalDialog] = useState(false);
  const [minMaxWarningDialog, setMinMaxWarningDialog] = useState(false);

  // Manager approval form states
  const [managerUsername, setManagerUsername] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [managerApprovalError, setManagerApprovalError] = useState('');
  const [managerApprovalLoading, setManagerApprovalLoading] = useState(false);

  // Configuration
  const [discrepancyThreshold, setDiscrepancyThreshold] = useState(0.00);
  const [minClose, setMinClose] = useState(0); // For physical drawers
  const [maxClose, setMaxClose] = useState(0); // For physical drawers
  const [minCloseSafe, setMinCloseSafe] = useState(0); // For safes
  const [maxCloseSafe, setMaxCloseSafe] = useState(0); // For safes
  const [isBlindCount, setIsBlindCount] = useState(true); // For closing drawer mode
  const [isIndividualDenominations, setIsIndividualDenominations] = useState(false); // For opening drawer mode
  const [drawerBlindCountPrefs, setDrawerBlindCountPrefs] = useState({ drawers: true, safe: true }); // Closing mode preferences
  const [drawerIndividualDenominationsPrefs, setDrawerIndividualDenominationsPrefs] = useState({ drawers: false, safe: false }); // Opening mode preferences
  const [allDrawers, setAllDrawers] = useState([]); // Store all drawers including safe

  // Form states
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDrawer, setSelectedDrawer] = useState('');
  const [selectedDrawerType, setSelectedDrawerType] = useState(null);
  const [selectedSharingMode, setSelectedSharingMode] = useState(null); // null = not selected, 'single' or 'shared'
  const [sharingModeRequired, setSharingModeRequired] = useState(false); // true when drawer needs sharing mode config
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [actualBalance, setActualBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('bank_deposit');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [transferSourceSession, setTransferSourceSession] = useState('');

  // Denomination states for Open Count mode
  const [openingDenominations, setOpeningDenominations] = useState({
    bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
    coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
  });
  const [closingDenominations, setClosingDenominations] = useState({
    bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
    coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
  });
  const [openingDenominationsFromDB, setOpeningDenominationsFromDB] = useState(null); // Opening denominations from database
  const [calculatedClosingBalance, setCalculatedClosingBalance] = useState(0); // Store calculated balance for discrepancy dialog

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchEmployees();
    fetchDrawers();
    fetchDiscrepancyThreshold();
    fetchMinMaxClose();
    fetchBlindCountPreference();
    fetchOverview();
    fetchStoreStatus();
    checkActiveSession();
    fetchHistory();
  }, []);

  // Update count mode when active session changes
  useEffect(() => {
    if (activeSession && activeSession.drawer_type && drawerBlindCountPrefs.drawers !== undefined) {
      const isSafe = activeSession.drawer_type === 'safe' || activeSession.drawer_type === 'master_safe';
      setIsBlindCount(isSafe ? drawerBlindCountPrefs.safe : drawerBlindCountPrefs.drawers);
      setIsIndividualDenominations(isSafe ? drawerIndividualDenominationsPrefs.safe : drawerIndividualDenominationsPrefs.drawers);
      setSelectedDrawerType(activeSession.drawer_type);
    }
  }, [activeSession, drawerBlindCountPrefs, drawerIndividualDenominationsPrefs]);

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
      
      // Set closing mode (blind count) based on drawer type filter
      if (drawerTypeFilter === 'safe' || drawerTypeFilter === 'master_safe') {
        setIsBlindCount(drawerBlindCountPrefs.safe);
      } else if (drawerTypeFilter === 'physical') {
        setIsBlindCount(drawerBlindCountPrefs.drawers);
      }
      
      // Set opening mode (individual denominations) based on drawer type filter
      if (drawerTypeFilter === 'safe' || drawerTypeFilter === 'master_safe') {
        setIsIndividualDenominations(drawerIndividualDenominationsPrefs.safe);
      } else if (drawerTypeFilter === 'physical') {
        setIsIndividualDenominations(drawerIndividualDenominationsPrefs.drawers);
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
      // Get current logged-in user
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      // First try to get employee-specific threshold
      if (currentUser.id) {
        const employeeResponse = await axios.get(`${API_BASE_URL}/employees`);
        const employee = employeeResponse.data.find(emp => emp.employee_id === currentUser.id);

        if (employee && employee.discrepancy_threshold !== null && employee.discrepancy_threshold !== undefined) {
          setDiscrepancyThreshold(parseFloat(employee.discrepancy_threshold));
          return;
        }
      }

      // Fall back to system default
      const response = await axios.get(`${API_BASE_URL}/discrepancy-threshold`);
      const thresholdValue = response.data.threshold_amount || 0.00;
      setDiscrepancyThreshold(thresholdValue);
    } catch (err) {
      console.error('Error fetching discrepancy threshold:', err);
      setDiscrepancyThreshold(0.00);
    }
  };

  const fetchMinMaxClose = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/drawer-type-config`);

      // Physical drawer min/max
      const physicalConfig = response.data.find(config => config.drawer_type === 'physical');
      setMinClose(physicalConfig ? parseFloat(physicalConfig.min_close) || 0 : 0);
      setMaxClose(physicalConfig ? parseFloat(physicalConfig.max_close) || 0 : 0);

      // Safe min/max (using safe config for both safe and master_safe)
      const safeConfig = response.data.find(config => config.drawer_type === 'safe');
      setMinCloseSafe(safeConfig ? parseFloat(safeConfig.min_close) || 0 : 0);
      setMaxCloseSafe(safeConfig ? parseFloat(safeConfig.max_close) || 0 : 0);
    } catch (err) {
      console.error('Error fetching min/max close:', err);
      setMinClose(0);
      setMaxClose(0);
      setMinCloseSafe(0);
      setMaxCloseSafe(0);
    }
  };

  const fetchBlindCountPreference = async () => {
    try {
      // Get all drawer mode preferences
      const response = await axios.get(`${API_BASE_URL}/user_preferences`);
      
      // Closing mode preferences (Blind Count vs Open Count)
      const blindCountDrawersPreference = response.data.find(pref => pref.preference_name === 'blindCount_drawers');
      const blindCountSafePreference = response.data.find(pref => pref.preference_name === 'blindCount_safe');
      const blindCountDrawers = blindCountDrawersPreference ? blindCountDrawersPreference.preference_value === 'true' : true;
      const blindCountSafe = blindCountSafePreference ? blindCountSafePreference.preference_value === 'true' : true;
      
      // Opening mode preferences (Individual Denominations vs Drawer Total)
      const individualDenominationsDrawersPreference = response.data.find(pref => pref.preference_name === 'individualDenominations_drawers');
      const individualDenominationsSafePreference = response.data.find(pref => pref.preference_name === 'individualDenominations_safe');
      const individualDenominationsDrawers = individualDenominationsDrawersPreference ? individualDenominationsDrawersPreference.preference_value === 'true' : false;
      const individualDenominationsSafe = individualDenominationsSafePreference ? individualDenominationsSafePreference.preference_value === 'true' : false;
      
      // Store both preference sets
      setDrawerBlindCountPrefs({
        drawers: blindCountDrawers,
        safe: blindCountSafe
      });
      setDrawerIndividualDenominationsPrefs({
        drawers: individualDenominationsDrawers,
        safe: individualDenominationsSafe
      });

      // Set initial modes based on current selection or default to drawers
      if (selectedDrawerType) {
        const isSafe = selectedDrawerType === 'safe' || selectedDrawerType === 'master_safe';
        setIsBlindCount(isSafe ? blindCountSafe : blindCountDrawers);
        setIsIndividualDenominations(isSafe ? individualDenominationsSafe : individualDenominationsDrawers);
      } else {
        setIsBlindCount(blindCountDrawers); // Default to drawers preference
        setIsIndividualDenominations(individualDenominationsDrawers);
      }
    } catch (err) {
      console.error('Error fetching drawer mode preferences:', err);
      setIsBlindCount(true); // Default to blind count
      setIsIndividualDenominations(false); // Default to drawer total
    }
  };

  const fetchAllActiveSessions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cash-drawer/active`);
      setAllActiveSessions(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching all active sessions:', err);
      setAllActiveSessions([]);
    }
  };

  const fetchOverview = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cash-drawer/overview`);
      setOverviewData(response.data);
    } catch (err) {
      console.error('Error fetching drawer overview:', err);
      setOverviewData({ safes: [], drawers: [] });
    }
  };

  const fetchStoreStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/store-sessions/status`);
      setStoreStatus(response.data);
    } catch (error) {
      console.error('Error fetching store status:', error);
    }
  };

  const handleOpenStore = async () => {
    setStoreStatusLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await axios.post(`${API_BASE_URL}/store-sessions/open`, {
        employee_id: user.id || user.employee_id
      });
      await fetchStoreStatus();
      // Notify navbar to update
      window.dispatchEvent(new Event('storeStatusChanged'));
      setSnackbar({ open: true, message: 'Store opened successfully', severity: 'success' });
    } catch (error) {
      console.error('Error opening store:', error);
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to open store', severity: 'error' });
    } finally {
      setStoreStatusLoading(false);
    }
  };

  const handleCloseStoreClick = async () => {
    setStoreStatusLoading(true);
    try {
      // First check for open drawers/safes
      await axios.get(`${API_BASE_URL}/store-sessions/check-open-drawers`);

      // Check for clocked-in employees
      const clockedInResponse = await axios.get(`${API_BASE_URL}/employee-sessions/clocked-in`);
      setClockedInEmployees(clockedInResponse.data || []);

      // Broadcast notification to clocked-in employees
      if (clockedInResponse.data && clockedInResponse.data.length > 0) {
        console.log('Broadcasting store closing notification to', clockedInResponse.data.length, 'clocked-in employees');
        await axios.post(`${API_BASE_URL}/employee-sessions/notify-closing`);
      }

      setCloseStoreDialogOpen(true);
    } catch (error) {
      console.error('Error checking store closure prerequisites:', error);
      if (error.response?.data?.error) {
        setSnackbar({
          open: true,
          message: error.response.data.error,
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to check store closure prerequisites',
          severity: 'error'
        });
      }
    } finally {
      setStoreStatusLoading(false);
    }
  };

  const handleCloseStore = async () => {
    setCloseStoreDialogOpen(false);
    setStoreStatusLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await axios.post(`${API_BASE_URL}/store-sessions/close`, {
        employee_id: user.id || user.employee_id
      });
      await fetchStoreStatus();
      // Notify navbar to update
      window.dispatchEvent(new Event('storeStatusChanged'));
      setSnackbar({ open: true, message: 'Store closed successfully', severity: 'success' });
      setIsBackupComputer(false);
    } catch (error) {
      console.error('Error closing store:', error);
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to close store', severity: 'error' });
    } finally {
      setStoreStatusLoading(false);
    }
  };

  const checkActiveSession = async (preferredSessionType = null) => {
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

        // First, try to preserve the current active session by session_id AND drawer_id
        // This ensures we don't switch to a different drawer after operations like transfers
        // IMPORTANT: For physical drawers, verify employee_id to prevent showing other employees' sessions
        // For safe/master_safe, don't check employee_id since they're shared across all employees
        const currentSessionId = activeSession?.session_id;
        const currentDrawerId = activeSession?.drawer_id;
        const currentDrawerType = activeSession?.drawer_type;
        const preservedSession = (currentSessionId && currentDrawerId)
          ? sessions.find(s => {
              const sessionMatches = s.session_id === currentSessionId && s.drawer_id === currentDrawerId;
              // For physical drawers, verify employee_id; for safe/master_safe, skip employee check
              if (s.drawer_type === 'physical') {
                return sessionMatches && s.employee_id === currentUser.id;
              } else {
                return sessionMatches;  // Safe and master_safe are shared
              }
            })
          : null;

        // Determine the final session to use
        let finalSession = null;

        if (preservedSession) {
          // Keep the same session that was active (verified to belong to current user)
          finalSession = preservedSession;
          setSelectedSessionType(preservedSession.drawer_type);
        } else {
          // No current session or it's no longer active - use selection logic
          // Separate sessions by type
          const physicalSession = sessions.find(s => s.drawer_type === 'physical');
          const safeSession = sessions.find(s => s.drawer_type === 'safe');
          const masterSafeSession = sessions.find(s => s.drawer_type === 'master_safe');

          // Use preferred session type if provided, otherwise use current selectedSessionType
          const targetSessionType = preferredSessionType || selectedSessionType;

          // Set active session based on preferred/selected type or default priority
          if (targetSessionType === 'physical' && physicalSession) {
            // Show physical if explicitly requested and exists
            finalSession = physicalSession;
            setSelectedSessionType('physical');
          } else if (targetSessionType === 'safe' && safeSession) {
            // Show safe if explicitly requested and exists
            finalSession = safeSession;
            setSelectedSessionType('safe');
          } else if (targetSessionType === 'master_safe' && masterSafeSession) {
            // Show master safe if explicitly requested and exists
            finalSession = masterSafeSession;
            setSelectedSessionType('master_safe');
          } else if (physicalSession) {
            // Default to physical drawer when it exists (for transactions)
            finalSession = physicalSession;
            setSelectedSessionType('physical');
          } else if (safeSession) {
            // Show safe if no physical drawer exists
            finalSession = safeSession;
            setSelectedSessionType('safe');
          } else if (masterSafeSession) {
            // Show master safe if no physical or safe drawer exists
            finalSession = masterSafeSession;
            setSelectedSessionType('master_safe');
          } else if (sessions.length > 0) {
            // Fallback to first available session
            finalSession = sessions[0];
            if (finalSession.drawer_type === 'safe') {
              setSelectedSessionType('safe');
            } else if (finalSession.drawer_type === 'master_safe') {
              setSelectedSessionType('master_safe');
            } else {
              setSelectedSessionType('physical');
            }
          }
        }

        setActiveSession(finalSession);

        // Update count mode based on drawer type if session exists
        if (finalSession && finalSession.drawer_type) {
          setSelectedDrawerType(finalSession.drawer_type);
          const isSafe = finalSession.drawer_type === 'safe' || finalSession.drawer_type === 'master_safe';
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

    // Calculate balance based on opening mode (individual denominations vs drawer total)
    const calculatedBalance = isIndividualDenominations
      ? calculateDenominationTotal(openingDenominations)
      : parseFloat(openingBalance);

    // Validation
    if (!employeeId || !selectedDrawer) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    if (!isIndividualDenominations && !openingBalance) {
      showSnackbar('Please enter the opening balance', 'error');
      return;
    }

    if (isIndividualDenominations && calculatedBalance === 0) {
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
    const drawerIsShared = selectedDrawerInfo.is_shared;

    // For physical drawers with no sharing mode configured, require selection
    if (drawerType === 'physical' && drawerIsShared === null && selectedSharingMode === null) {
      setSharingModeRequired(true);
      showSnackbar('Please select whether this drawer is Single or Shared', 'warning');
      return;
    }

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
      // Prepare request payload
      const payload = {
        drawer_id: selectedDrawer,
        employee_id: employeeId,
        opening_balance: calculatedBalance,
        opening_notes: openingNotes || null
      };

      // Include sharing mode for physical drawers that need it
      if (drawerType === 'physical' && (drawerIsShared === null || selectedSharingMode !== null)) {
        payload.is_shared = selectedSharingMode === 'shared';
      }

      // Open the drawer
      const openResponse = await axios.post(`${API_BASE_URL}/cash-drawer/open`, payload);

      const sessionId = openResponse.data.session_id;

      // If Individual Denominations mode, save denominations
      if (isIndividualDenominations) {
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

      // If we came from checkout, automatically navigate back after opening drawer
      if (location.state?.returnTo === '/checkout') {
        // Small delay to show success message before navigating
        setTimeout(() => {
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
        }, 500);
        return;
      }

      // Refresh sessions, overview, and drawers (to get updated is_shared value)
      await fetchOverview();
      await fetchDrawers();
      await checkActiveSession(drawerType);
    } catch (err) {
      console.error('Error opening drawer:', err);

      // Check if sharing mode selection is required
      if (err.response?.data?.errorType === 'SHARING_MODE_REQUIRED') {
        setSharingModeRequired(true);
        showSnackbar('Please select whether this drawer is Single or Shared', 'warning');
        return;
      }

      showSnackbar(err.response?.data?.error || 'Failed to open drawer', 'error');
    }
  };

  const handleCloseDrawer = async (forceClose = false, bypassMinMaxWarning = false) => {
    // Get current logged-in user
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = currentUser.id;

    // Calculate balance based on mode (individual denominations vs total)
    const calculatedBalance = isIndividualDenominations
      ? calculateDenominationTotal(closingDenominations)
      : parseFloat(actualBalance);

    // Validation
    if (isIndividualDenominations && calculatedBalance === 0) {
      showSnackbar('Please enter denomination counts', 'error');
      return;
    }

    if (!isIndividualDenominations && (!actualBalance || isNaN(calculatedBalance))) {
      showSnackbar('Please enter the actual balance', 'error');
      return;
    }

    // Check min/max range for both physical drawers and safes
    const isSafe = activeSession?.drawer_type === 'safe' || activeSession?.drawer_type === 'master_safe';

    // Use appropriate min/max based on drawer type
    const minCloseValue = isSafe ? parseFloat(minCloseSafe || 0) : parseFloat(minClose || 0);
    const maxCloseValue = isSafe ? parseFloat(maxCloseSafe || 0) : parseFloat(maxClose || 0);

    // Check if balance is outside range
    let isOutsideRange = false;
    if (minCloseValue > 0 && maxCloseValue > 0) {
      isOutsideRange = calculatedBalance < minCloseValue || calculatedBalance > maxCloseValue;
    } else if (minCloseValue > 0) {
      isOutsideRange = calculatedBalance < minCloseValue;
    } else if (maxCloseValue > 0) {
      isOutsideRange = calculatedBalance > maxCloseValue;
    }

    if (isOutsideRange && !bypassMinMaxWarning) {
      if (activeSession?.drawer_type === 'physical') {
        // For physical drawers, show error and prevent closing
        if (minCloseValue > 0 && maxCloseValue > 0) {
          showSnackbar(
            `Closing balance $${calculatedBalance.toFixed(2)} is outside the allowed range ($${minCloseValue.toFixed(2)} - $${maxCloseValue.toFixed(2)})`,
            'error'
          );
        } else if (minCloseValue > 0) {
          showSnackbar(
            `Closing balance $${calculatedBalance.toFixed(2)} is below the minimum allowed ($${minCloseValue.toFixed(2)})`,
            'error'
          );
        } else if (maxCloseValue > 0) {
          showSnackbar(
            `Closing balance $${calculatedBalance.toFixed(2)} exceeds the maximum allowed ($${maxCloseValue.toFixed(2)})`,
            'error'
          );
        }
        return;
      } else if (isSafe) {
        // For safes, show warning dialog but allow proceeding
        setCalculatedClosingBalance(calculatedBalance);
        setCloseDrawerDialog(false);
        setMinMaxWarningDialog(true);
        return;
      }
    }

    // Calculate discrepancy before closing
    const expected = parseFloat(activeSession?.current_expected_balance || 0);
    const actual = calculatedBalance;
    const discrepancyAmount = Math.abs(actual - expected);
    const threshold = parseFloat(discrepancyThreshold || 0);

    // Check if discrepancy exceeds threshold and not forcing close
    if (!forceClose && discrepancyAmount > threshold) {
      setCalculatedClosingBalance(calculatedBalance); // Store calculated balance for the warning dialog
      setCloseDrawerDialog(false); // Close the original dialog
      setDiscrepancyWarningDialog(true);
      return;
    }

    try {
      // Close the drawer
      const response = await axios.put(
        `${API_BASE_URL}/cash-drawer/${activeSession.session_id}/close`,
        {
          actual_balance: calculatedBalance,
          closing_notes: closingNotes || null
        }
      );

      // If Individual Denominations mode, save closing denominations
      if (isIndividualDenominations) {
        await axios.post(`${API_BASE_URL}/cash-drawer/${activeSession.session_id}/denominations`, {
          denomination_type: 'closing',
          counted_by: employeeId,
          notes: closingNotes || null,
          ...closingDenominations
        });
      }

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
      fetchOverview();
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

    // For transfers, require source/target session
    if ((adjustmentType === 'transfer_from' || adjustmentType === 'transfer_to') && !transferSourceSession) {
      showSnackbar('Please select a drawer for transfer', 'error');
      return;
    }

    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      if (adjustmentType === 'transfer_from') {
        // Transfer FROM another drawer TO this drawer (receiving money)
        // activeSession is the target (receiving), transferSourceSession is the source (sending)
        await axios.post(
          `${API_BASE_URL}/cash-drawer/${activeSession.session_id}/transfer`,
          {
            amount: parseFloat(adjustmentAmount),
            source_session_id: parseInt(transferSourceSession),
            reason: adjustmentReason,
            performed_by: currentUser.id
          }
        );
        showSnackbar('Transfer received successfully', 'success');
      } else if (adjustmentType === 'transfer_to') {
        // Transfer TO another drawer FROM this drawer (sending money)
        // activeSession is the source (sending), transferSourceSession is the target (receiving)
        await axios.post(
          `${API_BASE_URL}/cash-drawer/${parseInt(transferSourceSession)}/transfer`,
          {
            amount: parseFloat(adjustmentAmount),
            source_session_id: activeSession.session_id,
            reason: adjustmentReason,
            performed_by: currentUser.id
          }
        );
        showSnackbar('Transfer sent successfully', 'success');
      } else {
        // Regular adjustment
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
      }

      setAdjustmentDialog(false);
      resetAdjustmentForm();

      // Refresh both current user's sessions and all active sessions
      await Promise.all([
        checkActiveSession(),
        fetchAllActiveSessions()
      ]);
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
    setSelectedSharingMode(null);
    setSharingModeRequired(false);
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
    setOpeningDenominationsFromDB(null);
  };

  const resetAdjustmentForm = () => {
    setAdjustmentAmount('');
    setAdjustmentType('bank_deposit');
    setAdjustmentReason('');
    setTransferSourceSession('');
  };

  const resetManagerApprovalForm = () => {
    setManagerUsername('');
    setManagerPassword('');
    setManagerApprovalError('');
    setManagerApprovalLoading(false);
  };

  const handleManagerApproval = async () => {
    if (!managerUsername || !managerPassword) {
      setManagerApprovalError('Please enter both username and password');
      return;
    }

    setManagerApprovalLoading(true);
    setManagerApprovalError('');

    try {
      // Verify manager credentials
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        identifier: managerUsername,
        password: managerPassword
      });

      const user = response.data.user;

      // Check if the user is a Store Manager or Store Owner
      if (user.role !== 'Store Manager' && user.role !== 'Store Owner') {
        setManagerApprovalError('Only Store Managers or Store Owners can approve this action');
        setManagerApprovalLoading(false);
        return;
      }

      // Manager approved - close the drawer with force
      setManagerApprovalDialog(false);
      resetManagerApprovalForm();
      showSnackbar(`Approved by ${user.first_name} ${user.last_name} (${user.role})`, 'success');

      // Now close the drawer
      await handleCloseDrawer(true);
    } catch (err) {
      console.error('Manager approval error:', err);
      setManagerApprovalError(err.response?.data?.error || 'Invalid credentials');
      setManagerApprovalLoading(false);
    }
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" mb={2}>
        Cash Drawer Management
      </Typography>

      {/* Overview Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={2}>Drawer & Safe Overview</Typography>

        {/* Store Status Section */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <StoreIcon sx={{ color: 'text.secondary' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Store Status
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Typography variant="body2">
              Current Status:
            </Typography>
            <Chip
              label={storeStatus.status === 'open' ? 'OPEN' : 'CLOSED'}
              color={storeStatus.status === 'open' ? 'success' : 'error'}
              variant="filled"
              sx={{ fontWeight: 'bold' }}
            />
            {storeStatus.status === 'open' && storeStatus.session && (
              <Typography variant="body2" color="text.secondary">
                Opened by {storeStatus.session.opened_by_name} at {new Date(storeStatus.session.opened_at).toLocaleString()}
              </Typography>
            )}
            {storeStatus.status === 'closed' && storeStatus.lastClosed && (
              <Typography variant="body2" color="text.secondary">
                Last closed by {storeStatus.lastClosed.closed_by_name} at {new Date(storeStatus.lastClosed.closed_at).toLocaleString()}
              </Typography>
            )}
          </Box>
          <Box>
            {storeStatus.status === 'closed' ? (
              <Button
                variant="contained"
                color="success"
                onClick={handleOpenStore}
                disabled={storeStatusLoading}
                startIcon={storeStatusLoading ? <CircularProgress size={20} /> : null}
              >
                Open Store
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                onClick={handleCloseStoreClick}
                disabled={storeStatusLoading}
                startIcon={storeStatusLoading ? <CircularProgress size={20} /> : null}
              >
                Close Store
              </Button>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* SAFE Section */}
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>SAFE</Typography>
        <TableContainer sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1976d2' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>SAFE</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overviewData.safes.map((safe) => (
                <TableRow
                  key={safe.drawer_id}
                  sx={{
                    bgcolor: safe.status === 'OPEN' ? '#e3f2fd' : 'white',
                    '&:hover': { bgcolor: safe.status === 'OPEN' ? '#bbdefb' : '#f5f5f5' }
                  }}
                >
                  <TableCell>{safe.drawer_name}</TableCell>
                  <TableCell>{safe.status}</TableCell>
                  <TableCell>
                    {safe.status === 'OPEN' && safe.balance !== null
                      ? `$${parseFloat(safe.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* DRAWER Section */}
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>DRAWER</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1976d2' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>DRAWER</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Balance</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Connected Employees</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overviewData.drawers.map((drawer) => (
                <TableRow
                  key={drawer.drawer_id}
                  sx={{
                    bgcolor: drawer.status === 'OPEN' ? '#e3f2fd' : 'white',
                    '&:hover': { bgcolor: drawer.status === 'OPEN' ? '#bbdefb' : '#f5f5f5' }
                  }}
                >
                  <TableCell>{drawer.drawer_name}</TableCell>
                  <TableCell>{drawer.status}</TableCell>
                  <TableCell>{drawer.type}</TableCell>
                  <TableCell>
                    {drawer.status === 'OPEN' && drawer.balance !== null
                      ? `$${parseFloat(drawer.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </TableCell>
                  <TableCell>{drawer.connected_employees || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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
                              setIsIndividualDenominations(drawerIndividualDenominationsPrefs.drawers);
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
                              setIsIndividualDenominations(drawerIndividualDenominationsPrefs.safe);
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
                      {!isBlindCount && (
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2" color="text.secondary">Current Expected Balance</Typography>
                          <Typography variant="h6">{formatCurrency(activeSession.current_expected_balance)}</Typography>
                        </Grid>
                      )}
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Transaction Count</Typography>
                        <Typography variant="body1">{activeSession.transaction_count || 0}</Typography>
                      </Grid>
                    </Grid>

                    <Box mt={3} display="flex" gap={2} flexWrap="wrap">
                      <Button
                        variant="contained"
                        color="primary"
                        disabled={isStoreClosed}
                        onClick={async () => {
                          // If Individual Denominations mode or Open Count mode, fetch opening denominations for comparison
                          if ((isIndividualDenominations || !isBlindCount) && activeSession) {
                            try {
                              const response = await axios.get(
                                `${API_BASE_URL}/cash-drawer/${activeSession.session_id}/denominations/opening`
                              );
                              if (response.data) {
                                setOpeningDenominationsFromDB({
                                  bill_100: response.data.bill_100 || 0,
                                  bill_50: response.data.bill_50 || 0,
                                  bill_20: response.data.bill_20 || 0,
                                  bill_10: response.data.bill_10 || 0,
                                  bill_5: response.data.bill_5 || 0,
                                  coin_2: response.data.coin_2 || 0,
                                  coin_1: response.data.coin_1 || 0,
                                  coin_0_25: response.data.coin_0_25 || 0,
                                  coin_0_10: response.data.coin_0_10 || 0,
                                  coin_0_05: response.data.coin_0_05 || 0
                                });
                              }
                            } catch (err) {
                              console.error('Error fetching opening denominations:', err);
                              setOpeningDenominationsFromDB(null);
                            }
                          } else {
                            setOpeningDenominationsFromDB(null);
                          }
                          setCloseDrawerDialog(true);
                        }}
                      >
                        Close {activeSession.drawer_type === 'safe' || activeSession.drawer_type === 'master_safe' ? 'Safe' : 'Drawer'}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        disabled={isStoreClosed}
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
                      {/* Show Open Cash Drawer button if no physical session exists */}
                      {!activeSessions.some(s => s.drawer_type === 'physical') && allDrawers.some(d => d.drawer_type === 'physical' && d.is_active) && (
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<AddIcon />}
                          disabled={isStoreClosed}
                          onClick={() => {
                            setDrawerTypeFilter('physical');
                            setOpenDrawerDialog(true);
                          }}
                        >
                          Open Cash Drawer
                        </Button>
                      )}
                      {/* Show Open Safe Drawer button if no safe session exists */}
                      {!activeSessions.some(s => s.drawer_type === 'safe') && allDrawers.some(d => d.drawer_type === 'safe' && d.is_active) && (
                        <Button
                          variant="outlined"
                          color="secondary"
                          startIcon={<AddIcon />}
                          disabled={isStoreClosed}
                          onClick={() => {
                            setDrawerTypeFilter('safe');
                            setOpenDrawerDialog(true);
                          }}
                        >
                          Open Safe Drawer
                        </Button>
                      )}
                      {/* Show Open Master Safe button if no master_safe session exists */}
                      {!activeSessions.some(s => s.drawer_type === 'master_safe') && allDrawers.some(d => d.drawer_type === 'master_safe' && d.is_active) && (
                        <Button
                          variant="outlined"
                          color="secondary"
                          startIcon={<AddIcon />}
                          disabled={isStoreClosed}
                          onClick={() => {
                            setDrawerTypeFilter('master_safe');
                            setOpenDrawerDialog(true);
                          }}
                        >
                          Open Master Safe
                        </Button>
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
                  disabled={isStoreClosed}
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
                    disabled={isStoreClosed}
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
                    disabled={isStoreClosed}
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
                    setIsIndividualDenominations(isSafe ? drawerIndividualDenominationsPrefs.safe : drawerIndividualDenominationsPrefs.drawers);
                    // Reset sharing mode when drawer changes
                    // Check if sharing mode is required for this drawer
                    const needsSharingMode = drawer.drawer_type === 'physical' && drawer.is_shared === null;
                    setSharingModeRequired(needsSharingMode);
                    // Default to 'shared' when sharing mode is required
                    setSelectedSharingMode(needsSharingMode ? 'shared' : null);
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

            {/* Sharing Mode dropdown for physical drawers that haven't been configured */}
            {selectedDrawer && selectedDrawerType === 'physical' && sharingModeRequired && (
              <FormControl fullWidth required>
                <InputLabel>Drawer Mode</InputLabel>
                <Select
                  value={selectedSharingMode || ''}
                  label="Drawer Mode"
                  onChange={(e) => setSelectedSharingMode(e.target.value)}
                >
                  <MenuItem value="single">
                    Single - Only one employee can use this drawer at a time
                  </MenuItem>
                  <MenuItem value="shared">
                    Shared - Multiple employees can connect to this drawer
                  </MenuItem>
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  This setting will be saved for future use of this drawer
                </Typography>
              </FormControl>
            )}

            {isIndividualDenominations ? (
              <>
                {renderDenominationEntry(openingDenominations, setOpeningDenominations, calculateDenominationTotal(openingDenominations))}
                <Alert severity="info" sx={{ mt: 1 }}>
                  Opening balance will be automatically set to the total of counted denominations: {formatCurrency(calculateDenominationTotal(openingDenominations))}
                </Alert>
              </>
            ) : (
              <TextField
                label="Opening Balance"
                type="number"
                fullWidth
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                required
                inputProps={{ step: '0.01', min: '0' }}
              />
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
          <Button onClick={handleOpenDrawer} variant="contained" color="primary" disabled={isStoreClosed}>
            Open Drawer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Drawer Dialog */}
      <Dialog open={closeDrawerDialog} onClose={() => {
        setCloseDrawerDialog(false);
        resetCloseForm();
      }} maxWidth={isIndividualDenominations ? "md" : "sm"} fullWidth>
        <DialogTitle>
          Close {activeSession?.drawer_type === 'safe' || activeSession?.drawer_type === 'master_safe' ? 'Safe' : 'Cash Drawer'}
          {!isBlindCount && ' (Open Count)'}
          {isIndividualDenominations && ' - Individual Denominations'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {activeSession?.drawer_type === 'physical' && (minClose > 0 || maxClose > 0) && (
              <Alert severity="info">
                Allowed Closing Balance Range: {minClose > 0 ? formatCurrency(minClose) : 'No minimum'} - {maxClose > 0 ? formatCurrency(maxClose) : 'No maximum'}
              </Alert>
            )}

            <Alert severity="info">
              Transaction Count: {activeSession?.transaction_count || 0}
            </Alert>

            {/* Individual Denominations mode - show denomination entry fields */}
            {isIndividualDenominations ? (
              <>
                {renderDenominationEntry(closingDenominations, setClosingDenominations, calculateDenominationTotal(closingDenominations))}
                {!isBlindCount && openingDenominationsFromDB && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Opening Denominations (for reference):
                    </Typography>
                    <Grid container spacing={1}>
                      {[
                        { label: '$100', field: 'bill_100' },
                        { label: '$50', field: 'bill_50' },
                        { label: '$20', field: 'bill_20' },
                        { label: '$10', field: 'bill_10' },
                        { label: '$5', field: 'bill_5' },
                        { label: '$2', field: 'coin_2' },
                        { label: '$1', field: 'coin_1' },
                        { label: '$0.25', field: 'coin_0_25' },
                        { label: '$0.10', field: 'coin_0_10' },
                        { label: '$0.05', field: 'coin_0_05' },
                      ].map(item => (
                        openingDenominationsFromDB[item.field] > 0 && (
                          <Grid item xs={6} sm={4} md={3} key={item.field}>
                            <Typography variant="body2" color="text.secondary">
                              {item.label}: {openingDenominationsFromDB[item.field]}
                            </Typography>
                          </Grid>
                        )
                      ))}
                    </Grid>
                  </Box>
                )}
                {(() => {
                  const balance = calculateDenominationTotal(closingDenominations);

                  // Check min/max range for physical drawers
                  const isPhysical = activeSession?.drawer_type === 'physical';
                  const minCloseValue = parseFloat(minClose || 0);
                  const maxCloseValue = parseFloat(maxClose || 0);
                  const isOutOfRange = isPhysical && (
                    (minCloseValue > 0 && balance < minCloseValue) ||
                    (maxCloseValue > 0 && balance > maxCloseValue)
                  );

                  if (isOutOfRange) {
                    return (
                      <Alert severity="error">
                        <strong>Closing balance is outside allowed range ({minCloseValue > 0 ? formatCurrency(minCloseValue) : 'No min'} - {maxCloseValue > 0 ? formatCurrency(maxCloseValue) : 'No max'})</strong>
                      </Alert>
                    );
                  }

                  // In open count mode, show discrepancy info
                  if (!isBlindCount && activeSession) {
                    const discrepancy = balance - activeSession.current_expected_balance;
                    const hasDiscrepancy = Math.abs(discrepancy) > 0.01;
                    return (
                      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: hasDiscrepancy ? 'warning.main' : 'success.main', mt: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Expected Balance: {formatCurrency(activeSession.current_expected_balance)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Counted Total: {formatCurrency(balance)}
                        </Typography>
                        <Typography variant="body1" color={hasDiscrepancy ? 'error.main' : 'success.main'}>
                          <strong>Discrepancy: {formatCurrency(discrepancy)}</strong>
                          {hasDiscrepancy && ` (${discrepancy > 0 ? 'Overage' : 'Shortage'})`}
                        </Typography>
                      </Box>
                    );
                  }

                  return null;
                })()}
              </>
            ) : (
              /* Simple total balance entry */
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
                {actualBalance && activeSession && (() => {
                  const balance = parseFloat(actualBalance);

                  // Check min/max range for physical drawers
                  const isPhysical = activeSession.drawer_type === 'physical';
                  const minCloseValue = parseFloat(minClose || 0);
                  const maxCloseValue = parseFloat(maxClose || 0);
                  const isOutOfRange = isPhysical && (
                    (minCloseValue > 0 && balance < minCloseValue) ||
                    (maxCloseValue > 0 && balance > maxCloseValue)
                  );

                  if (isOutOfRange) {
                    return (
                      <Alert severity="error">
                        <strong>Closing balance is outside allowed range ({minCloseValue > 0 ? formatCurrency(minCloseValue) : 'No min'} - {maxCloseValue > 0 ? formatCurrency(maxCloseValue) : 'No max'})</strong>
                      </Alert>
                    );
                  }

                  // In open count mode, show discrepancy info
                  if (!isBlindCount) {
                    const discrepancy = balance - activeSession.current_expected_balance;
                    const hasDiscrepancy = Math.abs(discrepancy) > 0.01;
                    return (
                      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: hasDiscrepancy ? 'warning.main' : 'success.main', mt: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Expected Balance: {formatCurrency(activeSession.current_expected_balance)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Actual Balance: {formatCurrency(balance)}
                        </Typography>
                        <Typography variant="body1" color={hasDiscrepancy ? 'error.main' : 'success.main'}>
                          <strong>Discrepancy: {formatCurrency(discrepancy)}</strong>
                          {hasDiscrepancy && ` (${discrepancy > 0 ? 'Overage' : 'Shortage'})`}
                        </Typography>
                      </Box>
                    );
                  }

                  // In blind count mode, don't show any hint about whether the count matches expected
                  return null;
                })()}
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
          <Button onClick={() => handleCloseDrawer(false)} variant="contained" color="primary" disabled={isStoreClosed}>
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
              The discrepancy amount exceeds the acceptable threshold of {formatCurrency(discrepancyThreshold || 0)}. Please recount.
            </Alert>
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Transaction Count:</strong> {activeSession?.transaction_count || 0}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Expected Balance:</strong> {formatCurrency(activeSession?.current_expected_balance)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Actual Balance:</strong> {formatCurrency(calculatedClosingBalance)}
              </Typography>
              <Typography variant="body1" color="error" gutterBottom>
                <strong>Discrepancy:</strong> {formatCurrency(calculatedClosingBalance - parseFloat(activeSession?.current_expected_balance || 0))}
                {' '}({calculatedClosingBalance > parseFloat(activeSession?.current_expected_balance || 0) ? 'Overage' : 'Shortage'})
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Threshold:</strong> {formatCurrency(discrepancyThreshold || 0)}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Please recount the cash drawer to verify the balance. If the discrepancy is correct, request manager approval to close the drawer.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscrepancyWarningDialog(false)}>
            Recount
          </Button>
          <Button
            onClick={() => {
              setDiscrepancyWarningDialog(false);
              setManagerApprovalDialog(true);
            }}
            variant="contained"
            color="warning"
            disabled={isStoreClosed}
          >
            Request Manager Approval
          </Button>
        </DialogActions>
      </Dialog>

      {/* Min/Max Warning Dialog for Safes */}
      <Dialog open={minMaxWarningDialog} onClose={() => setMinMaxWarningDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Balance Outside Recommended Range</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="warning">
              The closing balance is outside the recommended range.
            </Alert>
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Actual Balance:</strong> {formatCurrency(calculatedClosingBalance)}
              </Typography>
              {parseFloat((activeSession?.drawer_type === 'safe' || activeSession?.drawer_type === 'master_safe' ? minCloseSafe : minClose) || 0) > 0 && (
                <Typography variant="body1" gutterBottom>
                  <strong>Minimum Recommended:</strong> {formatCurrency((activeSession?.drawer_type === 'safe' || activeSession?.drawer_type === 'master_safe' ? minCloseSafe : minClose) || 0)}
                </Typography>
              )}
              {parseFloat((activeSession?.drawer_type === 'safe' || activeSession?.drawer_type === 'master_safe' ? maxCloseSafe : maxClose) || 0) > 0 && (
                <Typography variant="body1" gutterBottom>
                  <strong>Maximum Recommended:</strong> {formatCurrency((activeSession?.drawer_type === 'safe' || activeSession?.drawer_type === 'master_safe' ? maxCloseSafe : maxClose) || 0)}
                </Typography>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              This is a warning only. You can proceed with closing the safe if the count is correct, or recount to verify the balance.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setMinMaxWarningDialog(false);
            setCloseDrawerDialog(true);
          }}>
            Recount
          </Button>
          <Button
            onClick={() => {
              setMinMaxWarningDialog(false);
              handleCloseDrawer(false, true);
            }}
            variant="contained"
            color="warning"
            disabled={isStoreClosed}
          >
            Proceed Anyway
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manager Approval Dialog */}
      <Dialog
        open={managerApprovalDialog}
        onClose={() => {
          setManagerApprovalDialog(false);
          resetManagerApprovalForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Manager Approval Required</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              A Store Manager or Store Owner must approve closing this drawer with discrepancy.
            </Alert>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Expected Balance:</strong> {formatCurrency(activeSession?.current_expected_balance)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Actual Balance:</strong> {formatCurrency(calculatedClosingBalance)}
              </Typography>
              <Typography variant="body2" color="error">
                <strong>Discrepancy:</strong> {formatCurrency(Math.abs(calculatedClosingBalance - parseFloat(activeSession?.current_expected_balance || 0)))}
                {' '}({calculatedClosingBalance > parseFloat(activeSession?.current_expected_balance || 0) ? 'Overage' : 'Shortage'})
              </Typography>
            </Box>
            <TextField
              label="Manager Username"
              fullWidth
              value={managerUsername}
              onChange={(e) => setManagerUsername(e.target.value)}
              autoFocus
              autoComplete="off"
            />
            <TextField
              label="Manager Password"
              type="password"
              fullWidth
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
              autoComplete="off"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleManagerApproval();
                }
              }}
            />
            {managerApprovalError && (
              <Alert severity="error">{managerApprovalError}</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setManagerApprovalDialog(false);
              resetManagerApprovalForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleManagerApproval}
            variant="contained"
            color="primary"
            disabled={managerApprovalLoading || isStoreClosed}
          >
            {managerApprovalLoading ? 'Verifying...' : 'Approve & Close'}
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
                onChange={(e) => {
                  setAdjustmentType(e.target.value);
                  if (e.target.value === 'transfer_from' || e.target.value === 'transfer_to') {
                    fetchAllActiveSessions();
                  } else {
                    setTransferSourceSession('');
                  }
                }}
                label="Adjustment Type"
              >
                {/* Master safe can receive from bank */}
                {activeSession?.drawer_type === 'master_safe' && (
                  <MenuItem value="bank_withdrawal">Bank Withdrawal (Add Cash from Bank)</MenuItem>
                )}
                {/* Master safe can send to bank */}
                {activeSession?.drawer_type === 'master_safe' && (
                  <MenuItem value="bank_deposit">Bank Deposit (Remove Cash to Bank)</MenuItem>
                )}
                {/* Physical drawers can have change orders */}
                {activeSession?.drawer_type === 'physical' && (
                  <MenuItem value="change_order">Change Order (Add Cash)</MenuItem>
                )}
                {/* All drawer types can transfer */}
                <MenuItem value="transfer_from">Transfer FROM Another Drawer (Receive)</MenuItem>
                <MenuItem value="transfer_to">Transfer TO Another Drawer (Send)</MenuItem>
                {/* General adjustments */}
                <MenuItem value="petty_cash">Petty Cash</MenuItem>
                <MenuItem value="correction">Correction</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            {(adjustmentType === 'transfer_from' || adjustmentType === 'transfer_to') && (
              <FormControl fullWidth required>
                <InputLabel>
                  {adjustmentType === 'transfer_from' ? 'Source Drawer (Receive From)' : 'Target Drawer (Send To)'}
                </InputLabel>
                <Select
                  value={transferSourceSession}
                  onChange={(e) => setTransferSourceSession(e.target.value)}
                  label={adjustmentType === 'transfer_from' ? 'Source Drawer (Receive From)' : 'Target Drawer (Send To)'}
                >
                  {allActiveSessions
                    .filter(session => {
                      // Don't show the same session (must compare session_id, not drawer_id, since drawers can be shared)
                      if (session.session_id === activeSession?.session_id) return false;

                      // Filter based on drawer type hierarchy:
                      // For transfer_from (receiving): filter by what can send TO active drawer
                      // For transfer_to (sending): filter by what active drawer can send TO
                      const activeType = activeSession?.drawer_type;
                      const otherType = session.drawer_type;

                      // Allowed sources (who can send TO this drawer type)
                      const allowedSources = {
                        'physical': ['physical', 'safe'],
                        'safe': ['physical', 'master_safe'],
                        'master_safe': ['safe']
                      };

                      // Allowed targets (who this drawer type can send TO)
                      const allowedTargets = {
                        'physical': ['physical', 'safe'],
                        'safe': ['physical', 'master_safe'],
                        'master_safe': ['safe']
                      };

                      if (adjustmentType === 'transfer_from') {
                        // Who can send to us
                        return allowedSources[activeType]?.includes(otherType) || false;
                      } else {
                        // Who we can send to
                        return allowedTargets[activeType]?.includes(otherType) || false;
                      }
                    })
                    .map((session) => {
                      // For physical drawers, show employee name (since they're per-employee)
                      // For safe/master_safe, don't show employee name (since they're shared)
                      const displayName = session.drawer_type === 'physical'
                        ? `${session.drawer_name} - ${session.employee_name} - ${formatCurrency(session.current_expected_balance || 0)}`
                        : `${session.drawer_name} - ${formatCurrency(session.current_expected_balance || 0)}`;

                      return (
                        <MenuItem key={session.session_id} value={session.session_id}>
                          {displayName}
                        </MenuItem>
                      );
                    })}
                </Select>
              </FormControl>
            )}
            <TextField
              label="Amount"
              type="number"
              fullWidth
              value={adjustmentAmount}
              onChange={(e) => setAdjustmentAmount(e.target.value)}
              required
              inputProps={{ step: '0.01', min: '0.01' }}
              helperText={(adjustmentType === 'transfer_from' || adjustmentType === 'transfer_to')
                ? "Enter the amount to transfer (must be positive)"
                : "Positive for adding cash, negative for removing cash"}
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
          <Button onClick={handleAddAdjustment} variant="contained" color="primary" disabled={isStoreClosed}>
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
                {/* Hide expected balance for open sessions in blind count mode */}
                {(!isBlindCount || sessionDetails.session.status === 'closed') && (
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Expected</Typography>
                    <Typography variant="h6">{formatCurrency(sessionDetails.session.expected_balance)}</Typography>
                  </Grid>
                )}
                {/* Only show actual balance for closed sessions */}
                {sessionDetails.session.status === 'closed' && (
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Actual</Typography>
                    <Typography variant="h6">{formatCurrency(sessionDetails.session.actual_balance)}</Typography>
                  </Grid>
                )}
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

      {/* Close Store Confirmation Dialog */}
      <Dialog
        open={closeStoreDialogOpen}
        onClose={() => setCloseStoreDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Close Store</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Closing the store will disable all financial transactions until it is reopened.
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Before closing the store, ensure:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <Typography component="li" variant="body2">All cash drawers and safes (except the master safe) are closed</Typography>
            <Typography component="li" variant="body2">End-of-day reports have been generated</Typography>
            <Typography component="li" variant="body2">All pending transactions are complete</Typography>
          </Box>

          {clockedInEmployees.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Currently Clocked-In Employees ({clockedInEmployees.length}):
              </Typography>
              <Box sx={{ mb: 1 }}>
                {clockedInEmployees.map((emp) => (
                  <Box
                    key={emp.session_id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 0.5,
                      borderBottom: clockedInEmployees.length > 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                      '&:last-child': { borderBottom: 'none' }
                    }}
                  >
                    <Typography variant="body2">
                      {emp.employee_name} - {emp.role} (since {new Date(emp.clock_in_time).toLocaleTimeString()})
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Alert>
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={isBackupComputer}
                onChange={(e) => setIsBackupComputer(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                I confirm this is the designated backup computer for end-of-day procedures
              </Typography>
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseStoreDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCloseStore}
            disabled={!isBackupComputer || storeStatusLoading}
            startIcon={storeStatusLoading ? <CircularProgress size={20} /> : null}
          >
            Close Store
          </Button>
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
