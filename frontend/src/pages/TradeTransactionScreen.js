import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Avatar,
  Divider, TextField, InputAdornment, Checkbox, FormControlLabel,
  Dialog, DialogContent, DialogActions,
  Tooltip, Snackbar, Alert, Select, MenuItem,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const TRADE_TEAL = '#0891b2';
const TRADE_DARK = '#0e7490';

const TT_PENDING_KEY = 'pendingTTTicketId';
const TT_COUNTER_KEY = 'lastTTTicketNumber';

function generateTradeTicketId() {
  const voided  = JSON.parse(localStorage.getItem('voidedTradeTickets') || '[]');
  const pending = localStorage.getItem(TT_PENDING_KEY);
  if (pending && !voided.includes(pending)) return pending;
  if (pending) localStorage.removeItem(TT_PENDING_KEY);
  let last = parseInt(localStorage.getItem(TT_COUNTER_KEY) || '100000');
  let id;
  do { last += 1; id = `TT-${last}`; } while (voided.includes(id));
  localStorage.setItem(TT_COUNTER_KEY, last.toString());
  localStorage.setItem(TT_PENDING_KEY, id);
  return id;
}

function commitTradeTicketId() { localStorage.removeItem(TT_PENDING_KEY); }

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

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads')) return `${config.apiUrl.replace('/api', '')}${url}`;
  return url;
}

export default function TradeTransactionScreen({
  customer,
  customerStats,
  onClose,
  onAddToWorkspace,
  existingTradeData,
}) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user: currentUser } = useAuth();
  const { setCustomer: setCartCustomer } = useCart();

  const [ticketId, setTicketId]   = useState(() => existingTradeData?.ticketId || generateTradeTicketId());
  const [tradeItems, setTradeItems] = useState(existingTradeData?.tradeItems || []);
  const [saleItems,  setSaleItems]  = useState(existingTradeData?.saleItems  || []);
  const [ticketNote, setTicketNote] = useState(existingTradeData?.ticketNote || '');
  const [showOnReceipt, setShowOnReceipt] = useState(existingTradeData?.showOnReceipt ?? false);
  const [isStoreCreditNet, setIsStoreCreditNet] = useState(existingTradeData?.isStoreCreditNet ?? false);

  const [categories, setCategories] = useState([]);
  const [taxRate, setTaxRate]       = useState(0.07);

  // Trade-in item editing
  const [editingTradeId, setEditingTradeId] = useState(null);
  const [editTradeFields, setEditTradeFields] = useState({});
  const [tradeQuickAddMode, setTradeQuickAddMode] = useState(false);
  const [tradeQuickInput, setTradeQuickInput]     = useState('');
  const [tradeScanInput,  setTradeScanInput]      = useState('');
  const tradeQuickInputRef = useRef(null);

  // Sale item search
  const [saleSearch,         setSaleSearch]         = useState('');
  const [saleSearchResults,  setSaleSearchResults]  = useState([]);
  const [saleSearching,      setSaleSearching]      = useState(false);
  const [showSaleDropdown,   setShowSaleDropdown]   = useState(false);
  const saleSearchTimerRef = useRef(null);

  // Sale item inline editing
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [editSaleFields, setEditSaleFields] = useState({});

  // Camera
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [cameraStream,     setCameraStream]     = useState(null);
  const [photoTargetType,  setPhotoTargetType]  = useState(null); // 'trade' or 'sale'
  const [photoTargetId,    setPhotoTargetId]    = useState(null);
  const [isCamReady,       setIsCamReady]       = useState(false);
  const cameraVideoRef = useRef(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (msg, sev = 'success') => setSnackbar({ open: true, message: msg, severity: sev });
  const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

  // ── On mount ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    axios.get(`${config.apiUrl}/categories`, { headers }).then(r => setCategories(r.data)).catch(() => {});
  }, []);

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

  useEffect(() => {
    if (tradeQuickAddMode) tradeQuickInputRef.current?.focus();
  }, [tradeQuickAddMode]);

  // ── Financials ───────────────────────────────────────────────────────────────

  const totalTradeAllowance = tradeItems.reduce(
    (s, i) => s + (parseFloat(i.tradeAllowance) || 0) * (parseInt(i.qty) || 1), 0
  );

  const saleSubtotal = saleItems.reduce(
    (s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1), 0
  );

  const saleDiscount = saleItems.reduce((s, i) => {
    const disc = parseFloat(i.discount) || 0;
    if (i.discountType === 'percent') return s + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1) * disc / 100;
    return s + disc * (parseInt(i.quantity) || 1);
  }, 0);

  const saleAfterDiscount = saleSubtotal - saleDiscount;

  // Tax on Difference: only tax the positive difference between sale and trade
  const taxableDifference = Math.max(0, saleAfterDiscount - totalTradeAllowance);
  const taxAmount          = taxableDifference * taxRate;
  const totalSaleAfterTax  = saleAfterDiscount + taxAmount;

  const netDueToCustomer = totalTradeAllowance - totalSaleAfterTax;

  // ── Trade-in items ────────────────────────────────────────────────────────────

  const addTradeItem = (overrides = {}) => {
    setTradeItems(prev => {
      const count = prev.length + 1;
      return [...prev, {
        _lineId: Date.now() + Math.random(),
        part_no: `${ticketId}-T${String(count).padStart(2, '0')}`,
        category_id: '',
        category_name: '',
        description: '',
        serial_number: '',
        qty: 1,
        tradeAllowance: 0,
        images: [],
        ...overrides,
      }];
    });
  };

  const handleTradeQuickAdd = () => {
    const raw = tradeQuickInput.trim();
    if (!raw) { addTradeItem(); setTradeQuickInput(''); setTradeQuickAddMode(false); return; }
    const amtMatch = raw.match(/\$?([\d,]+\.?\d*)\s*$/);
    let description = raw;
    let tradeAllowance = 0;
    if (amtMatch) {
      tradeAllowance = parseFloat(amtMatch[1].replace(',', '')) || 0;
      const without = raw.slice(0, raw.lastIndexOf(amtMatch[0])).trim();
      if (without) description = without;
    }
    addTradeItem({ description, tradeAllowance });
    setTradeQuickInput('');
    setTradeQuickAddMode(false);
    showSnackbar(`${description || 'Item'} added to trade-in`);
  };

  const startEditTrade = (item) => {
    setEditingTradeId(item._lineId);
    setEditTradeFields({
      category_id: item.category_id || '',
      description: item.description || '',
      serial_number: item.serial_number || '',
      qty: item.qty,
      tradeAllowance: item.tradeAllowance,
    });
  };

  const saveEditTrade = (_lineId) => {
    setTradeItems(prev => prev.map(i => i._lineId === _lineId
      ? { ...i, ...editTradeFields,
          tradeAllowance: parseFloat(editTradeFields.tradeAllowance) || 0,
          qty: parseInt(editTradeFields.qty) || 1,
          category_name: categories.find(c => c.id === editTradeFields.category_id)?.name || i.category_name,
        }
      : i
    ));
    setEditingTradeId(null);
  };

  // ── Sale items ───────────────────────────────────────────────────────────────

  const doSaleSearch = useCallback(async (query) => {
    if (!query.trim()) { setSaleSearchResults([]); setShowSaleDropdown(false); return; }
    setSaleSearching(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const q = query.toLowerCase();
      const addedIds = new Set(saleItems.map(i => i.item_id));
      const [hgRes, jwRes] = await Promise.allSettled([
        axios.get(`${config.apiUrl}/hardgoods?sellable_status=SELLABLE`, { headers }),
        axios.get(`${config.apiUrl}/jewelry?sellable_status=SELLABLE`, { headers }),
      ]);
      const hardgoods = (hgRes.status === 'fulfilled' ? hgRes.value.data : [])
        .filter(item => {
          const text = `${item.long_desc || ''} ${item.short_desc || ''} ${item.item_id || ''}`.toLowerCase();
          return text.includes(q) && !addedIds.has(item.item_id);
        })
        .slice(0, 10).map(item => ({ ...item, _type: 'hardgoods' }));
      const jewelry = (jwRes.status === 'fulfilled' ? jwRes.value.data : [])
        .filter(item => {
          const text = `${item.long_desc || ''} ${item.short_desc || ''} ${item.item_id || ''}`.toLowerCase();
          return text.includes(q) && !addedIds.has(item.item_id);
        })
        .slice(0, 5).map(item => ({ ...item, _type: 'jewelry' }));
      setSaleSearchResults([...hardgoods, ...jewelry].slice(0, 12));
      setShowSaleDropdown(true);
    } catch (e) {
      console.error('Sale item search error:', e);
    } finally {
      setSaleSearching(false);
    }
  }, [saleItems]);

  const handleSaleSearchChange = (val) => {
    setSaleSearch(val);
    if (saleSearchTimerRef.current) clearTimeout(saleSearchTimerRef.current);
    if (!val.trim()) { setSaleSearchResults([]); setShowSaleDropdown(false); return; }
    saleSearchTimerRef.current = setTimeout(() => doSaleSearch(val), 300);
  };

  const handleSelectSaleItem = (invItem) => {
    const price = parseFloat(invItem.retail_price || invItem.item_price || invItem.cost_price || 0);
    const imgs  = Array.isArray(invItem.images)
      ? invItem.images
      : (typeof invItem.images === 'string' ? (() => { try { return JSON.parse(invItem.images); } catch { return []; } })() : []);
    setSaleItems(prev => [...prev, {
      _lineId: Date.now() + Math.random(),
      item_id: invItem.item_id,
      sku: invItem.item_id,
      inventory_type: invItem._type,
      name: invItem.short_desc || invItem.long_desc || invItem.item_id,
      category_name: invItem.category_name || invItem.category || '',
      price,
      quantity: 1,
      discount: 0,
      discountType: 'amount',
      images: imgs,
    }]);
    setSaleSearch('');
    setSaleSearchResults([]);
    setShowSaleDropdown(false);
    showSnackbar(`${invItem.short_desc || invItem.item_id} added to sale items`);
  };

  const startEditSale = (item) => {
    setEditingSaleId(item._lineId);
    setEditSaleFields({ price: item.price, quantity: item.quantity, discount: item.discount, discountType: item.discountType });
  };

  const saveEditSale = (_lineId) => {
    setSaleItems(prev => prev.map(i => i._lineId === _lineId
      ? { ...i, ...editSaleFields, price: parseFloat(editSaleFields.price) || 0, quantity: parseInt(editSaleFields.quantity) || 1, discount: parseFloat(editSaleFields.discount) || 0 }
      : i
    ));
    setEditingSaleId(null);
  };

  const getSaleItemTotal = (item) => {
    const base = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
    const disc = item.discountType === 'percent'
      ? base * (parseFloat(item.discount) || 0) / 100
      : (parseFloat(item.discount) || 0) * (parseInt(item.quantity) || 1);
    return base - disc;
  };

  // ── Camera ───────────────────────────────────────────────────────────────────

  const openCamera = (type, _lineId) => {
    setPhotoTargetType(type);
    setPhotoTargetId(_lineId);
    setIsCamReady(false);
    setCameraDialogOpen(true);
  };

  const handleCameraEntered = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setCameraStream(stream);
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Camera error:', err);
      closeCamera();
    }
  };

  const capturePhoto = () => {
    const video = cameraVideoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url  = URL.createObjectURL(file);
      const newImg = { url, file, isPrimary: true, type: 'capture' };
      if (photoTargetType === 'trade') {
        setTradeItems(prev => prev.map(i =>
          i._lineId === photoTargetId
            ? { ...i, images: [...(i.images || []), { ...newImg, isPrimary: !(i.images?.length) }] }
            : i
        ));
      } else {
        setSaleItems(prev => prev.map(i =>
          i._lineId === photoTargetId
            ? { ...i, images: [...(i.images || []), { ...newImg, isPrimary: !(i.images?.length) }] }
            : i
        ));
      }
      closeCamera();
    }, 'image/jpeg', 0.9);
  };

  const closeCamera = () => {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); }
    setIsCamReady(false);
    setCameraDialogOpen(false);
    setPhotoTargetType(null);
    setPhotoTargetId(null);
  };

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleAddToWorkspace = () => {
    if (tradeItems.length === 0 && saleItems.length === 0) {
      showSnackbar('Add at least one item before adding to workspace', 'warning');
      return;
    }
    onAddToWorkspace?.({
      ticketId, tradeItems, saleItems, ticketNote, showOnReceipt,
      isStoreCreditNet, totalTradeAllowance, totalSaleAfterTax, netDueToCustomer, customer,
    });
  };

  const handleCheckoutNow = () => {
    if (tradeItems.length === 0 && saleItems.length === 0) {
      showSnackbar('Add items before checkout', 'warning');
      return;
    }
    if (!customer?.id) {
      showSnackbar('Please select a customer before checkout', 'error');
      return;
    }
    const cartCustomer = {
      id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      name: `${customer.first_name} ${customer.last_name}`.trim(),
      phone: customer.phone || '',
      email: customer.email || '',
    };
    setCartCustomer(cartCustomer);

    // Build cart items: sale items go as positive-price items, trade items as negative (buy-back)
    const cartItems = [
      ...saleItems.flatMap(item =>
        Array.from({ length: parseInt(item.quantity) || 1 }, () => ({
          ...item,
          id: `${ticketId}_sale_${item._lineId}_${Date.now()}`,
          description: item.name || item.sku,
          short_desc: item.name || '',
          price: parseFloat(item.price) || 0,
          value: parseFloat(item.price) || 0,
          transaction_type: 'trade_sale',
          customer: cartCustomer,
          employee: currentUser
            ? { id: currentUser.id, name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(), role: currentUser.role }
            : null,
          tradeTicketId: ticketId,
          ticket_note: ticketNote || null,
          show_on_receipt: showOnReceipt,
        }))
      ),
      ...tradeItems.map(item => ({
        ...item,
        id: `${ticketId}_trade_${item._lineId}_${Date.now()}`,
        description: item.description || item.part_no,
        short_desc: item.description || '',
        price: -((parseFloat(item.tradeAllowance) || 0) * (parseInt(item.qty) || 1)),
        value: -((parseFloat(item.tradeAllowance) || 0) * (parseInt(item.qty) || 1)),
        transaction_type: 'trade_in',
        customer: cartCustomer,
        employee: currentUser
          ? { id: currentUser.id, name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(), role: currentUser.role }
          : null,
        tradeTicketId: ticketId,
        ticket_note: ticketNote || null,
        show_on_receipt: showOnReceipt,
      })),
    ];

    sessionStorage.setItem('checkoutItems', JSON.stringify(cartItems));
    sessionStorage.setItem('selectedCustomer', JSON.stringify(cartCustomer));
    commitTradeTicketId();
    navigate('/checkout', { state: { items: cartItems, allCartItems: cartItems, customer: cartCustomer, from: 'trade-ticket' } });
  };

  // ── Customer bar stats ───────────────────────────────────────────────────────

  const storeCredit    = customerStats?.store_credit ?? customer?.store_credit ?? 0;
  const customerSince  = customer?.created_at
    ? new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const totalSalesAmt  = customerStats?.total_sales_amount ?? 0;

  // ── Shared image cell renderer ───────────────────────────────────────────────

  const ImageCell = ({ item, onCameraClick }) => {
    const thumb = resolveImageUrl(item.images?.find(i => i.isPrimary)?.url || item.images?.[0]?.url);
    if (thumb) {
      return (
        <Box component="img" src={thumb} alt="Item"
          sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover', cursor: 'pointer' }}
          onClick={onCameraClick} />
      );
    }
    return (
      <IconButton size="small" onClick={onCameraClick}
        sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: '#f0f0f0', color: '#9e9e9e', '&:hover': { bgcolor: '#e0f9ff', color: TRADE_TEAL } }}>
        <MuiIcons.PhotoCamera sx={{ fontSize: 18 }} />
      </IconButton>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', bgcolor: '#f5f6fa' }}>

      {/* ── Page header ── */}
      <Paper elevation={0} sx={{ px: 3, py: 1.5, borderBottom: '1px solid #e0e0e0', bgcolor: '#fff', display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Ticket identity — compact, fixed left */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <MuiIcons.Balance sx={{ color: TRADE_TEAL, fontSize: 26 }} />
          <Typography fontWeight={800} fontSize={20}>Trade Ticket</Typography>
          <MuiIcons.Balance sx={{ color: TRADE_TEAL, fontSize: 20, opacity: 0.5 }} />
          <Typography fontWeight={800} fontSize={18} color={TRADE_TEAL}>{ticketId}</Typography>
          <Chip
            label="In Progress"
            size="small"
            icon={<MuiIcons.FiberManualRecord sx={{ fontSize: '10px !important', color: `${TRADE_TEAL} !important` }} />}
            sx={{ bgcolor: '#e0f9ff', color: TRADE_TEAL, fontWeight: 600, fontSize: 12, border: `1px solid ${TRADE_TEAL}` }}
          />
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* Customer bar — flex: 1, spread across remaining width */}
        {customer ? (() => {
          const customerImg = getCustomerImageUrl(customer);
          return (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
              {/* Avatar + name + button */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                <Avatar
                  src={customerImg || undefined}
                  sx={{ width: 44, height: 44, bgcolor: '#e0f9ff', color: TRADE_TEAL, fontWeight: 700, fontSize: 15 }}
                >
                  {!customerImg && `${(customer.first_name || '')[0] || ''}${(customer.last_name || '')[0] || ''}`.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography fontWeight={700} fontSize={15} lineHeight={1.2}>
                    {customer.first_name} {customer.last_name}
                  </Typography>
                </Box>
                <Button size="small" variant="outlined"
                  sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12, borderColor: TRADE_TEAL, color: TRADE_TEAL, '&:hover': { borderColor: TRADE_DARK, bgcolor: '#e0f9ff' } }}
                  onClick={() => navigate(`/customers/${customer.id}`)}>
                  View Customer
                </Button>
              </Box>

              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography fontSize={11} color="text.secondary">Phone</Typography>
                <Typography fontSize={13} fontWeight={600}>{customer.phone || '—'}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography fontSize={11} color="text.secondary">ID</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                  <Typography fontSize={13} fontWeight={600}>{customer.id_number ? 'Verified' : 'Not on file'}</Typography>
                  {customer.id_number && <MuiIcons.CheckCircle sx={{ fontSize: 14, color: '#2e7d32' }} />}
                </Box>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography fontSize={11} color="text.secondary">Store Credit</Typography>
                <Typography fontSize={13} fontWeight={600} color="#2e7d32">{fmt(storeCredit)}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography fontSize={11} color="text.secondary">Customer Since</Typography>
                <Typography fontSize={13} fontWeight={600}>{customerSince}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography fontSize={11} color="text.secondary">Total Sales</Typography>
                <Typography fontSize={13} fontWeight={600}>{fmt(totalSalesAmt)}</Typography>
              </Box>
            </Box>
          );
        })() : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <Typography fontSize={13} color="text.secondary" fontStyle="italic">No customer selected</Typography>
          </Box>
        )}
      </Paper>

      {/* ── Main body ── */}
      <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Two-panel row */}
        <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>

          {/* ── LEFT: Customer gives us (trade-in items) ── */}
          <Paper variant="outlined" sx={{ flex: '0 0 55%', borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Section header */}
            <Box sx={{ px: 2, py: 1, bgcolor: '#f0f9ff', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: TRADE_TEAL, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography fontSize={13} fontWeight={800}>1</Typography>
              </Box>
              <Typography fontWeight={700} fontSize={13} letterSpacing={0.5} color={TRADE_TEAL}>
                CUSTOMER GIVES US (TRADE-IN ITEMS)
              </Typography>
            </Box>

            {/* Search / scan row */}
            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth size="small"
                  value={tradeScanInput}
                  onChange={e => setTradeScanInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && tradeScanInput.trim()) { addTradeItem({ description: tradeScanInput }); setTradeScanInput(''); } }}
                  placeholder="Scan barcode or search items to trade in..."
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><MuiIcons.Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
                    endAdornment: <InputAdornment position="end"><MuiIcons.QrCodeScanner sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                />
                <Button
                  variant={tradeQuickAddMode ? 'contained' : 'outlined'}
                  startIcon={<MuiIcons.Edit sx={{ fontSize: 15 }} />}
                  onClick={() => setTradeQuickAddMode(q => !q)}
                  sx={{
                    borderRadius: 2, textTransform: 'none', fontSize: 12, flexShrink: 0,
                    borderColor: TRADE_TEAL, color: tradeQuickAddMode ? '#fff' : TRADE_TEAL,
                    bgcolor: tradeQuickAddMode ? TRADE_TEAL : 'transparent',
                    '&:hover': { bgcolor: tradeQuickAddMode ? TRADE_DARK : '#e0f9ff', borderColor: TRADE_TEAL },
                  }}>
                  Free-type Quick Add
                </Button>
                <Button variant="outlined" startIcon={<MuiIcons.AddCircleOutline sx={{ fontSize: 15 }} />}
                  onClick={() => showSnackbar('Add Existing Buy Ticket — coming soon', 'info')}
                  sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12, flexShrink: 0, borderColor: TRADE_TEAL, color: TRADE_TEAL, '&:hover': { bgcolor: '#e0f9ff' } }}>
                  Add Existing Buy Ticket
                </Button>
              </Box>
              {tradeQuickAddMode && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    inputRef={tradeQuickInputRef}
                    fullWidth size="small"
                    placeholder='e.g. "10K Gold Ring $250" — press Enter to add'
                    value={tradeQuickInput}
                    onChange={e => setTradeQuickInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleTradeQuickAdd(); }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><MuiIcons.FlashOn sx={{ color: TRADE_TEAL, fontSize: 18 }} /></InputAdornment>,
                      endAdornment: <InputAdornment position="end"><Typography fontSize={11} color="text.secondary">↵ Enter</Typography></InputAdornment>,
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                  />
                  <Button variant="contained" onClick={handleTradeQuickAdd}
                    sx={{ bgcolor: TRADE_TEAL, '&:hover': { bgcolor: TRADE_DARK }, borderRadius: 2, whiteSpace: 'nowrap' }}>
                    Add
                  </Button>
                </Box>
              )}
            </Box>

            {/* Trade-in items table */}
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#fafafa' }}>
                    {[
                      { label: 'Part #',          width: 95 },
                      { label: 'Image',            width: 52 },
                      { label: 'Category',         width: 110 },
                      { label: 'Item' },
                      { label: 'Serial #',         width: 100 },
                      { label: 'Qty',              width: 48, align: 'center' },
                      { label: 'Trade Allowance',  width: 110, align: 'right' },
                      { label: 'Actions',          width: 96, align: 'center' },
                    ].map(col => (
                      <TableCell key={col.label} align={col.align || 'left'}
                        sx={{ width: col.width, fontSize: 11, fontWeight: 700, color: TRADE_TEAL, py: 0.75, letterSpacing: 0.5, bgcolor: '#fafafa' }}>
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tradeItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <MuiIcons.SwapHoriz sx={{ fontSize: 36, color: '#bdbdbd', display: 'block', mx: 'auto', mb: 0.5 }} />
                        <Typography fontSize={13} color="text.secondary">No trade-in items yet.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {tradeItems.map(item => {
                    const isEditing = editingTradeId === item._lineId;
                    const catName   = categories.find(c => c.id === item.category_id)?.name || item.category_name || '';
                    return isEditing ? (
                      <TableRow key={item._lineId} sx={{ bgcolor: '#f0f9ff' }}>
                        <TableCell sx={{ py: 0.5 }}><Typography fontSize={11} color="text.secondary">{item.part_no}</Typography></TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <ImageCell item={item} onCameraClick={() => openCamera('trade', item._lineId)} />
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Select size="small" value={editTradeFields.category_id || ''} displayEmpty fullWidth
                            onChange={e => setEditTradeFields(f => ({ ...f, category_id: e.target.value }))}
                            sx={{ fontSize: 12 }}>
                            <MenuItem value=""><em>None</em></MenuItem>
                            {categories.map(c => <MenuItem key={c.id} value={c.id} sx={{ fontSize: 12 }}>{c.name}</MenuItem>)}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <TextField size="small" fullWidth value={editTradeFields.description}
                            onChange={e => setEditTradeFields(f => ({ ...f, description: e.target.value }))}
                            placeholder="Description" inputProps={{ style: { fontSize: 12 } }} />
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <TextField size="small" fullWidth value={editTradeFields.serial_number}
                            onChange={e => setEditTradeFields(f => ({ ...f, serial_number: e.target.value }))}
                            placeholder="—" inputProps={{ style: { fontSize: 12 } }} />
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <TextField size="small" type="number" value={editTradeFields.qty}
                            onChange={e => setEditTradeFields(f => ({ ...f, qty: e.target.value }))}
                            inputProps={{ min: 1, style: { fontSize: 12, width: 36 } }} />
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <Typography fontSize={12} color="text.secondary">$</Typography>
                            <TextField size="small" type="number" value={editTradeFields.tradeAllowance}
                              onChange={e => setEditTradeFields(f => ({ ...f, tradeAllowance: e.target.value }))}
                              variant="standard"
                              inputProps={{ min: 0, step: 0.01, style: { fontSize: 12, width: 64 } }}
                              InputProps={{ disableUnderline: false }} />
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.5 }}>
                          <Tooltip title="Save"><IconButton size="small" color="success" onClick={() => saveEditTrade(item._lineId)}><MuiIcons.Check sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          <Tooltip title="Cancel"><IconButton size="small" onClick={() => setEditingTradeId(null)}><MuiIcons.Close sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={item._lineId} sx={{ '&:hover': { bgcolor: '#f0f9ff' } }}>
                        <TableCell sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500, py: 0.75 }}>{item.part_no}</TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <ImageCell item={item} onCameraClick={() => openCamera('trade', item._lineId)} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary', py: 0.75 }}>{catName || '—'}</TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600, py: 0.75 }}>
                          {item.description || <em style={{ color: '#bbb' }}>No description</em>}
                          {item.serial_number && (
                            <Typography component="div" fontSize={11} color="text.secondary">{item.serial_number}</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary', py: 0.75 }}>{item.serial_number || '—'}</TableCell>
                        <TableCell align="center" sx={{ fontSize: 13, fontWeight: 500, py: 0.75 }}>{item.qty}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 700, color: TRADE_TEAL, py: 0.75 }}>
                          {fmt((parseFloat(item.tradeAllowance) || 0) * (parseInt(item.qty) || 1))}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.75 }}>
                          <Tooltip title="Edit"><IconButton size="small" onClick={() => startEditTrade(item)} sx={{ color: '#1565c0' }}><MuiIcons.Edit sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          <Tooltip title="Photo"><IconButton size="small" onClick={() => openCamera('trade', item._lineId)} sx={{ color: '#555' }}><MuiIcons.PhotoCamera sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          <Tooltip title="Swap"><IconButton size="small" sx={{ color: '#555' }}><MuiIcons.SwapHoriz sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setTradeItems(prev => prev.filter(i => i._lineId !== item._lineId))}><MuiIcons.Delete sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>

            {/* Trade-in footer */}
            <Box sx={{ px: 2, py: 1.25, borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', bgcolor: '#f8f9fa' }}>
              <Typography fontSize={13} color="text.secondary">{tradeItems.length} item{tradeItems.length !== 1 ? 's' : ''}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography fontSize={13} color="text.secondary" fontWeight={500}>Total Trade Allowance:</Typography>
                <Typography fontSize={14} fontWeight={800} color={TRADE_TEAL}>{fmt(totalTradeAllowance)}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* ── RIGHT: Customer receives (sale items) ── */}
          <Paper variant="outlined" sx={{ flex: 1, borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Section header */}
            <Box sx={{ px: 2, py: 1, bgcolor: '#f0f9ff', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: TRADE_TEAL, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography fontSize={13} fontWeight={800}>2</Typography>
              </Box>
              <Typography fontWeight={700} fontSize={13} letterSpacing={0.5} color={TRADE_TEAL}>
                CUSTOMER RECEIVES (SALE ITEMS)
              </Typography>
            </Box>

            {/* Search row */}
            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid #e0e0e0', display: 'flex', gap: 1, position: 'relative' }}>
              <Box sx={{ flex: 1, position: 'relative' }}>
                <TextField
                  fullWidth size="small"
                  value={saleSearch}
                  onChange={e => handleSaleSearchChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSaleDropdown(false), 200)}
                  onFocus={() => saleSearchResults.length > 0 && setShowSaleDropdown(true)}
                  placeholder="Scan barcode or search sale items..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {saleSearching
                          ? <MuiIcons.HourglassEmpty sx={{ color: 'text.secondary', fontSize: 18 }} />
                          : <MuiIcons.Search sx={{ color: 'text.secondary' }} />}
                      </InputAdornment>
                    ),
                    endAdornment: <InputAdornment position="end"><MuiIcons.QrCodeScanner sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                />
                {showSaleDropdown && saleSearchResults.length > 0 && (
                  <Paper elevation={4} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: 240, overflowY: 'auto', borderRadius: 1, mt: 0.5 }}>
                    {saleSearchResults.map((item, idx) => {
                      const imgs = Array.isArray(item.images) ? item.images : [];
                      const thumb = resolveImageUrl(imgs.find(i => i.is_primary || i.isPrimary)?.url || imgs[0]?.url);
                      const price = parseFloat(item.retail_price || item.item_price || item.cost_price || 0);
                      return (
                        <Box key={idx} onMouseDown={() => handleSelectSaleItem(item)}
                          sx={{ px: 1.5, py: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5, '&:hover': { bgcolor: '#f0f9ff' }, borderBottom: '1px solid #f0f0f0' }}>
                          {thumb ? (
                            <Box component="img" src={thumb} alt="" sx={{ width: 36, height: 36, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: '#f5f5f5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <MuiIcons.Inventory2 sx={{ fontSize: 18, color: '#bdbdbd' }} />
                            </Box>
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontSize={13} fontWeight={600} noWrap>{item.short_desc || item.long_desc || item.item_id}</Typography>
                            <Typography fontSize={11} color="text.secondary">{item.item_id}</Typography>
                          </Box>
                          <Typography fontSize={13} fontWeight={700} color={TRADE_TEAL}>{fmt(price)}</Typography>
                        </Box>
                      );
                    })}
                  </Paper>
                )}
              </Box>
              <Button variant="outlined" startIcon={<MuiIcons.AddCircleOutline sx={{ fontSize: 15 }} />}
                onClick={() => showSnackbar('Add Existing Sale Ticket — coming soon', 'info')}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12, flexShrink: 0, borderColor: TRADE_TEAL, color: TRADE_TEAL, '&:hover': { bgcolor: '#e0f9ff' } }}>
                Add Existing Sale Ticket
              </Button>
            </Box>

            {/* Sale items table */}
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {[
                      { label: 'SKU / Part #', width: 100 },
                      { label: 'Image',         width: 52 },
                      { label: 'Category',      width: 100 },
                      { label: 'Item' },
                      { label: 'Qty',            width: 52, align: 'center' },
                      { label: 'Price',          width: 80, align: 'right' },
                      { label: 'Discount',       width: 80, align: 'right' },
                      { label: 'Total',          width: 80, align: 'right' },
                      { label: 'Actions',        width: 80, align: 'center' },
                    ].map(col => (
                      <TableCell key={col.label} align={col.align || 'left'}
                        sx={{ width: col.width, fontSize: 11, fontWeight: 700, color: TRADE_TEAL, py: 0.75, letterSpacing: 0.5, bgcolor: '#fafafa' }}>
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {saleItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <MuiIcons.ShoppingCart sx={{ fontSize: 36, color: '#bdbdbd', display: 'block', mx: 'auto', mb: 0.5 }} />
                        <Typography fontSize={13} color="text.secondary">No sale items yet. Search inventory above.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {saleItems.map(item => {
                    const isEditing = editingSaleId === item._lineId;
                    const lineTotal = getSaleItemTotal(item);
                    return isEditing ? (
                      <TableRow key={item._lineId} sx={{ bgcolor: '#f0f9ff' }}>
                        <TableCell sx={{ fontSize: 11, color: 'text.secondary', py: 0.5 }}>{item.sku}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <ImageCell item={item} onCameraClick={() => openCamera('sale', item._lineId)} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary', py: 0.5 }}>{item.category_name || '—'}</TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600, py: 0.5 }}>{item.name}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <TextField size="small" type="number" value={editSaleFields.quantity}
                            onChange={e => setEditSaleFields(f => ({ ...f, quantity: e.target.value }))}
                            inputProps={{ min: 1, style: { fontSize: 12, width: 36 } }} />
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <Typography fontSize={12} color="text.secondary">$</Typography>
                            <TextField size="small" type="number" value={editSaleFields.price}
                              onChange={e => setEditSaleFields(f => ({ ...f, price: e.target.value }))}
                              variant="standard" inputProps={{ min: 0, step: 0.01, style: { fontSize: 12, width: 56 } }}
                              InputProps={{ disableUnderline: false }} />
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <TextField size="small" type="number" value={editSaleFields.discount}
                              onChange={e => setEditSaleFields(f => ({ ...f, discount: e.target.value }))}
                              variant="standard" inputProps={{ min: 0, step: 0.01, style: { fontSize: 12, width: 50 } }}
                              InputProps={{ disableUnderline: false }} />
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 700, color: TRADE_TEAL, py: 0.5 }}>
                          {fmt(lineTotal)}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.5 }}>
                          <Tooltip title="Save"><IconButton size="small" color="success" onClick={() => saveEditSale(item._lineId)}><MuiIcons.Check sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          <Tooltip title="Cancel"><IconButton size="small" onClick={() => setEditingSaleId(null)}><MuiIcons.Close sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={item._lineId} sx={{ '&:hover': { bgcolor: '#f0f9ff' } }}>
                        <TableCell sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500, py: 0.75 }}>{item.sku || '—'}</TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <ImageCell item={item} onCameraClick={() => openCamera('sale', item._lineId)} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary', py: 0.75 }}>{item.category_name || '—'}</TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600, py: 0.75 }}>{item.name || <em style={{ color: '#bbb' }}>No name</em>}</TableCell>
                        <TableCell align="center" sx={{ fontSize: 13, fontWeight: 500, py: 0.75 }}>{item.quantity}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, py: 0.75 }}>{fmt(item.price)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, color: '#c62828', py: 0.75 }}>{fmt(item.discount)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 700, color: TRADE_TEAL, py: 0.75 }}>{fmt(lineTotal)}</TableCell>
                        <TableCell align="center" sx={{ py: 0.75 }}>
                          <Tooltip title="Edit"><IconButton size="small" onClick={() => startEditSale(item)} sx={{ color: '#1565c0' }}><MuiIcons.Edit sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          <Tooltip title="Toggle discount type"><IconButton size="small" sx={{ color: '#555' }} onClick={() => setSaleItems(prev => prev.map(i => i._lineId === item._lineId ? { ...i, discountType: i.discountType === 'percent' ? 'amount' : 'percent', discount: 0 } : i))}><MuiIcons.Percent sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setSaleItems(prev => prev.filter(i => i._lineId !== item._lineId))}><MuiIcons.Delete sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>

            {/* Sale footer */}
            <Box sx={{ px: 2, py: 1.25, borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', bgcolor: '#f8f9fa' }}>
              <Typography fontSize={13} color="text.secondary">{saleItems.length} item{saleItems.length !== 1 ? 's' : ''}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography fontSize={13} color="text.secondary" fontWeight={500}>Sale Subtotal:</Typography>
                <Typography fontSize={14} fontWeight={800} color={TRADE_TEAL}>{fmt(saleAfterDiscount)}</Typography>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* ── Three-column summary ── */}
        <Box sx={{ display: 'flex', gap: 2 }}>

          {/* Trade-in Summary */}
          <Paper variant="outlined" sx={{ flex: 1, borderRadius: 2, p: 2, borderColor: TRADE_TEAL }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <MuiIcons.SwapHoriz sx={{ color: TRADE_TEAL, fontSize: 18 }} />
              <Typography fontWeight={700} fontSize={12} color={TRADE_TEAL} letterSpacing={0.5}>TRADE-IN SUMMARY</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <Box>
                <Typography fontSize={12} color="text.secondary" mb={0.5}>Total Trade Allowance</Typography>
                <Typography fontSize={22} fontWeight={800} color={TRADE_TEAL}>{fmt(totalTradeAllowance)}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography fontSize={12} color="text.secondary" mb={0.5}>Items Received</Typography>
                <Typography fontSize={22} fontWeight={800} color={TRADE_TEAL}>{tradeItems.length}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Sale Summary */}
          <Paper variant="outlined" sx={{ flex: 1, borderRadius: 2, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <MuiIcons.LocalOffer sx={{ color: TRADE_TEAL, fontSize: 18 }} />
              <Typography fontWeight={700} fontSize={12} color={TRADE_TEAL} letterSpacing={0.5}>SALE SUMMARY</Typography>
            </Box>
            {[
              { label: 'Sale Subtotal',       value: fmt(saleSubtotal),      bold: false },
              { label: 'Discount',            value: fmt(saleDiscount),      bold: false },
              { label: 'Tax Rule',            value: 'Tax on Difference',    bold: false, italic: true },
              { label: 'Taxable Difference',  value: fmt(taxableDifference), bold: false },
              { label: `Tax (${(taxRate * 100).toFixed(3)}%)`, value: fmt(taxAmount), bold: false },
            ].map(row => (
              <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography fontSize={13} color="text.secondary" fontStyle={row.italic ? 'italic' : 'normal'}>{row.label}</Typography>
                <Typography fontSize={13} fontWeight={row.bold ? 700 : 400}>{row.value}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 0.75 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography fontSize={13} fontWeight={700} color={TRADE_TEAL}>Total Sale (After Tax)</Typography>
              <Typography fontSize={13} fontWeight={700} color={TRADE_TEAL}>{fmt(totalSaleAfterTax)}</Typography>
            </Box>
          </Paper>

          {/* Net Balance */}
          <Paper variant="outlined" sx={{ flex: 1, borderRadius: 2, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <MuiIcons.Balance sx={{ color: TRADE_TEAL, fontSize: 18 }} />
              <Typography fontWeight={700} fontSize={12} color={TRADE_TEAL} letterSpacing={0.5}>NET BALANCE</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography fontSize={13} color="text.secondary">Total Trade Allowance</Typography>
              <Typography fontSize={13}>{fmt(totalTradeAllowance)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography fontSize={13} color="text.secondary">Total Sale (After Tax)</Typography>
              <Typography fontSize={13}>{fmt(totalSaleAfterTax)}</Typography>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <Typography fontSize={12} color="text.secondary" mb={0.25}>
              {netDueToCustomer >= 0 ? 'Net Due to Customer' : 'Net Due from Customer'}
            </Typography>
            <Typography fontSize={24} fontWeight={800} color={netDueToCustomer >= 0 ? TRADE_TEAL : '#c62828'} mb={1}>
              {fmt(Math.abs(netDueToCustomer))}
            </Typography>
            <FormControlLabel
              control={<Checkbox size="small" checked={isStoreCreditNet} onChange={e => setIsStoreCreditNet(e.target.checked)} />}
              label={<Typography variant="caption">Issue net difference as store credit</Typography>}
              sx={{ ml: -0.5 }}
            />
          </Paper>

        </Box>
      </Box>

      {/* ── Bottom action bar ── */}
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
        <Button size="small" variant="outlined" startIcon={<MuiIcons.BookmarkBorder />}
          onClick={() => showSnackbar('Save as Quote — coming soon', 'info')}
          sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
          Save as Quote
        </Button>
        <Button size="small" variant="outlined" color="error" onClick={onClose}
          sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
          Cancel
        </Button>
        <Button size="small" variant="outlined"
          disabled={tradeItems.length === 0 && saleItems.length === 0}
          onClick={handleAddToWorkspace}
          sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
          Add to Workspace
        </Button>
        <Button size="small" variant="contained" endIcon={<MuiIcons.ArrowForward />}
          disabled={tradeItems.length === 0 && saleItems.length === 0}
          onClick={handleCheckoutNow}
          sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13, bgcolor: TRADE_TEAL, '&:hover': { bgcolor: TRADE_DARK } }}>
          Checkout Now
        </Button>
      </Paper>

      {/* Camera dialog */}
      <Dialog open={cameraDialogOpen} onClose={closeCamera} maxWidth="sm" fullWidth
        TransitionProps={{ onEntered: handleCameraEntered }}>
        <DialogContent sx={{ p: 1.5, bgcolor: '#000' }}>
          <video ref={cameraVideoRef} autoPlay playsInline onCanPlay={() => setIsCamReady(true)}
            style={{ width: '100%', borderRadius: 8, display: 'block' }} />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 2 }}>
          <Button onClick={closeCamera} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={capturePhoto} disabled={!isCamReady}
            startIcon={<MuiIcons.PhotoCamera />}
            sx={{ bgcolor: TRADE_TEAL, '&:hover': { bgcolor: TRADE_DARK }, textTransform: 'none' }}>
            Capture
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
