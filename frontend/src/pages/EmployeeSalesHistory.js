import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import config from '../config';

const EmployeeSalesHistory = () => {
  const { employee_id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchSalesHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee_id]);

  const fetchSalesHistory = async (start, end) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (start) params.append('start_date', start);
      if (end) params.append('end_date', end);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${config.apiUrl}/employees/${employee_id}/sales-history${qs}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch sales history');
      setSalesData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchSalesHistory(startDate, endDate);

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    fetchSalesHistory();
  };

  const handleViewTransaction = async (transaction) => {
    setSelectedTransaction(transaction);
    setDetailsDialogOpen(true);
    setLoadingDetails(true);
    try {
      const [itemsRes, paymentsRes] = await Promise.all([
        fetch(`${config.apiUrl}/transactions/${transaction.transaction_id}/items`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch(`${config.apiUrl}/transactions/${transaction.transaction_id}/payments`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);
      if (itemsRes.ok && paymentsRes.ok) {
        const items = await itemsRes.json();
        const paymentsData = await paymentsRes.json();
        setTransactionDetails({ items, payments: paymentsData.payments || [] });
      }
    } catch (err) {
      console.error('Error fetching transaction details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedTransaction(null);
    setTransactionDetails(null);
  };

  const fmt = (amount) => `$${parseFloat(amount || 0).toFixed(2)}`;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Employee Sales History
          {salesData?.employee && (
            <Typography component="span" variant="h5" color="text.secondary" sx={{ ml: 2 }}>
              — {salesData.employee.first_name} {salesData.employee.last_name}
              <Chip label={salesData.employee.role} size="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
            </Typography>
          )}
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} variant="outlined">
          Back
        </Button>
      </Box>

      {/* Date Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="From"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            sx={{ minWidth: 160 }}
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
            onClick={handleSearch}
            disabled={loading}
          >
            Search
          </Button>
          <Button variant="outlined" onClick={handleReset} disabled={loading}>
            Reset
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : salesData && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Total Transactions</Typography>
                  <Typography variant="h5">{salesData.summary.total_transactions}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Total Sales</Typography>
                  <Typography variant="h5" color="success.main">{fmt(salesData.summary.total_sales)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Average Sale</Typography>
                  <Typography variant="h5">{fmt(salesData.summary.avg_sale)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Last Sale Date</Typography>
                  <Typography variant="h5">
                    {salesData.summary.last_sale_date
                      ? new Date(salesData.summary.last_sale_date).toLocaleDateString()
                      : '—'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Transactions Table */}
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Transaction ID</strong></TableCell>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Customer</strong></TableCell>
                    <TableCell><strong>Type(s)</strong></TableCell>
                    <TableCell align="right"><strong>Items</strong></TableCell>
                    <TableCell align="right"><strong>Total Amount</strong></TableCell>
                    <TableCell align="right"><strong>Paid</strong></TableCell>
                    <TableCell><strong>Payment Method(s)</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesData.transactions.length > 0 ? (
                    salesData.transactions.map((tx) => (
                      <TableRow key={tx.transaction_id} hover>
                        <TableCell>{tx.transaction_id}</TableCell>
                        <TableCell>{new Date(tx.transaction_date || tx.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{tx.customer_name || '—'}</Typography>
                          {tx.customer_phone && (
                            <Typography variant="caption" color="text.secondary">{tx.customer_phone}</Typography>
                          )}
                        </TableCell>
                        <TableCell>{tx.transaction_types}</TableCell>
                        <TableCell align="right">{tx.item_count}</TableCell>
                        <TableCell align="right">{fmt(tx.total_amount)}</TableCell>
                        <TableCell align="right">{fmt(tx.total_paid)}</TableCell>
                        <TableCell>{tx.payment_methods}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            startIcon={<ReceiptIcon />}
                            onClick={() => handleViewTransaction(tx)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography variant="body1" color="text.secondary" sx={{ py: 3 }}>
                          No transactions found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {/* Transaction Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Transaction: {selectedTransaction?.transaction_id}
            </Typography>
            <Button onClick={handleCloseDetails} size="small"><CloseIcon /></Button>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2" color="text.secondary">Customer</Typography>
                    <Typography variant="body1">{selectedTransaction?.customer_name || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2" color="text.secondary">Transaction Type(s)</Typography>
                    <Typography variant="body1">{selectedTransaction?.transaction_types}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                    <Typography variant="body1" fontWeight="bold">{fmt(selectedTransaction?.total_amount)}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Items */}
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Items</Typography>
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Description</strong></TableCell>
                      <TableCell><strong>Type</strong></TableCell>
                      <TableCell align="right"><strong>Price</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactionDetails?.items?.length > 0 ? (
                      transactionDetails.items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>{item.item_details?.description || item.item_id || 'N/A'}</TableCell>
                          <TableCell>{item.transaction_type}</TableCell>
                          <TableCell align="right">{fmt(item.item_price)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">No items found</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Payments */}
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Payments</Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Payment Method</strong></TableCell>
                      <TableCell align="right"><strong>Amount</strong></TableCell>
                      <TableCell><strong>Date</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactionDetails?.payments?.length > 0 ? (
                      transactionDetails.payments.map((payment, i) => (
                        <TableRow key={i}>
                          <TableCell>{payment.payment_method}</TableCell>
                          <TableCell align="right">{fmt(payment.amount)}</TableCell>
                          <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">No payments found</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EmployeeSalesHistory;
