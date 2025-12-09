import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  History as HistoryIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import axios from 'axios';
import config from '../config';

function CashDrawer() {
  const API_BASE_URL = config.apiUrl;

  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [history, setHistory] = useState([]);
  const [sessionDetails, setSessionDetails] = useState(null);

  // Dialog states
  const [openDrawerDialog, setOpenDrawerDialog] = useState(false);
  const [closeDrawerDialog, setCloseDrawerDialog] = useState(false);
  const [adjustmentDialog, setAdjustmentDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState(false);

  // Form states
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [actualBalance, setActualBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('bank_deposit');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchEmployees();
    checkActiveSession();
    fetchHistory();
  }, []);

  // Auto-select current user when opening drawer dialog
  useEffect(() => {
    if (openDrawerDialog && !selectedEmployee) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (currentUser.id) {
        setSelectedEmployee(currentUser.id);
      }
    }
  }, [openDrawerDialog]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/employees`);
      setEmployees(response.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
      showSnackbar('Failed to load employees', 'error');
    }
  };

  const checkActiveSession = async () => {
    try {
      setLoading(true);
      // Get current logged-in employee from localStorage or context
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      if (currentUser.id) {
        const response = await axios.get(
          `${API_BASE_URL}/cash-drawer/employee/${currentUser.id}/active`
        );

        // Only set active session if response.data is not null
        setActiveSession(response.data || null);
      } else {
        console.log('No employee_id found in localStorage');
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Error checking active session:', err);
      setActiveSession(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cash-drawer/history`, {
        params: { limit: 50 }
      });
      setHistory(response.data);
    } catch (err) {
      console.error('Error fetching history:', err);
      showSnackbar('Failed to load history', 'error');
    }
  };

  const fetchSessionDetails = async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cash-drawer/${sessionId}/details`);
      setSessionDetails(response.data);
      setDetailsDialog(true);
    } catch (err) {
      console.error('Error fetching session details:', err);
      showSnackbar('Failed to load session details', 'error');
    }
  };

  const handleOpenDrawer = async () => {
    // Get current logged-in user
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = selectedEmployee || currentUser.id;

    if (!employeeId || !openingBalance) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/cash-drawer/open`, {
        employee_id: employeeId,
        opening_balance: parseFloat(openingBalance),
        opening_notes: openingNotes || null
      });

      showSnackbar('Cash drawer opened successfully', 'success');
      setOpenDrawerDialog(false);
      resetOpenForm();
      checkActiveSession();
    } catch (err) {
      console.error('Error opening drawer:', err);
      showSnackbar(err.response?.data?.error || 'Failed to open drawer', 'error');
    }
  };

  const handleCloseDrawer = async () => {
    if (!actualBalance) {
      showSnackbar('Please enter the actual balance', 'error');
      return;
    }

    try {
      const response = await axios.put(
        `${API_BASE_URL}/cash-drawer/${activeSession.session_id}/close`,
        {
          actual_balance: parseFloat(actualBalance),
          closing_notes: closingNotes || null
        }
      );

      const discrepancy = response.data.discrepancy;
      let message = 'Cash drawer closed successfully';

      if (discrepancy > 0) {
        message += ` (Overage: $${discrepancy.toFixed(2)})`;
      } else if (discrepancy < 0) {
        message += ` (Shortage: $${Math.abs(discrepancy).toFixed(2)})`;
      } else {
        message += ' (Balanced)';
      }

      showSnackbar(message, discrepancy === 0 ? 'success' : 'warning');
      setCloseDrawerDialog(false);
      resetCloseForm();
      checkActiveSession();
      fetchHistory();
    } catch (err) {
      console.error('Error closing drawer:', err);
      showSnackbar(err.response?.data?.error || 'Failed to close drawer', 'error');
    }
  };

  const handleAddAdjustment = async () => {
    if (!adjustmentAmount || !adjustmentReason) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      await axios.post(
        `${API_BASE_URL}/cash-drawer/${activeSession.session_id}/adjustment`,
        {
          amount: parseFloat(adjustmentAmount),
          adjustment_type: adjustmentType,
          reason: adjustmentReason,
          performed_by: currentUser.id
        }
      );

      showSnackbar('Adjustment added successfully', 'success');
      setAdjustmentDialog(false);
      resetAdjustmentForm();
      checkActiveSession();
    } catch (err) {
      console.error('Error adding adjustment:', err);
      showSnackbar(err.response?.data?.error || 'Failed to add adjustment', 'error');
    }
  };

  const resetOpenForm = () => {
    setSelectedEmployee('');
    setOpeningBalance('');
    setOpeningNotes('');
  };

  const resetCloseForm = () => {
    setActualBalance('');
    setClosingNotes('');
  };

  const resetAdjustmentForm = () => {
    setAdjustmentAmount('');
    setAdjustmentType('bank_deposit');
    setAdjustmentReason('');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusChip = (status) => {
    const statusColors = {
      open: 'success',
      closed: 'warning',
      reconciled: 'default'
    };

    return (
      <Chip
        label={status.toUpperCase()}
        color={statusColors[status] || 'default'}
        size="small"
      />
    );
  };

  const getDiscrepancyChip = (discrepancy) => {
    if (!discrepancy || discrepancy === 0) {
      return <Chip label="Balanced" color="success" size="small" icon={<CheckCircleIcon />} />;
    } else if (discrepancy > 0) {
      return <Chip label={`Overage ${formatCurrency(discrepancy)}`} color="info" size="small" />;
    } else {
      return <Chip label={`Shortage ${formatCurrency(Math.abs(discrepancy))}`} color="error" size="small" icon={<WarningIcon />} />;
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Cash Drawer Management
      </Typography>

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Active Session" />
        <Tab label="History" />
      </Tabs>

      {/* Active Session Tab */}
      {tabValue === 0 && (
        <>
          {activeSession ? (
            <Grid container spacing={3}>
              {/* Current Session Card */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        Active Drawer Session
                      </Typography>
                      {getStatusChip(activeSession.status)}
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Opened At</Typography>
                        <Typography variant="body1">{formatDateTime(activeSession.opened_at)}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Opening Balance</Typography>
                        <Typography variant="h6">{formatCurrency(activeSession.opening_balance)}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Current Expected Balance</Typography>
                        <Typography variant="h6">{formatCurrency(activeSession.current_expected_balance)}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Transaction Count</Typography>
                        <Typography variant="body1">{activeSession.transaction_count || 0}</Typography>
                      </Grid>
                    </Grid>

                    <Box mt={3} display="flex" gap={2}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setCloseDrawerDialog(true)}
                      >
                        Close Drawer
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setAdjustmentDialog(true)}
                      >
                        Add Adjustment
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<HistoryIcon />}
                        onClick={() => fetchSessionDetails(activeSession.session_id)}
                      >
                        View Details
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <MoneyIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Active Drawer Session
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Open a new cash drawer to start accepting payments
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenDrawerDialog(true)}
              >
                Open Cash Drawer
              </Button>
            </Paper>
          )}
        </>
      )}

      {/* History Tab */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Session ID</TableCell>
                <TableCell>Employee</TableCell>
                <TableCell>Opened</TableCell>
                <TableCell>Closed</TableCell>
                <TableCell align="right">Opening</TableCell>
                <TableCell align="right">Expected</TableCell>
                <TableCell align="right">Actual</TableCell>
                <TableCell>Discrepancy</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((session) => (
                <TableRow key={session.session_id}>
                  <TableCell>{session.session_id}</TableCell>
                  <TableCell>{session.employee_name}</TableCell>
                  <TableCell>{formatDateTime(session.opened_at)}</TableCell>
                  <TableCell>{formatDateTime(session.closed_at)}</TableCell>
                  <TableCell align="right">{formatCurrency(session.opening_balance)}</TableCell>
                  <TableCell align="right">{formatCurrency(session.expected_balance)}</TableCell>
                  <TableCell align="right">{formatCurrency(session.actual_balance)}</TableCell>
                  <TableCell>{getDiscrepancyChip(session.discrepancy)}</TableCell>
                  <TableCell>{getStatusChip(session.status)}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => fetchSessionDetails(session.session_id)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Open Drawer Dialog */}
      <Dialog open={openDrawerDialog} onClose={() => setOpenDrawerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Open Cash Drawer</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                label="Employee"
              >
                {employees.map((emp) => (
                  <MenuItem key={emp.employee_id} value={emp.employee_id}>
                    {emp.first_name} {emp.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Opening Balance"
              type="number"
              fullWidth
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              required
              inputProps={{ step: '0.01', min: '0' }}
            />
            <TextField
              label="Notes (Optional)"
              fullWidth
              multiline
              rows={3}
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDrawerDialog(false)}>Cancel</Button>
          <Button onClick={handleOpenDrawer} variant="contained" color="primary">
            Open Drawer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Drawer Dialog */}
      <Dialog open={closeDrawerDialog} onClose={() => setCloseDrawerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Close Cash Drawer</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              Expected Balance: {formatCurrency(activeSession?.current_expected_balance)}
            </Alert>
            <TextField
              label="Actual Balance (Counted)"
              type="number"
              fullWidth
              value={actualBalance}
              onChange={(e) => setActualBalance(e.target.value)}
              required
              inputProps={{ step: '0.01', min: '0' }}
              autoFocus
            />
            {actualBalance && activeSession && (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Discrepancy: {' '}
                  <strong>
                    {formatCurrency(parseFloat(actualBalance) - activeSession.current_expected_balance)}
                  </strong>
                </Typography>
              </Box>
            )}
            <TextField
              label="Closing Notes (Optional)"
              fullWidth
              multiline
              rows={3}
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDrawerDialog(false)}>Cancel</Button>
          <Button onClick={handleCloseDrawer} variant="contained" color="primary">
            Close Drawer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Adjustment Dialog */}
      <Dialog open={adjustmentDialog} onClose={() => setAdjustmentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Cash Adjustment</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Adjustment Type</InputLabel>
              <Select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
                label="Adjustment Type"
              >
                <MenuItem value="bank_deposit">Bank Deposit (Remove Cash)</MenuItem>
                <MenuItem value="change_order">Change Order (Add Cash)</MenuItem>
                <MenuItem value="petty_cash">Petty Cash</MenuItem>
                <MenuItem value="correction">Correction</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Amount"
              type="number"
              fullWidth
              value={adjustmentAmount}
              onChange={(e) => setAdjustmentAmount(e.target.value)}
              required
              inputProps={{ step: '0.01' }}
              helperText="Positive for adding cash, negative for removing cash"
            />
            <TextField
              label="Reason"
              fullWidth
              multiline
              rows={3}
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustmentDialog(false)}>Cancel</Button>
          <Button onClick={handleAddAdjustment} variant="contained" color="primary">
            Add Adjustment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Session Details Dialog */}
      <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Drawer Session Details</DialogTitle>
        <DialogContent>
          {sessionDetails && (
            <Box sx={{ pt: 2 }}>
              {/* Session Info */}
              <Typography variant="h6" gutterBottom>Session Information</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Employee</Typography>
                  <Typography>{sessionDetails.session.employee_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  {getStatusChip(sessionDetails.session.status)}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Opened</Typography>
                  <Typography>{formatDateTime(sessionDetails.session.opened_at)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Closed</Typography>
                  <Typography>{formatDateTime(sessionDetails.session.closed_at)}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Balances */}
              <Typography variant="h6" gutterBottom>Balances</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Opening</Typography>
                  <Typography variant="h6">{formatCurrency(sessionDetails.session.opening_balance)}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Expected</Typography>
                  <Typography variant="h6">{formatCurrency(sessionDetails.session.expected_balance)}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Actual</Typography>
                  <Typography variant="h6">{formatCurrency(sessionDetails.session.actual_balance)}</Typography>
                </Grid>
              </Grid>

              {sessionDetails.adjustments.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>Adjustments</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell>Reason</TableCell>
                          <TableCell>Performed By</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sessionDetails.adjustments.map((adj) => (
                          <TableRow key={adj.adjustment_id}>
                            <TableCell>{adj.adjustment_type.replace('_', ' ')}</TableCell>
                            <TableCell align="right">{formatCurrency(adj.amount)}</TableCell>
                            <TableCell>{adj.reason}</TableCell>
                            <TableCell>{adj.performed_by_name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default CashDrawer;
