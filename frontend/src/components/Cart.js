import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Box,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

function Cart({ open, onClose }) {
  const { cartItems, removeFromCart } = useCart();
  const navigate = useNavigate();

  // Helper to get item type from structure
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

  // Get item type label
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

  // Get item type color
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

  // Get item description
  const getItemDescription = (item, type) => {
    switch (type) {
      case 'pawn':
      case 'buy':
      case 'sale':
        return item.description || 'No description';
      case 'trade':
        return `${item.tradeItem || 'Item'} → ${item.storeItem || 'Store item'}`;
      case 'repair':
        return item.description || 'Repair item';
      case 'payment':
        return `Payment: ${item.method || 'N/A'}`;
      default:
        return 'Item';
    }
  };

  // Get item value
  // Money going OUT (buy/pawn) = negative values
  // Money coming IN (sale) = positive values
  const getItemValue = (item, type) => {
    const taxRate = 0.13;
    const isTaxExempt = item.customer?.tax_exempt || false;

    switch (type) {
      case 'pawn': return -parseFloat(item.value || 0); // Money going out (negative)
      case 'buy': return -parseFloat(item.price || 0); // Money going out (negative)
      case 'sale': {
        const itemPrice = parseFloat(item.price || 0); // Money coming in (positive)
        const quantity = parseInt(item.quantity) || 1;
        const protectionPlanAmount = item.protectionPlan ? itemPrice * 0.15 : 0;
        const subtotal = (itemPrice * quantity) + protectionPlanAmount;
        // Add tax unless customer is tax-exempt
        return isTaxExempt ? subtotal : subtotal * (1 + taxRate);
      }
      case 'trade': return parseFloat(item.priceDiff || 0);
      case 'repair': return parseFloat(item.fee || 0); // Money coming in (positive)
      case 'payment': return parseFloat(item.amount || 0);
      default: return 0;
    }
  };

  // Calculate total
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const type = item.transaction_type || getItemTypeFromStructure(item);
      return total + getItemValue(item, type);
    }, 0);
  };

  // Handle view full cart
  const handleViewCart = () => {
    onClose();
    navigate('/cart');
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 400, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Shopping Cart ({cartItems.length} items)
        </Typography>

        {cartItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CartIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Your cart is empty
            </Typography>
          </Box>
        ) : (
          <>
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {cartItems.map((item, index) => {
                const type = item.transaction_type || getItemTypeFromStructure(item);
                return (
                  <React.Fragment key={index}>
                    <ListItem
                      secondaryAction={
                        <IconButton edge="end" onClick={() => {
                          // Remove item from sessionStorage
                          const newItems = [...cartItems];
                          newItems.splice(index, 1);
                          sessionStorage.setItem('cartItems', JSON.stringify(newItems));
                          removeFromCart(item.id);
                        }}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={getItemTypeLabel(type)}
                              color={getItemTypeColor(type)}
                              size="small"
                            />
                            <Typography variant="body2">
                              {getItemDescription(item, type)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            ${getItemValue(item, type).toFixed(2)}
                            {item.customer && ` • ${item.customer.name}`}
                          </Typography>
                        }
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                );
              })}
            </List>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Total: ${calculateTotal().toFixed(2)}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleViewCart}
                sx={{ mb: 1 }}
              >
                View Full Cart
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}

export default Cart;
