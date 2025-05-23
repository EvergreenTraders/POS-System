import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
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
  MenuItem,
  CircularProgress,
  Radio,
  RadioGroup,
  FormControlLabel
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
  const { addToCart, setCustomer } = useCart();
  const [quotes, setQuotes] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);
  const [editingItem, setEditingItem] = useState(null);
  const [quoteItems, setQuoteItems] = useState([]);
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
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  const [liveSpotPrices, setLiveSpotPrices] = useState(null);
  const [priceEstimatePercentages, setPriceEstimatePercentages] = useState({});
  const [metalTypes, setMetalTypes] = useState([]);

  // Function to fetch metal types
  const fetchMetalTypes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/precious_metal_type`);
      setMetalTypes(response.data);
    } catch (error) {
      console.error('Error fetching metal types:', error);
      showMessage('Error fetching metal types', 'error');
    }
  };

  // Function to fetch live spot prices
  const fetchLiveSpotPrices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/live_spot_prices`);
      setLiveSpotPrices(response.data[0]);
      
      // Fetch price estimate percentages when live spot prices are fetched
      const priceEstimatePercentagesResponse = await axios.get(`${API_BASE_URL}/price_estimates`);
      const data = priceEstimatePercentagesResponse.data;
      const estimates = {};
      data.forEach((estimate) => {     
        const metalType = estimate.precious_metal_type_id;
        if (!estimates[metalType]) {
          estimates[metalType] = [];
        }
        estimates[metalType].push(estimate);
      });
      setPriceEstimatePercentages(estimates);
    } catch (error) {
      showMessage('Error fetching live spot prices', 'error');
    }
  };

  // API helper functions
  const api = {
    quotes: {
      getAll: async () => {
        const response = await axios.get(`${API_BASE_URL}/quotes`);
        return response.data;
      },
      delete: async (quoteId) => {
        const response = await axios.delete(`${API_BASE_URL}/quotes/${quoteId}`);
        return response.data;
      },
      getItems: async (quoteId) => {
        const response = await axios.get(`${API_BASE_URL}/quotes/${quoteId}/items`);
        return response.data;
      },
      deleteItem: async (quoteId, itemId) => {
        const response = await axios.delete(`${API_BASE_URL}/quotes/${quoteId}/items/${itemId}`);
        return response.data;
      },
      updateItem: async (quoteId, itemId, data) => {
        const response = await axios.put(`${API_BASE_URL}/quotes/${quoteId}/items/${itemId}`, data);
        return response.data;
      }
    },
    config: {
      getExpirationDays: async () => {
        const response = await axios.get(`${API_BASE_URL}/quote-expiration/config`);
        return response.data;
      },
      updateExpirationDays: async (days) => {
        const response = await axios.put(`${API_BASE_URL}/quote-expiration/config`, { days });
        return response.data;
      }
    },
    transactionTypes: {
      getAll: async () => {
        const response = await axios.get(`${API_BASE_URL}/transaction-types`);
        return response.data;
      }
    }
  };

  // UI helper functions
  const showMessage = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  useEffect(() => {
    fetchQuotes();
    fetchExpirationDays();
    fetchTransactionTypes();
    fetchLiveSpotPrices();
    fetchMetalTypes();
  }, []);

  // Check for and delete expired quotes
  useEffect(() => {
    const deleteExpiredQuotes = async () => {
      const expiredQuotes = quotes.filter(quote => quote.days_remaining === 0);
      
      for (const quote of expiredQuotes) {
        try {
          await axios.delete(`${API_BASE_URL}/quotes/${quote.id}`);
          setQuotes(prevQuotes => prevQuotes.filter(q => q.id !== quote.id));
        } catch (error) {
          console.error('Error deleting expired quote:', error);
        }
      }
    };

    if (quotes.length > 0) {
      deleteExpiredQuotes();
    }
  }, [quotes]);

  const fetchQuotes = async () => {
    try {
      const quotes = await api.quotes.getAll();
      setQuotes(quotes);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      setLoading(false);
      showMessage('Error fetching quotes', 'error');
    }
  };

  const fetchExpirationDays = async () => {
    try {
      const config = await api.config.getExpirationDays();
      setExpirationDays(config.days);
      setTempExpirationDays(config.days);
    } catch (error) {
      console.error('Error fetching expiration days:', error);
      showMessage('Error fetching expiration days', 'error');
    }
  };

  const fetchTransactionTypes = async () => {
    try {
      const types = await api.transactionTypes.getAll();
      setTransactionTypes(types);
    } catch (error) {
      console.error('Error fetching transaction types:', error);
      showMessage('Error fetching transaction types', 'error');
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

  const handleViewDetails = async (quote) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/quotes/${quote.quote_id}/items`);
      setQuoteItems(response.data);
      setSelectedQuote(quote);
      setDetailsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching quote items:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching quote items',
        severity: 'error'
      });
    }
  };

  const handleDeleteClick = (quote) => {
    setQuoteToDelete(quote);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await api.quotes.delete(quoteToDelete.quote_id);
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
      setDetailsDialogOpen(false);
      
      const updatedQuotes = await api.quotes.getAll();
      setQuotes(updatedQuotes);

      showMessage('Quote deleted successfully');
    } catch (error) {
      console.error('Error deleting quote:', error);
      showMessage(error.response?.data?.error || 'Error deleting quote', 'error');
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

  const getPriceForType = (item, type = item?.transaction_type) => {
    if (!item) return 0;
    
    switch (type) {
      case 'buy':
        return item.buy_price || 0;
      case 'pawn':
        return item.pawn_value || 0;
      case 'retail':
        return item.retail_price || 0;
      default:
        return item.item_price || 0;
    }
  };

  const handleTransactionTypeChange = (e) => {
    const newType = e.target.value;
    let newPrice = 0;
    
    // Check if using live spot price
    if (editingItem.spot_type === 'live') {
      // For live spot price, use the pre-calculated price for the selected type
      switch (newType) {
        case 'buy':
          newPrice = editingItem.buy_price || 0;
          break;
        case 'pawn':
          newPrice = editingItem.pawn_value || 0;
          break;
        case 'retail':
          newPrice = editingItem.retail_price || 0;
          break;
        default:
          newPrice = getPriceForType(editingItem, newType);
      }
    } else {
      // For locked spot price, use the original method
      newPrice = getPriceForType(editingItem, newType);
    }

    setEditingItem({
      ...editingItem,
      transaction_type: newType,
      item_price: newPrice
    });
  };

  const handlePriceChange = (e) => {
    setEditingItem({
      ...editingItem,
      item_price: parseFloat(e.target.value) || 0
    });
  };

  const handleSaveItemChanges = async () => {
    try {
      await axios.put(`${API_BASE_URL}/quotes/${selectedQuote.quote_id}/items/${editingItem.item_id}`, {
        transaction_type: editingItem.transaction_type,
        item_price: editingItem.item_price
      });

      // Refresh quote items
      const itemsResponse = await axios.get(`${API_BASE_URL}/quotes/${selectedQuote.quote_id}/items`);
      setQuoteItems(itemsResponse.data);

      // Refresh quote data to get updated total
      const quoteResponse = await axios.get(`${API_BASE_URL}/quotes/${selectedQuote.quote_id}`);
      const updatedQuote = quoteResponse.data;
      
      // Update both selectedQuote and the quote in the quotes list
      setSelectedQuote(updatedQuote);
      setQuotes(prevQuotes => 
        prevQuotes.map(q => 
          q.quote_id === updatedQuote.quote_id ? updatedQuote : q
        )
      );
      
      setEditingItem(null);

      setSnackbar({
        open: true,
        message: 'Quote item updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating quote item:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Error updating quote item',
        severity: 'error'
      });
    }
  };

  const handleDeleteItem = async (item) => {
    try {
      // Delete the item
      await api.quotes.deleteItem(selectedQuote.quote_id, item.item_id);

      // Refresh all quotes and find the updated one
      const updatedQuotes = await api.quotes.getAll();
      setQuotes(updatedQuotes);

      const updatedQuote = updatedQuotes.find(q => q.quote_id === selectedQuote.quote_id);
      
      if (updatedQuote) {
        setSelectedQuote(updatedQuote);
        const updatedItems = await api.quotes.getItems(selectedQuote.quote_id);
        setQuoteItems(updatedItems);
      }

      showMessage('Quote item deleted successfully');
    } catch (error) {
      console.error('Error deleting quote item:', error);
      showMessage(error.response?.data?.error || 'Error deleting quote item', 'error');
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

  const handleProceedToCheckout = async (quoteToUse) => {
    try {
      // Use the passed quote or selectedQuote (for dialog)
      const quote = quoteToUse || selectedQuote;
      
      // Get all items for this quote
      const items = await api.quotes.getItems(quote.quote_id);
      
      // Add each quote item to cart
      items.forEach(item => {
        addToCart({
          id: item.item_id,
          short_desc: item.description,
          itemPriceEstimates: {
            [item.transaction_type]: parseFloat(item.item_price) || 0
          },
          transaction_type: item.transaction_type,
          images: item.images || [],
          price: item.item_price
        });
      });

      // Set the customer information
      setCustomer({
        id: quote.customer_id,
        name: quote.customer_name,
        email: quote.customer_email,
        phone: quote.customer_phone
      });

      setDetailsDialogOpen(false);
      navigate('/checkout', {
        state: {
          customerId: quote.customer_id,
          customerName: quote.customer_name,
          customerEmail: quote.customer_email,
          customerPhone: quote.customer_phone,
          returnPath: '/quotes',
          quoteId: quote.quote_id
        }
      });
    } catch (error) {
      console.error('Error proceeding to checkout:', error);
      showMessage(error.response?.data?.error || 'Error proceeding to checkout', 'error');
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedQuotes = () => {
    const sortedQuotes = [...filteredQuotes].sort((a, b) => {
      // Handle numeric fields
      if (['id', 'price', 'expires_in'].includes(sortConfig.key)) {
        const aValue = sortConfig.key === 'price' ? getPriceForType(a) : parseFloat(a[sortConfig.key]) || 0;
        const bValue = sortConfig.key === 'price' ? getPriceForType(b) : parseFloat(b[sortConfig.key]) || 0;
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      // Handle date fields
      else if (sortConfig.key === 'created_at') {
        return sortConfig.direction === 'asc' 
          ? new Date(a[sortConfig.key]) - new Date(b[sortConfig.key])
          : new Date(b[sortConfig.key]) - new Date(a[sortConfig.key]);
      }
      // Handle text fields (case-insensitive alphabetical sort)
      else {
        const aValue = (a[sortConfig.key] || '').toString().toLowerCase();
        const bValue = (b[sortConfig.key] || '').toString().toLowerCase();
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
    });
    return sortedQuotes;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
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
          <Grid item>
            {editingExpiration ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  type="number"
                  size="small"
                  value={tempExpirationDays}
                  onChange={(e) => setTempExpirationDays(parseInt(e.target.value) || 0)}
                  sx={{ width: 80 }}
                />
                <Button size="small" variant="contained" onClick={handleUpdateExpirationDays}>
                  Save
                </Button>
                <Button size="small" onClick={() => setEditingExpiration(false)}>
                  Cancel
                </Button>
              </Box>
            ) : (
              <Tooltip title="Click to edit expiration days">
                <Button 
                  variant="outlined" 
                  onClick={() => setEditingExpiration(true)}
                  size="medium"
                >
                  Quotes expire in {expirationDays} days
                </Button>
              </Tooltip>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Quotes Table */}
      <TableContainer sx={{ flex: 1, overflow: 'auto', border: '1px solid rgba(224, 224, 224, 1)', borderRadius: '4px' }}>
        <Table stickyHeader>
          <TableHead sx={{ bgcolor: 'white'}}>
            <TableRow sx={{ bgcolor: 'white' }}>
              <TableCell 
                onClick={() => handleSort('id')}
                sx={{ cursor: 'pointer', userSelect: 'none', bgcolor: 'white', fontWeight: 'bold' }}
              >
                Quote ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                onClick={() => handleSort('item_description')}
                sx={{ cursor: 'pointer', userSelect: 'none', bgcolor: 'white', fontWeight: 'bold' }}
              >
                Customer {sortConfig.key === 'item_description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                onClick={() => handleSort('price')}
                sx={{ cursor: 'pointer', userSelect: 'none', bgcolor: 'white', fontWeight: 'bold' }}
                align="right"
              >
                Price {sortConfig.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                onClick={() => handleSort('created_at')}
                sx={{ cursor: 'pointer', userSelect: 'none', bgcolor: 'white', fontWeight: 'bold' }}
              >
                Created {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                onClick={() => handleSort('expires_in')}
                sx={{ cursor: 'pointer', userSelect: 'none', bgcolor: 'white', fontWeight: 'bold' }}
              >
                Expires In {sortConfig.key === 'expires_in' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                onClick={() => handleSort('expires_in')}
                sx={{ cursor: 'pointer', userSelect: 'none', bgcolor: 'white', fontWeight: 'bold' }}
              >
                Days Remaining {sortConfig.key === 'days_remaining' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell sx={{ bgcolor: 'white', fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ bgcolor: 'white' }}>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : getSortedQuotes().length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No quotes found
                </TableCell>
              </TableRow>
            ) : (
              getSortedQuotes().map((quote) => (
                <TableRow key={quote.quote_id} sx={{ bgcolor: 'transparent', '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' } }}>
                  <TableCell>{quote.quote_id}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{quote.customer_name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {quote.customer_email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1">
                      ${quote.total_amount}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(quote.created_at)}</TableCell>
                  <TableCell>
                      {quote.expires_in} days
                  </TableCell>
                  <TableCell>
                    {quote.days_remaining}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(quote)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      {quote.days_remaining > 0 && (
                        <Tooltip title="Proceed to Checkout">
                          <IconButton
                            size="small"
                            onClick={() => handleProceedToCheckout(quote)}
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
              ))
            )}
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
                </Grid>
              </Grid>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>Quote Items</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item ID</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Transaction Type</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Spot Price</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {quoteItems.map((item) => (
                      <TableRow key={item.item_id}>
                        <TableCell>{item.item_id}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>
                          {editingItem?.item_id === item.item_id ? (
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
                            item.transaction_type.charAt(0).toUpperCase() + item.transaction_type.slice(1)
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {editingItem?.item_id === item.item_id ? (
                            <TextField
                              type="number"
                              size="small"
                              value={editingItem.item_price}
                              onChange={handlePriceChange}
                              inputProps={{ 
                                step: "0.01",
                                min: "0"
                              }}
                              sx={{ width: 100 }}
                            />
                          ) : (
                          <>
                            <Box>
                              <Typography variant="body1">
                                ${item.item_price}
                              </Typography>
                            </Box>
                          </>
                          )}
                        </TableCell>
                        <TableCell align="right">
  {editingItem?.item_id === item.item_id ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <RadioGroup
        row
        value={editingItem.spot_type || 'locked'}
        onChange={e => {
  const newSpotType = e.target.value;
  let updatedItem = { ...editingItem, spot_type: newSpotType };
  if (
    newSpotType === 'live' 
  ) {
    // Map metal to spot price key and label
    const metalMap = {
      Gold: { key: 'cadxau', label: 'Gold', factor: 0.7},
      Silver: { key: 'cadxag', label: 'Silver', factor: 0.7 },
      Platinum: { key: 'cadxpt', label: 'Platinum', factor: 0.7 },
      Palladium: { key: 'cadxpd', label: 'Palladium', factor: 0.7 }
    };
    const metalType = editingItem.precious_metal_type;
    const meta = metalMap[metalType];
    if (meta) {
      const spot = liveSpotPrices[meta.key] || liveSpotPrices[meta.key.toUpperCase()];
      const purity = editingItem.purity_value;
      const weight = editingItem.metal_weight;
      const price = spot * purity * weight * meta.factor;
      // Get the metal type ID from the API data
      const metalTypeId = metalTypes.find(mt => mt.type === metalType).id;
      
      // Get price estimates based on metal type id and transaction type
      const estimates = priceEstimatePercentages[metalTypeId] || [];
      let finalPrice = Number(price.toFixed(2)); // Default price if no estimates
      
      // Object to store all price estimates
      const priceEstimates = {
        pawn: 0,
        buy: 0,
        retail: 0
      };
      
      if (estimates.length > 0) {
        // Get percentages for each transaction type, default to 0 if not found
        const pawnPercent = estimates.find(e => e.transaction_type === 'pawn')?.estimate || 0;
        const buyPercent = estimates.find(e => e.transaction_type === 'buy')?.estimate || 0;
        const retailPercent = estimates.find(e => e.transaction_type === 'retail')?.estimate || 0;
        
        // Calculate prices for each transaction type
        priceEstimates.pawn = Number((price * pawnPercent / 100).toFixed(2));
        priceEstimates.buy = Number((price * buyPercent / 100).toFixed(2));
        priceEstimates.retail = Number((price * retailPercent / 100).toFixed(2));
        
        // Get the price for the current transaction type
        const currentType = editingItem.transaction_type || 'buy';
        if (priceEstimates[currentType]) {
          finalPrice = priceEstimates[currentType];
        }
        
      }
      
      updatedItem = {
        ...updatedItem,
        item_price: finalPrice,
        buy_price: priceEstimates.buy,
        pawn_value: priceEstimates.pawn,
        retail_price: priceEstimates.retail,
        precious_metal_type_id: metalTypeId
      };
    }
  }
  setEditingItem(updatedItem);
}}
        name="spotType"
      >
                <FormControlLabel
          value="locked"
          control={<Radio size="small" />}
          label={
            <Typography
              variant="caption"
              display="block"
              sx={{ fontSize: '0.875rem' }}
              color="textSecondary"
            >
              Locked Spot: ${item.metal_spot_price}/oz
            </Typography>
          }
        />
        <FormControlLabel
          value="live"
          control={<Radio size="small" />}
          label={
            <Typography
              variant="caption"
              display="block"
              sx={{ fontSize: '0.875rem' }}
              color={
                item.precious_metal_type === 'Silver' ?
                  (liveSpotPrices.cadxag > item.metal_spot_price ? 'success.main' :
                    liveSpotPrices.cadxag < item.metal_spot_price ? 'error.main' : 'textSecondary') :
                item.precious_metal_type === 'Gold' ?
                  (liveSpotPrices.cadxau > item.metal_spot_price ? 'success.main' :
                    liveSpotPrices.cadxau < item.metal_spot_price ? 'error.main' : 'textSecondary') :
                item.precious_metal_type === 'Platinum' ?
                  (liveSpotPrices.cadxpt > item.metal_spot_price ? 'success.main' :
                    liveSpotPrices.cadxpt < item.metal_spot_price ? 'error.main' : 'textSecondary') :
                item.precious_metal_type === 'Palladium' ?
                  (liveSpotPrices.cadxpd > item.metal_spot_price ? 'success.main' :
                    liveSpotPrices.cadxpd < item.metal_spot_price ? 'error.main' : 'textSecondary') :
                'textSecondary'
              }
            >
              Live Spot: ${item.precious_metal_type && liveSpotPrices ? (
                item.precious_metal_type === 'Silver' ? liveSpotPrices.cadxag :
                item.precious_metal_type === 'Gold' ? liveSpotPrices.cadxau :
                item.precious_metal_type === 'Platinum' ? liveSpotPrices.cadxpt :
                item.precious_metal_type === 'Palladium' ? liveSpotPrices.cadxpd :
                '0.00'
              ) : '0.00'}/oz
            </Typography>
          }
        />
      </RadioGroup>
    </Box>
  ) : (
    item.metal_spot_price && (
      <Box sx={{ mt: 1, fontSize: '0.875rem' }}>
        <Typography variant="caption" display="block" color="textSecondary">
          Locked Spot: ${item.metal_spot_price}/oz
        </Typography>
        <Typography
          variant="caption"
          display="block"
          color={
            item.precious_metal_type === 'Silver' ?
              (liveSpotPrices.cadxag > item.metal_spot_price ? 'success.main' :
                liveSpotPrices.cadxag < item.metal_spot_price ? 'error.main' : 'textSecondary') :
              item.precious_metal_type === 'Gold' ?
                (liveSpotPrices.cadxau > item.metal_spot_price ? 'success.main' :
                  liveSpotPrices.cadxau < item.metal_spot_price ? 'error.main' : 'textSecondary') :
              item.precious_metal_type === 'Platinum' ?
                (liveSpotPrices.cadxpt > item.metal_spot_price ? 'success.main' :
                  liveSpotPrices.cadxpt < item.metal_spot_price ? 'error.main' : 'textSecondary') :
              item.precious_metal_type === 'Palladium' ?
                (liveSpotPrices.cadxpd > item.metal_spot_price ? 'success.main' :
                  liveSpotPrices.cadxpd < item.metal_spot_price ? 'error.main' : 'textSecondary') :
              'textSecondary'
          }
        >
          Live Spot: ${item.precious_metal_type && liveSpotPrices ?
            (item.precious_metal_type === 'Silver' ? liveSpotPrices.cadxag :
              item.precious_metal_type === 'Gold' ? liveSpotPrices.cadxau :
                item.precious_metal_type === 'Platinum' ? liveSpotPrices.cadxpt :
                  item.precious_metal_type === 'Palladium' ? liveSpotPrices.cadxpd :
                    '0.00')
            : '0.00'}/oz
        </Typography>
      </Box>
    )
  )}
</TableCell>
                        <TableCell align="right">
                          {editingItem?.item_id === item.item_id ? (
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
                                onClick={() => setEditingItem(item)}
                                color="primary"
                                size="small"
                                title="Edit Quote Item"
                                disabled={!selectedQuote.days_remaining || selectedQuote.days_remaining <= 0}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                onClick={() => handleDeleteItem(item)}
                                color="error"
                                size="small"
                                title="Delete Quote Item"
                                disabled={!selectedQuote.days_remaining || selectedQuote.days_remaining <= 0}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </>
                          )}

                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={5} align="right">
                        <strong>Total Amount:</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>${selectedQuote.total_amount}</strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setDetailsDialogOpen(false);
                setEditingItem(null);
              }}>
                Close
              </Button>
              {selectedQuote && selectedQuote.days_remaining > 0 && (
                <Button 
                  onClick={() => handleProceedToCheckout(selectedQuote)}
                  variant="contained" 
                  color="primary"
                  startIcon={<ShoppingCartIcon />}
                >
                  Proceed to Checkout
                </Button>
              )}
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
