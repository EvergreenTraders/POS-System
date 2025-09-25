import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility as ViewIcon, AttachMoney as AttachMoneyIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Avatar } from '@mui/material';
import config from '../config';

function Transactions() {
  const [store, setStore] = useState('');
  const [workstation, setWorkstation] = useState('');
  const [employee, setEmployee] = useState('');
  const [businessDate, setBusinessDate] = useState(null);
  const [transactionNumber, setTransactionNumber] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionItems, setTransactionItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const API_BASE_URL = config.apiUrl;
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stores, setStores] = useState([]);
  const [workstations, setWorkstations] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const handleViewTransaction = async (transaction) => {
    setSelectedTransaction(transaction);
    setLoadingItems(true);
    setViewDialogOpen(true);
    
    try {
      // Fetch transaction items for the selected transaction
      const response = await axios.get(`${API_BASE_URL}/transactions/${transaction.transaction_id}/items`);
      setTransactionItems(response.data);
    } catch (err) {
      console.error('Error fetching transaction items:', err);
      // Optionally show an error message to the user
    } finally {
      setLoadingItems(false);
    }
  };
  
  const handleCloseDialog = () => {
    setViewDialogOpen(false);
    setSelectedTransaction(null);
    setTransactionItems([]);
  };
  

  // Fetch transactions and filter options
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch transactions and employees in parallel
        const [transactionsRes, employeesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/transactions`),
          axios.get(`${API_BASE_URL}/employees`)
        ]);
        
        setTransactions(transactionsRes.data);
        
        // Transform employees data for the dropdown
        const employeeOptions = employeesRes.data.map(emp => ({
          id: emp.employee_id,
          name: `${emp.first_name} ${emp.last_name}`,
          ...emp
        }));
        
        setEmployees(employeeOptions);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load transactions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleVoidTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to void this transaction?')) {
      return;
    }
    
    try {
      await axios.put(`${API_BASE_URL}/transactions/${transactionId}/void`);
      // Refresh transactions after successful void
      const updatedTransactions = transactions.filter(tx => tx.id !== transactionId);
      setTransactions(updatedTransactions);
    } catch (err) {
      console.error('Error voiding transaction:', err);
      alert('Failed to void transaction. Please try again.');
    }
  };
  
  const formatTransactionTime = (dateString) => {
    const options = { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true 
    };
    return new Date(dateString).toLocaleString('en-US', options);
  };
  
  // Filter transactions based on search criteria
  const filteredTransactions = transactions.filter(tx => {
    const matchesStore = !store || tx.store_id === store;
    const matchesWorkstation = !workstation || tx.workstation_id === workstation;
    const matchesEmployee = !employee || tx.employee_id?.toString() === employee.toString();
    const matchesTransactionNumber = !transactionNumber || 
      tx.transaction_id.toLowerCase().includes(transactionNumber.toLowerCase());
      
    // Check date match if businessDate is set
    let matchesDate = true;
    if (businessDate) {
      const txDate = new Date(tx.created_at).toDateString();
      const selectedDate = new Date(businessDate).toDateString();
      matchesDate = txDate === selectedDate;
    }
    
    return matchesStore && matchesWorkstation && matchesEmployee && 
           matchesTransactionNumber && matchesDate;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Void/View Transactions
      </Typography>
      
      {/* Filter Section */}
      <Paper sx={{ p: 3, mb: 3 }} elevation={2}>
        <Box display="flex" flexWrap="wrap" gap={2}>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150, flex: 1 }}>
            <InputLabel id="store-label">Store</InputLabel>
            <Select
              labelId="store-label"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              label="Store"
            >
              <MenuItem value="">
                <em>All Stores</em>
              </MenuItem>
              {stores.map((store) => (
                <MenuItem key={store} value={store}>
                  {store}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" sx={{ minWidth: 150, flex: 1 }}>
            <InputLabel id="workstation-label">Workstation</InputLabel>
            <Select
              labelId="workstation-label"
              value={workstation}
              onChange={(e) => setWorkstation(e.target.value)}
              label="Workstation"
            >
              <MenuItem value="">
                <em>All Workstations</em>
              </MenuItem>
              {workstations.map((ws) => (
                <MenuItem key={ws} value={ws}>
                  {ws}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" sx={{ minWidth: 200, flex: 1 }}>
            <InputLabel id="employee-label">Employee</InputLabel>
            <Select
              labelId="employee-label"
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              label="Employee"
              displayEmpty
            >
              <MenuItem value="">
                <em>All Employees</em>
              </MenuItem>
              {employees.map((emp) => (
                <MenuItem key={emp.employee_id} value={emp.employee_id}>
                  {emp.first_name} {emp.last_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Business Date"
              value={businessDate}
              onChange={(newValue) => setBusinessDate(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  sx={{ minWidth: 180, flex: 1 }}
                />
              )}
            />
          </LocalizationProvider>

          <TextField
            label="T# / Section"
            variant="outlined"
            size="small"
            value={transactionNumber}
            onChange={(e) => setTransactionNumber(e.target.value)}
            sx={{ minWidth: 200, flex: 1 }}
          />
        </Box>
      </Paper>

      {/* Transactions Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Transaction ID</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Void</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'error.main' }}>
                  {error}
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  No transactions found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((txn) => (
                <TableRow key={txn.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <span style={{ marginRight: 8 }}>{txn.transaction_id || txn.id}</span>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleViewTransaction(txn)}
                        title="View Transaction Details"
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>{formatTransactionTime(txn.created_at)}</TableCell>
                  <TableCell>{txn.customer_name || 'N/A'}</TableCell>
                  <TableCell>{txn.employee_name || 'N/A'}</TableCell>
                  <TableCell>${parseFloat(txn.total_amount || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <span style={{
                      color: txn.status === 'voided' ? 'red' : 'inherit',
                      textTransform: 'capitalize'
                    }}>
                      {txn.status || 'completed'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {txn.status !== 'voided' && (
                        <Checkbox
                          onChange={() => handleVoidTransaction(txn.id)}
                          color="error"
                          size="small"
                        />
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Transaction Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Transaction #{selectedTransaction.transaction_id || selectedTransaction.id}
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell variant="head">Date & Time</TableCell>
                      <TableCell>{formatTransactionTime(selectedTransaction.created_at)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head">Customer</TableCell>
                      <TableCell>{selectedTransaction.customer_name || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head">Employee</TableCell>
                      <TableCell>{selectedTransaction.employee_name || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head">Amount</TableCell>
                      <TableCell>${parseFloat(selectedTransaction.total_amount || 0).toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head">Status</TableCell>
                      <TableCell>
                        <span style={{
                          color: selectedTransaction.status === 'voided' ? 'red' : 'inherit',
                          textTransform: 'capitalize'
                        }}>
                          {selectedTransaction.status || 'completed'}
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head" colSpan={2} sx={{ fontWeight: 'bold', pt: 3 }}>
                        Items ({transactionItems.length})
                      </TableCell>
                    </TableRow>
                    {loadingItems ? (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ py: 2 }}>
                          Loading items...
                        </TableCell>
                      </TableRow>
                    ) : transactionItems.length > 0 ? (
                      <>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell><strong>Image</strong></TableCell>
                          <TableCell><strong>Description</strong></TableCell>
                          <TableCell><strong>Transaction Type</strong></TableCell>
                          <TableCell align="right"><strong>Price</strong></TableCell>
                        </TableRow>
                        {transactionItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {item.item_details?.images?.[0] ? (
                                  <Avatar 
                                    src={item.item_details.images[0].url} 
                                    alt="Item" 
                                    variant="rounded"
                                    sx={{ width: 50, height: 50, objectFit: 'cover' }}
                                  />
                                ) : (
                                  <Avatar 
                                    variant="rounded"
                                    sx={{ width: 50, height: 50, bgcolor: 'grey.300' }}
                                  >
                                    <AttachMoneyIcon />
                                  </Avatar>
                                )}
                               
                              </Box>
                            </TableCell>
                            <TableCell>
                                <Box>
                                  <div>{item.item_details?.description || `Item ${index + 1}`}</div>
                                  {item.description && <div style={{ fontSize: '0.8em', color: '#666' }}>{item.description}</div>}
                                </Box>
                            </TableCell>
                            <TableCell>{item.transaction_type}</TableCell>
                            <TableCell align="right">
                                  ${parseFloat(item.item_price || 0).toFixed(2)}
                                  {item.quantity > 1 && (
                                    <div style={{ fontSize: '0.8em', color: '#666' }}>
                                      {item.quantity} @ ${(parseFloat(item.item_price || 0) / item.quantity).toFixed(2)} each
                                    </div>
                                  )}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ '&:last-child td': { border: 0 }, backgroundColor: '#f9f9f9' }}>
                          <TableCell colSpan={3} align="right"><strong>Subtotal:</strong></TableCell>
                          <TableCell align="right">
                            <strong>
                              ${transactionItems.reduce((sum, item) => sum + (parseFloat(item.item_price || 0) * (item.quantity || 1)), 0).toFixed(2)}
                            </strong>
                          </TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ py: 2, fontStyle: 'italic' }}>
                          No items found for this transaction
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Transactions;
