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
  const { cartItems, selectedCustomer, clearCart } = useCart();
  const { user } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDetails, setPaymentDetails] = useState({
    cashAmount: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const transactionType = item.transactionType || 'pawn';
      return total + parseFloat(item.itemPriceEstimates[transactionType] || 0);
    }, 0);
  };

  const handlePaymentMethodChange = (event) => {
    setPaymentMethod(event.target.value);
  };

  const handleInputChange = (field) => (event) => {
    setPaymentDetails({
      ...paymentDetails,
      [field]: event.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Create a transaction for each cart item
      const transactionPromises = cartItems.map(item => {
        const transactionType = item.transactionType || 'pawn';

        // Ensure at least one image is marked as primary
        const imageData = item.images ? item.images.map((img, index) => ({
          url: img.url,
          is_primary: img.isPrimary || (!item.images.some(i => i.isPrimary) && index === 0)
        })) : [];

        return axios.post(
          `${config.apiUrl}/transactions`,
          {
            customer_id: selectedCustomer.id,
            transaction_type: item.transactionType,
            estimated_value: parseFloat(item.itemPriceEstimates[transactionType] || 0),
            metal_purity: item.purity,
            weight: parseFloat(item.weight),
            category: item.category,
            metal_type: item.metal,
            primary_gem: item.primaryGem,
            secondary_gem: item.secondaryGem,
            price: parseFloat(item.itemPriceEstimates[transactionType] || 0),
            payment_method: paymentMethod,
            inventory_status: 'HOLD',
            images: imageData
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          }
        );
      });

      const results = await Promise.all(transactionPromises);
      
      setSnackbar({
        open: true,
        message: 'Payment processed successfully',
        severity: 'success'
      });
      clearCart();
      // Navigate back to estimation with auth state preserved
      navigate('/gem-estimator', { 
        state: { 
          from: 'checkout'
        }
      });
    } catch (error) {
      if (error.message === 'Authentication token not found') {
        // Preserve cart state and redirect to login
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
    if (!selectedCustomer) {
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

      const response = await axios.post(
        `${config.apiUrl}/quotes`,
        {
          items: cartItems,
          totalAmount: calculateTotal(),
          customer_id: selectedCustomer.id,
          customerName: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
          customerEmail: selectedCustomer.email,
          customerPhone: selectedCustomer.phone,
          created_at: new Date().toISOString(),
          status: 'active'
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

  useEffect(() => {
    if (!selectedCustomer || cartItems.length === 0) {
      navigate('/gem-estimator');
    }
  }, [selectedCustomer, cartItems, navigate]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Back to Estimation
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
                    <strong>Name:</strong> {selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'Not specified'}
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
                      <TableRow key={index}>
                        <TableCell>
                          {item.weight}g {item.metal} {item.primaryGem.split(' ')[0]} {item.secondaryGem.split(' ')[0]}
                        </TableCell>
                        <TableCell>{item.transactionType}</TableCell>
                        <TableCell align="right">
                          ${item.itemPriceEstimates[item.transactionType]?.toFixed(2)}
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
                    value="card"
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
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Expiry Date"
                        placeholder="MM/YY"
                        value={paymentDetails.expiryDate}
                        onChange={handleInputChange('expiryDate')}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="CVV"
                        type="password"
                        value={paymentDetails.cvv}
                        onChange={handleInputChange('cvv')}
                      />
                    </Grid>
                  </Grid>
                  <TextField
                    fullWidth
                    label="Cardholder Name"
                    value={paymentDetails.cardholderName}
                    onChange={handleInputChange('cardholderName')}
                    sx={{ mt: 2 }}
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
