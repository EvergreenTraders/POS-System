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
  Recycling as ScrapIcon,
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
  Assessment as AssessmentIcon,
  Schedule as LayawayIcon,
  PointOfSale as TransactionsIcon,
  AccountBalance as CashDrawerIcon,
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
  const [customersOpen, setCustomersOpen] = useState(false);
  const [layawayOpen, setLayawayOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  const handleInventoryClick = () => {
    setInventoryOpen(!inventoryOpen);
  };

  const handleSystemConfigClick = () => {
    setSystemConfigOpen(!systemConfigOpen);
  };

  const handleCustomersClick = () => {
    setCustomersOpen(!customersOpen);
  };

  const handleLayawayClick = () => {
    setLayawayOpen(!layawayOpen);
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

        <StyledLink to="/scrap">
          <StyledListItem active={isActive('/scrap')}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
              <ScrapIcon />
            </ListItemIcon>
            {isOpen && <ListItemText primary="Scrap Bucket" />}
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

        <StyledLink to="/customer-ticket">
          <StyledListItem active={isActive('/customer-ticket')}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
              <TransactionsIcon />
            </ListItemIcon>
            {isOpen && <ListItemText primary="Transactions" />}
          </StyledListItem>
        </StyledLink>

        <StyledLink to="/cash-drawer">
          <StyledListItem active={isActive('/cash-drawer')}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
              <CashDrawerIcon />
            </ListItemIcon>
            {isOpen && <ListItemText primary="Cash Drawer" />}
          </StyledListItem>
        </StyledLink>

        <ListItem button onClick={handleCustomersClick}>
          <ListItemIcon sx={{ color: 'white', minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
            <PeopleIcon />
          </ListItemIcon>
          {isOpen && (
            <>
              <ListItemText primary="Customers" />
              {customersOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </>
          )}
        </ListItem>

        <Collapse in={customersOpen && isOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <StyledLink to="/customers">
              <StyledListItem active={isActive('/customers')} sx={{ pl: 4 }}>
                {isOpen && <ListItemText primary="Customer Manager" />}
              </StyledListItem>
            </StyledLink>
            <StyledLink to="/customer-dashboard">
              <StyledListItem active={isActive('/customer-dashboard')} sx={{ pl: 4 }}>
                {isOpen && <ListItemText primary="Customer Dashboard" />}
              </StyledListItem>
            </StyledLink>
          </List>
        </Collapse>

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
            <StyledLink to="/inventory/hardgoods">
              <StyledListItem active={isActive('/inventory/hardgoods')} sx={{ pl: 4 }}>
                {isOpen && <ListItemText primary="Hardgoods" />}
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

        <ListItem button onClick={handleLayawayClick}>
          <ListItemIcon sx={{ color: 'white', minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
            <LayawayIcon />
          </ListItemIcon>
          {isOpen && (
            <>
              <ListItemText primary="Layaways" />
              {layawayOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </>
          )}
        </ListItem>

        <Collapse in={layawayOpen && isOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <StyledLink to="/layaways">
              <StyledListItem active={isActive('/layaways')} sx={{ pl: 4 }}>
                {isOpen && <ListItemText primary="Layaways Overdue" />}
              </StyledListItem>
            </StyledLink>
            <StyledLink to="/layaways/past-due">
              <StyledListItem active={isActive('/layaways/past-due')} sx={{ pl: 4 }}>
                {isOpen && <ListItemText primary="Past Payment Due Date" />}
              </StyledListItem>
            </StyledLink>
            <StyledLink to="/layaways/active">
              <StyledListItem active={isActive('/layaways/active')} sx={{ pl: 4 }}>
                {isOpen && <ListItemText primary="All Active" />}
              </StyledListItem>
            </StyledLink>
            <StyledLink to="/layaways/no-activity">
              <StyledListItem active={isActive('/layaways/no-activity')} sx={{ pl: 4 }}>
                {isOpen && <ListItemText primary="Contacted But No Activity" />}
              </StyledListItem>
            </StyledLink>
            <StyledLink to="/layaways/no-payment">
              <StyledListItem active={isActive('/layaways/no-payment')} sx={{ pl: 4 }}>
                {isOpen && <ListItemText primary="No Payment in 30 days" />}
              </StyledListItem>
            </StyledLink>
            <StyledLink to="/layaways/locate">
              <StyledListItem active={isActive('/layaways/locate')} sx={{ pl: 4 }}>
                {isOpen && <ListItemText primary="Locate Layaways" />}
              </StyledListItem>
            </StyledLink>
            <StyledLink to="/layaways/reporting">
              <StyledListItem active={isActive('/layaways/reporting')} sx={{ pl: 4 }}>
                {isOpen && <ListItemText primary="Ad Hoc Reporting" />}
              </StyledListItem>
            </StyledLink>
          </List>
        </Collapse>

        <StyledLink to="/transactions">
          <StyledListItem active={isActive('/transactions')}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
              <Receipt />
            </ListItemIcon>
            {isOpen && <ListItemText primary="Transaction Journals" />}
          </StyledListItem>
        </StyledLink>

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
