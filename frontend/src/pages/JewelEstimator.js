import React, { useState, useEffect } from 'react';
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
import MetalEstimator from './MetalEstimator';
import GemEstimator from './GemEstimator';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import CloudUpload from '@mui/icons-material/CloudUpload';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

function JewelEstimator() {
  const API_BASE_URL = config.apiUrl;
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [metalFormState, setMetalFormState] = useState({});
  const [totalMetalValue, setTotalMetalValue] = useState(0);
  const [addMetal, setAddMetal] = useState(() => {
    // Initialize from location state if available
    const lastItem = location.state?.items?.[location.state.items.length - 1];
    return lastItem ? [lastItem] : [];
  });
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isCaratConversionEnabled, setIsCaratConversionEnabled] = useState(false);
  const [from, setFrom] = useState(location.state?.from || '');
  const [editMode, setEditMode] = useState(location.state?.editMode || false);
  const [editingGemOnly, setEditingGemOnly] = useState(location.state?.editingGemOnly || false);
  const [returnToTicket, setReturnToTicket] = useState(location.state?.returnToTicket || false);
  const [ticketItemId, setTicketItemId] = useState(location.state?.ticketItemId || null);
  const [priceEstimates, setPriceEstimates] = useState({ pawn: 0, buy: 0, melt: 0, retail: 0 });
  
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
    setSnackbar({ ...snackbar, open: false });
  };
  const [customer, setCustomer] = useState(location.state?.customer || null);
  const [transactionType, setTransactionType] = useState(location.state?.itemToEdit?.transaction_type || 'buy');
  const [freeText, setFreeText] = useState(location.state?.itemToEdit?.notes || '');
  const [diamondSummary, setDiamondSummary] = useState([]);
  const [stoneSummary, setStoneSummary] = useState([]);
  const [gemFormData, setGemFormData] = useState({});
  const [totalGemValue, setTotalGemValue] = useState(0);
  const [gemSummary, setGemSummary] = useState([]);

  const handleMetalFormChange = (formState) => {
      setMetalFormState(formState);
  };

  const handleTotalMetalValueChange = (metalValue) => {
    setTotalMetalValue(metalValue);
    // Update the summary
    updateEstimatedValues({
      ...estimatedValues,
      metal: metalValue
    });
  };

  const handleTotalGemValueChange = (gemValue) => {
    setTotalGemValue(gemValue);
    // Update the summary
    updateEstimatedValues({
      ...estimatedValues,
      gems: gemValue
    });
  };
  
  const handleGemFormChange = (gemFormData) => {
    // Handle gem form state changes
    setGemFormData(gemFormData);
  };

  const handleAddGem = (gemData) => {
    
    // Ensure gemData has all required fields with defaults
    const gemWithDefaults = {
      ...gemData,
      isPrimary: gemData.isPrimary || false,
      type: gemData.type || (gemData.shape ? 'diamond' : 'stone'),
      estimatedValue: gemData.value || 0,
      weight: gemData.weight || 0,
      quantity: gemData.quantity || 1
    };
    
    
    // Update the appropriate summary based on gem type
    if (gemWithDefaults.type === 'diamond') {
      setDiamondSummary(prev => [...prev, gemWithDefaults]);
    } else if (gemWithDefaults.type === 'stone') {
      setStoneSummary(prev => [...prev, gemWithDefaults]);
    }
    
    // Update addedGemTypes if this is a primary gem
    if (gemWithDefaults.isPrimary) {
      setAddedGemTypes(prev => ({
        ...prev,
        primary: gemWithDefaults.type === 'diamond' ? 'diamond' : 'stone'
      }));
    }
    
    return true; // Indicate success
  };

  const handleAddMetal = (newItem) => {
    // Find the metal type from the state
    const metalType = metalTypes.find(mt => 
      mt.type === newItem.precious_metal_type
    );

    // Calculate price estimates with the found metal type ID
    const estimates = calculatePriceEstimates(newItem.estimated_value, metalType.id);
    
    // Set the price estimates
    setPriceEstimates(estimates);
    
    // Add the metal with its price estimates
    const metalWithEstimates = {
      ...newItem,
      priceEstimates: estimates
    };
    setAddMetal(prev => [...prev, metalWithEstimates]);
    
    // Set the price estimates directly (not adding to previous)
    setPriceEstimates({
      pawn: estimates.pawn,
      buy: estimates.buy,
      melt: estimates.melt,
      retail: estimates.retail
    });
  };

  const handleDeleteMetal = (index) => {
    setAddMetal(prev => prev.filter((_, i) => i !== index)); // Deletes the selected metal
  };

  const handleDeleteGem = (index, type, isPrimary) => {
    if (type === 'diamond') {
      setDiamondSummary(prev => {
        const newSummary = [...prev];
        newSummary.splice(index, 1);
        return newSummary;
      });
    } else if (type === 'stone') {
      setStoneSummary(prev => {
        const newSummary = [...prev];
        newSummary.splice(index, 1);
        return newSummary;
      });
    }
  };
  
  // Handler for deleting gems from gemSummary
  const handleDeleteFromGemSummary = (index) => {
    setGemSummary(prev => {
      const newSummary = [...prev];
      newSummary.splice(index, 1);
      return newSummary;
    });
  };
  
  const getInitials = (str) => {
    return str.split(' ').map(word => word.charAt(0).toUpperCase()).join('');
  };

  // Update button text based on edit mode
  const getFinishButtonText = () => {
    if (editMode && returnToTicket) {
      return 'Update Item';
    }
    return 'Finish Estimation';
  };

  const handleFinishEstimation = () => {
    // Store the summary data before clearing it
    // Get the most recent metal data - use the latest from addMetal array
    const latestMetalData = addMetal.length > 0 ? {...addMetal[addMetal.length - 1]} : {};
    const gemWeightInGrams = isCaratConversionEnabled ? calculateTotalGemWeight() : 0;
    const totalWeight = parseFloat(latestMetalData.weight || 0) + gemWeightInGrams;

    // Get all secondary diamonds and stones
    const secondaryDiamonds = diamondSummary.filter(d => !d.isPrimary);
    const secondaryStones = stoneSummary.filter(s => !s.isPrimary);

    // Find primary diamond and stone
    const primaryDiamond = diamondSummary.find(d => d.isPrimary);
    const primaryStone = stoneSummary.find(s => s.isPrimary);
    
    // Create new item with all required jewelry fields
    const jewelryItem = {
      // Basic item details
      metal_weight: latestMetalData.metal_weight,
      precious_metal_type: latestMetalData.precious_metal_type,
      non_precious_metal_type: latestMetalData.non_precious_metal_type || null,
      metal_purity: latestMetalData.metal_purity,
      metal_category: latestMetalData.metal_category,
      jewelry_color: latestMetalData.color,
      metal_spot_price: latestMetalData.metal_spot_price,
      est_metal_value: latestMetalData.estimated_value?.toFixed(2),
      purity_value: latestMetalData.purity_value,

      // Primary gem details
      primary_gem_category: addedGemTypes.primary || null,
      ...(addedGemTypes.primary === 'diamond' && primaryDiamond ? {
        primary_gem_shape: primaryDiamond.shape,
        primary_gem_clarity: primaryDiamond.clarity,
        primary_gem_color: primaryDiamond.color,
        primary_gem_exact_color: primaryDiamond.exactColor,
        primary_gem_cut: primaryDiamond.cut,
        primary_gem_weight: primaryDiamond.weight,
        primary_gem_size: primaryDiamond.size,
        primary_gem_quantity: primaryDiamond.quantity,
        primary_gem_lab_grown: primaryDiamond.labGrown,
        primary_gem_value: primaryDiamond.estimatedValue
      } : addedGemTypes.primary === 'stone' && primaryStone ? {
        primary_gem_shape: primaryStone?.shape || '',
        primary_gem_quantity: primaryStone?.quantity || 0,
        primary_gem_authentic: primaryStone?.authentic || false,
        primary_gem_type: primaryStone?.name || '',
        primary_gem_color: primaryStone?.color || '',
        primary_gem_weight: primaryStone?.weight || 0,
        primary_gem_value: primaryStone?.estimatedValue || 0
      } : {}),

      // Secondary gem details - store in arrays
      secondary_gems: [
        // Process secondary diamonds
        ...secondaryDiamonds.map(diamond => ({
          secondary_gem_category: 'diamond',
          secondary_gem_shape: diamond.shape || '',
          secondary_gem_clarity: diamond.clarity || '',
          secondary_gem_color: diamond.color || '',
          secondary_gem_exact_color: diamond.exactColor || '',
          secondary_gem_cut: diamond.cut || '',
          secondary_gem_weight: diamond.weight || 0,
          secondary_gem_size: diamond.size || '',
          secondary_gem_quantity: diamond.quantity || 0,
          secondary_gem_lab_grown: diamond.labGrown || false,
          secondary_gem_value: diamond.estimatedValue || 0
        })),
        // Process secondary stones
        ...secondaryStones.map(stone => ({
          secondary_gem_category: 'stone',
          secondary_gem_shape: stone.shape || '',
          secondary_gem_quantity: stone.quantity || 0,
          secondary_gem_authentic: stone.authentic || false,
          secondary_gem_type: stone.name || '',
          secondary_gem_color: stone.color || '',
          secondary_gem_weight: stone.weight || 0,
          secondary_gem_value: stone.estimatedValue || 0
        }))
      ],

      // Price estimates - use selected transaction type instead of hardcoded 'pawn'
      transaction_type: transactionType || 'buy',
      buy_price: priceEstimates.buy,
      pawn_price: priceEstimates.pawn,
      melt_value: priceEstimates.melt,
      retail_price: priceEstimates.retail,
      
      // Images
      images: images.map(img => ({
        url: img.url,
        isPrimary: img.isPrimary || false
      })),
      
      // Free text description if available
      notes: freeText || '',
      
      // Additional jewelry details - update short_desc to handle multiple secondary gems
      long_desc: latestMetalData.metal_weight ? `${latestMetalData.metal_weight}g ${latestMetalData.metal_purity || latestMetalData.purity_value} ${latestMetalData.precious_metal_type} ${latestMetalData.metal_category}${addedGemTypes.primary ? ` ${addedGemTypes.primary === 'diamond' && primaryDiamond ? primaryDiamond?.shape : primaryStone?.type}` : ''}${secondaryDiamonds.length > 0 || secondaryStones.length > 0 ? ` with ${secondaryDiamonds.length + secondaryStones.length} secondary gems` : ''}` : '',

      short_desc: latestMetalData.metal_weight ? `${latestMetalData.metal_weight}g ${latestMetalData.metal_purity || latestMetalData.purity_value} ${latestMetalData.precious_metal_type} ${latestMetalData.metal_category}` : ''
    };
    console.log("jewelryItem", jewelryItem);

    // Add the item to estimated items array with all price information
    const itemWithPrices = {
      ...jewelryItem,
      price_estimates: {
        buy: jewelryItem.buy_price,
        pawn: jewelryItem.pawn_price,
        retail: jewelryItem.retail_price
      },
      // Flag to identify this as coming from the jewelry estimator
      sourceEstimator: 'jewelry',
      // Store original data for future edits
      originalData: { ...jewelryItem },
      // Add timestamp to identify newly added items
      _timestamp: Date.now(),
      // If editing from a ticket, store the original ticket item ID
      originalTicketItemId: editMode ? ticketItemId : null
    };

    // Add the current item to the estimatedItems array
    setEstimatedItems(prev => {
      let updatedItems;
      
      if (editMode) {
        // In edit mode, we want to replace any existing items or simply add this as the only item
        // This ensures the estimated items list only contains the edited item
        updatedItems = [itemWithPrices]; // Just keep the edited item, discard others
      } else {
        // Normal add for non-edit mode - append to existing items
        updatedItems = [...prev, itemWithPrices];
      }
      
      // Save to sessionStorage to persist through navigation
      sessionStorage.setItem('jewelEstimatorItems', JSON.stringify(updatedItems));
      
      // In edit mode, don't automatically navigate back to CustomerTicket
      // User will need to explicitly hit "Add to Ticket" to return
      if (!editMode && returnToTicket && location.state?.customer) {
        // Only navigate automatically in non-edit mode
        navigate('/customer-ticket', { 
          state: { 
            customer: location.state.customer,
            from: 'jewelEstimator',
            estimatedItems: updatedItems
          } 
        });
      } else {
        // Clear the summary lists immediately
        setAddMetal([]);
        setDiamondSummary([]);
        setStoneSummary([]);
        setFreeText('');
        setMetalFormState({});
        setTotalMetalValue(0);
      }
      
      // Return the updated array for the state update
      return updatedItems;
    });
    
    // Early return to prevent form reset if we're navigating back
    if (editMode && returnToTicket && location.state?.customer) {
      return;
    }

    // Reset form state
    setAddMetal([]);
    setDiamondSummary([]);
    setStoneSummary([]);
    setAddedGemTypes({
      primary: null,
      secondary: null
    });
    setFreeText('');
    setTimeout(() => {
      setImages([]);
    }, 1000);
  };

  const [addedGemTypes, setAddedGemTypes] = useState({
    primary: null,  // can be 'diamond' or 'stone'
    secondary: null // can be 'diamond' or 'stone'
  });

  // Define activeTab state
  const [activeTab, setActiveTab] = useState('primary_gem_diamond');

  // Handle tab change from the RadioGroup controls
  const handleTabChange = (event) => {
    setActiveTab(event.target.value);
  };

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
    size: ''
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
    size: ''
  });

  const initialStoneForm = {
    name: '',
    shape: '',
    color: 'Red',
    color_id: 5, // Default to Red's ID
    weight: '',
    width: '',
    depth: '',
    quantity: 1,
    authentic: false,
    valuationType: 'each'
  };

  const [primaryStoneForm, setPrimaryStoneForm] = useState(initialStoneForm);
  const [secondaryStoneForm, setSecondaryStoneForm] = useState(initialStoneForm);

  const [estimatedItems, setEstimatedItems] = useState(() => {
    // When in edit mode, start with an empty array - items will be added after editing
    if (location.state?.editMode && location.state?.ticketItemId) {
      // Clear any previous items in sessionStorage for a clean edit experience
      sessionStorage.removeItem('jewelEstimatorItems');
      return [];
    }
    
    // First try to get items from location state (highest priority)
    if (location.state?.items && location.state.items.length > 0) {
      return location.state.items;
    }
    
    // Then try to load from sessionStorage (to persist through navigation)
    try {
      const savedItems = sessionStorage.getItem('jewelEstimatorItems');
      if (savedItems) {
        const parsedItems = JSON.parse(savedItems);
        return parsedItems;
      }
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
    
    // Default to empty array if nothing is found
    return [];
  });

    // Function to update estimated values
  const updateEstimatedValues = (newValues) => {
    setEstimatedValues(prev => ({
      ...prev,
      ...newValues
    }));
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
  const [metalTypes, setMetalTypes] = useState([]);

  // Fetch metal types when component mounts
  useEffect(() => {
    const fetchMetalTypes = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/precious_metal_type`);
        setMetalTypes(response.data);
      } catch (error) {
        console.error('Error fetching metal types:', error);
      }
    };
    
    fetchMetalTypes();
  }, []);

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

  const [diamondEstimates, setDiamondEstimates] = useState([]);

  // Effect to handle edit mode data when component mounts
  useEffect(() => {
    if (location.state?.editMode && location.state?.itemToEdit) {
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
        console.log('Direct primary gem data found in itemToEdit:', itemToEdit);
        
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
          
        } else {
          setAddedGemTypes(prev => ({
            ...prev,
            primary: 'stone'
          }));
          
          // Set primary stone form directly from itemToEdit
          const stoneFormData = {
            name: itemToEdit.primary_gem_type || '',
            shape: itemToEdit.primary_gem_shape || 'Round',
            color: itemToEdit.primary_gem_color || '',
            quantity: itemToEdit.primary_gem_quantity || 1,
            weight: itemToEdit.primary_gem_weight || 0,
            authentic: itemToEdit.primary_gem_authentic || false,
            valuationType: 'each'
          };
          
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
      
      // Set form values based on the item being edited
      if (itemToEdit.metal_weight) {
        // This is likely a metal item with jewelry properties
        // Pre-fill metal form with item data
        setMetalFormState({
          metalCategory: itemToEdit.category || '',
          weight: itemToEdit.metal_weight || '',
          preciousMetalType: itemToEdit.precious_metal_type || '',
          purity: { value: itemToEdit.metal_purity || '' },
          estimatedValue: itemToEdit.price || 0
        });
        
        // If there are price estimates, set them
        if (itemToEdit.price_estimates) {
          setPriceEstimates({
            pawn: itemToEdit.price_estimates.pawn || 0,
            buy: itemToEdit.price_estimates.buy || 0,
            melt: itemToEdit.price_estimates.melt || 0,
            retail: itemToEdit.price_estimates.retail || 0
          });
        }
        
        // Set transaction type if available
        if (itemToEdit.transaction_type) {
          setTransactionType(itemToEdit.transaction_type);
        }
        
        // If there's free text, set it
        if (itemToEdit.notes) {
          setFreeText(itemToEdit.notes);
        }
        
        // Add item to the addMetal state to display it
        const metalItem = {
          metalCategory: itemToEdit.category || '',
          weight: itemToEdit.metal_weight || '',
          preciousMetalType: itemToEdit.precious_metal_type || '',
          purity: { value: itemToEdit.metal_purity || '', purity: itemToEdit.metal_purity || '' },
          estimatedValue: itemToEdit.price || 0,
          priceEstimates: itemToEdit.price_estimates || {}
        };
        setAddMetal([metalItem]);
      }   
    }
  }, [location.state]);
  
  // Effect to update selectedClarityIndex when diamondClarity is loaded and we're in edit mode
  useEffect(() => {
    if (diamondClarity.length > 0 && location.state?.editMode && location.state?.itemToEdit?.primary_gem_clarity) {
      const clarityToMatch = location.state.itemToEdit.primary_gem_clarity;
      const clarityIndex = diamondClarity.findIndex(c => c.name === clarityToMatch);
      
      if (clarityIndex !== -1) {
        setSelectedClarityIndex(clarityIndex);
      }
    }
  }, [diamondClarity, location.state]);
  
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
        //Fetch Price Estimate Percentages
        const priceEstimatePercentagesResponse = await axios.get(`${API_BASE_URL}/price_estimates`);
        const data = priceEstimatePercentagesResponse.data;
        const estimates = {};
        data.forEach((estimate) => {
          const metalType = estimate.precious_metal_type_id;
          if (!estimates[metalType]) {
            estimates[metalType] = [];
          }
          estimates[metalType].push(estimate);
        });
        setPriceEstimatePercentages(estimates);
        
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
        const cameraPreference = response.data.find(pref => pref.preference_name === 'cameraEnabled');
        setIsCameraEnabled(cameraPreference ? cameraPreference.preference_value === 'true' : false);
        const caratConversionPreference = response.data.find(pref => pref.preference_name === 'caratConversion');
        setIsCaratConversionEnabled(caratConversionPreference ? caratConversionPreference.preference_value === 'true' : false);
      } catch (error) {
        console.error('Error fetching camera preference:', error);
      }
    };
    
    const fetchDiamondEstimates = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/diamond_estimates`);
        setDiamondEstimates(response.data);
      } catch (error) {
        console.error('Error fetching diamond estimates:', error);
      }
    };

    fetchAllData();
    
    // Only fetch default diamond sizes (round) if we're not in edit mode
    if (!location.state?.editMode) 
      fetchDiamondSizes(1);
    fetchUserPreference();
    if(isCaratConversionEnabled) 
        fetchCaratConversion();
    fetchDiamondEstimates();
  }, []);

  useEffect(() => {
    // Try to restore state from location or session storage
    if (!estimatedItems.length) {
      const savedState = sessionStorage.getItem('estimationState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        if (parsedState.items) {
          // If we have items, restore them to the estimator
          setEstimatedItems(parsedState.items);
        }
      }
    }
  }, [estimatedItems.length]);

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
      setSecondaryDiamondForm(updater);
    }
  };

  const getCurrentStoneForm = () => {
    return activeTab.startsWith('primary') ? primaryStoneForm : secondaryStoneForm;
  };

  const setCurrentStoneForm = (newForm) => {
    if (activeTab.startsWith('primary')) {
      setPrimaryStoneForm(newForm);
    } else {
      setSecondaryStoneForm(newForm);
    }
  };

  const [images, setImages] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = React.useRef(null);
  const [stream, setStream] = useState(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupImageIndex, setPopupImageIndex] = useState(0);
  const sliderRef = React.useRef(null);
  const colorSliderRef = React.useRef(null);
  const cutRef = React.useRef(null);
  const labGrownRef = React.useRef(null);
  const addDiamondRef = React.useRef(null);

  const openPopup = (index) => {
    setPopupImageIndex(index);
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
  };

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

  // Image gallery navigation
  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => Math.min(prevIndex + 1, images.length - 1));
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const handleNextPopupImage = () => {
    setPopupImageIndex((prevIndex) => Math.min(prevIndex + 1, images.length - 1));
  };

  const handlePrevPopupImage = () => {
    setPopupImageIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  // Popup Component
  const ImagePopup = ({ images, index }) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDelete = () => {
      setImages(prev => prev.filter((_, i) => i !== index));
      setShowDeleteConfirm(false);
      closePopup();
    };

    const handleMakePrimary = (event) => {
      const newImages = [...images];
      // Remove primary flag from all images
      newImages.forEach(img => img.isPrimary = false);
      // Set primary flag for current image
      newImages[index].isPrimary = event.target.checked;
      setImages(newImages);
    };

    if (!images || images.length === 0) return null;

    return (
      <>
        <Dialog open={isPopupOpen} onClose={closePopup} maxWidth="md">
          <DialogContent sx={{ overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Button onClick={handlePrevPopupImage} disabled={index === 0}>◀</Button>
                <img 
                  src={images[index].url} 
                  alt="Popup Image" 
                  style={{ 
                    width: '500px', 
                    height: 'auto', 
                    transition: 'opacity 0.5s ease-in-out', 
                    opacity: isPopupOpen ? 1 : 0 
                  }} 
                />
                <Button onClick={handleNextPopupImage} disabled={index === images.length - 1}>▶</Button>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={images[index].isPrimary || false}
                      onChange={handleMakePrimary}
                    />
                  }
                  label="Make Primary"
                />
                <Button 
                  variant="contained" 
                  color="error" 
                  startIcon={<DeleteIcon />}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete
                </Button>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={closePopup}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">
            {"Delete Image"}
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this image? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained" autoFocus>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newImages = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: 'upload'
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const startCamera = async () => {
    setIsVideoReady(false); // Reset video ready state
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please make sure you have given permission.");
    }
  };

  const stopCamera = () => {
    setIsVideoReady(false);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setShowCamera(false);
  };

  const captureImage = () => {
    if (!videoRef.current || !isVideoReady) {
      console.log("Video ref:", videoRef.current, "Ready:", isVideoReady);
      alert("Camera is not ready yet. Please wait a moment.");
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(blob => {
        if (!blob) {
          alert("Failed to capture image. Please try again.");
          return;
        }
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const newImage = {
          file,
          url: URL.createObjectURL(file),
          type: 'capture'
        };
        setImages(prev => [...prev, newImage]);
        stopCamera();
      }, 'image/jpeg', 0.8);
    } catch (err) {
      console.error("Error capturing image:", err);
      alert("Failed to capture image. Please try again.");
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

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

  const calculatePriceEstimates = (value, metalTypeId) => {
    // Get the estimates for this metal type from priceEstimatePercentages
    const estimates = priceEstimatePercentages[metalTypeId] || [];
    
    // Get percentages for each transaction type, default to 0 if not found
    const pawnPercent = estimates.find(e => e.transaction_type === 'pawn')?.estimate || 0;
    const buyPercent = estimates.find(e => e.transaction_type === 'buy')?.estimate || 0;
    const meltPercent = 98;
    const retailPercent = estimates.find(e => e.transaction_type === 'retail')?.estimate || 0;
    return {
      pawn: Number((value * pawnPercent / 100).toFixed(2)),
      buy: Number((value * buyPercent / 100).toFixed(2)),
      melt: Number((value * meltPercent / 100).toFixed(2)),
      retail: Number((value * retailPercent / 100).toFixed(2))
    };
  };

  const calculateGemPriceEstimates = (value) => {
    // Get the estimates for diamonds
    const pawnPercent = diamondEstimates.find(e => e.transaction_type === 'pawn')?.estimate || 0;
    const buyPercent = diamondEstimates.find(e => e.transaction_type === 'buy')?.estimate || 0;
    const retailPercent = diamondEstimates.find(e => e.transaction_type === 'retail')?.estimate || 0;
    const meltPercent = 98;
    return {
      pawn: Number((value * (pawnPercent / 100)).toFixed(2)),
      buy: Number((value * (buyPercent / 100)).toFixed(2)),
      melt: Number((value * (meltPercent / 100)).toFixed(2)), 
      retail: Number((value * (retailPercent / 100)).toFixed(2))
    };
  };
  
  const addDiamond = () => {
    const currentForm = getCurrentForm();
    const isPrimary = activeTab.startsWith('primary');
  
    // Check if we can add this type of gem
    const gemPosition = isPrimary ? 'primary' : 'secondary';
    if (addedGemTypes[gemPosition] === 'stone') {
      alert(`Please delete the existing ${gemPosition} stone before adding a diamond`);
      return;
    }

    // For primary gems, check if there's already one in the array
    if (isPrimary && (diamondSummary.some(d => d.isPrimary) || stoneSummary.some(s => s.isPrimary))) {
      alert('Only one primary gem (diamond or stone) is allowed. Please delete the existing primary gem first.');
      return;
    }

    const diamondValue = isPrimary ? estimatedValues.primaryDiamond : estimatedValues.secondaryDiamond;
    const estimates = calculateGemPriceEstimates(diamondValue);
    // Add new estimates to existing ones
    setPriceEstimates(prev => ({
      pawn: Number((prev.pawn + estimates.pawn).toFixed(2)),
      buy: Number((prev.buy + estimates.buy).toFixed(2)),
      melt: Number((prev.melt + estimates.melt).toFixed(2)),
      retail: Number((prev.retail + estimates.retail).toFixed(2))
    }));
    
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
      priceEstimates: estimates
    };

    handleAddDiamond(newItem, isPrimary);
    
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
      size: ''
    };
    setCurrentForm(resetForm);
    setCurrentShapeIndex(0);
    
    // Reset exact color to default
    setExactColor('D');
    
    // Reset valuation type to default
    setDiamondValuationType('each');
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

    // Check if we can add this type of gem
    const gemPosition = isPrimary ? 'primary' : 'secondary';
    if (addedGemTypes[gemPosition] === 'diamond') {
      alert(`Please delete the existing ${gemPosition} diamond before adding a stone`);
      return;
    }

    // For primary gems, check if there's already one in the array
    if (isPrimary && (diamondSummary.some(d => d.isPrimary) || stoneSummary.some(s => s.isPrimary))) {
      alert('Only one primary gem (diamond or stone) is allowed. Please delete the existing primary gem first.');
      return;
    }

    const stoneValue = isPrimary ? estimatedValues.primaryGemstone : estimatedValues.secondaryGemstone;
    const estimates = calculateGemPriceEstimates(stoneValue);
    
    // Add new estimates to existing ones
    setPriceEstimates(prev => ({
      pawn: Number((prev.pawn + estimates.pawn).toFixed(2)),
      buy: Number((prev.buy + estimates.buy).toFixed(2)),
      melt: Number((prev.melt + estimates.melt).toFixed(2)),
      retail: Number((prev.retail + estimates.retail).toFixed(2))
    }));

    const newStone = {
      name: currentForm.name,
      shape: currentForm.shape,
      weight: currentForm.weight,
      color: currentForm.color,
      quantity: currentForm.quantity,
      authentic: currentForm.authentic,
      isPrimary: isPrimary,
      type: 'stone',
      priceEstimates: estimates
    };

    handleAddStone(newStone, isPrimary);

    // Reset the form after adding
    if (activeTab.startsWith('primary')) {
      setPrimaryStoneForm(initialStoneForm);
    } else {
      setSecondaryStoneForm(initialStoneForm);
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
        <Grid item>
          <Typography variant="subtitle1" sx={{ mb: 0 }}>Size</Typography>
        </Grid>
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
    // Initialize transaction types from existing items or session storage
    setItemTransactionTypes(prev => {
      const newTypes = { ...prev };
      estimatedItems.forEach((item, index) => {
        // Use the item's transaction type if it exists, otherwise use the previous value or default to 'pawn'
        newTypes[index] = item.transactionType || prev[index] || 'pawn';
      });
      return newTypes;
    });
  }, [estimatedItems]);

  useEffect(() => {
    // Try to restore state from location or session storage
    if (!estimatedItems.length) {
      const savedState = sessionStorage.getItem('estimationState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        if (parsedState.items) {
          setEstimatedItems(parsedState.items);
        }
      }
    }
    // Clear the session storage after restoring items
    return () => {
      sessionStorage.removeItem('estimationState');
    };
  }, [estimatedItems.length]);

  useEffect(() => {
    // Focus on shape input when component mounts
    if (shapeRef.current) {
      shapeRef.current.focus();
    }
  }, []);

  const SliderStyled = styled(Slider)({});

  const handleTransactionTypeChange = (index, newType) => {
    setEstimatedItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        transaction_type: newType
      };
      return updatedItems;
    });
  };

  const handlePriceChange = (index, newPrice) => {
    setEstimatedItems(prevItems => {
      const updatedItems = [...prevItems];
      const item = { ...updatedItems[index] };
      
      // Update the price for the current transaction type
      item.price_estimates[item.transaction_type] = parseFloat(newPrice);
      updatedItems[index] = item;
      
      return updatedItems;
    });
  };

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [itemDetails, setItemDetails] = useState({
    brand: '',
    additionalInfo: '',
    isVintage: false,
    stamps: ''
  });

  const handleOpenDialog = (index) => {
    setSelectedItemIndex(index);
    const currentItem = estimatedItems[index];
    
    setItemDetails({
      brand: currentItem.brand || '',
      additionalInfo: currentItem.notes || '',  // Initialize additionalInfo with the item's notes
      isVintage: currentItem.vintage || false,
      stamps: currentItem.stamps || ''
    });
    
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItemIndex(null);
    setItemToEdit(null); // Clear the item being edited
  };

  const handleDetailChange = (field, value) => {
    if (selectedItemIndex === null) return;
    
    setItemDetails(prev => ({
      ...prev,
      [field]: value
    }));
    
    // If additionalInfo field is being changed, also update the notes field in estimatedItems
    if (field === 'additionalInfo') {
      setEstimatedItems(prevItems => {
        const updatedItems = [...prevItems];
        updatedItems[selectedItemIndex] = {
          ...updatedItems[selectedItemIndex],
          notes: value  // Update notes with the same value
        };
        return updatedItems;
      });
    }
  };

  const handleDetailSave = () => {
    setEstimatedItems(prevItems => {
      const updatedItems = [...prevItems];
      const updatedItem = {
        ...updatedItems[selectedItemIndex],
        brand: itemDetails.brand,
        notes: itemDetails.additionalInfo,
        vintage: itemDetails.isVintage,
        stamps: itemDetails.stamps
      };
      updatedItems[selectedItemIndex] = updatedItem;
      return updatedItems;
    });
    setOpenDialog(false);
    setSelectedItemIndex(null);
    setItemToEdit(null); // Clear the item being edited
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

  const handleBackToTicket = () => {
    navigate('/customer-ticket', { state: { customer } });
  };

  const handleAddToTicket = () => {
    const customerData = location.state?.customer;
    
    // Process items with a simplified approach similar to handleCheckout
    const processedItems = estimatedItems.map((item) => {
      // Preserve original images if they exist
      let itemImages = [];
      
      // If item already has images array, use it
      if (item.images && Array.isArray(item.images)) {
        itemImages = [...item.images]; // Create a copy to avoid reference issues
      } 
      // If item has a single image object, convert to array
      else if (item.image && (item.image.url || item.image.data)) {
        itemImages = [{
          url: item.image.url || '',
          data: item.image.data || null,
          isPrimary: true
        }];
      }
      
      // For testing, add a dummy image if no images exist
      if (itemImages.length === 0) {
        itemImages = [{
          url: 'https://via.placeholder.com/150',
          isPrimary: true
        }];
      }
      
      // Similar to handleCheckout, create a clean processed item
      return {
        ...item, // Include all item properties
        price: item.price_estimates[item.transaction_type],
        notes: item.notes,
        images: itemImages
      };
    });
    
    if (editMode && ticketItemId) {
      // In edit mode, we now only have one item (the edited one)
      // No need to search, just use the first item in the processed items
      if (processedItems.length > 0) {
        const editedItem = processedItems[0]; // Use the first item
        
        navigate('/customer-ticket', {
          state: {
            customer: customerData,
            updatedItem: editedItem, // Pass the single updated item
            ticketItemId: ticketItemId, // Pass the original ticket item ID
            fromEstimator: 'jewelry', // Special flag for the jewelry estimator
            from: 'jewelEstimator' // Keep original from flag for backward compatibility
          }
        });
        showSnackbar('Item updated successfully', 'success');
        return;
      }
    }
    
    // Default behavior for non-edit mode or if edited item not found
    navigate('/customer-ticket', {
      state: {
        customer: customerData,
        estimatedItems: processedItems,
        from: 'jewelEstimator'
      }
    });
  };

  const handleCheckout = () => {
    // Save the current state in session storage before navigating
    const updatedItems = estimatedItems.map((item) => ({
      ...item,
      price: item.price_estimates[item.transaction_type],
      notes: item.notes
    }));

    sessionStorage.setItem('estimationState', JSON.stringify({
      items: updatedItems
    }));
    
    // Add items to cart before navigation
    updatedItems.forEach(item => addToCart(item));
    
    const customerData = location.state?.customer;

    if (customerData) {
      // If customer exists, navigate to checkout page with customer and items
      console.log("items", updatedItems);
      navigate('/checkout', {
        state: {
          customer: customerData,
          items: updatedItems,
          from: 'jewelry'
        }
      });
    } else {
      // Otherwise, navigate to customer manager to select or create a customer
      navigate('/customer', {
        state: {
          items: updatedItems,
          from: 'jewelry'
        }
      });
    }
  };

  useEffect(() => {
    // Try to restore state from location or session storage
    if (!estimatedItems.length) {
      const savedState = sessionStorage.getItem('estimationState');

      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setAddMetal(parsedState.addMetal ? [parsedState.addMetal] : []);
        setDiamondSummary(parsedState.diamondSummary || []);
        setStoneSummary(parsedState.stoneSummary || []);
        setPriceEstimates(parsedState.priceEstimates || {
          pawn: 0,
          buy: 0,
          melt: 0,
          retail: 0
        });
      }
    }
  }, []);

  const handleAddDiamond = (newDiamond, isPrimary = true) => {
    // Calculate price estimates for the diamond
    const diamondValue = isPrimary ? estimatedValues.primaryDiamond : estimatedValues.secondaryDiamond;
    
    // Calculate the price estimates
    const estimates = calculateGemPriceEstimates(diamondValue);
    
    // Add the diamond with its value and price estimates
    const diamondWithValue = {
      ...newDiamond,
      estimatedValue: diamondValue,
      priceEstimates: estimates
    };
    setDiamondSummary(prev => [...prev, diamondWithValue]);
    
    // Update the added gem types
    setAddedGemTypes(prev => ({
      ...prev,
      [isPrimary ? 'primary' : 'secondary']: 'diamond'
    }));
  };

  const handleAddStone = (newStone, isPrimary = true) => {
    // Calculate price estimates for the stone
    const stoneValue = isPrimary ? estimatedValues.primaryGemstone : estimatedValues.secondaryGemstone;
    
    // Calculate the price estimates
    const estimates = calculateGemPriceEstimates(stoneValue);
    
    // Add the stone with its value and price estimates
    const stoneWithValue = {
      ...newStone,
      estimatedValue: stoneValue,
      priceEstimates: estimates
    };
    setStoneSummary(prev => [...prev, stoneWithValue]);
    
    // Update the added gem types
    setAddedGemTypes(prev => ({
      ...prev,
      [isPrimary ? 'primary' : 'secondary']: 'stone'
    }));
  };

  return (
    <Container maxWidth="lg" sx={{ pt: 4 }}>
      {/* Back to Ticket Button */}
      {location.state?.customer && (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<KeyboardBackspaceIcon />}
          onClick={handleBackToTicket}
          sx={{ mb: 2 }}
        >
          Back to Ticket
        </Button>
      )}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Metal Estimation Section */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '80vh', overflow: 'auto' }}>
            <MetalEstimator 
              onMetalValueChange={handleTotalMetalValueChange}
              onAddMetal={handleAddMetal}
              setMetalFormState={handleMetalFormChange}
              initialData={location.state?.itemToEdit} />
          </Paper>
        </Grid>

        {/* Gem Estimation Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '80vh', overflow: 'auto' }}>
            <GemEstimator 
              onGemValueChange={handleTotalGemValueChange}
              onAddGem={handleAddGem}
              setGemFormState={handleGemFormChange}
              initialData={location.state?.itemToEdit} 
            />
          </Paper>
        </Grid>


        {/* Summary Section */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '80vh', overflow: 'auto' }}>
            <Typography variant="h6">Images{isCameraEnabled && ' *'}</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUpload />}
                sx={{ flex: 1 }}
              >
                Upload
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                />
              </Button>
              <Button
                variant="outlined"
                onClick={showCamera ? stopCamera : startCamera}
                startIcon={<PhotoCamera />}
                sx={{ flex: 1 }}
              >
                {showCamera ? 'Stop' : 'Camera'}
              </Button>
            </Box>

            {/* Camera Preview */}
            {showCamera && (
              <Box sx={{ position: 'relative', mb: 2 }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{ width: '100%', borderRadius: '8px' }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <Button
                    variant="contained"
                    onClick={captureImage}
                    startIcon={<PhotoCamera />}
                    size="small"
                  >
                    Capture
                  </Button>
                </Box>
              </Box>
            )}

            {/* Image Gallery */}
            {images.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Button onClick={handlePrevImage} disabled={currentImageIndex === 0} >◀</Button>
              <img src={images[currentImageIndex].url} alt="image" style={{ width: '50%', height: '100px', cursor: 'pointer', objectFit: 'cover' }} onClick={() => openPopup(currentImageIndex)}/>
              <Button onClick={handleNextImage} disabled={currentImageIndex === images.length - 1}>▶</Button>
            </Box>
            )}

            <ImagePopup images={images} index={popupImageIndex}/>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 0 }}>Price Estimates</Typography>
              <Box sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden'
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  p: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}>
                  <Typography variant="subtitle1" sx={{ flex: 1, color: 'text.secondary' }}>
                    Pawn Value: $
                  </Typography>
                  <TextField
                    size="small"
                    type="decimal"
                    value={priceEstimates.pawn}
                    variant="standard"
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      setPriceEstimates(prev => ({ ...prev, pawn: newValue }));
                    }}
                    inputProps={{ 
                      min: 0,
                      inputMode: 'decimal',
                      pattern: '[0-9]*\\.?[0-9]*',
                      style: { width: '70px' }
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

                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  p: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}>
                  <Typography variant="subtitle1" sx={{ flex: 1, color: 'text.secondary' }}>
                    Buy Value: $
                  </Typography>
                  <TextField 
                    size="small"
                    type="decimal"
                    value={priceEstimates.buy}
                    variant="standard"
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      setPriceEstimates(prev => ({ ...prev, buy: newValue }));
                    }}
                    inputProps={{ 
                      min: 0,
                      inputMode: 'decimal',
                      pattern: '[0-9]*\\.?[0-9]*',
                      style: { width: '70px' }
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

                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  p: 1.5,
                  '&:hover': { bgcolor: 'action.hover' }
                }}>
                  <Typography variant="subtitle1" sx={{ flex: 1, color: 'text.secondary', ml: 0 }}>
                    Melt Value: $
                  </Typography>
                  <TextField 
                    size="small"
                    type="decimal"
                    value={priceEstimates.melt}
                    variant="standard"
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      setPriceEstimates(prev => ({ ...prev, melt: newValue }));
                    }}
                    inputProps={{ 
                      min: 0,
                      inputMode: 'decimal',
                      pattern: '[0-9]*\\.?[0-9]*',
                      style: { width: '70px' }
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

                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  p: 1.5,
                  '&:hover': { bgcolor: 'action.hover' }
                }}>
                  <Typography variant="subtitle1" sx={{ flex: 1, color: 'text.secondary', ml: 0 }}>
                    Retail Value: $
                  </Typography>
                  <TextField 
                    size="small"
                    type="decimal"
                    value={priceEstimates.retail}
                    variant="standard"
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      setPriceEstimates(prev => ({ ...prev, retail: newValue }));
                    }}
                    inputProps={{ 
                      min: 0,
                      inputMode: 'decimal',
                      pattern: '[0-9]*\\.?[0-9]*',
                      style: { width: '70px' }
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
              </Box>
            </Box>

            <Typography variant="h6" sx={{ mt: 2 }}>SUMMARY</Typography>
            <Grid container spacing={2} >
            {addMetal
              // Filter out the item being edited (if any)
            
              .filter(metal => {
                // Check for items being edited via navigation
                if (location.state?.itemToEdit) {
                  // Check if this is the item being edited by comparing key properties
                  const isEditingThisItem = (
                    metal.preciousMetalType === location.state.itemToEdit.preciousMetalType &&
                    metal.weight === location.state.itemToEdit.weight &&
                    metal.purity?.id === location.state.itemToEdit.purity?.id ||
                    metal.purity?.value === location.state.itemToEdit.metal_purity ||
                    metal.estimatedValue === location.state.itemToEdit.estimatedValue
                  );
                  
                  // Return false to filter out items that are being edited
                  if (isEditingThisItem) return false;
                }
                
                // Check for items being edited via dialog
                if (itemToEdit && selectedItemIndex !== null) {
                  // Check metal properties against the metal in the editing item
                  const dialogEditItem = itemToEdit;
                  if (dialogEditItem.precious_metal_type === metal.preciousMetalType &&
                      dialogEditItem.metal_weight === metal.weight &&
                      (dialogEditItem.metal_purity === metal.purity?.value || 
                       dialogEditItem.metal_purity === metal.purity?.purity)) {
                    return false;
                  }
                }
                
                // If not being edited in either way, keep the item
                return true;
              })
              .map((metal, index) => (
                <Grid item xs={12} key={index}>
                    <Paper sx={{ p: 2, border: '1px solid black', borderRadius: 1, position: 'relative' }}>
                      <div>
                        <Typography variant="subtitle2">Metal</Typography>
                        <Typography variant="body2">Precious Metal Type: {metal.precious_metal_type}</Typography>
                        <Typography variant="body2">Non Precious Metal Type: {metal.non_precious_metal_type}</Typography>
                        <Typography variant="body2">Purity: {metal.metal_purity || metal.purity_value}</Typography>
                        <Typography variant="body2">Category: {metal.metal_category}</Typography>
                        <Typography variant="body2">Color: {metal.color}</Typography>
                        <Typography variant="body2">Weight: {metal.metal_weight}g</Typography>
                        <Typography variant="body2">Estimated Value: ${metal.estimated_value.toFixed(2)}</Typography>
                        </div>
                        <IconButton variant="outlined" onClick={() => handleDeleteMetal(index)}
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  minWidth: 'auto'
                              }}
                          >
                              <DeleteIcon />
                          </IconButton>
                    </Paper>
                </Grid>
            ))}
        </Grid>

            <Grid container spacing={2} sx={{ mt: 0.25 }}>
                {diamondSummary
                  // Filter out diamonds being edited
                  .filter(diamond => {
                    // If editing via dialog and this diamond is in the item being edited, filter it out
                    if (itemToEdit && selectedItemIndex !== null) {
                      if (itemToEdit.diamonds && itemToEdit.diamonds.some(d => 
                        d.shape === diamond.shape && 
                        d.weight === diamond.weight && 
                        d.clarity === diamond.clarity
                      )) {
                        return false;
                      }
                    }
                    
                    // If editing via navigation
                    if (location.state?.itemToEdit && location.state.itemToEdit.diamonds) {
                      if (location.state.itemToEdit.diamonds.some(d => 
                        d.shape === diamond.shape && 
                        d.weight === diamond.weight && 
                        d.clarity === diamond.clarity
                      )) {
                        return false;
                      }
                    }
                    
                    return true;
                  })
                  .map((diamond, index) => (
                    <Grid item xs={12} key={index}>
                        <Paper sx={{ p: 2, border: '1px solid black', borderRadius: 1, position: 'relative'}}>
                          <div>
                            <Typography variant="subtitle2">{diamond.isPrimary ? 'Primary' : 'Secondary'} Diamond</Typography>
                            <Typography variant="body2">Shape: {diamond.shape}</Typography>
                            <Typography variant="body2">Clarity: {diamond.clarity}</Typography>
                            <Typography variant="body2">Color: {diamond.color}</Typography>
                            <Typography variant="body2">Cut: {diamond.cut}</Typography>
                            <Typography variant="body2">Weight: {diamond.weight}</Typography>
                            <Typography variant="body2">Quantity: {diamond.quantity}</Typography>
                            <Typography variant="body2">Lab Grown: {diamond.labGrown ? 'Yes' : 'No'}</Typography>
                            <Typography variant="body2">Exact Color: {diamond.exactColor}</Typography>
                          </div>
                          <IconButton variant="outlined" onClick={() => handleDeleteGem(index, diamond.type, diamond.isPrimary)}
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  minWidth: 'auto'
                              }}
                          >
                              <DeleteIcon />
                          </IconButton>
                          </Paper>
                    </Grid>
                ))}
            </Grid>
            
            <Grid container spacing={2} sx={{ mt: 0.25 }}>
                {gemSummary.map((gem, index) => (
                  <Grid item xs={12} key={`gem-${index}`}>
                    <Paper sx={{ p: 2, border: '1px solid black', borderRadius: 1, position: 'relative'}}>
                      <div>
                        <Typography variant="subtitle2">{gem.isPrimary ? 'Primary' : 'Secondary'} {gem.type.charAt(0).toUpperCase() + gem.type.slice(1)}</Typography>
                        {gem.type === 'diamond' && (
                          <>
                            <Typography variant="body2">Shape: {gem.shape}</Typography>
                            <Typography variant="body2">Clarity: {gem.clarity}</Typography>
                            <Typography variant="body2">Color: {gem.color}</Typography>
                            <Typography variant="body2">Cut: {gem.cut}</Typography>
                            <Typography variant="body2">Weight: {gem.weight}</Typography>
                            <Typography variant="body2">Quantity: {gem.quantity}</Typography>
                            <Typography variant="body2">Lab Grown: {gem.labGrown ? 'Yes' : 'No'}</Typography>
                            <Typography variant="body2">Exact Color: {gem.exactColor}</Typography>
                            <Typography variant="body2">Value: ${gem.value ? gem.value.toFixed(2) : '0.00'}</Typography>
                          </>
                        )}
                        {gem.type === 'stone' && (
                          <>
                            <Typography variant="body2">Type: {gem.name}</Typography>
                            <Typography variant="body2">Shape: {gem.shape}</Typography>
                            <Typography variant="body2">Color: {gem.color}</Typography>
                            <Typography variant="body2">Weight: {gem.weight}</Typography>
                            <Typography variant="body2">Quantity: {gem.quantity}</Typography>
                            <Typography variant="body2">Authentic: {gem.authentic ? 'Yes' : 'No'}</Typography>
                            <Typography variant="body2">Value: ${gem.value ? gem.value.toFixed(2) : '0.00'}</Typography>
                          </>
                        )}
                      </div>
                      <IconButton 
                        variant="outlined" 
                        onClick={() => handleDeleteFromGemSummary(index)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          minWidth: 'auto'
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Paper>
                  </Grid>
                ))}
            </Grid>
            
            <Grid container spacing={2} sx={{ mt: 0.25 }}>
                {stoneSummary
                  // Filter out stones being edited
                  .filter(stone => {
                    // If editing via dialog and this stone is in the item being edited, filter it out
                    if (itemToEdit && selectedItemIndex !== null) {
                      if (itemToEdit.stones && itemToEdit.stones.some(s => 
                        s.name === stone.name && 
                        s.weight === stone.weight && 
                        s.shape === stone.shape
                      )) {
                        return false;
                      }
                    }
                    
                    // If editing via navigation
                    if (location.state?.itemToEdit && location.state.itemToEdit.stones) {
                      if (location.state.itemToEdit.stones.some(s => 
                        s.name === stone.name && 
                        s.weight === stone.weight && 
                        s.shape === stone.shape
                      )) {
                        return false;
                      }
                    }
                    
                    return true;
                  })
                  .map((stone, index) => (
                    <Grid item xs={12} key={index}>
                        <Paper sx={{ p: 2, border: '1px solid black', borderRadius: 1, position: 'relative'}}>
                          <div>
                            <Typography variant="subtitle2">{stone.isPrimary ? 'Primary' : 'Secondary'} Stone</Typography>
                            <Typography variant="body2">Type: {stone.name}</Typography>
                            <Typography variant="body2">Shape: {stone.shape}</Typography>
                            <Typography variant="body2">Color: {stone.color}</Typography>
                            <Typography variant="body2">Weight: {stone.weight}</Typography>
                            <Typography variant="body2">Quantity: {stone.quantity}</Typography>
                            <Typography variant="body2">Authentic: {stone.authentic ? 'Yes' : 'No'}</Typography>
                            </div>
                            <IconButton variant="outlined" onClick={() => handleDeleteGem(index, stone.type, stone.isPrimary)}
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  minWidth: 'auto'
                              }}
                          >
                              <DeleteIcon />
                          </IconButton>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Finish Button */} 
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleFinishEstimation}
              disabled={addMetal.length === 0 || (isCameraEnabled && images.length === 0)}
              fullWidth
            >
              Finish
            </Button>
          </Box>
    </Paper>
    </Grid>
      </Grid>

      <Grid container spacing={0} sx={{ mt: 0 }}>
        {/* Estimated Items Section */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Estimated Items
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>Image</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>Transaction Type</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>Price</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {estimatedItems
                    // Modified filter to properly handle items in edit mode
                    .filter((item, index) => {
                      // Always show items that were just added (they won't have an ID yet or will have a new timestamp)
                      const isNewlyAdded = item._timestamp && (Date.now() - item._timestamp < 10000);
                      if (isNewlyAdded) {
                        return true;
                      }

                      // If no item is being edited, show all items
                      if (!itemToEdit && !location.state?.itemToEdit) {
                        return true;
                      }
                      
                      // If an item is currently being edited in the dialog, don't show the original
                      if (itemToEdit && index === selectedItemIndex) {
                        return false;
                      }
                      
                      // For items from navigation, only hide the exact one being edited
                      // by comparing ID instead of properties
                      if (location.state?.itemToEdit && location.state?.ticketItemId) {
                        if (item.originalTicketItemId === location.state.ticketItemId) {
                          return false;
                        }
                      }
                      
                      return true;
                    })
                    .map((item, index) => (
                    <TableRow 
                      key={index}
                      sx={{ 
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          '& .action-buttons': {
                            opacity: 1
                          }
                        }
                      }}
                    >
                      <TableCell>
                          <img 
                            src={item.images?.find(img => img.isPrimary)?.url || item.images?.[0]?.url || ''} 
                            alt="No image" 
                            style={{ width: '50px', height: '50px', objectFit: 'cover' }} 
                          />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box>
                            <Typography sx={{ fontWeight: 500, mb: 0.2 }}>
                              {item.metal_weight}g {item.metal_purity} {item.precious_metal_type === 'Gold' && item.jewelry_color ? `${item.jewelry_color[0]}` : ''} {item.precious_metal_type} {item.primary_gem_type ? item.primary_gem_type.split(' ')[0] : ''} {item.secondary_gem_type ? item.secondary_gem_type.split(' ')[0] : ''} {item.metal_category}
                            </Typography>
                            <TextField
                              variant="standard"
                              size="small"
                              placeholder="Add description"
                              onChange={async (e) => {
                                const newValue = e.target.value;
                                
                                // Update local state
                                setEstimatedItems(prevItems => {
                                  const updatedItems = [...prevItems];
                                  const itemIndex = updatedItems.findIndex(i => i.item_id === item.item_id);
                                  if (itemIndex !== -1) {
                                    updatedItems[itemIndex] = {
                                      ...updatedItems[itemIndex],
                                      notes: newValue
                                    };
                                    
                                    // If this item's details dialog is currently open, update additionalInfo there too
                                    if (openDialog && selectedItemIndex === itemIndex) {
                                      setItemDetails(prev => ({
                                        ...prev,
                                        additionalInfo: newValue
                                      }));
                                    }
                                  }
                                  return updatedItems;
                                });
                              }}
                              value={item.notes || ''}
                              sx={{ mt: 0.2, '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
                              fullWidth
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={item.transaction_type || 'pawn'}
                          onChange={(e) => handleTransactionTypeChange(index, e.target.value)}
                          size="small"
                          sx={{ 
                            minWidth: 150,
                            '& .MuiSelect-select': {
                              py: 1
                            }
                          }}
                        >
                          <MenuItem value="pawn">
                            <Box>
                              <Typography variant="body2">Pawn</Typography>
                              <Typography variant="caption" color="text.secondary">
                                ${(item.price_estimates?.["pawn"] || 0)}
                              </Typography>
                            </Box>
                          </MenuItem>
                          <MenuItem value="buy">
                            <Box>
                              <Typography variant="body2">Buy</Typography>
                              <Typography variant="caption" color="text.secondary">
                                ${(item.price_estimates?.["buy"] || 0)}
                              </Typography>
                            </Box>
                          </MenuItem>
                          <MenuItem value="retail">
                            <Box>
                              <Typography variant="body2">Retail</Typography>
                              <Typography variant="caption" color="text.secondary">
                                ${(item.price_estimates?.["retail"] || 0)}
                              </Typography>
                            </Box>
                          </MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <TextField 
                          type="number"
                          value={
                            item.transaction_type === 'pawn' ? (item.price_estimates?.["pawn"] || 0) :
                            item.transaction_type === 'buy' ? (item.price_estimates?.["buy"] || 0):
                            item.transaction_type === 'retail' ? (item.price_estimates?.["retail"] || 0) :
                            0
                          }
                          onChange={(e) => handlePriceChange(index, e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            sx: {
                              '& input': {
                                py: 1
                              }
                            }
                          }}
                          size="small"
                          sx={{ width: 150 }}
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Box className="action-buttons" sx={{ 
                          opacity: 0.7,
                          transition: 'opacity 0.2s',
                          display: 'flex',
                          gap: 1 
                        }}>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(index);
                            }}
                            size="small"
                            sx={{ color: 'primary.main' }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              const newItems = [...estimatedItems];
                              newItems.splice(index, 1);
                              setEstimatedItems(newItems);
                            }}
                            size="small"
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Typography variant="h6">
                Total Price: ${estimatedItems.reduce((total, item) => {
                  const price = item.transaction_type === 'pawn' ? (item.price_estimates?.['pawn'] || 0) :
                               item.transaction_type === 'buy' ? (item.price_estimates?.['buy'] || 0) :
                               item.transaction_type === 'retail' ? (item.price_estimates?.['retail'] || 0) : 0;
                  return total + parseFloat(price);
                }, 0).toFixed(2)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleAddToTicket}
                  disabled={estimatedItems.length === 0}
                >
                  Add to Ticket
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCheckout}
                  disabled={estimatedItems.length === 0}
                  startIcon={<ArrowForwardIcon />}
                >
                  Proceed to Checkout
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={1} sx={{ mt: 3 }}>
        {/* Remove the standalone image section */}
      </Grid>

      {/* Details Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Item Details</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Brand"
              value={selectedItemIndex !== null ? itemDetails.brand || '' : ''}
              onChange={(e) => handleDetailChange('brand', e.target.value)}
              fullWidth
            />
            <TextField
              label="Additional Information/Damages"
              value={selectedItemIndex !== null ? itemDetails.additionalInfo || '' : ''}
              onChange={(e) => handleDetailChange('additionalInfo', e.target.value)}
              multiline
              rows={4}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedItemIndex !== null ? itemDetails.isVintage || false : false}
                  onChange={(e) => handleDetailChange('isVintage', e.target.checked)}
                />
              }
              label="Vintage"
            />
            <TextField
              label="Stamps/Engraving"
              value={selectedItemIndex !== null ? itemDetails.stamps || '' : ''}
              onChange={(e) => handleDetailChange('stamps', e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleDetailSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default JewelEstimator;
