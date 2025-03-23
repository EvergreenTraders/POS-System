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
  Snackbar,
  Select,
  MenuItem
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
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [expirationDays, setExpirationDays] = useState(30);
  const [editingExpiration, setEditingExpiration] = useState(false);
  const [tempExpirationDays, setTempExpirationDays] = useState(30);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    fetchQuotes();
    fetchExpirationDays();
    fetchTransactionTypes();
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

  const fetchTransactionTypes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/transaction-types`);
      setTransactionTypes(response.data);
    } catch (error) {
      console.error('Error fetching transaction types:', error);
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

  const handleCheckout = async (quote) => {
    try {
      // Create a new transaction from the quote
      const transactionData = {
        customer_id: quote.customer_id,
        item_id: quote.item_id,
        transaction_type: quote.transaction_type,
        total_amount: quote.total_amount,
        employee_id: quote.employee_id
      };

      // Create the transaction
      const response = await axios.post(`${API_BASE_URL}/transactions`, transactionData);
      
      if (response.data) {
        setSnackbar({
          open: true,
          message: 'Transaction created successfully',
          severity: 'success'
        });
        
        // Close any open dialogs
        setDetailsDialogOpen(false);
        
        // Navigate to the transaction page
        navigate(`/transactions/${response.data.id}`);
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      setSnackbar({
        open: true,
        message: 'Error creating transaction: ' + (error.response?.data?.error || error.message),
        severity: 'error'
      });
    }
  };

  const handleQuoteAction = (quote, action) => {
    if (action === 'checkout') {
      handleCheckout(quote);
    } else if (action === 'view') {
      handleViewDetails(quote);
    } else if (action === 'transaction') {
      // Add logic for transaction action
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

  const getRelevantPrice = (quote, type) => {
    switch (type) {
      case 'buy':
        return quote.buy_price;
      case 'pawn':
        return quote.pawn_value;
      case 'retail':
        return quote.retail_price;
      default:
        return quote.total_amount;
    }
  };

  const getDisplayPrice = (quote) => {
    switch (quote.transaction_type) {
      case 'buy':
        return quote.buy_price;
      case 'pawn':
        return quote.pawn_value;
      case 'retail':
        return quote.retail_price;
      default:
        return 0;
    }
  };

  const getDisplayPriceLabel = (quote) => {
    switch (quote.transaction_type) {
      case 'buy':
        return 'Buy Price';
      case 'pawn':
        return 'Pawn Value';
      case 'retail':
        return 'Retail Price';
      default:
        return 'Price';
    }
  };

  const handleTransactionTypeChange = (e) => {
    const newType = e.target.value;
    const relevantPrice = getRelevantPrice(selectedQuote, newType);
    
    setEditingItem(prev => ({
      ...prev,
      transaction_type: newType,
      buy_price: newType === 'buy' ? relevantPrice : prev.buy_price,
      pawn_value: newType === 'pawn' ? relevantPrice : prev.pawn_value,
      retail_price: newType === 'retail' ? relevantPrice : prev.retail_price
    }));
  };

  const handlePriceChange = (e) => {
    const newPrice = parseFloat(e.target.value) || 0;
    const type = editingItem.transaction_type;
    
    setEditingItem(prev => ({
      ...prev,
      buy_price: type === 'buy' ? newPrice : prev.buy_price,
      pawn_value: type === 'pawn' ? newPrice : prev.pawn_value,
      retail_price: type === 'retail' ? newPrice : prev.retail_price
    }));
  };

  const handleSaveItemChanges = async () => {
    try {
      // First update the quote's transaction type
      const quoteResponse = await axios.put(`${API_BASE_URL}/quotes/${editingItem.id}`, {
        transaction_type: editingItem.transaction_type
      });

      // Then update the jewelry prices
      const jewelryResponse = await axios.put(`${API_BASE_URL}/jewelry/${editingItem.item_id}`, {
        buy_price: editingItem.buy_price,
        pawn_value: editingItem.pawn_value,
        retail_price: editingItem.retail_price
      });

      if (quoteResponse.data && jewelryResponse.data) {
        const updatedQuote = {
          ...quoteResponse.data,
          buy_price: jewelryResponse.data.buy_price,
          pawn_value: jewelryResponse.data.pawn_value,
          retail_price: jewelryResponse.data.retail_price
        };
        
        setSelectedQuote(updatedQuote);
        setQuotes(quotes.map(q => q.id === updatedQuote.id ? updatedQuote : q));
        
        setSnackbar({
          open: true,
          message: 'Quote and prices updated successfully',
          severity: 'success'
        });
      }
      
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating quote:', error);
      setSnackbar({
        open: true,
        message: 'Error updating quote: ' + (error.response?.data?.error || error.message),
        severity: 'error'
      });
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
    setEditingItem({
      ...editingItem,
      itemPriceEstimates: {
        ...editingItem.itemPriceEstimates,
        [editingItem.transactionType]: parseFloat(newPrice)
      }
    });
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
              <TableCell>Item ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Expires In (Days)</TableCell>
              <TableCell>Days Remaining</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredQuotes.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell>{quote.id}</TableCell>
                <TableCell>{quote.item_id}</TableCell>
                <TableCell>
                  <Typography variant="body2">{quote.customer_name}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {quote.customer_email}
                  </Typography>
                </TableCell>
                <TableCell>{formatDate(quote.created_at)}</TableCell>
                <TableCell>
                  <Typography variant="body1">
                    ${getDisplayPrice(quote)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {getDisplayPriceLabel(quote)}
                  </Typography>
                </TableCell>
                <TableCell>{quote.expires_in}</TableCell>
                <TableCell>
                  {quote.days_remaining > 0 ? (
                    `${quote.days_remaining} days`
                  ) : (
                    'Expired'
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
                  <Typography variant="body2">
                    Status: {selectedQuote.days_remaining > 0 ? 'Active' : 'Expired'}
                  </Typography>
                  <Typography variant="body2">
                    Expires In: {selectedQuote.expires_in} days
                    {selectedQuote.days_remaining > 0 && ` (${selectedQuote.days_remaining} days remaining)`}
                  </Typography>
                  <Typography variant="body2">Total: ${getDisplayPrice(selectedQuote)}</Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>Transaction Details</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item ID</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Transaction Type</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>{selectedQuote.item_id}</TableCell>
                      <TableCell>{selectedQuote.item_description}</TableCell>
                      <TableCell>
                        {editingItem ? (
                          <Select
                            size="small"
                            value={editingItem.transaction_type}
                            onChange={handleTransactionTypeChange}
                            sx={{ minWidth: 120 }}
                          >
                            {transactionTypes.map(type => (
                              <MenuItem key={type.type} value={type.type}>
                                {type.type.charAt(0).toUpperCase() + type.type.slice(1)}
                              </MenuItem>
                            ))}
                          </Select>
                        ) : (
                          selectedQuote.transaction_type.charAt(0).toUpperCase() + selectedQuote.transaction_type.slice(1)
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {editingItem ? (
                          <TextField
                            type="number"
                            size="small"
                            value={getDisplayPrice(editingItem)}
                            onChange={handlePriceChange}
                            inputProps={{ 
                              step: "0.01",
                              min: "0"
                            }}
                            sx={{ width: 100 }}
                          />
                        ) : (
                          <>
                            <Typography variant="body1">
                              ${getDisplayPrice(selectedQuote)}
                            </Typography>
                          </>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {editingItem ? (
                          <IconButton 
                            onClick={handleSaveItemChanges}
                            color="primary"
                            size="small"
                            title="Save Changes"
                          >
                            <SaveIcon />
                          </IconButton>
                        ) : (
                          <>
                            <IconButton
                              onClick={() => {
                                setEditingItem({...selectedQuote});
                              }}
                              color="primary"
                              size="small"
                              title="Edit Quote"
                              disabled={!selectedQuote.days_remaining || selectedQuote.days_remaining <= 0}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              onClick={() => {
                                setQuoteToDelete(selectedQuote);
                                setDeleteDialogOpen(true);
                              }}
                              color="error"
                              size="small"
                              title="Delete Quote"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions>
              {selectedQuote.days_remaining > 0 && (
                <Button
                  onClick={() => handleQuoteAction(selectedQuote, 'transaction')}
                  color="primary"
                  startIcon={<ShoppingCartIcon />}
                >
                  Proceed to Transaction
                </Button>
              )}
              <Button onClick={() => {
                setDetailsDialogOpen(false);
                setEditingItem(null);
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
