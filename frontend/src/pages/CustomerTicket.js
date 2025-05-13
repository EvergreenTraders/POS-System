import React from 'react';
import {
  Box, Typography, Paper, Grid, Container, Card, CardContent, 
  CardMedia, Divider, Chip, Button, Avatar, Stack, Tabs, Tab, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import InventoryIcon from '@mui/icons-material/Inventory';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import DiamondIcon from '@mui/icons-material/Diamond';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import WatchIcon from '@mui/icons-material/Watch';

// Helper function to convert buffer to data URL for image preview
function bufferToDataUrl(bufferObj) {
  if (!bufferObj || !bufferObj.data) return null;
  const base64 = btoa(
    new Uint8Array(bufferObj.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return `data:image/jpeg;base64,${base64}`;
}

const CustomerTicket = () => {
  // Mocked portfolio KPI data (would be fetched from API in production)
  const portfolioData = {
    totalValue: Math.floor(Math.random() * 10000) + 500,
    transactions: Math.floor(Math.random() * 20) + 1,
    itemsCount: Math.floor(Math.random() * 15) + 1
  };
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get customer from location state or session storage
  const [customer, setCustomer] = React.useState(() => {
    // First try to get customer from navigation state
    if (location.state?.customer) {
      // Save to session storage for persistence
      sessionStorage.setItem('selectedCustomer', JSON.stringify(location.state.customer));
      return location.state.customer;
    }
    
    // If not in navigation state, try session storage
    const savedCustomer = sessionStorage.getItem('selectedCustomer');
    if (savedCustomer) {
      return JSON.parse(savedCustomer);
    }
    
    // No customer found
    return null;
  });
  
  const estimatedItems = location.state?.estimatedItems || [];
  const from = location.state?.from || '';
  
  const [activeTab, setActiveTab] = React.useState(0);
  
  // State for managing items in each tab
  const [pawnItems, setPawnItems] = React.useState([{ id: 1, description: '', category: '', value: '' }]);
  const [buyItems, setBuyItems] = React.useState([{ id: 1, description: '', category: '', price: '' }]);
  const [tradeItems, setTradeItems] = React.useState([{ id: 1, tradeItem: '', tradeValue: '', storeItem: '', priceDiff: '' }]);
  const [saleItems, setSaleItems] = React.useState([{ id: 1, description: '', category: '', price: '', paymentMethod: '' }]);
  const [repairItems, setRepairItems] = React.useState([{ id: 1, description: '', issue: '', fee: '', completion: '' }]);
  const [paymentItems, setPaymentItems] = React.useState([{ id: 1, amount: '', method: '', reference: '', notes: '' }]);
  
  // Process estimated items from GemEstimator.js when component mounts
  React.useEffect(() => {
    // If we have estimated items and they're from gemEstimator
    if (estimatedItems.length > 0 && from === 'gemEstimator') {
      // Clear initial empty items
      setPawnItems([]);
      setBuyItems([]);
      setSaleItems([]);
      
      // Process items by transaction type
      const pawn = [];
      const buy = [];
      const sale = [];
      
      estimatedItems.forEach((item, index) => {
        // Create a base item with common properties
        const baseItem = {
          id: index + 1,
          description: `${item.metal_weight}g ${item.metal_purity} ${item.precious_metal_type} ${item.metal_category}${item.free_text ? ` - ${item.free_text}` : ''}`,
          category: item.metal_category || 'Jewelry'
        };
        
        // Add to appropriate array based on transaction type
        switch (item.transaction_type) {
          case 'pawn':
            pawn.push({
              ...baseItem,
              value: item.price || item.price_estimates?.pawn || 0
            });
            break;
          case 'buy':
            buy.push({
              ...baseItem,
              price: item.price || item.price_estimates?.buy || 0
            });
            break;
          case 'retail':
            sale.push({
              ...baseItem,
              price: item.price || item.price_estimates?.retail || 0,
              paymentMethod: ''
            });
            break;
          default:
            // Default to buy if transaction type is not specified
            buy.push({
              ...baseItem,
              price: item.price || item.price_estimates?.buy || 0
            });
        }
      });
      
      // Update state with new items
      if (pawn.length > 0) {
        setPawnItems(pawn);
        setActiveTab(0); // Set active tab to Pawn
      } else if (buy.length > 0) {
        setBuyItems(buy);
        setActiveTab(1); // Set active tab to Buy
      } else if (sale.length > 0) {
        setSaleItems(sale);
        setActiveTab(3); // Set active tab to Sale
      }
    }
  }, [estimatedItems, from]);
  
  // Function to get current items based on active tab
  const getCurrentItems = () => {
    switch(activeTab) {
      case 0: return { items: pawnItems, setItems: setPawnItems };
      case 1: return { items: buyItems, setItems: setBuyItems };
      case 2: return { items: tradeItems, setItems: setTradeItems };
      case 3: return { items: saleItems, setItems: setSaleItems };
      case 4: return { items: repairItems, setItems: setRepairItems };
      case 5: return { items: paymentItems, setItems: setPaymentItems };
      default: return { items: [], setItems: () => {} };
    }
  };
  
  // Handle adding a new row
  const handleAddRow = () => {
    const { items, setItems } = getCurrentItems();
    const newId = items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
    
    // Create a new item based on the active tab
    let newItem;
    switch(activeTab) {
      case 0: 
        newItem = { id: newId, description: '', category: '', value: '' };
        break;
      case 1: 
        newItem = { id: newId, description: '', category: '', price: '' };
        break;
      case 2: 
        newItem = { id: newId, tradeItem: '', tradeValue: '', storeItem: '', priceDiff: '' };
        break;
      case 3:
        newItem = { id: newId, description: '', category: '', price: '', paymentMethod: '' };
        break;
      case 4:
        newItem = { id: newId, description: '', issue: '', fee: '', completion: '' };
        break;
      case 5:
        newItem = { id: newId, amount: '', method: '', reference: '', notes: '' };
        break;
      default:
        return;
    }
    
    setItems([...items, newItem]);
    
    // Calculate totals when adding a new item
    calculateTotal();
  };
  
  // Handle updating an item
  const handleItemChange = (id, field, value) => {
    const { items, setItems } = getCurrentItems();
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  // Handle duplicating an item
  const handleDuplicateItem = (id) => {
    const { items, setItems } = getCurrentItems();
    const itemToDuplicate = items.find(item => item.id === id);
    if (!itemToDuplicate) return;
    
    const newId = Math.max(...items.map(item => item.id)) + 1;
    const newItem = { ...itemToDuplicate, id: newId };
    
    setItems([...items, newItem]);
  };
  
  // Handle deleting an item
  const handleDeleteItem = (id) => {
    const { items, setItems } = getCurrentItems();
    if (items.length <= 1) return; // Keep at least one row
    setItems(items.filter(item => item.id !== id));
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handlers for item type buttons - navigate to respective estimator pages
  const handleJewelryEstimatorClick = () => {
    navigate('/inventory/jewellery', { state: { customer } });
  };
  
  const handleBullionEstimatorClick = () => {
    navigate('/bullion-estimator', { state: { customer } });
  };
  
  const handleMiscEstimatorClick = () => {
    navigate('/misc-estimator', { state: { customer } });
  };
  
  // Handlers for action buttons
  const [totals, setTotals] = React.useState({
    pawn: 0,
    buy: 0,
    trade: 0,
    sale: 0,
    repair: 0,
    payment: 0
  });
  
  // Helper function to get the current tab's total
  const getCurrentTabTotal = () => {
    switch(activeTab) {
      case 0: return totals.pawn;
      case 1: return totals.buy;
      case 2: return totals.trade;
      case 3: return totals.sale;
      case 4: return totals.repair;
      case 5: return totals.payment;
      default: return 0;
    }
  };
  
  const calculateTotal = () => {
    const { items } = getCurrentItems();
    let total = 0;
    
    switch(activeTab) {
      case 0: // Pawn
        total = items.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
        setTotals({ ...totals, pawn: total });
        break;
      case 1: // Buy
        total = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        setTotals({ ...totals, buy: total });
        break;
      case 2: // Trade
        total = items.reduce((sum, item) => sum + (parseFloat(item.priceDiff) || 0), 0);
        setTotals({ ...totals, trade: total });
        break;
      case 3: // Sale
        total = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        setTotals({ ...totals, sale: total });
        break;
      case 4: // Repair
        total = items.reduce((sum, item) => sum + (parseFloat(item.fee) || 0), 0);
        setTotals({ ...totals, repair: total });
        break;
      case 5: // Payment
        total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        setTotals({ ...totals, payment: total });
        break;
      default:
        break;
    }
    
    return total.toFixed(2);
  };
  
  const handleCancel = () => {
    // Reset only the active tab's data to initial empty values
    const { setItems } = getCurrentItems();
    
    switch(activeTab) {
      case 0: // Pawn items
        setItems([{ id: 1, description: '', category: '', value: '' }]);
        break;
      case 1: // Buy items
        setItems([{ id: 1, description: '', category: '', price: '' }]);
        break;
      case 2: // Trade items
        setItems([{ id: 1, tradeItem: '', tradeValue: '', storeItem: '', priceDiff: '' }]);
        break;
      case 3: // Sale items
        setItems([{ id: 1, description: '', category: '', price: '', paymentMethod: '' }]);
        break;
      case 4: // Repair items
        setItems([{ id: 1, description: '', issue: '', fee: '', completion: '' }]);
        break;
      case 5: // Payment items
        setItems([{ id: 1, amount: '', method: '', reference: '', notes: '' }]);
        break;
      default:
        break;
    }
    
    // Stay on current tab and ticket page
  };
  
  const handleAddToCart = () => {
    // Calculate totals before adding to cart
    calculateTotal();
    
    // Here we would add the current transaction to a shopping cart
    // This is a placeholder for future implementation
    alert('Items added to cart');
  };
  
  const handleCheckout = () => {
    // Calculate totals before checkout
    calculateTotal();
    
    // Proceed to checkout with all items from all tabs
    // This is a placeholder for future implementation
    alert('Proceeding to checkout with all items');
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  // Determine image source
  const getImageSource = () => {
    // Handle case where customer is undefined
    if (!customer || !customer.image) return '/placeholder-profile.png';
    
    if (customer.image instanceof File || customer.image instanceof Blob) {
      return URL.createObjectURL(customer.image);
    } else if (typeof customer.image === 'string') {
      return customer.image;
    } else if (customer.image && customer.image.data) {
      return bufferToDataUrl(customer.image);
    }
    return '/placeholder-profile.png';
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        {/* Customer Info Section - Top 30% */}
        <Box sx={{ 
          height: '30vh', 
          maxHeight: '30%', 
          display: 'flex', 
          flexDirection: 'row',
          justifyContent: 'space-between'
        }}>
          {/* Left side - Customer Info */}
          <Box sx={{ 
            display: 'flex', 
            width: '40%', 
            borderRight: '1px solid #e0e0e0'
          }}>
            <Grid container spacing={0} sx={{ width: '100%'}}>
              {/* Column 1: Customer Image */}
              <Grid item xs={3}>
                <Box sx={{ 
                  display: 'flex',
                  m: 0,
                  p: 0,
                  alignItems: 'flex-start'
                }}>
                  <Avatar
                    sx={{ width: 100, height: 100 }}
                    src={getImageSource()}
                    alt={customer ? `${customer.first_name} ${customer.last_name}` : 'Customer'}
                  />
                </Box>
              </Grid>
              
              {/* Column 2: Customer Details */}
              <Grid item xs={9} sx={{ pl: 0, ml: 0 }}>
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mr: 5 }}>
                      {customer ? `${customer.first_name} ${customer.last_name}` : 'No Customer Selected'}
                    </Typography>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/customers/${customer.id}/edit`, { state: { customer } })}
                      >
                        Edit
                      </Button>
                  </Box>
                  <Typography variant="body2">
                    <strong>Phone:</strong> {customer ? (customer.phone || 'Not provided') : 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Address:</strong> {customer ? (
                      customer.address_line1 ? 
                        `${customer.address_line1}${customer.address_line2 ? ', ' + customer.address_line2 : ''}, 
                        ${customer.city || ''} ${customer.state || ''} ${customer.postal_code || ''}`.replace(/\s+/g, ' ').trim() 
                        : 
                        'Not provided'
                      ) : 'N/A'
                    }
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
          {/* Right side - Portfolio KPI */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            width: '58%',
            pl: 2
          }}>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                  <AttachMoneyIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>${portfolioData.totalValue}</Typography>
                  <Typography variant="body2" color="text.secondary" align="center">Total Value</Typography>
                </Card>
              </Grid>
              
              <Grid item xs={4}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                  <AccountBalanceWalletIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{portfolioData.transactions}</Typography>
                  <Typography variant="body2" color="text.secondary" align="center">Transactions</Typography>
                </Card>
              </Grid>
              
              <Grid item xs={4}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                  <InventoryIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{portfolioData.itemsCount}</Typography>
                  <Typography variant="body2" color="text.secondary" align="center">Items</Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/')}
              size="small"
              sx={{ mr: 1 }}
            >
              Back
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {/* Customer details */}
          <Grid item xs={12} md={12}>
            <Card>
              <CardContent>
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs 
                      value={activeTab} 
                      onChange={handleTabChange} 
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{ mb: 1 }}
                    >
                      <Tab label="Pawn" />
                      <Tab label="Buy" />
                      <Tab label="Trade" />
                      <Tab label="Sale" />
                      <Tab label="Repair" />
                      <Tab label="Payment" />
                    </Tabs>
                  </Box>
                  
                  {/* Pawn Tab */}
                  {activeTab === 0 && (
                    <Box sx={{ p: 1 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width="15%" align="center">Type</TableCell>
                              <TableCell width="45%">Item Description</TableCell>
                              <TableCell width="15%">Category</TableCell>
                              <TableCell width="10%">Est. Value</TableCell>
                              <TableCell width="20%" align="right" padding="none">
                                <Tooltip title="Add Item">
                                  <IconButton size="small" color="primary" onClick={handleAddRow}>
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {pawnItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell align="center" padding="normal">
                                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <Tooltip title="Jewelry Estimator">
                                      <IconButton size="small" color="secondary" onClick={handleJewelryEstimatorClick}>
                                        <DiamondIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Bullion Estimator">
                                      <IconButton size="small" color="primary" onClick={handleBullionEstimatorClick}>
                                        <MonetizationOnIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Misc Estimator">
                                      <IconButton size="small" color="success" onClick={handleMiscEstimatorClick}>
                                        <WatchIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.description}
                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.category}
                                    onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.value}
                                    onChange={(e) => handleItemChange(item.id, 'value', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small">
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Duplicate">
                                    <IconButton size="small" onClick={() => handleDuplicateItem(item.id)}>
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: 2 }}>
                        <Typography variant="h6" color="primary">
                          Total: ${getCurrentTabTotal().toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Buy Tab */}
                  {activeTab === 1 && (
                    <Box sx={{ p: 1 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width="15%" align="center">Type</TableCell>
                              <TableCell width="45%">Item Description</TableCell>
                              <TableCell width="15%">Category</TableCell>
                              <TableCell width="10%">Price</TableCell>
                              <TableCell width="20%" align="right" padding="none">
                                <Tooltip title="Add Item">
                                  <IconButton size="small" color="primary" onClick={handleAddRow}>
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {buyItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell align="center" padding="normal">
                                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <Tooltip title="Jewelry Estimator">
                                      <IconButton size="small" color="secondary" onClick={handleJewelryEstimatorClick}>
                                        <DiamondIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Bullion Estimator">
                                      <IconButton size="small" color="primary" onClick={handleBullionEstimatorClick}>
                                        <MonetizationOnIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Misc Estimator">
                                      <IconButton size="small" color="success" onClick={handleMiscEstimatorClick}>
                                        <WatchIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.description}
                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.category}
                                    onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.price}
                                    onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small">
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Duplicate">
                                    <IconButton size="small" onClick={() => handleDuplicateItem(item.id)}>
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: 2 }}>
                        <Typography variant="h6" color="primary">
                          Total: ${getCurrentTabTotal().toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Trade Tab */}
                  {activeTab === 2 && (
                    <Box sx={{ p: 1 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width="15%" align="center">Type</TableCell>
                              <TableCell width="30%">Trade In Item</TableCell>
                              <TableCell width="10%">Trade Value</TableCell>
                              <TableCell width="25%">Store Item</TableCell>
                              <TableCell width="5%">Price Diff</TableCell>
                              <TableCell width="20%" align="right" padding="none">
                                <Tooltip title="Add Item">
                                  <IconButton size="small" color="primary" onClick={handleAddRow}>
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {tradeItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell align="center" padding="normal">
                                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <Tooltip title="Jewelry Estimator">
                                      <IconButton size="small" color="secondary" onClick={handleJewelryEstimatorClick}>
                                        <DiamondIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Bullion Estimator">
                                      <IconButton size="small" color="primary" onClick={handleBullionEstimatorClick}>
                                        <MonetizationOnIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Misc Estimator">
                                      <IconButton size="small" color="success" onClick={handleMiscEstimatorClick}>
                                        <WatchIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.tradeItem}
                                    onChange={(e) => handleItemChange(item.id, 'tradeItem', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.tradeValue}
                                    onChange={(e) => handleItemChange(item.id, 'tradeValue', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.storeItem}
                                    onChange={(e) => handleItemChange(item.id, 'storeItem', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.priceDiff}
                                    onChange={(e) => handleItemChange(item.id, 'priceDiff', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small">
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Duplicate">
                                    <IconButton size="small" onClick={() => handleDuplicateItem(item.id)}>
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: 2 }}>
                        <Typography variant="h6" color="primary">
                          Total: ${getCurrentTabTotal().toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Sale Tab */}
                  {activeTab === 3 && (
                    <Box sx={{ p: 1 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width="15%" align="center">Type</TableCell>
                              <TableCell width="35%">Item Description</TableCell>
                              <TableCell width="15%">Category</TableCell>
                              <TableCell width="10%">Sale Price</TableCell>
                              <TableCell width="10%">Payment Method</TableCell>
                              <TableCell width="20%" align="right" padding="none">
                                <Tooltip title="Add Item">
                                  <IconButton size="small" color="primary" onClick={handleAddRow}>
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {saleItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell align="center" padding="normal">
                                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <Tooltip title="Jewelry Estimator">
                                      <IconButton size="small" color="secondary" onClick={handleJewelryEstimatorClick}>
                                        <DiamondIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Bullion Estimator">
                                      <IconButton size="small" color="primary" onClick={handleBullionEstimatorClick}>
                                        <MonetizationOnIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Misc Estimator">
                                      <IconButton size="small" color="success" onClick={handleMiscEstimatorClick}>
                                        <WatchIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.description}
                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.category}
                                    onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.price}
                                    onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.paymentMethod}
                                    onChange={(e) => handleItemChange(item.id, 'paymentMethod', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small">
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Duplicate">
                                    <IconButton size="small" onClick={() => handleDuplicateItem(item.id)}>
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: 2 }}>
                        <Typography variant="h6" color="primary">
                          Total: ${getCurrentTabTotal().toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Repair Tab */}
                  {activeTab === 4 && (
                    <Box sx={{ p: 1 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width="15%" align="center">Type</TableCell>
                              <TableCell width="30%">Item Description</TableCell>
                              <TableCell width="20%">Issue</TableCell>
                              <TableCell width="10%">Service Fee</TableCell>
                              <TableCell width="10%">Est. Completion</TableCell>
                              <TableCell width="20%" align="right" padding="none">
                                <Tooltip title="Add Item">
                                  <IconButton size="small" color="primary" onClick={handleAddRow}>
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {repairItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell align="center" padding="normal">
                                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <Tooltip title="Jewelry Estimator">
                                      <IconButton size="small" color="secondary" onClick={handleJewelryEstimatorClick}>
                                        <DiamondIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Bullion Estimator">
                                      <IconButton size="small" color="primary" onClick={handleBullionEstimatorClick}>
                                        <MonetizationOnIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Misc Estimator">
                                      <IconButton size="small" color="success" onClick={handleMiscEstimatorClick}>
                                        <WatchIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.description}
                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.issue}
                                    onChange={(e) => handleItemChange(item.id, 'issue', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.fee}
                                    onChange={(e) => handleItemChange(item.id, 'fee', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.completion}
                                    onChange={(e) => handleItemChange(item.id, 'completion', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small">
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Duplicate">
                                    <IconButton size="small" onClick={() => handleDuplicateItem(item.id)}>
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: 2 }}>
                        <Typography variant="h6" color="primary">
                          Total: ${getCurrentTabTotal().toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Payment Tab */}
                  {activeTab === 5 && (
                    <Box sx={{ p: 1 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width="15%" align="center">Type</TableCell>
                              <TableCell width="10%">Amount</TableCell>
                              <TableCell width="15%">Payment Method</TableCell>
                              <TableCell width="15%">Reference</TableCell>
                              <TableCell width="20%">Notes</TableCell>
                              <TableCell width="20%" align="right" padding="none">
                                <Tooltip title="Add Item">
                                  <IconButton size="small" color="primary" onClick={handleAddRow}>
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {paymentItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell align="center" padding="normal">
                                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <Tooltip title="Jewelry Estimator">
                                      <IconButton size="small" color="secondary" onClick={handleJewelryEstimatorClick}>
                                        <DiamondIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Bullion Estimator">
                                      <IconButton size="small" color="primary" onClick={handleBullionEstimatorClick}>
                                        <MonetizationOnIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Misc Estimator">
                                      <IconButton size="small" color="success" onClick={handleMiscEstimatorClick}>
                                        <WatchIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.amount}
                                    onChange={(e) => handleItemChange(item.id, 'amount', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.method}
                                    onChange={(e) => handleItemChange(item.id, 'method', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.reference}
                                    onChange={(e) => handleItemChange(item.id, 'reference', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField 
                                    variant="standard" 
                                    fullWidth 
                                    value={item.notes}
                                    onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small">
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Duplicate">
                                    <IconButton size="small" onClick={() => handleDuplicateItem(item.id)}>
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pr: 2 }}>
                        <Typography variant="h6" color="primary">
                          Total: ${getCurrentTabTotal().toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
                {/* Global action buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, mb: 1, px: 2 }}>
                  <Button variant="outlined" color="error" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Box>
                    <Button variant="contained" color="primary" sx={{ mr: 2 }} onClick={handleAddToCart}>
                      Add to Cart
                    </Button>
                    <Button variant="contained" color="success" onClick={handleCheckout}>
                      Checkout
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default CustomerTicket;