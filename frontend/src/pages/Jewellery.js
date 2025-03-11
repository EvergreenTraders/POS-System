import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemText,
  TextField,
  InputAdornment,
  Grid,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import config from '../config';
import axios from 'axios';

function Jewellery() {
  const navigate = useNavigate();
  const API_BASE_URL = config.apiUrl;
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [serialQuery, setSerialQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/transactions`);
      setTransactions(response.data);
      if (response.data.length > 0) {
        setSelectedItem(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
  };

  const truncateNumber = (number) => {
    return number.substring(0, 14) + '...' + number.substring(number.length - 4);
  };

  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) {
      return '0.00';
    }
    return price.toFixed(2);
  };

  // Filter transactions based on search queries
  const filteredTransactions = transactions.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSerial = serialQuery === '' || 
      item.transaction_id?.toLowerCase().includes(serialQuery.toLowerCase());

    return matchesSearch && matchesSerial;
  });

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Main Content */}
      <Grid container sx={{ flex: 1, overflow: 'hidden' }}>
        {/* Inventory Table Section */}
        <Grid item xs={9} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Search Section */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            p: 2,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            alignItems: 'center'
          }}>
            <TextField
              size="small"
              placeholder="Search inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              size="small"
              placeholder="Search by transaction ID..."
              value={serialQuery}
              onChange={(e) => setSerialQuery(e.target.value)}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/gem-estimator')}
            >
              Estimator
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
            <Table stickyHeader sx={{ minWidth: 650 }} aria-label="jewellery inventory table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '100px' }}>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Weight</TableCell>
                  <TableCell> Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((item) => (
                    <TableRow
                      key={item.id}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        bgcolor: selectedItem?.id === item.id ? 'action.selected' : 'inherit'
                      }}
                      onClick={() => handleRowClick(item)}
                    >
                      <TableCell> {item.transaction_id} </TableCell>
                      <TableCell>{`${item.weight}g ${item.metal_purity} ${item.metal_type}`}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>${formatPrice(item.price)}</TableCell>
                      <TableCell>{item.weight}g</TableCell>
                      <TableCell>{item.inventory_status}</TableCell>
                      <TableCell>{item.created_date}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Details Section */}
        <Grid item xs={3} 
          sx={{ 
            height: '100%',
            borderLeft: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {selectedItem && (
            <Box sx={{ 
              height: '100%',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              p: 2
            }}>
              {/* Image and Basic Info Section */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                {/* Image */}
                <Box sx={{ width: '120px', height: '120px', flexShrink: 0 }}>
                  <img 
                    src={selectedItem.images?.find(img => img.is_primary)?.image_url || 
                         selectedItem.images?.[0]?.image_url || 
                         'placeholder-image-url.jpg'} 
                    alt={selectedItem.name || 'Item'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                </Box>
                
                {/* Basic Info */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {`${selectedItem.weight}g ${selectedItem.metal_purity} ${selectedItem.metal_type}`}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}> {selectedItem.category}
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'success.main', mb: 0.5 }}>
                    ${formatPrice(selectedItem.price)}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: selectedItem.inventory_status === 'HOLD' ? 'success.main' : 'error.main',
                      fontWeight: 'medium'
                    }}
                  >
                    {selectedItem.inventory_status || 'HOLD'}
                  </Typography>
                </Box>
              </Box>

              {/* Specifications */}
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'primary.main', mb: 1 }}>
                  Specifications
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Weight</Typography>
                    <Typography variant="body2">{selectedItem.weight}g</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Dimensions</Typography>
                    <Typography variant="body2">{selectedItem.dimensions || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Certification</Typography>
                    <Typography variant="body2">{selectedItem.certification || 'N/A'}</Typography>
                  </Box>
                </Box>
              </Paper>

              {/* ID Section */}
              <Paper elevation={0} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="caption" color="textSecondary">Transaction ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedItem.transaction_id}</Typography>
              </Paper>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default Jewellery;
