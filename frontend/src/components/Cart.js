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
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import { useCart } from '../context/CartContext';

function Cart({ open, onClose }) {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal } = useCart();

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 350, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Shopping Cart
        </Typography>
        <List>
          {cartItems.map((item) => (
            <React.Fragment key={item.id}>
              <ListItem
                secondaryAction={
                  <IconButton edge="end" onClick={() => removeFromCart(item.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={item.name}
                  secondary={`$${item.price} × ${item.quantity}`}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                  <IconButton
                    size="small"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <RemoveIcon />
                  </IconButton>
                  <Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
                  <IconButton
                    size="small"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Total: ${getCartTotal().toFixed(2)}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            disabled={cartItems.length === 0}
          >
            Checkout
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

export default Cart;
