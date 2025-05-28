import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Typography, Box, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Grid, Snackbar,
  Alert, IconButton, List, ListItem, ListItemText, Divider, CircularProgress,
  Chip, FormControl, InputLabel, Select, MenuItem, Accordion, AccordionSummary,
  AccordionDetails, Pagination, FormControlLabel, Checkbox
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, FilterList as FilterListIcon, 
  ExpandMore as ExpandMoreIcon, Clear as ClearIcon } from '@mui/icons-material';
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
  // Define all state variables first
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { setCustomer, addToCart, cartItems } = useCart();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10); // Showing 10 customers per page
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    risk_level: '',
    date_created_from: '',
    date_created_to: '',
    id_type: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });
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

  // Camera effect
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

  // Fetch customers on component mount or when page/filters change
  useEffect(() => {
    fetchCustomers(filters);
  }, [page, rowsPerPage]);
  
  // Apply client-side filtering when filters change but not on initial load
  useEffect(() => {
    if (customers.length > 0) {
      applyLocalFilters();
    }
  }, [filters, customers]);

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

  // State declarations have been moved to the beginning of the component

  const fetchCustomers = async (filterParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters from filters
      const params = new URLSearchParams();
      
      // Add filter parameters if they have values
      if (filterParams.status) params.append('status', filterParams.status);
      if (filterParams.risk_level) params.append('risk_level', filterParams.risk_level);
      if (filterParams.date_created_from) params.append('created_from', filterParams.date_created_from);
      if (filterParams.date_created_to) params.append('created_to', filterParams.date_created_to);
      if (filterParams.id_type) params.append('id_type', filterParams.id_type);
      
      // Add sorting parameters
      if (filterParams.sort_by) params.append('sort_by', filterParams.sort_by);
      if (filterParams.sort_order) params.append('sort_order', filterParams.sort_order);
      
      // Add pagination parameters
      params.append('page', page);
      params.append('limit', rowsPerPage);
      
      const queryString = params.toString();
      const url = queryString ? `${config.apiUrl}/customers?${queryString}` : `${config.apiUrl}/customers`;
      
      const response = await fetch(url);
      console.log('Response:', response);
      if (!response.ok) throw new Error('Failed to fetch customers');
      
      const data = await response.json();
      
      // Check if response contains pagination info
      if (data.customers && data.total_pages) {
        setCustomers(data.customers);
        setFilteredCustomers(data.customers);
        setTotalPages(data.total_pages);
      } else {
        // Handle response without pagination (for backward compatibility)
        setCustomers(data);
        setFilteredCustomers(data);
        setTotalPages(Math.ceil(data.length / rowsPerPage));
      }
    } catch (error) {
      setError('Failed to load customers. Please try again.');
      showSnackbar(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Apply client-side filtering if backend filtering is not available
  const applyLocalFilters = () => {
    let result = [...customers];
    
    // Apply status filter
    if (filters.status) {
      result = result.filter(customer => customer.status === filters.status);
    }
    
    // Apply risk level filter
    if (filters.risk_level) {
      result = result.filter(customer => customer.risk_level === filters.risk_level);
    }
    
    // Apply date range filters
    if (filters.date_created_from) {
      const fromDate = new Date(filters.date_created_from);
      result = result.filter(customer => new Date(customer.created_at) >= fromDate);
    }
    
    if (filters.date_created_to) {
      const toDate = new Date(filters.date_created_to);
      toDate.setHours(23, 59, 59, 999); // End of day
      result = result.filter(customer => new Date(customer.created_at) <= toDate);
    }
    
    // Apply ID type filter
    if (filters.id_type) {
      result = result.filter(customer => customer.id_type === filters.id_type);
    }
    
    // Apply sorting
    if (filters.sort_by) {
      result.sort((a, b) => {
        let aValue = a[filters.sort_by];
        let bValue = b[filters.sort_by];
        
        // Handle dates
        if (filters.sort_by === 'created_at' || filters.sort_by === 'updated_at') {
          aValue = new Date(aValue || 0).getTime();
          bValue = new Date(bValue || 0).getTime();
        }
        
        // Handle strings
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return filters.sort_order === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        // Handle numbers and dates
        return filters.sort_order === 'asc' ? aValue - bValue : bValue - aValue;
      });
    }
    
    // Set filtered customers with all matching results
    setFilteredCustomers(result);
    
    // Calculate total pages
    setTotalPages(Math.ceil(result.length / rowsPerPage));
    
    // Reset to first page when filters change
    if (page > 1 && Math.ceil(result.length / rowsPerPage) < page) {
      setPage(1);
    }
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: '',
      risk_level: '',
      date_created_from: '',
      date_created_to: '',
      id_type: '',
      sort_by: 'created_at',
      sort_order: 'desc'
    });
  };

  // Handle pagination change
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1); // Reset to first page when changing rows per page
  };
  
  // Get current page of customers
  const getCurrentPageCustomers = () => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredCustomers.slice(startIndex, endIndex);
  };

  // Apply filters - determine whether to use server-side or client-side filtering
  const applyFilters = () => {
    // Try to use server-side filtering first
    fetchCustomers(filters);
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

      {/* Filter Panel */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Accordion expanded={filterOpen} onChange={() => setFilterOpen(!filterOpen)}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterListIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle1">Customer Filters</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="status-filter-label">Status</InputLabel>
                  <Select
                    labelId="status-filter-label"
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    label="Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="risk-level-filter-label">Risk Level</InputLabel>
                  <Select
                    labelId="risk-level-filter-label"
                    name="risk_level"
                    value={filters.risk_level}
                    onChange={handleFilterChange}
                    label="Risk Level"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="id-type-filter-label">ID Type</InputLabel>
                  <Select
                    labelId="id-type-filter-label"
                    name="id_type"
                    value={filters.id_type}
                    onChange={handleFilterChange}
                    label="ID Type"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="Passport">Passport</MenuItem>
                    <MenuItem value="Driver's License">Driver's License</MenuItem>
                    <MenuItem value="National ID">National ID</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="sort-by-filter-label">Sort By</InputLabel>
                  <Select
                    labelId="sort-by-filter-label"
                    name="sort_by"
                    value={filters.sort_by}
                    onChange={handleFilterChange}
                    label="Sort By"
                  >
                    <MenuItem value="created_at">Date Created</MenuItem>
                    <MenuItem value="last_name">Last Name</MenuItem>
                    <MenuItem value="first_name">First Name</MenuItem>
                    <MenuItem value="status">Status</MenuItem>
                    <MenuItem value="risk_level">Risk Level</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="sort-order-filter-label">Sort Order</InputLabel>
                  <Select
                    labelId="sort-order-filter-label"
                    name="sort_order"
                    value={filters.sort_order}
                    onChange={handleFilterChange}
                    label="Sort Order"
                  >
                    <MenuItem value="asc">Ascending</MenuItem>
                    <MenuItem value="desc">Descending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  name="date_created_from"
                  label="Created From"
                  type="date"
                  value={filters.date_created_from}
                  onChange={handleFilterChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  name="date_created_to"
                  label="Created To"
                  type="date"
                  value={filters.date_created_to}
                  onChange={handleFilterChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} display="flex" justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={clearFilters}
                  sx={{ mr: 1 }}
                >
                  Clear Filters
                </Button>
                <Button
                  variant="contained"
                  startIcon={<FilterListIcon />}
                  onClick={applyFilters}
                >
                  Apply Filters
                </Button>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Customer Table */}
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1 } }}>
          <TableHead>
            <TableRow>
              <TableCell>Image</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>ID Number</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Risk Level</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getCurrentPageCustomers().map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  {customer.image ? (
                    <Box
                      component="img"
                      src={typeof customer.image === 'object' && customer.image.type === 'Buffer' 
                        ? bufferToDataUrl(customer.image) 
                        : customer.image}
                      alt={`${customer.first_name} ${customer.last_name}`}
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid #ccc'
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #ccc',
                        color: '#999',
                        fontSize: '0.7rem'
                      }}
                    >
                      {customer.first_name && customer.last_name ? 
                        `${customer.first_name[0]}${customer.last_name[0]}` : 'NA'}
                    </Box>
                  )}
                </TableCell>
                <TableCell>{`${customer.first_name} ${customer.last_name}`}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.id_number}</TableCell>
                <TableCell>
                  <Chip 
                    label={customer.status} 
                    color={customer.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={customer.risk_level} 
                    color={
                      customer.risk_level === 'high' ? 'error' : 
                      customer.risk_level === 'normal' ? 'primary' : 'success'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(customer)} size="small">
                    <EditIcon />
                  </IconButton>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    Select
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredCustomers.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No customers found
                </TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
            {filteredCustomers.length > 0 ? 
              `Showing ${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, filteredCustomers.length)} of ${filteredCustomers.length} customers` : 
              'No customers found'}
          </Typography>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="rows-per-page-label">Per Page</InputLabel>
            <Select
              labelId="rows-per-page-label"
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
              label="Per Page"
            >
              <MenuItem value={8}>8</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Pagination 
          count={totalPages} 
          page={page} 
          onChange={handlePageChange} 
          color="primary" 
          showFirstButton 
          showLastButton
          size="medium"
          siblingCount={1}
        />
      </Box>

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
