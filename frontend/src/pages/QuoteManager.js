import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Paper,
  Grid,
  Typography,
  Button,
  Box,
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
  Chip,
  IconButton,
  TextField,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function QuoteManager() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/quotes`);
      setQuotes(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      setLoading(false);
    }
  };

  const handleViewDetails = (quote) => {
    setSelectedQuote(quote);
    setDetailsDialogOpen(true);
  };

  const handleCheckout = (quote) => {
    // Navigate to checkout with the quote items
    navigate('/checkout', {
      state: {
        items: quote.items,
        quoteId: quote.id
      }
    });
  };

  const handleUpdateStatus = async (quoteId, newStatus) => {
    try {
      await axios.put(`${API_BASE_URL}/quotes/${quoteId}`, {
        status: newStatus
      });
      fetchQuotes(); // Refresh quotes list
    } catch (error) {
      console.error('Error updating quote status:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'completed':
        return 'success';
      case 'expired':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredQuotes = quotes.filter(quote => {
    const searchLower = searchTerm.toLowerCase();
    return (
      quote.customer_name?.toLowerCase().includes(searchLower) ||
      quote.customer_email?.toLowerCase().includes(searchLower) ||
      quote.customer_phone?.includes(searchTerm) ||
      quote.id.toString().includes(searchTerm)
    );
  });

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>
          Quote Manager
        </Typography>

        {/* Search Bar */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs>
              <TextField
                fullWidth
                placeholder="Search by customer name, email, phone, or quote ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Quotes Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Quote ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredQuotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell>{quote.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{quote.customer_name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {quote.customer_email}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(quote.created_at)}</TableCell>
                  <TableCell>${quote.total_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      label={quote.status}
                      color={getStatusColor(quote.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetails(quote)}
                      title="View Details"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    {quote.status === 'pending' && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleCheckout(quote)}
                          title="Proceed to Checkout"
                          color="primary"
                        >
                          <ShoppingCartIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleUpdateStatus(quote.id, 'cancelled')}
                          title="Cancel Quote"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Quote Details Dialog */}
        <Dialog
          open={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Quote Details #{selectedQuote?.id}
          </DialogTitle>
          <DialogContent>
            {selectedQuote && (
              <>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Customer Information</Typography>
                    <Typography variant="body2">Name: {selectedQuote.customer_name}</Typography>
                    <Typography variant="body2">Email: {selectedQuote.customer_email}</Typography>
                    <Typography variant="body2">Phone: {selectedQuote.customer_phone}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Quote Information</Typography>
                    <Typography variant="body2">Created: {formatDate(selectedQuote.created_at)}</Typography>
                    <Typography variant="body2">Status: {selectedQuote.status}</Typography>
                    <Typography variant="body2">Total: ${selectedQuote.total_amount.toFixed(2)}</Typography>
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>Items</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Transaction Type</TableCell>
                        <TableCell align="right">Price</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedQuote.items.map((item, index) => (
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
              </>
            )}
          </DialogContent>
          <DialogActions>
            {selectedQuote?.status === 'pending' && (
              <Button
                onClick={() => handleCheckout(selectedQuote)}
                color="primary"
                startIcon={<ShoppingCartIcon />}
              >
                Proceed to Checkout
              </Button>
            )}
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}

export default QuoteManager;
