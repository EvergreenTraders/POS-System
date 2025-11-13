import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Typography,
  Paper,
  Select,
  MenuItem,
  IconButton,
  Alert,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  Tooltip,
  Tab,
  Tabs,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentIcon from '@mui/icons-material/Payment';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import HistoryIcon from '@mui/icons-material/History';
import PrintIcon from '@mui/icons-material/Print';
import axios from 'axios';
import config from '../config';
import { useAuth } from '../context/AuthContext';

const Layaway = () => {
  const API_BASE_URL = config.apiUrl;
  const location = useLocation();
  const { user: currentUser } = useAuth();

  // State management
  const [layaways, setLayaways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState('overdue');

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedLayaway, setSelectedLayaway] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    customer_id: '',
    item_id: '',
    total_price: '',
    down_payment: '',
    payment_frequency: 'WEEKLY',
    payment_amount: '',
    next_payment_date: '',
    notes: '',
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'CASH',
    notes: '',
  });

  // Determine current view from URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/layaways') {
      setCurrentView('overdue');
    } else if (path === '/layaways/past-due') {
      setCurrentView('past-due');
    } else if (path === '/layaways/active') {
      setCurrentView('active');
    } else if (path === '/layaways/no-activity') {
      setCurrentView('no-activity');
    } else if (path === '/layaways/no-payment') {
      setCurrentView('no-payment');
    } else if (path === '/layaways/locate') {
      setCurrentView('locate');
    } else if (path === '/layaways/reporting') {
      setCurrentView('reporting');
    }
  }, [location]);

  // Fetch layaways based on view
  const fetchLayaways = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/layaways?view=${currentView}`);
      setLayaways(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching layaways:', err);
      setError('Failed to load layaways. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayaways();
  }, [currentView]);

  const handleOpenCreateDialog = () => {
    setOpenCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
    setFormData({
      customer_id: '',
      item_id: '',
      total_price: '',
      down_payment: '',
      payment_frequency: 'WEEKLY',
      payment_amount: '',
      next_payment_date: '',
      notes: '',
    });
  };

  const handleCreateLayaway = async () => {
    try {
      await axios.post(`${API_BASE_URL}/layaways`, {
        ...formData,
        employee_id: currentUser?.id || 1,
      });
      handleCloseCreateDialog();
      fetchLayaways();
    } catch (err) {
      console.error('Error creating layaway:', err);
      setError('Failed to create layaway');
    }
  };

  const handleOpenPaymentDialog = (layaway) => {
    setSelectedLayaway(layaway);
    setOpenPaymentDialog(true);
  };

  const handleClosePaymentDialog = () => {
    setOpenPaymentDialog(false);
    setSelectedLayaway(null);
    setPaymentData({
      amount: '',
      payment_method: 'CASH',
      notes: '',
    });
  };

  const handleMakePayment = async () => {
    if (!selectedLayaway) return;

    try {
      await axios.post(`${API_BASE_URL}/layaways/${selectedLayaway.layaway_id}/payment`, {
        ...paymentData,
        received_by: currentUser?.id || 1,
      });
      handleClosePaymentDialog();
      fetchLayaways();
    } catch (err) {
      console.error('Error making payment:', err);
      setError('Failed to process payment');
    }
  };

  const handleContact = async (layaway) => {
    try {
      await axios.post(`${API_BASE_URL}/layaways/${layaway.layaway_id}/contact`, {
        performed_by: currentUser?.id || 1,
      });
      fetchLayaways();
    } catch (err) {
      console.error('Error updating contact:', err);
      setError('Failed to update contact date');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'OVERDUE':
        return 'error';
      case 'COMPLETED':
        return 'info';
      case 'CANCELLED':
        return 'default';
      case 'DEFAULTED':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'overdue':
        return 'Layaways Overdue';
      case 'past-due':
        return 'Past Payment Due Date';
      case 'active':
        return 'All Active Layaways';
      case 'no-activity':
        return 'Contacted But No Activity';
      case 'no-payment':
        return 'No Payment in 30 Days';
      case 'locate':
        return 'Locate Layaways';
      case 'reporting':
        return 'Ad Hoc Reporting';
      default:
        return 'Layaways';
    }
  };

  const filteredLayaways = layaways.filter((layaway) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      layaway.first_name?.toLowerCase().includes(searchLower) ||
      layaway.last_name?.toLowerCase().includes(searchLower) ||
      layaway.item_id?.toLowerCase().includes(searchLower) ||
      layaway.phone_number?.includes(searchTerm) ||
      String(layaway.layaway_id).includes(searchTerm)
    );
  });

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {getViewTitle()}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            variant="outlined"
            placeholder="Search layaways..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ width: 300 }}
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
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            New Layaway
          </Button>
        </Box>
      </Box>

      {/* Statistics Dashboard */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Paper sx={{ flex: 1, p: 2, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
            Total Layaways
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {filteredLayaways.length}
          </Typography>
        </Paper>

        <Paper sx={{ flex: 1, p: 2, bgcolor: 'success.main', color: 'white' }}>
          <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
            Total Value
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {formatCurrency(
              filteredLayaways.reduce((sum, l) => sum + parseFloat(l.total_price || 0), 0)
            )}
          </Typography>
        </Paper>

        <Paper sx={{ flex: 1, p: 2, bgcolor: 'warning.main', color: 'white' }}>
          <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
            Balance Remaining
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {formatCurrency(
              filteredLayaways.reduce((sum, l) => sum + parseFloat(l.balance_remaining || 0), 0)
            )}
          </Typography>
        </Paper>

        <Paper sx={{ flex: 1, p: 2, bgcolor: 'error.main', color: 'white' }}>
          <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
            Overdue Items
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {filteredLayaways.filter((l) => l.status === 'OVERDUE').length}
          </Typography>
        </Paper>
      </Box>

      {/* Layaways Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Item ID</TableCell>
                <TableCell>Total Price</TableCell>
                <TableCell>Balance</TableCell>
                <TableCell>Next Payment</TableCell>
                {currentView === 'overdue' && <TableCell>Overdue Days</TableCell>}
                {currentView === 'no-activity' && <TableCell>Days Since Contact</TableCell>}
                {currentView === 'no-payment' && <TableCell>Last Payment</TableCell>}
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLayaways.length > 0 ? (
                filteredLayaways.map((layaway) => (
                  <TableRow key={layaway.layaway_id}>
                    <TableCell>{layaway.layaway_id}</TableCell>
                    <TableCell>
                      {layaway.first_name} {layaway.last_name}
                    </TableCell>
                    <TableCell>{layaway.phone_number}</TableCell>
                    <TableCell>{layaway.item_id}</TableCell>
                    <TableCell>{formatCurrency(layaway.total_price)}</TableCell>
                    <TableCell>{formatCurrency(layaway.balance_remaining)}</TableCell>
                    <TableCell>{formatDate(layaway.next_payment_date)}</TableCell>
                    {currentView === 'overdue' && <TableCell>{layaway.overdue_days} days</TableCell>}
                    {currentView === 'no-activity' && (
                      <TableCell>{layaway.days_since_contact} days</TableCell>
                    )}
                    {currentView === 'no-payment' && (
                      <TableCell>{formatDate(layaway.last_payment_date)}</TableCell>
                    )}
                    <TableCell>
                      <Chip label={layaway.status} color={getStatusColor(layaway.status)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Make Payment">
                          <IconButton size="small" onClick={() => handleOpenPaymentDialog(layaway)}>
                            <PaymentIcon fontSize="small" color="primary" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Mark as Contacted">
                          <IconButton size="small" onClick={() => handleContact(layaway)}>
                            <ContactPhoneIcon fontSize="small" color="success" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View History">
                          <IconButton size="small">
                            <HistoryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>
                      No layaways found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Layaway Dialog */}
      <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Layaway</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Customer ID"
              type="number"
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Item ID"
              value={formData.item_id}
              onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Total Price"
              type="number"
              value={formData.total_price}
              onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
              fullWidth
              required
              inputProps={{ step: '0.01' }}
            />
            <TextField
              label="Down Payment"
              type="number"
              value={formData.down_payment}
              onChange={(e) => setFormData({ ...formData, down_payment: e.target.value })}
              fullWidth
              inputProps={{ step: '0.01' }}
            />
            <FormControl fullWidth>
              <InputLabel>Payment Frequency</InputLabel>
              <Select
                value={formData.payment_frequency}
                label="Payment Frequency"
                onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })}
              >
                <MenuItem value="WEEKLY">Weekly</MenuItem>
                <MenuItem value="BI_WEEKLY">Bi-Weekly</MenuItem>
                <MenuItem value="MONTHLY">Monthly</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Payment Amount"
              type="number"
              value={formData.payment_amount}
              onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
              fullWidth
              inputProps={{ step: '0.01' }}
            />
            <TextField
              label="Next Payment Date"
              type="date"
              value={formData.next_payment_date}
              onChange={(e) => setFormData({ ...formData, next_payment_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button onClick={handleCreateLayaway} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={openPaymentDialog} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Make Payment</DialogTitle>
        <DialogContent>
          {selectedLayaway && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Customer: {selectedLayaway.first_name} {selectedLayaway.last_name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Balance: {formatCurrency(selectedLayaway.balance_remaining)}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Payment Amount"
              type="number"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
              fullWidth
              required
              inputProps={{ step: '0.01' }}
            />
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentData.payment_method}
                label="Payment Method"
                onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="CARD">Card</MenuItem>
                <MenuItem value="CHECK">Check</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Notes"
              value={paymentData.notes}
              onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog}>Cancel</Button>
          <Button onClick={handleMakePayment} variant="contained" color="primary">
            Process Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Layaway;
