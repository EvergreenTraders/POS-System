import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, Button, IconButton, Chip,
  Divider, TextField, InputAdornment, Checkbox, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Snackbar, Alert, Select, MenuItem,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const BUY_BLUE  = '#0284c7';
const BUY_DARK  = '#0369a1';

const BT_PENDING_KEY = 'pendingBTTicketId';
const BT_COUNTER_KEY = 'lastBTTicketNumber';

function generateBuyTicketId() {
  const voided  = JSON.parse(localStorage.getItem('voidedBuyTickets') || '[]');
  const pending = localStorage.getItem(BT_PENDING_KEY);
  if (pending && !voided.includes(pending)) return pending;
  if (pending) localStorage.removeItem(BT_PENDING_KEY);
  let last = parseInt(localStorage.getItem(BT_COUNTER_KEY) || '0');
  let id;
  do { last += 1; id = `BT-${last.toString().padStart(8, '0')}`; } while (voided.includes(id));
  localStorage.setItem(BT_COUNTER_KEY, last.toString());
  localStorage.setItem(BT_PENDING_KEY, id);
  return id;
}

function commitBuyTicketId() { localStorage.removeItem(BT_PENDING_KEY); }

async function syncBuyTicketCounter() {
  try {
    const res = await axios.get(`${config.apiUrl}/buy-ticket/last-id`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    const dbNum    = res.data.last_number || 0;
    const localNum = parseInt(localStorage.getItem(BT_COUNTER_KEY) || '0');
    if (dbNum > localNum) {
      localStorage.setItem(BT_COUNTER_KEY, dbNum.toString());
      localStorage.removeItem(BT_PENDING_KEY);
      return true;
    }
    return false;
  } catch { return false; }
}

export default function BuyTransactionScreen({
  customer,
  customerStats,
  onClose,
  onAddToWorkspace,
  onRemoveFromWorkspace,
  existingBuyData,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { setCustomer: setCartCustomer } = useCart();

  const [ticketId, setTicketId]         = useState(() => existingBuyData?.ticketId || generateBuyTicketId());
  const [buyItems, setBuyItems]         = useState(existingBuyData?.buyItems || []);
  const [buyPawnNotes, setBuyPawnNotes] = useState(existingBuyData?.buyPawnNotes || '');
  const [ticketNote, setTicketNote]     = useState(existingBuyData?.ticketNote || '');
  const [showOnReceipt, setShowOnReceipt] = useState(existingBuyData?.showOnReceipt ?? true);
  const [categories, setCategories]     = useState([]);
  const [buyStats, setBuyStats]         = useState(null);
  const [lastSoldItems, setLastSoldItems] = useState([]);
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [quickInput, setQuickInput]     = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editFields, setEditFields]     = useState({});
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [adjustTotal, setAdjustTotal]   = useState('');
  const [snackbar, setSnackbar]         = useState({ open: false, message: '', severity: 'success' });
  const quickInputRef = useRef(null);

  const showSnackbar = (msg, sev = 'success') => setSnackbar({ open: true, message: msg, severity: sev });
  const fmt = (n) => `$${Number(n).toFixed(2)}`;

  useEffect(() => {
    if (existingBuyData?.ticketId) return;
    syncBuyTicketCounter().then(bumped => { if (bumped) setTicketId(generateBuyTicketId()); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    axios.get(`${config.apiUrl}/categories`, { headers })
      .then(res => setCategories(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!customer?.id) return;
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    axios.get(`${config.apiUrl}/customers/${customer.id}/buy/stats`, { headers })
      .then(res => setBuyStats(res.data))
      .catch(() => {});
    axios.get(`${config.apiUrl}/customers/${customer.id}/buy-history?limit=5`, { headers })
      .then(res => setLastSoldItems(res.data))
      .catch(() => {});
  }, [customer?.id]);

  useEffect(() => {
    if (quickAddMode) quickInputRef.current?.focus();
  }, [quickAddMode]);

  const totalPaid = buyItems.reduce((s, i) => s + (parseFloat(i.paid) || 0) * (parseInt(i.qty) || 1), 0);

  const addItem = (overrides = {}) => {
    setBuyItems(prev => {
      const count = prev.length + 1;
      return [...prev, {
        _lineId: Date.now() + Math.random(),
        part_no: `${ticketId}-${String(count).padStart(2, '0')}`,
        category_id: '',
        description: '',
        serial_number: '',
        qty: 1,
        paid: 0,
        images: [],
        ...overrides,
      }];
    });
  };

  const handleQuickAdd = () => {
    const raw = quickInput.trim();
    if (!raw) { addItem(); setQuickInput(''); return; }
    const amtMatch = raw.match(/\$?([\d,]+\.?\d*)\s*$/);
    let description = raw;
    let paid = 0;
    if (amtMatch) {
      paid = parseFloat(amtMatch[1].replace(',', '')) || 0;
      const withoutAmt = raw.slice(0, raw.lastIndexOf(amtMatch[0])).trim();
      if (withoutAmt) description = withoutAmt;
    }
    addItem({ description, paid });
    setQuickInput('');
    showSnackbar(`${description || 'Item'} added`);
  };

  const handleRemoveItem = (_lineId) => setBuyItems(prev => prev.filter(i => i._lineId !== _lineId));

  const handleDuplicateItem = (item) => {
    setBuyItems(prev => {
      const count = prev.length + 1;
      return [...prev, { ...item, _lineId: Date.now() + Math.random(), part_no: `${ticketId}-${String(count).padStart(2, '0')}` }];
    });
  };

  const startEdit = (item) => {
    setEditingItemId(item._lineId);
    setEditFields({ category_id: item.category_id || '', description: item.description, serial_number: item.serial_number || '', qty: item.qty, paid: item.paid });
  };

  const saveEdit = (_lineId) => {
    setBuyItems(prev => prev.map(i => i._lineId === _lineId
      ? { ...i, ...editFields, paid: parseFloat(editFields.paid) || 0, qty: parseInt(editFields.qty) || 1,
          category_name: categories.find(c => c.id === editFields.category_id)?.name || i.category_name }
      : i));
    setEditingItemId(null);
  };

  const handleAddToWorkspace = () => {
    if (buyItems.length === 0) { showSnackbar('Add at least one item before adding to workspace', 'warning'); return; }
    onAddToWorkspace?.({ ticketId, buyItems, buyPawnNotes, ticketNote, showOnReceipt, totalPaid, customer });
  };

  const handleCheckoutNow = () => {
    if (buyItems.length === 0) { showSnackbar('Add at least one item to checkout', 'warning'); return; }
    if (!customer?.id) { showSnackbar('Please select a customer before checkout', 'error'); return; }
    const cartCustomer = {
      id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      name: `${customer.first_name} ${customer.last_name}`.trim(),
      phone: customer.phone || '',
      email: customer.email || '',
    };
    setCartCustomer(cartCustomer);

    const cartItems = buyItems.flatMap(item =>
      Array.from({ length: parseInt(item.qty) || 1 }, () => ({
        id: `${ticketId}_${item._lineId}_${Date.now()}`,
        description: item.description || item.part_no,
        price: parseFloat(item.paid) || 0,
        value: parseFloat(item.paid) || 0,
        transaction_type: 'buy',
        sourceEstimator: 'jewelry',
        category_id: item.category_id || null,
        serial_number: item.serial_number || null,
        ticket_note: ticketNote || null,
        show_on_receipt: showOnReceipt,
        customer: cartCustomer,
        employee: currentUser
          ? { id: currentUser.id, name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(), role: currentUser.role }
          : null,
        buyTicketId: ticketId,
      }))
    );

    sessionStorage.setItem('checkoutItems', JSON.stringify(cartItems));
    if (customer) sessionStorage.setItem('selectedCustomer', JSON.stringify(cartCustomer));
    commitBuyTicketId();
    navigate('/checkout', { state: { items: cartItems, allCartItems: cartItems, customer: cartCustomer, from: 'buy-ticket' } });
  };

  const HEADER_COLS = '110px 52px 120px 1fr 110px 50px 95px 100px';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', bgcolor: '#f5f6fa' }}>

      {/* Breadcrumb */}
      <Box sx={{ bgcolor: BUY_BLUE, color: '#fff', px: 2.5, py: 0.875, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" fontWeight={400}
          sx={{ cursor: 'pointer', opacity: 0.8, '&:hover': { textDecoration: 'underline', opacity: 1 } }}
          onClick={onClose}>
          Transactions
        </Typography>
        <MuiIcons.ChevronRight sx={{ fontSize: 16, opacity: 0.6 }} />
        <Typography variant="body2" fontWeight={700}>Buy Ticket ({ticketId})</Typography>
      </Box>

      {/* Body */}
      <Box sx={{ display: 'flex', flex: 1 }}>

        {/* LEFT / CENTER */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ p: 2.5, overflow: 'auto' }}>

            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                  <Typography variant="h5" fontWeight={800} letterSpacing={0.5}>Buy Ticket</Typography>
                  <Typography variant="h5" fontWeight={800} color={BUY_BLUE}>{ticketId}</Typography>
                  <Chip label="Ready" size="small"
                    sx={{ bgcolor: '#e0f2fe', color: BUY_BLUE, fontWeight: 700, fontSize: 12, border: `1px solid ${BUY_BLUE}` }} />
                </Box>
                {customer && (
                  <Typography variant="body2" color="text.secondary" mt={0.25}>
                    Customer: <strong>{customer.first_name} {customer.last_name}</strong>
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Stats bar */}
            {buyStats && (
              <Paper variant="outlined" sx={{ display: 'flex', mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                {[
                  { icon: 'CalendarToday', label: 'Last Buy Date', value: buyStats.last_buy_date ? new Date(buyStats.last_buy_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                  { icon: 'LocalOffer',    label: 'Total Buys',    value: buyStats.total_buys ?? 0 },
                  { icon: 'AttachMoney',  label: 'Total Buys Amount', value: fmt(buyStats.total_buy_amount || 0) },
                ].map((s, i) => {
                  const StatIcon = MuiIcons[s.icon];
                  return (
                  <Box key={i} sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, borderRight: i < 2 ? '1px solid #e0e0e0' : 'none' }}>
                    <StatIcon sx={{ color: BUY_BLUE, fontSize: 20 }} />
                    <Box>
                      <Typography fontSize={11} color="text.secondary">{s.label}</Typography>
                      <Typography fontSize={14} fontWeight={700}>{s.value}</Typography>
                    </Box>
                  </Box>
                  );
                })}
              </Paper>
            )}

            {/* Buy/Pawn Notes */}
            <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, mb: 2, borderRadius: 2 }}>
              <Typography fontSize={13} color="text.secondary" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>Buy/Pawn Notes:</Typography>
              <TextField
                value={buyPawnNotes}
                onChange={e => setBuyPawnNotes(e.target.value)}
                placeholder="Add customer notes..."
                variant="standard"
                size="small"
                fullWidth
                InputProps={{ disableUnderline: true }}
              />
              {buyPawnNotes && (
                <Button size="small" variant="outlined" onClick={() => setBuyPawnNotes('')} sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>Clear</Button>
              )}
            </Paper>

            {/* Search + Free-type toggle */}
            <Typography variant="body2" fontWeight={600} color="text.secondary" mb={0.75}>
              Scan / Search / Describe Item
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: quickAddMode ? 1 : 2.5 }}>
              <TextField
                fullWidth size="small"
                placeholder="Scan barcode, search inventory, or describe item..."
                InputProps={{ startAdornment: <InputAdornment position="start"><MuiIcons.Search sx={{ color: 'text.secondary' }} /></InputAdornment> }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
              />
              <Button
                variant={quickAddMode ? 'contained' : 'outlined'}
                startIcon={<MuiIcons.Edit sx={{ fontSize: 16 }} />}
                onClick={() => setQuickAddMode(q => !q)}
                sx={{
                  borderRadius: 2, textTransform: 'none', fontSize: 13, flexShrink: 0,
                  borderColor: BUY_BLUE, color: quickAddMode ? '#fff' : BUY_BLUE,
                  bgcolor: quickAddMode ? BUY_BLUE : 'transparent',
                  '&:hover': { bgcolor: quickAddMode ? BUY_DARK : '#e0f2fe', borderColor: BUY_BLUE },
                }}
              >
                Free-type Quick Add
              </Button>
            </Box>

            {/* Quick Add input */}
            {quickAddMode && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  inputRef={quickInputRef}
                  fullWidth size="small"
                  placeholder='e.g. "DeWalt Drill $75" — press Enter to add'
                  value={quickInput}
                  onChange={e => setQuickInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><MuiIcons.FlashOn sx={{ color: BUY_BLUE, fontSize: 18 }} /></InputAdornment>,
                    endAdornment: <InputAdornment position="end"><Typography fontSize={11} color="text.secondary">↵ Enter</Typography></InputAdornment>,
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                />
                <Button variant="contained" onClick={handleQuickAdd}
                  sx={{ bgcolor: BUY_BLUE, '&:hover': { bgcolor: BUY_DARK }, borderRadius: 2, whiteSpace: 'nowrap' }}>
                  Add
                </Button>
              </Box>
            )}

            {/* Items Being Bought */}
            <Typography variant="body2" fontWeight={700} mb={1}>Items Being Bought</Typography>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', mb: 2.5 }}>
              {/* Table header */}
              <Box sx={{ display: 'grid', gridTemplateColumns: HEADER_COLS, bgcolor: '#fafafa', borderBottom: '1px solid #e0e0e0', px: 1.5, py: 1 }}>
                {['Part #', 'Thumbnail', 'Category', 'Item', 'Serial Number', 'Qty', 'Paid', 'Actions'].map(h => (
                  <Typography key={h} fontSize={11} fontWeight={700} color={BUY_BLUE} letterSpacing={0.5} textAlign="center">{h}</Typography>
                ))}
              </Box>

              {/* Empty state */}
              {buyItems.length === 0 && (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <MuiIcons.Inbox sx={{ fontSize: 36, color: '#bdbdbd', mb: 0.5 }} />
                  <Typography fontSize={13} color="text.secondary">No items yet. Use the search or Quick Add above.</Typography>
                </Box>
              )}

              {/* Item rows */}
              {buyItems.map(item => {
                const isEditing = editingItemId === item._lineId;
                const catName   = categories.find(c => c.id === item.category_id)?.name || item.category_name || '';
                return (
                  <Box key={item._lineId} sx={{ borderBottom: '1px solid #f0f0f0' }}>
                    {isEditing ? (
                      <Box sx={{ display: 'grid', gridTemplateColumns: HEADER_COLS, px: 1.5, py: 1, alignItems: 'center', gap: 0.5, bgcolor: '#fffbf0' }}>
                        <Typography fontSize={11} color="text.secondary">{item.part_no}</Typography>
                        <Box sx={{ width: 40, height: 40, bgcolor: '#f5f5f5', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MuiIcons.Image sx={{ fontSize: 20, color: '#bdbdbd' }} />
                        </Box>
                        <Select size="small" value={editFields.category_id || ''} displayEmpty
                          onChange={e => setEditFields(f => ({ ...f, category_id: e.target.value }))}
                          sx={{ fontSize: 12 }}>
                          <MenuItem value=""><em>None</em></MenuItem>
                          {categories.map(c => <MenuItem key={c.id} value={c.id} sx={{ fontSize: 12 }}>{c.name}</MenuItem>)}
                        </Select>
                        <TextField size="small" value={editFields.description}
                          onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))}
                          placeholder="Description"
                          inputProps={{ style: { fontSize: 12 } }} />
                        <TextField size="small" value={editFields.serial_number}
                          onChange={e => setEditFields(f => ({ ...f, serial_number: e.target.value }))}
                          placeholder="—"
                          inputProps={{ style: { fontSize: 12 } }} />
                        <TextField size="small" type="number" value={editFields.qty}
                          onChange={e => setEditFields(f => ({ ...f, qty: e.target.value }))}
                          inputProps={{ min: 1, style: { fontSize: 12, width: 40 } }} />
                        <TextField size="small" type="number" value={editFields.paid}
                          onChange={e => setEditFields(f => ({ ...f, paid: e.target.value }))}
                          inputProps={{ min: 0, step: 0.01, style: { fontSize: 12 } }}
                          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Save"><IconButton size="small" color="success" onClick={() => saveEdit(item._lineId)}><MuiIcons.Check sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          <Tooltip title="Cancel"><IconButton size="small" onClick={() => setEditingItemId(null)}><MuiIcons.Close sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'grid', gridTemplateColumns: HEADER_COLS, px: 1.5, py: 1, alignItems: 'center', '&:hover': { bgcolor: '#fffbf0' } }}>
                        <Typography fontSize={11} color="text.secondary" fontWeight={500}>{item.part_no}</Typography>
                        <Box sx={{ width: 40, height: 40, bgcolor: '#f5f5f5', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.images?.[0]?.url
                            ? <Box component="img" src={item.images[0].url} alt="" sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }} />
                            : <MuiIcons.Image sx={{ fontSize: 20, color: '#bdbdbd' }} />}
                        </Box>
                        <Typography fontSize={12} color="text.secondary" textAlign="center">{catName || '—'}</Typography>
                        <Typography fontSize={13} fontWeight={600}>{item.description || <em style={{ color: '#bbb' }}>No description</em>}</Typography>
                        <Typography fontSize={12} color="text.secondary" textAlign="center">{item.serial_number || '—'}</Typography>
                        <Typography fontSize={13} textAlign="center" fontWeight={500}>{item.qty}</Typography>
                        <Typography fontSize={13} fontWeight={700} color={BUY_BLUE} textAlign="center">{fmt(item.paid * (parseInt(item.qty) || 1))}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => startEdit(item)} sx={{ color: '#1565c0' }}>
                              <MuiIcons.Edit sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Duplicate">
                            <IconButton size="small" onClick={() => handleDuplicateItem(item)} sx={{ color: '#555' }}>
                              <MuiIcons.ContentCopy sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleRemoveItem(item._lineId)}>
                              <MuiIcons.Delete sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    )}
                  </Box>
                );
              })}

              {/* Add item footer */}
              <Box sx={{ px: 1.5, py: 0.75 }}>
                <Button size="small" startIcon={<MuiIcons.Add />} onClick={() => addItem()}
                  sx={{ color: BUY_BLUE, textTransform: 'none', fontSize: 12 }}>
                  Add Item
                </Button>
              </Box>
            </Paper>

          </Box>
        </Box>

        {/* RIGHT PANEL */}
        <Box sx={{ width: 300, flexShrink: 0, borderLeft: '1px solid #e0e0e0', bgcolor: '#fff', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <Box sx={{ p: 2 }}>
            <Typography fontWeight={700} fontSize={13} mb={1.5}>Last 5 Items Sold</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Item', 'Date', 'Amount'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: BUY_BLUE, py: 0.5, px: 0.75 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {lastSoldItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic', py: 2 }}>
                      No sell history
                    </TableCell>
                  </TableRow>
                ) : lastSoldItems.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ fontSize: 12, py: 0.5, px: 0.75 }}>{r.item_desc || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12, py: 0.5, px: 0.75, whiteSpace: 'nowrap' }}>
                      {r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, py: 0.5, px: 0.75, color: BUY_BLUE, fontWeight: 600 }}>
                      {r.amount ? fmt(r.amount) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <MuiIcons.LocalOffer sx={{ color: BUY_BLUE, fontSize: 20, mr: 1 }} />
              <Typography fontSize={14} fontWeight={600}>Total Paid:</Typography>
              <Typography fontSize={18} fontWeight={800} color={BUY_BLUE} ml="auto">{fmt(totalPaid)}</Typography>
            </Box>

            <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 1, borderRadius: 2, bgcolor: '#e0f2fe', borderColor: BUY_BLUE }}>
              <MuiIcons.AccountBalance sx={{ color: BUY_BLUE, fontSize: 18, mr: 1 }} />
              <Box>
                <Typography fontSize={12} fontWeight={600} color={BUY_BLUE}>Net Effect:</Typography>
                <Typography fontSize={13} fontWeight={800} color="#c62828">-{fmt(totalPaid)} due to customer</Typography>
              </Box>
            </Paper>
          </Box>
        </Box>

      </Box>

      {/* ── Bottom action bar — sticky ── */}
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
        <Button size="small" variant="outlined" color="error" onClick={onClose}
          sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
          Cancel
        </Button>
        <Button size="small" variant="outlined"
          disabled={buyItems.length === 0}
          onClick={handleAddToWorkspace}
          sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
          Add to Workspace
        </Button>
        <Button size="small" variant="contained" endIcon={<MuiIcons.ArrowForward />}
          disabled={buyItems.length === 0}
          onClick={handleCheckoutNow}
          sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13, bgcolor: BUY_BLUE, '&:hover': { bgcolor: BUY_DARK } }}>
          Checkout Now
        </Button>
      </Paper>

      {/* Adjust Total Dialog */}
      <Dialog open={adjustDialog} onClose={() => setAdjustDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Adjust Total Paid Amount</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="New Total" type="number" autoFocus
            value={adjustTotal}
            onChange={e => setAdjustTotal(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            sx={{ mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary" mt={1} display="block">
            The difference will be distributed proportionally across items.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustDialog(false)}>Cancel</Button>
          <Button variant="contained"
            sx={{ bgcolor: BUY_BLUE, '&:hover': { bgcolor: BUY_DARK } }}
            onClick={() => {
              const newTotal = parseFloat(adjustTotal) || 0;
              if (newTotal > 0 && totalPaid > 0 && buyItems.length > 0) {
                const ratio = newTotal / totalPaid;
                setBuyItems(prev => prev.map(item => ({ ...item, paid: Math.round(item.paid * ratio * 100) / 100 })));
              }
              setAdjustDialog(false);
            }}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))} sx={{ fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
