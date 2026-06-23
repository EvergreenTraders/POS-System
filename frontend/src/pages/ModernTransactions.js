import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, Grid, Avatar, Button, IconButton, Chip,
  Divider, TextField, InputAdornment, Badge, Tooltip, Stack, Snackbar, Alert
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import PawnTransactionScreen from './PawnTransactionScreen';

const GREEN = '#1a472a';
const GREEN_LIGHT = '#2d6a4f';

// ── Sample workspace transactions ────────────────────────────────────────────
const SAMPLE_TRANSACTIONS = [
  {
    id: 1, type: 'SALE', status: 'Complete', statusColor: '#2e7d32',
    subtitle: '3 items', total: '$687.58',
    lines: [
      { label: 'PS5 Console', value: '$499.00' },
      { label: 'HDMI Cable', value: '$9.99' },
      { label: 'Controller - Black', value: '$59.99' },
      { label: 'Subtotal', value: '$568.98' },
      { label: 'Tax (15%)', value: '$118.60' },
      { label: 'Total', value: '$687.58', bold: true },
    ],
    accentColor: '#2e7d32',
  },
  {
    id: 2, type: 'TRADE', status: 'Complete', statusColor: '#2e7d32',
    subtitle: '1 in / 1 out', total: '$115.00',
    lines: [
      { label: 'Trading In', value: '', header: true },
      { label: 'Xbox Series S', value: '-$150.00' },
      { label: 'Buying', value: '', header: true },
      { label: 'Nintendo Switch', value: '$250.00' },
      { label: 'Trade-in Allowance', value: '-$150.00' },
      { label: 'Sale Subtotal', value: '$250.00' },
      { label: 'Taxable Difference', value: '$100.00' },
      { label: 'Tax (15%)', value: '$15.00' },
      { label: 'Net Due from Customer', value: '$115.00', bold: true },
    ],
    accentColor: '#1565c0',
  },
  {
    id: 3, type: 'PAWN', status: 'Active', statusColor: '#1565c0',
    subtitle: '1 item', total: null,
    lines: [
      { label: 'DeWalt Drill Kit', value: '', link: true },
      { label: 'Loan: $100.00', value: '60 days', muted: true },
      { label: 'Total Loan', value: '$100.00', bold: true },
      { label: 'Due Date', value: 'Jul 29, 2026', bold: true },
    ],
    accentColor: '#6a1b9a',
  },
  {
    id: 4, type: 'PAWN PAYMENT', status: 'Complete', statusColor: '#2e7d32',
    subtitle: 'Ticket P12345', total: null,
    lines: [
      { label: 'Current Balance', value: '$180.00' },
      { label: 'Payment Amount', value: '$25.00' },
      { label: 'New Balance', value: '$155.00', bold: true },
      { label: 'New Due Date', value: 'Jul 13, 2026' },
    ],
    accentColor: '#f9a825',
  },
  {
    id: 5, type: 'REPAIR DROP-OFF', status: 'Active', statusColor: '#1565c0',
    subtitle: 'Ticket R10025', total: null,
    lines: [
      { label: 'Item', value: 'Gold Chain' },
      { label: 'Issue', value: 'Broken clasp' },
      { label: 'Estimate', value: '$60.00' },
      { label: 'Deposit', value: '$20.00' },
      { label: 'Balance', value: '$40.00', bold: true },
    ],
    accentColor: '#bf360c',
  },
];

const SUMMARY_LINES = [
  { label: 'Sale Total',            value: '+ $687.58', color: '#2e7d32' },
  { label: 'Trade (Net Due)',        value: '+ $115.00', color: '#2e7d32' },
  { label: 'Pawn Loan (Payout)',     value: '- $100.00', color: '#c62828' },
  { label: 'Pawn Payment',           value: '+ $25.00',  color: '#2e7d32' },
  { label: 'Repair Deposit',         value: '+ $20.00',  color: '#2e7d32' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function TransactionCard({ tx }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#e0e0e0' }}>
      {/* Card header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1, borderLeft: `4px solid ${tx.accentColor}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography fontWeight={700} fontSize={13} color={tx.accentColor}>{tx.type}</Typography>
          <Chip label={tx.status} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: tx.statusColor, color: '#fff' }} />
        </Box>
        <IconButton size="small"><MuiIcons.MoreVert fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ px: 1.5, pb: 1 }}>
        <Typography variant="caption" color="text.secondary">{tx.subtitle}</Typography>
        {tx.total && <Typography variant="body2" fontWeight={600} align="right" mb={0.5}>Total: {tx.total}</Typography>}

        <Box sx={{ mt: 0.5 }}>
          {tx.lines.map((line, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
              <Typography
                variant="caption"
                sx={{
                  color: line.muted ? 'text.secondary' : line.header ? 'text.secondary' : 'text.primary',
                  fontStyle: line.header ? 'italic' : 'normal',
                  fontWeight: line.bold ? 700 : 400,
                  textDecoration: line.link ? 'underline' : 'none',
                  cursor: line.link ? 'pointer' : 'default',
                  color: line.link ? '#1565c0' : undefined,
                }}
              >
                {line.label}
              </Typography>
              <Typography variant="caption" fontWeight={line.bold ? 700 : 400} color={line.muted ? 'text.secondary' : 'text.primary'}>
                {line.value}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button size="small" variant="outlined" startIcon={<MuiIcons.Edit />} sx={{ flex: 1, fontSize: 11 }}>Edit</Button>
          {tx.type !== 'PAWN PAYMENT' && tx.type !== 'REPAIR DROP-OFF' && (
            <Button size="small" variant="outlined" startIcon={<MuiIcons.Add />} sx={{ flex: 1, fontSize: 11 }}>Add Item</Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

function TransactionTypeButton({ label, icon, color, onClick }) {
  return (
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
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ModernTransactions() {
  const [search, setSearch] = useState('');
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [pawnOpen, setPawnOpen]           = useState(false);
  const [noCustomerWarning, setNoCustomerWarning] = useState(false);

  // Customer state
  const [customer, setCustomer] = useState(null);
  const [customerStats, setCustomerStats] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    axios.get(`${config.apiUrl}/transaction-types`)
      .then(res => setTransactionTypes(res.data))
      .catch(err => console.error('Failed to load transaction types:', err));
  }, []);

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
    setCustomer(c);
    setCustomerSearch('');
    setCustomerResults([]);
    setShowResults(false);
    try {
      const res = await axios.get(`${config.apiUrl}/customers/${c.id}/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCustomerStats(res.data);
    } catch (err) {
      console.error('Failed to fetch customer stats:', err);
      setCustomerStats(null);
    }
  };

  const handleClearCustomer = () => { setCustomer(null); setCustomerStats(null); };

  const handleTransactionTypeClick = (type) => {
    if (type === 'pawn') {
      if (!customer) { setNoCustomerWarning(true); return; }
      setPawnOpen(true);
    }
  };

  if (pawnOpen) {
    return (
      <PawnTransactionScreen
        customer={customer}
        customerStats={customerStats}
        onClose={() => setPawnOpen(false)}
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
              <Badge badgeContent={5} color="primary" sx={{ '& .MuiBadge-badge': { position: 'relative', transform: 'none', ml: 0.5 } }}>
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
            <Grid container spacing={{ md: 1.5, xl: 1 }}>
              {SAMPLE_TRANSACTIONS.map(tx => (
                <Grid item xs={12} sm={6} md={4} key={tx.id}>
                  <TransactionCard tx={tx} />
                </Grid>
              ))}
            </Grid>
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
            {SUMMARY_LINES.map((l, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="caption" color="text.secondary">{l.label}</Typography>
                <Typography variant="caption" fontWeight={600} color={l.color}>{l.value}</Typography>
              </Box>
            ))}

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
              NET DUE FROM CUSTOMER
            </Typography>
            <Typography fontWeight={800} color={GREEN} mb={{ md: 2, xl: 1 }} sx={{ fontSize: { md: '1.5rem', xl: '1.2rem' } }}>$747.58</Typography>

            <Typography variant="caption" color="text.secondary" display="block" mb={{ md: 1.5, xl: 0.75 }}>
              No payment has been entered yet.
            </Typography>

            <Button fullWidth variant="contained" size="small"
              sx={{ bgcolor: GREEN, '&:hover': { bgcolor: GREEN_LIGHT }, borderRadius: 2, fontWeight: 700, mb: { md: 2, xl: 1 } }}>
              Checkout / Payment
            </Button>

            <Divider sx={{ mb: 1.5 }} />

            <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1} display="block" mb={1}>
              WORKSPACE STATUS
            </Typography>
            {[
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
              return (
                <TransactionTypeButton
                  key={t.id}
                  label={t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                  icon={<IconComponent />}
                  color={t.color ?? '#607d8b'}
                  onClick={() => handleTransactionTypeClick(t.type)}
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
    </Box>
  );
}
