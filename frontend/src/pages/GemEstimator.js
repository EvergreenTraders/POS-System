import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Grid,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControlLabel,
  Checkbox,
  Slider,
  Radio,
  RadioGroup,
  Tab,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import config from '../config';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';

function GemEstimator({ onAddGem, onGemValueChange = () => {}, setGemFormState, initialData = null, hideButtons = false, editMode: editModeProp = false }) {
  const API_BASE_URL = config.apiUrl;
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // App state
  const [isCaratConversionEnabled, setIsCaratConversionEnabled] = useState(false);
  const [from, setFrom] = useState(location.state?.from || '');
  const [editMode, setEditMode] = useState(editModeProp || location.state?.editMode || false);
  const [editingGemOnly, setEditingGemOnly] = useState(location.state?.editingGemOnly || false);
  const [returnToTicket, setReturnToTicket] = useState(location.state?.returnToTicket || false);
  const [ticketItemId, setTicketItemId] = useState(location.state?.ticketItemId || null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('primary_gem_diamond');
  const [selectedSecondaryIndex, setSelectedSecondaryIndex] = useState(0);

  // Update editMode when prop changes
  useEffect(() => {
    if (editModeProp) {
      setEditMode(true);
    }
  }, [editModeProp]);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Function to show snackbar messages
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  
  // Function to hide snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  const [customer, setCustomer] = useState(location.state?.customer || null);
  const [transactionType, setTransactionType] = useState(location.state?.itemToEdit?.transaction_type || 'buy');
  const [freeText, setFreeText] = useState(location.state?.itemToEdit?.notes || '');
  const [diamondSummary, setDiamondSummary] = useState([]);
  const [stoneSummary, setStoneSummary] = useState([]);
  const [secondaryGems, setSecondaryGems] = useState(initialData?.secondaryGems || []);
  const [addedGemTypes, setAddedGemTypes] = useState({
    primary: null,  // can be 'diamond' or 'stone'
    secondary: []   // array of objects with type: 'diamond' or 'stone' and index
  });

  // Primary gem form
  const [primaryDiamondForm, setPrimaryDiamondForm] = useState({
    shape: 'Round',
    clarity: 'Flawless',
    color: 'Colorless',
    quantity: 1,
    weight: 0,
    cut: '',
    labGrown: false,
    exactColor: 'D',
    size: '',
    estimatedValue: 0
  });

  // Secondary gem form
  const [secondaryDiamondForm, setSecondaryDiamondForm] = useState({
    shape: 'Round',
    clarity: 'Flawless',
    color: 'Colorless',
    quantity: 1,
    weight: 0,
    cut: '',
    labGrown: false,
    exactColor: 'D',
    size: '',
    estimatedValue: 0
  });

  const initialStoneForm = {
    name: '',
    shape: '',
    color: 'Red',
    color_id: 5,
    weight: '',
    width: '',
    depth: '',
    quantity: 1,
    authentic: false,
    valuationType: 'each',
    estimatedValue: 0
  };
  const formState = {
    diamonds: [],
    stones: [],
    secondaryGems: []
  };

  const [primaryStoneForm, setPrimaryStoneForm] = useState(initialStoneForm);
  const [secondaryStoneForm, setSecondaryStoneForm] = useState(initialStoneForm);

  // Function to initialize secondary gem form
  const initializeSecondaryGem = (gem, setActive = true) => {
    if (!gem) return;
    
    // Check if we're dealing with an array of secondary gems
    if (Array.isArray(addedGemTypes.secondary)) {
      // Find the index of the current gem in the secondaryGems array
      const gemIndex = secondaryGems.findIndex(g => 
        g.id === gem.id || 
        (g.secondary_gem_category === gem.secondary_gem_category && 
         g.secondary_gem_type === gem.secondary_gem_type &&
         g.secondary_gem_shape === gem.secondary_gem_shape &&
         g.secondary_gem_color === gem.secondary_gem_color)
      );
      
      if (gemIndex === -1) return; // Gem not found in array
      
      const gemType = gem.secondary_gem_category === 'diamond' ? 'diamond' : 'stone';

      // Update the specific gem in the addedGemTypes.secondary array
      setAddedGemTypes(prev => ({
        ...prev,
        secondary: Array.isArray(prev.secondary)
          ? prev.secondary.map((item, idx) => idx === gemIndex ? gemType : item)
          : [gemType]
      }));
      
      if (gemType === 'diamond') {
        setSecondaryDiamondForm({
          shape: gem.secondary_gem_shape || 'Round',
          clarity: gem.secondary_gem_clarity || 'Flawless',
          color: gem.secondary_gem_color || 'Colorless',
          quantity: gem.secondary_gem_quantity || 1,
          weight: gem.secondary_gem_weight || 0,
          cut: gem.secondary_gem_cut || '',
          labGrown: gem.secondary_gem_lab_grown || false,
          exactColor: gem.secondary_gem_exact_color || 'D',
          size: gem.secondary_gem_size,
          estimatedValue: gem.secondary_gem_value || 0,
          gemIndex: gemIndex // Store the index for reference
        });
        
        if (setActive) {
          setActiveTab('secondary_gem_diamond');
        }
        
        if (gem.secondary_gem_value !== undefined) {
          setEstimatedValues(prev => ({
            ...prev,
            secondaryDiamond: parseFloat(gem.secondary_gem_value) || 0
          }));
        }
      } else {
        // Find the matching color to get the color_id
        const colorMatch = stoneColors.find(color => color.color === (gem.secondary_gem_color || 'Red'));
        
        setSecondaryStoneForm({
          type: gem.secondary_gem_type || '',
          name: gem.secondary_gem_type || '',
          shape: gem.secondary_gem_shape || 'Round',
          color: gem.secondary_gem_color || 'Red',
          color_id: colorMatch ? colorMatch.id : 5, // Default to Red (id: 5) if not found
          quantity: gem.secondary_gem_quantity || 1,
          weight: gem.secondary_gem_weight || 0,
          width: gem.secondary_gem_width || '',
          depth: gem.secondary_gem_depth || '',
          authentic: gem.secondary_gem_authentic || false,
          estimatedValue: gem.secondary_gem_value || 0,
          gemIndex: gemIndex // Store the index for reference
        });
        
        if (setActive) {
          setActiveTab('secondary_gem_stone');
        }
        
        if (gem.secondary_gem_value !== undefined) {
          setEstimatedValues(prev => ({
            ...prev,
            secondaryGemstone: parseFloat(gem.secondary_gem_value) || 0
          }));
        }
      }
    } else {
      // Legacy handling for non-array secondary gems
      const gemType = gem.secondary_gem_category === 'diamond' ? 'diamond' : 'stone';
      setAddedGemTypes(prev => ({ ...prev, secondary: [gemType] }));
      
      if (gemType === 'diamond') {
        setSecondaryDiamondForm({
          shape: gem.secondary_gem_shape || 'Round',
          clarity: gem.secondary_gem_clarity || 'Flawless',
          color: gem.secondary_gem_color || 'Colorless',
          quantity: gem.secondary_gem_quantity || 1,
          weight: gem.secondary_gem_weight || 0,
          cut: gem.secondary_gem_cut || '',
          labGrown: gem.secondary_gem_lab_grown || false,
          exactColor: gem.secondary_gem_exact_color || 'D',
          size: gem.secondary_gem_size || '',
          estimatedValue: gem.secondary_gem_value || 0
        });
        if (setActive) {
          setActiveTab('secondary_gem_diamond');
        }
        
        if (gem.secondary_gem_value !== undefined) {
          setEstimatedValues(prev => ({
            ...prev,
            secondaryDiamond: parseFloat(gem.secondary_gem_value) || 0
          }));
        }
      } else {
        // Find the matching color to get the color_id
        const colorMatch = stoneColors.find(color => color.color === (gem.secondary_gem_color || 'Red'));
        
        setSecondaryStoneForm({
          type: gem.secondary_gem_type || '',
          name: gem.secondary_gem_type || '',
          shape: gem.secondary_gem_shape || 'Round',
          color: gem.secondary_gem_color || 'Red',
          color_id: colorMatch ? colorMatch.id : 5, // Default to Red (id: 5) if not found
          quantity: gem.secondary_gem_quantity || 1,
          weight: gem.secondary_gem_weight || 0,
          width: gem.secondary_gem_width || '',
          depth: gem.secondary_gem_depth || '',
          authentic: gem.secondary_gem_authentic || false,
          estimatedValue: gem.secondary_gem_value || 0
        });
        
        if (setActive) {
          setActiveTab('secondary_gem_stone');
        }
        
        if (gem.secondary_gem_value !== undefined) {
          setEstimatedValues(prev => ({
            ...prev,
            secondaryGemstone: parseFloat(gem.secondary_gem_value) || 0
          }));
        }
      }
    }
  };

  // Use a ref to store the latest gem updates
  const latestGemUpdates = useRef(null);

  // Initialize form when selected secondary gem changes
  useEffect(() => {
    // Only run if we have secondary gems
    if (secondaryGems.length > 0) {
      // Use the current selectedSecondaryIndex, defaulting to 0 only if null/undefined
      const gemIndex = selectedSecondaryIndex ?? 0;

      // Ensure the index is within bounds
      const validIndex = Math.max(0, Math.min(gemIndex, secondaryGems.length - 1));

      // Use the latest gem updates if available, otherwise fall back to the current gem
      const currentGem = latestGemUpdates.current?.[validIndex] || secondaryGems[validIndex];

      if (currentGem) {
        // Determine the gem type and set the active tab accordingly
        const gemType = currentGem.secondary_gem_category || (currentGem.type || '').toLowerCase();
        const expectedTab = `secondary_gem_${gemType}`;

        // Only update the tab if we're not already on the correct tab
        if (!activeTab.startsWith(`secondary_gem_${gemType}`)) {
          setActiveTab(expectedTab);
        }

        // Initialize the form with the current gem data
        initializeSecondaryGem(currentGem, false);
      }

      // Ensure selectedSecondaryIndex is set and valid
      if (selectedSecondaryIndex === undefined ||
          selectedSecondaryIndex === null ||
          selectedSecondaryIndex < 0 ||
          selectedSecondaryIndex >= secondaryGems.length) {
        setSelectedSecondaryIndex(0);
      }
    }
  }, [selectedSecondaryIndex, secondaryGems.length]);

  // Initialize component with initialData
  useEffect(() => {
    if (initialData && !isInitialized) {
      // Initialize primary gem type based on available data
      if (initialData.primary_gem_category || initialData.diamond_shape || initialData.stone_name) {
        const primaryGemType = initialData.primary_gem_category === 'diamond' || initialData.diamond_shape ? 'diamond' : 'stone';
        setAddedGemTypes(prev => ({ ...prev, primary: primaryGemType }));
      }

      // Initialize secondary gems if they exist in initialData
      // Check both secondaryGems (camelCase) and secondary_gems (underscore) for compatibility
      const secondaryGemsData = initialData.secondaryGems || initialData.secondary_gems;
      if (secondaryGemsData && secondaryGemsData.length > 0) {
        setSecondaryGems(secondaryGemsData);
        const secondaryGemTypes = secondaryGemsData.map(gem =>
          gem.secondary_gem_category === 'diamond' ? 'diamond' : 'stone'
        );
        setAddedGemTypes(prev => ({
          ...prev,
          secondary: secondaryGemTypes
        }));

        // Initialize the first secondary gem for display (only on initial load)
        const firstGem = secondaryGemsData[0];
        if (firstGem) {
          const gemType = firstGem.secondary_gem_category === 'diamond' ? 'diamond' : 'stone';

          if (gemType === 'diamond') {
            setSecondaryDiamondForm({
              shape: firstGem.secondary_gem_shape || 'Round',
              clarity: firstGem.secondary_gem_clarity || 'Flawless',
              color: firstGem.secondary_gem_color || 'Colorless',
              quantity: firstGem.secondary_gem_quantity || 1,
              weight: firstGem.secondary_gem_weight || 0,
              cut: firstGem.secondary_gem_cut || '',
              labGrown: firstGem.secondary_gem_lab_grown || false,
              exactColor: firstGem.secondary_gem_exact_color || 'D',
              size: firstGem.secondary_gem_size || '',
              estimatedValue: firstGem.secondary_gem_value || 0
            });

            setEstimatedValues(prev => ({
              ...prev,
              secondaryDiamond: parseFloat(firstGem.secondary_gem_value) || 0
            }));
          } else {
            setSecondaryStoneForm({
              type: firstGem.secondary_gem_type || '',
              name: firstGem.secondary_gem_type || '',
              shape: firstGem.secondary_gem_shape || 'Round',
              color: firstGem.secondary_gem_color || 'Red',
              quantity: firstGem.secondary_gem_quantity || 1,
              weight: firstGem.secondary_gem_weight || 0,
              authentic: firstGem.secondary_gem_authentic || false,
              estimatedValue: firstGem.secondary_gem_value || 0
            });

            setEstimatedValues(prev => ({
              ...prev,
              secondaryGemstone: parseFloat(firstGem.secondary_gem_value) || 0
            }));
          }

          setSelectedSecondaryIndex(0);
        }
      }


      setIsInitialized(true);
    }
  }, [initialData, isInitialized]);

  // Sync secondaryGems when initialData changes after initialization (without resetting selection)
  useEffect(() => {
    if (initialData && isInitialized) {
      const secondaryGemsData = initialData.secondaryGems || initialData.secondary_gems;
      if (secondaryGemsData && secondaryGemsData.length > 0) {
        // Only update if the data has actually changed
        const currentGemsJSON = JSON.stringify(secondaryGems);
        const newGemsJSON = JSON.stringify(secondaryGemsData);

        if (currentGemsJSON !== newGemsJSON) {
          setSecondaryGems(secondaryGemsData);

          // Update the current form with the selected gem (preserve selection)
          const currentIndex = selectedSecondaryIndex ?? 0;
          if (secondaryGemsData[currentIndex]) {
            initializeSecondaryGem(secondaryGemsData[currentIndex], false);
          }
        }
      }
    }
  }, [initialData?.secondaryGems, isInitialized]);

  // Update parent component with form state when it changes
  useEffect(() => {
    if (setGemFormState && isInitialized) {
      // Add primary gem
      if (addedGemTypes.primary === 'diamond') {
        formState.diamonds.push(primaryDiamondForm);
      } else if (addedGemTypes.primary === 'stone') {
        formState.stones.push(primaryStoneForm);
      }

      // Add all secondary gems from the secondaryGems array
      if (secondaryGems && secondaryGems.length > 0) {
        formState.secondaryGems = [...latestGemUpdates.current || secondaryGems];
      } else {
        // Fallback to the current form state if no secondaryGems array is available
        const currentSecondaryGem = addedGemTypes.secondary === 'diamond' 
          ? { ...secondaryDiamondForm, secondary_gem_category: 'diamond' }
          : addedGemTypes.secondary === 'stone'
            ? { ...secondaryStoneForm, secondary_gem_category: 'stone' }
            : null;
        
        if (currentSecondaryGem) {
          formState.secondaryGems.push(currentSecondaryGem);
        }
      }
      setGemFormState(formState);
    }
  }, [
    primaryDiamondForm, 
    primaryStoneForm, 
    secondaryDiamondForm,
    secondaryStoneForm,
    addedGemTypes, 
    setGemFormState,
    secondaryGems,
    isInitialized
  ]);

  // Diamond and stone related functions only below

  const handleDeleteGem = (index, type, isPrimary) => {
    const gemPosition = isPrimary ? 'primary' : 'secondary';

    if (type === 'diamond') {
      setDiamondSummary(prev => prev.filter((_, i) => i !== index));
    } else {
      setStoneSummary(prev => prev.filter((_, i) => i !== index));
    }

    // Clear the gem type when deleted
    if (isPrimary) {
      setAddedGemTypes(prev => ({
        ...prev,
        primary: null
      }));
    } else {
      // For secondary gems, remove the specific type from the array
      setAddedGemTypes(prev => ({
        ...prev,
        secondary: Array.isArray(prev.secondary)
          ? prev.secondary.filter((_, i) => i !== index)
          : []
      }));
    }
  };
  

  // Handle tab change from the RadioGroup controls
  const handleTabChange = (event, newTab) => {
    // Only proceed if this is actually a tab change
    if (newTab === activeTab) return;
    
    // Handle secondary gem tab changes
    if (newTab.startsWith('secondary_gem_')) {
      const gemType = newTab.replace('secondary_gem_', '');
      
      // If no gems exist, create a new one
      if (secondaryGems.length === 0) {
        const newGem = createNewGem(gemType);
        setSecondaryGems([newGem]);
        setSelectedSecondaryIndex(0);
        
        // Update addedGemTypes to track this new gem
        setAddedGemTypes(prev => ({
          ...prev,
          secondary: [gemType]
        }));
        
        setActiveTab(newTab);
        initializeSecondaryGem(newGem, true);
        return;
      }
      
      // Get the current gem or default to the first one
      const currentGemIndex = Math.max(0, selectedSecondaryIndex);
      const currentGem = secondaryGems[currentGemIndex];
      
      if (currentGem) {
        // Create an updated gem with the new type
        const updatedGem = {
          ...currentGem,
          secondary_gem_category: gemType
        };
        
        // Update the gems array
        const updatedGems = [...secondaryGems];
        updatedGems[currentGemIndex] = updatedGem;

        // Update the gem type in addedGemTypes
        setAddedGemTypes(prev => ({
          ...prev,
          secondary: Array.isArray(prev.secondary)
            ? prev.secondary.map((item, idx) => idx === currentGemIndex ? gemType : item)
            : [gemType]
        }));
        
        setSecondaryGems(updatedGems);
        setActiveTab(newTab);
        initializeSecondaryGem(updatedGem, true);
        return;
      }
    }
    
    // For primary gem tabs or other tabs, just update the active tab
    setActiveTab(newTab);
  };

  // Helper function to create a new gem with default values
  const createNewGem = (type) => {
    return type === 'diamond' 
      ? {
          secondary_gem_category: 'diamond',
          secondary_gem_shape: 'Round',
          secondary_gem_clarity: 'Flawless',
          secondary_gem_color: 'Colorless',
          secondary_gem_quantity: 1,
          secondary_gem_weight: 0,
          secondary_gem_cut: '',
          secondary_gem_lab_grown: false,
          secondary_gem_exact_color: 'D',
          secondary_gem_size: '',
          secondary_gem_value: 0
        }
      : {
          secondary_gem_category: 'stone',
          secondary_gem_type: '',
          secondary_gem_name: '',
          secondary_gem_shape: 'Round',
          secondary_gem_color: 'Red',
          secondary_gem_color_id: 5,
          secondary_gem_quantity: 1,
          secondary_gem_weight: 0,
          secondary_gem_width: '',
          secondary_gem_depth: '',
          secondary_gem_authentic: false,
          secondary_gem_value: 0
        };
  };


  const [estimatedValues, setEstimatedValues] = useState({
    primaryDiamond: 0,
    primaryGemstone: 0,
    secondaryDiamond: 0,
    secondaryGemstone: 0
  });

  const [totalDiamondValue, setTotalDiamondValue] = useState(0);
  const [priceEstimatePercentages, setPriceEstimatePercentages] = useState({});

  const [diamondValuationType, setDiamondValuationType] = useState('each');

  const [exactColor, setExactColor] = useState('D');

  const colorScale = Array.from({length: 23}, (_, i) => 
    String.fromCharCode(68 + i) // Starting from 'D'
  );

  const [diamondShapes, setDiamondShapes] = useState([]);

  const [diamondClarity, setDiamondClarity] = useState([]);
  const [selectedClarityIndex, setSelectedClarityIndex] = useState(0);

  const [diamondSizes, setDiamondSizes] = useState([]);

  const [diamondCuts, setDiamondCuts] = useState([]);

  const [diamondColors, setDiamondColors] = useState([]);

  const [stoneTypes, setStoneTypes] = useState([]);
  const [colorSpecificStoneTypes, setColorSpecificStoneTypes] = useState([]);

  const [stoneShapes, setStoneShapes] = useState([]);

  const [stoneColors, setStoneColors] = useState([]);

  const [caratConversion, setCaratConversion] = useState(null);


  // Effect to handle edit mode data when component mounts
  useEffect(() => {
    // Initialize from initialData prop (when used in dialogs/other components)
    if (initialData) {
      // Determine if we have diamond or stone as primary gem
      let primaryGemType = null;
      
      // First check primary_gem_category
      if (initialData.primary_gem_category) {
        primaryGemType = initialData.primary_gem_category.toLowerCase();
      } 
      // Check if we have direct gem fields populated
      else if (initialData.diamond_shape || initialData.diamond_weight) {
        primaryGemType = 'diamond';
      } 
      else if (initialData.stone_type || initialData.stone_name) {
        primaryGemType = 'stone';
      }
      
      // Set the active tab based on detected gem type
      if (primaryGemType) {
        const gemType = primaryGemType === 'diamond' ? 'primary_gem_diamond' : 'primary_gem_stone';
        setActiveTab(gemType);
        
        // Set the gem type in our tracking state
        setAddedGemTypes(prev => ({
          ...prev,
          primary: primaryGemType
        }));
        
        if (primaryGemType === 'diamond') {
          // Get the exactColor value first
          const savedExactColor = initialData.primary_gem_exact_color || initialData.diamond_exact_color || 'D';
          
          // Set the exactColor state for the color slider
          setExactColor(savedExactColor);
          
          // Get the clarity value from initialData
          const initialClarity = initialData.primary_gem_clarity || initialData.diamond_clarity || 'Flawless';
          
          // Find the index of the clarity in diamondClarity array
          if (diamondClarity.length > 0) {
            const clarityIndex = diamondClarity.findIndex(c => c.name === initialClarity);
            if (clarityIndex !== -1) {
              setSelectedClarityIndex(clarityIndex);
            }
          }
          
          // Initialize diamond form
          setPrimaryDiamondForm({
            shape: initialData.primary_gem_shape || initialData.diamond_shape || 'Round',
            clarity: initialClarity,
            color: initialData.primary_gem_color || initialData.diamond_color || 'Colorless',
            quantity: initialData.primary_gem_quantity || initialData.diamond_quantity || 1,
            weight: initialData.primary_gem_weight || initialData.diamond_weight || 0,
            cut: initialData.primary_gem_cut || initialData.diamond_cut || '',
            labGrown: initialData.primary_gem_lab_grown || initialData.diamond_lab_grown || false,
            exactColor: savedExactColor,
            size: initialData.primary_gem_size || initialData.diamond_size || '',
            estimatedValue: initialData.primary_gem_value || initialData.diamond_value || 0
          });
          
          // Set estimated value if available
          if (initialData.primary_gem_value !== undefined || initialData.diamond_value !== undefined) {
            setEstimatedValues(prev => ({
              ...prev,
              primaryDiamond: parseFloat(initialData.primary_gem_value || initialData.diamond_value || 0)
            }));
          }
        } else if (primaryGemType === 'stone') {
          // Initialize stone form with available data
          setPrimaryStoneForm({
            name: initialData.primary_gem_type || initialData.stone_name || '',
            type: initialData.primary_gem_type || initialData.stone_type || '',
            shape: initialData.primary_gem_shape || initialData.stone_shape || '',
            color: initialData.primary_gem_color || initialData.stone_color || '',
            color_id: initialData.primary_gem_color_id || initialData.stone_color_id || 5, // Default Red's ID
            quantity: initialData.primary_gem_quantity || initialData.stone_quantity || 1,
            weight: initialData.primary_gem_weight || initialData.stone_weight || 0,
            width: initialData.primary_gem_width || initialData.stone_width || '',
            depth: initialData.primary_gem_depth || initialData.stone_depth || '',
            authentic: initialData.primary_gem_authentic || initialData.stone_authentic || false,
            valuationType: initialData.primary_gem_valuation_type || 'each',
            estimatedValue: initialData.primary_gem_value || initialData.stone_value || 0
          });
          
          // Set estimated value if available
          if (initialData.primary_gem_value !== undefined || initialData.stone_value !== undefined) {
            setEstimatedValues(prev => ({
              ...prev,
              primaryGemstone: parseFloat(initialData.primary_gem_value || initialData.stone_value || 0)
            }));
          }
        }
        }
      }
    
    // Handle initializing from location state (legacy approach)
    if (!initialData && location.state?.editMode && location.state?.itemToEdit) {
      const itemToEdit = location.state.itemToEdit;
      
      // Set the active tab based on the primary gem category if available
      if (itemToEdit.primary_gem_category) {
        const gemCategory = itemToEdit.primary_gem_category.toLowerCase();
        const gemType = gemCategory === 'diamond' ? 'primary_gem_diamond' : 'primary_gem_stone';
        setActiveTab(gemType);
      } else if (location.state?.editingGemOnly) {
        // Fallback to addedGemTypes if primary_gem_category is not available but we're editing gems
        const gemType = addedGemTypes.primary === 'diamond' ? 'primary_gem_diamond' : 'primary_gem_stone';
        setActiveTab(gemType);
      }
     
      // Direct fill for primary gem fields if they exist on itemToEdit
      // Check if we have direct primary gem properties
      if (itemToEdit.primary_gem_category) {
        
        // Set the appropriate gem type - with type checking
        const primaryGemCategory = itemToEdit.primary_gem_category;
        if (primaryGemCategory.toLowerCase() === 'diamond') {
          setAddedGemTypes(prev => ({
            ...prev,
            primary: 'diamond'
          }));
          
          // Set primary diamond form directly from itemToEdit
          const diamondFormData = {
            shape: itemToEdit.primary_gem_shape || 'Round',
            clarity: itemToEdit.primary_gem_clarity || 'Flawless',
            color: itemToEdit.primary_gem_color || 'Colorless',
            quantity: itemToEdit.primary_gem_quantity || 1,
            weight: itemToEdit.primary_gem_weight || 0,
            cut: itemToEdit.primary_gem_cut || '',
            labGrown: itemToEdit.primary_gem_lab_grown || false,
            exactColor: itemToEdit.primary_gem_exact_color || 'D',
            size: itemToEdit.primary_gem_size || ''
          };
          setPrimaryDiamondForm(diamondFormData);          
          // Directly set the state variables that control the dropdown values
          setExactColor(diamondFormData.exactColor);
          
          // Update shape index to match the selected shape if diamondShapes is loaded
          if (diamondShapes.length > 0) {
            const shapeIndex = diamondShapes.findIndex(shape => shape.name === diamondFormData.shape);
            if (shapeIndex !== -1) {
              setCurrentShapeIndex(shapeIndex);
              
              // Also fetch the diamond sizes for this shape
              const selectedShape = diamondShapes[shapeIndex];
              // Use the shape's ID if available, otherwise use shapeIndex + 1 as a fallback
              const shapeId = selectedShape?.id || (shapeIndex + 1);
              // Fetch the sizes for the selected shape
              fetchDiamondSizes(shapeId);
            }
          }
          
          // Set the estimated value for primary diamond if available
          if (itemToEdit.primary_gem_value !== undefined) {
            setEstimatedValues(prev => ({
              ...prev,
              primaryDiamond: parseFloat(itemToEdit.primary_gem_value) || 0
            }));
          }
        } else if (primaryGemCategory.toLowerCase() === 'stone') {
          // Set stone as the primary gem type
          setAddedGemTypes(prev => ({
            ...prev,
            primary: 'stone'
          }));
          
          // Initialize the stone form data
          const stoneFormData = {
            name: itemToEdit.primary_gem_name || '',
            type: itemToEdit.primary_gem_type || '',
            shape: itemToEdit.primary_gem_shape || '',
            color: itemToEdit.primary_gem_color || '',
            color_id: itemToEdit.primary_gem_color_id || null,
            quantity: itemToEdit.primary_gem_quantity || 1,
            weight: itemToEdit.primary_gem_weight || 0,
            width: itemToEdit.primary_gem_width || '',
            depth: itemToEdit.primary_gem_depth || '',
            valuationType: itemToEdit.primary_gem_valuation_type || 'each'
          };
          
          // Set the primary stone form
          setPrimaryStoneForm(stoneFormData);
          
          // Set the estimated value for primary stone if available
          if (itemToEdit.primary_gem_value !== undefined) {
            setEstimatedValues(prev => ({
              ...prev,
              primaryGemstone: parseFloat(itemToEdit.primary_gem_value) || 0
            }));
          }
        }
      }
    }
  }, [location.state, diamondShapes]);
  
  // Effect to update selectedClarityIndex when diamondClarity is loaded
  useEffect(() => {
    if (diamondClarity.length > 0) {
      // Get the clarity value from the current form or initial data
      const clarityToMatch = primaryDiamondForm.clarity || 
                           (location.state?.itemToEdit?.primary_gem_clarity || 'Flawless');
      
      const clarityIndex = diamondClarity.findIndex(c => c.name === clarityToMatch);
      
      if (clarityIndex !== -1) {
        setSelectedClarityIndex(clarityIndex);
      } else if (diamondClarity.length > 0) {
        // If no match found, default to the first clarity
        setSelectedClarityIndex(0);
        setPrimaryDiamondForm(prev => ({
          ...prev,
          clarity: diamondClarity[0].name
        }));
      }
    }
  }, [diamondClarity, primaryDiamondForm.clarity]);

  // Effect to update parent component when primary gem value changes
  useEffect(() => {
    const isDiamond = activeTab.startsWith('primary_gem_diamond');
    const primaryGemValue = isDiamond 
      ? estimatedValues.primaryDiamond 
      : estimatedValues.primaryGemstone;
    
    if (isDiamond) {
      setPrimaryDiamondForm(prev => ({
        ...prev,
        estimatedValue: primaryGemValue
      }));
    } else {
      setPrimaryStoneForm(prev => ({
        ...prev,
        estimatedValue: primaryGemValue
      }));
    }
    
    onGemValueChange(primaryGemValue || 0);
  }, [estimatedValues.primaryDiamond, estimatedValues.primaryGemstone, activeTab, onGemValueChange]);

  // Update secondary gem forms when estimatedValues, selectedSecondaryIndex, or activeTab changes
  useEffect(() => {
    // Only proceed if we're on a secondary gem tab
    if (activeTab === 'secondary_gem_diamond' || activeTab === 'secondary_gem_stone') {
      const isDiamond = activeTab === 'secondary_gem_diamond';
      const secondaryGemValue = isDiamond 
        ? estimatedValues.secondaryDiamond 
        : estimatedValues.secondaryGemstone;
      
      if (isDiamond) {
        setSecondaryDiamondForm(prev => ({
          ...prev,
          estimatedValue: secondaryGemValue
        }));
      } else {
        setSecondaryStoneForm(prev => ({
          ...prev,
          estimatedValue: secondaryGemValue
        }));
      }
      
      // Update the gem form state with the new value
      if (selectedSecondaryIndex !== null && selectedSecondaryIndex >= 0) {
        setGemFormState(prevState => {
          const updatedGems = latestGemUpdates.current ? [...latestGemUpdates.current] : [...(prevState.secondaryGems || [])];
          // Ensure we have an object at this index
          if (!updatedGems[selectedSecondaryIndex]) {
            updatedGems[selectedSecondaryIndex] = {};
          }
          
          // Update the specific gem with the form data
          updatedGems[selectedSecondaryIndex] = {
            ...updatedGems[selectedSecondaryIndex],
            secondary_gem_category: isDiamond ? 'diamond' : 'stone',
            secondary_gem_index: selectedSecondaryIndex,
            secondary_gem_value: secondaryGemValue
          };
          
          // Store the latest updates in the ref
          latestGemUpdates.current = updatedGems;
          
          return {
            ...prevState,
            secondaryGems: updatedGems
          };
        });
      }
    }
  }, [estimatedValues.secondaryDiamond, estimatedValues.secondaryGemstone, selectedSecondaryIndex, activeTab]);
  
  // Effect to fetch diamond sizes when diamondShapes are loaded in edit mode
  useEffect(() => {
    if (diamondShapes.length > 0 && location.state?.editMode && location.state?.itemToEdit?.primary_gem_shape && 
        location.state?.itemToEdit?.primary_gem_category?.toLowerCase() === 'diamond') {
        const shapeToMatch = location.state.itemToEdit.primary_gem_shape;
        if (shapeToMatch) {
          const shapeIndex = diamondShapes.findIndex(shape => shape.name === shapeToMatch);
          
          if (shapeIndex !== -1) {
            // Use the shape's ID if available, otherwise use shapeIndex + 1 as a fallback
            const selectedShape = diamondShapes[shapeIndex];
            const shapeId = selectedShape?.id || (shapeIndex + 1);
            
            // Fetch diamond sizes for the selected shape
            fetchDiamondSizes(shapeId);
          }
        }
      }
  }, [diamondShapes, location.state]);
  
  // Effect to update stone color when stoneColors are loaded in edit mode
  useEffect(() => {
    // Make sure we have stoneColors loaded and we're in edit mode
    if (stoneColors.length > 0 && location.state?.editMode && location.state?.itemToEdit) {
      // Make sure we have a primary gem category and it's a stone
      const primaryGemCategory = location.state.itemToEdit.primary_gem_category;
      if (primaryGemCategory && typeof primaryGemCategory === 'string' && 
          primaryGemCategory.toLowerCase() === 'stone') {
        // Get the color to match from the item being edited
        const colorToMatch = location.state.itemToEdit.primary_gem_color;
        if (colorToMatch && typeof colorToMatch === 'string') {
          // Try to find an exact match first (case insensitive)
          // Check both color.name and color.color properties
          let matchingColor = stoneColors.find(color => {
            if (color.name && typeof color.name === 'string' && 
                color.name.toLowerCase() === colorToMatch.toLowerCase()) {
              return true;
            }
            if (color.color && typeof color.color === 'string' && 
                color.color.toLowerCase() === colorToMatch.toLowerCase()) {
              return true;
            }
            return false;
          });
          // If no exact match, try to find a partial match
          if (!matchingColor) {
            matchingColor = stoneColors.find(color => {
              // Check name property
              if (color.name && typeof color.name === 'string' && 
                 (color.name.toLowerCase().includes(colorToMatch.toLowerCase()) || 
                  colorToMatch.toLowerCase().includes(color.name.toLowerCase()))) {
                return true;
              }
              // Check color property
              if (color.color && typeof color.color === 'string' && 
                 (color.color.toLowerCase().includes(colorToMatch.toLowerCase()) || 
                  colorToMatch.toLowerCase().includes(color.color.toLowerCase()))) {
                return true;
              }
              return false;
            });
          }
          
          // If still no match, use the first color as default
          if (!matchingColor && stoneColors.length > 0) {
            matchingColor = stoneColors[0];
            console.log('No matching color found, using default:', matchingColor.name);
          }
          
          if (matchingColor) {            
            // Determine which property to use as the color value
            let colorValue;
            if (matchingColor.color) {
              colorValue = matchingColor.color;
            } else if (matchingColor.name) {
              colorValue = matchingColor.name;
            } else {
              colorValue = colorToMatch; // Fallback to original if nothing else is available
            }
                        
            // Update the primary stone form with the correct color and color ID
            setPrimaryStoneForm(prev => ({
              ...prev,
              color: colorValue,
              color_id: matchingColor.id || prev.color_id
            }));
          }
          
          // Also update the estimated value if available
          if (location.state.itemToEdit.primary_gem_value !== undefined) {
            setEstimatedValues(prev => ({
              ...prev,
              primaryGemstone: parseFloat(location.state.itemToEdit.primary_gem_value) || 0
            }));
          }
        }
      }
    }
  }, [stoneColors, location.state]);

  // Effect to update currentShapeIndex when diamondShapes loads and we're in edit mode
  useEffect(() => {
    if (diamondShapes.length > 0 && location.state?.editMode && location.state?.itemToEdit?.primary_gem_shape) {
      // Check if we have a diamond as primary gem
      if (location.state.itemToEdit.primary_gem_category?.toLowerCase() === 'diamond') {
        const shapeToMatch = location.state.itemToEdit.primary_gem_shape;
        const shapeIndex = diamondShapes.findIndex(shape => shape.name === shapeToMatch);
        
        if (shapeIndex !== -1) {
          setCurrentShapeIndex(shapeIndex);
          
          // Also fetch the sizes for this shape
          const selectedShape = diamondShapes[shapeIndex];
          if (selectedShape && selectedShape.id) {
            fetchDiamondSizes(selectedShape.id);
          }
        }
      }
    }
  }, [diamondShapes, location.state]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
     
        
        // Fetch Stone Types
        const stoneTypesResponse = await axios.get(`${API_BASE_URL}/stone_types`);
        const stoneTypesData = stoneTypesResponse.data;
        setColorSpecificStoneTypes(stoneTypesData);
        
        // Group stone types by color for the dropdown
        const uniqueTypes = [...new Set(stoneTypesData.map(type => type.type))];
        const typesWithImages = uniqueTypes.map(type => {
          const stoneData = stoneTypesData.find(s => s.type === type);
          return {
            name: type,
            image: stoneData.image_path.replace('.jpg', '.png')
          };
        });
        setStoneTypes(typesWithImages);

        // Update the initial stone form with the first color from the data
        if (stoneTypesData.length > 0) {
          setPrimaryStoneForm(prev => ({
            ...prev,
            color: 'Red',
            color_id: 5
          }));
          setSecondaryStoneForm(prev => ({
            ...prev,
            color: 'Red',
            color_id: 5
          }));
        }

        // Fetch Stone Shapes
        const stoneShapesResponse = await axios.get(`${API_BASE_URL}/stone_shape`);
        const stoneShapesWithImages = stoneShapesResponse.data.map(shape => ({
          name: shape.shape,
          image: shape.image_path.replace('.jpg', '.png')
        }));
        setStoneShapes(stoneShapesWithImages);

        // Fetch Stone Colors
        const stoneColorsResponse = await axios.get(`${API_BASE_URL}/stone_color`);
        setStoneColors(stoneColorsResponse.data);

        // Fetch Diamond Shapes
        const shapesResponse = await axios.get(`${API_BASE_URL}/diamond_shape`);
        const shapesWithImages = shapesResponse.data.map(shape => ({
          id: shape.id, // Preserve the original ID from the database
          name: shape.shape,
          image: shape.image_path.replace('.jpg', '.png')
        }));
        setDiamondShapes(shapesWithImages);

        // Fetch Diamond Clarity
        const clarityResponse = await axios.get(`${API_BASE_URL}/diamond_clarity`);
        const clarityWithImages = clarityResponse.data.map(clarity => ({
          name: clarity.name,
          image: clarity.image_path
        }));
        setDiamondClarity(clarityWithImages);

        // Fetch Diamond Cuts
        const cutsResponse = await axios.get(`${API_BASE_URL}/diamond_cut`);
        setDiamondCuts(cutsResponse.data);

        // Fetch Diamond Colors
        const diamondColorResponse = await axios.get(`${API_BASE_URL}/diamond_color`);
        setDiamondColors(diamondColorResponse.data);
                
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    const fetchCaratConversion = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/carat-conversion`);
        if (response.data && response.data.length > 0) {
          setCaratConversion(response.data[0]);
        }
      } catch (error) {
        console.error('Error fetching carat conversion:', error);
      }
    };

    const fetchUserPreference = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user_preferences`);
        const caratConversionPreference = response.data.find(pref => pref.preference_name === 'caratConversion');
        setIsCaratConversionEnabled(caratConversionPreference ? caratConversionPreference.preference_value === 'true' : false);
      } catch (error) {
        console.error('Error fetching user preferences:', error);
      }
    };
    


    fetchAllData();
    
    // Only fetch default diamond sizes (round) if we're not in edit mode
    if (!location.state?.editMode) {
      fetchDiamondSizes(1);
    }
    fetchUserPreference();
    if(isCaratConversionEnabled) 
        fetchCaratConversion();
  }, []);

  // sessionStorage restoration removed - not needed for diamond estimation only

  const fetchDiamondSizes = async (diamondShapeId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/diamond_size_weight/${diamondShapeId}`);
      setDiamondSizes(response.data);
    } catch (error) {
      console.error('Error fetching diamond sizes:', error);
      setDiamondSizes([]);
    }
  };

  const getCurrentForm = () => {
    return activeTab.startsWith('primary') ? primaryDiamondForm : secondaryDiamondForm;
  };

  const setCurrentForm = (updater) => {
    if (activeTab.startsWith('primary')) {
      setPrimaryDiamondForm(updater);
    } else {
      // Get the updated form value
      const updatedForm = typeof updater === 'function' 
        ? updater(secondaryDiamondForm) 
        : updater;
      
      // Update the form state
      setSecondaryDiamondForm(updatedForm);
      
      // If we have a selected secondary gem index, update it in the secondaryGems array
      if (selectedSecondaryIndex !== null && selectedSecondaryIndex >= 0) {
        setGemFormState(prevState => {
          const updatedGems = latestGemUpdates.current ? [...latestGemUpdates.current] : [...secondaryGems];
          // Ensure we have an object at this index
          if (!updatedGems[selectedSecondaryIndex]) {
            updatedGems[selectedSecondaryIndex] = {};
          }
          
          // Update the specific gem with the form data
          updatedGems[selectedSecondaryIndex] = {
              secondary_gem_category: 'diamond',
              secondary_gem_index: selectedSecondaryIndex,
              secondary_gem_shape: updatedForm.shape,
              secondary_gem_clarity: updatedForm.clarity,
              secondary_gem_color: updatedForm.color,
              secondary_gem_exact_color: updatedForm.exactColor,
              secondary_gem_weight: updatedForm.weight,
              secondary_gem_cut: updatedForm.cut,
              secondary_gem_size: updatedForm.size,
              secondary_gem_lab_grown: updatedForm.labGrown,
              secondary_gem_value: updatedForm.estimatedValue,
              secondary_gem_quantity: updatedForm.quantity
          };
          // Store the latest updates in the ref
          latestGemUpdates.current = updatedGems;
          
          // Return the updated state
          return {
            ...prevState,
            secondaryGems: updatedGems
          };
        });
      }
    }
  };

  const getCurrentStoneForm = () => {
    return activeTab.startsWith('primary') ? primaryStoneForm : secondaryStoneForm;
  };

  const setCurrentStoneForm = (updater) => {
    if (activeTab.startsWith('primary')) {
      setPrimaryStoneForm(updater);
    } else {
      // Get the updated form value
      const updatedForm = typeof updater === 'function' 
        ? updater(secondaryStoneForm) 
        : updater;
      
      // Update the form state
      setSecondaryStoneForm(updatedForm);
      
      // If we have a selected secondary gem index, update it in the secondaryGems array
      if (selectedSecondaryIndex !== null && selectedSecondaryIndex >= 0) {
        setGemFormState(prevState => {
          const updatedGems = latestGemUpdates.current ? [...latestGemUpdates.current] : [...secondaryGems];
          // Ensure we have an object at this index
          if (!updatedGems[selectedSecondaryIndex]) {
            updatedGems[selectedSecondaryIndex] = {};
          }
          
          // Update the specific gem with the form data
          updatedGems[selectedSecondaryIndex] = {
            secondary_gem_category: 'stone',
            secondary_gem_index: selectedSecondaryIndex,
            secondary_gem_type: updatedForm.type || '',
            secondary_gem_name: updatedForm.name || '',
            secondary_gem_shape: updatedForm.shape || '',
            secondary_gem_color: updatedForm.color || '',
            secondary_gem_exact_color: updatedForm.exactColor || '',
            secondary_gem_weight: updatedForm.weight || 0,
            secondary_gem_size: updatedForm.size || '',
            secondary_gem_quantity: updatedForm.quantity || 1,
            secondary_gem_value: updatedForm.estimatedValue || 0,
            secondary_gem_authentic: updatedForm.authentic || false,
            secondary_gem_color_id: updatedForm.color_id || null,
            secondary_gem_clarity: updatedForm.clarity || ''
          };
          
          // Store the latest updates in the ref
          latestGemUpdates.current = updatedGems;
          // Return the updated state
          return {
            ...prevState,
            secondaryGems: updatedGems
          };
        });
      }
    }
  };

  // Keep only diamond shape navigation functionality
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const sliderRef = React.useRef(null);
  const colorSliderRef = React.useRef(null);
  const cutRef = React.useRef(null);
  const labGrownRef = React.useRef(null);
  const addDiamondRef = React.useRef(null);

  // Diamond shape navigation functions

  // Diamond shape navigation
  const handlePrevShape = () => {
    if (currentShapeIndex > 0) {
      const newIndex = currentShapeIndex - 1;
      const newShape = diamondShapes[newIndex];
      
      // Update the shape index
      setCurrentShapeIndex(newIndex);
      
      // Update the form with the new shape
      if (newShape) {        
        // Use the shape's actual ID or fallback to index+1
        const shapeId = newShape.id || (newIndex + 1);
        
        // Update the current form's shape
        setCurrentForm(prev => ({
          ...prev,
          shape: newShape.name,
          size: ''  // Reset size when changing shape
        }));
        
        // Also fetch the sizes for this shape
        fetchDiamondSizes(shapeId);
      }
    }
  };
  
  const handleNextShape = () => {
    if (currentShapeIndex < diamondShapes.length - 1) {
      const newIndex = currentShapeIndex + 1;
      const newShape = diamondShapes[newIndex];
      
      // Update the shape index
      setCurrentShapeIndex(newIndex);
      
      // Update the form with the new shape
      if (newShape) {        
        // Use the shape's actual ID or fallback to index+1
        const shapeId = newShape.id || (newIndex + 1);
        
        // Update the current form's shape
        setCurrentForm(prev => ({
          ...prev,
          shape: newShape.name,
          size: ''  // Reset size when changing shape
        }));
        
        // Also fetch the sizes for this shape
        fetchDiamondSizes(shapeId);
      }
    }
  };

  // Image gallery navigation functions removed

  // Popup Component


  const handleExactColorChange = (event, newValue) => {
    setExactColor(colorScale[newValue]);
    setCurrentForm(prev => ({
      ...prev,
      exactColor: colorScale[newValue],
      color: getColorCategory(colorScale[newValue])
    }));
  };

  const shapeRef = React.useRef(null);
  const quantityRef = React.useRef(null);
  const weightRef = React.useRef(null);
  const clarityRef = React.useRef(null);
  const colorRef = React.useRef(null);
  const sizeRef = React.useRef(null);

  const handleSelectChange = (event, nextRef, handleChange) => {
    handleChange(event);
    if (nextRef?.current) {
      setTimeout(() => {
        nextRef.current.focus();
      }, 0);
    }
  };

  const handleEnterKey = (event, nextRef) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (nextRef?.current) {
        setTimeout(() => {
          nextRef.current.focus();
        }, 0);
      }
    }
  };

  const handleDiamondChange = (event) => {
    const { name, value } = event.target;
    
    // If shape is changed, fetch corresponding sizes
    if (name === 'shape') {      
      // Find the shape object
      const selectedShape = diamondShapes.find((shape) => shape.name === value);
      
      if (selectedShape) {
        
        // Find the index of the selected shape
        const newShapeIndex = diamondShapes.findIndex(shape => shape.name === selectedShape.name);        
        // Use the shape's actual ID from the database if available, otherwise use index+1
        const shapeId = selectedShape.id || (newShapeIndex + 1);
        
        // Update the currentShapeIndex first so the UI image updates immediately
        setCurrentShapeIndex(newShapeIndex);
        
        // Also update the currentForm.shape to ensure it's synchronized
        setCurrentForm(prev => ({
          ...prev,
          shape: value,
          shapeId: shapeId  // Store the shape ID for reference
        }));
        
        // Then fetch diamond sizes and update the form
        fetchDiamondSizes(shapeId);
              } else {
        console.error("No shape found for:", value);
      }
    }

    setCurrentForm(prev => ({
      ...prev,
      [name]: value,
      // Reset size when shape changes
      ...(name === 'shape' && { size: '' })
    }));
  };


  
  const addDiamond = () => {
    const currentForm = getCurrentForm();
    const isPrimary = activeTab.startsWith('primary');

    // Call parent component's onAddGem function if provided
    if (onAddGem) {

    // Check if we can add this type of gem - only for primary gems
    if (isPrimary) {
      // Check if there's already a primary stone
      if (addedGemTypes.primary === 'stone') {
        alert('Please delete the existing primary stone before adding a diamond');
        return;
      }

      // Check if there's already one primary gem in the array
      if (diamondSummary.some(d => d.isPrimary) || stoneSummary.some(s => s.isPrimary)) {
        alert('Only one primary gem (diamond or stone) is allowed. Please delete the existing primary gem first.');
        return;
      }
    }
    // For secondary gems, allow multiple types (both diamonds and stones)

    const diamondValue = isPrimary ? estimatedValues.primaryDiamond : estimatedValues.secondaryDiamond;

    
    const newItem = {
      shape: currentForm.shape,
      clarity: currentForm.clarity,
      color: currentForm.color,
      exactColor: currentForm.exactColor,
      cut: currentForm.cut,
      size: currentForm.size,
      weight: currentForm.weight,
      quantity: currentForm.quantity,
      labGrown: currentForm.labGrown,
      isPrimary: isPrimary,
      type: 'diamond',
      value: diamondValue
    };

    // Call parent component's onAddGem function with the new diamond
    // Let JewelEstimator handle adding to the summary
    const success = onAddGem(newItem);
    
    if (success) {
      
      // Reset the form after successful addition
      if (isPrimary) {
        setPrimaryDiamondForm(prev => ({
          ...prev,
          shape: 'Round',
          clarity: 'Flawless',
          color: 'Colorless',
          exactColor: 'D',
          cut: '',
          size: '',
          weight: 0,
          quantity: 1,
          labGrown: false,
          estimatedValue: 0
        }));
      } else {
        setSecondaryDiamondForm(prev => ({
          ...prev,
          shape: 'Round',
          clarity: 'Flawless',
          color: 'Colorless',
          exactColor: 'D',
          cut: '',
          size: '',
          weight: 0,
          quantity: 1,
          labGrown: false,
          estimatedValue: 0
        }));
      }
    }
    
    // Update added gem types
    setAddedGemTypes(prev => ({
      ...prev,
      primary: isPrimary ? 'diamond' : prev.primary,
      secondary: isPrimary ? prev.secondary : [...(Array.isArray(prev.secondary) ? prev.secondary : []), 'diamond']
    }));
    
    // Reset the current form after adding
    const resetForm = {
      shape: 'Round',
      clarity: 'Flawless',
      color: 'Colorless',
      quantity: 1,
      weight: 0,
      cut: '',
      labGrown: false,
      exactColor: 'D',
      size: '',
      estimatedValue: 0
    };
    setCurrentForm(resetForm);
    setCurrentShapeIndex(0);
    
    // Reset exact color to default
    setExactColor('D');
    
    // Reset valuation type to default
    setDiamondValuationType('each');
  }
  };

  const handleStoneChange = (event) => {
    const { name, value } = event.target;
    setCurrentStoneForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStoneTypeChange = (event) => {
    const selectedStoneType = event.target.value;
    const selectedStone = colorSpecificStoneTypes.find(stone => stone.type === selectedStoneType);
    setCurrentStoneForm(prev => ({
      ...prev,
      name: selectedStone ? selectedStone.type : '',
      color: selectedStone ? selectedStone.color : prev.color
    }));
  };

  const handleDiamondValuationTypeChange = (event) => {
    setDiamondValuationType(event.target.value);
  };

  const addStone = () => {
    const currentForm = getCurrentStoneForm();
    const isPrimary = activeTab.startsWith('primary');

    // Call parent component's onAddGem function if provided
    if (onAddGem) {

    // Check if we can add this type of gem - only for primary gems
    if (isPrimary) {
      // Check if there's already a primary diamond
      if (addedGemTypes.primary === 'diamond') {
        alert('Please delete the existing primary diamond before adding a stone');
        return;
      }

      // Check if there's already one primary gem in the array
      if (diamondSummary.some(d => d.isPrimary) || stoneSummary.some(s => s.isPrimary)) {
        alert('Only one primary gem (diamond or stone) is allowed. Please delete the existing primary gem first.');
        return;
      }
    }
    // For secondary gems, allow multiple types (both diamonds and stones)

    const stoneValue = isPrimary ? estimatedValues.primaryGemstone : estimatedValues.secondaryGemstone;
    
    const newStone = {
      name: currentForm.name,
      shape: currentForm.shape,
      weight: currentForm.weight,
      color: currentForm.color,
      quantity: currentForm.quantity,
      authentic: currentForm.authentic,
      isPrimary: isPrimary,
      type: 'stone',
      value: stoneValue
    };

    // Call parent component's onAddGem function with the new stone
    // Let JewelEstimator handle adding to the summary
    const success = onAddGem(newStone);
    
    if (success) {
      
      // Reset the form after successful addition
      if (isPrimary) {
        setPrimaryStoneForm(prev => ({
          ...prev,
          name: '',
          shape: '',
          color: '',
          weight: 0,
          quantity: 1,
          authentic: false
        }));
      } else {
        setSecondaryStoneForm(prev => ({
          ...prev,
          name: '',
          shape: '',
          color: '',
          weight: 0,
          quantity: 1,
          authentic: false
        }));
      }
    }
    
    // Update added gem types
    setAddedGemTypes(prev => ({
      ...prev,
      primary: isPrimary ? 'stone' : prev.primary,
      secondary: isPrimary ? prev.secondary : [...(Array.isArray(prev.secondary) ? prev.secondary : []), 'stone']
    }));
    
    // Reset the form after adding
    if (activeTab.startsWith('primary')) {
      setPrimaryStoneForm(initialStoneForm);
    } else {
      setSecondaryStoneForm(initialStoneForm);
    }
  }
  };

  const [currentStone, setCurrentStone] = useState({
    type: '',
    color: '',
    weight: '',
    isNatural: true,
    isCertified: false
  });

  const [estimatedStones, setEstimatedStones] = useState([]);

  const renderStoneEstimationTab = () => (
    <Grid container spacing={2} sx={{ p: 2 }}>
      {/* Quantity and Authentic */}
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={6} sm={5}>
          <TextField
            fullWidth
            label="Quantity"
            type="number"
            value={getCurrentStoneForm().quantity}
            onChange={(e) => setCurrentStoneForm(prev => ({
              ...prev, 
              quantity: parseInt(e.target.value) || 1
            }))}
            InputProps={{
              inputProps: { min: 1, max: 100 }
            }}
          />
        </Grid>
        <Grid item xs={6} sm={7}>
          <Box sx={{ ml: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={getCurrentStoneForm().authentic || false}
                  onChange={(e) => setCurrentStoneForm(prev => ({
                    ...prev,
                    authentic: e.target.checked
                  }))}
                />
              }
              label="Authentic"
            />
          </Box>
        </Grid>
      </Grid>

      {/* Stone Type and Color */}
      <Grid container spacing={3} sx={{ mt: 0 }}>
        {/* Stone Type */}
        <Grid item xs={12} md={8}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Type *</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            {colorSpecificStoneTypes
              .filter(stone => {
                const currentForm = getCurrentStoneForm();
                // Make sure we have a color_id on both sides to compare
                return stone.color_id && currentForm && currentForm.color_id && 
                       stone.color_id === currentForm.color_id;
              })
              .map((stone) => (
                <Paper
                  key={stone.type}
                  elevation={getCurrentStoneForm().name === stone.type ? 8 : 1}
                  sx={{
                    p: 1,
                    cursor: 'pointer',
                    width: 80,
                    height: 80,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => handleStoneTypeChange({ target: { value: stone.type } })}
                >
                  <Box
                    component="img"
                    src={stone.image_path}
                    alt={stone.type}
                    sx={{ width: 40, height: 40 }}
                  />
                  <Typography variant="caption" align="center">
                    {stone.type}
                  </Typography>
                </Paper>
              ))}
          </Box>
        </Grid>

        {/* Stone Color Picker */}
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Color *</Typography>
            <Grid container sx={{ border: '1px solid black', boxSizing: 'border-box'}}>
              {stoneColors.map((color, index) => (
                <Grid item xs={6} key={color.id}>
                  <Paper
                    onClick={() => {
                      setCurrentStoneForm(prev => {
                        const newForm = {
                          ...prev,
                          color: color.color,
                          color_id: color.id
                        };
                        return newForm;
                      });
                    }}
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      border: '1px solid black',
                      borderRadius: 0,
                      backgroundColor: getCurrentStoneForm().color === color.color ? 'mediumseagreen':'none'
                    }}
                  >
                    {color.color}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </FormControl>
        </Grid>
      </Grid>

      {/* Stone Shape */}
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Shape *</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {stoneShapes.map((shape) => (
            <Paper
              key={shape.name}
              elevation={getCurrentStoneForm().shape === shape.name ? 8 : 1}
              sx={{
                p: 1,
                cursor: 'pointer',
                width: 80,
                height: 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => setCurrentStoneForm(prev => ({
                ...prev,
                shape: shape.name
              }))}
            >
              <Box
                component="img"
                src={shape.image}
                alt={shape.name}
                sx={{ width: 40, height: 40 }}
              />
              <Typography variant="caption" align="center">
                {shape.name}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* Size Section */}
      <Grid container spacing={1} sx={{ mt: 0 }}>
        {getCurrentStoneForm().quantity > 1 && (
          <Grid item xs>
            <FormControl sx={{ minWidth: 120 }}>
              <Select
                value={getCurrentStoneForm().valuationType}
                onChange={(e) => setCurrentStoneForm(prev => ({
                  ...prev, 
                  valuationType: e.target.value
                }))}
                displayEmpty
                size="small"
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    border: 'none'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    border: 'none'
                  }
                }}
              >
                <MenuItem value="each">Each</MenuItem>
                <MenuItem value="total">Total</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}
      </Grid>

      {/* Measurements Container */}
      <Grid container spacing={2} sx={{ mt: -1 }}>
        {/* Weight */}
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Weight (Carats) *"
            type="number"
            value={getCurrentStoneForm().weight}
            onChange={(e) => setCurrentStoneForm(prev => ({
              ...prev, 
              weight: e.target.value
            }))}
            InputProps={{
              inputProps: { min: 0, step: 0.01 }
            }}
          />
        </Grid>

        {/* Width */}
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Width (mm)"
            type="number"
            value={getCurrentStoneForm().width}
            onChange={(e) => setCurrentStoneForm(prev => ({
              ...prev, 
              width: e.target.value
            }))}
            InputProps={{
              inputProps: { min: 0, step: 0.1 }
            }}
          />
        </Grid>

        {/* Depth */}
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Depth (mm)"
            type="number"
            value={getCurrentStoneForm().depth}
            onChange={(e) => setCurrentStoneForm(prev => ({
              ...prev, 
              depth: e.target.value
            }))}
            InputProps={{
              inputProps: { min: 0, step: 0.1 }
            }}
          />
        </Grid>
      </Grid>

      {/* Add Stone Button */}
      <Grid item xs={12}>
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth 
          onClick={addStone}
          disabled={
            !getCurrentStoneForm().name || 
            !getCurrentStoneForm().shape || 
            !getCurrentStoneForm().color || 
            !getCurrentStoneForm().weight 
          }
        >
          Add Stone
        </Button>
      </Grid>

      {/* Add button to switch between primary and secondary gems */}
      <Grid item xs={12} sx={{ mt: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', mr: 0 }}>
          Est. {activeTab.startsWith('primary') ? 'Primary' : 'Secondary'} {activeTab.includes('diamond') ? 'Diamond' : 'Stone'} Value $: 
        </Typography>
        <TextField
          size="small"
          type="number"
          value={activeTab === 'primary_gem_diamond' ? estimatedValues.primaryDiamond.toFixed(1) : 
            activeTab === 'primary_gem_stone' ? estimatedValues.primaryGemstone.toFixed(1) : 
            activeTab === 'secondary_gem_diamond' ? estimatedValues.secondaryDiamond.toFixed(1) : 
            estimatedValues.secondaryGemstone.toFixed(1)}
          variant="standard"
          onChange={(e) => {
            const newValue = parseFloat(e.target.value);
            if (!isNaN(newValue)) {
              if (activeTab === 'primary_gem_diamond') {
                setEstimatedValues(prev => ({ ...prev, primaryDiamond: newValue }));
              } else if (activeTab === 'primary_gem_stone') {
                setEstimatedValues(prev => ({ ...prev, primaryGemstone: newValue }));
              } else if (activeTab === 'secondary_gem_diamond') {
                setEstimatedValues(prev => ({ ...prev, secondaryDiamond: newValue }));
              } else {
                setEstimatedValues(prev => ({ ...prev, secondaryGemstone: newValue }));
              }
            }
          }}
          inputProps={{ 
            min: 0,
            style: { width: '50px' }
          }}
          sx={{ 
            ml: 1,
            '& .MuiInputBase-root': {
              ml: 0,
              pl: 0
            }
          }}
        />
        {/* Only show the tab switching button if not editing a gem only */}
        {/* {!location.state?.editingGemOnly && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => {
              if (activeTab.startsWith('primary')) {
                setActiveTab('secondary_gem_stone');
              } else {
                setActiveTab('primary_gem_stone');
              }
            }}
            sx={{ ml: 2 }} 
          >
            {activeTab.startsWith('primary') ? 'Secondary Gem' : 'Primary Gem'}
          </Button>
        )} */}
         <Button 
          variant="contained" 
          color="primary" 
          onClick={() => {
            if (activeTab.startsWith('primary')) {
              setActiveTab('secondary_gem_stone');
            } else {
              setActiveTab('primary_gem_stone');
            }
          }}
          sx={{ ml: 2 }} 
        >
           {activeTab.startsWith('primary') ? 'Secondary Gem' : 'Primary Gem'}
        </Button>
      </Grid>
    </Grid>
  );

  // Rendering functions
  const renderTabButtons = () => {
    // Check if editingGemOnly flag is set in location.state
    const editingGemOnly = location.state?.editingGemOnly || false;
    
    // When editing gem only, always render the primary gem tab
    if (editingGemOnly) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            ESTIMATE GEM VALUE
          </Typography>
          {/* Removed radio buttons as they shouldn't appear here */}
        </Box>
      );
    }
    return null; // Explicit return for all code paths
  };

  const handleNextTab = () => {
    if (activeTab < 2) {
      setActiveTab(prevTab => prevTab + 1);
    }
  };

  // Function to determine color category based on exact color
  const getColorCategory = (exactColor) => {
    const category = diamondColors.find(category => {
      const [start, end] = category.range.split('-');
      return exactColor >= start && exactColor <= end;
    });
    return category?.name || 'Colorless';
  };

  const [itemTransactionTypes, setItemTransactionTypes] = useState({});

  useEffect(() => {
    // Focus on shape input when component mounts
    if (shapeRef.current) {
      shapeRef.current.focus();
    }
  }, []);

  const SliderStyled = styled(Slider)({});

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [itemDetails, setItemDetails] = useState({
    brand: '',
    additionalInfo: '',
    isVintage: false,
    stamps: ''
  });

  const handleDetailChange = (field, value) => {
    if (selectedItemIndex === null) return;
    
    setItemDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateTotalGemWeight = () => {
    if (!caratConversion) return 0;

    let totalCarats = 0;

    // Add primary diamond weight if exists
    if (addedGemTypes.primary === 'diamond' && diamondSummary.length > 0) {
      totalCarats += parseFloat(diamondSummary[0].weight || 0) * parseFloat(diamondSummary[0].quantity || 1);
    }

    // Add primary stone weight if exists
    if (addedGemTypes.primary === 'stone' && stoneSummary.length > 0) {
      totalCarats += parseFloat(stoneSummary[0].weight || 0) * parseFloat(stoneSummary[0].quantity || 1);
    }

    // Add secondary diamond weight if exists
    if (addedGemTypes.secondary === 'diamond' && diamondSummary.length > 1) {
      totalCarats += parseFloat(diamondSummary[1].weight || 0) * parseFloat(diamondSummary[1].quantity || 1);
    }

    // Add secondary stone weight if exists
    if (addedGemTypes.secondary === 'stone' && stoneSummary.length > 1) {
      totalCarats += parseFloat(stoneSummary[1].weight || 0) * parseFloat(stoneSummary[1].quantity || 1);
    }

    // Convert total carats to grams
    return totalCarats * parseFloat(caratConversion.grams);
  };

  // Handle secondary gem selection from dropdown
  const handleSecondaryGemSelect = (event) => {
    const index = event.target.value;
    setSelectedSecondaryIndex(index);
    const selectedGem = secondaryGems[index];
    if (selectedGem) {
      // The tab will be updated by the effect that watches selectedSecondaryIndex
      initializeSecondaryGem(selectedGem, false);
    }
  };

  // Diamond and stone handler functions have been moved inline to their respective add functions

  const renderContent = () => {
    // Debug form values
    const currentForm = getCurrentForm();
    
    return (
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">
              {activeTab.startsWith('primary') ? 'EST. PRIMARY GEM' : 'EST. SECONDARY GEM'}
            </Typography>
            {/* Show dropdown when have multiple secondary gems */}
            {activeTab.startsWith('secondary') && secondaryGems.length > 1 && (
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <Select
                      value={selectedSecondaryIndex}
                      onChange={handleSecondaryGemSelect}
                      displayEmpty
                      inputProps={{ 'aria-label': 'Select secondary gem' }}
                    >
                      {secondaryGems.map((gem, index) => (
                        <MenuItem key={index} value={index}>
                          Secondary Gem {index + 1}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControl sx={{ mr: 2 }}>
              <RadioGroup 
                row 
                value={activeTab}
                onChange={handleTabChange}
              >
                {activeTab.startsWith('primary') ? (
                  <>
                    <FormControlLabel 
                      value="primary_gem_diamond" 
                      control={<Radio />} 
                      label="Diamond" 
                    />
                    <FormControlLabel 
                      value="primary_gem_stone" 
                      control={<Radio />} 
                      label="Stone" 
                    />
                  </>
                ) : (
                  <>
                    <FormControlLabel 
                      value="secondary_gem_diamond" 
                      control={<Radio />} 
                      label="Diamond" 
                    />
                    <FormControlLabel 
                      value="secondary_gem_stone" 
                      control={<Radio />} 
                      label="Stone" 
                    />
                  </>
                )}
              </RadioGroup>
            </FormControl>
          </Box>
          </Box>
        
            {(activeTab === 'primary_gem_diamond' || activeTab === 'secondary_gem_diamond') && (
              <Box>
                <Grid container spacing={1} sx={{ mt: 0 }}>
                {/* Shape Selection */}               
                  <Grid item xs={12} md= {7} >
                  <Typography variant="subtitle1" sx={{ mb: 0 }}>Shape *</Typography> {/* Reduced margin bottom */}
                  <Grid container spacing={2} sx={{ mb: 1 }}>
                    <Grid item xs={4}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {diamondShapes.length > 0 && (
                          <>
                            {/* Find the image based on the current selected shape in the form */}
                            {(() => {
                              const currentShape = getCurrentForm().shape || 'Round';
                              const shapeObj = diamondShapes.find(s => s.name === currentShape) || diamondShapes[currentShapeIndex];
                              return <img src={shapeObj?.image} alt={shapeObj?.name} style={{ width: '100px', height: '100px' }} />;
                            })()}
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                              <IconButton onClick={handlePrevShape} disabled={currentShapeIndex === 0}>
                                <ArrowBackIcon />
                              </IconButton>
                              <IconButton onClick={handleNextShape} disabled={currentShapeIndex === diamondShapes.length - 1}>
                                <ArrowForwardIcon />
                              </IconButton>
                            </Box>
                          </>
                        )}
                      </Box>
                    </Grid>
                  <Grid item xs={8} >
                  <FormControl fullWidth variant="outlined" sx={{ width: '90%', ml:2, mt: 1, mb: 2 }}>
                    <InputLabel ref={shapeRef}>Select Shape</InputLabel>
                    <Select
                      value={getCurrentForm().shape || 'Round'} // Default to 'Round'
                      onChange={(e) => handleSelectChange(e, quantityRef, handleDiamondChange)}
                      name="shape"
                      inputRef={shapeRef}
                      onKeyDown={(e) => handleEnterKey(e, quantityRef)}
                    >
                      {diamondShapes.map((shape) => (
                        <MenuItem key={shape.name} value={shape.name}>
                          {shape.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Grid item xs={6} sm={12}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      name="quantity"
                      type="number"
                      value={getCurrentForm().quantity}
                      onChange={handleDiamondChange}
                      inputRef={quantityRef}
                      onKeyDown={(e) => handleEnterKey(e, sizeRef)}
                      InputProps={{
                        inputProps: { min: "1" }
                      }}
                      sx={{ width: '90%', ml: 2 }}
                    />
                  </Grid>
                </Grid>
                </Grid>
                </Grid>

                  <Grid item xs={12} md={5}>
                    <Grid container sx={{ mb: 0.5, alignItems: 'center' }}>
                      {getCurrentForm().quantity > 1 && (
                        <Grid item xs>
                          <FormControl variant="outlined" sx={{ width: "50%", mb: 0 }}>
                            <Select
                              value={diamondValuationType}
                              onChange={handleDiamondValuationTypeChange}
                              displayEmpty
                              size="small"
                              sx={{
                                '& .MuiOutlinedInput-notchedOutline': {
                                  border: 'none'
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  border: 'none'
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  border: 'none'
                                }
                              }}
                            >
                              <MenuItem value="each">Each</MenuItem>
                              <MenuItem value="total">Total</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      )}
                    </Grid>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={12}>
                      <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
                          <InputLabel>Size</InputLabel>
                          <Select
                            fullWidth
                            displayEmpty
                            value={getCurrentForm().size || ''}
                            name="size"
                            inputRef={sizeRef}
                            onChange={(e) => {
                              const selectedSize = e.target.value;
                              const selectedSizeObj = diamondSizes.find(sizeObj => sizeObj.size === selectedSize);
                              setCurrentForm(prev => ({
                                ...prev, 
                                size: selectedSize,
                                weight: selectedSizeObj ? selectedSizeObj.weight : 0
                              }));
                              if (weightRef?.current) {
                                setTimeout(() => {
                                  weightRef.current.focus();
                                }, 0);
                              }
                            }}
                            onKeyDown={(e) => handleEnterKey(e, weightRef)}
                            sx={{ width: '100%' }}
                          >
                            {diamondSizes.map((sizeObj) => (
                              <MenuItem key={sizeObj.size} value={sizeObj.size}>
                                {sizeObj.size}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          fullWidth
                          label="Weight (carats) *"
                          name="weight"
                          type="number"
                          value={getCurrentForm().weight}
                          onChange={handleDiamondChange}
                          inputRef={weightRef}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (colorSliderRef?.current) {
                                setTimeout(() => {
                                  const sliderInput = colorSliderRef.current.querySelector('input');
                                  if (sliderInput) {
                                    sliderInput.focus();
                                  }
                                }, 0);
                              }
                            }
                          }}
                          InputProps={{
                            inputProps: { step: "0.01", min: "0" }
                          }}
                          sx={{ width: '100%', mb: 2 }}
                        />
                       
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Color Selection */}
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Color *</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  {diamondColors.map((color) => (
                    <Paper
                      key={color.name}
                      elevation={
                        // Highlight if the current exact color falls in this category
                        getColorCategory(exactColor) === color.name ? 8 : 1
                      }
                      sx={{
                        p: 1,
                        cursor: 'pointer',
                        width: 80,
                        height: 80,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: color.color,
                        transition: 'all 0.3s ease',
                      }}
                      onClick={() => {
                        // When clicking, set the exact color to the start of the range
                        const startColor = color.range.split('-')[0];
                        setCurrentForm(prev => ({ 
                          ...prev, 
                          color: color.name,
                          exactColor: startColor
                        }));
                        // Update exact color state
                        setExactColor(startColor);
                      }}
                    >
                      <Typography variant="caption" align="center">
                        {color.name}
                      </Typography>
                      <Typography variant="caption" align="center">
                        {color.range}
                      </Typography>
                    </Paper>
                  ))}
                </Box>

                {/* Color Scale Slider */}
                <Box sx={{ width: '100%', px: 2, mt: 2 }}>
                  <Typography gutterBottom>
                    Exact Color: {exactColor}
                  </Typography>
                  <SliderStyled
                    ref={colorSliderRef}
                    value={colorScale.indexOf(exactColor)}
                    onChange={handleExactColorChange}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => colorScale[value]}
                    step={1}
                    marks
                    min={0}
                    max={colorScale.length - 1}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setTimeout(() => { 
                          const clarityContainer = document.querySelector('[data-clarity-container]');
                          if (clarityContainer) { clarityContainer.focus(); } }, 0); }
                      }
                    }
                    sx={{
                      '& .MuiSlider-thumb': {
                        '&:focus': {
                          outline: '2px solid #1976d2',
                          outlineOffset: '2px'
                        }
                      }
                    }}
                  />
                </Box>

                {/* Clarity Selection */}
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Clarity *</Typography>
                <Box 
                  data-clarity-container 
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                      e.preventDefault();
                      const clarityPapers = Array.from(document.querySelectorAll('[data-clarity-paper]'));
                      let newIndex = selectedClarityIndex;
                      
                      if (e.key === 'ArrowLeft') {
                        newIndex = Math.max(0, selectedClarityIndex - 1);
                      } else if (e.key === 'ArrowRight') {
                        newIndex = Math.min(clarityPapers.length - 1, selectedClarityIndex + 1);
                      }

                      if (diamondClarity[newIndex]) {
                        setSelectedClarityIndex(newIndex);
                        setCurrentForm(prev => ({ ...prev, clarity: diamondClarity[newIndex].name }));
                        clarityPapers[newIndex]?.focus();
                      }
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (cutRef?.current) {
                          cutRef.current.focus();
                    }}
                  }}
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}
                >
                  {diamondClarity.map((clarity, index) => (
                    <Paper
                      key={clarity.name}
                      data-clarity-paper
                      tabIndex={0}
                      elevation={selectedClarityIndex === index ? 8 : 1}
                      sx={{
                        p: 1,
                        cursor: 'pointer',
                        width: 80,
                        height: 80,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '&:focus': {
                          outlineOffset: '2px'
                        }
                      }}
                      onClick={() => {
                        setSelectedClarityIndex(index);
                        setCurrentForm(prev => ({ ...prev, clarity: clarity.name }));
                      }}
                    >
                      <Box
                        component="img"
                        src={clarity.image}
                        alt={clarity.name}
                        sx={{ width: 40, height: 40 }}
                      />
                      <Typography variant="caption" align="center">
                        {clarity.name}
                      </Typography>
                    </Paper>
                  ))}
                </Box>

                <Grid container spacing={2} sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={4}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel ref={cutRef}>Cut *</InputLabel>
                      <Select
                        value={getCurrentForm().cut}
                        name="Cut"
                        onChange={(e) => {
                          if (labGrownRef?.current) {
                            setTimeout(() => {
                              labGrownRef.current.focus();
                            }, 0);
                          setCurrentForm(prev => ({
                          ...prev, 
                          cut: e.target.value
                        }))}}}
                        inputRef={cutRef}
                        onKeyDown={(e) => handleEnterKey(e, labGrownRef)}
                      >
                        {diamondCuts.map((cut) => (
                          <MenuItem key={cut.name} value={cut.name}>{cut.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={4}>
                    <FormControlLabel
                      control={
                        <Checkbox 
                          checked={getCurrentForm().labGrown}
                          onChange={(e) => setCurrentForm(prev => ({
                            ...prev, 
                            labGrown: e.target.checked
                          }))}
                          name="labGrown"
                          inputRef={labGrownRef}
                          onKeyDown={(e) => handleEnterKey(e, addDiamondRef)}
                        />
                      }
                      label="Lab Grown"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <Grid container spacing={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Grid item xs={12}>
                        <Button 
                          ref={addDiamondRef}
                          variant="contained" 
                          color="primary" 
                          fullWidth 
                          onClick={addDiamond}
                          disabled={!getCurrentForm().shape || !getCurrentForm().clarity || !getCurrentForm().cut}
                        >
                          ADD DIAMOND
                        </Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12} sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', mr: 0 }}>
                    Est. {activeTab.startsWith('primary') ? 'Primary' : 'Secondary'} {activeTab.includes('diamond') ? 'Diamond' : 'Stone'} Value $: 
                  </Typography>
                  <TextField
                    size="small"
                    type="decimal"
                    value={activeTab === 'primary_gem_diamond' ? estimatedValues.primaryDiamond.toFixed(1) : 
                      activeTab === 'primary_gem_stone' ? estimatedValues.primaryGemstone.toFixed(1) : 
                      activeTab === 'secondary_gem_diamond' ? estimatedValues.secondaryDiamond.toFixed(1) : 
                      estimatedValues.secondaryGemstone.toFixed(1)}
                    variant="standard"
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue)) {
                        if (activeTab === 'primary_gem_diamond') {
                          setEstimatedValues(prev => ({ ...prev, primaryDiamond: newValue }));
                        } else if (activeTab === 'primary_gem_stone') {
                          setEstimatedValues(prev => ({ ...prev, primaryGemstone: newValue }));
                        } else if (activeTab === 'secondary_gem_diamond') {
                          setEstimatedValues(prev => ({ ...prev, secondaryDiamond: newValue }));
                        } else {
                          setEstimatedValues(prev => ({ ...prev, secondaryGemstone: newValue }));
                        }
                      }
                    }}
                    inputProps={{ 
                      min: 0,
                      inputMode: 'decimal',
                      pattern: '[0-9]*\\.?[0-9]*',
                      style: { width: '50px' }
                    }}
                    sx={{ 
                      ml: 1,
                      '& .MuiInputBase-root': {
                        ml: 0,
                        pl: 0
                      }
                    }}
                  />
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={() => {
                      if (activeTab.startsWith('primary')) {
                        setActiveTab('secondary_gem_diamond');
                      } else {
                        setActiveTab('primary_gem_diamond');
                      }
                    }}
                    sx={{ ml: 2 }}
                  >
                    {activeTab.startsWith('primary') ? 'Secondary Gem' : 'Primary Gem'}
                  </Button>
                </Grid>
              </Grid>
              </Box>
            )}

            {(activeTab === 'primary_gem_stone' || activeTab === 'secondary_gem_stone') && (
              <Box>
                {renderStoneEstimationTab()}
              </Box>
            )}
      </Paper>
    );
  };

  return (
    <div>
      {renderContent()}
    </div>
  );
}

export default GemEstimator;
