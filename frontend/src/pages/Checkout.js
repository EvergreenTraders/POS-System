import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import {
  Container,
  Paper,
  Grid,
  Typography,
  TextField,
  Button,
  Box,
  Divider,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Select,
  MenuItem,
  InputLabel,
  Table,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
  Chip,
  Checkbox,
  Switch,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PaymentIcon from '@mui/icons-material/Payment';
import SaveIcon from '@mui/icons-material/Save';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CreditCardIcon from '@mui/icons-material/CreditCard';

const API_BASE_URL = config.apiUrl;

/**
 * Checkout component manages the checkout process, which includes displaying
 * an order summary, handling payment details, and allowing users to save
 * transactions as quotes. It provides functionality for both cash and card
 * payment methods and validates user input for customer details. The component
 * also manages the state for loading and displaying notifications.
 */
function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems, addToCart, selectedCustomer, setCustomer, clearCart, removeMultipleItems } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [customerSearchDialogOpen, setCustomerSearchDialogOpen] = useState(false);
  const [searchForm, setSearchForm] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    phone: ''
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [allCartItems, setAllCartItems] = useState([]);
  const [jewelryItems, setJewelryItems] = useState([]);

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDetails, setPaymentDetails] = useState({
    cashAmount: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [transactionTypes, setTransactionTypes] = useState({});
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [transactionCreated, setTransactionCreated] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  const [fastSaleCustomerData, setFastSaleCustomerData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: ''
  });
  const [taxRate, setTaxRate] = useState(0.13); // Default 13% tax rate
  const [selectedProvince, setSelectedProvince] = useState('ON');
  const [provinceName, setProvinceName] = useState('Ontario');

  // Effect to initialize cart and customer from navigation (Estimator, CoinsBullions, or Cart)
  useEffect(() => {
    // Only run initialization logic if we haven't initialized yet
    if (isInitialized) {
      return;
    }

    // Check if data is in location.state or sessionStorage
    let itemsToCheckout = null;
    let customerData = null;
    let fromSource = null;
    let allCartItemsData = null;

    if (location.state?.items) {
      // Data from navigation state (preferred method)
      itemsToCheckout = location.state.items;
      customerData = location.state.customer;
      fromSource = location.state.from;
      allCartItemsData = location.state.allCartItems;
    } else {
      // Fallback to sessionStorage (for CustomerTicket navigation)
      const sessionItems = sessionStorage.getItem('checkoutItems');
      const sessionCustomer = sessionStorage.getItem('selectedCustomer');

      if (sessionItems) {
        itemsToCheckout = JSON.parse(sessionItems);
        fromSource = 'cart'; // CustomerTicket uses cart-like structure
        // Clear sessionStorage after reading
        sessionStorage.removeItem('checkoutItems');
      }

      if (sessionCustomer) {
        customerData = JSON.parse(sessionCustomer);
      }
    }

    if (itemsToCheckout && itemsToCheckout.length > 0) {
      // Reset payment-related state only when actually initializing
      setTransactionCreated(false);
      setCurrentTransactionId(null);
      setPayments([]);
      setIsFullyPaid(false);
      setPaymentDetails({
        cashAmount: ''
      });

      // Handle from generic estimator or specific estimators like coinsbullions
      if (fromSource === 'jewelry' || fromSource === 'coinsbullions') {
        // Don't add items to cart - they should only be displayed in checkout, not in cart icon
        // Just set checkoutItems for display
        setCheckoutItems(itemsToCheckout);

        // Set the customer if it exists
        if (customerData) {
          setCustomer(customerData);
        }
        setIsInitialized(true);
      }
      else if (fromSource === 'cart') {
        // Store the items to checkout and all cart items separately
        const items = itemsToCheckout;

        // Extract jewelry-specific items and store them in state for later use in handleSubmit
        const filteredJewelryItems = items.filter(item => item.sourceEstimator === 'jewelry');
        setJewelryItems(filteredJewelryItems);

        // Normalize price field for items without clearing/re-adding to cart
        // Since items are already in the cart context, we just need to set them for checkout
        const normalizedItems = items.map(item => {
          const normalizedItem = { ...item };
          if (normalizedItem.price === undefined) {
            if (normalizedItem.value !== undefined) normalizedItem.price = normalizedItem.value;
            else if (normalizedItem.fee !== undefined) normalizedItem.price = normalizedItem.fee;
            else if (normalizedItem.amount !== undefined) normalizedItem.price = normalizedItem.amount;
            else normalizedItem.price = 0;
          }
          return normalizedItem;
        });

        // Set the checkout items, ensuring jewelry items retain all fields
        setCheckoutItems(normalizedItems);
        setAllCartItems(allCartItemsData || items);

        // Set the customer if provided
        if (customerData) {
          setCustomer(customerData);
        }

        setIsInitialized(true);
      }
    }
  }, [location.state, addToCart, setCustomer, clearCart, isInitialized]);

  // Check if employee has an active cash drawer session
  useEffect(() => {
    const checkCashDrawerSession = async () => {
      if (!user?.id) return;

      try {
        const response = await axios.get(`${API_BASE_URL}/cash-drawer/employee/${user.id}/active`);

        // If no active session exists, redirect to cash drawer page
        if (!response.data) {
          setSnackbar({
            open: true,
            message: 'You must open a cash drawer before processing transactions',
            severity: 'warning'
          });

          // Delay navigation slightly to show the snackbar
          setTimeout(() => {
            navigate('/cash-drawer', {
              state: {
                message: 'Please open a cash drawer to continue with transactions',
                returnTo: '/checkout'
              }
            });
          }, 1500);
        }
      } catch (error) {
        console.error('Error checking cash drawer session:', error);
        // On error, also redirect to cash drawer page
        setSnackbar({
          open: true,
          message: 'Unable to verify cash drawer session. Please open a drawer.',
          severity: 'error'
        });

        setTimeout(() => {
          navigate('/cash-drawer');
        }, 1500);
      }
    };

    checkCashDrawerSession();
  }, [user, navigate]);

  // Fetch transaction types on component mount
  useEffect(() => {
    const fetchTransactionTypes = async () => {
      try {
        const response = await axios.get(`${config.apiUrl}/transaction-types`);
        const typeMap = {};
        response.data.forEach(type => {
          typeMap[type.type] = type.id;
        });
        setTransactionTypes(typeMap);
      } catch (error) {
        console.error('Error fetching transaction types:', error);
      }
    };
    fetchTransactionTypes();
  }, []);

  // Fetch province tax rate on component mount
  useEffect(() => {
    const fetchProvinceTax = async () => {
      try {
        const savedProvince = localStorage.getItem('selectedProvince') || 'ON';
        const response = await axios.get(`${config.apiUrl}/tax-config/${savedProvince}`);
        const provinceData = response.data;

        // Calculate total tax (use HST if present, otherwise sum GST + PST)
        const totalTax = provinceData.hst_rate || (provinceData.gst_rate + provinceData.pst_rate);
        setTaxRate(totalTax / 100); // Convert percentage to decimal

        // Map province codes to full names
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

        setSelectedProvince(savedProvince);
        setProvinceName(provinceNames[savedProvince] || 'Ontario');
      } catch (error) {
        console.error('Error fetching province tax:', error);
        // Keep default tax rate if fetch fails
      }
    };

    fetchProvinceTax();
  }, []);

  // Fetch fresh customer data if tax_exempt is undefined (old cached data)
  useEffect(() => {
    const refreshCustomerData = async () => {
      if (selectedCustomer && selectedCustomer.id && selectedCustomer.tax_exempt === undefined) {
        try {
          const response = await axios.get(`${config.apiUrl}/customers/${selectedCustomer.id}`);
          const freshCustomer = response.data;

          // Create updated customer object with fresh data
          const updatedCustomer = {
            ...selectedCustomer,
            ...freshCustomer,
            name: selectedCustomer.name || `${freshCustomer.first_name} ${freshCustomer.last_name}`
          };

          // Update the cart context with fresh customer data
          setCustomer(updatedCustomer);

          // Update sessionStorage with fresh data
          sessionStorage.setItem('selectedCustomer', JSON.stringify(updatedCustomer));
        } catch (error) {
          console.error('Error fetching fresh customer data:', error);
        }
      }
    };

    refreshCustomerData();
  }, [selectedCustomer, setCustomer]);

  const calculateSubtotal = useCallback(() => {
    // Always use checkoutItems if available, as it contains the items selected for checkout
    // Only fall back to cartItems if checkoutItems is empty (e.g., coming from estimator)
    const itemsToCalculate = checkoutItems.length > 0 ? checkoutItems : cartItems;
    return itemsToCalculate.reduce((total, item) => {
      let itemValue = 0;
      const transactionType = item.transaction_type?.toLowerCase() || '';

      if (item.price !== undefined) itemValue = parseFloat(item.price) || 0;
      else if (item.value !== undefined) itemValue = parseFloat(item.value) || 0;
      else if (item.fee !== undefined) itemValue = parseFloat(item.fee) || 0;
      else if (item.amount !== undefined) itemValue = parseFloat(item.amount) || 0;

      // Add protection plan (15% of item price) if enabled
      const protectionPlanAmount = item.protectionPlan ? itemValue * 0.15 : 0;
      itemValue = itemValue + protectionPlanAmount;

      // Apply sign based on transaction type
      // Money going OUT (buy/pawn) = negative values
      // Money coming IN (sale/repair) = positive values
      if (transactionType === 'buy' || transactionType === 'pawn') {
        itemValue = -Math.abs(itemValue);
      } else {
        itemValue = Math.abs(itemValue);
      }

      return total + itemValue;
    }, 0);
  }, [checkoutItems, cartItems]);

  const calculateTax = useCallback(() => {
    // Check if customer is tax exempt
    if (selectedCustomer?.tax_exempt) {
      return 0;
    }
    // Tax only applies to sales (positive values)
    const itemsToCalculate = checkoutItems.length > 0 ? checkoutItems : cartItems;
    const salesSubtotal = itemsToCalculate.reduce((total, item) => {
      const transactionType = item.transaction_type?.toLowerCase() || '';
      // Only include sale/repair transactions
      if (transactionType === 'sale' || transactionType === 'repair') {
        let itemValue = 0;
        if (item.price !== undefined) itemValue = parseFloat(item.price) || 0;
        else if (item.value !== undefined) itemValue = parseFloat(item.value) || 0;
        else if (item.fee !== undefined) itemValue = parseFloat(item.fee) || 0;

        // Add protection plan (15% of item price) if enabled
        const protectionPlanAmount = item.protectionPlan ? itemValue * 0.15 : 0;
        itemValue = itemValue + protectionPlanAmount;

        return total + Math.abs(itemValue);
      }
      return total;
    }, 0);
    return salesSubtotal * taxRate;
  }, [selectedCustomer, taxRate, checkoutItems, cartItems]);

  const calculateTotal = useCallback(() => {
    const total = calculateSubtotal() + calculateTax();
    // Round to 2 decimal places to avoid floating-point precision issues
    return parseFloat(total.toFixed(2));
  }, [calculateSubtotal, calculateTax]);

  const handlePaymentMethodChange = (event) => {
    setPaymentMethod(event.target.value);
    // Keep the payment amount when switching payment methods
  };

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    // Always allow editing the input field
    // Validation will happen on submit
    setPaymentDetails({
      ...paymentDetails,
      [field]: value,
    });
  };
  
  // Handle input change for search form
  const handleLookupInputChange = (e) => {
    const { name, value } = e.target;
    setSearchForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle search customer
  const handleSearchCustomer = async () => {
    if (!searchForm.first_name && !searchForm.last_name && !searchForm.id_number && !searchForm.phone) {
      setSnackbar({
        open: true,
        message: 'Please enter at least one search criteria',
        severity: 'warning'
      });
      return;
    }
    
    setSearching(true);
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
        setSnackbar({
          open: true,
          message: 'No customers found matching your search criteria',
          severity: 'info'
        });
      } else if (data.length === 1) {
        // If only one customer found, select them automatically
        handleSelectCustomer(data[0]);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setSearching(false);
    }
  };

  // Initialize remaining amount only when checkoutItems are set and transaction not yet created
  // Also recalculate when protection plan, tax, or customer changes
  useEffect(() => {
    if (checkoutItems.length > 0 && !transactionCreated) {
      setRemainingAmount(calculateTotal());
    }
  }, [checkoutItems, transactionCreated, calculateTotal]);

  // Set default payment method based on balance type
  // Cash for payables (negative balance), Debit for receivables (positive balance)
  useEffect(() => {
    if (checkoutItems.length > 0 && !transactionCreated) {
      const total = calculateTotal();
      // If balance is negative (payable), default to cash
      // If balance is positive (receivable), default to debit
      setPaymentMethod(total < 0 ? 'cash' : 'debit');
    }
  }, [checkoutItems, transactionCreated, calculateTotal]);

  // Handle fast sale customer data input
  const handleFastSaleCustomerChange = (field) => (event) => {
    setFastSaleCustomerData({
      ...fastSaleCustomerData,
      [field]: event.target.value
    });
  };

  const handleSubmit = async () => {
    // Handle fast sale customer creation
    if (selectedCustomer?.isFastSale && !selectedCustomer?.id) {
      // Validate fast sale customer data
      if (!fastSaleCustomerData.first_name || !fastSaleCustomerData.last_name) {
        setSnackbar({
          open: true,
          message: 'First name and last name are required for fast sale',
          severity: 'warning'
        });
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        // Create customer first
        const customerFormData = new FormData();
        customerFormData.append('first_name', fastSaleCustomerData.first_name);
        customerFormData.append('last_name', fastSaleCustomerData.last_name);
        customerFormData.append('phone', fastSaleCustomerData.phone || '');
        // Only append email if it has a value (avoid empty string for UNIQUE constraint)
        if (fastSaleCustomerData.email && fastSaleCustomerData.email.trim()) {
          customerFormData.append('email', fastSaleCustomerData.email.trim());
        }
        customerFormData.append('status', 'active');

        const customerResponse = await fetch(`${config.apiUrl}/customers`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: customerFormData
        });

        if (!customerResponse.ok) throw new Error('Failed to create customer');
        const createdCustomer = await customerResponse.json();

        // Update the selected customer with the created customer data
        const updatedCustomer = {
          ...createdCustomer,
          name: `${createdCustomer.first_name} ${createdCustomer.last_name}`
        };
        setCustomer(updatedCustomer);

        setSnackbar({
          open: true,
          message: `Customer ${updatedCustomer.name} created successfully`,
          severity: 'success'
        });

        // Continue with the normal payment process
      } catch (error) {
        setSnackbar({
          open: true,
          message: `Error creating customer: ${error.message}`,
          severity: 'error'
        });
        return;
      }
    } else if (!selectedCustomer?.id) {
      setSnackbar({
        open: true,
        message: 'Please select a customer first',
        severity: 'warning'
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const paymentAmount = parseFloat(paymentDetails.cashAmount) || 0;
      // Compare absolute values - payment shouldn't exceed the absolute balance amount
      if (paymentAmount <= 0 || paymentAmount > Math.abs(remainingAmount)) {
        setSnackbar({
          open: true,
          message: paymentAmount <= 0 ? 'Invalid payment amount' : 'Payment amount exceeds remaining balance',
          severity: 'error'
        });
        return;
      }

      // Get employee ID from token
      const employeeId = JSON.parse(atob(token.split('.')[1])).id;

      // Check if we came from quotes
      const quoteId = location.state?.quoteId;
      const isFromQuotes = Boolean(quoteId);

      let transactionId;

      // Create a temporary transaction ID for tracking payments
      // We'll only create the actual records in the database when payment is complete
      if (!transactionCreated) {
        // Generate temporary ID for tracking payments until fully paid
        transactionId = 'temp-' + Date.now();
        setCurrentTransactionId(transactionId);
        setTransactionCreated(true);
      } else {
        transactionId = currentTransactionId;
      }

      // Add payment to list and update remaining amount
      // Map frontend payment method values to backend expected format
      const paymentMethodMap = {
        'cash': 'CASH',
        'debit': 'DEBIT_CARD',
        'credit': 'CREDIT_CARD',
        'check': 'CHECK',
        'bank_transfer': 'BANK_TRANSFER'
      };

      const newPayment = {
        transaction_id: transactionId,
        method: paymentMethod,
        amount: paymentAmount,
        payment_method: paymentMethodMap[paymentMethod] || paymentMethod.toUpperCase(),
        timestamp: new Date().toISOString()
      };
      const updatedPayments = [...payments, newPayment];
      setPayments(updatedPayments);
      
      // Fix floating point precision issues by rounding to 2 decimal places
      // For positive balance (receivable): subtract payment
      // For negative balance (payable): add payment (moving towards zero)
      const newRemainingAmount = remainingAmount >= 0
        ? parseFloat((remainingAmount - paymentAmount).toFixed(2))
        : parseFloat((remainingAmount + paymentAmount).toFixed(2));
      setRemainingAmount(newRemainingAmount);

      // Check if payment is complete (use tolerance for floating point comparison)
      const isPaid = Math.abs(newRemainingAmount) < 0.01;
      setIsFullyPaid(isPaid);

      if (isPaid) {
        // Only create database records when payment is fully completed
        // This ensures we don't save to jewelry database unless payments and transactions succeed
        setLoading(true);

        // Declare variables outside try block so they're accessible in catch block for rollback
        let createdJewelryItems;
        let realTransactionId;

        try {
          // Check if items are jewelry items (have jewelry-specific fields or sourceEstimator flag)
          // Use checkoutItems instead of cartItems to only process items being checked out
          // Exclude items from inventory (they already exist in jewelry table)
          const hasJewelryItems = checkoutItems.some(item =>
            !item.fromInventory && (
              item.sourceEstimator === 'jewelry' ||
              item.metal_weight ||
              item.metal_purity ||
              item.precious_metal_type ||
              item.originalData
            )
          );

          // Step 1: Create jewelry items FIRST (only if we have jewelry items)
          if (isFromQuotes) {
            // If coming from quotes, update each quote item to a regular item
            const convertResponse = await axios.put(
              `${config.apiUrl}/jewelry/${quoteId}`,
              {},
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            createdJewelryItems = convertResponse.data;
            
            // Push data to jewelry_secondary_gems for items converted from quotes
            for (const item of createdJewelryItems) {
              // Find matching cart item to get secondary gem data
              const originalItem = checkoutItems.find(cartItem =>
                cartItem.item_id && cartItem.item_id.startsWith(quoteId));
              
                try {
                  if (originalItem.secondary_gems && originalItem.secondary_gems.length > 0) {
                    // Send each secondary gem individually
                    try {
                      for (const gemData of originalItem.secondary_gems) {
                        
                        // Send the gem data
                        await axios.post(
                          `${config.apiUrl}/jewelry_secondary_gems`,
                          {
                            jewelry_id: item.item_id,
                            ...gemData
                          },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                      }
                    } catch (error) {
                      console.error(`Error adding secondary gems for item ${item.item_id}:`, error);
                    }
                  } else {
                    // Extract all secondary gem fields from the original item (legacy format)
                    const secondaryGemData = {
                      secondary_gem_type: originalItem.secondary_gem_type,
                      secondary_gem_category: originalItem.secondary_gem_category,
                      secondary_gem_size: originalItem.secondary_gem_size,
                      secondary_gem_quantity: originalItem.secondary_gem_quantity,
                      secondary_gem_shape: originalItem.secondary_gem_shape,
                      secondary_gem_weight: originalItem.secondary_gem_weight,
                      secondary_gem_color: originalItem.secondary_gem_color,
                      secondary_gem_exact_color: originalItem.secondary_gem_exact_color,
                      secondary_gem_clarity: originalItem.secondary_gem_clarity,
                      secondary_gem_cut: originalItem.secondary_gem_cut,
                      secondary_gem_lab_grown: originalItem.secondary_gem_lab_grown,
                      secondary_gem_authentic: originalItem.secondary_gem_authentic,
                      secondary_gem_value: originalItem.secondary_gem_value
                    };
                    
                    // Push to jewelry_secondary_gems with the same item_id
                    await axios.put(
                      `${config.apiUrl}/jewelry_secondary_gems/${item.item_id}`,
                      secondaryGemData,
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                }
               } catch (error) {
                  console.error(`Error adding secondary gems for converted item ${item.item_id}:`, error);
                  // Continue with transaction even if secondary gems fail
                }
    
            }
          } else if (hasJewelryItems) {
            // If coming from estimator, create new jewelry items (only if we have jewelry items)
            // Filter out items from inventory as they already exist in the database
            const newJewelryItems = checkoutItems.filter(item => !item.fromInventory);

            // Check if any items have actual file objects (not just blob URLs)
            const hasImageFiles = newJewelryItems.some(item =>
              item.images && Array.isArray(item.images) &&
              item.images.some(img => img.file instanceof File)
            );

            let jewelryResponse;
            let itemsToPost; // Declare outside if/else blocks

            if (hasImageFiles) {

              // Use FormData for file uploads
              const formData = new FormData();

              // Collect all image files from all items and track their metadata
              const imageMetadata = [];
              newJewelryItems.forEach((item, itemIndex) => {
                if (item.images && Array.isArray(item.images)) {
                  item.images.forEach((img, imgIndex) => {
                    if (img.file instanceof File) {
                      formData.append('images', img.file);
                      // Track which image is primary
                      imageMetadata.push({
                        itemIndex,
                        imageIndex: imgIndex,
                        isPrimary: img.isPrimary || false
                      });
                    }
                  });
                }
              });

              // Process cart items to remove file objects but keep image metadata
              const processedItems = newJewelryItems.map(item => {
                const { images, ...itemWithoutImages } = item;

                // Keep image metadata (isPrimary flag) but remove file objects
                const imagesMeta = images ? images.map(img => ({
                  isPrimary: img.isPrimary || false,
                  type: img.type
                })) : [];

                return {
                  ...itemWithoutImages,
                  imagesMeta // Send metadata separately
                };
              });

              // Check if we have any jewelry items from the gem estimator
              // If items have originalData, use that for full jewelry information
              const jewelryItemsToPost = jewelryItems.map(item => {
                if (item.originalData) {
                  // Merge originalData with current item to ensure we have all jewelry fields
                  return {
                    ...item.originalData,
                    price: item.price,
                    transaction_type: item.transaction_type,
                    images: item.images || item.originalData.images
                  };
                }
                return item;
              });
              itemsToPost = jewelryItems.length > 0 ? jewelryItemsToPost : processedItems;

              // Add cart items as JSON string in FormData
              formData.append('cartItems', JSON.stringify(itemsToPost));

              // Add image metadata for backend to know which image is primary
              formData.append('imageMetadata', JSON.stringify(imageMetadata));

              jewelryResponse = await axios.post(
                `${config.apiUrl}/jewelry/with-images`,
                formData,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                  }
                }
              );
            } else {
              // No files, use regular JSON approach (for backward compatibility)
              const processedItems = newJewelryItems.map(item => {
                const { images, ...itemWithoutImages } = item;

                let processedImages = [];
                if (images && Array.isArray(images)) {
                  processedImages = images.map(img => {
                    if (typeof img === 'object') {
                      return { url: img.url || '' };
                    }
                    return img;
                  });
                }

                return {
                  ...itemWithoutImages,
                  images: processedImages
                };
              });

              // Check if we have any jewelry items from the gem estimator
              // If items have originalData, use that for full jewelry information
              const jewelryItemsToPost = jewelryItems.map(item => {
                if (item.originalData) {
                  // Merge originalData with current item to ensure we have all jewelry fields
                  return {
                    ...item.originalData,
                    price: item.price,
                    transaction_type: item.transaction_type,
                    images: item.images || item.originalData.images
                  };
                }
                return item;
              });
              itemsToPost = jewelryItems.length > 0 ? jewelryItemsToPost : processedItems;

              jewelryResponse = await axios.post(
                `${config.apiUrl}/jewelry`,
                { cartItems: itemsToPost },
                {
                  headers: { Authorization: `Bearer ${token}` }
                }
              );
            }

            createdJewelryItems = jewelryResponse.data;

            // Push data to jewelry_secondary_gems for each created item
            for (let i = 0; i < createdJewelryItems.length; i++) {
              const item = createdJewelryItems[i];
              const originalItem = itemsToPost[i];
              
              // Check if this item has secondary gem data that should be pushed
              if ( 
                  (originalItem.secondary_gems && originalItem.secondary_gems.length > 0)) {
                try {
                  if (originalItem.secondary_gems && originalItem.secondary_gems.length > 0) {
                    
                    // Send each secondary gem individually
                    try {
                      for (const gemData of originalItem.secondary_gems) {
                        
                        // Send the gem data
                        await axios.post(
                          `${config.apiUrl}/jewelry_secondary_gems`,
                          {
                            jewelry_id: item.item_id,
                            ...gemData
                          },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                      }
                    } catch (error) {
                      console.error(`Error adding secondary gems for item ${item.item_id}:`, error);
                    }
                  } else {
                    // Fallback to legacy format for backward compatibility
                    // Extract all secondary gem fields from the original item
                    const secondaryGemData = {
                      secondary_gem_type: originalItem.secondary_gem_type,
                      secondary_gem_category: originalItem.secondary_gem_category,
                      secondary_gem_size: originalItem.secondary_gem_size,
                      secondary_gem_quantity: originalItem.secondary_gem_quantity,
                      secondary_gem_shape: originalItem.secondary_gem_shape,
                      secondary_gem_weight: originalItem.secondary_gem_weight,
                      secondary_gem_color: originalItem.secondary_gem_color,
                      secondary_gem_exact_color: originalItem.secondary_gem_exact_color,
                      secondary_gem_clarity: originalItem.secondary_gem_clarity,
                      secondary_gem_cut: originalItem.secondary_gem_cut,
                      secondary_gem_lab_grown: originalItem.secondary_gem_lab_grown,
                      secondary_gem_authentic: originalItem.secondary_gem_authentic,
                      secondary_gem_value: originalItem.secondary_gem_value
                    };
                    
                    // Push to jewelry_secondary_gems with the same item_id using the legacy endpoint
                    await axios.put(
                      `${config.apiUrl}/jewelry_secondary_gems/${item.item_id}`,
                      secondaryGemData,
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                  }
                } catch (error) {
                  console.error(`Error adding secondary gems for item ${item.item_id}:`, error);
                  // Continue with transaction even if secondary gems fail
                }
              }
            }
          }

          // Step 2: Create transaction with PENDING status
          // For jewelry items: use createdJewelryItems
          // For non-jewelry items: use cartItems directly (no item_id needed)
          const transactionPayload = {
            customer_id: selectedCustomer.id,
            employee_id: employeeId,
            total_amount: parseFloat(calculateTotal().toFixed(2)), // Round to 2 decimal places
            transaction_date: new Date().toISOString().split('T')[0]
          };

          // Build cart items for transaction
          // If we have created jewelry items, map them with their item_ids
          // Also include items from inventory with their existing item_ids
          if (createdJewelryItems && createdJewelryItems.length > 0) {
            // Map created jewelry items to cart items
            let createdItemIndex = 0;
            transactionPayload.cartItems = checkoutItems.map(item => {
              const type = item.transaction_type?.toLowerCase() || 'sale';

              // If this is an inventory item, use its existing item_id
              if (item.fromInventory && item.item_id) {
                return {
                  item_id: item.item_id,
                  transaction_type_id: transactionTypes[type],
                  price: item.price,
                  description: item.description
                };
              }

              // Otherwise, use the newly created jewelry item
              const createdItem = createdJewelryItems[createdItemIndex];
              createdItemIndex++;

              return {
                item_id: createdItem.item_id,
                transaction_type_id: transactionTypes[type],
                price: item.price,
                description: item.description
              };
            });
          } else {
            // No newly created jewelry items - handle inventory and non-jewelry items
            transactionPayload.cartItems = checkoutItems.map(item => {
              const type = item.transaction_type?.toLowerCase() || 'sale';
              const transactionTypeId = transactionTypes[type];

              if (!transactionTypeId) {
                console.error(`Unable to find transaction type ID for type: ${type}. Using 'sale' as fallback.`);
                // Fallback to 'sale' type if mapping fails
                return {
                  transaction_type_id: transactionTypes['sale'] || transactionTypes['retail'],
                  price: item.price,
                  description: item.description || 'Item',
                  ...(item.fromInventory && item.item_id ? { item_id: item.item_id } : {})
                };
              }

              return {
                transaction_type_id: transactionTypeId,
                price: item.price,
                description: item.description || 'Item',
                ...(item.fromInventory && item.item_id ? { item_id: item.item_id } : {})
              };
            });
          }

          const transactionResponse = await axios.post(
            `${config.apiUrl}/transactions`,
            transactionPayload,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          realTransactionId = transactionResponse.data.transaction.transaction_id;

          // Step 2.5: Post buy_ticket and sale_ticket records for each unique ticket_id
          // Separate buy and sale tickets
          const buyTicketIds = new Set();
          const saleTicketIds = new Set();

          checkoutItems.forEach(item => {
            if (item.buyTicketId) {
              const transactionType = item.transaction_type?.toLowerCase() || '';
              if (transactionType === 'sale') {
                saleTicketIds.add(item.buyTicketId);
              } else if (transactionType === 'buy') {
                buyTicketIds.add(item.buyTicketId);
              }
            }
          });

          // Process buy_ticket records
          for (const buyTicketId of buyTicketIds) {
            // Find all items with this buyTicketId
            const itemsForTicket = checkoutItems
              .map((item, index) => ({ ...item, index }))
              .filter(item => item.buyTicketId === buyTicketId && item.transaction_type?.toLowerCase() === 'buy');

            // Post a buy_ticket record for each item with this ticket
            for (const item of itemsForTicket) {
              try {
                // Get item_id from createdJewelryItems if it's a jewelry item
                let itemId = null;
                if (createdJewelryItems && createdJewelryItems.length > 0 && createdJewelryItems[item.index]) {
                  itemId = createdJewelryItems[item.index].item_id;
                } else if (item.item_id) {
                  // Use item_id from the item itself if available
                  itemId = item.item_id;
                }

                await axios.post(
                  `${config.apiUrl}/buy-ticket`,
                  {
                    buy_ticket_id: buyTicketId,
                    transaction_id: realTransactionId,
                    item_id: itemId
                  },
                  {
                    headers: { Authorization: `Bearer ${token}` }
                  }
                );

              } catch (buyTicketError) {
                console.error('Error posting buy_ticket:', buyTicketError);
                console.error('Error details:', buyTicketError.response?.data);
                console.error('Error status:', buyTicketError.response?.status);
                // Continue with checkout even if buy_ticket posting fails
              }
            }
          }

          // Process sale_ticket records
          for (const saleTicketId of saleTicketIds) {
            // Find all items with this saleTicketId
            const itemsForTicket = checkoutItems
              .map((item, index) => ({ ...item, index }))
              .filter(item => item.buyTicketId === saleTicketId && item.transaction_type?.toLowerCase() === 'sale');

            // Post a sale_ticket record for each item with this ticket
            for (const item of itemsForTicket) {
              try {
                // Get item_id from createdJewelryItems if it's a jewelry item
                let itemId = null;
                if (createdJewelryItems && createdJewelryItems.length > 0 && createdJewelryItems[item.index]) {
                  itemId = createdJewelryItems[item.index].item_id;
                } else if (item.item_id) {
                  // Use item_id from the item itself if available
                  itemId = item.item_id;
                }

                await axios.post(
                  `${config.apiUrl}/sale-ticket`,
                  {
                    sale_ticket_id: saleTicketId,
                    transaction_id: realTransactionId,
                    item_id: itemId
                  },
                  {
                    headers: { Authorization: `Bearer ${token}` }
                  }
                );

              } catch (saleTicketError) {
                console.error('Error posting sale_ticket:', saleTicketError);
                console.error('Error details:', saleTicketError.response?.data);
                console.error('Error status:', saleTicketError.response?.status);
                // Continue with checkout even if sale_ticket posting fails
              }
            }
          }

          // Step 2.6: Post pawn_ticket records for pawn transactions
          const pawnTicketIds = new Set();

          // Collect items with pawnTicketId or transaction_type='pawn'
          checkoutItems.forEach((item, index) => {
            const transactionType = item.transaction_type?.toLowerCase() || '';
            if (item.pawnTicketId || transactionType === 'pawn') {
              // Generate pawn ticket ID if not present
              const ticketId = item.pawnTicketId || `PT${realTransactionId}`;
              pawnTicketIds.add(ticketId);
            }
          });

          for (const pawnTicketId of pawnTicketIds) {
            const itemsForTicket = checkoutItems
              .map((item, index) => ({ ...item, index }))
              .filter(item => {
                const transactionType = item.transaction_type?.toLowerCase() || '';
                return item.pawnTicketId === pawnTicketId ||
                       (transactionType === 'pawn' && (!item.pawnTicketId || item.pawnTicketId === pawnTicketId));
              });

            for (const item of itemsForTicket) {
              try {
                let itemId = null;
                if (createdJewelryItems && createdJewelryItems.length > 0 && createdJewelryItems[item.index]) {
                  itemId = createdJewelryItems[item.index].item_id;
                } else if (item.item_id) {
                  itemId = item.item_id;
                }

                await axios.post(
                  `${config.apiUrl}/pawn-ticket`,
                  {
                    pawn_ticket_id: pawnTicketId,
                    transaction_id: realTransactionId,
                    item_id: itemId
                  },
                  {
                    headers: { Authorization: `Bearer ${token}` }
                  }
                );
              } catch (pawnTicketError) {
                console.error('❌ Error posting pawn_ticket:', pawnTicketError);
                console.error('Error details:', pawnTicketError.response?.data);
              }
            }
          }

          // Step 2.7: Post trade_ticket records for each unique trade_ticket_id
          const tradeTicketIds = new Set();
          checkoutItems.forEach(item => {
            if (item.tradeTicketId) {
              tradeTicketIds.add(item.tradeTicketId);
            }
          });

          for (const tradeTicketId of tradeTicketIds) {
            const itemsForTicket = checkoutItems
              .map((item, index) => ({ ...item, index }))
              .filter(item => item.tradeTicketId === tradeTicketId);

            for (const item of itemsForTicket) {
              try {
                let itemId = null;
                if (createdJewelryItems && createdJewelryItems.length > 0 && createdJewelryItems[item.index]) {
                  itemId = createdJewelryItems[item.index].item_id;
                } else if (item.item_id) {
                  itemId = item.item_id;
                }

                await axios.post(
                  `${config.apiUrl}/trade-ticket`,
                  {
                    trade_ticket_id: tradeTicketId,
                    transaction_id: realTransactionId,
                    item_id: itemId
                  },
                  {
                    headers: { Authorization: `Bearer ${token}` }
                  }
                );
              } catch (tradeTicketError) {
                console.error('Error posting trade_ticket:', tradeTicketError);
              }
            }
          }

          // Step 3: Process all collected payments against the real transaction ID
          for (const payment of updatedPayments) {
            const paymentResponse = await axios.post(
              `${config.apiUrl}/payments`,
              {
                transaction_id: realTransactionId,
                amount: parseFloat(payment.amount.toFixed(2)), // Round to 2 decimal places
                payment_method: payment.payment_method
              },
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
          }

          // Step 3.5: Update jewelry inventory status to SOLD for sale transactions
          for (const item of checkoutItems) {
            const transactionType = item.transaction_type?.toLowerCase() || '';


            // Only update status for sale transactions with inventory items
            if (transactionType === 'sale' && item.item_id && item.fromInventory) {
              try {
                // Calculate total price including protection plan and tax
                const basePrice = parseFloat(item.price) || 0;
                const protectionPlanAmount = item.protectionPlan ? basePrice * 0.15 : 0;
                const subtotal = basePrice + protectionPlanAmount;

                // Calculate tax (check if customer is tax exempt)
                const taxAmount = selectedCustomer?.tax_exempt ? 0 : subtotal * taxRate;
                const totalItemPrice = subtotal + taxAmount;

                const response = await axios.put(
                  `${config.apiUrl}/jewelry/${item.item_id}/status`,
                  {
                    status: 'SOLD',
                    item_price: totalItemPrice
                  },
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                console.log(`Successfully updated item ${item.item_id} status to SOLD with item price`, response.data);
              } catch (updateError) {
                console.error(`Error updating item ${item.item_id} status:`, updateError);
                console.error('Error details:', updateError.response?.data);
                // Continue with checkout even if status update fails
              }
            }
          }

          // Step 4: Display success message and navigate to home
          setLoading(false);
          setSnackbar({
            open: true,
            message: 'Transaction completed successfully!',
            severity: 'success'
          });

          // Remove only the checked out items from cart, keeping other items
          // This allows multiple tickets to be managed independently
          setTimeout(() => {
            try {
              // Read current cart items from sessionStorage to get the most up-to-date state
              const sessionCartItems = sessionStorage.getItem('cartItems');
              let currentCartItems = [];

              if (sessionCartItems) {
                currentCartItems = JSON.parse(sessionCartItems);
              }

              // Create a set of ticket IDs from checkoutItems for efficient lookup
              const checkedOutTicketIds = new Set(
                checkoutItems
                  .filter(item => item.buyTicketId)
                  .map(item => item.buyTicketId)
              );


              // Filter out all items that belong to the checked out tickets
              const remainingItems = currentCartItems.filter(item => {
                // If item has a buyTicketId and it matches one of the checked out tickets, remove it
                if (item.buyTicketId && checkedOutTicketIds.has(item.buyTicketId)) {
                  return false;
                }

                return true;
              });

              // Update sessionStorage directly to ensure persistence
              sessionStorage.setItem('cartItems', JSON.stringify(remainingItems));

              // If all items were checked out, clear the cart entirely
              if (remainingItems.length === 0) {
                clearCart();
              }
            } catch (error) {
              console.error('Error removing checked out items from cart:', error);
              // Fallback to clearing everything on error
              clearCart();
            }

            setTransactionCreated(false);
            setCurrentTransactionId(null);
            setPayments([]);
            navigate('/jewel-estimator');
          }, 1000);

        } catch (paymentError) {
          console.error('Error processing payment:', paymentError);
          setLoading(false);

          setSnackbar({
            open: true,
            message: 'Error processing payments. Please try again.',
            severity: 'error'
          });

          // Reset payment state to allow retry
          setIsFullyPaid(false);
          setTransactionCreated(false);
          setCurrentTransactionId(null);
          setPayments([]);
          setRemainingAmount(calculateTotal());
          return;
        }
      } else {
        // Show partial payment message
        const balanceLabel = newRemainingAmount >= 0 ? 'Balance Receivable' : 'Balance Payable';
        setSnackbar({
          open: true,
          message: `Payment of $${paymentAmount} accepted. ${balanceLabel}: $${Math.abs(newRemainingAmount).toFixed(2)}`,
          severity: 'info'
        });
      }

      // Reset payment form
      setPaymentDetails({
        cashAmount: ''
      });
    } catch (error) {
      if (error.message === 'Authentication token not found') {
        sessionStorage.setItem('redirectAfterLogin', '/checkout');
        navigate('/login');
      } else {
        setSnackbar({
          open: true,
          message: `Error: ${error.message}`,
          severity: 'error'
        });
      }
    }
  };

  const handleSaveQuote = async () => {
    if (!selectedCustomer?.name) {
      setSnackbar({
        open: true,
        message: 'Please select a customer first',
        severity: 'warning'
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        sessionStorage.setItem('redirectAfterLogin', '/checkout');
        navigate('/login');
        return;
      }

      // Get employee ID from token
      const employeeId = JSON.parse(atob(token.split('.')[1])).id;

      const response = await axios.post(
        `${config.apiUrl}/quotes`,
        {
          items: cartItems,
          customer_id: selectedCustomer.id,
          employee_id: employeeId,
          total_amount: calculateTotal(),
          created_at: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.status === 201 && response.data) {
        const expiresIn = response.data.expires_in || 30;
        setSnackbar({
          open: true,
          message: `Quote ${response.data.quote_id} saved successfully. Valid for ${expiresIn} days.`,
          severity: 'success'
        });

        // Check if any items have actual file objects
        const hasImageFiles = cartItems.some(item =>
          item.images && Array.isArray(item.images) &&
          item.images.some(img => img.file instanceof File)
        );

        if (hasImageFiles) {
          // Use FormData for file uploads
          const formData = new FormData();

          // Collect all image files from all items
          cartItems.forEach(item => {
            if (item.images && Array.isArray(item.images)) {
              item.images.forEach(img => {
                if (img.file instanceof File) {
                  formData.append('images', img.file);
                }
              });
            }
          });

          // Process cart items to remove file objects
          const processedItems = cartItems.map(item => {
            const { images, ...itemWithoutImages } = item;
            return {
              ...itemWithoutImages,
              transaction_type_id: transactionTypes[item.transaction_type],
            };
          });

          formData.append('cartItems', JSON.stringify(processedItems));
          formData.append('quote_id', response.data.quote_id);

          await axios.post(
            `${config.apiUrl}/jewelry/with-images`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );
        } else {
          // No files, use regular JSON approach
          await axios.post(
            `${config.apiUrl}/jewelry`,
            {
              cartItems: cartItems.map(item => ({
                ...item,
                transaction_type_id: transactionTypes[item.transaction_type],
              })),
              quote_id: response.data.quote_id
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
        }

        clearCart();
        setTimeout(() => {
          navigate('/jewel-estimator');
        }, 2000); // Show message for 2 seconds before navigating
      } else {
        throw new Error('Failed to save quote');
      }
      
    } catch (error) {
      console.error('Error saving quote:', error);
      setSnackbar({
        open: true,
        message: `Error saving quote: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEstimation = () => {
    // If we came from a quote, go back to quote manager
    if (location.state?.quoteId) {
      clearCart();
      setCustomer(null);
      navigate('/quote-manager');
    } else if (location.state?.from === 'coinsbullions') {
      // Save the cart items to session storage before navigating back to CoinsBullions
      sessionStorage.setItem('coinsbullionsState', JSON.stringify({
        items: cartItems
      }));
      clearCart();
      setCustomer(null);
      // Go back to coins bullions estimator
      navigate('/bullion-estimator');
    } else if (location.state?.from === 'cart') {
      // If fully paid, filter out items that were checked out
      // Otherwise, use all cart items as is
      let itemsToKeep;
      if (isFullyPaid) {
        // Create a set of checkout item IDs for faster lookup
        const checkoutItemIds = new Set(checkoutItems.map(item => item.id));
        // Filter out items that were checked out
        itemsToKeep = allCartItems.filter(item => !checkoutItemIds.has(item.id));
      } else {
        itemsToKeep = allCartItems;
      }
      // Ensure each item is a properly formatted object, not an array
      const formattedCartItems = itemsToKeep.map(item => {
        // If item is an array, convert it to a proper object
        if (Array.isArray(item)) {
          return {
            id: item[0].id || null,
            description: item[0].description || '',
            category: item[0].category || '',
            value: item[0].value || '',
            transaction_type: item[0].transaction_type || 'pawn',
            customer: item[0].customer  || null,
            employee: item[0].employee || null
          };
        }
        return item; // Already in correct format
      });
      
      // Save formatted items to session storage
      sessionStorage.setItem('cartItems', JSON.stringify(formattedCartItems));
      
      navigate('/customer-ticket', {
        state: {
          from: 'checkout',
          items: formattedCartItems // Pass the properly formatted items
        }
      });
    } else {
      // Ensure items are properly formatted before saving to session storage
      const formattedCartItems = cartItems.map(item => {
        if (Array.isArray(item)) {
          return {
            id: item[0].id || null,
            description: item[0].description || '',
            category: item[0].category || '',
            value: item[0].value || '',
            transaction_type: item[0].transaction_type || 'pawn',
            customer: item[0].customer  || null,
            employee: item[0].employee || null
          };
        }
        return item;
      });
      
      // Save the formatted cart items to session storage before navigating back
      sessionStorage.setItem('jewelryState', JSON.stringify({
        items: formattedCartItems
      }));
      clearCart();
      setCustomer(null);
      // Go back to gem estimator
      navigate('/jewel-estimator');
    }  
  };

  // This useEffect is now redundant - all initialization logic is handled in the first useEffect (lines 108-210)
  // Keeping this comment for reference but the logic has been consolidated

  // Only redirect if we have no items to checkout after initialization (customer is optional)
  useEffect(() => {
    if (isInitialized && cartItems.length === 0 && checkoutItems.length === 0) {
      navigate('/quote-manager');
    }
  }, [cartItems, checkoutItems, navigate, isInitialized]);
  
  // Handle customer selection from search results
  const handleSelectCustomer = (customerData) => {
    // Format the selected customer for the ticket
    const selectedCustomer = {
      ...customerData,
      name: `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim(),
    };
    
    // Update the customer state
    setCustomer(selectedCustomer);
    
    // Close dialog and clear search
    setCustomerSearchDialogOpen(false);
    setSearchForm({
      first_name: '',
      last_name: '',
      id_number: '',
      phone: ''
    });
    setSearchResults([]);
    
    // Show success message
    setSnackbar({
      open: true,
      message: `Customer ${selectedCustomer.name} selected`,
      severity: 'success'
    });
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>

        <Grid container spacing={3}>
          {/* Left side: Customer Details and Order Summary stacked */}
          <Grid item xs={12} md={8}>
            {/* Customer Details */}
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Customer Details
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setCustomerSearchDialogOpen(!customerSearchDialogOpen)}
                  startIcon={customerSearchDialogOpen ? null : <PersonSearchIcon />}
                >
                  {customerSearchDialogOpen ? 'Close Search' : 'Change Customer'}
                </Button>
              </Box>
              
              {customerSearchDialogOpen ? (
                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={1} mb={1}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        name="first_name"
                        label="First Name"
                        value={searchForm.first_name}
                        onChange={handleLookupInputChange}
                        variant="outlined"
                        size="small"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchCustomer()}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        name="last_name"
                        label="Last Name"
                        value={searchForm.last_name}
                        onChange={handleLookupInputChange}
                        variant="outlined"
                        size="small"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchCustomer()}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        name="id_number"
                        label="ID Number"
                        value={searchForm.id_number}
                        onChange={handleLookupInputChange}
                        variant="outlined"
                        size="small"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchCustomer()}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        name="phone"
                        label="Phone"
                        value={searchForm.phone}
                        onChange={handleLookupInputChange}
                        variant="outlined"
                        size="small"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchCustomer()}
                      />
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ maxHeight: '250px', overflow: 'auto', bgcolor: 'background.paper', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <List dense disablePadding>
                      {searchResults.length > 0 ? (
                        searchResults.map((customer) => (
                          <ListItem 
                            key={customer.id} 
                            button 
                            onClick={() => handleSelectCustomer(customer)}
                            divider
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ width: 32, height: 32, fontSize: '0.9rem' }}>
                                {`${customer.first_name?.[0] || ''}${customer.last_name?.[0] || ''}`}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText 
                              primary={`${customer.first_name || ''} ${customer.last_name || ''}`}
                              secondary={
                                <React.Fragment>
                                  {customer.phone && <span>Phone: {customer.phone}</span>}
                                  {customer.phone && customer.email && ' | '}
                                  {customer.email && <span>Email: {customer.email}</span>}
                                </React.Fragment>
                              }
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))
                      ) : null}
                    </List>
                  </Box>
                </Box>
              ) : (
                <Box>
                  {selectedCustomer?.isFastSale ? (
                    <Box>
                      <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
                        Fast Sale Mode - Enter customer information below
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="First Name *"
                            value={fastSaleCustomerData.first_name}
                            onChange={handleFastSaleCustomerChange('first_name')}
                            size="small"
                            required
                            error={!fastSaleCustomerData.first_name}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Last Name *"
                            value={fastSaleCustomerData.last_name}
                            onChange={handleFastSaleCustomerChange('last_name')}
                            size="small"
                            required
                            error={!fastSaleCustomerData.last_name}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Phone"
                            value={fastSaleCustomerData.phone}
                            onChange={handleFastSaleCustomerChange('phone')}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={fastSaleCustomerData.email}
                            onChange={handleFastSaleCustomerChange('email')}
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  ) : selectedCustomer ? (
                    <Grid container spacing={2}>
                      {/* Display customer details based on preferences */}
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle1" sx={{ flexBasis: '30%' }}>
                            <strong>N:</strong> {`${selectedCustomer.name || ''}`}
                          </Typography>
                          <Typography variant="subtitle1" sx={{ flexBasis: '40%', textAlign: 'center' }}>
                            {selectedCustomer.email && (
                              <><strong>E:</strong> {selectedCustomer.email}</>
                            )}
                          </Typography>
                          <Typography variant="subtitle1" sx={{ flexBasis: '30%', textAlign: 'right' }}>
                            {selectedCustomer.phone && (
                              <><strong>P:</strong> {selectedCustomer.phone}</>
                            )}
                          </Typography>
                        </Box>
                      </Grid>

                      {selectedCustomer.address && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle1">
                            <strong>Address:</strong> {selectedCustomer.address}
                          </Typography>
                        </Grid>
                      )}

                      {selectedCustomer.tax_exempt && (
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                color: '#4caf50',
                                fontWeight: 'bold',
                                backgroundColor: '#e8f5e9',
                                padding: '4px 12px',
                                borderRadius: '4px',
                                display: 'inline-block'
                              }}
                            >
                              ✓ TAX EXEMPT CUSTOMER
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  ) : (
                    <Typography variant="body1" color="text.secondary" align="center">
                      No customer selected. Use the search button to find and select a customer.
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
            
            {/* Order Summary - stacked below customer details */}
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell width="10%">Image</TableCell>
                      <TableCell width="45%">Item Description</TableCell>
                      <TableCell width="25%">Transaction Type</TableCell>
                      <TableCell width="20%" align="right">Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {checkoutItems.map((item, index) => {
                    
                      // Determine the appropriate description to display
                      let displayDescription = '';
                      
                      // Try to use description field first (most common)
                      if (item.long_desc || item.description) {
                        displayDescription = item.long_desc || item.description;
                      }
                      // Fallback to short_desc if present
                      else if (item.short_desc) {
                        displayDescription = item.short_desc;
                      }
                      // Handle trade items specially
                      else if (item.tradeItem && item.storeItem) {
                        displayDescription = `Trading "${item.tradeItem}" for "${item.storeItem}"`;
                      }
                      // Handle repair items specially
                      else if (item.issue) {
                        displayDescription = `Repair - Issue: ${item.issue}`;
                      }
                      // Last resort fallback
                      else {
                        displayDescription = 'Item';
                      }
                      
                      // Determine transaction type to display
                      let transactionType = '';
                      if (item.transactionType) {
                        transactionType = item.transactionType;
                      } else if (item.transaction_type) {
                        transactionType = item.transaction_type;
                      } else {
                        // Fallback logic to determine transaction type
                        if (item.price > 0 || item.value > 0 || (item.fee !== undefined && item.fee > 0)) {
                          transactionType = 'Sale';
                        } else if (item.price < 0 || item.value < 0 || (item.fee !== undefined && item.fee < 0)) {
                          transactionType = 'Purchase';
                        } else if (item.tradeItem) {
                          transactionType = 'Trade';
                        } else if (item.issue) {
                          transactionType = 'Repair';
                        } else {
                          transactionType = 'Other';
                        }
                      }
                      
                      // Determine price to display
                      let price = 0;
                      if (item.price !== undefined) price = parseFloat(item.price) || 0;
                      else if (item.value !== undefined) price = parseFloat(item.value) || 0;
                      else if (item.fee !== undefined) price = parseFloat(item.fee) || 0;
                      else if (item.amount !== undefined) price = parseFloat(item.amount) || 0;

                      // Add protection plan (15% of item price) if enabled
                      const protectionPlanAmount = item.protectionPlan ? price * 0.15 : 0;
                      const totalPrice = price + protectionPlanAmount;

                      // Apply sign based on transaction type
                      // Money going OUT (buy/pawn) = negative values
                      // Money coming IN (sale/repair/other) = positive values
                      const itemTransactionType = (item.transaction_type || item.transactionType || '').toLowerCase();
                      let displayPrice = totalPrice;
                      if (itemTransactionType === 'buy' || itemTransactionType === 'pawn') {
                        displayPrice = -Math.abs(totalPrice);
                      } else {
                        displayPrice = Math.abs(totalPrice);
                      }

                      return (
                        <TableRow key={index}>
                          <TableCell>
                            {item.images && item.images.length > 0 ? (
                              <Avatar
                                src={item.images.find(img => img.isPrimary)?.url || item.images[0]?.url}
                                alt="Item"
                                variant="rounded"
                                sx={{ width: 50, height: 50, objectFit: 'cover' }}
                              />
                            ) : (
                              <Avatar
                                variant="rounded"
                                sx={{ width: 50, height: 50, bgcolor: 'grey.300' }}
                              >
                                <AttachMoneyIcon />
                              </Avatar>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              <span>{displayDescription}</span>
                              {item.protectionPlan && (
                                <span style={{ fontSize: '0.85em', color: '#666', fontStyle: 'italic' }}>
                                  + Protection Plan (15%): ${protectionPlanAmount.toFixed(2)}
                                </span>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{transactionType}</TableCell>
                          <TableCell align="right" sx={{
                            color: displayPrice < 0 ? 'error.main' : 'success.main',
                            fontWeight: 'bold'
                          }}>
                            ${parseFloat(displayPrice).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 2 }} />

              {/* Price Breakdown */}
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Subtotal:</Typography>
                  <Typography variant="body1">${calculateSubtotal().toFixed(2)}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">
                    {selectedCustomer?.tax_exempt ? (
                      <span style={{ color: '#4caf50', fontWeight: 'bold' }}>Tax (EXEMPT)</span>
                    ) : (
                      `Tax (${(taxRate * 100).toFixed(0)}%)`
                    )}:
                  </Typography>
                  <Typography variant="body1">${calculateTax().toFixed(2)}</Typography>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" fontWeight="bold">Total:</Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    ${calculateTotal().toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
          
          {/* Right side: Payment Details */}
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Payment Details
                </Typography>
                <Button
                  variant="outlined"
                  onClick={handleBackToEstimation}
                  startIcon={<ArrowBackIcon />}
                  size="small"
                >
                  {location.state?.quoteId ? 'Back to Quotes' : 
                   location.state?.from === 'cart' ? 'Customer Ticket' : 
                   location.state?.from === 'coinsbullions' ? 'Bullion Est.' : 'Jewelry Est.'}
                </Button>
              </Box>
              <Typography variant="h6" gutterBottom sx={{
                color: remainingAmount >= 0 ? 'success.main' : 'error.main'
              }}>
                {remainingAmount >= 0 ? 'Balance Receivable' : 'Balance Payable'}: ${Math.abs(remainingAmount).toFixed(2)}
              </Typography>

              {/* Amount field first */}
              <TextField
                fullWidth
                label="Payment Amount"
                type="number"
                value={paymentDetails.cashAmount}
                onChange={handleInputChange('cashAmount')}
                sx={{ mb: 2 }}
              />

              {/* Payment method selection */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="payment-method-label">Payment Method</InputLabel>
                <Select
                  labelId="payment-method-label"
                  id="payment-method-select"
                  value={paymentMethod}
                  label="Payment Method"
                  onChange={handlePaymentMethodChange}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="debit">Debit Card</MenuItem>
                  <MenuItem value="credit">Credit Card</MenuItem>
                </Select>
              </FormControl>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveQuote}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save as Quote'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PaymentIcon />}
                  onClick={handleSubmit}
                  color="primary"
                >
                  {parseFloat(paymentDetails.cashAmount || 0) >= Math.abs(remainingAmount)
                    ? 'Process Payment'
                    : 'Add Payment'}
                </Button>
              </Box>
              
              {/* Payment History */}
              {payments.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {payments.map((payment, index) => {
                      const isCash = payment.method === 'cash';
                      const methodLabel = payment.method === 'cash' ? 'Cash' :
                                         payment.method === 'debit' ? 'Debit Card' :
                                         payment.method === 'credit' ? 'Credit Card' : 'Card';

                      return (
                        <Chip
                          key={index}
                          icon={isCash ? <AttachMoneyIcon /> : <CreditCardIcon />}
                          label={`${methodLabel} $${parseFloat(payment.amount).toFixed(2)}`}
                          color={isCash ? 'success' : payment.method === 'debit' ? 'info' : 'primary'}
                          variant="outlined"
                          sx={{ paddingY: 2.5, paddingX: 0.5, fontSize: '0.9rem' }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default Checkout;
