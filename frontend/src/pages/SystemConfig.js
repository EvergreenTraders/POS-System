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
  InputLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import config from '../config';

const API_BASE_URL = config.apiUrl;

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
    timezone: 'UTC'
  });

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
  const [caratConversion, setCaratConversion] = useState(null);
  const [isCaratConversionEnabled, setIsCaratConversionEnabled] = useState(false);
  const [isInventoryHoldPeriodEnabled, setIsInventoryHoldPeriodEnabled] = useState(false);
  const [gramsInput, setGramsInput] = useState('');
  const [diamondEstimates, setDiamondEstimates] = useState([]);
  const [inventoryHoldPeriod, setInventoryHoldPeriod] = useState({ days: 7, id: null });
  const [loading, setLoading] = useState(false);
  const [customerColumns, setCustomerColumns] = useState([]);
  const [selectedCustomerColumns, setSelectedCustomerColumns] = useState({});

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

  const fetchCustomerHeaderPreferences = async () => {
    try {
      setLoading(true);
      
      // Fetch the customer preferences directly
      const prefsResponse = await axios.get(`${API_BASE_URL}/customer-preferences/config`);
      const preferences = prefsResponse.data || {};
      
      // Extract all fields that start with 'show_' from the preferences object
      const showFields = Object.keys(preferences).filter(field => field.startsWith('show_'));
      
      // Create mappings between database fields and UI fields
      const dbToUiMapping = {};
      const uiToDbMapping = {};
      
      showFields.forEach(dbField => {
        // Convert show_field_name to field_name for UI
        const uiField = dbField.replace('show_', '');
        dbToUiMapping[dbField] = uiField;
        uiToDbMapping[uiField] = dbField;
      });
      
      // Create preferences object for UI state
      const columnPreferences = {};
      
      // Map database preferences to UI fields
      Object.keys(dbToUiMapping).forEach(dbField => {
        if (preferences[dbField] !== undefined) {
          const uiField = dbToUiMapping[dbField];
          columnPreferences[uiField] = preferences[dbField];
        }
      });

      // Update selected columns state
      setSelectedCustomerColumns(columnPreferences);
      
      // Generate columns array for the UI
      const uiColumns = Object.keys(dbToUiMapping).map(dbField => {
        const uiField = dbToUiMapping[dbField];
        return {
          name: uiField,
          label: uiField.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          type: getColumnType(uiField),
          selected: preferences[dbField] || false
        };
      });
      
      // Update customer columns state for UI display
      setCustomerColumns(uiColumns);
      
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

    // Fetch data on component mount
    fetchCustomerHeaderPreferences();
    fetchPreciousMetalNames();
    fetchLivePricing();
    fetchSpotPrices();
    fetchPriceEstimates();
    fetchDiamondEstimates();
    fetchUserPreference();
    fetchCaratConversion();
    fetchInventoryHoldPeriod();
    fetchTaxConfig();
  }, []);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleGeneralSettingsChange = (event) => {
    const { name, value } = event.target;
    setGeneralSettings(prev => ({
      ...prev,
      [name]: value
    }));
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
        // Convert the selectedCustomerColumns object to the format expected by the API
        const headerPreferences = {
          display_header: true,
          header_style: 'standard'
        };
        
        // Map UI fields to database fields
        Object.keys(selectedCustomerColumns).forEach(uiField => {
          const dbField = 'show_' + uiField; // Correct mapping from UI field to database field
          headerPreferences[dbField] = selectedCustomerColumns[uiField];
        });
        
        await axios.put(`${API_BASE_URL}/customer-preferences/config`, headerPreferences);
      } catch (headerError) {
        console.error('Error saving customer header preferences:', headerError);
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

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
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

  return (
    <Container>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="General" />
          <Tab label="Security" />
          <Tab label="Notifications" />
          <Tab label="Tax Configuration" />
          <Tab label="Pricing Calculator" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <StyledPaper elevation={2}>
          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Business Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Business Name"
                  name="businessName"
                  value={generalSettings.businessName}
                  onChange={handleGeneralSettingsChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={generalSettings.email}
                  onChange={handleGeneralSettingsChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={generalSettings.phone}
                  onChange={handleGeneralSettingsChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Currency"
                  name="currency"
                  value={generalSettings.currency}
                  onChange={handleGeneralSettingsChange}
                />
              </Grid>
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
              <Grid item xs={12} md={6}>
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
            </Grid>
          </ConfigSection>

          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Customer Columns
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="textSecondary" paragraph>
                Select which columns should be displayed as headers in the customer table:
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Select</TableCell>
                      <TableCell>Column Name</TableCell>
                      <TableCell>Display Label</TableCell>
                      <TableCell>Data Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerColumns.map((column) => (
                      <TableRow key={column.name}>
                        <TableCell padding="checkbox">
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={selectedCustomerColumns[column.name] || false}
                                onChange={(e) => {
                                  setSelectedCustomerColumns(prev => ({
                                    ...prev,
                                    [column.name]: e.target.checked
                                  }));
                                }}
                                color="primary"
                                size="small"
                              />
                            }
                            label=""                           
                          />
                        </TableCell>
                        <TableCell><code>{column.name}</code></TableCell>
                        <TableCell>{column.label}</TableCell>
                        <TableCell>{column.type}</TableCell>
                      </TableRow>
                    ))}
                    {customerColumns.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
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
              <Grid container spacing={2}>
                {Object.keys(preciousMetalNames).map((metal) => (
                  <Grid item xs={12} sm={3} key={metal}>
                    <TextField
                      label={`${preciousMetalNames[metal]} Spot Price`}
                      value={spotPrices[metal]}
                      onChange={(e) => handleSpotPriceChange(e, metal)}
                      fullWidth
                    />
                  </Grid>
                ))}
              </Grid>
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
        </StyledPaper>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <StyledPaper elevation={2}>
          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Security Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.requirePasswordChange}
                      onChange={handleSecuritySettingsChange}
                      name="requirePasswordChange"
                    />
                  }
                  label="Require Password Change Every 90 Days"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.twoFactorAuth}
                      onChange={handleSecuritySettingsChange}
                      name="twoFactorAuth"
                    />
                  }
                  label="Enable Two-Factor Authentication"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Session Timeout (minutes)"
                  name="sessionTimeout"
                  value={securitySettings.sessionTimeout}
                  onChange={handleSecuritySettingsChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Login Attempts"
                  name="maxLoginAttempts"
                  value={securitySettings.maxLoginAttempts}
                  onChange={handleSecuritySettingsChange}
                />
              </Grid>
            </Grid>
          </ConfigSection>
        </StyledPaper>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <StyledPaper elevation={2}>
          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Notification Preferences
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onChange={handleNotificationSettingsChange}
                      name="emailNotifications"
                    />
                  }
                  label="Enable Email Notifications"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.lowStockAlerts}
                      onChange={handleNotificationSettingsChange}
                      name="lowStockAlerts"
                    />
                  }
                  label="Low Stock Alerts"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.orderConfirmations}
                      onChange={handleNotificationSettingsChange}
                      name="orderConfirmations"
                    />
                  }
                  label="Order Confirmations"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.dailyReports}
                      onChange={handleNotificationSettingsChange}
                      name="dailyReports"
                    />
                  }
                  label="Daily Reports"
                />
              </Grid>
            </Grid>
          </ConfigSection>
        </StyledPaper>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
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

      <TabPanel value={activeTab} index={4}>
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
