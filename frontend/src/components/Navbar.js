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
  LockOutlined as LockIcon,
} from '@mui/icons-material';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Cart from './Cart';

const StyledAppBar = styled(AppBar)({
  zIndex: 1201, // Higher than drawer's z-index
});

function Navbar() {
  const [cartOpen, setCartOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { cartItems } = useCart();
  const { user, logout, lockScreen } = useAuth();
  const navigate = useNavigate();

  const cartItemCount = cartItems.length; // Just count number of items, not quantity

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

  const handleLockScreen = () => {
    handleClose();
    lockScreen();
  };

  return (
    <>
      <StyledAppBar position="fixed">
        <Toolbar>
          <Typography 
            variant="h6" 
            sx={{ 
              flexGrow: 1, 
              cursor: 'pointer' 
            }}
            onClick={() => navigate('/')}
          >
            POS System
          </Typography>
          {user && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <IconButton
                color="inherit"
                onClick={() => setCartOpen(true)}
                sx={{ mr: 2 }}
              >
                <Badge badgeContent={cartItemCount} color="error">
                  <CartIcon />
                </Badge>
              </IconButton>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="body2">
                    {user.firstName} {user.lastName}
                  </Typography>
                  <Typography variant="body2" color="white">
                    {user.role}
                  </Typography>
                </Box>
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
                  <MenuItem onClick={handleLockScreen}>
                    <LockIcon sx={{ mr: 1, fontSize: 20 }} />
                    Lock Screen
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
              </Box>
            </Box>
          )}
        </Toolbar>
      </StyledAppBar>
      <Cart open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

export default Navbar;
