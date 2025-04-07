import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
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
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PaymentIcon from '@mui/icons-material/Payment';
import SaveIcon from '@mui/icons-material/Save';

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
  const [isInitialized, setIsInitialized] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDetails, setPaymentDetails] = useState({
    cashAmount: '',
    cardNumber: ''
  });

  const [loading, setLoading] = useState(false);
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

      let transactionId;

      // Only create jewelry items and transaction once
      if (!transactionCreated) {
        // First create the jewelry items
        const jewelryResponse = await axios.post(
          `${config.apiUrl}/jewelry`,
          { cartItems },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const createdJewelryItems = jewelryResponse.data;

        // Create transactions for all items
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

        transactionId = transactionResponse.data.transaction.transaction_id;
        setCurrentTransactionId(transactionId);
        setTransactionCreated(true);
      } else {
        transactionId = currentTransactionId;
      }

      if (!transactionId) {
        throw new Error('Transaction ID not found');
      }

      // Process payment
      await axios.post(
        `${config.apiUrl}/payments`,
        {
          transaction_id: transactionId,
          amount: paymentAmount,
          payment_method: paymentMethod.toUpperCase()
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Add payment to list and update remaining amount
      const newPayment = { 
        method: paymentMethod, 
        amount: paymentAmount,
        timestamp: new Date().toISOString()
      };
      setPayments([...payments, newPayment]);
      
      const newRemainingAmount = remainingAmount - paymentAmount;
      setRemainingAmount(newRemainingAmount);

      // Reset payment form but keep card number if using card
      setPaymentDetails({
        ...paymentDetails,
        cashAmount: '',
        cardNumber: paymentMethod === 'credit_card' ? paymentDetails.cardNumber : ''
      });

      if (newRemainingAmount === 0) {
        // Update transaction status to COMPLETED when fully paid
        await axios.put(
          `${config.apiUrl}/transactions/${transactionId}`,
          { transaction_status: 'COMPLETED' },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setSnackbar({
          open: true,
          message: 'All payments processed successfully',
          severity: 'success'
        });

        // Reset state
        setTransactionCreated(false);
        setCurrentTransactionId(null);
        setPayments([]);
        clearCart();
        
        navigate('/gem-estimator', { 
          state: { 
            from: 'checkout'
          }
        });
      } else {
        setSnackbar({
          open: true,
          message: `Payment of ${paymentAmount} processed. Remaining amount: ${newRemainingAmount}`,
          severity: 'success'
        });
      }
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
            cartItems,
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
    } else {
      // Save the cart items to session storage before navigating back
      sessionStorage.setItem('estimationState', JSON.stringify({
        items: cartItems.map(item => ({
          ...item,
          price_estimates: {
            pawn: parseFloat(item.price || 0),
            buy: parseFloat(item.price || 0),
            retail: parseFloat(item.price || 0),
            [item.transaction_type]: parseFloat(item.price || 0)
          }
        }))
      }));
      clearCart();
      setCustomer(null);
      // Go back to gem estimator
      navigate('/gem-estimator');
    }
  };

  // Set customer info and cart items from quote if available
  useEffect(() => {
    if (!isInitialized && location.state?.items && location.state?.customerName) {
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
  }, [location.state, setCustomer, addToCart, isInitialized]);

  // Only redirect if we have no data after initialization
  useEffect(() => {
    if (isInitialized && (!selectedCustomer?.name || cartItems.length === 0)) {
      navigate('/quote-manager');
    }
  }, [selectedCustomer, cartItems, navigate, isInitialized]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Button
          variant="outlined"
          onClick={handleBackToEstimation}
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          {location.state?.quoteId ? 'Back to Quotes' : 'Back to Estimation'}
        </Button>
        <Grid container spacing={3}>
          {/* Customer Details */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Customer Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle1">
                    <strong>Name:</strong> {selectedCustomer?.name || 'Not specified'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle1">
                    <strong>Email:</strong> {selectedCustomer?.email || 'Not specified'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle1">
                    <strong>Phone:</strong> {selectedCustomer?.phone || 'Not specified'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          {/* Order Summary */}
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Transaction Type</TableCell>
                      <TableCell align="right">Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cartItems.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>
                          {item.short_desc} 
                        </TableCell>
                        <TableCell>{item.transaction_type}</TableCell>
                        <TableCell align="right">
                          ${parseFloat(item.price).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Typography variant="h6">
                  Total: ${calculateTotal().toFixed(2)}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Payment Details */}
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" color="primary" gutterBottom>
                  Remaining: ${remainingAmount.toFixed(2)}
                </Typography>

              <Typography variant="h6" gutterBottom>
                Payment Details
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
