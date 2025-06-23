import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Container, Card, CardContent, 
  CardMedia, Divider, Chip, Button, Avatar, Stack, Tabs, Tab, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, CircularProgress,
  List, ListItem, ListItemText, ListItemAvatar, Menu, MenuItem
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import config from '../config';
import { useAuth } from '../context/AuthContext';
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

// Helper function to convert buffer to data URL for image preview
function bufferToDataUrl(bufferObj) {
  if (!bufferObj || !bufferObj.data) return null;
  const base64 = btoa(
    new Uint8Array(bufferObj.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return `data:image/jpeg;base64,${base64}`;
}

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
  // Mocked portfolio KPI data (would be fetched from API in production)
  const portfolioData = {
    totalValue: Math.floor(Math.random() * 10000) + 500,
    transactions: Math.floor(Math.random() * 20) + 1,
    itemsCount: Math.floor(Math.random() * 15) + 1
  };

  const { user } = useAuth(); // Get user at component level
  
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
  
  const [activeTab, setActiveTab] = React.useState(0);
  
  // State for convert dropdown menu
  const [convertMenuAnchor, setConvertMenuAnchor] = React.useState(null);
  const [convertItemId, setConvertItemId] = React.useState(null);
  
  // Helper function to save ticket items in localStorage
  const saveTicketItems = (type, items) => {
    if (!customer || !customer.id) return; // Don't save if no customer selected
    
    try {
      localStorage.setItem(`ticket_${customer.id}_${type}`, JSON.stringify(items));
    } catch (error) {
      console.error(`Error saving ${type} items to localStorage:`, error);
    }
  };

  // Helper function to load ticket items from localStorage
  const loadTicketItems = (type) => {
    if (!customer || !customer.id) return null; // No customer selected
    
    try {
      const savedItems = localStorage.getItem(`ticket_${customer.id}_${type}`);
      return savedItems ? JSON.parse(savedItems) : null;
    } catch (error) {
      console.error(`Error loading ${type} items from localStorage:`, error);
      return null;
    }
  };
  
  // Helper function to clear ticket items from localStorage
  const clearTicketItems = (type) => {
    if (!customer || !customer.id) return;
    localStorage.removeItem(`ticket_${customer.id}_${type}`);
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
    return loadTicketItems('payment') || [{ id: 1, amount: '', method: '', reference: '', notes: '' }];
  });
  
  const [refundItems, setRefundItems] = React.useState(() => {
    return loadTicketItems('refund') || [{ id: 1, amount: '', method: '', reference: '', reason: '' }];
  });
  
  // Process estimated items when component mounts - use a ref to track if the current navigation state has been processed
  const processedStateRef = React.useRef(null);
  
  React.useEffect(() => {
    // Handle updated item from jewelry estimator when in edit mode
    if (location.state?.updatedItem && location.state?.ticketItemId && location.state?.fromEstimator === 'jewelry') {
      const updatedItem = location.state.updatedItem;
      const ticketItemId = location.state.ticketItemId;
      const isDuplicate = location.state?.isDuplicate || false;
      
      // Create a base item with common properties from the updated item
      const baseItem = {
        id: ticketItemId,
        description: `${updatedItem.metal_weight}g ${updatedItem.metal_purity} ${updatedItem.precious_metal_type} ${updatedItem.metal_category}${updatedItem.free_text ? ` - ${updatedItem.free_text}` : ''}`,
        category: updatedItem.metal_category || 'Jewelry',
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
              updatedItems[itemIndex] = {
                ...baseItem,
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
              updatedItems[itemIndex] = {
                ...baseItem,
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
              updatedItems[itemIndex] = {
                ...baseItem,
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
          console.log('Unknown transaction type for updated item:', transactionType);
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
    
    // If we have estimated items and they're from gemEstimator
    else if (estimatedItems.length > 0 && from === 'gemEstimator') {
      // Clear initial empty items
      setPawnItems([]);
      setBuyItems([]);
      setSaleItems([]);
      
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
        setPawnItems(pawn);
        saveTicketItems('pawn', pawn);
        setActiveTab(0); // Set active tab to Pawn
      } else if (buy.length > 0) {
        setBuyItems(buy);
        saveTicketItems('buy', buy);
        setActiveTab(1); // Set active tab to Buy
      } else if (sale.length > 0) {
        setSaleItems(sale);
        saveTicketItems('sale', sale);
        setActiveTab(3); // Set active tab to Sale
      }
    }
    
    // Handle items coming from CoinsBullions
    else if (location.state?.addedItems && location.state?.from === 'coinsBullions') {
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
          originalItem: item.originalItem || item
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
      default:
        return;
    }
    
    setItems([...items, newItem]);
    
    // Calculate totals when adding a new item
    calculateTotal();
  };
  
  // Handle updating an item
  const handleItemChange = (id, field, value) => {
    const { items, setItems } = getCurrentItems();
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
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
    
    // Then navigate to gem-estimator if it's a jewelry item
    if (itemToDuplicate.sourceEstimator === 'jewelry' && itemToDuplicate.originalData) {
      // Include a special flag to identify this is a duplicate operation
      navigate('/gem-estimator', { 
        state: { 
          customer,
          editMode: true, 
          itemToEdit: itemToDuplicate.originalData,
          // No returnToTicket flag, so user can manually add to ticket
          fromDuplicate: true // Indicate this came from duplicating an item
        } 
      });
    } else if (itemToDuplicate.category?.toLowerCase().includes('jewelry') || 
               itemToDuplicate.category?.toLowerCase().includes('jewellery')) {
      // If it's jewelry but not from estimator, still go to jewelry estimator
      const description = itemToDuplicate.description || '';
      navigate('/gem-estimator', { 
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
    if (items.length <= 1) return; // Keep at least one row
    setItems(items.filter(item => item.id !== id));
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
          amount: itemToConvert.price || itemToConvert.value || '',
          method: '',
          reference: '',
          notes: itemToConvert.description || ''
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
  const getTabName = (index) => {
    switch(index) {
      case 0: return 'Pawn';
      case 1: return 'Buy';
      case 2: return 'Trade';
      case 3: return 'Sale';
      case 4: return 'Repair';
      case 5: return 'Payment';
      case 6: return 'Refund';
      default: return '';
    }
  };
  
  // Handlers for item type buttons - navigate to respective estimator pages
  const handleJewelryEstimatorClick = () => {
    navigate('/gem-estimator', { state: { customer } });
  };
  
  // Handler for editing an item in the jewelry estimator
  const handleEditItem = (itemId) => {
    const { items } = getCurrentItems();
    const itemToEdit = items.find(item => item.id === itemId);
    
    if (!itemToEdit) return;
    
    // If the item came from the jewelry estimator, navigate there with the original data
    if (itemToEdit.sourceEstimator === 'jewelry' && itemToEdit.originalData) {
      navigate('/gem-estimator', { 
        state: { 
          customer,
          editMode: true,
          itemToEdit: itemToEdit.originalData,
         // returnToTicket: true,
          ticketItemId: itemId
        } 
      });
    } else if (itemToEdit.category?.toLowerCase().includes('jewelry') || 
               itemToEdit.category?.toLowerCase().includes('jewellery')) {
      // If it's jewelry but not from estimator, still go to jewelry estimator
      // Try to parse data from the description
      const description = itemToEdit.description || '';
      navigate('/gem-estimator', { 
        state: { 
          customer,
          editMode: true,
          itemToEdit: {
            free_text: description,
            category: itemToEdit.category,
            price: itemToEdit.price || itemToEdit.value,
            transaction_type: activeTab === 0 ? 'pawn' : 
                            activeTab === 1 ? 'buy' : 
                            activeTab === 3 ? 'retail' : 'buy'
          },
       //   returnToTicket: true,
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
    refund: 0
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
      default: return 0;
    }
  };
  
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
        total = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
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
        setItems([{ id: 1, amount: '', method: '', reference: '', notes: '' }]);
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
          emptyItem = { id: 1, amount: '', method: '', reference: '', notes: '' };
          setPaymentItems([emptyItem]);
          break;
        case 6: // Refund
          emptyItem = { id: 1, amount: '', method: '', reference: '', reason: '' };
          setRefundItems([emptyItem]);
          break;
      }
      
      // Clear from localStorage
      clearTicketItems(type);
      showSnackbar(`Cleared all items in ${getTabName(activeTab)} tab`, 'success');
    }
  };

  const handleAddToCart = () => {
    if (!customer) {
      alert('Please select a customer before adding items to cart');
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
      default: transaction_type = 'unknown';
    }
    
    // Instead of navigating, save to session storage first
    try {
      // Add item type, customer, and employee data to each item
      // Using user from component scope instead of calling useAuth() here
      const itemsWithMetadata = filteredItems.map(item => {
        // Create base metadata for all items
        const baseItem = {
          ...item,
          transaction_type: transaction_type,
          customer: customer ? {
            id: customer.id,
            name: `${customer.first_name} ${customer.last_name}`,
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
          // Preserve all jewelry fields from the original data or directly from the item if available
          return {
            ...baseItem,
            // Indicate this is a jewelry item for the cart and checkout
            sourceEstimator: 'jewelry',
            // Include all jewelry-specific fields that may be present
            metal_type: item.metal_type || item.precious_metal_type || (item.originalData?.precious_metal_type),
            metal_purity: item.metal_purity || (item.originalData?.metal_purity),
            metal_weight: item.metal_weight || (item.originalData?.metal_weight),
            metal_category: item.metal_category || (item.originalData?.metal_category),
            gems: item.gems || (item.originalData?.gems),
            stones: item.stones || (item.originalData?.stones),
            free_text: item.free_text || (item.originalData?.free_text),
            price_estimates: item.price_estimates || (item.originalData?.price_estimates),
            // Pass along the complete original data from the estimator
         //   originalData: item.originalData || null,
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
      
      // Add new items to cart
      cartItems = [...cartItems, ...itemsWithMetadata];
      
      // Save to session storage
      sessionStorage.setItem('cartItems', JSON.stringify(cartItems));
      
      // Save customer data to session storage if it exists
      if (customer) {
        sessionStorage.setItem('selectedCustomer', JSON.stringify(customer));
      }
      
      // Clear the items from localStorage for this tab since they're now in cart
      clearTicketItems(type);
      
      // Replace current tab items with a fresh empty item
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
          emptyItem = { id: 1, amount: '', method: '', reference: '', notes: '' };
          setPaymentItems([emptyItem]);
          break;
        case 6: // Refund
          emptyItem = { id: 1, amount: '', method: '', reference: '', reason: '' };
          setRefundItems([emptyItem]);
          break;
      }
      
      // Show success message and navigate to cart
      showSnackbar('Items added to cart', 'success');
      navigate('/cart');
      
    } catch (error) {
      console.error('Error adding items to cart:', error);
      alert('There was an error adding items to cart. Please try again.');
    }
  };
  
  const handleCheckout = () => {
    // Calculate totals before checkout
    calculateTotal();
    
    // Proceed to checkout with all items from all tabs
    // This is a placeholder for future implementation
    alert('Proceeding to checkout with all items');
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
    if (!item || !item.image) {
      // Check for legacy format
      if (item && item.images && item.images.length > 0) {
        return item.images[0].url;
      }
      return null;
    }
    
    if (item.image.file instanceof File || item.image.file instanceof Blob) {
      return URL.createObjectURL(item.image.file);
    } else if (item.image.url) {
      return item.image.url;
    } else if (typeof item.image === 'string') {
      return item.image;
    } else if (item.image && item.image.data) {
      return bufferToDataUrl(item.image);
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
            borderRight: '1px solid #e0e0e0'
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
          {/* Right side - Portfolio KPI */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            width: '58%',
            pl: 2
          }}>
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
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs 
                      value={activeTab} 
                      onChange={handleTabChange} 
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{ mb: 1 }}
                    >
                      <Tab label="Pawn" />
                      <Tab label="Buy" />
                      <Tab label="Trade" />
                      <Tab label="Sale" />
                      <Tab label="Repair" />
                      <Tab label="Payment" />
                      <Tab label="Refund" />
                    </Tabs>
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
                              <TableCell width="35%">Item Description</TableCell>
                              <TableCell width="15%">Category</TableCell>
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
                                      <IconButton size="small" color="secondary" onClick={handleJewelryEstimatorClick}>
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
                                  {item.image ? (
                                    <img 
                                      src={item.image} 
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
                                        borderRadius: '4px',
                                        margin: '0 auto'
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
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.category}
                                    onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
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
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: 2 }}>
                        <Typography variant="h6" color="primary">
                          Total: ${getCurrentTabTotal().toFixed(2)}
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
                              <TableCell width="35%">Item Description</TableCell>
                              <TableCell width="15%">Category</TableCell>
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
                                      <IconButton size="small" color="secondary" onClick={handleJewelryEstimatorClick}>
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
                                  {item.image ? (
                                    <img 
                                      src={item.image} 
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
                                        borderRadius: '4px',
                                        margin: '0 auto'
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
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.category}
                                    onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
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
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: 2 }}>
                        <Typography variant="h6" color="primary">
                          Total: ${getCurrentTabTotal().toFixed(2)}
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
                                      <IconButton size="small" color="secondary" onClick={handleJewelryEstimatorClick}>
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
                                    <img 
                                      src={item.images[0].url} 
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
                                        borderRadius: '4px',
                                        margin: '0 auto'
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
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: 2 }}>
                        <Typography variant="h6" color="primary">
                          Total: ${getCurrentTabTotal().toFixed(2)}
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
                              <TableCell width="15%" align="center">Estimator</TableCell>
                              <TableCell width="10%" align="center">Image</TableCell>
                              <TableCell width="25%">Item Description</TableCell>
                              <TableCell width="15%">Category</TableCell>
                              <TableCell width="10%">Sale Price</TableCell>
                              <TableCell width="10%">Payment Method</TableCell>
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
                              <TableRow key={item.id}>
                                <TableCell align="center" padding="normal">
                                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <Tooltip title="Jewelry Estimator">
                                      <IconButton size="small" color="secondary" onClick={handleJewelryEstimatorClick}>
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
                                    <img 
                                      src={item.images[0].url} 
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
                                        borderRadius: '4px',
                                        margin: '0 auto'
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
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.category}
                                    onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
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
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.paymentMethod}
                                    onChange={(e) => handleItemChange(item.id, 'paymentMethod', e.target.value)}
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
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: 2 }}>
                        <Typography variant="h6" color="primary">
                          Total: ${getCurrentTabTotal().toFixed(2)}
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
                                      <IconButton size="small" color="secondary" onClick={handleJewelryEstimatorClick}>
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
                                    <img 
                                      src={item.images[0].url} 
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
                                        borderRadius: '4px',
                                        margin: '0 auto'
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
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: 2 }}>
                        <Typography variant="h6" color="primary">
                          Total: ${getCurrentTabTotal().toFixed(2)}
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
                              <TableCell width="15%" align="center">Estimator</TableCell>
                              <TableCell width="10%" align="center">Image</TableCell>
                              <TableCell width="10%">Amount</TableCell>
                              <TableCell width="15%">Payment Method</TableCell>
                              <TableCell width="15%">Reference</TableCell>
                              <TableCell width="20%">Notes</TableCell>
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
                            {paymentItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell align="center" padding="normal">
                                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <Tooltip title="Jewelry Estimator">
                                      <IconButton size="small" color="secondary" onClick={handleJewelryEstimatorClick}>
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
                                    <img 
                                      src={item.images[0].url} 
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
                                        borderRadius: '4px',
                                        margin: '0 auto'
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
                                    value={item.notes}
                                    onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)}
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
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: 2 }}>
                        <Typography variant="h6" color="primary">
                          Total: ${getCurrentTabTotal().toFixed(2)}
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
                                      <IconButton size="small" color="secondary" onClick={handleJewelryEstimatorClick}>
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
                                    <img 
                                      src={item.images[0].url} 
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
                                        borderRadius: '4px',
                                        margin: '0 auto'
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
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: 2 }}>
                        <Typography variant="h6" color="primary">
                          Total: ${getCurrentTabTotal().toFixed(2)}
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
                    disabled={!customer}
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
    </Container>
  );
};
                      
export default CustomerTicket;