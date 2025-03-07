import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  const items = location.state?.items || [];

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDetails, setPaymentDetails] = useState({
    cashAmount: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });

  // Quote related states
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteDetails, setQuoteDetails] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: ''
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const calculateTotal = () => {
    return items.reduce((total, item) => {
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

  const handleQuoteInputChange = (field) => (event) => {
    const value = event.target.value;
    
    // Basic validation
    if (field === 'customerPhone') {
      // Allow only numbers and basic phone formatting characters
      if (!/^[0-9+\-() ]*$/.test(value)) {
        return;
      }
    } else if (field === 'customerEmail') {
      // Basic email format validation
      if (value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
        setSnackbar({
          open: true,
          message: 'Please enter a valid email address',
          severity: 'warning'
        });
      }
    }

    setQuoteDetails({
      ...quoteDetails,
      [field]: value,
    });
  };

  const handleSubmit = () => {
    // Here you would typically process the payment
    console.log('Processing payment:', {
      method: paymentMethod,
      details: paymentDetails,
      total: calculateTotal(),
      items,
    });
    // Navigate to success page or show confirmation
  };

  // Handle saving quote
  const handleSaveQuote = async () => {
    // Validate required fields
    if (!quoteDetails.customerName || !quoteDetails.customerEmail || !quoteDetails.customerPhone) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      const formattedItems = items.map(item => ({
        transactionType: item.transactionType || 'pawn',
        estimatedValue: item.estimatedValue,
        metalPurity: item.purity,
        weight: item.weight,
        itemPriceEstimates: item.itemPriceEstimates,
        category: item.category,
        metalType: item.metal,
        primaryGem: item.primaryGem,
        secondaryGem: item.secondaryGem,
      }));

      const quoteData = {
        customerName: quoteDetails.customerName,
        customerEmail: quoteDetails.customerEmail,
        customerPhone: quoteDetails.customerPhone,
        items: formattedItems,
        totalAmount: calculateTotal()
      };
      
      console.log('Sending quote data:', quoteData);
      
      const response = await axios.post(`${config.apiUrl}/quotes`, quoteData);
      const quote = response.data;
      console.log('Quote save response:', quote);

      setSnackbar({
        open: true,
        message: `Quote saved successfully! `,
        severity: 'success'
      });
      setQuoteDialogOpen(false);
      
      // Clear quote details
      setQuoteDetails({
        customerName: '',
        customerEmail: '',
        customerPhone: ''
      });
      
      // Navigate back to the previous page after a short delay
      setTimeout(() => {
        navigate(-1);
      }, 2000);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to save quote',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

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
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {item.weight}g {item.metal} {item.type === 'diamond' ? '(Diamond)' : item.type === 'stone' ? '(Stone)' : ''}
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
                  onClick={() => setQuoteDialogOpen(true)}
                >
                  Save as Quote
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

      {/* Quote Dialog */}
      <Dialog open={quoteDialogOpen} onClose={() => setQuoteDialogOpen(false)}>
        <DialogTitle>Save as Quote</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              required
              label="Customer Name"
              value={quoteDetails.customerName}
              onChange={handleQuoteInputChange('customerName')}
              margin="normal"
            />
            <TextField
              fullWidth
              required
              label="Customer Email"
              type="email"
              value={quoteDetails.customerEmail}
              onChange={handleQuoteInputChange('customerEmail')}
              margin="normal"
            />
            <TextField
              fullWidth
              required
              label="Customer Phone"
              value={quoteDetails.customerPhone}
              onChange={handleQuoteInputChange('customerPhone')}
              margin="normal"
            />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              Quote expiration period is set in the Quote Manager settings
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuoteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveQuote}
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Quote'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default Checkout;
