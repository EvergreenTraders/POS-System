import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Collapse,
  Grid,
  FormControl,
  InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BlockIcon from '@mui/icons-material/Block';
import HistoryIcon from '@mui/icons-material/History';
import axios from 'axios';
import config from '../config';
import { useWorkingDate } from '../context/WorkingDateContext';
import { useStoreStatus } from '../context/StoreStatusContext';

const API_BASE_URL = config.apiUrl;

const Pawns = () => {
  const navigate = useNavigate();
  const { getCurrentDateObject } = useWorkingDate();
  const { isStoreClosed } = useStoreStatus();
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pawns, setPawns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [termDays, setTermDays] = useState(62);
  const [interestRate, setInterestRate] = useState(2.9);
  const [frequencyDays, setFrequencyDays] = useState(30);
  const [forfeitureMode, setForfeitureMode] = useState('manual');
  const [configLoaded, setConfigLoaded] = useState(false);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [selectedPawn, setSelectedPawn] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    customerName: '',
    ticketId: '',
    transactionDate: '',
    dueDate: '',
  });
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [pawnHistory, setPawnHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedTicketForHistory, setSelectedTicketForHistory] = useState(null);

  // Fetch pawn config for term_days, interest_rate, frequency_days, and forfeiture_mode
  useEffect(() => {
    const fetchPawnConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/pawn-config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTermDays(parseInt(response.data.term_days) || 62);
        setInterestRate(parseFloat(response.data.interest_rate) || 2.9);
        setFrequencyDays(parseInt(response.data.frequency_days) || 30);
        setForfeitureMode(response.data.forfeiture_mode || 'manual');
        setConfigLoaded(true);
      } catch (error) {
        console.error('Error fetching pawn config:', error);
        setConfigLoaded(true);
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
        const response = await axios.get(`${API_BASE_URL}/pawn-transactions`, {
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

  // Auto-forfeit overdue pawns when forfeiture_mode is 'automatic'
  // This runs once after both config and pawns are loaded
  const autoForfeitRanRef = useRef(false);

  useEffect(() => {
    const autoForfeitOverduePawns = async () => {
      // Only run once after both config and pawns are loaded
      if (!configLoaded || loading || autoForfeitRanRef.current) return;
      if (forfeitureMode !== 'automatic') {
        autoForfeitRanRef.current = true;
        return;
      }

      // Group pawns by ticket ID first (same logic as groupedTickets)
      // All items in a ticket share the same status (ticket_status)
      const ticketMap = new Map();
      pawns.forEach(pawn => {
        const ticketId = pawn.pawn_ticket_id;
        if (!ticketMap.has(ticketId)) {
          ticketMap.set(ticketId, {
            pawn_ticket_id: ticketId,
            transaction_date: pawn.transaction_date,
            ticket_status: pawn.ticket_status, // Use ticket_status from pawn_ticket table
            term_days: pawn.term_days, // Stored pawn config
            due_date: pawn.due_date, // Stored due date
            items: []
          });
        }
        ticketMap.get(ticketId).items.push(pawn);
      });
      const tickets = Array.from(ticketMap.values());

      // Find tickets that are overdue and still have PAWN ticket status
      const overdueTickets = tickets.filter(ticket => {
        // Check ticket status (all items in a ticket share the same status)
        if (ticket.ticket_status !== 'PAWN') return false;

        // Check if overdue using stored due_date or calculated from stored term_days
        let dueDate;
        if (ticket.due_date) {
          dueDate = new Date(ticket.due_date);
        } else {
          dueDate = new Date(ticket.transaction_date);
          dueDate.setDate(dueDate.getDate() + (ticket.term_days || termDays));
        }
        return getCurrentDateObject() > dueDate;
      });

      autoForfeitRanRef.current = true;

      if (overdueTickets.length === 0) return;

      try {
        const token = localStorage.getItem('token');
        const employeeId = JSON.parse(atob(token.split('.')[1])).id;

        // Forfeit each overdue ticket
        for (const ticket of overdueTickets) {
          // Update pawn_ticket status to FORFEITED
          await axios.put(
            `${API_BASE_URL}/pawn-ticket/${ticket.pawn_ticket_id}/status`,
            { status: 'FORFEITED' },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // Record pawn history for auto-forfeiture
          const totalPrincipal = ticket.items.reduce((sum, item) => sum + (parseFloat(item.item_price) || 0), 0);
          await axios.post(
            `${API_BASE_URL}/pawn-history`,
            {
              pawn_ticket_id: ticket.pawn_ticket_id,
              action_type: 'FORFEIT',
              principal_amount: totalPrincipal,
              performed_by: employeeId,
              notes: 'Auto-forfeited - pawn exceeded due date'
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }

        // Refresh the pawn transactions list
        const response = await axios.get(`${API_BASE_URL}/pawn-transactions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPawns(response.data);

        if (overdueTickets.length > 0) {
          setSuccessMessage(`${overdueTickets.length} overdue pawn ticket(s) automatically forfeited.`);
        }
      } catch (error) {
        console.error('Error auto-forfeiting overdue pawns:', error);
      }
    };

    autoForfeitOverduePawns();
  }, [configLoaded, loading, forfeitureMode, termDays, pawns, getCurrentDateObject]);

  const getStatusChip = (status) => {
    // Default style for any status
    const defaultStyle = {
      backgroundColor: '#f5f5f5',
      color: '#424242',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: 'bold'
    };

    // Dynamic color mapping based on status (can be extended)
    const getStatusStyle = (status) => {
      if (!status) return defaultStyle;
      
      const statusUpper = status.toUpperCase();
      
      // Map common status patterns to colors
      if (statusUpper.includes('ACTIVE') || statusUpper.includes('PAWN')) {
        return {
          backgroundColor: '#e7f7ed',
          color: '#1a8d48',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 'bold'
        };
      }
      if (statusUpper.includes('REDEEMED') || statusUpper.includes('COMPLETED')) {
        return {
          backgroundColor: '#e3f2fd',
          color: '#1976d2',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 'bold'
        };
      }
      if (statusUpper.includes('FORFEITED') || statusUpper.includes('CANCELLED')) {
        return {
          backgroundColor: '#fff3e0',
          color: '#f57c00',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 'bold'
        };
      }
      if (statusUpper.includes('OVERDUE') || statusUpper.includes('EXPIRED')) {
        return {
          backgroundColor: '#fce8e8',
          color: '#d32f2f',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 'bold'
        };
      }
      
      return defaultStyle;
    };

    return (
      <span style={getStatusStyle(status)}>
        {status || 'N/A'}
      </span>
    );
  };

  // Calculate due date using stored term_days from ticket, or fall back to current config
  const calculateDueDate = (transactionDate, ticketTermDays) => {
    const date = new Date(transactionDate);
    // Use stored term_days from ticket if available, otherwise use current config
    const days = ticketTermDays || termDays;
    date.setDate(date.getDate() + days);
    return date;
  };

  // Check if ticket is overdue using stored due_date or calculated from stored term_days
  const isOverdue = (ticket) => {
    if ((ticket.ticket_status || ticket.item_status) !== 'PAWN') return false;

    // Use stored due_date if available
    if (ticket.due_date) {
      const dueDate = new Date(ticket.due_date);
      return getCurrentDateObject() > dueDate;
    }

    // Fall back to calculating from transaction_date + stored term_days
    const dueDate = calculateDueDate(ticket.transaction_date, ticket.term_days);
    return getCurrentDateObject() > dueDate;
  };

  const getDisplayStatus = (ticket) => {
    // Use ticket_status (from pawn_ticket table) - all items in a ticket share the same status
    const status = ticket.ticket_status || ticket.item_status;
    if (status === 'PAWN' && isOverdue(ticket)) {
      return 'OVERDUE';
    }
    return status;
  };

  // Calculate redemption amount using stored ticket values or current config as fallback
  const calculateRedemptionAmount = (principalAmount, ticket = null) => {
    // Handle null/undefined/NaN values
    const principal = parseFloat(principalAmount) || 0;
    // Use stored values from ticket if available, otherwise use current config
    const term = ticket?.term_days || termDays || 90;
    const frequency = ticket?.frequency_days || frequencyDays || 30;
    const rate = ticket?.interest_rate || interestRate || 2.9;

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

  const handleRedeemClick = (ticket) => {
    // Calculate redemption details for entire ticket using stored pawn config values
    const totalPrincipal = ticket.items.reduce((sum, item) => sum + (parseFloat(item.item_price) || 0), 0);
    // Use stored values from ticket if available, otherwise use current config
    const term = ticket.term_days || termDays || 90;
    const frequency = ticket.frequency_days || frequencyDays || 30;
    const rate = ticket.interest_rate || interestRate || 2.9;
    const interestPeriods = Math.ceil(term / frequency);
    const interestAmount = totalPrincipal * (rate / 100) * interestPeriods;
    const insuranceCost = totalPrincipal * 0.01 * interestPeriods;
    const interestAndFee = interestAmount + insuranceCost; // Combined interest + insurance
    const totalAmount = totalPrincipal + interestAndFee; // Total = principal + interest + insurance

    // Navigate to CustomerTicket with redeem data
    navigate('/customer-ticket', {
      state: {
        redeemData: {
          pawnTicketId: ticket.pawn_ticket_id,
          description: ticket.items.map(item => item.item_description || item.item_id).join(', '),
          customerId: ticket.customer_id,
          customerName: ticket.customer_name || '',
          principal: totalPrincipal.toFixed(2),
          interest: interestAndFee.toFixed(2), // Interest/Fee combined
          totalAmount: totalAmount.toFixed(2)
        }
      }
    });
  };

  const handleExtendClick = (ticket) => {
    // Calculate extension payment for entire ticket using stored pawn config values
    const totalPrincipal = ticket.items.reduce((sum, item) => sum + (parseFloat(item.item_price) || 0), 0);
    // Use stored values from ticket if available, otherwise use current config
    const rate = ticket.interest_rate || interestRate || 2.9;
    const frequency = ticket.frequency_days || frequencyDays || 30;

    // Extension is for 1 period (1 frequency cycle)
    const extensionPeriods = 1;

    // Extension payment is interest for one period + insurance for one period
    const interestAmount = totalPrincipal * (rate / 100) * extensionPeriods;
    const insuranceFee = totalPrincipal * 0.01 * extensionPeriods;

    // Navigate to CustomerTicket with extend data
    navigate('/customer-ticket', {
      state: {
        extendData: {
          pawnTicketId: ticket.pawn_ticket_id,
          description: ticket.items.map(item => item.item_description || item.item_id).join(', '),
          customerId: ticket.customer_id,
          customerName: ticket.customer_name || '',
          principal: totalPrincipal.toFixed(2),
          interest: interestAmount.toFixed(2),
          fee: insuranceFee.toFixed(2),
          notes: `Extension payment for Pawn Ticket #${ticket.pawn_ticket_id}`
        }
      }
    });
  };

  const handleForfeitClick = async (ticket) => {
    if (!window.confirm(`Are you sure you want to forfeit Pawn Ticket #${ticket.pawn_ticket_id}? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const employeeId = JSON.parse(atob(token.split('.')[1])).id;

      // Update pawn_ticket status to FORFEITED
      // Backend will automatically move jewelry items to IN_PROCESS status
      await axios.put(
        `${API_BASE_URL}/pawn-ticket/${ticket.pawn_ticket_id}/status`,
        { status: 'FORFEITED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Record pawn history for forfeiture
      const totalPrincipal = ticket.items.reduce((sum, item) => sum + (parseFloat(item.item_price) || 0), 0);
      await axios.post(
        `${API_BASE_URL}/pawn-history`,
        {
          pawn_ticket_id: ticket.pawn_ticket_id,
          action_type: 'FORFEIT',
          principal_amount: totalPrincipal,
          performed_by: employeeId,
          notes: 'Pawn forfeited - items moved to inventory'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh the pawn transactions list
      const response = await axios.get(`${API_BASE_URL}/pawn-transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPawns(response.data);

      alert(`Pawn Ticket #${ticket.pawn_ticket_id} has been forfeited. Items moved to inventory for processing.`);
    } catch (error) {
      console.error('Error forfeiting pawn ticket:', error);
      alert('Failed to forfeit pawn ticket. Please try again.');
    }
  };

  const handleViewHistory = async (ticket) => {
    setSelectedTicketForHistory(ticket);
    setHistoryDialogOpen(true);
    setHistoryLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/pawn-history/${ticket.pawn_ticket_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPawnHistory(response.data);
    } catch (error) {
      console.error('Error fetching pawn history:', error);
      setPawnHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatHistoryDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionTypeLabel = (actionType) => {
    const labels = {
      'CREATED': 'Created',
      'EXTEND': 'Extended',
      'REDEEM': 'Redeemed',
      'FORFEIT': 'Forfeited',
      'PARTIAL_REDEEM': 'Partial Redeem'
    };
    return labels[actionType] || actionType;
  };

  const getActionTypeColor = (actionType) => {
    const colors = {
      'CREATED': '#1976d2',
      'EXTEND': '#ff9800',
      'REDEEM': '#4caf50',
      'FORFEIT': '#f44336',
      'PARTIAL_REDEEM': '#9c27b0'
    };
    return colors[actionType] || '#757575';
  };

  const handleRedeemConfirm = async () => {
    if (!selectedPawn) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/redeem-pawn`,
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
        const pawnsResponse = await axios.get(`${API_BASE_URL}/pawn-transactions`, {
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

  // Get unique customer names from pawns data
  const uniqueCustomers = useMemo(() => {
    const customerMap = new Map();
    pawns.forEach(pawn => {
      if (pawn.customer_name && pawn.customer_id) {
        customerMap.set(pawn.customer_id, pawn.customer_name);
      }
    });
    return Array.from(customerMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pawns]);

  // Group pawns by pawn_ticket_id
  // All items in a ticket share the same status (ticket_status from pawn_ticket table)
  // Pawn config values (term_days, interest_rate, frequency_days, due_date) are stored per ticket
  const groupedTickets = useMemo(() => {
    const ticketMap = new Map();

    pawns.forEach(pawn => {
      const ticketId = pawn.pawn_ticket_id;
      if (!ticketMap.has(ticketId)) {
        ticketMap.set(ticketId, {
          pawn_ticket_id: ticketId,
          customer_id: pawn.customer_id,
          customer_name: pawn.customer_name,
          transaction_date: pawn.transaction_date,
          ticket_status: pawn.ticket_status, // Use ticket_status from pawn_ticket table
          item_status: pawn.item_status, // Keep for backward compatibility
          // Store pawn config values frozen at time of pawn creation
          term_days: pawn.term_days,
          interest_rate: pawn.interest_rate,
          frequency_days: pawn.frequency_days,
          due_date: pawn.due_date,
          items: []
        });
      }
      ticketMap.get(ticketId).items.push(pawn);
    });

    return Array.from(ticketMap.values());
  }, [pawns]);

  // Filter tickets based on filter criteria
  const filteredTickets = groupedTickets.filter((ticket) => {
    // Filter by customer name (exact match from dropdown)
    const matchesCustomer = !filters.customerName ||
      (ticket.customer_id && ticket.customer_id.toString() === filters.customerName);

    // Filter by ticket ID
    const matchesTicketId = !filters.ticketId ||
      (ticket.pawn_ticket_id && ticket.pawn_ticket_id.toString().toLowerCase().includes(filters.ticketId.toLowerCase()));

    // Filter by transaction date
    const matchesTransactionDate = !filters.transactionDate ||
      (ticket.transaction_date && (() => {
        // Parse dates in a timezone-safe way
        const filterDateStr = filters.transactionDate;

        let ticketDateStr;
        if (typeof ticket.transaction_date === 'string') {
          const dateMatch = ticket.transaction_date.match(/^(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            ticketDateStr = dateMatch[1];
          } else {
            const ticketDate = new Date(ticket.transaction_date);
            ticketDateStr = `${ticketDate.getFullYear()}-${String(ticketDate.getMonth() + 1).padStart(2, '0')}-${String(ticketDate.getDate()).padStart(2, '0')}`;
          }
        } else {
          const ticketDate = new Date(ticket.transaction_date);
          ticketDateStr = `${ticketDate.getFullYear()}-${String(ticketDate.getMonth() + 1).padStart(2, '0')}-${String(ticketDate.getDate()).padStart(2, '0')}`;
        }

        return ticketDateStr === filterDateStr;
      })());

    // Filter by due date
    const matchesDueDate = !filters.dueDate ||
      (ticket.transaction_date && (() => {
        const dueDate = calculateDueDate(ticket.transaction_date);
        const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
        return dueDateStr === filters.dueDate;
      })());

    return matchesCustomer && matchesTicketId && matchesTransactionDate && matchesDueDate;
  });

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      customerName: '',
      ticketId: '',
      transactionDate: '',
      dueDate: '',
    });
    setCurrentPage(1);
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
            startIcon={filtersOpen ? <ExpandLessIcon /> : <FilterAltIcon />}
            onClick={() => setFiltersOpen(!filtersOpen)}
            sx={{ mr: 2 }}
          >
            {filtersOpen ? 'Hide Filters' : 'Filter'}
          </Button>
        </Box>
      </Box>

      {/* Filter Panel */}
      <Collapse in={filtersOpen}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Filter Pawn Transactions</Typography>
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              disabled={!filters.customerName && !filters.ticketId && !filters.transactionDate && !filters.dueDate}
            >
              Clear All
            </Button>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Customer Name</InputLabel>
                <Select
                  value={filters.customerName}
                  onChange={(e) => handleFilterChange('customerName', e.target.value)}
                  label="Customer Name"
                >
                  <MenuItem value="">All Customers</MenuItem>
                  {uniqueCustomers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Ticket ID"
                value={filters.ticketId}
                onChange={(e) => handleFilterChange('ticketId', e.target.value)}
                size="small"
                placeholder="Search by ticket ID"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Transaction Date"
                type="date"
                value={filters.transactionDate}
                onChange={(e) => handleFilterChange('transactionDate', e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={filters.dueDate}
                onChange={(e) => handleFilterChange('dueDate', e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* Success Message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Alert */}
      {filteredTickets.filter(p => isOverdue(p)).length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Attention: There are {filteredTickets.filter(p => isOverdue(p)).length} overdue pawns. Please review and contact customers.
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
                <TableCell>ITEMS</TableCell>
                <TableCell>CUSTOMER</TableCell>
                <TableCell>TOTAL PRINCIPAL</TableCell>
                <TableCell>REDEEM AMOUNT</TableCell>
                <TableCell>TRANSACTION DATE</TableCell>
                <TableCell>DUE DATE</TableCell>
                <TableCell>STATUS</TableCell>
                <TableCell>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      {groupedTickets.length === 0
                        ? 'No pawn tickets found'
                        : 'No pawn tickets match the current filters'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((ticket) => {
                    const totalPrincipal = ticket.items.reduce((sum, item) => sum + (parseFloat(item.item_price) || 0), 0);
                    const redemptionAmount = calculateRedemptionAmount(totalPrincipal, ticket);
                    const isPawnStatus = (ticket.ticket_status || ticket.item_status) === 'PAWN';

                    return (
                      <TableRow key={ticket.pawn_ticket_id} hover>
                        <TableCell>{ticket.pawn_ticket_id}</TableCell>
                        <TableCell>
                          {ticket.items.map(item => item.item_description || item.item_id).join(', ')}
                        </TableCell>
                        <TableCell>{ticket.customer_name || 'N/A'}</TableCell>
                        <TableCell>{formatCurrency(totalPrincipal)}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 'bold', color: isPawnStatus ? '#1976d2' : 'inherit' }}>
                            {formatCurrency(redemptionAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {new Date(ticket.transaction_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          {calculateDueDate(ticket.transaction_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>{getStatusChip(getDisplayStatus(ticket))}</TableCell>
                        <TableCell>
                          {isPawnStatus && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<AttachMoneyIcon />}
                                onClick={() => handleRedeemClick(ticket)}
                                disabled={isStoreClosed}
                                sx={{
                                  backgroundColor: '#00a862',
                                  '&:hover': {
                                    backgroundColor: '#008f53'
                                  }
                                }}
                              >
                                Redeem
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<ScheduleIcon />}
                                onClick={() => handleExtendClick(ticket)}
                                disabled={isStoreClosed}
                                sx={{
                                  borderColor: '#1976d2',
                                  color: '#1976d2',
                                  '&:hover': {
                                    borderColor: '#1565c0',
                                    backgroundColor: '#e3f2fd'
                                  }
                                }}
                              >
                                Extend
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<BlockIcon />}
                                onClick={() => handleForfeitClick(ticket)}
                                disabled={isStoreClosed}
                                sx={{
                                  borderColor: '#f57c00',
                                  color: '#f57c00',
                                  '&:hover': {
                                    borderColor: '#e65100',
                                    backgroundColor: '#fff3e0'
                                  }
                                }}
                              >
                                Forfeit
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<HistoryIcon />}
                                onClick={() => handleViewHistory(ticket)}
                                sx={{
                                  borderColor: '#757575',
                                  color: '#757575',
                                  '&:hover': {
                                    borderColor: '#424242',
                                    backgroundColor: '#f5f5f5'
                                  }
                                }}
                              >
                                History
                              </Button>
                            </Box>
                          )}
                          {!isPawnStatus && (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<HistoryIcon />}
                              onClick={() => handleViewHistory(ticket)}
                              sx={{
                                borderColor: '#757575',
                                color: '#757575',
                                '&:hover': {
                                  borderColor: '#424242',
                                  backgroundColor: '#f5f5f5'
                                }
                              }}
                            >
                              History
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
      {!loading && !error && filteredTickets.length > 0 && (
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
            {(filters.customerName || filters.ticketId || filters.transactionDate || filters.dueDate) && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                ({filteredTickets.length} of {groupedTickets.length} tickets)
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="body2" sx={{ mx: 2 }}>
              Page {currentPage} of {Math.ceil(filteredTickets.length / itemsPerPage)}
            </Typography>
            <IconButton
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage >= Math.ceil(filteredTickets.length / itemsPerPage)}
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
            disabled={isStoreClosed}
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

      {/* Pawn History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Pawn History - {selectedTicketForHistory?.pawn_ticket_id}
        </DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : pawnHistory.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No history records found for this pawn ticket.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>DATE</TableCell>
                    <TableCell>ACTION</TableCell>
                    <TableCell>PRINCIPAL</TableCell>
                    <TableCell>INTEREST PAID</TableCell>
                    <TableCell>FEE PAID</TableCell>
                    <TableCell>TOTAL PAID</TableCell>
                    <TableCell>NEW DUE DATE</TableCell>
                    <TableCell>PERFORMED BY</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pawnHistory.map((record, index) => (
                    <TableRow key={record.id || index}>
                      <TableCell>
                        {formatHistoryDate(record.action_date)}
                      </TableCell>
                      <TableCell>
                        <span style={{
                          backgroundColor: getActionTypeColor(record.action_type) + '20',
                          color: getActionTypeColor(record.action_type),
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          {getActionTypeLabel(record.action_type)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {record.principal_amount ? formatCurrency(record.principal_amount) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.interest_paid ? formatCurrency(record.interest_paid) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.fee_paid ? formatCurrency(record.fee_paid) : '-'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {record.total_paid ? formatCurrency(record.total_paid) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.new_due_date ? new Date(record.new_due_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.performed_by_name || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {selectedTicketForHistory && (
            <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Customer:</strong> {selectedTicketForHistory.customer_name || 'N/A'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Items:</strong> {selectedTicketForHistory.items?.map(item => item.item_description || item.item_id).join(', ')}
              </Typography>
              <Typography variant="body2">
                <strong>Current Status:</strong> {getStatusChip(selectedTicketForHistory.item_status)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setHistoryDialogOpen(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Pawns;
