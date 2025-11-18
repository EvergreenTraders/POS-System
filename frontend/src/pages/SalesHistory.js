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
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import config from '../config';

const SalesHistory = () => {
  const { customer_id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchSalesHistory();
  }, [customer_id]);

  const fetchSalesHistory = async () => {
    try {
      setLoading(true);
      // Use the all-accessible-transactions endpoint to get combined transactions
      const response = await fetch(`${config.apiUrl}/customers/${customer_id}/all-accessible-transactions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sales history');
      }

      const data = await response.json();
      setSalesData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching sales history:', err);
    } finally {
      setLoading(false);
    }
  };


  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const handleViewTransaction = async (transaction) => {
    setSelectedTransaction(transaction);
    setDetailsDialogOpen(true);
    setLoadingDetails(true);

    try {
      // Fetch transaction items
      const itemsResponse = await fetch(`${config.apiUrl}/transactions/${transaction.transaction_id}/items`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Fetch transaction payments
      const paymentsResponse = await fetch(`${config.apiUrl}/transactions/${transaction.transaction_id}/payments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (itemsResponse.ok && paymentsResponse.ok) {
        const items = await itemsResponse.json();
        const paymentsData = await paymentsResponse.json();

        setTransactionDetails({
          items: items,
          payments: paymentsData.payments || [] // Extract the payments array from the response
        });
      }
    } catch (err) {
      console.error('Error fetching transaction details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedTransaction(null);
    setTransactionDetails(null);
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Sales History
        </Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          variant="outlined"
        >
          Back
        </Button>
      </Box>

      {/* Customer Info */}
      {salesData?.transactions?.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Customer: {salesData.transactions[0].customer_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {salesData.transactions[0].customer_email && `Email: ${salesData.transactions[0].customer_email} | `}
            {salesData.transactions[0].customer_phone && `Phone: ${salesData.transactions[0].customer_phone}`}
          </Typography>
        </Paper>
      )}

      {/* Linked Account Info */}
      {salesData?.summary?.linked_transactions > 0 && (
        <Alert severity="info" icon={<LinkIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            This customer has access to linked accounts. Transactions marked with a "Linked" badge are from linked customer accounts.
            {' '}
            <strong>{salesData.summary.linked_transactions}</strong> of <strong>{salesData.summary.total_transactions}</strong> transactions shown are from linked accounts.
          </Typography>
        </Alert>
      )}

      {/* Summary Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Transactions
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h5">
                  {salesData?.summary?.total_transactions || 0}
                </Typography>
                {salesData?.summary?.linked_transactions > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    ({salesData.summary.own_transactions} own + {salesData.summary.linked_transactions} linked)
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Spent
              </Typography>
              <Typography variant="h5">
                {formatCurrency(salesData?.summary?.total_spent || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Paid
              </Typography>
              <Typography variant="h5" color="success.main">
                {formatCurrency(salesData?.summary?.total_paid || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Transactions Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell><strong>Transaction ID</strong></TableCell>
                <TableCell><strong>Customer</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Type(s)</strong></TableCell>
                <TableCell align="right"><strong>Items</strong></TableCell>
                <TableCell align="right"><strong>Total Amount</strong></TableCell>
                <TableCell align="right"><strong>Paid</strong></TableCell>
                <TableCell><strong>Payment Method(s)</strong></TableCell>
                <TableCell><strong>Employee</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {salesData?.transactions?.length > 0 ? (
                salesData.transactions.map((transaction) => (
                  <TableRow
                    key={transaction.transaction_id}
                    hover
                    sx={{
                      backgroundColor: transaction.is_linked_account ? 'rgba(33, 150, 243, 0.05)' : 'inherit'
                    }}
                  >
                    <TableCell>{transaction.transaction_id}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {transaction.customer_name}
                        {transaction.is_linked_account && (
                          <Chip
                            icon={<LinkIcon />}
                            label="Linked"
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{transaction.transaction_types}</TableCell>
                    <TableCell align="right">{transaction.item_count}</TableCell>
                    <TableCell align="right">{formatCurrency(transaction.total_amount)}</TableCell>
                    <TableCell align="right">{formatCurrency(transaction.total_paid)}</TableCell>
                    <TableCell>{transaction.payment_methods}</TableCell>
                    <TableCell>{transaction.employee_name}</TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        startIcon={<ReceiptIcon />}
                        onClick={() => handleViewTransaction(transaction)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    <Typography variant="body1" color="text.secondary" sx={{ py: 3 }}>
                      No sales history found for this customer
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Transaction Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseDetailsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Transaction Details: {selectedTransaction?.transaction_id}
            </Typography>
            <Button onClick={handleCloseDetailsDialog} size="small">
              <CloseIcon />
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Transaction Summary */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2" color="text.secondary">Employee</Typography>
                    <Typography variant="body1">{selectedTransaction?.employee_name}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2" color="text.secondary">Transaction Types</Typography>
                    <Typography variant="body1">{selectedTransaction?.transaction_types}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {formatCurrency(selectedTransaction?.total_amount || 0)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Items Section */}
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Item ID</strong></TableCell>
                      <TableCell><strong>Type</strong></TableCell>
                      <TableCell align="right"><strong>Price</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactionDetails?.items && transactionDetails.items.length > 0 ? (
                      transactionDetails.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.item_id}</TableCell>
                          <TableCell>{item.transaction_type}</TableCell>
                          <TableCell align="right">{formatCurrency(item.item_price)}</TableCell>
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

              {/* Payments Section */}
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Payment Method</strong></TableCell>
                      <TableCell align="right"><strong>Amount</strong></TableCell>
                      <TableCell><strong>Date</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactionDetails?.payments && transactionDetails.payments.length > 0 ? (
                      transactionDetails.payments.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell>{payment.payment_method}</TableCell>
                          <TableCell align="right">{formatCurrency(payment.amount)}</TableCell>
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
          <Button onClick={handleCloseDetailsDialog} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SalesHistory;
