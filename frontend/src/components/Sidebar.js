import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  styled,
  IconButton,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';

import {
  Dashboard as DashboardIcon,
  ShoppingCart,
  Receipt,
  Inventory as InventoryIcon,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Savings as PiggyBankIcon,
  ChevronLeft as ChevronLeftIcon,
  LocalAtm as PawnsIcon,
  Description as QuoteIcon,
  People as PeopleIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

const StyledDrawer = styled(Drawer)(({ theme, open }) => ({
  width: open ? drawerWidth : 65,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  '& .MuiDrawer-paper': {
    width: open ? drawerWidth : 65,
    boxSizing: 'border-box',
    backgroundColor: '#1a472a',
    color: 'white',
    overflowX: 'hidden',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
}));

const StyledListItem = styled(ListItem)(({ active }) => ({
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backgroundColor: active ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
  borderLeft: active ? '4px solid #66bb6a' : 'none',
  minHeight: 48,
  px: 2.5,
}));

const StyledLink = styled(Link)({
  textDecoration: 'none',
  color: 'inherit',
  width: '100%',
});

function Sidebar() {
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [systemConfigOpen, setSystemConfigOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  const handleInventoryClick = () => {
    setInventoryOpen(!inventoryOpen);
  };

  const handleSystemConfigClick = () => {
    setSystemConfigOpen(!systemConfigOpen);
  };

  const handleDrawerToggle = () => {
    setIsOpen(!isOpen);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <StyledDrawer variant="permanent" open={isOpen}>
      <List sx={{ mt: 8 }}>
        <ListItem>
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              color: 'white',
              justifyContent: isOpen ? 'flex-end' : 'center',
              width: '100%',
            }}
          >
            {isOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        </ListItem>

        <StyledLink to="/">
          <StyledListItem active={isActive('/')}> 
            <ListItemIcon sx={{ color: 'inherit', minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
            <StorefrontIcon />
            </ListItemIcon>
            {isOpen && <ListItemText primary="Home" />}
          </StyledListItem>
        </StyledLink>

        <StyledLink to="/dashboard">
          <StyledListItem active={isActive('/dashboard')}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
              <DashboardIcon />
            </ListItemIcon>
            {isOpen && <ListItemText primary="Dashboard" />}
          </StyledListItem>
        </StyledLink>

        <StyledLink to="/products">
          <StyledListItem active={isActive('/products')}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
              <ShoppingCart />
            </ListItemIcon>
            {isOpen && <ListItemText primary="Products" />}
          </StyledListItem>
        </StyledLink>

        <StyledLink to="/orders">
          <StyledListItem active={isActive('/orders')}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
              <Receipt />
            </ListItemIcon>
            {isOpen && <ListItemText primary="Orders" />}
          </StyledListItem>
        </StyledLink>

        <StyledLink to="/quotes">
          <StyledListItem active={isActive('/quotes')}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
              <QuoteIcon />
            </ListItemIcon>
            {isOpen && <ListItemText primary="Quotes" />}
          </StyledListItem>
        </StyledLink>

        <StyledLink to="/customers">
          <StyledListItem active={isActive('/customers')}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
              <PeopleIcon />
            </ListItemIcon>
            {isOpen && <ListItemText primary="Customers" />}
          </StyledListItem>
        </StyledLink>

        <ListItem button onClick={handleInventoryClick}>
          <ListItemIcon sx={{ color: 'white', minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
            <InventoryIcon />
          </ListItemIcon>
          {isOpen && (
            <>
              <ListItemText primary="Inventory" />
              {inventoryOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </>
          )}
        </ListItem>

        <Collapse in={inventoryOpen && isOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <StyledLink to="/inventory/jewelry">
              <StyledListItem active={isActive('/inventory/jewelry')} sx={{ pl: 4 }}>
                {isOpen && <ListItemText primary="Jewelry" />}
              </StyledListItem>
            </StyledLink>
            <StyledLink to="/inventory/coins-bullions">
              <StyledListItem active={isActive('/inventory/coins-bullions')} sx={{ pl: 4 }}>
                {isOpen && <ListItemText primary="Coins & Bullions" />}
              </StyledListItem>
            </StyledLink>
          </List>
        </Collapse>

        <ListItem
          button
          component={Link}
          to="/pawns"
          selected={location.pathname === '/pawns'}
          sx={{ minHeight: 48, px: 2.5 }}
        >
          <ListItemIcon>
            <PiggyBankIcon sx={{ color: 'white' }} />
          </ListItemIcon>
          {isOpen && <ListItemText primary="Pawns" />}
        </ListItem>

        <ListItem button onClick={handleSystemConfigClick}>
          <ListItemIcon sx={{ color: 'white', minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
            <SettingsIcon />
          </ListItemIcon>
          {isOpen && (
            <>
              <ListItemText primary="System Config" />
              {systemConfigOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </>
          )}
        </ListItem>

        <Collapse in={systemConfigOpen && isOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <StyledLink to="/system-config/employees">
              <StyledListItem active={isActive('/system-config/employees')} sx={{ pl: 4 }}>
                {isOpen && <ListItemText primary="Employees" />}
              </StyledListItem>
            </StyledLink>
            <StyledLink to="/system-config/settings">
              <StyledListItem active={isActive('/system-config/settings')} sx={{ pl: 4 }}>
                {isOpen && <ListItemText primary="Settings" />}
              </StyledListItem>
            </StyledLink>
          </List>
        </Collapse>
      </List>
    </StyledDrawer>
  );
}

export default Sidebar;
