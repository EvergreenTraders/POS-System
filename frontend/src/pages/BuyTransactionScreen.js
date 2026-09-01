import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Avatar,
  Divider, TextField, InputAdornment, Checkbox, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItemButton, ListItemText,
  Tooltip, Snackbar, Alert, Select, MenuItem, Menu,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { parseQuickScrapEntry } from '../utils/quickScrapEntry';
import JewelryIntakeScreen from './JewelryIntakeScreen';
import HardgoodsIntakeScreen from './HardgoodsIntakeScreen';
import FindMatchingItemScreen from './FindMatchingItemScreen';

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

function voidBuyTicketId(id) {
  const voided = JSON.parse(localStorage.getItem('voidedBuyTickets') || '[]');
  if (!voided.includes(id)) {
    voided.push(id);
    localStorage.setItem('voidedBuyTickets', JSON.stringify(voided));
  }
  if (localStorage.getItem(BT_PENDING_KEY) === id) localStorage.removeItem(BT_PENDING_KEY);
}

// Exported so TradeTransactionScreen can mint a real buy_ticket_id for the
// trade-in portion of a trade, sharing the same counter/pending-id semantics
// as a standalone buy ticket.
export { generateBuyTicketId, commitBuyTicketId };

// Exported so TradeTransactionScreen can parse a scanned "J <code>" entry the
// same way the standalone Buy ticket does.
export { parseItemDescription };

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads')) return `${config.apiUrl.replace('/api', '')}${url}`;
  return url;
}

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
  workspaceTradeTickets = [],
  workspacePawnTickets = [],
  autoOpenScrap = false,
  scrapPrefill = null,
  autoOpenUnique = false,
  uniqueParsedValues = null,
  readOnly = false,
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
  // Seeded straight into the intake screen (not toggled on after mount via an
  // effect) when arriving here via the workspace's "scrap"/weight+purity
  // search-bar shortcut, so the empty Buy ticket table is never rendered for
  // even one frame before flipping over to it.
  const [intakeOpen, setIntakeOpen]     = useState(() => autoOpenScrap || autoOpenUnique);
  const [intakeEntry, setIntakeEntry]   = useState('');
  const [parsedValues, setParsedValues] = useState(() => (autoOpenUnique ? uniqueParsedValues : null));
  // "scrap"/weight+purity shortcuts typed directly into this screen's own
  // scan/search bar (as opposed to autoOpenScrap, which only applies to how
  // this screen was first opened) — see openIntake() below.
  const [manualScrapMode, setManualScrapMode] = useState(false);
  const [manualScrapPrefill, setManualScrapPrefill] = useState(null);
  // True only when this screen was opened directly into scrap/unique intake
  // via the workspace shortcut — used so Cancel/Back from that intake, with
  // nothing added to the ticket yet, returns straight to the workspace
  // instead of surfacing the otherwise-empty, unwanted Buy ticket table.
  const cameFromQuickShortcut = useRef(autoOpenScrap || autoOpenUnique);
  const [editingIntakeItem, setEditingIntakeItem] = useState(null);
  const [hardgoodsIntakeOpen, setHardgoodsIntakeOpen] = useState(false);
  const [editingHardgoodsItem, setEditingHardgoodsItem] = useState(null);
  const [hardgoodsMatchPrefill, setHardgoodsMatchPrefill] = useState(null);
  const [findMatchOpen, setFindMatchOpen] = useState(false);
  const [findMatchQuery, setFindMatchQuery] = useState('');
  const [categoryCodeMap, setCategoryCodeMap] = useState({});
  const [colorCodeMap,    setColorCodeMap]    = useState({});
  const [metalTypeCodeMap,setMetalTypeCodeMap]= useState({});
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [quickInput, setQuickInput]     = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editFields, setEditFields]     = useState({});
  const [totalPaidOverride, setTotalPaidOverride] = useState(existingBuyData?.totalPaidOverride ?? null);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [convertAnchor, setConvertAnchor] = useState(null);
  const [convertRow,    setConvertRow]    = useState(null);
  const [tradePickerOpen,  setTradePickerOpen]  = useState(false);
  const [selectedTradeId,  setSelectedTradeId]  = useState(null);
  const [pawnPickerOpen,   setPawnPickerOpen]   = useState(false);
  const [selectedPawnId,   setSelectedPawnId]   = useState(null);
  const [emptyTicketDialogOpen, setEmptyTicketDialogOpen] = useState(false);
  const [pendingConvert,   setPendingConvert]   = useState(null); // { type, item, targetTicketId }
  const prevItemCountRef = useRef(buyItems.length);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [cameraStream,     setCameraStream]     = useState(null);
  const [photoTargetId,    setPhotoTargetId]    = useState(null);
  const [isCamReady,       setIsCamReady]       = useState(false);
  const [snackbar, setSnackbar]         = useState({ open: false, message: '', severity: 'success' });
  const quickInputRef  = useRef(null);
  const cameraVideoRef = useRef(null);

  const showSnackbar = (msg, sev = 'success') => setSnackbar({ open: true, message: msg, severity: sev });
  const fmt = (n) => `$${Number(n).toFixed(2)}`;

  useEffect(() => {
    if (prevItemCountRef.current > 0 && buyItems.length === 0) {
      setEmptyTicketDialogOpen(true);
    }
    prevItemCountRef.current = buyItems.length;
  }, [buyItems.length]);

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

  const totalPaid = Math.round(buyItems.reduce((s, i) => s + (parseFloat(i.paid) || 0) * (parseInt(i.qty) || 1), 0) * 100) / 100;
  const effectiveTotalPaid = totalPaidOverride ?? totalPaid;

  // Editing Total Paid proportionally rescales every item's own paid amount
  // to match, so the item list itself reflects the adjustment instead of
  // only being distributed at checkout time.
  const handleTotalPaidBlur = () => {
    if (totalPaidOverride === null || totalPaidOverride === undefined) return;
    if (buyItems.length === 0 || totalPaid <= 0) { setTotalPaidOverride(null); return; }
    const newTotal = Math.round(totalPaidOverride * 100) / 100;
    const scale = newTotal / totalPaid;
    setBuyItems(prev => {
      const scaledPaid = prev.map(item => Math.round((parseFloat(item.paid) || 0) * scale * 100) / 100);
      // Nudge the last item's paid amount so the items' line totals
      // (paid * qty) sum exactly to the typed total (per-item rounding can
      // otherwise drift a cent or two off).
      const lineTotals = prev.map((item, i) => scaledPaid[i] * (parseInt(item.qty) || 1));
      const lastIdx = lineTotals.length - 1;
      const sumExceptLast = lineTotals.slice(0, -1).reduce((s, v) => s + v, 0);
      const lastQty = parseInt(prev[lastIdx].qty) || 1;
      scaledPaid[lastIdx] = Math.round(((newTotal - sumExceptLast) / lastQty) * 100) / 100;
      return prev.map((item, i) => ({ ...item, paid: scaledPaid[i] }));
    });
    setTotalPaidOverride(null);
  };

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

  const handleConvertItem = (type, item, targetTicketId) => {
    const isLast = buyItems.length === 1;
    handleRemoveItem(item._lineId);
    if (isLast) {
      setPendingConvert({ type, item, targetTicketId });
      // onConvertTo deferred — committed only if user confirms Void in the empty-ticket dialog
    } else {
      onConvertTo?.({ type, item, targetTicketId });
    }
  };

  const handleDuplicateItem = (item) => {
    setBuyItems(prev => {
      const count = prev.length + 1;
      return [...prev, { ...item, serial_number: '', _lineId: Date.now() + Math.random(), part_no: `${ticketId}-${String(count).padStart(2, '0')}` }];
    });
  };

  const startEdit = (item) => {
    if (item.sourceEstimator === 'jewelry' && item.jewelryData) {
      const jd = item.jewelryData;
      const images = item.images?.length ? item.images : (jd.images || []);
      setEditingIntakeItem({
        ...jd,
        _lineId: item._lineId,
        images,
        // JewelryIntakeScreen reads 'item' for name and 'metal_category' for category
        item: jd.item || jd.short_desc || item.description || '',
        metal_category: jd.metal_category || jd.category || '',
      });
      setParsedValues(null);
      setIntakeEntry('');
      setIntakeOpen(true);
      return;
    }
    if (item.sourceEstimator === 'hardgoods' && item.jewelryData) {
      setEditingHardgoodsItem({ ...item.jewelryData, _lineId: item._lineId, images: item.images?.length ? item.images : (item.jewelryData.images || []) });
      setHardgoodsIntakeOpen(true);
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
    const text = scanInput.trim();

    // "scrap" or a weight+purity shortcut (e.g. "5.6g 14k") — same parsing the
    // workspace's top search bar uses, so it behaves identically whether you
    // type it there or straight into this screen's own scan/search bar.
    const parsedScrap = parseQuickScrapEntry(text);
    if (parsedScrap.isBulkScrap) {
      setScanInput('');
      setEditingIntakeItem(null);
      setParsedValues(null);
      setIntakeEntry('');
      setManualScrapMode(true);
      setManualScrapPrefill(parsedScrap.rowKey && parsedScrap.weightG != null
        ? { rowKey: parsedScrap.rowKey, grossWt: String(parsedScrap.weightG), purityValue: parsedScrap.purityValue, karat: parsedScrap.karat }
        : null);
      setIntakeOpen(true);
      return;
    }
    if (parsedScrap.isUniqueWithPrefill) {
      setScanInput('');
      setEditingIntakeItem(null);
      setManualScrapMode(false);
      setManualScrapPrefill(null);
      setParsedValues({
        weight: parsedScrap.weightG,
        metal: parsedScrap.metal,
        purity: parsedScrap.karat != null ? `${parsedScrap.karat}K` : parsedScrap.purityValue,
      });
      setIntakeEntry('');
      setIntakeOpen(true);
      return;
    }

    setManualScrapMode(false);
    setManualScrapPrefill(null);

    const parts = text.toUpperCase().split(/\s+/);
    if (parts[0] === 'H') {
      const rest = parts.slice(1).join(' ') || text;
      setEditingHardgoodsItem(null);
      setIntakeEntry(rest);
      setFindMatchQuery(rest);
      setFindMatchOpen(true);
      return;
    }
    if (parts[0] === 'J' && parts.length >= 2) {
      setParsedValues(parseItemDescription(parts.slice(1), categoryCodeMap, colorCodeMap, metalTypeCodeMap));
    } else {
      setParsedValues(null);
    }
    setIntakeEntry(text);
    setEditingIntakeItem(null);
    setIntakeOpen(true);
  };

  const jewelryItemToBuyItem = (item, seq) => {
    const qty = parseInt(item.qty) || 1;
    // Scrap lots price the whole weighed group at once (buy_price/paid_amount is
    // the lot total) — divide by pieces so qty * paid reproduces that total rather
    // than multiplying it out again.
    const totalPaid = parseFloat(item.buy_price) || parseFloat(item.paid_amount) || 0;
    return {
      _lineId: Date.now() + Math.random(),
      part_no: `${ticketId}-${String(seq).padStart(2, '0')}`,
      category_id: categories.find(c => c.name === item.category)?.id || '',
      category_name: item.category || '',
      description: item.item || item.short_desc || '',
      serial_number: item.serial_number || item.serial || '',
      qty,
      paid: Math.round((totalPaid / qty) * 100) / 100,
      images: item.images || [],
      sourceEstimator: 'jewelry',
      jewelryData: item,
    };
  };

  // jewelryData is reused (rather than a separate hardgoodsData key) so this row
  // flows through the existing cartItems-building / checkout hardgoods-creation
  // code unchanged — that code spreads `item.jewelryData` regardless of source.
  const hardgoodsItemToBuyItem = (item, seq) => {
    const totalPaid = parseFloat(item.buy_price) || parseFloat(item.paid_amount) || 0;
    return {
      _lineId: Date.now() + Math.random(),
      part_no: `${ticketId}-${String(seq).padStart(2, '0')}`,
      category_id: item.category_id || '',
      category_name: item.category_name || item.category || '',
      description: item.item || item.short_desc || '',
      serial_number: item.serial_number || item.serial || '',
      qty: 1,
      paid: totalPaid,
      images: item.images || [],
      sourceEstimator: 'hardgoods',
      jewelryData: item,
    };
  };

  const handleIntakeBack = () => {
    // Arrived here directly via the workspace's scrap/unique shortcut and
    // haven't added anything yet — Cancel should return to the workspace,
    // not surface an otherwise-empty, unwanted Buy ticket table.
    if (cameFromQuickShortcut.current && buyItems.length === 0) {
      onClose();
      return;
    }
    setIntakeOpen(false);
    setEditingIntakeItem(null);
  };

  const handleHardgoodsIntakeBack = () => {
    setHardgoodsIntakeOpen(false);
    setEditingHardgoodsItem(null);
    setHardgoodsMatchPrefill(null);
  };

  const handleHardgoodsIntakeSave = (item) => {
    setBuyItems(prev => [...prev, hardgoodsItemToBuyItem(item, prev.length + 1)]);
    setScanInput('');
    setHardgoodsIntakeOpen(false);
    setHardgoodsMatchPrefill(null);
  };

  const handleHardgoodsIntakeSaveAndAdd = (item) => {
    setBuyItems(prev => [...prev, hardgoodsItemToBuyItem(item, prev.length + 1)]);
    setScanInput('');
    setIntakeEntry('');
    setEditingHardgoodsItem(null);
    setHardgoodsMatchPrefill(null);
    setHardgoodsIntakeOpen(true);
  };

  const handleHardgoodsIntakeUpdate = (item) => {
    setBuyItems(prev => prev.map(i =>
      i._lineId === editingHardgoodsItem?._lineId
        ? { ...hardgoodsItemToBuyItem(item, 0), _lineId: i._lineId, part_no: i.part_no, paid: i.paid }
        : i));
    setEditingHardgoodsItem(null);
    setHardgoodsIntakeOpen(false);
  };

  // ── Find Matching Item (search/match step ahead of Hardgoods intake) ──────
  const handleFindMatchClose = () => setFindMatchOpen(false);

  const handleFindMatchSelect = (match) => {
    setHardgoodsMatchPrefill(match);
    setEditingHardgoodsItem(null);
    setFindMatchOpen(false);
    setHardgoodsIntakeOpen(true);
  };

  const handleFindMatchAddNonCatalog = (query) => {
    setHardgoodsMatchPrefill(null);
    setEditingHardgoodsItem(null);
    setIntakeEntry(query || findMatchQuery);
    setFindMatchOpen(false);
    setHardgoodsIntakeOpen(true);
  };

  const handleChangeHardgoodsMatch = (query) => {
    setHardgoodsIntakeOpen(false);
    setFindMatchQuery(query || '');
    setFindMatchOpen(true);
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
        ? {
            ...jewelryItemToBuyItem(item, 0),
            _lineId: i._lineId,
            part_no: i.part_no,
            // Preserve the original paid amount; user adjusts it in the table
            paid: i.paid,
            // Preserve inventory-tracking fields for quote items
            ...(i.fromInventory && { fromInventory: true, item_id: i.item_id }),
          }
        : i
    ));
    setEditingIntakeItem(null);
    setIntakeOpen(false);
  };

  const openItemCamera = (_lineId) => {
    setPhotoTargetId(_lineId);
    setIsCamReady(false);
    setCameraDialogOpen(true);
  };

  const handleCameraDialogEntered = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setCameraStream(stream);
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Camera error:', err);
      closeItemCamera();
    }
  };

  const captureItemPhoto = () => {
    const video = cameraVideoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url  = URL.createObjectURL(file);
      setBuyItems(prev => prev.map(item =>
        item._lineId === photoTargetId
          ? { ...item, images: [...(item.images || []), { url, file, isPrimary: !(item.images?.length), type: 'capture' }] }
          : item
      ));
      closeItemCamera();
    }, 'image/jpeg', 0.9);
  };

  const closeItemCamera = () => {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); }
    setIsCamReady(false);
    setCameraDialogOpen(false);
    setPhotoTargetId(null);
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
    onAddToWorkspace?.({ ticketId, buyItems, buyPawnNotes, ticketNote, showOnReceipt, totalPaid, totalPaidOverride: totalPaidOverride ?? null, customer });
  };

  const handleSaveAsQuote = async () => {
    if (!customer?.id) { showSnackbar('Please select a customer before saving as quote', 'error'); return; }
    if (buyItems.length === 0) { showSnackbar('No items to save as quote', 'warning'); return; }
    const token = localStorage.getItem('token');
    const employeeId = JSON.parse(atob(token.split('.')[1])).id;
    const scale = totalPaid > 0 ? effectiveTotalPaid / totalPaid : 1;
    try {
      const formData = new FormData();
      const imageMetadata = [];

      const itemsForSubmit = buyItems.map((item, itemIndex) => {
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
        const itemPaid = (parseFloat(item.paid) || 0) * scale;
        return {
          ...jd,
          short_desc: item.description || jd.short_desc || '',
          long_desc: jd.long_desc || item.description || '',
          amount: itemPaid,
          price: itemPaid,
          transaction_type: 'buy',
        };
      });

      formData.append('items', JSON.stringify(itemsForSubmit));
      formData.append('imageMetadata', JSON.stringify(imageMetadata));
      formData.append('customer_id', customer.id);
      formData.append('employee_id', employeeId);
      formData.append('total_amount', effectiveTotalPaid);
      formData.append('quote_type', 'buy');

      const res = await axios.post(`${config.apiUrl}/quotes`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      showSnackbar(`Quote ${res.data.quote_id} saved successfully. Valid for ${res.data.expires_in} days.`, 'success');
      setBuyItems([]);
      setTotalPaidOverride(null);
    } catch (err) {
      console.error('Error saving quote:', err);
      showSnackbar('Error saving quote. Please try again.', 'error');
    }
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

    const scale = totalPaid > 0 ? effectiveTotalPaid / totalPaid : 1;
    const cartItems = buyItems.flatMap(item => {
      const jewelryBase = item.jewelryData ? { ...item.jewelryData } : {};
      const itemPaid = (parseFloat(item.paid) || 0) * scale;
      const qty = parseInt(item.qty) || 1;
      // Scrap lots are weighed and valued as one whole group — keep them as a
      // single inventory row carrying the piece count, rather than splitting
      // into `qty` separate rows the way distinct unique items do.
      const isScrapLot = item.jewelryData?.mode === 'scrap';
      const copies = isScrapLot ? 1 : qty;
      const rowPaid = isScrapLot ? itemPaid * qty : itemPaid;
      return Array.from({ length: copies }, () => ({
        ...jewelryBase,
        ...item,
        id: `${ticketId}_${item._lineId}_${Date.now()}`,
        description: item.description || item.jewelryData?.short_desc || item.part_no,
        short_desc: item.description || item.jewelryData?.short_desc || '',
        long_desc: item.jewelryData?.long_desc || item.description || '',
        price: rowPaid,
        value: rowPaid,
        pieces: isScrapLot ? qty : 1,
        transaction_type: 'buy',
        sourceEstimator: item.sourceEstimator || 'jewelry',
        category_id: item.category_id || item.jewelryData?.category_id || null,
        serial_number: item.serial_number || item.jewelryData?.serial_number || null,
        images: item.images || item.jewelryData?.images || [],
        ticket_note: ticketNote || null,
        show_on_receipt: showOnReceipt,
        customer: cartCustomer,
        employee: currentUser
          ? { id: currentUser.id, name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(), role: currentUser.role }
          : null,
        buyTicketId: ticketId,
      }));
    });

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
      totalPaidOverride: totalPaidOverride ?? null,
    }));
    commitBuyTicketId();
    navigate('/checkout', { state: { items: cartItems, allCartItems: cartItems, customer: cartCustomer, from: 'buy-ticket' } });
  };

  const HEADER_COLS = '110px 52px 120px 1fr 110px 50px 95px 100px';

  if (hardgoodsIntakeOpen) {
    return (
      <HardgoodsIntakeScreen
        customer={customer}
        ticketId={ticketId}
        ticketLabel="Buy Ticket"
        initialEntry={intakeEntry}
        editItem={editingHardgoodsItem}
        matchPrefill={hardgoodsMatchPrefill}
        onChangeMatch={editingHardgoodsItem ? undefined : handleChangeHardgoodsMatch}
        onBack={handleHardgoodsIntakeBack}
        onSaveItem={handleHardgoodsIntakeSave}
        onSaveAndAddAnother={handleHardgoodsIntakeSaveAndAdd}
        onUpdateItem={handleHardgoodsIntakeUpdate}
      />
    );
  }

  if (intakeOpen) {
    return (
      <JewelryIntakeScreen
        customer={customer}
        ticketId={ticketId}
        ticketLabel="Buy Ticket"
        initialEntry={intakeEntry}
        parsedValues={editingIntakeItem ? null : parsedValues}
        editItem={editingIntakeItem}
        initialMode={autoOpenScrap || manualScrapMode || editingIntakeItem?.mode === 'scrap' ? 'scrap' : 'unique'}
        scrapPrefill={autoOpenScrap ? scrapPrefill : (manualScrapMode ? manualScrapPrefill : null)}
        onBack={handleIntakeBack}
        onSaveItem={handleIntakeSave}
        onSaveAndAddAnother={handleIntakeSaveAndAdd}
        onUpdateItem={handleIntakeUpdate}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', bgcolor: '#f5f6fa', ...(readOnly && { pointerEvents: 'none', userSelect: 'none' }) }}>

      <FindMatchingItemScreen
        open={findMatchOpen}
        initialQuery={findMatchQuery}
        onClose={handleFindMatchClose}
        onSelect={handleFindMatchSelect}
        onAddNonCatalog={handleFindMatchAddNonCatalog}
      />

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
              <Typography fontSize={11} fontWeight={700} color="text.secondary" letterSpacing={0.5}>
                ADD NEW ITEM
              </Typography>
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
                    { label: 'Image',    width: 56 },
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
                        {(() => {
                          const thumb = resolveImageUrl(item.images?.find(i => i.isPrimary)?.url || item.images?.[0]?.url);
                          return thumb ? (
                            <Box component="img" src={thumb} alt="Item"
                              sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover', cursor: 'pointer' }}
                              onClick={() => openItemCamera(item._lineId)} />
                          ) : (
                            <IconButton size="small"
                              sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: '#f0f0f0', color: '#9e9e9e', '&:hover': { bgcolor: '#e0f2fe', color: BUY_BLUE } }}
                              onClick={() => openItemCamera(item._lineId)}>
                              <MuiIcons.PhotoCamera sx={{ fontSize: 18 }} />
                            </IconButton>
                          );
                        })()}
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
                        {(() => {
                          const thumb = resolveImageUrl(item.images?.find(i => i.isPrimary)?.url || item.images?.[0]?.url);
                          return thumb ? (
                            <Box component="img" src={thumb} alt="Item"
                              sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover', cursor: 'pointer' }}
                              onClick={() => openItemCamera(item._lineId)} />
                          ) : (
                            <IconButton size="small"
                              sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: '#f0f0f0', color: '#9e9e9e', '&:hover': { bgcolor: '#e0f2fe', color: BUY_BLUE } }}
                              onClick={() => openItemCamera(item._lineId)}>
                              <MuiIcons.PhotoCamera sx={{ fontSize: 18 }} />
                            </IconButton>
                          );
                        })()}
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
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2 }}>
              <Typography fontSize={11} color="text.secondary" mb={0.5}>Total Paid</Typography>
              <TextField
                type="number"
                size="small"
                fullWidth
                value={totalPaidOverride ?? totalPaid}
                onChange={e => setTotalPaidOverride(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
                onBlur={handleTotalPaidBlur}
                inputProps={{ min: 0, step: 0.01, style: { fontWeight: 800, fontSize: 22, color: BUY_BLUE } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Typography fontWeight={700} color="text.secondary">$</Typography></InputAdornment>,
                }}
              />
              {totalPaidOverride !== null && Math.abs(totalPaidOverride - totalPaid) > 0.001 && (
                <Typography fontSize={10} color="text.secondary" mt={0.5}>
                  Auto: {fmt(totalPaid)}
                </Typography>
              )}
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#e0f2fe', borderColor: BUY_BLUE }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <MuiIcons.AccountBalance sx={{ color: BUY_BLUE, fontSize: 18 }} />
                <Typography fontSize={12} fontWeight={700} color={BUY_BLUE}>Net Effect</Typography>
              </Box>
              <Typography fontSize={15} fontWeight={800} color="#c62828">-{fmt(effectiveTotalPaid)}</Typography>
              <Typography fontSize={11} color="text.secondary">due to customer</Typography>
            </Paper>
          </Box>

        </Box>

      </Box>

      {/* ── Bottom action bar — sticky ── */}
      <Paper sx={{ px: 2, py: 1.25, borderRadius: 0, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 1.25, position: 'sticky', bottom: 0, zIndex: 10, pointerEvents: 'auto', userSelect: 'auto' }}>
        {readOnly ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5, bgcolor: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: 1.5 }}>
              <MuiIcons.Visibility sx={{ fontSize: 14, color: '#7c3aed' }} />
              <Typography variant="caption" color="#7c3aed" fontWeight={600}>View Only — this ticket is already completed</Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="outlined" color="inherit" onClick={onClose}
              sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
              Close
            </Button>
          </>
        ) : (
          <>
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
              disabled={buyItems.length === 0 || !customer?.id}
              onClick={handleSaveAsQuote}
              sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
              Save as Quote
            </Button>
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
          </>
        )}
      </Paper>

      {/* Camera dialog */}
      <Dialog open={cameraDialogOpen} onClose={closeItemCamera} maxWidth="sm" fullWidth
        TransitionProps={{ onEntered: handleCameraDialogEntered }}>
        <DialogContent sx={{ p: 1.5, bgcolor: '#000' }}>
          <video ref={cameraVideoRef} autoPlay playsInline onCanPlay={() => setIsCamReady(true)}
            style={{ width: '100%', borderRadius: 8, display: 'block' }} />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 2 }}>
          <Button onClick={closeItemCamera} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={captureItemPhoto} disabled={!isCamReady}
            startIcon={<MuiIcons.PhotoCamera />}
            sx={{ bgcolor: BUY_BLUE, '&:hover': { bgcolor: BUY_DARK }, textTransform: 'none' }}>
            Capture
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
              <MenuItem onClick={() => {
                setConvertAnchor(null);
                if (workspacePawnTickets.length > 0) {
                  setSelectedPawnId(null);
                  setPawnPickerOpen(true);
                } else {
                  handleConvertItem('pawn', convertRow, null);
                  setConvertRow(null);
                }
              }}>
                <PawnIcon sx={{ fontSize: 16, mr: 1.5, color: pawn.color ?? '#7b1fa2' }} />
                <Typography variant="body2">Pawn Ticket</Typography>
              </MenuItem>
              <MenuItem onClick={() => {
                setConvertAnchor(null);
                if (workspaceTradeTickets.length > 0) {
                  setSelectedTradeId(null);
                  setTradePickerOpen(true);
                } else {
                  handleConvertItem('trade', convertRow, null);
                  setConvertRow(null);
                }
              }}>
                <TradeIcon sx={{ fontSize: 16, mr: 1.5, color: trade.color ?? '#388e3c' }} />
                <Typography variant="body2">Trade Ticket</Typography>
              </MenuItem>
            </>
          );
        })()}
      </Menu>

      {/* Trade ticket picker */}
      <Dialog open={tradePickerOpen} onClose={() => { setTradePickerOpen(false); setConvertRow(null); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Move to Trade Ticket</DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Choose a trade ticket to move this item into as a trade-in item, or create a new one.
          </Typography>
          <List dense disablePadding>
            {workspaceTradeTickets.map(t => (
              <ListItemButton key={t.ticketId} selected={selectedTradeId === t.ticketId}
                onClick={() => setSelectedTradeId(t.ticketId)}
                sx={{ borderRadius: 1, mb: 0.5, border: '1px solid', borderColor: selectedTradeId === t.ticketId ? '#0891b2' : 'transparent' }}>
                <ListItemText
                  primary={<Typography fontWeight={700} fontSize={13}>{t.ticketId}</Typography>}
                  secondary={`${t.tradeItems?.length || 0} trade-in item${(t.tradeItems?.length || 0) !== 1 ? 's' : ''}`}
                />
              </ListItemButton>
            ))}
            <ListItemButton selected={selectedTradeId === '__new__'} onClick={() => setSelectedTradeId('__new__')}
              sx={{ borderRadius: 1, border: '1px solid', borderColor: selectedTradeId === '__new__' ? '#0891b2' : 'transparent' }}>
              <MuiIcons.AddCircleOutline sx={{ mr: 1.5, fontSize: 18, color: '#0891b2' }} />
              <ListItemText primary={<Typography fontSize={13}>Create new Trade Ticket</Typography>} />
            </ListItemButton>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setTradePickerOpen(false); setConvertRow(null); }}>Cancel</Button>
          <Button variant="contained" disabled={!selectedTradeId}
            sx={{ bgcolor: '#0891b2', '&:hover': { bgcolor: '#0e7490' } }}
            onClick={() => {
              handleConvertItem('trade', convertRow, selectedTradeId === '__new__' ? null : selectedTradeId);
              setTradePickerOpen(false);
              setConvertRow(null);
              setSelectedTradeId(null);
            }}>
            Move Item
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pawn ticket picker */}
      <Dialog open={pawnPickerOpen} onClose={() => { setPawnPickerOpen(false); setConvertRow(null); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Move to Pawn Ticket</DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Choose a pawn ticket to move this item into, or create a new one.
          </Typography>
          <List dense disablePadding>
            {workspacePawnTickets.map(t => (
              <ListItemButton key={t.ticketId} selected={selectedPawnId === t.ticketId}
                onClick={() => setSelectedPawnId(t.ticketId)}
                sx={{ borderRadius: 1, mb: 0.5, border: '1px solid', borderColor: selectedPawnId === t.ticketId ? '#7b1fa2' : 'transparent' }}>
                <ListItemText
                  primary={<Typography fontWeight={700} fontSize={13}>{t.ticketId}</Typography>}
                  secondary={`${t.pawnItems?.length || 0} item${(t.pawnItems?.length || 0) !== 1 ? 's' : ''}`}
                />
              </ListItemButton>
            ))}
            <ListItemButton selected={selectedPawnId === '__new__'} onClick={() => setSelectedPawnId('__new__')}
              sx={{ borderRadius: 1, border: '1px solid', borderColor: selectedPawnId === '__new__' ? '#7b1fa2' : 'transparent' }}>
              <MuiIcons.AddCircleOutline sx={{ mr: 1.5, fontSize: 18, color: '#7b1fa2' }} />
              <ListItemText primary={<Typography fontSize={13}>Create new Pawn Ticket</Typography>} />
            </ListItemButton>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPawnPickerOpen(false); setConvertRow(null); }}>Cancel</Button>
          <Button variant="contained" disabled={!selectedPawnId}
            sx={{ bgcolor: '#7b1fa2', '&:hover': { bgcolor: '#6a1b9a' } }}
            onClick={() => {
              handleConvertItem('pawn', convertRow, selectedPawnId === '__new__' ? null : selectedPawnId);
              setPawnPickerOpen(false);
              setConvertRow(null);
              setSelectedPawnId(null);
            }}>
            Move Item
          </Button>
        </DialogActions>
      </Dialog>

      {/* Empty ticket dialog */}
      <Dialog open={emptyTicketDialogOpen} onClose={() => setEmptyTicketDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Buy Ticket is Empty</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {pendingConvert
              ? 'This item was about to be moved to another ticket. Void to confirm the move, or Cancel to keep the item here.'
              : 'All items have been removed. Void to remove this ticket from the workspace, or Cancel to keep it open.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            if (pendingConvert) {
              setBuyItems([pendingConvert.item]);
              setPendingConvert(null);
            }
            setEmptyTicketDialogOpen(false);
          }}>
            Cancel
          </Button>
          <Button variant="contained" color="error"
            onClick={() => {
              if (pendingConvert) {
                onConvertTo?.({ type: pendingConvert.type, item: pendingConvert.item, targetTicketId: pendingConvert.targetTicketId });
                setPendingConvert(null);
              }
              voidBuyTicketId(ticketId);
              onRemoveFromWorkspace?.(ticketId);
              setEmptyTicketDialogOpen(false);
            }}>
            Void Ticket
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
