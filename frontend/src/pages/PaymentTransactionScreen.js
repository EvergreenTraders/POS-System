import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, Avatar, Button, IconButton, Chip,
  Divider, TextField, InputAdornment, Checkbox, FormControlLabel,
  Table, TableBody, TableCell, TableHead, TableRow,
  Select, MenuItem, Snackbar, Alert, Stack, CircularProgress, Tooltip,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useWorkingDate } from '../context/WorkingDateContext';

const GREEN = '#1a472a';
const GREEN_LIGHT = '#2d6a4f';
const PAYMENT_AMBER = '#f9a825';
const PAYMENT_DARK  = '#f57f17';

const PMT_PENDING_KEY = 'pendingPMTTicketId';
const PMT_COUNTER_KEY = 'lastPMTTicketNumber';

function generatePaymentTicketId() {
  const voided  = JSON.parse(localStorage.getItem('voidedPMTTickets') || '[]');
  const pending = localStorage.getItem(PMT_PENDING_KEY);
  if (pending && !voided.includes(pending)) return pending;
  if (pending) localStorage.removeItem(PMT_PENDING_KEY);
  let last = parseInt(localStorage.getItem(PMT_COUNTER_KEY) || '0');
  let id;
  do { last += 1; id = `PMT-${last.toString().padStart(8, '0')}`; } while (voided.includes(id));
  localStorage.setItem(PMT_COUNTER_KEY, last.toString());
  localStorage.setItem(PMT_PENDING_KEY, id);
  return id;
}

function commitPaymentTicketId() {
  localStorage.removeItem(PMT_PENDING_KEY);
}

function addDays(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pawn_extension', label: 'Pawn Extensions', icon: 'LocalOffer' },
  { key: 'layaway', label: 'Layaway', icon: 'CalendarMonth' },
  { key: 'repair', label: 'Repair', icon: 'Build' },
  { key: 'other', label: 'Other', icon: 'MoreHoriz' },
];

function StatusChip({ status }) {
  const isOverdue = status === 'OVERDUE';
  return (
    <Chip
      label={isOverdue ? 'OVERDUE' : 'ACTIVE'}
      size="small"
      sx={{
        height: 20, fontSize: 10, fontWeight: 700,
        bgcolor: isOverdue ? '#fef2f2' : '#f0fdf4',
        color: isOverdue ? '#dc2626' : '#16a34a',
        border: `1px solid ${isOverdue ? '#fca5a5' : '#86efac'}`,
      }}
    />
  );
}

function TypeIcon({ type }) {
  if (type === 'pawn_extension') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <MuiIcons.LocalOffer sx={{ fontSize: 16, color: PAYMENT_AMBER }} />
        <Typography fontSize={12} fontWeight={600} color={PAYMENT_AMBER}>Pawn Extension</Typography>
      </Box>
    );
  }
  if (type === 'layaway') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <MuiIcons.CalendarMonth sx={{ fontSize: 16, color: '#7c3aed' }} />
        <Typography fontSize={12} fontWeight={600} color="#7c3aed">Layaway</Typography>
      </Box>
    );
  }
  if (type === 'repair') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <MuiIcons.Build sx={{ fontSize: 16, color: '#0891b2' }} />
        <Typography fontSize={12} fontWeight={600} color="#0891b2">Repair</Typography>
      </Box>
    );
  }
  return null;
}

function getCustomerImageUrl(customer) {
  if (!customer?.image) return null;
  const img = customer.image;
  if (typeof img === 'object' && img.type === 'Buffer' && img.data) {
    const base64 = btoa(new Uint8Array(img.data).reduce((d, b) => d + String.fromCharCode(b), ''));
    return `data:image/jpeg;base64,${base64}`;
  }
  if (typeof img === 'string') return img;
  return null;
}

export default function PaymentTransactionScreen({
  customer,
  customerStats,
  onClose,
  onAddToWorkspace,
  existingPaymentData,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { workingDate } = useWorkingDate();

  const [ticketId] = useState(() => existingPaymentData?.ticketId || generatePaymentTicketId());
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pawns, setPawns] = useState(existingPaymentData?.pawns || []);
  const [loadingPawns, setLoadingPawns] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState(existingPaymentData?.selectedPayments || []);
  const [notes, setNotes] = useState(existingPaymentData?.notes || '');
  const [ticketNote, setTicketNote] = useState(existingPaymentData?.ticketNote || '');
  const [showOnReceipt, setShowOnReceipt] = useState(existingPaymentData?.showOnReceipt ?? false);
  const [snack, setSnack] = useState(null);


  // Sync counter from DB on mount so the next ID doesn't overlap with existing records
  useEffect(() => {
    axios.get(`${config.apiUrl}/payment-ticket/last-id`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(res => {
      const serverNum = res.data.last_number || 0;
      const localNum  = parseInt(localStorage.getItem(PMT_COUNTER_KEY) || '0', 10);
      if (serverNum > localNum) localStorage.setItem(PMT_COUNTER_KEY, serverNum.toString());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!customer?.id) { setPawns([]); return; }
    setLoadingPawns(true);
    axios.get(`${config.apiUrl}/customers/${customer.id}/pmt/stats`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => setPawns(res.data.pawns || []))
      .catch(() => setPawns([]))
      .finally(() => setLoadingPawns(false));
  }, [customer?.id]);

  const allSources = pawns;

  const filteredSources = allSources.filter(s => {
    if (activeFilter !== 'all' && s.type !== activeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.ref?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedRefs = new Set(selectedPayments.map(p => p.ref));

  const handleAdd = (source) => {
    if (selectedRefs.has(source.ref)) return;
    if (source.type === 'pawn_extension') {
      const newDueRaw = addDays(source.due_date_raw, source.frequency_days);
      setSelectedPayments(prev => [...prev, {
        ...source,
        numPeriods: 1,
        paymentAmount: source.extension_amount,
        newDueDateRaw: newDueRaw,
        newDueDate: formatDate(newDueRaw),
      }]);
    } else if (source.type === 'layaway') {
      setSelectedPayments(prev => [...prev, {
        ...source,
        paymentAmount: '',
        remainingBalance: source.balance,
      }]);
    }
  };

  const handleRemove = (ref) => {
    setSelectedPayments(prev => prev.filter(p => p.ref !== ref));
  };

  const handlePeriodsChange = (ref, numPeriods) => {
    setSelectedPayments(prev => prev.map(p => {
      if (p.ref !== ref) return p;
      const newDueRaw = addDays(p.due_date_raw, p.frequency_days * numPeriods);
      return {
        ...p,
        numPeriods,
        paymentAmount: Math.round(p.extension_amount * numPeriods * 100) / 100,
        newDueDateRaw: newDueRaw,
        newDueDate: formatDate(newDueRaw),
      };
    }));
  };

  const handleLayawayAmountChange = (ref, val) => {
    setSelectedPayments(prev => prev.map(p => {
      if (p.ref !== ref) return p;
      const amt = parseFloat(val) || 0;
      return {
        ...p,
        paymentAmount: val,
        remainingBalance: Math.max(0, p.balance - amt),
      };
    }));
  };

  // Summary
  const pawnTotal = selectedPayments
    .filter(p => p.type === 'pawn_extension')
    .reduce((s, p) => s + (parseFloat(p.paymentAmount) || 0), 0);
  const layawayTotal = selectedPayments
    .filter(p => p.type === 'layaway')
    .reduce((s, p) => s + (parseFloat(p.paymentAmount) || 0), 0);
  const totalPayment = pawnTotal + layawayTotal;

  const fmt = (n) => `$${Number(n).toFixed(2)}`;

  const handleAddToWorkspace = () => {
    if (selectedPayments.length === 0) {
      setSnack({ severity: 'warning', message: 'Add at least one payment before saving.' });
      return;
    }
    commitPaymentTicketId();
    onAddToWorkspace({
      ticketId,
      pawns,
      selectedPayments,
      notes,
      ticketNote,
      showOnReceipt,
      totalPayment,
      pawnTotal,
      layawayTotal,
    });
  };

  const handleCheckoutNow = () => {
    if (!customer?.id) {
      setSnack({ severity: 'error', message: 'Please select a customer before checkout.' });
      return;
    }
    if (selectedPayments.length === 0) {
      setSnack({ severity: 'warning', message: 'Add at least one payment before checkout.' });
      return;
    }

    const cartCustomer = {
      id:         customer.id,
      first_name: customer.first_name,
      last_name:  customer.last_name,
      name:       `${customer.first_name} ${customer.last_name}`.trim(),
      phone:      customer.phone || '',
      email:      customer.email || '',
    };

    const cartItems = selectedPayments
      .filter(p => p.type === 'pawn_extension')
      .map(p => {
        const numPeriods    = p.numPeriods || 1;
        const extensionDays = (p.frequency_days || 30) * numPeriods;
        const prevDate      = p.due_date_raw || null;
        const newDate       = p.newDueDateRaw
          ? new Date(p.newDueDateRaw).toISOString().split('T')[0]
          : null;
        const interestPaid  = Math.round(p.principal * (p.interest_rate  / 100) * numPeriods * 100) / 100;
        const feePaid       = Math.round((p.principal * (p.insurance_rate / 100) + (p.storage_fee || 0)) * numPeriods * 100) / 100;
        return {
          id:               `${ticketId}_${p.ref}_${Date.now()}`,
          description:      `${p.ref} — ${p.description}`,
          price:            parseFloat(p.paymentAmount) || 0,
          value:            parseFloat(p.paymentAmount) || 0,
          transaction_type: 'payment',
          pawnTicketId:     p.ref,
          paymentTicketId:  ticketId,
          principal:        p.principal,
          interest_paid:    interestPaid,
          fee_paid:         feePaid,
          total_paid:       parseFloat(p.paymentAmount) || 0,
          previous_due_date: prevDate,
          new_due_date:     newDate,
          extension_days:   extensionDays,
          numPeriods,
          ticket_note:      ticketNote || null,
          show_on_receipt:  showOnReceipt,
          customer:         cartCustomer,
          employee: currentUser
            ? { id: currentUser.id, name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(), role: currentUser.role }
            : null,
        };
      });

    sessionStorage.setItem('checkoutItems', JSON.stringify(cartItems));
    sessionStorage.setItem('selectedCustomer', JSON.stringify(cartCustomer));
    sessionStorage.setItem('pendingPaymentReturn', JSON.stringify({
      customerId: customer.id,
      customer,
      ticketId,
      selectedPayments,
      notes,
      ticketNote,
      showOnReceipt,
    }));

    commitPaymentTicketId();
    navigate('/checkout', {
      state: { items: cartItems, allCartItems: cartItems, customer: cartCustomer, from: 'payment-ticket' },
    });
  };

  const tabCounts = {
    all: allSources.length,
    pawn_extension: allSources.filter(s => s.type === 'pawn_extension').length,
    layaway: 0,
    repair: 0,
    other: 0,
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', bgcolor: '#f5f6fa', overflow: 'hidden' }}>

      {/* ── Main content ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Breadcrumb — matches Buy / Sale / Trade / Pawn pattern */}
        <Box sx={{ bgcolor: PAYMENT_AMBER, color: '#fff', px: 2.5, py: 0.875, display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Typography variant="body2" fontWeight={400}
            sx={{ cursor: 'pointer', opacity: 0.85, '&:hover': { textDecoration: 'underline', opacity: 1 } }}
            onClick={onClose}>
            Transactions
          </Typography>
          <MuiIcons.ChevronRight sx={{ fontSize: 16, opacity: 0.6 }} />
          <Typography variant="body2" fontWeight={700}>Payment Ticket ({ticketId})</Typography>
        </Box>

        {/* Search + filter */}
        <Box sx={{ px: 2.5, pt: 2, pb: 1.5, flexShrink: 0 }}>
          <TextField
            fullWidth
            size="small"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Scan or search ticket #, pawn #, layaway #, repair #"
            InputProps={{
              startAdornment: <InputAdornment position="start"><MuiIcons.Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
              endAdornment: <InputAdornment position="end"><MuiIcons.QrCodeScanner sx={{ color: 'text.secondary' }} /></InputAdornment>,
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' }, mb: 1.5 }}
          />

          {/* Filter tabs */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {TYPE_FILTERS.map(f => {
              const active = activeFilter === f.key;
              const IconComp = f.icon ? MuiIcons[f.icon] : null;
              return (
                <Button
                  key={f.key}
                  size="small"
                  variant={active ? 'contained' : 'outlined'}
                  onClick={() => setActiveFilter(f.key)}
                  startIcon={IconComp ? <IconComp sx={{ fontSize: 15 }} /> : undefined}
                  sx={{
                    borderRadius: 3, fontSize: 12, fontWeight: active ? 700 : 500, px: 1.5,
                    bgcolor: active ? PAYMENT_AMBER : undefined,
                    borderColor: active ? PAYMENT_AMBER : undefined,
                    color: active ? '#fff' : 'text.secondary',
                    '&:hover': { bgcolor: active ? PAYMENT_DARK : undefined },
                  }}
                >
                  {f.label}
                  {tabCounts[f.key] > 0 && (
                    <Chip
                      label={tabCounts[f.key]}
                      size="small"
                      sx={{ ml: 0.5, height: 16, fontSize: 10, bgcolor: active ? 'rgba(255,255,255,0.3)' : '#f0f0f0', color: active ? '#fff' : 'text.secondary', '& .MuiChip-label': { px: 0.75 } }}
                    />
                  )}
                </Button>
              );
            })}
          </Box>
        </Box>

        {/* Scrollable content */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, pb: 2 }}>

          {/* Available Payment Sources */}
          <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.25, bgcolor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <Typography fontWeight={700} fontSize={13}>Available Payment Sources</Typography>
            </Box>

            {loadingPawns ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress size={24} sx={{ color: PAYMENT_AMBER }} />
              </Box>
            ) : filteredSources.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary" fontSize={13}>
                  {customer ? 'No active payment sources found.' : 'Select a customer to view payment sources.'}
                </Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    {['Type', 'Ref #', 'Description', 'Status', 'Due Date', 'Amount Due / Balance', 'Add'].map(h => (
                      <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', py: 1, whiteSpace: 'nowrap' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSources.map(source => {
                    const alreadyAdded = selectedRefs.has(source.ref);
                    return (
                      <TableRow
                        key={source.ref}
                        sx={{
                          '&:last-child td': { borderBottom: 0 },
                          bgcolor: alreadyAdded ? '#f0fdf4' : undefined,
                          opacity: alreadyAdded ? 0.7 : 1,
                        }}
                      >
                        <TableCell sx={{ py: 1.25 }}>
                          <TypeIcon type={source.type} />
                        </TableCell>
                        <TableCell sx={{ py: 1.25 }}>
                          <Typography fontSize={12} fontWeight={600}>{source.ref}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.25, maxWidth: 180 }}>
                          <Typography fontSize={12} fontWeight={600} noWrap>{source.description}</Typography>
                          <Typography fontSize={11} color="text.secondary">
                            {source.transaction_date ? `Pawned on ${formatDate(source.transaction_date)}` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.25 }}>
                          <StatusChip status={source.status} />
                        </TableCell>
                        <TableCell sx={{ py: 1.25 }}>
                          <Typography fontSize={12}>{source.due_date}</Typography>
                          <Typography
                            fontSize={11}
                            color={source.status === 'OVERDUE' ? '#dc2626' : 'text.secondary'}
                            fontWeight={source.status === 'OVERDUE' ? 600 : 400}
                          >
                            {source.days_info}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.25 }}>
                          <Typography fontSize={12} fontWeight={600}>
                            {source.type === 'pawn_extension'
                              ? `Extension: ${fmt(source.extension_amount)}`
                              : `Balance: ${fmt(source.balance)}`}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.25 }}>
                          <Button
                            size="small"
                            variant={alreadyAdded ? 'contained' : 'outlined'}
                            disabled={alreadyAdded}
                            onClick={() => handleAdd(source)}
                            sx={{
                              fontSize: 11, minWidth: 56, py: 0.4,
                              borderColor: alreadyAdded ? undefined : PAYMENT_AMBER,
                              color: alreadyAdded ? undefined : PAYMENT_AMBER,
                              bgcolor: alreadyAdded ? '#16a34a' : undefined,
                              '&:hover': { borderColor: PAYMENT_DARK, color: PAYMENT_DARK },
                            }}
                          >
                            {alreadyAdded ? <MuiIcons.Check sx={{ fontSize: 16 }} /> : 'Add'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Paper>

          {/* Selected Payments */}
          {selectedPayments.length > 0 && (
            <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.25, bgcolor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <Typography fontWeight={700} fontSize={13}>Selected Payments</Typography>
              </Box>

              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    {['Type', 'Ref #', 'Description', 'Current Status', 'Payment Details', 'Payment Amount', 'Result', 'Actions'].map(h => (
                      <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', py: 1, whiteSpace: 'nowrap' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedPayments.map(p => (
                    <TableRow key={p.ref} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell sx={{ py: 1.5 }}>
                        <TypeIcon type={p.type} />
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography fontSize={12} fontWeight={600}>{p.ref}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5, maxWidth: 140 }}>
                        <Typography fontSize={12} fontWeight={600} noWrap>{p.description}</Typography>
                        <Typography fontSize={11} color="text.secondary">
                          {p.transaction_date ? `Pawned on ${formatDate(p.transaction_date)}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        {p.type === 'pawn_extension' ? (
                          <>
                            <Typography fontSize={11}>Current Due: {p.due_date}</Typography>
                            <Typography fontSize={11} color="text.secondary">Term: {p.frequency_days} days</Typography>
                          </>
                        ) : (
                          <Typography fontSize={11}>Balance: {fmt(p.balance)}</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        {p.type === 'pawn_extension' ? (
                          <Select
                            size="small"
                            value={p.numPeriods}
                            onChange={e => handlePeriodsChange(p.ref, e.target.value)}
                            sx={{ fontSize: 12, minWidth: 160, '& .MuiSelect-select': { py: 0.75 } }}
                          >
                            {[1, 2, 3, 6, 12].map(n => (
                              <MenuItem key={n} value={n} sx={{ fontSize: 12 }}>
                                {n} {n === 1 ? 'period' : 'periods'} ({p.frequency_days * n} days)
                              </MenuItem>
                            ))}
                          </Select>
                        ) : (
                          <Box>
                            <Typography fontSize={11} color="text.secondary" mb={0.5}>Payment Amount</Typography>
                            <TextField
                              size="small"
                              value={p.paymentAmount}
                              onChange={e => handleLayawayAmountChange(p.ref, e.target.value)}
                              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                              sx={{ width: 120, '& .MuiOutlinedInput-input': { py: 0.75, fontSize: 13 } }}
                              inputProps={{ inputMode: 'decimal' }}
                            />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography fontSize={14} fontWeight={700}>
                          {fmt(parseFloat(p.paymentAmount) || 0)}
                        </Typography>
                        {p.type === 'pawn_extension' && (
                          <Typography fontSize={10} color="text.secondary">Auto-calculated</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        {p.type === 'pawn_extension' ? (
                          <>
                            <Typography fontSize={11} color="text.secondary">New Due Date</Typography>
                            <Typography fontSize={12} fontWeight={700} color={GREEN}>{p.newDueDate}</Typography>
                          </>
                        ) : (
                          <>
                            <Typography fontSize={11} color="text.secondary">Remaining Balance</Typography>
                            <Typography fontSize={12} fontWeight={700} color={GREEN}>
                              {fmt(p.remainingBalance ?? p.balance)}
                            </Typography>
                          </>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <IconButton size="small" color="error" onClick={() => handleRemove(p.ref)}>
                          <MuiIcons.Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Info note */}
              <Box sx={{ px: 2, py: 1, bgcolor: '#fffbeb', borderTop: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 1 }}>
                <MuiIcons.Info sx={{ fontSize: 16, color: PAYMENT_AMBER, flexShrink: 0 }} />
                <Typography fontSize={12} color="#e65100">
                  Pawn extension amounts are calculated based on the pawn terms. Use edit to override the amount if needed.
                </Typography>
              </Box>
            </Paper>
          )}

        </Box>

        {/* Bottom action bar */}
        <Paper sx={{ px: 2, py: 1.25, borderRadius: 0, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 1.25, position: 'sticky', bottom: 0, zIndex: 10 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              Ticket Note
            </Typography>
            <TextField
              fullWidth size="small"
              placeholder="Add a note for this ticket (optional)"
              value={ticketNote}
              onChange={e => setTicketNote(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
          <FormControlLabel
            control={<Checkbox size="small" checked={showOnReceipt} onChange={e => setShowOnReceipt(e.target.checked)} />}
            label={<Typography variant="caption">Show on receipt</Typography>}
            sx={{ whiteSpace: 'nowrap', mr: 0 }}
          />
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
            Cancel
          </Button>
          <Button
            variant="outlined"
            onClick={handleAddToWorkspace}
            disabled={selectedPayments.length === 0}
            sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13, borderColor: PAYMENT_AMBER, color: PAYMENT_AMBER, '&:hover': { borderColor: PAYMENT_DARK, bgcolor: '#fff8e1' } }}
          >
            Add to Workspace
          </Button>
          <Button
            variant="contained"
            endIcon={<MuiIcons.ArrowForward />}
            disabled={selectedPayments.length === 0}
            onClick={handleCheckoutNow}
            sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13, bgcolor: GREEN, '&:hover': { bgcolor: GREEN_LIGHT }, fontWeight: 700 }}
          >
            Checkout Now
          </Button>
        </Paper>
      </Box>

      {/* ── Right: Customer + Summary panel ── */}
      <Paper sx={{ width: 280, flexShrink: 0, borderRadius: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid #e5e7eb' }}>

        {/* ── Customer header ── */}
        <Box sx={{ p: 2, borderBottom: '2px solid #f0f0f0' }}>
          {customer ? (() => {
            const imgUrl = getCustomerImageUrl(customer);
            return (
              <>
                {/* Avatar + name + edit */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    src={imgUrl || undefined}
                    sx={{ width: 48, height: 48, bgcolor: PAYMENT_AMBER, color: '#fff', fontSize: 17, fontWeight: 700, flexShrink: 0 }}
                  >
                    {!imgUrl && `${(customer.first_name || '')[0] || ''}${(customer.last_name || '')[0] || ''}`.toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} fontSize={14} lineHeight={1.2} noWrap>
                      {customer.first_name} {customer.last_name}
                    </Typography>
                    {customer.phone && (
                      <Typography fontSize={12} color="text.secondary" lineHeight={1.4}>
                        {customer.phone}
                      </Typography>
                    )}
                  </Box>
                  <Tooltip title="Edit customer">
                    <IconButton
                      size="small"
                      sx={{ color: PAYMENT_AMBER, border: `1px solid ${PAYMENT_AMBER}`, '&:hover': { bgcolor: '#fff8e1' } }}
                      onClick={() => {
                        sessionStorage.setItem('pendingPaymentState', JSON.stringify({
                          customerId: customer.id,
                          customer,
                          ticketId,
                          selectedPayments,
                          notes,
                          ticketNote,
                          showOnReceipt,
                        }));
                        navigate('/customer-editor', {
                          state: {
                            customer: {
                              ...customer,
                              id_expiry_date: customer.id_expiry_date ? new Date(customer.id_expiry_date).toISOString().substring(0, 10) : '',
                              date_of_birth:  customer.date_of_birth  ? new Date(customer.date_of_birth).toISOString().substring(0, 10)  : '',
                            },
                            mode: 'edit',
                            returnTo: location.pathname,
                          },
                        });
                      }}
                    >
                      <MuiIcons.Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Customer stats row */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography fontSize={10} color="text.secondary">Active Pawns</Typography>
                    <Typography fontSize={14} fontWeight={700} color={PAYMENT_AMBER}>{customerStats?.active_pawns ?? 0}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography fontSize={10} color="text.secondary">Store Credit</Typography>
                    <Typography fontSize={14} fontWeight={700} color={GREEN}>
                      ${Number(customerStats?.store_credit ?? 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography fontSize={10} color="text.secondary">Since</Typography>
                    <Typography fontSize={11} fontWeight={600}>
                      {customer.created_at
                        ? new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        : '—'}
                    </Typography>
                  </Box>
                </Box>
              </>
            );
          })() : (
            <Typography fontSize={13} color="text.secondary" fontStyle="italic">No customer selected.</Typography>
          )}
        </Box>

        {/* ── Notes ── */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            <MuiIcons.StickyNote2 sx={{ fontSize: 15, color: 'text.secondary' }} />
            <Typography fontSize={12} fontWeight={600}>Notes</Typography>
          </Box>
          <TextField
            fullWidth multiline rows={2} size="small"
            placeholder="Add notes about this payment ticket..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: 12, bgcolor: '#f9fafb' } }}
          />
        </Box>

        {/* ── Payment Summary ── */}
        <Box sx={{ p: 2, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5, pb: 1, borderBottom: `2px solid ${PAYMENT_AMBER}` }}>
            <MuiIcons.AttachMoney sx={{ color: PAYMENT_AMBER, fontSize: 18 }} />
            <Typography fontWeight={700} fontSize={13} color={PAYMENT_AMBER} letterSpacing={0.5}>PAYMENT SUMMARY</Typography>
          </Box>

          <Stack spacing={0.75}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontSize={12} color="text.secondary">Pawn Extensions</Typography>
              <Typography fontSize={13} fontWeight={600}>{fmt(pawnTotal)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontSize={12} color="text.secondary">Layaway Payments</Typography>
              <Typography fontSize={13} fontWeight={600}>{fmt(layawayTotal)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontSize={12} color="text.secondary">Repair Payments</Typography>
              <Typography fontSize={13} fontWeight={600}>{fmt(0)}</Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontSize={13} fontWeight={700}>Total Payment</Typography>
              <Typography fontSize={20} fontWeight={800} color={PAYMENT_AMBER}>{fmt(totalPayment)}</Typography>
            </Box>
          </Stack>
        </Box>
      </Paper>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {snack && (
          <Alert severity={snack.severity} onClose={() => setSnack(null)}>
            {snack.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}
