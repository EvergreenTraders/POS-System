import React, { useState, useEffect } from 'react';
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
  const { cartItems, addToCart, selectedCustomer, setCustomer, clearCart } = useCart();
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
    cashAmount: '',
    cardNumber: ''
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
  const [protectionPlanEnabled, setProtectionPlanEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState(0.13); // Default 13% tax rate
  const [selectedProvince, setSelectedProvince] = useState('ON');
  const [provinceName, setProvinceName] = useState('Ontario');
  const PROTECTION_PLAN_RATE = 0.15; // 15% protection plan

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
        cashAmount: '',
        cardNumber: ''
      });

      // Handle from generic estimator or specific estimators like coinsbullions
      if (fromSource === 'jewelry' || fromSource === 'coinsbullions') {
        // Clear existing cart items before adding new ones from estimator
        clearCart();

        // Ensure each item is added individually to the cart
        if (Array.isArray(itemsToCheckout)) {
          itemsToCheckout.forEach(item => addToCart(item));
        }
        // Set checkoutItems for display
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

        if (filteredJewelryItems.length > 0) {
          console.log('Jewelry items from gem estimator found in checkout:', filteredJewelryItems);
        }

        // Clear cart and add items with normalized price field
        clearCart();
        items.forEach(item => {
          // Normalize the price field for consistent calculations
          const normalizedItem = { ...item };
          if (normalizedItem.price === undefined) {
            if (normalizedItem.value !== undefined) normalizedItem.price = normalizedItem.value;
            else if (normalizedItem.fee !== undefined) normalizedItem.price = normalizedItem.fee;
            else if (normalizedItem.amount !== undefined) normalizedItem.price = normalizedItem.amount;
            else normalizedItem.price = 0;
          }
          addToCart(normalizedItem);
        });

        // Set the checkout items, ensuring jewelry items retain all fields
        setCheckoutItems(items);
        setAllCartItems(allCartItemsData || items);

        // Set the customer if provided
        if (customerData) {
          setCustomer(customerData);
        }

        setIsInitialized(true);
      }
    }
  }, [location.state, addToCart, setCustomer, clearCart, isInitialized]);

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

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      let itemValue = 0;
      if (item.price !== undefined) itemValue = parseFloat(item.price);
      else if (item.value !== undefined) itemValue = parseFloat(item.value);
      else if (item.fee !== undefined) itemValue = parseFloat(item.fee);
      else if (item.amount !== undefined) itemValue = parseFloat(item.amount);
      return total + itemValue;
    }, 0);
  };

  const calculateProtectionPlan = () => {
    if (!protectionPlanEnabled) return 0;
    return calculateSubtotal() * PROTECTION_PLAN_RATE;
  };

  const calculateTax = () => {
    const subtotalWithProtection = calculateSubtotal() + calculateProtectionPlan();
    return subtotalWithProtection * taxRate;
  };

  const calculateTotal = () => {
    const total = calculateSubtotal() + calculateProtectionPlan() + calculateTax();
    // Round to 2 decimal places to avoid floating-point precision issues
    return parseFloat(total.toFixed(2));
  };

  const handlePaymentMethodChange = (event) => {
    setPaymentMethod(event.target.value);
    // Reset cash amount when switching payment methods
    setPaymentDetails({
      ...paymentDetails,
      cashAmount: ''
    });
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
  // Also recalculate when protection plan or tax changes
  useEffect(() => {
    if (checkoutItems.length > 0 && !transactionCreated) {
      setRemainingAmount(calculateTotal());
    }
  }, [checkoutItems, transactionCreated, protectionPlanEnabled, taxRate]);

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
      if (paymentAmount <= 0 || paymentAmount > remainingAmount) {
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
      const newPayment = { 
        transaction_id: transactionId,
        method: paymentMethod, 
        amount: paymentAmount,
        payment_method: paymentMethod.toUpperCase(),
        timestamp: new Date().toISOString()
      };
      const updatedPayments = [...payments, newPayment];
      setPayments(updatedPayments);
      
      // Fix floating point precision issues by rounding to 2 decimal places
      const newRemainingAmount = parseFloat((remainingAmount - paymentAmount).toFixed(2));
      setRemainingAmount(newRemainingAmount);
      
      // Check if payment is complete
      const isPaid = newRemainingAmount == 0;
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
          const hasJewelryItems = cartItems.some(item =>
            item.sourceEstimator === 'jewelry' ||
            item.metal_weight ||
            item.metal_purity ||
            item.precious_metal_type ||
            item.originalData
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
              const originalItem = cartItems.find(cartItem => 
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

            // Check if any items have actual file objects (not just blob URLs)
            const hasImageFiles = cartItems.some(item =>
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
              cartItems.forEach((item, itemIndex) => {
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
              const processedItems = cartItems.map(item => {
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
              const processedItems = cartItems.map(item => {
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
            transaction_status: 'PENDING',
            transaction_date: new Date().toISOString().split('T')[0]
          };

          // Only add cartItems if we have jewelry items (which need item_id linking)
          if (createdJewelryItems && createdJewelryItems.length > 0) {
            transactionPayload.cartItems = createdJewelryItems.map((item, index) => {
              const type = cartItems[index].transaction_type.toLowerCase();
              return {
                item_id: item.item_id,
                transaction_type_id: transactionTypes[type],
                price: cartItems[index].price
              };
            });
          } else {
            // For non-jewelry items from CustomerTicket, just send transaction type and price
            transactionPayload.cartItems = cartItems.map(item => {
              const type = item.transaction_type.toLowerCase();
              return {
                transaction_type_id: transactionTypes[type],
                price: item.price,
                description: item.description || 'Item'
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

          // Step 4: Update transaction status to COMPLETED after all payments succeed
          await axios.put(
            `${config.apiUrl}/transactions/${realTransactionId}`,
            { transaction_status: 'COMPLETED' },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // Step 5: Display success message and navigate to home
          setLoading(false);
          setSnackbar({
            open: true,
            message: 'Transaction completed successfully!',
            severity: 'success'
          });

          // Navigate to jewel estimator, then clear cart
          // This prevents the useEffect redirect from interfering
          setTimeout(() => {
            clearCart();
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
        setSnackbar({
          open: true,
          message: `Payment of $${paymentAmount} accepted. Remaining: $${newRemainingAmount}`,
          severity: 'info'
        });
      }

      // Reset payment form but keep card number if using card
      setPaymentDetails({
        ...paymentDetails,
        cashAmount: '',
        cardNumber: paymentMethod === 'credit_card' ? paymentDetails.cardNumber : ''
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

  // Set customer info and cart items from quote or cart
  useEffect(() => {    
    if (!isInitialized) {
      // Handle items from cart
      if (location.state?.items && location.state?.from === 'cart') {        
        setCheckoutItems(location.state.items);
        
        // Add each item individually to the cart
        if (Array.isArray(location.state.items)) {
          location.state.items.forEach(item => addToCart(item));
        }
        
        // Get customer from state if available
        if (location.state.customer) {
          setCustomer(location.state.customer);
        }
        
        setIsInitialized(true);
      }
      // Handle items from estimator
      else if (location.state?.items && location.state?.from === 'jewelry') {
        setCheckoutItems(location.state.items);
        
        // Add each item individually to the cart if not already added
        if (Array.isArray(location.state.items) && cartItems.length === 0) {
          location.state.items.forEach(item => addToCart(item));
        }
        
        // Get customer from state if available
        if (location.state.customer) {
          setCustomer(location.state.customer);
        }
        setIsInitialized(true);
      }
      // Handle items from quote
      else if (location.state?.items && location.state?.customerName) {        
        // Set the customer info
        const customer = {
          name: location.state.customerName,
          email: location.state.customerEmail || '',
          phone: location.state.customerPhone || '',
          id: null // For quotes, we don't have a customer ID
        };
        setCustomer(customer);

        // Set the cart items
        addToCart(location.state.items);
        setIsInitialized(true);
      }
    }
  }, [location.state, setCustomer, addToCart, isInitialized]);

  // Only redirect if we have no data after initialization
  useEffect(() => {
    if (isInitialized && (!selectedCustomer?.name || cartItems.length === 0)) {
      navigate('/quote-manager');
    }
  }, [selectedCustomer, cartItems, navigate, isInitialized]);
  
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
                      if (item.price !== undefined) price = item.price;
                      else if (item.value !== undefined) price = item.value;
                      else if (item.fee !== undefined) price = item.fee;
                      else if (item.amount !== undefined) price = item.amount;
                      
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
                              {item.description && (
                                <span style={{ fontSize: '0.8em', color: '#666' }}>{item.description}</span>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{transactionType}</TableCell>
                          <TableCell align="right">
                            ${parseFloat(price).toFixed(2)}
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

                {/* Protection Plan Toggle */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={protectionPlanEnabled}
                          onChange={(e) => setProtectionPlanEnabled(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={`Protection Plan (${(PROTECTION_PLAN_RATE * 100).toFixed(0)}%)`}
                    />
                  </Box>
                  <Typography variant="body1" color={protectionPlanEnabled ? 'text.primary' : 'text.secondary'}>
                    ${calculateProtectionPlan().toFixed(2)}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Tax ({(taxRate * 100).toFixed(0)}%):</Typography>
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
              <Typography variant="h6" color="primary" gutterBottom>
                Remaining: ${remainingAmount.toFixed(2)}
              </Typography>
              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <RadioGroup
                  value={paymentMethod}
                  onChange={handlePaymentMethodChange}
                >
                  <FormControlLabel
                    value="cash"
                    control={<Radio />}
                    label="Cash"
                  />
                  <FormControlLabel
                    value="credit_card"
                    control={<Radio />}
                    label="Credit/Debit Card"
                  />
                </RadioGroup>
              </FormControl>

              {paymentMethod === 'cash' ? (
                <TextField
                  fullWidth
                  label="Cash Amount"
                  type="number"
                  value={paymentDetails.cashAmount}
                  onChange={handleInputChange('cashAmount')}
                  sx={{ mb: 2 }}
                />
              ) : (
                <>
                  <TextField
                    fullWidth
                    label="Card Number"
                    value={paymentDetails.cardNumber}
                    onChange={handleInputChange('cardNumber')}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Amount"
                    type="number"
                    value={paymentDetails.cashAmount}
                    onChange={handleInputChange('cashAmount')}
                    sx={{ mb: 2 }}
                  />
                </>
              )}
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
                  Process Payment
                </Button>
              </Box>
              
              {/* Payment History */}
              {payments.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {payments.map((payment, index) => (
                      <Chip
                        key={index}
                        icon={payment.method === 'cash' ? <AttachMoneyIcon /> : <CreditCardIcon />}
                        label={`${payment.method === 'cash' ? 'Cash' : 'Credit Card'} $${parseFloat(payment.amount).toFixed(2)}`}
                        color={payment.method === 'cash' ? 'success' : 'primary'}
                        variant="outlined"
                        sx={{ paddingY: 2.5, paddingX: 0.5, fontSize: '0.9rem' }}
                      />
                    ))}
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
