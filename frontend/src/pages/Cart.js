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
  Checkbox,
  Tooltip
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
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
  const [selectedItems, setSelectedItems] = useState([]); // Now stores ticket IDs instead of item indices
  const [selectedTickets, setSelectedTickets] = useState([]); // Store selected ticket IDs
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    itemIndex: null
  });
  const [groupedByTicket, setGroupedByTicket] = useState({}); // Group items by buyTicketId
  
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

  // Group cart items by buyTicketId
  useEffect(() => {
    const grouped = {};
    cartItems.forEach((item, index) => {
      const ticketId = item.buyTicketId || `item-${index}`; // Fallback for items without buyTicketId
      if (!grouped[ticketId]) {
        grouped[ticketId] = [];
      }
      grouped[ticketId].push({ ...item, originalIndex: index });
    });
    setGroupedByTicket(grouped);
  }, [cartItems]);

  // Auto-select tickets belonging to the current customer by default
  useEffect(() => {
    if (Object.keys(groupedByTicket).length > 0 && customer) {
      // Find all ticket IDs that belong to the current customer
      const customerTicketIds = Object.entries(groupedByTicket)
        .filter(([ticketId, ticketItems]) => {
          // Check if any items in this ticket belong to the current customer
          return ticketItems.some(item =>
            item.customer &&
            (item.customer.id === customer.id || item.customer.name === `${customer.first_name} ${customer.last_name}`)
          );
        })
        .map(([ticketId]) => ticketId);

      setSelectedTickets(customerTicketIds);
    } else if (Object.keys(groupedByTicket).length > 0 && !customer) {
      // If no specific customer, select all tickets by default
      const allTicketIds = Object.keys(groupedByTicket);
      setSelectedTickets(allTicketIds);
    }
  }, [groupedByTicket, customer]);

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
    setSelectedTickets([]);
  }, [cartItems, customerFilter]);

  // Handle customer filter change
  const handleCustomerFilterChange = (e) => {
    setCustomerFilter(e.target.value);
  };
  
  // Handle ticket selection toggle
  const handleTicketSelect = (ticketId) => {
    setSelectedTickets(prev => {
      const newSelection = prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId];
      return newSelection;
    });
  };

  // Handle individual item selection toggle (deprecated, keeping for backwards compatibility)
  const handleItemSelect = (index) => {
    setSelectedItems(prev => {
      const newSelection = prev.includes(index)
        ? prev.filter(idx => idx !== index)
        : [...prev, index];
      return newSelection;
    });
  };
  
  // Check if all tickets are selected
  const isAllSelected = Object.keys(groupedByTicket).length > 0 &&
    Object.keys(groupedByTicket).every(ticketId => selectedTickets.includes(ticketId));

  // Handle select/deselect all tickets
  const handleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all tickets
      setSelectedTickets([]);
    } else {
      // Select all tickets
      const allTicketIds = Object.keys(groupedByTicket);
      setSelectedTickets(allTicketIds);
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
  
  // Calculate total for selected tickets only
  const calculateSelectedTotal = () => {
    if (selectedTickets.length === 0) return 0;

    return selectedTickets.reduce((total, ticketId) => {
      const ticketItems = groupedByTicket[ticketId] || [];
      const ticketTotal = ticketItems.reduce((subtotal, item) => {
        return subtotal + parseFloat(getItemValue(item, item.transaction_type || getItemTypeFromStructure(item)) || 0);
      }, 0);
      return total + ticketTotal;
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
        editItemType: item.transaction_type
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
    // If tickets are selected, only checkout items from those tickets
    // Otherwise, checkout all filtered items
    let itemsToCheckout;
    if (selectedTickets.length > 0) {
      itemsToCheckout = [];
      selectedTickets.forEach(ticketId => {
        const ticketItems = groupedByTicket[ticketId] || [];
        ticketItems.forEach(item => {
          itemsToCheckout.push(item);
        });
      });
    } else {
      itemsToCheckout = filteredItems;
    }
      
    // Make sure we're preserving all jewelry-specific fields for items from the gem estimator
    itemsToCheckout = itemsToCheckout.map(item => {
      // If this is a jewelry item from the gem estimator, ensure all fields are preserved
      if (item.sourceEstimator === 'jewelry') {
        return {
          ...item,
          // Ensure these critical fields are included
          sourceEstimator: 'jewelry',
          metal_type: item.metal_type || item.precious_metal_type || (item.originalData?.precious_metal_type),
          metal_purity: item.metal_purity || (item.originalData?.metal_purity),
          metal_weight: item.metal_weight || (item.originalData?.metal_weight),
          metal_category: item.metal_category || (item.originalData?.metal_category),
          gems: item.gems || (item.originalData?.gems),
          stones: item.stones || (item.originalData?.stones),
          free_text: item.free_text || (item.originalData?.free_text),
          price_estimates: item.price_estimates || (item.originalData?.price_estimates),
          // Keep the original data for reference
       //   originalData: item.originalData || null
        };
      }
      return item;
    });

    navigate('/checkout', {
      state: {
        items: itemsToCheckout,
        allCartItems: cartItems,
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
          {/* <Button
            startIcon={<BlockIcon />}
            variant="outlined"
            color="error"
            onClick={handleClearCart}
            disabled={cartItems.length === 0}
          >
            VOID ITEM
          </Button> */}
        </Box>
        


        {/* Cart Items - Grouped by Ticket */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Tickets ({Object.keys(groupedByTicket).length}) - Items ({filteredItems.length})
          </Typography>
          {customer && (
            <Typography variant="body2" color="text.secondary">
              Customer: <strong>{customer.name}</strong>
            </Typography>
          )}
        </Box>

        {Object.keys(groupedByTicket).length > 0 ? (
          <Box sx={{ mb: 3 }}>
            {/* Select All Checkbox */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Checkbox
                indeterminate={selectedTickets.length > 0 && !isAllSelected}
                checked={isAllSelected}
                onChange={handleSelectAll}
              />
              <Typography variant="body2" fontWeight="bold">
                Select All Tickets
              </Typography>
            </Box>

            {/* Render each ticket */}
            {Object.entries(groupedByTicket).map(([ticketId, ticketItems]) => {
              const ticketTotal = ticketItems.reduce((sum, item) =>
                sum + getItemValue(item, item.transaction_type || getItemTypeFromStructure(item)), 0
              );
              const isTicketSelected = selectedTickets.includes(ticketId);

              return (
                <Paper
                  key={ticketId}
                  variant="outlined"
                  sx={{
                    mb: 2,
                    border: isTicketSelected ? '2px solid' : '1px solid',
                    borderColor: isTicketSelected ? '#4caf50' : 'divider',
                    bgcolor: isTicketSelected ? '#e8f5e9' : 'background.paper'
                  }}
                >
                  {/* Ticket Header */}
                  <Box sx={{
                    p: 2,
                    bgcolor: isTicketSelected ? '#c8e6c9' : 'grey.100',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleTicketSelect(ticketId)}
                  >
                    <Checkbox
                      checked={isTicketSelected}
                      onChange={() => handleTicketSelect(ticketId)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Ticket ID: {ticketId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ticketItems.length} item{ticketItems.length !== 1 ? 's' : ''} • Total: {formatCurrency(ticketTotal)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Ticket Items */}
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell width="10%"><strong>Type</strong></TableCell>
                        <TableCell width="30%"><strong>Description</strong></TableCell>
                        <TableCell width="20%"><strong>Customer</strong></TableCell>
                        <TableCell width="20%"><strong>Employee</strong></TableCell>
                        <TableCell align="right" width="10%"><strong>Price</strong></TableCell>
                        <TableCell align="center" width="10%"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ticketItems.map((item, itemIndex) => (
                        <TableRow key={itemIndex} hover>
                          <TableCell>
                            <Chip
                              label={getItemTypeLabel(item.transaction_type || getItemTypeFromStructure(item))}
                              color={getItemTypeColor(item.transaction_type || getItemTypeFromStructure(item))}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{getItemDescription(item, item.transaction_type || getItemTypeFromStructure(item))}</TableCell>
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
                          <TableCell align="right">
                            {formatCurrency(getItemValue(item, item.transaction_type || getItemTypeFromStructure(item)))}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Edit">
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => handleEditItem(item.originalIndex)}
                                sx={{ mr: 1 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Void">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleRemoveItem(item.originalIndex)}
                              >
                                <BlockIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              );
            })}

            {/* Grand Total */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" align="right" fontWeight="bold">
                {selectedTickets.length > 0 ? (
                  `Selected Total: ${formatCurrency(calculateSelectedTotal())}`
                ) : (
                  `Grand Total: ${formatCurrency(calculateTotal(cartItems))}`
                )}
              </Typography>
            </Paper>
          </Box>
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
              {selectedTickets.length > 0 &&
               ` • ${selectedTickets.length} ticket${selectedTickets.length === 1 ? '' : 's'} selected`}
            </Typography>
            {selectedTickets.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSelectedTickets([])}
                sx={{ mt: 1 }}
              >
                Clear Selection
              </Button>
            )}
          </Box>
          <Button
            variant="contained"
            color="primary"
            disabled={cartItems.length === 0 || (selectedTickets.length > 0 && calculateSelectedTotal() === 0)}
            onClick={handleProceedToCheckout}
          >
            {selectedTickets.length > 0 ?
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
          {confirmDialog.itemIndex === -1 ? "Clear Cart" : "Void Item"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.itemIndex === -1 
              ? "Are you sure you want to clear all items from your cart?" 
              : "Are you sure you want to void this item from your cart?"}
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
