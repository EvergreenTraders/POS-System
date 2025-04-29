import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Grid, Paper, List, ListItem, ListItemText, Divider, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, IconButton, CircularProgress, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Container
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import config from '../config';

const messages = [
  { type: 'announcement', text: 'Easter Promotion starts today – click for details' },
  { type: 'incoming text', text: "+1 (506)455-1234: I’ll be in tomorrow to pay" },
  { type: 'email', text: 'From: joe@gmail.com Subject: E-transfer Sent' },
  { type: 'facebook', text: 'From: facebook_user – Can you give me a quote on the following items that I would...' },
  { type: 'web', text: 'From: I want to sell gold | “I have 3 rings I want to sell.”' },
  { type: 'website', text: 'New online sale WEB-S876511 in for in-store pickup' }
];

const tasks = [
  '5 Items to be located',
  '2 Online orders to fill (1 is in-store pickup)',
  '23 Loans to be pulled',
  '12 Buys to expire',
  '87 Items to be priced',
  '31 Items to be marked down',
  '18 Loans to call',
  '7 Layaways overdue',
  '3 Returns to process',
  '"Remerchandise the laptop cabinet"',
  '"Ask 5 customers for reviews"'
];

const loansDue = [
  { id: 'TSD-P123456', name: 'Joe Smith', due: '$29/$1029 – 10k 4.5g YG ring, Dewalt DW-123 Drill, other stuff...' },
  { id: 'TSD-L456789', name: 'Bob Smith', due: '$50/$450 – Dell PC model 112345' },
  { id: 'TSD-L456789', name: 'Bob Smith', due: '$50/$450 – Dell PC model 112345' },
];

// Converts a Buffer-like object (from backend) to a base64 data URL for image preview
function bufferToDataUrl(bufferObj) {
  if (!bufferObj || !bufferObj.data) return null;
  const base64 = btoa(
    new Uint8Array(bufferObj.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  // Default to jpeg, you may adjust if your backend provides type info
  return `data:image/jpeg;base64,${base64}`;
}

const Home = () => {
  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [currentCaptureMode, setCurrentCaptureMode] = useState('customer'); // 'customer', 'id_front', or 'id_back'
  // Hover state for search results dialog
  const [hoveredCustomerIdx, setHoveredCustomerIdx] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  // Helper function to convert dataURL to File object (moved from handleEdit scope to component scope)
  const urlToFile = async (url, filename = 'customer-photo.jpg') => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const mime = blob.type || 'image/jpeg';
      return new File([blob], filename, { type: mime });
    } catch (e) { return null; }
  };

  // Start camera when dialog opens
  useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
    // eslint-disable-next-line
  }, [showCamera]);

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
        // Create different filenames based on capture mode
        const filename = `${currentCaptureMode}-${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });
        
        // Update the appropriate form field based on capture mode
        if (currentCaptureMode === 'id_front') {
          setFormData(prev => ({ ...prev, id_image_front: file }));
        } else if (currentCaptureMode === 'id_back') {
          setFormData(prev => ({ ...prev, id_image_back: file }));
        } else {
          // Default to customer photo
          setFormData(prev => ({ ...prev, image: file }));
        }
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
  const [searchForm, setSearchForm] = useState({ name: '', id_number: '', phone: '' });
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', image: null, address_line1: '', address_line2: '', city: '', state: '', postal_code: '', country: '', id_type: '', id_number: '', id_expiry_date: '', id_issuing_authority: '', date_of_birth: '', status: 'active', risk_level: 'normal', notes: '', gender: '', height: '', weight: ''
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSearchDialog, setOpenSearchDialog] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
const [selectedSearchIdx, setSelectedSearchIdx] = useState(0); // for search dialog customer selection
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/customers`);
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      showSnackbar(error.message, 'error');
    }
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchForm(prev => ({ ...prev, [name]: value }));
  };
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchForm.name && !searchForm.id_number && !searchForm.phone) {
      showSnackbar('Please enter at least one search criteria', 'warning');
      return;
    }
    setLoading(true);
    try {
      const params = {};
      if (searchForm.name && searchForm.name.trim()) params.name = searchForm.name.trim();
      if (searchForm.id_number && searchForm.id_number.trim()) params.id_number = searchForm.id_number.trim();
      if (searchForm.phone && searchForm.phone.trim()) params.phone = searchForm.phone.trim();
      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(`${config.apiUrl}/customers/search?${queryParams}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!response.ok) throw new Error('Failed to search customers');
      const data = await response.json();
      setSearchResults(data);
      setOpenSearchDialog(true);
      setSelectedSearchIdx(data.length > 0 ? 0 : -1); // auto-select first
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
    setFormData(prev => ({ ...prev, [name]: value }));
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
      const url = selectedCustomer?.id ? `${config.apiUrl}/customers/${selectedCustomer.id}` : `${config.apiUrl}/customers`;
      const data = new FormData();
      
      // Ensure we preserve existing images when only updating one of them
      if (method === 'PUT' && selectedCustomer) {
        // Check if image fields exist in formData
        const hasImage = formData.image !== undefined;
        const hasIdFront = formData.id_image_front !== undefined;
        const hasIdBack = formData.id_image_back !== undefined;
        
        // If one image is being updated but others aren't in formData, we need to include the existing ones
        if (hasImage || hasIdFront || hasIdBack) {
          // For each image field not being updated, get the existing image from selectedCustomer if available
          if (!hasImage && selectedCustomer.image) {
            const existingImage = await urlToFile(bufferToDataUrl(selectedCustomer.image), 'existing-customer-photo.jpg');
            if (existingImage) formData.image = existingImage;
          }
          
          if (!hasIdFront && selectedCustomer.id_image_front) {
            const existingIdFront = await urlToFile(bufferToDataUrl(selectedCustomer.id_image_front), 'existing-id-front.jpg');
            if (existingIdFront) formData.id_image_front = existingIdFront;
          }
          
          if (!hasIdBack && selectedCustomer.id_image_back) {
            const existingIdBack = await urlToFile(bufferToDataUrl(selectedCustomer.id_image_back), 'existing-id-back.jpg');
            if (existingIdBack) formData.id_image_back = existingIdBack;
          }
        }
      }
      
      // Now process all form data including the preserved images
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if ((key === 'image' || key === 'id_image_front' || key === 'id_image_back') && value instanceof File) {
            // Handle image files properly by appending them with their original key names
            data.append(key, value);
          } else {
            data.append(key, value);
          }
        }
      });
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: data
      });
      if (!response.ok) throw new Error('Failed to save customer');
      const savedCustomer = await response.json();
      setSelectedCustomer(savedCustomer);
      setCustomer(savedCustomer);
      
      // Update the customer in searchResults if it exists there
      if (method === 'PUT' && searchResults.length > 0) {
        const updatedSearchResults = searchResults.map(customer => 
          customer.id === savedCustomer.id ? savedCustomer : customer
        );
        setSearchResults(updatedSearchResults);
      }
      
      if (location.state?.items?.length > 0) {
        navigate('/checkout', { state: { from: location.state.from || 'customer' } });
      }
      handleCloseDialog();
    } catch (error) {
      showSnackbar(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = async (customer) => {
    setSelectedCustomer(customer);
    const formatDate = (date) => {
      if (!date) return '';
      if (typeof date === 'string' && date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) return date;
      const d = new Date(date);
      if (isNaN(d)) return '';
      return d.toISOString().substring(0, 10);
    };
    
    // Process main customer photo
    let imageValue = null;
    if (customer.image && typeof customer.image === 'object' && customer.image.type === 'Buffer') {
      imageValue = bufferToDataUrl(customer.image);
    } else if (typeof customer.image === 'string' && customer.image.startsWith('http')) {
      imageValue = await urlToFile(customer.image, `customer-photo-${customer.id || Date.now()}.jpg`);
    } else {
      imageValue = customer.image || null;
    }
    // Process ID front image
    let idImageFront = null;
    if (customer.id_image_front && typeof customer.id_image_front === 'object') {
      // Handle Buffer type from database
      if (customer.id_image_front.type === 'Buffer' || customer.id_image_front.data) {
        idImageFront = bufferToDataUrl(customer.id_image_front);
      } else {
        idImageFront = customer.id_image_front;
      }
    }
    // Process ID back image
    let idImageBack = null;
    if (customer.id_image_back && typeof customer.id_image_back === 'object') {
      // Handle Buffer type from database
      if (customer.id_image_back.type === 'Buffer' || customer.id_image_back.data) {
        idImageBack = bufferToDataUrl(customer.id_image_back);
      } else {
        idImageBack = customer.id_image_back;
      }
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
      image: imageValue,
      id_image_front: idImageFront,
      id_image_back: idImageBack
    });
    setOpenDialog(true);
  };
  const handleCloseDialog = () => {
    setOpenDialog(false);
    
    // Keep the search dialog open if a customer was just edited
    // and we have search results to show
    if (searchResults.length === 0) {
      // If there are no search results, we can close everything
      setSelectedCustomer(null);
    }
    
    setFormData({});
  };
  const handleCloseSearchDialog = () => {
    setOpenSearchDialog(false);
    setSearchResults([]);
  };
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
  const handleSelectCustomer = (customer) => {
    const selectedCustomer = {
      id: customer.id,
      name: `${customer.first_name} ${customer.last_name}`,
      email: customer.email,
      phone: customer.phone,
      created_at: new Date().toISOString(),
      status: 'active'
    };
    setCustomer(selectedCustomer);
    setSelectedCustomer(selectedCustomer);
    if (location.state?.items?.length > 0) {
      navigate('/checkout', { state: { from: location.state.from || 'customer' } });
    }
    showSnackbar(`Selected ${customer.first_name} ${customer.last_name}`, 'success');
    handleCloseSearchDialog();
  };
  const handleQuickSale = (customer) => {
    const quickSaleCustomer = {
    }
  };
  const handleRegisterNew = () => {
    const newCustomer = { first_name: '', last_name: '', email: '', phone: '', status: 'active', created_at: new Date().toISOString(), image: '' };
    setCustomer(newCustomer);
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
    setCustomer(guestCustomer);
    setSelectedCustomer(guestCustomer);
    if (location.state?.items?.length > 0) {
      location.state.items.forEach(item => addToCart(item));
      navigate('/checkout', { state: { from: location.state.from || 'customer' } });
    }
    showSnackbar('Proceeding as guest customer', 'info');
    handleCloseSearchDialog();
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, minHeight: '100vh' }}>
      {/* Main horizontal layout: left = Customer Lookup, right = main content */}
      <Grid container spacing={3} alignItems="flex-start">
        {/* Left: Customer Lookup */}
        <Grid item xs={12} md={4} lg={3} xl={2}>
          <Paper sx={{ p: 2, mb: 3, maxWidth: 400 }}>
            <Typography variant="h6" gutterBottom align="center">
              Customer Lookup
            </Typography>
            <Grid container spacing={2} direction="column">
              <Grid item xs={12}>
                <TextField
                  name="name"
                  label="Name"
                  value={searchForm.name}
                  onChange={handleInputChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="id_number"
                  label="ID Number"
                  value={searchForm.id_number}
                  onChange={handleInputChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="phone"
                  label="Phone Number"
                  value={searchForm.phone}
                  onChange={handleInputChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSearch}
                  fullWidth
                  disabled={loading || (!searchForm.name && !searchForm.id_number && !searchForm.phone)}
                  sx={{ height: '48px' }}
                >
                  {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                      <CircularProgress size={20} color="inherit" />
                      <span>Searching...</span>
                    </Box>
                  ) : (
                    'Search Customer'
                  )}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        {/* Right: Main content stacked vertically */}
        <Grid item xs={12} md={8} lg={9} xl={8}>
          {/* Search bar on top */}
          <Paper sx={{ p: 2.5, display: 'flex', alignItems: 'center', height: 50, background: '#f5f5f5', boxShadow: 2, borderRadius: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ mr: 2, minWidth: 85, color: 'primary.main' }}>Search:</Typography>
            <TextField
              placeholder="Type to search..."
              variant="standard"
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontSize: 18,
                  width: 620,
                  transition: 'box-shadow 0.2s',
                  '&:focus-within': { boxShadow: 2, background: '#fff' }
                }
              }}
              sx={{ flex: 1, background: 'transparent', borderRadius: 1 }}
            />
          </Paper>
          {/* Info grid line: Sales, Loans, Revenue, Commission */}
          <Paper sx={{ mb: 1.5, p: 1.2, display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e0e4ea', boxShadow: 1, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 2 }}>
              <Typography variant="subtitle2" sx={{ mr: 0.5, color: 'primary.dark' }}>Sales:</Typography>
              <Typography variant="body2" sx={{ mr: 2, color: 'text.secondary' }}>emp/store</Typography>
              <Typography variant="subtitle2" sx={{ mr: 0.5, color: 'primary.dark' }}>Loans:</Typography>
              <Typography variant="body2" sx={{ mr: 2, color: 'text.secondary' }}>emp/store</Typography>
              <Typography variant="subtitle2" sx={{ mr: 0.5, color: 'primary.dark' }}>Revenue:</Typography>
              <Typography variant="body2" sx={{ mr: 2, color: 'text.secondary' }}>emp/store</Typography>
              <Typography variant="subtitle2" sx={{ mr: 0.5, color: 'primary.dark' }}>Commission:</Typography>
            </Box>
          </Paper>

      {/* Quick stats cards */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 1.2, borderRadius: 2, boxShadow: 1, textAlign: 'center', bgcolor: '#fff' }}>
            <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700 }}>Total Customers</Typography>
            <Typography variant="h6">2,384</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 1.2, borderRadius: 2, boxShadow: 1, textAlign: 'center', bgcolor: '#fff' }}>
            <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700 }}>Active Loans</Typography>
            <Typography variant="h6">87</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 1.2, borderRadius: 2, boxShadow: 1, textAlign: 'center', bgcolor: '#fff' }}>
            <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700 }}>Pending Quotes</Typography>
            <Typography variant="h6">14</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 1.2, borderRadius: 2, boxShadow: 1, textAlign: 'center', bgcolor: '#fff' }}>
            <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700 }}>Today's Sales</Typography>
            <Typography variant="h6">$3,245</Typography>
          </Paper>
        </Grid>
      </Grid>
      </Grid>
      {/* END Right main content */}
      <Divider sx={{ mb: 2, borderColor: '#e0e4ea' }} />
      </Grid>
      {/* END Main horizontal layout */}

        {/* Search Results Dialog */}
        <Dialog
          open={openSearchDialog}
          onClose={handleCloseSearchDialog}
          aria-labelledby="customer-search-dialog-title"
          maxWidth={false}
          fullWidth
          PaperProps={{
            sx: {
              width: 800,
              height: 420,
              maxWidth: '100vw',
              maxHeight: '100vh',
              overflow: 'visible',
              position: 'relative'
            }
          }}
        >
          {/* Extreme top-right action bar */}
          {searchResults.length > 0 && (
            <Box sx={{ position: 'absolute', top: 12, right: 20, zIndex: 10, display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={handleRegisterNew}
                sx={{ minWidth: 160 }}
              >
                Register New Customer
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                onClick={handleCloseSearchDialog}
                sx={{ minWidth: 44, px: 1, ml: 1, fontWeight: 700, borderRadius: 2, fontSize: 18, lineHeight: 1, minHeight: 36 }}
              >
                ×
              </Button>
            </Box>
          )}
          <DialogTitle>
            {searchResults.length > 0 ? 'Search Results' : 'No Customers Found'}
          </DialogTitle>
          <DialogContent sx={{ overflow: 'visible' }}>
            {searchResults.length > 0 ? (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', minWidth: 700, gap: 0 }}>
                  {/* Image previews to the left */}
                  <Box sx={{ minWidth: 140, maxWidth: 180, mr: 0, pl: 0, ml: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', pt: 1, gap: 2 }}>
                    {/* Customer Photo */}
                    {searchResults[selectedSearchIdx]?.image && (
                      <Box>
                        <img
                          src={
                            typeof searchResults[selectedSearchIdx].image === 'string'
                              ? searchResults[selectedSearchIdx].image
                              : searchResults[selectedSearchIdx].image instanceof File || searchResults[selectedSearchIdx].image instanceof Blob
                              ? URL.createObjectURL(searchResults[selectedSearchIdx].image)
                              : searchResults[selectedSearchIdx].image && searchResults[selectedSearchIdx].image.data
                              ? bufferToDataUrl(searchResults[selectedSearchIdx].image)
                              : undefined
                          }
                          alt="Customer"
                          style={{
                            width: 120,
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 8,
                            margin: '0 auto',
                            border: '2px solid #4caf50',
                            background: '#fafafa',
                            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
                            display: 'block'
                          }}
                        />
                      </Box>
                    )}
                    
                    {/* ID Image Front */}
                    {searchResults[selectedSearchIdx]?.id_image_front && (
                      <Box>
                        <img
                          src={
                            typeof searchResults[selectedSearchIdx].id_image_front === 'string'
                              ? searchResults[selectedSearchIdx].id_image_front
                              : searchResults[selectedSearchIdx].id_image_front instanceof File || searchResults[selectedSearchIdx].id_image_front instanceof Blob
                              ? URL.createObjectURL(searchResults[selectedSearchIdx].id_image_front)
                              : searchResults[selectedSearchIdx].id_image_front && searchResults[selectedSearchIdx].id_image_front.data
                              ? bufferToDataUrl(searchResults[selectedSearchIdx].id_image_front)
                              : undefined
                          }
                          alt="ID Front"
                          style={{
                            width: 120,
                            height: 100,
                            objectFit: 'cover',
                            borderRadius: 8,
                            margin: '0 auto',
                            border: '2px solid #ff9800',
                            background: '#fafafa',
                            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
                            display: 'block'
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                  {/* Table to the right */}
                  <Box sx={{ flex: 1, position: 'relative', display: 'flex' }}>
                    <TableContainer component={Paper} sx={{ mb: 0, maxHeight: 300, overflowY: 'auto', p: 0, m: 0, flex: '1 1 auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell sx={{ width: 200, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Address</TableCell>
                            <TableCell>Phone</TableCell>
                            <TableCell>ID</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {searchResults.map((customer, index) => (
                            <TableRow
                              key={customer.id}
                              hover
                              selected={selectedSearchIdx === index}
                              sx={{ cursor: 'pointer' }}
                              onClick={() => setSelectedSearchIdx(index)}
                            >
                              <TableCell sx={{ width: 140, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{customer.first_name} {customer.last_name}</TableCell>
                              <TableCell sx={{ width: 200, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{customer.address || customer.address_line1 || ''}</TableCell>
                              <TableCell>{customer.phone || ''}</TableCell>
                              <TableCell>{customer.id_number || ''}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Box>
                
                {/* Action buttons at the bottom of the dialog */}
                {selectedSearchIdx !== null && selectedSearchIdx >= 0 && searchResults[selectedSearchIdx] && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2, mb: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={e => { e.stopPropagation(); handleEdit(searchResults[selectedSearchIdx]); }}
                      sx={{ minWidth: 70 }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={e => { e.stopPropagation(); handleSelectCustomer(searchResults[selectedSearchIdx]); }}
                      sx={{ minWidth: 70 }}
                    >
                      Select
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={e => { e.stopPropagation(); handleQuickSale(searchResults[selectedSearchIdx]); }}
                      sx={{ minWidth: 70 }}
                    >
                      Quick Sale
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ p: 2 }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No customers found matching your search criteria.
                </Typography>
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
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
                            '&:hover': { background: 'rgba(255,255,255,0.95)', color: '#111' },
                            '&:active': { background: 'rgba(240,240,240,1)', color: '#1976d2' },
                          }}
                          onClick={() => {
                            setShowCamera(true);
                            setCurrentCaptureMode('customer');
                          }}
                        >
                          Retake Photo
                        </Button>
                      </Box>
                    ) : (
                      <Button
                        variant="outlined"
                        fullWidth
                        sx={{ mt: 1, mb: 1, minHeight: 180, fontSize: 20, py: 3, px: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textTransform: 'none', position: 'relative', overflow: 'hidden' }}
                        onClick={() => {
                          setShowCamera(true);
                          setCurrentCaptureMode('customer');
                        }}
                      >
                        Capture Photo
                      </Button>
                    )}
                    {/* Camera Dialog */}
                    <Dialog open={showCamera} onClose={() => { stopCamera(); setShowCamera(false); }} maxWidth="xs" fullWidth>
                       <DialogTitle>
                         {currentCaptureMode === 'id_front' ? 'Capture ID Front' : 
                          currentCaptureMode === 'id_back' ? 'Capture ID Back' : 
                          'Capture Customer Photo'}
                       </DialogTitle>
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
                      label="State/Province"
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
                  
                  {/* ID Section - Images and Details Side by Side */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
                      ID Information
                    </Typography>
                  </Grid>
                  
                  {/* Container to hold ID images and details in the same row */}
                  <Grid item xs={12}>
                    <Grid container spacing={2}>
                      {/* Left side: ID images */}
                      <Grid item xs={12} md={6}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {formData.id_image_front ? (
                                <Box sx={{ position: 'relative', width: '100%' }}>
                                  <img
                                    src={
                                      formData.id_image_front instanceof File || formData.id_image_front instanceof Blob
                                        ? URL.createObjectURL(formData.id_image_front)
                                        : typeof formData.id_image_front === 'string'
                                          ? formData.id_image_front
                                          : formData.id_image_front && formData.id_image_front.data
                                            ? bufferToDataUrl(formData.id_image_front)
                                            : undefined
                                    }
                                    alt="ID Front"
                                    style={{
                                      maxWidth: '100%',
                                      height: 150,
                                      objectFit: 'contain',
                                      display: 'block',
                                      borderRadius: 4,
                                      border: '1px solid #e0e0e0',
                                    }}
                                  />
                                  <Button
                                    variant="text"
                                    sx={{
                                      position: 'absolute',
                                      bottom: 8,
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      zIndex: 2,
                                      width: '60%',
                                      minWidth: 80,
                                      minHeight: 32,
                                      padding: '4px 0',
                                      background: 'rgba(255,255,255,0.80)',
                                      color: '#222',
                                      fontWeight: 600,
                                      fontSize: 13,
                                      lineHeight: 1.2,
                                      textTransform: 'none',
                                      border: '1.5px solid #e0e0e0',
                                      borderRadius: 8,
                                      boxShadow: '0 2px 12px 0 rgba(0,0,0,0.08)',
                                      transition: 'background 0.2s, color 0.2s',
                                      '&:hover': { background: 'rgba(255,255,255,0.95)', color: '#111' },
                                      '&:active': { background: 'rgba(240,240,240,1)', color: '#1976d2' },
                                    }}
                                    onClick={() => {
                                      setShowCamera(true);
                                      setCurrentCaptureMode('id_front');
                                    }}
                                  >
                                    Retake Front
                                  </Button>
                                </Box>
                              ) : (
                                <Button
                                  variant="outlined"
                                  fullWidth
                                  sx={{ height: 150 }}
                                  onClick={() => {
                                    setShowCamera(true);
                                    setCurrentCaptureMode('id_front');
                                  }}
                                >
                                  Capture Front
                                </Button>
                              )}
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {formData.id_image_back ? (
                                <Box sx={{ position: 'relative', width: '100%' }}>
                                  <img
                                    src={
                                      formData.id_image_back instanceof File || formData.id_image_back instanceof Blob
                                        ? URL.createObjectURL(formData.id_image_back)
                                        : typeof formData.id_image_back === 'string'
                                          ? formData.id_image_back
                                          : formData.id_image_back && formData.id_image_back.data
                                            ? bufferToDataUrl(formData.id_image_back)
                                            : undefined
                                    }
                                    alt="ID Back"
                                    style={{
                                      maxWidth: '100%',
                                      height: 150,
                                      objectFit: 'contain',
                                      display: 'block',
                                      borderRadius: 4,
                                      border: '1px solid #e0e0e0',
                                    }}
                                  />
                                  <Button
                                    variant="text"
                                    sx={{
                                      position: 'absolute',
                                      bottom: 8,
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      zIndex: 2,
                                      width: '60%',
                                      minWidth: 80,
                                      minHeight: 32,
                                      padding: '2px 0',
                                      background: 'rgba(255,255,255,0.80)',
                                      color: '#222',
                                      fontWeight: 600,
                                      fontSize: 13,
                                      lineHeight: 1.2,
                                      textTransform: 'none',
                                      border: '1.5px solid #e0e0e0',
                                      borderRadius: 8,
                                      boxShadow: '0 2px 12px 0 rgba(0,0,0,0.08)',
                                      transition: 'background 0.2s, color 0.2s',
                                      '&:hover': { background: 'rgba(255,255,255,0.95)', color: '#111' },
                                      '&:active': { background: 'rgba(240,240,240,1)', color: '#1976d2' },
                                    }}
                                    onClick={() => {
                                      setShowCamera(true);
                                      setCurrentCaptureMode('id_back');
                                    }}
                                  >
                                    Retake Back
                                  </Button>
                                </Box>
                              ) : (
                                <Button
                                  variant="outlined"
                                  fullWidth
                                  sx={{ height: 150 }}
                                  onClick={() => {
                                    setShowCamera(true);
                                    setCurrentCaptureMode('id_back');
                                  }}
                                >
                                  Capture Back
                                </Button>
                              )}
                            </Box>
                          </Grid>
                        </Grid>
                      </Grid>
                      
                      {/* Right side: ID details */}
                      <Grid item xs={12} md={6}>
                        <Grid container spacing={2}>
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
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                  {/* Date of birth and physical characteristics in one row */}
                  <Grid item xs={12} sm={3}>
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
                  <Grid item xs={12} sm={3}>
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
                  <Grid item xs={12} sm={3}>
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
                  <Grid item xs={12} sm={3}>
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

      <Grid item xs={12}>
        <Grid container spacing={2}>
        {/* Messages Section */}
        <Grid item xs={12} md={4} lg={4}>
          <Paper sx={{ p: 2, minHeight: 220 }}>
            <Typography variant="h6">Messages</Typography>
            <List dense sx={{ p: 0 }}>
              {messages.map((msg, idx) => (
                <ListItem key={idx} divider={idx < messages.length - 1}>
                  <ListItemText primary={`[${msg.type === 'announcement' ? '09:12' : msg.type === 'incoming text' ? '09:15' : msg.type === 'email' ? '09:16' : msg.type === 'facebook' ? '09:17' : msg.type === 'web' ? '09:18' : '09:20'}] [${msg.type}] ${msg.text}`} secondary={msg.type === 'announcement' ? 'Pinned' : ''} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        {/* Tasks Section */}
        <Grid item xs={12} md={4} lg={4}>
          <Paper sx={{ p: 2, minHeight: 220 }}>
            <Typography variant="h6">Tasks</Typography>
            <List dense sx={{ p: 0 }}>
              {tasks.map((task, idx) => (
                <ListItem key={idx} divider={idx < tasks.length - 1}>
                  <ListItemText primary={task} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        {/* Loans/Layaways Due Today Section */}
        <Grid item xs={12} md={4} lg={4}>
          <Paper sx={{ p: 2, minHeight: 220 }}>
            <Typography variant="h6">Loans/Layaways Due Today</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loansDue.map((loan, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{loan.id}</TableCell>
                      <TableCell>{loan.name}</TableCell>
                      <TableCell>{loan.due}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
      </Grid>
    </Box>
  );
}

export default Home;
