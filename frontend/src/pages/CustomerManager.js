import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Grid, Snackbar,
  Alert, IconButton, List, ListItem, ListItemText, Divider, CircularProgress
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import config from '../config';

const CustomerManager = () => {
  const [customers, setCustomers] = useState([]);
  const [quoteExpirationConfig, setQuoteExpirationConfig] = useState({ days: 30 });
  const [searchForm, setSearchForm] = useState({
    firstName: '',
    lastName: ''
  });
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
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
    notes: ''
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSearchDialog, setOpenSearchDialog] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      showSnackbar(error.message, 'error');
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
    if (!searchForm.firstName && !searchForm.lastName) {
      showSnackbar('Please enter at least first name or last name', 'warning');
      return;
    }

    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        firstName: searchForm.firstName.trim(),
        lastName: searchForm.lastName.trim()
      }).toString();
      
      const response = await fetch(`${config.apiUrl}/customers/search?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
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

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          status: 'active',
          created_at: new Date().toISOString(),
          // Let database triggers handle quote expiration for registered customers
          expires_in: formData.isGuest ? quoteExpirationConfig.days : null,
          days_remaining: formData.isGuest ? quoteExpirationConfig.days : null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save customer');
      }

      const savedCustomer = await response.json();
      setSelectedCustomer(savedCustomer);
      handleCloseDialog();
      fetchCustomers();
    } catch (error) {
      showSnackbar(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
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
      id_expiry_date: customer.id_expiry_date || '',
      id_issuing_authority: customer.id_issuing_authority || '',
      date_of_birth: customer.date_of_birth || '',
      status: customer.status || 'active',
      risk_level: customer.risk_level || 'normal',
      notes: customer.notes || ''
    });
    setOpenDialog(true);
  };

  const handleAdd = () => {
    setSelectedCustomer(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
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
      notes: ''
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
    // Ensure proper quote expiration tracking
    const selectedCustomer = {
      ...customer,
      created_at: new Date().toISOString(),
      // Quote expiration will be set by database trigger from quote_expiration table
      expires_in: null,
      days_remaining: null,
      status: 'active'
    };
    
    setSelectedCustomer(selectedCustomer);
    handleEdit(selectedCustomer);
    showSnackbar(`Selected ${customer.first_name} ${customer.last_name}`, 'success');
    handleCloseSearchDialog();
  };

  const handleRegisterNew = () => {
    // Create new customer with system-configured quote expiration
    const newCustomer = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      status: 'active',
      created_at: new Date().toISOString(),
      // Quote expiration will be set by database trigger
      expires_in: null,
      days_remaining: null
    };
    
    setSelectedCustomer(newCustomer);
    handleEdit(newCustomer);
    handleCloseSearchDialog();
  };

  const handleProceedAsGuest = () => {
    // Create a temporary guest customer with quote expiration from system config
    const guestCustomer = {
      id: `guest_${Date.now()}`, // Unique ID for tracking
      first_name: 'Guest',
      last_name: 'Customer',
      isGuest: true,
      status: 'active',
      // Quote expiration fields from system config
      expires_in: quoteExpirationConfig.days,
      days_remaining: quoteExpirationConfig.days,
      created_at: new Date().toISOString(),
      // Empty fields for guest
      email: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      notes: `Guest customer`
    };

    setSelectedCustomer(guestCustomer);
    handleEdit(guestCustomer);
    showSnackbar(`Proceeding as guest customer`, 'info');
    handleCloseSearchDialog();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Search Form */}
      <Paper sx={{ p: 2, mb: 3, maxWidth: 400, mx: 'auto' }}>
        <Typography variant="h6" gutterBottom align="center">
          Customer Lookup
        </Typography>
        <Grid container spacing={2} direction="column">
          <Grid item xs={12}>
            <TextField
              name="firstName"
              label="First Name"
              value={searchForm.firstName}
              onChange={handleInputChange}
              fullWidth
              error={!searchForm.firstName && !searchForm.lastName}
              helperText={!searchForm.firstName && !searchForm.lastName ? 'Enter first name or last name' : ''}
              placeholder="Enter first name"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="lastName"
              label="Last Name"
              value={searchForm.lastName}
              onChange={handleInputChange}
              fullWidth
              error={!searchForm.firstName && !searchForm.lastName}
              helperText={!searchForm.firstName && !searchForm.lastName ? 'Enter first name or last name' : ''}
              placeholder="Enter last name"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSearch}
              fullWidth
              disabled={loading || (!searchForm.firstName && !searchForm.lastName)}
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
          <Grid item xs={12}>
            <Divider>OR</Divider>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleRegisterNew}
              fullWidth
              sx={{ height: '48px' }}
            >
              Register New Customer
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="text"
              onClick={handleProceedAsGuest}
              fullWidth
              sx={{ height: '48px' }}
            >
              Continue as Guest
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Customer List */}
      {/* <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{`${customer.first_name} ${customer.last_name}`}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.status}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(customer)} size="small">
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer> */}

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
                    helperText={!formData.isGuest && !formData.email ? 'Email is required for registered customers' : ''}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="phone"
                    label="Phone"
                    value={formData.phone || ''}
                    onChange={handleFormChange}
                    fullWidth
                  />
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
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="address_line2"
                    label="Address Line 2"
                    value={formData.address_line2 || ''}
                    onChange={handleFormChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="city"
                    label="City"
                    value={formData.city || ''}
                    onChange={handleFormChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="state"
                    label="State"
                    value={formData.state || ''}
                    onChange={handleFormChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="postal_code"
                    label="Postal Code"
                    value={formData.postal_code || ''}
                    onChange={handleFormChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="country"
                    label="Country"
                    value={formData.country || ''}
                    onChange={handleFormChange}
                    fullWidth
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
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="id_number"
                    label="ID Number"
                    value={formData.id_number || ''}
                    onChange={handleFormChange}
                    fullWidth
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
    </Container>
  );
};

export default CustomerManager;
