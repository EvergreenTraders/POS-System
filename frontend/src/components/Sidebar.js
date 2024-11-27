import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

const StyledListItem = styled(ListItem)({
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

const StyledLink = styled(Link)({
  textDecoration: 'none',
  color: 'inherit',
  width: '100%',
});

function Sidebar() {
  const [inventoryOpen, setInventoryOpen] = useState(false);

  return (
    <StyledDrawer variant="permanent">
      <List sx={{ mt: 8 }}>
        <StyledLink to="/">
          <StyledListItem>
            <ListItemIcon sx={{ color: 'white' }}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </StyledListItem>
        </StyledLink>

        <StyledListItem button onClick={() => setInventoryOpen(!inventoryOpen)}>
          <ListItemIcon sx={{ color: 'white' }}>
            <InventoryIcon />
          </ListItemIcon>
          <ListItemText primary="Inventory" />
          {inventoryOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
        </StyledListItem>

        <Collapse in={inventoryOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <StyledLink to="/inventory/jewellery">
              <StyledListItem sx={{ pl: 4 }}>
                <ListItemText primary="Jewellery" />
              </StyledListItem>
            </StyledLink>
            <StyledLink to="/inventory/coins-bullions">
              <StyledListItem sx={{ pl: 4 }}>
                <ListItemText primary="Coins & Bullions" />
              </StyledListItem>
            </StyledLink>
          </List>
        </Collapse>

        <StyledLink to="/products">
          <StyledListItem>
            <ListItemIcon sx={{ color: 'white' }}>
              <ShoppingCart />
            </ListItemIcon>
            <ListItemText primary="Products" />
          </StyledListItem>
        </StyledLink>

        <StyledLink to="/orders">
          <StyledListItem>
            <ListItemIcon sx={{ color: 'white' }}>
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
