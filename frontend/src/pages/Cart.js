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
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => {
      return sum + getItemValue(item, item.itemType);
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 0, display: 'flex', alignItems: 'center' }}>
            <ShoppingCartIcon sx={{ mr: 1 }} />
            Cart
          </Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToTicket}
          >
            Back to Ticket
          </Button>
        </Box>

        {/* Cart Items */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Cart Items ({cartItems.length})
          </Typography>
          {cartItems.length > 0 && (
            <Button 
              variant="outlined" 
              color="error" 
              size="small"
              onClick={handleClearCart}
            >
              Clear Cart
            </Button>
          )}
        </Box>

        {cartItems.length > 0 ? (
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell width="10%">Type</TableCell>
                  <TableCell width="25%">Description</TableCell>
                  <TableCell width="15%">Customer</TableCell>
                  <TableCell width="15%">Employee</TableCell>
                  <TableCell width="15%" align="right">Price</TableCell>
                  <TableCell width="10%" align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cartItems.map((item, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Chip 
                        label={getItemTypeLabel(item.itemType)} 
                        color={getItemTypeColor(item.itemType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{getItemDescription(item, item.itemType)}</TableCell>
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
                          <strong>{item.employee.name}</strong><br />
                          {item.employee.role}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No employee
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(getItemValue(item, item.itemType))}</TableCell>
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
                  <TableCell colSpan={4} /> {/* Empty cells for Type, Description, Customer, Employee */}
                  <TableCell align="right">
                    <Typography fontWeight="bold">
                      Total: {formatCurrency(calculateTotal())}
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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button 
            variant="contained" 
            color="primary" 
            disabled={cartItems.length === 0}
            onClick={handleProceedToCheckout}
          >
            Proceed to Checkout
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
