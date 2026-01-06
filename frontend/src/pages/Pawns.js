import React, { useState, useEffect } from 'react';
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
  Typography,
  Paper,
  Select,
  MenuItem,
  IconButton,
  Alert,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import axios from 'axios';
import config from '../config';

const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5000';

const Pawns = () => {
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pawns, setPawns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [termDays, setTermDays] = useState(62);
  const [interestRate, setInterestRate] = useState(2.9);
  const [frequencyDays, setFrequencyDays] = useState(30);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [selectedPawn, setSelectedPawn] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch pawn config for term_days, interest_rate, and frequency_days
  useEffect(() => {
    const fetchPawnConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/pawn-config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTermDays(parseInt(response.data.term_days) || 62);
        setInterestRate(parseFloat(response.data.interest_rate) || 2.9);
        setFrequencyDays(parseInt(response.data.frequency_days) || 30);
      } catch (error) {
        console.error('Error fetching pawn config:', error);
      }
    };
    fetchPawnConfig();
  }, []);

  // Fetch pawn transactions
  useEffect(() => {
    const fetchPawnTransactions = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/pawn-transactions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPawns(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching pawn transactions:', error);
        setError('Failed to load pawn transactions');
      } finally {
        setLoading(false);
      }
    };
    fetchPawnTransactions();
  }, []);

  const getStatusChip = (status) => {
    const styles = {
      PAWN: {
        backgroundColor: '#e7f7ed',
        color: '#1a8d48',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold'
      },
      ACTIVE: {
        backgroundColor: '#e7f7ed',
        color: '#1a8d48',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold'
      },
      REDEEMED: {
        backgroundColor: '#e3f2fd',
        color: '#1976d2',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold'
      },
      FORFEITED: {
        backgroundColor: '#fff3e0',
        color: '#f57c00',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold'
      },
      OVERDUE: {
        backgroundColor: '#fce8e8',
        color: '#d32f2f',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold'
      }
    };

    return (
      <span style={styles[status] || styles.ACTIVE}>
        {status}
      </span>
    );
  };

  const calculateDueDate = (transactionDate) => {
    const date = new Date(transactionDate);
    date.setDate(date.getDate() + termDays);
    return date;
  };

  const isOverdue = (transactionDate, itemStatus) => {
    if (itemStatus !== 'PAWN') return false;
    const dueDate = calculateDueDate(transactionDate);
    return new Date() > dueDate;
  };

  const getDisplayStatus = (pawn) => {
    if (pawn.item_status === 'PAWN' && isOverdue(pawn.transaction_date, pawn.item_status)) {
      return 'OVERDUE';
    }
    return pawn.item_status;
  };

  const calculateRedemptionAmount = (principalAmount) => {
    // Handle null/undefined/NaN values
    const principal = parseFloat(principalAmount) || 0;
    const term = termDays || 62;
    const frequency = frequencyDays || 30;
    const rate = interestRate || 2.9;

    // Calculate number of interest periods
    const interestPeriods = Math.ceil(term / frequency);

    // Calculate interest
    const interestAmount = principal * (rate / 100) * interestPeriods;

    // Calculate insurance
    const insuranceCost = principal * 0.01 * interestPeriods;

    // Appraisal fee is 0
    const appraisalFee = 0;

    // Total redemption amount
    return principal + appraisalFee + interestAmount + insuranceCost;
  };

  const handleRedeemClick = (pawn) => {
    setSelectedPawn(pawn);
    setRedeemDialogOpen(true);
  };

  const handleRedeemConfirm = async () => {
    if (!selectedPawn) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/redeem-pawn`,
        {
          pawn_ticket_id: selectedPawn.pawn_ticket_id,
          item_id: selectedPawn.item_id,
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.status === 200) {
        setSuccessMessage('Item successfully redeemed!');
        setRedeemDialogOpen(false);
        setSelectedPawn(null);

        // Refresh the pawn transactions list
        const pawnsResponse = await axios.get(`${API_BASE_URL}/api/pawn-transactions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPawns(pawnsResponse.data);

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error redeeming pawn:', error);
      setError('Failed to redeem item. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Pawn Transactions
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage active and completed pawn transactions
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<FilterAltIcon />}
            sx={{ mr: 2 }}
          >
            Filter
          </Button>
        </Box>
      </Box>

      {/* Success Message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Alert */}
      {pawns.filter(p => isOverdue(p.transaction_date, p.item_status)).length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Attention: There are {pawns.filter(p => isOverdue(p.transaction_date, p.item_status)).length} overdue pawns. Please review and contact customers.
          </Typography>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Table */}
      {!loading && !error && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>PAWN TICKET ID</TableCell>
                <TableCell>ITEM</TableCell>
                <TableCell>CUSTOMER</TableCell>
                <TableCell>PRINCIPAL</TableCell>
                <TableCell>REDEEM AMOUNT</TableCell>
                <TableCell>TRANSACTION DATE</TableCell>
                <TableCell>DUE DATE</TableCell>
                <TableCell>STATUS</TableCell>
                <TableCell>ACTION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pawns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      No pawn transactions found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pawns
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((pawn) => {
                    const principalAmount = parseFloat(pawn.item_price) || 0;
                    const redemptionAmount = calculateRedemptionAmount(principalAmount);
                    const isPawnStatus = pawn.item_status === 'PAWN';

                    return (
                      <TableRow key={pawn.pawn_ticket_id} hover>
                        <TableCell>{pawn.pawn_ticket_id}</TableCell>
                        <TableCell>
                          {pawn.item_description || pawn.item_id}
                        </TableCell>
                        <TableCell>{pawn.customer_name || 'N/A'}</TableCell>
                        <TableCell>{formatCurrency(principalAmount)}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 'bold', color: isPawnStatus ? '#1976d2' : 'inherit' }}>
                            {formatCurrency(redemptionAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {new Date(pawn.transaction_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          {calculateDueDate(pawn.transaction_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>{getStatusChip(getDisplayStatus(pawn))}</TableCell>
                        <TableCell>
                          {isPawnStatus && (
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<AttachMoneyIcon />}
                              onClick={() => handleRedeemClick(pawn)}
                              sx={{
                                backgroundColor: '#00a862',
                                '&:hover': {
                                  backgroundColor: '#008f53'
                                }
                              }}
                            >
                              Redeem
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      {!loading && !error && pawns.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(e.target.value);
                setCurrentPage(1);
              }}
              size="small"
              sx={{ mr: 1 }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
            <Typography variant="body2" color="text.secondary">
              items per page
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="body2" sx={{ mx: 2 }}>
              Page {currentPage} of {Math.ceil(pawns.length / itemsPerPage)}
            </Typography>
            <IconButton
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage >= Math.ceil(pawns.length / itemsPerPage)}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Redeem Confirmation Dialog */}
      <Dialog
        open={redeemDialogOpen}
        onClose={() => setRedeemDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Redemption
        </DialogTitle>
        <DialogContent>
          {selectedPawn && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to redeem this pawn?
              </Typography>
              <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Pawn Ticket ID:</strong> {selectedPawn.pawn_ticket_id}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Item:</strong> {selectedPawn.item_description || selectedPawn.item_id}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Customer:</strong> {selectedPawn.customer_name || 'N/A'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Principal Amount:</strong> {formatCurrency(selectedPawn.item_price || 0)}
                </Typography>
                <Typography variant="h6" sx={{ mt: 2, color: '#1976d2' }}>
                  <strong>Total Redemption Amount:</strong> {formatCurrency(calculateRedemptionAmount(selectedPawn.item_price || 0))}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary', fontStyle: 'italic' }}>
                This will change the item status to REDEEMED and return it to the customer.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRedeemDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleRedeemConfirm}
            variant="contained"
            sx={{
              backgroundColor: '#00a862',
              '&:hover': {
                backgroundColor: '#008f53'
              }
            }}
          >
            Confirm Redemption
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Pawns;
