import React, { useState, useEffect, useMemo } from 'react';
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
  IconButton,
  InputAdornment,
  Popover,
  MenuList,
  ListItemText,
  TextField as MuiTextField,
  Tooltip,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  History as HistoryIcon,
  AccountBalance as BankIcon,
  AccountBalance as AccountBalanceIcon,
  Store as StoreIcon,
  ArrowForward as ArrowForwardIcon,
  SwapHoriz as SwapHorizIcon,
  Assignment as AssignmentIcon,
  Visibility as ViewIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  DateRange as DateRangeIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
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
  const [quickReportDialog, setQuickReportDialog] = useState(false);
  const [quickReportTxnDetail, setQuickReportTxnDetail] = useState(null);
  const [quickReportTxnLoading, setQuickReportTxnLoading] = useState(false);

  // Transaction Journal states
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [selectedJournalRow, setSelectedJournalRow] = useState(0);
  const [journalViewDialog, setJournalViewDialog] = useState(false);
  const [selectedJournalEntry, setSelectedJournalEntry] = useState(null);
  const [journalTransactionDetails, setJournalTransactionDetails] = useState(null);
  const [journalTransactionLoading, setJournalTransactionLoading] = useState(false);
  const [journalSearch, setJournalSearch] = useState('');
  const [journalSort, setJournalSort] = useState({ column: 'entry_date', direction: 'desc' });
  const [journalFilters, setJournalFilters] = useState({
    date: { start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
    time: { start: '00:00', end: '23:59' },
    drawer: [],
    employee: [],
    transactionType: [],
    moneyIn: { min: '', max: '' },
    moneyOut: { min: '', max: '' },
    tenderType: []
  });
  const [filterAnchor, setFilterAnchor] = useState({});
  const [sortAnchor, setSortAnchor] = useState({});

  // Configure Safe/Drawer states
  const [configDrawers, setConfigDrawers] = useState([]);
  const [selectedConfigDrawer, setSelectedConfigDrawer] = useState(null);
  const [addDrawerDialog, setAddDrawerDialog] = useState(false);
  const [editDrawerDialog, setEditDrawerDialog] = useState(false);
  const [deleteDrawerDialog, setDeleteDrawerDialog] = useState(false);
  const [newDrawerForm, setNewDrawerForm] = useState({
    drawer_type: 'physical',
    count: 1,
    drawer_name: '',
    is_active: true,
    min_close: 0,
    max_close: 0,
    has_location: false, // For safes: repository/location
    is_shared: true // For drawers: single/shared
  });
  const [editDrawerForm, setEditDrawerForm] = useState({
    drawer_name: '',
    is_active: true,
    min_close: 0,
    max_close: 0,
    has_location: false,
    is_shared: true
  });
  const [locationTransferDialog, setLocationTransferDialog] = useState(false);
  const [transferLocationTo, setTransferLocationTo] = useState('');
  const [availableLocations, setAvailableLocations] = useState([]);

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
  const [drawerElectronicBlindCountPrefs, setDrawerElectronicBlindCountPrefs] = useState({ drawers: false, safe: false }); // Electronic tender closing mode preferences
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

  // Enhanced transfer dialog states
  const [transferDialog, setTransferDialog] = useState(false);
  const [transferSource, setTransferSource] = useState(null); // Source session object
  const [transferDestination, setTransferDestination] = useState(null); // Destination session object
  const [transferDenominations, setTransferDenominations] = useState({
    bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
    coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
  });
  const [transferTenderAmounts, setTransferTenderAmounts] = useState({}); // { check: 500, debit: 1234.56, etc. }
  const [transferNotes, setTransferNotes] = useState('');

  // Bank deposit dialog states
  const [bankDepositDialog, setBankDepositDialog] = useState(false);
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [bankDepositAmount, setBankDepositAmount] = useState('');
  const [bankDepositReference, setBankDepositReference] = useState('');
  const [bankDepositNotes, setBankDepositNotes] = useState('');

  // Bank withdrawal dialog states
  const [bankWithdrawalDialog, setBankWithdrawalDialog] = useState(false);
  const [selectedWithdrawalBank, setSelectedWithdrawalBank] = useState('');
  const [bankWithdrawalAmount, setBankWithdrawalAmount] = useState('');
  const [bankWithdrawalReference, setBankWithdrawalReference] = useState('');
  const [bankWithdrawalNotes, setBankWithdrawalNotes] = useState('');

  // Petty cash payout dialog states
  const [pettyCashDialog, setPettyCashDialog] = useState(false);
  const [pettyCashAccounts, setPettyCashAccounts] = useState([]);
  const [selectedPettyCashAccount, setSelectedPettyCashAccount] = useState('');
  const [pettyCashAmount, setPettyCashAmount] = useState('');
  const [pettyCashInvoice, setPettyCashInvoice] = useState('');
  const [pettyCashDescription, setPettyCashDescription] = useState('');
  const [pettyCashDenominations, setPettyCashDenominations] = useState({
    bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
    coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
  });
  const [pettyCashSourceSession, setPettyCashSourceSession] = useState(null);

  // Inter-store transfer states
  const [stores, setStores] = useState([]);
  const [currentStore, setCurrentStore] = useState(null);
  const [interStoreTransferDialog, setInterStoreTransferDialog] = useState(false);
  const [selectedDestinationStore, setSelectedDestinationStore] = useState('');
  const [interStoreTransferAmount, setInterStoreTransferAmount] = useState('');
  const [interStoreTransferNotes, setInterStoreTransferNotes] = useState('');
  const [interStoreTransferSourceSession, setInterStoreTransferSourceSession] = useState(null);
  const [pendingInterStoreTransfers, setPendingInterStoreTransfers] = useState([]);
  const [receiveInterStoreDialog, setReceiveInterStoreDialog] = useState(false);
  const [selectedPendingTransfer, setSelectedPendingTransfer] = useState(null);
  const [receiveDestinationSession, setReceiveDestinationSession] = useState('');
  const [receiveInterStoreNotes, setReceiveInterStoreNotes] = useState('');

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
    fetchConfigDrawers();
    fetchDiscrepancyThreshold();
    fetchMinMaxClose();
    fetchBlindCountPreference();
    fetchOverview();
    fetchStoreStatus();
    checkActiveSession();
    fetchHistory();
    fetchPhysicalPaymentMethods();
    fetchElectronicPaymentMethods();
    fetchBanks();
    fetchPettyCashAccounts();
    fetchStores();
    fetchPendingInterStoreTransfers();
  }, []);

  useEffect(() => {
    if (tabValue === 2) {
      fetchJournalEntries();
    }
    if (tabValue === 3) {
      fetchConfigDrawers();
    }
  }, [tabValue]);

  // Update count mode when active session changes
  useEffect(() => {
    if (activeSession && activeSession.drawer_type && drawerBlindCountPrefs.drawers !== undefined) {
      const isSafe = activeSession.drawer_type === 'safe' || activeSession.drawer_type === 'master_safe';
      setIsBlindCount(isSafe ? drawerBlindCountPrefs.safe : drawerBlindCountPrefs.drawers);
      setIsIndividualDenominations(isSafe ? drawerIndividualDenominationsPrefs.safe : drawerIndividualDenominationsPrefs.drawers);
      setIsElectronicBlindCount(isSafe ? drawerElectronicBlindCountPrefs.safe : drawerElectronicBlindCountPrefs.drawers);
      setSelectedDrawerType(activeSession.drawer_type);
    }
  }, [activeSession, drawerBlindCountPrefs, drawerIndividualDenominationsPrefs, drawerElectronicBlindCountPrefs]);

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
        setIsElectronicBlindCount(drawerElectronicBlindCountPrefs.safe);
      } else if (drawerTypeFilter === 'physical') {
        setIsIndividualDenominations(drawerIndividualDenominationsPrefs.drawers);
        setIsElectronicBlindCount(drawerElectronicBlindCountPrefs.drawers);
      }
    }
  }, [openDrawerDialog, drawerTypeFilter, drawerBlindCountPrefs, drawerElectronicBlindCountPrefs]);

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

  const fetchConfigDrawers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/drawers`);
      setConfigDrawers(response.data || []);
    } catch (err) {
      console.error('Error fetching config drawers:', err);
      showSnackbar('Failed to load drawer configuration', 'error');
    }
  };

  const handleAddDrawer = async () => {
    try {
      const drawersToCreate = [];
      const baseName = newDrawerForm.drawer_name || 
        (newDrawerForm.drawer_type === 'safe' 
          ? `Safe`
          : `Drawer`);
      
      for (let i = 0; i < newDrawerForm.count; i++) {
        // Auto-add dash and number when creating multiple
        let drawerName;
        if (newDrawerForm.count > 1) {
          drawerName = `${baseName}-${i + 1}`;
        } else {
          drawerName = baseName;
        }
        
        drawersToCreate.push({
          drawer_name: drawerName,
          drawer_type: newDrawerForm.drawer_type,
          is_active: newDrawerForm.is_active,
          min_close: newDrawerForm.min_close,
          max_close: newDrawerForm.max_close,
          has_location: newDrawerForm.has_location, // For safes
          is_shared: newDrawerForm.is_shared // For drawers
        });
      }

      for (const drawer of drawersToCreate) {
        await axios.post(`${API_BASE_URL}/drawers`, drawer);
      }

      await fetchConfigDrawers();
      await fetchDrawers();
      setAddDrawerDialog(false);
      setSelectedConfigDrawer(null);
      // Reset form
      setNewDrawerForm({
        drawer_type: 'physical',
        count: 1,
        drawer_name: '',
        is_active: true,
        min_close: 0,
        max_close: 0,
        has_location: false,
        is_shared: true
      });
      showSnackbar(`Successfully added ${newDrawerForm.count} ${newDrawerForm.drawer_type === 'safe' ? 'safe(s)' : 'drawer(s)'}`, 'success');
    } catch (err) {
      console.error('Error adding drawer:', err);
      showSnackbar(err.response?.data?.error || 'Failed to add drawer', 'error');
    }
  };

  const handleCopyDrawer = () => {
    if (!selectedConfigDrawer) return;
    
    const baseName = selectedConfigDrawer.drawer_name;
    const copyName = baseName.includes('-') 
      ? baseName.replace(/-(\d+)$/, (match, num) => `-${parseInt(num) + 1}`)
      : `${baseName}-2`;
    
    setNewDrawerForm({
      drawer_type: selectedConfigDrawer.drawer_type,
      count: 1,
      drawer_name: copyName,
      is_active: selectedConfigDrawer.is_active,
      min_close: selectedConfigDrawer.min_close || 0,
      max_close: selectedConfigDrawer.max_close || 0
    });
    setAddDrawerDialog(true);
  };

  const handleEditDrawer = () => {
    if (!selectedConfigDrawer) return;
    
    // Ensure min_close and max_close are properly parsed as numbers
    const minClose = selectedConfigDrawer.min_close != null ? parseFloat(selectedConfigDrawer.min_close) || 0 : 0;
    const maxClose = selectedConfigDrawer.max_close != null ? parseFloat(selectedConfigDrawer.max_close) || 0 : 0;
    
    setEditDrawerForm({
      drawer_name: selectedConfigDrawer.drawer_name,
      is_active: selectedConfigDrawer.is_active,
      min_close: minClose,
      max_close: maxClose,
      has_location: selectedConfigDrawer.has_location || false,
      is_shared: selectedConfigDrawer.is_shared !== false // Default to true if null/undefined
    });
    setEditDrawerDialog(true);
  };

  const handleSaveEditDrawer = async () => {
    if (!selectedConfigDrawer) return;
    
    try {
      // Check if drawer is open
      const isOpen = activeSessions.some(s => s.drawer_id === selectedConfigDrawer.drawer_id);
      if (isOpen && !editDrawerForm.is_active) {
        showSnackbar('Cannot make an open drawer unavailable', 'error');
        return;
      }

      // Check if turning location OFF for a safe with items
      const isSafe = selectedConfigDrawer.drawer_type === 'safe' || selectedConfigDrawer.drawer_type === 'master_safe';
      const wasLocationOn = selectedConfigDrawer.has_location;
      const isLocationOff = !editDrawerForm.has_location;

      if (isSafe && wasLocationOn && isLocationOff) {
        // Check if items exist in location - need to handle transfer
        // First, try to update without transfer_location_to to see if transfer is needed
        try {
          await axios.put(`${API_BASE_URL}/drawers/${selectedConfigDrawer.drawer_id}`, {
            drawer_name: editDrawerForm.drawer_name,
            is_active: editDrawerForm.is_active,
            min_close: editDrawerForm.min_close,
            max_close: editDrawerForm.max_close,
            has_location: editDrawerForm.has_location,
            is_shared: editDrawerForm.is_shared
          });
          // If successful, no items exist, proceed normally
        } catch (err) {
          if (err.response?.data?.requires_transfer) {
            // Items exist - fetch available locations and show transfer dialog
            try {
              const locationsResponse = await axios.get(`${API_BASE_URL}/storage-locations`);
              const filteredLocations = locationsResponse.data.filter(loc => loc.location !== (editDrawerForm.drawer_name || selectedConfigDrawer.drawer_name));
              setAvailableLocations(filteredLocations);
              setLocationTransferDialog(true);
              return; // Don't close dialog yet, wait for user to select transfer location or cancel
            } catch (locationErr) {
              console.error('Error fetching locations:', locationErr);
              showSnackbar('Failed to fetch available locations', 'error');
              return;
            }
          } else {
            // Some other error
            throw err;
          }
        }
      } else {
        // Normal update (no location transfer needed)
        await axios.put(`${API_BASE_URL}/drawers/${selectedConfigDrawer.drawer_id}`, {
          drawer_name: editDrawerForm.drawer_name,
          is_active: editDrawerForm.is_active,
          min_close: editDrawerForm.min_close,
          max_close: editDrawerForm.max_close,
          has_location: editDrawerForm.has_location,
          is_shared: editDrawerForm.is_shared
        });
      }

      await fetchConfigDrawers();
      await fetchDrawers();
      setEditDrawerDialog(false);
      setSelectedConfigDrawer(null);
      showSnackbar('Drawer updated successfully', 'success');
    } catch (err) {
      console.error('Error updating drawer:', err);
      showSnackbar(err.response?.data?.error || 'Failed to update drawer', 'error');
    }
  };

  const handleLocationTransfer = async () => {
    if (!transferLocationTo) {
      showSnackbar('Please select a location to transfer items to', 'error');
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/drawers/${selectedConfigDrawer.drawer_id}`, {
        drawer_name: editDrawerForm.drawer_name,
        is_active: editDrawerForm.is_active,
        min_close: editDrawerForm.min_close,
        max_close: editDrawerForm.max_close,
        has_location: editDrawerForm.has_location,
        is_shared: editDrawerForm.is_shared,
        transfer_location_to: transferLocationTo
      });

      await fetchConfigDrawers();
      await fetchDrawers();
      setLocationTransferDialog(false);
      setEditDrawerDialog(false);
      setSelectedConfigDrawer(null);
      setTransferLocationTo('');
      showSnackbar('Items transferred and drawer updated successfully', 'success');
    } catch (err) {
      console.error('Error transferring location:', err);
      showSnackbar(err.response?.data?.error || 'Failed to transfer items', 'error');
    }
  };

  const handleCancelLocationTransfer = () => {
    // Cancel - keep location ON
    setEditDrawerForm({
      ...editDrawerForm,
      has_location: true // Revert to keeping location ON
    });
    setLocationTransferDialog(false);
    setTransferLocationTo('');
  };

  const handleDeleteDrawer = async () => {
    if (!selectedConfigDrawer) return;
    
    try {
      // Check if drawer is open
      const isOpen = activeSessions.some(s => s.drawer_id === selectedConfigDrawer.drawer_id);
      if (isOpen) {
        showSnackbar('Cannot delete an open drawer. Please close it first.', 'error');
        setDeleteDrawerDialog(false);
        return;
      }

      // Check if drawer has balance (would need to check session history or current balance)
      // For now, we'll just delete and let backend handle it
      
      await axios.delete(`${API_BASE_URL}/drawers/${selectedConfigDrawer.drawer_id}`);
      
      await fetchConfigDrawers();
      await fetchDrawers();
      setDeleteDrawerDialog(false);
      setSelectedConfigDrawer(null);
      showSnackbar('Drawer deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting drawer:', err);
      showSnackbar(err.response?.data?.error || 'Failed to delete drawer', 'error');
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
      // Fetch all drawer mode settings from drawer-type-config (stored on drawers table)
      const drawerConfigRes = await axios.get(`${API_BASE_URL}/drawer-type-config`);
      const physicalConfig = drawerConfigRes.data.find(c => c.drawer_type === 'physical');
      const safeConfig = drawerConfigRes.data.find(c => c.drawer_type === 'safe');
      const blindCountDrawers = physicalConfig ? physicalConfig.blind_count : true;
      const blindCountSafe = safeConfig ? safeConfig.blind_count : true;
      const individualDenominationsDrawers = physicalConfig ? physicalConfig.individual_denominations : false;
      const individualDenominationsSafe = safeConfig ? safeConfig.individual_denominations : false;
      const electronicBlindCountDrawers = physicalConfig ? physicalConfig.electronic_blind_count : false;
      const electronicBlindCountSafe = safeConfig ? safeConfig.electronic_blind_count : false;

      // Store both preference sets
      setDrawerBlindCountPrefs({
        drawers: blindCountDrawers,
        safe: blindCountSafe
      });
      setDrawerIndividualDenominationsPrefs({
        drawers: individualDenominationsDrawers,
        safe: individualDenominationsSafe
      });
      setDrawerElectronicBlindCountPrefs({
        drawers: electronicBlindCountDrawers,
        safe: electronicBlindCountSafe
      });

      // Set initial modes based on current selection or default to drawers
      if (selectedDrawerType) {
        const isSafe = selectedDrawerType === 'safe' || selectedDrawerType === 'master_safe';
        setIsBlindCount(isSafe ? blindCountSafe : blindCountDrawers);
        setIsIndividualDenominations(isSafe ? individualDenominationsSafe : individualDenominationsDrawers);
        setIsElectronicBlindCount(isSafe ? electronicBlindCountSafe : electronicBlindCountDrawers);
      } else {
        setIsBlindCount(blindCountDrawers); // Default to drawers preference
        setIsIndividualDenominations(individualDenominationsDrawers);
        setIsElectronicBlindCount(electronicBlindCountDrawers);
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

  const fetchBanks = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/banks`);
      setBanks(Array.isArray(response.data) ? response.data : []);
      // Set default bank if available
      const defaultBank = response.data.find(b => b.is_default);
      if (defaultBank) {
        setSelectedBank(defaultBank.bank_id);
      }
    } catch (err) {
      console.error('Error fetching banks:', err);
      setBanks([]);
    }
  };

  const fetchPettyCashAccounts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/petty-cash-accounts`);
      setPettyCashAccounts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching petty cash accounts:', err);
      setPettyCashAccounts([]);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stores`);
      setStores(Array.isArray(response.data) ? response.data : []);
      // Find and set current store
      const current = response.data.find(s => s.is_current_store);
      setCurrentStore(current || null);
    } catch (err) {
      console.error('Error fetching stores:', err);
      setStores([]);
    }
  };

  const fetchPendingInterStoreTransfers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/inter-store-transfers/pending`);
      setPendingInterStoreTransfers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching pending inter-store transfers:', err);
      setPendingInterStoreTransfers([]);
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
          setIsElectronicBlindCount(isSafe ? drawerElectronicBlindCountPrefs.safe : drawerElectronicBlindCountPrefs.drawers);
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

  const fetchJournalEntries = async () => {
    try {
      setJournalLoading(true);
      const response = await axios.get(`${API_BASE_URL}/cash-drawer/journal`);
      setJournalEntries(response.data || []);
      // Reset selection to first row
      if (response.data && response.data.length > 0) {
        setSelectedJournalRow(0);
      }
    } catch (err) {
      console.error('Error fetching journal entries:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to load transaction journal';
      showSnackbar(errorMessage, 'error');
    } finally {
      setJournalLoading(false);
    }
  };

  // Filter and sort journal entries
  const filteredJournalEntries = useMemo(() => {
    let filtered = [...journalEntries];

    // Apply search filter
    if (journalSearch) {
      const searchLower = journalSearch.toLowerCase();
      filtered = filtered.filter(entry => {
        return (
          entry.drawer_name?.toLowerCase().includes(searchLower) ||
          entry.employee_name?.toLowerCase().includes(searchLower) ||
          entry.transaction_type?.toLowerCase().includes(searchLower) ||
          entry.tender_type?.toLowerCase().includes(searchLower) ||
          entry.tender_type_name?.toLowerCase().includes(searchLower) ||
          entry.entry_id?.toString().includes(searchLower) ||
          entry.transaction_id?.toString().includes(searchLower) ||
          formatCurrency(entry.money_in).toLowerCase().includes(searchLower) ||
          formatCurrency(entry.money_out).toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply date filter
    if (journalFilters.date.start && journalFilters.date.end) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.entry_date).toISOString().split('T')[0];
        return entryDate >= journalFilters.date.start && entryDate <= journalFilters.date.end;
      });
    }

    // Apply time filter
    if (journalFilters.time.start && journalFilters.time.end) {
      filtered = filtered.filter(entry => {
        const entryTime = entry.entry_time || new Date(entry.entry_date).toTimeString().split(' ')[0];
        return entryTime >= journalFilters.time.start && entryTime <= journalFilters.time.end;
      });
    }

    // Apply drawer filter
    if (journalFilters.drawer.length > 0) {
      filtered = filtered.filter(entry => journalFilters.drawer.includes(entry.drawer_id));
    }

    // Apply employee filter
    if (journalFilters.employee.length > 0) {
      filtered = filtered.filter(entry => journalFilters.employee.includes(entry.employee_id));
    }

    // Apply transaction type filter
    if (journalFilters.transactionType.length > 0) {
      filtered = filtered.filter(entry => journalFilters.transactionType.includes(entry.transaction_type));
    }

    // Apply money IN filter
    if (journalFilters.moneyIn.min !== '' || journalFilters.moneyIn.max !== '') {
      filtered = filtered.filter(entry => {
        const amount = parseFloat(entry.money_in || 0);
        const min = journalFilters.moneyIn.min !== '' ? parseFloat(journalFilters.moneyIn.min) : 0;
        const max = journalFilters.moneyIn.max !== '' ? parseFloat(journalFilters.moneyIn.max) : Infinity;
        return amount >= min && amount <= max;
      });
    }

    // Apply money OUT filter
    if (journalFilters.moneyOut.min !== '' || journalFilters.moneyOut.max !== '') {
      filtered = filtered.filter(entry => {
        const amount = parseFloat(entry.money_out || 0);
        const min = journalFilters.moneyOut.min !== '' ? parseFloat(journalFilters.moneyOut.min) : 0;
        const max = journalFilters.moneyOut.max !== '' ? parseFloat(journalFilters.moneyOut.max) : Infinity;
        return amount >= min && amount <= max;
      });
    }

    // Apply tender type filter
    if (journalFilters.tenderType.length > 0) {
      filtered = filtered.filter(entry => journalFilters.tenderType.includes(entry.tender_type));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const { column, direction } = journalSort;
      let aVal = a[column];
      let bVal = b[column];

      if (column === 'entry_date' || column === 'entry_time') {
        aVal = new Date(a.entry_date + ' ' + (a.entry_time || ''));
        bVal = new Date(b.entry_date + ' ' + (b.entry_time || ''));
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [journalEntries, journalSearch, journalFilters, journalSort]);

  // Keyboard navigation for journal table
  useEffect(() => {
    if (tabValue !== 2) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedJournalRow(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedJournalRow(prev => Math.min(filteredJournalEntries.length - 1, prev + 1));
      } else if (e.key === 'Enter' && selectedJournalRow >= 0 && selectedJournalRow < filteredJournalEntries.length) {
        e.preventDefault();
        const entry = filteredJournalEntries[selectedJournalRow];
        setSelectedJournalEntry(entry);
        setJournalViewDialog(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabValue, selectedJournalRow, filteredJournalEntries]);

  // Load transaction details when view dialog opens
  useEffect(() => {
    if (journalViewDialog && selectedJournalEntry?.transaction_id && selectedJournalEntry?.transaction_type === 'Payments') {
      setJournalTransactionLoading(true);
      Promise.all([
        axios.get(`${API_BASE_URL}/transactions/${selectedJournalEntry.transaction_id}/items`),
        axios.get(`${API_BASE_URL}/transactions/${selectedJournalEntry.transaction_id}/payments`)
      ])
        .then(([itemsRes, paymentsRes]) => {
          setJournalTransactionDetails({
            items: itemsRes.data || [],
            payments: paymentsRes.data || []
          });
        })
        .catch(err => {
          console.error('Error loading transaction details:', err);
          showSnackbar('Failed to load transaction details', 'error');
        })
        .finally(() => {
          setJournalTransactionLoading(false);
        });
    } else {
      setJournalTransactionDetails(null);
    }
  }, [journalViewDialog, selectedJournalEntry]);

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

  const openQuickReport = async () => {
    // If no active session, open dialog with empty state (shows "no drawer open" message)
    if (!activeSession) {
      setSessionDetails(null);
      setQuickReportDialog(true);
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/cash-drawer/${activeSession.session_id}/details`);
      setSessionDetails(response.data);
      setQuickReportDialog(true);
    } catch (err) {
      console.error('Error fetching quick report:', err);
      showSnackbar('Failed to load drawer report', 'error');
    }
  };

  const viewQuickReportTransaction = async (transactionId, transactionLabel) => {
    setQuickReportTxnLoading(true);
    try {
      const [itemsRes, paymentsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/transactions/${transactionId}/items`),
        axios.get(`${API_BASE_URL}/transactions/${transactionId}/payments`)
      ]);
      setQuickReportTxnDetail({
        transaction_id: transactionId,
        transaction_type: transactionLabel || 'Transaction',
        items: itemsRes.data,
        payments: paymentsRes.data.payments || paymentsRes.data || []
      });
    } catch (err) {
      console.error('Error fetching transaction details:', err);
      showSnackbar('Failed to load transaction details', 'error');
    } finally {
      setQuickReportTxnLoading(false);
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

    // Calculate balance from denomination counts (close dialog always uses denomination counting)
    const calculatedBalance = calculateDenominationTotal(closingDenominations);

    // Validation - denomination total must be entered
    if (calculatedBalance === 0) {
      showSnackbar('Please enter denomination counts', 'error');
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
        fetchAllActiveSessions(),
        fetchOverview()
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

  const resetTransferForm = () => {
    setTransferSource(null);
    setTransferDestination(null);
    setTransferDenominations({
      bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
      coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
    });
    setTransferTenderAmounts({});
    setTransferNotes('');
  };

  const openTransferDialog = (sourceSession = null, destinationSession = null) => {
    fetchAllActiveSessions();
    setTransferSource(sourceSession);
    setTransferDestination(destinationSession);
    resetTransferForm();
    if (sourceSession) setTransferSource(sourceSession);
    if (destinationSession) setTransferDestination(destinationSession);
    setTransferDialog(true);
  };

  const resetBankDepositForm = () => {
    setBankDepositAmount('');
    setBankDepositReference('');
    setBankDepositNotes('');
    // Keep selected bank as default
    const defaultBank = banks.find(b => b.is_default);
    if (defaultBank) {
      setSelectedBank(defaultBank.bank_id);
    }
  };

  const openBankDepositDialog = () => {
    fetchBanks();
    resetBankDepositForm();
    setBankDepositDialog(true);
  };

  const handleBankDeposit = async () => {
    if (!selectedBank) {
      showSnackbar('Please select a bank', 'error');
      return;
    }

    const depositTotal = parseFloat(bankDepositAmount) || 0;

    if (depositTotal <= 0) {
      showSnackbar('Please enter a valid deposit amount', 'error');
      return;
    }

    // Verify we're on master safe
    if (activeSession?.drawer_type !== 'master_safe') {
      showSnackbar('Bank deposits can only be made from the Master Safe', 'error');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    try {
      await axios.post(
        `${API_BASE_URL}/cash-drawer/${activeSession.session_id}/bank-deposit`,
        {
          bank_id: selectedBank,
          amount: depositTotal,
          deposit_reference: bankDepositReference || null,
          notes: bankDepositNotes || null,
          performed_by: currentUser.id
        }
      );

      const bankName = banks.find(b => b.bank_id === selectedBank)?.bank_name || 'Bank';
      showSnackbar(`Bank deposit of ${formatCurrency(depositTotal)} to ${bankName} completed`, 'success');
      setBankDepositDialog(false);
      resetBankDepositForm();

      // Refresh sessions and overview
      await Promise.all([
        checkActiveSession(),
        fetchAllActiveSessions(),
        fetchOverview()
      ]);
    } catch (err) {
      console.error('Error processing bank deposit:', err);
      showSnackbar(err.response?.data?.error || 'Failed to process bank deposit', 'error');
    }
  };

  const resetBankWithdrawalForm = () => {
    setBankWithdrawalAmount('');
    setBankWithdrawalReference('');
    setBankWithdrawalNotes('');
    // Keep selected bank as default
    const defaultBank = banks.find(b => b.is_default);
    if (defaultBank) {
      setSelectedWithdrawalBank(defaultBank.bank_id);
    }
  };

  const openBankWithdrawalDialog = () => {
    fetchBanks();
    resetBankWithdrawalForm();
    setBankWithdrawalDialog(true);
  };

  const handleBankWithdrawal = async () => {
    if (!selectedWithdrawalBank) {
      showSnackbar('Please select a bank', 'error');
      return;
    }

    const withdrawalTotal = parseFloat(bankWithdrawalAmount) || 0;

    if (withdrawalTotal <= 0) {
      showSnackbar('Please enter a valid withdrawal amount', 'error');
      return;
    }

    // Verify we're on master safe
    if (activeSession?.drawer_type !== 'master_safe') {
      showSnackbar('Bank withdrawals can only be made to the Master Safe', 'error');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    try {
      await axios.post(
        `${API_BASE_URL}/cash-drawer/${activeSession.session_id}/bank-withdrawal`,
        {
          bank_id: selectedWithdrawalBank,
          amount: withdrawalTotal,
          withdrawal_reference: bankWithdrawalReference || null,
          notes: bankWithdrawalNotes || null,
          performed_by: currentUser.id
        }
      );

      const bankName = banks.find(b => b.bank_id === selectedWithdrawalBank)?.bank_name || 'Bank';
      showSnackbar(`Bank withdrawal of ${formatCurrency(withdrawalTotal)} from ${bankName} completed`, 'success');
      setBankWithdrawalDialog(false);
      resetBankWithdrawalForm();

      // Refresh sessions and overview
      await Promise.all([
        checkActiveSession(),
        fetchAllActiveSessions(),
        fetchOverview()
      ]);
    } catch (err) {
      console.error('Error processing bank withdrawal:', err);
      showSnackbar(err.response?.data?.error || 'Failed to process bank withdrawal', 'error');
    }
  };

  const resetPettyCashForm = () => {
    setSelectedPettyCashAccount('');
    setPettyCashAmount('');
    setPettyCashInvoice('');
    setPettyCashDescription('');
    setPettyCashDenominations({
      bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
      coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
    });
    setPettyCashSourceSession(null);
  };

  const openPettyCashDialog = () => {
    fetchPettyCashAccounts();
    fetchAllActiveSessions();
    resetPettyCashForm();

    // Determine source session: prefer physical drawer, then safe
    if (activeSession) {
      setPettyCashSourceSession(activeSession);
    }
    setPettyCashDialog(true);
  };

  const handlePettyCashPayout = async () => {
    if (!selectedPettyCashAccount) {
      showSnackbar('Please select an expense account', 'error');
      return;
    }

    if (!pettyCashDescription.trim()) {
      showSnackbar('Please enter a description', 'error');
      return;
    }

    if (!pettyCashSourceSession) {
      showSnackbar('Please select a source drawer/safe', 'error');
      return;
    }

    // Check if denominations are required
    const sourceDrawerType = pettyCashSourceSession.drawer_type;
    const usesDenominations = sourceDrawerType === 'physical' ||
      ((sourceDrawerType === 'safe' || sourceDrawerType === 'master_safe') && drawerIndividualDenominationsPrefs.safe);

    let payoutTotal;
    if (usesDenominations) {
      payoutTotal = calculateDenominationTotal(pettyCashDenominations);
    } else {
      payoutTotal = parseFloat(pettyCashAmount) || 0;
    }

    if (payoutTotal <= 0) {
      showSnackbar('Please enter a valid payout amount', 'error');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    try {
      await axios.post(
        `${API_BASE_URL}/cash-drawer/${pettyCashSourceSession.session_id}/petty-cash-payout`,
        {
          account_id: selectedPettyCashAccount,
          amount: payoutTotal,
          invoice_number: pettyCashInvoice || null,
          description: pettyCashDescription,
          performed_by: currentUser.id,
          denominations: usesDenominations ? pettyCashDenominations : null
        }
      );

      const accountName = pettyCashAccounts.find(a => a.account_id === selectedPettyCashAccount)?.account_name || 'Account';
      showSnackbar(`Petty cash payout of ${formatCurrency(payoutTotal)} to ${accountName} completed`, 'success');
      setPettyCashDialog(false);
      resetPettyCashForm();

      // Refresh sessions and overview
      await Promise.all([
        checkActiveSession(),
        fetchAllActiveSessions(),
        fetchOverview()
      ]);
    } catch (err) {
      console.error('Error processing petty cash payout:', err);
      showSnackbar(err.response?.data?.error || 'Failed to process petty cash payout', 'error');
    }
  };

  const handleTransfer = async () => {
    if (!transferSource || !transferDestination) {
      showSnackbar('Please select both source and destination', 'error');
      return;
    }

    // Calculate total cash from denominations
    const cashTotal = calculateDenominationTotal(transferDenominations);

    // Calculate total from other tenders
    const otherTendersTotal = Object.values(transferTenderAmounts)
      .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

    const totalTransfer = cashTotal + otherTendersTotal;

    if (totalTransfer <= 0) {
      showSnackbar('Please enter amounts to transfer', 'error');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    try {
      // Call the transfer API
      await axios.post(
        `${API_BASE_URL}/cash-drawer/${transferDestination.session_id}/transfer`,
        {
          source_session_id: transferSource.session_id,
          amount: totalTransfer,
          reason: transferNotes || `Transfer from ${transferSource.drawer_name} to ${transferDestination.drawer_name}`,
          performed_by: currentUser.id,
          denominations: cashTotal > 0 ? transferDenominations : null,
          tender_breakdown: Object.entries(transferTenderAmounts)
            .filter(([_, amount]) => parseFloat(amount) > 0)
            .map(([method, amount]) => ({ method, amount: parseFloat(amount) }))
        }
      );

      showSnackbar(`Transfer of ${formatCurrency(totalTransfer)} completed successfully`, 'success');
      setTransferDialog(false);
      resetTransferForm();

      // Refresh sessions and overview
      await Promise.all([
        checkActiveSession(),
        fetchAllActiveSessions(),
        fetchOverview()
      ]);
    } catch (err) {
      console.error('Error processing transfer:', err);
      showSnackbar(err.response?.data?.error || 'Failed to process transfer', 'error');
    }
  };

  // Inter-store transfer functions
  const openInterStoreTransferDialog = (sourceSession) => {
    setInterStoreTransferSourceSession(sourceSession);
    setSelectedDestinationStore('');
    setInterStoreTransferAmount('');
    setInterStoreTransferNotes('');
    setInterStoreTransferDialog(true);
  };

  const handleSendInterStoreTransfer = async () => {
    if (!selectedDestinationStore || !interStoreTransferSourceSession) {
      showSnackbar('Please select a destination store', 'error');
      return;
    }

    const transferAmount = parseFloat(interStoreTransferAmount) || 0;

    if (transferAmount <= 0) {
      showSnackbar('Please enter an amount to transfer', 'error');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    try {
      const response = await axios.post(`${API_BASE_URL}/inter-store-transfers`, {
        destination_store_id: parseInt(selectedDestinationStore),
        source_session_id: interStoreTransferSourceSession.session_id,
        amount: transferAmount,
        transfer_type: 'cash',
        send_notes: interStoreTransferNotes,
        performed_by: currentUser.id
      });

      showSnackbar(`Inter-store transfer of ${formatCurrency(transferAmount)} sent successfully. Reference: ${response.data.reference_number}`, 'success');
      setInterStoreTransferDialog(false);

      // Refresh data
      await Promise.all([
        checkActiveSession(),
        fetchAllActiveSessions(),
        fetchOverview(),
        fetchPendingInterStoreTransfers()
      ]);
    } catch (err) {
      console.error('Error sending inter-store transfer:', err);
      showSnackbar(err.response?.data?.error || 'Failed to send inter-store transfer', 'error');
    }
  };

  const openReceiveInterStoreDialog = () => {
    setSelectedPendingTransfer(null);
    setReceiveDestinationSession('');
    setReceiveInterStoreNotes('');
    fetchPendingInterStoreTransfers();
    setReceiveInterStoreDialog(true);
  };

  const handleReceiveInterStoreTransfer = async () => {
    if (!selectedPendingTransfer || !receiveDestinationSession) {
      showSnackbar('Please select a transfer and destination', 'error');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    try {
      await axios.post(`${API_BASE_URL}/inter-store-transfers/${selectedPendingTransfer.transfer_id}/receive`, {
        destination_session_id: parseInt(receiveDestinationSession),
        receive_notes: receiveInterStoreNotes,
        performed_by: currentUser.id
      });

      showSnackbar(`Inter-store transfer of ${formatCurrency(selectedPendingTransfer.amount)} received successfully`, 'success');
      setReceiveInterStoreDialog(false);

      // Refresh data
      await Promise.all([
        checkActiveSession(),
        fetchAllActiveSessions(),
        fetchOverview(),
        fetchPendingInterStoreTransfers()
      ]);
    } catch (err) {
      console.error('Error receiving inter-store transfer:', err);
      showSnackbar(err.response?.data?.error || 'Failed to receive inter-store transfer', 'error');
    }
  };

  // Check if drawer uses denominations (physical drawers always do, safes based on preference)
  const drawerUsesDenominations = (drawerType) => {
    if (drawerType === 'physical') return true;
    if (drawerType === 'safe' || drawerType === 'master_safe') {
      return drawerIndividualDenominationsPrefs.safe;
    }
    return false;
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

        {/* SAFE and DRAWER Sections - Side by Side */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* SAFE Section */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>SAFE</Typography>
            <TableContainer>
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
          </Grid>

          {/* DRAWER Section */}
          <Grid item xs={12} md={6}>
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
          </Grid>
        </Grid>
      </Paper>

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Active Session" />
        <Tab label="History" />
        <Tab label="Transaction Journal" />
        <Tab label="Configure Safe / Drawer" />
      </Tabs>

      {/* Active Session Tab */}
      {tabValue === 0 && (
        <>
          {/* Low cash balance warnings - only for employee's connected drawers */}
          {(() => {
            const myDrawerIds = activeSessions.map(s => s.drawer_id);
            const allOverviewDrawers = [...(overviewData.safes || []), ...(overviewData.drawers || [])];
            const lowBalanceDrawers = allOverviewDrawers.filter(d =>
              d.status === 'OPEN' && d.min_close > 0 && parseFloat(d.balance) < parseFloat(d.min_close)
              && myDrawerIds.includes(d.drawer_id)
            );
            return lowBalanceDrawers.length > 0 ? (
              <Box sx={{ mb: 2 }}>
                {lowBalanceDrawers.map(d => (
                  <Alert key={d.drawer_id} severity="warning" sx={{ mb: 1 }}>
                    Low cash balance: <strong>{d.drawer_name}</strong> is at {formatCurrency(parseFloat(d.balance))} (minimum: {formatCurrency(parseFloat(d.min_close))})
                  </Alert>
                ))}
              </Box>
            ) : null;
          })()}
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
                              setIsElectronicBlindCount(drawerElectronicBlindCountPrefs.drawers);
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
                              setIsElectronicBlindCount(drawerElectronicBlindCountPrefs.safe);
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
                              setIsElectronicBlindCount(drawerElectronicBlindCountPrefs.safe);
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
                        startIcon={<SwapHorizIcon />}
                        disabled={isStoreClosed}
                        onClick={() => openTransferDialog(activeSession, null)}
                      >
                        Transfer
                      </Button>
                      {/* Inter-store transfer buttons */}
                      <Button
                        variant="outlined"
                        startIcon={<StoreIcon />}
                        disabled={isStoreClosed || stores.filter(s => !s.is_current_store && s.is_active).length === 0}
                        onClick={() => openInterStoreTransferDialog(activeSession)}
                      >
                        Send Inter-store
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<StoreIcon />}
                        disabled={isStoreClosed || pendingInterStoreTransfers.length === 0}
                        onClick={openReceiveInterStoreDialog}
                      >
                        Receive Inter-store {pendingInterStoreTransfers.length > 0 && `(${pendingInterStoreTransfers.length})`}
                      </Button>
                      {/* Show Bank Deposit and Withdrawal buttons only for Master Safe */}
                      {activeSession.drawer_type === 'master_safe' && (
                        <>
                          <Button
                            variant="outlined"
                            startIcon={<AccountBalanceIcon />}
                            disabled={isStoreClosed}
                            onClick={openBankDepositDialog}
                          >
                            Bank Deposit
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<AccountBalanceIcon />}
                            disabled={isStoreClosed}
                            onClick={openBankWithdrawalDialog}
                          >
                            Bank Withdrawal
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outlined"
                        startIcon={<AssignmentIcon />}
                        onClick={openQuickReport}
                      >
                        Quick Report
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<MoneyIcon />}
                        disabled={isStoreClosed}
                        onClick={openPettyCashDialog}
                      >
                        Petty Cash
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
                <Button
                  variant="outlined"
                  startIcon={<AssignmentIcon />}
                  onClick={openQuickReport}
                >
                  Quick Report
                </Button>
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

      {/* Transaction Journal Tab */}
      {tabValue === 2 && (
        <Box>
          {/* Search Bar */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by keyword or value..."
              value={journalSearch}
              onChange={(e) => setJournalSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Paper>

          {/* Journal Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  {/* Date Column */}
                  <TableCell>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box
                        onClick={(e) => setFilterAnchor({ ...filterAnchor, date: e.currentTarget })}
                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <Typography variant="subtitle2">Date</Typography>
                        <FilterIcon fontSize="small" />
                      </Box>
                      <Box display="flex" flexDirection="column">
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'entry_date', direction: 'asc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowUpIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'entry_date', direction: 'desc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowDownIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Time Column */}
                  <TableCell>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box
                        onClick={(e) => setFilterAnchor({ ...filterAnchor, time: e.currentTarget })}
                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <Typography variant="subtitle2">Time</Typography>
                        <FilterIcon fontSize="small" />
                      </Box>
                      <Box display="flex" flexDirection="column">
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'entry_time', direction: 'asc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowUpIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'entry_time', direction: 'desc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowDownIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Safe/Drawer Column */}
                  <TableCell>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box
                        onClick={(e) => setFilterAnchor({ ...filterAnchor, drawer: e.currentTarget })}
                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <Typography variant="subtitle2">Safe/Drawer</Typography>
                        <FilterIcon fontSize="small" />
                      </Box>
                      <Box display="flex" flexDirection="column">
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'drawer_name', direction: 'asc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowUpIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'drawer_name', direction: 'desc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowDownIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Employee Column */}
                  <TableCell>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box
                        onClick={(e) => setFilterAnchor({ ...filterAnchor, employee: e.currentTarget })}
                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <Typography variant="subtitle2">Employee</Typography>
                        <FilterIcon fontSize="small" />
                      </Box>
                      <Box display="flex" flexDirection="column">
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'employee_name', direction: 'asc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowUpIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'employee_name', direction: 'desc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowDownIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Transaction Type Column */}
                  <TableCell>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box
                        onClick={(e) => setFilterAnchor({ ...filterAnchor, transactionType: e.currentTarget })}
                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <Typography variant="subtitle2">Transaction Type</Typography>
                        <FilterIcon fontSize="small" />
                      </Box>
                      <Box display="flex" flexDirection="column">
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'transaction_type', direction: 'asc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowUpIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'transaction_type', direction: 'desc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowDownIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Money IN Column */}
                  <TableCell align="right">
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box
                        onClick={(e) => setFilterAnchor({ ...filterAnchor, moneyIn: e.currentTarget })}
                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <Typography variant="subtitle2">Money IN</Typography>
                        <FilterIcon fontSize="small" />
                      </Box>
                      <Box display="flex" flexDirection="column">
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'money_in', direction: 'asc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowUpIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'money_in', direction: 'desc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowDownIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Money OUT Column */}
                  <TableCell align="right">
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box
                        onClick={(e) => setFilterAnchor({ ...filterAnchor, moneyOut: e.currentTarget })}
                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <Typography variant="subtitle2">Money OUT</Typography>
                        <FilterIcon fontSize="small" />
                      </Box>
                      <Box display="flex" flexDirection="column">
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'money_out', direction: 'asc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowUpIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'money_out', direction: 'desc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowDownIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Tender Type Column */}
                  <TableCell>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box
                        onClick={(e) => setFilterAnchor({ ...filterAnchor, tenderType: e.currentTarget })}
                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <Typography variant="subtitle2">Tender Type</Typography>
                        <FilterIcon fontSize="small" />
                      </Box>
                      <Box display="flex" flexDirection="column">
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'tender_type', direction: 'asc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowUpIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setJournalSort({ column: 'tender_type', direction: 'desc' })}
                          sx={{ p: 0, height: 12 }}
                        >
                          <ArrowDownIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* View Column */}
                  <TableCell align="center">View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {journalLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredJournalEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                      No journal entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJournalEntries.map((entry, index) => (
                    <TableRow
                      key={entry.entry_id}
                      hover
                      selected={index === selectedJournalRow}
                      onClick={() => {
                        setSelectedJournalRow(index);
                        setSelectedJournalEntry(entry);
                      }}
                      onDoubleClick={() => {
                        setSelectedJournalEntry(entry);
                        setJournalViewDialog(true);
                      }}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: index === selectedJournalRow ? 'action.selected' : 'inherit',
                        '&:hover': {
                          backgroundColor: index === selectedJournalRow ? 'action.selected' : 'action.hover',
                        },
                      }}
                    >
                      <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {entry.entry_time 
                          ? entry.entry_time.split('.')[0].substring(0, 8) 
                          : new Date(entry.entry_date).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        }
                      </TableCell>
                      <TableCell>{entry.drawer_name || 'N/A'}</TableCell>
                      <TableCell>{entry.employee_name || 'N/A'}</TableCell>
                      <TableCell>{entry.transaction_type || 'N/A'}</TableCell>
                      <TableCell align="right">{entry.money_in > 0 ? formatCurrency(entry.money_in) : '—'}</TableCell>
                      <TableCell align="right">{entry.money_out > 0 ? formatCurrency(entry.money_out) : '—'}</TableCell>
                      <TableCell>{entry.tender_type_name || entry.tender_type || 'N/A'}</TableCell>
                      <TableCell align="center">
                        {index === selectedJournalRow && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJournalEntry(entry);
                              setJournalViewDialog(true);
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Filter Dialogs */}
      {/* Date Filter */}
      <Popover
        open={Boolean(filterAnchor.date)}
        anchorEl={filterAnchor.date}
        onClose={() => setFilterAnchor({ ...filterAnchor, date: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 300 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Date Range</Typography>
          <TextField
            label="Start Date"
            type="date"
            value={journalFilters.date.start}
            onChange={(e) => setJournalFilters({ ...journalFilters, date: { ...journalFilters.date, start: e.target.value } })}
            fullWidth
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            value={journalFilters.date.end}
            onChange={(e) => setJournalFilters({ ...journalFilters, date: { ...journalFilters.date, end: e.target.value } })}
            fullWidth
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setJournalFilters({ ...journalFilters, date: { start: today, end: today } });
            }}
            fullWidth
          >
            Reset to Today
          </Button>
        </Box>
      </Popover>

      {/* Time Filter */}
      <Popover
        open={Boolean(filterAnchor.time)}
        anchorEl={filterAnchor.time}
        onClose={() => setFilterAnchor({ ...filterAnchor, time: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 300 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Time Range</Typography>
          <TextField
            label="Start Time"
            type="time"
            value={journalFilters.time.start}
            onChange={(e) => setJournalFilters({ ...journalFilters, time: { ...journalFilters.time, start: e.target.value } })}
            fullWidth
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Time"
            type="time"
            value={journalFilters.time.end}
            onChange={(e) => setJournalFilters({ ...journalFilters, time: { ...journalFilters.time, end: e.target.value } })}
            fullWidth
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => setJournalFilters({ ...journalFilters, time: { start: '00:00', end: '23:59' } })}
            fullWidth
          >
            Reset to Full Day
          </Button>
        </Box>
      </Popover>

      {/* Drawer Filter */}
      <Popover
        open={Boolean(filterAnchor.drawer)}
        anchorEl={filterAnchor.drawer}
        onClose={() => setFilterAnchor({ ...filterAnchor, drawer: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 250, maxHeight: 400, overflow: 'auto' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Safe/Drawer</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={journalFilters.drawer.length === 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setJournalFilters({ ...journalFilters, drawer: [] });
                  }
                }}
              />
            }
            label="All"
          />
          {drawers.map((drawer) => (
            <FormControlLabel
              key={drawer.drawer_id}
              control={
                <Checkbox
                  checked={journalFilters.drawer.includes(drawer.drawer_id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setJournalFilters({ ...journalFilters, drawer: [...journalFilters.drawer, drawer.drawer_id] });
                    } else {
                      setJournalFilters({ ...journalFilters, drawer: journalFilters.drawer.filter(id => id !== drawer.drawer_id) });
                    }
                  }}
                />
              }
              label={drawer.drawer_name}
            />
          ))}
        </Box>
      </Popover>

      {/* Employee Filter */}
      <Popover
        open={Boolean(filterAnchor.employee)}
        anchorEl={filterAnchor.employee}
        onClose={() => setFilterAnchor({ ...filterAnchor, employee: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 250, maxHeight: 400, overflow: 'auto' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Employee</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={journalFilters.employee.length === 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setJournalFilters({ ...journalFilters, employee: [] });
                  }
                }}
              />
            }
            label="All"
          />
          {employees.map((emp) => (
            <FormControlLabel
              key={emp.employee_id}
              control={
                <Checkbox
                  checked={journalFilters.employee.includes(emp.employee_id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setJournalFilters({ ...journalFilters, employee: [...journalFilters.employee, emp.employee_id] });
                    } else {
                      setJournalFilters({ ...journalFilters, employee: journalFilters.employee.filter(id => id !== emp.employee_id) });
                    }
                  }}
                />
              }
              label={`${emp.first_name} ${emp.last_name}`}
            />
          ))}
        </Box>
      </Popover>

      {/* Transaction Type Filter */}
      <Popover
        open={Boolean(filterAnchor.transactionType)}
        anchorEl={filterAnchor.transactionType}
        onClose={() => setFilterAnchor({ ...filterAnchor, transactionType: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 250, maxHeight: 400, overflow: 'auto' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Transaction Type</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={journalFilters.transactionType.length === 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setJournalFilters({ ...journalFilters, transactionType: [] });
                  }
                }}
              />
            }
            label="All"
          />
          {['Open', 'Close', 'Transfer', 'Over/Short', 'Payments', 'Petty Cash Payout'].map((type) => (
            <FormControlLabel
              key={type}
              control={
                <Checkbox
                  checked={journalFilters.transactionType.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setJournalFilters({ ...journalFilters, transactionType: [...journalFilters.transactionType, type] });
                    } else {
                      setJournalFilters({ ...journalFilters, transactionType: journalFilters.transactionType.filter(t => t !== type) });
                    }
                  }}
                />
              }
              label={type}
            />
          ))}
        </Box>
      </Popover>

      {/* Money IN Filter */}
      <Popover
        open={Boolean(filterAnchor.moneyIn)}
        anchorEl={filterAnchor.moneyIn}
        onClose={() => setFilterAnchor({ ...filterAnchor, moneyIn: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 250 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Money IN Range</Typography>
          <TextField
            label="Min Amount"
            type="number"
            value={journalFilters.moneyIn.min}
            onChange={(e) => setJournalFilters({ ...journalFilters, moneyIn: { ...journalFilters.moneyIn, min: e.target.value } })}
            fullWidth
            sx={{ mb: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          />
          <TextField
            label="Max Amount"
            type="number"
            value={journalFilters.moneyIn.max}
            onChange={(e) => setJournalFilters({ ...journalFilters, moneyIn: { ...journalFilters.moneyIn, max: e.target.value } })}
            fullWidth
            sx={{ mb: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => setJournalFilters({ ...journalFilters, moneyIn: { min: '', max: '' } })}
            fullWidth
          >
            Clear Filter
          </Button>
        </Box>
      </Popover>

      {/* Money OUT Filter */}
      <Popover
        open={Boolean(filterAnchor.moneyOut)}
        anchorEl={filterAnchor.moneyOut}
        onClose={() => setFilterAnchor({ ...filterAnchor, moneyOut: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 250 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Money OUT Range</Typography>
          <TextField
            label="Min Amount"
            type="number"
            value={journalFilters.moneyOut.min}
            onChange={(e) => setJournalFilters({ ...journalFilters, moneyOut: { ...journalFilters.moneyOut, min: e.target.value } })}
            fullWidth
            sx={{ mb: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          />
          <TextField
            label="Max Amount"
            type="number"
            value={journalFilters.moneyOut.max}
            onChange={(e) => setJournalFilters({ ...journalFilters, moneyOut: { ...journalFilters.moneyOut, max: e.target.value } })}
            fullWidth
            sx={{ mb: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => setJournalFilters({ ...journalFilters, moneyOut: { min: '', max: '' } })}
            fullWidth
          >
            Clear Filter
          </Button>
        </Box>
      </Popover>

      {/* Tender Type Filter */}
      <Popover
        open={Boolean(filterAnchor.tenderType)}
        anchorEl={filterAnchor.tenderType}
        onClose={() => setFilterAnchor({ ...filterAnchor, tenderType: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 250, maxHeight: 400, overflow: 'auto' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Tender Type</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={journalFilters.tenderType.length === 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setJournalFilters({ ...journalFilters, tenderType: [] });
                  }
                }}
              />
            }
            label="All"
          />
          {Array.from(new Set(journalEntries.map(e => e.tender_type).filter(Boolean))).map((tender) => {
            const tenderName = journalEntries.find(e => e.tender_type === tender)?.tender_type_name || tender;
            return (
              <FormControlLabel
                key={tender}
                control={
                  <Checkbox
                    checked={journalFilters.tenderType.includes(tender)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setJournalFilters({ ...journalFilters, tenderType: [...journalFilters.tenderType, tender] });
                      } else {
                        setJournalFilters({ ...journalFilters, tenderType: journalFilters.tenderType.filter(t => t !== tender) });
                      }
                    }}
                  />
                }
                label={tenderName}
              />
            );
          })}
        </Box>
      </Popover>

      {/* Journal View Dialog */}
      <Dialog
        open={journalViewDialog}
        onClose={() => {
          setJournalViewDialog(false);
          setJournalTransactionDetails(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Transaction Details - {selectedJournalEntry?.transaction_type || 'Entry'}
        </DialogTitle>
        <DialogContent>
          {selectedJournalEntry && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Date</Typography>
                  <Typography variant="body1">{new Date(selectedJournalEntry.entry_date).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Time</Typography>
                  <Typography variant="body1">
                    {selectedJournalEntry.entry_time 
                      ? selectedJournalEntry.entry_time.split('.')[0].substring(0, 8)
                      : new Date(selectedJournalEntry.entry_date).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    }
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Safe/Drawer</Typography>
                  <Typography variant="body1">{selectedJournalEntry.drawer_name || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Employee</Typography>
                  <Typography variant="body1">{selectedJournalEntry.employee_name || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Transaction Type</Typography>
                  <Typography variant="body1">{selectedJournalEntry.transaction_type || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Tender Type</Typography>
                  <Typography variant="body1">{selectedJournalEntry.tender_type_name || selectedJournalEntry.tender_type || 'N/A'}</Typography>
                </Grid>
                {selectedJournalEntry.money_in > 0 && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Money IN</Typography>
                    <Typography variant="body1" sx={{ color: 'success.main', fontWeight: 600 }}>
                      {formatCurrency(selectedJournalEntry.money_in)}
                    </Typography>
                  </Grid>
                )}
                {selectedJournalEntry.money_out > 0 && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Money OUT</Typography>
                    <Typography variant="body1" sx={{ color: 'error.main', fontWeight: 600 }}>
                      {formatCurrency(selectedJournalEntry.money_out)}
                    </Typography>
                  </Grid>
                )}
                {selectedJournalEntry.transaction_id && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Transaction ID</Typography>
                    <Typography variant="body1">{selectedJournalEntry.transaction_id}</Typography>
                  </Grid>
                )}
                {selectedJournalEntry.notes && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Notes</Typography>
                    <Typography variant="body1">{selectedJournalEntry.notes}</Typography>
                  </Grid>
                )}
              </Grid>

              {/* For store transactions, show items and payments */}
              {selectedJournalEntry.transaction_id && selectedJournalEntry.transaction_type === 'Payments' && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Transaction Items</Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary">Loading transaction details...</Typography>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJournalViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Configure Safe / Drawer Tab */}
      {tabValue === 3 && (
        <Box>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Configure Safe / Drawer</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setNewDrawerForm({
                      drawer_type: 'physical',
                      count: 1,
                      drawer_name: '',
                      is_active: true,
                      min_close: 0,
                      max_close: 0
                    });
                    setAddDrawerDialog(true);
                  }}
                >
                  Add
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CopyIcon />}
                  disabled={!selectedConfigDrawer || selectedConfigDrawer.drawer_name === 'Master'}
                  onClick={handleCopyDrawer}
                >
                  Copy
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  disabled={!selectedConfigDrawer}
                  onClick={handleEditDrawer}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  disabled={!selectedConfigDrawer || selectedConfigDrawer.drawer_name === 'Master'}
                  onClick={() => setDeleteDrawerDialog(true)}
                >
                  Delete
                </Button>
              </Box>
            </Box>

            {/* SAFE Section */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>SAFE</Typography>
            <TableContainer sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#1976d2' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 50 }}></TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Available</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tracking</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Physical Count</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Electronic Count</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Min Amount</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Max Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {configDrawers
                    .filter(d => d.drawer_type === 'safe' || d.drawer_type === 'master_safe')
                    .map((drawer) => (
                      <TableRow
                        key={drawer.drawer_id}
                        hover
                        selected={selectedConfigDrawer?.drawer_id === drawer.drawer_id}
                        onClick={() => setSelectedConfigDrawer(drawer)}
                        sx={{
                          bgcolor: selectedConfigDrawer?.drawer_id === drawer.drawer_id ? '#e3f2fd' : 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedConfigDrawer?.drawer_id === drawer.drawer_id}
                            onChange={() => setSelectedConfigDrawer(drawer)}
                          />
                        </TableCell>
                        <TableCell>{drawer.drawer_name}</TableCell>
                        <TableCell>{drawer.is_active ? 'Y' : 'N'}</TableCell>
                        <TableCell>{drawer.drawer_type === 'master_safe' ? 'Rep' : 'Loc'}</TableCell>
                        <TableCell>{drawer.individual_denominations ? 'Denoms' : 'Balance'}</TableCell>
                        <TableCell>{drawer.blind_count ? 'Blind' : 'Open'}</TableCell>
                        <TableCell>{drawer.electronic_blind_count ? 'Blind' : 'Open'}</TableCell>
                        <TableCell>{formatCurrency(drawer.min_close || 0)}</TableCell>
                        <TableCell>{formatCurrency(drawer.max_close || 0)}</TableCell>
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
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 50 }}></TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Available</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tracking</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Physical Count</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Electronic Count</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Min Amount</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Max Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {configDrawers
                    .filter(d => d.drawer_type === 'physical')
                    .map((drawer) => (
                      <TableRow
                        key={drawer.drawer_id}
                        hover
                        selected={selectedConfigDrawer?.drawer_id === drawer.drawer_id}
                        onClick={() => setSelectedConfigDrawer(drawer)}
                        sx={{
                          bgcolor: selectedConfigDrawer?.drawer_id === drawer.drawer_id ? '#e3f2fd' : 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedConfigDrawer?.drawer_id === drawer.drawer_id}
                            onChange={() => setSelectedConfigDrawer(drawer)}
                          />
                        </TableCell>
                        <TableCell>{drawer.drawer_name}</TableCell>
                        <TableCell>{drawer.is_active ? 'Y' : 'N'}</TableCell>
                        <TableCell>
                          {drawer.is_shared === null ? 'Shared' : (drawer.is_shared ? 'Shared' : 'Single')}
                        </TableCell>
                        <TableCell>{drawer.individual_denominations ? 'Denoms' : 'Balance'}</TableCell>
                        <TableCell>{drawer.blind_count ? 'Blind' : 'Open'}</TableCell>
                        <TableCell>{drawer.electronic_blind_count ? 'Blind' : 'Open'}</TableCell>
                        <TableCell>{formatCurrency(drawer.min_close || 0)}</TableCell>
                        <TableCell>{formatCurrency(drawer.max_close || 0)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* Add Drawer Dialog */}
      <Dialog open={addDrawerDialog} onClose={() => setAddDrawerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Safe / Drawer</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={newDrawerForm.drawer_type}
                onChange={(e) => {
                  const newType = e.target.value;
                  setNewDrawerForm({ 
                    ...newDrawerForm, 
                    drawer_type: newType,
                    // Reset type-specific fields when changing category
                    has_location: newType === 'safe' ? false : false,
                    is_shared: newType === 'physical' ? true : true
                  });
                }}
                label="Category"
              >
                <MenuItem value="physical">Drawer</MenuItem>
                <MenuItem value="safe">Safe</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="How Many"
              type="number"
              value={newDrawerForm.count}
              onChange={(e) => setNewDrawerForm({ ...newDrawerForm, count: parseInt(e.target.value) || 1 })}
              inputProps={{ min: 1, max: 50 }}
              fullWidth
            />
            <TextField
              label="Name (optional, will auto-generate if empty)"
              value={newDrawerForm.drawer_name}
              onChange={(e) => setNewDrawerForm({ ...newDrawerForm, drawer_name: e.target.value })}
              fullWidth
              helperText={newDrawerForm.count > 1 ? "Will auto-add dash and number (e.g., Safe-1, Safe-2)" : ""}
            />
            {/* Type field - different options for safes vs drawers */}
            {newDrawerForm.drawer_type === 'safe' ? (
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newDrawerForm.has_location ? 'repository-location' : 'repository'}
                  onChange={(e) => setNewDrawerForm({ ...newDrawerForm, has_location: e.target.value === 'repository-location' })}
                  label="Type"
                >
                  <MenuItem value="repository">Repository</MenuItem>
                  <MenuItem value="repository-location">Repository/Location</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newDrawerForm.is_shared ? 'shared' : 'single'}
                  onChange={(e) => setNewDrawerForm({ ...newDrawerForm, is_shared: e.target.value === 'shared' })}
                  label="Type"
                >
                  <MenuItem value="single">Single</MenuItem>
                  <MenuItem value="shared">Shared</MenuItem>
                </Select>
              </FormControl>
            )}
            <FormControlLabel
              control={
                <Checkbox
                  checked={newDrawerForm.is_active}
                  onChange={(e) => setNewDrawerForm({ ...newDrawerForm, is_active: e.target.checked })}
                />
              }
              label="Available"
            />
            <TextField
              label="Min Amount"
              type="number"
              value={newDrawerForm.min_close}
              onChange={(e) => setNewDrawerForm({ ...newDrawerForm, min_close: parseFloat(e.target.value) || 0 })}
              fullWidth
            />
            <TextField
              label="Max Amount"
              type="number"
              value={newDrawerForm.max_close}
              onChange={(e) => setNewDrawerForm({ ...newDrawerForm, max_close: parseFloat(e.target.value) || 0 })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDrawerDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddDrawer}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Drawer Dialog */}
      <Dialog open={editDrawerDialog} onClose={() => setEditDrawerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Safe / Drawer</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              value={editDrawerForm.drawer_name}
              onChange={(e) => setEditDrawerForm({ ...editDrawerForm, drawer_name: e.target.value })}
              fullWidth
              disabled={selectedConfigDrawer?.drawer_name === 'Master'}
            />
            {/* Type field - different options for safes vs drawers */}
            {(selectedConfigDrawer?.drawer_type === 'safe' || selectedConfigDrawer?.drawer_type === 'master_safe') ? (
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={editDrawerForm.has_location ? 'repository-location' : 'repository'}
                  onChange={(e) => setEditDrawerForm({ ...editDrawerForm, has_location: e.target.value === 'repository-location' })}
                  label="Type"
                >
                  <MenuItem value="repository">Repository</MenuItem>
                  <MenuItem value="repository-location">Repository/Location</MenuItem>
                </Select>
              </FormControl>
            ) : selectedConfigDrawer?.drawer_type === 'physical' ? (
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={editDrawerForm.is_shared ? 'shared' : 'single'}
                  onChange={(e) => setEditDrawerForm({ ...editDrawerForm, is_shared: e.target.value === 'shared' })}
                  label="Type"
                >
                  <MenuItem value="single">Single</MenuItem>
                  <MenuItem value="shared">Shared</MenuItem>
                </Select>
              </FormControl>
            ) : null}
            <FormControlLabel
              control={
                <Checkbox
                  checked={editDrawerForm.is_active}
                  onChange={(e) => setEditDrawerForm({ ...editDrawerForm, is_active: e.target.checked })}
                  disabled={selectedConfigDrawer?.drawer_name === 'Master' || (selectedConfigDrawer && activeSessions.some(s => s.drawer_id === selectedConfigDrawer.drawer_id))}
                />
              }
              label="Available"
            />
            <TextField
              label="Min Amount"
              type="number"
              value={editDrawerForm.min_close || 0}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                setEditDrawerForm({ ...editDrawerForm, min_close: isNaN(val) ? 0 : val });
              }}
              inputProps={{ step: '0.01' }}
              fullWidth
            />
            <TextField
              label="Max Amount"
              type="number"
              value={editDrawerForm.max_close || 0}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                setEditDrawerForm({ ...editDrawerForm, max_close: isNaN(val) ? 0 : val });
              }}
              inputProps={{ step: '0.01' }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDrawerDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEditDrawer}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Location Transfer Dialog */}
      <Dialog open={locationTransferDialog} onClose={handleCancelLocationTransfer} maxWidth="sm" fullWidth>
        <DialogTitle>Transfer Items from Safe Location</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Items exist in the safe location "{selectedConfigDrawer?.drawer_name}". Please select a location to transfer them to.
            </Alert>
            <FormControl fullWidth required>
              <InputLabel>Transfer Items To</InputLabel>
              <Select
                value={transferLocationTo}
                onChange={(e) => setTransferLocationTo(e.target.value)}
                label="Transfer Items To"
              >
                {availableLocations.map((location) => (
                  <MenuItem key={location.location_id} value={location.location}>
                    {location.location}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              If you cancel, the location will remain enabled for this safe.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelLocationTransfer}>Cancel</Button>
          <Button variant="contained" onClick={handleLocationTransfer} disabled={!transferLocationTo}>
            Transfer and Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Drawer Dialog */}
      <Dialog open={deleteDrawerDialog} onClose={() => setDeleteDrawerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Safe / Drawer</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to delete "{selectedConfigDrawer?.drawer_name}"?
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This action cannot be undone. Make sure the drawer is not currently open.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDrawerDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteDrawer}>Delete</Button>
        </DialogActions>
      </Dialog>

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
                    setIsElectronicBlindCount(isSafe ? drawerElectronicBlindCountPrefs.safe : drawerElectronicBlindCountPrefs.drawers);
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
                          {!isElectronicBlindCount && <th colSpan={2} style={{ textAlign: 'center' }}>Expected</th>}
                        </tr>
                        <tr>
                          <th></th>
                          <th style={{ textAlign: 'center', fontSize: '0.75rem' }}>Qty</th>
                          <th style={{ textAlign: 'right', fontSize: '0.75rem' }}>Amt</th>
                          {!isElectronicBlindCount && <th style={{ textAlign: 'center', fontSize: '0.75rem' }}>Qty</th>}
                          {!isElectronicBlindCount && <th style={{ textAlign: 'right', fontSize: '0.75rem' }}>Amt</th>}
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
                              {!isElectronicBlindCount && <td style={{ textAlign: 'center' }}>{expected.expected_qty}</td>}
                              {!isElectronicBlindCount && <td style={{ textAlign: 'right' }}>{formatCurrency(expected.expected_amount)}</td>}
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

      {/* Enhanced Transfer Dialog */}
      <Dialog
        open={transferDialog}
        onClose={() => {
          setTransferDialog(false);
          resetTransferForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwapHorizIcon />
            Transfer Between Drawers/Safes
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Source and Destination Selection */}
            <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
              {/* Source Selection */}
              <Grid item xs={5}>
                <FormControl fullWidth>
                  <InputLabel>Source (From)</InputLabel>
                  <Select
                    value={transferSource?.session_id || ''}
                    onChange={(e) => {
                      const session = allActiveSessions.find(s => s.session_id === e.target.value);
                      setTransferSource(session || null);
                    }}
                    label="Source (From)"
                  >
                    {allActiveSessions
                      .filter(session => {
                        // Can't be same as destination
                        if (transferDestination && session.session_id === transferDestination.session_id) return false;
                        return true;
                      })
                      .map((session) => (
                        <MenuItem key={session.session_id} value={session.session_id}>
                          {session.drawer_name}
                          {session.drawer_type === 'physical' && ` - ${session.employee_name}`}
                          {` (${formatCurrency(session.current_expected_balance || 0)})`}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Arrow */}
              <Grid item xs={2} sx={{ textAlign: 'center' }}>
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  color: 'primary.main'
                }}>
                  <ArrowForwardIcon sx={{ fontSize: 48 }} />
                  <Typography variant="caption" color="text.secondary">Transfer</Typography>
                </Box>
              </Grid>

              {/* Destination Selection */}
              <Grid item xs={5}>
                <FormControl fullWidth>
                  <InputLabel>Destination (To)</InputLabel>
                  <Select
                    value={transferDestination?.session_id || ''}
                    onChange={(e) => {
                      const session = allActiveSessions.find(s => s.session_id === e.target.value);
                      setTransferDestination(session || null);
                    }}
                    label="Destination (To)"
                  >
                    {allActiveSessions
                      .filter(session => {
                        // Can't be same as source
                        if (transferSource && session.session_id === transferSource.session_id) return false;
                        // Apply transfer rules
                        if (transferSource) {
                          const allowedTargets = {
                            'physical': ['physical', 'safe'],
                            'safe': ['physical', 'master_safe'],
                            'master_safe': ['safe']
                          };
                          return allowedTargets[transferSource.drawer_type]?.includes(session.drawer_type) || false;
                        }
                        return true;
                      })
                      .map((session) => (
                        <MenuItem key={session.session_id} value={session.session_id}>
                          {session.drawer_name}
                          {session.drawer_type === 'physical' && ` - ${session.employee_name}`}
                          {` (${formatCurrency(session.current_expected_balance || 0)})`}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Transfer hierarchy note */}
            {transferSource && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  {transferSource.drawer_type === 'physical' && 'Physical drawers can transfer to: Physical Drawers, Safe'}
                  {transferSource.drawer_type === 'safe' && 'Safe can transfer to: Physical Drawers, Master Safe'}
                  {transferSource.drawer_type === 'master_safe' && 'Master Safe can transfer to: Safe'}
                </Typography>
              </Alert>
            )}

            {/* Tender Entry Section - shown once both source and destination are selected */}
            {transferSource && transferDestination && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                {/* Cash Section with Denominations */}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                  Cash {(drawerUsesDenominations(transferSource.drawer_type) || drawerUsesDenominations(transferDestination.drawer_type)) && '(Denominations Required)'}
                </Typography>

                {(drawerUsesDenominations(transferSource.drawer_type) || drawerUsesDenominations(transferDestination.drawer_type)) ? (
                  <Box component="table" sx={{ width: '100%', mb: 3, borderCollapse: 'collapse', '& td, & th': { p: 0.5, fontSize: '0.9rem' } }}>
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
                          <td style={{ width: '80px' }}>{item.label}</td>
                          <td style={{ width: '100px' }}>
                            <TextField
                              type="number"
                              size="small"
                              value={transferDenominations[item.field] || 0}
                              onChange={(e) => setTransferDenominations(prev => ({
                                ...prev,
                                [item.field]: parseInt(e.target.value) || 0
                              }))}
                              inputProps={{ min: 0, style: { textAlign: 'center', width: '60px', padding: '6px' } }}
                              sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {formatCurrency((transferDenominations[item.field] || 0) * item.value)}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: '2px solid #ccc', fontWeight: 'bold' }}>
                        <td colSpan={2}>Cash Total:</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(calculateDenominationTotal(transferDenominations))}</td>
                      </tr>
                    </tbody>
                  </Box>
                ) : (
                  <TextField
                    label="Cash Amount"
                    type="number"
                    size="small"
                    fullWidth
                    value={transferTenderAmounts.cash || ''}
                    onChange={(e) => setTransferTenderAmounts(prev => ({
                      ...prev,
                      cash: e.target.value
                    }))}
                    inputProps={{ min: 0, step: '0.01' }}
                    sx={{ mb: 2 }}
                  />
                )}

                {/* Other Tenders Section */}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>Other Tenders</Typography>
                <Grid container spacing={2}>
                  {/* Physical tenders */}
                  {physicalPaymentMethods.map(method => (
                    <Grid item xs={6} key={method.method_value}>
                      <TextField
                        label={method.method_name}
                        type="number"
                        size="small"
                        fullWidth
                        value={transferTenderAmounts[method.method_value] || ''}
                        onChange={(e) => setTransferTenderAmounts(prev => ({
                          ...prev,
                          [method.method_value]: e.target.value
                        }))}
                        inputProps={{ min: 0, step: '0.01' }}
                      />
                    </Grid>
                  ))}
                  {/* Electronic tenders */}
                  {electronicPaymentMethods.map(method => (
                    <Grid item xs={6} key={method.method_value}>
                      <TextField
                        label={method.method_name}
                        type="number"
                        size="small"
                        fullWidth
                        value={transferTenderAmounts[method.method_value] || ''}
                        onChange={(e) => setTransferTenderAmounts(prev => ({
                          ...prev,
                          [method.method_value]: e.target.value
                        }))}
                        inputProps={{ min: 0, step: '0.01' }}
                      />
                    </Grid>
                  ))}
                </Grid>

                {/* Total */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ textAlign: 'center' }}>
                    Total Transfer: {formatCurrency(
                      calculateDenominationTotal(transferDenominations) +
                      Object.values(transferTenderAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
                    )}
                  </Typography>
                </Box>

                {/* Notes */}
                <TextField
                  label="Transfer Notes (Optional)"
                  fullWidth
                  multiline
                  rows={2}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  sx={{ mt: 2 }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTransferDialog(false);
            resetTransferForm();
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            variant="contained"
            color="primary"
            disabled={!transferSource || !transferDestination || isStoreClosed}
          >
            Complete Transfer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bank Deposit Dialog */}
      <Dialog
        open={bankDepositDialog}
        onClose={() => {
          setBankDepositDialog(false);
          resetBankDepositForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalanceIcon />
            Bank Deposit from Master Safe
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Bank Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Bank</InputLabel>
              <Select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                label="Select Bank"
              >
                {banks.map((bank) => (
                  <MenuItem key={bank.bank_id} value={bank.bank_id}>
                    {bank.bank_name} {bank.is_default && '(Default)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Deposit Amount */}
            <TextField
              fullWidth
              label="Deposit Amount"
              type="number"
              value={bankDepositAmount}
              onChange={(e) => setBankDepositAmount(e.target.value)}
              inputProps={{ min: 0, step: '0.01' }}
              sx={{ mb: 2 }}
              required
            />

            {/* Reference Number */}
            <TextField
              fullWidth
              label="Bank Reference / Confirmation Number (Optional)"
              value={bankDepositReference}
              onChange={(e) => setBankDepositReference(e.target.value)}
              sx={{ mb: 2 }}
            />

            {/* Notes */}
            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={2}
              value={bankDepositNotes}
              onChange={(e) => setBankDepositNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setBankDepositDialog(false);
            resetBankDepositForm();
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleBankDeposit}
            variant="contained"
            color="primary"
            disabled={!selectedBank || !bankDepositAmount || parseFloat(bankDepositAmount) <= 0 || isStoreClosed}
          >
            Complete Deposit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bank Withdrawal Dialog */}
      <Dialog
        open={bankWithdrawalDialog}
        onClose={() => {
          setBankWithdrawalDialog(false);
          resetBankWithdrawalForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalanceIcon />
            Bank Withdrawal to Master Safe
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Bank Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Bank</InputLabel>
              <Select
                value={selectedWithdrawalBank}
                onChange={(e) => setSelectedWithdrawalBank(e.target.value)}
                label="Select Bank"
              >
                {banks.map((bank) => (
                  <MenuItem key={bank.bank_id} value={bank.bank_id}>
                    {bank.bank_name} {bank.is_default && '(Default)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Withdrawal Amount */}
            <TextField
              fullWidth
              label="Withdrawal Amount"
              type="number"
              value={bankWithdrawalAmount}
              onChange={(e) => setBankWithdrawalAmount(e.target.value)}
              inputProps={{ min: 0, step: '0.01' }}
              sx={{ mb: 2 }}
              required
            />

            {/* Reference Number */}
            <TextField
              fullWidth
              label="Bank Reference / Confirmation Number (Optional)"
              value={bankWithdrawalReference}
              onChange={(e) => setBankWithdrawalReference(e.target.value)}
              sx={{ mb: 2 }}
            />

            {/* Notes */}
            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={2}
              value={bankWithdrawalNotes}
              onChange={(e) => setBankWithdrawalNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setBankWithdrawalDialog(false);
            resetBankWithdrawalForm();
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleBankWithdrawal}
            variant="contained"
            color="primary"
            disabled={!selectedWithdrawalBank || !bankWithdrawalAmount || parseFloat(bankWithdrawalAmount) <= 0 || isStoreClosed}
          >
            Complete Withdrawal
          </Button>
        </DialogActions>
      </Dialog>

      {/* Petty Cash Payout Dialog */}
      <Dialog
        open={pettyCashDialog}
        onClose={() => {
          setPettyCashDialog(false);
          resetPettyCashForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MoneyIcon />
            Petty Cash Payout
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Source Session Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Source Drawer/Safe</InputLabel>
              <Select
                value={pettyCashSourceSession?.session_id || ''}
                onChange={(e) => {
                  const session = allActiveSessions.find(s => s.session_id === e.target.value);
                  setPettyCashSourceSession(session || null);
                  // Reset denominations when source changes
                  setPettyCashDenominations({
                    bill_100: 0, bill_50: 0, bill_20: 0, bill_10: 0, bill_5: 0,
                    coin_2: 0, coin_1: 0, coin_0_25: 0, coin_0_10: 0, coin_0_05: 0
                  });
                }}
                label="Source Drawer/Safe"
              >
                {allActiveSessions.map((session) => (
                  <MenuItem key={session.session_id} value={session.session_id}>
                    {session.drawer_name} ({formatCurrency(session.current_expected_balance || 0)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Expense Account Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Expense Account</InputLabel>
              <Select
                value={selectedPettyCashAccount}
                onChange={(e) => setSelectedPettyCashAccount(e.target.value)}
                label="Expense Account"
              >
                {pettyCashAccounts.map((account) => (
                  <MenuItem key={account.account_id} value={account.account_id}>
                    {account.account_name} {account.account_code && `(${account.account_code})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Amount Entry - denominations or simple input based on drawer type */}
            {pettyCashSourceSession && (
              (pettyCashSourceSession.drawer_type === 'physical' ||
               ((pettyCashSourceSession.drawer_type === 'safe' || pettyCashSourceSession.drawer_type === 'master_safe') && drawerIndividualDenominationsPrefs.safe)) ? (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    Enter Payout Amount by Denomination
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Denomination</TableCell>
                          <TableCell align="center">Count</TableCell>
                          <TableCell align="right">Subtotal</TableCell>
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
                          { label: '25¢', field: 'coin_0_25', value: 0.25 },
                          { label: '10¢', field: 'coin_0_10', value: 0.10 },
                          { label: '5¢', field: 'coin_0_05', value: 0.05 },
                        ].map((item) => (
                          <TableRow key={item.field}>
                            <TableCell>{item.label}</TableCell>
                            <TableCell align="center">
                              <TextField
                                type="number"
                                size="small"
                                inputProps={{ min: 0, style: { textAlign: 'center' } }}
                                sx={{ width: 80 }}
                                value={pettyCashDenominations[item.field] || 0}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setPettyCashDenominations(prev => ({ ...prev, [item.field]: val }));
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency((pettyCashDenominations[item.field] || 0) * item.value)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={2}><strong>Total Payout</strong></TableCell>
                          <TableCell align="right">
                            <strong>{formatCurrency(calculateDenominationTotal(pettyCashDenominations))}</strong>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <TextField
                  fullWidth
                  label="Payout Amount"
                  type="number"
                  value={pettyCashAmount}
                  onChange={(e) => setPettyCashAmount(e.target.value)}
                  inputProps={{ min: 0, step: '0.01' }}
                  sx={{ mb: 2 }}
                  required
                />
              )
            )}

            {/* Invoice/Receipt Number */}
            <TextField
              fullWidth
              label="Invoice / Receipt Number (Optional)"
              value={pettyCashInvoice}
              onChange={(e) => setPettyCashInvoice(e.target.value)}
              sx={{ mb: 2 }}
            />

            {/* Description */}
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={pettyCashDescription}
              onChange={(e) => setPettyCashDescription(e.target.value)}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPettyCashDialog(false);
            resetPettyCashForm();
          }}>
            Cancel
          </Button>
          <Button
            onClick={handlePettyCashPayout}
            variant="contained"
            color="primary"
            disabled={
              !selectedPettyCashAccount ||
              !pettyCashDescription.trim() ||
              !pettyCashSourceSession ||
              isStoreClosed ||
              (pettyCashSourceSession && (
                (pettyCashSourceSession.drawer_type === 'physical' ||
                 ((pettyCashSourceSession.drawer_type === 'safe' || pettyCashSourceSession.drawer_type === 'master_safe') && drawerIndividualDenominationsPrefs.safe))
                  ? calculateDenominationTotal(pettyCashDenominations) <= 0
                  : (!pettyCashAmount || parseFloat(pettyCashAmount) <= 0)
              ))
            }
          >
            Complete Payout
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Inter-Store Transfer Dialog */}
      <Dialog
        open={interStoreTransferDialog}
        onClose={() => setInterStoreTransferDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StoreIcon />
            Send Inter-Store Transfer
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Source info */}
            {interStoreTransferSourceSession && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">From</Typography>
                <Typography variant="body1">
                  {interStoreTransferSourceSession.drawer_name} - {currentStore?.store_name || 'This Store'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Balance: {formatCurrency(interStoreTransferSourceSession.current_expected_balance || 0)}
                </Typography>
              </Box>
            )}

            {/* Destination Store Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Destination Store</InputLabel>
              <Select
                value={selectedDestinationStore}
                onChange={(e) => setSelectedDestinationStore(e.target.value)}
                label="Destination Store"
              >
                {stores.filter(s => !s.is_current_store && s.is_active).map((store) => (
                  <MenuItem key={store.store_id} value={store.store_id}>
                    {store.store_name} {store.store_code && `(${store.store_code})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Transfer Amount */}
            <TextField
              fullWidth
              label="Transfer Amount"
              type="number"
              value={interStoreTransferAmount}
              onChange={(e) => setInterStoreTransferAmount(e.target.value)}
              inputProps={{ min: 0, step: '0.01' }}
              sx={{ mb: 2 }}
              required
            />

            {/* Notes */}
            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={2}
              value={interStoreTransferNotes}
              onChange={(e) => setInterStoreTransferNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInterStoreTransferDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSendInterStoreTransfer}
            variant="contained"
            color="primary"
            disabled={
              !selectedDestinationStore ||
              !interStoreTransferSourceSession ||
              isStoreClosed ||
              !interStoreTransferAmount ||
              parseFloat(interStoreTransferAmount) <= 0
            }
          >
            Send Transfer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receive Inter-Store Transfer Dialog */}
      <Dialog
        open={receiveInterStoreDialog}
        onClose={() => setReceiveInterStoreDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StoreIcon />
            Receive Inter-Store Transfer
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {pendingInterStoreTransfers.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No pending inter-store transfers to receive.
              </Typography>
            ) : (
              <>
                {/* Pending Transfers List */}
                <Typography variant="subtitle1" gutterBottom>
                  Select a Transfer to Receive
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox"></TableCell>
                        <TableCell>Reference</TableCell>
                        <TableCell>From Store</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Sent By</TableCell>
                        <TableCell>Sent At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingInterStoreTransfers.map((transfer) => (
                        <TableRow
                          key={transfer.transfer_id}
                          hover
                          selected={selectedPendingTransfer?.transfer_id === transfer.transfer_id}
                          onClick={() => setSelectedPendingTransfer(transfer)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell padding="checkbox">
                            <input
                              type="radio"
                              checked={selectedPendingTransfer?.transfer_id === transfer.transfer_id}
                              onChange={() => setSelectedPendingTransfer(transfer)}
                            />
                          </TableCell>
                          <TableCell>{transfer.reference_number}</TableCell>
                          <TableCell>{transfer.source_store_name}</TableCell>
                          <TableCell>{formatCurrency(transfer.amount)}</TableCell>
                          <TableCell>{transfer.sent_by_name}</TableCell>
                          <TableCell>{new Date(transfer.sent_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Selected transfer details */}
                {selectedPendingTransfer && (
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Transfer Details
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Reference</Typography>
                        <Typography>{selectedPendingTransfer.reference_number}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Amount</Typography>
                        <Typography>{formatCurrency(selectedPendingTransfer.amount)}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">Notes</Typography>
                        <Typography>{selectedPendingTransfer.send_notes || 'No notes'}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Destination Selection */}
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Deposit Into</InputLabel>
                  <Select
                    value={receiveDestinationSession}
                    onChange={(e) => setReceiveDestinationSession(e.target.value)}
                    label="Deposit Into"
                  >
                    {allActiveSessions.map((session) => (
                      <MenuItem key={session.session_id} value={session.session_id}>
                        {session.drawer_name} ({formatCurrency(session.current_expected_balance || 0)})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Notes */}
                <TextField
                  fullWidth
                  label="Receive Notes (Optional)"
                  multiline
                  rows={2}
                  value={receiveInterStoreNotes}
                  onChange={(e) => setReceiveInterStoreNotes(e.target.value)}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiveInterStoreDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReceiveInterStoreTransfer}
            variant="contained"
            color="primary"
            disabled={
              !selectedPendingTransfer ||
              !receiveDestinationSession ||
              isStoreClosed
            }
          >
            Receive Transfer
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

      {/* Quick Cash Drawer Report Dialog - Activity Journal */}
      <Dialog open={quickReportDialog} onClose={() => { setQuickReportDialog(false); }} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Quick Drawer Report</Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date().toLocaleDateString()}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {!sessionDetails ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <MoneyIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Drawer Open
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The current employee does not have a drawer open. Open a drawer to view the quick report.
              </Typography>
            </Box>
          ) : (() => {
            // Build chronological activity entries
            const session = sessionDetails.session;
            const txns = sessionDetails.transactions || [];
            const adjs = sessionDetails.adjustments || [];
            const sessionIsSafe = session.drawer_type === 'safe' || session.drawer_type === 'master_safe';
            const sessionBlindCount = sessionIsSafe ? drawerBlindCountPrefs.safe : drawerBlindCountPrefs.drawers;
            const showRunningBalance = !sessionBlindCount || session.status === 'closed';

            const activities = [
              { time: session.opened_at, activityType: 'drawer_opened', label: 'Drawer Opened', amount: parseFloat(session.opening_balance), details: `Opened by ${session.employee_name}` },
              ...txns.map(t => ({
                time: t.created_at,
                activityType: t.transaction_type,
                label: t.transaction_type 
                  ? t.transaction_type.charAt(0).toUpperCase() + t.transaction_type.slice(1)
                  : 'Transaction',
                amount: parseFloat(t.amount || 0), // Cash amount (0 for non-cash transactions)
                totalAmount: parseFloat(t.total_amount || 0), // Total transaction amount
                details: t.item_descriptions || t.transaction_id, // Show item descriptions or transaction_id
                transaction_id: t.transaction_id,
              })),
              ...adjs.map(a => ({
                time: a.created_at,
                activityType: a.adjustment_type,
                label: a.adjustment_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                amount: parseFloat(a.amount),
                details: a.reason || '',
                performed_by: a.performed_by_name,
              })),
              ...(session.status === 'closed' ? [{
                time: session.closed_at,
                activityType: 'drawer_closed',
                label: 'Drawer Closed',
                amount: parseFloat(session.actual_balance),
                details: session.discrepancy != null
                  ? `Discrepancy: ${formatCurrency(session.discrepancy)}`
                  : '',
              }] : []),
            ].sort((a, b) => new Date(a.time) - new Date(b.time));

            // Calculate running balances
            let runningBalance = 0;
            const activitiesWithBalance = activities.map((act) => {
              if (act.activityType === 'drawer_opened') {
                runningBalance = act.amount;
              } else if (act.activityType === 'drawer_closed') {
                // Don't change running balance for close event
              } else {
                runningBalance += act.amount;
              }
              return { ...act, runningBalance };
            });

            // Calculate summary totals
            const netTransactions = txns.reduce((sum, t) => sum + parseFloat(t.amount), 0);
            const netAdjustments = adjs.reduce((sum, a) => sum + parseFloat(a.amount), 0);
            const expectedBalance = parseFloat(session.current_expected_balance || session.expected_balance || 0);

            const getActivityColor = (type) => {
              switch (type) {
                case 'drawer_opened': return 'success.main';
                case 'drawer_closed': return 'warning.main';
                case 'sale': return 'success.main';
                case 'refund': return 'error.main';
                case 'pawn': return 'info.main';
                case 'buy': return 'info.main';
                case 'retail': return 'success.main';
                case 'return': return 'error.main';
                case 'repair': return 'warning.main';
                case 'payment': return 'success.main';
                case 'redeem': return 'info.main';
                case 'bank_deposit': return 'error.main';
                case 'bank_withdrawal': return 'success.main';
                case 'petty_cash': return 'error.main';
                case 'transfer': return 'info.main';
                case 'correction': return 'warning.main';
                default: return 'text.primary';
              }
            };

            return (
              <Box sx={{ pt: 1 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h5">{activeSession?.drawer_name}</Typography>
                    <Typography variant="body2" color="text.secondary">{session.employee_name}</Typography>
                  </Box>
                  <Box>{getStatusChip(session.status)}</Box>
                </Box>

                {/* Summary Bar */}
                <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f9f9f9' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">Opening Balance</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{formatCurrency(session.opening_balance)}</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">Net Transactions</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: netTransactions >= 0 ? 'success.main' : 'error.main' }}>
                        {formatCurrency(netTransactions)}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">Net Adjustments</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: netAdjustments >= 0 ? 'success.main' : 'error.main' }}>
                        {formatCurrency(netAdjustments)}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">
                        {session.status === 'closed' ? 'Expected Balance' : 'Current Expected'}
                      </Typography>
                      {showRunningBalance ? (
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {formatCurrency(expectedBalance)}
                        </Typography>
                      ) : (
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.disabled' }}>Hidden</Typography>
                      )}
                    </Grid>
                  </Grid>
                </Paper>

                {/* Closing Summary - only for closed sessions */}
                {session.status === 'closed' && (
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#fff3e0' }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">Actual Balance</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{formatCurrency(session.actual_balance)}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">Discrepancy</Typography>
                        <Box sx={{ mt: 0.5 }}>{getDiscrepancyChip(session.discrepancy)}</Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">Closing Notes</Typography>
                        <Typography variant="body2">{session.closing_notes || 'None'}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                )}

                {/* Activity Journal Table */}
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Activity Journal</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell>Time</TableCell>
                        <TableCell>Activity</TableCell>
                        <TableCell>Details</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        {showRunningBalance && <TableCell align="right">Running Balance</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activitiesWithBalance.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={showRunningBalance ? 6 : 5} align="center" sx={{ py: 3 }}>
                            No activity recorded
                          </TableCell>
                        </TableRow>
                      ) : (
                        activitiesWithBalance.map((act, idx) => (
                          <TableRow
                            key={idx}
                            hover
                            sx={{
                              bgcolor: act.activityType === 'drawer_opened' ? 'rgba(76,175,80,0.05)'
                                : act.activityType === 'drawer_closed' ? 'rgba(255,152,0,0.05)'
                                : 'inherit'
                            }}
                          >
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {formatDateTime(act.time)}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: getActivityColor(act.activityType) }}>
                                {act.label}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                {act.details}
                                {act.performed_by ? ` (${act.performed_by})` : ''}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{
                              fontWeight: 600,
                              color: act.activityType === 'drawer_opened' || act.activityType === 'drawer_closed'
                                ? 'text.primary'
                                : (parseFloat(act.amount || act.totalAmount || 0) >= 0 ? 'success.main' : 'error.main')
                            }}>
                              {act.activityType === 'drawer_closed'
                                ? formatCurrency(act.amount)
                                : act.activityType === 'drawer_opened'
                                  ? formatCurrency(act.amount)
                                  : (() => {
                                      // For transactions, show total amount if cash amount is 0 (non-cash transaction)
                                      const displayAmount = parseFloat(act.amount || 0) === 0 && act.totalAmount 
                                        ? parseFloat(act.totalAmount || 0)
                                        : parseFloat(act.amount || 0);
                                      const sign = displayAmount >= 0 ? '+' : '';
                                      return sign + formatCurrency(displayAmount);
                                    })()
                              }
                            </TableCell>
                            {showRunningBalance && (
                              <TableCell align="right" sx={{ fontWeight: 600 }}>
                                {formatCurrency(act.runningBalance)}
                              </TableCell>
                            )}
                            <TableCell align="center">
                              {act.transaction_id ? (
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => viewQuickReportTransaction(act.transaction_id, act.label)}
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setQuickReportDialog(false); setQuickReportTxnDetail(null); }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Quick Report - Transaction Detail Dialog (read-only) */}
      <Dialog open={!!quickReportTxnDetail} onClose={() => setQuickReportTxnDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Transaction Details: {quickReportTxnDetail?.transaction_id}
            {quickReportTxnDetail?.transaction_type && (
              <Chip label={quickReportTxnDetail.transaction_type} size="small" color="primary" variant="outlined" />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {quickReportTxnLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : quickReportTxnDetail && (
            <Box sx={{ pt: 1 }}>
              {/* Items */}
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Items</Typography>
              {quickReportTxnDetail.items && quickReportTxnDetail.items.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="center">Qty</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quickReportTxnDetail.items.map((item, idx) => {
                        // Use transaction item price if available, otherwise jewelry item price
                        const itemPrice = item.transaction_item_price || item.item_price || item.unit_price || item.price || 0;
                        // Use short_desc, long_desc, or description - prioritize short_desc, then long_desc, then description
                        const itemDescription = item.short_desc || item.long_desc || item.description || item.product_name || item.item_name || 'Item';
                        const itemType = item.transaction_type ? item.transaction_type.charAt(0).toUpperCase() + item.transaction_type.slice(1) : '';
                        return (
                          <TableRow key={idx}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                                {itemType}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {itemDescription}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">{item.quantity || 1}</TableCell>
                            <TableCell align="right">{formatCurrency(itemPrice)}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(item.total_price || itemPrice * (item.quantity || 1))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">No items found</Typography>
              )}

              {/* Payments */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Payments</Typography>
              {quickReportTxnDetail.payments && quickReportTxnDetail.payments.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Method</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quickReportTxnDetail.payments.map((payment, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ textTransform: 'capitalize' }}>{payment.payment_method || payment.method}</TableCell>
                          <TableCell align="right">{formatCurrency(payment.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">No payment details found</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickReportTxnDetail(null)}>Back</Button>
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
