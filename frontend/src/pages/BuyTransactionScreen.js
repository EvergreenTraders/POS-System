import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Avatar,
  Divider, TextField, InputAdornment, Checkbox, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Snackbar, Alert, Select, MenuItem, Menu,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import JewelryIntakeScreen from './JewelryIntakeScreen';

const BUY_BLUE  = '#0284c7';
const BUY_DARK  = '#0369a1';

function parseItemDescription(parts, categoryCodeMap, colorCodeMap, metalTypeCodeMap) {
  const result = { category: null, purity: null, weight: null, color: null, metal: null };
  let i = 0;
  if (parts[i] && categoryCodeMap[parts[i]]) { result.category = categoryCodeMap[parts[i]]; i++; }
  if (i < parts.length) {
    const p = parts[i];
    if (p.match(/^\d+K?$/i))                          { result.purity = p.replace(/K$/i, '') + 'K'; i++; }
    else if (p.match(/^0?\.\d+$/) || p.match(/^1\.0+$/)) { result.purity = parseFloat(p); i++; }
    else if (p.match(/^[A-Z]+$/) && !p.match(/^\d/)) { result.purity = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); i++; }
  }
  if (i < parts.length) {
    const w = parts[i];
    if (w.match(/^[\d.]+G?$/i)) { result.weight = parseFloat(w.replace(/G$/i, '')); i++; }
  }
  if (i < parts.length) {
    const cm = parts[i];
    if (cm.length === 1)         { result.metal = metalTypeCodeMap[cm] || null; }
    else if (metalTypeCodeMap[cm]) { result.metal = metalTypeCodeMap[cm]; }
    else { result.color = colorCodeMap[cm[0]] || null; result.metal = metalTypeCodeMap[cm.slice(1)] || null; }
  }
  return result;
}

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
  onConvertTo,
  existingBuyData,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { setCustomer: setCartCustomer } = useCart();

  const [ticketId, setTicketId]         = useState(() => existingBuyData?.ticketId || generateBuyTicketId());
  const [buyItems, setBuyItems]         = useState(existingBuyData?.buyItems || []);
  const [buyPawnNotes, setBuyPawnNotes] = useState(existingBuyData?.buyPawnNotes || '');
  const [savedNotes, setSavedNotes]     = useState(existingBuyData?.buyPawnNotes || '');
  const [ticketNote, setTicketNote]     = useState(existingBuyData?.ticketNote || '');
  const [showOnReceipt, setShowOnReceipt] = useState(existingBuyData?.showOnReceipt ?? false);
  const [categories, setCategories]     = useState([]);
  const [buyStats, setBuyStats]         = useState(null);
  const [lastSoldItems, setLastSoldItems] = useState([]);
  const [scanInput, setScanInput]       = useState('');
  const [intakeOpen, setIntakeOpen]     = useState(false);
  const [intakeEntry, setIntakeEntry]   = useState('');
  const [parsedValues, setParsedValues] = useState(null);
  const [editingIntakeItem, setEditingIntakeItem] = useState(null);
  const [categoryCodeMap, setCategoryCodeMap] = useState({});
  const [colorCodeMap,    setColorCodeMap]    = useState({});
  const [metalTypeCodeMap,setMetalTypeCodeMap]= useState({});
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [quickInput, setQuickInput]     = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editFields, setEditFields]     = useState({});
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [adjustTotal, setAdjustTotal]   = useState('');
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [convertAnchor, setConvertAnchor] = useState(null);
  const [convertRow,    setConvertRow]    = useState(null);
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
    axios.get(`${config.apiUrl}/transaction-types`, { headers })
      .then(res => setTransactionTypes(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [catRes, colorRes, typeRes] = await Promise.all([
          axios.get(`${config.apiUrl}/metal_category`),
          axios.get(`${config.apiUrl}/metal_color`),
          axios.get(`${config.apiUrl}/precious_metal_type`),
        ]);
        const catMap = {};
        (catRes.data || []).forEach(c => { if (c.category_code) catMap[c.category_code.toUpperCase()] = c.category; });
        setCategoryCodeMap(catMap);
        const colorMap = {};
        (colorRes.data || []).forEach(c => { if (c.color_code) colorMap[c.color_code.toUpperCase()] = c.color; });
        setColorCodeMap(colorMap);
        const typeMap = {};
        (typeRes.data || []).forEach(t => { if (t.type_code) typeMap[t.type_code.toUpperCase()] = t.type; });
        setMetalTypeCodeMap(typeMap);
      } catch (err) {
        console.error('Error fetching metal code maps:', err);
      }
    })();
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
    axios.get(`${config.apiUrl}/customers/${customer.id}`, { headers })
      .then(res => {
        const dbNotes = res.data.buy_pawn_notes || '';
        setSavedNotes(dbNotes);
        if (!existingBuyData) setBuyPawnNotes(dbNotes);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!raw) { addItem(); setQuickInput(''); setQuickAddMode(false); return; }
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
    setQuickAddMode(false);
    showSnackbar(`${description || 'Item'} added`);
  };

  const handleRemoveItem = (_lineId) => setBuyItems(prev => prev.filter(i => i._lineId !== _lineId));

  const handleDuplicateItem = (item) => {
    setBuyItems(prev => {
      const count = prev.length + 1;
      return [...prev, { ...item, serial_number: '', _lineId: Date.now() + Math.random(), part_no: `${ticketId}-${String(count).padStart(2, '0')}` }];
    });
  };

  const startEdit = (item) => {
    if (item.sourceEstimator === 'jewelry' && item.jewelryData) {
      setEditingIntakeItem({ ...item.jewelryData, _lineId: item._lineId });
      setParsedValues(null);
      setIntakeEntry('');
      setIntakeOpen(true);
      return;
    }
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

  const openIntake = () => {
    const text  = scanInput.trim();
    const parts = text.toUpperCase().split(/\s+/);
    if (parts[0] === 'J' && parts.length >= 2) {
      setParsedValues(parseItemDescription(parts.slice(1), categoryCodeMap, colorCodeMap, metalTypeCodeMap));
    } else {
      setParsedValues(null);
    }
    setIntakeEntry(text);
    setEditingIntakeItem(null);
    setIntakeOpen(true);
  };

  const jewelryItemToBuyItem = (item, seq) => ({
    _lineId: Date.now() + Math.random(),
    part_no: `${ticketId}-${String(seq).padStart(2, '0')}`,
    category_id: categories.find(c => c.name === item.category)?.id || '',
    category_name: item.category || '',
    description: item.item || item.short_desc || '',
    serial_number: item.serial_number || item.serial || '',
    qty: 1,
    paid: parseFloat(item.buy_price) || parseFloat(item.paid_amount) || 0,
    images: item.images || [],
    sourceEstimator: 'jewelry',
    jewelryData: item,
  });

  const handleIntakeBack = () => {
    setIntakeOpen(false);
    setEditingIntakeItem(null);
  };

  const handleIntakeSave = (item) => {
    setBuyItems(prev => [...prev, jewelryItemToBuyItem(item, prev.length + 1)]);
    setScanInput('');
    setIntakeOpen(false);
  };

  const handleIntakeSaveAndAdd = (item) => {
    setBuyItems(prev => [...prev, jewelryItemToBuyItem(item, prev.length + 1)]);
    setScanInput('');
    setIntakeEntry('');
    setParsedValues(null);
    setEditingIntakeItem(null);
    setIntakeOpen(true);
  };

  const handleIntakeUpdate = (item) => {
    setBuyItems(prev => prev.map(i =>
      i._lineId === editingIntakeItem?._lineId
        ? { ...jewelryItemToBuyItem(item, 0), _lineId: i._lineId, part_no: i.part_no }
        : i
    ));
    setEditingIntakeItem(null);
    setIntakeOpen(false);
  };

  const saveBuyPawnNotes = async (notes) => {
    if (!customer?.id) return;
    try {
      await axios.put(`${config.apiUrl}/customers/${customer.id}/buy-pawn-notes`,
        { buy_pawn_notes: notes },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setSavedNotes(notes);
      showSnackbar('Notes saved');
    } catch { showSnackbar('Failed to save notes', 'error'); }
  };

  const handleClearNotes = async () => {
    setBuyPawnNotes('');
    await saveBuyPawnNotes('');
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
    sessionStorage.setItem('pendingBuyReturn', JSON.stringify({
      customerId: customer?.id || null,
      customer,
      ticketId,
      buyItems,
      buyPawnNotes,
      ticketNote,
      showOnReceipt,
    }));
    commitBuyTicketId();
    navigate('/checkout', { state: { items: cartItems, allCartItems: cartItems, customer: cartCustomer, from: 'buy-ticket' } });
  };

  const HEADER_COLS = '110px 52px 120px 1fr 110px 50px 95px 100px';

  if (intakeOpen) {
    return (
      <JewelryIntakeScreen
        customer={customer}
        ticketId={ticketId}
        ticketLabel="Buy Ticket"
        initialEntry={intakeEntry}
        parsedValues={editingIntakeItem ? null : parsedValues}
        editItem={editingIntakeItem}
        onBack={handleIntakeBack}
        onSaveItem={handleIntakeSave}
        onSaveAndAddAnother={handleIntakeSaveAndAdd}
        onUpdateItem={handleIntakeUpdate}
      />
    );
  }

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
      <Box sx={{ p: 2.5 }}>

        {/* ── Top section: two equal halves ── */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>

          {/* Left half — customer details + buy stats */}
          <Paper variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

            {/* Ticket ID + chip */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography fontSize={12} color="text.secondary" fontWeight={600} letterSpacing={0.5}>BUY TICKET</Typography>
              <Typography fontSize={13} fontWeight={800} color={BUY_BLUE}>{ticketId}</Typography>
              <Chip label="Ready" size="small"
                sx={{ bgcolor: '#e0f2fe', color: BUY_BLUE, fontWeight: 700, fontSize: 11, border: `1px solid ${BUY_BLUE}`, ml: 0.5 }} />
            </Box>

            {/* Customer card */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: '#e0f2fe', color: BUY_BLUE, fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
                {customer ? `${(customer.first_name || '')[0] || ''}${(customer.last_name || '')[0] || ''}`.toUpperCase() : '?'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={800} fontSize={18} lineHeight={1.2} noWrap>
                  {customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'No customer selected'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                  <MuiIcons.Phone sx={{ fontSize: 13, color: 'text.secondary' }} />
                  <Typography fontSize={13} color="text.secondary">{customer?.phone || '—'}</Typography>
                </Box>
              </Box>
              {customer && (
                <Tooltip title="Edit customer">
                  <IconButton size="small" onClick={() => {
                    sessionStorage.setItem('pendingBuyState', JSON.stringify({
                      customerId: customer.id,
                      customer,
                      ticketId,
                      buyItems,
                      buyPawnNotes,
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
                  }}>
                    <MuiIcons.Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Buy stats */}
            {buyStats && (
              <Paper variant="outlined" sx={{ display: 'flex', borderRadius: 2, overflow: 'hidden' }}>
                {[
                  { icon: 'CalendarToday', label: 'Last Buy Date', value: buyStats.last_buy_date ? new Date(buyStats.last_buy_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                  { icon: 'LocalOffer',    label: 'Total Buys',    value: buyStats.total_buys ?? 0 },
                  { icon: 'AttachMoney',  label: 'Total Amount',   value: fmt(buyStats.total_buy_amount || 0) },
                ].map((s, i) => {
                  const StatIcon = MuiIcons[s.icon];
                  return (
                    <Box key={i} sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRight: i < 2 ? '1px solid #e0e0e0' : 'none' }}>
                      <StatIcon sx={{ color: BUY_BLUE, fontSize: 18 }} />
                      <Box>
                        <Typography fontSize={10} color="text.secondary">{s.label}</Typography>
                        <Typography fontSize={13} fontWeight={700}>{s.value}</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Paper>
            )}
          </Paper>

          {/* Right half — last 5 items sold */}
          <Paper variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
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
                      {r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, py: 0.5, px: 0.75, color: BUY_BLUE, fontWeight: 600 }}>
                      {r.amount ? fmt(r.amount) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

        </Box>

        {/* ── Items Being Bought (75%) + Financial Summary (25%) ── */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>

          {/* Items — 75% */}
          <Paper variant="outlined" sx={{ flex: 3, borderRadius: 2, overflow: 'hidden', minWidth: 0 }}>

            {/* Section header + Buy/Pawn Notes */}
            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography fontWeight={700} fontSize={13} sx={{ whiteSpace: 'nowrap' }}>Items Being Bought</Typography>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Typography fontSize={12} color="text.secondary" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>Buy/Pawn Notes:</Typography>
              <TextField
                value={buyPawnNotes}
                onChange={e => setBuyPawnNotes(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveBuyPawnNotes(buyPawnNotes); } }}
                placeholder={customer?.id ? 'Add notes for this customer...' : 'Select a customer first'}
                disabled={!customer?.id}
                variant="standard"
                size="small"
                fullWidth
                InputProps={{ disableUnderline: true }}
              />
              {buyPawnNotes !== savedNotes && (
                <Tooltip title="Save notes">
                  <IconButton size="small" onClick={() => saveBuyPawnNotes(buyPawnNotes)} sx={{ color: BUY_BLUE, flexShrink: 0 }}>
                    <MuiIcons.Save fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Button size="small" onClick={handleClearNotes} disabled={!buyPawnNotes} sx={{ whiteSpace: 'nowrap', flexShrink: 0, color: 'text.secondary' }}>Clear</Button>
            </Box>

            {/* Scan + Free-type row */}
            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth size="small"
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && scanInput.trim()) openIntake(); }}
                  placeholder="Scan barcode, search inventory, or describe item — press Enter to add"
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
              {quickAddMode && (
                <Box sx={{ display: 'flex', gap: 1 }}>
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
            </Box>

            {/* Items table */}
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  {[
                    { label: 'Part #',       width: 100 },
                    { label: 'Thumbnail',    width: 56 },
                    { label: 'Category',     width: 120 },
                    { label: 'Item Description' },
                    { label: 'Serial #',     width: 110 },
                    { label: 'Qty',          width: 52, align: 'center' },
                    { label: 'Paid',         width: 90, align: 'right' },
                    { label: 'Actions',      width: 96, align: 'center' },
                  ].map(col => (
                    <TableCell key={col.label}
                      align={col.align || 'left'}
                      sx={{ width: col.width, fontSize: 11, fontWeight: 700, color: BUY_BLUE, py: 0.75, letterSpacing: 0.5 }}>
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {buyItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <MuiIcons.Inbox sx={{ fontSize: 36, color: '#bdbdbd', display: 'block', mx: 'auto', mb: 0.5 }} />
                      <Typography fontSize={13} color="text.secondary">No items yet. Use the scan or Free-type above.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {buyItems.map(item => {
                  const isEditing = editingItemId === item._lineId;
                  const catName   = categories.find(c => c.id === item.category_id)?.name || item.category_name || '';
                  return isEditing ? (
                    <TableRow key={item._lineId} sx={{ bgcolor: '#f0f9ff' }}>
                      <TableCell sx={{ py: 0.5 }}><Typography fontSize={11} color="text.secondary">{item.part_no}</Typography></TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Box sx={{ width: 40, height: 40, bgcolor: '#f5f5f5', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MuiIcons.Image sx={{ fontSize: 20, color: '#bdbdbd' }} />
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Select size="small" value={editFields.category_id || ''} displayEmpty fullWidth
                          onChange={e => setEditFields(f => ({ ...f, category_id: e.target.value }))}
                          sx={{ fontSize: 12 }}>
                          <MenuItem value=""><em>None</em></MenuItem>
                          {categories.map(c => <MenuItem key={c.id} value={c.id} sx={{ fontSize: 12 }}>{c.name}</MenuItem>)}
                        </Select>
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <TextField size="small" fullWidth value={editFields.description}
                          onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))}
                          placeholder="Description" inputProps={{ style: { fontSize: 12 } }} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <TextField size="small" fullWidth value={editFields.serial_number}
                          onChange={e => setEditFields(f => ({ ...f, serial_number: e.target.value }))}
                          placeholder="—" inputProps={{ style: { fontSize: 12 } }} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <TextField size="small" type="number" value={editFields.qty}
                          onChange={e => setEditFields(f => ({ ...f, qty: e.target.value }))}
                          inputProps={{ min: 1, style: { fontSize: 12, width: 40 } }} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                          <Typography fontSize={12} color="text.secondary">$</Typography>
                          <TextField size="small" type="number" value={editFields.paid}
                            onChange={e => setEditFields(f => ({ ...f, paid: e.target.value }))}
                            variant="standard"
                            inputProps={{ min: 0, step: 0.01, style: { fontSize: 12, width: 64 } }}
                            InputProps={{ disableUnderline: false }} />
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5 }}>
                        <Tooltip title="Save"><IconButton size="small" color="success" onClick={() => saveEdit(item._lineId)}><MuiIcons.Check sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                        <Tooltip title="Cancel"><IconButton size="small" onClick={() => setEditingItemId(null)}><MuiIcons.Close sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={item._lineId} sx={{ '&:hover': { bgcolor: '#f0f9ff' } }}>
                      <TableCell sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500, py: 0.75 }}>{item.part_no}</TableCell>
                      <TableCell sx={{ py: 0.75 }}>
                        <Box sx={{ width: 40, height: 40, bgcolor: '#f5f5f5', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.images?.[0]?.url
                            ? <Box component="img" src={item.images[0].url} alt="" sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }} />
                            : <MuiIcons.Image sx={{ fontSize: 20, color: '#bdbdbd' }} />}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary', py: 0.75 }}>{catName || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600, py: 0.75 }}>{item.description || <em style={{ color: '#bbb' }}>No description</em>}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary', py: 0.75 }}>{item.serial_number || '—'}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 13, fontWeight: 500, py: 0.75 }}>{item.qty}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 13, fontWeight: 700, color: BUY_BLUE, py: 0.75 }}>{fmt(item.paid * (parseInt(item.qty) || 1))}</TableCell>
                      <TableCell align="center" sx={{ py: 0.75 }}>
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => startEdit(item)} sx={{ color: '#1565c0' }}><MuiIcons.Edit sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                        <Tooltip title="Convert"><IconButton size="small" sx={{ color: '#555' }} onClick={(e) => { setConvertAnchor(e.currentTarget); setConvertRow(item); }}><MuiIcons.SwapHoriz sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                        <Tooltip title="Duplicate"><IconButton size="small" onClick={() => handleDuplicateItem(item)} sx={{ color: '#555' }}><MuiIcons.ContentCopy sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleRemoveItem(item._lineId)}><MuiIcons.Delete sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>

          {/* Financial summary — 25% */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <MuiIcons.LocalOffer sx={{ color: BUY_BLUE, fontSize: 24 }} />
              <Box>
                <Typography fontSize={11} color="text.secondary">Total Paid</Typography>
                <Typography fontSize={22} fontWeight={800} color={BUY_BLUE} lineHeight={1}>{fmt(totalPaid)}</Typography>
              </Box>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#e0f2fe', borderColor: BUY_BLUE }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <MuiIcons.AccountBalance sx={{ color: BUY_BLUE, fontSize: 18 }} />
                <Typography fontSize={12} fontWeight={700} color={BUY_BLUE}>Net Effect</Typography>
              </Box>
              <Typography fontSize={15} fontWeight={800} color="#c62828">-{fmt(totalPaid)}</Typography>
              <Typography fontSize={11} color="text.secondary">due to customer</Typography>
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

      {/* Convert menu */}
      <Menu anchorEl={convertAnchor} open={Boolean(convertAnchor)} onClose={() => { setConvertAnchor(null); setConvertRow(null); }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1, pb: 0.5, display: 'block', fontWeight: 600, letterSpacing: 0.5 }}>
          CONVERT TO
        </Typography>
        {(() => {
          const pawn  = transactionTypes.find(t => t.type === 'pawn')  ?? {};
          const trade = transactionTypes.find(t => t.type === 'trade') ?? {};
          const PawnIcon  = MuiIcons[pawn.icon]  ?? MuiIcons.Handshake;
          const TradeIcon = MuiIcons[trade.icon] ?? MuiIcons.CompareArrows;
          return (
            <>
              <MenuItem onClick={() => { onConvertTo?.({ type: 'pawn', item: convertRow }); setConvertAnchor(null); setConvertRow(null); }}>
                <PawnIcon sx={{ fontSize: 16, mr: 1.5, color: pawn.color ?? '#7b1fa2' }} />
                <Typography variant="body2">Pawn Ticket</Typography>
              </MenuItem>
              <MenuItem onClick={() => { onConvertTo?.({ type: 'trade', item: convertRow }); setConvertAnchor(null); setConvertRow(null); }}>
                <TradeIcon sx={{ fontSize: 16, mr: 1.5, color: trade.color ?? '#388e3c' }} />
                <Typography variant="body2">Trade Ticket</Typography>
              </MenuItem>
            </>
          );
        })()}
      </Menu>

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
