import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  styled,
  IconButton,
  Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ShoppingCart,
  Receipt,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { useCart } from '../context/CartContext';
import Cart from './Cart';

const StyledLink = styled(Link)(({ theme }) => ({
  color: 'white',
  textDecoration: 'none',
  marginLeft: theme.spacing(2),
}));

function Navbar() {
  const [cartOpen, setCartOpen] = useState(false);
  const { cartItems } = useCart();

  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            POS System
          </Typography>
          <StyledLink to="/">
            <Button color="inherit" startIcon={<DashboardIcon />}>
              Dashboard
            </Button>
          </StyledLink>
          <StyledLink to="/products">
            <Button color="inherit" startIcon={<ShoppingCart />}>
              Products
            </Button>
          </StyledLink>
          <StyledLink to="/orders">
            <Button color="inherit" startIcon={<Receipt />}>
              Orders
            </Button>
          </StyledLink>
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
      </AppBar>
      <Cart open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

export default Navbar;
