import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Container, Card, CardContent,
  CardMedia, Divider, Chip, Button, Avatar, Stack, Tabs, Tab, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, CircularProgress,
  List, ListItem, ListItemText, ListItemAvatar, Menu, MenuItem, Checkbox
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import config from '../config';
import { useAuth } from '../context/AuthContext';
import MetalEstimator from './MetalEstimator';
import GemEstimator from './GemEstimator';
import JewelEstimator from './JewelEstimator';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import InventoryIcon from '@mui/icons-material/Inventory';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import DiamondIcon from '@mui/icons-material/Diamond';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import WatchIcon from '@mui/icons-material/Watch';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ClearIcon from '@mui/icons-material/Clear';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SecurityIcon from '@mui/icons-material/Security';

// Helper function to convert buffer to data URL for image preview
function bufferToDataUrl(bufferObj) {
  if (!bufferObj || !bufferObj.data) return null;
  const base64 = btoa(
    new Uint8Array(bufferObj.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return `data:image/jpeg;base64,${base64}`;
}

// Wrapper component to pass props to JewelEstimator in dialog
const JewelEstimatorWrapper = ({ prefilledData, onCancel, onSave, transactionType }) => {
  return (
    <JewelEstimator
      prefilledData={prefilledData}
      inDialog={true}
      onDialogCancel={onCancel}
      onDialogSave={onSave}
      transactionType={transactionType}
    />
  );
};

const CustomerTicket = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // State for customer lookup mode
  const [showLookupForm, setShowLookupForm] = useState(false);
  const [searchForm, setSearchForm] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    phone: ''
  });
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openSearchDialog, setOpenSearchDialog] = useState(false);
  const [selectedSearchIdx, setSelectedSearchIdx] = useState(0);
  const [snackbarMessage, setSnackbarMessage] = useState({ open: false, message: '', severity: 'info' });

  // Camera capture state
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [currentCaptureItemId, setCurrentCaptureItemId] = useState(null);
  const [currentCaptureItemType, setCurrentCaptureItemType] = useState(null); // 'pawn', 'buy', 'trade', 'sale', 'repair', 'payment', 'refund', 'redeem'
  const [videoStream, setVideoStream] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  // Combined estimator dialog state
  const [combinedDialogOpen, setCombinedDialogOpen] = useState(false);
  const [metalFormState, setMetalFormState] = useState(null);
  const [gemFormState, setGemFormState] = useState({ diamonds: [], stones: [], secondaryGems: [] });
  const [currentEditingItemId, setCurrentEditingItemId] = useState(null);
  const [prefilledData, setPrefilledData] = useState(null);
  const [addedMetals, setAddedMetals] = useState([]);
  const [addedGems, setAddedGems] = useState([]);

  // Metal categories from database
  const [metalCategories, setMetalCategories] = useState([]);
  const [categoryCodeMap, setCategoryCodeMap] = useState({});

  // Metal colors and precious metal types from database
  const [metalColors, setMetalColors] = useState([]);
  const [colorCodeMap, setColorCodeMap] = useState({});
  const [preciousMetalTypes, setPreciousMetalTypes] = useState([]);
  const [metalTypeCodeMap, setMetalTypeCodeMap] = useState({});

  // Handle input change for search form
  const handleLookupInputChange = (e) => {
    const { name, value } = e.target;
    setSearchForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Show snackbar message
  const showSnackbar = (message, severity = 'info') => {
    setSnackbarMessage({ open: true, message, severity });
    setTimeout(() => {
      setSnackbarMessage(prev => ({ ...prev, open: false }));
    }, 6000);
  };

  // Handle search customer
  const handleSearchCustomer = async () => {
    if (!searchForm.first_name && !searchForm.last_name && !searchForm.id_number && !searchForm.phone) {
      showSnackbar('Please enter at least one search criteria', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const params = {};
      if (searchForm.first_name && searchForm.first_name.trim()) params.first_name = searchForm.first_name.trim();
      if (searchForm.last_name && searchForm.last_name.trim()) params.last_name = searchForm.last_name.trim();
      if (searchForm.id_number && searchForm.id_number.trim()) params.id_number = searchForm.id_number.trim();
      if (searchForm.phone && searchForm.phone.trim()) params.phone = searchForm.phone.trim();
      
      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(`${config.apiUrl}/customers/search?${queryParams}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to search customers');
      const data = await response.json();
      
      setSearchResults(data);
      
      if (data.length === 0) {
        showSnackbar('No customers found. You can register a new customer.', 'info');
      } else if (data.length === 1) {
        // If only one customer found, select them automatically
        handleSelectCustomer(data[0]);
      } else {
        // If multiple customers, open dialog
        setOpenSearchDialog(true);
        setSelectedSearchIdx(0); // auto-select first
      }
    } catch (error) {
      showSnackbar(`Error searching customers: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle editing customer
  const handleEditCustomer = async () => {
    if (!customer) {
      showSnackbar('No customer selected to edit', 'warning');
      return;
    }
    
    // Format date function
    const formatDate = (date) => {
      if (!date) return '';
      if (typeof date === 'string' && date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) return date;
      const d = new Date(date);
      if (isNaN(d)) return '';
      return d.toISOString().substring(0, 10);
    };
    
    // Helper function to convert dataURL to File object
    const urlToFile = async (url, filename = 'customer-photo.jpg') => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const mime = blob.type || 'image/jpeg';
        return new File([blob], filename, { type: mime });
      } catch (e) { return null; }
    };
    
    // Process main customer photo
    let imageValue = null;
    if (customer.image && typeof customer.image === 'object' && customer.image.type === 'Buffer') {
      imageValue = bufferToDataUrl(customer.image);
    } else if (typeof customer.image === 'string' && customer.image.startsWith('http')) {
      imageValue = await urlToFile(customer.image, `customer-photo-${customer.id || Date.now()}.jpg`);
    } else {
      imageValue = customer.image || null;
    }
    
    // Process ID front image
    let idImageFront = null;
    if (customer.id_image_front && typeof customer.id_image_front === 'object') {
      // Handle Buffer type from database
      if (customer.id_image_front.type === 'Buffer' || customer.id_image_front.data) {
        idImageFront = bufferToDataUrl(customer.id_image_front);
      } else {
        idImageFront = customer.id_image_front;
      }
    }
    
    // Process ID back image
    let idImageBack = null;
    if (customer.id_image_back && typeof customer.id_image_back === 'object') {
      // Handle Buffer type from database
      if (customer.id_image_back.type === 'Buffer' || customer.id_image_back.data) {
        idImageBack = bufferToDataUrl(customer.id_image_back);
      } else {
        idImageBack = customer.id_image_back;
      }
    }
    
    // Prepare customer data with all fields
    const preparedCustomer = {
      ...customer,
      first_name: customer.first_name || '', 
      last_name: customer.last_name || '', 
      email: customer.email || '', 
      phone: customer.phone || '', 
      address_line1: customer.address_line1 || '', 
      address_line2: customer.address_line2 || '', 
      city: customer.city || '', 
      state: customer.state || '', 
      postal_code: customer.postal_code || '', 
      country: customer.country || '', 
      id_type: customer.id_type || '', 
      id_number: customer.id_number || '', 
      id_expiry_date: formatDate(customer.id_expiry_date), 
      date_of_birth: formatDate(customer.date_of_birth), 
      status: customer.status || 'active', 
      risk_level: customer.risk_level || 'normal', 
      notes: customer.notes || '', 
      gender: customer.gender || '', 
      height: customer.height || '', 
      weight: customer.weight || '', 
      image: imageValue,
      id_image_front: idImageFront,
      id_image_back: idImageBack
    };
    
    // Navigate to the CustomerEditor page with the prepared customer data
    navigate('/customer-editor', { 
      state: { 
        customer: preparedCustomer,
        mode: 'edit',
        returnTo: '/customer-ticket'
      }
    });
  };

  // Handle customer selection from search results
  const handleSelectCustomer = (customerData) => {
    // Format the selected customer for the ticket
    const selectedCustomer = {
      ...customerData,
      name: `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim(),
      image: customerData.image && typeof customerData.image === 'object' && customerData.image.type === 'Buffer' ? bufferToDataUrl(customerData.image) : customerData.image
    };
    
    // Update the customer state and save to session storage
    setCustomer(selectedCustomer);
    sessionStorage.setItem('selectedCustomer', JSON.stringify(selectedCustomer));
    
    // Close dialogs and clear search form
    setShowLookupForm(false);
    setOpenSearchDialog(false);
    setSearchForm({ name: '', id_number: '', phone: '' });
    
    // Show success message
    showSnackbar(`Customer ${selectedCustomer.name} selected`, 'success');
  };
  
  // Toggle back to customer details
  const handleCancelLookup = () => {
    setShowLookupForm(false);
  };

  // Camera capture functions
  const handleOpenCamera = (itemId, itemType) => {
    setCurrentCaptureItemId(itemId);
    setCurrentCaptureItemType(itemType);
    setCameraDialogOpen(true);
  };

  const handleCloseCamera = () => {
    // Stop video stream
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setCameraDialogOpen(false);
    setCurrentCaptureItemId(null);
    setCurrentCaptureItemType(null);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back camera on mobile
      });
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      showSnackbar('Unable to access camera. Please check permissions.', 'error');
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

    // Update the appropriate item type with the captured image
    const updateItemImages = (prevItems) =>
      prevItems.map(item =>
        item.id === currentCaptureItemId
          ? {
              ...item,
              images: [{ url: imageDataUrl, isPrimary: true }]
            }
          : item
      );

    switch (currentCaptureItemType) {
      case 'pawn':
        setPawnItems(updateItemImages);
        break;
      case 'buy':
        setBuyItems(updateItemImages);
        break;
      case 'trade':
        setTradeItems(updateItemImages);
        break;
      case 'sale':
        setSaleItems(updateItemImages);
        break;
      case 'repair':
        setRepairItems(updateItemImages);
        break;
      case 'payment':
        setPaymentItems(updateItemImages);
        break;
      case 'refund':
        setRefundItems(updateItemImages);
        break;
      case 'redeem':
        setRedeemItems(updateItemImages);
        break;
      default:
        break;
    }

    showSnackbar('Image captured successfully', 'success');
    handleCloseCamera();
  };

  // Start camera when dialog opens
  React.useEffect(() => {
    if (cameraDialogOpen) {
      startCamera();
    }
  }, [cameraDialogOpen]);

  // Cleanup camera stream on unmount
  React.useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  // Fetch metal categories, colors, and types on component mount
  React.useEffect(() => {
    const fetchMetalData = async () => {
      try {
        // Fetch metal categories
        const categoriesResponse = await fetch(`${config.apiUrl}/metal_category`);
        if (categoriesResponse.ok) {
          const categories = await categoriesResponse.json();
          setMetalCategories(categories);

          // Create a map of category_code to category name
          const categoryMap = {};
          categories.forEach(cat => {
            if (cat.category_code) {
              categoryMap[cat.category_code] = cat.category;
            }
          });
          setCategoryCodeMap(categoryMap);
        }

        // Fetch metal colors
        const colorsResponse = await fetch(`${config.apiUrl}/metal_color`);
        if (colorsResponse.ok) {
          const colors = await colorsResponse.json();
          setMetalColors(colors);

          // Create a map of color_code to color name
          const colorMap = {};
          colors.forEach(color => {
            if (color.color_code) {
              colorMap[color.color_code] = color.color;
            }
          });
          setColorCodeMap(colorMap);
        }

        // Fetch precious metal types
        const typesResponse = await fetch(`${config.apiUrl}/precious_metal_type`);
        if (typesResponse.ok) {
          const types = await typesResponse.json();
          setPreciousMetalTypes(types);

          // Create a map of type_code to type name
          const typeMap = {};
          types.forEach(type => {
            if (type.type_code) {
              typeMap[type.type_code] = type.type;
            }
          });
          setMetalTypeCodeMap(typeMap);
        }
      } catch (error) {
        console.error('Error fetching metal data:', error);
      }
    };

    fetchMetalData();
  }, []);

  // Mocked portfolio KPI data (would be fetched from API in production)
  const portfolioData = {
    totalValue: Math.floor(Math.random() * 10000) + 500,
    transactions: Math.floor(Math.random() * 20) + 1,
    itemsCount: Math.floor(Math.random() * 15) + 1
  };

  const { user } = useAuth(); // Get user at component level

  // Pawn configuration for calculations
  const [interestRate, setInterestRate] = React.useState(2.9);
  const [frequencyDays, setFrequencyDays] = React.useState(30);

  // Customer's pawn transactions (loans)
  const [customerLoans, setCustomerLoans] = React.useState([]);

  // Get customer from location state or session storage
  const [customer, setCustomer] = React.useState(() => {
    // First try to get customer from navigation state
    if (location.state?.customer) {
      // Save to session storage for persistence
      sessionStorage.setItem('selectedCustomer', JSON.stringify(location.state.customer));
      return location.state.customer;
    }

    // If not in navigation state, try session storage
    const savedCustomer = sessionStorage.getItem('selectedCustomer');
    if (savedCustomer) {
      return JSON.parse(savedCustomer);
    }

    // No customer found
    return null;
  });
  
  const estimatedItems = location.state?.estimatedItems || [];
  const from = location.state?.from || '';

  // State for customer validation - required fields per transaction type
  const [requiredFieldsMap, setRequiredFieldsMap] = React.useState({
    pawn: [],
    buy: [],
    retail: [],
    sale: [],
    refund: [],
    return: []
  });
  const [customerValidationErrors, setCustomerValidationErrors] = React.useState([]);
  const [isValidatingCustomer, setIsValidatingCustomer] = React.useState(false);

  // Restore active tab from sessionStorage if available
  const [activeTab, setActiveTab] = React.useState(() => {
    const savedTab = sessionStorage.getItem('activeTicketTab');
    return savedTab !== null ? parseInt(savedTab, 10) : 0;
  });

  // Save active tab to sessionStorage whenever it changes
  React.useEffect(() => {
    sessionStorage.setItem('activeTicketTab', activeTab.toString());
  }, [activeTab]);

  // Automatically show customer lookup form if no customer is selected
  React.useEffect(() => {
    if (!customer) {
      setShowLookupForm(true);
    }
  }, [customer]);

  // Reload customer data when returning from customer editor
  React.useEffect(() => {
    const reloadCustomer = async () => {
      if (location.state?.customerUpdated && customer?.id) {
        try {
          const response = await fetch(`${config.apiUrl}/customers/${customer.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });

          if (response.ok) {
            const updatedCustomer = await response.json();

            // Format the customer data
            const formattedCustomer = {
              ...updatedCustomer,
              name: `${updatedCustomer.first_name || ''} ${updatedCustomer.last_name || ''}`.trim(),
              image: updatedCustomer.image && typeof updatedCustomer.image === 'object' && updatedCustomer.image.type === 'Buffer'
                ? bufferToDataUrl(updatedCustomer.image)
                : updatedCustomer.image
            };

            setCustomer(formattedCustomer);
            sessionStorage.setItem('selectedCustomer', JSON.stringify(formattedCustomer));
            showSnackbar('Customer information updated', 'success');
          }
        } catch (error) {
          console.error('Error reloading customer:', error);
        }
      }
    };

    reloadCustomer();
  }, [location.state?.customerUpdated]);

  // State for convert dropdown menu
  const [convertMenuAnchor, setConvertMenuAnchor] = React.useState(null);
  const [convertItemId, setConvertItemId] = React.useState(null);

  // Store buyTicketId when editing from cart to preserve ticket grouping
  const [preservedBuyTicketId, setPreservedBuyTicketId] = React.useState(null);
  
  // Helper function to save ticket items in localStorage with timestamp
  const saveTicketItems = (type, items) => {
    try {
      // Save with customer ID if available, otherwise save globally
      const key = customer && customer.id ? `ticket_${customer.id}_${type}` : `ticket_global_${type}`;
      const data = {
        items: items,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving ${type} items to localStorage:`, error);
    }
  };

  // Helper function to load ticket items from localStorage (checks 24hr expiry)
  const loadTicketItems = (type) => {
    try {
      // Load with customer ID if available, otherwise load globally
      const key = customer && customer.id ? `ticket_${customer.id}_${type}` : `ticket_global_${type}`;
      const savedData = localStorage.getItem(key);

      if (!savedData) return null;

      const parsed = JSON.parse(savedData);

      // Check if data has new format with timestamp
      if (parsed && typeof parsed === 'object' && parsed.timestamp) {
        const now = Date.now();
        const age = now - parsed.timestamp;
        const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        // If data is older than 24 hours, remove it and return null
        if (age > twentyFourHours) {
          localStorage.removeItem(key);
          return null;
        }

        return parsed.items;
      }

      // Handle old format (data without timestamp) - return as is for backward compatibility
      // But it will be re-saved with timestamp on next save
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      console.error(`Error loading ${type} items from localStorage:`, error);
      return null;
    }
  };

  // Helper function to clear ticket items from localStorage
  const clearTicketItems = (type) => {
    const key = customer && customer.id ? `ticket_${customer.id}_${type}` : `ticket_global_${type}`;
    localStorage.removeItem(key);
  };

  // Helper function to clean up all expired ticket items from localStorage
  const cleanupExpiredTickets = () => {
    try {
      const twentyFourHours = 24 * 60 * 60 * 1000;
      const now = Date.now();
      let removedCount = 0;

      // Get all localStorage keys
      const keys = Object.keys(localStorage);

      // Filter keys that match ticket pattern
      const ticketKeys = keys.filter(key =>
        key.startsWith('ticket_') || key.startsWith('cart_')
      );

      ticketKeys.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          const parsed = JSON.parse(data);

          // Check if it has timestamp and is expired
          if (parsed && typeof parsed === 'object' && parsed.timestamp) {
            const age = now - parsed.timestamp;
            if (age > twentyFourHours) {
              localStorage.removeItem(key);
              removedCount++;
            }
          }
        } catch (e) {
          // Skip invalid entries
        }
      });
    } catch (error) {
      console.error('Error cleaning up expired tickets:', error);
    }
  };
  
  // State for managing items in each tab - initialize from localStorage if available
  const [pawnItems, setPawnItems] = React.useState(() => {
    return loadTicketItems('pawn') || [{ id: 1, description: '', category: '', value: '' }];
  });
  
  const [buyItems, setBuyItems] = React.useState(() => {
    return loadTicketItems('buy') || [{ id: 1, description: '', category: '', price: '' }];
  });
  
  const [tradeItems, setTradeItems] = React.useState(() => {
    return loadTicketItems('trade') || [{ id: 1, tradeItem: '', tradeValue: '', storeItem: '', priceDiff: '' }];
  });
  
  const [saleItems, setSaleItems] = React.useState(() => {
    return loadTicketItems('sale') || [{ id: 1, description: '', category: '', price: '', paymentMethod: '' }];
  });
  
  const [repairItems, setRepairItems] = React.useState(() => {
    return loadTicketItems('repair') || [{ id: 1, description: '', issue: '', fee: '', completion: '' }];
  });
  
  const [paymentItems, setPaymentItems] = React.useState(() => {
    return loadTicketItems('payment') || [{ id: 1, pawnTicketId: '', description: '', principal: '', days: '', term: '', date: '', interest: '', fee: '', amount: '', images: [] }];
  });
  
  const [refundItems, setRefundItems] = React.useState(() => {
    return loadTicketItems('refund') || [{ id: 1, amount: '', method: '', reference: '', reason: '' }];
  });

  const [redeemItems, setRedeemItems] = React.useState(() => {
    return loadTicketItems('redeem') || [{ id: 1, pawnTicketId: '', description: '', principal: '', interest: '', totalAmount: '', images: [] }];
  });

  // Helper functions to create empty items for each tab type
  const createEmptyPawnItem = () => ({ id: Date.now(), description: '', category: '', value: '' });
  const createEmptyBuyItem = () => ({ id: Date.now(), description: '', category: '', price: '' });
  const createEmptyTradeItem = () => ({ id: Date.now(), tradeItem: '', tradeValue: '', storeItem: '', priceDiff: '' });
  const createEmptySaleItem = () => ({ id: Date.now(), description: '', category: '', price: '', paymentMethod: '' });
  const createEmptyRepairItem = () => ({ id: Date.now(), description: '', issue: '', fee: '', completion: '' });
  const createEmptyPaymentItem = () => ({ id: Date.now(), pawnTicketId: '', description: '', principal: '', days: '', term: '', date: '', interest: '', fee: '', amount: '', images: [] });
  const createEmptyRefundItem = () => ({ id: Date.now(), amount: '', method: '', reference: '', reason: '' });
  const createEmptyRedeemItem = () => ({ id: Date.now(), pawnTicketId: '', description: '', principal: '', interest: '', totalAmount: '' });

  // Clean up expired ticket items on component mount
  React.useEffect(() => {
    cleanupExpiredTickets();
  }, []);

  // Check and remove sold items from inventory on component mount and when location changes
  React.useEffect(() => {
    const checkAndRemoveSoldItems = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return;
        }

        // Check all tabs for items with fromInventory flag
        const tabsToCheck = [
          { items: saleItems, setItems: setSaleItems, type: 'sale' },
          { items: buyItems, setItems: setBuyItems, type: 'buy' },
          { items: pawnItems, setItems: setPawnItems, type: 'pawn' }
        ];

        let totalRemoved = 0;
        for (const tab of tabsToCheck) {
          const inventoryItems = tab.items.filter(item => item.fromInventory && item.item_id);

          if (inventoryItems.length === 0) continue;

          // Check each inventory item's status
          const itemsToRemove = [];
          for (const item of inventoryItems) {
            try {
              const response = await fetch(`${config.apiUrl}/jewelry/${item.item_id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });

              if (response.ok) {
                const data = await response.json();
                // If item is SOLD, mark it for removal
                if (data.status === 'SOLD') {
                  itemsToRemove.push(item.item_id);
                }
              }
            } catch (error) {
              console.error(`Error checking status for item ${item.item_id}:`, error);
            }
          }

          // Remove sold items from the tab
          if (itemsToRemove.length > 0) {
            const updatedItems = tab.items.filter(item => !itemsToRemove.includes(item.item_id));
            // Ensure at least one empty item exists
            const finalItems = updatedItems.length === 0
              ? [tab.type === 'sale' ? createEmptySaleItem() :
                 tab.type === 'buy' ? createEmptyBuyItem() :
                 createEmptyPawnItem()]
              : updatedItems;

            tab.setItems(finalItems);
            saveTicketItems(tab.type, finalItems);
            totalRemoved += itemsToRemove.length;
          }
        }

        // Show notification if items were removed
        if (totalRemoved > 0) {
          showSnackbar(`${totalRemoved} sold item${totalRemoved > 1 ? 's' : ''} removed from ticket`, 'info');
        }
      } catch (error) {
        console.error('Error checking sold items:', error);
      }
    };

    checkAndRemoveSoldItems();
  }, [location.pathname]); // Run on mount and when navigating back to this page

  // Process estimated items when component mounts - use a ref to track if the current navigation state has been processed
  const processedStateRef = React.useRef(null);
  
  React.useEffect(() => {
    // Handle updated item from jewelry estimator when in edit mode
    if (location.state?.updatedItem && location.state?.ticketItemId && location.state?.fromEstimator === 'jewelry') {
      const updatedItem = location.state.updatedItem;
      const ticketItemId = location.state.ticketItemId;
      const isDuplicate = location.state?.isDuplicate || false;
  
      // Create a base item with common properties from the updated item

      // Extract metal category with optional chaining for cleaner code
      const metalCategory = updatedItem?.metal_category ||
                           updatedItem?.category ||
                           updatedItem?.originalData?.metal_category ||
                           'Jewelry';

      // Use the long_desc or short_desc from the estimator if available
      // This preserves all manual additions like vintage, stamps, brand, designer, etc.
      const description = updatedItem?.long_desc ||
                         updatedItem?.short_desc ||
                         updatedItem?.description ||
                         `${updatedItem.metal_weight || '0'}g ${updatedItem.metal_purity || ''} ${updatedItem.precious_metal_type || ''} ${metalCategory}`;

      const baseItem = {
        id: ticketItemId,
        description: description,
        category: metalCategory,
        // Store both short and long descriptions
        short_desc: updatedItem?.short_desc,
        long_desc: updatedItem?.long_desc,
        // Store the original estimator data for editing
        originalData: { ...updatedItem },
        sourceEstimator: 'jewelry'
      };
      
      // Adding image if available
      if (updatedItem.images && updatedItem.images.length > 0) {
        baseItem.image = updatedItem.images.find(img => img.isPrimary)?.url || updatedItem.images[0]?.url;
        baseItem.images = updatedItem.images;
      }
      
      // Update the appropriate item array based on transaction type
      const transactionType = updatedItem.transaction_type || 'buy';
      
      switch (transactionType) {
        case 'pawn':
          setPawnItems(prevItems => {
            const updatedItems = [...prevItems];
            const itemIndex = updatedItems.findIndex(item => item.id === ticketItemId);

            if (itemIndex !== -1) {
              // Spread ALL fields from updatedItem to preserve vintage, stamps, brand, etc.
              updatedItems[itemIndex] = {
                ...updatedItem, // Spread all fields from estimator first
                ...baseItem, // Then overlay baseItem fields (description, category, etc.)
                id: ticketItemId, // Preserve the ticket item ID
                value: updatedItem.price || updatedItem.price_estimates?.pawn || 0
              };
              // Show success message
              showSnackbar(isDuplicate ? 'Item duplicated and updated successfully' : 'Item updated successfully', 'success');
            } else {
              // Item not found - might have been deleted while in editor
              showSnackbar('Could not find item to update', 'error');
            }

            // Save to localStorage
            saveTicketItems('pawn', updatedItems);

            return updatedItems;
          });
          break;

        case 'buy':
          setBuyItems(prevItems => {
            const updatedItems = [...prevItems];
            const itemIndex = updatedItems.findIndex(item => item.id === ticketItemId);

            if (itemIndex !== -1) {
              // Spread ALL fields from updatedItem to preserve vintage, stamps, brand, etc.
              updatedItems[itemIndex] = {
                ...updatedItem, // Spread all fields from estimator first
                ...baseItem, // Then overlay baseItem fields (description, category, etc.)
                id: ticketItemId, // Preserve the ticket item ID
                price: updatedItem.price || updatedItem.price_estimates?.buy || 0
              };
              // Show success message
              showSnackbar(isDuplicate ? 'Item duplicated and updated successfully' : 'Item updated successfully', 'success');
            } else {
              // Item not found - might have been deleted while in editor
              showSnackbar('Could not find item to update', 'error');
            }

            // Save to localStorage
            saveTicketItems('buy', updatedItems);

            return updatedItems;
          });
          break;

        case 'sale':
        case 'retail': // Handle both 'sale' and 'retail' the same way
          setSaleItems(prevItems => {
            const updatedItems = [...prevItems];
            const itemIndex = updatedItems.findIndex(item => item.id === ticketItemId);

            if (itemIndex !== -1) {
              // Spread ALL fields from updatedItem to preserve vintage, stamps, brand, etc.
              updatedItems[itemIndex] = {
                ...updatedItem, // Spread all fields from estimator first
                ...baseItem, // Then overlay baseItem fields (description, category, etc.)
                id: ticketItemId, // Preserve the ticket item ID
                price: updatedItem.price || updatedItem.price_estimates?.retail || 0,
                paymentMethod: prevItems[itemIndex].paymentMethod || ''
              };
              // Show success message
              showSnackbar(isDuplicate ? 'Item duplicated and updated successfully' : 'Item updated successfully', 'success');
            } else {
              // Item not found - might have been deleted while in editor
              showSnackbar('Could not find item to update', 'error');
            }

            // Save to localStorage
            saveTicketItems('sale', updatedItems);

            return updatedItems;
          });
          break;
          
        default:
          showSnackbar('Unknown transaction type: ' + transactionType, 'warning');
      }
      
      // Set the active tab to match the transaction type
      switch(transactionType) {
        case 'pawn':
          setActiveTab(0);
          break;
        case 'buy':
          setActiveTab(1);
          break;
        case 'sale':
        case 'retail':
          setActiveTab(3);
          break;
        default:
          // Keep current tab
      }
      
      // Clear the location state to prevent reapplying the update
      window.history.replaceState({}, document.title);
    }
    
    // If we have estimated items and they're from jewelEstimator
    else if (estimatedItems.length > 0 && from === 'jewelEstimator') {
      // Skip if we've already processed this state
      const stateHash = JSON.stringify({estimatedItems, from});
      if (processedStateRef.current === stateHash) {
        return;
      }
      processedStateRef.current = stateHash;
      
      // Check for empty placeholder items
      const hasEmptyPawnItems = pawnItems.length === 1 && !pawnItems[0].description;
      const hasEmptyBuyItems = buyItems.length === 1 && !buyItems[0].description;
      const hasEmptySaleItems = saleItems.length === 1 && !saleItems[0].description;
      
      // Process items by transaction type
      const pawn = [];
      const buy = [];
      const sale = [];
      estimatedItems.forEach((item, index) => {
        // Create a base item with common properties
        const baseItem = {
          id: index + 1,
          description: `${item.short_desc}`,
          category: item.category || 'Jewelry',
          // Store the original estimator data for editing
          originalData: { ...item },
          sourceEstimator: 'jewelry',
          images: item.images || [],
          image: item.images?.find(img => img.isPrimary)?.url || item.images?.[0]?.url || null
        };
        
        // Add to appropriate array based on transaction type
        switch (item.transaction_type) {
          case 'pawn':
            pawn.push({
              ...baseItem,
              value: item.price || item.price_estimates?.pawn || 0
            });
            break;
          case 'buy':
            buy.push({
              ...baseItem,
              price: item.price || item.price_estimates?.buy || 0
            });
            break;
          case 'retail':
            sale.push({
              ...baseItem,
              price: item.price || item.price_estimates?.retail || 0,
              paymentMethod: ''
            });
            break;
          default:
            // Default to buy if transaction type is not specified
            buy.push({
              ...baseItem,
              price: item.price || item.price_estimates?.buy || 0
            });
        }
      });
      
      // Update state with new items and save to localStorage
      if (pawn.length > 0) {
        // Get the existing pawn items or default to empty array
        const existingItems = [...pawnItems];
        const hasOnlyEmptyItem = existingItems.length === 1 && !existingItems[0].description;
        
        // Create unique IDs for new items
        const timestamp = Date.now();
        const newItems = pawn.map((item, index) => ({
          ...item,
          id: timestamp + index // Ensures unique IDs
        }));
        
        // If there's just an empty placeholder item, replace it
        // Otherwise append to existing items
        const updatedItems = hasOnlyEmptyItem ? newItems : [...existingItems, ...newItems];
        
        setPawnItems(updatedItems);
        saveTicketItems('pawn', updatedItems);
        setActiveTab(0); // Set active tab to Pawn
      }
      
      if (buy.length > 0) {
        // Get the existing buy items or default to empty array
        const existingItems = [...buyItems];
        const hasOnlyEmptyItem = existingItems.length === 1 && !existingItems[0].description;
        
        // Create unique IDs for new items
        const timestamp = Date.now();
        const newItems = buy.map((item, index) => ({
          ...item,
          id: timestamp + index // Ensures unique IDs
        }));
        
        // If there's just an empty placeholder item, replace it
        // Otherwise append to existing items
        const updatedItems = hasOnlyEmptyItem ? newItems : [...existingItems, ...newItems];
        
        setBuyItems(updatedItems);
        saveTicketItems('buy', updatedItems);
        setActiveTab(1); // Set active tab to Buy
      }
      
      if (sale.length > 0) {
        // Get the existing sale items or default to empty array
        const existingItems = [...saleItems];
        const hasOnlyEmptyItem = existingItems.length === 1 && !existingItems[0].description;
        
        // Create unique IDs for new items
        const timestamp = Date.now();
        const newItems = sale.map((item, index) => ({
          ...item,
          id: timestamp + index // Ensures unique IDs
        }));
        
        // If there's just an empty placeholder item, replace it
        // Otherwise append to existing items
        const updatedItems = hasOnlyEmptyItem ? newItems : [...existingItems, ...newItems];
        
        setSaleItems(updatedItems);
        saveTicketItems('sale', updatedItems);
        setActiveTab(3); // Set active tab to Sale
      }
      
      // Clear the location state to prevent reprocessing on navigation
      window.history.replaceState({}, document.title);
    }
    
    // Handle edit item coming from Cart
    else if (location.state?.editItem && location.state?.fromCart) {
      // Skip if we've already processed this state
      const stateHash = JSON.stringify({ editItem: location.state.editItem, fromCart: location.state.fromCart, editItemIndex: location.state.editItemIndex });
      if (processedStateRef.current === stateHash) {
        return;
      }
      processedStateRef.current = stateHash;

      const editItem = location.state.editItem;
      const editItemType = location.state.editItemType;
      const editItemIndex = location.state.editItemIndex;
      const buyTicketId = location.state.buyTicketId;

      // Store the buyTicketId so we can use it when adding back to cart
      if (buyTicketId) {
        setPreservedBuyTicketId(buyTicketId);
      }

      // Load the item into the appropriate tab with a fresh ID
      const itemWithNewId = {
        ...editItem,
        id: Date.now() // Use timestamp as new unique ID
      };

      switch (editItemType) {
        case 'pawn':
          setActiveTab(0);
          setPawnItems([itemWithNewId]); // Replace all items with just this one
          break;
        case 'buy':
          setActiveTab(1);
          setBuyItems([itemWithNewId]);
          break;
        case 'trade':
          setActiveTab(2);
          setTradeItems([itemWithNewId]);
          break;
        case 'sale':
          setActiveTab(3);
          setSaleItems([itemWithNewId]);
          break;
        case 'repair':
          setActiveTab(4);
          setRepairItems([itemWithNewId]);
          break;
        case 'payment':
          setActiveTab(5);
          setPaymentItems([itemWithNewId]);
          break;
        case 'refund':
          setActiveTab(6);
          setRefundItems([itemWithNewId]);
          break;
        default:
          console.warn('[CustomerTicket] Unknown edit item type:', editItemType);
      }

      showSnackbar('Item loaded for editing', 'info');

      // Clear the location state
      window.history.replaceState({}, document.title);
    }

    // Handle items coming from CoinsBullions
    else if (location.state?.addedItems && location.state?.from === 'coinsbullions') {
      // Skip if we've already processed this state
      const stateHash = JSON.stringify(location.state);
      if (processedStateRef.current === stateHash) {
        return;
      }
      processedStateRef.current = stateHash;
      
      const addedItems = location.state.addedItems;
      
      // Clear initial empty items if needed
      const hasEmptyPawnItems = pawnItems.length === 1 && !pawnItems[0].description;
      const hasEmptyBuyItems = buyItems.length === 1 && !buyItems[0].description;
      
      // Process items by transaction type
      const pawnItemsArr = [];
      const buyItemsArr = [];
      
      addedItems.forEach((item, index) => {
        // Create a base item with common properties
        const baseItem = {
          id: Date.now() + index, // Use timestamp + index to ensure unique IDs
          description: item.description || '',
          category: item.category || '',
          originalItem: item.originalItem || item,
          // Add support for images
          image: item.images || []
        };
        
        // Add to appropriate array based on transaction type
        switch (item.transaction_type) {
          case 'pawn':
            pawnItemsArr.push({
              ...baseItem,
              value: item.value || item.price || 0
            });
            break;
          case 'buy':
          default: // Default to buy if not specified
            buyItemsArr.push({
              ...baseItem,
              price: item.price || item.value || 0
            });
            break;
        }
      });
      
      // Update state with new items and save to localStorage
      if (pawnItemsArr.length > 0) {
        setPawnItems(prevItems => {
          // Replace empty placeholder item if needed
          const newItems = hasEmptyPawnItems ? pawnItemsArr : [...prevItems, ...pawnItemsArr];
          saveTicketItems('pawn', newItems);
          return newItems;
        });
        setActiveTab(0); // Set active tab to Pawn
        showSnackbar(`${pawnItemsArr.length} pawn items added to ticket`, 'success');
      }
      
      if (buyItemsArr.length > 0) {
        setBuyItems(prevItems => {
          // Replace empty placeholder item if needed
          const newItems = hasEmptyBuyItems ? buyItemsArr : [...prevItems, ...buyItemsArr];
          saveTicketItems('buy', newItems);
          return newItems;
        });
        setActiveTab(1); // Set active tab to Buy
        showSnackbar(`${buyItemsArr.length} buy items added to ticket`, 'success');
      }
      
      // Clear the location state to prevent reprocessing
      window.history.replaceState({}, document.title);
    }
  }, [estimatedItems, from, location.state, customer]);

  // Handle selected inventory item from Jewelry page
  React.useEffect(() => {
    if (location.state?.selectedInventoryItem) {
      const stateHash = JSON.stringify({ selectedInventoryItem: location.state.selectedInventoryItem });
      if (processedStateRef.current === stateHash) {
        return;
      }
      processedStateRef.current = stateHash;

      const inventoryItem = location.state.selectedInventoryItem;

      // Clear empty sale items if needed
      const hasEmptySaleItems = saleItems.length === 1 && !saleItems[0].description;

      // Create sale item from inventory - use original item_id as id
      const newSaleItem = {
        id: inventoryItem.item_id, // Use original item_id instead of generating new one
        description: inventoryItem.description,
        category: inventoryItem.category,
        price: inventoryItem.price,
        retail_price: inventoryItem.retail_price,
        buy_price: inventoryItem.buy_price,
        metal_weight: inventoryItem.metal_weight,
        item_id: inventoryItem.item_id,
        images: inventoryItem.images || [],
        fromInventory: true,
        protectionPlan: false
      };

      setSaleItems(prevItems => {
        const newItems = hasEmptySaleItems ? [newSaleItem] : [...prevItems, newSaleItem];
        saveTicketItems('sale', newItems);
        return newItems;
      });

      setActiveTab(3); // Set active tab to Sale
      showSnackbar('Inventory item added to sale ticket', 'success');

      // Clear the location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch pawn config for interest rate and frequency days
  React.useEffect(() => {
    const fetchPawnConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/pawn-config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setInterestRate(parseFloat(data.interest_rate) || 2.9);
          setFrequencyDays(parseInt(data.frequency_days) || 30);
        }
      } catch (error) {
        console.error('Error fetching pawn config:', error);
      }
    };
    fetchPawnConfig();
  }, []);

  // Fetch customer's pawn transactions when customer changes
  React.useEffect(() => {
    const fetchCustomerLoans = async () => {
      if (!customer || !customer.id) {
        setCustomerLoans([]);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/pawn-transactions`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const allPawns = await response.json();
          // Filter pawns for this customer only
          const customerPawns = allPawns.filter(pawn =>
            pawn.customer_id === customer.id
          );
          setCustomerLoans(customerPawns);
        }
      } catch (error) {
        console.error('Error fetching customer loans:', error);
        setCustomerLoans([]);
      }
    };

    fetchCustomerLoans();
  }, [customer]);

  // Handle redeem data from Pawns.js
  React.useEffect(() => {
    if (location.state?.redeemData) {
      const stateHash = JSON.stringify({ redeemData: location.state.redeemData });
      if (processedStateRef.current === stateHash) {
        return;
      }
      processedStateRef.current = stateHash;

      const redeemData = location.state.redeemData;

      // Fetch customer data if customerId is provided
      const fetchAndSetCustomer = async () => {
        let customerData = null;

        if (redeemData.customerId) {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.apiUrl}/customers/${redeemData.customerId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
              customerData = await response.json();
              setCustomer(customerData);
              sessionStorage.setItem('selectedCustomer', JSON.stringify(customerData));
            } else {
              console.error('Failed to fetch customer:', response.status);
              showSnackbar('Could not load customer details', 'warning');
            }
          } catch (error) {
            console.error('Error fetching customer:', error);
            showSnackbar('Could not load customer details', 'warning');
          }
        }

        // Clear empty redeem items if needed
        const hasEmptyRedeemItems = redeemItems.length === 1 && !redeemItems[0].pawnTicketId;

        // Create redeem item from pawn data (without customer field)
        const newRedeemItem = {
          id: Date.now(),
          pawnTicketId: redeemData.pawnTicketId || '',
          description: redeemData.description || '',
          principal: redeemData.principal || '',
          interest: redeemData.interest || '',
          totalAmount: redeemData.totalAmount || ''
        };

        // Update state with new item and save to localStorage
        const updatedRedeemItems = hasEmptyRedeemItems ? [newRedeemItem] : [...redeemItems, newRedeemItem];
        setRedeemItems(updatedRedeemItems);
        saveTicketItems('redeem', updatedRedeemItems);

        // Switch to redeem tab (index 7)
        setActiveTab(7);

        showSnackbar(`Pawn item added to redeem tab${customerData ? ` for ${customerData.first_name} ${customerData.last_name}` : ''}`, 'success');

        // Clear the location state
        window.history.replaceState({}, document.title);
      };

      fetchAndSetCustomer();
    }
  }, [location.state?.redeemData]);

  // Handle extend data from Pawns.js
  React.useEffect(() => {
    if (location.state?.extendData) {
      const stateHash = JSON.stringify({ extendData: location.state.extendData });
      if (processedStateRef.current === stateHash) {
        return;
      }
      processedStateRef.current = stateHash;

      const extendData = location.state.extendData;

      // Fetch customer data if customerId is provided
      const fetchAndSetCustomer = async () => {
        let customerData = null;

        if (extendData.customerId) {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.apiUrl}/customers/${extendData.customerId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
              customerData = await response.json();
              setCustomer(customerData);
              sessionStorage.setItem('selectedCustomer', JSON.stringify(customerData));
            } else {
              console.error('Failed to fetch customer:', response.status);
              showSnackbar('Could not load customer details', 'warning');
            }
          } catch (error) {
            console.error('Error fetching customer:', error);
            showSnackbar('Could not load customer details', 'warning');
          }
        }

        // Clear empty payment items if needed
        const hasEmptyPaymentItems = paymentItems.length === 1 && !paymentItems[0].pawnTicketId;

        // Create payment item from extend data
        const interest = parseFloat(extendData.interest) || 0;
        const fee = parseFloat(extendData.fee) || 0;
        const amount = (interest + fee).toFixed(2);

        // Calculate days, term and date for default extension (1 period = frequencyDays)
        const days = frequencyDays || 30;
        const term = 1;
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + days);
        const date = futureDate.toISOString().split('T')[0];

        const newPaymentItem = {
          id: Date.now(),
          pawnTicketId: extendData.pawnTicketId || '',
          description: extendData.description || '',
          principal: extendData.principal || '',
          days: days.toString(),
          term: term.toString(),
          date: date,
          interest: extendData.interest || '',
          fee: extendData.fee || '',
          amount: amount,
          images: []
        };

        // Update state with new item and save to localStorage
        const updatedPaymentItems = hasEmptyPaymentItems ? [newPaymentItem] : [...paymentItems, newPaymentItem];
        setPaymentItems(updatedPaymentItems);
        saveTicketItems('payment', updatedPaymentItems);

        // Switch to payment tab (index 5)
        setActiveTab(5);

        showSnackbar(`Extension payment added to payment tab${customerData ? ` for ${customerData.first_name} ${customerData.last_name}` : ''}`, 'success');

        // Clear the location state
        window.history.replaceState({}, document.title);
      };

      fetchAndSetCustomer();
    }
  }, [location.state?.extendData]);

  // Track whether initial load is complete to avoid overwriting saved data
  const initialLoadCompleteRef = React.useRef(false);
  const customerIdRef = React.useRef(customer?.id);

  // Load ticket items from localStorage when component mounts or customer changes
  React.useEffect(() => {
    // Load on first mount or when customer changes
    const customerChanged = customerIdRef.current !== customer?.id;
    if (!initialLoadCompleteRef.current || customerChanged) {
      // Skip loading if we're coming from an estimator or have location state with items
      const hasEstimatorData = location.state?.updatedItem || location.state?.estimatedItems || location.state?.editItem || location.state?.selectedInventoryItem || location.state?.addedItems;

      if (!hasEstimatorData) {
        // Helper function to merge current items with saved items
        const mergeItems = (currentItems, savedItems, defaultItem) => {
          if (!savedItems || savedItems.length === 0) {
            // No saved items - keep current items
            return currentItems;
          }

          // Check if current items have actual data (not just empty placeholders)
          const hasCurrentData = currentItems.some(item => {
            // Check if any field has a value (excluding id)
            return Object.keys(item).some(key => {
              if (key === 'id') return false;
              const value = item[key];
              return value !== null && value !== undefined && value !== '';
            });
          });

          if (!hasCurrentData) {
            // Current items are empty - use saved items
            return savedItems;
          }

          // Both have data - merge them
          // Remove empty placeholder from saved items if it exists
          const filteredSaved = savedItems.filter(item => {
            return Object.keys(item).some(key => {
              if (key === 'id') return false;
              const value = item[key];
              return value !== null && value !== undefined && value !== '';
            });
          });

          // Combine current items with saved items, removing duplicates by id
          const itemMap = new Map();
          [...currentItems, ...filteredSaved].forEach(item => {
            itemMap.set(item.id, item);
          });

          const merged = Array.from(itemMap.values());
          return merged.length > 0 ? merged : [defaultItem];
        };

        // Load saved items (will use customer ID if available, otherwise load global)
        const savedPawn = loadTicketItems('pawn');
        const savedBuy = loadTicketItems('buy');
        const savedTrade = loadTicketItems('trade');
        const savedSale = loadTicketItems('sale');
        const savedRepair = loadTicketItems('repair');
        const savedPayment = loadTicketItems('payment');
        const savedRefund = loadTicketItems('refund');

        // Merge current items with saved items
        setPawnItems(mergeItems(pawnItems, savedPawn, { id: 1, description: '', category: '', value: '' }));
        setBuyItems(mergeItems(buyItems, savedBuy, { id: 1, description: '', category: '', price: '' }));
        setTradeItems(mergeItems(tradeItems, savedTrade, { id: 1, tradeItem: '', tradeValue: '', storeItem: '', priceDiff: '' }));
        setSaleItems(mergeItems(saleItems, savedSale, { id: 1, description: '', category: '', price: '', paymentMethod: '' }));
        setRepairItems(mergeItems(repairItems, savedRepair, { id: 1, description: '', issue: '', fee: '', completion: '' }));
        setPaymentItems(mergeItems(paymentItems, savedPayment, { id: 1, pawnTicketId: '', description: '', principal: '', days: '', term: '', date: '', interest: '', fee: '', amount: '', images: [] }));
        setRefundItems(mergeItems(refundItems, savedRefund, { id: 1, amount: '', method: '', reference: '', reason: '' }));
      }

      // Mark initial load as complete after a short delay to ensure state updates are processed
      setTimeout(() => {
        initialLoadCompleteRef.current = true;
        customerIdRef.current = customer?.id;
      }, 100);
    }
  }, [customer, location.state, pawnItems, buyItems, tradeItems, saleItems, repairItems, paymentItems, refundItems]);

  // Auto-save ticket items to localStorage whenever they change (only after initial load)
  React.useEffect(() => {
    if (initialLoadCompleteRef.current) {
      saveTicketItems('pawn', pawnItems);
    }
  }, [pawnItems, customer]);

  React.useEffect(() => {
    if (initialLoadCompleteRef.current) {
      saveTicketItems('buy', buyItems);
    }
  }, [buyItems, customer]);

  React.useEffect(() => {
    if (initialLoadCompleteRef.current) {
      saveTicketItems('trade', tradeItems);
    }
  }, [tradeItems, customer]);

  React.useEffect(() => {
    if (initialLoadCompleteRef.current) {
      saveTicketItems('sale', saleItems);
    }
  }, [saleItems, customer]);

  React.useEffect(() => {
    if (initialLoadCompleteRef.current) {
      saveTicketItems('repair', repairItems);
    }
  }, [repairItems, customer]);

  React.useEffect(() => {
    if (initialLoadCompleteRef.current) {
      saveTicketItems('payment', paymentItems);
    }
  }, [paymentItems, customer]);

  React.useEffect(() => {
    if (initialLoadCompleteRef.current) {
      saveTicketItems('refund', refundItems);
    }
  }, [refundItems, customer]);

  // Recalculate totals whenever any item array changes
  // Note: These are SUBTOTALS (before tax). Tax is added in display functions.
  React.useEffect(() => {
    // Calculate totals for all tabs
    // Pawn & Buy are negative (money going OUT to customer)
    const pawnTotal = -1 * pawnItems.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
    const buyTotal = -1 * buyItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const tradeTotal = tradeItems.reduce((sum, item) => sum + (parseFloat(item.priceDiff) || 0), 0);
    // Sale & Redeem are positive (money coming IN from customer)
    const saleTotal = saleItems.reduce((sum, item) => {
      const itemPrice = parseFloat(item.price) || 0;
      const protectionPlanAmount = item.protectionPlan ? itemPrice * 0.15 : 0;
      return sum + itemPrice + protectionPlanAmount;
    }, 0);
    const repairTotal = repairItems.reduce((sum, item) => sum + (parseFloat(item.fee) || 0), 0);
    const paymentTotal = paymentItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const refundTotal = refundItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const redeemTotal = redeemItems.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0);

    setTotals({
      pawn: pawnTotal,
      buy: buyTotal,
      trade: tradeTotal,
      sale: saleTotal,
      repair: repairTotal,
      payment: paymentTotal,
      refund: refundTotal,
      redeem: redeemTotal
    });
  }, [pawnItems, buyItems, tradeItems, saleItems, repairItems, paymentItems, refundItems, redeemItems]);

  // Function to get current items based on active tab and type name
  const getCurrentItems = () => {
    let type = '';
    let items = [];
    let setItems = () => {};
    
    switch(activeTab) {
      case 0: 
        type = 'pawn';
        items = pawnItems;
        setItems = (newItems) => {
          setPawnItems(newItems);
          saveTicketItems(type, newItems);
        };
        break;
      case 1: 
        type = 'buy';
        items = buyItems;
        setItems = (newItems) => {
          setBuyItems(newItems);
          saveTicketItems(type, newItems);
        };
        break;
      case 2: 
        type = 'trade';
        items = tradeItems;
        setItems = (newItems) => {
          setTradeItems(newItems);
          saveTicketItems(type, newItems);
        };
        break;
      case 3: 
        type = 'sale';
        items = saleItems;
        setItems = (newItems) => {
          setSaleItems(newItems);
          saveTicketItems(type, newItems);
        };
        break;
      case 4: 
        type = 'repair';
        items = repairItems;
        setItems = (newItems) => {
          setRepairItems(newItems);
          saveTicketItems(type, newItems);
        };
        break;
      case 5: 
        type = 'payment';
        items = paymentItems;
        setItems = (newItems) => {
          setPaymentItems(newItems);
          saveTicketItems(type, newItems);
        };
        break;
      case 6:
        type = 'refund';
        items = refundItems;
        setItems = (newItems) => {
          setRefundItems(newItems);
          saveTicketItems(type, newItems);
        };
        break;
      case 7:
        type = 'redeem';
        items = redeemItems;
        setItems = (newItems) => {
          setRedeemItems(newItems);
          saveTicketItems(type, newItems);
        };
        break;
      default:
        return { items: [], setItems: () => {}, type: '' };
    }

    return { items, setItems, type };
  };
  
  // Handle adding a new row
  const handleAddRow = () => {
    const { items, setItems } = getCurrentItems();
    const newId = items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
    
    // Create a new item based on the active tab
    let newItem;
    switch(activeTab) {
      case 0: 
        newItem = { id: newId, description: '', category: '', value: '' };
        break;
      case 1: 
        newItem = { id: newId, description: '', category: '', price: '' };
        break;
      case 2: 
        newItem = { id: newId, tradeItem: '', tradeValue: '', storeItem: '', priceDiff: '' };
        break;
      case 3:
        newItem = { id: newId, description: '', category: '', price: '', paymentMethod: '' };
        break;
      case 4:
        newItem = { id: newId, description: '', issue: '', fee: '', completion: '' };
        break;
      case 5:
        newItem = { id: newId, amount: '', method: '', reference: '', notes: '' };
        break;
      case 6:
        newItem = { id: newId, amount: '', method: '', reference: '', reason: '' };
        break;
      case 7:
        newItem = { id: newId, pawnTicketId: '', description: '', principal: '', interest: '', totalAmount: '' };
        break;
      default:
        return;
    }

    setItems([...items, newItem]);
  };
  
  // Handle updating an item
  const handleItemChange = async (id, field, value) => {
    const { items, setItems, type } = getCurrentItems();

    // For payment items, auto-calculate when days or interest/fee changes
    if (type === 'payment') {
      // If pawnTicketId changed, fetch pawn data and auto-fill fields
      if (field === 'pawnTicketId' && value) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${config.apiUrl}/pawn-transactions`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.ok) {
            const pawnTransactions = await response.json();
            const pawnData = pawnTransactions.find(p => p.pawn_ticket_id === value);

            if (pawnData) {
              // Found matching pawn ticket, auto-fill all fields
              const principalAmount = parseFloat(pawnData.item_price) || 0;
              const frequency = frequencyDays || 30;
              const rate = interestRate || 2.9;
              const days = frequency;
              const term = 1;

              const today = new Date();
              const futureDate = new Date(today);
              futureDate.setDate(today.getDate() + days);
              const date = futureDate.toISOString().split('T')[0];

              const interestAmount = principalAmount * (rate / 100) * term;
              const insuranceFee = principalAmount * 0.01 * term;
              const amount = interestAmount + insuranceFee;

              // Fetch customer if available
              if (pawnData.customer_id) {
                try {
                  const customerResponse = await fetch(`${config.apiUrl}/customers/${pawnData.customer_id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (customerResponse.ok) {
                    const customerData = await customerResponse.json();
                    setCustomer(customerData);
                    sessionStorage.setItem('selectedCustomer', JSON.stringify(customerData));
                  }
                } catch (error) {
                  console.error('Error fetching customer:', error);
                }
              }

              setItems(items.map(item => {
                if (item.id === id) {
                  return {
                    ...item,
                    pawnTicketId: value,
                    description: pawnData.item_description || pawnData.item_id || '',
                    principal: principalAmount.toFixed(2),
                    days: days.toString(),
                    term: term.toString(),
                    date: date,
                    interest: interestAmount.toFixed(2),
                    fee: insuranceFee.toFixed(2),
                    amount: amount.toFixed(2)
                  };
                }
                return item;
              }));

              showSnackbar('Pawn ticket found and fields auto-filled', 'success');
              return;
            } else {
              showSnackbar('Pawn ticket not found', 'warning');
            }
          }
        } catch (error) {
          console.error('Error fetching pawn data:', error);
          showSnackbar('Error fetching pawn data', 'error');
        }

        // If pawn not found or error, just update the field
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
        return;
      }

      setItems(items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // If days changed, calculate term, date, interest, and fee
          if (field === 'days') {
            const days = parseInt(value) || 0;
            const principal = parseFloat(updatedItem.principal) || 0;
            const frequency = frequencyDays || 30;
            const rate = interestRate || 2.9;

            // Calculate term (number of periods)
            const term = Math.ceil(days / frequency);
            updatedItem.term = term.toString();

            // Calculate date (today + days)
            const today = new Date();
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + days);
            updatedItem.date = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD format

            // Calculate interest and fee
            const interestAmount = principal * (rate / 100) * term;
            const insuranceFee = principal * 0.01 * term;

            updatedItem.interest = interestAmount.toFixed(2);
            updatedItem.fee = insuranceFee.toFixed(2);
            updatedItem.amount = (interestAmount + insuranceFee).toFixed(2);
          }
          // If interest or fee changed manually, recalculate amount
          else if (field === 'interest' || field === 'fee') {
            const interest = parseFloat(updatedItem.interest) || 0;
            const fee = parseFloat(updatedItem.fee) || 0;
            updatedItem.amount = (interest + fee).toFixed(2);
          }

          return updatedItem;
        }
        return item;
      }));
    } else {
      setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    }
  };
  
  // Handle duplicating an item
  const handleDuplicateItem = (id) => {
    const { items, setItems } = getCurrentItems();
    const itemToDuplicate = items.find(item => item.id === id);
    if (!itemToDuplicate) return;
    
    // Create a new duplicate item with a new ID
    const newId = Math.max(...items.map(item => item.id)) + 1;
    const newItem = { ...itemToDuplicate, id: newId };
    
    // First add the duplicate to the current list
    setItems([...items, newItem]);
    
    // We need to delete the duplicate to avoid having both the duplicate and the new item
    setTimeout(() => {
      const { items, setItems } = getCurrentItems();
      setItems(items.filter(item => item.id !== newId));
    }, 100); // Small delay to ensure state update completes
    
    // Then navigate to jewel-estimator if it's a jewelry item
    if (itemToDuplicate.sourceEstimator === 'jewelry' && itemToDuplicate.originalData) {
      // Include a special flag to identify this is a duplicate operation
      navigate('/jewel-estimator', { 
        state: { 
          customer,
          editMode: true, 
          itemToEdit: itemToDuplicate.originalData,
          // No returnToTicket flag, so user can manually add to ticket
          fromDuplicate: true // Indicate this came from duplicating an item
        } 
      });
    } else if (itemToDuplicate.category?.toLowerCase().includes('jewelry')) {
      // If it's jewelry but not from estimator, still go to jewelry estimator
      const description = itemToDuplicate.description || '';
      navigate('/jewel-estimator', { 
        state: { 
          customer,
          editMode: true, 
          itemToEdit: {
            free_text: description,
            category: itemToDuplicate.category,
            price: itemToDuplicate.price || itemToDuplicate.value,
            transaction_type: activeTab === 0 ? 'pawn' : 
                            activeTab === 1 ? 'buy' : 
                            activeTab === 3 ? 'retail' : 'buy'
          },
          // No returnToTicket flag, so user can manually add to ticket
          fromDuplicate: true // Indicate this came from duplicating an item
        }
      });
    }
  };
  
  // Handle deleting an item
  const handleDeleteItem = (id) => {
    const { items, setItems } = getCurrentItems();

    // Always allow deletion - filter out the item to delete
    const remainingItems = items.filter(item => item.id !== id);

    // If no items remain after deletion, add an empty row to maintain UI consistency
    if (remainingItems.length === 0) {
      // Add an empty item with a new ID
      const emptyItem = { id: Date.now(), description: '', category: '' };
      // Add appropriate fields based on the active tab
      const { type } = getCurrentItems();
      if (type === 'pawn') emptyItem.value = '';
      if (type === 'buy' || type === 'sale') emptyItem.price = '';
      if (type === 'trade') {
        emptyItem.tradeItem = '';
        emptyItem.tradeValue = '';
        emptyItem.storeItem = '';
        emptyItem.priceDiff = '';
      }
      if (type === 'repair') {
        emptyItem.issue = '';
        emptyItem.fee = '';
        emptyItem.completion = '';
      }
      if (type === 'payment') {
        emptyItem.pawnTicketId = '';
        emptyItem.principal = '';
        emptyItem.days = '';
        emptyItem.term = '';
        emptyItem.date = '';
        emptyItem.interest = '';
        emptyItem.fee = '';
        emptyItem.amount = '';
        emptyItem.images = [];
      }
      if (type === 'refund') {
        emptyItem.amount = '';
        emptyItem.method = '';
        emptyItem.reference = '';
        emptyItem.reason = '';
      }

      setItems([emptyItem]);
    }
    else {
      setItems(remainingItems);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle opening the convert dropdown menu
  const handleConvertClick = (event, itemId) => {
    setConvertMenuAnchor(event.currentTarget);
    setConvertItemId(itemId);
  };
  
  // Handle closing the convert dropdown menu
  const handleConvertClose = () => {
    setConvertMenuAnchor(null);
    setConvertItemId(null);
  };
  
  // Handle converting an item to another tab
  const handleConvertItem = (targetTabIndex) => {
    if (convertItemId === null) return;
    
    // Get current item details
    const { items } = getCurrentItems();
    const itemToConvert = items.find(item => item.id === convertItemId);
    
    if (!itemToConvert) return;
    
    // Remove item from current tab
    const { setItems } = getCurrentItems();
    setItems(items.filter(item => item.id !== convertItemId));
    
    // Prepare item for target tab
    let newItem;
    switch(targetTabIndex) {
      case 0: // Pawn
        newItem = {
          image: itemToConvert.image,
          images: itemToConvert.images,
          id: Math.max(...pawnItems.map(i => i.id), 0) + 1,
          description: itemToConvert.description || '',
          category: itemToConvert.category || '',
          value: Number(itemToConvert.price || 0),
          originalData: itemToConvert.originalData
        };
        setPawnItems([...pawnItems, newItem]);
        break;
      case 1: // Buy
        newItem = {
          image: itemToConvert.image,
          images: itemToConvert.images,
          id: Math.max(...buyItems.map(i => i.id), 0) + 1,
          description: itemToConvert.description || '',
          category: itemToConvert.category || '',
          price: Number(itemToConvert.value || 0),
          originalData: itemToConvert.originalData
        };
        setBuyItems([...buyItems, newItem]);
        break;
      case 2: // Trade
        newItem = {
          id: Math.max(...tradeItems.map(i => i.id), 0) + 1,
          tradeItem: itemToConvert.description || '',
          tradeValue: itemToConvert.price || itemToConvert.value || '',
          storeItem: '',
          priceDiff: ''
        };
        setTradeItems([...tradeItems, newItem]);
        break;
      case 3: // Sale
        newItem = {
          image: itemToConvert.image,
          images: itemToConvert.images,
          id: Math.max(...saleItems.map(i => i.id), 0) + 1,
          description: itemToConvert.description || '',
          category: itemToConvert.category || '',
          price: Number(itemToConvert.value || 0),
          paymentMethod: '',
          originalData: itemToConvert.originalData
        };
        setSaleItems([...saleItems, newItem]);
        break;
      case 4: // Repair
        newItem = {
          id: Math.max(...repairItems.map(i => i.id), 0) + 1,
          description: itemToConvert.description || '',
          issue: '',
          fee: itemToConvert.price || itemToConvert.value || '',
          completion: ''
        };
        setRepairItems([...repairItems, newItem]);
        break;
      case 5: // Payment
        newItem = {
          id: Math.max(...paymentItems.map(i => i.id), 0) + 1,
          pawnTicketId: '',
          description: itemToConvert.description || '',
          principal: '',
          days: '',
          term: '',
          date: '',
          interest: '',
          fee: '',
          amount: itemToConvert.price || itemToConvert.value || '',
          images: []
        };
        setPaymentItems([...paymentItems, newItem]);
        break;
      case 6: // Refund
        newItem = {
          id: Math.max(...refundItems.map(i => i.id), 0) + 1,
          amount: itemToConvert.price || itemToConvert.value || '',
          method: '',
          reference: '',
          reason: itemToConvert.description || ''
        };
        setRefundItems([...refundItems, newItem]);
        break;
    }
    
    // Close the menu and switch to the target tab
    handleConvertClose();
    setActiveTab(targetTabIndex);

    // Show a success message
    showSnackbar(`Item converted to ${getTabName(targetTabIndex)}`, 'success');
  };
  
  // Helper function to get tab name by index
  const hasActiveItems = (tabIndex) => {
    switch(tabIndex) {
      case 0: // Pawn
        return pawnItems.length > 0 && pawnItems.some(item => item.description || item.value);
      case 1: // Buy
        return buyItems.length > 0 && buyItems.some(item => item.description || item.price);
      case 2: // Trade
        return tradeItems.length > 0 && tradeItems.some(item => item.tradeItem || item.storeItem);
      case 3: // Sale
        return saleItems.length > 0 && saleItems.some(item => item.description || item.price);
      case 4: // Repair
        return repairItems.length > 0 && repairItems.some(item => item.description || item.issue || item.fee);
      case 5: // Payment
        return paymentItems.length > 0 && paymentItems.some(item => item.pawnTicketId || item.amount);
      case 6: // Refund
        return refundItems.length > 0 && refundItems.some(item => item.amount || item.method || item.reason);
      case 7: // Redeem
        return redeemItems.length > 0 && redeemItems.some(item => item.pawnTicketId || item.totalAmount);
      default:
        return false;
    }
  };

  const getTabName = (tabIndex) => {
    const tabNames = ['Pawn', 'Buy', 'Trade', 'Sale', 'Repair', 'Payment', 'Refund', 'Redeem'];
    return tabNames[tabIndex] || 'Unknown';
  };

  const [jewelryInventoryDialog, setJewelryInventoryDialog] = React.useState({
    open: false,
    itemId: null,
    transactionType: null
  });
  const [jewelryInventoryItems, setJewelryInventoryItems] = React.useState([]);
  const [selectedJewelryEstimator, setSelectedJewelryEstimator] = React.useState({});

  // Category selection dialog state
  const [categorySelectorDialog, setCategorySelectorDialog] = React.useState({
    open: false,
    itemId: null,
    transactionType: null
  });
  const [selectedCategory, setSelectedCategory] = React.useState(null);

  const handleJewelryEstimatorClick = async (itemId, transactionType) => {
    // For Sale tab, open category selector first
    if (transactionType === 'sale') {
      setCategorySelectorDialog({ open: true, itemId, transactionType });
    } else {
      // For other tabs, just toggle the highlight/selection
      const key = `${transactionType}-${itemId}`;
      setSelectedJewelryEstimator(prev => ({
        ...prev,
        [key]: !prev[key]
      }));

      // Mark the item as jewelry inventory
      const updateItems = (items) => items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            fromJewelryInventory: !item.fromJewelryInventory
          };
        }
        return item;
      });

      if (transactionType === 'pawn') setPawnItems(updateItems);
      else if (transactionType === 'buy') setBuyItems(updateItems);
      else if (transactionType === 'trade') setTradeItems(updateItems);
      else if (transactionType === 'repair') setRepairItems(updateItems);
      else if (transactionType === 'payment') setPaymentItems(updateItems);
      else if (transactionType === 'refund') setRefundItems(updateItems);
    }
  };

  const handleCategorySelect = async (category) => {
    const { itemId, transactionType } = categorySelectorDialog;
    setSelectedCategory(category);

    // Fetch inventory filtered by category
    try {
      const response = await fetch(`${config.apiUrl}/jewelry?status=ACTIVE&metal_category=${encodeURIComponent(category)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const items = await response.json();
      setJewelryInventoryItems(items);

      // Close category selector and open inventory dialog
      setCategorySelectorDialog({ open: false, itemId: null, transactionType: null });
      setJewelryInventoryDialog({ open: true, itemId, transactionType });
    } catch (error) {
      console.error('Error fetching jewelry inventory:', error);
      showSnackbar('Error loading inventory', 'error');
    }
  };

  const handleSelectJewelryItem = (jewelryItem) => {
    const { itemId, transactionType } = jewelryInventoryDialog;

    if (transactionType === 'sale') {
      // For sale tab, add the item properly like from inventory page
      // Clear empty sale items if needed
      const hasEmptySaleItems = saleItems.length === 1 && !saleItems[0].description;

      // Create sale item from jewelry inventory - similar to selectedInventoryItem handling
      const newSaleItem = {
        id: jewelryItem.item_id, // Use original item_id
        description: jewelryItem.short_desc || jewelryItem.long_desc || buildJewelryDescription(jewelryItem),
        category: jewelryItem.category,
        price: jewelryItem.item_price,
        retail_price: jewelryItem.retail_price,
        buy_price: jewelryItem.buy_price,
        metal_weight: jewelryItem.metal_weight,
        item_id: jewelryItem.item_id,
        images: jewelryItem.images || [],
        fromInventory: true,
        protectionPlan: false
      };

      setSaleItems(prevItems => {
        const newItems = hasEmptySaleItems ? [newSaleItem] : [...prevItems, newSaleItem];
        saveTicketItems('sale', newItems);
        return newItems;
      });

      showSnackbar('Jewelry item added to sale ticket', 'success');
    } else {
      // For other transaction types, build description and update
      const description = buildJewelryDescription(jewelryItem);

      const updateItems = (items) => items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            description,
            fromJewelryInventory: true,
            jewelryItemId: jewelryItem.item_id
          };
        }
        return item;
      });

      if (transactionType === 'pawn') setPawnItems(updateItems);
      else if (transactionType === 'buy') setBuyItems(updateItems);
      else if (transactionType === 'trade') setTradeItems(updateItems);
      else if (transactionType === 'repair') setRepairItems(updateItems);
      else if (transactionType === 'payment') setPaymentItems(updateItems);
      else if (transactionType === 'refund') setRefundItems(updateItems);
    }

    setJewelryInventoryDialog({ open: false, itemId: null, transactionType: null });
  };

  const buildJewelryDescription = (item) => {
    const parts = [];

    // Category (R for Ring, B for Bracelet, etc.)
    if (item.category) {
      const categoryCode = item.category.charAt(0).toUpperCase();
      parts.push(categoryCode);
    }

    // Purity (10k, 14k, etc.)
    if (item.metal_purity) {
      parts.push(item.metal_purity);
    }

    // Weight (2g, 5.6g, etc.)
    if (item.metal_weight) {
      parts.push(`${item.metal_weight}g`);
    }

    // Color (YG, WG, RG, etc.)
    if (item.jewelry_color) {
      parts.push(item.jewelry_color);
    }

    return parts.join(' ');
  };

  // Parse description format: R 10k 2g YG (when fromJewelryInventory=true)
  // R = Ring, 10k = purity, 2g = weight, YG = Yellow Gold
  const parseDescription = (description, fromJewelryInventory = false) => {
    if (!description) return null;

    const parts = description.trim().toUpperCase().split(/\s+/);
    if (parts.length < 3) return null; // Minimum: category/purity, weight, metal (e.g., "10k 5.6g RG" or "R 10k 2g YG")

    const parsed = {
      type: fromJewelryInventory ? 'Jewelry' : null,
      category: null,
      purity: null,
      weight: null,
      color: null,
      metal: null
    };

    let partIndex = 0;
    const firstPart = parts[0];

    // Check if first part looks like a category code (single letter) and second part looks like purity
    if (parts.length >= 3 && firstPart.length === 1) {
      const potentialPurity = parts[1];

      if (potentialPurity.match(/^\d+K?$/i) || potentialPurity.match(/^0?\.\d+$/) || potentialPurity.match(/^1\.0+$/) || potentialPurity.match(/^[a-zA-Z]+$/)) {
        // First part is category code
        parsed.category = categoryCodeMap[firstPart] || firstPart;
        partIndex++;
      }
    }

    // Parse Purity (e.g., "10K", "14K", "18K", "24K", "0.585", "0.999", "pure", "sterling")
    if (partIndex < parts.length) {
      const purity = parts[partIndex];
      if (purity.match(/^\d+K?$/i)) {
        // Karat format (e.g., "10K", "14K") - Keep uppercase K to match database
        parsed.purity = purity.replace(/K$/i, '') + 'K';
        partIndex++;
      } else if (purity.match(/^0?\.\d+$/) || purity.match(/^1\.0+$/)) {
        // Decimal format for Platinum/Palladium (e.g., "0.585", "0.999", "1.0")
        parsed.purity = parseFloat(purity);
        partIndex++;
      } else if (purity.match(/^[a-zA-Z]+$/)) {
        // Text format (e.g., "pure", "sterling", "fine")
        // Store as-is with proper capitalization (first letter uppercase, rest lowercase)
        parsed.purity = purity.charAt(0).toUpperCase() + purity.slice(1).toLowerCase();
        partIndex++;
      }
    }

    // Parse Weight (e.g., "2G", "5.5G")
    if (partIndex < parts.length) {
      const weight = parts[partIndex];
      if (weight.match(/^[\d.]+G?$/i)) {
        parsed.weight = parseFloat(weight.replace(/G$/i, ''));
        partIndex++;
      }
    }

    // Parse Color + Metal (e.g., "YG" = Yellow Gold, "WG" = White Gold, "S" = Silver, "PD" = Palladium)
    if (partIndex < parts.length) {
      const colorMetal = parts[partIndex];

      // Handle single-character codes (e.g., "S" for Silver without color)
      if (colorMetal.length === 1) {
        // Check if it's a metal type code
        parsed.metal = metalTypeCodeMap[colorMetal] || null;
        // No color specified
        parsed.color = null;
      } else if (colorMetal.length >= 2) {
        // First check if the entire string is a metal code (e.g., "PD" for Palladium)
        if (metalTypeCodeMap[colorMetal]) {
          parsed.metal = metalTypeCodeMap[colorMetal];
          parsed.color = null;
        } else {
          // Multi-character codes: first char is color, rest is metal
          const colorCode = colorMetal[0];
          const metalCode = colorMetal.substring(1);

          // Map color codes from database
          parsed.color = colorCodeMap[colorCode] || null;

          // Map metal codes from database
          parsed.metal = metalTypeCodeMap[metalCode] || null;
        }
      }
    }

    return parsed;
  };

  // Handle Enter key in description field to auto-open estimators
  const handleDescriptionKeyPress = async (event, itemId) => {
    if (event.key === 'Enter') {
      event.preventDefault();

      const { items } = getCurrentItems();
      const item = items.find(i => i.id === itemId);
      if (!item || !item.description) return;

      const parsed = parseDescription(item.description, item.fromJewelryInventory);

      if (!parsed) {
        return;
      }

      // Fetch purity_value from database
      let purityValue = null;
      let purityText = null;
      if (parsed.purity && parsed.metal) {
        try {
          // First, get the metal type ID
          const metalTypesResponse = await fetch(`${config.apiUrl}/precious_metal_type`);
          const metalTypes = await metalTypesResponse.json();

          const metalType = metalTypes.find(m =>
            m.type && parsed.metal &&
            m.type.toLowerCase() === parsed.metal.toLowerCase()
          );

          if (metalType && metalType.id) {
            // Fetch purities for this metal type
            const puritiesResponse = await fetch(`${config.apiUrl}/metal_purity/${metalType.id}`);
            const purities = await puritiesResponse.json();

            // Find matching purity
            let matchingPurity = null;

            // Check if parsed.purity is a number (for Platinum/Palladium)
            if (typeof parsed.purity === 'number') {
              // Match by numeric value
              matchingPurity = purities.find(p =>
                p.value && Math.abs(parseFloat(p.value) - parsed.purity) < 0.001
              );
            } else if (typeof parsed.purity === 'string') {
              // Match by text (for Gold/Silver)
              matchingPurity = purities.find(p =>
                p.purity && parsed.purity &&
                p.purity.toLowerCase() === parsed.purity.toLowerCase()
              );
            }

            if (matchingPurity) {
              purityValue = matchingPurity.value;
              purityText = matchingPurity.purity;
            } 
          } 
        } catch (error) {
          console.error('❌ [PURITY DEBUG] Error fetching purity value:', error);
        }
      } 

      // Prepare pre-filled data for jewelry estimator
      // Only include purity data if we found a matching purity in the database
      const preFilledData = {
        metal_weight: parsed.weight || '',
        weight: parsed.weight || '', // MetalEstimator uses 'weight'
        precious_metal_type: parsed.metal || '',
        preciousMetalType: parsed.metal || '', // MetalEstimator uses 'preciousMetalType'
        metal_category: parsed.category || '',
        metalCategory: parsed.category || '', // MetalEstimator uses 'metalCategory'
        category: parsed.category || '',
        color: parsed.color || '',
        jewelryColor: parsed.color || '', // MetalEstimator uses 'jewelryColor'
        free_text: item.description
      };

      // Only include purity data if we found a valid match for this metal type
      if (purityValue !== null) {
        preFilledData.purity_value = purityValue;
        // purityText can be null for Platinum/Palladium
        if (purityText !== null) {
          preFilledData.metal_purity = purityText;
        }
      } 

      // Store the prefilled data and item ID
      setPrefilledData(preFilledData);
      setCurrentEditingItemId(itemId);

      // Open the combined dialog
      setCombinedDialogOpen(true);
    }
  };

  // Handler for canceling the combined dialog
  const handleCombinedCancel = () => {
    setCombinedDialogOpen(false);
    setMetalFormState(null);
    setGemFormState({ diamonds: [], stones: [], secondaryGems: [] });
    setCurrentEditingItemId(null);
    setPrefilledData(null);
    setAddedMetals([]);
    setAddedGems([]);
  };

  // Handler for saving data from the combined dialog
  const handleCombinedSave = (processedItems) => {
    if (!currentEditingItemId) return;

    const { items, setItems } = getCurrentItems();

    // If processedItems are provided (from JewelEstimator), use them directly
    if (processedItems && processedItems.length > 0) {

      // Check if we're in REPLACE mode (editing an existing item)
      const itemToReplace = items.find(item => item.id === currentEditingItemId);

      if (itemToReplace) {
        // REPLACE MODE: Replace the existing item with the first processed item
        const firstJewelryItem = processedItems[0];

        // Get the appropriate price for the first item
        let displayValue = 0;
        if (activeTab === 0) { // Pawn tab
          displayValue = firstJewelryItem.price_estimates?.pawn || firstJewelryItem.pawn_price || 0;
        } else if (activeTab === 1) { // Buy tab
          displayValue = firstJewelryItem.price_estimates?.buy || firstJewelryItem.buy_price || 0;
        } else if (activeTab === 3) { // Sale tab
          displayValue = firstJewelryItem.price_estimates?.retail || firstJewelryItem.retail_price || 0;
        } else {
          displayValue = firstJewelryItem.price || 0;
        }

        // Replace the existing item
        const updatedItems = items.map(item => {
          if (item.id !== currentEditingItemId) return item;
          return {
            id: item.id, // Keep original ID
            description: firstJewelryItem.short_desc || firstJewelryItem.long_desc || '',
            value: displayValue,
            price: displayValue,
            ...firstJewelryItem
          };
        });

        // If there are additional items beyond the first one, add them as new lines
        if (processedItems.length > 1) {
          const additionalItems = processedItems.slice(1).map((jewelryItem) => {
            let displayValue = 0;
            if (activeTab === 0) { // Pawn tab
              displayValue = jewelryItem.price_estimates?.pawn || jewelryItem.pawn_price || 0;
            } else if (activeTab === 1) { // Buy tab
              displayValue = jewelryItem.price_estimates?.buy || jewelryItem.buy_price || 0;
            } else if (activeTab === 3) { // Sale tab
              displayValue = jewelryItem.price_estimates?.retail || jewelryItem.retail_price || 0;
            } else {
              displayValue = jewelryItem.price || 0;
            }

            return {
              id: Date.now() + Math.random(),
              description: jewelryItem.short_desc || jewelryItem.long_desc || '',
              value: displayValue,
              price: displayValue,
              ...jewelryItem
            };
          });
          setItems([...updatedItems, ...additionalItems]);
        } else {
          setItems(updatedItems);
        }
      } else {
        // ADD MODE: No item to replace, add all as new items
        const newItems = processedItems.map((jewelryItem) => {
          // Get the appropriate price based on the active tab
          let displayValue = 0;
          if (activeTab === 0) { // Pawn tab
            displayValue = jewelryItem.price_estimates?.pawn || jewelryItem.pawn_price || 0;
          } else if (activeTab === 1) { // Buy tab
            displayValue = jewelryItem.price_estimates?.buy || jewelryItem.buy_price || 0;
          } else if (activeTab === 3) { // Sale tab
            displayValue = jewelryItem.price_estimates?.retail || jewelryItem.retail_price || 0;
          } else {
            displayValue = jewelryItem.price || 0;
          }

          // Create a new item for the ticket
          return {
            id: Date.now() + Math.random(), // Generate unique ID
            description: jewelryItem.short_desc || jewelryItem.long_desc || '',
            value: displayValue,
            price: displayValue,
            ...jewelryItem
          };
        });

        // Add all new items to the existing items list
        setItems([...items, ...newItems]);
      }

      // Clear jewelry estimator storage to prevent items from reappearing
      const userId = user?.id || 'guest';
      sessionStorage.removeItem(`jewelEstimatorItems_user_${userId}`);
      localStorage.removeItem(`jewelEstimatorItems_user_${userId}`);

      // Close the dialog and reset states
      setCombinedDialogOpen(false);
      setMetalFormState(null);
      setGemFormState({ diamonds: [], stones: [], secondaryGems: [] });
      setCurrentEditingItemId(null);
      setPrefilledData(null);
      setAddedMetals([]);
      setAddedGems([]);
      return;
    }

    // Get primary and secondary gems from gemFormState
    const primaryDiamond = gemFormState?.diamonds?.find(d => d.isPrimary);
    const primaryStone = gemFormState?.stones?.find(s => s.isPrimary);
    const secondaryDiamonds = gemFormState?.diamonds?.filter(d => !d.isPrimary) || [];
    const secondaryStones = gemFormState?.stones?.filter(s => !s.isPrimary) || [];

    // Determine primary gem type
    const primaryGemType = primaryDiamond ? 'diamond' : primaryStone ? 'stone' : null;

    // Build description components
    const gemDescription = primaryGemType === 'diamond' && primaryDiamond
      ? ` ${primaryDiamond.shape}`
      : primaryGemType === 'stone' && primaryStone
        ? ` ${primaryStone.name}`
        : '';

    const secondaryGemsText = (secondaryDiamonds.length > 0 || secondaryStones.length > 0)
      ? ` with ${secondaryDiamonds.length + secondaryStones.length} secondary gems`
      : '';

    // Create the complete jewelryItem object following JewelEstimator.js structure
    const jewelryItem = {
      // Basic metal details
      metal_weight: metalFormState?.weight || 0,
      precious_metal_type: metalFormState?.preciousMetalType || '',
      non_precious_metal_type: metalFormState?.nonPreciousMetalType || null,
      metal_purity: metalFormState?.purity?.purity || '',
      metal_category: metalFormState?.metalCategory || '',
      jewelry_color: metalFormState?.jewelryColor || '',
      metal_spot_price: metalFormState?.spotPrice || 0,
      est_metal_value: metalFormState?.metalValue?.toFixed(2) || '0.00',
      purity_value: metalFormState?.purity?.value || 0,

      // Primary gem details
      primary_gem_category: primaryGemType,
      ...(primaryGemType === 'diamond' && primaryDiamond ? {
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
      } : primaryGemType === 'stone' && primaryStone ? {
        primary_gem_shape: primaryStone.shape || '',
        primary_gem_quantity: primaryStone.quantity || 0,
        primary_gem_authentic: primaryStone.authentic || false,
        primary_gem_type: primaryStone.name || '',
        primary_gem_color: primaryStone.color || '',
        primary_gem_weight: primaryStone.weight || 0,
        primary_gem_value: primaryStone.estimatedValue || 0
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

      // Price estimates - determine based on active tab
      transaction_type: activeTab === 0 ? 'pawn' : activeTab === 1 ? 'buy' : activeTab === 3 ? 'sale' : 'buy',
      buy_price: metalFormState?.metalValue || 0,
      pawn_price: metalFormState?.metalValue ? metalFormState.metalValue * 0.5 : 0,
      melt_value: metalFormState?.metalValue || 0,
      retail_price: metalFormState?.metalValue ? metalFormState.metalValue * 2 : 0,

      // Free text description
      notes: '',

      // Descriptions
      long_desc: metalFormState?.weight
        ? `${metalFormState.weight}g ${metalFormState.purity?.purity || ''} ${metalFormState.preciousMetalType} ${metalFormState.metalCategory}${gemDescription}${secondaryGemsText}`
        : '',
      short_desc: metalFormState?.weight
        ? `${metalFormState.weight}g ${metalFormState.purity?.purity || ''} ${metalFormState.preciousMetalType} ${metalFormState.metalCategory}`
        : ''
    };

    // Log the jewelryItem to console
    console.log("jewelryItem", jewelryItem);

    // Create updated item with data from both estimators
    const updatedItems = items.map(item => {
      if (item.id !== currentEditingItemId) return item;

      const updatedItem = { ...item };

      // Update with metal data if available
      if (metalFormState) {
        updatedItem.precious_metal_type = metalFormState.preciousMetalType || '';
        updatedItem.metal_weight = metalFormState.weight || 0;
        updatedItem.non_precious_metal_type = metalFormState.nonPreciousMetalType || '';
        updatedItem.metal_purity = metalFormState.purity?.purity || '';
        updatedItem.purity_value = metalFormState.purity?.value || 0;
        updatedItem.metal_spot_price = metalFormState.spotPrice || 0;
        updatedItem.est_metal_value = metalFormState.metalValue || 0;
        updatedItem.jewelry_color = metalFormState.jewelryColor || '';
        updatedItem.category = metalFormState.metalCategory || '';

        // Copy estimated metal value to the price column (rounded to 2 decimal places)
        if (metalFormState.metalValue) {
          updatedItem.price = Math.round(parseFloat(metalFormState.metalValue) * 100) / 100;
        }
      }

      // Update with gem data if available
      if (gemFormState) {
        if (gemFormState.diamonds?.length > 0) {
          updatedItem.diamonds = gemFormState.diamonds;
          updatedItem.primary_gem_category = 'diamond';
        }
        if (gemFormState.stones?.length > 0) {
          updatedItem.stones = gemFormState.stones;
          updatedItem.primary_gem_category = 'stone';
        }
        if (gemFormState.secondaryGems?.length > 0) {
          updatedItem.secondaryGems = gemFormState.secondaryGems;
        }
      }

      // Store the complete jewelryItem data in originalData for future reference
      updatedItem.originalData = jewelryItem;

      // Update description with long_desc or short_desc
      updatedItem.description = jewelryItem.long_desc || jewelryItem.short_desc || updatedItem.description;

      // Store both descriptions
      updatedItem.short_desc = jewelryItem.short_desc;
      updatedItem.long_desc = jewelryItem.long_desc;

      // Mark that this item came from the jewelry estimator
      updatedItem.sourceEstimator = 'jewelry';

      return updatedItem;
    });

    setItems(updatedItems);

    // Close dialog and reset state
    handleCombinedCancel();

    // Show success message
    showSnackbar('Item updated successfully', 'success');
  };

  // Handler for editing an item in the jewelry estimator
  const handleEditItem = (itemId) => {
    const { items } = getCurrentItems();
    const itemToEdit = items.find(item => item.id === itemId);
    
    if (!itemToEdit) return;
    
    // If the item came from the jewelry estimator, navigate there with the original data
    if (itemToEdit.sourceEstimator === 'jewelry' && itemToEdit.originalData) {
      navigate('/jewel-estimator', { 
        state: { 
          customer,
          editMode: true,
          itemToEdit: itemToEdit.originalData,
          returnToTicket: true,
          ticketItemId: itemId
        } 
      });
    } else if (itemToEdit.category?.toLowerCase().includes('jewelry')) {
      // If it's jewelry but not from estimator, still go to jewelry estimator
      // Try to parse data from the description
      const description = itemToEdit.description || '';
      
      // Create a more complete itemToEdit object that includes gem data
      const editItemData = {
        free_text: description,
        category: itemToEdit.category,
        price: itemToEdit.price || itemToEdit.value,
        transaction_type: activeTab === 0 ? 'pawn' : 
                        activeTab === 1 ? 'buy' : 
                        activeTab === 3 ? 'retail' : 'buy',
        // Include metal data if available
        metal_weight: itemToEdit.metal_weight,
        precious_metal_type: itemToEdit.precious_metal_type,
        metal_purity: itemToEdit.metal_purity,
        price_estimates: itemToEdit.price_estimates,
        
        // Include diamond and stone data if available
        diamonds: itemToEdit.diamonds || [],
        stones: itemToEdit.stones || []
      };
      
      navigate('/jewel-estimator', { 
        state: { 
          customer,
          editMode: true,
          itemToEdit: editItemData,
          returnToTicket: true,
          ticketItemId: itemId
        }
      });
    }
    // For other item types, we could implement different estimators in the future
  };
  
  const handleBullionEstimatorClick = () => {
    navigate('/bullion-estimator', { state: { customer } });
  };
  
  const handleMiscEstimatorClick = () => {
    navigate('/misc-estimator', { state: { customer } });
  };
  
  // Handlers for action buttons
  const [totals, setTotals] = React.useState({
    pawn: 0,
    buy: 0,
    trade: 0,
    sale: 0,
    repair: 0,
    payment: 0,
    refund: 0,
    redeem: 0
  });
  
  // Helper function to get the current tab's total
  const getCurrentTabTotal = () => {
    switch(activeTab) {
      case 0: return totals.pawn;
      case 1: return totals.buy;
      case 2: return totals.trade;
      case 3: return totals.sale;
      case 4: return totals.repair;
      case 5: return totals.payment;
      case 6: return totals.refund;
      case 7: return totals.redeem;
      default: return 0;
    }
  };

  // Helper function to format total with proper sign
  const formatTotal = (amount) => {
    const absAmount = Math.abs(amount);
    if (amount < 0) {
      return `-$${absAmount.toFixed(2)}`;
    }
    return `$${absAmount.toFixed(2)}`;
  };

  // Tax rate (13% default - Ontario)
  const [taxRate] = React.useState(0.13);

  // Helper function to calculate tax for current tab
  const getCurrentTabTax = () => {
    // Check if customer is tax exempt
    if (customer?.tax_exempt) {
      return 0;
    }

    // Only sale, repair, and redeem transactions are taxable (money coming IN)
    const currentTotal = getCurrentTabTotal();

    switch(activeTab) {
      case 3: // Sale
      case 4: // Repair
      case 7: // Redeem
        return Math.abs(currentTotal) * taxRate;
      default:
        return 0;
    }
  };

  // Helper function to get subtotal (before tax)
  const getCurrentTabSubtotal = () => {
    return getCurrentTabTotal();
  };

  // Helper function to get total with tax
  const getCurrentTabTotalWithTax = () => {
    const subtotal = getCurrentTabSubtotal();
    const tax = getCurrentTabTax();
    return subtotal + (subtotal < 0 ? 0 : tax); // Only add tax for positive amounts
  };

  // Helper function to calculate grand total (All Tickets) with tax
  const getAllTicketsTotal = () => {
    const taxRate = 0.13;
    const isTaxExempt = customer?.tax_exempt || false;

    // Non-taxable items (use subtotal as-is)
    const nonTaxableTotal = totals.pawn + totals.buy + totals.trade + totals.payment + totals.refund;

    // Taxable items (add tax unless customer is tax exempt)
    const saleTotalWithTax = isTaxExempt ? totals.sale : totals.sale * (1 + taxRate);
    const repairTotalWithTax = isTaxExempt ? totals.repair : totals.repair * (1 + taxRate);
    const redeemTotalWithTax = isTaxExempt ? totals.redeem : totals.redeem * (1 + taxRate);

    return nonTaxableTotal + saleTotalWithTax + repairTotalWithTax + redeemTotalWithTax;
  };

  // Fetch required fields for each transaction type on component mount
  React.useEffect(() => {
    const fetchRequiredFields = async () => {
      try {
        // Fetch transaction types from database
        const txTypesResponse = await fetch(`${config.apiUrl}/transaction-types`);
        let transactionTypes = ['pawn', 'buy', 'retail', 'sale', 'refund', 'return'];

        if (txTypesResponse.ok) {
          const txTypesData = await txTypesResponse.json();
          transactionTypes = txTypesData.map(tx => tx.type);
        }

        const fieldsMap = {};

        // Fetch required fields for each transaction type
        await Promise.all(
          transactionTypes.map(async (txType) => {
            try {
              const response = await fetch(`${config.apiUrl}/customer-preferences/required-fields/${txType}`);
              if (response.ok) {
                const data = await response.json();
                fieldsMap[txType] = data.requiredFields || [];
              } else {
                fieldsMap[txType] = [];
              }
            } catch (error) {
              console.error(`Error fetching required fields for ${txType}:`, error);
              fieldsMap[txType] = [];
            }
          })
        );

        setRequiredFieldsMap(fieldsMap);
      } catch (error) {
        console.error('Error fetching required fields:', error);
      }
    };

    fetchRequiredFields();
  }, []);

  // Validate customer against required fields for current transaction type
  const validateCustomerFields = React.useCallback(() => {
    if (!customer) {
      setCustomerValidationErrors(['No customer selected']);
      return false;
    }

    // Get transaction type based on active tab
    const transactionTypeMap = {
      0: 'pawn',
      1: 'buy',
      2: 'buy', // trade uses buy
      3: 'retail', // sale is retail
      4: 'buy', // repair uses buy
      5: 'buy', // payment uses buy
      6: 'refund'
    };

    const currentTransactionType = transactionTypeMap[activeTab] || 'pawn';
    const requiredFields = requiredFieldsMap[currentTransactionType] || [];

    // Check which required fields are missing or empty
    const missingFields = [];
    requiredFields.forEach(field => {
      const value = customer[field];
      if (value === null || value === undefined || value === '') {
        // Convert field name to readable format
        const fieldLabel = field
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        missingFields.push(fieldLabel);
      }
    });

    setCustomerValidationErrors(missingFields);
    return missingFields.length === 0;
  }, [customer, activeTab, requiredFieldsMap]);

  // Validate customer whenever customer or active tab changes
  React.useEffect(() => {
    if (customer) {
      setIsValidatingCustomer(true);
      validateCustomerFields();
      setIsValidatingCustomer(false);
    } else {
      setCustomerValidationErrors(['No customer selected']);
    }
  }, [customer, activeTab, validateCustomerFields]);

  const calculateTotal = () => {
    const { items } = getCurrentItems();
    let total = 0;
    
    switch(activeTab) {
      case 0: // Pawn
        total = items.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
        setTotals({ ...totals, pawn: total });
        break;
      case 1: // Buy
        total = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        setTotals({ ...totals, buy: total });
        break;
      case 2: // Trade
        total = items.reduce((sum, item) => sum + (parseFloat(item.priceDiff) || 0), 0);
        setTotals({ ...totals, trade: total });
        break;
      case 3: // Sale
        total = items.reduce((sum, item) => {
          const itemPrice = parseFloat(item.price) || 0;
          const protectionPlanAmount = item.protectionPlan ? itemPrice * 0.15 : 0;
          return sum + itemPrice + protectionPlanAmount;
        }, 0);
        setTotals({ ...totals, sale: total });
        break;
      case 4: // Repair
        total = items.reduce((sum, item) => sum + (parseFloat(item.fee) || 0), 0);
        setTotals({ ...totals, repair: total });
        break;
      case 5: // Payment
        total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        setTotals({ ...totals, payment: total });
        break;
      case 6: // Refund
        total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        setTotals({ ...totals, refund: total });
        break;
      default:
        break;
    }
    
    return total.toFixed(2);
  };
  
  const handleCancel = () => {
    // Reset only the active tab's data to initial empty values
    const { setItems } = getCurrentItems();
    
    switch(activeTab) {
      case 0: // Pawn items
        setItems([{ id: 1, description: '', category: '', value: '' }]);
        break;
      case 1: // Buy items
        setItems([{ id: 1, description: '', category: '', price: '' }]);
        break;
      case 2: // Trade items
        setItems([{ id: 1, tradeItem: '', tradeValue: '', storeItem: '', priceDiff: '' }]);
        break;
      case 3: // Sale items
        setItems([{ id: 1, description: '', category: '', price: '', paymentMethod: '' }]);
        break;
      case 4: // Repair items
        setItems([{ id: 1, description: '', issue: '', fee: '', completion: '' }]);
        break;
      case 5: // Payment items
        setItems([{ id: 1, pawnTicketId: '', description: '', principal: '', days: '', term: '', date: '', interest: '', fee: '', amount: '', images: [] }]);
        break;
      case 6: // Refund items
        setItems([{ id: 1, amount: '', method: '', reference: '', reason: '' }]);
        break;
      default:
        break;
    }
    
    // Stay on current tab and ticket page
  };
  
  const handleClearCurrentTab = () => {
    if (!customer) {
      showSnackbar('No customer selected', 'warning');
      return;
    }
    
    const { type } = getCurrentItems();
    if (!type) return;
    
    // Confirm before clearing
    if (window.confirm(`Clear all items in ${getTabName(activeTab)} tab?`)) {
      // Reset to initial state with one empty item
      let emptyItem;
      switch (activeTab) {
        case 0: // Pawn
          emptyItem = { id: 1, description: '', category: '', value: '' };
          setPawnItems([emptyItem]);
          break;
        case 1: // Buy
          emptyItem = { id: 1, description: '', category: '', price: '' };
          setBuyItems([emptyItem]);
          break;
        case 2: // Trade
          emptyItem = { id: 1, tradeItem: '', tradeValue: '', storeItem: '', priceDiff: '' };
          setTradeItems([emptyItem]);
          break;
        case 3: // Sale
          emptyItem = { id: 1, description: '', category: '', price: '', paymentMethod: '' };
          setSaleItems([emptyItem]);
          break;
        case 4: // Repair
          emptyItem = { id: 1, description: '', issue: '', fee: '', completion: '' };
          setRepairItems([emptyItem]);
          break;
        case 5: // Payment
          emptyItem = { id: 1, pawnTicketId: '', description: '', principal: '', days: '', term: '', date: '', interest: '', fee: '', amount: '', images: [] };
          setPaymentItems([emptyItem]);
          break;
        case 6: // Refund
          emptyItem = { id: 1, amount: '', method: '', reference: '', reason: '' };
          setRefundItems([emptyItem]);
          break;
        case 7: // Redeem
          emptyItem = { id: 1, pawnTicketId: '', description: '', principal: '', interest: '', totalAmount: '' };
          setRedeemItems([emptyItem]);
          break;
      }

      // Clear from localStorage
      clearTicketItems(type);
      showSnackbar(`Cleared all items in ${getTabName(activeTab)} tab`, 'success');
    }
  };

  const handleAddToCart = async () => {
    if (!customer) {
      setSnackbarMessage({
        open: true,
        message: 'Please select a customer before adding items to cart',
        severity: 'error'
      });
      return;
    }

    // Validate customer has all required fields
    const isValid = validateCustomerFields();
    if (!isValid) {
      const errorMessage = customerValidationErrors.length > 0
        ? `Missing required customer fields: ${customerValidationErrors.join(', ')}`
        : 'Customer is missing required fields';

      setSnackbarMessage({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
      return;
    }

    // Get items from current tab
    const { items, type } = getCurrentItems();
    
    // Filter out empty items
    const filteredItems = items.filter(item => {
      // Check fields based on item type
      if (activeTab === 0) { // Pawn items
        return item.description || item.value;
      } else if (activeTab === 1) { // Buy items
        return item.description || item.price;
      } else if (activeTab === 2) { // Trade items
        return item.tradeItem || item.storeItem;
      } else if (activeTab === 3) { // Sale items
        return item.description || item.price;
      } else if (activeTab === 4) { // Repair items
        return item.description || item.issue || item.fee;
      } else if (activeTab === 5) { // Payment items
        return item.amount || item.method;
      } else if (activeTab === 6) { // Refund items
        return item.amount || item.method || item.reason;
      } else if (activeTab === 7) { // Redeem items
        return item.pawnTicketId || item.totalAmount;
      }
      return false;
    });
    
    if (filteredItems.length === 0) {
      alert('No valid items to add to cart');
      return;
    }

    // Determine item type based on active tab
    let transaction_type;
    switch(activeTab) {
      case 0: transaction_type = 'pawn'; break;
      case 1: transaction_type = 'buy'; break;
      case 2: transaction_type = 'trade'; break;
      case 3: transaction_type = 'sale'; break;
      case 4: transaction_type = 'repair'; break;
      case 5: transaction_type = 'payment'; break;
      case 6: transaction_type = 'refund'; break;
      case 7: transaction_type = 'redeem'; break;
      default: transaction_type = 'unknown';
    }

    // Special handling for redeem transactions
    if (transaction_type === 'redeem') {
      try {
        const token = localStorage.getItem('token');

        // Update pawn ticket status to REDEEMED for each item
        for (const item of filteredItems) {
          if (item.pawnTicketId) {
            await fetch(`${config.apiUrl}/pawn-ticket/${item.pawnTicketId}/status`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ status: 'REDEEMED' })
            });
          }
        }

        setSnackbarMessage({
          open: true,
          message: 'Pawn ticket(s) successfully redeemed',
          severity: 'success'
        });

        // Clear redeem items after successful redemption
        setRedeemItems([createEmptyRedeemItem()]);

        return;
      } catch (error) {
        console.error('Error redeeming pawn ticket:', error);
        setSnackbarMessage({
          open: true,
          message: 'Failed to redeem pawn ticket',
          severity: 'error'
        });
        return;
      }
    }

    // Instead of navigating, save to session storage first
    try {
      // Use preserved buyTicketId if editing from cart, otherwise generate new one
      let buyTicketId;
      const isEditingFromCart = preservedBuyTicketId !== null;

      if (preservedBuyTicketId) {
        buyTicketId = preservedBuyTicketId;
        // Clear the preserved ID after using it
        setPreservedBuyTicketId(null);
      } else {
        // Determine ticket prefix based on transaction type
        let ticketPrefix;
        switch(transaction_type) {
          case 'pawn': ticketPrefix = 'PT'; break;
          case 'buy': ticketPrefix = 'BT'; break;
          case 'trade': ticketPrefix = 'TT'; break;
          case 'sale': ticketPrefix = 'ST'; break;
          case 'repair': ticketPrefix = 'RT'; break;
          case 'payment': ticketPrefix = 'PMT'; break;
          case 'refund': ticketPrefix = 'RFT'; break;
          case 'redeem': ticketPrefix = 'RDT'; break;
          default: ticketPrefix = 'TKT';
        }

        // Generate a unique ticket ID for this batch of items with sequential 8-digit number
        // Buy and Sale transactions share the same sequence number
        let storageKey;
        if (transaction_type === 'buy' || transaction_type === 'sale') {
          storageKey = 'lastBuySaleTicketNumber'; // Shared sequence for buy and sale
        } else {
          storageKey = `last${ticketPrefix}TicketNumber`; // Separate sequence for other types
        }

        let lastTicketNumber = parseInt(localStorage.getItem(storageKey) || '0');
        lastTicketNumber += 1;
        localStorage.setItem(storageKey, lastTicketNumber.toString());
        buyTicketId = `${ticketPrefix}-${lastTicketNumber.toString().padStart(8, '0')}`;
      }

      // Add item type, customer, and employee data to each item
      // Using user from component scope instead of calling useAuth() here
      const itemsWithMetadata = filteredItems.map(item => {
        // Create base metadata for all items
        const baseItem = {
          ...item,
          transaction_type: transaction_type,
          buyTicketId: buyTicketId, // Assign the ticket ID to all items in this batch
          customer: customer ? {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            phone: customer.phone || 'N/A',
            email: customer.email || 'N/A'
          } : null,
          employee: user ? {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role || 'Employee'
          } : null
        };
        
        // If the item came from the jewelry estimator, include all jewelry-specific fields
        if (item.sourceEstimator === 'jewelry') {
          // Use long_desc or short_desc from item level first, then originalData
          const jewelryDescription = item.long_desc ||
                                     item.short_desc ||
                                     item.originalData?.long_desc ||
                                     item.originalData?.short_desc ||
                                     item.description;

          // Preserve ALL jewelry fields by spreading originalData first, then current item
          // This ensures that ALL fields including vintage, stamps, brand, designer, etc. are preserved
          return {
            ...baseItem,
            // Spread all fields from originalData (includes ALL jewelry fields)
            ...(item.originalData || {}),
            // Then spread current item to override with any updates
            ...item,
            // Ensure these specific fields are always set correctly
            transaction_type: transaction_type,
            buyTicketId: buyTicketId,
            customer: baseItem.customer,
            employee: baseItem.employee,
            description: jewelryDescription,
            sourceEstimator: 'jewelry',
            // Store both short and long descriptions explicitly
            short_desc: item.short_desc || item.originalData?.short_desc,
            long_desc: item.long_desc || item.originalData?.long_desc,
            // Pass along the complete original data from the estimator
            originalData: item.originalData || null,
            // Ensure images are properly passed
            images: item.images || (item.image ? [item.image] : []),
            // Include timestamp for when the item was added to cart
            addedToCartAt: new Date().toISOString()
          };
        }
        
        return baseItem;
      });
      
      // Get existing cart items from session storage
      const existingCartItems = sessionStorage.getItem('cartItems');
      let cartItems = [];

      if (existingCartItems) {
        cartItems = JSON.parse(existingCartItems);
      }

      // If we're editing an item (isEditingFromCart is true), replace old items with new ones
      if (isEditingFromCart) {
        // Remove all items with the same buyTicketId
        cartItems = cartItems.filter(item => item.buyTicketId !== buyTicketId);
      }

      // Add new/edited items to cart
      cartItems = [...cartItems, ...itemsWithMetadata];
      
      // Save to session storage
      sessionStorage.setItem('cartItems', JSON.stringify(cartItems));
      
      // Save customer data to session storage if it exists
      if (customer) {
        sessionStorage.setItem('selectedCustomer', JSON.stringify(customer));
      }

      // Show success message
      showSnackbar('Items added to cart successfully.', 'success');

      // Clear items from the current tab after adding to cart
      if (activeTab === 0) { // Pawn tab
        setPawnItems([createEmptyPawnItem()]);
      } else if (activeTab === 1) { // Buy tab
        setBuyItems([createEmptyBuyItem()]);
      } else if (activeTab === 2) { // Trade tab
        setTradeItems([createEmptyTradeItem()]);
      } else if (activeTab === 3) { // Sale tab
        setSaleItems([createEmptySaleItem()]);
      } else if (activeTab === 4) { // Repair tab
        setRepairItems([createEmptyRepairItem()]);
      } else if (activeTab === 5) { // Payment tab
        setPaymentItems([createEmptyPaymentItem()]);
      } else if (activeTab === 6) { // Refund tab
        setRefundItems([createEmptyRefundItem()]);
      } else if (activeTab === 7) { // Redeem tab
        setRedeemItems([createEmptyRedeemItem()]);
      }

    } catch (error) {
      console.error('Error adding items to cart:', error);
      alert('There was an error adding items to cart. Please try again.');
    }
  };
  
  const handleCheckout = () => {
    // Helper function to generate buyTicketId for a transaction type
    const generateBuyTicketId = (transactionType) => {
      let ticketPrefix;
      switch(transactionType) {
        case 'pawn': ticketPrefix = 'PT'; break;
        case 'buy': ticketPrefix = 'BT'; break;
        case 'trade': ticketPrefix = 'TT'; break;
        case 'sale': ticketPrefix = 'ST'; break;
        case 'repair': ticketPrefix = 'RT'; break;
        case 'payment': ticketPrefix = 'PMT'; break;
        case 'refund': ticketPrefix = 'RFT'; break;
        case 'redeem': ticketPrefix = 'RDT'; break;
        default: ticketPrefix = 'TKT';
      }

      const storageKey = `last${ticketPrefix}TicketNumber`;
      let lastTicketNumber = parseInt(localStorage.getItem(storageKey) || '0');
      lastTicketNumber += 1;
      localStorage.setItem(storageKey, lastTicketNumber.toString());
      return `${ticketPrefix}-${lastTicketNumber.toString().padStart(8, '0')}`;
    };

    // Get all valid items from all tabs
    const allItems = [];

    // Add pawn items
    const validPawnItems = pawnItems.filter(item => item.description || item.value);
    if (validPawnItems.length > 0) {
      const pawnTicketId = generateBuyTicketId('pawn');
      validPawnItems.forEach(item => {
        allItems.push({
          ...item,
          transaction_type: 'pawn',
          buyTicketId: pawnTicketId,
          customer: customer ? {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            phone: customer.phone || 'N/A',
            email: customer.email || 'N/A'
          } : null,
          employee: user ? {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role || 'Employee'
          } : null
        });
      });
    }

    // Add buy items
    const validBuyItems = buyItems.filter(item => item.description || item.price);
    if (validBuyItems.length > 0) {
      const buyTicketId = generateBuyTicketId('buy');
      validBuyItems.forEach(item => {
        allItems.push({
          ...item,
          transaction_type: 'buy',
          buyTicketId: buyTicketId,
          customer: customer ? {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            phone: customer.phone || 'N/A',
            email: customer.email || 'N/A'
          } : null,
          employee: user ? {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role || 'Employee'
          } : null
        });
      });
    }

    // Add trade items
    const validTradeItems = tradeItems.filter(item => item.tradeItem || item.storeItem);
    if (validTradeItems.length > 0) {
      const tradeTicketId = generateBuyTicketId('trade');
      validTradeItems.forEach(item => {
        allItems.push({
          ...item,
          transaction_type: 'trade',
          buyTicketId: tradeTicketId,
          customer: customer ? {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            phone: customer.phone || 'N/A',
            email: customer.email || 'N/A'
          } : null,
          employee: user ? {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role || 'Employee'
          } : null
        });
      });
    }

    // Add sale items
    const validSaleItems = saleItems.filter(item => item.description || item.price);
    if (validSaleItems.length > 0) {
      const saleTicketId = generateBuyTicketId('sale');
      validSaleItems.forEach(item => {
        allItems.push({
          ...item,
          transaction_type: 'sale',
          buyTicketId: saleTicketId,
          customer: customer ? {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            phone: customer.phone || 'N/A',
            email: customer.email || 'N/A'
          } : null,
          employee: user ? {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role || 'Employee'
          } : null
        });
      });
    }

    // Add repair items
    const validRepairItems = repairItems.filter(item => item.description || item.issue || item.fee);
    if (validRepairItems.length > 0) {
      const repairTicketId = generateBuyTicketId('repair');
      validRepairItems.forEach(item => {
        allItems.push({
          ...item,
          transaction_type: 'repair',
          buyTicketId: repairTicketId,
          customer: customer ? {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            phone: customer.phone || 'N/A',
            email: customer.email || 'N/A'
          } : null,
          employee: user ? {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role || 'Employee'
          } : null
        });
      });
    }

    // Add payment items
    const validPaymentItems = paymentItems.filter(item => item.pawnTicketId || item.totalAmount);
    if (validPaymentItems.length > 0) {
      const paymentTicketId = generateBuyTicketId('payment');
      validPaymentItems.forEach(item => {
        allItems.push({
          ...item,
          transaction_type: 'payment',
          buyTicketId: paymentTicketId,
          customer: customer ? {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            phone: customer.phone || 'N/A',
            email: customer.email || 'N/A'
          } : null,
          employee: user ? {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role || 'Employee'
          } : null
        });
      });
    }

    // Add refund items
    const validRefundItems = refundItems.filter(item => item.amount || item.method || item.reason);
    if (validRefundItems.length > 0) {
      const refundTicketId = generateBuyTicketId('refund');
      validRefundItems.forEach(item => {
        allItems.push({
          ...item,
          transaction_type: 'refund',
          buyTicketId: refundTicketId,
          customer: customer ? {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            phone: customer.phone || 'N/A',
            email: customer.email || 'N/A'
          } : null,
          employee: user ? {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role || 'Employee'
          } : null
        });
      });
    }

    // Add redeem items
    const validRedeemItems = redeemItems.filter(item => item.pawnTicketId || item.totalAmount);
    if (validRedeemItems.length > 0) {
      const redeemTicketId = generateBuyTicketId('redeem');
      validRedeemItems.forEach(item => {
        allItems.push({
          ...item,
          transaction_type: 'redeem',
          buyTicketId: redeemTicketId,
          customer: customer ? {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            phone: customer.phone || 'N/A',
            email: customer.email || 'N/A'
          } : null,
          employee: user ? {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role || 'Employee'
          } : null
        });
      });
    }

    if (allItems.length === 0) {
      showSnackbar('No valid items to proceed to checkout', 'warning');
      return;
    }

    // Save all items to session storage for checkout
    sessionStorage.setItem('checkoutItems', JSON.stringify(allItems));

    // Save customer data to session storage
    if (customer) {
      sessionStorage.setItem('selectedCustomer', JSON.stringify(customer));
    }

    // Clear all tabs that had valid items after proceeding to checkout
    if (validPawnItems.length > 0) {
      setPawnItems([createEmptyPawnItem()]);
    }
    if (validBuyItems.length > 0) {
      setBuyItems([createEmptyBuyItem()]);
    }
    if (validTradeItems.length > 0) {
      setTradeItems([createEmptyTradeItem()]);
    }
    if (validSaleItems.length > 0) {
      setSaleItems([createEmptySaleItem()]);
    }
    if (validRepairItems.length > 0) {
      setRepairItems([createEmptyRepairItem()]);
    }
    if (validPaymentItems.length > 0) {
      setPaymentItems([createEmptyPaymentItem()]);
    }
    if (validRefundItems.length > 0) {
      setRefundItems([createEmptyRefundItem()]);
    }
    if (validRedeemItems.length > 0) {
      setRedeemItems([createEmptyRedeemItem()]);
    }

    // Navigate to checkout
    navigate('/checkout');
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  // Determine image source
  const getImageSource = () => {
    // Handle case where customer is undefined
    if (!customer || !customer.image) return '/placeholder-profile.png';
    
    if (customer.image instanceof File || customer.image instanceof Blob) {
      return URL.createObjectURL(customer.image);
    } else if (typeof customer.image === 'string') {
      return customer.image;
    } else if (customer.image && customer.image.data) {
      return bufferToDataUrl(customer.image);
    }
    return '/placeholder-profile.png';
  };

  // Determine item image source
  const getItemImageSource = (item) => {
    // Handle case where item has no image
    if (!item) return null;
    
    // Handle direct image string from CoinsBullions.js
    if (item.image) {
      if (item.image.file instanceof File || item.image.file instanceof Blob) {
        return URL.createObjectURL(item.image.file);
      } else if (item.image.url) {
        return item.image.url;
      } else if (typeof item.image === 'string') {
        return item.image;
      } else if (item.image && item.image.data) {
        return bufferToDataUrl(item.image);
      }
    }
    
    // Handle images array
    if (item.images && item.images.length > 0) {
      // Handle CoinsBullions.js direct image strings in array
      if (typeof item.images[0] === 'string') {
        return item.images[0];
      }
      // Handle legacy format with url property
      if (item.images[0].url) {
        return item.images[0].url;
      }
    }
    
    return null;
  };


// Use existing handleCheckout, formatDate, getImageSource and getItemImageSource functions that were already defined
// We removed the duplicate function declarations here to fix syntax errors

return (
  <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      {/* Customer Info Section - Top 30% */}
      <Box sx={{ 
        height: '30vh', 
        maxHeight: '30%', 
        display: 'flex', 
        flexDirection: 'row',
        justifyContent: 'space-between'
      }}>
          {/* Left side - Customer Info or Lookup */}
          <Box sx={{
            display: 'flex',
            width: '40%',
            borderRight: '1px solid #e0e0e0',
            maxHeight: '400px',
            overflowY: 'auto',
            overflowX: 'hidden',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f1f1f1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#888',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: '#555',
              },
            },
          }}>
            {!showLookupForm ? (
              /* Customer info view */
              <Grid container spacing={0} sx={{ width: '100%'}}>
                {/* Column 1: Customer Image */}
                <Grid item xs={3}>
                  <Box sx={{ 
                    display: 'flex',
                    m: 0,
                    p: 0,
                    alignItems: 'flex-start'
                  }}>
                    <Avatar
                      sx={{ width: 100, height: 100 }}
                      src={getImageSource()}
                      alt={customer ? `${customer.first_name} ${customer.last_name}` : 'Customer'}
                    />
                  </Box>
                </Grid>
                
                {/* Column 2: Customer Details */}
                <Grid item xs={9} sx={{ pl: 0, ml: 0 }}>
                  <Box sx={{ 
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mr: 5 }}>
                        {customer ? `${customer.first_name} ${customer.last_name}` : 'No Customer Selected'}
                      </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button 
                            variant="outlined" 
                            size="small" 
                            startIcon={<SearchIcon />}
                            onClick={() => setShowLookupForm(true)}
                          >
                            Search
                          </Button>
                          <Button 
                            variant="outlined" 
                            size="small" 
                            startIcon={<EditIcon />}
                            onClick={handleEditCustomer}
                            disabled={!customer}
                          >
                            Edit
                          </Button>
                        </Box>
                    </Box>
                    <Typography variant="body2">
                      <strong>Phone:</strong> {customer ? (customer.phone || 'Not provided') : 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Address:</strong> {customer ? (
                        customer.address_line1 ?
                          `${customer.address_line1}${customer.address_line2 ? ', ' + customer.address_line2 : ''},
                          ${customer.city || ''} ${customer.state || ''} ${customer.postal_code || ''}`.replace(/\s+/g, ' ').trim()
                          :
                          'Not provided'
                        ) : 'N/A'
                      }
                    </Typography>

                    {/* Customer Validation Errors Display */}
                    {customerValidationErrors.length > 0 && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                          Missing Required Fields:
                        </Typography>
                        <Typography variant="body2" component="div">
                          <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {customerValidationErrors.map((field, index) => (
                              <li key={index}>{field}</li>
                            ))}
                          </ul>
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          Please edit the customer to add these fields before adding items to cart.
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                </Grid>
              </Grid>
            ) : (
              /* Customer lookup form - takes the entire space */
              <Box sx={{ width: '100%' }}>
                <Grid container spacing={1} direction="column">
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '90%' }}>
                      <TextField
                        name="first_name"
                        label="First Name"
                        value={searchForm.first_name}
                        onChange={handleLookupInputChange}
                        size="small"
                        sx={{ width: '48%' }}
                      />
                      <TextField
                        name="last_name"
                        label="Last Name"
                        value={searchForm.last_name}
                        onChange={handleLookupInputChange}
                        size="small"
                        sx={{ width: '48%' }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="id_number"
                      label="ID Number"
                      value={searchForm.id_number}
                      onChange={handleLookupInputChange}
                      size="small"
                      sx={{ width: '90%' }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="phone"
                      label="Phone Number"
                      value={searchForm.phone}
                      onChange={handleLookupInputChange}
                      size="small"
                      sx={{ width: '90%' }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '90%' }}>
                      <Box>
                        <Button
                          variant="outlined"
                          onClick={handleCancelLookup}
                          size="small"
                        >
                          Cancel
                        </Button>
                      </Box>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSearchCustomer}
                        size="small"
                      >
                        Search
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
          {/* Right side - Loan List for Payment/Redeem tabs, KPI for others */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '58%',
            pl: 2
          }}>
            {(activeTab === 5 || activeTab === 7) ? (
              // Show loan list for Payment and Redeem tabs
              <Box sx={{ width: '100%', maxHeight: '200px', overflowY: 'auto' }}>
                {customerLoans.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {customer ? 'No active loans found' : 'Select a customer to view loans'}
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Ticket ID</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Principal</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {customerLoans.map((loan) => (
                        <TableRow key={loan.pawn_ticket_id} hover>
                          <TableCell>{loan.pawn_ticket_id}</TableCell>
                          <TableCell>{loan.item_description || loan.item_id || 'N/A'}</TableCell>
                          <TableCell align="right">${parseFloat(loan.item_price || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Typography
                              variant="caption"
                              sx={{
                                color: loan.item_status === 'PAWN' ? '#1a8d48' : '#1976d2',
                                fontWeight: 'bold'
                              }}
                            >
                              {loan.item_status || 'N/A'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>
            ) : (
              // Show KPI for other tabs
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                    <AttachMoneyIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>${portfolioData.totalValue}</Typography>
                    <Typography variant="body2" color="text.secondary" align="center">Total Value</Typography>
                  </Card>
                </Grid>

                <Grid item xs={4}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                    <AccountBalanceWalletIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{portfolioData.transactions}</Typography>
                    <Typography variant="body2" color="text.secondary" align="center">Transactions</Typography>
                  </Card>
                </Grid>

                <Grid item xs={4}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                    <InventoryIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{portfolioData.itemsCount}</Typography>
                    <Typography variant="body2" color="text.secondary" align="center">Items</Typography>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        </Box>

        <Grid container spacing={2}>
          {/* Customer details */}
          <Grid item xs={12} md={12}>
            <Card>
              <CardContent>
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', flexGrow: 1 }}>
                      <Tabs 
                        value={activeTab} 
                        onChange={handleTabChange} 
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ mb: 1 }}
                      >
                        <Tab label={`Pawn${hasActiveItems(0) ? ' *' : ''}`} />
                        <Tab label={`Buy${hasActiveItems(1) ? ' *' : ''}`} />
                        <Tab label={`Trade${hasActiveItems(2) ? ' *' : ''}`} />
                        <Tab label={`Sale${hasActiveItems(3) ? ' *' : ''}`} />
                        <Tab label={`Repair${hasActiveItems(4) ? ' *' : ''}`} />
                        <Tab label={`Payment${hasActiveItems(5) ? ' *' : ''}`} />
                        <Tab label={`Refund${hasActiveItems(6) ? ' *' : ''}`} />
                        <Tab label={`Redeem${hasActiveItems(7) ? ' *' : ''}`} />
                      </Tabs>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', pr: 2 }}>
                      <Typography variant="h6" color="primary" sx={{ ml: 2 }}>
                        All Tickets: ${getAllTicketsTotal().toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Pawn Tab */}
                  {activeTab === 0 && (
                    <Box sx={{ p: 1 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width="15%" align="center">Estimator</TableCell>
                              <TableCell width="10%" align="center">Image</TableCell>
                              <TableCell width="50%">Item Description</TableCell>
                              <TableCell width="10%">Est. Value</TableCell>
                              <TableCell width="20%" align="right" padding="none">
                                <Tooltip title="Add Item">
                                  <IconButton size="small" color="primary" onClick={handleAddRow}>
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {pawnItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell align="center" padding="normal">
                                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <Tooltip title="Jewelry Estimator">
                                      <IconButton
                                        size="small"
                                        color="secondary"
                                        onClick={() => handleJewelryEstimatorClick(item.id, 'pawn')}
                                        sx={{
                                          bgcolor: selectedJewelryEstimator[`pawn-${item.id}`] ? 'secondary.main' : 'transparent',
                                          color: selectedJewelryEstimator[`pawn-${item.id}`] ? 'white' : 'inherit',
                                          '&:hover': {
                                            bgcolor: selectedJewelryEstimator[`pawn-${item.id}`] ? 'secondary.dark' : 'action.hover'
                                          }
                                        }}
                                      >
                                        <DiamondIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Bullion Estimator">
                                      <IconButton size="small" color="primary" onClick={handleBullionEstimatorClick}>
                                        <MonetizationOnIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Misc Estimator">
                                      <IconButton size="small" color="success" onClick={handleMiscEstimatorClick}>
                                        <WatchIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  {(item.images && item.images.length > 0) || item.image ? (
                                    <img
                                      src={item.images?.[0]?.url || item.image}
                                      alt="Item"
                                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        width: '50px',
                                        height: '50px',
                                        bgcolor: 'grey.200',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px'
                                      }}
                                    >
                                      <PhotoCamera sx={{ color: 'grey.400' }} />
                                    </Box>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.description}
                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                    onKeyPress={(e) => handleDescriptionKeyPress(e, item.id)}
                                    placeholder="e.g., R 10k 2g YG"
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.value}
                                    onChange={(e) => handleItemChange(item.id, 'value', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => handleEditItem(item.id)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Convert">
                                    <IconButton size="small" onClick={(e) => handleConvertClick(e, item.id)}>
                                      <SwapHorizIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Duplicate">
                                    <IconButton size="small" onClick={() => handleDuplicateItem(item.id)}>
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mt: 2, pr: 2, gap: 0.5 }}>
                        <Typography variant="body1" color="text.secondary">
                          Subtotal: {formatTotal(getCurrentTabSubtotal())}
                        </Typography>
                        {getCurrentTabTax() > 0 && (
                          <Typography variant="body1" color="text.secondary">
                            Tax ({(taxRate * 100).toFixed(1)}%): ${getCurrentTabTax().toFixed(2)}
                          </Typography>
                        )}
                        <Typography variant="h6" color="primary">
                          Total: {formatTotal(getCurrentTabTotalWithTax())}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Buy Tab */}
                  {activeTab === 1 && (
                    <Box sx={{ p: 1 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width="15%" align="center">Estimator</TableCell>
                              <TableCell width="10%" align="center">Image</TableCell>
                              <TableCell width="50%">Item Description</TableCell>
                              <TableCell width="10%">Price</TableCell>
                              <TableCell width="15%" align="right" padding="none">
                                <Tooltip title="Add Item">
                                  <IconButton size="small" color="primary" onClick={handleAddRow}>
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {buyItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell align="center" padding="normal">
                                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <Tooltip title="Jewelry Estimator">
                                      <IconButton
                                        size="small"
                                        color="secondary"
                                        onClick={() => handleJewelryEstimatorClick(item.id, 'buy')}
                                        sx={{
                                          bgcolor: selectedJewelryEstimator[`buy-${item.id}`] ? 'secondary.main' : 'transparent',
                                          color: selectedJewelryEstimator[`buy-${item.id}`] ? 'white' : 'inherit',
                                          '&:hover': {
                                            bgcolor: selectedJewelryEstimator[`buy-${item.id}`] ? 'secondary.dark' : 'action.hover'
                                          }
                                        }}
                                      >
                                        <DiamondIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Bullion Estimator">
                                      <IconButton size="small" color="primary" onClick={handleBullionEstimatorClick}>
                                        <MonetizationOnIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Misc Estimator">
                                      <IconButton size="small" color="success" onClick={handleMiscEstimatorClick}>
                                        <WatchIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  {(item.images && item.images.length > 0) || item.image ? (
                                    <img
                                      src={item.images?.[0]?.url || item.image}
                                      alt="Item"
                                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        width: '50px',
                                        height: '50px',
                                        bgcolor: 'grey.200',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px'
                                      }}
                                    >
                                      <PhotoCamera sx={{ color: 'grey.400' }} />
                                    </Box>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.description}
                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                    onKeyPress={(e) => handleDescriptionKeyPress(e, item.id)}
                                    placeholder="e.g., R 10k 2g YG"
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.price}
                                    onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => handleEditItem(item.id)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Convert">
                                    <IconButton size="small" onClick={(e) => handleConvertClick(e, item.id)}>
                                      <SwapHorizIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Duplicate">
                                    <IconButton size="small" onClick={() => handleDuplicateItem(item.id)}>
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mt: 2, pr: 2, gap: 0.5 }}>
                        <Typography variant="body1" color="text.secondary">
                          Subtotal: {formatTotal(getCurrentTabSubtotal())}
                        </Typography>
                        {getCurrentTabTax() > 0 && (
                          <Typography variant="body1" color="text.secondary">
                            Tax ({(taxRate * 100).toFixed(1)}%): ${getCurrentTabTax().toFixed(2)}
                          </Typography>
                        )}
                        <Typography variant="h6" color="primary">
                          Total: {formatTotal(getCurrentTabTotalWithTax())}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Trade Tab */}
                  {activeTab === 2 && (
                    <Box sx={{ p: 1 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width="15%" align="center">Estimator</TableCell>
                              <TableCell width="10%" align="center">Image</TableCell>
                              <TableCell width="20%">Trade In Item</TableCell>
                              <TableCell width="10%">Trade Value</TableCell>
                              <TableCell width="20%">Store Item</TableCell>
                              <TableCell width="5%">Price Diff</TableCell>
                              <TableCell width="20%" align="right" padding="none">
                                <Tooltip title="Add Item">
                                  <IconButton size="small" color="primary" onClick={handleAddRow}>
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {tradeItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell align="center" padding="normal">
                                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <Tooltip title="Jewelry Estimator">
                                      <IconButton
                                        size="small"
                                        color="secondary"
                                        onClick={() => handleJewelryEstimatorClick(item.id, 'trade')}
                                        sx={{
                                          bgcolor: selectedJewelryEstimator[`trade-${item.id}`] ? 'secondary.main' : 'transparent',
                                          color: selectedJewelryEstimator[`trade-${item.id}`] ? 'white' : 'inherit',
                                          '&:hover': {
                                            bgcolor: selectedJewelryEstimator[`trade-${item.id}`] ? 'secondary.dark' : 'action.hover'
                                          }
                                        }}
                                      >
                                        <DiamondIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Bullion Estimator">
                                      <IconButton size="small" color="primary" onClick={handleBullionEstimatorClick}>
                                        <MonetizationOnIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Misc Estimator">
                                      <IconButton size="small" color="success" onClick={handleMiscEstimatorClick}>
                                        <WatchIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  {(item.images && item.images.length > 0) || item.image ? (
                                    <img
                                      src={item.images?.[0]?.url || item.image}
                                      alt="Item"
                                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        width: '50px',
                                        height: '50px',
                                        bgcolor: 'grey.200',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px'
                                      }}
                                    >
                                      <PhotoCamera sx={{ color: 'grey.400' }} />
                                    </Box>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.tradeItem}
                                    onChange={(e) => handleItemChange(item.id, 'tradeItem', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.tradeValue}
                                    onChange={(e) => handleItemChange(item.id, 'tradeValue', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.storeItem}
                                    onChange={(e) => handleItemChange(item.id, 'storeItem', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.priceDiff}
                                    onChange={(e) => handleItemChange(item.id, 'priceDiff', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => handleEditItem(item.id)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Convert">
                                    <IconButton size="small" onClick={(e) => handleConvertClick(e, item.id)}>
                                      <SwapHorizIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Duplicate">
                                    <IconButton size="small" onClick={() => handleDuplicateItem(item.id)}>
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mt: 2, pr: 2, gap: 0.5 }}>
                        <Typography variant="body1" color="text.secondary">
                          Subtotal: {formatTotal(getCurrentTabSubtotal())}
                        </Typography>
                        {getCurrentTabTax() > 0 && (
                          <Typography variant="body1" color="text.secondary">
                            Tax ({(taxRate * 100).toFixed(1)}%): ${getCurrentTabTax().toFixed(2)}
                          </Typography>
                        )}
                        <Typography variant="h6" color="primary">
                          Total: {formatTotal(getCurrentTabTotalWithTax())}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Sale Tab */}
                  {activeTab === 3 && (
                    <Box sx={{ p: 1 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width="12%" align="center">Inventory</TableCell>
                              <TableCell width="8%" align="center">Image</TableCell>
                              <TableCell width="50%">Item Description</TableCell>
                              <TableCell width="10%">Sale Price</TableCell>
                              <TableCell width="20%" align="right" padding="none">
                                <Tooltip title="Add Item">
                                  <IconButton size="small" color="primary" onClick={handleAddRow}>
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {saleItems.map((item) => (
                              <React.Fragment key={item.id}>
                                {/* Main item row */}
                                <TableRow>
                                  <TableCell align="center" padding="normal">
                                    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                      <Tooltip title="Inventory">
                                        <IconButton size="small" color="secondary" onClick={() => handleJewelryEstimatorClick(item.id, 'sale')}>
                                          <DiamondIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Bullion Estimator">
                                        <IconButton size="small" color="primary" onClick={handleBullionEstimatorClick}>
                                          <MonetizationOnIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Misc Estimator">
                                        <IconButton size="small" color="success" onClick={handleMiscEstimatorClick}>
                                          <WatchIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  </TableCell>
                                  <TableCell align="center">
                                    {item.images && item.images.length > 0 ? (
                                      <Tooltip title="Item image">
                                        <Box
                                          sx={{
                                            padding: 0,
                                            display: 'inline-block'
                                          }}
                                        >
                                          <img
                                            src={
                                              typeof item.images[0] === 'string'
                                                ? (item.images[0].startsWith('http') ? item.images[0] : `${config.apiUrl.replace('/api', '')}${item.images[0]}`)
                                                : (item.images[0].url?.startsWith('http') ? item.images[0].url : `${config.apiUrl.replace('/api', '')}${item.images[0].url}`)
                                            }
                                            alt="Item"
                                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                                          />
                                        </Box>
                                      </Tooltip>
                                    ) : (
                                      <Tooltip title="No image available">
                                        <Box
                                          sx={{
                                            width: '50px',
                                            height: '50px',
                                            bgcolor: 'grey.200',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '4px'
                                          }}
                                        >
                                          <PhotoCamera sx={{ color: 'grey.400' }} />
                                        </Box>
                                      </Tooltip>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <TextField
                                      variant="standard"
                                      fullWidth
                                      value={item.description}
                                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                      onKeyPress={(e) => handleDescriptionKeyPress(e, item.id)}
                                      placeholder="e.g., R 10k 2g YG"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <TextField
                                      variant="standard"
                                      fullWidth
                                      value={item.price}
                                      onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    <Tooltip title="Edit">
                                      <IconButton size="small" onClick={() => handleEditItem(item.id)}>
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Protection Plan">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleItemChange(item.id, 'protectionPlan', !item.protectionPlan)}
                                        color={item.protectionPlan ? 'primary' : 'default'}
                                      >
                                        <SecurityIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Convert">
                                      <IconButton size="small" onClick={(e) => handleConvertClick(e, item.id)}>
                                        <SwapHorizIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Duplicate">
                                      <IconButton size="small" onClick={() => handleDuplicateItem(item.id)}>
                                        <ContentCopyIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                      <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>

                                {/* Protection plan row - shown as separate line if enabled */}
                                {item.protectionPlan && (
                                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                                    <TableCell colSpan={2} />
                                    <TableCell>
                                      <Typography variant="body2" sx={{ fontStyle: 'italic', pl: 2 }}>
                                        Protection Plan (15%)
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="body2">
                                        ${((parseFloat(item.price) || 0) * 0.15).toFixed(2)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell />
                                  </TableRow>
                                )}
                              </React.Fragment>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mt: 2, pr: 2, gap: 0.5 }}>
                        <Typography variant="body1" color="text.secondary">
                          Subtotal: {formatTotal(getCurrentTabSubtotal())}
                        </Typography>
                        {getCurrentTabTax() > 0 && (
                          <Typography variant="body1" color="text.secondary">
                            Tax ({(taxRate * 100).toFixed(1)}%): ${getCurrentTabTax().toFixed(2)}
                          </Typography>
                        )}
                        <Typography variant="h6" color="primary">
                          Total: {formatTotal(getCurrentTabTotalWithTax())}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Repair Tab */}
                  {activeTab === 4 && (
                    <Box sx={{ p: 1 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width="15%" align="center">Estimator</TableCell>
                              <TableCell width="10%" align="center">Image</TableCell>
                              <TableCell width="20%">Item Description</TableCell>
                              <TableCell width="20%">Issue</TableCell>
                              <TableCell width="10%">Service Fee</TableCell>
                              <TableCell width="10%">Est. Completion</TableCell>
                              <TableCell width="20%" align="right" padding="none">
                                <Tooltip title="Add Item">
                                  <IconButton size="small" color="primary" onClick={handleAddRow}>
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {repairItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell align="center" padding="normal">
                                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <Tooltip title="Jewelry Estimator">
                                      <IconButton
                                        size="small"
                                        color="secondary"
                                        onClick={() => handleJewelryEstimatorClick(item.id, 'repair')}
                                        sx={{
                                          bgcolor: selectedJewelryEstimator[`repair-${item.id}`] ? 'secondary.main' : 'transparent',
                                          color: selectedJewelryEstimator[`repair-${item.id}`] ? 'white' : 'inherit',
                                          '&:hover': {
                                            bgcolor: selectedJewelryEstimator[`repair-${item.id}`] ? 'secondary.dark' : 'action.hover'
                                          }
                                        }}
                                      >
                                        <DiamondIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Bullion Estimator">
                                      <IconButton size="small" color="primary" onClick={handleBullionEstimatorClick}>
                                        <MonetizationOnIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Misc Estimator">
                                      <IconButton size="small" color="success" onClick={handleMiscEstimatorClick}>
                                        <WatchIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  {(item.images && item.images.length > 0) || item.image ? (
                                    <img
                                      src={item.images?.[0]?.url || item.image}
                                      alt="Item"
                                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        width: '50px',
                                        height: '50px',
                                        bgcolor: 'grey.200',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px'
                                      }}
                                    >
                                      <PhotoCamera sx={{ color: 'grey.400' }} />
                                    </Box>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.description}
                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                    onKeyPress={(e) => handleDescriptionKeyPress(e, item.id)}
                                    placeholder="e.g., R 10k 2g YG"
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.issue}
                                    onChange={(e) => handleItemChange(item.id, 'issue', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.fee}
                                    onChange={(e) => handleItemChange(item.id, 'fee', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.completion}
                                    onChange={(e) => handleItemChange(item.id, 'completion', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => handleEditItem(item.id)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Convert">
                                    <IconButton size="small" onClick={(e) => handleConvertClick(e, item.id)}>
                                      <SwapHorizIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Duplicate">
                                    <IconButton size="small" onClick={() => handleDuplicateItem(item.id)}>
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mt: 2, pr: 2, gap: 0.5 }}>
                        <Typography variant="body1" color="text.secondary">
                          Subtotal: {formatTotal(getCurrentTabSubtotal())}
                        </Typography>
                        {getCurrentTabTax() > 0 && (
                          <Typography variant="body1" color="text.secondary">
                            Tax ({(taxRate * 100).toFixed(1)}%): ${getCurrentTabTax().toFixed(2)}
                          </Typography>
                        )}
                        <Typography variant="h6" color="primary">
                          Total: {formatTotal(getCurrentTabTotalWithTax())}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                                    {/* Payment Tab */}
                  {activeTab === 5 && (
                    <Box sx={{ p: 1 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width="8%" align="center">Image</TableCell>
                              <TableCell width="10%">Pawn Ticket ID</TableCell>
                              <TableCell width="18%">Description</TableCell>
                              <TableCell width="9%">Principal</TableCell>
                              <TableCell width="8%">Days</TableCell>
                              <TableCell width="8%">Term</TableCell>
                              <TableCell width="10%">Date</TableCell>
                              <TableCell width="9%">Interest</TableCell>
                              <TableCell width="9%">Insurance Fee</TableCell>
                              <TableCell width="9%">Amount</TableCell>
                              <TableCell width="5%" align="right" padding="none">
                                <Tooltip title="Add Item">
                                  <IconButton size="small" color="primary" onClick={handleAddRow}>
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {paymentItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell align="center">
                                  {(item.images && item.images.length > 0) || item.image ? (
                                    <img
                                      src={item.images?.[0]?.url || item.image}
                                      alt="Item"
                                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                                      onClick={() => handleOpenCamera(item.id, 'payment')}
                                    />
                                  ) : (
                                    <Box
                                      onClick={() => handleOpenCamera(item.id, 'payment')}
                                      sx={{
                                        width: '50px',
                                        height: '50px',
                                        bgcolor: 'grey.200',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        '&:hover': {
                                          bgcolor: 'grey.300'
                                        }
                                      }}
                                    >
                                      <PhotoCamera sx={{ color: 'grey.400' }} />
                                    </Box>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.pawnTicketId}
                                    onChange={(e) => handleItemChange(item.id, 'pawnTicketId', e.target.value)}
                                    placeholder="Enter Pawn Ticket ID"
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.description}
                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                    InputProps={{
                                      readOnly: true,
                                      style: { color: 'rgba(0, 0, 0, 0.87)' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.principal}
                                    onChange={(e) => handleItemChange(item.id, 'principal', e.target.value)}
                                    InputProps={{
                                      readOnly: true,
                                      style: { color: 'rgba(0, 0, 0, 0.87)' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    type="number"
                                    value={item.days}
                                    onChange={(e) => handleItemChange(item.id, 'days', e.target.value)}
                                    placeholder="30"
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.term}
                                    InputProps={{
                                      readOnly: true,
                                      style: { color: 'rgba(0, 0, 0, 0.87)' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    type="date"
                                    value={item.date}
                                    InputProps={{
                                      readOnly: true,
                                      style: { color: 'rgba(0, 0, 0, 0.87)' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.interest}
                                    InputProps={{
                                      readOnly: true,
                                      style: { color: 'rgba(0, 0, 0, 0.87)' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.fee}
                                    onChange={(e) => handleItemChange(item.id, 'fee', e.target.value)}
                                    InputProps={{
                                      readOnly: true,
                                      style: { color: 'rgba(0, 0, 0, 0.87)' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.amount}
                                    onChange={(e) => handleItemChange(item.id, 'amount', e.target.value)}
                                    InputProps={{
                                      readOnly: true,
                                      style: { color: 'rgba(0, 0, 0, 0.87)' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mt: 2, pr: 2, gap: 0.5 }}>
                        <Typography variant="body1" color="text.secondary">
                          Subtotal: {formatTotal(getCurrentTabSubtotal())}
                        </Typography>
                        {getCurrentTabTax() > 0 && (
                          <Typography variant="body1" color="text.secondary">
                            Tax ({(taxRate * 100).toFixed(1)}%): ${getCurrentTabTax().toFixed(2)}
                          </Typography>
                        )}
                        <Typography variant="h6" color="primary">
                          Total: {formatTotal(getCurrentTabTotalWithTax())}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Refund Tab */}
                  {activeTab === 6 && (
                    <Box sx={{ p: 1 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width="15%" align="center">Estimator</TableCell>
                              <TableCell width="10%" align="center">Image</TableCell>
                              <TableCell width="10%">Amount</TableCell>
                              <TableCell width="15%">Refund Method</TableCell>
                              <TableCell width="15%">Reference</TableCell>
                              <TableCell width="20%">Reason</TableCell>
                              <TableCell width="20%" align="right" padding="none">
                                <Tooltip title="Add Item">
                                  <IconButton size="small" color="primary" onClick={handleAddRow}>
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {refundItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell align="center" padding="normal">
                                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <Tooltip title="Jewelry Estimator">
                                      <IconButton
                                        size="small"
                                        color="secondary"
                                        onClick={() => handleJewelryEstimatorClick(item.id, 'refund')}
                                        sx={{
                                          bgcolor: selectedJewelryEstimator[`refund-${item.id}`] ? 'secondary.main' : 'transparent',
                                          color: selectedJewelryEstimator[`refund-${item.id}`] ? 'white' : 'inherit',
                                          '&:hover': {
                                            bgcolor: selectedJewelryEstimator[`refund-${item.id}`] ? 'secondary.dark' : 'action.hover'
                                          }
                                        }}
                                      >
                                        <DiamondIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Bullion Estimator">
                                      <IconButton size="small" color="primary" onClick={handleBullionEstimatorClick}>
                                        <MonetizationOnIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Misc Estimator">
                                      <IconButton size="small" color="success" onClick={handleMiscEstimatorClick}>
                                        <WatchIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  {(item.images && item.images.length > 0) || item.image ? (
                                    <img
                                      src={item.images?.[0]?.url || item.image}
                                      alt="Item"
                                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        width: '50px',
                                        height: '50px',
                                        bgcolor: 'grey.200',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px'
                                      }}
                                    >
                                      <PhotoCamera sx={{ color: 'grey.400' }} />
                                    </Box>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.amount}
                                    onChange={(e) => handleItemChange(item.id, 'amount', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.method}
                                    onChange={(e) => handleItemChange(item.id, 'method', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.reference}
                                    onChange={(e) => handleItemChange(item.id, 'reference', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.reason}
                                    onChange={(e) => handleItemChange(item.id, 'reason', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => handleEditItem(item.id)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Convert">
                                    <IconButton size="small" onClick={(e) => handleConvertClick(e, item.id)}>
                                      <SwapHorizIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Duplicate">
                                    <IconButton size="small" onClick={() => handleDuplicateItem(item.id)}>
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mt: 2, pr: 2, gap: 0.5 }}>
                        <Typography variant="body1" color="text.secondary">
                          Subtotal: {formatTotal(getCurrentTabSubtotal())}
                        </Typography>
                        {getCurrentTabTax() > 0 && (
                          <Typography variant="body1" color="text.secondary">
                            Tax ({(taxRate * 100).toFixed(1)}%): ${getCurrentTabTax().toFixed(2)}
                          </Typography>
                        )}
                        <Typography variant="h6" color="primary">
                          Total: {formatTotal(getCurrentTabTotalWithTax())}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Redeem Tab */}
                  {activeTab === 7 && (
                    <Box sx={{ p: 1 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width="10%" align="center">Image</TableCell>
                              <TableCell width="18%">Pawn Ticket ID</TableCell>
                              <TableCell width="30%">Description</TableCell>
                              <TableCell width="15%">Principal</TableCell>
                              <TableCell width="15%">Interest/Fee</TableCell>
                              <TableCell width="15%">Total Amount</TableCell>
                              <TableCell width="7%" align="right" padding="none">
                                <Tooltip title="Add Item">
                                  <IconButton size="small" color="primary" onClick={handleAddRow}>
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {redeemItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell align="center">
                                  {(item.images && item.images.length > 0) || item.image ? (
                                    <img
                                      src={item.images?.[0]?.url || item.image}
                                      alt="Item"
                                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                                      onClick={() => handleOpenCamera(item.id, 'redeem')}
                                    />
                                  ) : (
                                    <Box
                                      onClick={() => handleOpenCamera(item.id, 'redeem')}
                                      sx={{
                                        width: '50px',
                                        height: '50px',
                                        bgcolor: 'grey.200',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        '&:hover': {
                                          bgcolor: 'grey.300'
                                        }
                                      }}
                                    >
                                      <PhotoCamera sx={{ color: 'grey.400' }} />
                                    </Box>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.pawnTicketId}
                                    onChange={(e) => handleItemChange(item.id, 'pawnTicketId', e.target.value)}
                                    InputProps={{
                                      readOnly: true,
                                      style: { color: 'rgba(0, 0, 0, 0.87)' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.description}
                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                    InputProps={{
                                      readOnly: true,
                                      style: { color: 'rgba(0, 0, 0, 0.87)' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.principal}
                                    onChange={(e) => handleItemChange(item.id, 'principal', e.target.value)}
                                    InputProps={{
                                      readOnly: true,
                                      style: { color: 'rgba(0, 0, 0, 0.87)' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.interest}
                                    onChange={(e) => handleItemChange(item.id, 'interest', e.target.value)}
                                    InputProps={{
                                      readOnly: true,
                                      style: { color: 'rgba(0, 0, 0, 0.87)' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={item.totalAmount}
                                    onChange={(e) => handleItemChange(item.id, 'totalAmount', e.target.value)}
                                    InputProps={{
                                      readOnly: true,
                                      style: { color: 'rgba(0, 0, 0, 0.87)' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mt: 2, pr: 2, gap: 0.5 }}>
                        <Typography variant="body1" color="text.secondary">
                          Subtotal: {formatTotal(getCurrentTabSubtotal())}
                        </Typography>
                        {getCurrentTabTax() > 0 && (
                          <Typography variant="body1" color="text.secondary">
                            Tax ({(taxRate * 100).toFixed(1)}%): ${getCurrentTabTax().toFixed(2)}
                          </Typography>
                        )}
                        <Typography variant="h6" color="primary">
                          Total: {formatTotal(getCurrentTabTotalWithTax())}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
                {/* Action buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2, gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleClearCurrentTab}
                    startIcon={<ClearIcon />}
                    disabled={!customer}
                  >
                    Clear Tab
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAddToCart}
                    disabled={!customer || customerValidationErrors.length > 0}
                    startIcon={<ShoppingCartIcon />}
                  >
                    Add to Cart
                  </Button>
                  <Button variant="contained" color="success" onClick={handleCheckout}>
                    Checkout
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Customer Search Results Dialog */}
      <Dialog
        open={openSearchDialog}
        onClose={() => setOpenSearchDialog(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Search Results</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : searchResults.length > 0 ? (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mb: 2 }}>
                {/* Left side - Customer and ID Images */}
                <Box sx={{ width: 160, height: 230, display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'flex-start', alignItems: 'center' }}>
                  {selectedSearchIdx !== null && selectedSearchIdx >= 0 && searchResults[selectedSearchIdx] && (
                    <>
                      {/* Customer Photo */}
                      {searchResults[selectedSearchIdx]?.image && (
                        <Box>
                          <img
                            src={
                              typeof searchResults[selectedSearchIdx].image === 'string'
                                ? searchResults[selectedSearchIdx].image
                                : searchResults[selectedSearchIdx].image instanceof File || searchResults[selectedSearchIdx].image instanceof Blob
                                ? URL.createObjectURL(searchResults[selectedSearchIdx].image)
                                : searchResults[selectedSearchIdx].image && searchResults[selectedSearchIdx].image.data
                                ? bufferToDataUrl(searchResults[selectedSearchIdx].image)
                                : undefined
                            }
                            alt="Customer"
                            style={{
                              width: 120,
                              height: 120,
                              objectFit: 'cover',
                              borderRadius: 8,
                              margin: '0 auto',
                              border: '2px solid #4caf50',
                              background: '#fafafa',
                              boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
                              display: 'block'
                            }}
                          />
                        </Box>
                      )}
                      
                      {/* ID Image Front */}
                      {searchResults[selectedSearchIdx]?.id_image_front && (
                        <Box>
                          <img
                            src={
                              typeof searchResults[selectedSearchIdx].id_image_front === 'string'
                                ? searchResults[selectedSearchIdx].id_image_front
                                : searchResults[selectedSearchIdx].id_image_front instanceof File || searchResults[selectedSearchIdx].id_image_front instanceof Blob
                                ? URL.createObjectURL(searchResults[selectedSearchIdx].id_image_front)
                                : searchResults[selectedSearchIdx].id_image_front && searchResults[selectedSearchIdx].id_image_front.data
                                ? bufferToDataUrl(searchResults[selectedSearchIdx].id_image_front)
                                : undefined
                            }
                            alt="ID Front"
                            style={{
                              width: 120,
                              height: 100,
                              objectFit: 'cover',
                              borderRadius: 8,
                              margin: '0 auto',
                              border: '2px solid #ff9800',
                              background: '#fafafa',
                              boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
                              display: 'block'
                            }}
                          />
                        </Box>
                      )}
                    </>
                  )}
                </Box>
                {/* Right side - Table */}
                <Box sx={{ flex: 1, position: 'relative', display: 'flex' }}>
                  <TableContainer component={Paper} sx={{ mb: 0, maxHeight: 300, overflowY: 'auto', p: 0, m: 0, flex: '1 1 auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>DOB</TableCell>
                          <TableCell>Phone</TableCell>
                          <TableCell>ID</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {searchResults.map((customer, index) => (
                          <TableRow
                            key={customer.id || index}
                            hover
                            selected={selectedSearchIdx === index}
                            sx={{ cursor: 'pointer' }}
                            onClick={() => setSelectedSearchIdx(index)}
                          >
                            <TableCell sx={{ width: 140, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {customer.first_name} {customer.last_name}
                            </TableCell>
                            <TableCell>{customer.date_of_birth ? customer.date_of_birth.substring(0, 10) : ''}</TableCell>
                            <TableCell>{customer.phone || ''}</TableCell>
                            <TableCell>{customer.id_number || ''}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Box>
              
              {/* Action buttons at the bottom */}
              {selectedSearchIdx !== null && selectedSearchIdx >= 0 && searchResults[selectedSearchIdx] && (
                <Box sx={{ position: 'relative', mt: 2, mb: 1 }}>
                  {/* Centered action buttons */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, width: '100%' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleSelectCustomer(searchResults[selectedSearchIdx])}
                      sx={{ minWidth: 70 }}
                    >
                      Select
                    </Button>
                  </Box>
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography>No customers found matching your search criteria.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSearchDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for messages */}
      <Snackbar 
        open={snackbarMessage.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbarMessage(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbarMessage.severity} sx={{ width: '100%' }}>
          {snackbarMessage.message}
        </Alert>
      </Snackbar>
      
      {/* Convert Menu */}
      <Menu
        anchorEl={convertMenuAnchor}
        open={Boolean(convertMenuAnchor)}
        onClose={handleConvertClose}
      >
        {[0, 1, 2, 3, 4, 5, 6].filter(tabIndex => tabIndex !== activeTab).map(tabIndex => (
          <MenuItem key={tabIndex} onClick={() => handleConvertItem(tabIndex)}>
            {getTabName(tabIndex)}
          </MenuItem>
        ))}
      </Menu>

      {/* Camera Capture Dialog */}
      <Dialog
        open={cameraDialogOpen}
        onClose={handleCloseCamera}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Capture Image
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 1 }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                maxWidth: '500px',
                borderRadius: '8px',
                backgroundColor: '#000'
              }}
            />
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCamera} color="secondary">
            Cancel
          </Button>
          <Button onClick={captureImage} variant="contained" color="primary">
            Capture
          </Button>
        </DialogActions>
      </Dialog>

      {/* Combined Jewelry Estimator Dialog */}
      <Dialog
        open={combinedDialogOpen}
        onClose={handleCombinedCancel}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { maxHeight: '95vh', height: '95vh', m: 0 } }}
      >
        <DialogContent sx={{ height: '100%', p: 0, overflow: 'auto' }}>
          {combinedDialogOpen && (
            <JewelEstimatorWrapper
              prefilledData={prefilledData}
              onCancel={handleCombinedCancel}
              onSave={handleCombinedSave}
              transactionType={activeTab}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Category Selection Dialog */}
      <Dialog
        open={categorySelectorDialog.open}
        onClose={() => setCategorySelectorDialog({ open: false, itemId: null, transactionType: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select Jewelry Category</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {metalCategories.map((category) => (
              <Grid item xs={6} sm={4} key={category.category_code}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => handleCategorySelect(category.category)}
                  sx={{
                    py: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    '&:hover': {
                      bgcolor: 'primary.light',
                      color: 'white'
                    }
                  }}
                >
                  {category.category}
                </Button>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategorySelectorDialog({ open: false, itemId: null, transactionType: null })}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Jewelry Inventory Selection Dialog */}
      <Dialog
        open={jewelryInventoryDialog.open}
        onClose={() => setJewelryInventoryDialog({ open: false, itemId: null, transactionType: null })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Select Jewelry from Inventory
          {selectedCategory && (
            <Typography variant="subtitle2" color="text.secondary">
              Category: {selectedCategory}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item ID</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Metal</TableCell>
                  <TableCell>Purity</TableCell>
                  <TableCell>Weight</TableCell>
                  <TableCell>Color</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jewelryInventoryItems.map((item) => (
                  <TableRow key={item.item_id} hover>
                    <TableCell>{item.item_id}</TableCell>
                    <TableCell>{item.short_desc || item.long_desc}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.precious_metal_type}</TableCell>
                    <TableCell>{item.metal_purity}</TableCell>
                    <TableCell>{item.metal_weight}g</TableCell>
                    <TableCell>{item.jewelry_color}</TableCell>
                    <TableCell>${item.item_price}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => handleSelectJewelryItem(item)}
                      >
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setJewelryInventoryDialog({ open: false, itemId: null, transactionType: null });
              setCategorySelectorDialog({
                open: true,
                itemId: jewelryInventoryDialog.itemId,
                transactionType: jewelryInventoryDialog.transactionType
              });
            }}
          >
            Back
          </Button>
          <Button onClick={() => setJewelryInventoryDialog({ open: false, itemId: null, transactionType: null })}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
                      
export default CustomerTicket;