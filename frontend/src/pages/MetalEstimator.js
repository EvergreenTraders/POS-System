import React, { useState, useEffect, useCallback } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Grid,
  Typography,
  Paper,
  Box
} from '@mui/material';
import axios from 'axios';
import config from '../config';

const API_BASE_URL = config.apiUrl;
// Constants
const API_ENDPOINTS = {
  LIVE_PRICING: `${API_BASE_URL}/live_pricing`,
  LIVE_SPOT_PRICES: `${API_BASE_URL}/live_spot_prices`,
  SPOT_PRICES: `${API_BASE_URL}/spot_prices`,
  PRECIOUS_METAL_TYPE: `${API_BASE_URL}/precious_metal_type`,
  NON_PRECIOUS_METAL_TYPE: `${API_BASE_URL}/non_precious_metal_type`,
  METAL_CATEGORY: `${API_BASE_URL}/metal_category`,
  METAL_COLOR: `${API_BASE_URL}/metal_color`,
  METAL_PURITY: `${API_BASE_URL}/metal_purity`
};

const INITIAL_FORM_STATE = {
  preciousMetalTypeId: 1,
  preciousMetalType: 'Gold',
  nonPreciousMetalType: '',
  metalCategory: '',
  jewelryColor: 'Yellow',
  weight: '',
  spotPrice: 0,
  purity: { purity: '', value: 0 },
  value: ''
};

const INITIAL_SPOT_PRICE = {
  CADXAG: 0,
  CADXAU: 0,
  CADXPD: 0,
  CADXPT: 0
};

// Custom hook for handling keyboard navigation
const useKeyboardNavigation = () => {
  const handleEnterKey = useCallback((e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef?.current) {
        nextRef.current.focus();
      }
    }
  }, []);

  const handleSelectChange = useCallback((e, nextRef, handleMetalChange) => {
    handleMetalChange(e);
    if (nextRef?.current) {
      setTimeout(() => nextRef.current.focus(), 0);
    }
  }, []);

  return { handleEnterKey, handleSelectChange };
};

// Custom hook for handling API calls
const useMetalAPI = () => {
  const fetchData = useCallback(async (endpoint) => {
    try {
      const response = await axios.get(endpoint);
      return response.data;
    } catch (error) {
      console.error(`Error fetching data from ${endpoint}:`, error);
      return null;
    }
  }, []);

  const fetchAllMetalData = useCallback(async () => {
    const [
      preciousMetalTypes,
      nonPreciousMetalTypes,
      categories,
      colors
    ] = await Promise.all([
      fetchData(API_ENDPOINTS.PRECIOUS_METAL_TYPE),
      fetchData(API_ENDPOINTS.NON_PRECIOUS_METAL_TYPE),
      fetchData(API_ENDPOINTS.METAL_CATEGORY),
      fetchData(API_ENDPOINTS.METAL_COLOR)
    ]);

    return {
      preciousMetalTypes,
      nonPreciousMetalTypes,
      categories,
      colors
    };
  }, [fetchData]);

  return { fetchData, fetchAllMetalData };
};

// Custom hook for form state management
const useMetalForm = ({
  initialState,
  metalSpotPrice,
  onMetalValueChange,
  preciousMetalTypes,
  metalPurities,
  fetchPurities
}) => {
  const [form, setForm] = useState(initialState);
  const [totalValue, setTotalValue] = useState(0);
  const [isManualOverride, setIsManualOverride] = useState(false);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    
    // Standard form field - always update
    if (name === 'weight' || name === 'spotPrice' || name === 'jewelryColor' || name === 'metalCategory') {
      setForm(prev => ({
        ...prev,
        [name]: value
      }));
      return;
    }

    if (name === 'preciousMetalType') {
      const selectedPreciousMetalType = preciousMetalTypes.find(type => type.type === value);
      // Reset form state for the metal type change
      if (selectedPreciousMetalType?.id) {
        // Fetch the right purities for this metal type
        fetchPurities(selectedPreciousMetalType.id);
      }
      setForm(prev => ({
        ...prev,
        preciousMetalTypeId: selectedPreciousMetalType?.id || '',
        preciousMetalType: value,
        // Reset purity when changing metal type
        purity: { id: '', purity: '', value: 0 },
        jewelryColor: value === 'Gold' ? 'Yellow' : null,
        spotPrice: 
          selectedPreciousMetalType?.type === 'Silver' ? metalSpotPrice.CADXAG :
          selectedPreciousMetalType?.type === 'Gold' ? metalSpotPrice.CADXAU :
          selectedPreciousMetalType?.type === 'Platinum' ? metalSpotPrice.CADXPT : 
          selectedPreciousMetalType?.type === 'Palladium' ? metalSpotPrice.CADXPD : prev.spotPrice
      }));
      setIsManualOverride(false);
      return;
    }

    if (name === 'nonPreciousMetalType') {
      setForm(prev => ({
        ...prev,
        nonPreciousMetalType: value,
        purity: { purity: '', value: 0 }
      }));
      setIsManualOverride(false);
      return;
    }

    if (name === 'purity') {
      const selectedPurity = metalPurities.find(p => p.id === value);
      setForm(prev => ({
        ...prev,
        purity: selectedPurity || { purity: '', value: 0 }
      }));
      setIsManualOverride(false);
      return;
    }

    if (name === 'value') {
      setForm(prev => ({
        ...prev,
        purity: {
          ...prev.purity,
          value: value
        }
      }));
      setIsManualOverride(false);
      return;
    }

    // Instead of calling the non-existent handleFormChange, use direct state update
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'weight') {
      setIsManualOverride(false);
    }
  }, [metalSpotPrice, preciousMetalTypes, metalPurities, fetchPurities]);

  const calculateValue = useCallback(() => {
    if (!isManualOverride && form.weight && form.spotPrice && form.purity) {
      const newValue = form.spotPrice * form.purity.value * form.weight;
      setTotalValue(newValue);
      onMetalValueChange(newValue);
    }
  }, [form.weight, form.spotPrice, form.purity, onMetalValueChange, isManualOverride]);

  useEffect(() => {
    calculateValue();
  }, [calculateValue]);

  const resetForm = useCallback(() => {
    setForm({
      ...initialState,
      spotPrice: metalSpotPrice.CADXAU
    });
    setTotalValue(0);
    setIsManualOverride(false);
  }, [initialState, metalSpotPrice]);

  const handleManualValueChange = useCallback((value) => {
    const newValue = parseFloat(value);
    if (!isNaN(newValue)) {
      setIsManualOverride(true);
      setTotalValue(newValue);
      onMetalValueChange(newValue);
    }
  }, [onMetalValueChange]);

  return {
    form,
    setForm,
    totalValue,
    setTotalValue: handleManualValueChange,
    handleChange,
    resetForm
  };
};

// Custom hook for spot price calculations
const useSpotPriceCalculator = (metalSpotPrice, metalFormState) => {
  const calculateSpotPrice = useCallback((rates, type) => {
    switch(type) {
      case 'Silver':
        return (rates.CADXAG/31).toFixed(2);
      case 'Platinum':
        return (rates.CADXPT/31).toFixed(2);
      case 'Palladium':
        return (rates.CADXPD/31).toFixed(2);
      default: // Gold
        return (rates.CADXAU/31).toFixed(2);
    }
  }, []);

  const updateSpotPrice = useCallback((rates) => {
    return {
      CADXAG: (rates.CADXAG/31).toFixed(2),
      CADXAU: (rates.CADXAU/31).toFixed(2),
      CADXPD: (rates.CADXPD/31).toFixed(2),
      CADXPT: (rates.CADXPT/31).toFixed(2)
    };
  }, []);

  return {
    calculateSpotPrice,
    updateSpotPrice
  };
};

const MetalEstimator = ({ onMetalValueChange = () => {}, onAddMetal = () => {}, setMetalFormState, initialData = null, buttonText = 'Add Metal', hideButtons = false }) => {
  // Add a state to track initialization status
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [preciousMetalTypes, setPreciousMetalTypes] = useState([]);
  const [nonPreciousMetalTypes, setNonPreciousMetalTypes] = useState([]);
  const [metalCategories, setMetalCategories] = useState([]);
  const [metalPurities, setMetalPurities] = useState([]);
  const [metalColors, setMetalColors] = useState([]);
  const [metalSpotPrice, setMetalSpotPrice] = useState(INITIAL_SPOT_PRICE);
  const [lastFetched, setLastFetched] = useState(null);
  const [cachedRates, setCachedRates] = useState({});
  const [isLivePricing, setIsLivePricing] = useState(false);
  const [isPerDay, setIsPerDay] = useState(false);
  const [isPerTransaction, setIsPerTransaction] = useState(false);
  
  const { handleEnterKey, handleSelectChange } = useKeyboardNavigation();
  const { fetchData, fetchAllMetalData } = useMetalAPI();

  const fetchPurities = async (metalTypeId) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.METAL_PURITY}/${metalTypeId}`);
      // Ensure we're setting the data array from the response
      setMetalPurities(response.data || []);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching metal purities:', error);
      setMetalPurities([]);
      return [];
    }
  };

  const { 
    form, 
    setForm, 
    totalValue, 
    setTotalValue,
    handleChange, 
    resetForm 
  } = useMetalForm({
    initialState: INITIAL_FORM_STATE,
    metalSpotPrice,
    onMetalValueChange,
    preciousMetalTypes,
    metalPurities: metalPurities || [], // Ensure metalPurities is always an array
    fetchPurities
  });

  const { calculateSpotPrice, updateSpotPrice } = useSpotPriceCalculator(metalSpotPrice, form);

  // Add refs for form fields
  const weightRef = React.useRef(null);
  const preciousMetalTypeRef = React.useRef(null);
  const nonPreciousMetalTypeRef = React.useRef(null);
  const jewelryColorRef = React.useRef(null);
  const purityRef = React.useRef(null);
  const metalCategoryRef = React.useRef(null);
  const spotPriceRef = React.useRef(null);
  const addButtonRef = React.useRef(null);

  // Initialize form with data from edit mode - comprehensive initialization
  useEffect(() => {
    // Skip if no data available
    if (!initialData) return;
    
    // Skip if already fully initialized with this specific data
    if (isInitialized && 
        form.weight && form.weight === (initialData.metal_weight || initialData.weight) && 
        form.metalCategory && form.metalCategory === (initialData.metal_category || initialData.category) && 
        form.preciousMetalType === (initialData.precious_metal_type || initialData.preciousMetalType)) {
      return;
    }
    
    // Set initial form values
    setForm(prev => {
      // Store initial values to prevent flickering
      const updatedForm = {
        ...prev,
        weight: initialData.metal_weight || initialData.weight || prev.weight || '',
        preciousMetalType: initialData.precious_metal_type || initialData.preciousMetalType || prev.preciousMetalType || '',
        nonPreciousMetalType: initialData.non_precious_metal_type || initialData.nonPreciousMetalType || prev.nonPreciousMetalType || '',
        metalCategory: initialData.metal_category || initialData.category || prev.metalCategory || '',
        jewelryColor: initialData.color || initialData.jewelryColor || prev.jewelryColor || '',
        spotPrice: initialData.metal_spot_price || initialData.spotPrice || prev.spotPrice || 0,
        purity: {
          id: initialData.metal_purity_id || initialData.purity?.id || initialData.purity_id || 
              ((initialData.metal_purity || initialData.purity || initialData.purity_value) && 
              !initialData.metal_purity_id && !initialData.purity_id ? 'custom' : prev.purity?.id || ''),
          purity: initialData.purity?.purity || initialData.metal_purity || initialData.purity || prev.purity?.purity || '',
          value: initialData.purity_value !== undefined ? parseFloat(initialData.purity_value) : 
                 (initialData.purity?.value !== undefined ? initialData.purity.value : prev.purity?.value || 0),
        }
      };
      
      // Save initial values to localStorage to prevent loss during re-renders
      localStorage.setItem('metalEditFormState', JSON.stringify(updatedForm));
      
      return updatedForm;
    });
    
    // If there's an estimated value, set it
    if (initialData.estimated_value || initialData.estimatedValue) {
      const estValue = initialData.estimated_value || initialData.estimatedValue;
      setTotalValue(parseFloat(estValue));
      if (onMetalValueChange) onMetalValueChange(parseFloat(estValue));
    }
    
    // Mark as initialized to prevent duplicate initialization
    setIsInitialized(true);
  }, [initialData, isInitialized, onMetalValueChange, setForm, setTotalValue]);

  // Special useEffect for purity matching based on selected metal type
  // This runs whenever initialData or preciousMetalTypes changes
  useEffect(() => {
    // Skip if custom purity is already set
    if (form.purity?.id === 'custom') {
      return;
    }
    
    if (initialData && preciousMetalTypes.length > 0) {
      // Try to match metal type case-insensitively
      const metalType = initialData.precious_metal_type || initialData.preciousMetalType || '';
      const metalTypeObj = preciousMetalTypes.find(type => 
        type.type.toLowerCase() === metalType.toLowerCase());
      
      const purityValue = initialData.metal_purity || initialData.purity?.purity || initialData.purity || '';
      const numericPurity = initialData.purity_value || initialData.purity?.value || 0;
      
      if (metalTypeObj && metalTypeObj.id) {
        fetchPurities(metalTypeObj.id).then(purities => {
          // Don't continue if we've moved away from initial state
          if (form.purity?.id === 'custom') return;
          
          // For platinum/palladium, match by numeric value
          if (metalType === 'Platinum' || metalType === 'Palladium') {
            const matchingPurity = purities.find(p => 
              parseFloat(p.value) === parseFloat(numericPurity) ||
              p.value === numericPurity
            );
            
            if (matchingPurity) {
              setForm(prev => ({
                ...prev,
                purity: matchingPurity
              }));
            } else if (numericPurity) {
              // Create a custom purity object for unmatched values
              setForm(prev => ({
                ...prev,
                purity: {
                  id: 'custom',
                  purity: '',
                  value: numericPurity
                }
              }));
            }
          } else {
            // For other metals (gold/silver), match by purity text
            const matchingPurity = purities.find(p => 
              p.purity === purityValue ||
              p.purity.toLowerCase() === purityValue.toLowerCase()
            );
            
            if (matchingPurity) {
              setForm(prev => ({
                ...prev,
                purity: matchingPurity
              }));
            } else if (purityValue) {
              // Create a custom purity object for unmatched values
              setForm(prev => ({
                ...prev,
                purity: {
                  id: 'custom',
                  purity: purityValue,
                  value: numericPurity || 0
                }
              }));
            }
          }
        });
      }
    }
  }, [initialData, preciousMetalTypes, fetchPurities, form.purity?.id]);

  // Update purities when precious metal type ID changes
  useEffect(() => {
    if (form.preciousMetalTypeId) {
      fetchPurities(form.preciousMetalTypeId);
    } else {
      setMetalPurities([]);
    }
  }, [form.preciousMetalTypeId, fetchPurities]);
  
  // Focus on weight input when component mounts
  // Skip focus when initializing with edit data to prevent focus stealing
  useEffect(() => {
    if (weightRef.current && !initialData) {
      weightRef.current.focus();
    }
  }, [initialData]);

  // This effect handles restoration of form data if it gets cleared
  useEffect(() => {
    // Only if we're editing and the form is already initialized but any important field is empty
    if (initialData && isInitialized && (!form.weight || !form.metalCategory || !form.preciousMetalType)) {
      // Try to restore from localStorage
      const savedState = localStorage.getItem('metalEditFormState');
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          setForm(prev => ({
            ...prev,
            weight: prev.weight || parsedState.weight,
            metalCategory: prev.metalCategory || parsedState.metalCategory,
            preciousMetalType: prev.preciousMetalType || parsedState.preciousMetalType,
            jewelryColor: prev.jewelryColor || parsedState.jewelryColor,
            purity: prev.purity?.id ? prev.purity : parsedState.purity
          }));
        } catch (e) {
          console.error('Error parsing saved form state:', e);
        }
      } else if (initialData) {
        // Directly use initialData if localStorage fails
        setForm(prev => ({
          ...prev,
          weight: prev.weight || initialData.metal_weight || initialData.weight || '',
          metalCategory: prev.metalCategory || initialData.metal_category || initialData.category || ''
        }));
      }
    }
  }, [initialData, isInitialized, form.weight, form.metalCategory, form.preciousMetalType]);

  // Keep track of any form changes for parent component
  // But don't trigger unnecessary updates that could reset fields
  useEffect(() => {
    if (setMetalFormState && isInitialized) {
      setMetalFormState(form);
    }
  }, [form, setMetalFormState, isInitialized]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const {
          preciousMetalTypes,
          nonPreciousMetalTypes,
          categories,
          colors
        } = await fetchAllMetalData();

        setPreciousMetalTypes(preciousMetalTypes);
        setNonPreciousMetalTypes(nonPreciousMetalTypes);
        setMetalCategories(categories);
        setMetalColors(colors);
      } catch (error) {
        console.error('Error fetching metal data:', error);
      }
    };

    const fetchLivePricing = async () => {
      try {
        const response = await fetchData(API_ENDPOINTS.LIVE_PRICING);
        const data = response[0];
        setIsLivePricing(data.islivepricing);
        setIsPerDay(data.per_day);
        setIsPerTransaction(data.per_transaction);

        if (data.islivepricing) fetchLiveSpotPrice();
        else fetchManualSpotPrice();
      } catch (error) {
        console.error('Error fetching live pricing:', error);
      }
    };

    fetchAllData();
    fetchLivePricing();
    
    // Default to Gold (ID 1) only when not in edit mode
    if (!initialData) {
      fetchPurities(1);
    }
  }, []);
  
  // This useEffect runs when preciousMetalTypes are loaded
  // It handles matching the metal type for edit mode
  useEffect(() => {
    // Only run if we have metal types loaded and we're in edit mode
    if (preciousMetalTypes.length > 0 && initialData) {
      const preciousType = initialData.precious_metal_type || initialData.preciousMetalType;
      
      if (preciousType) {
        // Try to find the matching metal type (case insensitive)
        const metalType = preciousMetalTypes.find(type => 
          type.type.toLowerCase() === preciousType.toLowerCase());
        
        if (metalType) {
          
          // Update the form with the found metal type ID
          setForm(prev => ({
            ...prev,
            preciousMetalTypeId: metalType.id,
            // Ensure the displayed type uses the correct case from the database
            preciousMetalType: metalType.type
          }));
          
          // Fetch purities for this metal type
          fetchPurities(metalType.id);
        } else {
          console.warn('Could not find matching metal type for:', preciousType);
        }
      }
    }
  }, [preciousMetalTypes, initialData, setForm, fetchPurities]);

  /**
   * Fetches the live spot prices for gold, silver, platinum, and palladium
   * from the API and updates the state with the new prices.
   *
   * If the user has selected the "per transaction" pricing option, fetches
   * the prices from the database.
   *
   * If the user has selected the "per day" pricing option, checks if 24
   * hours have passed since the last fetch. If so, fetches the prices from
   * the API and updates the database with the new prices and the current
   * timestamp. Otherwise, uses the cached prices.
   */
  const fetchLiveSpotPrice = async () => {
    try {
      if (isPerTransaction) {
        const response = await fetchData(API_ENDPOINTS.LIVE_SPOT_PRICES);
        const rates = response.rates;
        setMetalSpotPrice({
          CADXAG: (rates.CADXAG / 31).toFixed(2),
          CADXAU: (rates.CADXAU / 31).toFixed(2),
          CADXPD: (rates.CADXPD / 31).toFixed(2),
          CADXPT: (rates.CADXPT / 31).toFixed(2)
        });

        // Set spot price based on selected metal category
        switch (form.metalCategory) {
          case 'Silver':
            form.spotPrice = (response.data.rates.CADXAG / 31).toFixed(2);
            break;
          case 'Platinum':
            form.spotPrice = (response.data.rates.CADXPT / 31).toFixed(2);
            break;
          case 'Palladium':
            form.spotPrice = (response.data.rates.CADXPD / 31).toFixed(2);
            break;
          default: // Gold
            form.spotPrice = (response.data.rates.CADXAU / 31).toFixed(2);
        }
        setForm({ ...form });
      } else {
        const now = new Date();

        // Check if 24 hours have passed
        const hoursDifference = Math.abs(now - lastFetched) / 36e5; // Convert milliseconds to hours
        if (hoursDifference >= 24) {
          const apiResponse = await axios.get('https://api.metalpriceapi.com/v1/latest?api_key=8b7bc38e033b653f05f39fd6dc809ca4&base=CAD&currencies=XPD,XAU,XAG,XPT');
          const rates = apiResponse.data.rates;

          // Update state with new rates and timestamp
          setCachedRates({
            CADXAG: (rates.CADXAG / 31).toFixed(2),
            CADXAU: (rates.CADXAU / 31).toFixed(2),
            CADXPD: (rates.CADXPD / 31).toFixed(2),
            CADXPT: (rates.CADXPT / 31).toFixed(2)
          });
          setLastFetched(now);

          // Update the database with new prices and the current timestamp
          await axios.put(API_ENDPOINTS.LIVE_SPOT_PRICES, {
            CADXAG: (rates.CADXAG / 31).toFixed(2),
            CADXAU: (rates.CADXAU / 31).toFixed(2),
            CADXPD: (rates.CADXPD / 31).toFixed(2),
            CADXPT: (rates.CADXPT / 31).toFixed(2),
            last_fetched: now.toISOString()
          });

          setMetalSpotPrice({
            CADXAG: (rates.CADXAG / 31).toFixed(2),
            CADXAU: (rates.CADXAU / 31).toFixed(2),
            CADXPD: (rates.CADXPD / 31).toFixed(2),
            CADXPT: (rates.CADXPT / 31).toFixed(2)
          });

          // Set spot price based on selected metal category
          switch (form.metalCategory) {
            case 'Silver':
              form.spotPrice = (rates.CADXAG / 31).toFixed(2);
              break;
            case 'Platinum':
              form.spotPrice = (rates.CADXPT / 31).toFixed(2);
              break;
            case 'Palladium':
              form.spotPrice = (rates.CADXPD / 31).toFixed(2);
              break;
            default: // Gold
              form.spotPrice = (rates.CADXAU / 31).toFixed(2);
          }
          setForm({ ...form });
        } else {
          setMetalSpotPrice(cachedRates);
          // Set spot price based on selected metal category
          switch (form.preciousMetalType) {
            case 'Silver':
              form.spotPrice = cachedRates.CADXAG;
              break;
            case 'Platinum':
              form.spotPrice = cachedRates.CADXPT;
              break;
            case 'Palladium':
              form.spotPrice = cachedRates.CADXPD;
              break;
            default: // Gold
              form.spotPrice = cachedRates.CADXAU;
          }
          setForm({ ...form });
        }
      }
    } catch (error) {
      console.error('Error fetching spot price:', error);
    }
  };

  const fetchManualSpotPrice = async () => {
    try {
      const response = await fetchData(API_ENDPOINTS.SPOT_PRICES);
      const prices = {};
      response.forEach(item => {
        prices[item.precious_metal_type_id] = item.spot_price;
      })
      setMetalSpotPrice({
        CADXAU: prices[1],
        CADXPT: prices[2],
        CADXAG: prices[3],
        CADXPD: prices[4]
      });
      form.spotPrice = prices[1];
    } catch (error) {
      console.error('Error fetching spot prices:', error);
    }
  };

  const addMetal = async () => {

    // Show confirm button in edit mode
    if (onAddMetal) {
      let purities = [];
      const foundPurity = metalPurities.find(p => p.id === form.purity?.id);
      if (foundPurity) {
        purities = [foundPurity];
      } else if (form.purity) {
        purities = [form.purity];
      }

      const metalData = {
        metal_weight: form.weight ? parseFloat(form.weight) : 0,
        precious_metal_type: form.preciousMetalType,
        non_precious_metal_type: form.nonPreciousMetalType,
        metal_category: form.metalCategory,
        color: form.jewelryColor,
        metal_spot_price: form.spotPrice,
        purity_id: form.purity?.id !== 'custom' ? form.purity?.id : null,
        metal_purity: form.purity?.purity || '',
        purity_value: form.purity?.value || 0,
        estimated_value: totalValue,
        purities
      };
      
      onAddMetal(metalData);
      
      // Reset form only if not editing
      if (!initialData) {
        resetForm();
      } else {
        // When editing, preserve the values instead of resetting
        setIsInitialized(true);
      }
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>ESTIMATE METAL</Typography>
      <TextField
        fullWidth
        label="Weight (g) *"
        name="weight"
        value={form.weight}
        onChange={handleChange}
        sx={{ mb: 2 }}
        inputRef={weightRef}
        onKeyDown={(e) => handleEnterKey(e, preciousMetalTypeRef)}
      />
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Precious Metal Type *</InputLabel>
        <Select
          name="preciousMetalType"
          value={form.preciousMetalType}
          onChange={(e) => handleSelectChange(e, nonPreciousMetalTypeRef, handleChange)}
          required
          inputRef={preciousMetalTypeRef}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const select = e.target.closest('.MuiSelect-select');
              const expanded = select?.getAttribute('aria-expanded') === 'true';

              // If dropdown is not open, move to next field
              if (!expanded) {
                e.preventDefault();
                e.stopPropagation();
                nonPreciousMetalTypeRef.current?.focus();
              }
            }
          }}
          onClose={() => {
            // When dropdown closes and value is Gold, move to next field
            if (form.preciousMetalType === 'Gold') {
              setTimeout(() => {
                nonPreciousMetalTypeRef.current?.focus();
              }, 0);
            }
          }}
        >
          {preciousMetalTypes.map(type => (
            <MenuItem key={type.id} value={type.type}>{type.type}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Non-Precious Metal Type</InputLabel>
        <Select
          name="nonPreciousMetalType"
          value={form.nonPreciousMetalType}
          onChange={(e) => handleSelectChange(e, form.preciousMetalType === 'Gold' ? jewelryColorRef : purityRef, handleChange)}
          required
          inputRef={nonPreciousMetalTypeRef}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const select = e.target.closest('.MuiSelect-select');
              const expanded = select?.getAttribute('aria-expanded') === 'true';
              if (!expanded) {
                e.preventDefault();
                e.stopPropagation();
                if (form.preciousMetalType === 'Gold') {
                  jewelryColorRef.current?.focus();
                } else {
                  purityRef.current?.focus();
                }
              }
            }
          }}
          onClose={() => {
            if (form.nonPreciousMetalType === '') {
              setTimeout(() => {
                if (form.preciousMetalType === 'Gold') {
                  jewelryColorRef.current?.focus();
                } else {
                  purityRef.current?.focus();
                }
              }, 0);
            }
          }}
        >
          {nonPreciousMetalTypes.map(type => (
            <MenuItem key={type.id} value={type.type}>{type.type}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {form.preciousMetalType === 'Gold' && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select Jewelry Color *</InputLabel>
          <Select
            name="jewelryColor"
            value={form.jewelryColor}
            onChange={(e) => handleSelectChange(e, purityRef, handleChange)}
            required
            inputRef={jewelryColorRef}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const select = e.target.closest('.MuiSelect-select');
                const expanded = select?.getAttribute('aria-expanded') === 'true';
                if (!expanded) {
                  e.preventDefault();
                  e.stopPropagation();
                  purityRef.current?.focus();
                }
              }
            }}
            onClose={() => {
              if (form.jewelryColor === 'Yellow') {
                setTimeout(() => {
                  purityRef.current?.focus();
                }, 0);
              }
            }}
          >
            {metalColors.map(color => (
              <MenuItem key={color.id} value={color.color}>{color.color}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={form.preciousMetalType === 'Platinum' || form.preciousMetalType === 'Palladium' ? 12 : 6}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Purity *</InputLabel>
            <Select
              name="purity"
              value={form.purity?.id || ''}
              onChange={(e) => {
                // Don't do anything for custom values in dropdown
                if (e.target.value === 'custom') return;
                
                // Find the selected purity object
                const selectedPurityObj = metalPurities.find(p => p.id === e.target.value);
                
                // Update the form with the selected purity
                if (selectedPurityObj) {
                  setForm(prev => ({
                    ...prev,
                    purity: selectedPurityObj
                  }));
                }
              }}
              required
              inputRef={purityRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const select = e.target.closest('.MuiSelect-select');
                  const expanded = select?.getAttribute('aria-expanded') === 'true';
                  if (!expanded) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (form.preciousMetalType !== 'Platinum' && form.preciousMetalType !== 'Palladium') {
                      const valueField = document.querySelector('input[name="value"]');
                      if (valueField) valueField.focus();
                    } else {
                      metalCategoryRef.current?.focus();
                    }
                  }
                }
              }}
              onClose={() => {
                if (form.purity?.id === '') {
                  setTimeout(() => {
                    if (form.preciousMetalType !== 'Platinum' && form.preciousMetalType !== 'Palladium') {
                      const valueField = document.querySelector('input[name="value"]');
                      if (valueField) valueField.focus();
                    } else {
                      metalCategoryRef.current?.focus();
                    }
                  }, 0);
                }
              }}
            >
              {/* Include custom value option if present */}
              {form.purity?.id === 'custom' && (
                <MenuItem key="custom" value="custom">
                  {form.preciousMetalType === 'Platinum' || form.preciousMetalType === 'Palladium'
                    ? form.purity.value
                    : form.purity.purity}
                </MenuItem>
              )}
              
              {/* Standard options - filter out any duplicates that match the current custom value */}
              {metalPurities
                .filter(purity => {
                  // Filter out duplicates if there's a custom purity selected
                  if (form.purity?.id === 'custom') {
                    // For Platinum/Palladium, compare by value
                    if (form.preciousMetalType === 'Platinum' || form.preciousMetalType === 'Palladium') {
                      return purity.value !== form.purity.value;
                    }
                    // For other metals, compare by purity text
                    return purity.purity !== form.purity.purity;
                  }
                  return true; // Keep all purities if there's no custom purity
                })
                .map(purity => (
                  <MenuItem key={purity.id} value={purity.id}>
                    {form.preciousMetalType === 'Platinum' || form.preciousMetalType === 'Palladium'
                      ? purity.value
                      : purity.purity}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={form.preciousMetalType !== 'Platinum' && form.preciousMetalType !== 'Palladium' ? 6 : 0}>
          {form.preciousMetalType !== 'Platinum' && form.preciousMetalType !== 'Palladium' && (
            <TextField
              fullWidth
              label="Value"
              name="value"
              type="decimal"
              value={form.purity?.value || ''}
              onChange={(e) => {
                // Update the purity.value directly
                setForm(prev => ({
                  ...prev,
                  purity: {
                    ...prev.purity,
                    value: e.target.value
                  }
                }));
              }}
              inputProps={{
                min: 0,
                inputMode: 'decimal',
                pattern: '[0-9]*\.?[0-9]*'
              }}
              onKeyDown={(e) => handleEnterKey(e, metalCategoryRef)}
            />
          )}
        </Grid>
      </Grid>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Metal Category *</InputLabel>
        <Select
          name="metalCategory"
          value={form.metalCategory}
          onChange={(e) => handleSelectChange(e, spotPriceRef, handleChange)}
          required
          inputRef={metalCategoryRef}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const select = e.target.closest('.MuiSelect-select');
              const expanded = select?.getAttribute('aria-expanded') === 'true';
              if (!expanded) {
                e.preventDefault();
                e.stopPropagation();
                spotPriceRef.current?.focus();
              }
            }
          }}
          onClose={() => {
            if (form.metalCategory === '') {
              setTimeout(() => {
                spotPriceRef.current?.focus();
              }, 0);
            }
          }}
        >
          {metalCategories.map(category => (
            <MenuItem key={category.id} value={category.category}>{category.category}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box display="flex" alignItems="center">
        <TextField
          fullWidth
          label="Spot Price/gr"
          name="spotPrice"
          value={form.spotPrice}
          onChange={handleChange}
          sx={{ mb: 2 }}
          inputRef={spotPriceRef}
          onKeyDown={(e) => handleEnterKey(e, addButtonRef)}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={fetchLiveSpotPrice}
          sx={{ mb: 1 }}
        >
          Update
        </Button>
      </Box>
      <Button
        variant="contained"
        onClick={addMetal}
        fullWidth
        sx={{ mt: 2 }}
        ref={addButtonRef}
        disabled={!form.preciousMetalType || !form.purity || !form.metalCategory || !form.weight || (form.preciousMetalType === 'Gold' && !form.jewelryColor)}
      >
        {buttonText}
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', mr: 0 }}>
          Est. Metal Value: $
        </Typography>
        <TextField
          size="small"
          type="number"
          value={totalValue.toFixed(1)}
          variant="standard"
          onChange={(e) => {
            const newValue = parseFloat(e.target.value);
            setTotalValue(newValue);
            onMetalValueChange(newValue);
          }}
          inputProps={{
            min: 0,
            style: { width: '100px' }
          }}
          sx={{
            ml: 1,
            '& .MuiInputBase-root': {
              ml: 0,
              pl: 0
            }
          }}
        />
      </Box>

    </Paper>
  );
};

export default MetalEstimator;