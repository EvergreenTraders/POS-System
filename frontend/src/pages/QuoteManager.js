import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Box,
  TextField,
  Tooltip,
  Snackbar
} from '@mui/material';
import config from '../config';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';

const API_BASE_URL = config.apiUrl;

function QuoteManager() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [expirationDays, setExpirationDays] = useState(30);
  const [editingExpiration, setEditingExpiration] = useState(false);
  const [tempExpirationDays, setTempExpirationDays] = useState(30);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    fetchQuotes();
    fetchExpirationDays();
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

  const fetchExpirationDays = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/quote-expiration/config`);
      setExpirationDays(response.data.days);
      setTempExpirationDays(response.data.days);
    } catch (error) {
      console.error('Error fetching expiration days:', error);
    }
  };

  const handleUpdateExpirationDays = async () => {
    try {
      // Update the configuration in quote_expiration table
      await axios.put(`${API_BASE_URL}/quote-expiration/config`, {
        days: tempExpirationDays
      });    
      setExpirationDays(tempExpirationDays);
      setEditingExpiration(false);
      
      // Refresh quotes to show current expiration status
      // Note: New quotes will use the updated expiration period
      fetchQuotes();
    } catch (error) {
      console.error('Error updating expiration days:', error);
    }
  };

  const getExpirationDate = (createdAt) => {
    const date = new Date(createdAt);
    date.setDate(date.getDate() + expirationDays);
    return date;
  };

  const getRemainingDays = (createdAt) => {
    const expirationDate = getExpirationDate(createdAt);
    const now = new Date();
    const diffTime = expirationDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status, createdAt) => {
    if (status === 'completed') return 'success';
    if (status === 'cancelled') return 'error';
    if (status === 'expired') return 'error';
    
    const remainingDays = getRemainingDays(createdAt);
    if (remainingDays <= 3) return 'warning';
    return 'primary';
  };

  const handleViewDetails = (quote) => {
    setSelectedQuote(quote);
    setDetailsDialogOpen(true);
  };

  const handleCheckout = (quote) => {
    // Only allow checkout for pending quotes
    if (quote.status !== 'pending') {
      setSnackbar({
        open: true,
        message: `Cannot proceed to checkout: Quote is ${quote.status}`,
        severity: 'error'
      });
      return;
    }

    // Check if quote has expired based on days_remaining from the trigger system
    if (!quote.days_remaining || quote.days_remaining <= 0) {
      setSnackbar({
        open: true,
        message: `Quote has expired (${quote.expires_in} day limit reached)`,
        severity: 'error'
      });
      return;
    }

    // Ensure we have items in the quote
    if (!quote.items || quote.items.length === 0) {
      setSnackbar({
        open: true,
        message: 'Cannot proceed to checkout: Quote has no items',
        severity: 'error'
      });
      return;
    }

    // Navigate to checkout with quote and customer info
    navigate('/checkout', {
      replace: true, // Use replace to prevent back navigation issues
      state: {
        items: quote.items.map(item => ({
          ...item,
          quoteExpiresIn: quote.expires_in,
          quoteDaysRemaining: quote.days_remaining
        })),
        quoteId: quote.id,
        customerName: quote.customer_name,
        customerEmail: quote.customer_email,
        customerPhone: quote.customer_phone
      }
    });
  };

  const handleQuoteAction = (quote, action) => {
    if (action === 'checkout') {
      handleCheckout(quote);
    } else if (action === 'view') {
      handleViewDetails(quote);
    }
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

  const handleDeleteClick = (quote) => {
    setQuoteToDelete(quote);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/quotes/${quoteToDelete.id}`);
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
      fetchQuotes(); // Refresh quotes list
    } catch (error) {
      console.error('Error deleting quote:', error);
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

  const handleItemPriceChange = (index, newPrice) => {
    const updatedQuote = { ...selectedQuote };
    
    // Create a new itemPriceEstimates object to ensure state update
    updatedQuote.items[index] = {
      ...updatedQuote.items[index],
      itemPriceEstimates: {
        ...updatedQuote.items[index].itemPriceEstimates,
        [updatedQuote.items[index].transactionType]: parseFloat(newPrice)
      }
    };
    
    setSelectedQuote(updatedQuote);
  };

  const handleSaveItemChanges = async () => {
    try {
      const response = await axios.put(`${API_BASE_URL}/quotes/${selectedQuote.id}`, {
        items: selectedQuote.items
      });
      
      setEditingItemIndex(-1);
      setSelectedQuote(response.data);
      fetchQuotes();
    } catch (error) {
      console.error('Error updating quote items:', error.response?.data || error);
    }
  };

  const handleDeleteItem = async (index) => {
    const updatedQuote = { ...selectedQuote };
    updatedQuote.items = updatedQuote.items.filter((_, i) => i !== index);
    
    try {
      await axios.put(`${API_BASE_URL}/quotes/${selectedQuote.id}`, {
        items: updatedQuote.items
      });
      setSelectedQuote(updatedQuote);
      fetchQuotes(); // Refresh quotes list
    } catch (error) {
      console.error('Error deleting quote item:', error);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Quote Manager
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {editingExpiration ? (
            <>
              <TextField
                type="number"
                size="small"
                value={tempExpirationDays}
                onChange={(e) => setTempExpirationDays(parseInt(e.target.value) || 0)}
                sx={{ width: 100 }}
              />
              <Button variant="contained" onClick={handleUpdateExpirationDays}>
                Save
              </Button>
              <Button onClick={() => setEditingExpiration(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Tooltip title="Click to edit expiration days">
              <Button 
                variant="outlined" 
                onClick={() => setEditingExpiration(true)}
              >
                Quotes expire in {expirationDays} days
              </Button>
            </Tooltip>
          )}
        </Box>
      </Box>

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
              <TableCell>Expires In</TableCell>
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
                <TableCell>${quote.total_amount}</TableCell>
                <TableCell>
                  <Chip
                    label={quote.status}
                    color={getStatusColor(quote.status, quote.created_at)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {quote.status === 'pending' ? (
                    `${quote.days_remaining} days`
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(quote,"view")}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    {quote.status === 'pending' && (
                      <Tooltip title="Proceed to Checkout">
                        <IconButton
                          size="small"
                          onClick={() => handleQuoteAction(quote, 'checkout')}
                          color="primary"
                        >
                          <ShoppingCartIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete Quote">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(quote)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
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
        {selectedQuote && (
          <>
            <DialogTitle>
              Quote Details #{selectedQuote?.id}
            </DialogTitle>
            <DialogContent>
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
                  <Typography variant="body2">Total: ${selectedQuote.total_amount}</Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>Items</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell>Transaction Type</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedQuote.items.map((item, index) => (
                      <TableRow key={index}>
                         <TableCell>
                          {item.category}
                        </TableCell>
                        <TableCell>
                          {item.weight}g {item.purity} {item.metal} 
                        </TableCell>
                        <TableCell>{item.transactionType}</TableCell>
                        <TableCell align="right">
                          {editingItemIndex === index ? (
                            <TextField
                              type="number"
                              size="small"
                              value={item.itemPriceEstimates[item.transactionType]}
                              onChange={(e) => handleItemPriceChange(index, e.target.value)}
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ width: 100 }}
                            />
                          ) : (
                            `$${item.itemPriceEstimates[item.transactionType]?.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {editingItemIndex === index ? (
                            <IconButton 
                              onClick={handleSaveItemChanges}
                              color="primary"
                              size="small"
                              title="Save Changes"
                            >
                              <SaveIcon />
                            </IconButton>
                          ) : (
                            <IconButton
                              onClick={() => setEditingItemIndex(index)}
                              color="primary"
                              size="small"
                              title="Edit Price"
                              disabled={selectedQuote.status !== 'pending'}
                            >
                              <EditIcon />
                            </IconButton>
                          )}
                          <IconButton
                            onClick={() => handleDeleteItem(index)}
                            color="error"
                            size="small"
                            title="Delete Item"
                            disabled={selectedQuote.status !== 'pending'}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions>
              {selectedQuote?.status === 'pending' && (
                <Button
                  onClick={() => handleQuoteAction(selectedQuote, 'checkout')}
                  color="primary"
                  startIcon={<ShoppingCartIcon />}
                >
                  Proceed to Checkout
                </Button>
              )}
              <Button onClick={() => {
                setDetailsDialogOpen(false);
                setEditingItemIndex(-1);
              }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Quote</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this quote? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </Container>
  );
}

export default QuoteManager;
