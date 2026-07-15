import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, Avatar, Button, IconButton, Chip,
  Divider, TextField, InputAdornment, Checkbox, FormControlLabel,
  Table, TableBody, TableCell, TableHead, TableRow,
  Snackbar, Alert, Stack, CircularProgress, Tooltip,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const GREEN = '#1a472a';
const GREEN_LIGHT = '#2d6a4f';
const REDEEM_TEAL = '#0d9488';
const REDEEM_DARK = '#0f766e';

const RDM_PENDING_KEY = 'pendingRDMTicketId';
const RDM_COUNTER_KEY = 'lastRDMTicketNumber';

function generateRedeemTicketId() {
  const voided  = JSON.parse(localStorage.getItem('voidedRDMTickets') || '[]');
  const pending = localStorage.getItem(RDM_PENDING_KEY);
  if (pending && !voided.includes(pending)) return pending;
  if (pending) localStorage.removeItem(RDM_PENDING_KEY);
  let last = parseInt(localStorage.getItem(RDM_COUNTER_KEY) || '0');
  let id;
  do { last += 1; id = `RDM-${last.toString().padStart(8, '0')}`; } while (voided.includes(id));
  localStorage.setItem(RDM_COUNTER_KEY, last.toString());
  localStorage.setItem(RDM_PENDING_KEY, id);
  return id;
}

function commitRedeemTicketId() {
  localStorage.removeItem(RDM_PENDING_KEY);
}

// Exported so ModernTransactions can void a redeem ticket the same way it
// voids pawn/buy/trade/sale tickets.
export { generateRedeemTicketId, commitRedeemTicketId };

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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

export default function RedeemTransactionScreen({
  customer,
  customerStats,
  onClose,
  onAddToWorkspace,
  existingRedeemData,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();

  const [ticketId] = useState(() => existingRedeemData?.ticketId || generateRedeemTicketId());
  const [searchQuery, setSearchQuery] = useState('');
  const [pawns, setPawns] = useState(existingRedeemData?.pawns || []);
  const [loadingPawns, setLoadingPawns] = useState(false);
  const [selectedRedemptions, setSelectedRedemptions] = useState(existingRedeemData?.selectedRedemptions || []);
  const [notes, setNotes] = useState(existingRedeemData?.notes || '');
  const [ticketNote, setTicketNote] = useState(existingRedeemData?.ticketNote || '');
  const [showOnReceipt, setShowOnReceipt] = useState(existingRedeemData?.showOnReceipt ?? false);
  const [snack, setSnack] = useState(null);

  useEffect(() => {
    if (!customer?.id) { setPawns([]); return; }
    setLoadingPawns(true);
    axios.get(`${config.apiUrl}/customers/${customer.id}/redeem/stats`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => setPawns(res.data.pawns || []))
      .catch(() => setPawns([]))
      .finally(() => setLoadingPawns(false));
  }, [customer?.id]);

  const filteredPawns = pawns.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.ref?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
  });

  const selectedRefs = new Set(selectedRedemptions.map(p => p.ref));

  const handleAdd = (source) => {
    if (selectedRefs.has(source.ref)) return;
    setSelectedRedemptions(prev => [...prev, source]);
  };

  const handleRemove = (ref) => {
    setSelectedRedemptions(prev => prev.filter(p => p.ref !== ref));
  };

  const totalRedeem = selectedRedemptions.reduce((s, p) => s + (parseFloat(p.redeem_amount) || 0), 0);
  const totalPrincipal = selectedRedemptions.reduce((s, p) => s + (parseFloat(p.principal) || 0), 0);
  const totalInterest = selectedRedemptions.reduce((s, p) => s + (parseFloat(p.interest_amount) || 0) + (parseFloat(p.insurance_amount) || 0), 0);
  const totalStorageFee = selectedRedemptions.reduce((s, p) => s + (parseFloat(p.storage_fee) || 0), 0);

  const fmt = (n) => `$${Number(n).toFixed(2)}`;

  const handleAddToWorkspace = () => {
    if (selectedRedemptions.length === 0) {
      setSnack({ severity: 'warning', message: 'Add at least one pawn to redeem before saving.' });
      return;
    }
    commitRedeemTicketId();
    onAddToWorkspace({
      ticketId,
      pawns,
      selectedRedemptions,
      notes,
      ticketNote,
      showOnReceipt,
      totalRedeem,
    });
  };

  const handleCheckoutNow = () => {
    if (!customer?.id) {
      setSnack({ severity: 'error', message: 'Please select a customer before checkout.' });
      return;
    }
    if (selectedRedemptions.length === 0) {
      setSnack({ severity: 'warning', message: 'Add at least one pawn to redeem before checkout.' });
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
    const employeeObj = currentUser
      ? { id: currentUser.id, name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(), role: currentUser.role }
      : null;

    // Checkout expects one cart item PER PHYSICAL ITEM in the ticket — only
    // the first item of each ticket carries the redemption price/principal
    // (everything else in that ticket prices at 0), the rest just carry
    // item_id/location so the post-checkout storage-location prompt works.
    const cartItems = selectedRedemptions.flatMap(p => {
      const items = (p.items && p.items.length > 0) ? p.items : [{ item_id: null, description: p.description, location: null }];
      return items.map((it, idx) => ({
        id:                `${ticketId}_${p.ref}_${it.item_id || idx}_${Date.now()}`,
        description:       it.description || p.description,
        long_desc:          it.description || p.description,
        short_desc:         it.description || p.description,
        price:              idx === 0 ? (parseFloat(p.redeem_amount) || 0) : 0,
        value:              idx === 0 ? (parseFloat(p.redeem_amount) || 0) : 0,
        transaction_type:  'redeem',
        pawnTicketId:       p.ref,
        redeemTicketId:     ticketId,
        item_id:            it.item_id,
        location:           it.location,
        principal:          idx === 0 ? p.principal : 0,
        interest:           idx === 0 ? (parseFloat(p.interest_amount) || 0) + (parseFloat(p.insurance_amount) || 0) : 0,
        totalRedemptionAmount: idx === 0 ? (parseFloat(p.redeem_amount) || 0) : 0,
        ticket_note:        ticketNote || null,
        show_on_receipt:    showOnReceipt,
        customer:           cartCustomer,
        employee:           employeeObj,
      }));
    });

    sessionStorage.setItem('checkoutItems', JSON.stringify(cartItems));
    sessionStorage.setItem('selectedCustomer', JSON.stringify(cartCustomer));
    sessionStorage.setItem('pendingRedeemReturn', JSON.stringify({
      customerId: customer.id,
      customer,
      ticketId,
      selectedRedemptions,
      notes,
      ticketNote,
      showOnReceipt,
    }));

    commitRedeemTicketId();
    navigate('/checkout', {
      state: { items: cartItems, allCartItems: cartItems, customer: cartCustomer, from: 'redeem-ticket' },
    });
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', bgcolor: '#f5f6fa', overflow: 'hidden' }}>

      {/* ── Main content ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Breadcrumb */}
        <Box sx={{ bgcolor: REDEEM_TEAL, color: '#fff', px: 2.5, py: 0.875, display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Typography variant="body2" fontWeight={400}
            sx={{ cursor: 'pointer', opacity: 0.85, '&:hover': { textDecoration: 'underline', opacity: 1 } }}
            onClick={onClose}>
            Transactions
          </Typography>
          <MuiIcons.ChevronRight sx={{ fontSize: 16, opacity: 0.6 }} />
          <Typography variant="body2" fontWeight={700}>Redeem Ticket ({ticketId})</Typography>
        </Box>

        {/* Search */}
        <Box sx={{ px: 2.5, pt: 2, pb: 1.5, flexShrink: 0 }}>
          <TextField
            fullWidth
            size="small"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Scan or search pawn ticket #, item description"
            InputProps={{
              startAdornment: <InputAdornment position="start"><MuiIcons.Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
              endAdornment: <InputAdornment position="end"><MuiIcons.QrCodeScanner sx={{ color: 'text.secondary' }} /></InputAdornment>,
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
          />
        </Box>

        {/* Scrollable content */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, pb: 2 }}>

          {/* Available Pawns */}
          <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.25, bgcolor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <Typography fontWeight={700} fontSize={13}>Active Pawns Available to Redeem</Typography>
            </Box>

            {loadingPawns ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress size={24} sx={{ color: REDEEM_TEAL }} />
              </Box>
            ) : filteredPawns.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary" fontSize={13}>
                  {customer ? 'No active pawns found for this customer.' : 'Select a customer to view redeemable pawns.'}
                </Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    {['Ref #', 'Description', 'Status', 'Due Date', 'Redeem Amount', 'Add'].map(h => (
                      <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', py: 1, whiteSpace: 'nowrap' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPawns.map(source => {
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
                          <Typography fontSize={12} fontWeight={600}>{source.ref}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.25, maxWidth: 220 }}>
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
                          <Typography fontSize={12} fontWeight={600}>{fmt(source.redeem_amount)}</Typography>
                          <Typography fontSize={10} color="text.secondary">
                            Principal {fmt(source.principal)}
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
                              borderColor: alreadyAdded ? undefined : REDEEM_TEAL,
                              color: alreadyAdded ? undefined : REDEEM_TEAL,
                              bgcolor: alreadyAdded ? '#16a34a' : undefined,
                              '&:hover': { borderColor: REDEEM_DARK, color: REDEEM_DARK },
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

          {/* Selected Redemptions */}
          {selectedRedemptions.length > 0 && (
            <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.25, bgcolor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <Typography fontWeight={700} fontSize={13}>Selected for Redemption</Typography>
              </Box>

              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    {['Ref #', 'Description', 'Principal', 'Interest + Insurance', 'Storage Fee', 'Total', 'Actions'].map(h => (
                      <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', py: 1, whiteSpace: 'nowrap' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedRedemptions.map(p => (
                    <TableRow key={p.ref} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography fontSize={12} fontWeight={600}>{p.ref}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5, maxWidth: 180 }}>
                        <Typography fontSize={12} fontWeight={600} noWrap>{p.description}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography fontSize={12}>{fmt(p.principal)}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography fontSize={12}>{fmt((parseFloat(p.interest_amount) || 0) + (parseFloat(p.insurance_amount) || 0))}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography fontSize={12}>{fmt(p.storage_fee)}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography fontSize={14} fontWeight={700} color={REDEEM_TEAL}>{fmt(p.redeem_amount)}</Typography>
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

              <Box sx={{ px: 2, py: 1, bgcolor: '#f0fdfa', borderTop: '1px solid #99f6e4', display: 'flex', alignItems: 'center', gap: 1 }}>
                <MuiIcons.Info sx={{ fontSize: 16, color: REDEEM_TEAL, flexShrink: 0 }} />
                <Typography fontSize={12} color={REDEEM_DARK}>
                  Redemption pays off the full principal plus accrued interest, insurance, and storage fee for each pawn — items are returned to the customer.
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
            disabled={selectedRedemptions.length === 0}
            sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13, borderColor: REDEEM_TEAL, color: REDEEM_TEAL, '&:hover': { borderColor: REDEEM_DARK, bgcolor: '#f0fdfa' } }}
          >
            Add to Workspace
          </Button>
          <Button
            variant="contained"
            endIcon={<MuiIcons.ArrowForward />}
            disabled={selectedRedemptions.length === 0}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    src={imgUrl || undefined}
                    sx={{ width: 48, height: 48, bgcolor: REDEEM_TEAL, color: '#fff', fontSize: 17, fontWeight: 700, flexShrink: 0 }}
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
                      sx={{ color: REDEEM_TEAL, border: `1px solid ${REDEEM_TEAL}`, '&:hover': { bgcolor: '#f0fdfa' } }}
                      onClick={() => {
                        sessionStorage.setItem('pendingRedeemState', JSON.stringify({
                          customerId: customer.id,
                          customer,
                          ticketId,
                          selectedRedemptions,
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

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography fontSize={10} color="text.secondary">Active Pawns</Typography>
                    <Typography fontSize={14} fontWeight={700} color={REDEEM_TEAL}>{customerStats?.active_pawns ?? 0}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography fontSize={10} color="text.secondary">Overdue</Typography>
                    <Typography fontSize={14} fontWeight={700} color="#dc2626">{customerStats?.overdue_pawns ?? 0}</Typography>
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
            placeholder="Add notes about this redeem ticket..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: 12, bgcolor: '#f9fafb' } }}
          />
        </Box>

        {/* ── Redeem Summary ── */}
        <Box sx={{ p: 2, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5, pb: 1, borderBottom: `2px solid ${REDEEM_TEAL}` }}>
            <MuiIcons.AttachMoney sx={{ color: REDEEM_TEAL, fontSize: 18 }} />
            <Typography fontWeight={700} fontSize={13} color={REDEEM_TEAL} letterSpacing={0.5}>REDEEM SUMMARY</Typography>
          </Box>

          <Stack spacing={0.75}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontSize={12} color="text.secondary">Items Selected</Typography>
              <Typography fontSize={13} fontWeight={600}>{selectedRedemptions.length}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontSize={12} color="text.secondary">Principal</Typography>
              <Typography fontSize={13} fontWeight={600}>{fmt(totalPrincipal)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontSize={12} color="text.secondary">Interest + Insurance</Typography>
              <Typography fontSize={13} fontWeight={600}>{fmt(totalInterest)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontSize={12} color="text.secondary">Storage Fee</Typography>
              <Typography fontSize={13} fontWeight={600}>{fmt(totalStorageFee)}</Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontSize={13} fontWeight={700}>Total Due from Customer</Typography>
              <Typography fontSize={20} fontWeight={800} color={REDEEM_TEAL}>{fmt(totalRedeem)}</Typography>
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
