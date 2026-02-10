import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Box,
  Divider,
  Switch,
  Checkbox,
  FormControlLabel,
  Alert,
  Snackbar,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Avatar,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { CloudUpload as UploadIcon, Delete as DeleteIcon, Store as StoreIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import config from '../config';

const API_BASE_URL = config.apiUrl;

// Common timezones for selection
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'America/Vancouver', label: 'Vancouver (PT)' },
  { value: 'America/Edmonton', label: 'Edmonton (MT)' },
  { value: 'America/Winnipeg', label: 'Winnipeg (CT)' },
  { value: 'America/Halifax', label: 'Halifax (AT)' },
  { value: 'America/St_Johns', label: 'St. Johns (NT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
  { value: 'UTC', label: 'UTC' },
];

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2, 0),
  borderRadius: theme.spacing(1),
}));

const ConfigSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ padding: '20px 0' }}>
      {value === index && children}
    </div>
  );
}

function SystemConfig() {
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // Employee Configuration state
  const [employeePermissions, setEmployeePermissions] = useState([]);
  const [employeePermissionsLoading, setEmployeePermissionsLoading] = useState(false);

  // Pricing Calculator state
  const [calculatorSettings, setCalculatorSettings] = useState({
    weight: '',
    purity: '0.999',
    marketPrice: '',
    hasColoredStones: false,
    extraMarkup: '20',
    hasDiamonds: false,
    diamondValue: '0',
    result: null,
  });
  
  // Default config for reset button
  const defaultWeightMarkupConfig = [
    { weight: 5, markup: 150 },
    { weight: 15, markup: 100 },
    { weight: 30, markup: 75 },
    { weight: 60, markup: 50 },
    { weight: 100, markup: 40 },
  ];
  
  // Load config from localStorage
  const loadStoredConfig = () => {
    try {
      const saved = localStorage.getItem('thresholds');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {}
    return defaultWeightMarkupConfig;
  };

  const [weightMarkupConfig, setWeightMarkupConfig] = useState(loadStoredConfig);

  const [generalSettings, setGeneralSettings] = useState({
    businessName: 'Evergreen POS',
    address: '',
    phone: '',
    email: '',
    currency: 'USD',
    timezone: 'UTC',
    logo: null,
    logoFilename: null,
    logoMimetype: null
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [securitySettings, setSecuritySettings] = useState({
    requirePasswordChange: true,
    sessionTimeout: 30,
    maxLoginAttempts: 3,
    twoFactorAuth: false,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    lowStockAlerts: true,
    orderConfirmations: true,
    dailyReports: false,
  });

  const [isCameraEnabled, setIsCameraEnabled] = useState(false);

  const [priceEstimates, setPriceEstimates] = useState({});
  const [preciousMetalNames, setPreciousMetalNames] = useState({});
  const [preciousMetalTypeId, setPreciousMetalTypeId] = useState('');
  const [isLivePricing, setIsLivePricing] = useState(false);
  const [isPerDay, setIsPerDay] = useState(false);
  const [isPerTransaction, setIsPerTransaction] = useState(false);
  const [updateMethod, setUpdateMethod] = useState(null);
  const [spotPrices, setSpotPrices] = useState({});
  const [pawnConfig, setPawnConfig] = useState({
    interest_rate: 0.00,
    term_days: 30,
    frequency_days: 30,
    forfeiture_mode: 'manual'
  });
  const [caratConversion, setCaratConversion] = useState(null);
  const [isCaratConversionEnabled, setIsCaratConversionEnabled] = useState(false);
  const [isInventoryHoldPeriodEnabled, setIsInventoryHoldPeriodEnabled] = useState(false);
  const [gramsInput, setGramsInput] = useState('');
  const [diamondEstimates, setDiamondEstimates] = useState([]);
  const [inventoryHoldPeriod, setInventoryHoldPeriod] = useState({ days: 7, id: null });
  const [numberOfDrawers, setNumberOfDrawers] = useState({ count: 0, id: null });
  const [drawers, setDrawers] = useState([]);
  const [numberOfSafeDrawers, setNumberOfSafeDrawers] = useState({ count: 0, id: null });
  const [numberOfCases, setNumberOfCases] = useState({ count: 0, id: null, label: '' });
  const [cases, setCases] = useState([]);
  // Closing drawer mode (Open Count vs Blind Count)
  const [isBlindCountDrawers, setIsBlindCountDrawers] = useState(true);
  const [isBlindCountSafe, setIsBlindCountSafe] = useState(true);
  // Opening drawer mode (Individual Denominations vs Drawer Total)
  const [isIndividualDenominationsDrawers, setIsIndividualDenominationsDrawers] = useState(false);
  const [isIndividualDenominationsSafe, setIsIndividualDenominationsSafe] = useState(false);
  const [isElectronicBlindCountDrawers, setIsElectronicBlindCountDrawers] = useState(false);
  const [isElectronicBlindCountSafe, setIsElectronicBlindCountSafe] = useState(false);
  const [minClose, setMinClose] = useState(0); // For physical drawers
  const [maxClose, setMaxClose] = useState(0); // For physical drawers
  const [minCloseSafe, setMinCloseSafe] = useState(0); // For safes
  const [maxCloseSafe, setMaxCloseSafe] = useState(0); // For safes
  const [loading, setLoading] = useState(false);
  const [customerColumns, setCustomerColumns] = useState([]);
  const [itemAttributes, setItemAttributes] = useState([]);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeType, setNewAttributeType] = useState('dropdown');
  const [newAttributeValue, setNewAttributeValue] = useState({});
  const [selectedCustomerColumns, setSelectedCustomerColumns] = useState({});
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [customerColumnPreferences, setCustomerColumnPreferences] = useState({});

  const fetchDrawerConfig = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/drawer-config`);
      if (response.data) {
        setNumberOfDrawers({
          count: response.data.number_of_drawers,
          id: response.data.id || null
        });
      }
    } catch (error) {
      console.error('Error fetching drawer config:', error);
      setNumberOfDrawers({ count: 0, id: null });
    }
  };

  const fetchDrawers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/drawers`);
      if (response.data) {
        setDrawers(response.data);
        // Count safe drawers (excluding master_safe)
        const safeDrawers = response.data.filter(d => d.drawer_type === 'safe');
        setNumberOfSafeDrawers({ count: safeDrawers.length, id: null });
      }
    } catch (error) {
      console.error('Error fetching drawers:', error);
      setDrawers([]);
    }
  };

  const fetchCasesConfig = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cases-config`);
      if (response.data) {
        setNumberOfCases({
          count: response.data.number_of_cases,
          id: response.data.id || null,
          label: '', // Label is not persisted, always start with empty
        });
      }
    } catch (error) {
      console.error('Error fetching cases config:', error);
      setNumberOfCases({ count: 0, id: null, label: '' });
    }
  };

  const fetchCases = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cases`);
      if (response.data) {
        setCases(response.data);
      }
    } catch (error) {
      console.error('Error fetching cases:', error);
      setCases([]);
    }
  };

  const fetchBlindCountPreference = async () => {
    try {
      // Fetch all drawer mode settings from drawer-type-config (stored on drawers table)
      const drawerConfigRes = await axios.get(`${API_BASE_URL}/drawer-type-config`);
      const physicalConfig = drawerConfigRes.data.find(c => c.drawer_type === 'physical');
      const safeConfig = drawerConfigRes.data.find(c => c.drawer_type === 'safe');
      setIsBlindCountDrawers(physicalConfig ? physicalConfig.blind_count : true);
      setIsBlindCountSafe(safeConfig ? safeConfig.blind_count : true);
      setIsIndividualDenominationsDrawers(physicalConfig ? physicalConfig.individual_denominations : false);
      setIsIndividualDenominationsSafe(safeConfig ? safeConfig.individual_denominations : false);
      setIsElectronicBlindCountDrawers(physicalConfig ? physicalConfig.electronic_blind_count : false);
      setIsElectronicBlindCountSafe(safeConfig ? safeConfig.electronic_blind_count : false);
    } catch (error) {
      console.error('Error fetching drawer mode preferences:', error);
      setIsBlindCountDrawers(true); // Default to blind count
      setIsBlindCountSafe(true); // Default to blind count
      setIsIndividualDenominationsDrawers(false); // Default to drawer total
      setIsIndividualDenominationsSafe(false); // Default to drawer total
      setIsElectronicBlindCountDrawers(false); // Default to open count
      setIsElectronicBlindCountSafe(false); // Default to open count
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
    } catch (error) {
      console.error('Error fetching min/max close:', error);
      setMinClose(0);
      setMaxClose(0);
      setMinCloseSafe(0);
      setMaxCloseSafe(0);
    }
  };

  // Tax configuration state
  const [provinceTaxRates, setProvinceTaxRates] = useState({
    'AB': { gst: 5, pst: 0, hst: 0 },  // Alberta
    'BC': { gst: 5, pst: 7, hst: 0 },  // British Columbia
    'MB': { gst: 5, pst: 7, hst: 0 },  // Manitoba
    'NB': { gst: 0, pst: 0, hst: 15 }, // New Brunswick
    'NL': { gst: 0, pst: 0, hst: 15 }, // Newfoundland and Labrador
    'NT': { gst: 5, pst: 0, hst: 0 },  // Northwest Territories
    'NS': { gst: 0, pst: 0, hst: 15 }, // Nova Scotia
    'NU': { gst: 5, pst: 0, hst: 0 },  // Nunavut
    'ON': { gst: 0, pst: 0, hst: 13 }, // Ontario
    'PE': { gst: 0, pst: 0, hst: 15 }, // Prince Edward Island
    'QC': { gst: 5, pst: 9.975, hst: 0 }, // Quebec
    'SK': { gst: 5, pst: 6, hst: 0 },  // Saskatchewan
    'YT': { gst: 5, pst: 0, hst: 0 }   // Yukon
  });
  const [selectedProvince, setSelectedProvince] = useState('ON');

  // Linked Account Authorization Template state (one for each link type)
  const [authorizationTemplates, setAuthorizationTemplates] = useState({
    full_access: { id: null, form_title: '', form_content: '', consent_text: '' },
    view_only: { id: null, form_title: '', form_content: '', consent_text: '' },
    limited: { id: null, form_title: '', form_content: '', consent_text: '' }
  });
  const [selectedLinkType, setSelectedLinkType] = useState('full_access');

  // Receipt configuration state
  const [receiptConfig, setReceiptConfig] = useState({
    transaction_receipt: 'Thank you for shopping with us',
    buy_receipt: 'Thank you for shopping with us',
    pawn_receipt: 'Thank you for shopping with us',
    layaway_receipt: 'Thank you for shopping with us',
    return_receipt: 'Thank you for shopping with us',
    refund_receipt: 'Thank you for shopping with us'
  });

  const fetchCustomerHeaderPreferences = async () => {
    try {
      setLoading(true);

      // Fetch all customer preferences (customers + transaction types)
      const allPrefsResponse = await axios.get(`${API_BASE_URL}/customer-preferences/all`);
      const allPreferences = allPrefsResponse.data || [];

      // Find the 'customers' preferences
      const customersRow = allPreferences.find(row => row.header_preferences === 'customers');

      if (customersRow) {
        // Extract all fields that start with 'show_' from the preferences object
        const showFields = Object.keys(customersRow).filter(field => field.startsWith('show_'));

        // Create preferences object for UI state (header preferences)
        const columnPreferences = {};

        showFields.forEach(dbField => {
          const uiField = dbField.replace('show_', '');
          columnPreferences[uiField] = customersRow[dbField];
        });

        // Update selected columns state for header preferences
        setSelectedCustomerColumns(columnPreferences);

        // Generate columns array for the UI (if still needed)
        const uiColumns = showFields.map(dbField => {
          const uiField = dbField.replace('show_', '');
          return {
            name: uiField,
            label: uiField.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            type: getColumnType(uiField),
            selected: customersRow[dbField] || false
          };
        });

        setCustomerColumns(uiColumns);
      }

      // Load transaction type preferences
      const txTypePrefs = {};
      allPreferences.forEach(row => {
        if (row.header_preferences !== 'customers') {
          const txType = row.header_preferences;

          // Extract show_* fields
          Object.keys(row).forEach(key => {
            if (key.startsWith('show_')) {
              const field = key.replace('show_', '');
              const prefKey = `${txType}_${field}`;
              txTypePrefs[prefKey] = row[key];
            }
          });
        }
      });

      // Update transaction type preferences state
      setCustomerColumnPreferences(txTypePrefs);

    } catch (error) {
      console.error('Error fetching customer header preferences:', error);


    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine column type based on field name
  const getColumnType = (fieldName) => {
    if (fieldName.includes('date') || fieldName.includes('expiry')) {
      return 'date';
    } else if (['id', 'height', 'weight'].includes(fieldName) || fieldName.endsWith('_id')) {
      return 'number';
    } else {
      return 'string';
    }
  };

  // Fetch transaction types from the database
  const fetchTransactionTypes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/transaction-types`);
      setTransactionTypes(response.data);
    } catch (error) {
      console.error('Error fetching transaction types:', error);
    }
  };

  // Define available customer columns
  const availableCustomerColumns = [
    { field: 'first_name', label: 'First Name' },
    { field: 'last_name', label: 'Last Name' },
    { field: 'email', label: 'Email' },
    { field: 'phone', label: 'Phone' },
    { field: 'address_line1', label: 'Address Line 1' },
    { field: 'address_line2', label: 'Address Line 2' },
    { field: 'city', label: 'City' },
    { field: 'state', label: 'State' },
    { field: 'postal_code', label: 'Postal Code' },
    { field: 'country', label: 'Country' },
    { field: 'id_type', label: 'ID Type' },
    { field: 'id_number', label: 'ID Number' },
    { field: 'id_expiry_date', label: 'ID Expiry Date' },
    { field: 'date_of_birth', label: 'Date of Birth' },
    { field: 'gender', label: 'Gender' },
    { field: 'height', label: 'Height' },
    { field: 'weight', label: 'Weight' },
    { field: 'status', label: 'Status' },
    { field: 'risk_level', label: 'Risk Level' },
    { field: 'tax_exempt', label: 'Tax Exempt' },
    { field: 'image', label: 'Customer Image' },
    { field: 'id_image_front', label: 'ID Image Front' },
    { field: 'id_image_back', label: 'ID Image Back' },
    { field: 'notes', label: 'Notes' }
  ];

  useEffect(() => {
    const fetchPreciousMetalNames = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/precious_metal_type`);
        const data = response.data;
        const names = {};
        data.forEach(metal => {
          names[metal.id] = metal.type;
        });
        setPreciousMetalNames(names);
      } catch (error) {
        console.error('Error fetching precious metal names:', error);
      }
    };

    const fetchLivePricing = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/live_pricing`);
        const data = response.data;
        setIsLivePricing(data[0].islivepricing);
        setIsPerDay(data[0].per_day);
        setIsPerTransaction(data[0].per_transaction);
      } catch (error) {
        console.error('Error fetching live pricing:', error);
      }
    }
    const fetchSpotPrices = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/spot_prices`);
        const prices = {};
        response.data.forEach(item => {
          prices[item.precious_metal_type_id] = item.spot_price;
        })
        setSpotPrices(prices); 
      } catch (error) {
        console.error('Error fetching spot prices:', error);
      }
    };

    const fetchPriceEstimates = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/price_estimates`);
        const data = response.data;
        const estimates = {};
        data.forEach((estimate) => {
          const metalType = estimate.precious_metal_type_id;
          if (!estimates[metalType]) {
            estimates[metalType] = [];
          }
          estimates[metalType].push(estimate);
        });
        setPriceEstimates(estimates); // Store organized data in state
      } catch (error) {
        console.error('Error fetching price estimates:', error);
      }
    };

    const fetchDiamondEstimates = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/diamond_estimates`);
        setDiamondEstimates(response.data);
      } catch (error) {
        console.error('Error fetching diamond estimates:', error);
        setSnackbar({
          open: true,
          message: 'Failed to fetch diamond estimates',
          severity: 'error',
        });
      }
    };

    const fetchUserPreference = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user_preferences`);
        const cameraPreference = response.data.find(pref => pref.preference_name === 'cameraEnabled');
        setIsCameraEnabled(cameraPreference ? cameraPreference.preference_value === 'true' : false);
        
        const caratConversionPreference = response.data.find(pref => pref.preference_name === 'caratConversion');
        setIsCaratConversionEnabled(caratConversionPreference ? caratConversionPreference.preference_value === 'true' : false);
        
        const inventoryHoldPeriodPreference = response.data.find(pref => pref.preference_name === 'inventoryHoldPeriodEnabled');
        setIsInventoryHoldPeriodEnabled(inventoryHoldPeriodPreference ? inventoryHoldPeriodPreference.preference_value === 'true' : false);
      } catch (error) {
        console.error('Error fetching user preference:', error);
      }
    };

    const fetchCaratConversion = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/carat-conversion`);
        if (response.data && response.data.length > 0) {
          setCaratConversion(response.data[0]);
          setGramsInput(response.data[0].grams.toString());
        }
      } catch (error) {
        console.error('Error fetching carat conversion:', error);
        setSnackbar({
          open: true,
          message: 'Failed to fetch carat conversion data',
          severity: 'error',
        });
      }
    };

  
    const fetchInventoryHoldPeriod = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/inventory-hold-period/config`);
        if (response.data) {
          setInventoryHoldPeriod({
            days: response.data.days,
            id: response.data.id || null
          });
        }
      } catch (error) {
        console.error('Error fetching inventory hold period config:', error);
        // Set default value
        setInventoryHoldPeriod({ days: 7, id: null });
      } finally {
        setLoading(false);
      }
    };

    const fetchTaxConfig = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/tax-config`);
        const taxData = {};
        response.data.forEach(province => {
          taxData[province.province_code] = {
            gst: parseFloat(province.gst_rate) || 0,
            pst: parseFloat(province.pst_rate) || 0,
            hst: parseFloat(province.hst_rate) || 0
          };
        });
        setProvinceTaxRates(taxData);

        // Load selected province from localStorage
        const savedProvince = localStorage.getItem('selectedProvince');
        if (savedProvince) {
          setSelectedProvince(savedProvince);
        }
      } catch (error) {
        console.error('Error fetching tax configuration:', error);
      }
    };

    const fetchAuthorizationTemplate = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/linked-account-authorization-template`);
        if (response.data && Array.isArray(response.data)) {
          // Convert array to object keyed by link_type
          const templatesObj = {};
          response.data.forEach(template => {
            templatesObj[template.link_type] = template;
          });
          setAuthorizationTemplates(templatesObj);
        }
      } catch (error) {
        console.error('Error fetching authorization template:', error);
      }
    };

    const fetchReceiptConfig = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/receipt-config`);
        if (response.data) {
          setReceiptConfig({
            transaction_receipt: response.data.transaction_receipt || 'Thank you for shopping with us',
            buy_receipt: response.data.buy_receipt || 'Thank you for shopping with us',
            pawn_receipt: response.data.pawn_receipt || 'Thank you for shopping with us',
            layaway_receipt: response.data.layaway_receipt || 'Thank you for shopping with us',
            return_receipt: response.data.return_receipt || 'Thank you for shopping with us',
            refund_receipt: response.data.refund_receipt || 'Thank you for shopping with us'
          });
        }
      } catch (error) {
        console.error('Error fetching receipt config:', error);
      }
    };

    const fetchPawnConfig = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/pawn-config`);
        if (response.data) {
          setPawnConfig({
            interest_rate: parseFloat(response.data.interest_rate) || 0.00,
            term_days: parseInt(response.data.term_days) || 30,
            frequency_days: parseInt(response.data.frequency_days) || 30,
            forfeiture_mode: response.data.forfeiture_mode || 'manual'
          });
        }
      } catch (error) {
        console.error('Error fetching pawn config:', error);
      }
    };

    // Fetch data on component mount
    fetchCustomerHeaderPreferences();
    fetchTransactionTypes();
    fetchPreciousMetalNames();
    fetchLivePricing();
    fetchSpotPrices();
    fetchPriceEstimates();
    fetchDiamondEstimates();
    fetchUserPreference();
    fetchCaratConversion();
    fetchInventoryHoldPeriod();
    fetchDrawerConfig();
    fetchDrawers();
    fetchCasesConfig();
    fetchCases();
    fetchBlindCountPreference();
    fetchMinMaxClose();
    fetchTaxConfig();
    fetchAuthorizationTemplate();
    fetchReceiptConfig();
    fetchPawnConfig();
  }, []);
  
  // Fetch employee permissions
  const fetchEmployeePermissions = async () => {
    setEmployeePermissionsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/employees`);
      setEmployeePermissions(response.data);
    } catch (err) {
      console.error('Error fetching employee permissions:', err);
    } finally {
      setEmployeePermissionsLoading(false);
    }
  };

  const buildPermissionPayload = (employee, overrideField, overrideValue) => {
    const get = (field, defaultTrue) => {
      if (field === overrideField) return overrideValue;
      return defaultTrue ? employee[field] !== false : employee[field];
    };
    return {
      trackHours: get('track_hours', true),
      canOpenStore: get('can_open_store', true),
      canOpenDrawer: get('can_open_drawer', true),
      canViewDrawer: get('can_view_drawer', true),
      canViewSafe: get('can_view_safe', true),
      transferAllowedDrawer: get('transfer_allowed_drawer', true),
      transferAllowedSafe: get('transfer_allowed_safe', true),
      transferAllowedBank: get('transfer_allowed_bank', true),
      transferAllowedStore: get('transfer_allowed_store', true),
      transferLimit: overrideField === 'transfer_limit' ? overrideValue : (employee.transfer_limit != null ? employee.transfer_limit : null),
      canPettyCash: get('can_petty_cash', true),
      pettyCashLimit: overrideField === 'petty_cash_limit' ? overrideValue : (employee.petty_cash_limit != null ? employee.petty_cash_limit : null),
      discrepancyThreshold: overrideField === 'discrepancy_threshold' ? overrideValue : (employee.discrepancy_threshold != null ? employee.discrepancy_threshold : null),
    };
  };

  const handlePermissionToggle = async (employeeId, field, currentValue) => {
    // Optimistically update UI
    setEmployeePermissions(prev =>
      prev.map(emp =>
        emp.employee_id === employeeId ? { ...emp, [field]: !currentValue } : emp
      )
    );

    try {
      const employee = employeePermissions.find(e => e.employee_id === employeeId);
      const payload = buildPermissionPayload(employee, field, !currentValue);

      await axios.put(`${API_BASE_URL}/employees/${employeeId}/permissions`, payload);
      setSnackbar({ open: true, message: 'Permission updated', severity: 'success' });
    } catch (err) {
      // Revert on error
      setEmployeePermissions(prev =>
        prev.map(emp =>
          emp.employee_id === employeeId ? { ...emp, [field]: currentValue } : emp
        )
      );
      setSnackbar({ open: true, message: 'Failed to update permission', severity: 'error' });
    }
  };

  const handlePermissionValueChange = async (employeeId, field, value) => {
    const parsedValue = value === '' ? null : parseFloat(value);
    const employee = employeePermissions.find(e => e.employee_id === employeeId);
    const previousValue = employee[field];

    // Optimistically update UI
    setEmployeePermissions(prev =>
      prev.map(emp =>
        emp.employee_id === employeeId ? { ...emp, [field]: parsedValue } : emp
      )
    );

    try {
      const payload = buildPermissionPayload(employee, field, parsedValue);
      await axios.put(`${API_BASE_URL}/employees/${employeeId}/permissions`, payload);
      setSnackbar({ open: true, message: 'Setting updated', severity: 'success' });
    } catch (err) {
      setEmployeePermissions(prev =>
        prev.map(emp =>
          emp.employee_id === employeeId ? { ...emp, [field]: previousValue } : emp
        )
      );
      setSnackbar({ open: true, message: 'Failed to update setting', severity: 'error' });
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Fetch employee permissions when switching to that tab (index 6)
    if (newValue === 6) {
      fetchEmployeePermissions();
    }
  };

  const handleGeneralSettingsChange = (event) => {
    const { name, value } = event.target;
    setGeneralSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSnackbar({
          open: true,
          message: 'Please upload an image file',
          severity: 'error'
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSnackbar({
          open: true,
          message: 'Image size should be less than 5MB',
          severity: 'error'
        });
        return;
      }

      setLogoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/business-info/logo`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setLogoFile(null);
      setLogoPreview(null);
      setGeneralSettings(prev => ({
        ...prev,
        logo: null,
        logoFilename: null,
        logoMimetype: null
      }));

      setSnackbar({
        open: true,
        message: 'Logo removed successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error removing logo:', error);
      setSnackbar({
        open: true,
        message: 'Failed to remove logo',
        severity: 'error'
      });
    }
  };

  const handleSaveBusinessInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      formData.append('business_name', generalSettings.businessName);
      formData.append('email', generalSettings.email);
      formData.append('phone', generalSettings.phone);
      formData.append('address', generalSettings.address);
      formData.append('currency', generalSettings.currency);
      formData.append('timezone', generalSettings.timezone);

      if (logoFile) {
        formData.append('logo', logoFile);
      }

      await axios.put(`${API_BASE_URL}/business-info`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSnackbar({
        open: true,
        message: 'Business information saved successfully',
        severity: 'success'
      });

      // Dispatch event to notify Navbar of business settings change
      window.dispatchEvent(new CustomEvent('businessSettingsUpdated', {
        detail: { timezone: generalSettings.timezone, businessName: generalSettings.businessName }
      }));

      // Clear logo file after successful save
      setLogoFile(null);
    } catch (error) {
      console.error('Error saving business info:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save business information',
        severity: 'error'
      });
    }
  };

  const loadBusinessInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/business-info`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      setGeneralSettings({
        businessName: data.business_name || 'Evergreen POS',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        currency: data.currency || 'USD',
        timezone: data.timezone || 'UTC',
        logo: data.logo,
        logoFilename: data.logo_filename,
        logoMimetype: data.logo_mimetype
      });

      // Set logo preview if exists
      if (data.logo && data.logo_mimetype) {
        setLogoPreview(`data:${data.logo_mimetype};base64,${data.logo}`);
      }
    } catch (error) {
      console.error('Error loading business info:', error);
    }
  };

  const handleSecuritySettingsChange = (event) => {
    const { name, checked, value } = event.target;
    setSecuritySettings(prev => ({
      ...prev,
      [name]: event.target.type === 'checkbox' ? checked : value
    }));
  };

  const handleNotificationSettingsChange = (event) => {
    const { name, checked } = event.target;
    setNotificationSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSpotPriceChange = (event, metalType) => {
    const { name, value } = event.target;
    setSpotPrices((prev) => ({
      ...prev,
      [metalType]: value
    }));
  };

  const handlePriceEstimatesChange = (event, metalType) => {
    const { name, value } = event.target;
    setPreciousMetalTypeId(metalType); // Save the current metal type ID
    setPriceEstimates((prev) => {
      const updatedEstimates = prev[metalType].map((estimate) => 
        estimate.transaction_type === name ? { ...estimate, estimate: Number(value) } : estimate
      );
      return {
        ...prev,
        [metalType]: updatedEstimates,
      };
    });
  };

  const handleDiamondEstimatesChange = async (event, transactionType) => {
    const { value } = event.target;
    const newValue = Number(value);

    // Update local state first for immediate feedback
    setDiamondEstimates(prevEstimates => 
      prevEstimates.map(estimate => 
        estimate.transaction_type === transactionType 
          ? { ...estimate, estimate: newValue }
          : estimate
      )
    );

    try {
      // Then update the server
      await axios.put(`${API_BASE_URL}/diamond_estimates`, {
        transaction_type: transactionType,
        estimate: newValue
      });
    } catch (error) {
      console.error('Error updating diamond estimates:', error);
      // Revert the local state on error
      setDiamondEstimates(prevEstimates => 
        prevEstimates.map(estimate => 
          estimate.transaction_type === transactionType 
            ? { ...estimate, estimate: estimate.estimate }
            : estimate
        )
      );
      setSnackbar({
        open: true,
        message: 'Failed to update diamond estimate',
        severity: 'error',
      });
    }
  };

  const handleSaveSettings = async () => {

    try {
      // Make a PUT request to update spot prices
      const updateSpotPrices = Object.keys(spotPrices).map(metalType => {
        return axios.put(`${API_BASE_URL}/spot_prices`, {
          precious_metal_type_id: metalType,
          spot_price: spotPrices[metalType],
        });
      });
  
      // Wait for all spot price updates to complete
      await Promise.all(updateSpotPrices);

      // Make a PUT request to update price estimates
      const updatePriceEstimates = Object.keys(priceEstimates).map(metalType => {
        return axios.put(`${API_BASE_URL}/price_estimates`, {
          precious_metal_type_id: metalType,
          estimates: priceEstimates[metalType],
        });
      });
  
      // Wait for all price estimate updates to complete
      await Promise.all(updatePriceEstimates);
      
      // Save customer header preferences
      try {
        // 1. Save header preferences for 'customers' context
        const customersPreferences = {};
        Object.keys(selectedCustomerColumns).forEach(uiField => {
          const dbField = 'show_' + uiField;
          customersPreferences[dbField] = selectedCustomerColumns[uiField];
        });

        await axios.put(`${API_BASE_URL}/customer-preferences/update-by-context`, {
          header_preferences: 'customers',
          preferences: customersPreferences
        });

        // 2. Save preferences for each transaction type
        const transactionTypeUpdates = transactionTypes.map(async (txType) => {
          const txPreferences = {};

          // Extract preferences for this transaction type from customerColumnPreferences
          Object.keys(customerColumnPreferences).forEach(key => {
            // Key format: ${type}_${field}
            if (key.startsWith(`${txType.type}_`)) {
              const field = key.substring(txType.type.length + 1); // Remove "${type}_" prefix
              const dbField = 'show_' + field;
              txPreferences[dbField] = customerColumnPreferences[key];
            }
          });

          // Only update if there are preferences to save
          if (Object.keys(txPreferences).length > 0) {
            return axios.put(`${API_BASE_URL}/customer-preferences/update-by-context`, {
              header_preferences: txType.type,
              preferences: txPreferences
            });
          }
        });

        // Wait for all transaction type updates to complete
        await Promise.all(transactionTypeUpdates.filter(Boolean));
      } catch (headerError) {
        console.error('Error saving customer header preferences:', headerError);
      }

      // Save pawn configuration
      try {
        const pawnConfigPayload = {
          interest_rate: parseFloat(pawnConfig.interest_rate),
          term_days: parseInt(pawnConfig.term_days),
          frequency_days: parseInt(pawnConfig.frequency_days),
          forfeiture_mode: pawnConfig.forfeiture_mode
        };
        await axios.put(`${API_BASE_URL}/pawn-config`, pawnConfigPayload);
      } catch (pawnError) {
        console.error('Error saving pawn config:', pawnError);
      }

      setSnackbar({
        open: true,
        message: 'Settings updated successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      const errorMessage = error.response?.data?.message || 'An unexpected error occurred.';
      setSnackbar({
        open: true,
        message: 'Failed to update settings: ' + errorMessage,
        severity: 'error',
      });
    }
  };

  const handleLivePricingChange = async (event) => {
    const newLivePricing = event.target.checked;
    const selectedValue = event.target.value;

    const newPerDay = selectedValue === 'daily';
    const newPerTransaction = selectedValue === 'transaction';
    setIsLivePricing(newLivePricing);
    setIsPerDay(newPerDay);
    setIsPerTransaction(newPerTransaction);

    try {
      const response = await axios.put(`${API_BASE_URL}/live_pricing`, {
        isLivePricing: newLivePricing,
        per_day: newPerDay,
        per_transaction: newPerTransaction
      });
    } catch (error) {
      console.error('Error updating live pricing:', error);
    }
  };

  const handleCameraToggle = async (event) => {
    const newValue = event.target.checked;
    setIsCameraEnabled(newValue);
    try {
      await axios.put(`${API_BASE_URL}/user_preferences`, {
        preference_name: 'cameraEnabled',
        preference_value: newValue.toString()
      });
    } catch (error) {
      console.error('Error updating camera preference:', error);
      setIsCameraEnabled(!newValue); // Revert on error
      setSnackbar({
        open: true,
        message: 'Failed to update camera settings',
        severity: 'error',
      });
    }
  };

  const handleCaratConversionUpdate = async (newGrams) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/carat-conversion`, {
        grams: parseFloat(newGrams)
      });
      setCaratConversion(response.data);
      setGramsInput(response.data.grams.toString());
      setSnackbar({
        open: true,
        message: 'Carat conversion updated successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error updating carat conversion:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update carat conversion',
        severity: 'error',
      });
    }
  };

  const handleCaratConversionToggle = async (event) => {
    const isEnabled = event.target.checked;
    setIsCaratConversionEnabled(isEnabled);
    try {
      await axios.put(`${API_BASE_URL}/user_preferences`, {
        preference_name: 'caratConversion',
        preference_value: isEnabled.toString()
      });
    } catch (error) {
      console.error('Error updating carat conversion preference:', error);
      // Revert on error
      setIsCaratConversionEnabled(!isEnabled);
      setSnackbar({
        open: true,
        message: 'Failed to update carat conversion preference',
        severity: 'error',
      });
    }
  };

  const handleInventoryHoldPeriodToggle = async (event) => {
    const isEnabled = event.target.checked;
    setIsInventoryHoldPeriodEnabled(isEnabled);
    try {
      await axios.put(`${API_BASE_URL}/user_preferences`, {
        preference_name: 'inventoryHoldPeriodEnabled',
        preference_value: isEnabled.toString()
      });
    } catch (error) {
      console.error('Error updating inventory hold period preference:', error);
      // Revert on error
      setIsInventoryHoldPeriodEnabled(!isEnabled);
      setSnackbar({
        open: true,
        message: 'Failed to update inventory hold period preference',
        severity: 'error',
      });
    }
  };

  const handleInventoryHoldPeriodChange = async (event) => {
    const newDays = parseInt(event.target.value);
    if (newDays <= 0) {
      setSnackbar({
        open: true,
        message: 'Hold period must be at least 1 day',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await axios.put(`${API_BASE_URL}/inventory-hold-period/config`, {
        days: newDays
      });

      setInventoryHoldPeriod({
        days: response.data.days,
        id: response.data.id
      });

      setSnackbar({
        open: true,
        message: `Inventory hold period updated successfully. Items in HOLD status will become AVAILABLE after ${newDays} days.`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating inventory hold period:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update inventory hold period configuration',
        severity: 'error'
      });
    }
  };

  const handlePawnConfigChange = async (field, value) => {
    // Update state
    const updatedConfig = {
      ...pawnConfig,
      [field]: value
    };
    setPawnConfig(updatedConfig);

    // Auto-save to database
    try {
      const response = await axios.put(`${API_BASE_URL}/pawn-config`, {
        interest_rate: parseFloat(updatedConfig.interest_rate),
        term_days: parseInt(updatedConfig.term_days),
        frequency_days: parseInt(updatedConfig.frequency_days),
        forfeiture_mode: updatedConfig.forfeiture_mode
      });

      setSnackbar({
        open: true,
        message: 'Pawn configuration saved',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error saving pawn config:', error);
      console.error('Error details:', error.response?.data);
      setSnackbar({
        open: true,
        message: 'Failed to save pawn configuration',
        severity: 'error',
      });
    }
  };

  const handleNumberOfDrawersChange = async (event) => {
    const newCount = parseInt(event.target.value);
    if (newCount < 0) {
      setSnackbar({
        open: true,
        message: 'Number of drawers cannot be negative',
        severity: 'error'
      });
      return;
    }

    if (newCount > 50) {
      setSnackbar({
        open: true,
        message: 'Number of drawers cannot exceed 50',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await axios.put(`${API_BASE_URL}/drawer-config`, {
        number_of_drawers: newCount
      });

      setNumberOfDrawers({
        count: response.data.number_of_drawers,
        id: response.data.id
      });

      // Refresh the drawers list
      await fetchDrawers();

      const drawerMessage = newCount === 0
        ? 'No physical drawers configured.'
        : `${newCount} physical drawer${newCount > 1 ? 's' : ''} created (Drawer 1${newCount > 1 ? ` to Drawer ${newCount}` : ''}).`;

      setSnackbar({
        open: true,
        message: `Cash drawer configuration updated. ${drawerMessage}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating number of drawers:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update number of drawers configuration',
        severity: 'error'
      });
    }
  };

  const handleNumberOfSafeDrawersChange = async (event) => {
    const newCount = parseInt(event.target.value);
    if (newCount < 0) {
      setSnackbar({
        open: true,
        message: 'Number of safe drawers cannot be negative',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await axios.put(`${API_BASE_URL}/safe-drawers-config`, {
        number_of_safe_drawers: newCount
      });

      setNumberOfSafeDrawers({
        count: response.data.number_of_safe_drawers || newCount,
        id: response.data.id || null
      });

      // Refresh the drawers list
      await fetchDrawers();

      const drawerMessage = newCount === 0
        ? 'No safe drawers configured.'
        : `${newCount} safe drawer${newCount > 1 ? 's' : ''} created.`;

      setSnackbar({
        open: true,
        message: `Safe drawer configuration updated. ${drawerMessage}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating number of safe drawers:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update safe drawer configuration',
        severity: 'error'
      });
    }
  };

  const handleNumberOfCasesChange = async (event) => {
    const casesToAdd = parseInt(event.target.value);

    if (casesToAdd < 0) {
      setSnackbar({
        open: true,
        message: 'Number of cases cannot be negative',
        severity: 'error'
      });
      return;
    }

    if (casesToAdd === 0) {
      // Reset the input field
      setNumberOfCases(prev => ({ ...prev, count: 0 }));
      return;
    }

    if (casesToAdd > 100) {
      setSnackbar({
        open: true,
        message: 'Cannot add more than 100 cases at once',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/cases-config/add`, {
        cases_to_add: casesToAdd,
        label: numberOfCases.label || ''
      });

      // Reset the count input to 0 after adding cases
      setNumberOfCases({
        count: 0,
        id: response.data.id,
        label: numberOfCases.label || '' // Keep the label for next time
      });

      // Refresh the cases list
      await fetchCases();

      const label = numberOfCases.label ? numberOfCases.label.trim() : '';
      const caseMessage = label
        ? `${casesToAdd} storage case${casesToAdd > 1 ? 's' : ''} added with label "${label}".`
        : `${casesToAdd} storage case${casesToAdd > 1 ? 's' : ''} added.`;

      setSnackbar({
        open: true,
        message: caseMessage,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating number of cases:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update number of cases configuration',
        severity: 'error'
      });
    }
  };

  const handleBlindCountDrawersToggle = async (event) => {
    const newValue = event.target.checked;
    // Update state immediately for responsive UI
    setIsBlindCountDrawers(newValue);
    try {
      // Save to drawers table via drawer-type-config endpoint
      await axios.put(`${API_BASE_URL}/drawer-type-config/physical`, {
        blind_count: newValue
      });

      // Refresh preferences to ensure UI is in sync
      await fetchBlindCountPreference();

      setSnackbar({
        open: true,
        message: `Physical drawers physical count set to ${newValue ? 'Blind' : 'Open'}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating blind count preference for drawers:', error);
      // Revert state on error
      setIsBlindCountDrawers(!newValue);
      setSnackbar({
        open: true,
        message: 'Failed to update closing mode settings for drawers',
        severity: 'error'
      });
    }
  };

  const handleBlindCountSafeToggle = async (event) => {
    const newValue = event.target.checked;
    // Update state immediately for responsive UI
    setIsBlindCountSafe(newValue);
    try {
      // Save to drawers table via drawer-type-config endpoint
      await axios.put(`${API_BASE_URL}/drawer-type-config/safe`, {
        blind_count: newValue
      });

      // Refresh preferences to ensure UI is in sync
      await fetchBlindCountPreference();

      setSnackbar({
        open: true,
        message: `Safe physical count set to ${newValue ? 'Blind' : 'Open'}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating blind count preference for safe:', error);
      // Revert state on error
      setIsBlindCountSafe(!newValue);
      setSnackbar({
        open: true,
        message: 'Failed to update closing mode settings for safe',
        severity: 'error'
      });
    }
  };

  const handleIndividualDenominationsDrawersToggle = async (event) => {
    const newValue = event.target.checked;
    setIsIndividualDenominationsDrawers(newValue);
    try {
      await axios.put(`${API_BASE_URL}/drawer-type-config/physical`, {
        individual_denominations: newValue
      });
      setSnackbar({
        open: true,
        message: `Physical drawers tracking set to ${newValue ? 'Individual Denominations' : 'Total Cash Balance'}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating individual denominations preference for drawers:', error);
      setIsIndividualDenominationsDrawers(!newValue); // Revert on error
      setSnackbar({
        open: true,
        message: 'Failed to update opening mode settings for drawers',
        severity: 'error'
      });
    }
  };

  const handleIndividualDenominationsSafeToggle = async (event) => {
    const newValue = event.target.checked;
    setIsIndividualDenominationsSafe(newValue);
    try {
      await axios.put(`${API_BASE_URL}/drawer-type-config/safe`, {
        individual_denominations: newValue
      });
      setSnackbar({
        open: true,
        message: `Safe tracking set to ${newValue ? 'Individual Denominations' : 'Total Cash Balance'}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating individual denominations preference for safe:', error);
      setIsIndividualDenominationsSafe(!newValue); // Revert on error
      setSnackbar({
        open: true,
        message: 'Failed to update opening mode settings for safe',
        severity: 'error'
      });
    }
  };

  const handleElectronicBlindCountDrawersToggle = async (event) => {
    const newValue = event.target.checked;
    setIsElectronicBlindCountDrawers(newValue);
    try {
      await axios.put(`${API_BASE_URL}/drawer-type-config/physical`, {
        electronic_blind_count: newValue
      });
      await fetchBlindCountPreference();
      setSnackbar({
        open: true,
        message: `Physical drawers electronic count set to ${newValue ? 'Blind' : 'Open'}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating electronic blind count for drawers:', error);
      setIsElectronicBlindCountDrawers(!newValue);
      setSnackbar({
        open: true,
        message: 'Failed to update electronic count settings for drawers',
        severity: 'error'
      });
    }
  };

  const handleElectronicBlindCountSafeToggle = async (event) => {
    const newValue = event.target.checked;
    setIsElectronicBlindCountSafe(newValue);
    try {
      await axios.put(`${API_BASE_URL}/drawer-type-config/safe`, {
        electronic_blind_count: newValue
      });
      await fetchBlindCountPreference();
      setSnackbar({
        open: true,
        message: `Safe electronic count set to ${newValue ? 'Blind' : 'Open'}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating electronic blind count for safe:', error);
      setIsElectronicBlindCountSafe(!newValue);
      setSnackbar({
        open: true,
        message: 'Failed to update electronic count settings for safe',
        severity: 'error'
      });
    }
  };

  const handleMinCloseChange = async (event) => {
    const newValue = parseFloat(event.target.value) || 0;
    setMinClose(newValue);
    try {
      await axios.put(`${API_BASE_URL}/drawer-type-config/physical`, {
        min_close: newValue,
        max_close: maxClose
      });
    } catch (error) {
      console.error('Error updating min close:', error);
    }
  };

  const handleMaxCloseChange = async (event) => {
    const newValue = parseFloat(event.target.value) || 0;
    setMaxClose(newValue);
    try {
      await axios.put(`${API_BASE_URL}/drawer-type-config/physical`, {
        min_close: minClose,
        max_close: newValue
      });
    } catch (error) {
      console.error('Error updating max close:', error);
    }
  };

  const handleMinCloseSafeChange = async (event) => {
    const newValue = parseFloat(event.target.value) || 0;
    setMinCloseSafe(newValue);
    try {
      // Backend automatically updates both safe and master_safe
      await axios.put(`${API_BASE_URL}/drawer-type-config/safe`, {
        min_close: newValue,
        max_close: maxCloseSafe
      });
    } catch (error) {
      console.error('Error updating min close for safe:', error);
    }
  };

  const handleMaxCloseSafeChange = async (event) => {
    const newValue = parseFloat(event.target.value) || 0;
    setMaxCloseSafe(newValue);
    try {
      // Backend automatically updates both safe and master_safe
      await axios.put(`${API_BASE_URL}/drawer-type-config/safe`, {
        min_close: minCloseSafe,
        max_close: newValue
      });
    } catch (error) {
      console.error('Error updating max close for safe:', error);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSaveAuthorizationTemplate = async () => {
    try {
      const template = authorizationTemplates[selectedLinkType];

      if (!template || !template.id) {
        setSnackbar({
          open: true,
          message: 'No template found to update',
          severity: 'error'
        });
        return;
      }

      await axios.put(`${API_BASE_URL}/linked-account-authorization-template/${template.id}`, {
        form_title: template.form_title,
        form_content: template.form_content,
        consent_text: template.consent_text
      });

      setSnackbar({
        open: true,
        message: `${selectedLinkType.replace('_', ' ')} authorization template saved successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving authorization template:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save authorization template',
        severity: 'error'
      });
    }
  };

  const handleAuthorizationTemplateChange = (event) => {
    const { name, value } = event.target;
    setAuthorizationTemplates(prev => ({
      ...prev,
      [selectedLinkType]: {
        ...prev[selectedLinkType],
        [name]: value
      }
    }));
  };

  const handleSaveTaxConfig = async () => {
    try {
      const taxRatesArray = Object.entries(provinceTaxRates).map(([code, rates]) => ({
        province_code: code,
        gst_rate: rates.gst,
        pst_rate: rates.pst,
        hst_rate: rates.hst
      }));

      await axios.put(`${API_BASE_URL}/tax-config/batch`, { taxRates: taxRatesArray });

      // Save selected province to localStorage
      localStorage.setItem('selectedProvince', selectedProvince);

      setSnackbar({
        open: true,
        message: 'Tax configuration updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving tax configuration:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save tax configuration',
        severity: 'error'
      });
    }
  };

  const handleReceiptConfigChange = (event) => {
    const { name, value } = event.target;
    setReceiptConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveReceiptConfig = async () => {
    try {
      await axios.put(`${API_BASE_URL}/receipt-config`, receiptConfig);

      setSnackbar({
        open: true,
        message: 'Receipt configuration saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving receipt config:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save receipt configuration',
        severity: 'error'
      });
    }
  };

  // Convert input values to numbers
  const toNum = v => parseFloat(String(v).replace(',', '.'));

  const handleCalculatorChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCalculatorSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      // Reset result when inputs change
      result: null
    }));
  };

  const handleWeightMarkupChange = (index, field, value) => {
    const newConfig = [...weightMarkupConfig];
    newConfig[index] = {
      ...newConfig[index],
      [field]: toNum(value)
    };
    setWeightMarkupConfig(newConfig);
  };

  const readThresholdsFromForm = () => {
    const thresholds = [...weightMarkupConfig];
    return thresholds
      .filter(r => Number.isFinite(r.weight) && Number.isFinite(r.markup) && r.weight > 0)
      .sort((a, b) => a.weight - b.weight);
  };

  const saveWeightMarkupConfig = () => {
    try {
      const thresholds = readThresholdsFromForm();
      if (thresholds.length < 2) {
        setSnackbar({
          open: true,
          message: 'Please enter at least 2 valid thresholds.',
          severity: 'warning'
        });
        return;
      }

      // Save to localStorage
      localStorage.setItem('thresholds', JSON.stringify(thresholds));
      setWeightMarkupConfig(thresholds);

      setSnackbar({
        open: true,
        message: 'Configuration saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving weight markup configuration:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save weight markup configuration',
        severity: 'error'
      });
    }
  };

  const resetWeightMarkupConfig = () => {
    const newConfig = [...defaultWeightMarkupConfig];
    setWeightMarkupConfig(newConfig);
    localStorage.setItem('thresholds', JSON.stringify(newConfig));
    setSnackbar({
      open: true,
      message: 'Defaults restored.',
      severity: 'success'
    });
  };

  // Find the appropriate markup based on weight
  const getMarkup = (weight, thresholds) => {
    if (!thresholds.length) return 0;
    thresholds.sort((a, b) => a.weight - b.weight);
    
    if (weight <= thresholds[0].weight) return thresholds[0].markup;
    
    for (let i = 0; i < thresholds.length - 1; i++) {
      const a = thresholds[i], b = thresholds[i + 1];
      if (weight >= a.weight && weight <= b.weight) {
        const ratio = (weight - a.weight) / (b.weight - a.weight);
        return a.markup + ratio * (b.markup - a.markup);
      }
    }
    
    return thresholds[thresholds.length - 1].markup;
  };

  const calculatePrice = () => {
    try {
      const thresholds = readThresholdsFromForm();
      const { weight, purity, marketPrice, hasColoredStones, extraMarkup, hasDiamonds, diamondValue } = calculatorSettings;
      
      // Validate inputs
      if (!weight || isNaN(toNum(weight)) || toNum(weight) <= 0 ||
          !marketPrice || isNaN(toNum(marketPrice)) || toNum(marketPrice) <= 0) {
        setSnackbar({
          open: true,
          message: 'Enter both weight and market price (numbers > 0).',
          severity: 'warning'
        });
        return;
      }

      if (thresholds.length < 2) {
        setSnackbar({
          open: true,
          message: 'Configure at least 2 weight thresholds.',
          severity: 'warning'
        });
        return;
      }
      
      const itemWeight = toNum(weight);
      const goldPrice = toNum(marketPrice);
      
      // Purity is now stored directly as a decimal value
      const purityValue = parseFloat(purity);
      
      // Get markup using the interpolation function
      let markup = getMarkup(itemWeight, thresholds);
      const notes = [];
      
      // Add extra markup for colored stones if checked
      if (hasColoredStones && extraMarkup && !isNaN(toNum(extraMarkup))) {
        markup += toNum(extraMarkup);
        notes.push('coloured-stone markup');
      }
      
      // Calculate the gold content weight and market value
      const goldContentWeight = itemWeight * purityValue;
      // Round to 2 decimal places to match the standalone calculator
      const metalMarketValue = Math.round(goldContentWeight * goldPrice * 100) / 100;
      
      // Calculate retail price with markup - round to match standalone calculator
      let retailPrice = Math.round(metalMarketValue * (1 + markup / 100) * 100) / 100;
      
      // Add diamond value if checked
      if (hasDiamonds && diamondValue && !isNaN(toNum(diamondValue))) {
        const diamondValueNum = toNum(diamondValue);
        retailPrice += diamondValueNum;
        notes.push(`diamond value $${diamondValueNum.toFixed(2)}`);
      }
      
      // Update state with result
      setCalculatorSettings(prev => ({
        ...prev,
        result: {
          metalMarketValue: metalMarketValue.toFixed(2),
          retailPrice: retailPrice.toFixed(2),
          appliedMarkup: markup.toFixed(2),
          notes: notes
        }
      }));
      
    } catch (error) {
      console.error('Error calculating price:', error);
      setSnackbar({
        open: true,
        message: 'An error occurred during calculation',
        severity: 'error'
      });
    }
  };

  // Load business info on mount
  useEffect(() => {
    loadBusinessInfo();
    loadAttributeConfig();
  }, []);

  const loadAttributeConfig = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/attribute-config`);
      setItemAttributes(response.data);
    } catch (error) {
      console.error('Error loading attribute config:', error);
    }
  };

  return (
    <Container>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="General" />
          <Tab label="Pawn Configuration" />
          <Tab label="Tax Configuration" />
          <Tab label="Pricing Calculator" />
          <Tab label="Account Authorization" />
          <Tab label="Item Attributes" />
          <Tab label="Employee Configuration" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <StyledPaper elevation={2}>
          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Business Information
            </Typography>
            <Grid container spacing={1}>
              {/* Row 1: Business Name, Email, Logo */}
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Business Name"
                  name="businessName"
                  value={generalSettings.businessName}
                  onChange={handleGeneralSettingsChange}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={generalSettings.email}
                  onChange={handleGeneralSettingsChange}
                />
              </Grid>
              <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'flex-start', rowSpan: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, width: '100%' }}>
                  {logoPreview && (
                    <Avatar
                      src={logoPreview}
                      alt="Business Logo"
                      variant="rounded"
                      sx={{ width: 100, height: 100, objectFit: 'contain' }}
                    />
                  )}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      variant="contained"
                      component="label"
                      startIcon={<UploadIcon />}
                    >
                      Upload Logo
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleLogoUpload}
                      />
                    </Button>
                    {logoPreview && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleRemoveLogo}
                        startIcon={<DeleteIcon />}
                      >
                        Remove
                      </Button>
                    )}
                    <Typography variant="caption" color="textSecondary">
                      PNG or JPG, max 5MB
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Row 2: Phone, Currency, Timezone */}
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={generalSettings.phone}
                  onChange={handleGeneralSettingsChange}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Currency"
                  name="currency"
                  value={generalSettings.currency}
                  onChange={handleGeneralSettingsChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    name="timezone"
                    value={generalSettings.timezone}
                    onChange={handleGeneralSettingsChange}
                    label="Timezone"
                  >
                    {TIMEZONES.map((tz) => (
                      <MenuItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Row 3: Address (spans full width) */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  multiline
                  rows={2}
                  value={generalSettings.address}
                  onChange={handleGeneralSettingsChange}
                />
              </Grid>
            </Grid>
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveBusinessInfo}
              >
                Save Business Information
              </Button>
            </Box>
          </ConfigSection>

          <ConfigSection>
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="h6" gutterBottom>
                Inventory Hold Period
              </Typography>
              <Switch
                checked={isInventoryHoldPeriodEnabled}
                onChange={handleInventoryHoldPeriodToggle}
                color="primary"
                inputProps={{ 'aria-label': 'toggle inventory hold period' }}
                sx={{ ml: 2 }}
              />
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Hold Period Duration"
                  type="number"
                  value={inventoryHoldPeriod.days}
                  onChange={(e) => setInventoryHoldPeriod(prev => ({ ...prev, days: e.target.value }))}
                  onBlur={(e) => handleInventoryHoldPeriodChange(e)}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">days</InputAdornment>,
                  }}
                  helperText="Number of days to keep inventory items in HOLD status"
                  fullWidth
                  disabled={!isInventoryHoldPeriodEnabled}
                />
              </Grid>
              <Grid item xs={12}>
                <Grid container spacing={3}>
                  {/* Tracking */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Tracking
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Select between keeping track of individual denominations or just the total cash balance
                      </Typography>
                      <Box display="flex" gap={3} flexWrap="wrap">
                        <Box sx={{ flex: '1 1 200px' }}>
                          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                            Physical Drawers
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" color={!isIndividualDenominationsDrawers ? 'primary' : 'text.secondary'} fontWeight={!isIndividualDenominationsDrawers ? 'bold' : 'normal'}>
                              Total Cash Balance
                            </Typography>
                            <Switch
                              checked={isIndividualDenominationsDrawers}
                              onChange={handleIndividualDenominationsDrawersToggle}
                              color="primary"
                            />
                            <Typography variant="body2" color={isIndividualDenominationsDrawers ? 'primary' : 'text.secondary'} fontWeight={isIndividualDenominationsDrawers ? 'bold' : 'normal'}>
                              Individual Denominations
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ flex: '1 1 200px' }}>
                          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                            Safe Drawers
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" color={!isIndividualDenominationsSafe ? 'primary' : 'text.secondary'} fontWeight={!isIndividualDenominationsSafe ? 'bold' : 'normal'}>
                              Total Cash Balance
                            </Typography>
                            <Switch
                              checked={isIndividualDenominationsSafe}
                              onChange={handleIndividualDenominationsSafeToggle}
                              color="primary"
                            />
                            <Typography variant="body2" color={isIndividualDenominationsSafe ? 'primary' : 'text.secondary'} fontWeight={isIndividualDenominationsSafe ? 'bold' : 'normal'}>
                              Individual Denominations
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Physical Count */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Physical Count
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Select how to count the physical tenders at open/close
                      </Typography>
                      <Box display="flex" gap={3} flexWrap="wrap">
                        <Box sx={{ flex: '1 1 200px' }}>
                          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                            Physical Drawers
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" color={!isBlindCountDrawers ? 'primary' : 'text.secondary'} fontWeight={!isBlindCountDrawers ? 'bold' : 'normal'}>
                              Open
                            </Typography>
                            <Switch
                              checked={isBlindCountDrawers}
                              onChange={handleBlindCountDrawersToggle}
                              color="primary"
                            />
                            <Typography variant="body2" color={isBlindCountDrawers ? 'primary' : 'text.secondary'} fontWeight={isBlindCountDrawers ? 'bold' : 'normal'}>
                              Blind
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ flex: '1 1 200px' }}>
                          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                            Safe Drawers
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" color={!isBlindCountSafe ? 'primary' : 'text.secondary'} fontWeight={!isBlindCountSafe ? 'bold' : 'normal'}>
                              Open
                            </Typography>
                            <Switch
                              checked={isBlindCountSafe}
                              onChange={handleBlindCountSafeToggle}
                              color="primary"
                            />
                            <Typography variant="body2" color={isBlindCountSafe ? 'primary' : 'text.secondary'} fontWeight={isBlindCountSafe ? 'bold' : 'normal'}>
                              Blind
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Electronic Count */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Electronic Count
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Select how to count the electronic tenders at open/close
                      </Typography>
                      <Box display="flex" gap={3} flexWrap="wrap">
                        <Box sx={{ flex: '1 1 200px' }}>
                          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                            Physical Drawers
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" color={!isElectronicBlindCountDrawers ? 'primary' : 'text.secondary'} fontWeight={!isElectronicBlindCountDrawers ? 'bold' : 'normal'}>
                              Open
                            </Typography>
                            <Switch
                              checked={isElectronicBlindCountDrawers}
                              onChange={handleElectronicBlindCountDrawersToggle}
                              color="primary"
                            />
                            <Typography variant="body2" color={isElectronicBlindCountDrawers ? 'primary' : 'text.secondary'} fontWeight={isElectronicBlindCountDrawers ? 'bold' : 'normal'}>
                              Blind
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ flex: '1 1 200px' }}>
                          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                            Safe Drawers
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" color={!isElectronicBlindCountSafe ? 'primary' : 'text.secondary'} fontWeight={!isElectronicBlindCountSafe ? 'bold' : 'normal'}>
                              Open
                            </Typography>
                            <Switch
                              checked={isElectronicBlindCountSafe}
                              onChange={handleElectronicBlindCountSafeToggle}
                              color="primary"
                            />
                            <Typography variant="body2" color={isElectronicBlindCountSafe ? 'primary' : 'text.secondary'} fontWeight={isElectronicBlindCountSafe ? 'bold' : 'normal'}>
                              Blind
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </ConfigSection>

          {/* Storage Cases Configuration */}
          <ConfigSection>
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Storage Cases Configuration
              </Typography>
              <Grid container spacing={2}>
                {/* Left side: Configuration controls */}
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <TextField
                      label="Case Label"
                      type="text"
                      value={numberOfCases.label}
                      onChange={(e) => setNumberOfCases(prev => ({ ...prev, label: e.target.value }))}
                      size="small"
                      fullWidth
                      placeholder="e.g., Jewelry, Silver"
                      helperText="Label for cases (optional)"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label="Number of Cases to Add"
                      type="number"
                      value={numberOfCases.count}
                      onChange={(e) => setNumberOfCases(prev => ({ ...prev, count: e.target.value }))}
                      onBlur={(e) => handleNumberOfCasesChange(e)}
                      size="small"
                      fullWidth
                      InputProps={{
                        endAdornment: <InputAdornment position="end">cases</InputAdornment>,
                      }}
                      inputProps={{ min: 0, max: 100 }}
                      helperText="Number of cases (0-100)"
                    />
                  </Box>
                </Grid>

                {/* Right side: Configured cases list */}
                <Grid item xs={12} md={8}>
                  <Box sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Configured Storage Cases ({cases.length})
                      </Typography>
                    </Box>
                    {cases.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          No storage cases configured yet. Add cases using the form on the left.
                        </Typography>
                      </Box>
                    ) : (
                      <TableContainer sx={{ maxHeight: 300 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Location</TableCell>
                              <TableCell align="center">Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {cases.map((caseItem) => (
                              <TableRow key={caseItem.location_id} hover>
                                <TableCell>{caseItem.location}</TableCell>
                                <TableCell align="center">
                                  {caseItem.is_occupied ? (
                                    <Typography color="warning.main" variant="body2">Occupied</Typography>
                                  ) : (
                                    <Typography color="success.main" variant="body2">Available</Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </ConfigSection>

          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Customer Columns
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="textSecondary" paragraph>
                Select which customer columns should be displayed for each transaction type:
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 600 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>Customer Field</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 120, bgcolor: '#f5f5f5' }}>
                        Header Preferences
                      </TableCell>
                      {transactionTypes.map((txType) => (
                        <TableCell key={txType.id} align="center" sx={{ fontWeight: 'bold', minWidth: 100 }}>
                          {txType.type.charAt(0).toUpperCase() + txType.type.slice(1)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {availableCustomerColumns.map((column) => (
                      <TableRow key={column.field} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {column.label}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" padding="checkbox" sx={{ bgcolor: '#fafafa' }}>
                          <Checkbox
                            checked={selectedCustomerColumns[column.field] || false}
                            onChange={(e) => {
                              setSelectedCustomerColumns(prev => ({
                                ...prev,
                                [column.field]: e.target.checked
                              }));
                            }}
                            color="primary"
                            size="small"
                          />
                        </TableCell>
                        {transactionTypes.map((txType) => (
                          <TableCell key={txType.id} align="center" padding="checkbox">
                            <Checkbox
                              checked={customerColumnPreferences[`${txType.type}_${column.field}`] || false}
                              onChange={(e) => {
                                setCustomerColumnPreferences(prev => ({
                                  ...prev,
                                  [`${txType.type}_${column.field}`]: e.target.checked
                                }));
                              }}
                              color="primary"
                              size="small"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {availableCustomerColumns.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={transactionTypes.length + 1} align="center">
                          {loading ? 'Loading...' : 'No columns found'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveSettings}
                  disabled={loading}
                >
                  Save Column Preferences
                </Button>
              </Box>
            </Box>
          </ConfigSection>

          <ConfigSection>
            <Box display="flex" alignItems="center">
              <Typography variant="h6" gutterBottom>
                Camera
              </Typography>
              <Switch
                checked={isCameraEnabled}
                onChange={handleCameraToggle}
                color="primary"
              />
            </Box>
          </ConfigSection>

          <ConfigSection>
            <Box display="flex" alignItems="center">
              <Typography variant="h6" gutterBottom>
                Carat to Gram Conversion
              </Typography>
              <Switch
                checked={isCaratConversionEnabled}
                onChange={handleCaratConversionToggle}
                color="primary"
              />
            </Box>
            <Box sx={{ mt: 1 }}>
              <TextField
                label="Grams per Carat"
                type="number"
                value={gramsInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setGramsInput(value);
                }}
                onBlur={() => {
                  if (gramsInput && !isNaN(gramsInput)) {
                    handleCaratConversionUpdate(gramsInput);
                  }
                }}
                inputProps={{
                  step: "0.01",
                  min: "0",
                }}
                size="small"
                sx={{ width: '200px' }}
                disabled={!isCaratConversionEnabled}
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Standard conversion: 1 carat = 0.2 grams
              </Typography>
            </Box>
          </ConfigSection>

          <ConfigSection>
            <Box display="flex" alignItems="center">
              <Typography variant="h6" gutterBottom>
                Live Pricing
              </Typography>
              <Switch
                checked={isLivePricing}
                onChange={handleLivePricingChange}
                color="primary"
              />
            </Box>
            {isLivePricing ? (
              <div>
                <div>
                  <label>
                    <input
                      type="radio"
                      value="daily"
                      checked={isPerDay}
                      onChange={handleLivePricingChange}
                      style={{ accentColor: 'green' }}
                    />
                    Update Spot Prices Daily
                  </label>
                </div>
                <div>
                <label>
                  <input
                    type="radio"
                    value="transaction"
                    checked={isPerTransaction}
                    onChange={handleLivePricingChange}
                    style={{ accentColor: 'green' }}
                  />
                  Update Spot Prices for Each Transaction
                </label>
                </div>
              </div>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                  {Object.keys(preciousMetalNames).map((metal) => (
                    <TextField
                      key={metal}
                      label={`${preciousMetalNames[metal]} Spot Price`}
                      value={spotPrices[metal]}
                      onChange={(e) => handleSpotPriceChange(e, metal)}
                      sx={{ minWidth: '150px', flex: '1 1 auto' }}
                    />
                  ))}
                </Box>
              </Box>
            )}
            <Box mt={2}>
              <Typography variant="h6" gutterBottom>
                Price Estimates
              </Typography>
              <Grid container spacing={3}>
                {Array.isArray(diamondEstimates) && 
                  [...diamondEstimates]
                    .sort((a, b) => a.id - b.id)
                    .map((estimate) => (
                      <Grid item xs={12} sm={4} key={estimate.transaction_type}>
                        <TextField
                          fullWidth
                          label={`Diamond ${estimate.transaction_type} Percentage`}
                          type="number"
                          value={estimate.estimate}
                          onChange={(event) => handleDiamondEstimatesChange(event, estimate.transaction_type)}
                          inputProps={{ min: 0, max: 100 }}
                        />
                      </Grid>
                    ))
                }
                {Object.entries(priceEstimates).map(([key, estimates]) => (
                  estimates.map((estimate) => (
                    <Grid item xs={12} sm={4} key={estimate.transaction_type}>
                      <TextField
                        fullWidth
                        label={`${preciousMetalNames[key]} ${estimate.transaction_type} Percentage`}
                        name={estimate.transaction_type}
                        type="number"
                        value={estimate.estimate}
                        onChange={(event) => handlePriceEstimatesChange(event, key)}
                        inputProps={{ min: 0, max: 100 }}
                      />
                    </Grid>
                  ))
                ))}
              </Grid>
            </Box>
          </ConfigSection>

          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Receipt Footer Text
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure the footer text that appears on different types of receipts
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Transaction Receipt"
                  name="transaction_receipt"
                  value={receiptConfig.transaction_receipt}
                  onChange={handleReceiptConfigChange}
                  multiline
                  rows={2}
                  helperText="Footer text for general transaction receipts"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Buy Receipt"
                  name="buy_receipt"
                  value={receiptConfig.buy_receipt}
                  onChange={handleReceiptConfigChange}
                  multiline
                  rows={2}
                  helperText="Footer text for buy transaction receipts"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Pawn Receipt"
                  name="pawn_receipt"
                  value={receiptConfig.pawn_receipt}
                  onChange={handleReceiptConfigChange}
                  multiline
                  rows={2}
                  helperText="Footer text for pawn transaction receipts"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Layaway Receipt"
                  name="layaway_receipt"
                  value={receiptConfig.layaway_receipt}
                  onChange={handleReceiptConfigChange}
                  multiline
                  rows={2}
                  helperText="Footer text for layaway transaction receipts"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Return Receipt"
                  name="return_receipt"
                  value={receiptConfig.return_receipt}
                  onChange={handleReceiptConfigChange}
                  multiline
                  rows={2}
                  helperText="Footer text for return transaction receipts"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Refund Receipt"
                  name="refund_receipt"
                  value={receiptConfig.refund_receipt}
                  onChange={handleReceiptConfigChange}
                  multiline
                  rows={2}
                  helperText="Footer text for refund transaction receipts"
                />
              </Grid>
            </Grid>
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveReceiptConfig}
              >
                Save Receipt Configuration
              </Button>
            </Box>
          </ConfigSection>
        </StyledPaper>
      </TabPanel>

      {/* Pawn Configuration Tab */}
      <TabPanel value={activeTab} index={1}>
        <StyledPaper elevation={2}>
          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Pawn Configuration
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Interest Rate (%)"
                  type="number"
                  value={pawnConfig.interest_rate}
                  onChange={(e) => handlePawnConfigChange('interest_rate', e.target.value)}
                  fullWidth
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  helperText="Interest rate charged per period"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  label="Term (Days)"
                  value={pawnConfig.term_days}
                  onChange={(e) => handlePawnConfigChange('term_days', e.target.value)}
                  fullWidth
                  helperText="Default pawn term length"
                >
                  {[15, 30, 45, 60, 90, 120, 180].map((days) => (
                    <MenuItem key={days} value={days}>
                      {days}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  label="Frequency (Days)"
                  value={pawnConfig.frequency_days}
                  onChange={(e) => handlePawnConfigChange('frequency_days', e.target.value)}
                  fullWidth
                  helperText="Interest calculation frequency"
                >
                  {[15, 30, 45, 60, 90, 120, 180].map((days) => (
                    <MenuItem key={days} value={days}>
                      {days}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  label="Forfeiture Mode"
                  value={pawnConfig.forfeiture_mode}
                  onChange={(e) => handlePawnConfigChange('forfeiture_mode', e.target.value)}
                  fullWidth
                  helperText="Manual or Auto"
                >
                  <MenuItem value="manual">Manual</MenuItem>
                  <MenuItem value="automatic">Automatic</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </ConfigSection>
        </StyledPaper>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <StyledPaper elevation={2}>
          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Provincial Tax Rates
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Configure tax rates for each Canadian province. Use GST + PST for provinces with separate taxes, or HST for harmonized sales tax provinces.
            </Typography>

            {/* Default Province Selector */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Default Province for Checkout
                  </Typography>
                  <Typography variant="body2">
                    Select the province to use for tax calculations at checkout
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: 'inherit' }}>Select Province</InputLabel>
                    <Select
                      value={selectedProvince}
                      onChange={(e) => setSelectedProvince(e.target.value)}
                      label="Select Province"
                      sx={{
                        bgcolor: 'white',
                        '& .MuiSelect-select': { py: 1 }
                      }}
                    >
                      <MenuItem value="AB">Alberta</MenuItem>
                      <MenuItem value="BC">British Columbia</MenuItem>
                      <MenuItem value="MB">Manitoba</MenuItem>
                      <MenuItem value="NB">New Brunswick</MenuItem>
                      <MenuItem value="NL">Newfoundland and Labrador</MenuItem>
                      <MenuItem value="NT">Northwest Territories</MenuItem>
                      <MenuItem value="NS">Nova Scotia</MenuItem>
                      <MenuItem value="NU">Nunavut</MenuItem>
                      <MenuItem value="ON">Ontario</MenuItem>
                      <MenuItem value="PE">Prince Edward Island</MenuItem>
                      <MenuItem value="QC">Quebec</MenuItem>
                      <MenuItem value="SK">Saskatchewan</MenuItem>
                      <MenuItem value="YT">Yukon</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Province/Territory</strong></TableCell>
                    <TableCell align="center"><strong>GST (%)</strong></TableCell>
                    <TableCell align="center"><strong>PST (%)</strong></TableCell>
                    <TableCell align="center"><strong>HST (%)</strong></TableCell>
                    <TableCell align="center"><strong>Total Tax (%)</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(provinceTaxRates).map(([code, rates]) => {
                    const provinceNames = {
                      'AB': 'Alberta',
                      'BC': 'British Columbia',
                      'MB': 'Manitoba',
                      'NB': 'New Brunswick',
                      'NL': 'Newfoundland and Labrador',
                      'NT': 'Northwest Territories',
                      'NS': 'Nova Scotia',
                      'NU': 'Nunavut',
                      'ON': 'Ontario',
                      'PE': 'Prince Edward Island',
                      'QC': 'Quebec',
                      'SK': 'Saskatchewan',
                      'YT': 'Yukon'
                    };

                    const totalTax = rates.hst || (rates.gst + rates.pst);

                    return (
                      <TableRow key={code}>
                        <TableCell>{provinceNames[code]} ({code})</TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            value={rates.gst}
                            onChange={(e) => {
                              const newRates = { ...provinceTaxRates };
                              newRates[code].gst = parseFloat(e.target.value) || 0;
                              setProvinceTaxRates(newRates);
                            }}
                            inputProps={{ min: 0, max: 100, step: 0.1 }}
                            sx={{ width: '80px' }}
                            size="small"
                            disabled={rates.hst > 0}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            value={rates.pst}
                            onChange={(e) => {
                              const newRates = { ...provinceTaxRates };
                              newRates[code].pst = parseFloat(e.target.value) || 0;
                              setProvinceTaxRates(newRates);
                            }}
                            inputProps={{ min: 0, max: 100, step: 0.1 }}
                            sx={{ width: '80px' }}
                            size="small"
                            disabled={rates.hst > 0}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            value={rates.hst}
                            onChange={(e) => {
                              const newRates = { ...provinceTaxRates };
                              newRates[code].hst = parseFloat(e.target.value) || 0;
                              setProvinceTaxRates(newRates);
                            }}
                            inputProps={{ min: 0, max: 100, step: 0.1 }}
                            sx={{ width: '80px' }}
                            size="small"
                            disabled={rates.gst > 0 || rates.pst > 0}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <strong>{totalTax.toFixed(2)}%</strong>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="textSecondary">
                <strong>Note:</strong> GST (Goods and Services Tax), PST (Provincial Sales Tax), and HST (Harmonized Sales Tax) cannot be used together.
                Provinces use either GST+PST or HST.
              </Typography>
            </Box>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveTaxConfig}
                disabled={loading}
              >
                Save Tax Configuration
              </Button>
            </Box>
          </ConfigSection>
        </StyledPaper>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <StyledPaper elevation={2}>
          <Grid container spacing={3}>
            {/* Configuration Block - Left Side */}
            <Grid item xs={12} md={6}>
              <ConfigSection>
                <Typography variant="h5" gutterBottom>
                  Configuration (Weight in grams → Markup %)
                </Typography>
                
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Weight (g)</TableCell>
                        <TableCell>Markup %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {weightMarkupConfig.map((config, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <TextField
                              fullWidth
                              value={config.weight}
                              onChange={(e) => handleWeightMarkupChange(index, 'weight', e.target.value)}
                              inputProps={{ inputMode: 'numeric' }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              fullWidth
                              value={config.markup}
                              onChange={(e) => handleWeightMarkupChange(index, 'markup', e.target.value)}
                              inputProps={{ inputMode: 'numeric' }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Box mt={2} display="flex" gap={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={saveWeightMarkupConfig}
                  >
                    Save Configuration
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={resetWeightMarkupConfig}
                  >
                    Reset to Default
                  </Button>
                </Box>
              </ConfigSection>
            </Grid>
            
            {/* Calculate Price Block - Right Side */}
            <Grid item xs={12} md={6}>
              <ConfigSection>
                <Typography variant="h5" gutterBottom>
                  Calculate Price
                </Typography>
                
                <Box mb={2}>
                  <Typography component="label" htmlFor="calc-weight" variant="body1" display="block" gutterBottom>
                    Weight (g):
                  </Typography>
                  <TextField
                    id="calc-weight"
                    name="weight"
                    value={calculatorSettings.weight}
                    onChange={handleCalculatorChange}
                    fullWidth
                    type="number"
                    inputProps={{ 
                      inputMode: 'numeric',
                      step: 'any' 
                    }}
                  />
                </Box>
                
                <Box mb={2}>
                  <Typography component="label" htmlFor="calc-purity" variant="body1" display="block" gutterBottom>
                    Purity:
                  </Typography>
                  <TextField
                    id="calc-purity"
                    name="purity"
                    select
                    value={calculatorSettings.purity}
                    onChange={handleCalculatorChange}
                    fullWidth
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="0.999">24K (99.9%)</option>
                    <option value="0.917">22K (91.7%)</option>
                    <option value="0.750">18K (75.0%)</option>
                    <option value="0.583">14K (58.3%)</option>
                    <option value="0.417">10K (41.7%)</option>
                    <option value="0.375">9K (37.5%)</option>
                  </TextField>
                </Box>
                
                <Box mb={2}>
                  <Typography component="label" htmlFor="calc-market-price" variant="body1" display="block" gutterBottom>
                    Market Price per g (pure gold, $):
                  </Typography>
                  <TextField
                    id="calc-market-price"
                    name="marketPrice"
                    value={calculatorSettings.marketPrice}
                    onChange={handleCalculatorChange}
                    fullWidth
                    type="number"
                    inputProps={{ 
                      inputMode: 'numeric',
                      step: 'any' 
                    }}
                  />
                </Box>
                
                <Box mb={2}>
                  <Box display="flex" alignItems="center">
                    <Checkbox
                      id="stone-check"
                      name="hasColoredStones"
                      checked={calculatorSettings.hasColoredStones}
                      onChange={handleCalculatorChange}
                    />
                    <Typography component="label" htmlFor="stone-check">
                      Coloured stone(s)
                    </Typography>
                    <Box ml={2}>
                      <Typography component="span" mr={1}>
                        Extra Markup %:
                      </Typography>
                      <TextField
                        id="extra-markup"
                        name="extraMarkup"
                        value={calculatorSettings.extraMarkup}
                        onChange={handleCalculatorChange}
                        sx={{ width: '150px' }}
                        type="number"
                        inputProps={{ step: 'any' }}
                      />
                    </Box>
                  </Box>
                </Box>
                
                <Box mb={3}>
                  <Box display="flex" alignItems="center">
                    <Checkbox
                      id="diamond-check"
                      name="hasDiamonds"
                      checked={calculatorSettings.hasDiamonds}
                      onChange={handleCalculatorChange}
                    />
                    <Typography component="label" htmlFor="diamond-check">
                      Diamond(s)
                    </Typography>
                    <Box ml={2}>
                      <Typography component="span" mr={1}>
                        Diamond Value ($):
                      </Typography>
                      <TextField
                        id="diamond-value"
                        name="diamondValue"
                        value={calculatorSettings.diamondValue}
                        onChange={handleCalculatorChange}
                        sx={{ width: '150px' }}
                        type="number"
                        inputProps={{ step: 'any' }}
                      />
                    </Box>
                  </Box>
                </Box>
                
                <Box>
                  <Button
                    variant="outlined"
                    onClick={calculatePrice}
                  >
                    Calculate
                  </Button>
                </Box>
                
                {calculatorSettings.result && (
                  <Box mt={4}>
                    <Typography variant="body1" component="div">
                      <Box fontWeight="bold" component="span">
                        Market metal value: 
                      </Box>
                      <Box component="span" fontWeight="bold">
                        ${calculatorSettings.result.metalMarketValue}
                      </Box>
                    </Typography>
                    
                    <Typography variant="body1" component="div">
                      <Box component="span">
                        Retail price: 
                      </Box>
                      <Box component="span" fontWeight="bold">
                        ${calculatorSettings.result.retailPrice}
                      </Box>
                      <Box component="span">
                        {' '}(Markup {calculatorSettings.result.appliedMarkup}%)
                      </Box>
                    </Typography>
                    
                    {calculatorSettings.result.notes && calculatorSettings.result.notes.length > 0 && (
                      <Typography variant="body1" component="div">
                        <Box component="span">
                          Includes: {calculatorSettings.result.notes.join(', ')}
                        </Box>
                      </Typography>
                    )}
                  </Box>
                )}
              </ConfigSection>
            </Grid>
          </Grid>
        </StyledPaper>
      </TabPanel>

      {/* Account Authorization Tab */}
      <TabPanel value={activeTab} index={4}>
        <StyledPaper elevation={2}>
          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Linked Account Authorization Forms
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure the authorization forms that customers must sign when linking their accounts.
              Each link type (Full Access, View Only, Limited) has its own authorization form.
              Available placeholders: {'{'}{'{'} CUSTOMER_NAME {'}'}{'}'},  {'{'}{'{'} PRIMARY_CUSTOMER_NAME {'}'}{'}'}
            </Typography>

            {/* Link Type Selector */}
            <Box sx={{ mb: 3 }}>
              <Tabs
                value={selectedLinkType}
                onChange={(e, newValue) => setSelectedLinkType(newValue)}
                variant="fullWidth"
              >
                <Tab label="Full Access" value="full_access" />
                <Tab label="View Only" value="view_only" />
                <Tab label="Limited" value="limited" />
              </Tabs>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Form Title"
                  name="form_title"
                  value={authorizationTemplates[selectedLinkType]?.form_title || ''}
                  onChange={handleAuthorizationTemplateChange}
                  helperText="The title displayed at the top of the authorization form"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  label="Form Content"
                  name="form_content"
                  value={authorizationTemplates[selectedLinkType]?.form_content || ''}
                  onChange={handleAuthorizationTemplateChange}
                  helperText="The main authorization text. Use {{CUSTOMER_NAME}} and {{PRIMARY_CUSTOMER_NAME}} as placeholders."
                  placeholder="I, {{CUSTOMER_NAME}}, authorize {{PRIMARY_CUSTOMER_NAME}} to access my account information..."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Consent Text"
                  name="consent_text"
                  value={authorizationTemplates[selectedLinkType]?.consent_text || ''}
                  onChange={handleAuthorizationTemplateChange}
                  helperText="The consent checkbox text that customers must agree to"
                  placeholder="I have read and agree to the terms above"
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveAuthorizationTemplate}
                  >
                    Save {selectedLinkType.replace('_', ' ').toUpperCase()} Template
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </ConfigSection>
        </StyledPaper>
      </TabPanel>

      {/* Item Attributes Tab */}
      <TabPanel value={activeTab} index={5}>
        <StyledPaper elevation={2}>
          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Item Attributes Configuration
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Add custom attributes for jewelry items (e.g., gender, size, style). Each attribute can have multiple options.
            </Typography>

            {/* Add New Attribute */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Add New Attribute
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Attribute Name"
                    placeholder="e.g., Gender, Size, Style"
                    value={newAttributeName}
                    onChange={(e) => setNewAttributeName(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={newAttributeType}
                      onChange={(e) => setNewAttributeType(e.target.value)}
                      label="Type"
                    >
                      <MenuItem value="dropdown">Dropdown</MenuItem>
                      <MenuItem value="text">Text Field</MenuItem>
                      <MenuItem value="number">Number</MenuItem>
                      <MenuItem value="checkbox">Checkbox</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={async () => {
                      if (!newAttributeName.trim()) {
                        setSnackbar({
                          open: true,
                          message: 'Please enter an attribute name',
                          severity: 'error'
                        });
                        return;
                      }

                      try {
                        await axios.post(`${API_BASE_URL}/attribute-config`, {
                          attribute_name: newAttributeName.trim(),
                          attribute_type: newAttributeType,
                          attribute_options: [],
                          inventory_type: null
                        });
                        setNewAttributeName('');
                        setNewAttributeType('dropdown');
                        await loadAttributeConfig();
                        setSnackbar({
                          open: true,
                          message: 'Attribute added successfully!',
                          severity: 'success'
                        });
                      } catch (error) {
                        console.error('Error adding attribute:', error);
                        setSnackbar({
                          open: true,
                          message: 'Failed to add attribute',
                          severity: 'error'
                        });
                      }
                    }}
                  >
                    Add Attribute
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* Display Existing Attributes */}
            <Grid container spacing={3}>
              {itemAttributes.map((attr) => (
                <Grid item xs={12} md={4} key={attr.id}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default', position: 'relative' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {attr.attribute_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Type: {attr.attribute_type || 'dropdown'}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={async () => {
                          if (window.confirm(`Delete attribute "${attr.attribute_name}"?`)) {
                            try {
                              await axios.delete(`${API_BASE_URL}/attribute-config/${attr.attribute_name}`);
                              await loadAttributeConfig();
                              setSnackbar({
                                open: true,
                                message: 'Attribute deleted successfully!',
                                severity: 'success'
                              });
                            } catch (error) {
                              console.error('Error deleting attribute:', error);
                              setSnackbar({
                                open: true,
                                message: 'Failed to delete attribute',
                                severity: 'error'
                              });
                            }
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {(attr.attribute_type === 'dropdown' || !attr.attribute_type) && (
                      <>
                        <TextField
                      fullWidth
                      size="small"
                      placeholder={`Add ${attr.attribute_name} option`}
                      onKeyPress={async (e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          const newValue = e.target.value.trim();
                          const currentOptions = attr.attribute_options || [];

                          if (!currentOptions.includes(newValue)) {
                            try {
                              await axios.post(`${API_BASE_URL}/attribute-config`, {
                                attribute_name: attr.attribute_name,
                                attribute_type: attr.attribute_type || 'dropdown',
                                attribute_options: [...currentOptions, newValue],
                                inventory_type: attr.inventory_type
                              });
                              e.target.value = '';
                              await loadAttributeConfig();
                            } catch (error) {
                              console.error('Error adding option:', error);
                            }
                          }
                        }
                      }}
                      sx={{ mb: 2 }}
                    />

                    <Box>
                      {(attr.attribute_options || []).map((value, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1,
                            mb: 1,
                            bgcolor: 'white',
                            borderRadius: 1,
                            border: '1px solid #e0e0e0'
                          }}
                        >
                          <Typography variant="body2">{value}</Typography>
                          <IconButton
                            size="small"
                            onClick={async () => {
                              const updatedOptions = (attr.attribute_options || []).filter((_, i) => i !== index);
                              try {
                                await axios.post(`${API_BASE_URL}/attribute-config`, {
                                  attribute_name: attr.attribute_name,
                                  attribute_type: attr.attribute_type || 'dropdown',
                                  attribute_options: updatedOptions,
                                  inventory_type: attr.inventory_type
                                });
                                await loadAttributeConfig();
                              } catch (error) {
                                console.error('Error deleting option:', error);
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                      </>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </ConfigSection>
        </StyledPaper>
      </TabPanel>

      <TabPanel value={activeTab} index={6}>
        <StyledPaper elevation={2}>
          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Employee Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure per-employee permissions. Changes take effect immediately.
            </Typography>

            {employeePermissionsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell align="center">Track Hours</TableCell>
                      <TableCell align="center">Can Open/Close Store</TableCell>
                      <TableCell align="center">Can Open Drawer</TableCell>
                      <TableCell align="center">Can View Drawer</TableCell>
                      <TableCell align="center">Can View Safe</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employeePermissions.map((emp) => (
                      <TableRow key={emp.employee_id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {emp.first_name} {emp.last_name}
                          </Typography>
                          <Chip label={emp.role} size="small" sx={{ mt: 0.5 }} />
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={emp.track_hours !== false}
                            onChange={() => handlePermissionToggle(emp.employee_id, 'track_hours', emp.track_hours !== false)}
                            color="primary"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={emp.can_open_store !== false}
                            onChange={() => handlePermissionToggle(emp.employee_id, 'can_open_store', emp.can_open_store !== false)}
                            color="primary"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={emp.can_open_drawer !== false}
                            onChange={() => handlePermissionToggle(emp.employee_id, 'can_open_drawer', emp.can_open_drawer !== false)}
                            color="primary"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={emp.can_view_drawer !== false}
                            onChange={() => handlePermissionToggle(emp.employee_id, 'can_view_drawer', emp.can_view_drawer !== false)}
                            color="primary"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={emp.can_view_safe !== false}
                            onChange={() => handlePermissionToggle(emp.employee_id, 'can_view_safe', emp.can_view_safe !== false)}
                            color="primary"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </ConfigSection>

          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Transfer & Cash Handling
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure per-employee transfer restrictions, limits, and petty cash permissions.
            </Typography>

            {employeePermissionsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell align="center">Over/Short Limit</TableCell>
                      <TableCell align="center">Transfers Allowed</TableCell>
                      <TableCell align="center">Transfer Limit</TableCell>
                      <TableCell align="center">Petty Cash</TableCell>
                      <TableCell align="center">Petty Cash Limit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employeePermissions.map((emp) => (
                      <TableRow key={emp.employee_id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {emp.first_name} {emp.last_name}
                          </Typography>
                          <Chip label={emp.role} size="small" sx={{ mt: 0.5 }} />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            size="small"
                            type="number"
                            value={emp.discrepancy_threshold != null ? emp.discrepancy_threshold : ''}
                            onChange={(e) => setEmployeePermissions(prev =>
                              prev.map(p => p.employee_id === emp.employee_id ? { ...p, discrepancy_threshold: e.target.value === '' ? null : e.target.value } : p)
                            )}
                            onBlur={(e) => handlePermissionValueChange(emp.employee_id, 'discrepancy_threshold', e.target.value)}
                            placeholder="Unlimited"
                            inputProps={{ min: 0, step: '0.01' }}
                            sx={{ width: 110 }}
                            InputProps={{ startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>$</Typography> }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <FormControlLabel
                              control={<Checkbox size="small" checked={emp.transfer_allowed_drawer !== false} onChange={() => handlePermissionToggle(emp.employee_id, 'transfer_allowed_drawer', emp.transfer_allowed_drawer !== false)} />}
                              label={<Typography variant="caption">Drawer</Typography>}
                              sx={{ m: 0, height: 28 }}
                            />
                            <FormControlLabel
                              control={<Checkbox size="small" checked={emp.transfer_allowed_safe !== false} onChange={() => handlePermissionToggle(emp.employee_id, 'transfer_allowed_safe', emp.transfer_allowed_safe !== false)} />}
                              label={<Typography variant="caption">Safe</Typography>}
                              sx={{ m: 0, height: 28 }}
                            />
                            <FormControlLabel
                              control={<Checkbox size="small" checked={emp.transfer_allowed_bank !== false} onChange={() => handlePermissionToggle(emp.employee_id, 'transfer_allowed_bank', emp.transfer_allowed_bank !== false)} />}
                              label={<Typography variant="caption">Bank</Typography>}
                              sx={{ m: 0, height: 28 }}
                            />
                            <FormControlLabel
                              control={<Checkbox size="small" checked={emp.transfer_allowed_store !== false} onChange={() => handlePermissionToggle(emp.employee_id, 'transfer_allowed_store', emp.transfer_allowed_store !== false)} />}
                              label={<Typography variant="caption">Store</Typography>}
                              sx={{ m: 0, height: 28 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            size="small"
                            type="number"
                            value={emp.transfer_limit != null ? emp.transfer_limit : ''}
                            onChange={(e) => setEmployeePermissions(prev =>
                              prev.map(p => p.employee_id === emp.employee_id ? { ...p, transfer_limit: e.target.value === '' ? null : e.target.value } : p)
                            )}
                            onBlur={(e) => handlePermissionValueChange(emp.employee_id, 'transfer_limit', e.target.value)}
                            placeholder="Unlimited"
                            inputProps={{ min: 0, step: '0.01' }}
                            sx={{ width: 110 }}
                            InputProps={{ startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>$</Typography> }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={emp.can_petty_cash !== false}
                            onChange={() => handlePermissionToggle(emp.employee_id, 'can_petty_cash', emp.can_petty_cash !== false)}
                            color="primary"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            size="small"
                            type="number"
                            value={emp.petty_cash_limit != null ? emp.petty_cash_limit : ''}
                            onChange={(e) => setEmployeePermissions(prev =>
                              prev.map(p => p.employee_id === emp.employee_id ? { ...p, petty_cash_limit: e.target.value === '' ? null : e.target.value } : p)
                            )}
                            onBlur={(e) => handlePermissionValueChange(emp.employee_id, 'petty_cash_limit', e.target.value)}
                            placeholder="Unlimited"
                            inputProps={{ min: 0, step: '0.01' }}
                            sx={{ width: 110 }}
                            disabled={emp.can_petty_cash === false}
                            InputProps={{ startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>$</Typography> }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </ConfigSection>
        </StyledPaper>
      </TabPanel>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default SystemConfig;
