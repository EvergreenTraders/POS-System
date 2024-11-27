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
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ShoppingCart,
  Receipt,
  Inventory as InventoryIcon,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';

const StyledDrawer = styled(Drawer)({
  width: 240,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: 240,
    boxSizing: 'border-box',
    backgroundColor: '#1a472a',
    color: 'white',
  },
});

const StyledListItem = styled(ListItem)(({ active }) => ({
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backgroundColor: active ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
  borderLeft: active ? '4px solid #66bb6a' : 'none',
}));

const StyledLink = styled(Link)({
  textDecoration: 'none',
  color: 'inherit',
  width: '100%',
});

function Sidebar() {
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const isInventoryActive = () => ['/inventory/jewellery', '/inventory/coins-bullions'].includes(location.pathname);

  return (
    <StyledDrawer variant="permanent">
      <List sx={{ mt: 8 }}>
        <StyledLink to="/">
          <StyledListItem active={isActive('/')}>
            <ListItemIcon sx={{ color: 'inherit' }}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </StyledListItem>
        </StyledLink>

        <StyledListItem 
          onClick={() => setInventoryOpen(!inventoryOpen)}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <InventoryIcon />
          </ListItemIcon>
          <ListItemText primary="Inventory" />
          {inventoryOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
        </StyledListItem>

        <Collapse in={inventoryOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <StyledLink to="/inventory/jewellery">
              <StyledListItem active={isActive('/inventory/jewellery')} sx={{ pl: 4 }}>
                <ListItemText primary="Jewellery" />
              </StyledListItem>
            </StyledLink>
            <StyledLink to="/inventory/coins-bullions">
              <StyledListItem active={isActive('/inventory/coins-bullions')} sx={{ pl: 4 }}>
                <ListItemText primary="Coins & Bullions" />
              </StyledListItem>
            </StyledLink>
          </List>
        </Collapse>

        <StyledLink to="/products">
          <StyledListItem active={isActive('/products')}>
            <ListItemIcon sx={{ color: 'inherit' }}>
              <ShoppingCart />
            </ListItemIcon>
            <ListItemText primary="Products" />
          </StyledListItem>
        </StyledLink>

        <StyledLink to="/orders">
          <StyledListItem active={isActive('/orders')}>
            <ListItemIcon sx={{ color: 'inherit' }}>
              <Receipt />
            </ListItemIcon>
            <ListItemText primary="Orders" />
          </StyledListItem>
        </StyledLink>
      </List>
    </StyledDrawer>
  );
}

export default Sidebar;
