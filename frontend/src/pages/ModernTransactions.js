import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, Grid, Avatar, Button, IconButton, Chip,
  Divider, TextField, InputAdornment, Badge, Tooltip, Stack, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import PawnTransactionScreen from './PawnTransactionScreen';

const GREEN = '#1a472a';
const GREEN_LIGHT = '#2d6a4f';

// ── Sub-components ────────────────────────────────────────────────────────────

const PAWN_ACCENT = '#6a1b9a';

function PawnTransactionCard({ tx, pawnIcon, pawnColor, onOpen, onVoid }) {
  const totalPawnAmount = Number(tx.totalPawnAmount) || 0;
  const costToRedeem = Number(tx.costToRedeem) || 0;
  const fmt = (n) => `$${Number(n).toFixed(2)}`;
  const overduePawnCount = tx.overduePawnCount ?? 0;
  const accent = pawnColor || PAWN_ACCENT;
  const PawnIconComponent = pawnIcon ? (MuiIcons[pawnIcon] ?? MuiIcons.Casino) : MuiIcons.Casino;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#e0e0e0' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1, borderLeft: `4px solid ${accent}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PawnIconComponent sx={{ fontSize: 20, color: accent }} />
          <Typography fontWeight={700} fontSize={13} color={accent}>PAWN</Typography>
          <Chip label="Active" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: '#1565c0', color: '#fff' }} />
        </Box>
        <IconButton size="small"><MuiIcons.MoreVert fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ px: 1.5, pb: 1.25 }}>
        <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
          {tx.pawnItems?.length || 0} {(tx.pawnItems?.length || 0) === 1 ? 'item' : 'items'}
        </Typography>

        {/* Item rows */}
        {(tx.pawnItems || []).map((item, i) => {
          const thumb = item.images?.find(img => img.isPrimary)?.url || item.images?.[0]?.url;
          return (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid #f0f0f0' }}>
              {thumb ? (
                <Box component="img" src={thumb} alt="" sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: '#f5f5f5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MuiIcons.Inventory2 sx={{ fontSize: 20, color: '#bdbdbd' }} />
                </Box>
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" fontWeight={600} display="block" noWrap>{item.item}</Typography>
                <Typography variant="caption" color="text.secondary">Pawn Amount: {fmt(item.amount)}</Typography>
              </Box>
            </Box>
          );
        })}

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption">Total Pawn Amount</Typography>
          <Typography variant="caption" fontWeight={600}>{fmt(totalPawnAmount)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption">Due Date</Typography>
          <Typography variant="caption" fontWeight={700}>{tx.dueDate || '—'}</Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" fontWeight={600} color={PAWN_ACCENT}>Cost to Redeem</Typography>
          <Typography variant="caption" fontWeight={700} color={PAWN_ACCENT}>{fmt(costToRedeem)}</Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" fontWeight={600} color="#c62828">Net Effect</Typography>
          <Typography variant="caption" fontWeight={700} color="#c62828">-{fmt(totalPawnAmount)}</Typography>
        </Box>

        {tx.overduePawnCount > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: '#fef2f2', borderRadius: 1, px: 1, py: 0.75, mb: 1 }}>
            <MuiIcons.Warning sx={{ fontSize: 15, color: '#dc2626', flexShrink: 0 }} />
            <Typography variant="caption" color="#dc2626">
              Customer has {tx.overduePawnCount} overdue {tx.overduePawnCount === 1 ? 'pawn' : 'pawns'}.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<MuiIcons.OpenInNew sx={{ fontSize: 13 }} />}
            onClick={onOpen}
            sx={{ flex: 1, fontSize: 11 }}>
            Open
          </Button>
          <IconButton size="small" color="error" onClick={onVoid}
            sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 1 }}>
            <MuiIcons.Block fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}

function TransactionTypeButton({ label, icon, color, onClick, count }) {
  return (
    <Badge badgeContent={count || 0} color="primary" overlap="rectangular"
      sx={{ '& .MuiBadge-badge': { fontSize: 9, minWidth: 16, height: 16, top: 4, right: 4 } }}>
      <Paper
        variant="outlined"
        onClick={onClick}
        sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          p: { md: 1, xl: 0.75 }, cursor: 'pointer', borderRadius: 2, borderColor: '#e0e0e0',
          minWidth: { md: 70, xl: 60 },
          '&:hover': { bgcolor: '#f5f5f5', borderColor: color },
          transition: 'all 0.15s',
        }}
      >
        <Box sx={{ color, mb: 0.25, '& svg': { fontSize: { md: 24, xl: 20 } } }}>{icon}</Box>
        <Typography align="center" fontWeight={500} sx={{ fontSize: { md: 10, xl: 9 }, color }}>{label}</Typography>
      </Paper>
    </Badge>
  );
}

// ── Workspace localStorage helpers (mirrors CustomerTicket.js pattern) ────────

const WORKSPACE_EXPIRY_MS = 24 * 60 * 60 * 1000;

function saveWorkspaceForId(customerId, transactions) {
  try {
    const key = customerId ? `workspace_${customerId}` : 'workspace_global';
    localStorage.setItem(key, JSON.stringify({ transactions, timestamp: Date.now() }));
  } catch (e) {
    console.error('Error saving workspace:', e);
  }
}

function loadWorkspaceForId(customerId) {
  try {
    const key = customerId ? `workspace_${customerId}` : 'workspace_global';
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.timestamp) {
      if (Date.now() - parsed.timestamp > WORKSPACE_EXPIRY_MS) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed.transactions;
    }
    return null;
  } catch (e) {
    console.error('Error loading workspace:', e);
    return null;
  }
}

function cleanupExpiredWorkspaces() {
  try {
    const now = Date.now();
    Object.keys(localStorage)
      .filter(k => k.startsWith('workspace_'))
      .forEach(key => {
        try {
          const parsed = JSON.parse(localStorage.getItem(key));
          if (parsed?.timestamp && now - parsed.timestamp > WORKSPACE_EXPIRY_MS) {
            localStorage.removeItem(key);
          }
        } catch (e) { /* skip invalid entries */ }
      });
  } catch (e) {
    console.error('Error cleaning up expired workspaces:', e);
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ModernTransactions() {
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [pawnOpen, setPawnOpen]           = useState(false);
  const [openingTxId, setOpeningTxId]     = useState(null);
  const [restoredPawnData, setRestoredPawnData] = useState(null);
  const [voidConfirm, setVoidConfirm]     = useState(null); // workspace tx to void
  const [noCustomerWarning, setNoCustomerWarning] = useState(false);
  const [workspaceTransactions, setWorkspaceTransactions] = useState([]);

  // Refs for localStorage persistence (mirrors CustomerTicket.js pattern)
  const customerIdRef = useRef(undefined);
  const workspaceTransactionsRef = useRef(workspaceTransactions);
  const initialLoadCompleteRef = useRef(false);

  // Customer state
  const [customer, setCustomer] = useState(null);
  const [customerStats, setCustomerStats] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    axios.get(`${config.apiUrl}/transaction-types`)
      .then(res => setTransactionTypes(res.data))
      .catch(err => console.error('Failed to load transaction types:', err));
  }, []);

  // Clean up expired workspace entries on mount
  useEffect(() => { cleanupExpiredWorkspaces(); }, []);

  // On customer change: save old customer's workspace, load new customer's workspace
  useEffect(() => {
    const prevId = customerIdRef.current;
    const newId = customer?.id;
    const customerChanged = prevId !== newId;

    if (!initialLoadCompleteRef.current || customerChanged) {
      if (customerChanged && prevId !== undefined) {
        saveWorkspaceForId(prevId, workspaceTransactionsRef.current);
      }
      const saved = loadWorkspaceForId(newId);
      setWorkspaceTransactions(saved || []);
      customerIdRef.current = newId;
      initialLoadCompleteRef.current = true;
    }
  }, [customer?.id]);

  // Keep ref in sync and auto-save to localStorage whenever workspace changes
  useEffect(() => {
    workspaceTransactionsRef.current = workspaceTransactions;
    if (initialLoadCompleteRef.current) {
      saveWorkspaceForId(customer?.id, workspaceTransactions);
    }
  }, [workspaceTransactions, customer?.id]);

  // When customerStats loads, refresh overduePawnCount on all PAWN cards in the workspace
  // (handles stale localStorage cards and race conditions during card creation)
  useEffect(() => {
    if (!customerStats) return;
    setWorkspaceTransactions(prev =>
      prev.map(tx =>
        tx.type === 'PAWN'
          ? { ...tx, overduePawnCount: customerStats.overdue_pawns ?? 0 }
          : tx
      )
    );
  }, [customerStats]);

  // Restore pawn screen after returning from Checkout (user pressed Cancel/Back)
  useEffect(() => {
    if (!location.state?.returnToPawn) return;
    const raw = sessionStorage.getItem('pendingPawnReturn');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingPawnReturn');
    const { customerId, ticketId, pawnItems, totalPawnAmount, ticketNote, showOnReceipt } = pending;
    if (!customerId) return;
    (async () => {
      try {
        const [custRes, statsRes] = await Promise.all([
          axios.get(`${config.apiUrl}/customers/${customerId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          axios.get(`${config.apiUrl}/customers/${customerId}/pawn/stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
        ]);
        setCustomer(custRes.data);
        setCustomerStats(statsRes.data);
        setRestoredPawnData({ ticketId, pawnItems, totalPawnAmount, ticketNote, showOnReceipt });
        setPawnOpen(true);
      } catch (err) {
        console.error('Failed to restore pawn session after checkout cancel:', err);
      }
    })();
  }, [location.state]);

  // Restore pawn screen after returning from CustomerEditor
  useEffect(() => {
    if (!location.state?.customerUpdated) return;
    const raw = sessionStorage.getItem('pendingPawnState');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingPawnState');
    const { customerId, ticketId, pawnItems, totalPawnOverride } = pending;
    if (!customerId) return;
    (async () => {
      try {
        const [custRes, statsRes] = await Promise.all([
          axios.get(`${config.apiUrl}/customers/${customerId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          axios.get(`${config.apiUrl}/customers/${customerId}/pawn/stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
        ]);
        setCustomer(custRes.data);
        setCustomerStats(statsRes.data);
        setRestoredPawnData({ ticketId, pawnItems, totalPawnOverride });
        setPawnOpen(true);
      } catch (err) {
        console.error('Failed to restore pawn session after customer edit:', err);
      }
    })();
  }, [location.state]);

  const handleCustomerSearch = async (query) => {
    setCustomerSearch(query);
    if (!query.trim()) { setCustomerResults([]); setShowResults(false); return; }
    setSearchingCustomer(true);
    try {
      const res = await axios.get(`${config.apiUrl}/customers/search`, {
        params: { first_name: query, last_name: query, phone: query, email: query },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCustomerResults(res.data);
      setShowResults(true);
    } catch (err) {
      console.error('Customer search failed:', err);
    } finally {
      setSearchingCustomer(false);
    }
  };

  const handleSelectCustomer = async (c) => {
    setCustomerStats(null);
    setCustomerSearch('');
    setCustomerResults([]);
    setShowResults(false);
    setCustomerLoading(true);
    // Show name immediately while full record loads
    setCustomer({ id: c.id, first_name: c.first_name, last_name: c.last_name });
    try {
      const [fullRes, statsRes] = await Promise.all([
        axios.get(`${config.apiUrl}/customers/${c.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        axios.get(`${config.apiUrl}/customers/${c.id}/pawn/stats`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);
      setCustomer(fullRes.data);
      setCustomerStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch customer data:', err);
      setCustomerStats(null);
    } finally {
      setCustomerLoading(false);
    }
  };

  const handleClearCustomer = () => { setCustomer(null); setCustomerStats(null); };

  const handleAddPawnToWorkspace = (pawnData) => {
    setWorkspaceTransactions(prev => {
      if (openingTxId) {
        return prev.map(tx => tx.id === openingTxId ? { ...tx, ...pawnData } : tx);
      }
      return [...prev, { id: Date.now(), type: 'PAWN', ...pawnData }];
    });
    setOpeningTxId(null);
  };

  const handleConfirmVoid = () => {
    if (!voidConfirm) return;
    if (voidConfirm.ticketId) {
      const voided = JSON.parse(localStorage.getItem('voidedPawnTickets') || '[]');
      if (!voided.includes(voidConfirm.ticketId)) {
        voided.push(voidConfirm.ticketId);
        localStorage.setItem('voidedPawnTickets', JSON.stringify(voided));
      }
    }
    setWorkspaceTransactions(prev => prev.filter(t => t.id !== voidConfirm.id));
    setVoidConfirm(null);
  };

  const summaryLines = workspaceTransactions.map(tx => {
    if (tx.type === 'PAWN') {
      const count = tx.pawnItems?.length || 0;
      return {
        label: `Pawn Loan (${count} item${count !== 1 ? 's' : ''})`,
        value: `-$${Number(tx.totalPawnAmount).toFixed(2)}`,
        color: '#c62828',
      };
    }
    return null;
  }).filter(Boolean);

  const netDue = workspaceTransactions.reduce((sum, tx) => {
    if (tx.type === 'PAWN') return sum - Number(tx.totalPawnAmount);
    return sum;
  }, 0);

  const handleTransactionTypeClick = (type) => {
    if (type === 'pawn') {
      if (!customer) { setNoCustomerWarning(true); return; }
      if (customerLoading) return;
      setPawnOpen(true);
    }
  };

  if (pawnOpen) {
    const existingPawnData = openingTxId
      ? workspaceTransactions.find(t => t.id === openingTxId)
      : restoredPawnData;
    return (
      <PawnTransactionScreen
        customer={customer}
        customerStats={customerStats}
        onClose={() => { setPawnOpen(false); setOpeningTxId(null); setRestoredPawnData(null); }}
        onAddToWorkspace={(data) => { handleAddPawnToWorkspace(data); setRestoredPawnData(null); }}
        existingPawnData={existingPawnData}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', bgcolor: '#f5f6fa', overflow: 'hidden' }}>

      {/* ── Top search bar ── */}
      <Paper elevation={1} sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1.5, borderRadius: 0, zIndex: 10 }}>
        <TextField
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Scan barcode or search (item, customer, ticket, receipt, SKU, phone...)"
          size="small"
          fullWidth
          InputProps={{
            startAdornment: <InputAdornment position="start"><MuiIcons.Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small"><MuiIcons.QrCodeScanner /></IconButton>
                <IconButton size="small"><MuiIcons.PhotoCamera /></IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
        <Button variant="outlined" startIcon={<MuiIcons.LocalParking />} sx={{ whiteSpace: 'nowrap', borderRadius: 2 }}>
          Park Transaction
        </Button>
        <Button variant="outlined" startIcon={<MuiIcons.PlayArrow />} sx={{ whiteSpace: 'nowrap', borderRadius: 2 }}>
          Resume
        </Button>
      </Paper>

      {/* ── Body (three columns + full-width bottom bar) ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, gap: { md: 1.5, xl: 1 }, p: { md: 1.5, xl: 1 }, overflow: 'hidden' }}>

      {/* Three-column row */}
      <Box sx={{ display: 'flex', flex: 1, gap: { md: 1.5, xl: 1 }, overflow: 'hidden', minHeight: 0 }}>

        {/* ── LEFT: Customer panel ── */}
        <Paper sx={{ width: 240, flexShrink: 0, borderRadius: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden', alignSelf: 'flex-start', maxHeight: '100%' }}>
          <Box sx={{ px: { md: 2, xl: 1.5 }, py: { md: 1, xl: 0.75 }, bgcolor: GREEN, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight={700} fontSize={{ md: 13, xl: 11 }} letterSpacing={1}>CUSTOMER</Typography>
          </Box>

          <Box sx={{ p: { md: 1.5, xl: 1 }, flex: 1, overflowY: 'auto' }}>
            {customer ? (
              /* ── Customer selected ── */
              <>
                {/* Name + avatar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { md: 1.5, xl: 1 }, mb: { md: 1.5, xl: 1 } }}>
                  <Avatar sx={{ bgcolor: GREEN, width: { md: 40, xl: 32 }, height: { md: 40, xl: 32 }, fontSize: { md: 15, xl: 12 }, fontWeight: 700 }}>
                    {customer.first_name?.[0]}{customer.last_name?.[0]}
                  </Avatar>
                  <Typography fontWeight={700} fontSize={{ md: 15, xl: 13 }} lineHeight={1.2}>
                    {customer.first_name} {customer.last_name}
                  </Typography>
                </Box>

                {/* Contact info */}
                <Stack spacing={{ md: 0.5, xl: 0.25 }} mb={{ md: 1.5, xl: 1 }}>
                  {customer.phone && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Phone:</Typography>
                      <Typography variant="caption" fontWeight={500}>{customer.phone}</Typography>
                    </Box>
                  )}
                  {customer.email && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>Email:</Typography>
                      <Typography variant="caption" fontWeight={500} noWrap>{customer.email}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">ID:</Typography>
                    {customer.id_number ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" fontWeight={500}>Verified</Typography>
                        <MuiIcons.CheckCircle sx={{ fontSize: 13, color: '#2e7d32' }} />
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary" fontStyle="italic">Not on file</Typography>
                    )}
                  </Box>
                </Stack>

                <Divider sx={{ mb: { md: 1.5, xl: 1 } }} />

                {/* Stats rows — icons/colors pulled from transaction_type DB via transactionTypes state */}
                <Stack spacing={{ md: 0.75, xl: 0.5 }} mb={{ md: 1.5, xl: 1 }}>
                  {(() => {
                    const byType = (type) => transactionTypes.find(t => t.type === type) ?? {};
                    const pawn    = byType('pawn');
                    const layaway = byType('layaway');
                    const repair  = byType('repair');
                    return [
                      { icon: pawn.icon,  label: 'Active Pawns',   value: customerStats?.active_pawns    ?? 0,  color: pawn.color },
                      { icon: layaway.icon, label: 'Active Layaways', value: customerStats?.active_layaways ?? 0,  color: layaway.color },
                      { icon: repair.icon,  label: 'Open Repairs',    value: customerStats?.open_repairs    ?? 0,  color: repair.color  },
                      { icon: 'CreditCard',  label: 'Store Credit',    value: customerStats?.store_credit != null ? `$${Number(customerStats.store_credit).toFixed(2)}` : '$0.00', color: '#2e7d32' },
                      { icon: 'AccessTime',   label: 'Customer Since',  value: customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', color: '#546e7a' },
                    ];
                  })().map(({ icon, label, value, color }) => {
                    const Icon = MuiIcons[icon] ?? MuiIcons.Circle;
                    return (
                      <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Icon sx={{ fontSize: { md: 15, xl: 13 }, color }} />
                          <Typography sx={{ fontSize: { md: 12, xl: 11 } }} color="text.secondary">{label}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: { md: 12, xl: 11 } }} fontWeight={600}
                          color={label === 'Store Credit' ? '#2e7d32' : 'text.primary'}>
                          {value}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>

                <Divider sx={{ mb: 1 }} />

                <Stack spacing={0.75}>
                  <Button fullWidth variant="contained" size="small"
                    sx={{ bgcolor: GREEN, '&:hover': { bgcolor: GREEN_LIGHT }, borderRadius: 2, fontSize: 11, fontWeight: 700 }}>
                    Select Customer
                  </Button>
                  <Button fullWidth variant="outlined" size="small"
                    startIcon={<MuiIcons.Visibility fontSize="small" />}
                    sx={{ borderRadius: 2, fontSize: 11, justifyContent: 'flex-start' }}>
                    View Customer
                  </Button>
                  <Button fullWidth variant="outlined" size="small" color="error"
                    onClick={handleClearCustomer}
                    startIcon={<MuiIcons.Clear fontSize="small" />}
                    sx={{ borderRadius: 2, fontSize: 11, justifyContent: 'flex-start' }}>
                    Clear Customer
                  </Button>
                </Stack>
              </>
            ) : (
              /* ── No customer selected ── */
              <>
                {/* Search box */}
                <Box sx={{ position: 'relative', mb: 1.5 }}>
                  <TextField
                    fullWidth size="small"
                    placeholder="Search by name, phone, email..."
                    value={customerSearch}
                    onChange={e => handleCustomerSearch(e.target.value)}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    onFocus={() => customerResults.length > 0 && setShowResults(true)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {searchingCustomer
                            ? <MuiIcons.HourglassEmpty fontSize="small" sx={{ color: 'text.secondary' }} />
                            : <MuiIcons.Search fontSize="small" sx={{ color: 'text.secondary' }} />}
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  {showResults && customerResults.length > 0 && (
                    <Paper elevation={4} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: 200, overflowY: 'auto', borderRadius: 1, mt: 0.5 }}>
                      {customerResults.map(c => (
                        <Box
                          key={c.id}
                          onMouseDown={() => handleSelectCustomer(c)}
                          sx={{ px: 1.5, py: 1, cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' }, borderBottom: '1px solid #f0f0f0' }}
                        >
                          <Typography fontSize={12} fontWeight={600}>{c.first_name} {c.last_name}</Typography>
                          {c.phone && <Typography fontSize={11} color="text.secondary">{c.phone}</Typography>}
                          {c.email && <Typography fontSize={11} color="text.secondary" noWrap>{c.email}</Typography>}
                        </Box>
                      ))}
                    </Paper>
                  )}
                  {showResults && customerResults.length === 0 && !searchingCustomer && customerSearch && (
                    <Paper elevation={4} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, borderRadius: 1, mt: 0.5, px: 1.5, py: 1 }}>
                      <Typography fontSize={12} color="text.secondary">No customers found</Typography>
                    </Paper>
                  )}
                </Box>

              </>
            )}

            {/* Always visible */}
            <Stack spacing={0.75} mt={1.5}>
              <Divider />
              <Button fullWidth variant="outlined" size="small"
                startIcon={<MuiIcons.PersonAdd fontSize="small" />}
                sx={{ borderRadius: 2, fontSize: 11, justifyContent: 'flex-start' }}>
                Create New Customer
              </Button>
              <Button fullWidth variant="outlined" size="small"
                startIcon={<MuiIcons.QrCode2 fontSize="small" />}
                sx={{ borderRadius: 2, fontSize: 11, justifyContent: 'flex-start' }}>
                Scan ID
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* ── MIDDLE: Transaction workspace ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden', minWidth: 0 }}>
          {/* Workspace header */}
          <Paper sx={{ px: { md: 2, xl: 1.5 }, py: { md: 1, xl: 0.75 }, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography fontWeight={700} fontSize={{ md: 13, xl: 11 }} letterSpacing={1}>TRANSACTION WORKSPACE</Typography>
              <Badge badgeContent={workspaceTransactions.length} color="primary" sx={{ '& .MuiBadge-badge': { position: 'relative', transform: 'none', ml: 0.5 } }}>
                <Box />
              </Badge>
              <Typography variant="caption" color="text.secondary">Add, edit or remove transactions before checkout.</Typography>
            </Box>
            <Button variant="contained" size="small" startIcon={<MuiIcons.Add />} endIcon={<MuiIcons.ExpandMore />}
              sx={{ bgcolor: GREEN, '&:hover': { bgcolor: GREEN_LIGHT }, borderRadius: 2, fontSize: 12 }}>
              Add Transaction
            </Button>
          </Paper>

          {/* Transaction cards grid */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {workspaceTransactions.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1.5, color: 'text.secondary' }}>
                <MuiIcons.Receipt sx={{ fontSize: 48, opacity: 0.15 }} />
                <Typography variant="body2" color="text.secondary">No transactions in workspace yet.</Typography>
                <Typography variant="caption" color="text.secondary">Use the buttons below to start a pawn, sale, or other transaction.</Typography>
              </Box>
            ) : (
              <Grid container spacing={{ md: 1.5, xl: 1 }}>
                {workspaceTransactions.map(tx => (
                  <Grid item xs={12} sm={6} md={4} key={tx.id}>
                    {tx.type === 'PAWN' ? (
                      <PawnTransactionCard
                        tx={tx}
                        pawnIcon={transactionTypes.find(t => t.type === 'pawn')?.icon}
                        pawnColor={transactionTypes.find(t => t.type === 'pawn')?.color}
                        onOpen={() => { setOpeningTxId(tx.id); setPawnOpen(true); }}
                        onVoid={() => setVoidConfirm(tx)}
                      />
                    ) : null}
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

        </Box>

        {/* ── RIGHT: Summary panel ── */}
        <Paper sx={{ width: 220, flexShrink: 0, borderRadius: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden', alignSelf: 'flex-start', maxHeight: '100%' }}>
          <Box sx={{ px: { md: 2, xl: 1.5 }, py: { md: 1, xl: 0.75 }, bgcolor: GREEN, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <Typography fontWeight={700} fontSize={{ md: 13, xl: 11 }} letterSpacing={1}>SUMMARY</Typography>
            <IconButton size="small" sx={{ color: '#fff' }}><MuiIcons.ExpandMore fontSize="small" /></IconButton>
          </Box>

          {/* Scrollable: summary lines + net due + checkout + workspace status */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: { md: 1.5, xl: 1 }, minHeight: 0 }}>
            {summaryLines.length === 0 ? (
              <Typography variant="caption" color="text.secondary" fontStyle="italic">No transactions yet.</Typography>
            ) : summaryLines.map((l, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="caption" color="text.secondary">{l.label}</Typography>
                <Typography variant="caption" fontWeight={600} color={l.color}>{l.value}</Typography>
              </Box>
            ))}

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
              NET DUE FROM CUSTOMER
            </Typography>
            <Typography fontWeight={800} color={netDue >= 0 ? GREEN : '#c62828'} mb={{ md: 2, xl: 1 }} sx={{ fontSize: { md: '1.5rem', xl: '1.2rem' } }}>
              {netDue < 0 ? `-$${Math.abs(netDue).toFixed(2)}` : `$${netDue.toFixed(2)}`}
            </Typography>

            <Typography variant="caption" color="text.secondary" display="block" mb={{ md: 1.5, xl: 0.75 }}>
              No payment has been entered yet.
            </Typography>

            <Button fullWidth variant="contained" size="small" disabled={workspaceTransactions.length === 0}
              sx={{ bgcolor: GREEN, '&:hover': { bgcolor: GREEN_LIGHT }, borderRadius: 2, fontWeight: 700, mb: { md: 2, xl: 1 } }}>
              Checkout / Payment
            </Button>

            <Divider sx={{ mb: 1.5 }} />

            <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1} display="block" mb={1}>
              WORKSPACE STATUS
            </Typography>
            {workspaceTransactions.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                <MuiIcons.RadioButtonUnchecked sx={{ fontSize: 14, color: '#bdbdbd' }} />
                <Typography variant="caption" color="text.secondary">No transactions added</Typography>
              </Box>
            ) : [
              'All required fields complete',
              'Customer linked to all transactions',
              'Ready to checkout',
            ].map(msg => (
              <Box key={msg} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                <MuiIcons.CheckCircle sx={{ fontSize: 14, color: '#2e7d32' }} />
                <Typography variant="caption" color="text.secondary">{msg}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>{/* end three-column row */}

      {/* ── Full-width bottom bar: ADD TRANSACTION + ACTIONS ── */}
      <Paper sx={{ p: { md: 1.5, xl: 1 }, borderRadius: 2, flexShrink: 0, display: 'flex', gap: { md: 2, xl: 1.5 }, alignItems: 'flex-start' }}>
        {/* ADD TRANSACTION */}
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={700} color="text.secondary" letterSpacing={1} display="block" mb={{ md: 1, xl: 0.5 }} sx={{ fontSize: { md: 12, xl: 10 } }}>
            ADD TRANSACTION
          </Typography>
          <Box sx={{ display: 'flex', gap: { md: 1, xl: 0.75 }, flexWrap: 'wrap' }}>
            {transactionTypes.map(t => {
              const IconComponent = MuiIcons[t.icon] ?? MuiIcons.Add;
              const count = workspaceTransactions.filter(tx => tx.type === t.type.toUpperCase()).length;
              return (
                <TransactionTypeButton
                  key={t.id}
                  label={t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                  icon={<IconComponent />}
                  color={t.color ?? '#607d8b'}
                  onClick={() => handleTransactionTypeClick(t.type)}
                  count={count}
                />
              );
            })}
          </Box>
        </Box>

        {/* Divider */}
        <Divider orientation="vertical" flexItem />

        {/* ACTIONS */}
        <Box sx={{ flexShrink: 0 }}>
          <Typography fontWeight={700} color="text.secondary" letterSpacing={1} display="block" mb={{ md: 1, xl: 0.5 }} sx={{ fontSize: { md: 12, xl: 10 } }}>
            ACTIONS
          </Typography>
          <Box sx={{ display: 'flex', gap: { md: 1, xl: 0.75 } }}>
            {[
              { label: 'Notes',    icon: 'Assignment' },
              { label: 'Discount', icon: 'Percent'    },
              { label: 'Void',     icon: 'Block'      },
              { label: 'Print',    icon: 'Print'      },
            ].map(a => {
              const Icon = MuiIcons[a.icon];
              return (
                <TransactionTypeButton key={a.label} label={a.label} icon={<Icon />} color="#607d8b" />
              );
            })}
          </Box>
        </Box>
      </Paper>

      </Box>{/* end body wrapper */}

      <Snackbar
        open={noCustomerWarning}
        autoHideDuration={4000}
        onClose={() => setNoCustomerWarning(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="warning" onClose={() => setNoCustomerWarning(false)} sx={{ fontWeight: 600 }}>
          Please select a customer before opening a pawn ticket.
        </Alert>
      </Snackbar>

      <Dialog open={!!voidConfirm} onClose={() => setVoidConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Void Pawn Ticket?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Ticket <strong>{voidConfirm?.ticketId}</strong> will be permanently voided and cannot be used again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmVoid}>Void Ticket</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
