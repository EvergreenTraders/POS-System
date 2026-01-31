import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWorkingDate } from '../context/WorkingDateContext';
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
 * Convert a blob URL or data URL to a File object
 */
const blobUrlToFile = async (url, filename = 'image.jpg') => {
  try {
    // Handle data URLs (base64 encoded images)
    if (url.startsWith('data:')) {
      const response = await fetch(url);
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type || 'image/jpeg' });
    }

    // Handle blob URLs
    if (url.startsWith('blob:')) {
      const response = await fetch(url);
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type || 'image/jpeg' });
    }

    console.warn('URL is neither a blob nor a data URL:', url);
    return null;
  } catch (error) {
    console.error('Error converting URL to file:', error);
    return null;
  }
};

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
  const { getCurrentDate } = useWorkingDate();
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
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [redeemedLocations, setRedeemedLocations] = useState([]);
  const [selectedItemsForRedeem, setSelectedItemsForRedeem] = useState([]);
  // Pawn config - frozen at time of pawn creation
  const [pawnConfig, setPawnConfig] = useState({
    term_days: 90,
    interest_rate: 2.9,
    frequency_days: 30
  });

  // Effect to initialize cart and customer from navigation (Estimator, CoinsBullions, or Cart)
  useEffect(() => {
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
        // Don't clear sessionStorage here - it will be cleared after successful transaction
        // This preserves the data if user needs to navigate to cash drawer and back
      }

      if (sessionCustomer) {
        customerData = JSON.parse(sessionCustomer);
      }
    }

    // Only skip initialization if already initialized AND NOT coming from cash-drawer
    if (isInitialized && fromSource !== 'cash-drawer') {
      return;
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
      else if (fromSource === 'cash-drawer') {
        // Extract jewelry-specific items
        const filteredJewelryItems = itemsToCheckout.filter(item => item.sourceEstimator === 'jewelry');
        setJewelryItems(filteredJewelryItems);

        // Normalize price field
        const normalizedItems = itemsToCheckout.map(item => {
          const normalizedItem = { ...item };
          if (normalizedItem.price === undefined) {
            if (normalizedItem.value !== undefined) normalizedItem.price = normalizedItem.value;
            else if (normalizedItem.fee !== undefined) normalizedItem.price = normalizedItem.fee;
            else if (normalizedItem.amount !== undefined) normalizedItem.price = normalizedItem.amount;
            else normalizedItem.price = 0;
          }
          return normalizedItem;
        });

        setCheckoutItems(normalizedItems);
        setAllCartItems(allCartItemsData || itemsToCheckout);

        // Restore the customer
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

        // Response is now an array - filter for physical drawer sessions only
        const sessions = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);
        const physicalSession = sessions.find(s => s.drawer_type === 'physical');

        // If no active physical drawer session exists, redirect to cash drawer page
        if (!physicalSession) {
          setSnackbar({
            open: true,
            message: 'You must open a cash drawer before processing transactions',
            severity: 'warning'
          });

          // Save current checkout state to sessionStorage before navigating
          // Save checkoutItems if available, otherwise save cartItems as checkoutItems
          const itemsToSave = checkoutItems.length > 0 ? checkoutItems : cartItems;
          if (itemsToSave && itemsToSave.length > 0) {
            sessionStorage.setItem('checkoutItems', JSON.stringify(itemsToSave));
          }

          if (selectedCustomer) {
            sessionStorage.setItem('selectedCustomer', JSON.stringify(selectedCustomer));
          }

          // Always save allCartItems if available, otherwise use cartItems from context
          const allItemsToSave = allCartItems.length > 0 ? allCartItems : cartItems;
          if (allItemsToSave && allItemsToSave.length > 0) {
            sessionStorage.setItem('cartItems', JSON.stringify(allItemsToSave));
          }

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

  // Fetch pawn config on component mount (frozen at time of pawn creation)
  useEffect(() => {
    const fetchPawnConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${config.apiUrl}/pawn-config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPawnConfig({
          term_days: parseInt(response.data.term_days) || 90,
          interest_rate: parseFloat(response.data.interest_rate) || 2.9,
          frequency_days: parseInt(response.data.frequency_days) || 30
        });
      } catch (error) {
        console.error('Error fetching pawn config:', error);
      }
    };
    fetchPawnConfig();
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
    const taxRate = 0.13;
    const isTaxExempt = selectedCustomer?.tax_exempt || false;

    return itemsToCalculate.reduce((total, item, index) => {
      let itemValue = 0;
      const transactionType = item.transaction_type?.toLowerCase() || '';

      // Special handling for redeem transactions
      if (transactionType === 'redeem') {
        // Only count the first item in each redeem ticket
        const ticketId = item.pawnTicketId || item.buyTicketId;
        const isFirstItemInTicket = itemsToCalculate.findIndex(i =>
          (i.pawnTicketId || i.buyTicketId) === ticketId &&
          (i.transaction_type || '').toLowerCase() === 'redeem'
        ) === index;

        if (isFirstItemInTicket) {
          // Use totalRedemptionAmount for the first item
          itemValue = parseFloat(item.totalRedemptionAmount || item.principal || 0);
          // Add interest if available
          if (item.interest) {
            itemValue += parseFloat(item.interest || 0);
          }
        } else {
          // Skip other items in the same redeem ticket
          itemValue = 0;
        }
      } else {
        // For non-redeem items, use standard price logic
        if (item.price !== undefined) itemValue = parseFloat(item.price) || 0;
        else if (item.value !== undefined) itemValue = parseFloat(item.value) || 0;
        else if (item.fee !== undefined) itemValue = parseFloat(item.fee) || 0;
        else if (item.amount !== undefined) itemValue = parseFloat(item.amount) || 0;
        else if (item.totalAmount !== undefined) itemValue = parseFloat(item.totalAmount) || 0;
      }

      // For sale items, apply quantity multiplication
      if (transactionType === 'sale') {
        const quantity = parseInt(item.quantity) || 1;
        itemValue = itemValue * quantity;
      }

      // Add protection plan (15% of item price) if enabled
      const protectionPlanAmount = item.protectionPlan ? itemValue * 0.15 : 0;
      itemValue = itemValue + protectionPlanAmount;

      // For sale items, add tax (unless customer is tax-exempt)
      if (transactionType === 'sale' && !isTaxExempt) {
        itemValue = itemValue * (1 + taxRate);
      }

      // Apply sign based on transaction type
      // Money going OUT (buy/pawn) = negative values
      // Money coming IN (sale/repair/redeem) = positive values
      if (transactionType === 'buy' || transactionType === 'pawn') {
        itemValue = -Math.abs(itemValue);
      } else {
        itemValue = Math.abs(itemValue);
      }

      return total + itemValue;
    }, 0);
  }, [checkoutItems, cartItems, selectedCustomer]);

  const calculateTax = useCallback(() => {
    // Tax is not calculated - all prices already include tax
    return 0;
  }, []);

  const calculateTotal = useCallback(() => {
    // Total is just the subtotal (no tax added)
    const total = calculateSubtotal();
    // Round to 2 decimal places to avoid floating-point precision issues
    return parseFloat(total.toFixed(2));
  }, [calculateSubtotal]);

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


            // Convert any blob URLs to File objects before uploading
            const itemsWithConvertedImages = await Promise.all(
              newJewelryItems.map(async (item) => {
                if (!item.images || !Array.isArray(item.images)) {
                  return item;
                }

                if (item.images.length === 0) {
                  return item;
                }

                const convertedImages = await Promise.all(
                  item.images.map(async (img, index) => {
                    // If it's already a File object, keep it
                    if (img.file instanceof File) {
                      return img;
                    }

                    // If the URL is a blob URL or data URL, convert it to a File object
                    if (img.url && (img.url.startsWith('blob:') || img.url.startsWith('data:'))) {
                      const file = await blobUrlToFile(img.url, `${item.item_id || 'item'}-${index + 1}.jpg`);
                      if (file) {
                        return {
                          ...img,
                          file: file,
                          isPrimary: img.isPrimary !== undefined ? img.isPrimary : index === 0
                        };
                      } else {
                        console.error('Failed to convert URL to file');
                      }
                    }

                    // Otherwise, keep the image as-is (might be a server URL like /uploads/...)
                    if (img.url && !img.url.startsWith('blob:') && !img.url.startsWith('data:')) {
                      return img;
                    }

                    console.warn('Image has no valid URL:', img);
                    return null;
                  })
                );

                // Filter out null values from failed conversions
                const validImages = convertedImages.filter(Boolean);

                return {
                  ...item,
                  images: validImages
                };
              })
            );

            // Check if any items have actual file objects (after conversion)
            const hasImageFiles = itemsWithConvertedImages.some(item =>
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
              itemsWithConvertedImages.forEach((item, itemIndex) => {
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
              // IMPORTANT: Use itemsWithConvertedImages which has the converted File objects
              const processedItems = itemsWithConvertedImages.map(item => {
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

              // Don't use the old jewelryItems state - use processedItems which has converted images
              itemsToPost = processedItems;

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
              // Note: After blob URL conversion, we should always have files if there were blob URLs
              // This else branch is only for items with server URLs or no images at all
              const processedItems = itemsWithConvertedImages.map(item => {
                const { images, ...itemWithoutImages } = item;

                let processedImages = [];
                if (images && Array.isArray(images)) {
                  processedImages = images.map(img => {
                    if (typeof img === 'object') {
                      // Only save server URLs, not blob or data URLs
                      const url = img.url || '';
                      if (url.startsWith('blob:') || url.startsWith('data:')) {
                        console.warn('Blob/Data URL detected but not converted to file. Skipping image.');
                        return null;
                      }
                      return { url };
                    }
                    return img;
                  }).filter(Boolean); // Remove null entries
                }

                return {
                  ...itemWithoutImages,
                  images: processedImages
                };
              });

              // Don't use the old jewelryItems state - use processedItems which has converted images
              itemsToPost = processedItems;

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
            transaction_date: getCurrentDate() // Use working date from context
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
          // Note: CustomerTicket.js stores pawn ticket IDs in buyTicketId field
          checkoutItems.forEach((item, index) => {
            const transactionType = item.transaction_type?.toLowerCase() || '';
            if (transactionType === 'pawn') {
              // Use buyTicketId as pawnTicketId (CustomerTicket.js stores it in buyTicketId)
              const ticketId = item.pawnTicketId || item.buyTicketId;
              if (ticketId) {
                pawnTicketIds.add(ticketId);
              }
            }
          });

          for (const pawnTicketId of pawnTicketIds) {
            const itemsForTicket = checkoutItems
              .map((item, index) => ({ ...item, index }))
              .filter(item => {
                const transactionType = item.transaction_type?.toLowerCase() || '';
                if (transactionType !== 'pawn') return false;
                // Match by pawnTicketId or buyTicketId (CustomerTicket stores in buyTicketId)
                return item.pawnTicketId === pawnTicketId || item.buyTicketId === pawnTicketId;
              });

            // Calculate due date based on transaction date and term_days
            const transactionDate = new Date(getCurrentDate());
            const dueDate = new Date(transactionDate);
            dueDate.setDate(dueDate.getDate() + pawnConfig.term_days);
            const dueDateStr = dueDate.toISOString().split('T')[0];

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
                    item_id: itemId,
                    // Store pawn config values frozen at time of pawn creation
                    term_days: pawnConfig.term_days,
                    interest_rate: pawnConfig.interest_rate,
                    frequency_days: pawnConfig.frequency_days,
                    due_date: dueDateStr
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

            // Record pawn history for creation (once per pawn ticket)
            try {
              const totalPrincipal = itemsForTicket.reduce((sum, item) => sum + (parseFloat(item.price || item.value) || 0), 0);
              await axios.post(
                `${config.apiUrl}/pawn-history`,
                {
                  pawn_ticket_id: pawnTicketId,
                  action_type: 'CREATED',
                  transaction_id: realTransactionId,
                  principal_amount: totalPrincipal,
                  performed_by: employeeId,
                  notes: 'Pawn created'
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );
            } catch (historyError) {
              console.error(`Error recording pawn history for ${pawnTicketId}:`, historyError);
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
          // Track created resources for cleanup if payment fails
          const createdResources = {
            jewelryItems: createdJewelryItems || [],
            transactionId: realTransactionId,
            pawnTicketsCreated: pawnTicketIds.size > 0,
            pawnHistoryCreated: pawnTicketIds.size > 0
          };

          try {
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
          } catch (paymentError) {
            // Cleanup all created resources on payment failure
            console.error('Payment failed, cleaning up created resources...', paymentError);
            
            try {
              // 1. Delete pawn history (if any was created)
              if (createdResources.pawnHistoryCreated && realTransactionId) {
                await axios.delete(
                  `${config.apiUrl}/pawn-history/transaction/${realTransactionId}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                console.log('✓ Cleaned up pawn history');
              }

              // 2. Delete pawn tickets (if any were created)
              if (createdResources.pawnTicketsCreated && realTransactionId) {
                await axios.delete(
                  `${config.apiUrl}/pawn-ticket/transaction/${realTransactionId}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                console.log('✓ Cleaned up pawn tickets');
              }

              // 3. Delete transaction
              if (realTransactionId) {
                await axios.delete(
                  `${config.apiUrl}/transactions/${realTransactionId}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                console.log('✓ Cleaned up transaction');
              }

              // 4. Delete jewelry items (if any were created)
              if (createdResources.jewelryItems && createdResources.jewelryItems.length > 0) {
                const itemIds = createdResources.jewelryItems.map(item => item.item_id).filter(Boolean);
                if (itemIds.length > 0) {
                  // Delete jewelry items in batch
                  for (const itemId of itemIds) {
                    try {
                      await axios.delete(
                        `${config.apiUrl}/jewelry/${itemId}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                    } catch (deleteError) {
                      console.error(`Error deleting jewelry item ${itemId}:`, deleteError);
                    }
                  }
                  console.log('✓ Cleaned up jewelry items');
                }
              }
            } catch (cleanupError) {
              console.error('Error during cleanup:', cleanupError);
              // Continue to throw the original payment error
            }

            // Re-throw the payment error to be caught by outer catch block
            throw paymentError;
          }

          // Step 3.5: Update jewelry inventory status to SOLD for sale transactions
          for (const item of checkoutItems) {
            const transactionType = item.transaction_type?.toLowerCase() || '';


            // Only update status for sale transactions with inventory items
            if (transactionType === 'sale' && item.item_id && item.fromInventory) {
              try {
                // Calculate total price including protection plan (tax already included in price)
                const basePrice = parseFloat(item.price) || 0;
                const protectionPlanAmount = item.protectionPlan ? basePrice * 0.15 : 0;
                const totalItemPrice = basePrice + protectionPlanAmount;

                const response = await axios.put(
                  `${config.apiUrl}/jewelry/${item.item_id}/status`,
                  {
                    status: 'SOLD',
                    item_price: totalItemPrice
                  },
                  { headers: { Authorization: `Bearer ${token}` } }
                );
              } catch (updateError) {
                console.error(`Error updating item ${item.item_id} status:`, updateError);
                console.error('Error details:', updateError.response?.data);
                // Continue with checkout even if status update fails
              }
            }
          }

          // Step 3.6: Update pawn_ticket status to REDEEMED for redeem transactions
          const redeemedTickets = new Set();
          const redeemedItemLocations = []; // Collect locations for popup

          for (const item of checkoutItems) {
            const transactionType = item.transaction_type?.toLowerCase() || '';

            if (transactionType === 'redeem') {
              const pawnTicketId = item.pawnTicketId || item.buyTicketId;

              if (pawnTicketId && !redeemedTickets.has(pawnTicketId)) {
                redeemedTickets.add(pawnTicketId);

                try {
                  // Update pawn_ticket status to REDEEMED
                  await axios.put(
                    `${config.apiUrl}/pawn-ticket/${pawnTicketId}/status`,
                    { status: 'REDEEMED' },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );

                  // Record pawn history for redemption
                  await axios.post(
                    `${config.apiUrl}/pawn-history`,
                    {
                      pawn_ticket_id: pawnTicketId,
                      action_type: 'REDEEM',
                      transaction_id: realTransactionId,
                      principal_amount: parseFloat(item.principal) || null,
                      interest_paid: parseFloat(item.interest) || null,
                      total_paid: parseFloat(item.totalRedemptionAmount || item.totalAmount) || null,
                      performed_by: employeeId,
                      notes: 'Pawn redeemed'
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );

                } catch (updateError) {
                  console.error(`Error updating pawn ticket ${pawnTicketId} status:`, updateError);
                  console.error('Error details:', updateError.response?.data);
                }
              }

              // Collect item location for popup
              if (item.location) {
                redeemedItemLocations.push({
                  item_id: item.item_id,
                  description: item.description || item.long_desc || item.short_desc || 'Item',
                  location: item.location,
                  pawnTicketId: pawnTicketId
                });
              }
            }
          }

          // Step 3.7: Record pawn history for payment (extension) transactions
          const extendedTickets = new Set();

          for (const item of checkoutItems) {
            const transactionType = item.transaction_type?.toLowerCase() || '';

            if (transactionType === 'payment' && item.pawnTicketId) {
              const pawnTicketId = item.pawnTicketId;

              if (!extendedTickets.has(pawnTicketId)) {
                extendedTickets.add(pawnTicketId);

                try {
                  // Record pawn history for extension
                  await axios.post(
                    `${config.apiUrl}/pawn-history`,
                    {
                      pawn_ticket_id: pawnTicketId,
                      action_type: 'EXTEND',
                      transaction_id: realTransactionId,
                      principal_amount: parseFloat(item.principal) || null,
                      interest_paid: parseFloat(item.interest) || null,
                      fee_paid: parseFloat(item.fee) || null,
                      total_paid: parseFloat(item.amount) || null,
                      new_due_date: item.date || null,
                      extension_days: parseInt(item.days) || null,
                      performed_by: employeeId,
                      notes: `Extended by ${item.term || 1} term(s)`
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                } catch (historyError) {
                  console.error(`Error recording pawn history for ${pawnTicketId}:`, historyError);
                }
              }
            }
          }

          // Step 4: Clear all storage IMMEDIATELY before any UI updates
          // Clear all ticket items from localStorage FIRST
          const ticketTypes = ['pawn', 'buy', 'trade', 'sale', 'repair', 'payment', 'refund', 'redeem'];
          ticketTypes.forEach(type => {
            // Clear both customer-specific and global ticket items
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith(`ticket_`) && key.includes(`_${type}`)) {
                localStorage.removeItem(key);
              }
            });
          });

          // Clear checkout items from sessionStorage
          sessionStorage.removeItem('checkoutItems');
          sessionStorage.removeItem('selectedCustomer');

          // Remove only the checked out items from cart, keeping other items
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

          // Display success message and navigate
          setLoading(false);
          setSnackbar({
            open: true,
            message: 'Transaction completed successfully!',
            severity: 'success'
          });

          setTransactionCreated(false);
          setCurrentTransactionId(null);
          setPayments([]);

          // Check if there are redeemed items with locations to show
          if (redeemedItemLocations.length > 0) {
            setRedeemedLocations(redeemedItemLocations);
            setLocationDialogOpen(true);
            // Don't navigate yet - user will navigate after closing the dialog
          } else {
            // Navigate after a brief delay to show success message
            setTimeout(() => {
              navigate('/');
            }, 1000);
          }

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
                            <strong>N:</strong> {selectedCustomer.name || `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim() || 'N/A'}
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
                      const itemTransactionType = (item.transaction_type || item.transactionType || '').toLowerCase();

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

                      // Special handling for redeem transactions
                      if (itemTransactionType === 'redeem') {
                        // For redeem items, check if this is the first item in the ticket
                        const ticketId = item.pawnTicketId || item.buyTicketId;
                        const isFirstItemInTicket = checkoutItems.findIndex(i =>
                          (i.pawnTicketId || i.buyTicketId) === ticketId &&
                          (i.transaction_type || i.transactionType || '').toLowerCase() === 'redeem'
                        ) === index;

                        if (isFirstItemInTicket) {
                          // Use totalRedemptionAmount for the first item
                          price = parseFloat(item.totalRedemptionAmount || item.principal || 0);
                          // Add interest if available
                          if (item.interest) {
                            price += parseFloat(item.interest || 0);
                          }
                        } else {
                          // For other items in the same redeem ticket, price is 0
                          price = 0;
                        }
                      } else {
                        // For non-redeem items, use standard price logic
                        if (item.price !== undefined) price = parseFloat(item.price) || 0;
                        else if (item.value !== undefined) price = parseFloat(item.value) || 0;
                        else if (item.fee !== undefined) price = parseFloat(item.fee) || 0;
                        else if (item.amount !== undefined) price = parseFloat(item.amount) || 0;
                      }

                      // For sale items, multiply by quantity
                      if (itemTransactionType === 'sale') {
                        const quantity = parseInt(item.quantity) || 1;
                        price = price * quantity;
                      }

                      // Add protection plan (15% of item price) if enabled
                      const protectionPlanAmount = item.protectionPlan ? price * 0.15 : 0;
                      let totalPrice = price + protectionPlanAmount;

                      // For sale items, add tax (unless customer is tax-exempt)
                      if (itemTransactionType === 'sale' && !selectedCustomer?.tax_exempt) {
                        totalPrice = totalPrice * 1.13;
                      }

                      // Apply sign based on transaction type
                      // Money going OUT (buy/pawn) = negative values
                      // Money coming IN (sale/repair/other) = positive values
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
                              {itemTransactionType === 'sale' && item.quantity > 1 && (
                                <span style={{ fontSize: '0.85em', color: '#666', fontStyle: 'italic' }}>
                                  Quantity: {item.quantity}
                                </span>
                              )}
                              {item.protectionPlan && (
                                <span style={{ fontSize: '0.85em', color: '#666', fontStyle: 'italic' }}>
                                  + Protection Plan (15%): ${protectionPlanAmount.toFixed(2)}
                                </span>
                              )}
                              {itemTransactionType === 'sale' && !selectedCustomer?.tax_exempt && (
                                <span style={{ fontSize: '0.85em', color: '#666', fontStyle: 'italic' }}>
                                  + Tax (13%): ${((price + protectionPlanAmount) * 0.13).toFixed(2)}
                                </span>
                              )}
                              {itemTransactionType === 'sale' && selectedCustomer?.tax_exempt && (
                                <span style={{ fontSize: '0.85em', color: '#666', fontStyle: 'italic' }}>
                                  Tax: Exempt
                                </span>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{transactionType}</TableCell>
                          <TableCell align="right" sx={{
                            color: displayPrice < 0 ? 'error.main' : 'success.main',
                            fontWeight: 'bold'
                          }}>
                            {displayPrice === 0 && itemTransactionType === 'redeem' ? '-' : `$${parseFloat(displayPrice).toFixed(2)}`}
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

      {/* Redeemed Items Location Dialog */}
      <Dialog
        open={locationDialogOpen}
        onClose={() => {
          setLocationDialogOpen(false);
          setSelectedItemsForRedeem([]);
          navigate('/');
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold">
            Redeemed Items - Storage Locations
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please check items as you retrieve them from storage:
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="10%" align="center"><strong>Retrieved</strong></TableCell>
                  <TableCell width="25%"><strong>Pawn Ticket ID</strong></TableCell>
                  <TableCell width="35%"><strong>Item Description</strong></TableCell>
                  <TableCell width="30%"><strong>Storage Location</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {redeemedLocations.map((item, index) => (
                  <TableRow key={index} hover>
                    <TableCell align="center">
                      <Checkbox
                        checked={selectedItemsForRedeem.includes(index)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItemsForRedeem([...selectedItemsForRedeem, index]);
                          } else {
                            setSelectedItemsForRedeem(selectedItemsForRedeem.filter(i => i !== index));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>{item.pawnTicketId}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.location}
                        color="primary"
                        sx={{ fontWeight: 'bold' }}
                      />
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
              setLocationDialogOpen(false);
              setSelectedItemsForRedeem([]);
              navigate('/');
            }}
            variant="outlined"
          >
            Close
          </Button>
          <Button
            onClick={async () => {
              try {
                const token = localStorage.getItem('token');

                // Update jewelry status to REDEEMED for checked items
                for (const itemIndex of selectedItemsForRedeem) {
                  const item = redeemedLocations[itemIndex];
                  if (item.item_id) {
                    await axios.put(
                      `${config.apiUrl}/jewelry/${item.item_id}/status`,
                      { status: 'REDEEMED' },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                  }
                }

                // Fetch business info for receipt
                let businessName = '';
                let businessAddress = '';
                let businessPhone = '';
                let businessLogo = '';
                let businessLogoMimetype = '';

                try {
                  const businessResponse = await axios.get(`${config.apiUrl}/business-info`);
                  if (businessResponse.data) {
                    businessName = businessResponse.data.business_name || '';
                    businessAddress = businessResponse.data.address || '';
                    businessPhone = businessResponse.data.phone || '';
                    businessLogo = businessResponse.data.logo || '';
                    businessLogoMimetype = businessResponse.data.logo_mimetype || 'image/png';
                  }
                } catch (err) {
                  console.error('Error fetching business info:', err);
                }

                // Get selected items for receipt
                const selectedItems = selectedItemsForRedeem.map(idx => redeemedLocations[idx]);

                // Calculate totals
                const totalRedemptionAmount = selectedItems.length > 0
                  ? parseFloat(checkoutItems.find(i => (i.transaction_type || '').toLowerCase() === 'redeem')?.totalRedemptionAmount || 0)
                  : 0;

                // Get pawn ticket ID
                const pawnTicketId = selectedItems[0]?.pawnTicketId || 'N/A';

                // Format current date/time
                const now = new Date();
                const formattedDate = now.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                });
                const formattedTime = now.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                // Generate redeem receipt HTML
                const receiptHTML = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>Redeem Receipt - ${pawnTicketId}</title>
                    <style>
                      body {
                        font-family: 'Courier New', monospace;
                        max-width: 300px;
                        margin: 0 auto;
                        padding: 20px;
                        font-size: 12px;
                      }
                      .header {
                        text-align: center;
                        margin-bottom: 15px;
                        border-bottom: 2px dashed #333;
                        padding-bottom: 15px;
                      }
                      .header img {
                        max-width: 100px;
                        max-height: 60px;
                        margin-bottom: 10px;
                      }
                      .header h1 {
                        margin: 0;
                        font-size: 16px;
                        font-weight: bold;
                      }
                      .header p {
                        margin: 3px 0;
                        font-size: 10px;
                      }
                      .receipt-title {
                        text-align: center;
                        font-size: 14px;
                        font-weight: bold;
                        margin: 15px 0;
                        padding: 8px;
                        background-color: #f0f0f0;
                        border: 1px solid #333;
                      }
                      .info-section {
                        margin-bottom: 15px;
                      }
                      .info-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 4px 0;
                        font-size: 11px;
                      }
                      .info-label {
                        font-weight: bold;
                      }
                      .items-section {
                        margin: 15px 0;
                        border-top: 1px dashed #333;
                        border-bottom: 1px dashed #333;
                        padding: 10px 0;
                      }
                      .items-header {
                        font-weight: bold;
                        margin-bottom: 10px;
                        font-size: 12px;
                      }
                      .item-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 5px 0;
                        border-bottom: 1px dotted #ccc;
                        font-size: 10px;
                      }
                      .item-row:last-child {
                        border-bottom: none;
                      }
                      .item-desc {
                        flex: 1;
                      }
                      .item-location {
                        text-align: right;
                        font-weight: bold;
                        color: #333;
                      }
                      .total-section {
                        margin-top: 15px;
                        padding-top: 10px;
                        border-top: 2px dashed #333;
                      }
                      .total-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 5px 0;
                        font-size: 14px;
                        font-weight: bold;
                      }
                      .footer {
                        margin-top: 20px;
                        text-align: center;
                        font-size: 10px;
                        border-top: 1px dashed #333;
                        padding-top: 15px;
                      }
                      .footer p {
                        margin: 5px 0;
                      }
                      .signature-section {
                        margin-top: 30px;
                        padding-top: 10px;
                      }
                      .signature-line {
                        border-top: 1px solid #333;
                        margin-top: 40px;
                        padding-top: 5px;
                        font-size: 10px;
                      }
                      .no-print {
                        margin-top: 30px;
                        text-align: center;
                      }
                      @media print {
                        body { margin: 0; padding: 10px; }
                        .no-print { display: none; }
                      }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      ${businessLogo ? `<img src="data:${businessLogoMimetype};base64,${businessLogo}" alt="Business Logo" />` : ''}
                      <h1>${businessName || 'Business Name'}</h1>
                      ${businessAddress ? `<p>${businessAddress}</p>` : ''}
                      ${businessPhone ? `<p>Tel: ${businessPhone}</p>` : ''}
                    </div>

                    <div class="receipt-title">
                      REDEMPTION RECEIPT
                    </div>

                    <div class="info-section">
                      <div class="info-row">
                        <span class="info-label">Pawn Ticket #:</span>
                        <span>${pawnTicketId}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Date:</span>
                        <span>${formattedDate}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Time:</span>
                        <span>${formattedTime}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Customer:</span>
                        <span>${selectedCustomer?.name || ((selectedCustomer?.first_name || '') + ' ' + (selectedCustomer?.last_name || '')).trim() || 'N/A'}</span>
                      </div>
                      ${selectedCustomer?.phone ? `
                      <div class="info-row">
                        <span class="info-label">Phone:</span>
                        <span>${selectedCustomer.phone}</span>
                      </div>
                      ` : ''}
                      <div class="info-row">
                        <span class="info-label">Employee:</span>
                        <span>${user?.firstName || ''} ${user?.lastName || ''}</span>
                      </div>
                    </div>

                    <div class="items-section">
                      <div class="items-header">REDEEMED ITEMS (${selectedItems.length})</div>
                      ${selectedItems.map((item, idx) => `
                        <div class="item-row">
                          <span class="item-desc">${idx + 1}. ${item.description || 'Item'}</span>
                          <span class="item-location">[${item.location || 'N/A'}]</span>
                        </div>
                      `).join('')}
                    </div>

                    <div class="total-section">
                      <div class="total-row">
                        <span>TOTAL PAID:</span>
                        <span>$${totalRedemptionAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div class="signature-section">
                      <div class="signature-line">
                        Customer Signature
                      </div>
                    </div>

                    <div class="footer">
                      <p>Items have been redeemed and returned to customer.</p>
                      <p>Thank you for your business!</p>
                      <p style="margin-top: 10px; font-size: 9px;">
                        ${formattedDate} ${formattedTime}
                      </p>
                    </div>

                    <div class="no-print">
                      <button onclick="window.print()" style="padding: 10px 30px; font-size: 14px; cursor: pointer;">Print</button>
                      <button onclick="window.close()" style="padding: 10px 30px; font-size: 14px; margin-left: 10px; cursor: pointer;">Close</button>
                    </div>
                  </body>
                  </html>
                `;

                // Open receipt in new window
                const printWindow = window.open('', '_blank');
                printWindow.document.write(receiptHTML);
                printWindow.document.close();

                setSnackbar({
                  open: true,
                  message: `${selectedItemsForRedeem.length} item(s) marked as redeemed`,
                  severity: 'success'
                });

                setLocationDialogOpen(false);
                setSelectedItemsForRedeem([]);
                navigate('/');
              } catch (error) {
                console.error('Error updating items:', error);
                setSnackbar({
                  open: true,
                  message: 'Error updating item status',
                  severity: 'error'
                });
              }
            }}
            variant="contained"
            color="success"
            disabled={selectedItemsForRedeem.length === 0}
          >
            Complete Redemption & Print Receipt
          </Button>
        </DialogActions>
      </Dialog>

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
