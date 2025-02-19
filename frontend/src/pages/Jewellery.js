import React, { useState } from 'react';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';

// Dummy data for the jewellery inventory
const jewelleryData = [
  {
    id: 'TSD1234567890123456',
    name: 'Diamond Ring',
    type: 'Ring',
    material: '18K White Gold',
    price: 2499.99,
    weight: '4.2g',
    inStock: true,
    stones: 'Diamond',
    caratWeight: '1.0ct',
    description: 'Elegant solitaire diamond ring with excellent clarity and cut',
    dimensions: '16.5mm diameter',
    certification: 'GIA Certified',
    manufacturer: 'Luxury Jewels Co.',
    dateAdded: '2025-01-15',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop'
  },
  {
    id: 'TND9876543210987654',
    name: 'Sapphire Necklace',
    type: 'Necklace',
    material: '14K Yellow Gold',
    price: 1299.99,
    weight: '8.5g',
    inStock: true,
    stones: 'Sapphire',
    caratWeight: '2.5ct',
    description: 'Beautiful sapphire pendant necklace with delicate chain',
    dimensions: '18 inches chain length',
    certification: 'IGI Certified',
    manufacturer: 'Royal Gems Ltd.',
    dateAdded: '2025-01-20',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&h=300&fit=crop'
  },
  {
    id: 'TSD2468135790123456',
    name: 'Pearl Earrings',
    type: 'Earrings',
    material: 'Sterling Silver',
    price: 299.99,
    weight: '3.0g',
    inStock: false,
    stones: 'Pearl',
    caratWeight: 'N/A',
    description: 'Classic freshwater pearl drop earrings',
    dimensions: '25mm length',
    certification: 'N/A',
    manufacturer: 'Pearl Paradise Inc.',
    dateAdded: '2025-01-25',
    image: 'https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=300&h=300&fit=crop'
  },
  {
    id: 'TND1357924680123456',
    name: 'Ruby Bracelet',
    type: 'Bracelet',
    material: '18K Rose Gold',
    price: 1899.99,
    weight: '12.3g',
    inStock: true,
    stones: 'Ruby',
    caratWeight: '3.2ct',
    description: 'Stunning ruby tennis bracelet with secure clasp',
    dimensions: '7 inches length',
    certification: 'SSEF Certified',
    manufacturer: 'Precious Designs Co.',
    dateAdded: '2025-02-01',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=300&h=300&fit=crop'
  },
  {
    id: 'TSD5678901234567890',
    name: 'Emerald Pendant',
    type: 'Pendant',
    material: 'Platinum',
    price: 3299.99,
    weight: '5.8g',
    inStock: true,
    stones: 'Emerald',
    caratWeight: '1.8ct',
    description: 'Exquisite emerald pendant with diamond halo',
    dimensions: '22mm x 15mm',
    certification: 'Gubelin Certified',
    manufacturer: 'Elite Jewellers',
    dateAdded: '2025-02-10',
    image: 'https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=300&h=300&fit=crop'
  }
];

function Jewellery() {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState(jewelleryData[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [serialQuery, setSerialQuery] = useState('');

  const handleRowClick = (item) => {
    setSelectedItem(item);
  };

  const truncateNumber = (number) => {
    return number.substring(0, 7) + '...';
  };

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
              placeholder="Search by serial number..."
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

          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table sx={{ minWidth: 650 }} aria-label="jewellery inventory table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '100px' }}>Number</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Material</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Weight</TableCell>
                  <TableCell>Stock Status</TableCell>
                  <TableCell>Stones</TableCell>
                  <TableCell>Carat Weight</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jewelleryData.map((item) => (
                  <TableRow
                    key={item.id}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                      backgroundColor: selectedItem?.id === item.id ? 'rgba(0, 0, 0, 0.08)' : 'inherit'
                    }}
                    onClick={() => handleRowClick(item)}
                  >
                    <TableCell>
                      <Tooltip title={item.id} arrow>
                        <Typography
                          sx={{
                            width: '100%',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontFamily: 'monospace'
                          }}
                        >
                          {truncateNumber(item.id)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>{item.material}</TableCell>
                    <TableCell>${item.price.toFixed(2)}</TableCell>
                    <TableCell>{item.weight}</TableCell>
                    <TableCell>{item.inStock ? 'In Stock' : 'Out of Stock'}</TableCell>
                    <TableCell>{item.stones}</TableCell>
                    <TableCell>{item.caratWeight}</TableCell>
                  </TableRow>
                ))}
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
                  src={selectedItem.image} 
                  alt={selectedItem.name}
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
                  {selectedItem.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                  {selectedItem.type}
                </Typography>
                <Typography variant="h6" sx={{ color: 'success.main', mb: 0.5 }}>
                  ${selectedItem.price.toFixed(2)}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: selectedItem.inStock ? 'success.main' : 'error.main',
                    fontWeight: 'medium'
                  }}
                >
                  {selectedItem.inStock ? 'In Stock' : 'Out of Stock'}
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
                  <Typography variant="caption" color="textSecondary">Material</Typography>
                  <Typography variant="body2">{selectedItem.material}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">Weight</Typography>
                  <Typography variant="body2">{selectedItem.weight}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">Stones</Typography>
                  <Typography variant="body2">{selectedItem.stones}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">Carat</Typography>
                  <Typography variant="body2">{selectedItem.caratWeight}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">Dimensions</Typography>
                  <Typography variant="body2">{selectedItem.dimensions}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">Certification</Typography>
                  <Typography variant="body2">{selectedItem.certification}</Typography>
                </Box>
              </Box>
            </Paper>

            {/* ID Section */}
            <Paper elevation={0} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="caption" color="textSecondary">Item Number</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedItem.id}</Typography>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Jewellery;
