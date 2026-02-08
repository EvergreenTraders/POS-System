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
import { useAuth } from '../context/AuthContext';

function CashDrawer() {
  const API_BASE_URL = config.apiUrl;
  const location = useLocation();
  const navigate = useNavigate();
  const { isStoreClosed } = useStoreStatus();
  const { user: currentUser } = useAuth();

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
  const [openingDiscrepancyDialog, setOpeningDiscrepancyDialog] = useState(false);
  const [managerApprovalDialog, setManagerApprovalDialog] = useState(false);
  const [minMaxWarningDialog, setMinMaxWarningDialog] = useState(false);
  const [physicalTenderWarningDialog, setPhysicalTenderWarningDialog] = useState(false);
  const [showManagerOverrideView, setShowManagerOverrideView] = useState(false); // For showing expected values
  const [balanceViewDialog, setBalanceViewDialog] = useState(false);
  const [balanceViewData, setBalanceViewData] = useState(null);
  const [balanceViewLoading, setBalanceViewLoading] = useState(false);

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
  const [existingSharedSession, setExistingSharedSession] = useState(null); // Existing session on shared drawer (for connecting)
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
  const [closingDiscrepancyData, setClosingDiscrepancyData] = useState({
    physicalActual: 0,
    physicalExpected: 0,
    physicalDiscrepancy: 0,
    physicalShowAmount: false,
    closingDenominations: {},
    closingTenderBalances: {},
    expectedDenominations: {}, // Store expected denominations for display
    electronicActual: 0,
    electronicExpected: 0,
    electronicDiscrepancy: 0,
    electronicTenderActuals: {},
    electronicTenderExpected: {},
    totalCumulativeDiscrepancy: 0, // Sum of absolute discrepancies from all tender types
    totalElectronicDiscrepancyAmount: 0, // Cumulative electronic discrepancies
    isBalanced: false,
    isWithinLimit: false
  }); // Store closing discrepancy data
  const [openingDiscrepancyData, setOpeningDiscrepancyData] = useState({
    openingBalance: 0,
    previousClosingBalance: null,
    discrepancy: 0,
    showAmount: false
  }); // Store opening discrepancy data

  // Physical tender states (for non-cash tenders like checks, gift cards)
  const [physicalPaymentMethods, setPhysicalPaymentMethods] = useState([]); // Physical payment methods (excluding cash)
  const [previousTenderBalances, setPreviousTenderBalances] = useState(null); // Tender balances from previous session
  const [openingTenderCounts, setOpeningTenderCounts] = useState({}); // User's tender counts when opening
  const [closingTenderBalances, setClosingTenderBalances] = useState({}); // Tender balances when closing
  const [tenderDiscrepancyDialog, setTenderDiscrepancyDialog] = useState(false); // Dialog for tender discrepancies
  const [tenderDiscrepancies, setTenderDiscrepancies] = useState([]); // List of tender discrepancies

  // Electronic tender states (for credit cards, debit cards, e-transfers, etc.)
  const [electronicPaymentMethods, setElectronicPaymentMethods] = useState([]); // Electronic payment methods
  const [electronicTenderActuals, setElectronicTenderActuals] = useState({}); // User's actual counts { method: { qty: 0, amount: 0 } }
  const [electronicTenderExpected, setElectronicTenderExpected] = useState({}); // Expected totals from transactions
  const [isElectronicBlindCount, setIsElectronicBlindCount] = useState(false); // Blind count mode for electronic tenders

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
    fetchPhysicalPaymentMethods();
    fetchElectronicPaymentMethods();
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
      setExistingSharedSession(null);
      setOpeningDenominations({
        bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
        coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
      });

      // Fetch all active sessions to check for shared drawers
      fetchAllActiveSessions();
      
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

  const fetchPhysicalPaymentMethods = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/payment-methods/physical`);
      setPhysicalPaymentMethods(response.data);
    } catch (err) {
      console.error('Error fetching physical payment methods:', err);
    }
  };

  const fetchElectronicPaymentMethods = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/payment-methods/electronic`);
      setElectronicPaymentMethods(response.data);
    } catch (err) {
      console.error('Error fetching electronic payment methods:', err);
    }
  };

  const fetchElectronicTenderExpected = async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cash-drawer/${sessionId}/electronic-tender-expected`);
      setElectronicTenderExpected(response.data);
      // Initialize actuals with zeros for all expected methods
      const initialActuals = {};
      Object.keys(response.data).forEach(method => {
        initialActuals[method] = { qty: 0, amount: 0 };
      });
      // Also add any electronic methods that don't have expected values
      electronicPaymentMethods.forEach(method => {
        if (!initialActuals[method.method_value]) {
          initialActuals[method.method_value] = { qty: 0, amount: 0 };
        }
      });
      setElectronicTenderActuals(initialActuals);
    } catch (err) {
      console.error('Error fetching electronic tender expected:', err);
    }
  };

  const fetchPreviousTenderBalances = async (drawerId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cash-drawer/${drawerId}/previous-tender-balances`);
      if (response.data.hasPreviousTenderBalances) {
        setPreviousTenderBalances(response.data);
        // Initialize opening tender counts with 0 for each tender type
        const initialCounts = {};
        response.data.tenderBalances.forEach(tb => {
          initialCounts[tb.paymentMethod] = '';
        });
        setOpeningTenderCounts(initialCounts);
      } else {
        setPreviousTenderBalances(null);
        setOpeningTenderCounts({});
      }
    } catch (err) {
      console.error('Error fetching previous tender balances:', err);
      setPreviousTenderBalances(null);
      setOpeningTenderCounts({});
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

  const handleOpenDrawer = async (skipTenderVerification = false) => {
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

    // Check if there are previous tender balances that need verification
    if (drawerType === 'physical' && previousTenderBalances && previousTenderBalances.tenderBalances.length > 0 && !skipTenderVerification) {
      // Validate that all tender counts are entered
      const missingCounts = previousTenderBalances.tenderBalances.filter(
        tb => !openingTenderCounts[tb.paymentMethod] && openingTenderCounts[tb.paymentMethod] !== 0
      );
      if (missingCounts.length > 0) {
        showSnackbar('Please enter counts for all previous tender balances', 'error');
        return;
      }

      // Check for discrepancies
      const discrepancies = [];
      for (const tender of previousTenderBalances.tenderBalances) {
        const counted = parseFloat(openingTenderCounts[tender.paymentMethod]) || 0;
        const expected = tender.expectedBalance;
        const discrepancy = counted - expected;

        if (Math.abs(discrepancy) > 0.01) {
          const threshold = parseFloat(discrepancyThreshold || 0);
          const exceedsThreshold = Math.abs(discrepancy) > threshold;

          discrepancies.push({
            paymentMethod: tender.paymentMethod,
            methodName: tender.methodName,
            counted,
            expected: exceedsThreshold ? null : expected,
            discrepancy: exceedsThreshold ? null : discrepancy,
            exceedsThreshold
          });
        }
      }

      if (discrepancies.length > 0) {
        setTenderDiscrepancies(discrepancies);
        setTenderDiscrepancyDialog(true);
        return; // Don't proceed until user confirms
      }
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

      // Check for blind count discrepancy for physical drawers
      // Only check if not using individual denominations (which would show the total anyway)
      if (drawerType === 'physical' && !isIndividualDenominations) {
        const previousClosingBalance = openResponse.data.previous_closing_balance;
        
        if (previousClosingBalance !== null && previousClosingBalance !== undefined) {
          const discrepancy = Math.abs(calculatedBalance - previousClosingBalance);
          const threshold = parseFloat(discrepancyThreshold || 0);
          
          // If there's any discrepancy, show the dialog
          if (discrepancy > 0.01) {
            // Only show the amount if it's within the employee's over/short limit
            const showAmount = discrepancy <= threshold;
            
            setOpeningDiscrepancyData({
              openingBalance: calculatedBalance,
              previousClosingBalance: previousClosingBalance,
              discrepancy: calculatedBalance - previousClosingBalance, // Positive = overage, negative = shortage
              showAmount: showAmount,
              sessionId: openResponse.data.session_id,
              payload: payload // Store payload for retry
            });
            setOpeningDiscrepancyDialog(true);
            return; // Don't proceed with opening yet
          }
        }
      }

      // Complete the opening process (called after discrepancy check or directly)
      // Pass tender counts if there were previous tender balances
      const hasTenderCounts = previousTenderBalances && Object.keys(openingTenderCounts).length > 0;
      await completeDrawerOpening(
        openResponse.data.session_id,
        isIndividualDenominations,
        employeeId,
        openingNotes,
        openingDenominations,
        isSafe,
        hasTenderCounts ? openingTenderCounts : null
      );
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

  const completeDrawerOpening = async (sessionId, isIndividualDenominations, employeeId, openingNotes, openingDenominations, isSafe, tenderCounts = null) => {
    try {
      // If Individual Denominations mode, save denominations
      if (isIndividualDenominations) {
        await axios.post(`${API_BASE_URL}/cash-drawer/${sessionId}/denominations`, {
          denomination_type: 'opening',
          counted_by: employeeId,
          notes: openingNotes || null,
          ...openingDenominations
        });
      }

      // Save opening tender counts if any
      if (tenderCounts && Object.keys(tenderCounts).length > 0) {
        const tenderCountsArray = Object.entries(tenderCounts).map(([method, count]) => ({
          paymentMethod: method,
          count: parseFloat(count) || 0
        }));
        await axios.post(`${API_BASE_URL}/cash-drawer/${sessionId}/opening-tender-counts`, {
          tenderCounts: tenderCountsArray,
          employeeId
        });
      }

      const drawerTypeName = isSafe ? 'Safe' : 'Cash drawer';
      showSnackbar(`${drawerTypeName} opened successfully`, 'success');
      setOpenDrawerDialog(false);
      setDrawerTypeFilter(null);
      resetOpenForm();

      // Refresh sessions, overview, and drawers
      await fetchOverview();
      await fetchDrawers();
      await checkActiveSession();

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
      }
    } catch (err) {
      console.error('Error completing drawer opening:', err);
      showSnackbar('Error completing drawer opening', 'error');
    }
  };

  const handleOpeningDiscrepancyRecount = async () => {
    // Delete the session that was created and allow user to re-enter
    try {
      if (openingDiscrepancyData.sessionId) {
        await axios.post(`${API_BASE_URL}/cash-drawer/${openingDiscrepancyData.sessionId}/close`, {
          actual_balance: openingDiscrepancyData.openingBalance,
          closing_notes: 'Session cancelled due to recount request'
        });
      }
    } catch (err) {
      console.error('Error closing session for recount:', err);
    }
    
    // Close the discrepancy dialog and keep the open drawer dialog open
    setOpeningDiscrepancyDialog(false);
    // User can now change the opening balance and submit again
  };

  const handleOpeningDiscrepancyProceed = async () => {
    // Proceed with opening using the entered totals
    setOpeningDiscrepancyDialog(false);

    const { sessionId, isIndividualDenominations, employeeId, openingNotes, openingDenominations, isSafe, tenderCounts } = openingDiscrepancyData;

    if (sessionId) {
      await completeDrawerOpening(sessionId, isIndividualDenominations, employeeId, openingNotes, openingDenominations, isSafe, tenderCounts || null);
    }
  };

  const handleCloseDrawer = async (forceClose = false, bypassMinMaxWarning = false, bypassPhysicalTenderWarning = false) => {
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

    // Check for physical tender in drawer (for physical drawers only)
    // Skip if forceClose (manager approved) or explicitly bypassed
    if (activeSession?.drawer_type === 'physical' && !forceClose && !bypassPhysicalTenderWarning) {
      // Calculate total physical tender (cash + other physical tenders like checks, gift cards)
      const otherPhysicalTenderTotal = Object.values(closingTenderBalances)
        .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      const totalPhysicalTender = calculatedBalance + otherPhysicalTenderTotal;

      if (totalPhysicalTender > 0) {
        setCalculatedClosingBalance(calculatedBalance);
        setCloseDrawerDialog(false);
        setPhysicalTenderWarningDialog(true);
        return;
      }
    }

    // Calculate discrepancies separately for Physical and Electronic
    const threshold = parseFloat(discrepancyThreshold || 0);

    // Physical discrepancy (cash + physical tenders like checks)
    const otherPhysicalTenderTotal = activeSession?.drawer_type === 'physical'
      ? Object.values(closingTenderBalances).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
      : 0;
    const physicalActual = calculatedBalance + otherPhysicalTenderTotal;
    const physicalExpected = parseFloat(activeSession?.current_expected_balance || 0);
    const physicalDiscrepancy = physicalActual - physicalExpected;
    const physicalDiscrepancyAmount = Math.abs(physicalDiscrepancy);
    const physicalShowAmount = physicalDiscrepancyAmount <= threshold;
    const physicalIsOverLimit = physicalDiscrepancyAmount > threshold;

    // Electronic discrepancy (debit, visa, mastercard, etc.)
    // Calculate discrepancy for each electronic tender type separately
    const electronicDiscrepancies = electronicPaymentMethods.map(method => {
      const expected = electronicTenderExpected[method.method_value] || { expected_qty: 0, expected_amount: 0 };
      const actual = electronicTenderActuals[method.method_value] || { qty: 0, amount: 0 };
      const discrepancy = (parseFloat(actual.amount) || 0) - (parseFloat(expected.expected_amount) || 0);
      return Math.abs(discrepancy); // Use absolute value for each tender type
    });
    
    // Sum all electronic discrepancies (cumulative - each error counts)
    const totalElectronicDiscrepancyAmount = electronicDiscrepancies.reduce((sum, disc) => sum + disc, 0);
    const hasElectronicDiscrepancy = totalElectronicDiscrepancyAmount > 0.01;
    
    // Calculate total electronic actual and expected for display
    const electronicActualTotal = Object.values(electronicTenderActuals).reduce(
      (sum, t) => sum + (parseFloat(t?.amount) || 0), 0
    );
    const electronicExpectedTotal = Object.values(electronicTenderExpected).reduce(
      (sum, t) => sum + (parseFloat(t?.expected_amount) || 0), 0
    );
    const electronicDiscrepancy = electronicActualTotal - electronicExpectedTotal; // Net discrepancy for display

    // Total cumulative discrepancy = sum of absolute discrepancies from all tender types
    // Example: -$100 in debit and +$100 in visa = $200 total discrepancy
    const totalCumulativeDiscrepancy = physicalDiscrepancyAmount + totalElectronicDiscrepancyAmount;
    const isOverTotalLimit = totalCumulativeDiscrepancy > threshold;

    // Check if drawer is balanced or within limits
    const isBalanced = physicalDiscrepancyAmount <= 0.01 && !hasElectronicDiscrepancy;
    const isWithinLimit = !isOverTotalLimit;

    // If not forcing close, check for discrepancies
    if (!forceClose) {
      // Show discrepancy dialog if there's any discrepancy
      if (physicalDiscrepancyAmount > 0.01 || hasElectronicDiscrepancy) {
        // Ensure we have opening denominations - fetch if not already available
        let expectedDenoms = openingDenominationsFromDB ? { ...openingDenominationsFromDB } : {};
        
        // If opening denominations not available, try to fetch them
        if (!openingDenominationsFromDB && activeSession?.session_id) {
          try {
            const denomResponse = await axios.get(
              `${API_BASE_URL}/cash-drawer/${activeSession.session_id}/denominations/opening`
            );
            if (denomResponse.data) {
              expectedDenoms = {
                bill_100: denomResponse.data.bill_100 || 0,
                bill_50: denomResponse.data.bill_50 || 0,
                bill_20: denomResponse.data.bill_20 || 0,
                bill_10: denomResponse.data.bill_10 || 0,
                bill_5: denomResponse.data.bill_5 || 0,
                coin_2: denomResponse.data.coin_2 || 0,
                coin_1: denomResponse.data.coin_1 || 0,
                coin_0_25: denomResponse.data.coin_0_25 || 0,
                coin_0_10: denomResponse.data.coin_0_10 || 0,
                coin_0_05: denomResponse.data.coin_0_05 || 0
              };
              setOpeningDenominationsFromDB(expectedDenoms);
            }
          } catch (err) {
            console.error('Error fetching opening denominations for discrepancy dialog:', err);
            // Continue with empty expected denominations
          }
        }
        
        setClosingDiscrepancyData({
          physicalActual,
          physicalExpected,
          physicalDiscrepancy,
          physicalShowAmount,
          closingDenominations: { ...closingDenominations },
          closingTenderBalances: { ...closingTenderBalances },
          expectedDenominations: expectedDenoms,
          electronicActual: electronicActualTotal,
          electronicExpected: electronicExpectedTotal,
          electronicDiscrepancy,
          electronicTenderActuals: { ...electronicTenderActuals },
          electronicTenderExpected: { ...electronicTenderExpected },
          totalCumulativeDiscrepancy: totalCumulativeDiscrepancy,
          totalElectronicDiscrepancyAmount: totalElectronicDiscrepancyAmount,
          isBalanced,
          isWithinLimit
        });
        setCalculatedClosingBalance(calculatedBalance);
        setCloseDrawerDialog(false);
      setDiscrepancyWarningDialog(true);
        setShowManagerOverrideView(false); // Reset view state
      return;
      }
    }

    try {
      // Prepare tender balances array for physical drawers
      const tenderBalancesArray = activeSession?.drawer_type === 'physical'
        ? Object.entries(closingTenderBalances)
            .filter(([_, balance]) => balance && parseFloat(balance) > 0)
            .map(([method, balance]) => ({
              paymentMethod: method,
              balance: parseFloat(balance)
            }))
        : [];

      // Close the drawer
      const response = await axios.put(
        `${API_BASE_URL}/cash-drawer/${activeSession.session_id}/close`,
        {
          actual_balance: calculatedBalance,
          closing_notes: closingNotes || null,
          tender_balances: tenderBalancesArray,
          employee_id: employeeId
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

  // Handle disconnecting from a shared drawer (for connected employees, not opener)
  const handleDisconnectFromDrawer = async () => {
    if (!activeSession) return;

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    try {
      await axios.post(
        `${API_BASE_URL}/cash-drawer/${activeSession.session_id}/disconnect`,
        { employee_id: currentUser.id }
      );

      showSnackbar('Successfully disconnected from shared drawer', 'success');
      fetchOverview();
      checkActiveSession();
      fetchHistory();
    } catch (err) {
      console.error('Error disconnecting from drawer:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to disconnect from drawer';
      showSnackbar(errorMessage, 'error');
    }
  };

  // Handle connecting to an existing shared drawer session (no counting required)
  const handleConnectToDrawer = async () => {
    if (!selectedDrawer || !existingSharedSession) return;

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = selectedEmployee || currentUser.id;

    try {
      // Call the open drawer API - it will detect the existing session and create a connection
      const response = await axios.post(`${API_BASE_URL}/cash-drawer/open`, {
        drawer_id: selectedDrawer,
        employee_id: employeeId,
        opening_balance: 0 // Not used for connections
      });

      if (response.data.is_connection) {
        showSnackbar('Successfully connected to shared drawer', 'success');
      } else {
        showSnackbar('Connected to drawer', 'success');
      }

      setOpenDrawerDialog(false);
      resetOpenForm();
      await fetchOverview();
      await fetchDrawers();
      await checkActiveSession();
    } catch (err) {
      console.error('Error connecting to drawer:', err);
      showSnackbar(err.response?.data?.error || 'Failed to connect to drawer', 'error');
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
    setExistingSharedSession(null);
    setOpeningBalance('');
    setOpeningNotes('');
    setOpeningDenominations({
      bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
      coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
    });
    setPreviousTenderBalances(null);
    setOpeningTenderCounts({});
    setTenderDiscrepancies([]);
  };

  const resetCloseForm = () => {
    setActualBalance('');
    setClosingNotes('');
    setClosingDenominations({
      bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
      coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
    });
    setOpeningDenominationsFromDB(null);
    setClosingTenderBalances({});
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

  // Check if employee has security permission to view balance
  const hasSecurityPermission = () => {
    if (!currentUser) return false;
    // Store Manager, Store Owner, or roles with security access
    const allowedRoles = ['Store Manager', 'Store Owner', 'Assistant Manager'];
    return allowedRoles.includes(currentUser.role);
  };

  // Handle viewing balance for a drawer/safe
  const handleViewBalance = async (drawerId, sessionId, drawerName, drawerType) => {
    if (!hasSecurityPermission()) {
      showSnackbar('You do not have permission to view drawer/safe balances', 'error');
      return;
    }

    setBalanceViewLoading(true);
    setBalanceViewDialog(true);
    setBalanceViewData(null);

    try {
      let session = null;
      let balance = 0;
      let actualBalance = null;
      let denominations = null;
      let physicalTenderBalances = {};
      let electronicTenderBalances = {};

      // If there's an active session, use it
      if (sessionId) {
        const sessionResponse = await axios.get(`${API_BASE_URL}/cash-drawer/${sessionId}/details`);
        session = sessionResponse.data;
        balance = session.current_expected_balance || 0;
        actualBalance = session.actual_balance || null;

        // Fetch denominations if available
        try {
          const denomResponse = await axios.get(`${API_BASE_URL}/cash-drawer/${sessionId}/denominations/opening`);
          if (denomResponse.data) {
            denominations = denomResponse.data;
          }
        } catch (err) {
          console.log('No denominations found for this session');
        }

        // For safes, fetch physical and electronic tender balances
        if (drawerType === 'safe' || drawerType === 'master_safe') {
          try {
            // Fetch tender balances (both physical and electronic)
            const tenderResponse = await axios.get(`${API_BASE_URL}/cash-drawer/${sessionId}/tender-balances?type=close`);
            if (tenderResponse.data) {
              // Physical tenders
              if (tenderResponse.data.physicalTenders && tenderResponse.data.physicalTenders.length > 0) {
                const physicalMap = {};
                tenderResponse.data.physicalTenders.forEach(t => {
                  physicalMap[t.paymentMethod] = t.balance;
                });
                physicalTenderBalances = physicalMap;
              }
              // Electronic tenders - also get expected totals for comparison
              if (tenderResponse.data.electronicTenders && tenderResponse.data.electronicTenders.length > 0) {
                electronicTenderBalances = tenderResponse.data.electronicTenders.map(t => ({
                  payment_method: t.paymentMethod,
                  method_name: t.methodName,
                  expected_qty: 0,
                  expected_amount: t.balance
                }));
              }
            }
          } catch (err) {
            console.log('No tender balances found, trying electronic-tender-expected');
            // Fallback: try to get electronic tender expected
            try {
              const electronicResponse = await axios.get(`${API_BASE_URL}/cash-drawer/${sessionId}/electronic-tender-expected`);
              if (electronicResponse.data) {
                // Convert object to array format
                electronicTenderBalances = Object.entries(electronicResponse.data).map(([key, value]) => ({
                  payment_method: key,
                  method_name: value.method_name,
                  expected_qty: value.expected_qty || 0,
                  expected_amount: value.expected_amount || 0
                }));
              }
            } catch (err2) {
              console.log('No electronic tender balances found');
            }
          }
        }
      } else {
        // No active session - fetch last closed session
        try {
          const lastSessionResponse = await axios.get(`${API_BASE_URL}/cash-drawer/drawer/${drawerId}/last-session`);
          if (lastSessionResponse.data && lastSessionResponse.data.session_id) {
            const lastSessionId = lastSessionResponse.data.session_id;
            const sessionResponse = await axios.get(`${API_BASE_URL}/cash-drawer/${lastSessionId}/details`);
            session = sessionResponse.data;
            balance = session.actual_balance || session.expected_balance || 0;
            actualBalance = session.actual_balance || null;

            // Fetch denominations from closing if available
            try {
              const denomResponse = await axios.get(`${API_BASE_URL}/cash-drawer/${lastSessionId}/denominations/closing`);
              if (denomResponse.data) {
                denominations = denomResponse.data;
              } else {
                // Try opening denominations as fallback
                const denomResponse2 = await axios.get(`${API_BASE_URL}/cash-drawer/${lastSessionId}/denominations/opening`);
                if (denomResponse2.data) {
                  denominations = denomResponse2.data;
                }
              }
            } catch (err) {
              console.log('No denominations found for last session');
            }

            // For safes, fetch physical and electronic tender balances from last session
            if (drawerType === 'safe' || drawerType === 'master_safe') {
              try {
                // Fetch tender balances (both physical and electronic)
                const tenderResponse = await axios.get(`${API_BASE_URL}/cash-drawer/${lastSessionId}/tender-balances?type=close`);
                if (tenderResponse.data) {
                  // Physical tenders
                  if (tenderResponse.data.physicalTenders && tenderResponse.data.physicalTenders.length > 0) {
                    const physicalMap = {};
                    tenderResponse.data.physicalTenders.forEach(t => {
                      physicalMap[t.paymentMethod] = t.balance;
                    });
                    physicalTenderBalances = physicalMap;
                  }
                  // Electronic tenders
                  if (tenderResponse.data.electronicTenders && tenderResponse.data.electronicTenders.length > 0) {
                    electronicTenderBalances = tenderResponse.data.electronicTenders.map(t => ({
                      payment_method: t.paymentMethod,
                      method_name: t.methodName,
                      expected_qty: 0,
                      expected_amount: t.balance
                    }));
                  }
                }
              } catch (err) {
                console.log('No tender balances found, trying electronic-tender-expected');
                // Fallback: try to get electronic tender expected
                try {
                  const electronicResponse = await axios.get(`${API_BASE_URL}/cash-drawer/${lastSessionId}/electronic-tender-expected`);
                  if (electronicResponse.data) {
                    // Convert object to array format
                    electronicTenderBalances = Object.entries(electronicResponse.data).map(([key, value]) => ({
                      payment_method: key,
                      method_name: value.method_name,
                      expected_qty: value.expected_qty || 0,
                      expected_amount: value.expected_amount || 0
                    }));
                  }
                } catch (err2) {
                  console.log('No electronic tender balances found');
                }
              }
            }
          } else {
            // No previous session found
            balance = 0;
            actualBalance = null;
          }
        } catch (err) {
          console.error('Error fetching last session:', err);
          // Continue with empty data
        }
      }

      setBalanceViewData({
        drawerId,
        sessionId: session?.session_id || null,
        drawerName,
        drawerType,
        balance,
        actualBalance,
        denominations,
        physicalTenderBalances,
        electronicTenderBalances,
        isActiveSession: !!sessionId
      });
    } catch (err) {
      console.error('Error fetching balance:', err);
      showSnackbar('Failed to fetch balance information', 'error');
      setBalanceViewDialog(false);
    } finally {
      setBalanceViewLoading(false);
    }
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
                        <Box display="flex" gap={1} alignItems="center">
                        {getStatusChip(activeSession.status)}
                          {activeSession.connection_id && !activeSession.is_opener && (
                            <Chip label="Connected" color="info" size="small" />
                          )}
                          {activeSession.is_shared && activeSession.drawer_type === 'physical' && (
                            <Chip label="Shared" color="secondary" size="small" variant="outlined" />
                          )}
                          {parseInt(activeSession.other_connections_count || 0) > 0 && (
                            <Chip
                              label={`${activeSession.other_connections_count} other${parseInt(activeSession.other_connections_count) > 1 ? 's' : ''} connected`}
                              color="warning"
                              size="small"
                            />
                          )}
                        </Box>
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
                          // For shared drawers: check if others are connected
                          const othersConnected = parseInt(activeSession.other_connections_count || 0) > 0;
                          const isConnectedEmployee = activeSession.connection_id && !activeSession.is_opener;

                          // If user is a connected employee (not opener), just disconnect
                          if (isConnectedEmployee) {
                            handleDisconnectFromDrawer();
                            return;
                          }

                          // If opener and others are still connected, prevent closing
                          if (activeSession.is_opener && othersConnected) {
                            showSnackbar('Other employees are still connected to this drawer. They must disconnect before you can close it.', 'warning');
                            return;
                          }

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
                          // Fetch electronic tender expected totals for physical drawers
                          if (activeSession?.drawer_type === 'physical') {
                            fetchElectronicTenderExpected(activeSession.session_id);
                          }
                          setCloseDrawerDialog(true);
                        }}
                      >
                        {/* Show 'Disconnect' for connected employees on shared drawers, 'Close' for opener */}
                        {activeSession.connection_id && !activeSession.is_opener
                          ? 'Disconnect'
                          : `Close ${activeSession.drawer_type === 'safe' || activeSession.drawer_type === 'master_safe' ? 'Safe' : 'Drawer'}`}
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
                    // Check if sharing mode is required for this drawer
                    const needsSharingMode = drawer.drawer_type === 'physical' && drawer.is_shared === null;
                    setSharingModeRequired(needsSharingMode);
                    // Default to 'shared' when sharing mode is required
                    setSelectedSharingMode(needsSharingMode ? 'shared' : null);

                    // Check if this drawer is already open by someone else (for shared drawers)
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    const drawerIsShared = drawer.is_shared === true || isSafe; // Safe/master_safe are always shared
                    const existingSession = allActiveSessions.find(s => s.drawer_id === drawerId);

                    if (existingSession && drawerIsShared && existingSession.employee_id !== currentUser.id) {
                      // Drawer is already open by another employee - user can connect without counting
                      setExistingSharedSession(existingSession);
                    } else {
                      setExistingSharedSession(null);
                    }

                    // For physical drawers, fetch previous tender balances (only if not connecting to existing session)
                    if (drawer.drawer_type === 'physical' && !existingSession) {
                      fetchPreviousTenderBalances(drawerId);
                    } else {
                      setPreviousTenderBalances(null);
                      setOpeningTenderCounts({});
                    }
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

            {/* Show connect message when drawer is already open by another employee */}
            {existingSharedSession ? (
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  This drawer is already open
                </Typography>
                <Typography variant="body2">
                  Opened by: {existingSharedSession.employee_first_name || 'Another employee'} {existingSharedSession.employee_last_name || ''}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  You will connect to the existing session. No counting required.
                </Typography>
              </Alert>
            ) : (
              <>
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
              </>
            )}

            {/* Previous Tender Balances Section - for physical drawers with leftover tenders (not shown when connecting) */}
            {!existingSharedSession && selectedDrawerType === 'physical' && previousTenderBalances && previousTenderBalances.tenderBalances.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Previous Tender Balances to Count
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  The previous session left these tenders in the drawer. Please count and enter the amounts.
                  {isBlindCount && ' (Blind count - expected amounts are hidden)'}
                </Typography>
                {previousTenderBalances.tenderBalances.map((tender) => (
                  <TextField
                    key={tender.paymentMethod}
                    label={`${tender.methodName} Balance`}
                    type="number"
                    fullWidth
                    value={openingTenderCounts[tender.paymentMethod] || ''}
                    onChange={(e) => setOpeningTenderCounts(prev => ({
                      ...prev,
                      [tender.paymentMethod]: e.target.value
                    }))}
                    inputProps={{ step: '0.01', min: '0' }}
                    sx={{ mb: 1 }}
                    helperText={!isBlindCount ? `Expected: ${formatCurrency(tender.expectedBalance)}` : undefined}
                  />
                ))}
              </Box>
            )}

            {/* Only show notes field when opening a new session, not when connecting */}
            {!existingSharedSession && (
            <TextField
              label="Notes (Optional)"
              fullWidth
              multiline
              rows={3}
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
            />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDrawerDialog(false)}>Cancel</Button>
          {existingSharedSession ? (
            <Button onClick={handleConnectToDrawer} variant="contained" color="primary" disabled={isStoreClosed}>
              Connect to Drawer
            </Button>
          ) : (
          <Button onClick={handleOpenDrawer} variant="contained" color="primary" disabled={isStoreClosed}>
            Open Drawer
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Tender Discrepancy Dialog */}
      <Dialog open={tenderDiscrepancyDialog} onClose={() => setTenderDiscrepancyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tender Count Discrepancy</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            There is a discrepancy in one or more tender counts.
          </Alert>
          {tenderDiscrepancies.map((disc, index) => (
            <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2">{disc.methodName}</Typography>
              <Typography variant="body2">
                Counted: {formatCurrency(disc.counted)}
                {disc.exceedsThreshold ? (
                  <Typography component="span" color="error"> - Discrepancy exceeds your threshold</Typography>
                ) : (
                  <Typography component="span" color="warning.main">
                    {' '}(Expected: {formatCurrency(disc.expected)}, Discrepancy: {formatCurrency(disc.discrepancy)})
                  </Typography>
                )}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTenderDiscrepancyDialog(false)}>Re-count</Button>
          <Button
            onClick={() => {
              setTenderDiscrepancyDialog(false);
              // Proceed with opening the drawer despite discrepancy
              handleOpenDrawer(true); // Pass flag to skip tender verification
            }}
            variant="contained"
            color="warning"
          >
            Proceed Anyway
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Drawer Dialog */}
      <Dialog open={closeDrawerDialog} onClose={() => {
        setCloseDrawerDialog(false);
        resetCloseForm();
      }} maxWidth={activeSession?.drawer_type === 'physical' ? "lg" : (isIndividualDenominations ? "md" : "sm")} fullWidth>
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
          Drawer CLOSE: {activeSession?.drawer_name || 'Cash Drawer'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Drawer Close - Split Layout (Physical and Safe) */}
            <Grid container spacing={2}>
                {/* Left Side - Physical Tenders */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ borderBottom: '2px solid', borderColor: 'success.main', pb: 1 }}>
                      Physical
                    </Typography>

                    {/* Cash Section */}
                    <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>Cash</Typography>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { p: 0.5, fontSize: '0.85rem' } }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Type</th>
                          <th style={{ textAlign: 'center' }}>Actual</th>
                          <th style={{ textAlign: 'right' }}>Expected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: '$100', field: 'bill_100', value: 100 },
                          { label: '$50', field: 'bill_50', value: 50 },
                          { label: '$20', field: 'bill_20', value: 20 },
                          { label: '$10', field: 'bill_10', value: 10 },
                          { label: '$5', field: 'bill_5', value: 5 },
                          { label: '$2', field: 'coin_2', value: 2 },
                          { label: '$1', field: 'coin_1', value: 1 },
                          { label: '$0.25', field: 'coin_0_25', value: 0.25 },
                          { label: '$0.10', field: 'coin_0_10', value: 0.10 },
                          { label: '$0.05', field: 'coin_0_05', value: 0.05 },
                      ].map(item => (
                          <tr key={item.field}>
                            <td>{item.label}</td>
                            <td style={{ textAlign: 'center' }}>
                              <TextField
                                type="number"
                                size="small"
                                value={closingDenominations[item.field] || 0}
                                onChange={(e) => setClosingDenominations(prev => ({
                                  ...prev,
                                  [item.field]: parseInt(e.target.value) || 0
                                }))}
                                inputProps={{ min: 0, style: { textAlign: 'center', width: '50px', padding: '4px' } }}
                                sx={{ '& .MuiInputBase-root': { height: '28px' } }}
                              />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {isBlindCount ? '-' : (openingDenominationsFromDB ? openingDenominationsFromDB[item.field] || 0 : '-')}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ borderTop: '2px solid #ccc', fontWeight: 'bold' }}>
                          <td>Total:</td>
                          <td style={{ textAlign: 'center' }}>{formatCurrency(calculateDenominationTotal(closingDenominations))}</td>
                          <td style={{ textAlign: 'right' }}>
                            {isBlindCount ? '-' : (openingDenominationsFromDB ? formatCurrency(calculateDenominationTotal(openingDenominationsFromDB)) : '-')}
                          </td>
                        </tr>
                      </tbody>
                  </Box>

                    {/* Other Physical Tenders */}
                    {physicalPaymentMethods.length > 0 && (
                      <>
                        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Other Physical Tenders</Typography>
                        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { p: 0.5, fontSize: '0.85rem' } }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left' }}>Type</th>
                              <th style={{ textAlign: 'center' }}>Qty</th>
                              <th style={{ textAlign: 'right' }}>Amt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {physicalPaymentMethods.map((method) => (
                              <tr key={method.method_value}>
                                <td>{method.method_name}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={closingTenderBalances[`${method.method_value}_qty`] || ''}
                                    onChange={(e) => setClosingTenderBalances(prev => ({
                                      ...prev,
                                      [`${method.method_value}_qty`]: e.target.value
                                    }))}
                                    inputProps={{ min: 0, style: { textAlign: 'center', width: '40px', padding: '4px' } }}
                                    sx={{ '& .MuiInputBase-root': { height: '28px' } }}
                                  />
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={closingTenderBalances[method.method_value] || ''}
                                    onChange={(e) => setClosingTenderBalances(prev => ({
                                      ...prev,
                                      [method.method_value]: e.target.value
                                    }))}
                                    inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right', width: '70px', padding: '4px' } }}
                                    sx={{ '& .MuiInputBase-root': { height: '28px' } }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Box>
                      </>
                    )}

                    {/* Physical Discrepancy Message */}
                {(() => {
                      const physicalActual = calculateDenominationTotal(closingDenominations) +
                        physicalPaymentMethods.reduce((sum, m) => sum + (parseFloat(closingTenderBalances[m.method_value]) || 0), 0);
                      const physicalExpected = parseFloat(activeSession?.current_expected_balance || 0);
                      const physicalDiscrepancy = physicalActual - physicalExpected;
                      const threshold = parseFloat(discrepancyThreshold || 0);
                      const isOverLimit = Math.abs(physicalDiscrepancy) > threshold;

                      if (isBlindCount && isOverLimit) {
                    return (
                          <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
                            Physical discrepancy is over employee limit.
                          </Typography>
                        );
                      } else if (!isBlindCount && Math.abs(physicalDiscrepancy) > 0.01) {
                    return (
                          <Typography variant="body2" color={isOverLimit ? 'error' : 'warning.main'} sx={{ mt: 2 }}>
                            Physical discrepancy: {formatCurrency(physicalDiscrepancy)} ({physicalDiscrepancy > 0 ? 'Overage' : 'Shortage'})
                            {isOverLimit && ' - Over employee limit'}
                        </Typography>
                        );
                      }
                  return null;
                })()}
                  </Box>
                </Grid>

                {/* Right Side - Electronic Tenders */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ borderBottom: '2px solid', borderColor: 'success.main', pb: 1 }}>
                      Electronic
                    </Typography>

                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { p: 0.5, fontSize: '0.85rem' } }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Type</th>
                          <th colSpan={2} style={{ textAlign: 'center' }}>Actual</th>
                          <th colSpan={2} style={{ textAlign: 'center' }}>Expected</th>
                        </tr>
                        <tr>
                          <th></th>
                          <th style={{ textAlign: 'center', fontSize: '0.75rem' }}>Qty</th>
                          <th style={{ textAlign: 'right', fontSize: '0.75rem' }}>Amt</th>
                          <th style={{ textAlign: 'center', fontSize: '0.75rem' }}>Qty</th>
                          <th style={{ textAlign: 'right', fontSize: '0.75rem' }}>Amt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {electronicPaymentMethods.map((method) => {
                          const expected = electronicTenderExpected[method.method_value] || { expected_qty: 0, expected_amount: 0 };
                          const actual = electronicTenderActuals[method.method_value] || { qty: 0, amount: 0 };
                          return (
                            <tr key={method.method_value}>
                              <td>{method.method_name}</td>
                              <td style={{ textAlign: 'center' }}>
                <TextField
                  type="number"
                                  size="small"
                                  value={actual.qty || ''}
                                  onChange={(e) => setElectronicTenderActuals(prev => ({
                                    ...prev,
                                    [method.method_value]: { ...prev[method.method_value], qty: parseInt(e.target.value) || 0 }
                                  }))}
                                  inputProps={{ min: 0, style: { textAlign: 'center', width: '40px', padding: '4px' } }}
                                  sx={{ '& .MuiInputBase-root': { height: '28px' } }}
                                />
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={actual.amount || ''}
                                  onChange={(e) => setElectronicTenderActuals(prev => ({
                                    ...prev,
                                    [method.method_value]: { ...prev[method.method_value], amount: parseFloat(e.target.value) || 0 }
                                  }))}
                                  inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right', width: '70px', padding: '4px' } }}
                                  sx={{ '& .MuiInputBase-root': { height: '28px' } }}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>{expected.expected_qty}</td>
                              <td style={{ textAlign: 'right' }}>{formatCurrency(expected.expected_amount)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Box>

                    {/* Electronic Discrepancy Message */}
                    {(() => {
                      const electronicActualTotal = Object.values(electronicTenderActuals).reduce(
                        (sum, t) => sum + (parseFloat(t?.amount) || 0), 0
                      );
                      const electronicExpectedTotal = Object.values(electronicTenderExpected).reduce(
                        (sum, t) => sum + (parseFloat(t?.expected_amount) || 0), 0
                      );
                      const electronicDiscrepancy = electronicActualTotal - electronicExpectedTotal;

                      if (Math.abs(electronicDiscrepancy) > 0.01) {
                    return (
                          <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
                            Electronic discrepancy is {formatCurrency(Math.abs(electronicDiscrepancy))}
                        </Typography>
                        );
                      }
                  return null;
                })()}
                  </Box>
                </Grid>
              </Grid>

            {/* Closing Notes - Common for both physical and safe */}
            <TextField
              label="Closing Notes (Optional)"
              fullWidth
              multiline
              rows={2}
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              sx={{ mt: 2 }}
            />

          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Box>
            <Button onClick={() => {
              // Reset and re-open for recount
              setClosingDenominations({
                bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
                coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
              });
              setElectronicTenderActuals({});
              setClosingTenderBalances({});
            }} color="inherit">
              Re-count
            </Button>
            <Button onClick={() => setCloseDrawerDialog(false)} color="inherit">Cancel</Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Manager Override Section */}
            {(() => {
              const physicalActual = activeSession?.drawer_type === 'physical'
                ? calculateDenominationTotal(closingDenominations) +
                  physicalPaymentMethods.reduce((sum, m) => sum + (parseFloat(closingTenderBalances[m.method_value]) || 0), 0)
                : (isIndividualDenominations ? calculateDenominationTotal(closingDenominations) : parseFloat(actualBalance) || 0);
              const physicalExpected = parseFloat(activeSession?.current_expected_balance || 0);
              const physicalDiscrepancy = Math.abs(physicalActual - physicalExpected);
              const threshold = parseFloat(discrepancyThreshold || 0);
              const isOverLimit = physicalDiscrepancy > threshold;

              if (isOverLimit) {
                return (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>Manager Override:</Typography>
                    {isBlindCount && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          // Show expected values by temporarily disabling blind count
                          setIsBlindCount(false);
                        }}
                      >
                        View
                      </Button>
                    )}
                    <Button
                      variant="contained"
                      color="warning"
                      size="small"
                      onClick={() => {
                        setCloseDrawerDialog(false);
                        setManagerApprovalDialog(true);
                      }}
                      disabled={isStoreClosed}
                    >
                      Force Close
                    </Button>
                  </>
                );
              } else {
                // Within limit - show normal Close button with View option
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isBlindCount && (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>Manager Override:</Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            // Show expected values by temporarily disabling blind count
                            setIsBlindCount(false);
                          }}
                        >
                          View
                        </Button>
                      </>
                    )}
          <Button onClick={() => handleCloseDrawer(false)} variant="contained" color="primary" disabled={isStoreClosed}>
                      Close
          </Button>
                  </Box>
                );
              }
            })()}
          </Box>
        </DialogActions>
      </Dialog>

      {/* Discrepancy Warning Dialog */}
      <Dialog open={discrepancyWarningDialog} onClose={() => setDiscrepancyWarningDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Drawer CLOSE : till -2</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              {/* Physical Section */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                  Physical
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Denomination</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actual</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Expected</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[
                        { label: '$100', field: 'bill_100', value: 100 },
                        { label: '$50', field: 'bill_50', value: 50 },
                        { label: '$20', field: 'bill_20', value: 20 },
                        { label: '$10', field: 'bill_10', value: 10 },
                        { label: '$5', field: 'bill_5', value: 5 },
                        { label: '$2', field: 'coin_2', value: 2 },
                        { label: '$1', field: 'coin_1', value: 1 },
                        { label: '$0.25', field: 'coin_0_25', value: 0.25 },
                        { label: '$0.10', field: 'coin_0_10', value: 0.10 },
                        { label: '$0.05', field: 'coin_0_05', value: 0.05 },
                      ].map(item => {
                        // Get expected quantity from stored data
                        const expectedQty = closingDiscrepancyData.expectedDenominations?.[item.field] || 0;
                        // Calculate expected amount: quantity * denomination value
                        // Example: 2 $100 bills = 2 * 100 = $200.00
                        // Example: 2 $10 bills = 2 * 10 = $20.00
                        const expectedAmount = parseFloat(expectedQty) * parseFloat(item.value);
                        return (
                          <TableRow key={item.field}>
                            <TableCell>{item.label}</TableCell>
                            <TableCell align="center">{closingDiscrepancyData.closingDenominations?.[item.field] || 0}</TableCell>
                            <TableCell align="center">
                              {showManagerOverrideView && closingDiscrepancyData.expectedDenominations && Object.keys(closingDiscrepancyData.expectedDenominations).length > 0
                                ? formatCurrency(expectedAmount)
                                : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Check row */}
                      {physicalPaymentMethods.some(m => m.method_value === 'CHECK') && (
                        <>
                          <TableRow>
                            <TableCell>Check</TableCell>
                            <TableCell align="center">
                              {closingDiscrepancyData.closingTenderBalances?.['CHECK_qty'] || 0}
                            </TableCell>
                            <TableCell align="center">-</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell></TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                              {formatCurrency(parseFloat(closingDiscrepancyData.closingTenderBalances?.['CHECK'] || 0))}
                            </TableCell>
                            <TableCell align="center">-</TableCell>
                          </TableRow>
                        </>
                      )}
                      <TableRow sx={{ borderTop: '2px solid', borderColor: 'divider', '& td': { fontWeight: 'bold' } }}>
                        <TableCell>Total:</TableCell>
                        <TableCell align="center">{formatCurrency(closingDiscrepancyData.physicalActual)}</TableCell>
                        <TableCell align="center">
                          {showManagerOverrideView ? formatCurrency(closingDiscrepancyData.physicalExpected) : '-'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                {/* Physical Discrepancy Message */}
                {closingDiscrepancyData.physicalShowAmount ? (
                  <Typography variant="body2" color={closingDiscrepancyData.physicalDiscrepancy > 0 ? 'info.main' : 'error.main'} sx={{ mt: 1, fontWeight: 'bold' }}>
                    Physical discrepancy: {formatCurrency(Math.abs(closingDiscrepancyData.physicalDiscrepancy))}
                    {' '}({closingDiscrepancyData.physicalDiscrepancy > 0 ? 'Overage' : 'Shortage'})
                  </Typography>
                ) : (
                  <Typography variant="body2" color="error" sx={{ mt: 1, fontWeight: 'bold' }}>
                    Physical discrepancy is over employee limit.
                  </Typography>
                )}
              </Grid>

              {/* Electronic Section */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                  Electronic
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                        <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold' }}>Actual</TableCell>
                        <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold' }}>Expected</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell></TableCell>
                        <TableCell align="center" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Qty</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Amt</TableCell>
                        <TableCell align="center" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Qty</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Amt</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {electronicPaymentMethods.map((method) => {
                        const expected = closingDiscrepancyData.electronicTenderExpected?.[method.method_value] || { expected_qty: 0, expected_amount: 0 };
                        const actual = closingDiscrepancyData.electronicTenderActuals?.[method.method_value] || { qty: 0, amount: 0 };
                        return (
                          <TableRow key={method.method_value}>
                            <TableCell>{method.method_name}</TableCell>
                            <TableCell align="center">{actual.qty || 0}</TableCell>
                            <TableCell align="right">{formatCurrency(actual.amount || 0)}</TableCell>
                            <TableCell align="center">{expected.expected_qty || 0}</TableCell>
                            <TableCell align="right">{formatCurrency(expected.expected_amount || 0)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                {/* Electronic Discrepancy Message */}
                {Math.abs(closingDiscrepancyData.electronicDiscrepancy) > 0.01 && (
                  <Typography variant="body2" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>
                    Electronic discrepancy is {formatCurrency(Math.abs(closingDiscrepancyData.electronicDiscrepancy))}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Button onClick={() => setDiscrepancyWarningDialog(false)} variant="contained" color="success">
              Re-count
            </Button>
            <Button onClick={() => setDiscrepancyWarningDialog(false)} color="inherit" sx={{ ml: 1 }}>
              Cancel
            </Button>
            {closingDiscrepancyData.isBalanced || closingDiscrepancyData.isWithinLimit ? (
              <Button
                onClick={() => {
                  setDiscrepancyWarningDialog(false);
                  handleCloseDrawer(false);
                }}
                variant="contained"
                color="primary"
                disabled={isStoreClosed}
                sx={{ ml: 1 }}
              >
                Close
              </Button>
            ) : null}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">Manager Override:</Typography>
            {!showManagerOverrideView && (
              <Button
                variant="outlined"
                color="success"
                size="small"
                onClick={() => setShowManagerOverrideView(true)}
              >
                View
              </Button>
            )}
            <Button
              onClick={() => {
                setDiscrepancyWarningDialog(false);
                setManagerApprovalDialog(true);
              }}
              variant="contained"
              color="success"
              disabled={isStoreClosed}
            >
              Force Close
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Opening Discrepancy Dialog for Physical Drawers */}
      <Dialog open={openingDiscrepancyDialog} onClose={() => setOpeningDiscrepancyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Opening Balance Discrepancy</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="warning">
              {openingDiscrepancyData.showAmount 
                ? `The opening balance does not match the previous closing balance. Discrepancy: ${formatCurrency(Math.abs(openingDiscrepancyData.discrepancy))} (${openingDiscrepancyData.discrepancy > 0 ? 'Overage' : 'Shortage'}).`
                : 'The opening balance does not match the previous closing balance.'}
            </Alert>
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Entered Opening Balance:</strong> {formatCurrency(openingDiscrepancyData.openingBalance)}
              </Typography>
              {openingDiscrepancyData.showAmount && (
                <>
              <Typography variant="body1" gutterBottom>
                    <strong>Previous Closing Balance:</strong> {formatCurrency(openingDiscrepancyData.previousClosingBalance)}
              </Typography>
                  <Typography variant="body1" color={openingDiscrepancyData.discrepancy > 0 ? 'info.main' : 'error.main'} gutterBottom>
                    <strong>Discrepancy:</strong> {formatCurrency(Math.abs(openingDiscrepancyData.discrepancy))}
                    {' '}({openingDiscrepancyData.discrepancy > 0 ? 'Overage' : 'Shortage'})
                  </Typography>
                </>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {openingDiscrepancyData.showAmount 
                ? 'Please verify the count. You can recount or proceed with the entered totals.'
                : 'The discrepancy amount is outside your over/short limit. Please verify the count carefully.'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleOpeningDiscrepancyRecount}>
            Re-count
          </Button>
          <Button
            onClick={handleOpeningDiscrepancyProceed}
            variant="contained"
            color="primary"
          >
            Open with Totals Entered
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

      {/* Physical Tender Warning Dialog */}
      <Dialog open={physicalTenderWarningDialog} onClose={() => setPhysicalTenderWarningDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Physical Tender in Drawer</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="warning">
              There is physical tender remaining in the drawer. This should normally be transferred to a safe before closing.
            </Alert>
            {/* In blind count mode, hide specific amounts - same as opening discrepancy handling */}
            {!isBlindCount && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Tender in Drawer:</strong>
                </Typography>
                {calculatedClosingBalance > 0 && (
                  <Typography variant="body2">
                    Cash: {formatCurrency(calculatedClosingBalance)}
                  </Typography>
                )}
                {Object.entries(closingTenderBalances)
                  .filter(([_, balance]) => parseFloat(balance) > 0)
                  .map(([method, balance]) => {
                    const methodInfo = physicalPaymentMethods.find(m => m.method_value === method);
                    return (
                      <Typography key={method} variant="body2">
                        {methodInfo?.method_name || method}: {formatCurrency(parseFloat(balance))}
                      </Typography>
                    );
                  })}
              </Box>
            )}
            <Typography variant="body2" color="text.secondary">
              {isBlindCount
                ? 'Physical tender should be transferred to the safe before closing. You can go back to adjust or proceed with closing.'
                : 'Are you sure you want to close the drawer with physical tender still inside?'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPhysicalTenderWarningDialog(false);
            setCloseDrawerDialog(true);
          }}>
            Go Back
          </Button>
          <Button
            onClick={() => {
              setPhysicalTenderWarningDialog(false);
              handleCloseDrawer(false, false, true);
            }}
            variant="contained"
            color="warning"
            disabled={isStoreClosed}
          >
            Close Anyway
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
              {/* In blind count mode, don't show expected balance or discrepancy to employee */}
              {!isBlindCount && (
              <Typography variant="body2" gutterBottom>
                <strong>Expected Balance:</strong> {formatCurrency(activeSession?.current_expected_balance)}
              </Typography>
              )}
              <Typography variant="body2" gutterBottom>
                <strong>Actual Balance:</strong> {formatCurrency(calculatedClosingBalance)}
              </Typography>
              {!isBlindCount && (
              <Typography variant="body2" color="error">
                <strong>Discrepancy:</strong> {formatCurrency(Math.abs(calculatedClosingBalance - parseFloat(activeSession?.current_expected_balance || 0)))}
                {' '}({calculatedClosingBalance > parseFloat(activeSession?.current_expected_balance || 0) ? 'Overage' : 'Shortage'})
              </Typography>
              )}
              {isBlindCount && (
                <Typography variant="body2" color="error">
                  <strong>Status:</strong> Discrepancy exceeds threshold
                </Typography>
              )}
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

      {/* Balance View Dialog */}
      <Dialog open={balanceViewDialog} onClose={() => setBalanceViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {balanceViewData ? `${balanceViewData.drawerName} - Balance` : 'View Balance'}
        </DialogTitle>
        <DialogContent>
          {balanceViewLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : balanceViewData ? (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Balance Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Drawer/Safe Name:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {balanceViewData.drawerName}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Type:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {balanceViewData.drawerType === 'safe' ? 'Safe' : 
                     balanceViewData.drawerType === 'master_safe' ? 'Master Safe' : 
                     'Physical Drawer'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Expected Balance:
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(balanceViewData.balance)}
                  </Typography>
                </Grid>
                
                {balanceViewData.actualBalance !== null && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Actual Balance:
                    </Typography>
                    <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(balanceViewData.actualBalance)}
                    </Typography>
                  </Grid>
                )}

                {balanceViewData.denominations && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Cash Denominations
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                    </Grid>
                    <Grid item xs={12}>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>Denomination</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {[
                              { label: '$100', field: 'bill_100', value: 100 },
                              { label: '$50', field: 'bill_50', value: 50 },
                              { label: '$20', field: 'bill_20', value: 20 },
                              { label: '$10', field: 'bill_10', value: 10 },
                              { label: '$5', field: 'bill_5', value: 5 },
                              { label: '$2', field: 'coin_2', value: 2 },
                              { label: '$1', field: 'coin_1', value: 1 },
                              { label: '$0.25', field: 'coin_0_25', value: 0.25 },
                              { label: '$0.10', field: 'coin_0_10', value: 0.10 },
                              { label: '$0.05', field: 'coin_0_05', value: 0.05 },
                            ].map(item => {
                              const qty = balanceViewData.denominations[item.field] || 0;
                              const amount = qty * item.value;
                              return qty > 0 ? (
                                <TableRow key={item.field}>
                                  <TableCell>{item.label}</TableCell>
                                  <TableCell align="center">{qty}</TableCell>
                                  <TableCell align="right">{formatCurrency(amount)}</TableCell>
                                </TableRow>
                              ) : null;
                            })}
                            <TableRow sx={{ borderTop: '2px solid', borderColor: 'divider', '& td': { fontWeight: 'bold' } }}>
                              <TableCell>Total:</TableCell>
                              <TableCell align="center">
                                {Object.values([
                                  'bill_100', 'bill_50', 'bill_20', 'bill_10', 'bill_5',
                                  'coin_2', 'coin_1', 'coin_0_25', 'coin_0_10', 'coin_0_05'
                                ]).reduce((sum, field) => sum + (balanceViewData.denominations[field] || 0), 0)}
                              </TableCell>
                              <TableCell align="right">
                                {formatCurrency(calculateDenominationTotal(balanceViewData.denominations))}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  </>
                )}

                {/* Physical Tender Balances (for safes) */}
                {balanceViewData.physicalTenderBalances && Object.keys(balanceViewData.physicalTenderBalances).length > 0 && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Physical Tender Balances
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                    </Grid>
                    <Grid item xs={12}>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Balance</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(balanceViewData.physicalTenderBalances).map(([method, balance]) => (
                              <TableRow key={method}>
                                <TableCell>{method}</TableCell>
                                <TableCell align="right">{formatCurrency(parseFloat(balance) || 0)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  </>
                )}

                {/* Electronic Tender Balances (for safes) */}
                {balanceViewData.electronicTenderBalances && Array.isArray(balanceViewData.electronicTenderBalances) && balanceViewData.electronicTenderBalances.length > 0 && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Electronic Tender Balances
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                    </Grid>
                    <Grid item xs={12}>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(() => {
                              // Handle both array and object formats
                              const electronicTenders = Array.isArray(balanceViewData.electronicTenderBalances)
                                ? balanceViewData.electronicTenderBalances
                                : Object.values(balanceViewData.electronicTenderBalances || {});
                              
                              return electronicTenders.map((tender) => (
                                <TableRow key={tender.payment_method || tender.paymentMethod}>
                                  <TableCell>{tender.method_name || tender.methodName}</TableCell>
                                  <TableCell align="center">{tender.expected_qty || tender.qty || 0}</TableCell>
                                  <TableCell align="right">{formatCurrency(tender.expected_amount || tender.amount || tender.balance || 0)}</TableCell>
                                </TableRow>
                              ));
                            })()}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          ) : (
            <Typography>No balance data available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBalanceViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default CashDrawer;
