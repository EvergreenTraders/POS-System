import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, Grid, Avatar, Button, IconButton, Chip,
  Divider, TextField, InputAdornment, Badge, Tooltip, Stack
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';

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

function TransactionTypeButton({ label, icon, color }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        p: 1, cursor: 'pointer', borderRadius: 2, borderColor: '#e0e0e0', minWidth: 70,
        '&:hover': { bgcolor: '#f5f5f5', borderColor: color },
        transition: 'all 0.15s',
      }}
    >
      <Box sx={{ color, mb: 0.25 }}>{icon}</Box>
      <Typography variant="caption" align="center" fontWeight={500} sx={{ fontSize: 10, color: color }}>{label}</Typography>
    </Paper>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ModernTransactions() {
  const [search, setSearch] = useState('');
  const [transactionTypes, setTransactionTypes] = useState([]);

  useEffect(() => {
    axios.get(`${config.apiUrl}/transaction-types`)
      .then(res => setTransactionTypes(res.data))
      .catch(err => console.error('Failed to load transaction types:', err));
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f5f6fa', overflow: 'hidden' }}>

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

      {/* ── Three-column body ── */}
      <Box sx={{ display: 'flex', flex: 1, gap: 1.5, p: 1.5, overflow: 'hidden' }}>

        {/* ── LEFT: Customer panel ── */}
        <Paper sx={{ width: 240, flexShrink: 0, borderRadius: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1, bgcolor: GREEN, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight={700} fontSize={13} letterSpacing={1}>CUSTOMER</Typography>
            <IconButton size="small" sx={{ color: '#fff' }}><MuiIcons.ExpandMore fontSize="small" /></IconButton>
          </Box>

          <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto' }}>
            {/* Avatar + name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Avatar sx={{ bgcolor: '#b0bec5', width: 44, height: 44 }}><MuiIcons.Person /></Avatar>
              <Box>
                <Typography fontWeight={700} fontSize={14}>John Smith</Typography>
              </Box>
            </Box>

            {/* Contact details */}
            <Stack spacing={0.25} mb={1.5}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ width: 48 }}>Phone:</Typography>
                <Typography variant="caption">506-555-1234</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ width: 48 }}>Email:</Typography>
                <Typography variant="caption">john.smith@email.com</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ width: 48 }}>ID:</Typography>
                <Chip icon={<MuiIcons.CheckCircle sx={{ fontSize: '12px !important' }} />} label="Verified" size="small"
                  sx={{ height: 18, fontSize: 10, bgcolor: '#e8f5e9', color: '#2e7d32', '& .MuiChip-icon': { color: '#2e7d32' } }} />
              </Box>
            </Stack>

            <Divider sx={{ mb: 1 }} />

            {/* Stats */}
            {[
              { label: 'Active Pawns', value: 2 },
              { label: 'Active Layaways', value: 1 },
              { label: 'Open Repairs', value: 1 },
            ].map(s => (
              <Box key={s.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                <Typography variant="caption" fontWeight={600}>{s.value}</Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Store Credit</Typography>
              <Typography variant="caption" fontWeight={700} color="#2e7d32">$75.00</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Customer Since</Typography>
              <Typography variant="caption">Jan 18, 2024</Typography>
            </Box>

            <Divider sx={{ mb: 1 }} />

            {/* Action buttons */}
            <Stack spacing={0.75}>
              <Button fullWidth variant="contained" size="small"
                sx={{ bgcolor: GREEN, '&:hover': { bgcolor: GREEN_LIGHT }, borderRadius: 2, fontSize: 12, fontWeight: 700 }}>
                Select Customer
              </Button>
              {[
                { label: 'Create New Customer', icon: <MuiIcons.PersonAdd fontSize="small" /> },
                { label: 'View Customer',        icon: <MuiIcons.Visibility fontSize="small" /> },
                { label: 'Scan ID',              icon: <MuiIcons.QrCode2 fontSize="small" /> },
              ].map(b => (
                <Button key={b.label} fullWidth variant="outlined" size="small" startIcon={b.icon}
                  sx={{ borderRadius: 2, fontSize: 11, justifyContent: 'flex-start' }}>
                  {b.label}
                </Button>
              ))}
              <Button fullWidth variant="outlined" size="small" startIcon={<MuiIcons.Clear fontSize="small" />} color="error"
                sx={{ borderRadius: 2, fontSize: 11, justifyContent: 'flex-start' }}>
                Clear Customer
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* ── MIDDLE: Transaction workspace ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden', minWidth: 0 }}>
          {/* Workspace header */}
          <Paper sx={{ px: 2, py: 1, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography fontWeight={700} fontSize={13} letterSpacing={1}>TRANSACTION WORKSPACE</Typography>
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
            <Grid container spacing={1.5}>
              {SAMPLE_TRANSACTIONS.map(tx => (
                <Grid item xs={12} sm={6} md={4} key={tx.id}>
                  <TransactionCard tx={tx} />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Add transaction type buttons */}
          <Paper sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1} display="block" mb={1}>
              ADD TRANSACTION
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {transactionTypes.map(t => {
                const IconComponent = MuiIcons[t.icon] ?? MuiIcons.Add;
                return (
                  <TransactionTypeButton
                    key={t.id}
                    label={t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                    icon={<IconComponent />}
                    color={t.color ?? '#607d8b'}
                  />
                );
              })}
            </Box>
          </Paper>
        </Box>

        {/* ── RIGHT: Summary panel ── */}
        <Paper sx={{ width: 220, flexShrink: 0, borderRadius: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1, bgcolor: GREEN, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight={700} fontSize={13} letterSpacing={1}>SUMMARY</Typography>
            <IconButton size="small" sx={{ color: '#fff' }}><MuiIcons.ExpandMore fontSize="small" /></IconButton>
          </Box>

          <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto' }}>
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
            <Typography variant="h5" fontWeight={800} color={GREEN} mb={2}>$747.58</Typography>

            <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
              No payment has been entered yet.
            </Typography>

            <Button fullWidth variant="contained" size="medium"
              sx={{ bgcolor: GREEN, '&:hover': { bgcolor: GREEN_LIGHT }, borderRadius: 2, fontWeight: 700, mb: 2 }}>
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

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1} display="block" mb={1}>
              ACTIONS
            </Typography>
            <Grid container spacing={0.75}>
              {['Notes', 'Discount', 'Void', 'Print'].map(a => (
                <Grid item xs={6} key={a}>
                  <Button fullWidth variant="outlined" size="small" sx={{ fontSize: 10, borderRadius: 1.5 }}>{a}</Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
