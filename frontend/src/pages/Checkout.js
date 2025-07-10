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

  // Effect to initialize cart and customer from navigation (Estimator, CoinsBullions, or Cart)
  useEffect(() => {
    if (!isInitialized && location.state) {
      // Handle from generic estimator or specific estimators like coinsbullions
      if ((location.state.from === 'jewelry' || location.state.from === 'coinsbullions') && location.state?.items) {
        // Clear existing cart items before adding new ones from estimator
        clearCart(); 
        
        // Ensure each item is added individually to the cart
        if (Array.isArray(location.state.items)) {
          location.state.items.forEach(item => addToCart(item));
        }
        
        // Set checkoutItems for display
        setCheckoutItems(location.state.items);
        
        // Set the customer if it exists
        if (location.state.customer) {
          setCustomer(location.state.customer);
        }
        setIsInitialized(true); // Mark as initialized to prevent re-running
      } 
      else if (location.state.from === 'cart' && location.state?.items) {        
        // Store the items to checkout and all cart items separately
        const items = location.state.items;
        
        // Extract jewelry-specific items and store them in state for later use in handleSubmit
        const filteredJewelryItems = items.filter(item => item.sourceEstimator === 'jewelry');
        setJewelryItems(filteredJewelryItems);
        
        if (filteredJewelryItems.length > 0) {
          console.log('Jewelry items from gem estimator found in checkout:', filteredJewelryItems);
        }
        
        // Set the checkout items, ensuring jewelry items retain all fields
        setCheckoutItems(items);
        setAllCartItems(location.state.allCartItems);
        
        // Set the customer if provided
        if (location.state.customer) {
          setCustomer(location.state.customer);
        }
        
        setIsInitialized(true); // Mark as initialized to prevent re-running
      }
    }
  }, [location.state, addToCart, setCustomer, clearCart, isInitialized]);

  // Initialize or update remaining amount when cart changes
  useEffect(() => {
    const total = calculateTotal();
    if (!transactionCreated) {
      setRemainingAmount(total);
    }
  }, [cartItems, transactionCreated]);

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

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + parseFloat(item.price);
    }, 0);
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
    // Validate amount to not exceed remaining amount
    if (field === 'cashAmount') {
      const amount = parseFloat(value) || 0;
      if (amount > remainingAmount) {
        setSnackbar({
          open: true,
          message: `Amount cannot exceed remaining balance of $${remainingAmount.toFixed(2)}`,
          severity: 'warning'
        });
        return;
      }
    }
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

  // Initialize remaining amount when component mounts or cart changes
  useEffect(() => {
    if (!transactionCreated) {
      setRemainingAmount(calculateTotal());
    }
  }, [transactionCreated, calculateTotal]);

  const handleSubmit = async () => {
    if (!selectedCustomer?.id) {
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
        // Only create jewelry items and transactions when payment is fully completed
        try {
          let createdJewelryItems;
          let realTransactionId;

          // Step 1: Create jewelry items
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
                    // Handle the new array format of secondary gems
                    console.log(`Processing ${originalItem.secondary_gems.length} secondary gems for converted item ${item.item_id}`);
                    
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
                      console.log(`Successfully added ${originalItem.secondary_gems.length} individual secondary gems for converted item ${item.item_id}`);
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
                  console.log(`Successfully added secondary gems for converted item ${item.item_id}`);
                }
               } catch (error) {
                  console.error(`Error adding secondary gems for converted item ${item.item_id}:`, error);
                  // Continue with transaction even if secondary gems fail
                }
    
            }
          } else {
            // If coming from estimator, create new jewelry items
            
            // Process the cart items to ensure images are in the correct format
            const processedItems = cartItems.map(item => {
              // Create a deep copy of the item without the images property
              const { images, ...itemWithoutImages } = item;
              
              // Process images to ensure they're in a format the backend can handle
              let processedImages = [];
              if (images && Array.isArray(images)) {
                // Extract only the URL from each image object
                processedImages = images.map(img => {
                  if (typeof img === 'object') {
                    return { url: img.url || '' };
                  }
                  return img;
                });
              }
              
              // Return the processed item with appropriate fields
              return {
                ...itemWithoutImages,
                images: processedImages
              };
            });
            
            // Check if we have any jewelry items from the gem estimator
            const itemsToPost = jewelryItems.length > 0 ? jewelryItems : processedItems;
  
            const jewelryResponse = await axios.post(
              `${config.apiUrl}/jewelry`,
              { cartItems: itemsToPost },
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
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
                    console.log(`Successfully added secondary gem for item ${item.item_id} using legacy format`);
                  }
                } catch (error) {
                  console.error(`Error adding secondary gems for item ${item.item_id}:`, error);
                  // Continue with transaction even if secondary gems fail
                }
              }
            }
          }
          
          // Step 2: Create transaction
          const transactionResponse = await axios.post(
            `${config.apiUrl}/transactions`,
            {
              customer_id: selectedCustomer.id,
              employee_id: employeeId,
            total_amount: calculateTotal(),
              cartItems: createdJewelryItems.map((item, index) => {
                const type = cartItems[index].transaction_type.toLowerCase();
                return {
                  item_id: item.item_id,
                  transaction_type_id: transactionTypes[type],
                  price: cartItems[index].price
                };
              }),
              transaction_status: 'PENDING',
              transaction_date: new Date().toISOString().split('T')[0]
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
  
          realTransactionId = transactionResponse.data.transaction.transaction_id;
          
          // Step 3: Process all collected payments against the real transaction ID
          for (const payment of updatedPayments) {
            await axios.post(
              `${config.apiUrl}/payments`,
              {
                transaction_id: realTransactionId, // Use real transaction ID instead of temporary one
                amount: payment.amount,
                payment_method: payment.payment_method
              },
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
          }

          // Step 4: Update transaction status to completed
          await axios.put(
            `${config.apiUrl}/transactions/${realTransactionId}`,
            { transaction_status: 'COMPLETED' },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // Step 5: Display success message and clear cart
          setSnackbar({
            open: true,
            message: 'Transaction completed successfully!',
            severity: 'success'
          });
          
          // Clear cart and reset state
          clearCart();
          setTransactionCreated(false);
          setCurrentTransactionId(null);
          setPayments([]);
          
          // Navigate to login page after successful payment
          console.log('Navigating to login page');
          setTimeout(() => navigate('/login'), 300);

        } catch (paymentError) {
          console.error('Error processing payments:', paymentError);
          setSnackbar({
            open: true,
            message: 'Error processing payments. Please try again.',
            severity: 'error'
          });
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

        await axios.post(
          `${config.apiUrl}/jewelry`,
          { 
            cartItems: cartItems.map(item => ({
              ...item,
              transaction_type_id: transactionTypes[item.transaction_type],
            })),
            quote_id: response.data.quote_id // Pass the quote_id
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        clearCart();
        setTimeout(() => {
          navigate('/gem-estimator');
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
      console.log("Items to keep:", itemsToKeep);
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
      navigate('/gem-estimator');
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
      else if (location.state?.items && location.state?.from === 'estimator') {
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
                      ) : (searchForm.first_name || searchForm.last_name || searchForm.id_number || searchForm.phone) ? (
                        <ListItem>
                          <ListItemText 
                            primary="No customers found" 
                            primaryTypographyProps={{ variant: 'body2', color: 'text.secondary', align: 'center' }}
                          />
                        </ListItem>
                      ) : null}
                    </List>
                  </Box>
                </Box>
              ) : (
                <Box>
                  {selectedCustomer ? (
                    <Grid container spacing={2}>
                      {/* Display customer details based on preferences */}
                      <Grid item xs={12}>
                        <Typography variant="subtitle1">
                          <strong>N:</strong> {`${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`}
                          {selectedCustomer.email && (
                            <span> <strong>E:</strong> {selectedCustomer.email}</span>
                          )}
                          {selectedCustomer.phone && (
                            <span> <strong>P:</strong> {selectedCustomer.phone}</span>
                          )}
                        </Typography>
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
                      <TableCell width="55%">Item Description</TableCell>
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
                            {displayDescription}
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
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Typography variant="h6">
                  Total: ${checkoutItems.reduce((total, item) => {
                    // Get the appropriate price value based on item structure
                    let itemValue = 0;
                    if (item.price !== undefined) itemValue = parseFloat(item.price);
                    else if (item.value !== undefined) itemValue = parseFloat(item.value);
                    else if (item.fee !== undefined) itemValue = parseFloat(item.fee);
                    else if (item.amount !== undefined) itemValue = parseFloat(item.amount);
                    return total + itemValue;
                  }, 0).toFixed(2)}
                </Typography>
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
