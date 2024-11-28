import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  styled,
  Avatar,
  Menu,
  MenuItem,
  Box,
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Cart from './Cart';

const StyledAppBar = styled(AppBar)({
  zIndex: 1201, // Higher than drawer's z-index
});

function Navbar() {
  const [cartOpen, setCartOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { cartItems } = useCart();
  const { user, logout } = useAuth();

  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

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
          {user && (
            <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
              <IconButton
                size="large"
                onClick={handleMenu}
                color="inherit"
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  {user.username ? user.username[0].toUpperCase() : <AccountIcon />}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem disabled>
                  <Typography variant="body2">
                    Signed in as {user.username}
                  </Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </StyledAppBar>
      <Cart open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

export default Navbar;
