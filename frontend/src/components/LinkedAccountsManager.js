import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Alert,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import {
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import config from '../config';
import axios from 'axios';

const API_BASE_URL = config.apiUrl;

const LinkedAccountsManager = ({ customerId, customerName, open, onClose }) => {
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  const [allCustomers, setAllCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [linkType, setLinkType] = useState('full_access');
  const [notes, setNotes] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  useEffect(() => {
    if (open && customerId) {
      fetchLinkedAccounts();
    }
  }, [open, customerId]);

  const fetchLinkedAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/customers/${customerId}/linked-accounts`);
      setLinkedAccounts(response.data);
    } catch (err) {
      console.error('Error fetching linked accounts:', err);
      setError('Failed to load linked accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCustomers = async () => {
    setLoadingCustomers(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/customers`);

      if (!response.data || !Array.isArray(response.data)) {
        console.error('Invalid response format:', response.data);
        setError('Invalid data received from server');
        setAllCustomers([]);
        return;
      }

      // Filter out the current customer
      const filtered = response.data.filter(c => c.id !== parseInt(customerId));
      setAllCustomers(filtered);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers for linking: ' + (err.message || 'Unknown error'));
      setAllCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleOpenLinkDialog = () => {
    setSelectedCustomer(null);
    setLinkType('full_access');
    setNotes('');
    setAllCustomers([]);
    setOpenLinkDialog(true);
    // Fetch customers after dialog opens
    setTimeout(() => fetchAllCustomers(), 100);
  };

  const handleCloseLinkDialog = () => {
    setOpenLinkDialog(false);
    setSelectedCustomer(null);
    setLinkType('full_access');
    setNotes('');
    setError(null);
  };

  const handleCreateLink = async () => {
    if (!selectedCustomer) {
      setError('Please select a customer to link');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await axios.post(`${API_BASE_URL}/customers/${customerId}/link-account`, {
        linked_customer_id: selectedCustomer.id,
        link_type: linkType,
        notes: notes
      });

      await fetchLinkedAccounts();
      handleCloseLinkDialog();
    } catch (err) {
      console.error('Error creating link:', err);
      setError(err.response?.data?.error || 'Failed to create account link');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async (linkId) => {
    if (!window.confirm('Are you sure you want to unlink this account?')) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/customers/account-links/${linkId}`);
      await fetchLinkedAccounts();
    } catch (err) {
      console.error('Error deleting link:', err);
      setError('Failed to unlink account');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (link) => {
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/customers/account-links/${link.id}`, {
        is_active: !link.is_active
      });
      await fetchLinkedAccounts();
    } catch (err) {
      console.error('Error toggling link:', err);
      setError('Failed to update account link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Linked Accounts for {customerName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Link other customer accounts to allow this customer to access their transactions.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenLinkDialog}
                disabled={loading}
              >
                Link Account
              </Button>
            </Box>

            {loading && !linkedAccounts.length ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : linkedAccounts.length === 0 ? (
              <Alert severity="info">
                No linked accounts. Click "Link Account" to add one.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Link Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {linkedAccounts.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell>{link.linked_customer_name}</TableCell>
                        <TableCell>{link.linked_customer_email || 'N/A'}</TableCell>
                        <TableCell>{link.linked_customer_phone || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip
                            label={link.link_type}
                            size="small"
                            color={link.link_type === 'full_access' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={link.is_active ? 'Active' : 'Inactive'}
                            size="small"
                            color={link.is_active ? 'success' : 'default'}
                            onClick={() => handleToggleActive(link)}
                            sx={{ cursor: 'pointer' }}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(link.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteLink(link.id)}
                            disabled={loading}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {linkedAccounts.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Total linked accounts: {linkedAccounts.length}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Link Account Dialog */}
      <Dialog open={openLinkDialog} onClose={handleCloseLinkDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Link Customer Account</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              {loadingCustomers ? 'Loading customers...' : `${allCustomers.length} customers available`}
            </Typography>

            <Autocomplete
              fullWidth
              options={allCustomers}
              getOptionLabel={(option) => {
                if (!option) return '';
                return `${option.first_name} ${option.last_name} - ${option.email || option.phone || 'No contact'}`;
              }}
              value={selectedCustomer}
              onChange={(event, newValue) => {
                setSelectedCustomer(newValue);
              }}
              onInputChange={(event, value, reason) => {
                console.log('Input changed:', value, 'Reason:', reason);
              }}
              loading={loadingCustomers}
              disabled={loadingCustomers}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Customer to Link"
                  required
                  placeholder="Type to search by name, email or phone"
                  helperText="Search by typing the customer's name, email, or phone number"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingCustomers ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              noOptionsText={loadingCustomers ? "Loading..." : (allCustomers.length === 0 ? "No customers available" : "No matching customers")}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Link Type</InputLabel>
              <Select
                value={linkType}
                label="Link Type"
                onChange={(e) => setLinkType(e.target.value)}
              >
                <MenuItem value="full_access">Full Access</MenuItem>
                <MenuItem value="view_only">View Only</MenuItem>
                <MenuItem value="limited">Limited</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this account link..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLinkDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateLink}
            disabled={loading || !selectedCustomer}
          >
            {loading ? <CircularProgress size={20} /> : 'Link Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LinkedAccountsManager;
