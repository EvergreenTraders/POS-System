import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Avatar,
  Divider, TextField, InputAdornment, Checkbox, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItemButton, ListItemText,
  Tooltip, Snackbar, Alert, Select, MenuItem,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import JewelryIntakeScreen from './JewelryIntakeScreen';
import { generateBuyTicketId, commitBuyTicketId, parseItemDescription } from './BuyTransactionScreen';
import { generateSaleTicketId, commitSaleTicketId } from './SaleTransactionScreen';

// Matches transaction_type.color for 'trade' in the database, so the ticket
// screen is colored consistently with the rest of the app (e.g. the
// Transactions hub's type buttons and the Checkout breadcrumb/total).
const TRADE_TEAL = '#00695c';
const TRADE_DARK = '#004d40';

const TT_PENDING_KEY = 'pendingTTTicketId';
const TT_COUNTER_KEY = 'lastTTTicketNumber';

function generateTradeTicketId() {
  const voided  = JSON.parse(localStorage.getItem('voidedTradeTickets') || '[]');
  const pending = localStorage.getItem(TT_PENDING_KEY);
  if (pending && !voided.includes(pending)) return pending;
  if (pending) localStorage.removeItem(TT_PENDING_KEY);
  let last = parseInt(localStorage.getItem(TT_COUNTER_KEY) || '0');
  let id;
  do { last += 1; id = `TT-${last.toString().padStart(8, '0')}`; } while (voided.includes(id));
  localStorage.setItem(TT_COUNTER_KEY, last.toString());
  localStorage.setItem(TT_PENDING_KEY, id);
  return id;
}

function commitTradeTicketId() { localStorage.removeItem(TT_PENDING_KEY); }

async function syncTradeTicketCounter() {
  try {
    const res = await axios.get(`${config.apiUrl}/trade-ticket/last-id`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    const dbNum    = res.data.last_number || 0;
    const localNum = parseInt(localStorage.getItem(TT_COUNTER_KEY) || '0');
    if (dbNum > localNum) {
      localStorage.setItem(TT_COUNTER_KEY, dbNum.toString());
      localStorage.removeItem(TT_PENDING_KEY);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Could not sync trade ticket counter with DB:', e.message);
    return false;
  }
}

export { generateTradeTicketId, commitTradeTicketId };

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
  onConvertToBuy,
  existingTradeData,
  workspaceBuyTickets = [],
  onConsumeWorkspaceBuy,
  workspaceSaleTickets = [],
  onConsumeWorkspaceSale,
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

  // Real BT-XXXXXXXX / ST-XXXXXXXX ids minted the moment the first trade-in /
  // sale item is added (not just at checkout) — see ensureTradeBuyTicketId /
  // ensureTradeSaleTicketId below — so every item's part_no carries the real
  // ticket id from the start, the same way a standalone Buy/Sale ticket's does.
  const [tradeBuyTicketId,  setTradeBuyTicketId]  = useState(existingTradeData?.buyTicketId  || null);
  const [tradeSaleTicketId, setTradeSaleTicketId] = useState(existingTradeData?.saleTicketId || null);

  const [categories, setCategories] = useState([]);
  const [taxRate, setTaxRate]       = useState(0.07);
  const [tradeStats, setTradeStats] = useState(null);

  // Buy ticket picker (Add Existing Buy Ticket)
  const [buyPickerOpen, setBuyPickerOpen]   = useState(false);
  const [selectedBuyId, setSelectedBuyId]   = useState(null);

  // Convert to Buy picker
  const [convertBuyPickerOpen, setConvertBuyPickerOpen] = useState(false);
  const [convertBuySelectedId, setConvertBuySelectedId] = useState(null);
  const [convertBuyItem,       setConvertBuyItem]       = useState(null);

  // Sale ticket picker
  const [salePickerOpen, setSalePickerOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState(null);

  // Trade-in item editing
  const [editingTradeId, setEditingTradeId] = useState(null);
  const [editTradeFields, setEditTradeFields] = useState({});
  const [tradeIntakeOpen, setTradeIntakeOpen] = useState(false);
  const [editingTradeIntakeItem, setEditingTradeIntakeItem] = useState(null);
  const [tradeIntakeEntry, setTradeIntakeEntry] = useState('');
  const [tradeParsedValues, setTradeParsedValues] = useState(null);
  const [tradeQuickAddMode, setTradeQuickAddMode] = useState(false);
  const [tradeQuickInput, setTradeQuickInput]     = useState('');
  const [tradeScanInput,  setTradeScanInput]      = useState('');
  const tradeQuickInputRef = useRef(null);

  // Metal/category code maps for parsing scanned "J <code>" entries
  const [categoryCodeMap, setCategoryCodeMap] = useState({});
  const [colorCodeMap,    setColorCodeMap]    = useState({});
  const [metalTypeCodeMap,setMetalTypeCodeMap]= useState({});

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
    syncTradeTicketCounter().then(bumped => {
      if (bumped) setTicketId(prev => existingTradeData?.ticketId || generateTradeTicketId());
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!customer?.id) { setTradeStats(null); return; }
    axios.get(`${config.apiUrl}/customers/${customer.id}/trade/stats`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => setTradeStats(res.data))
      .catch(() => setTradeStats(null));
  }, [customer?.id]);

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

  // Mints a real buy_ticket_id (sharing the same counter/pending-id as a
  // standalone Buy ticket) the first time it's needed, then reuses it for every
  // trade-in item added afterward in this ticket.
  const ensureTradeBuyTicketId = () => {
    if (tradeBuyTicketId) return tradeBuyTicketId;
    const id = generateBuyTicketId();
    setTradeBuyTicketId(id);
    return id;
  };

  // Same idea for the sale-out side of the trade.
  const ensureTradeSaleTicketId = () => {
    if (tradeSaleTicketId) return tradeSaleTicketId;
    const id = generateSaleTicketId();
    setTradeSaleTicketId(id);
    return id;
  };

  const addTradeItem = (overrides = {}) => {
    const buyId = ensureTradeBuyTicketId();
    setTradeItems(prev => {
      const count = prev.length + 1;
      return [...prev, {
        _lineId: Date.now() + Math.random(),
        part_no: `${buyId}-${String(count).padStart(2, '0')}`,
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

  // Scan/search box: parse a "J <code>" entry the same way the standalone Buy
  // ticket does, then open the full Jewelry Intake screen pre-filled with it.
  const openTradeIntake = () => {
    const text  = tradeScanInput.trim();
    const parts = text.toUpperCase().split(/\s+/);
    if (parts[0] === 'J' && parts.length >= 2) {
      setTradeParsedValues(parseItemDescription(parts.slice(1), categoryCodeMap, colorCodeMap, metalTypeCodeMap));
    } else {
      setTradeParsedValues(null);
    }
    setTradeIntakeEntry(text);
    setEditingTradeIntakeItem(null);
    setTradeIntakeOpen(true);
  };

  const jewelryItemToTradeItem = (item, seq, buyId) => ({
    _lineId: Date.now() + Math.random(),
    part_no: `${buyId}-${String(seq).padStart(2, '0')}`,
    category_id: categories.find(c => c.name === item.category)?.id || '',
    category_name: item.category || '',
    description: item.item || item.short_desc || '',
    serial_number: item.serial_number || item.serial || '',
    qty: 1,
    tradeAllowance: parseFloat(item.buy_price) || parseFloat(item.paid_amount) || 0,
    images: item.images || [],
    sourceEstimator: 'jewelry',
    jewelryData: item,
  });

  const handleTradeIntakeSave = (item) => {
    const buyId = ensureTradeBuyTicketId();
    setTradeItems(prev => [...prev, jewelryItemToTradeItem(item, prev.length + 1, buyId)]);
    setTradeScanInput('');
    setTradeIntakeOpen(false);
  };

  const startEditTrade = (item) => {
    // Only items actually sourced from the jewelry estimator have the detail
    // (metal, purity, gemstones, etc.) Jewelry Intake edits — a random free-type
    // item has nothing to show there, so it gets the plain inline edit instead.
    if (item.sourceEstimator !== 'jewelry' || !item.jewelryData) {
      setEditingTradeId(item._lineId);
      setEditTradeFields({
        category_id: item.category_id || '',
        description: item.description || '',
        serial_number: item.serial_number || '',
        qty: item.qty,
        tradeAllowance: item.tradeAllowance,
      });
      return;
    }
    const jd = item.jewelryData;
    const images = item.images?.length ? item.images : (jd?.images || []);
    setEditingTradeIntakeItem({
      ...(jd || {}),
      _lineId: item._lineId,
      images,
      // JewelryIntakeScreen reads 'item' for name and 'metal_category' for category
      item: jd?.item || jd?.short_desc || item.description || '',
      serial_number: jd?.serial_number || item.serial_number || '',
      metal_category: jd?.metal_category || jd?.category || item.category_name || '',
      paid_amount: jd?.paid_amount ?? item.tradeAllowance,
    });
    setTradeIntakeOpen(true);
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

  const handleTradeIntakeBack = () => {
    setTradeIntakeOpen(false);
    setEditingTradeIntakeItem(null);
  };

  const handleTradeIntakeUpdate = (item) => {
    setTradeItems(prev => prev.map(i => i._lineId === editingTradeIntakeItem?._lineId
      ? {
          ...i,
          category_id: categories.find(c => c.name === item.category)?.id || i.category_id,
          category_name: item.category || i.category_name,
          description: item.item || item.short_desc || i.description,
          serial_number: item.serial_number || item.serial || i.serial_number,
          images: item.images || i.images,
          sourceEstimator: 'jewelry',
          jewelryData: item,
        }
      : i
    ));
    setEditingTradeIntakeItem(null);
    setTradeIntakeOpen(false);
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
    const saleId = ensureTradeSaleTicketId();
    setSaleItems(prev => [...prev, {
      _lineId: Date.now() + Math.random(),
      // Sale items become a sale_ticket item at checkout, so they're labeled
      // with the real sale_ticket_id here, the same as a standalone Sale ticket.
      part_no: `${saleId}-${String(prev.length + 1).padStart(2, '0')}`,
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

  // ── Buy ticket import ────────────────────────────────────────────────────────

  const handleImportBuyTicket = () => {
    const ticket = workspaceBuyTickets.find(t => t.ticketId === selectedBuyId);
    if (!ticket) return;
    const buyId = ensureTradeBuyTicketId();
    const imported = (ticket.buyItems || []).map((item, idx) => ({
      _lineId: Date.now() + Math.random() + idx,
      part_no: item.part_no || `${buyId}-${String(tradeItems.length + idx + 1).padStart(2, '0')}`,
      category_id:   item.category_id   || '',
      category_name: item.category_name || '',
      description:   item.description   || '',
      serial_number: item.serial_number || '',
      qty:           parseInt(item.qty) || 1,
      tradeAllowance: parseFloat(item.paid) || 0,
      images:        item.images || [],
      sourceEstimator: item.sourceEstimator,
      jewelryData: item.jewelryData,
      ...(item.fromInventory && { fromInventory: true, item_id: item.item_id }),
    }));
    setTradeItems(prev => [...prev, ...imported]);
    onConsumeWorkspaceBuy?.(selectedBuyId);
    setBuyPickerOpen(false);
    setSelectedBuyId(null);
    showSnackbar(`${imported.length} item${imported.length !== 1 ? 's' : ''} imported from ${selectedBuyId}`);
  };

  const handleImportSaleTicket = () => {
    const ticket = workspaceSaleTickets.find(t => t.ticketId === selectedSaleId);
    if (!ticket) return;
    const imported = (ticket.saleItems || []).map((item, idx) => ({
      ...item,
      _lineId: Date.now() + Math.random() + idx,
    }));
    setSaleItems(prev => [...prev, ...imported]);
    onConsumeWorkspaceSale?.(selectedSaleId);
    setSalePickerOpen(false);
    setSelectedSaleId(null);
    showSnackbar(`${imported.length} item${imported.length !== 1 ? 's' : ''} imported from ${selectedSaleId}`);
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

  // Saves the whole trade ticket as a draft quote — both the trade-in items
  // (new jewelry to estimate, like the standalone Buy ticket's "Save as Quote")
  // and the sale items (already in inventory, like the Sale ticket's quote).
  // Each item is tagged with its own buy/sale type so the two sides aren't
  // conflated when the quote is resumed later.
  const handleSaveAsQuote = async () => {
    if (!customer?.id) { showSnackbar('Please select a customer before saving as quote', 'error'); return; }
    if (tradeItems.length === 0 && saleItems.length === 0) { showSnackbar('No items to save as quote', 'warning'); return; }
    const token = localStorage.getItem('token');
    const employeeId = JSON.parse(atob(token.split('.')[1])).id;
    try {
      const formData = new FormData();
      const imageMetadata = [];

      const tradeInForSubmit = tradeItems.map((item, itemIndex) => {
        const jd = item.jewelryData || {};
        const { images } = item;
        if (images && Array.isArray(images)) {
          images.forEach((img, imgIndex) => {
            if (img.file instanceof File) {
              formData.append('images', img.file);
              imageMetadata.push({ itemIndex, isPrimary: img.isPrimary || imgIndex === 0 });
            }
          });
        }
        const itemAllowance = (parseFloat(item.tradeAllowance) || 0) * (parseInt(item.qty) || 1);
        return {
          ...jd,
          short_desc: item.description || jd.short_desc || '',
          long_desc: jd.long_desc || item.description || '',
          amount: itemAllowance,
          price: itemAllowance,
        };
      });

      const saleForSubmit = saleItems.map(item => ({
        item_id: item.item_id,
        inventory_type: item.inventory_type,
        price: (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1),
      }));

      formData.append('trade_in_items', JSON.stringify(tradeInForSubmit));
      formData.append('sale_items', JSON.stringify(saleForSubmit));
      formData.append('imageMetadata', JSON.stringify(imageMetadata));
      formData.append('customer_id', customer.id);
      formData.append('employee_id', employeeId);
      // Net transaction value, tax included — same sign convention used everywhere
      // else in the app (positive = customer owes the store, negative = store owes
      // the customer). Summing both sides instead (as a positive total) doesn't
      // correspond to any real dollar amount.
      formData.append('total_amount', totalSaleAfterTax - totalTradeAllowance);
      if (ticketNote)    formData.append('ticket_note', ticketNote);
      if (showOnReceipt) formData.append('show_on_receipt', 'true');

      const res = await axios.post(`${config.apiUrl}/quotes/trade`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      showSnackbar(`Quote ${res.data.quote_id} saved successfully. Valid for ${res.data.expires_in} days.`, 'success');
      setTradeItems([]);
      setSaleItems([]);
    } catch (err) {
      console.error('Error saving quote:', err);
      showSnackbar('Error saving quote. Please try again.', 'error');
    }
  };

  const handleAddToWorkspace = () => {
    if (tradeItems.length === 0 && saleItems.length === 0) {
      showSnackbar('Add at least one item before adding to workspace', 'warning');
      return;
    }
    onAddToWorkspace?.({
      ticketId, tradeItems, saleItems, ticketNote, showOnReceipt,
      isStoreCreditNet, totalTradeAllowance, totalSaleAfterTax, netDueToCustomer,
      taxAmount, taxRate, customer,
      buyTicketId: tradeBuyTicketId, saleTicketId: tradeSaleTicketId,
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

    // A trade bundles two real tickets under the hood: the trade-in items become
    // a buy ticket (store acquires them) and the sale items become a sale ticket
    // (store sells them to the customer). These were already minted (and used
    // for each item's part_no) as soon as the first item of each kind was added —
    // ensure* here is just a safety net for items added some other way.
    const buyId  = tradeItems.length > 0 ? ensureTradeBuyTicketId()  : null;
    const saleId = saleItems.length  > 0 ? ensureTradeSaleTicketId() : null;

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
          // Sale items are pulled from existing inventory (already in jewelry/
          // hardgoods, recorded when they were bought) — flag so Checkout.js
          // doesn't try to create a second jewelry record for them.
          fromInventory: true,
          customer: cartCustomer,
          employee: currentUser
            ? { id: currentUser.id, name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(), role: currentUser.role }
            : null,
          tradeTicketId: ticketId,
          saleTicketId: saleId,
          ticket_note: ticketNote || null,
          show_on_receipt: showOnReceipt,
        }))
      ),
      ...tradeItems.map(item => {
        // jewelryData carries the full estimator record (metal, purity, gemstones,
        // etc.) for items sourced from the jewelry intake screen — flatten it to the
        // top level first (like BuyTransactionScreen does) so the jewelry-creation
        // endpoint, which reads these as plain item.* fields, actually gets them.
        const jewelryBase = item.jewelryData ? { ...item.jewelryData } : {};
        return {
          ...jewelryBase,
          ...item,
          id: `${ticketId}_trade_${item._lineId}_${Date.now()}`,
          description: item.description || item.jewelryData?.short_desc || item.part_no,
          short_desc: item.description || item.jewelryData?.short_desc || '',
          long_desc: item.jewelryData?.long_desc || item.description || '',
          price: -((parseFloat(item.tradeAllowance) || 0) * (parseInt(item.qty) || 1)),
          value: -((parseFloat(item.tradeAllowance) || 0) * (parseInt(item.qty) || 1)),
          transaction_type: 'trade_in',
          customer: cartCustomer,
          employee: currentUser
            ? { id: currentUser.id, name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(), role: currentUser.role }
            : null,
          tradeTicketId: ticketId,
          buyTicketId: buyId,
          ticket_note: ticketNote || null,
          show_on_receipt: showOnReceipt,
        };
      }),
    ];

    sessionStorage.setItem('checkoutItems', JSON.stringify(cartItems));
    sessionStorage.setItem('selectedCustomer', JSON.stringify(cartCustomer));
    sessionStorage.setItem('pendingTradeReturn', JSON.stringify({
      customerId: customer.id,
      buyTicketId: buyId,
      saleTicketId: saleId,
      customer,
      ticketId,
      tradeItems,
      saleItems,
      ticketNote,
      showOnReceipt,
      isStoreCreditNet,
    }));
    commitTradeTicketId();
    if (buyId)  commitBuyTicketId();
    if (saleId) commitSaleTicketId();
    // Tax on a trade only applies to the amount the sale exceeds the trade-in
    // allowance (taxableDifference above), so the net total can't be rebuilt by
    // summing individual line items in Checkout — pass the ticket's own total.
    // Positive = customer owes the store; negative = store owes the customer
    // (matches the buy/pawn sign convention Checkout uses).
    navigate('/checkout', {
      state: {
        items: cartItems,
        allCartItems: cartItems,
        customer: cartCustomer,
        from: 'trade-ticket',
        tradeTotal: -netDueToCustomer,
        // Surfaced in Checkout so the tax-on-difference rule isn't a black box —
        // same numbers shown in the Sale Summary / Net Balance panels above.
        tradeBreakdown: {
          buyTotal: totalTradeAllowance,
          saleTotal: saleAfterDiscount,
          taxableDifference,
          taxRate,
          taxAmount,
          netTotal: -netDueToCustomer,
        },
      },
    });
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
        sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: '#f0f0f0', color: '#9e9e9e', '&:hover': { bgcolor: '#e0f2f1', color: TRADE_TEAL } }}>
        <MuiIcons.PhotoCamera sx={{ fontSize: 18 }} />
      </IconButton>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (tradeIntakeOpen) {
    return (
      <JewelryIntakeScreen
        customer={customer}
        ticketId={ticketId}
        ticketLabel="Trade Ticket"
        initialEntry={tradeIntakeEntry}
        parsedValues={editingTradeIntakeItem ? null : tradeParsedValues}
        editItem={editingTradeIntakeItem}
        onBack={handleTradeIntakeBack}
        onSaveItem={handleTradeIntakeSave}
        onUpdateItem={handleTradeIntakeUpdate}
      />
    );
  }

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
            sx={{ bgcolor: '#e0f2f1', color: TRADE_TEAL, fontWeight: 600, fontSize: 12, border: `1px solid ${TRADE_TEAL}` }}
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
                  sx={{ width: 44, height: 44, bgcolor: '#e0f2f1', color: TRADE_TEAL, fontWeight: 700, fontSize: 15 }}
                >
                  {!customerImg && `${(customer.first_name || '')[0] || ''}${(customer.last_name || '')[0] || ''}`.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography fontWeight={700} fontSize={15} lineHeight={1.2}>
                    {customer.first_name} {customer.last_name}
                  </Typography>
                  <Typography fontSize={12} color="text.secondary" lineHeight={1.2}>
                    {customer.phone || '—'}
                  </Typography>
                </Box>
                <Tooltip title="Edit customer">
                  <IconButton size="small"
                    sx={{ color: TRADE_TEAL, border: `1px solid ${TRADE_TEAL}`, '&:hover': { bgcolor: '#e0f2f1' } }}
                    onClick={() => {
                      sessionStorage.setItem('pendingTradeState', JSON.stringify({
                        customerId: customer.id,
                        customer,
                        ticketId,
                        tradeItems,
                        saleItems,
                        ticketNote,
                        showOnReceipt,
                        isStoreCreditNet,
                        buyTicketId: tradeBuyTicketId,
                        saleTicketId: tradeSaleTicketId,
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
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography fontSize={11} color="text.secondary">Total Trades</Typography>
                <Typography fontSize={13} fontWeight={600}>{tradeStats?.total_trades ?? 0}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography fontSize={11} color="text.secondary">Last Trade</Typography>
                <Typography fontSize={13} fontWeight={600}>
                  {tradeStats?.last_trade_date
                    ? new Date(tradeStats.last_trade_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </Typography>
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
      <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'row', gap: 2, minHeight: 0 }}>

        {/* Left column: Customer Gives Us stacked above Customer Receives */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>

          {/* ── LEFT: Customer gives us (trade-in items) ── */}
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
                  onKeyDown={e => { if (e.key === 'Enter' && tradeScanInput.trim()) openTradeIntake(); }}
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
                    '&:hover': { bgcolor: tradeQuickAddMode ? TRADE_DARK : '#e0f2f1', borderColor: TRADE_TEAL },
                  }}>
                  Free-type Quick Add
                </Button>
                <Button variant="outlined" startIcon={<MuiIcons.AddCircleOutline sx={{ fontSize: 15 }} />}
                  onClick={() => {
                    if (workspaceBuyTickets.length === 0) {
                      showSnackbar('No Buy Tickets in workspace. Add a Buy Ticket to the workspace first.', 'warning');
                      return;
                    }
                    setSelectedBuyId(null);
                    setBuyPickerOpen(true);
                  }}
                  sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12, flexShrink: 0, borderColor: TRADE_TEAL, color: TRADE_TEAL, '&:hover': { bgcolor: '#e0f2f1' } }}>
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
            <Box sx={{ overflowY: 'auto' }}>
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
                      { label: 'Actions',          width: 80, align: 'center' },
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
                          <Tooltip title="Convert to Buy"><IconButton size="small" sx={{ color: '#0284c7' }} onClick={() => {
                            if (workspaceBuyTickets.length > 0) {
                              setConvertBuyItem(item);
                              setConvertBuySelectedId(null);
                              setConvertBuyPickerOpen(true);
                            } else {
                              setTradeItems(prev => prev.filter(i => i._lineId !== item._lineId));
                              onConvertToBuy?.(item, null);
                              showSnackbar('Item moved to a new Buy Ticket in the workspace.', 'info');
                            }
                          }}><MuiIcons.CallMade sx={{ fontSize: 16 }} /></IconButton></Tooltip>
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

          {/* ── Customer receives (sale items) ── */}
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
                onClick={() => {
                  if (workspaceSaleTickets.length === 0) {
                    showSnackbar('No Sale Tickets in workspace. Add a Sale Ticket to the workspace first.', 'warning');
                    return;
                  }
                  setSelectedSaleId(null);
                  setSalePickerOpen(true);
                }}
                sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12, flexShrink: 0, borderColor: TRADE_TEAL, color: TRADE_TEAL, '&:hover': { bgcolor: '#e0f2f1' } }}>
                Add Existing Sale Ticket
              </Button>
            </Box>

            {/* Sale items table */}
            <Box sx={{ overflowY: 'auto' }}>
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

        {/* Right column: Financial summary */}
        <Box sx={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, alignSelf: 'flex-start' }}>

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
          disabled={(tradeItems.length === 0 && saleItems.length === 0) || !customer?.id}
          onClick={handleSaveAsQuote}
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

      {/* Buy ticket picker dialog */}
      <Dialog open={buyPickerOpen} onClose={() => setBuyPickerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          Select Buy Ticket to Absorb into Trade
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {workspaceBuyTickets.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary" fontSize={14}>No eligible Buy Tickets in workspace.</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {workspaceBuyTickets.map(ticket => {
                const items    = ticket.buyItems || [];
                const total    = ticket.totalPaid || items.reduce((s, i) => s + (parseFloat(i.paid) || 0) * (parseInt(i.qty) || 1), 0);
                const selected = selectedBuyId === ticket.ticketId;
                return (
                  <ListItemButton
                    key={ticket.ticketId}
                    selected={selected}
                    onClick={() => setSelectedBuyId(ticket.ticketId)}
                    sx={{
                      borderBottom: '1px solid #f0f0f0',
                      bgcolor: selected ? '#e0f2f1 !important' : undefined,
                      '&:hover': { bgcolor: '#f0f9ff' },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {/* Ticket header row */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                        <MuiIcons.ShoppingBag sx={{ fontSize: 18, color: selected ? TRADE_TEAL : '#0284c7' }} />
                        <Typography fontWeight={700} fontSize={14} color={selected ? TRADE_TEAL : '#0284c7'}>
                          {ticket.ticketId}
                        </Typography>
                        <Chip
                          label={`${items.length} item${items.length !== 1 ? 's' : ''}`}
                          size="small"
                          sx={{ height: 20, fontSize: 11, bgcolor: '#e0f2fe', color: '#0284c7' }}
                        />
                        <Typography fontSize={13} fontWeight={700} color={selected ? TRADE_TEAL : 'text.primary'} sx={{ ml: 'auto' }}>
                          ${Number(total).toFixed(2)}
                        </Typography>
                      </Box>
                      {/* Item list preview */}
                      {items.slice(0, 3).map((item, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 3.5, py: 0.25 }}>
                          <Typography fontSize={12} color="text.secondary" sx={{ minWidth: 60 }}>{item.part_no}</Typography>
                          <Typography fontSize={12} noWrap sx={{ flex: 1 }}>{item.description || <em style={{ color: '#bbb' }}>No description</em>}</Typography>
                          <Typography fontSize={12} fontWeight={600} color={selected ? TRADE_TEAL : '#0284c7'}>
                            ${Number((parseFloat(item.paid) || 0) * (parseInt(item.qty) || 1)).toFixed(2)}
                          </Typography>
                        </Box>
                      ))}
                      {items.length > 3 && (
                        <Typography fontSize={11} color="text.secondary" sx={{ pl: 3.5, mt: 0.25 }}>
                          +{items.length - 3} more item{items.length - 3 !== 1 ? 's' : ''}
                        </Typography>
                      )}
                    </Box>
                    {selected && <MuiIcons.CheckCircle sx={{ color: TRADE_TEAL, ml: 1.5, flexShrink: 0 }} />}
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            {selectedBuyId
              ? `The selected Buy Ticket will be removed from the workspace and its items moved here.`
              : `Select a Buy Ticket above to import.`}
          </Typography>
          <Button onClick={() => setBuyPickerOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!selectedBuyId}
            onClick={handleImportBuyTicket}
            sx={{ bgcolor: TRADE_TEAL, '&:hover': { bgcolor: TRADE_DARK }, textTransform: 'none' }}
          >
            Import into Trade
          </Button>
        </DialogActions>
      </Dialog>

      {/* Convert to Buy picker dialog */}
      <Dialog open={convertBuyPickerOpen} onClose={() => { setConvertBuyPickerOpen(false); setConvertBuyItem(null); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Move to Buy Ticket</DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Choose a buy ticket to move this item into, or create a new one.
          </Typography>
          <List dense disablePadding>
            {workspaceBuyTickets.map(t => {
              const total = t.totalPaid || (t.buyItems || []).reduce((s, i) => s + (parseFloat(i.paid) || 0) * (parseInt(i.qty) || 1), 0);
              return (
                <ListItemButton key={t.ticketId} selected={convertBuySelectedId === t.ticketId}
                  onClick={() => setConvertBuySelectedId(t.ticketId)}
                  sx={{ borderRadius: 1, mb: 0.5, border: '1px solid', borderColor: convertBuySelectedId === t.ticketId ? '#0284c7' : 'transparent' }}>
                  <ListItemText
                    primary={<Typography fontWeight={700} fontSize={13}>{t.ticketId}</Typography>}
                    secondary={`${(t.buyItems || []).length} item${(t.buyItems || []).length !== 1 ? 's' : ''} · $${Number(total).toFixed(2)}`}
                  />
                </ListItemButton>
              );
            })}
            <ListItemButton selected={convertBuySelectedId === '__new__'} onClick={() => setConvertBuySelectedId('__new__')}
              sx={{ borderRadius: 1, border: '1px solid', borderColor: convertBuySelectedId === '__new__' ? '#0284c7' : 'transparent' }}>
              <MuiIcons.AddCircleOutline sx={{ mr: 1.5, fontSize: 18, color: '#0284c7' }} />
              <ListItemText primary={<Typography fontSize={13}>Create new Buy Ticket</Typography>} />
            </ListItemButton>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConvertBuyPickerOpen(false); setConvertBuyItem(null); }}>Cancel</Button>
          <Button variant="contained" disabled={!convertBuySelectedId}
            sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
            onClick={() => {
              const targetId = convertBuySelectedId === '__new__' ? null : convertBuySelectedId;
              setTradeItems(prev => prev.filter(i => i._lineId !== convertBuyItem._lineId));
              onConvertToBuy?.(convertBuyItem, targetId);
              showSnackbar(`Item moved to ${targetId || 'a new Buy Ticket'}.`, 'info');
              setConvertBuyPickerOpen(false);
              setConvertBuyItem(null);
              setConvertBuySelectedId(null);
            }}>
            Move Item
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sale ticket picker dialog */}
      <Dialog open={salePickerOpen} onClose={() => setSalePickerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          Select Sale Ticket to Absorb into Trade
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {workspaceSaleTickets.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary" fontSize={14}>No eligible Sale Tickets in workspace.</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {workspaceSaleTickets.map(ticket => {
                const items    = ticket.saleItems || [];
                const total    = ticket.total || items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1), 0);
                const selected = selectedSaleId === ticket.ticketId;
                return (
                  <ListItemButton
                    key={ticket.ticketId}
                    selected={selected}
                    onClick={() => setSelectedSaleId(ticket.ticketId)}
                    sx={{
                      borderBottom: '1px solid #f0f0f0',
                      bgcolor: selected ? '#e0f2f1 !important' : undefined,
                      '&:hover': { bgcolor: '#f0f9ff' },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                        <MuiIcons.ShoppingCart sx={{ fontSize: 18, color: selected ? TRADE_TEAL : '#1a472a' }} />
                        <Typography fontWeight={700} fontSize={14} color={selected ? TRADE_TEAL : '#1a472a'}>
                          {ticket.ticketId}
                        </Typography>
                        <Chip
                          label={`${items.length} item${items.length !== 1 ? 's' : ''}`}
                          size="small"
                          sx={{ height: 20, fontSize: 11, bgcolor: '#e8f5e9', color: '#1a472a' }}
                        />
                        <Typography fontSize={13} fontWeight={700} color={selected ? TRADE_TEAL : 'text.primary'} sx={{ ml: 'auto' }}>
                          ${Number(total).toFixed(2)}
                        </Typography>
                      </Box>
                      {items.slice(0, 3).map((item, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 3.5, py: 0.25 }}>
                          <Typography fontSize={12} color="text.secondary" sx={{ minWidth: 60 }}>{item.sku}</Typography>
                          <Typography fontSize={12} noWrap sx={{ flex: 1 }}>{item.name || <em style={{ color: '#bbb' }}>No description</em>}</Typography>
                          <Typography fontSize={12} fontWeight={600} color={selected ? TRADE_TEAL : '#1a472a'}>
                            ${Number((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)).toFixed(2)}
                          </Typography>
                        </Box>
                      ))}
                      {items.length > 3 && (
                        <Typography fontSize={11} color="text.secondary" sx={{ pl: 3.5, mt: 0.25 }}>
                          +{items.length - 3} more item{items.length - 3 !== 1 ? 's' : ''}
                        </Typography>
                      )}
                    </Box>
                    {selected && <MuiIcons.CheckCircle sx={{ color: TRADE_TEAL, ml: 1.5, flexShrink: 0 }} />}
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            {selectedSaleId
              ? `The selected Sale Ticket will be removed from the workspace and its items moved here.`
              : `Select a Sale Ticket above to import.`}
          </Typography>
          <Button onClick={() => setSalePickerOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!selectedSaleId}
            onClick={handleImportSaleTicket}
            sx={{ bgcolor: TRADE_TEAL, '&:hover': { bgcolor: TRADE_DARK }, textTransform: 'none' }}
          >
            Import into Trade
          </Button>
        </DialogActions>
      </Dialog>

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
