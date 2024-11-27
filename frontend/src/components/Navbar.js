import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  styled,
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { useCart } from '../context/CartContext';
import Cart from './Cart';

const StyledAppBar = styled(AppBar)({
  zIndex: 1201, // Higher than drawer's z-index
});

function Navbar() {
  const [cartOpen, setCartOpen] = useState(false);
  const { cartItems } = useCart();

  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <>
      <StyledAppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            POS System
          </Typography>
          <IconButton
            color="inherit"
            onClick={() => setCartOpen(true)}
            sx={{ ml: 2 }}
          >
            <Badge badgeContent={cartItemCount} color="error">
              <CartIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </StyledAppBar>
      <Cart open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

export default Navbar;
