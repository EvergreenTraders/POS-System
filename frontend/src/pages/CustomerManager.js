import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Typography, Box, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Grid, Snackbar,
  Alert, IconButton, List, ListItem, ListItemText, Divider, CircularProgress,
  Chip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import config from '../config';

// Converts a Buffer-like object (from backend) to a base64 data URL for image preview
function bufferToDataUrl(bufferObj) {
  if (!bufferObj || !bufferObj.data) return null;
  const base64 = btoa(
    new Uint8Array(bufferObj.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  // Default to jpeg, you may adjust if your backend provides type info
  return `data:image/jpeg;base64,${base64}`;
}

const CustomerManager = () => {
  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // State for customer lookup mode
  useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    // Cleanup on unmount
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line
  }, [showCamera]);

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Unable to access camera.');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `customer-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFormData(prev => ({ ...prev, image: file }));
        setShowCamera(false);
      }
    }, 'image/jpeg', 0.9);
  };

  const navigate = useNavigate();
  const location = useLocation();
  const { setCustomer, addToCart, cartItems } = useCart();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [quoteExpirationConfig, setQuoteExpirationConfig] = useState({ days: 30 });
  const [searchForm, setSearchForm] = useState({
    name: '',
    id_number: '',
    phone: ''
  });
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    image: null, // Add image to formData
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    id_type: '',
    id_number: '',
    id_expiry_date: '',
    id_issuing_authority: '',
    date_of_birth: '',
    status: 'active',
    risk_level: 'normal',
    notes: '',
    gender: '',
    height: '',
    weight: ''
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSearchDialog, setOpenSearchDialog] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${config.apiUrl}/customers`);
      console.log('Response:', response);
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      setError('Failed to load customers. Please try again.');
      showSnackbar(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchForm.name && !searchForm.id_number && !searchForm.phone) {
      showSnackbar('Please enter at least one search criteria', 'warning');
      return;
    }

    setLoading(true);
    try {
      // If name is provided, send as 'name' param; backend should split for first/last
      // Only include non-empty fields in query params
      const params = {};
      // Always trim and allow partial id_number search
      if (searchForm.name && searchForm.name.trim()) params.name = searchForm.name.trim();
      if (searchForm.id_number && searchForm.id_number.trim()) params.id_number = searchForm.id_number.trim();
      if (searchForm.phone && searchForm.phone.trim()) params.phone = searchForm.phone.trim();
      const queryParams = new URLSearchParams(params).toString();
      
      const response = await fetch(`${config.apiUrl}/customers/search?${queryParams}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to search customers');
      
      const data = await response.json();
      setSearchResults(data);
      setOpenSearchDialog(true);

      if (data.length === 0) {
        showSnackbar('No customers found. You can register a new customer or proceed as guest.', 'info');
      }
    } catch (error) {
      showSnackbar(`Error searching customers: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name) {
      showSnackbar('First name and last name are required', 'error');
      return;
    }

    try {
      setLoading(true);
      const method = selectedCustomer?.id ? 'PUT' : 'POST';
      const url = selectedCustomer?.id 
        ? `${config.apiUrl}/customers/${selectedCustomer.id}`
        : `${config.apiUrl}/customers`;

      // Prepare FormData for multipart upload
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // For image, always append the File object
          if (key === 'image' && value instanceof File) {
            data.append('image', value);
          } else {
            data.append(key, value);
          }
        }
      });

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
          // Note: Do NOT set Content-Type, browser will set it for FormData
        },
        body: data
      });

      if (!response.ok) {
        throw new Error('Failed to save customer');
      }

      const savedCustomer = await response.json();
      setSelectedCustomer(savedCustomer);
      setCustomer(savedCustomer); // Save to CartContext

      // If we have items in location state, add them to cart context and navigate
      if (location.state?.items?.length > 0) {
      //  location.state.items.forEach(item => addToCart(item));
        navigate('/checkout', { 
          state: { 
            from: location.state.from || 'customer'
          }
        });
      }

      handleCloseDialog();
     // fetchCustomers();
    } catch (error) {
      showSnackbar(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (customer) => {
    setSelectedCustomer(customer);
    // Ensure date fields are formatted as YYYY-MM-DD for date input
    const formatDate = (date) => {
      if (!date) return '';
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) return date;
      const d = new Date(date);
      if (isNaN(d)) return '';
      return d.toISOString().substring(0, 10);
    };

    // Utility to fetch image as File
    const urlToFile = async (url, filename = 'customer-photo.jpg') => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        // Try to infer mime type from blob or fallback
        const mime = blob.type || 'image/jpeg';
        return new File([blob], filename, { type: mime });
      } catch (e) {
        return null;
      }
    };

    let imageValue = null;
    if (customer.image && typeof customer.image === 'object' && customer.image.type === 'Buffer') {
      imageValue = bufferToDataUrl(customer.image);
    } else if (typeof customer.image === 'string' && customer.image.startsWith('http')) {
      // Download image and convert to File
      imageValue = await urlToFile(customer.image, `customer-photo-${customer.id || Date.now()}.jpg`);
    } else {
      imageValue = customer.image || null;
    }

    setFormData({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address_line1: customer.address_line1 || '',
      address_line2: customer.address_line2 || '',
      city: customer.city || '',
      state: customer.state || '',
      postal_code: customer.postal_code || '',
      country: customer.country || '',
      id_type: customer.id_type || '',
      id_number: customer.id_number || '',
      id_expiry_date: formatDate(customer.id_expiry_date),
      date_of_birth: formatDate(customer.date_of_birth),
      status: customer.status || 'active',
      risk_level: customer.risk_level || 'normal',
      notes: customer.notes || '',
      gender: customer.gender || '',
      height: customer.height || '',
      weight: customer.weight || '',
      image: imageValue
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCustomer(null);
    setFormData({});
  };

  const handleCloseSearchDialog = () => {
    setOpenSearchDialog(false);
    setSearchResults([]);
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const formatDateForApi = (date) => {
    return date ? new Date(date).toISOString().split('T')[0] : null;
  };

  const handleSelectCustomer = (customer) => {
    const selectedCustomer = {
      id: customer.id,
      name: `${customer.first_name} ${customer.last_name}`,
      email: customer.email,
      phone: customer.phone,
      created_at: new Date().toISOString(),
      status: 'active'
    };
    
    setCustomer(selectedCustomer); // Save to CartContext
    setSelectedCustomer(selectedCustomer);
    
    // If we have items in location state, add them to cart context and navigate
    if (location.state?.items?.length > 0) {
    //  location.state.items.forEach(item => addToCart(item));
      navigate('/checkout', { 
        state: { 
          from: location.state.from || 'customer'
        }
      });
    }
    
    showSnackbar(`Selected ${customer.first_name} ${customer.last_name}`, 'success');
    handleCloseSearchDialog();
  };

  const handleRegisterNew = () => {
    const newCustomer = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      status: 'active',
      created_at: new Date().toISOString(),
      image: '' // New image field
    };
    
    setCustomer(newCustomer); // Save to CartContext
    setSelectedCustomer(newCustomer);
    handleEdit(newCustomer);
    handleCloseSearchDialog();
  };

  const handleProceedAsGuest = () => {
    const guestCustomer = {
      id: `guest_${Date.now()}`,
      name: 'Guest Customer',
      isGuest: true,
      status: 'active',
      created_at: new Date().toISOString(),
      email: '',
      phone: ''
    };

    setCustomer(guestCustomer); // Save to CartContext
    setSelectedCustomer(guestCustomer);
    
    // If we have items in location state, add them to cart context and navigate
    if (location.state?.items?.length > 0) {
      location.state.items.forEach(item => addToCart(item));
      navigate('/checkout', { 
        state: { 
          from: location.state.from || 'customer'
        }
      });
    }
    
    showSnackbar('Proceeding as guest customer', 'info');
    handleCloseSearchDialog();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Customer Management
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleRegisterNew}
            sx={{ mr: 1 }}
          >
            Add New Customer
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <TableContainer sx={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
            <Table stickyHeader aria-label="customers table" size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Contact Info</TableCell>
                  <TableCell>ID Information</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {customer.image ? (
                            <Box
                              component="img"
                              src={typeof customer.image === 'object' && customer.image.type === 'Buffer' 
                                ? bufferToDataUrl(customer.image) 
                                : customer.image}
                              alt={`${customer.first_name} ${customer.last_name}`}
                              sx={{ width: 40, height: 40, borderRadius: '50%', mr: 1.5, objectFit: 'cover' }}
                              onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                            />
                          ) : (
                            <Box
                              sx={{ 
                                width: 40, 
                                height: 40, 
                                borderRadius: '50%', 
                                mr: 1.5, 
                                bgcolor: 'primary.main', 
                                color: 'white', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontSize: '1rem',
                                fontWeight: 'bold'
                              }}
                            >
                              {customer.first_name?.[0]}{customer.last_name?.[0]}
                            </Box>
                          )}
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {customer.first_name} {customer.last_name}
                            </Typography>
                            {customer.risk_level && customer.risk_level !== 'normal' && (
                              <Chip 
                                label={customer.risk_level.toUpperCase()} 
                                size="small" 
                                color={customer.risk_level === 'high' ? 'error' : 'warning'}
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {customer.phone ? (
                            <Box component="span" sx={{ display: 'block' }}>
                              <strong>Phone:</strong> {customer.phone}
                            </Box>
                          ) : null}
                          {customer.email ? (
                            <Box component="span" sx={{ display: 'block' }}>
                              <strong>Email:</strong> {customer.email}
                            </Box>
                          ) : null}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {customer.id_number ? (
                            <Box component="span" sx={{ display: 'block' }}>
                              <strong>ID:</strong> {customer.id_number}
                            </Box>
                          ) : null}
                          {customer.date_of_birth ? (
                            <Box component="span" sx={{ display: 'block' }}>
                              <strong>DOB:</strong> {new Date(customer.date_of_birth).toLocaleDateString()}
                            </Box>
                          ) : null}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={customer.status ? customer.status.toUpperCase() : 'ACTIVE'}
                          size="small"
                          color={customer.status === 'inactive' ? 'error' : 'success'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEdit(customer)}
                          title="Edit customer"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <Button 
                          size="small" 
                          variant="contained" 
                          color="primary"
                          sx={{ ml: 1 }}
                          onClick={() => handleSelectCustomer(customer)}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body1" color="text.secondary">
                        No customers found. Add a new customer to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Search Results Dialog */}
      <Dialog
        open={openSearchDialog}
        onClose={handleCloseSearchDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {searchResults.length > 0 ? 'Search Results' : 'No Customers Found'}
        </DialogTitle>
        <DialogContent>
          {searchResults.length > 0 ? (
            <List>
              {searchResults.map((customer, index) => (
                <React.Fragment key={customer.id}>
                  <ListItem 
                    button 
                    onClick={() => handleSelectCustomer(customer)}
                    sx={{
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': {
                        backgroundColor: '#f5f5f5'
                      }
                    }}
                  >
                    <ListItemText
                      primary={`${customer.first_name} ${customer.last_name}`}
                      secondary={
                        <React.Fragment>
                          <Typography component="div" variant="body2" color="text.primary">
                            {customer.email && `Email: ${customer.email}`}
                            {customer.phone && customer.email && ' • '}
                            {customer.phone && `Phone: ${customer.phone}`}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ ml: 2 }}
                      onClick={() => handleEdit(customer)}
                    >
                      Edit
                    </Button>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No customers found matching your search criteria.
              </Typography>
              <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleRegisterNew}
                    fullWidth
                    sx={{ height: '48px' }}
                  >
                    Register New Customer
                  </Button>
                  <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 1 }}>
                    Registered customer quotes are managed by database triggers based on system configuration
                  </Typography>
                </Box>
                <Box>
                  <Button
                    variant="outlined"
                    onClick={handleProceedAsGuest}
                    fullWidth
                    sx={{ height: '48px' }}
                  >
                    Continue as Guest
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSearchDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Customer Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedCustomer?.id ? 'Edit Customer' : 'Register New Customer'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
               <Grid container spacing={2}>
                {/* Image Capture/Upload on the left, spans 2 rows */}
                <Grid item xs={12} sm={3} md={3} sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-start' }}>
                  {formData.image ? (
  <Box sx={{ position: 'relative', width: '100%' }}>
    <img
      src={
        formData.image instanceof File || formData.image instanceof Blob
          ? URL.createObjectURL(formData.image)
          : typeof formData.image === 'string'
            ? formData.image
            : undefined
      }
      alt="Preview"
      style={{
        maxWidth: '100%',
        maxHeight: 180,
        objectFit: 'cover',
        width: '100%',
        height: 180,
        display: 'block',
        borderRadius: 8,
        border: '1px solid #e0e0e0',
      }}
    />
    <Button
      variant="text"
      sx={{
        position: 'absolute',
        bottom: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2,
        width: '70%',
        minWidth: 140,
        minHeight: 36,
        padding: '5px 0',
        background: 'rgba(255,255,255,0.80)',
        color: '#222',
        fontWeight: 600,
        fontSize: 16,
        lineHeight: 1.2,
        textTransform: 'none',
        border: '1.5px solid #e0e0e0',
        borderRadius: 10,
        boxShadow: '0 2px 12px 0 rgba(0,0,0,0.08)',
        transition: 'background 0.2s, color 0.2s',
        '&:hover': {
          background: 'rgba(255,255,255,0.95)',
          color: '#111',
        },
        '&:active': {
          background: 'rgba(240,240,240,1)',
          color: '#1976d2',
        },
      }}
      onClick={() => setShowCamera(true)}
    >
      Retake Photo
    </Button>
  </Box>
) : (
  <Button
    variant="outlined"
    fullWidth
    sx={{
      mt: 1, mb: 1,
      minHeight: 180,
      fontSize: 20,
      py: 3,
      px: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textTransform: 'none',
      position: 'relative',
      overflow: 'hidden',
    }}
    onClick={() => setShowCamera(true)}
  >
    Capture Photo
  </Button>
)}

{/* Camera Dialog */}
<Dialog open={showCamera} onClose={() => { stopCamera(); setShowCamera(false); }} maxWidth="xs" fullWidth>
  <DialogTitle>Capture Photo</DialogTitle>
  <DialogContent>
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: '100%', maxHeight: 240, background: '#222', borderRadius: 8 }}
      />
      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        onClick={captureImage}
      >
        Capture
      </Button>
    </Box>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => { stopCamera(); setShowCamera(false); }}>Cancel</Button>
  </DialogActions>
</Dialog>
                </Grid>
                {/* Main Fields on the right */}
                <Grid item xs={12} sm={9} md={9}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        name="first_name"
                        label="First Name"
                        value={formData.first_name || ''}
                        onChange={handleFormChange}
                        fullWidth
                        required
                        error={!formData.first_name}
                        helperText={!formData.first_name ? 'First name is required' : ''}
                        margin="dense"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        name="last_name"
                        label="Last Name"
                        value={formData.last_name || ''}
                        onChange={handleFormChange}
                        fullWidth
                        required
                        error={!formData.last_name}
                        helperText={!formData.last_name ? 'Last name is required' : ''}
                        margin="dense"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        name="email"
                        label="Email"
                        type="email"
                        value={formData.email || ''}
                        onChange={handleFormChange}
                        fullWidth
                        required={!formData.isGuest}
                        error={!formData.isGuest && !formData.email}
                        helperText={!formData.isGuest && !formData.email ? 'Email is required' : ''}
                        margin="dense"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        name="phone"
                        label="Phone Number"
                        value={formData.phone || ''}
                        onChange={handleFormChange}
                        fullWidth
                        margin="dense"
                      />
                    </Grid>
                  </Grid>
                </Grid>
                {/* Address Fields */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Address Information
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="address_line1"
                    label="Address Line 1"
                    value={formData.address_line1 || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="address_line2"
                    label="Address Line 2"
                    value={formData.address_line2 || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="city"
                    label="City"
                    value={formData.city || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="state"
                    label="State"
                    value={formData.state || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="postal_code"
                    label="Postal Code"
                    value={formData.postal_code || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="country"
                    label="Country"
                    value={formData.country || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                {/* ID Fields */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Identification Information
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="id_type"
                    label="ID Type"
                    value={formData.id_type || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="id_number"
                    label="ID Number"
                    value={formData.id_number || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="id_expiry_date"
                    label="ID Expiry Date"
                    type="date"
                    value={formData.id_expiry_date || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="id_issuing_authority"
                    label="ID Issuing Authority"
                    value={formData.id_issuing_authority || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="date_of_birth"
                    label="Date of Birth"
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="notes"
                    label="Notes"
                    value={formData.notes || ''}
                    onChange={handleFormChange}
                    fullWidth
                    multiline
                    rows={4}
                    margin="dense"
                  />
                </Grid>
              </Grid>
              {/* New fields: Gender, Height, Weight */}
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  name="gender"
                  label="Gender"
                  value={formData.gender || ''}
                  onChange={handleFormChange}
                  fullWidth
                  margin="dense"
                  SelectProps={{ native: true }}
                >
                  <option value=""></option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  name="height"
                  label="Height (cm)"
                  type="number"
                  value={formData.height || ''}
                  onChange={handleFormChange}
                  fullWidth
                  margin="dense"
                  inputProps={{ min: 0, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  name="weight"
                  label="Weight (kg)"
                  type="number"
                  value={formData.weight || ''}
                  onChange={handleFormChange}
                  fullWidth
                  margin="dense"
                  inputProps={{ min: 0, step: 0.1 }}
                />
              </Grid>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={loading || !formData.first_name || !formData.last_name || (!formData.isGuest && !formData.email)}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                <span>{selectedCustomer?.id ? 'Saving...' : 'Creating...'}</span>
              </Box>
            ) : (
              selectedCustomer?.id ? 'Save Changes' : 'Create Customer'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CustomerManager;
