import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Grid,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Avatar,
  Card,
  CardContent,
  IconButton,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../context/AuthContext';

// Helper function to convert buffer to data URL for image preview
function bufferToDataUrl(bufferObj) {
  if (!bufferObj || !bufferObj.data) return null;
  const base64 = btoa(
    new Uint8Array(bufferObj.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return `data:image/jpeg;base64,${base64}`;
}

const Cart = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State for cart items, customer data
  const [cartItems, setCartItems] = useState([]);
  const [customerFilter, setCustomerFilter] = useState('all');
  const [filteredItems, setFilteredItems] = useState([]);
  const [uniqueCustomers, setUniqueCustomers] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    itemIndex: null
  });
  
  // Get customer from session storage or location state
  const [customer, setCustomer] = useState(() => {
    if (location.state?.customer) {
      return location.state.customer;
    }
    
    const savedCustomer = sessionStorage.getItem('selectedCustomer');
    if (savedCustomer) {
      return JSON.parse(savedCustomer);
    }
    
    return null;
  });

  // Initialize cart items from session storage only
  useEffect(() => {
    // Load cart items from session storage
    const savedCartItems = sessionStorage.getItem('cartItems');
    if (savedCartItems) {
      try {
        const parsedItems = JSON.parse(savedCartItems);
        setCartItems(parsedItems);
      } catch (error) {
        console.error('Error parsing cart items from session storage:', error);
        // If there's an error parsing, reset the cart
        sessionStorage.removeItem('cartItems');
        setCartItems([]);
      }
    }
  }, []);

  // Extract unique customers from cart items
  useEffect(() => {
    if (cartItems.length > 0) {
      // Get unique customers
      const customersSet = new Set();
      const customers = [];
      
      cartItems.forEach(item => {
        if (item.customer && item.customer.name) {
          // Use customer ID or name as unique identifier
          const customerId = item.customer.id || item.customer.name;
          if (!customersSet.has(customerId)) {
            customersSet.add(customerId);
            customers.push(item.customer);
          }
        }
      });
      
      setUniqueCustomers(customers);
    } else {
      setUniqueCustomers([]);
    }
  }, [cartItems]);

  // Filter cart items based on selected customer
  useEffect(() => {
    if (customerFilter === 'all') {
      setFilteredItems(cartItems);
    } else {
      const filtered = cartItems.filter(item => 
        item.customer && 
        (item.customer.id === customerFilter || item.customer.name === customerFilter)
      );
      setFilteredItems(filtered);
    }
    
    // Reset selected items when filter changes
    setSelectedItems([]);
  }, [cartItems, customerFilter]);

  // Handle customer filter change
  const handleCustomerFilterChange = (e) => {
    setCustomerFilter(e.target.value);
  };
  
  // Handle individual item selection toggle
  const handleItemSelect = (index) => {
    setSelectedItems(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };
  
  // Check if all filtered items are selected
  const isAllSelected = filteredItems.length > 0 && 
    filteredItems.every((_, index) => selectedItems.includes(index));
  
  // Handle select/deselect all filtered items
  const handleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all items
      setSelectedItems([]);
    } else {
      // Select all currently filtered items
      const allIndices = filteredItems.map((_, index) => index);
      setSelectedItems(allIndices);
    }
  };

  // Helper function to determine item type based on its structure
  const getItemTypeFromStructure = (item) => {
    if (item.value !== undefined) return 'pawn';
    if (item.price !== undefined) {
      if (item.paymentMethod !== undefined) return 'sale';
      return 'buy';
    }
    if (item.tradeItem !== undefined) return 'trade';
    if (item.fee !== undefined) return 'repair';
    if (item.amount !== undefined) return 'payment';
    return 'unknown';
  };

  // Get label for different item types
  const getItemTypeLabel = (type) => {
    switch (type) {
      case 'pawn': return 'Pawn';
      case 'buy': return 'Buy';
      case 'sale': return 'Sale';
      case 'trade': return 'Trade';
      case 'repair': return 'Repair';
      case 'payment': return 'Payment';
      default: return 'Unknown';
    }
  };

  // Get color for different item types
  const getItemTypeColor = (type) => {
    switch (type) {
      case 'pawn': return 'secondary';
      case 'buy': return 'primary';
      case 'sale': return 'success';
      case 'trade': return 'info';
      case 'repair': return 'warning';
      case 'payment': return 'default';
      default: return 'default';
    }
  };

  // Get item description based on its type
  const getItemDescription = (item, type) => {
    switch (type) {
      case 'pawn':
        return `${item.description || 'No description'} (${item.category || 'No category'})`;
      case 'buy':
        return `${item.description || 'No description'} (${item.category || 'No category'})`;
      case 'sale':
        return `${item.description || 'No description'} (${item.category || 'No category'})`;
      case 'trade':
        return `Trading "${item.tradeItem || 'No item'}" for "${item.storeItem || 'No store item'}"`;
      case 'repair':
        return `${item.description || 'No description'} - Issue: ${item.issue || 'No issue'}`;
      case 'payment':
        return `Method: ${item.method || 'No method'}, Reference: ${item.reference || 'No reference'}`;
      default:
        return 'No description available';
    }
  };

  // Get item value based on its type
  const getItemValue = (item, type) => {
    switch (type) {
      case 'pawn': return parseFloat(item.value || 0);
      case 'buy': return parseFloat(item.price || 0);
      case 'sale': return parseFloat(item.price || 0);
      case 'trade': return parseFloat(item.priceDiff || 0);
      case 'repair': return parseFloat(item.fee || 0);
      case 'payment': return parseFloat(item.amount || 0);
      default: return 0;
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate total value of cart
  const calculateTotal = (items = cartItems) => {
    return items.reduce((total, item) => {
      return total + parseFloat(getItemValue(item, getItemTypeFromStructure(item)) || 0);
    }, 0);
  };
  
  // Calculate total for selected items only
  const calculateSelectedTotal = () => {
    if (selectedItems.length === 0) return 0;
    
    return selectedItems.reduce((total, index) => {
      const item = filteredItems[index];
      if (!item) return total; // Skip if item doesn't exist
      return total + parseFloat(getItemValue(item, item.itemType || getItemTypeFromStructure(item)) || 0);
    }, 0);
  };

  // Handle remove item from cart
  const handleRemoveItem = (index) => {
    setConfirmDialog({
      open: true,
      itemIndex: index
    });
  };

  // Confirm removal of item
  const confirmRemoveItem = () => {
    const newItems = [...cartItems];
    newItems.splice(confirmDialog.itemIndex, 1);
    setCartItems(newItems);
    sessionStorage.setItem('cartItems', JSON.stringify(newItems));
    setConfirmDialog({ open: false, itemIndex: null });
  };

  // Handle editing an item by returning to the ticket with the specific item
  const handleEditItem = (index) => {
    const item = cartItems[index];
    // Navigate back to CustomerTicket with the item to edit
    navigate('/customer-ticket', {
      state: {
        customer,
        editItem: item,
        editItemIndex: index,
        editItemType: item.itemType
      }
    });
  };

  // Get customer image source
  const getImageSource = () => {
    if (!customer || !customer.image) return '/placeholder-profile.png';
    
    if (customer.image instanceof File || customer.image instanceof Blob) {
      return URL.createObjectURL(customer.image);
    } else if (typeof customer.image === 'string') {
      return customer.image;
    } else if (customer.image && customer.image.data) {
      return bufferToDataUrl(customer.image);
    }
    return '/placeholder-profile.png';
  };

  // Handle back to ticket
  const handleBackToTicket = () => {
    navigate('/customer-ticket', {
      state: { customer }
    });
  };

  // Handle proceed to checkout
  const handleProceedToCheckout = () => {
    navigate('/checkout', {
      state: {
        items: cartItems,
        customer,
        from: 'cart'
      }
    });
  };

  // Handle clear cart
  const handleClearCart = () => {
    setConfirmDialog({
      open: true,
      itemIndex: -1 // -1 indicates clear all
    });
  };

  // Confirm clear cart
  const confirmClearCart = () => {
    setCartItems([]);
    sessionStorage.removeItem('cartItems');
    setConfirmDialog({ open: false, itemIndex: null });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <ShoppingCartIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h5" component="h1">
            Cart
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            onClick={handleBackToTicket}
            sx={{ mr: 1 }}
          >
            Back to Ticket
          </Button>
          <Button
            startIcon={<DeleteIcon />}
            variant="outlined"
            color="error"
            onClick={handleClearCart}
            disabled={cartItems.length === 0}
          >
            Clear Cart
          </Button>
        </Box>
        


        {/* Cart Items */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Items ({filteredItems.length})
          </Typography>
          {customer && (
            <Typography variant="body2" color="text.secondary">
              Customer: <strong>{customer.name}</strong>
            </Typography>
          )}
        </Box>

        {filteredItems.length > 0 ? (
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell padding="checkbox" width="5%">
                    <Checkbox
                      indeterminate={selectedItems.length > 0 && !isAllSelected}
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell width="10%"><strong>Type</strong></TableCell>
                  <TableCell width="20%"><strong>Description</strong></TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <strong>Customer</strong>
                      <FormControl size="small" sx={{ ml: 1, minWidth: 120 }}>
                        <Select
                          value={customerFilter}
                          onChange={handleCustomerFilterChange}
                          displayEmpty
                          variant="standard"
                          startAdornment={<FilterListIcon fontSize="small" sx={{ mr: 0.5 }} />}
                        >
                          <MenuItem value="all">All Customers</MenuItem>
                          {uniqueCustomers.map((customer) => (
                            <MenuItem 
                              key={customer.id || customer.name} 
                              value={customer.id || customer.name}
                            >
                              {customer.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  </TableCell>
                  <TableCell><strong>Employee</strong></TableCell>
                  <TableCell align="right"><strong>Price</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((item, index) => (
                  <TableRow key={index} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedItems.includes(index)}
                        onChange={() => handleItemSelect(index)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getItemTypeLabel(item.itemType || getItemTypeFromStructure(item))}
                        color={getItemTypeColor(item.itemType || getItemTypeFromStructure(item))}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{getItemDescription(item, item.itemType || getItemTypeFromStructure(item))}</TableCell>
                    <TableCell>
                      {item.customer ? (
                        <Typography variant="body2">
                          <strong>{item.customer.name}</strong><br />
                          {item.customer.phone}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No customer
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.employee ? (
                        <Typography variant="body2">
                          <strong>{item.employee.name} </strong><br />
                          {item.employee.role}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No employee
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(getItemValue(item, item.itemType || getItemTypeFromStructure(item)))}</TableCell>
                    <TableCell align="center">
                      <IconButton 
                        color="primary" 
                        size="small" 
                        onClick={() => handleEditItem(index)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        size="small" 
                        onClick={() => handleRemoveItem(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell colSpan={5} /> {/* Empty cells for Checkbox, Type, Description, Customer, Employee */}
                  <TableCell align="right">
                    <Typography fontWeight="bold">
                      {selectedItems.length > 0 ? (
                        `Selected Total: ${formatCurrency(calculateSelectedTotal())}`
                      ) : (
                        `Total: ${formatCurrency(calculateTotal(filteredItems))}`
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', mb: 3 }}>
            <Typography variant="body1" color="text.secondary">
              Your cart is empty. Add items from the Customer Ticket.
            </Typography>
          </Paper>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {customerFilter !== 'all' && 
               `Showing ${filteredItems.length} of ${cartItems.length} items`}
              {selectedItems.length > 0 && 
               ` • ${selectedItems.length} item${selectedItems.length === 1 ? '' : 's'} selected`}
            </Typography>
            {selectedItems.length > 0 && (
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => setSelectedItems([])}
                sx={{ mt: 1 }}
              >
                Clear Selection
              </Button>
            )}
          </Box>
          <Button 
            variant="contained" 
            color="primary" 
            disabled={cartItems.length === 0 || (selectedItems.length > 0 && calculateSelectedTotal() === 0)}
            onClick={handleProceedToCheckout}
          >
            {selectedItems.length > 0 ? 
              `Checkout Selected (${formatCurrency(calculateSelectedTotal())})` : 
              'Proceed to Checkout'}
          </Button>
        </Box>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, itemIndex: null })}
      >
        <DialogTitle>
          {confirmDialog.itemIndex === -1 ? "Clear Cart" : "Remove Item"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.itemIndex === -1 
              ? "Are you sure you want to clear all items from your cart?" 
              : "Are you sure you want to remove this item from your cart?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, itemIndex: null })}>
            Cancel
          </Button>
          <Button 
            color="error" 
            onClick={confirmDialog.itemIndex === -1 ? confirmClearCart : confirmRemoveItem}
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Cart;
