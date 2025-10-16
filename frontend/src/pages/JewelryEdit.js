import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import debounce from 'lodash/debounce';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Autocomplete,
  TextField,
  InputAdornment,
  MenuItem,
  Snackbar,
  Alert,
  Divider,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  IconButton,
  Select,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Checkbox,
  Slider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import DiamondIcon from '@mui/icons-material/Diamond';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import MetalEstimator from './MetalEstimator';
import GemEstimator from './GemEstimator';

// Utility functions for pricing analysis and image handling
const formatPrice = (price) => {
  return Number(price).toFixed(2);
};

// Function to get image URL for jewelry items
const getImageUrl = (item) => {
  if (!item) return '/placeholder-jewelry.png';
  return item.image_url || '/placeholder-jewelry.png';
};

// Metal API utility functions
const API_BASE_URL = config.apiUrl;
const API_ENDPOINTS = {
  // Fix endpoints to match exact API paths that MetalEstimator.js uses
  PRECIOUS_METAL_TYPE: `${API_BASE_URL}/precious_metal_type`,
  NON_PRECIOUS_METAL_TYPE: `${API_BASE_URL}/non_precious_metal_type`,
  METAL_CATEGORY: `${API_BASE_URL}/metal_category`,
  METAL_PURITY: `${API_BASE_URL}/metal_purity`,
  METAL_COLOR: `${API_BASE_URL}/metal_color`,
  LIVE_SPOT_PRICES: `${API_BASE_URL}/spot_prices/live`,
  LIVE_PRICING: `${API_BASE_URL}/live_pricing`
};

const useMetalAPI = () => {
  const fetchData = async (endpoint) => {
    try {
      const response = await axios.get(endpoint);
      return response.data;
    } catch (error) {
      console.error(`Error fetching data from ${endpoint}:`, error);
      return [];
    }
  };

  const fetchAllMetalData = async () => {
    try {
      const [preciousMetalTypes, nonPreciousMetalTypes, categories, colors] = await Promise.all([
        fetchData(API_ENDPOINTS.PRECIOUS_METAL_TYPE),
        fetchData(API_ENDPOINTS.NON_PRECIOUS_METAL_TYPE),
        fetchData(API_ENDPOINTS.METAL_CATEGORY),
        fetchData(API_ENDPOINTS.METAL_COLOR),
      ]);

      return {
        preciousMetalTypes: preciousMetalTypes || [],
        nonPreciousMetalTypes: nonPreciousMetalTypes || [],
        categories: categories || [],
        colors: colors || []
      };
    } catch (error) {
      console.error('Error fetching all metal data:', error);
      return {
        preciousMetalTypes: [],
        nonPreciousMetalTypes: [],
        categories: [],
        colors: []
      };
    }
  };

  return { fetchData, fetchAllMetalData };
};

function JewelryEdit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const API_BASE_URL = config.apiUrl;

  
  // State variables
  const [item, setItem] = useState(null);
  const [baselineItem, setBaselineItem] = useState(null); // Stores the current state with all history applied (for comparison)
  const [loading, setLoading] = useState(true);
  const [metalDialogOpen, setMetalDialogOpen] = useState(false);
  const [gemDialogOpen, setGemDialogOpen] = useState(false);
  const [combinedDialogOpen, setCombinedDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Track if there are unsaved changes
  const autoSaveTimerRef = useRef(null); // Reference for auto-save timer
  const isInitialLoadRef = useRef(true); // Track if this is the initial load
  const [gemTab, setGemTab] = useState('diamond');  // Initialize with all secondary gems visible by default
  const [secondaryGemTab, setSecondaryGemTab] = useState('all'); // Controls which secondary gem tab is active
  const [isSecondaryGem, setIsSecondaryGem] = useState(false); // Tracks whether we're editing primary or secondary gem
  // States to track inline editing
  const [editingField, setEditingField] = useState(null);
  const inlineInputRef = useRef(null);
  
  const [gemData, setGemData] = useState({
    diamond: {
      shape: 'Round',
      weight: '',
      color: '',
      clarity: '',
      cut: '',
      labGrown: false,
      quantity: '1',
      size: '',
      color: 'Colorless',
      exactColor: 'D',
      estimatedValue: ''
    },
    stone: {
      type: '',
      weight: '',
      shape: 'Round',
      color: '',
      quantity: '1',
      size: '',
      authentic: false,
      estimatedValue: ''
    }
  });
  
  // State for diamond shape navigation
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  
  // Diamond data states - initialized as empty arrays/values
  const [diamondShapes, setDiamondShapes] = useState([]);
  const [diamondClarity, setDiamondClarity] = useState([]);
  const [selectedClarityIndex, setSelectedClarityIndex] = useState(0);
  const [diamondCuts, setDiamondCuts] = useState([]);
  const [diamondColors, setDiamondColors] = useState([]);
  const [diamondSizes, setDiamondSizes] = useState([]);
  const [colorScale, setColorScale] = useState([]);
  
  
  // State for stone types and colors from API
  const [stoneTypes, setStoneTypes] = useState([]);
  const [stoneColors, setStoneColors] = useState([]);
  const [stoneShapes, setStoneShapes] = useState([]);

  // State for metal data from API
  const [preciousMetalTypes, setPreciousMetalTypes] = useState([]);
  const [nonPreciousMetalTypes, setNonPreciousMetalTypes] = useState([]);
  const [metalCategories, setMetalCategories] = useState([]);
  const [metalPurities, setMetalPurities] = useState([]);
  const [metalColors, setMetalColors] = useState([]);

  // Initialize metal API hooks
  const { fetchData, fetchAllMetalData } = useMetalAPI();

  // Function to fetch metal purities based on metal type
  const fetchPurities = async (metalTypeId) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.METAL_PURITY}/${metalTypeId}`);
      setMetalPurities(response.data || []);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching metal purities:', error);
      setMetalPurities([]);
      return [];
    }
  };

  // Fetch metal data on component mount
  useEffect(() => {
    const fetchMetalData = async () => {
      try {
        const {
          preciousMetalTypes,
          nonPreciousMetalTypes,
          categories,
          colors
        } = await fetchAllMetalData();

        // Make sure the data is properly formatted and has expected fields
        const processedPreciousTypes = Array.isArray(preciousMetalTypes) ? preciousMetalTypes : [];
        const processedNonPreciousTypes = Array.isArray(nonPreciousMetalTypes) ? nonPreciousMetalTypes : [];
        const processedCategories = Array.isArray(categories) ? categories : [];

        setPreciousMetalTypes(processedPreciousTypes);
        setNonPreciousMetalTypes(processedNonPreciousTypes);
        setMetalCategories(processedCategories);
        setMetalColors(Array.isArray(colors) ? colors : []);

        // If we have a precious metal type ID, fetch purities for it
        if (item && item.precious_metal_type_id) {
            fetchPurities(item.precious_metal_type_id);
          } else if (processedPreciousTypes.length > 0) {
            // If no specific metal type ID but we have metal types, fetch purities for the first one
            fetchPurities(processedPreciousTypes[0].id);
          }
      } catch (error) {
        console.error('Error fetching metal data:', error);
      }
    };

    fetchMetalData();
  }, []); // Remove dependency to ensure it runs only on mount

  
  // Handler for editing jewelry item (combined metal and gem)
  const handleEditJewelryItem = () => {
    setCombinedDialogOpen(true);
  };
  
  // Handler for editing metal details - retained for other code that might reference it
  const handleEditMetal = () => {
    setMetalDialogOpen(true);
  };
  
  // Handler for metal value changes - retained for other code that might reference it
  const handleMetalValueChange = (value) => {
    // Required by MetalEstimator
  };
  
  // State to hold metal form data
  const [metalFormState, setMetalFormState] = useState(null);
  const [gemFormState, setGemFormState] = useState({
    diamonds: [],
    stones: [],
    secondaryGems: []
  });

  // Handler for saving changes from combined dialog
  const handleCombinedSave = async () => {
    try {
      setIsSaving(true);
      
      // Create a copy of the current item with updated fields
      const updatedItem = { ...item };
      const changes = {};
      
      // Helper function to track changes with proper number comparison
      const trackChange = (field, newValue) => {
        // Compare against baselineItem (current state with history) instead of the original item
        const oldValue = baselineItem?.[field] !== undefined ? baselineItem[field] : updatedItem[field];

        // Helper function to check if a value is "empty"
        const isEmpty = (value) => {
          return value === null || value === undefined || value === '' ||
                 (typeof value === 'string' && value.trim() === '');
        };

        // Skip if both values are empty (no meaningful change)
        if (isEmpty(oldValue) && isEmpty(newValue)) {
          return newValue;
        }

        // Function to normalize values for comparison (convert string numbers to numbers)
        const normalizeValue = (value) => {
          if (value === null || value === undefined) return value;
          // If it's a string that can be converted to a number, return as number
          if (typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(value)) {
            // Preserve decimal places for display but compare as number
            return parseFloat(value);
          }
          return value;
        };

        const normalizedOld = normalizeValue(oldValue);
        const normalizedNew = normalizeValue(newValue);

        // Compare the normalized values
        if (JSON.stringify(normalizedOld) !== JSON.stringify(normalizedNew)) {
          changes[field] = {
            from: oldValue, // Keep original values for display
            to: newValue
          };
        }
        return newValue;
      };
      
      // Update metal data if available
      if (metalFormState) {
        updatedItem.precious_metal_type = trackChange('precious_metal_type', metalFormState.preciousMetalType || '');
        updatedItem.metal_weight = trackChange('metal_weight', metalFormState.weight || 0);
        updatedItem.non_precious_metal_type = trackChange('non_precious_metal_type', metalFormState.nonPreciousMetalType || '');
        updatedItem.metal_purity = trackChange('metal_purity', metalFormState.purity?.purity || '');
        updatedItem.purity_value = trackChange('purity_value', metalFormState.purity?.value || 0);
        updatedItem.metal_spot_price = trackChange('metal_spot_price', metalFormState.spotPrice || 0);
        updatedItem.est_metal_value = trackChange('est_metal_value', metalFormState.metalValue || 0);
        // Only track jewelry_color changes if the metal type is Gold
        if (metalFormState.preciousMetalType === 'Gold') {
          updatedItem.jewelry_color = trackChange('jewelry_color', metalFormState.jewelryColor || '');
        }
        updatedItem.category = trackChange('category', metalFormState.metalCategory || '');
      }

      // Track gem changes
      if (gemFormState) {
        if (gemFormState.diamonds?.length > 0) {
          const primaryDiamond = gemFormState.diamonds[0];
          updatedItem.primary_gem_category = trackChange('primary_gem_category', 'diamond');
          updatedItem.primary_gem_shape = trackChange('primary_gem_shape', primaryDiamond.shape || '');
          updatedItem.primary_gem_weight = trackChange('primary_gem_weight', primaryDiamond.weight || 0);
          updatedItem.primary_gem_color = trackChange('primary_gem_color', primaryDiamond.color || '');
          updatedItem.primary_gem_clarity = trackChange('primary_gem_clarity', primaryDiamond.clarity || '');
          updatedItem.primary_gem_cut = trackChange('primary_gem_cut', primaryDiamond.cut || '');
          updatedItem.primary_gem_lab_grown = trackChange('primary_gem_lab_grown', primaryDiamond.labGrown || false);
          updatedItem.primary_gem_quantity = trackChange('primary_gem_quantity', parseInt(primaryDiamond.quantity) || 1);
          updatedItem.primary_gem_size = trackChange('primary_gem_size', primaryDiamond.size || '');
          updatedItem.primary_gem_exact_color = trackChange('primary_gem_exact_color', primaryDiamond.exactColor || 'D');
          updatedItem.primary_gem_value = trackChange('primary_gem_value', primaryDiamond.estimatedValue || 0);
          updatedItem.gemstone = 'Diamond';
        } 
        else if (gemFormState.stones?.length > 0) {
          const primaryStone = gemFormState.stones[0];
          updatedItem.primary_gem_category = trackChange('primary_gem_category', 'stone');
          updatedItem.primary_gem_type = trackChange('primary_gem_type', primaryStone.type || '');
          updatedItem.primary_gem_weight = trackChange('primary_gem_weight', primaryStone.weight || 0);
          updatedItem.primary_gem_shape = trackChange('primary_gem_shape', primaryStone.shape || '');
          updatedItem.primary_gem_color = trackChange('primary_gem_color', primaryStone.color || '');
          updatedItem.primary_gem_quantity = trackChange('primary_gem_quantity', parseInt(primaryStone.quantity) || 1);
          updatedItem.primary_gem_authentic = trackChange('primary_gem_authentic', primaryStone.authentic || false);
          updatedItem.primary_gem_value = trackChange('primary_gem_value', primaryStone.estimatedValue || 0);
          updatedItem.gemstone = 'Stone';
        }
        // Track secondary gems changes
        if (gemFormState.secondaryGems?.length > 0) {
          // First, get the current values from the form state
          const currentFormGems = gemFormState.secondaryGems || [];
          // Use baselineItem for comparison instead of item
          const oldSecondaryGems = baselineItem?.secondaryGems || item.secondaryGems || [];
          const newSecondaryGems = currentFormGems.map((gem, index) => {
            const oldGem = oldSecondaryGems[index] || {};
            const updatedGem = { ...gem };
            
            // Create a function to safely track changes with proper type conversion
            const trackGemChange = (field, newValue, oldValue = oldGem[field]) => {
              // Convert numeric fields to numbers if they're strings
              const numericFields = ['secondary_gem_weight', 'secondary_gem_quantity', 'secondary_gem_value'];
              if (numericFields.includes(field) && typeof newValue === 'string') {
                newValue = parseFloat(newValue) || 0;
              }
              return newValue;
            };
            
            // Track changes for each field based on gem category
            if (gem.secondary_gem_category === 'stone') {
              // Stone-specific fields
              updatedGem.secondary_gem_type = trackGemChange('secondary_gem_type', gem.secondary_gem_type);
              updatedGem.secondary_gem_authentic = trackGemChange('secondary_gem_authentic', gem.secondary_gem_authentic);
            } else if (gem.secondary_gem_category === 'diamond') {
              // Diamond-specific fields
              updatedGem.secondary_gem_clarity = trackGemChange('secondary_gem_clarity', gem.secondary_gem_clarity);
              updatedGem.secondary_gem_cut = trackGemChange('secondary_gem_cut', gem.secondary_gem_cut);
              updatedGem.secondary_gem_size = trackGemChange('secondary_gem_size', gem.secondary_gem_size);
              updatedGem.secondary_gem_exact_color = trackGemChange('secondary_gem_exact_color', gem.secondary_gem_exact_color);
              updatedGem.secondary_gem_lab_grown = trackGemChange('secondary_gem_lab_grown', gem.secondary_gem_lab_grown);
            }
            
            // Common fields for both stone and diamond
            updatedGem.secondary_gem_category = trackGemChange('secondary_gem_category', gem.secondary_gem_category);
            updatedGem.secondary_gem_weight = trackGemChange('secondary_gem_weight', gem.secondary_gem_weight);
            updatedGem.secondary_gem_shape = trackGemChange('secondary_gem_shape', gem.secondary_gem_shape);
            updatedGem.secondary_gem_color = trackGemChange('secondary_gem_color', gem.secondary_gem_color);
            updatedGem.secondary_gem_quantity = trackGemChange('secondary_gem_quantity', gem.secondary_gem_quantity);
            updatedGem.secondary_gem_value = trackGemChange('secondary_gem_value', gem.secondary_gem_value);
            
            return updatedGem;
          });
          
          // Add secondary gems to updatedItem for API submission
          updatedItem.secondaryGems = newSecondaryGems;
          
          // Track changes for each secondary gem field in the specified format
          newSecondaryGems.forEach((gem, index) => {
            const oldGem = oldSecondaryGems[index] || {};

            const gemChanges = {};
            
            const isDiamond = gem.secondary_gem_category === 'diamond';

            // Common fields for both diamond and stone
            const commonMappings = {
              secondary_gem_weight: 'secondary_gem_weight',
              secondary_gem_shape: 'secondary_gem_shape',
              secondary_gem_color: 'secondary_gem_color',
              secondary_gem_quantity: 'secondary_gem_quantity',
              secondary_gem_value: 'secondary_gem_value'
            };

            // Diamond specific fields
            const diamondMappings = {
              secondary_gem_clarity: 'secondary_gem_clarity',
              secondary_gem_cut: 'secondary_gem_cut',
              secondary_gem_size: 'secondary_gem_size',
              secondary_gem_lab_grown: 'secondary_gem_lab_grown',
              secondary_gem_exact_color: 'secondary_gem_exact_color'
            };

            // Stone specific fields
            const stoneMappings = {
              secondary_gem_type: 'secondary_gem_type',
              secondary_gem_authentic: 'secondary_gem_authentic'
            };

            // Combine common fields with type-specific fields
            const fieldMappings = {
              ...commonMappings,
              ...(isDiamond ? diamondMappings : stoneMappings)
            };
            
            // Helper function to normalize values for comparison
            const normalizeValue = (value) => {
              if (value === null || value === undefined) return value;
              // If it's a string that can be converted to a number, return as number
              if (typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(value)) {
                // Preserve decimal places for display but compare as number
                return parseFloat(value);
              }
              return value;
            };
            // Check each field for changes
            Object.entries(fieldMappings).forEach(([field, dbField]) => {
              const newValue = normalizeValue(gem[field]);
              const oldValue = normalizeValue(oldGem[field]);
              if (newValue !== oldValue) {
                gemChanges[dbField] = {
                  from: oldGem[field],
                  to: gem[field]
                };
              }
            });
            // If there are changes for this gem, add them to the changes object
            if (Object.keys(gemChanges).length > 0) {
              changes[`secondary_gem_${index + 1}`] = gemChanges;
            }
          });
        }
      }
      // Update local state immediately for instant UI update
      const updatedItemWithGems = { 
        ...updatedItem,
        secondaryGems: gemFormState?.secondaryGems ? [...gemFormState.secondaryGems] : []
      };
      
      setItem(updatedItemWithGems);
      setEditedItem(updatedItemWithGems);
      
      // If there are changes, save them to item_history
      if (Object.keys(changes).length > 0) {
        try {
          // Prepare the history data
          await axios.post(`${API_BASE_URL}/jewelry/history`, {
            item_id: item.item_id,
            changed_fields: changes,
            changed_by: currentUser?.employee_id || 1,
            action: 'update',
            notes: 'Item details updated via combined editor'
          });

          // Update baseline to reflect the new current state after successful save
          setBaselineItem(JSON.parse(JSON.stringify(updatedItemWithGems)));

          setSnackbar({
            open: true,
            message: 'Changes saved successfully',
            severity: 'success'
          });
        } catch (error) {
          console.error('Error saving to item history:', error);
          // Still show success for the main save, but log the history error
          setSnackbar({
            open: true,
            message: 'Changes saved, but there was an issue updating the history',
            severity: 'warning'
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: 'No changes to save',
          severity: 'info'
        });
      }
      
      setCombinedDialogOpen(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      setSnackbar({
        open: true,
        message: `Failed to save changes: ${error.response?.data?.message || error.message}`,
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handler for canceling combined dialog
  const handleCombinedCancel = () => {
    setCombinedDialogOpen(false);
  };

  // Handler for when metal data is saved in the dialog
  const handleMetalSave = (updatedMetal) => {
    
    // Apply the updated metal data to the item
    setItem(prevItem => ({
      ...prevItem,
      metal_type: updatedMetal.preciousMetalType,
      metal_weight: updatedMetal.weight,
      precious_metal_type_id: updatedMetal.preciousMetalTypeId,
      non_precious_metal_type: updatedMetal.nonPreciousMetalType,
      category: updatedMetal.metalCategory,
      metal_purity: updatedMetal.purity.purity,
      purity_value: updatedMetal.purity.value,
      jewelry_color: updatedMetal.jewelryColor,
      metal_value: updatedMetal.estimatedValue,
      spot_price: updatedMetal.spotPrice
    }));
    
    // Close the dialog
    setMetalDialogOpen(false);
  };
  

  // Handler for canceling metal edit
  const handleMetalCancel = () => {
    setMetalDialogOpen(false);
  };


  // Handler for closing gem dialog
  const handleGemDialogClose = () => {
    setGemDialogOpen(false);
    setIsSecondaryGem(false); // Reset the secondary gem flag when closing dialog
  };

  // Handler for gem data changes
  const handleGemDataChange = (gemType, field, value) => {
    if (gemType === 'diamond' && field === 'shape') {
      // Update shape and find the corresponding index for navigation
      const shapeIndex = diamondShapes.findIndex(shape => shape.name === value);
      if (shapeIndex !== -1) {
        setCurrentShapeIndex(shapeIndex);
      }
    }
    
    // Update the appropriate gem data field
    setGemData(prev => ({
      ...prev,
      [gemType]: {
        ...prev[gemType],
        [field]: value
      }
    }));
    
    // Also update the corresponding field in the item state for the diamond tab display
    if (gemType === 'diamond') {
      // Map gemData.diamond fields to item.primary_gem_* fields
      const itemFieldMapping = {
        'shape': 'primary_gem_shape',
        'weight': 'primary_gem_weight',
        'color': 'primary_gem_color',
        'clarity': 'primary_gem_clarity',
        'cut': 'primary_gem_cut',
        'lab': 'primary_gem_lab_grown',
        'quantity': 'primary_gem_quantity',
        'size': 'primary_gem_size',
        'exactColor': 'primary_gem_exact_color',
        'estimatedValue': 'primary_gem_value'
      };
      
      const itemField = itemFieldMapping[field];
      if (itemField) {
        // Make sure to preserve all item properties and safely update
        setItem(prev => {
          if (!prev) return prev; // Safety check if item is null
          return {
            ...prev,
            [itemField]: value,
            // Also update primary_gem_* fields for consistency if we're in diamond mode
            ...(gemTab === 'diamond' ? { [`primary_gem_${field}`]: value } : {})
          };
        });
        // Also update the editedItem if it exists
        if (editedItem) {
          setEditedItem(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              [itemField]: value
            };
          });
        }
      }
    } else if (gemType === 'stone') {
      // Map gemData.stone fields to item.primary_gem_* fields
      const itemFieldMapping = {
        'type': 'primary_gem_type',
        'name': 'primary_gem_name',
        'weight': 'primary_gem_weight',
        'shape': 'primary_gem_shape',
        'color': 'primary_gem_color',
        'quantity': 'primary_gem_quantity',
        'size': 'primary_gem_size',
        'authentic': 'primary_gem_authentic',
        'estimatedValue': 'primary_gem_value'
      };
      
      const itemField = itemFieldMapping[field];
      if (itemField) {
        // Make sure to preserve all item properties and safely update
        setItem(prev => {
          if (!prev) return prev; // Safety check if item is null
          return {
            ...prev,
            [itemField]: value,
            // Also update primary_gem_* fields for consistency if we're in stone mode
            ...(gemTab === 'stone' ? { [`primary_gem_${field}`]: value } : {})
          };
        });
        // Also update the editedItem if it exists
        if (editedItem) {
          setEditedItem(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              [itemField]: value
            };
          });
        }
      }
    }
  };
  
  // Handler for diamond shape navigation
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
        
        // Update gem data with the new shape
        handleGemDataChange('diamond', 'shape', newShape.name);
        
        // Reset size when changing shape
        handleGemDataChange('diamond', 'size', '');
        
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
        
        // Update gem data with the new shape
        handleGemDataChange('diamond', 'shape', newShape.name);
        
        // Reset size when changing shape
        handleGemDataChange('diamond', 'size', '');
        
        // Also fetch the sizes for this shape
        fetchDiamondSizes(shapeId);
      }
    }
  };

  // Handler for saving gem updates
  const handleGemSave = (updatedGemData) => {
    // Update both item and editedItem with new gem data
    const updateState = (prev) => {
      // Get the appropriate gem data
      const newItem = { ...prev };
      
      if (updatedGemData.diamonds) {
        newItem.diamonds = updatedGemData.diamonds;
        // Get primary diamond data
        const primaryDiamond = updatedGemData.diamonds.find(d => d.primary) || updatedGemData.diamonds[0];
        
        // Update general gem fields
        newItem.gemstone = 'Diamond';        
        
        // Set primary gem fields consistently
        newItem.primary_gem_category = 'diamond';
        newItem.primary_gem_shape = primaryDiamond.shape;
        newItem.primary_gem_weight = primaryDiamond.weight;
        newItem.primary_gem_color = primaryDiamond.color;
        newItem.primary_gem_clarity = primaryDiamond.clarity;
        newItem.primary_gem_cut = primaryDiamond.cut;
        newItem.primary_gem_lab_grown = primaryDiamond.lab;
        newItem.primary_gem_quantity = primaryDiamond.quantity;
        newItem.primary_gem_size = primaryDiamond.size;
        newItem.primary_gem_value = primaryDiamond.estimatedValue;
        newItem.primary_gem_exact_color = primaryDiamond.exactColor || 'D';
      } else if (updatedGemData.stones) {
        newItem.stones = updatedGemData.stones;
        // Get primary stone data
        const primaryStone = updatedGemData.stones.find(s => s.primary) || updatedGemData.stones[0];
        
        // Update general gem fields
        newItem.gemstone = primaryStone.type;
        // Use primary_gem fields instead of stone fields
        newItem.primary_gem_weight = primaryStone.weight;
        newItem.primary_gem_color = primaryStone.color;
        
        // Update specific stone fields for the form using primary_gem_* naming
        newItem.primary_gem_type = primaryStone.type || '';
        newItem.primary_gem_name = primaryStone.name || primaryStone.type || '';
        newItem.primary_gem_weight = primaryStone.weight || '';
        newItem.primary_gem_shape = primaryStone.shape || '';
        newItem.primary_gem_color = primaryStone.color || '';
        newItem.primary_gem_quantity = primaryStone.quantity || '1';
        newItem.primary_gem_size = primaryStone.size || '';
        newItem.primary_gem_authentic = primaryStone.authentic || false;
        newItem.primary_gem_value = primaryStone.estimatedValue || '';
        
        // No need to clear diamond_* fields - we use primary_gem_* fields instead
        
        // Set primary gem fields consistently
        newItem.primary_gem_category = 'stone';
        newItem.primary_gem_type = primaryStone.type;
        newItem.primary_gem_shape = primaryStone.shape;
        newItem.primary_gem_weight = primaryStone.weight;
        newItem.primary_gem_color = primaryStone.color;
        newItem.primary_gem_quantity = primaryStone.quantity;
        newItem.primary_gem_size = primaryStone.size;
        newItem.primary_gem_authentic = primaryStone.authentic;
        newItem.primary_gem_value = primaryStone.estimatedValue;
      }
      
      // Also update the estimated value if provided
      if (gemData.estimatedValue) {
        if (newItem.diamonds && newItem.diamonds.length > 0) {
          newItem.diamonds[0].value = parseFloat(gemData.estimatedValue) || 0;
        } else if (newItem.stones && newItem.stones.length > 0) {
          newItem.stones[0].value = parseFloat(gemData.estimatedValue) || 0;
        }
      }
      
      return newItem;
    };
    
    // Update both states with the same data
    setItem(updateState);
    setEditedItem(updateState);
    
    // Close the dialog
    handleGemDialogClose();
  
    setSnackbar({
      open: true,
      message: 'Gem details updated successfully',
      severity: 'success'
    });
  };
  
  // Fetch gem data (diamonds and stones) on component mount
  useEffect(() => {
    const fetchDiamondData = async () => {
      try {
        // Fetch Diamond Shapes
        const shapesResponse = await axios.get(`${API_BASE_URL}/diamond_shape`);
        const shapesWithImages = shapesResponse.data.map(shape => ({
          id: shape.id,
          name: shape.shape,
          image: shape.image_path.replace('.jpg', '.png')
        }));
        setDiamondShapes(shapesWithImages);
        
        // If we have shapes, fetch sizes for the first shape
        if (shapesWithImages.length > 0) {
          const shapeId = shapesWithImages[0].id || 1;
          fetchDiamondSizes(shapeId);
        }

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
        
        // Generate dynamic colorScale from diamond color ranges
        let minColor = 'Z';
        let maxColor = 'A';
        diamondColorResponse.data.forEach(color => {
          if (color.range && color.range.includes('-')) {
            const [start, end] = color.range.split('-');
            // Update min and max color based on ranges
            if (start < minColor) minColor = start;
            if (end > maxColor) maxColor = end;
          }
        });
        
        // Create array of all colors from min to max
        const generatedColorScale = [];
        for (let charCode = minColor.charCodeAt(0); charCode <= maxColor.charCodeAt(0); charCode++) {
          generatedColorScale.push(String.fromCharCode(charCode));
        }
        
        // Set the dynamic color scale
        setColorScale(generatedColorScale);
      } catch (error) {
        console.error('Error fetching diamond data:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load diamond shapes from API. Please try again later.',
          severity: 'error'
        });
        // Set empty array instead of hardcoded fallback - always rely on API
        setDiamondShapes([]);
      }
    };
    
    // Fetch both diamond and stone data in parallel
    fetchDiamondData();
    fetchStoneData();
  }, []);
  
  // Function to fetch diamond sizes based on shape ID
  const fetchDiamondSizes = async (diamondShapeId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/diamond_size_weight/${diamondShapeId}`);
      setDiamondSizes(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching diamond sizes:', error);
      setDiamondSizes([]);
      return [];
    }
  };
  
  // Function to fetch stone types and colors
  const fetchStoneData = async () => {
    try {
      // Fetch stone types
      const typeResponse = await axios.get(`${API_BASE_URL}/stone_types`);
      setStoneTypes(typeResponse.data);
      
      // Fetch stone colors
      const colorResponse = await axios.get(`${API_BASE_URL}/stone_color`);
      const colors = colorResponse.data;
      setStoneColors(colors);
      
      // Find Red color from fetched colors
      const redColor = colors.find(color => color.color === 'Red');
      if (redColor) {
        
        // Filter stone types for Red color
        const redStoneTypes = typeResponse.data.filter(type => type.color_id === redColor.id);
        setFilteredStoneTypes(redStoneTypes);
        
        // Set Red as default selected color in gemData
        handleGemDataChange('stone', 'color', 'Red');
      }
    } catch (error) {
      console.error('Error fetching stone data:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load stone data from API. Please try again later.',
        severity: 'error'
      });
      // Set empty arrays as fallback
      setStoneTypes([]);
      setStoneColors([]);
    }
  };

  // Track filtered stone types separately to preserve original data
  const [filteredStoneTypes, setFilteredStoneTypes] = useState([]);

  // Update filtered stone types when color changes or when stone types are loaded
  useEffect(() => {
    if (stoneTypes.length > 0) {
      if (gemData.stone.color) {
        // Find the color object that matches the selected color name
        const selectedColorObj = stoneColors.find(c => c.color === gemData.stone.color);

        if (selectedColorObj) {
          // Filter stone types based on the color_id match
          const filtered = stoneTypes.filter(type => type.color_id === selectedColorObj.id);
          setFilteredStoneTypes(filtered);
        } else {
          // If no matching color found, show all stone types
          setFilteredStoneTypes(stoneTypes);
        }
      } else {
        // If no color is selected, show all stone types
        setFilteredStoneTypes(stoneTypes);
      }
    } else {
      // If no stone types loaded yet, set empty array
      setFilteredStoneTypes([]);
    }
  }, [stoneTypes, stoneColors, gemData.stone.color]);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tax, setTax] = useState({ rate: 0.13, amount: 0 }); // Default tax rate of 13%
  const [totalAmount, setTotalAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'amount'
  const [transactionType, setTransactionType] = useState('retail'); // 'sell' or 'retail'
  const [updatedMetalData, setUpdatedMetalData] = useState(null);

  // Auto-save effect: monitors editedItem changes and triggers save after a delay
  useEffect(() => {
    // Skip if no baseline or edited item (initial load)
    if (!baselineItem || !editedItem || !item) return;

    // Skip the initial load - only start tracking changes after the first render
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    // Function to check if values are meaningfully different
    const hasMeaningfulChanges = () => {
      // Get all unique field names from both baseline and edited items
      const allFields = new Set([
        ...Object.keys(baselineItem || {}),
        ...Object.keys(editedItem || {})
      ]);

      // Fields to exclude from comparison (internal state fields)
      const excludeFields = ['secondaryGems']; // Will handle secondaryGems separately

      const isEmpty = (value) => {
        return value === null || value === undefined || value === '' ||
               (typeof value === 'string' && value.trim() === '');
      };

      const normalizeValue = (value) => {
        if (value === null || value === undefined) return value;
        if (typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(value)) {
          return parseFloat(value);
        }
        return value;
      };

      // Helper function to check if values are effectively the same
      const areSameValue = (val1, val2) => {
        // Both empty
        if (isEmpty(val1) && isEmpty(val2)) return true;

        // Both are 0 or falsy numbers
        if ((val1 === 0 || val1 === '0') && (val2 === 0 || val2 === '0')) return true;

        // Same value after normalization
        const norm1 = normalizeValue(val1);
        const norm2 = normalizeValue(val2);
        return JSON.stringify(norm1) === JSON.stringify(norm2);
      };

      // Check all fields dynamically
      for (const field of allFields) {
        if (excludeFields.includes(field)) continue;

        const baselineValue = baselineItem?.[field];
        const editedValue = editedItem?.[field];

        // Skip if values are the same
        if (!areSameValue(baselineValue, editedValue)) {
          return true; // Found a meaningful change
        }
      }

      // Check secondaryGems if they exist
      if (baselineItem?.secondaryGems || editedItem?.secondaryGems) {
        const baselineGems = baselineItem?.secondaryGems || [];
        const editedGems = editedItem?.secondaryGems || [];

        // Check if lengths differ
        if (baselineGems.length !== editedGems.length) {
          return true;
        }

        // Check each gem for changes
        for (let i = 0; i < baselineGems.length; i++) {
          const baselineGem = baselineGems[i] || {};
          const editedGem = editedGems[i] || {};

          const gemFields = new Set([
            ...Object.keys(baselineGem),
            ...Object.keys(editedGem)
          ]);

          for (const field of gemFields) {
            if (!areSameValue(baselineGem[field], editedGem[field])) {
              return true; // Found a change in secondary gem
            }
          }
        }
      }

      return false; // No meaningful changes
    };

    // Check if there are actual meaningful changes
    const hasChanges = hasMeaningfulChanges();
    setHasUnsavedChanges(hasChanges);

    if (hasChanges) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new timer to auto-save after 2 seconds of inactivity
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          setIsSaving(true);

          // Compare editedItem with baselineItem to track changes
          const changes = {};

          // Helper function to normalize values for comparison
          const normalizeValue = (value) => {
            if (value === null || value === undefined) return value;
            if (typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(value)) {
              return parseFloat(value);
            }
            return value;
          };

          // Get all unique field names dynamically
          const allFields = new Set([
            ...Object.keys(baselineItem || {}),
            ...Object.keys(editedItem || {})
          ]);

          // Fields to exclude from tracking (internal state fields)
          const excludeFields = ['secondaryGems'];

          // Helper function to check if a value is "empty" or default
          const isEmpty = (value) => {
            return value === null || value === undefined || value === '' ||
                   (typeof value === 'string' && value.trim() === '');
          };

          // Helper function to check if values are effectively the same
          const areSameValue = (val1, val2) => {
            // Both empty
            if (isEmpty(val1) && isEmpty(val2)) return true;

            // Both are 0 or falsy numbers
            if ((val1 === 0 || val1 === '0') && (val2 === 0 || val2 === '0')) return true;

            // Same value after normalization
            const norm1 = normalizeValue(val1);
            const norm2 = normalizeValue(val2);
            return JSON.stringify(norm1) === JSON.stringify(norm2);
          };

          // Track changes for each field dynamically (excluding secondary gems)
          allFields.forEach(field => {
            if (excludeFields.includes(field)) return;

            const baselineValue = baselineItem?.[field];
            const editedValue = editedItem?.[field];

            // Skip if values are the same
            if (areSameValue(baselineValue, editedValue)) {
              return;
            }

            changes[field] = {
              from: baselineValue,
              to: editedValue
            };
          });

          // Handle secondaryGems separately with proper structure
          if (baselineItem?.secondaryGems || editedItem?.secondaryGems) {
            const baselineGems = baselineItem?.secondaryGems || [];
            const editedGems = editedItem?.secondaryGems || [];

            // Track changes for each secondary gem
            const maxLength = Math.max(baselineGems.length, editedGems.length);

            for (let i = 0; i < maxLength; i++) {
              const baselineGem = baselineGems[i] || {};
              const editedGem = editedGems[i] || {};

              // Get all unique fields from both gems
              const gemFields = new Set([
                ...Object.keys(baselineGem),
                ...Object.keys(editedGem)
              ]);

              const gemChanges = {};

              gemFields.forEach(field => {
                const baselineGemValue = baselineGem[field];
                const editedGemValue = editedGem[field];

                // Skip if values are the same
                if (areSameValue(baselineGemValue, editedGemValue)) {
                  return;
                }

                // Track the change
                gemChanges[field] = {
                  from: baselineGemValue,
                  to: editedGemValue
                };
              });

              // If there are changes for this gem, add them to changes object
              if (Object.keys(gemChanges).length > 0) {
                changes[`secondary_gem_${i + 1}`] = gemChanges;
              }
            }
          }

          // If there are changes, save them to history
          if (Object.keys(changes).length > 0) {
            await axios.post(`${API_BASE_URL}/jewelry/history`, {
              item_id: item.item_id,
              changed_fields: changes,
              changed_by: currentUser?.employee_id || 1,
              action: 'update',
              notes: 'Item details updated via direct edit (auto-save)'
            });

            // Update baseline to reflect the new current state
            const updatedItem = { ...item, ...editedItem };
            setItem(updatedItem);
            setBaselineItem(JSON.parse(JSON.stringify(updatedItem)));
            setHasUnsavedChanges(false);

            setSnackbar({
              open: true,
              message: 'Changes auto-saved successfully',
              severity: 'success'
            });
          }
        } catch (error) {
          console.error('Error auto-saving changes:', error);
          setSnackbar({
            open: true,
            message: `Failed to auto-save: ${error.response?.data?.message || error.message}`,
            severity: 'error'
          });
        } finally {
          setIsSaving(false);
        }
      }, 2000);
    }

    // Cleanup function
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [editedItem, baselineItem, item, currentUser, API_BASE_URL]); // Dependencies

  // Effects
  useEffect(() => {
    const fetchData = async () => {
      if (location.state?.itemId) {
        await fetchJewelryItem(location.state.itemId, location.state?.secondaryGems);
        
        // After fetching, check for secondary gems and set the appropriate tab
        if (location.state?.secondaryGems?.length > 0) {
          const hasStoneGem = location.state.secondaryGems.some(gem => 
            gem?.secondary_gem_category?.toLowerCase() === 'stone'
          );
          setSecondaryGemTab(hasStoneGem ? 'stone' : 'diamond');
        }
      } else {
        setLoading(false);
        setSnackbar({
          open: true,
          message: 'No item ID provided',
          severity: 'error'
        });
      }
    };

    fetchData();
  }, [location.state]);


  useEffect(() => {
    if (item) {
      // Initialize selling price with retail price
      setSellingPrice(item.retail_price || 0);
      
      // Set default tab based on secondary gem type if any
      if (item.secondaryGems?.length > 0) {
        const hasStoneGem = item.secondaryGems.some(gem => 
          gem?.secondary_gem_category?.toLowerCase() === 'stone'
        );
        setSecondaryGemTab(hasStoneGem ? 'stone' : 'diamond');
      }
      
      // Initialize gemData based on item's primary gem properties
      if (item.primary_gem_category) {
        // Determine if it's a diamond or stone based on primary_gem_category
        const isDiamond = item.primary_gem_category && 
                         item.primary_gem_category.toLowerCase() === 'diamond';
        
        // Set the gem tab based on the primary gem category
        setGemTab(isDiamond ? 'diamond' : 'stone');

        // Initialize diamond data if primary gem is a diamond
        if (isDiamond) {
          // Set diamond shape index for UI
          if (item.primary_gem_shape && diamondShapes.length > 0) {
            const shapeIndex = diamondShapes.findIndex(
              s => s.name && s.name.toLowerCase() === item.primary_gem_shape.toLowerCase()
            );
            if (shapeIndex !== -1) {
              setCurrentShapeIndex(shapeIndex);
            }
          }
          
          // Set clarity index for UI
          if (item.primary_gem_clarity && diamondClarity.length > 0) {
            const clarityIndex = diamondClarity.findIndex(
              c => c.name && c.name.toLowerCase() === item.primary_gem_clarity.toLowerCase()
            );
            if (clarityIndex !== -1) {
              setSelectedClarityIndex(clarityIndex);
            }
          }
          
          // Set diamond data
          setGemData(prev => ({
            ...prev,
            diamond: {
              shape: item.primary_gem_shape || 'Round',
              weight: item.primary_gem_weight || '',
              color: item.primary_gem_color || '',
              clarity: item.primary_gem_clarity || '',
              cut: item.primary_gem_cut || '',
              lab: item.primary_gem_lab_grown,
              quantity: item.primary_gem_quantity || '1',
              size: item.primary_gem_size || '',
              exactColor: item.primary_gem_exact_color || ''
            },
            estimatedValue: item.primary_gem_value || '0'
          }));
          
        } else {
          // Handle stone type
          setGemData(prev => ({
            ...prev,
            stone: {
              type: item.primary_gem_type || '',
              name: item.primary_gem_type || '',
              weight: item.primary_gem_weight || '',
              shape: item.primary_gem_shape || '',
              color: item.primary_gem_color || '',
              quantity: item.primary_gem_quantity || '1',
              size: item.primary_gem_size || '',
              authentic: item.primary_gem_authentic || false,
              estimatedValue: item.primary_gem_value || '0'
            }
          }));
        }
      }
      // Initialize secondary gem data if available
      if (item.secondary_gem_category) {
        // Determine if secondary gem is diamond or stone
        const isSecondaryDiamond = item.secondary_gem_category.toLowerCase() === 'diamond';
        
        // Set secondary gem tab based on the category
        setSecondaryGemTab(isSecondaryDiamond ? 'diamond' : 'stone');
        
        // Initialize secondary gem data in both item and editedItem states
        if (isSecondaryDiamond) {
          const secondaryDiamondValues = {
            secondary_gem_shape: item.secondary_gem_shape || '',
            secondary_gem_weight: item.secondary_gem_weight || '',
            secondary_gem_color: item.secondary_gem_color || '',
            secondary_gem_clarity: item.secondary_gem_clarity || '',
            secondary_gem_cut: item.secondary_gem_cut || '',
            secondary_gem_lab_grown: item.secondary_gem_lab_grown || false,
            secondary_gem_quantity: item.secondary_gem_quantity || '1',
            secondary_gem_size: item.secondary_gem_size || '',
            secondary_gem_value: item.secondary_gem_value || ''
          };
          
          // Update item state
          setItem(prev => ({
            ...prev,
            ...secondaryDiamondValues
          }));
          
          // Update editedItem state
          setEditedItem(prev => ({
            ...prev,
            ...secondaryDiamondValues
          }));
          
        } else {
          const secondaryStoneValues = {
            secondary_gem_type: item.secondary_gem_type || '',
            secondary_gem_shape: item.secondary_gem_shape || '',
            secondary_gem_color: item.secondary_gem_color || '',
            secondary_gem_weight: item.secondary_gem_weight || '',
            secondary_gem_quantity: item.secondary_gem_quantity || '1',
            secondary_gem_authentic: item.secondary_gem_authentic || false,
            secondary_gem_value: item.secondary_gem_value || ''
          };
          
          // Update item state
          setItem(prev => ({
            ...prev,
            ...secondaryStoneValues
          }));
          
          // Update editedItem state
          setEditedItem(prev => ({
            ...prev,
            ...secondaryStoneValues
          }));
          
        }
      }
    }
  }, [item, diamondShapes, diamondClarity]);

  useEffect(() => {
    // Calculate tax and total amount when selling price or discount changes
    calculateTotals();
  }, [sellingPrice, discount, discountType]);

  // Fetch functions
  const fetchJewelryItem = async (itemId, secondaryGems = []) => {
    try {
      setLoading(true);
      
      // Fetch all jewelry items like in Jewelry.js
      const response = await axios.get(`${API_BASE_URL}/jewelry`);
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid data received from the server');
      }
      
      // Find the specific item by item_id
      let foundItem = response.data.find(item => item.item_id === itemId);
      
      if (!foundItem) {
        throw new Error(`Item with ID ${itemId} not found`);
      }

      // Check if we have full history data from location state
      if (location.state?.fullHistory && Array.isArray(location.state.fullHistory)) {
        try {
          // Build the current state by processing all history entries
          // We need to get the latest change for each field
          const latestChanges = {};

          // Sort history by date (newest first) to get latest changes
          const sortedHistory = [...location.state.fullHistory].sort((a, b) =>
            new Date(b.changed_at) - new Date(a.changed_at)
          );

          // Process each history entry
          sortedHistory.forEach(entry => {
            const changedFields = typeof entry.changed_fields === 'string'
              ? JSON.parse(entry.changed_fields)
              : entry.changed_fields;

            if (!changedFields) return;

            // Process each field in this history entry
            const processField = (fields, prefix = '') => {
              Object.entries(fields).forEach(([key, value]) => {
                const fullKey = prefix ? `${prefix}.${key}` : key;

                // Skip if we already have a newer value for this field
                if (latestChanges.hasOwnProperty(fullKey)) {
                  return;
                }

                // If value has 'to' property, it's a direct change
                if (value && typeof value === 'object' && 'to' in value) {
                  latestChanges[fullKey] = value.to;
                }
                // If it's a nested object (like secondary_gem_1), process recursively
                else if (value && typeof value === 'object' && !Array.isArray(value)) {
                  processField(value, fullKey);
                }
                // Simple value
                else {
                  latestChanges[fullKey] = value;
                }
              });
            };

            processField(changedFields);
          });

          // Now merge the latest changes with the found item
          // Handle nested keys (like secondary_gem_1.cut)
          Object.entries(latestChanges).forEach(([key, value]) => {
            if (key.includes('.')) {
              // Handle nested keys
              const parts = key.split('.');
              const mainKey = parts[0];
              const subKey = parts.slice(1).join('.');

              if (!foundItem[mainKey] || typeof foundItem[mainKey] !== 'object') {
                foundItem[mainKey] = {};
              }

              // Set the nested value
              let current = foundItem[mainKey];
              const subParts = subKey.split('.');
              for (let i = 0; i < subParts.length - 1; i++) {
                if (!current[subParts[i]] || typeof current[subParts[i]] !== 'object') {
                  current[subParts[i]] = {};
                }
                current = current[subParts[i]];
              }
              current[subParts[subParts.length - 1]] = value;
            } else {
              // Direct field
              foundItem[key] = value;
            }
          });
        } catch (error) {
          console.error('Error parsing history data:', error);
        }
      }

      // Process secondary gems from foundItem
      const processedSecondaryGems = [];
      const gemIndices = new Set();
      
      // First, find all unique gem indices from the keys
      Object.keys(foundItem).forEach(key => {
        if (key.startsWith('secondary_gem_')) {
          
          // Extract the index from the key (e.g., 'secondary_gem_1' -> 1)
          const match = key.match(/^secondary_gem_(\d+)$/);
          if (match && match[1]) {
            const index = parseInt(match[1], 10);
            gemIndices.add(index);
          }
        }
      });
      
    // Process each gem's properties from the secondaryGems array
      gemIndices.forEach(index => {
        // Get the gem from secondaryGems array (0-based index)
        const gemFromArray = secondaryGems && secondaryGems[index - 1];
        
        if (gemFromArray) {
          // Create a gem object with all properties from the array element
          const gem = { ...gemFromArray };
        Object.entries(foundItem).forEach(([key, value]) => {
          if (key === `secondary_gem_${index}`) {
            // If the value is an object, process its properties
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              // For each property in the value object
              Object.entries(value).forEach(([propKey, propValue]) => {
                // If the property has a 'to' value, use that, otherwise use the value as is
                const valueToUse = propValue && typeof propValue === 'object' && 'to' in propValue
                  ? propValue.to
                  : propValue;
                gem[propKey] = valueToUse;
              });
            } else {
              // If it's a simple value, add it as a property
              gem[key.replace(`secondary_gem_${index}`, '')] = value;
            }
          }
        });
          processedSecondaryGems.push(gem);
        }
      });
      
      // Start with a copy of the original secondaryGems array (or empty array if none)
      const finalSecondaryGems = Array.isArray(secondaryGems) ? [...secondaryGems] : [];
      
      // Update the processed gems in their original positions
      processedSecondaryGems.forEach((gem, index) => {
        // The index in the final array is gemIndices[index] - 1 (since gem indices are 1-based)
        const targetIndex = Array.from(gemIndices)[index] - 1;
        if (targetIndex >= 0) {
          finalSecondaryGems[targetIndex] = gem;
        }
      });
      
      
      // Create a copy of the item with secondary gems
      const itemWithGems = {
        ...foundItem,
        secondaryGems: finalSecondaryGems
      };
      
      // Set the jewelry item data to state
      setItem(itemWithGems);
      // Set baseline for comparison (this represents the current state with all history applied)
      setBaselineItem(JSON.parse(JSON.stringify(itemWithGems))); // Deep clone to avoid reference issues

      // Set initial edited item state for form
      setEditedItem({
        ...foundItem,
        inventory_status: foundItem.inventory_status || 'HOLD',
        short_desc: foundItem.short_desc || '',
        gemstone: foundItem.gemstone || '',
        stone_weight: foundItem.stone_weight || '',
        // Ensure metal-related fields are properly initialized
        precious_metal_type_id: foundItem.precious_metal_type_id || '',
        precious_metal_type: foundItem.precious_metal_type || '',
        non_precious_metal_type_id: foundItem.non_precious_metal_type_id || '',
        non_precious_metal_type: foundItem.non_precious_metal_type || '',
        metal_category_id: foundItem.metal_category_id || '',
        metal_category: foundItem.metal_category || '',
        metal_purity_id: foundItem.metal_purity_id || '',
        metal_purity: foundItem.metal_purity || '',
        purity_value: foundItem.purity_value || 0,
        metal_weight: foundItem.metal_weight || 0,
        est_metal_value: foundItem.est_metal_value || 0,
        spot_price: foundItem.spot_price || 0,
        jewelry_color: foundItem.jewelry_color || '',
        // Include secondary gems in the edited item
        secondaryGems: finalSecondaryGems
      });
  
      // Set initial price based on retail price
      setSellingPrice(foundItem.retail_price || 0);
      
      // Success notification
      setSnackbar({
        open: true,
        message: `Loaded jewelry item ${itemId} with ${finalSecondaryGems.length} secondary gems`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error fetching jewelry item:', error);
      setItem(null); // Reset item state on error
      setSnackbar({
        open: true,
        message: `Failed to load jewelry item: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Customer search function
  const fetchCustomers = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    try {
      const response = await axios.get(`${API_BASE_URL}/customers`, {
        params: { search: searchTerm }
      });
      
      if (response.data) {
        setSearchResults(response.data);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Error searching for customers:', error);
      setSnackbar({
        open: true,
        message: 'Failed to search for customers',
        severity: 'error'
      });
    }
  };

  // Debounce customer search
  const debouncedSearch = useCallback(
    debounce((term) => fetchCustomers(term), 500),
    []
  );

  // Handlers
  const handleBackToInventory = () => {
    navigate('/inventory');
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    const checkboxValue = event.target.type === 'checkbox' ? event.target.checked : value;
    const finalValue = event.target.type === 'checkbox' ? checkboxValue : value;

    // Map old field names to primary_gem_* fields
    let mappedName = name;
    let primaryGemName = null;
    let secondaryGemName = null;

    // Handle primary gem field mapping
    if (name.startsWith('diamond_')) {
      const gemField = name.replace('diamond_', '');
      primaryGemName = `primary_gem_${gemField}`;

      // Update gemData for diamond fields
      setGemData(prev => ({
        ...prev,
        diamond: {
          ...prev.diamond,
          [gemField]: finalValue
        }
      }));
    } else if (name.startsWith('stone_')) {
      const gemField = name.replace('stone_', '');
      primaryGemName = `primary_gem_${gemField}`;

      // Update gemData for stone fields
      setGemData(prev => ({
        ...prev,
        stone: {
          ...prev.stone,
          [gemField]: finalValue
        }
      }));
    } else if (name.startsWith('secondary_diamond_')) {
      // Map secondary diamond fields to secondary_gem_* fields
      const gemField = name.replace('secondary_diamond_', '');
      secondaryGemName = `secondary_gem_${gemField}`;
    } else if (name.startsWith('secondary_stone_')) {
      // Map secondary stone fields to secondary_gem_* fields
      const gemField = name.replace('secondary_stone_', '');
      secondaryGemName = `secondary_gem_${gemField}`;
    }

    // Check if this is a secondary gem field with index (e.g., secondary_gem_weight_0)
    const secondaryGemMatch = name.match(/^secondary_gem_(\w+)_(\d+)$/);

    if (secondaryGemMatch) {
      const [, fieldName, gemIndex] = secondaryGemMatch;
      const index = parseInt(gemIndex, 10);

      // Update the secondaryGems array properly
      setEditedItem(prev => {
        const updatedGems = [...(prev.secondaryGems || [])];
        if (updatedGems[index]) {
          updatedGems[index] = {
            ...updatedGems[index],
            [`secondary_gem_${fieldName}`]: finalValue
          };
        }
        return {
          ...prev,
          secondaryGems: updatedGems
        };
      });

      setItem(prev => {
        const updatedGems = [...(prev.secondaryGems || [])];
        if (updatedGems[index]) {
          updatedGems[index] = {
            ...updatedGems[index],
            [`secondary_gem_${fieldName}`]: finalValue
          };
        }
        return {
          ...prev,
          secondaryGems: updatedGems
        };
      });
    } else {
      // Update editedItem state with the new value (for non-secondary-gem fields)
      setEditedItem(prev => ({
        ...prev,
        [name]: finalValue,
        ...(primaryGemName ? { [primaryGemName]: finalValue } : {}),
        ...(secondaryGemName ? { [secondaryGemName]: finalValue } : {})
      }));

      // If we're auto-saving changes immediately, also update the item state
      setItem(prev => ({
        ...prev,
        [name]: finalValue,
        ...(primaryGemName ? { [primaryGemName]: finalValue } : {}),
        ...(secondaryGemName ? { [secondaryGemName]: finalValue } : {})
      }));
    }
  };


  const handleCustomerSelection = (customer) => {
    setSelectedCustomer(customer);
    setSelectedCustomerId(customer.id);
    setSearchQuery(`${customer.first_name} ${customer.last_name}`);
    setShowSearchResults(false);
  };


  const handleCancel = () => {
    // Reset form to original item data
    setEditedItem({
      ...item,
      inventory_status: item.inventory_status || 'HOLD',
      short_desc: item.short_desc || '',
      dimensions: item.dimensions || '',
      gemstone: item.gemstone || '',
      stone_weight: item.stone_weight || '',
      serial_number: item.serial_number || '',
      age_year: item.age_year || '',
    });
    
    // Exit edit mode
    setIsEditing(false);
    
    // Notification
    setSnackbar({
      open: true,
      message: 'Editing cancelled',
      severity: 'info'
    });
  };

  // Handle double-click to enable inline editing
  const handleDoubleClick = (fieldName) => {
    setEditingField(fieldName);
    // Focus the input after a small delay to ensure the component has rendered
    setTimeout(() => {
      if (inlineInputRef.current) {
        inlineInputRef.current.focus();
      }
    }, 10);
  };

  // Handle saving the inline edit when pressing Enter or focus out
  const handleInlineEditComplete = (event, fieldName) => {
    // Check if event is null or if it's a valid event with key='Enter' or type='blur'
    if (!event || event.key === 'Enter' || event.type === 'blur') {
      setEditingField(null);
    }
  };

  // Render field based on edit state
  const renderEditableField = (fieldName, displayValue, editComponent) => {
    return editingField === fieldName ? (
      editComponent
    ) : (
      <Box 
        sx={{ 
          p: 1, 
          cursor: 'pointer', 
          border: '1px dashed transparent',
          '&:hover': { border: '1px dashed #ccc', borderRadius: '4px' },
          minHeight: '32px',
          display: 'flex',
          alignItems: 'center'
        }} 
        onDoubleClick={() => handleDoubleClick(fieldName)}
      >
        {displayValue}
      </Box>
    );
  };

  const calculateTotals = () => {
    let discountedPrice = sellingPrice;
      
    // Apply discount
    if (discountType === 'percentage') {
      discountedPrice = sellingPrice * (1 - discount / 100);
    } else {
      discountedPrice = sellingPrice - discount;
    }
      
    // Ensure price doesn't go negative
    discountedPrice = Math.max(0, discountedPrice);
      
    // Calculate tax
    const taxAmount = discountedPrice * tax.rate;
    setTax(prev => ({ ...prev, amount: taxAmount }));
      
    // Set total amount
    setTotalAmount(discountedPrice + taxAmount);
  };

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'SOLD':
        return 'success.main';
      case 'IN_PROCESS':
        return 'info.main';
      case 'HOLD':
        return 'warning.main';
      case 'RESERVED':
        return 'primary.main';
      case 'SCRAP':
        return 'error.main';
      default:
        return 'text.secondary';
    }
  };

  const [inventoryStatuses, setInventoryStatuses] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(true);
  const [statusError, setStatusError] = useState(null);

  useEffect(() => {
    const fetchInventoryStatuses = async () => {
      try {
        setLoadingStatuses(true);
        const response = await axios.get(`${API_BASE_URL}/inventory-status`);
        if (response.data && response.data.length > 0) {
          setInventoryStatuses(response.data);
        } else {
          setStatusError('No inventory statuses found');
          console.error('No inventory statuses returned from API');
        }
      } catch (error) {
        console.error('Error fetching inventory statuses:', error);
        setStatusError('Failed to load statuses. Please try again later.');
      } finally {
        setLoadingStatuses(false);
      }
    };

    fetchInventoryStatuses();
  }, []);

  // Render loading state
  if (loading || loadingStatuses) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Show error if statuses failed to load
  if (statusError) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {statusError}
        </Alert>
      </Container>
    );
  }

  // Render error state if no item
  if (!item) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          gap: 3 
        }}>
          <Typography variant="h6" color="error">
            No jewelry item selected. Please select an item from the inventory.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToInventory}
          >
            Back to Inventory
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Gem Estimator Dialog */}
      <Dialog
        open={gemDialogOpen}
        onClose={() => setGemDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { maxHeight: '90vh' } }}
      >
        <DialogTitle>Edit Gemstone Details</DialogTitle>
        <DialogContent dividers>
          {gemDialogOpen && (
            <GemEstimator
              initialData={{
                ...item,
                // Pass secondary gems if they exist
                secondaryGems: item.secondaryGems || []
              }}
              editMode={true}
              onSave={(updatedData) => {
                // Handle saving gem data
                setGemDialogOpen(false);
              }}
              onCancel={() => setGemDialogOpen(false)}
              onSecondaryGemsChange={(secondaryGems) => {
                setItem(prev => ({
                  ...prev,
                  secondaryGems
                }));
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMetalCancel}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Combined Jewelry Item Dialog */}
      <Dialog
        open={combinedDialogOpen}
        onClose={handleCombinedCancel}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { maxHeight: '90vh' } }}
      >
        <DialogTitle>Edit Jewelry Item</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={5} md={4}>
              {combinedDialogOpen && (
                <MetalEstimator 
                  key={`metal-${combinedDialogOpen}`}
                  initialData={metalFormState && Object.keys(metalFormState).length > 0 ? metalFormState : {
                    precious_metal_type: item?.precious_metal_type || '',
                    metal_weight: item?.metal_weight || 0,
                    non_precious_metal_type: item?.non_precious_metal_type || '',
                    metal_purity: item?.metal_purity || '',
                    purity_value: item?.purity_value || 0,
                    metal_spot_price: item?.metal_spot_price || 0,
                    estimated_value: item?.est_metal_value || 0,
                    color: item?.jewelry_color || '',
                    metal_category: item?.category || ''
                  }}
                  hideButtons={true}
                  setMetalFormState={setMetalFormState}
                />
              )}
            </Grid>
            <Grid item xs={12} sm={7} md={8}>
              {combinedDialogOpen && (
                <GemEstimator
                  key={`gem-${combinedDialogOpen}`}
                  initialData={{
                    ...item,
                    secondaryGems: (item.secondaryGems || []).map(gem => ({
                      ...gem,
                      secondary_gem_value: gem.secondary_gem_value !== null ? gem.secondary_gem_value : 0
                    }))
                  }}
                  hideButtons={true}
                  editMode={true}
                  setGemFormState={setGemFormState}
                  onSecondaryGemsChange={(secondaryGems) => {
                    setGemFormState(prev => ({
                      ...prev,
                      secondaryGems
                    }));
                    setItem(prev => ({
                      ...prev,
                      secondaryGems
                    }));
                  }}
                />
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCombinedCancel} startIcon={<CancelIcon />}>Cancel</Button>
          <Button onClick={handleCombinedSave} variant="contained" color="primary" startIcon={<SaveIcon />}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      <Paper elevation={2} sx={{ p: 3 }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
          {/* Back to Inventory Button - Right Aligned */}
          <Button
            variant="contained"
            color="primary"
            onClick={handleBackToInventory}
            startIcon={<ArrowBackIcon />}
          >
            Back to Inventory
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Item Details Section */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Item Details
              </Typography>
              
              {/* Item Image and Basic Info */}
              <Box sx={{ display: 'flex', mb: 3 }}>
                {/* Item Image */}
                <Box sx={{ width: 150, mr: 3 }}>
                  <img 
                    src={getImageUrl(item)}
                    alt={item.short_desc || 'Jewelry item'}
                    style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                  />
                </Box>
                
                {/* Basic Item Info */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {item.short_desc || 'Jewelry Item'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    ID: {item.item_id}
                  </Typography>
                  
                  {/* Inventory Status Dropdown */}
                  <FormControl size="small" sx={{ minWidth: 150, mt: 0.5 }}>
                    <Select
                      value={editingField === 'inventory_status' ? (editedItem.inventory_status || 'HOLD') : (item.inventory_status || 'HOLD')}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        // Update local state immediately for better UX
                        setEditedItem(prev => ({
                          ...prev,
                          inventory_status: newStatus
                        }));
                        // Update the server  
                      //  await updateInventoryStatus(newStatus);
                      }}
                      onFocus={() => setEditingField('inventory_status')}
                      onBlur={() => setEditingField(null)}
                      displayEmpty
                      inputProps={{ 'aria-label': 'Inventory Status' }}
                      sx={{
                        height: 32,
                        '& .MuiSelect-select': {
                          py: 0.5,
                          fontSize: '0.8125rem',
                          display: 'flex',
                          alignItems: 'center'
                        }
                      }}
                    >
                      {inventoryStatuses.map((status) => (
                        <MenuItem key={status.status_code} value={status.status_code}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box 
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: getStatusColor(status.status_code)
                              }}
                            />
                            {status.status_name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {item.certification && (
                    <Chip 
                      label={`Certified: ${item.certification}`}
                      color="info"
                      size="small"
                    />
                  )}
                  </Box>
                </Box>
              
              {/* Editable Fields in Grid Layout */}
              <Grid container spacing={2}>
                
                {/* Description - Double-click to edit */}
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">
                    Description *
                  </Typography>
                  {renderEditableField(
                    'long_desc',
                    item.long_desc || 'No description available',
                    <TextField
                      fullWidth
                      size="small"
                      name="long_desc"
                      value={editedItem.long_desc || ''}
                      onChange={handleInputChange}
                      inputRef={(el) => {
                        if (editingField === 'long_desc') inlineInputRef.current = el;
                      }}
                      onKeyDown={(e) => handleInlineEditComplete(e, 'long_desc')}
                      onBlur={(e) => handleInlineEditComplete(e, 'long_desc')}
                      autoFocus
                      margin="dense"
                    />
                  )}
                </Grid>
                
                {/* Metal Type with Edit Button and Double-Click Editing */}
                                {/* Precious Metal Type - Double-click to edit */}
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Precious Metal Type
                  </Typography>
                  {renderEditableField(
                    'precious_metal_type',
                    item.precious_metal_type || 'N/A',
                    <FormControl fullWidth>
                      <Select
                        name="precious_metal_type"
                        value={editingField === 'precious_metal_type' ? 
                          (editedItem.precious_metal_type_id || '') : 
                          (item.precious_metal_type_id || '')}
                        onChange={(e) => {
                          const selectedType = preciousMetalTypes.find(type => type.id.toString() === e.target.value.toString());
                          // Update both editedItem and item states to ensure display persists
                          const typeValue = selectedType ? selectedType.type : '';
                          setEditedItem(prev => ({
                            ...prev,
                            precious_metal_type_id: e.target.value,
                            precious_metal_type: typeValue,
                            metal_type: typeValue
                          }));
                          
                          // Also update the main item state so display persists after edit
                          setItem(prev => ({
                            ...prev,
                            precious_metal_type_id: e.target.value,
                            precious_metal_type: typeValue                          
                          }));
                          
                          // Fetch purities for the selected metal type
                          fetchPurities(e.target.value);
                        }}
                        inputRef={(el) => {
                          if (editingField === 'precious_metal_type') inlineInputRef.current = el;
                        }}
                        onKeyDown={(e) => handleInlineEditComplete(e, 'precious_metal_type')}
                        onBlur={(e) => handleInlineEditComplete(e, 'precious_metal_type')}
                        autoFocus
                      >
                       {preciousMetalTypes.map((type) => (
                          <MenuItem key={type.id} value={type.id}>
                            {type.type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Grid>
                
                {/* Non-Precious Metal Type - Double-click to edit */}
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Non-Precious Metal Type
                  </Typography>
                  {renderEditableField(
                    'non_precious_metal_type',
                    item.non_precious_metal_type || 'N/A',
                    <FormControl fullWidth>
                      <Select
                        name="non_precious_metal_type"
                        value={editingField === 'non_precious_metal_type' ? 
                          (editedItem.non_precious_metal_type_id || '') : 
                          (item.non_precious_metal_type_id || '')}
                        onChange={(e) => {
                          const selectedType = nonPreciousMetalTypes.find(type => type.id.toString() === e.target.value.toString());
                          // Update both editedItem and item states to ensure display persists
                          const typeValue = selectedType ? selectedType.type : '';
                          setEditedItem(prev => ({
                            ...prev,
                            non_precious_metal_type_id: e.target.value,
                            non_precious_metal_type: typeValue
                          }));
                          
                          // Also update the main item state so display persists after edit
                          setItem(prev => ({
                            ...prev,
                            non_precious_metal_type_id: e.target.value,
                            non_precious_metal_type: typeValue
                          }));
                        }}
                        inputRef={(el) => {
                          if (editingField === 'non_precious_metal_type') inlineInputRef.current = el;
                        }}
                        onKeyDown={(e) => handleInlineEditComplete(e, 'non_precious_metal_type')}
                        onBlur={(e) => handleInlineEditComplete(e, 'non_precious_metal_type')}
                        autoFocus
                      >
                         {nonPreciousMetalTypes.map((type) => (
                          <MenuItem key={type.id} value={type.id}>
                            {type.type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Grid>
                                
                {/* Metal Weight - Double-click to edit */}
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Metal Weight
                  </Typography>
                  {renderEditableField(
                    'metal_weight',
                    `${item.metal_weight || ''}g`,
                    <TextField
                      fullWidth
                      size="small"
                      name="metal_weight"
                      type="number"
                      value={editingField === 'metal_weight' ? editedItem.metal_weight || '' : item.metal_weight || ''}
                      onChange={(e) => {
                        setEditedItem(prev => ({
                          ...prev,
                          metal_weight: e.target.value
                        }));
                         // Also update the main item state so display persists after edit
                         setItem(prev => ({
                          ...prev,
                          metal_weight: e.target.value
                        }));
                      }}
                      margin="dense"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">g</InputAdornment>
                      }}
                      inputRef={(el) => {
                        if (editingField === 'metal_weight') inlineInputRef.current = el;
                      }}
                      onKeyDown={(e) => handleInlineEditComplete(e, 'metal_weight')}
                      onBlur={(e) => handleInlineEditComplete(e, 'metal_weight')}
                      autoFocus
                    />
                  )}
                </Grid>

                {/* Purity and Purity Value - Side by side with auto-update */}
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">
                      Purity
                    </Typography>
                    {renderEditableField(
                      'metal_purity',
                      item.metal_purity || 'N/A',
                      <FormControl fullWidth size="small" margin="dense">
                        <Select
                          name="metal_purity"
                          value={editingField === 'metal_purity' ? 
                            (editedItem.metal_purity_id || '') : 
                            (item.metal_purity_id || '')}
                          onChange={(e) => {
                            // Find the selected purity by ID and extract all its properties
                            const selectedPurity = metalPurities.find(p => p.id === e.target.value);
                            if (selectedPurity) {
                              // Update both purity and purity value together
                              setEditedItem(prev => ({
                                ...prev,
                                metal_purity_id: e.target.value,
                                metal_purity: selectedPurity.purity,
                                purity_value: selectedPurity.value || 0
                              }));
                              
                              // Immediately update the item state to show the updated value
                              setItem(prev => ({
                                ...prev,
                                metal_purity_id: e.target.value,
                                metal_purity: selectedPurity.purity,
                                purity_value: selectedPurity.value || 0
                              }));
                            }
                            
                            // If we're done editing the purity, complete the edit
                            handleInlineEditComplete({ key: 'Enter' }, 'metal_purity');
                          }}
                          inputRef={(el) => {
                            if (editingField === 'metal_purity') inlineInputRef.current = el;
                          }}
                          onKeyDown={(e) => handleInlineEditComplete(e, 'metal_purity')}
                          onBlur={(e) => handleInlineEditComplete(e, 'metal_purity')}
                          autoFocus
                        >
                          {metalPurities.map((purity) => (
                            <MenuItem key={purity.id} value={purity.id}>
                              {purity.purity || purity.value}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">
                      Purity Value
                    </Typography>
                    {renderEditableField(
                      'purity_value',
                      item.purity_value || '0',
                      <TextField
                        fullWidth
                        size="small"
                        name="purity_value"
                        type="number"
                        value={editingField === 'purity_value' ? editedItem.purity_value || 0 : item.purity_value || 0}
                        onChange={(e) => {
                          setEditedItem(prev => ({
                            ...prev,
                            purity_value: parseFloat(e.target.value) || 0
                          }));
                          setItem(prev => ({
                            ...prev,
                            purity_value: parseFloat(e.target.value) || 0
                          }));
                        }}
                        margin="dense"
                        inputRef={(el) => {
                          if (editingField === 'purity_value') inlineInputRef.current = el;
                        }}
                        onKeyDown={(e) => handleInlineEditComplete(e, 'purity_value')}
                        onBlur={(e) => handleInlineEditComplete(e, 'purity_value')}
                        autoFocus
                        disabled={editingField !== 'purity_value'}
                      />
                    )}
                  </Grid>
                
                {/* Metal Category - Double-click to edit */}
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Metal Category
                  </Typography>
                  {renderEditableField(
                    'metal_category',
                    item.category || 'N/A',
                    <FormControl fullWidth>
                      <Select
                        name="metal_category"
                        value={editingField === 'metal_category' ? 
                          (editedItem.metal_category_id || '') : 
                          (item.metal_category_id || '')}
                        onChange={(e) => {
                          const selectedCategory = metalCategories.find(cat => cat.id.toString() === e.target.value.toString());
                          // Update both editedItem and item states to ensure display persists
                          const categoryValue = selectedCategory ? selectedCategory.category : '';
                          setEditedItem(prev => ({
                            ...prev,
                            metal_category_id: e.target.value,
                            metal_category: categoryValue
                          }));
                          setItem(prev => ({
                            ...prev,
                            metal_category_id: e.target.value,
                            metal_category: categoryValue
                          }));
                          
                        }}
                        inputRef={(el) => {
                          if (editingField === 'metal_category') inlineInputRef.current = el;
                        }}
                        onKeyDown={(e) => handleInlineEditComplete(e, 'metal_category')}
                        onBlur={(e) => handleInlineEditComplete(e, 'metal_category')}
                        autoFocus
                      >
                        <MenuItem value="" style={{ color: '#000000' }}>Select a metal category</MenuItem>
                        {metalCategories && metalCategories.length > 0 ? metalCategories.map((category) => (
                          <MenuItem key={category.id} value={category.id.toString()} style={{ color: '#000000' }}>
                            {category.category}
                          </MenuItem>
                        )) : (
                          <MenuItem disabled style={{ color: '#666666' }}>No metal categories available</MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  )}
                </Grid>
                
                {/* Spot Price - Double-click to edit */}
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Spot Price
                  </Typography>
                  {renderEditableField(
                    'spot_price',
                    `$${formatPrice(item.metal_spot_price || 0)}`,
                    <TextField
                      fullWidth
                      size="small"
                      name="spot_price"
                      type="number"
                      value={editingField === 'spot_price' ? editedItem.spot_price || 0 : item.spot_price || 0}
                      onChange={(e) => {
                        setEditedItem(prev => ({
                          ...prev,
                          spot_price: parseFloat(e.target.value) || 0
                        }));
                        
                        // Also update the main item state so display persists after edit
                        setItem(prev => ({
                          ...prev,
                          spot_price: parseFloat(e.target.value) || 0
                        }));
                      }}
                      margin="dense"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }}
                      inputRef={(el) => {
                        if (editingField === 'spot_price') inlineInputRef.current = el;
                      }}
                      onKeyDown={(e) => handleInlineEditComplete(e, 'spot_price')}
                      onBlur={(e) => handleInlineEditComplete(e, 'spot_price')}
                      autoFocus
                    />
                  )}
                </Grid>

                  {/* Jewelry Color - Double-click to edit */}
                  <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Jewelry Color
                  </Typography>
                  {renderEditableField(
                    'jewelry_color',
                    item.precious_metal_type?.toLowerCase().includes('gold') ? (item.jewelry_color || 'N/A') : 'N/A',
                    <FormControl fullWidth>
                      <Select
                        name="jewelry_color"
                        value={editingField === 'jewelry_color' ? 
                          (editedItem.metal_color_id || '') : 
                          (item.metal_color_id || '')}
                        onChange={(e) => {
                          const selectedColor = metalColors.find(color => color.id.toString() === e.target.value.toString());
                          // Update both editedItem and item states to ensure display persists
                          const colorValue = selectedColor ? selectedColor.color : '';
                          setEditedItem(prev => ({
                            ...prev,
                            metal_color_id: e.target.value,
                            jewelry_color: colorValue
                          }));
                          
                          // Also update the main item state so display persists after edit
                          setItem(prev => ({
                            ...prev,
                            metal_color_id: e.target.value,
                            jewelry_color: colorValue
                          }));
                        }}
                        inputRef={(el) => {
                          if (editingField === 'jewelry_color') inlineInputRef.current = el;
                        }}
                        onKeyDown={(e) => handleInlineEditComplete(e, 'jewelry_color')}
                        onBlur={(e) => handleInlineEditComplete(e, 'jewelry_color')}
                        autoFocus
                      >
                        {item.precious_metal_type?.toLowerCase().includes('gold') ? (
                          <MenuItem value="" style={{ color: '#000000' }}>Select a jewelry color</MenuItem>
                        ) : (
                          <MenuItem value="" style={{ color: '#000000' }} disabled>N/A (Only available for gold)</MenuItem>
                        )}
                        {metalColors && metalColors.length > 0 ? metalColors.map((color) => (
                          <MenuItem key={color.id} value={color.id.toString()} style={{ color: '#000000' }}>
                            {color.color}
                          </MenuItem>
                        )) : (
                          <MenuItem disabled style={{ color: '#666666' }}>No colors available</MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  )}
                </Grid>
                
                {/* Estimated Metal Value - Double-click to edit */}
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Est. Metal Value
                  </Typography>
                  {renderEditableField(
                    'est_metal_value',
                    `$${formatPrice(item.est_metal_value || 0)}`,
                    <TextField
                      fullWidth
                      size="small"
                      name="est_metal_value"
                      type="number"
                      value={editingField === 'est_metal_value' ? editedItem.est_metal_value || 0 : item.est_metal_value || 0}
                      onChange={(e) => {
                        setEditedItem(prev => ({
                          ...prev,
                          est_metal_value: e.target.value || 0
                        }));
                        
                        // Also update the main item state so display persists after edit
                        setItem(prev => ({
                          ...prev,
                          est_metal_value: e.target.value || 0
                        }));
                      }}
                      margin="dense"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }}
                      inputRef={(el) => {
                        if (editingField === 'est_metal_value') inlineInputRef.current = el;
                      }}
                      onKeyDown={(e) => handleInlineEditComplete(e, 'est_metal_value')}
                      onBlur={(e) => handleInlineEditComplete(e, 'est_metal_value')}
                      autoFocus
                    />
                  )}
                </Grid>



                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={handleEditJewelryItem}
                    >
                      Edit Jewelry Item
                    </Button>
                  </Box>
                </Grid>
                
                {/* Gemstone Details with Edit Button */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="medium">
                      Primary Gem Details
                    </Typography>
                  </Box>
                    {/* Tab selector for Diamond/Stone */}
                    <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs 
                      value={gemTab} 
                      onChange={(e, newValue) => {
                        // Don't allow switching to stone when primary gem is diamond
                        if (item?.primary_gem_category?.toLowerCase() === 'diamond' && newValue === 'stone') {
                          return; // Prevent switching
                        }
                        setGemTab(newValue);
                      }}
                      aria-label="gem type tabs"
                    >
                      <Tab 
                        label="Diamond" 
                        value="diamond" 
                        disabled={gemTab === 'stone' && item?.primary_gem_category}
                      />
                      <Tab 
                        label="Stone" 
                        value="stone" 
                        sx={{
                          cursor: item?.primary_gem_category?.toLowerCase() === 'diamond' ? 'not-allowed' : 'pointer'
                        }}
                      />
                    </Tabs>
                  </Box>
                  
                  {/* Conditional rendering based on gemTab */}
                  {gemTab === 'diamond' ? (
                    // Diamond fields
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Diamond Shape
                        </Typography>
                        {renderEditableField(
                          'primary_gem_shape',
                          item.primary_gem_shape || 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                              name="primary_gem_shape"
                              value={editedItem?.primary_gem_shape || item.primary_gem_shape || ''}
                              onChange={handleInputChange}
                              onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_shape')}
                              onClose={() => handleInlineEditComplete(null, 'primary_gem_shape')}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                if (editingField === 'primary_gem_shape') inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select a shape
                              </MenuItem>
                              {diamondShapes.map((shape) => (
                                <MenuItem 
                                  key={shape.id} 
                                  value={shape.name}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {shape.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Diamond Size
                        </Typography>
                        {renderEditableField(
                          'primary_gem_size',
                          item.primary_gem_size ? item.primary_gem_size : 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                              name="primary_gem_size"
                              value={editedItem?.primary_gem_size || item.primary_gem_size || ''}
                              onChange={handleInputChange}
                              onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_size')}
                              onClose={() => handleInlineEditComplete(null, 'primary_gem_size')}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                if (editingField === 'primary_gem_size') inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select diamond size
                              </MenuItem>
                              {diamondSizes.map((size) => (
                                <MenuItem 
                                  key={size.id} 
                                  value={size.size}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {size.size}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Diamond Weight
                        </Typography>
                        {renderEditableField(
                          'primary_gem_weight',
                          item.primary_gem_weight ? `${item.primary_gem_weight} ct` : 'N/A',
                          diamondSizes.length > 0 ? (

                            <FormControl fullWidth size="small" margin="dense">
                              <Select
                                name="primary_gem_weight"
                                value={editedItem?.primary_gem_weight || item.primary_gem_weight || ''}
                                onChange={handleInputChange}
                                onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_weight')}
                                onClose={() => handleInlineEditComplete(null, 'primary_gem_weight')}
                                MenuProps={{ style: { maxHeight: 300 } }}
                                style={{ backgroundColor: '#fff', color: '#000' }}
                                inputRef={(el) => {
                                  if (editingField === 'primary_gem_weight') inlineInputRef.current = el;
                                }}
                                displayEmpty
                              >
                                <MenuItem value="" disabled>
                                  Select carat weight
                                </MenuItem>
                                {diamondSizes.map((size) => (
                                  <MenuItem 
                                    key={size.id} 
                                    value={size.weight}
                                    style={{ backgroundColor: '#fff', color: '#000' }}
                                  >
                                    {size.weight}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          ) : (
                            <TextField
                              fullWidth
                              size="small"
                              name="diamond_weight"
                              type="number"
                              value={editedItem?.diamond_weight || item.diamond_weight || ''}
                              onChange={handleInputChange}
                              inputRef={(el) => {
                                if (editingField === 'diamond_weight') inlineInputRef.current = el;
                              }}
                              onKeyDown={(e) => handleInlineEditComplete(e, 'diamond_weight')}
                              onBlur={(e) => handleInlineEditComplete(e, 'diamond_weight')}
                              margin="dense"
                              inputProps={{ step: 0.01 }}
                            />
                          )
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Color
                        </Typography>
                        {renderEditableField(
                          'primary_gem_color',
                          item.primary_gem_color || 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                              name="primary_gem_color"
                              value={editedItem?.primary_gem_color || item.primary_gem_color || ''}
                              onChange={handleInputChange}
                              onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_color')}
                              onClose={() => handleInlineEditComplete(null, 'primary_gem_color')}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                if (editingField === 'primary_gem_color') inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select a color
                              </MenuItem>
                              {diamondColors.map((color) => (
                                <MenuItem 
                                  key={color.id} 
                                  value={color.name}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {color.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Clarity
                        </Typography>
                        {renderEditableField(
                          'primary_gem_clarity',
                          item.primary_gem_clarity || 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                              name="primary_gem_clarity"
                              value={editedItem?.primary_gem_clarity || item.primary_gem_clarity || ''}
                              onChange={handleInputChange}
                              onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_clarity')}
                              onClose={() => handleInlineEditComplete(null, 'primary_gem_clarity')}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                if (editingField === 'primary_gem_clarity') inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select clarity
                              </MenuItem>
                              {diamondClarity.map((clarity) => (
                                <MenuItem 
                                  key={clarity.id} 
                                  value={clarity.name}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {clarity.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Quantity
                        </Typography>
                        {renderEditableField(
                          'primary_gem_quantity',
                          item.primary_gem_quantity || '1',
                          <TextField
                            fullWidth
                            size="small"
                            name="primary_gem_quantity"
                            type="number"
                            value={editedItem?.primary_gem_quantity || item.primary_gem_quantity || '1'}
                            onChange={handleInputChange}
                            inputProps={{ min: 1, step: 1 }}
                            onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_quantity')}
                            inputRef={(el) => {
                              if (editingField === 'primary_gem_quantity') inlineInputRef.current = el;
                            }}
                            margin="dense"
                          />
                        )}
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Cut
                        </Typography>
                        {renderEditableField(
                          'primary_gem_cut',
                          item.primary_gem_cut || 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                              name="primary_gem_cut"
                              value={editedItem?.primary_gem_cut || item.primary_gem_cut || ''}
                              onChange={handleInputChange}
                              onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_cut')}
                              onClose={() => handleInlineEditComplete(null, 'primary_gem_cut')}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                if (editingField === 'primary_gem_cut') inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select cut
                              </MenuItem>
                              {diamondCuts.map((cut) => (
                                <MenuItem 
                                  key={cut.id} 
                                  value={cut.name}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {cut.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Lab Grown
                        </Typography>
                        {renderEditableField(
                          'primary_gem_lab_grown',
                          item.primary_gem_lab_grown ? 'Yes' : 'No',
                          <FormControl fullWidth size="small">
                            <Select
                              name="primary_gem_lab_grown"
                              value={editedItem?.primary_gem_lab_grown !== undefined ? editedItem.primary_gem_lab_grown : (item.primary_gem_lab_grown ? true : false)}
                              onChange={(e) => {
                                setEditedItem(prev => ({
                                  ...prev,
                                  primary_gem_lab_grown: e.target.value
                                }));
                                setItem(prev => ({
                                  ...prev,
                                  primary_gem_lab_grown: e.target.value
                                }));
                              }}
                              inputRef={(el) => {
                                if (editingField === 'primary_gem_lab_grown') inlineInputRef.current = el;
                              }}
                              onKeyDown={(e) => handleInlineEditComplete(e, 'primary_gem_lab_grown')}
                              onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_lab_grown')}
                            >
                              <MenuItem value={true}>Yes</MenuItem>
                              <MenuItem value={false}>No</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      </Grid>

                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Estimated Value
                        </Typography>
                        {renderEditableField(
                          'primary_gem_value',
                          item.primary_gem_value ? `$${item.primary_gem_value.toLocaleString()}` : 'N/A',
                          <TextField
                            fullWidth
                            size="small"
                            name="primary_gem_value"
                            type="number"
                            value={editedItem?.primary_gem_value || item.primary_gem_value || ''}
                            onChange={handleInputChange}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_value')}
                            inputRef={(el) => {
                              if (editingField === 'primary_gem_value') inlineInputRef.current = el;
                            }}
                            margin="dense"
                          />
                        )}
                      </Grid>
                    </Grid>
                  ) : (
                    // Stone fields
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Stone Type
                        </Typography>
                        {renderEditableField(
                          'primary_gem_type',
                          item.primary_gem_type || 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                              name="primary_gem_type"
                              value={editedItem?.primary_gem_type || item.primary_gem_type || ''}
                              onChange={handleInputChange}
                              onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_type')}
                              onClose={() => handleInlineEditComplete(null, 'primary_gem_type')}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                if (editingField === 'primary_gem_type') inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select stone type
                              </MenuItem>
                              {stoneTypes.map((type) => (
                                <MenuItem 
                                  key={type.id} 
                                  value={type.type}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {type.type}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Stone Shape
                        </Typography>
                        {renderEditableField(
                          'primary_gem_shape',
                          item.primary_gem_shape || 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                              name="primary_gem_shape"
                              value={editedItem?.primary_gem_shape || item.primary_gem_shape || ''}
                              onChange={handleInputChange}
                              onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_shape')}
                              onClose={() => handleInlineEditComplete(null, 'primary_gem_shape')}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                if (editingField === 'primary_gem_shape') inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select stone shape
                              </MenuItem>
                              {stoneShapes.map((shape) => (
                                <MenuItem 
                                  key={shape.id} 
                                  value={shape.name}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {shape.name}
                                </MenuItem>
                              ))}
                              {/* Fallback to diamond shapes if no stone shapes available */}
                              {(!stoneShapes || stoneShapes.length === 0) && diamondShapes.map((shape) => (
                                <MenuItem 
                                  key={shape.id} 
                                  value={shape.name}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {shape.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Stone Color
                        </Typography>
                        {renderEditableField(
                          'primary_gem_color',
                          item.primary_gem_color || 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                              name="primary_gem_color"
                              value={editedItem?.primary_gem_color || item.primary_gem_color || ''}
                              onChange={handleInputChange}
                              onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_color')}
                              onClose={() => handleInlineEditComplete(null, 'primary_gem_color')}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                if (editingField === 'primary_gem_color') inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select stone color
                              </MenuItem>
                              {stoneColors.map((color) => (
                                <MenuItem 
                                  key={color.id} 
                                  value={color.color}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {color.color}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}

                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Stone Weight
                        </Typography>
                        {renderEditableField(
                          'primary_gem_weight',
                          item.primary_gem_weight ? `${item.primary_gem_weight} ct` : 'N/A',
                          <TextField
                            fullWidth
                            size="small"
                            name="primary_gem_weight"
                            value={editedItem?.primary_gem_weight || item.primary_gem_weight || ''}
                            onChange={handleInputChange}
                            inputRef={(el) => {
                              if (editingField === 'primary_gem_weight') inlineInputRef.current = el;
                            }}
                            onKeyDown={(e) => handleInlineEditComplete(e, 'primary_gem_weight')}
                            onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_weight')}
                            type="number"
                            inputProps={{ step: 0.01 }}
                            margin="dense"
                          />
                        )}</Grid>
                        <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Quantity
                        </Typography>
                        {renderEditableField(
                          'primary_gem_quantity',
                          item.primary_gem_quantity || '1',
                          <TextField
                            fullWidth
                            size="small"
                            name="primary_gem_quantity"
                            value={editedItem?.primary_gem_quantity || item.primary_gem_quantity || '1'}
                            onChange={handleInputChange}
                            inputRef={(el) => {
                              if (editingField === 'primary_gem_quantity') inlineInputRef.current = el;
                            }}
                            onKeyDown={(e) => handleInlineEditComplete(e, 'primary_gem_quantity')}
                            onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_quantity')}
                            type="number"
                            inputProps={{ min: 1, step: 1 }}
                            margin="dense"
                          />
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Authentic
                        </Typography>
                        {renderEditableField(
                          'primary_gem_authentic',
                          item.primary_gem_authentic ? 'Yes' : 'No',
                          <FormControl fullWidth size="small">
                            <Select
                              name="primary_gem_authentic"
                              value={editedItem?.primary_gem_authentic !== undefined ? editedItem.primary_gem_authentic : (item.primary_gem_authentic ? true : false)}
                              onChange={(e) => {
                                setEditedItem(prev => ({
                                  ...prev,
                                  primary_gem_authentic: e.target.value
                                }));
                                setItem(prev => ({
                                  ...prev,
                                  primary_gem_authentic: e.target.value
                                }));
                              }}
                              inputRef={(el) => {
                                if (editingField === 'primary_gem_authentic') inlineInputRef.current = el;
                              }}
                              onKeyDown={(e) => handleInlineEditComplete(e, 'primary_gem_authentic')}
                              onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_authentic')}
                            >
                              <MenuItem value={true}>Yes</MenuItem>
                              <MenuItem value={false}>No</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Estimated Value
                        </Typography>
                        {renderEditableField(
                          'primary_gem_value',
                          item.primary_gem_value ? `$${parseFloat(item.primary_gem_value).toFixed(2)}` : '$0.00',
                          <TextField
                            fullWidth
                            size="small"
                            name="primary_gem_value"
                            value={editedItem?.primary_gem_value || item.primary_gem_value || ''}
                            onChange={handleInputChange}
                            inputRef={(el) => {
                              if (editingField === 'primary_gem_value') inlineInputRef.current = el;
                            }}
                            onKeyDown={(e) => handleInlineEditComplete(e, 'primary_gem_value')}
                            onBlur={(e) => handleInlineEditComplete(e, 'primary_gem_value')}
                            type="number"
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            inputProps={{ step: 0.01, min: 0 }}
                            margin="dense"
                          />
                        )}
                      </Grid>
                    </Grid>
                  )}
                </Grid>

                {/* Secondary Gems Section */}
                <Grid item xs={12} sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="medium">
                      Secondary Gem Details
                    </Typography>
                  </Box>
                  
                  {/* Tab selector for Secondary Diamond/Stone */}
                  <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs 
                      value={secondaryGemTab} 
                      onChange={(e, newValue) => setSecondaryGemTab(newValue)}
                      aria-label="secondary gem type tabs"
                      variant="scrollable"
                      scrollButtons="auto"
                    >
                      <Tab label="All Gems" value="all" />
                      <Tab 
                        label="Diamonds" 
                        value="diamond" 
                      />
                      <Tab label="Stones" value="stone" />
                    </Tabs>
                  </Box>
                  
                  {/* Always show all secondary gems, but filter by tab if needed */}
                  {item.secondaryGems && item.secondaryGems.length > 0 && item.secondaryGems
                    .filter(gem => {
                      if (secondaryGemTab === 'all') return true;
                      const isDiamond = gem?.secondary_gem_category?.toLowerCase() === 'diamond';
                      return (isDiamond && secondaryGemTab === 'diamond') || 
                             (!isDiamond && secondaryGemTab === 'stone');
                    })
                    .map((gem, index) => {
                    const isDiamond = gem?.secondary_gem_category?.toLowerCase() === 'diamond';
                    
                    return (
                      <React.Fragment key={`secondary-gem-${index}`}>
                        {isDiamond ? (
                          <Grid container spacing={2} sx={{ mt: 2, border: '1px solid #e0e0e0', p: 2, borderRadius: 1 }}>
                            <Grid item xs={12}>
                              <Typography variant="subtitle2">
                                Secondary Diamond {index + 1}
                              </Typography>
                            </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Diamond Shape
                        </Typography>
                        {renderEditableField(
                                `secondary_gem_shape_${index}`,
                                gem?.secondary_gem_shape || 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                                    name={`secondary_gem_shape_${index}`}
                                    value={editedItem?.[`secondary_gem_shape_${index}`] || gem?.secondary_gem_shape || ''}
                              onChange={handleInputChange}
                                    onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_shape_${index}`, index)}
                                    onClose={() => handleInlineEditComplete(null, `secondary_gem_shape_${index}`, index)}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                      if (editingField === `secondary_gem_shape_${index}`) inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select a shape
                              </MenuItem>
                              {diamondShapes.map((shape) => (
                                <MenuItem 
                                  key={shape.id} 
                                  value={shape.name}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {shape.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Diamond Size
                        </Typography>
                        {renderEditableField(
                                `secondary_gem_size_${index}`,
                                gem?.secondary_gem_size ? gem.secondary_gem_size : 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                                    name={`secondary_gem_size_${index}`}
                                    value={editedItem?.secondaryGems?.[index]?.secondary_gem_size || gem?.secondary_gem_size || ''}
                              onChange={handleInputChange}
                                    onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_size_${index}`, index)}
                                    onClose={() => handleInlineEditComplete(null, `secondary_gem_size_${index}`, index)}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                      if (editingField === `secondary_gem_size_${index}`) inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select diamond size
                              </MenuItem>
                              {diamondSizes.map((size) => (
                                <MenuItem 
                                  key={size.id} 
                                  value={size.size}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {size.size}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Diamond Weight
                        </Typography>
                        {renderEditableField(
                                `secondary_gem_weight_${index}`,
                                gem?.secondary_gem_weight ? `${gem.secondary_gem_weight} ct` : 'N/A',
                          diamondSizes.length > 0 ? (
                            <FormControl fullWidth size="small" margin="dense">
                              <Select
                                      name={`secondary_gem_weight_${index}`}
                                      value={editedItem?.secondaryGems?.[index]?.secondary_gem_weight || gem?.secondary_gem_weight || ''}
                                onChange={handleInputChange}
                                      onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_weight_${index}`, index)}
                                      onClose={() => handleInlineEditComplete(null, `secondary_gem_weight_${index}`, index)}
                                MenuProps={{ style: { maxHeight: 300 } }}
                                style={{ backgroundColor: '#fff', color: '#000' }}
                                inputRef={(el) => {
                                        if (editingField === `secondary_gem_weight_${index}`) inlineInputRef.current = el;
                                }}
                                displayEmpty
                              >
                                <MenuItem value="" disabled>
                                  Select carat weight
                                </MenuItem>
                                {diamondSizes.map((size) => (
                                  <MenuItem 
                                    key={size.id} 
                                    value={size.weight}
                                    style={{ backgroundColor: '#fff', color: '#000' }}
                                  >
                                    {size.weight}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          ) : (
                            <TextField
                              fullWidth
                              size="small"
                              name={`secondary_gem_weight_${index}`}
                              type="number"
                              value={editedItem?.[`secondary_gem_weight_${index}`] || gem?.secondary_gem_weight || ''}
                              onChange={handleInputChange}
                              inputRef={(el) => {
                                if (editingField === `secondary_gem_weight_${index}`) inlineInputRef.current = el;
                              }}
                              onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_weight_${index}`, index)}
                              InputProps={{
                                endAdornment: <InputAdornment position="end">ct</InputAdornment>,
                              }}
                            />
                          ))}
                      
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Color
                        </Typography>
                        {renderEditableField(
                          `secondary_gem_color_${index}`,
                          gem?.secondary_gem_color || 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                              name={`secondary_gem_color_${index}`}
                              value={editedItem?.[`secondary_gem_color_${index}`] || gem?.secondary_gem_color || ''}
                              onChange={handleInputChange}
                              onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_color_${index}`, index)}
                              onClose={() => handleInlineEditComplete(null, `secondary_gem_color_${index}`, index)}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                if (editingField === `secondary_gem_color_${index}`) inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select a color
                              </MenuItem>
                              {diamondColors.map((color) => (
                                <MenuItem 
                                  key={color.id} 
                                  value={color.name}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {color.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Clarity
                        </Typography>
                        {renderEditableField(
                          `secondary_gem_clarity_${index}`,
                          gem?.secondary_gem_clarity || 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                              name={`secondary_gem_clarity_${index}`}
                              value={editedItem?.[`secondary_gem_clarity_${index}`] || gem?.secondary_gem_clarity || ''}
                              onChange={handleInputChange}
                              onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_clarity_${index}`, index)}
                              onClose={() => handleInlineEditComplete(null, `secondary_gem_clarity_${index}`, index)}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                if (editingField === `secondary_gem_clarity_${index}`) inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select clarity
                              </MenuItem>
                              {diamondClarity.map((clarity) => (
                                <MenuItem 
                                  key={clarity.id} 
                                  value={clarity.name}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {clarity.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Quantity
                        </Typography>
                        {renderEditableField(
                          `secondary_gem_quantity_${index}`,
                          gem?.secondary_gem_quantity || '1',
                          <TextField
                            fullWidth
                            size="small"
                            name={`secondary_gem_quantity_${index}`}
                            type="number"
                            value={editedItem?.[`secondary_gem_quantity_${index}`] || gem?.secondary_gem_quantity || '1'}
                            onChange={handleInputChange}
                            inputProps={{ min: 1, step: 1 }}
                            onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_quantity_${index}`, index)}
                            inputRef={(el) => {
                              if (editingField === `secondary_gem_quantity_${index}`) inlineInputRef.current = el;
                            }}
                            margin="dense"
                          />
                        )}
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Cut
                        </Typography>
                        {renderEditableField(
                          `secondary_gem_cut_${index}`,
                          gem?.secondary_gem_cut || 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                              name={`secondary_gem_cut_${index}`}
                              value={editedItem?.[`secondary_gem_cut_${index}`] || gem?.secondary_gem_cut || ''}
                              onChange={handleInputChange}
                              onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_cut_${index}`, index)}
                              onClose={() => handleInlineEditComplete(null, `secondary_gem_cut_${index}`, index)}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                if (editingField === `secondary_gem_cut_${index}`) inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select cut
                              </MenuItem>
                              {diamondCuts.map((cut) => (
                                <MenuItem 
                                  key={cut.id} 
                                  value={cut.name}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {cut.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Lab Grown
                        </Typography>
                        {renderEditableField(
                          `secondary_gem_lab_grown_${index}`,
                          gem?.secondary_gem_lab_grown ? 'Yes' : 'No',
                          <FormControl fullWidth size="small">
                            <Select
                              name={`secondary_gem_lab_grown_${index}`}
                              value={editedItem?.secondaryGems?.[index]?.secondary_gem_lab_grown !== undefined ?
                                editedItem.secondaryGems[index].secondary_gem_lab_grown :
                                (gem?.secondary_gem_lab_grown ? true : false)}
                              onChange={(e) => {
                                setEditedItem(prev => ({
                                  ...prev,
                                  [`secondary_gem_lab_grown_${index}`]: e.target.value
                                }));
                                // Update the specific gem in the array
                                const updatedGems = [...item.secondaryGems];
                                updatedGems[index] = {
                                  ...updatedGems[index],
                                  secondary_gem_lab_grown: e.target.value
                                };
                                setItem(prev => ({
                                  ...prev,
                                  secondaryGems: updatedGems
                                }));
                              }}
                              inputRef={(el) => {
                                if (editingField === `secondary_gem_lab_grown_${index}`) inlineInputRef.current = el;
                              }}
                              onKeyDown={(e) => handleInlineEditComplete(e, `secondary_gem_lab_grown_${index}`, index)}
                              onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_lab_grown_${index}`, index)}
                            >
                              <MenuItem value={true}>Yes</MenuItem>
                              <MenuItem value={false}>No</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      </Grid>

                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Estimated Value
                        </Typography>
                        {renderEditableField(
                          `secondary_gem_value_${index}`,
                          gem?.secondary_gem_value ? `$${gem.secondary_gem_value.toLocaleString()}` : 'N/A',
                          <TextField
                            fullWidth
                            size="small"
                            name={`secondary_gem_value_${index}`}
                            type="number"
                            value={editedItem?.[`secondary_gem_value_${index}`] !== undefined ? 
                              editedItem?.secondaryGems?.[index]?.secondary_gem_value : 
                              (gem?.secondary_gem_value || '')}
                            onChange={handleInputChange}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>
                            }}
                            onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_value_${index}`, index)}
                            inputRef={(el) => {
                              if (editingField === `secondary_gem_value_${index}`) {
                                inlineInputRef.current = el;
                              }
                            }}
                            margin="dense"
                          />
                        )}
                      </Grid>
                          </Grid>
                        ) : (
                          <Grid container spacing={2} sx={{ mt: 2, border: '1px solid #e0e0e0', p: 2, borderRadius: 1 }}>
                            <Grid item xs={12}>
                              <Typography variant="subtitle2">
                                Secondary Stone {index + 1}
                          </Typography>
                        </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Stone Type
                        </Typography>
                        {renderEditableField(
                          `secondary_gem_type_${index}`,
                          gem?.secondary_gem_type || 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                              name={`secondary_gem_type_${index}`}
                              value={editedItem?.[`secondary_gem_type_${index}`] || gem?.secondary_gem_type || ''}
                              onChange={handleInputChange}
                              onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_type_${index}`, index)}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                if (editingField === `secondary_gem_type_${index}`) inlineInputRef.current = el;
                              }}
                              displayEmpty>
                              <MenuItem value="" disabled>
                                Select stone type
                              </MenuItem>
                              {stoneTypes.map((type) => (
                                <MenuItem 
                                  key={type.id} 
                                  value={type.type}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {type.type}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Stone Shape
                        </Typography>
                        {renderEditableField(
                          `secondary_gem_shape_${index}`,
                          gem?.secondary_gem_shape || 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                              name={`secondary_gem_shape_${index}`}
                              value={editedItem?.[`secondary_gem_shape_${index}`] || gem?.secondary_gem_shape || ''}
                              onChange={handleInputChange}
                              onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_shape_${index}`, index)}
                              onClose={() => handleInlineEditComplete(null, `secondary_gem_shape_${index}`, index)}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                if (editingField === `secondary_gem_shape_${index}`) inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select stone shape
                              </MenuItem>
                              {stoneShapes.map((shape) => (
                                <MenuItem 
                                  key={shape.id} 
                                  value={shape.name}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {shape.name}
                                </MenuItem>
                              ))}
                              {/* Fallback to diamond shapes if no stone shapes available */}
                              {(!stoneShapes || stoneShapes.length === 0) && diamondShapes.map((shape) => (
                                <MenuItem 
                                  key={shape.id} 
                                  value={shape.name}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {shape.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Stone Color
                        </Typography>
                        {renderEditableField(
                                  `secondary_gem_color_${index}`,
                                  gem?.secondary_gem_color || 'N/A',
                          <FormControl fullWidth size="small" margin="dense">
                            <Select
                                      name={`secondary_gem_color_${index}`}
                                      value={editedItem?.[`secondary_gem_color_${index}`] || gem?.secondary_gem_color || ''}
                              onChange={handleInputChange}
                                      onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_color_${index}`, index)}
                                      onClose={() => handleInlineEditComplete(null, `secondary_gem_color_${index}`, index)}
                              MenuProps={{ style: { maxHeight: 300 } }}
                              style={{ backgroundColor: '#fff', color: '#000' }}
                              inputRef={(el) => {
                                        if (editingField === `secondary_gem_color_${index}`) inlineInputRef.current = el;
                              }}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Select stone color
                              </MenuItem>
                              {stoneColors.map((color) => (
                                <MenuItem 
                                  key={color.id} 
                                  value={color.color}
                                  style={{ backgroundColor: '#fff', color: '#000' }}
                                >
                                  {color.color}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                                )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Stone Weight
                        </Typography>
                        {renderEditableField(
                                  `secondary_gem_weight_${index}`,
                                  gem?.secondary_gem_weight ? `${gem.secondary_gem_weight} ct` : 'N/A',
                          <TextField
                            fullWidth
                            size="small"
                                    name={`secondary_gem_weight_${index}`}
                                    value={editedItem?.[`secondary_gem_weight_${index}`] !== undefined ? 
                                      editedItem?.secondaryGems?.[index]?.secondary_gem_weight : 
                                      (gem?.secondary_gem_weight || '')}
                            onChange={handleInputChange}
                            inputRef={(el) => {
                                      if (editingField === `secondary_gem_weight_${index}`) inlineInputRef.current = el;
                            }}
                                    onKeyDown={(e) => handleInlineEditComplete(e, `secondary_gem_weight_${index}`, index)}
                                    onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_weight_${index}`, index)}
                            type="number"
                            inputProps={{ step: 0.01 }}
                            margin="dense"
                          />
                                )}
                         </Grid>
                        <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Quantity
                        </Typography>
                        {renderEditableField(
                                  `secondary_gem_quantity_${index}`,
                                  gem?.secondary_gem_quantity || '1',
                          <TextField
                            fullWidth
                            size="small"
                                    name={`secondary_gem_quantity_${index}`}
                                    value={editedItem?.[`secondary_gem_quantity_${index}`] !== undefined ? 
                                      editedItem?.secondaryGems?.[index]?.secondary_gem_quantity : 
                                      (gem?.secondary_gem_quantity || '1')}
                            onChange={handleInputChange}
                            inputRef={(el) => {
                                      if (editingField === `secondary_gem_quantity_${index}`) inlineInputRef.current = el;
                            }}
                                    onKeyDown={(e) => handleInlineEditComplete(e, `secondary_gem_quantity_${index}`, index)}
                                    onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_quantity_${index}`, index)}
                            type="number"
                            inputProps={{ min: 1, step: 1 }}
                            margin="dense"
                          />
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Authentic
                        </Typography>
                        {renderEditableField(
                                  `secondary_gem_authentic_${index}`,
                                  gem?.secondary_gem_authentic ? 'Yes' : 'No',
                          <FormControl fullWidth size="small">
                            <Select
                                      name={`secondary_gem_authentic_${index}`}
                                      value={editedItem?.[`secondary_gem_authentic_${index}`] !== undefined ? 
                                        editedItem?.secondaryGems?.[index]?.secondary_gem_authentic : 
                                        (gem?.secondary_gem_authentic || false)}
                              onChange={(e) => {
                                setEditedItem(prev => ({
                                  ...prev,
                                          [`secondary_gem_authentic_${index}`]: e.target.value
                                        }));
                                        // Update the specific gem in the array
                                        const updatedGems = [...item.secondaryGems];
                                        updatedGems[index] = {
                                          ...updatedGems[index],
                                  secondary_gem_authentic: e.target.value
                                        };
                                setItem(prev => ({
                                  ...prev,
                                          secondaryGems: updatedGems
                                }));
                              }}
                              inputRef={(el) => {
                                        if (editingField === `secondary_gem_authentic_${index}`) inlineInputRef.current = el;
                              }}
                                      onKeyDown={(e) => handleInlineEditComplete(e, `secondary_gem_authentic_${index}`, index)}
                                      onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_authentic_${index}`, index)}
                            >
                              <MenuItem value={true}>Yes</MenuItem>
                              <MenuItem value={false}>No</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">
                          Estimated Value
                        </Typography>
                        {renderEditableField(
                                  `secondary_gem_value_${index}`,
                                  gem?.secondary_gem_value ? `$${gem.secondary_gem_value.toLocaleString()}` : 'N/A',
                          <TextField
                            fullWidth
                            size="small"
                                    name={`secondary_gem_value_${index}`}
                                    value={editedItem?.[`secondary_gem_value_${index}`] !== undefined ? 
                                      editedItem?.secondaryGems?.[index]?.secondary_gem_value : 
                                      (gem?.secondary_gem_value || '')}
                            onChange={handleInputChange}
                            inputRef={(el) => {
                                      if (editingField === `secondary_gem_value_${index}`) inlineInputRef.current = el;
                            }}
                                    onKeyDown={(e) => handleInlineEditComplete(e, `secondary_gem_value_${index}`, index)}
                                    onBlur={(e) => handleInlineEditComplete(e, `secondary_gem_value_${index}`, index)}
                            type="number"
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            inputProps={{ step: 0.01, min: 0 }}
                            margin="dense"
                          />
                        )}
                      </Grid>
                            </Grid>
                          )}
                        </React.Fragment>
                      );
                    })
                  }
              </Grid>
              </Grid>
            </Paper>
          </Grid>
    
    {/* Sale Details Section */}
    <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', height: '100%' }}>
              
              {/* Pricing Information */}
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Pricing Information
              </Typography>

              {/* Pricing Table (3x3 format) */}
              <Box sx={{ mb: 3, border: '1px solid #e0e0e0', borderRadius: '4px', p: 2, bgcolor: '#f9f9f9' }}>
                {/* Row 1: Cost Values */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" align="center" gutterBottom>
                      Category
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" align="center" gutterBottom>
                      Metal
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" align="center" gutterBottom>
                      Gem
                    </Typography>
                  </Grid>
                </Grid>

                {/* Row 1: Cost Values */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="textSecondary" align="right">
                      Cost Value:
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        size="small"
                        name="metal_cost"
                        type="number"
                        value={editedItem.metal_cost || 0}
                        onChange={handleInputChange}
                        margin="dense"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                      />
                    ) : (
                      <Typography variant="body2" align="center">
                        ${Number(item.est_metal_value || 0).toFixed(2)}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={4}>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        size="small"
                        name="gem_cost"
                        type="number"
                        value={editedItem.gem_cost || 0}
                        onChange={handleInputChange}
                        margin="dense"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                      />
                    ) : (
                      <Typography variant="body2" align="center">
                        ${(Number(item.primary_gem_value || 0) + 
                          (item.secondaryGems || []).reduce((sum, gem) => 
                            sum + Number(gem.secondary_gem_value || 0), 0)
                         ).toFixed(2)}
                      </Typography>
                    )}
                  </Grid>
                </Grid>

                {/* Row 2: Melt Values */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="textSecondary" align="right">
                      Melt Value:
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        size="small"
                        name="metal_melt_value"
                        type="number"
                        value={editedItem.metal_melt_value || 0}
                        onChange={handleInputChange}
                        margin="dense"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                      />
                    ) : (
                      <Typography variant="body2" align="center">
                        ${Number(item.metal_melt_value || 0).toFixed(2)}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={4}>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        size="small"
                        name="gem_melt_value"
                        type="number"
                        value={editedItem.gem_melt_value || 0}
                        onChange={handleInputChange}
                        margin="dense"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                      />
                    ) : (
                      <Typography variant="body2" align="center">
                        ${Number(item.gem_melt_value || 0).toFixed(2)}
                      </Typography>
                    )}
                  </Grid>
                </Grid>

                {/* Row 3: Suggested Retail */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="textSecondary" align="right">
                      Suggested Retail:
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        size="small"
                        name="metal_suggested_retail"
                        type="number"
                        value={editedItem.metal_suggested_retail || 0}
                        onChange={handleInputChange}
                        margin="dense"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                      />
                    ) : (
                      <Typography variant="body2" align="center">
                        ${Number(item.metal_suggested_retail || 0).toFixed(2)}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={4}>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        size="small"
                        name="gem_suggested_retail"
                        type="number"
                        value={editedItem.gem_suggested_retail || 0}
                        onChange={handleInputChange}
                        margin="dense"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                      />
                    ) : (
                      <Typography variant="body2" align="center">
                        ${Number(item.gem_suggested_retail || 0).toFixed(2)}
                      </Typography>
                    )}
                  </Grid>
                </Grid>

                {/* Row 4: Total Retail Value - Always Editable */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px dashed #ccc' }}>
                    <Typography variant="subtitle1" color="primary" fontWeight="bold" sx={{ mr: 2, minWidth: '150px' }}>
                      Total Retail Value:
                    </Typography>
                    <Box sx={{ flexGrow: 1 }}>
                      {renderEditableField(
                        'retail_price',
                        item.retail_price ? `$${parseFloat(item.retail_price).toFixed(2)}` : '$0.00',
                        <TextField
                          fullWidth
                          size="small"
                          name="retail_price"
                          value={editedItem?.retail_price || item.retail_price || ''}
                          onChange={handleInputChange}
                          inputRef={(el) => {
                            if (editingField === 'retail_price') inlineInputRef.current = el;
                          }}
                          onKeyDown={(e) => handleInlineEditComplete(e, 'retail_price')}
                          onBlur={(e) => handleInlineEditComplete(e, 'retail_price')}
                          type="number"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          inputProps={{ step: 0.01, min: 0 }}
                          margin="dense"
                        />
                      )}
                    </Box>
                  </Box>
                </Grid>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      
        {/* Gem Editing Dialog */}
        <Dialog
        open={gemDialogOpen}
        onClose={handleGemDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          {/* Primary Gem Header */}
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>EST. PRIMARY GEM</Typography>
          
          {/* Diamond/Stone Selection */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControl component="fieldset">
              <RadioGroup row value={gemTab} onChange={(e, newValue) => setGemTab(newValue)}>
                <FormControlLabel 
                  value="diamond" 
                  control={<Radio checked={gemTab === 'diamond'} />} 
                  label="Diamond" 
                  sx={{ 
                    '& .MuiFormControlLabel-label': { fontWeight: gemTab === 'diamond' ? 'bold' : 'normal' },
                    mr: 4
                  }}
                />
                <FormControlLabel 
                  value="stone" 
                  control={<Radio checked={gemTab === 'stone'} />} 
                  label="Stone" 
                  sx={{ '& .MuiFormControlLabel-label': { fontWeight: gemTab === 'stone' ? 'bold' : 'normal' } }}
                />
              </RadioGroup>
            </FormControl>
          </Box>        
            
            <Grid item xs={gemTab === 'diamond' ? 8 : 12}>
              {/* Shape Selection */}
              {/* Shape and Size in a single row */}
             
              <Grid container spacing={2} sx={{ mt: 2, pl: 2 }}>
                {gemTab === 'diamond' && (
                  <>
                    {/* Left side: Diamond shape image with navigation arrows */}
                    <Grid item xs={12} md={4}>
                      <Box sx={{ 
                        position: 'relative', 
                        height: '140px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        bgcolor: '#f5f5f5',
                        borderRadius: '4px'
                      }}>
                        <img 
                          src={diamondShapes && diamondShapes[currentShapeIndex] ? diamondShapes[currentShapeIndex].image : '/placeholder-diamond.png'}
                          alt={diamondShapes && diamondShapes[currentShapeIndex] ? diamondShapes[currentShapeIndex].name : 'Diamond shape'}
                          style={{ maxHeight: '120px', maxWidth: '120px' }}
                          onError={(e) => {
                            e.target.src = '/placeholder-diamond.png';
                          }}
                        />
                        <Box sx={{ 
                          position: 'absolute', 
                          bottom: '50%', 
                          left: 0, 
                          right: 0, 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          px: 1,
                          transform: 'translateY(50%)'
                        }}>
                          <IconButton 
                            size="small"
                            sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
                            onClick={handlePrevShape}
                          >
                            <ArrowBackIcon />
                          </IconButton>
                          <IconButton 
                            size="small"
                            sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
                            onClick={handleNextShape}
                          >
                            <ArrowBackIcon sx={{ transform: 'rotate(180deg)' }} />
                          </IconButton>
                        </Box>
                      </Box>
                    </Grid>
                    
                    {/* Right side: Form fields */}
                    <Grid item xs={12} md={8}>
                      <Grid container spacing={2}>
                        {/* First row: Shape and Size */}
                        <Grid item xs={6}>
                          <TextField
                            select
                            fullWidth
                            label="Select Shape"
                            value={gemData.diamond.shape || 'Round'}
                            onChange={(e) => {
                              const newShape = e.target.value;
                              handleGemDataChange('diamond', 'shape', newShape);
                              
                              // Make sure diamondShapes is an array before using find
                              if (Array.isArray(diamondShapes)) {
                                const shapeObj = diamondShapes.find(s => s.shape === newShape);
                                if (shapeObj && shapeObj.id) {
                                  fetchDiamondSizes(shapeObj.id);
                                } else {
                                  // If no shape ID found, reset diamond sizes
                                  setDiamondSizes([]);
                                }
                              }
                            }}
                          >
                            {diamondShapes.map(shape => (
                              <MenuItem key={shape.id} value={shape.name}>{shape.name}</MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            select
                            fullWidth
                            label="Size"
                            value={gemData.diamond.size || ''}
                            onChange={(e) => {
                              const selectedSize = e.target.value;
                              
                              if (Array.isArray(diamondSizes)) {
                                // Fix: Use strict comparison for size to ensure correct object is found
                                const selectedSizeObj = diamondSizes.find(sizeObj => 
                                  sizeObj && String(sizeObj.size) === String(selectedSize)
                                );
                                
                                if (selectedSizeObj) {
                                  // Update both size and weight based on selection
                                  setGemData(prev => ({
                                    ...prev,
                                    diamond: {
                                      ...prev.diamond,
                                      size: selectedSize,
                                      weight: selectedSizeObj.weight || prev.diamond.weight
                                    }
                                  }));
                                } else {
                                  // Just update size without weight if no match found
                                  handleGemDataChange('diamond', 'size', selectedSize);
                                }
                              }
                            }}
                          >
                            <MenuItem value="">Select Size</MenuItem>
                            {Array.isArray(diamondSizes) && diamondSizes.length > 0 ? (
                              diamondSizes.map(sizeObj => (
                                <MenuItem key={sizeObj.id || sizeObj.size} value={sizeObj.size}>
                                  {sizeObj.size}
                                </MenuItem>
                              ))
                            ) : (
                              <MenuItem value="" disabled>No sizes available</MenuItem>
                            )}
                          </TextField>
                        </Grid>
                        
                        {/* Second row: Quantity, Weight, Cut and Lab Grown all on same row */}
                        <Grid item xs={3}>
                          <TextField
                            fullWidth
                            label="Quantity"
                            type="number"
                            value={gemData.diamond.quantity || '1'}
                            onChange={(e) => handleGemDataChange('diamond', 'quantity', e.target.value)}
                            InputProps={{
                              inputProps: { min: 1 }
                            }}
                          />
                        </Grid>
                        <Grid item xs={3}>
                          <TextField
                            fullWidth
                            label="Weight (carats) *"
                            type="number"
                            value={gemData.diamond.weight || '0'}
                            onChange={(e) => handleGemDataChange('diamond', 'weight', e.target.value)}
                            InputProps={{
                              inputProps: { min: 0, step: 0.01 }
                            }}
                          />
                        </Grid>
                        <Grid item xs={3}>
                          <TextField
                            select
                            fullWidth
                            label="Cut"
                            value={gemData.diamond.cut || ''}
                            onChange={(e) => handleGemDataChange('diamond', 'cut', e.target.value)}
                          >
                            {diamondCuts.map((cut) => (
                              <MenuItem key={cut.name} value={cut.name}>
                                {cut.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={3} sx={{ display: 'flex', alignItems: 'center' }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={gemData.diamond.lab || false}
                                onChange={(e) => handleGemDataChange('diamond', 'lab', e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            }
                            label="Lab Grown"
                            sx={{ m: 0, width: '100%' }}
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                    
                    {/* Diamond Color and Clarity in two columns */}
                    <Grid container spacing={2} sx={{ mt: 3 }}>
                      {/* Left column: Diamond Color Scale */}
                      <Grid item xs={6}>
                        <Typography variant="subtitle1">
                          Color <span style={{ color: 'red' }}>*</span>
                        </Typography>
                  
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                          {diamondColors.map((color) => (
                            <Paper
                              key={color.name}
                              elevation={gemData.diamond.color === color.name ? 8 : 1}
                              sx={{
                                p: 1,
                                cursor: 'pointer',
                                width: 80,
                                height: 80,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: color.color || '#fff',
                                transition: 'all 0.3s ease',
                              }}
                              onClick={() => {
                                // Update color
                                handleGemDataChange('diamond', 'color', color.name);
                                
                                // Map color to exact color based on color.range
                                let exactColor = 'D'; // Default
                                if (color.range && color.range.includes('-')) {
                                  exactColor = color.range.split('-')[0];
                                }
                                
                                // Update exact color
                                handleGemDataChange('diamond', 'exactColor', exactColor);
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
                        <Box sx={{ width: '100%', px: 2, mt: 2, mb: 1}}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography>
                              Exact Color: {gemData.diamond.exactColor || 'D'}
                            </Typography>
                          </Box>
                          <Slider
                            value={colorScale.indexOf(gemData.diamond.exactColor || 'D')}
                            onChange={(e, newValue) => {
                              const selectedColor = colorScale[newValue];
                              handleGemDataChange('diamond', 'exactColor', selectedColor);
                              
                              // Find the corresponding diamond color to update the color field
                              // Match based on the range containing the exact color
                              const matchingColor = diamondColors.find(color => {
                                if (color.range && color.range.includes('-')) {
                                  const [start, end] = color.range.split('-');
                                  // Check if the selected color is within this range
                                  return selectedColor >= start && selectedColor <= end;
                                }
                                return false;
                              });
                              
                              // If we found a matching color, update the color field
                              if (matchingColor) {
                                handleGemDataChange('diamond', 'color', matchingColor.name);
                              }
                            }}
                            valueLabelDisplay="on"
                            valueLabelFormat={(value) => colorScale[value]}
                            step={1}
                            marks={colorScale.map((color, index) => ({
                              value: index,
                              label: index % 2 === 0 ? color : ''
                            }))}
                            min={0}
                            max={colorScale.length - 1}
                            tabIndex={0}
                            sx={{
                              height: 8,
                              '& .MuiSlider-thumb': {
                                height: 24,
                                width: 24,
                                backgroundColor: '#fff',
                                border: '2px solid currentColor',
                                '&:focus, &:hover': {
                                  boxShadow: '0 0 0 8px rgba(25, 118, 210, 0.16)'
                                },
                                '&:focus': {
                                  outline: '2px solid #1976d2',
                                  outlineOffset: '2px'
                                }
                              },
                              '& .MuiSlider-valueLabel': {
                                backgroundColor: '#1976d2',
                                fontSize: '14px',
                                fontWeight: 'bold'
                              },
                              '& .MuiSlider-track': {
                                border: 'none',
                                height: 8
                              },
                              '& .MuiSlider-rail': {
                                opacity: 0.5,
                                backgroundColor: '#bfbfbf',
                                height: 8
                              },
                              '& .MuiSlider-mark': {
                                backgroundColor: '#bfbfbf',
                                height: 12,
                                width: 2,
                                marginTop: -2
                              },
                              '& .MuiSlider-markActive': {
                                backgroundColor: 'currentColor',
                              }
                            }}
                          />
                        </Box>
                      </Grid>
                      
                      {/* Right column: Diamond Clarity Selection */}
                      <Grid item xs={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>
                          Clarity <span style={{ color: 'red' }}>*</span>
                        </Typography>
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: 2, 
                            mb: 2,
                            '&:focus-visible': {
                              outline: '2px solid #1976d2',
                              outlineOffset: '2px'
                            }
                          }}
                          tabIndex={0}
                        >
                          {diamondClarity.map((clarity, index) => (
                            <Paper
                              key={clarity.name}
                              elevation={gemData.diamond.clarity === clarity.name ? 8 : 1}
                              sx={{
                                p: 1,
                                cursor: 'pointer',
                                width: 80,
                                height: 80,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease'
                              }}
                              onClick={() => {
                                handleGemDataChange('diamond', 'clarity', clarity.name);
                                setSelectedClarityIndex(index);
                              }}
                            >
                              <Typography variant="caption" align="center">
                                {clarity.name}
                              </Typography>
                              {clarity.image && (
                                <img 
                                  src={clarity.image} 
                                  alt={clarity.name}
                                  style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                                  onError={(e) => {
                                    e.target.src = '/placeholder-clarity.png';
                                  }}
                                />
                              )}
                            </Paper>
                          ))}
                        </Box>
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 4 }}>
                      <TextField
                      fullWidth
                      label="Est. Diamond Value"
                      type="number"
                      value={gemData.diamond.estimatedValue || ''}
                      onChange={(e) => handleGemDataChange('diamond', 'estimatedValue', e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        inputProps: { min: 0, step: 0.01 }
                      }}
                    />
                  </Box>
                  </>
                )}
              </Grid>
            </Grid>

          {/* Stone-specific fields - Only show when stone is selected */}
          {gemTab === 'stone' && (
            <Grid container spacing={2}>
              {/* Left side: Stone Shapes */}
              <Grid item xs={12} md={7}>
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 2,
                  mb: 2
                }}>
                  {diamondShapes
                    .filter(shape => !shape.name.toLowerCase().includes('arrow'))
                    .map(shape => (
                      <Paper
                        key={shape.id}
                        elevation={gemData.stone.shape === shape.name ? 8 : 1}
                        sx={{ 
                          width: 80,
                          height: 80,
                          p: 1,
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: gemData.stone.shape === shape.name ? '#e3f2fd' : 'transparent',
                          border: gemData.stone.shape === shape.name ? '1px solid #90caf9' : '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => handleGemDataChange('stone', 'shape', shape.name)}
                      >
                        <img
                          src={shape.image}
                          alt={shape.name}
                          style={{ width: 50, height: 50, objectFit: 'contain' }}
                          onError={(e) => {
                            e.target.src = '/placeholder-stone.png';
                          }}
                        />
                        <Typography variant="caption" align="center" sx={{ mt: 0.5 }}>
                          {shape.name}
                        </Typography>
                      </Paper>
                    ))}
                </Box>
              </Grid>
              
              {/* Right side: Form fields */}
              <Grid item xs={12} md={5}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      select
                      fullWidth
                      label="Size"
                      value={gemData.stone.size || ''}
                      onChange={(e) => handleGemDataChange('stone', 'size', e.target.value)}
                    >
                      <MenuItem value="">Select Size</MenuItem>
                      {Array.isArray(diamondSizes) && diamondSizes.length > 0 ? (
                        diamondSizes.map(sizeObj => (
                          <MenuItem key={sizeObj.id || sizeObj.size} value={sizeObj.size}>
                            {sizeObj.size}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem value="" disabled>No sizes available</MenuItem>
                      )}
                    </TextField>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Quantity"
                        type="number"
                        value={gemData.stone.quantity || '1'}
                        onChange={(e) => handleGemDataChange('stone', 'quantity', e.target.value)}
                        InputProps={{
                          inputProps: { min: 1 }
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Weight (carats) *"
                        type="number"
                        value={gemData.stone.weight || '0'}
                        onChange={(e) => handleGemDataChange('stone', 'weight', e.target.value)}
                        InputProps={{
                          inputProps: { min: 0, step: 0.01 }
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={gemData.stone.authentic || false}
                            onChange={(e) => handleGemDataChange('stone', 'authentic', e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                        label="Authentic"
                        sx={{ m: 0, width: '100%' }}
                      />
                    </Grid>
                    
                    {/* Stone Estimated Value */}
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <TextField
                        fullWidth
                        label="Estimated Value ($)"
                        type="number"
                        value={gemData.stone.estimatedValue || ''}
                        onChange={(e) => handleGemDataChange('stone', 'estimatedValue', e.target.value)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          inputProps: { min: 0, step: 0.01 }
                        }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
                
                {/* Stone Type and Color Selection */}
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {/* Left side: Stone Type Selection */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Stone Type <span style={{ color: 'red' }}>*</span>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: '300px', overflowY: 'auto', pl: 2 }}>
                      {filteredStoneTypes.length > 0 ? (
                        filteredStoneTypes.map(type => (
                          <Paper
                            key={type.id}
                            elevation={gemData.stone.type === type.type ? 8 : 1}
                            sx={{
                              p: 1,
                              cursor: 'pointer',
                              width: 90,
                              height: 90,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.3s ease',
                            }}
                            onClick={() => handleGemDataChange('stone', 'type', type.type)}
                          >
                            <Typography variant="caption" align="center">
                              {type.type}
                            </Typography>
                            {type.image_path && (
                              <img 
                                src={type.image_path} 
                                alt={type.type}
                                style={{ width: '50px', height: '50px', objectFit: 'contain', marginTop: '4px' }}
                                onError={(e) => {
                                  e.target.src = '/placeholder-stone.png';
                                }}
                              />
                            )}
                          </Paper>
                        ))
                      ) : gemData.stone.color ? (
                        <Typography>No stone types available for {gemData.stone.color} color</Typography>
                      ) : (
                        <Typography>No stone types available</Typography>
                      )}
                      </Box>
                    </Grid>
    
                    {/* Right side: Stone Color Selection */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        Stone Color <span style={{ color: 'red' }}>*</span>
                      </Typography>
                      <FormControl fullWidth>
                        <Grid container sx={{ border: '1px solid #ccc', boxSizing: 'border-box'}}>
                          {stoneColors.length > 0 ? (
                            stoneColors.map(color => (
                              <Grid item xs={4} key={color.id}>
                                <Paper
                                  elevation={0}
                                  sx={{
                                    p: 1.5,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    border: '1px solid #ccc',
                                    borderRadius: 0,
                                    backgroundColor: gemData.stone.color === color.color ? 'mediumseagreen' : 'none'
                                  }}
                                  onClick={() => {
                                    // Update color in gemData
                                    handleGemDataChange('stone', 'color', color.color);
                                    
                                    // If this color change makes the current stone type invalid,
                                    // we should clear the stone type selection
                                    const selectedColorObj = stoneColors.find(c => c.color === color.color);
                                    if (selectedColorObj) {
                                      // Check if the current stone type is valid for this color
                                      const currentTypeStillValid = stoneTypes.some(type => 
                                        type.type === gemData.stone.type && 
                                        type.color_id === selectedColorObj.id
                                      );
                                      
                                      if (!currentTypeStillValid) {
                                        // Clear the stone type if it's not valid for this color
                                        handleGemDataChange('stone', 'type', '');
                                      }
                                    }
                                  }}
                                >
                                  {color.color}
                                </Paper>
                              </Grid>
                            ))
                          ) : <Typography>No stone colors available</Typography>}
                        </Grid>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Grid>
          )}

        </DialogContent>
        <DialogActions>
          <Button onClick={handleGemDialogClose}>Cancel</Button>
          <Button
            onClick={() => {
              const gemInfo = gemTab === 'diamond'
                ? { diamonds: [{
                    ...gemData.diamond,
                    primary: true,
                    quantity: gemData.diamond.quantity || 1,
                    exactColor: gemData.diamond.exactColor || 'D'
                  }] }
                : { stones: [{
                    ...gemData.stone,
                    primary: true,
                    quantity: gemData.stone.quantity || 1
                  }] };
              handleGemSave(gemInfo);
            }}
            variant="contained"
            color="primary"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    
    </Container>
  );
}

export default JewelryEdit;