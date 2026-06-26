import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, Avatar, Button, IconButton, Chip,
  Divider, TextField, InputAdornment, Checkbox, FormControlLabel,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Snackbar, Alert, Stack,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const GREEN      = '#1a472a';
const GREEN_DARK = '#0f2d18';

// Key names match the CustomerTicket.js convention so both screens share
// the same counter and never collide.
const ST_PENDING_KEY = 'pendingSTTicketId';
const ST_COUNTER_KEY = 'lastSTTicketNumber';

function generateSaleTicketId() {
  const voided = JSON.parse(localStorage.getItem('voidedSaleTickets') || '[]');
  const pending = localStorage.getItem(ST_PENDING_KEY);
  if (pending && !voided.includes(pending)) return pending;
  if (pending) localStorage.removeItem(ST_PENDING_KEY);
  let last = parseInt(localStorage.getItem(ST_COUNTER_KEY) || '0');
  let id;
  do {
    last += 1;
    id = `ST-${last.toString().padStart(8, '0')}`;
  } while (voided.includes(id));
  localStorage.setItem(ST_COUNTER_KEY, last.toString());
  localStorage.setItem(ST_PENDING_KEY, id);
  return id;
}

function commitSaleTicketId() {
  localStorage.removeItem(ST_PENDING_KEY);
}

// Sync the local counter with the DB so it never goes backward after a
// localStorage wipe or when using a different browser/machine.
// Returns true if the counter was bumped (caller should regenerate the ID).
async function syncSaleTicketCounter() {
  try {
    const res = await axios.get(`${config.apiUrl}/sale-ticket/last-id`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    const dbNum    = res.data.last_number || 0;
    const localNum = parseInt(localStorage.getItem(ST_COUNTER_KEY) || '0');
    if (dbNum > localNum) {
      localStorage.setItem(ST_COUNTER_KEY, dbNum.toString());
      // Clear the pending key so the next generateSaleTicketId() call
      // produces an ID that is truly beyond what the DB has.
      localStorage.removeItem(ST_PENDING_KEY);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Could not sync sale ticket counter with DB:', e.message);
    return false;
  }
}

function getCustomerImageUrl(customer) {
  if (!customer?.image) return null;
  const img = customer.image;
  if (typeof img === 'object' && img.type === 'Buffer' && img.data) {
    const base64 = btoa(
      new Uint8Array(img.data).reduce((d, b) => d + String.fromCharCode(b), '')
    );
    return `data:image/jpeg;base64,${base64}`;
  }
  if (typeof img === 'string') return img;
  return null;
}

function getItemImage(item) {
  if (!item?.images) return null;
  const imgs = Array.isArray(item.images)
    ? item.images
    : (typeof item.images === 'string' ? (() => { try { return JSON.parse(item.images); } catch { return []; } })() : []);
  return imgs.find(i => i.is_primary || i.isPrimary)?.url || imgs[0]?.url || null;
}

function QtyCell({ value, onChange, disabled }) {
  if (disabled) {
    return (
      <Typography fontSize={13} fontWeight={600} sx={{ width: 40, textAlign: 'center', color: 'text.disabled' }}>1</Typography>
    );
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
      <Box
        component="input"
        type="number"
        min={1}
        value={value}
        onChange={e => onChange(Math.max(1, parseInt(e.target.value) || 1))}
        style={{ width: 40, textAlign: 'center', border: '1px solid #e0e0e0', borderRadius: 4, padding: '2px 4px', fontSize: 13, fontWeight: 600 }}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <IconButton size="small" sx={{ p: 0, height: 14 }} onClick={() => onChange(value + 1)}>
          <MuiIcons.KeyboardArrowUp sx={{ fontSize: 14 }} />
        </IconButton>
        <IconButton size="small" sx={{ p: 0, height: 14 }} onClick={() => onChange(Math.max(1, value - 1))}>
          <MuiIcons.KeyboardArrowDown sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
    </Box>
  );
}

export default function SaleTransactionScreen({
  customer,
  customerStats,
  onClose,
  onAddToWorkspace,
  existingSaleData,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { setCustomer: setCartCustomer } = useCart();

  // Ticket ID: restored from workspace OR freshly generated.
  // We keep a mutable ref so syncSaleTicketCounter can bump it before first
  // render if the DB counter was ahead of localStorage.
  const [ticketId, setTicketId] = useState(() =>
    existingSaleData?.ticketId || generateSaleTicketId()
  );
  const [saleItems,   setSaleItems]   = useState(existingSaleData?.saleItems   || []);
  const [ticketNote,  setTicketNote]  = useState(existingSaleData?.ticketNote  || '');
  const [showOnReceipt, setShowOnReceipt] = useState(existingSaleData?.showOnReceipt || false);
  const [taxRate,     setTaxRate]     = useState(0.071);

  // Item search
  const [itemSearch,         setItemSearch]         = useState('');
  const [searchResults,      setSearchResults]      = useState([]);
  const [searching,          setSearching]          = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchTimerRef = useRef(null);

  // Customer stats
  const [custStats,      setCustStats]      = useState(customerStats || null);
  const [custSalesStats, setCustSalesStats] = useState(null);

  // Discount
  const [discountDialog,    setDiscountDialog]    = useState(false);
  const [globalDiscount,    setGlobalDiscount]    = useState(existingSaleData?.globalDiscount || 0);
  const [globalDiscountType, setGlobalDiscountType] = useState('amount');
  const [discountInput,     setDiscountInput]     = useState('');

  // Customer validation (mirrors PawnTransactionScreen pattern)
  const [saleRequiredFields,       setSaleRequiredFields]       = useState([]);
  const [customerValidationErrors, setCustomerValidationErrors] = useState([]);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  // Sync counter with DB on first open (skip for restored workspace tickets
  // which already have a committed ID).
  useEffect(() => {
    if (existingSaleData?.ticketId) return;
    syncSaleTicketCounter().then(bumped => {
      // Counter was behind DB — pending key is now cleared, regenerate.
      if (bumped) setTicketId(generateSaleTicketId());
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch configured required customer fields for the 'sale' transaction type
  useEffect(() => {
    fetch(`${config.apiUrl}/customer-preferences/required-fields/sale`)
      .then(r => r.ok ? r.json() : { requiredFields: [] })
      .then(data => setSaleRequiredFields(data.requiredFields || []))
      .catch(() => setSaleRequiredFields([]));
  }, []);

  // Recompute validation errors whenever the customer or required-fields list changes
  useEffect(() => {
    if (!customer || saleRequiredFields.length === 0) {
      setCustomerValidationErrors([]);
      return;
    }
    const missing = saleRequiredFields
      .filter(f => { const v = customer[f]; return v === null || v === undefined || v === ''; })
      .map(f => f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    setCustomerValidationErrors(missing);
  }, [customer, saleRequiredFields]);

  // Fetch tax config based on province selected in SystemConfig
  useEffect(() => {
    const province = localStorage.getItem('selectedProvince');
    if (!province) return;
    axios.get(`${config.apiUrl}/tax-config/${province}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => {
        const { gst_rate, pst_rate, hst_rate } = res.data;
        const total = (parseFloat(gst_rate) || 0) + (parseFloat(pst_rate) || 0) + (parseFloat(hst_rate) || 0);
        if (total > 0) setTaxRate(total / 100);
      })
      .catch(() => {});
  }, []);

  // Fetch customer stats
  useEffect(() => {
    if (!customer?.id) return;
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    axios.get(`${config.apiUrl}/customers/${customer.id}/stats`, { headers })
      .then(res => setCustStats(res.data))
      .catch(() => {});
    axios.get(`${config.apiUrl}/customers/${customer.id}/sales/stats`, { headers })
      .then(res => setCustSalesStats(res.data))
      .catch(() => {});
  }, [customer?.id]);

  // Item search with debounce
  const doSearch = useCallback(async (query) => {
    if (!query.trim()) { setSearchResults([]); setShowSearchDropdown(false); return; }
    setSearching(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const q = query.toLowerCase();
      const [hgRes, jwRes] = await Promise.allSettled([
        axios.get(`${config.apiUrl}/hardgoods?sellable_status=SELLABLE`, { headers }),
        axios.get(`${config.apiUrl}/jewelry?sellable_status=SELLABLE`,   { headers }),
      ]);
      const addedIds = new Set(saleItems.map(i => i.item_id));
      const hardgoods = (hgRes.status === 'fulfilled' ? hgRes.value.data : [])
        .filter(item => {
          const text = `${item.long_desc || ''} ${item.short_desc || ''} ${item.item_id || ''}`.toLowerCase();
          return text.includes(q) && !addedIds.has(item.item_id);
        })
        .slice(0, 10)
        .map(item => ({ ...item, _type: 'hardgoods' }));
      const jewelry = (jwRes.status === 'fulfilled' ? jwRes.value.data : [])
        .filter(item => {
          const text = `${item.long_desc || ''} ${item.short_desc || ''} ${item.item_id || ''}`.toLowerCase();
          return text.includes(q) && !addedIds.has(item.item_id);
        })
        .slice(0, 5)
        .map(item => ({ ...item, _type: 'jewelry' }));
      setSearchResults([...hardgoods, ...jewelry].slice(0, 12));
      setShowSearchDropdown(true);
    } catch (e) {
      console.error('Item search error:', e);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleItemSearchChange = (val) => {
    setItemSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!val.trim()) { setSearchResults([]); setShowSearchDropdown(false); return; }
    searchTimerRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelectItem = (invItem) => {
    const price = parseFloat(invItem.retail_price || invItem.item_price || invItem.cost_price || 0);
    const newItem = {
      _lineId: Date.now() + Math.random(),
      item_id: invItem.item_id,
      inventory_type: invItem._type,
      name: invItem.short_desc || invItem.long_desc || invItem.item_id,
      sku:  invItem.item_id,
      price,
      quantity: 1,
      discount: 0,
      images: invItem.images || [],
      protectionPlan: false,
      accessories: [],
    };
    setSaleItems(prev => [...prev, newItem]);
    setItemSearch('');
    setSearchResults([]);
    setShowSearchDropdown(false);
    showSnackbar(`${newItem.name} added to ticket`);
  };

  const handleRemoveItem   = (lineId) => setSaleItems(prev => prev.filter(i => i._lineId !== lineId));
  const handleQtyChange    = (lineId, qty) => setSaleItems(prev => prev.map(i => i._lineId === lineId ? { ...i, quantity: qty } : i));
  const handleDiscountChange = (lineId, disc) => setSaleItems(prev => prev.map(i => i._lineId === lineId ? { ...i, discount: parseFloat(disc) || 0 } : i));

  const [accessoryInputs, setAccessoryInputs] = useState({});

  const handleToggleProtectionPlan = (lineId) =>
    setSaleItems(prev => prev.map(i => i._lineId === lineId ? { ...i, protectionPlan: !i.protectionPlan } : i));

  const handleToggleAccessoryInput = (lineId) =>
    setAccessoryInputs(prev => ({
      ...prev,
      [lineId]: prev[lineId]?.open ? null : { open: true, name: '', price: '' },
    }));

  const handleAccessoryInputChange = (lineId, field, value) =>
    setAccessoryInputs(prev => ({ ...prev, [lineId]: { ...prev[lineId], [field]: value } }));

  const handleAddAccessory = (lineId) => {
    const inp = accessoryInputs[lineId];
    if (!inp?.name?.trim()) return;
    const acc = { id: Date.now() + Math.random(), name: inp.name.trim(), price: parseFloat(inp.price) || 0 };
    setSaleItems(prev => prev.map(i => i._lineId === lineId ? { ...i, accessories: [...(i.accessories || []), acc] } : i));
    setAccessoryInputs(prev => ({ ...prev, [lineId]: { open: true, name: '', price: '' } }));
  };

  const handleRemoveAccessory = (lineId, accId) =>
    setSaleItems(prev => prev.map(i => i._lineId === lineId ? { ...i, accessories: (i.accessories || []).filter(a => a.id !== accId) } : i));

  // Order totals
  const subtotal = saleItems.reduce((s, i) => {
    const ppAmt  = i.protectionPlan ? i.price * 0.15 : 0;
    const accAmt = (i.accessories || []).reduce((as, a) => as + a.price, 0);
    return s + i.price * i.quantity + ppAmt + accAmt;
  }, 0);
  const itemDiscounts = saleItems.reduce((s, i) => s + i.discount * i.quantity, 0);
  const totalDiscount = itemDiscounts + globalDiscount;
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const taxAmt        = taxableAmount * taxRate;
  const total         = taxableAmount + taxAmt;
  const fmt = (n) => `$${Number(n).toFixed(2)}`;

  const handleApplyGlobalDiscount = () => {
    const v = parseFloat(discountInput) || 0;
    setGlobalDiscount(globalDiscountType === 'percent' ? (subtotal - itemDiscounts) * v / 100 : v);
    setDiscountDialog(false);
    setDiscountInput('');
  };

  // Navigate to customer editor, saving ticket state so we can restore on return
  const handleEditCustomer = () => {
    if (!customer) return;
    const formatDate = (d) => {
      if (!d) return '';
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      const dt = new Date(d);
      return isNaN(dt) ? '' : dt.toISOString().substring(0, 10);
    };
    sessionStorage.setItem('pendingSaleState', JSON.stringify({
      customerId: customer.id, customer, ticketId, saleItems, ticketNote, showOnReceipt, globalDiscount,
    }));
    navigate('/customer-editor', {
      state: {
        customer: {
          ...customer,
          id_expiry_date: formatDate(customer.id_expiry_date),
          date_of_birth:  formatDate(customer.date_of_birth),
        },
        mode: 'edit',
        returnTo: location.pathname,
      },
    });
  };

  const handleSaveAsQuote = () => {
    if (saleItems.length === 0) { showSnackbar('Add at least one item to save as quote', 'warning'); return; }
    showSnackbar('Save as Quote coming soon', 'info');
  };

  const handleAddToWorkspace = () => {
    if (saleItems.length === 0) { showSnackbar('Add at least one item before adding to workspace', 'warning'); return; }
    onAddToWorkspace?.({ ticketId, saleItems, ticketNote, showOnReceipt, globalDiscount, total, subtotal, taxAmt, itemDiscounts, customer });
  };

  const handleCheckoutNow = () => {
    if (saleItems.length === 0) { showSnackbar('Add at least one item to checkout', 'warning'); return; }
    const cartCustomer = customer
      ? { id: customer.id, first_name: customer.first_name, last_name: customer.last_name, name: `${customer.first_name} ${customer.last_name}`.trim(), phone: customer.phone || '', email: customer.email || '', tax_exempt: customer.tax_exempt || false }
      : { id: null, first_name: 'Walk-in', last_name: 'Customer', name: 'Walk-in Customer', phone: '', email: '' };
    setCartCustomer(cartCustomer);
    const cartItems = saleItems.flatMap(item =>
      Array.from({ length: item.quantity }, () => ({
        id: `${item.item_id}_${Date.now()}_${Math.random()}`,
        description: item.name,
        price: item.price,
        retail_price: item.price,
        value: item.price,
        item_id: item.item_id,
        inventory_type: item.inventory_type,
        images: item.images,
        transaction_type: 'sale',
        fromInventory: true,
        discount: item.discount,
        protectionPlan: item.protectionPlan || false,
        ticket_note: ticketNote || null,
        show_on_receipt: showOnReceipt,
        customer: cartCustomer,
        employee: currentUser
          ? { id: currentUser.id, name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(), role: currentUser.role }
          : null,
        saleTicketId: ticketId,
      }))
    );
    const existing = JSON.parse(sessionStorage.getItem('cartItems') || '[]');
    sessionStorage.setItem('cartItems', JSON.stringify([...existing, ...cartItems]));
    if (customer) sessionStorage.setItem('selectedCustomer', JSON.stringify(cartCustomer));
    commitSaleTicketId();
    navigate('/checkout', { state: { from: 'sale-ticket' } });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', bgcolor: '#f5f6fa' }}>

      {/* ── Breadcrumb ── */}
      <Box sx={{ bgcolor: GREEN, color: '#fff', px: 2.5, py: 0.875, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography
          variant="body2" fontWeight={400}
          sx={{ cursor: 'pointer', opacity: 0.8, '&:hover': { textDecoration: 'underline', opacity: 1 } }}
          onClick={onClose}
        >
          Transactions
        </Typography>
        <MuiIcons.ChevronRight sx={{ fontSize: 16, opacity: 0.6 }} />
        <Typography variant="body2" fontWeight={700}>
          Sales Ticket ({ticketId})
        </Typography>
      </Box>

      {/* ── Body: main + right panel ── */}
      <Box sx={{ display: 'flex', flex: 1 }}>

        {/* ── LEFT / CENTER: Ticket content ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box sx={{ flex: 1, p: 2.5 }}>

            {/* Ticket header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
              <Typography variant="h5" fontWeight={800} letterSpacing={0.5}>
                SALES TICKET: {ticketId}
              </Typography>
              <Chip
                label="Ready"
                size="small"
                sx={{ bgcolor: '#e8f5e9', color: GREEN, fontWeight: 700, fontSize: 12, border: `1px solid ${GREEN}` }}
              />
            </Box>

            {/* Scan / Search Item */}
            <Typography variant="body2" fontWeight={600} color="text.secondary" mb={0.75}>
              Scan / Search Item
            </Typography>
            <Box sx={{ position: 'relative', mb: 2.5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Scan barcode or search by item name, SKU, or keywords..."
                value={itemSearch}
                onChange={e => handleItemSearchChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {searching
                        ? <CircularProgress size={16} />
                        : <MuiIcons.Search sx={{ color: 'text.secondary' }} />}
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
              />
              {showSearchDropdown && searchResults.length > 0 && (
                <Paper elevation={6} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, maxHeight: 300, overflowY: 'auto', borderRadius: 2, mt: 0.5 }}>
                  {searchResults.map(item => {
                    const thumb = getItemImage(item);
                    const price = parseFloat(item.retail_price || item.item_price || item.cost_price || 0);
                    const name  = item.short_desc || item.long_desc || item.item_id;
                    return (
                      <Box
                        key={item.item_id}
                        onMouseDown={() => handleSelectItem(item)}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' }, borderBottom: '1px solid #f0f0f0' }}
                      >
                        {thumb ? (
                          <Box component="img" src={thumb} alt="" sx={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }} />
                        ) : (
                          <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <MuiIcons.Inventory2 sx={{ fontSize: 18, color: '#bdbdbd' }} />
                          </Box>
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontSize={13} fontWeight={600} noWrap>{name}</Typography>
                          <Typography fontSize={11} color="text.secondary">{item.item_id}</Typography>
                        </Box>
                        <Typography fontSize={13} fontWeight={700} color={GREEN}>{fmt(price)}</Typography>
                      </Box>
                    );
                  })}
                </Paper>
              )}
              {showSearchDropdown && searchResults.length === 0 && !searching && itemSearch && (
                <Paper elevation={4} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, borderRadius: 2, mt: 0.5, px: 2, py: 1.5 }}>
                  <Typography fontSize={13} color="text.secondary">No sellable items found for "{itemSearch}"</Typography>
                </Paper>
              )}
            </Box>

            {/* Items table */}
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 2.5 }}>
              {/* Header row */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: '52px 1fr 120px 90px 90px 90px 100px 110px',
                bgcolor: '#fafafa', borderBottom: '1px solid #e0e0e0',
                px: 1.5, py: 1,
              }}>
                {['Thumbnail', 'Item', 'SKU', 'Qty', 'List', 'Disc.', 'Total', 'Actions'].map(h => (
                  <Typography key={h} fontSize={11} fontWeight={700} color="text.secondary" letterSpacing={0.5}>{h}</Typography>
                ))}
              </Box>

              {/* Item rows */}
              {saleItems.map(item => {
                const thumb     = getItemImage(item);
                const lineTotal = (item.price - item.discount) * item.quantity;
                const ppAmt     = item.price * 0.15;
                const accInp    = accessoryInputs[item._lineId];
                const ROW_SX    = { display: 'grid', gridTemplateColumns: '52px 1fr 120px 90px 90px 90px 100px 110px', px: 1.5, alignItems: 'center' };
                return (
                  <Box key={item._lineId}>
                    {/* Main row */}
                    <Box sx={{ ...ROW_SX, py: 1.25, alignItems: 'center', borderBottom: '1px solid #f5f5f5', '&:hover': { bgcolor: '#fafff9' } }}>
                      <Box>
                        {thumb ? (
                          <Box component="img" src={thumb} alt="" sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }} />
                        ) : (
                          <Box sx={{ width: 40, height: 40, bgcolor: '#f5f5f5', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MuiIcons.Inventory2 sx={{ fontSize: 22, color: '#d0d0d0' }} />
                          </Box>
                        )}
                      </Box>
                      <Typography fontSize={13} fontWeight={600} lineHeight={1.3}>{item.name}</Typography>
                      <Typography fontSize={12} color="text.secondary">{item.sku}</Typography>
                      <QtyCell value={item.quantity} onChange={qty => handleQtyChange(item._lineId, qty)} disabled={item.inventory_type === 'jewelry'} />
                      <Typography fontSize={13} fontWeight={500}>{item.price.toFixed(2)}</Typography>
                      <Box
                        component="input" type="number" min={0}
                        value={item.discount || ''} placeholder="0.00"
                        onChange={e => handleDiscountChange(item._lineId, e.target.value)}
                        style={{ width: 70, border: '1px solid #e0e0e0', borderRadius: 4, padding: '3px 6px', fontSize: 13, color: item.discount > 0 ? '#c62828' : 'inherit' }}
                      />
                      <Typography fontSize={13} fontWeight={600}>{lineTotal.toFixed(2)}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.25 }}>
                        <Tooltip title="Edit price">
                          <IconButton size="small" sx={{ color: '#1565c0' }}><MuiIcons.Edit sx={{ fontSize: 17 }} /></IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleRemoveItem(item._lineId)}>
                            <MuiIcons.Delete sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* Protection Plan + Accessories pill buttons */}
                    <Box sx={{ display: 'flex', gap: 1, px: 1.5, py: 0.75, bgcolor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                      <Button size="small" variant="outlined"
                        startIcon={<MuiIcons.Security sx={{ fontSize: 13 }} />}
                        onClick={() => handleToggleProtectionPlan(item._lineId)}
                        sx={{
                          borderRadius: 10, fontSize: 11, py: 0.25, textTransform: 'none',
                          color: item.protectionPlan ? '#fff' : GREEN,
                          borderColor: GREEN,
                          bgcolor: item.protectionPlan ? GREEN : 'transparent',
                          '&:hover': { bgcolor: item.protectionPlan ? GREEN_DARK : '#e8f5e9', borderColor: GREEN },
                        }}>
                        {item.protectionPlan ? 'Protection Plan ✓' : 'Add Protection Plan'}
                      </Button>
                      <Button size="small" variant="outlined"
                        startIcon={<MuiIcons.LocalOffer sx={{ fontSize: 13 }} />}
                        onClick={() => handleToggleAccessoryInput(item._lineId)}
                        sx={{
                          borderRadius: 10, fontSize: 11, py: 0.25, textTransform: 'none',
                          color: accInp?.open ? GREEN : 'text.secondary',
                          borderColor: accInp?.open ? GREEN : '#bdbdbd',
                          '&:hover': { borderColor: GREEN, color: GREEN },
                        }}>
                        Accessories{(item.accessories || []).length > 0 ? ` (${item.accessories.length})` : ''}
                      </Button>
                    </Box>

                    {/* Protection Plan sub-row */}
                    {item.protectionPlan && (
                      <Box sx={{ ...ROW_SX, py: 0.75, bgcolor: '#f0f7ff', borderTop: '1px solid #e3f0ff', borderBottom: '1px solid #e3f0ff' }}>
                        <Box />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <MuiIcons.Security sx={{ fontSize: 13, color: '#1565c0' }} />
                          <Typography fontSize={12} color="#1565c0" fontStyle="italic">Protection Plan (15%)</Typography>
                        </Box>
                        <Typography fontSize={12} color="text.secondary">—</Typography>
                        <Typography fontSize={12} color="text.secondary">1</Typography>
                        <Typography fontSize={12} color="#1565c0">{ppAmt.toFixed(2)}</Typography>
                        <Typography fontSize={12} color="text.secondary">—</Typography>
                        <Typography fontSize={12} color="#1565c0" fontWeight={600}>{ppAmt.toFixed(2)}</Typography>
                        <IconButton size="small" color="error" onClick={() => handleToggleProtectionPlan(item._lineId)}>
                          <MuiIcons.Close sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    )}

                    {/* Accessory sub-rows */}
                    {(item.accessories || []).map(acc => (
                      <Box key={acc.id} sx={{ ...ROW_SX, py: 0.75, bgcolor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                        <Box />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <MuiIcons.Extension sx={{ fontSize: 13, color: '#607d8b' }} />
                          <Typography fontSize={12} color="text.secondary" fontStyle="italic">{acc.name}</Typography>
                        </Box>
                        <Typography fontSize={12} color="text.secondary">—</Typography>
                        <Typography fontSize={12} color="text.secondary">1</Typography>
                        <Typography fontSize={12}>{acc.price.toFixed(2)}</Typography>
                        <Typography fontSize={12} color="text.secondary">—</Typography>
                        <Typography fontSize={12} fontWeight={600}>{acc.price.toFixed(2)}</Typography>
                        <IconButton size="small" color="error" onClick={() => handleRemoveAccessory(item._lineId, acc.id)}>
                          <MuiIcons.Close sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    ))}

                    {/* Add Accessory inline input */}
                    {accInp?.open && (
                      <Box sx={{ ...ROW_SX, py: 0.75, bgcolor: '#fffde7', borderBottom: '1px solid #fff9c4' }}>
                        <Box />
                        <Box component="input" placeholder="Accessory name"
                          value={accInp.name}
                          onChange={e => handleAccessoryInputChange(item._lineId, 'name', e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddAccessory(item._lineId)}
                          style={{ fontSize: 12, border: '1px solid #e0e0e0', borderRadius: 4, padding: '3px 6px', width: '90%' }}
                        />
                        <Box />
                        <Box />
                        <Box component="input" placeholder="0.00" type="number" min={0}
                          value={accInp.price}
                          onChange={e => handleAccessoryInputChange(item._lineId, 'price', e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddAccessory(item._lineId)}
                          style={{ width: 70, fontSize: 12, border: '1px solid #e0e0e0', borderRadius: 4, padding: '3px 6px' }}
                        />
                        <Box />
                        <Box />
                        <Box sx={{ display: 'flex', gap: 0.25 }}>
                          <IconButton size="small" sx={{ color: GREEN }} onClick={() => handleAddAccessory(item._lineId)}>
                            <MuiIcons.Check sx={{ fontSize: 14 }} />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleToggleAccessoryInput(item._lineId)}>
                            <MuiIcons.Close sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    )}
                  </Box>
                );
              })}

              {/* Empty placeholder rows */}
              {[0, 1, 2].map(i => (
                <Box
                  key={`empty-${i}`}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '52px 1fr 120px 90px 90px 90px 100px 110px',
                    px: 1.5, py: 1.25, borderBottom: '1px solid #f0f0f0',
                    alignItems: 'center', opacity: 0.45,
                  }}
                >
                  <Box sx={{ width: 40, height: 40, border: '1.5px dashed #ccc', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MuiIcons.Add sx={{ fontSize: 18, color: '#bdbdbd' }} />
                  </Box>
                  {['Scan or search item', '—', '—', '—', '—', '—', '—'].map((v, idx) => (
                    <Typography key={idx} fontSize={12} color="#bdbdbd">{v}</Typography>
                  ))}
                </Box>
              ))}
            </Paper>
          </Box>
        </Box>

        {/* ── RIGHT: Customer + Summary panel ── */}
        <Box sx={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e0e0e0', bgcolor: '#fff' }}>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>

            {/* Customer header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: customerValidationErrors.length > 0 ? 1 : 1.5 }}>
              <Avatar src={getCustomerImageUrl(customer) || undefined} sx={{ bgcolor: '#e8f5e9', color: GREEN, width: 32, height: 32 }}>
                <MuiIcons.Person sx={{ fontSize: 18 }} />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={700} fontSize={13} color={GREEN} noWrap>
                  {customer ? `${customer.first_name} ${customer.last_name}` : 'Walk-in Customer'}
                </Typography>
                {customer?.phone && (
                  <Typography fontSize={11} color="text.secondary" noWrap>{customer.phone}</Typography>
                )}
              </Box>
              <IconButton size="small" onClick={handleEditCustomer} disabled={!customer}>
                <MuiIcons.Edit sx={{ fontSize: 15, color: GREEN }} />
              </IconButton>
            </Box>

            {/* Missing customer fields banner — same pattern as PawnTransactionScreen */}
            {customerValidationErrors.length > 0 && (
              <Box sx={{ bgcolor: '#fff5f5', borderRadius: 1, px: 1.25, py: 1, mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <MuiIcons.ErrorOutline sx={{ fontSize: 14, color: '#dc2626' }} />
                    <Typography variant="caption" fontWeight={700} color="#dc2626">Missing fields</Typography>
                  </Box>
                  <Button size="small" color="error" variant="outlined" onClick={handleEditCustomer}
                    startIcon={<MuiIcons.Edit sx={{ fontSize: 11 }} />}
                    sx={{ fontSize: 10, py: 0.25, px: 0.75, minWidth: 0, lineHeight: 1.4 }}>
                    Edit
                  </Button>
                </Box>
                <Typography variant="caption" color="#dc2626">
                  {customerValidationErrors.join(', ')}
                </Typography>
              </Box>
            )}

            {/* Customer stats grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 2 }}>
              {[
                ['Taxable:',         customer?.tax_exempt ? 'No' : 'Yes'],
                ['Total Sales Amt:', custSalesStats ? fmt(custSalesStats.total_sales_amount) : '—'],
                ['Store Credit:',    custSalesStats ? fmt(custSalesStats.store_credit || 0)  : '—', GREEN],
                ['Total Sales:',     custSalesStats?.total_sales_count ?? '—'],
              ].map(([label, value, color]) => [
                <Typography key={`l-${label}`} fontSize={12} color="text.secondary">{label}</Typography>,
                <Typography key={`v-${label}`} fontSize={12} fontWeight={600} color={color || 'text.primary'}>{value}</Typography>,
              ])}
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Order summary */}
            <Stack spacing={0.75} mb={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontSize={13} color="text.secondary">Subtotal</Typography>
                <Typography fontSize={13} fontWeight={500}>{fmt(subtotal)}</Typography>
              </Box>
              {totalDiscount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography fontSize={13} color="text.secondary">Discounts</Typography>
                  <Typography fontSize={13} fontWeight={600} color="#c62828">-{fmt(totalDiscount)}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontSize={13} color="text.secondary">Tax ({(taxRate * 100).toFixed(2)}%)</Typography>
                <Typography fontSize={13} fontWeight={500}>{fmt(taxAmt)}</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography fontSize={15} fontWeight={700}>Total</Typography>
                <Typography fontSize={22} fontWeight={800} color={GREEN}>{fmt(total)}</Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* ── Sticky bottom action bar (matches PawnTransactionScreen pattern) ── */}
      <Paper sx={{ px: 2, py: 1.25, borderRadius: 0, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 1.25, position: 'sticky', bottom: 0, zIndex: 10 }}>
        {/* Ticket Note inline field */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            Ticket Note
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Add a note for this ticket (optional)"
            value={ticketNote}
            onChange={e => setTicketNote(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        {/* Show on receipt */}
        <FormControlLabel
          control={<Checkbox size="small" checked={showOnReceipt} onChange={e => setShowOnReceipt(e.target.checked)} />}
          label={<Typography variant="caption">Show on receipt</Typography>}
          sx={{ whiteSpace: 'nowrap', mr: 0 }}
        />

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Save as Quote */}
        <Tooltip title={customerValidationErrors.length > 0 ? `Missing customer fields: ${customerValidationErrors.join(', ')}` : ''} arrow>
          <span>
            <Button size="small" variant="outlined" startIcon={<MuiIcons.BookmarkBorder />}
              disabled={customerValidationErrors.length > 0}
              onClick={handleSaveAsQuote}
              sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
              Save as Quote
            </Button>
          </span>
        </Tooltip>

        {/* Cancel — always enabled */}
        <Button size="small" variant="outlined" color="error" onClick={onClose}
          sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
          Cancel
        </Button>

        {/* Add to Workspace */}
        <Tooltip title={customerValidationErrors.length > 0 ? `Missing customer fields: ${customerValidationErrors.join(', ')}` : ''} arrow>
          <span>
            <Button size="small" variant="outlined"
              disabled={saleItems.length === 0 || customerValidationErrors.length > 0}
              onClick={handleAddToWorkspace}
              sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
              Add to Workspace
            </Button>
          </span>
        </Tooltip>

        {/* Checkout Now */}
        <Tooltip title={customerValidationErrors.length > 0 ? `Missing customer fields: ${customerValidationErrors.join(', ')}` : ''} arrow>
          <span>
            <Button size="small" variant="contained"
              disabled={saleItems.length === 0 || customerValidationErrors.length > 0}
              onClick={handleCheckoutNow}
              sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13, bgcolor: GREEN, '&:hover': { bgcolor: GREEN_DARK } }}>
              Checkout Now
            </Button>
          </span>
        </Tooltip>
      </Paper>

      {/* ── Discount dialog ── */}
      <Dialog open={discountDialog} onClose={() => setDiscountDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Apply Ticket Discount</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, mt: 1 }}>
            <Button variant={globalDiscountType === 'amount'  ? 'contained' : 'outlined'} onClick={() => setGlobalDiscountType('amount')}
              sx={{ flex: 1, ...(globalDiscountType === 'amount'  && { bgcolor: GREEN, '&:hover': { bgcolor: GREEN_DARK } }) }}>
              $ Amount
            </Button>
            <Button variant={globalDiscountType === 'percent' ? 'contained' : 'outlined'} onClick={() => setGlobalDiscountType('percent')}
              sx={{ flex: 1, ...(globalDiscountType === 'percent' && { bgcolor: GREEN, '&:hover': { bgcolor: GREEN_DARK } }) }}>
              % Percent
            </Button>
          </Box>
          <TextField
            fullWidth autoFocus type="number"
            label={globalDiscountType === 'amount' ? 'Discount Amount ($)' : 'Discount Percent (%)'}
            value={discountInput}
            onChange={e => setDiscountInput(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">{globalDiscountType === 'amount' ? '$' : '%'}</InputAdornment> }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscountDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleApplyGlobalDiscount}
            sx={{ bgcolor: GREEN, '&:hover': { bgcolor: GREEN_DARK } }}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
