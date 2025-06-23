import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Box,
  Snackbar,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tab,
  Tabs,
  Tooltip,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import CloudUpload from '@mui/icons-material/CloudUpload';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import config from '../config';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(0),
  marginTop: theme.spacing(1),
  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
}));

const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const ImagePreview = styled('img')({
  width: '100%',
  maxHeight: '200px',
  objectFit: 'contain',
  marginTop: '10px',
  borderRadius: '8px',
  border: '2px solid #ddd',
});

const MetalTypeChip = styled(Chip)(({ selected, theme }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: selected ? theme.palette.primary.main : 'default',
  color: selected ? 'white' : 'inherit',
  '&:hover': {
    backgroundColor: selected ? theme.palette.primary.dark : 'default',
  },
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  fontWeight: 'bold',
  '&.Mui-selected': {
    color: theme.palette.primary.main,
  },
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1),
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const BlackTableHeader = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.common.black,
  color: theme.palette.common.white,
  fontWeight: 'bold',
}));

const ItemImageThumbnail = ({ src, isPrimary, onDelete, onSetPrimary }) => (
  <Box
    sx={{
      position: 'relative',
      width: 100,
      height: 100,
      m: 1,
      borderRadius: 1,
      overflow: 'hidden',
      border: (theme) =>
        `2px solid ${isPrimary ? theme.palette.primary.main : theme.palette.grey[300]}`,
    }}
  >
    <img
      src={src}
      alt="Item"
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <IconButton
        size="small"
        onClick={onDelete}
        sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 0 }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
      {!isPrimary && (
        <IconButton
          size="small"
          onClick={onSetPrimary}
          sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 0 }}
        >
          <CheckIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
    {isPrimary && (
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: 'primary.main',
          color: 'white',
          textAlign: 'center',
          fontSize: 12,
        }}
      >
        Primary
      </Box>
    )}
  </Box>
);

function CoinsBullions() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [tabValue, setTabValue] = useState(0);
  const [images, setImages] = useState([]);
  const [scrapMetalItems, setScrapMetalItems] = useState([]);
  const [coinsBullions, setCoinsBullions] = useState([]);
  const [estimatedScrapItems, setEstimatedScrapItems] = useState([]);
  const [estimatedCoinItems, setEstimatedCoinItems] = useState([]);
  const [metalSpotPrices, setMetalSpotPrices] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    item: '',
    metalType: 'Gold',
    purity: '',
    weight: '',
    mintMark: '',
    year: '',
    grade: '',
    serialNumber: '',
    premiumDollar: '',
    premiumPercent: '',
    price: '',
    pricePerGram: '',
    estimatedValue: '',
    quantity: '1',
    description: '',
  });

  const metalTypes = ['Gold', 'Silver', 'other'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updatedForm = {
        ...prev,
        [name]: value
      };
      
      // Auto-calculate estimated value when weight or price changes
      if (name === 'weight' || name === 'pricePerGram') {
        const weight = name === 'weight' ? value : prev.weight;
        const pricePerGram = name === 'pricePerGram' ? value : prev.pricePerGram;
        
        if (weight && pricePerGram) {
          const calculatedValue = parseFloat(weight) * parseFloat(pricePerGram);
          updatedForm.estimatedValue = calculatedValue.toFixed(2);
        }
      }
      
      return updatedForm;
    });
  };

  const handleMetalTypeSelect = (metal) => {
    setFormData(prev => ({
      ...prev,
      metalType: metal
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare item data based on tab
      const itemData = {
        ...formData,
        type: tabValue === 0 ? 'scrap' : 'coin',
        images: images.length > 0 ? images.filter(img => img.isPrimary)[0].preview : null,
        id: Date.now(), // Generate temporary ID for the item
        transaction_type: 'buy' // Default transaction type
      };

      // Add to estimated items directly without API call
      if (tabValue === 0) {
        // For scrap metal
        const newItem = {
          ...itemData,
          metalType: itemData.metalType,
          purity: itemData.purity,
          weight: itemData.weight,
          estimatedValue: itemData.estimatedValue,
          image: itemData.images, // Use the primary image
          description: itemData.description
        };
        setEstimatedScrapItems([...estimatedScrapItems, newItem]);
      } else {
        // For coins & bullions
        const newItem = {
          ...itemData,
          name: itemData.item,
          metalType: itemData.metalType,
          purity: itemData.purity,
          weight: itemData.weight,
          price: itemData.price || itemData.estimatedValue,
          image: itemData.images, // Use the primary image
          description: itemData.description
        };
        setEstimatedCoinItems([...estimatedCoinItems, newItem]);
      }

      // Reset form and images
      setFormData({
        item: '',
        metalType: 'gold',
        purity: '',
        weight: '',
        mintMark: '',
        year: '',
        grade: '',
        serialNumber: '',
        premiumDollar: '',
        premiumPercent: '',
        price: '',
        pricePerGram: '',
        estimatedValue: '',
        quantity: '1',
        description: '',
      });
      setImages([]);
      
      // Show success message
      setSnackbarOpen(true);
      setSnackbarMessage('Item added to estimated items!');
      setSnackbarSeverity('success');
    } catch (error) {
      setSnackbarOpen(true);
      setSnackbarMessage(`Error adding item: ${error.message}`);
      setSnackbarSeverity('error');
    }
  };

  const calculateValue = () => {
    if (formData.weight && formData.pricePerGram) {
      const calculatedValue = parseFloat(formData.weight) * parseFloat(formData.pricePerGram);
      return calculatedValue.toFixed(2);
    }
    return '';
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file, index) => ({
      file,
      preview: URL.createObjectURL(file),
      isPrimary: images.length === 0 && index === 0 // Only make the first image primary if no images exist
    }));
    setImages([...images, ...newImages]);
  };

  const removeImage = (index) => {
    const newImages = [...images];
    // If removing the primary image, set the first remaining image as primary
    if (newImages[index].isPrimary && newImages.length > 1) {
      const nextIndex = index === 0 ? 1 : 0;
      newImages[nextIndex].isPrimary = true;
    }
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const setAsPrimaryImage = (index) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === index
    }));
    setImages(newImages);
  };

  const handleCameraOpen = () => {
    // Handle camera access logic here
    console.log('Camera access requested');
  };

  const handleEditItem = (item, type) => {
    // Handle edit functionality for inventory items
    console.log(`Editing ${type} item:`, item);
  };
  
  const handleEditEstimatedItem = (item, type) => {
    setEditingItemId(item.id);
    setEditPrice(type === 'scrap' ? item.estimatedValue : item.price);
  };
  
  const handleSaveEditedPrice = (id, type) => {
    if (type === 'scrap') {
      setEstimatedScrapItems(items => 
        items.map(item => 
          item.id === id ? { ...item, estimatedValue: editPrice } : item
        )
      );
    } else {
      setEstimatedCoinItems(items => 
        items.map(item => 
          item.id === id ? { ...item, price: editPrice } : item
        )
      );
    }
    
    setSnackbarOpen(true);
    setSnackbarMessage('Price updated successfully');
    setSnackbarSeverity('success');
    setEditingItemId(null);
  };
  
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditPrice('');
  };
  
  const handleAddToTicket = () => {
    setIsLoading(true);

    try {
      const currentItems = tabValue === 0 ? estimatedScrapItems : estimatedCoinItems;
      
      if (currentItems.length === 0) {
        setSnackbarOpen(true);
        setSnackbarMessage('No items to add to ticket');
        setSnackbarSeverity('warning');
        setIsLoading(false);
        return;
      }
      
      const ticketItems = currentItems.map(item => {
        if (tabValue === 0) { 
          return {
            id: item.id,
            description: `${item.metalType} (${item.purity}, ${item.weight}g)`,
            category: 'Scrap Metal',
            value: item.estimatedValue,
            price: item.estimatedValue, // Added price field for consistency
            transaction_type: item.transaction_type || 'buy',
            originalItem: item 
          };
        } else { 
          return {
            id: item.id,
            description: item.name || item.item,
            category: `${item.metalType} ${item.purity || ''}`,
            price: item.price || 0,
            transaction_type: item.transaction_type || 'buy',
            originalItem: item 
          };
        }
      });
      
      // Store items in localStorage for persistence
      const existingItems = JSON.parse(localStorage.getItem('pending_ticket_items') || '[]');
      localStorage.setItem('pending_ticket_items', JSON.stringify([...existingItems, ...ticketItems]));
      
      // Clear the current estimated items
      if (tabValue === 0) {
        setEstimatedScrapItems([]);
      } else {
        setEstimatedCoinItems([]);
      }
      
      if (ticketItems.length > 0) {
        setSnackbarOpen(true);
        setSnackbarMessage(`${ticketItems.length} item(s) added to ticket`);
        setSnackbarSeverity('success');
        
        // Navigate to customer ticket after a short delay - only use navigation state
        setTimeout(() => {
          navigate('/customer-ticket', { 
            state: { 
              from: 'coinsBullions',
              addedItems: ticketItems // Pass the items directly in the navigation state
            } 
          });
        }, 500); // Short delay so the user can see the snackbar
      } else {
        setSnackbarOpen(true);
        setSnackbarMessage('No valid items to add to ticket');
        setSnackbarSeverity('warning');
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error adding items to ticket:', error);
      setSnackbarOpen(true);
      setSnackbarMessage('Error adding items to ticket');
      setSnackbarSeverity('error');
      setIsLoading(false);
    }
  };
  
  const handleProceedToCheckout = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSnackbarOpen(true);
      setSnackbarMessage('Proceeding to checkout');
      setSnackbarSeverity('success');
      // Navigate to checkout (implementation can be updated later)
      // history.push('/checkout');
    }, 1000);
  };

  const handleDeleteConfirm = (id, type) => {
    setItemToDelete({ id, type });
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteEstimatedItem = (id, type) => {
    if (type === 'scrap') {
      setEstimatedScrapItems(prev => prev.filter(item => item.id !== id));
    } else if (type === 'coin') {
      setEstimatedCoinItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch metal spot prices
        const pricesResponse = await axios.get(`${config.apiUrl}/metal-values`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMetalSpotPrices(pricesResponse.data);

        // Fetch inventory items
        const inventoryResponse = await axios.get(`${config.apiUrl}/inventory/coins-bullions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Split into scrap metal and coins/bullions
        const scrap = inventoryResponse.data.filter(item => item.type === 'scrap');
        const coins = inventoryResponse.data.filter(item => item.type !== 'scrap');
        
        setScrapMetalItems(scrap);
        setCoinsBullions(coins);
      } catch (error) {
        console.error('Error fetching data:', error);
        setSnackbarOpen(true);
        setSnackbarMessage('Error fetching inventory data');
        setSnackbarSeverity('error');
      }
    };

    fetchData();
  }, [token]);

  return (
    <Container maxWidth="lg">
      <StyledPaper>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            aria-label="inventory tabs"
            variant="fullWidth"
            sx={{ maxWidth: 600, mx: 'auto' }}
          >
            <Tab 
              label="Scrap Metal"
              sx={{ 
                width: '275px', 
                textAlign: 'center',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}
            />
            <Tab 
              label="Coins & Bullions"
              sx={{ 
                width: '275px', 
                textAlign: 'center',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}
            />
          </Tabs>
        </Box>

        {/* Scrap Metal Tab Content */}
        {tabValue === 0 && (
          <Box sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <FormSection sx={{ mb: 1 }}>
                    {/* Header with Metal Type and Add Item button */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ mr: 2 }}>Metal Type *</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {metalTypes.map((type) => (
                            <MetalTypeChip
                              key={type}
                              label={type}
                              onClick={() => setFormData({ ...formData, metalType: type })}
                              selected={formData.metalType === type}
                            />
                          ))}
                        </Box>
                      </Box>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<AddIcon />}
                      >
                        Add Item
                      </Button>
                    </Box>
                    
                    <Grid container spacing={2}>
                      {/* Left side - Form fields */}
                      <Grid item xs={12} sm={6}>
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        <TextField
                          size="small"
                          label="Purity"
                          name="purity"
                          value={formData.purity}
                          onChange={handleChange}
                          placeholder="e.g., 999, 24K"
                          margin="dense"
                          fullWidth
                          InputLabelProps={{
                            style: { textAlign: 'left' },
                            shrink: true,
                            sx: { left: 0 }
                          }}
                          sx={{
                            '& .MuiInputBase-input': {
                              textAlign: 'left',
                              paddingLeft: '0px'
                            },
                            '& .MuiFormLabel-root': {
                              left: 0
                            },
                            '& .MuiInputLabel-root': {
                              left: 0
                            }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          size="small"
                          label="Weight"
                          name="weight"
                          value={formData.weight}
                          onChange={handleChange}
                          type="number"
                          InputProps={{
                            endAdornment: <InputAdornment position="end">g</InputAdornment>,
                          }}
                          InputLabelProps={{
                            shrink: true,
                            sx: { left: 0 }
                          }}
                          margin="dense"
                          fullWidth
                          sx={{
                            '& .MuiInputBase-input': {
                              textAlign: 'left',
                              paddingLeft: '0px'
                            },
                            '& .MuiFormLabel-root': {
                              left: 0
                            },
                            '& .MuiInputLabel-root': {
                              left: 0
                            }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          size="small"
                          label="Price/g"
                          name="pricePerGram"
                          value={formData.pricePerGram}
                          onChange={handleChange}
                          type="number"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          InputLabelProps={{
                            shrink: true,
                            sx: { left: 0 }
                          }}
                          margin="dense"
                          fullWidth
                          sx={{
                            '& .MuiInputBase-input': {
                              textAlign: 'left',
                              paddingLeft: '0px'
                            },
                            '& .MuiFormLabel-root': {
                              left: 0
                            },
                            '& .MuiInputLabel-root': {
                              left: 0
                            }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          size="small"
                          label="Est. Value"
                          name="estimatedValue"
                          value={formData.estimatedValue}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            readOnly: true,
                          }}
                          InputLabelProps={{
                            shrink: true,
                            sx: { left: 0 }
                          }}
                          margin="dense"
                          fullWidth
                          sx={{
                            '& .MuiInputBase-input': {
                              textAlign: 'left',
                              paddingLeft: '0px'
                            },
                            '& .MuiFormLabel-root': {
                              left: 0
                            },
                            '& .MuiInputLabel-root': {
                              left: 0
                            }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          size="small"
                          label="Description"
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          multiline
                          rows={2}
                          margin="dense"
                          fullWidth
                          InputProps={{
                          }}
                          InputLabelProps={{
                            shrink: true,
                            sx: { left: 0 }
                          }}
                          sx={{
                            '& .MuiInputBase-input': {
                              textAlign: 'left',
                              paddingLeft: '0px'
                            },
                            '& .MuiFormLabel-root': {
                              left: 0
                            },
                            '& .MuiInputLabel-root': {
                              left: 0
                            }
                          }}
                        />
                      </Grid>
                    </Grid>
                      </Grid>
                      {/* Right side - Image controls */}
                      <Grid item xs={12} sm={6}>
                    {/* Container with relative positioning */}
                    <Box sx={{ position: 'relative' }}>  
                      {/* Buttons in their original position */}
                      <Box sx={{ display: 'flex', gap: 1, mt: 10 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<CloudUpload />}
                          onClick={() => fileInputRef.current.click()}
                        >
                          Upload
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleImageUpload}
                          multiple
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PhotoCamera />}
                          onClick={handleCameraOpen}
                        >
                          Photo
                        </Button>
                      </Box>
                      {/* Images positioned to overlay the buttons */}
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: 0.5, 
                          position: 'absolute',
                          top: '-120px',
                          left: 0,
                          zIndex: 1
                        }}
                      >
                        {images.map((img, index) => (
                          <ItemImageThumbnail
                            key={index}
                            src={img.preview}
                            isPrimary={img.isPrimary}
                            onDelete={() => removeImage(index)}
                            onSetPrimary={() => setAsPrimaryImage(index)}
                          />
                        ))}
                      </Box>
                    </Box>
                      </Grid>
                    </Grid>
                  </FormSection>
                </Grid>
              </Grid>
            </form>

      {scrapMetalItems.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Inventory Items
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <BlackTableHeader>Image</BlackTableHeader>
                  <BlackTableHeader>Type</BlackTableHeader>
                  <BlackTableHeader>Info</BlackTableHeader>
                  <BlackTableHeader>Value</BlackTableHeader>
                  <BlackTableHeader>Actions</BlackTableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {scrapMetalItems.map((item) => (
                  <StyledTableRow key={item.id}>
                    <StyledTableCell sx={{ p: 0.5 }}>
                      {item.image && (
                        <img 
                          src={item.image} 
                          alt={item.metalType}
                          style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '2px' }}
                        />
                      )}
                    </StyledTableCell>
                    <StyledTableCell sx={{ p: 0.5 }}>{item.metalType}</StyledTableCell>
                    <StyledTableCell sx={{ p: 0.5 }}>{item.purity}, {item.weight}g</StyledTableCell>
                    <StyledTableCell sx={{ p: 0.5 }}>${item.estimatedValue}</StyledTableCell>
                    <StyledTableCell sx={{ p: 0, width: '60px' }}>
                      <IconButton size="small" onClick={() => handleEditItem(item, 'scrap')}>
                        <EditIcon sx={{ fontSize: '0.9rem' }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteEstimatedItem(item.id, 'scrap')}>
                        <DeleteIcon sx={{ fontSize: '0.9rem' }} />
                      </IconButton>
                    </StyledTableCell>
                  </StyledTableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      
      {/* Estimated Items Block for Scrap Metal */}
      <Box sx={{ mt: 2, mb: 1 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
          Estimated Items
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Image</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Transaction Type</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {estimatedScrapItems.map((item) => (
                <StyledTableRow key={`estimate-${item.id}`}>
                  <StyledTableCell>
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.metalType}
                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    )}
                  </StyledTableCell>
                  <StyledTableCell>
                    <Typography variant="body2"><strong>{item.metalType}</strong></Typography>
                    <Typography variant="caption" color="textSecondary">
                      {item.purity}, {item.weight}g
                    </Typography>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Select
                      size="small"
                      value={item.transaction_type || 'buy'}
                      onChange={(e) => {
                        const updatedItems = [...estimatedScrapItems];
                        const index = updatedItems.findIndex(i => i.id === item.id);
                        updatedItems[index] = {...updatedItems[index], transaction_type: e.target.value};
                        setEstimatedScrapItems(updatedItems);
                      }}
                      sx={{ minWidth: 100 }}
                    >
                      <MenuItem value="buy">Buy</MenuItem>
                      <MenuItem value="pawn">Pawn</MenuItem>
                    </Select>
                  </StyledTableCell>
                  <StyledTableCell>
                    {editingItemId === item.id ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          sx={{ width: '100px' }}
                          autoFocus
                        />
                        <IconButton size="small" color="primary" onClick={() => handleSaveEditedPrice(item.id, 'scrap')}>
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={handleCancelEdit}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Typography variant="body2">
                        ${parseFloat(item.estimatedValue).toFixed(2)}
                      </Typography>
                    )}
                  </StyledTableCell>
                  <StyledTableCell>
                    <Box sx={{ display: 'flex' }}>
                      <IconButton size="small" color="primary" onClick={() => handleEditEstimatedItem(item, 'scrap')}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteEstimatedItem(item.id, 'scrap')}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Action buttons after estimated items */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleAddToTicket}
            disabled={isLoading || estimatedScrapItems.length === 0}
          >
            Add to Ticket
          </Button>
          <Button 
            variant="contained" 
            color="secondary"
            onClick={handleProceedToCheckout}
            disabled={isLoading || estimatedScrapItems.length === 0}
          >
            Proceed to Checkout
          </Button>
        </Box>
      </Box>
    </Box>
  )}

        {/* Coins & Bullions Tab Content */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <FormSection sx={{ mb: 1 }}>
                    {/* Metal Type row spanning full width */}
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="subtitle2" sx={{ mr: 2 }}>Metal Type</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 0.5 }}>
                              {metalTypes.map((metal) => (
                                <MetalTypeChip
                                  key={metal}
                                  label={metal.charAt(0).toUpperCase() + metal.slice(1)}
                                  onClick={() => handleMetalTypeSelect(metal)}
                                  selected={formData.metalType === metal}
                                />
                              ))}
                            </Box>
                          </Box>
                          <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={<AddIcon />}
                          >
                            Add Item
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                    
                    {/* Form fields in two columns with aligned rows */}
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      {/* Left column */}
                      <Grid item xs={12} sm={6}>
                        <Grid container direction="column" spacing={1}>
                          <Grid item>
                            <TextField
                              size="small"
                              label="Name"
                              name="item"
                              value={formData.item}
                              onChange={handleChange}
                              required
                              margin="dense"
                              fullWidth
                            />
                          </Grid>
                          <Grid item>
                            <TextField
                              size="small"
                              label="Serial Number"
                              name="serialNumber"
                              value={formData.serialNumber}
                              onChange={handleChange}
                              margin="dense"
                              fullWidth
                            />
                          </Grid>
                          <Grid item>
                            <TextField
                              size="small"
                              label="Year"
                              name="year"
                              type="number"
                              value={formData.year}
                              onChange={handleChange}
                              margin="dense"
                              fullWidth
                            />
                          </Grid>
                          <Grid item>
                            <TextField
                              size="small"
                              label="Grade"
                              name="grade"
                              value={formData.grade}
                              onChange={handleChange}
                              margin="dense"
                              fullWidth
                            />
                          </Grid>
                          <Grid item>
                            <TextField
                              size="small"
                              label="Description"
                              name="description"
                              value={formData.description}
                              onChange={handleChange}
                              multiline
                              rows={2}
                              margin="dense"
                              fullWidth
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                      
                      {/* Right column */}
                      <Grid item xs={12} sm={6}>
                        {/* Empty space for better positioning */}
                        <Box sx={{ mb: 2 }}></Box>
                        
                        {/* Image upload and thumbnails */}
                        <Box sx={{ position: 'relative' }}>
                          {/* Buttons in their original position */}
                          <Box sx={{ display: 'flex', gap: 1, mt: 4 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<CloudUpload />}
                              onClick={() => fileInputRef.current.click()}
                            >
                              Upload
                            </Button>
                            <input
                              type="file"
                              ref={fileInputRef}
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={handleImageUpload}
                              multiple
                            />
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PhotoCamera />}
                              onClick={handleCameraOpen}
                            >
                              Photo
                            </Button>
                          </Box>
                          
                          {/* Images positioned to overlay the buttons */}
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              flexWrap: 'wrap', 
                              gap: 0.5, 
                              position: 'absolute',
                              top: '-120px',
                              left: 0,
                              zIndex: 1
                            }}
                          >
                            {images.map((img, index) => (
                              <ItemImageThumbnail
                                key={index}
                                src={img.preview}
                                isPrimary={img.isPrimary}
                                onDelete={() => removeImage(index)}
                                onSetPrimary={() => setAsPrimaryImage(index)}
                              />
                            ))}
                          </Box>
                        </Box>
                        
                        {/* Form fields */}
                        <Grid container direction="column" spacing={1}>
                          <Grid item>
                            <TextField
                              size="small"
                              label="Quantity"
                              name="quantity"
                              type="number"
                              value={formData.quantity}
                              onChange={handleChange}
                              margin="dense"
                              fullWidth
                            />
                          </Grid>
                          <Grid item>
                            <TextField
                              size="small"
                              label="Price"
                              name="price"
                              type="number"
                              value={formData.price}
                              onChange={handleChange}
                              margin="dense"
                              InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                              }}
                              fullWidth
                            />
                          </Grid>
                          <Grid item>
                            <TextField
                              size="small"
                              label="Premium ($)"
                              name="premiumDollar"
                              type="number"
                              value={formData.premiumDollar}
                              onChange={handleChange}
                              margin="dense"
                              InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                              }}
                              fullWidth
                            />
                          </Grid>
                          <Grid item>
                            <TextField
                              size="small"
                              label="Premium (%)"
                              name="premiumPercent"
                              type="number"
                              value={formData.premiumPercent}
                              onChange={handleChange}
                              margin="dense"
                              InputProps={{
                                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                              }}
                              fullWidth
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  </FormSection>
                </Grid>
              </Grid>
            </form>

            {coinsBullions.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Coin & Bullion Inventory
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
            <TableHead>
              <TableRow>
                <BlackTableHeader>Image</BlackTableHeader>
                <BlackTableHeader>Name</BlackTableHeader>
                <BlackTableHeader>Metal Type</BlackTableHeader>
                <BlackTableHeader>Purity</BlackTableHeader>
                <BlackTableHeader>Weight</BlackTableHeader>
                <BlackTableHeader>Price</BlackTableHeader>
                <BlackTableHeader>Actions</BlackTableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {coinsBullions.map((item) => (
                <StyledTableRow key={item.id}>
                  <StyledTableCell>
                    {item.image && (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    )}
                  </StyledTableCell>
                  <StyledTableCell>{item.name}</StyledTableCell>
                  <StyledTableCell>{item.metalType}</StyledTableCell>
                  <StyledTableCell>{item.purity}</StyledTableCell>
                  <StyledTableCell>{item.weight}oz</StyledTableCell>
                  <StyledTableCell>${item.price}</StyledTableCell>
                  <StyledTableCell>
                    <IconButton size="small" onClick={() => handleEditItem(item, 'coin')}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteEstimatedItem(item.id, 'coin')}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
            )}
            
            {/* Estimated Items Block for Coins & Bullions */}
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                Estimated Items
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Image</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Transaction Type</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {estimatedCoinItems.map((item) => (
                      <StyledTableRow key={`estimate-${item.id}`}>
                        <StyledTableCell>
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                          )}
                        </StyledTableCell>
                        <StyledTableCell>
                          <Typography variant="body2"><strong>{item.name}</strong></Typography>
                          <Typography variant="caption" color="textSecondary">
                            {item.metalType}, {item.purity}, {item.weight}oz
                          </Typography>
                        </StyledTableCell>
                        <StyledTableCell>
                          <Select
                            size="small"
                            value={item.transaction_type || 'buy'}
                            onChange={(e) => {
                              const updatedItems = [...estimatedCoinItems];
                              const index = updatedItems.findIndex(i => i.id === item.id);
                              updatedItems[index] = {...updatedItems[index], transaction_type: e.target.value};
                              setEstimatedCoinItems(updatedItems);
                            }}
                            sx={{ minWidth: 100 }}
                          >
                            <MenuItem value="buy">Buy</MenuItem>
                            <MenuItem value="pawn">Pawn</MenuItem>
                          </Select>
                        </StyledTableCell>
                        <StyledTableCell>
                          {editingItemId === item.id ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <TextField
                                size="small"
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                }}
                                sx={{ width: '100px' }}
                                autoFocus
                              />
                              <IconButton size="small" color="primary" onClick={() => handleSaveEditedPrice(item.id, 'coin')}>
                                <CheckIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={handleCancelEdit}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ) : (
                            <Typography variant="body2">
                              ${parseFloat(item.price || 0).toFixed(2)}
                            </Typography>
                          )}
                        </StyledTableCell>
                        <StyledTableCell>
                          <Box sx={{ display: 'flex' }}>
                            <IconButton size="small" color="primary" onClick={() => handleEditEstimatedItem(item, 'coin')}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteEstimatedItem(item.id, 'coin')}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </StyledTableCell>
                      </StyledTableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {/* Action buttons after estimated items */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleAddToTicket}
                  disabled={isLoading || estimatedCoinItems.length === 0}
                >
                  Add to Ticket
                </Button>
                <Button 
                  variant="contained" 
                  color="secondary"
                  onClick={handleProceedToCheckout}
                  disabled={isLoading || estimatedCoinItems.length === 0}
                >
                  Proceed to Checkout
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </StyledPaper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this item?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              console.log('Deleting item:', itemToDelete);
              setDeleteDialogOpen(false);
            }} 
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>


    </Container>
  );
}

export default CoinsBullions;
