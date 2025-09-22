import React, { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

function Transactions() {
  const [store, setStore] = useState('');
  const [workstation, setWorkstation] = useState('');
  const [employee, setEmployee] = useState('');
  const [businessDate, setBusinessDate] = useState(null);
  const [transactionNumber, setTransactionNumber] = useState('');

  // Sample data - replace with actual data from your API
  const transactions = [
    { id: 'T123456', time: '10:30 AM', alias: 'John D', workstation: 'WS-01', type: 'Sale' },
    { id: 'T123457', time: '11:15 AM', alias: 'Jane S', workstation: 'WS-02', type: 'Return' },
    { id: 'T123458', time: '01:45 PM', alias: 'Mike T', workstation: 'WS-01', type: 'Sale' },
  ];

  // Sample dropdown options - replace with actual data from your API
  const stores = ['Store 1', 'Store 2', 'Store 3'];
  const workstations = ['WS-01', 'WS-02', 'WS-03'];
  const employees = ['John Doe', 'Jane Smith', 'Mike Johnson'];

  const handleVoidTransaction = (transactionId) => {
    // Handle void transaction logic here
    console.log(`Voiding transaction ${transactionId}`);
  };

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

          <FormControl variant="outlined" size="small" sx={{ minWidth: 150, flex: 1 }}>
            <InputLabel id="employee-label">Employee</InputLabel>
            <Select
              labelId="employee-label"
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              label="Employee"
            >
              <MenuItem value="">
                <em>All Employees</em>
              </MenuItem>
              {employees.map((emp) => (
                <MenuItem key={emp} value={emp}>
                  {emp}
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
              <TableCell>Transaction</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Alias</TableCell>
              <TableCell>Workstation</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Void</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((txn) => (
              <TableRow key={txn.id} hover>
                <TableCell>{txn.id}</TableCell>
                <TableCell>{txn.time}</TableCell>
                <TableCell>{txn.alias}</TableCell>
                <TableCell>{txn.workstation}</TableCell>
                <TableCell>{txn.type}</TableCell>
                <TableCell>
                  <Checkbox
                    onChange={() => handleVoidTransaction(txn.id)}
                    color="error"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default Transactions;
