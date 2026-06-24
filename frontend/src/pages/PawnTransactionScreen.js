import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, Avatar, Button, IconButton, Chip,
  Divider, TextField, InputAdornment, Checkbox, FormControlLabel,
  CircularProgress, Menu, MenuItem, Dialog, DialogContent, DialogActions,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import JewelryIntakeScreen from './JewelryIntakeScreen';

const PURPLE      = '#6d28d9';
const PURPLE_DARK = '#5b21b6';

const COL = '130px 52px 110px 1fr 130px 46px 70px 100px 110px';

const PENDING_KEY  = 'pendingPTTicketId';
const COUNTER_KEY  = 'lastPTTicketNumber';

function parsePawnDescription(parts, categoryCodeMap, colorCodeMap, metalTypeCodeMap) {
  const result = { category: null, purity: null, weight: null, color: null, metal: null };
  let i = 0;

  if (parts[i] && categoryCodeMap[parts[i]]) {
    result.category = categoryCodeMap[parts[i]];
    i++;
  }

  if (i < parts.length) {
    const p = parts[i];
    if (p.match(/^\d+K?$/i)) {
      result.purity = p.replace(/K$/i, '') + 'K';
      i++;
    } else if (p.match(/^0?\.\d+$/) || p.match(/^1\.0+$/)) {
      result.purity = parseFloat(p);
      i++;
    } else if (p.match(/^[A-Z]+$/) && !p.match(/^\d/)) {
      result.purity = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
      i++;
    }
  }

  if (i < parts.length) {
    const w = parts[i];
    if (w.match(/^[\d.]+G?$/i)) {
      result.weight = parseFloat(w.replace(/G$/i, ''));
      i++;
    }
  }

  if (i < parts.length) {
    const cm = parts[i];
    if (cm.length === 1) {
      result.metal = metalTypeCodeMap[cm] || null;
    } else if (metalTypeCodeMap[cm]) {
      result.metal = metalTypeCodeMap[cm];
    } else {
      result.color  = colorCodeMap[cm[0]]        || null;
      result.metal  = metalTypeCodeMap[cm.slice(1)] || null;
    }
  }

  return result;
}

function generatePawnTicketId() {
  // Reuse an uncommitted ticket ID if one exists (e.g. user cancelled before saving)
  const pending = localStorage.getItem(PENDING_KEY);
  if (pending) return pending;

  let last = parseInt(localStorage.getItem(COUNTER_KEY) || '0');
  last += 1;
  localStorage.setItem(COUNTER_KEY, last.toString());
  const id = `PT-${last.toString().padStart(8, '0')}`;
  localStorage.setItem(PENDING_KEY, id);
  return id;
}

function commitPawnTicketId() {
  localStorage.removeItem(PENDING_KEY);
}

export default function PawnTransactionScreen({ customer, customerStats: initialStats, onClose, onConvertTo }) {
  const [ticketId]                        = useState(() => generatePawnTicketId());
  const [itemSearch, setItemSearch]       = useState('');
  const [ticketNote, setTicketNote]       = useState('');
  const [showOnReceipt, setShowOnReceipt] = useState(false);
  const [pawnItems, setPawnItems]         = useState([]);
  const [activePawns, setActivePawns]     = useState([]);
  const [stats, setStats]                 = useState(initialStats);
  const [loadingPawns, setLoadingPawns]   = useState(false);
  const [intakeOpen, setIntakeOpen]       = useState(false);
  const [intakeEntry, setIntakeEntry]     = useState('');
  const [parsedValues,    setParsedValues]    = useState(null);
  const [editingItem,     setEditingItem]     = useState(null);
  const [photoTargetId,    setPhotoTargetId]    = useState(null);
  const [convertAnchor,    setConvertAnchor]    = useState(null);
  const [convertRow,       setConvertRow]       = useState(null);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [cameraStream,     setCameraStream]     = useState(null);
  const [isCamReady,       setIsCamReady]       = useState(false);
  const [pawnFilter,       setPawnFilter]       = useState('active');
  const cameraVideoRef = useRef(null);
  const [categoryCodeMap, setCategoryCodeMap] = useState({});
  const [colorCodeMap,    setColorCodeMap]    = useState({});
  const [metalTypeCodeMap,setMetalTypeCodeMap]= useState({});

  useEffect(() => {
    const fetchCodeMaps = async () => {
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
    };
    fetchCodeMaps();
  }, []);

  useEffect(() => {
    if (!customer?.id) return;
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

    axios.get(`${config.apiUrl}/customers/${customer.id}/pawn/stats`, { headers })
      .then(res => setStats(res.data))
      .catch(err => console.error('Failed to load customer pawn stats:', err));

    setLoadingPawns(true);
    axios.get(`${config.apiUrl}/customers/${customer.id}/pawns?status=all`, { headers })
      .then(res => setActivePawns(res.data))
      .catch(err => console.error('Failed to load customer pawns:', err))
      .finally(() => setLoadingPawns(false));
  }, [customer?.id]);

  const activePawnCount  = stats?.active_pawns  ?? 0;
  const overduePawnCount = stats?.overdue_pawns ?? 0;
  const forfeitRatio     = stats?.forfeit_ratio  ?? 0;
  const firstPawnDate    = stats?.first_pawn_date
    ? new Date(stats.first_pawn_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  const totalPawnAmount = pawnItems.reduce((s, i) => s + i.amount, 0);
  const interestAmt     = totalPawnAmount * 0.02;
  const insuranceAmt    = totalPawnAmount * 0.02;
  const storageFee      = totalPawnAmount > 0 ? 10 : 0;
  const totalToRedeem   = totalPawnAmount + interestAmt + insuranceAmt + storageFee;

  const fmt      = (n) => `$${n.toFixed(2)}`;
  const initials = `${customer?.first_name?.[0] ?? ''}${customer?.last_name?.[0] ?? ''}`.toUpperCase();

  const handleDeleteItem = (id) => setPawnItems(prev => prev.filter(i => i.id !== id));

  const openItemCamera = (itemId) => {
    setPhotoTargetId(itemId);
    setIsCamReady(false);
    setCameraDialogOpen(true);
  };

  const handleCameraDialogEntered = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setCameraStream(stream);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      closeItemCamera();
    }
  };

  const captureItemPhoto = () => {
    const video = cameraVideoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = URL.createObjectURL(file);
      setPawnItems(prev => prev.map(item =>
        item.id === photoTargetId
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

  const openIntake = () => {
    const text  = itemSearch.trim();
    const parts = text.toUpperCase().split(/\s+/);
    if (parts[0] === 'J' && parts.length >= 2) {
      setParsedValues(parsePawnDescription(parts.slice(1), categoryCodeMap, colorCodeMap, metalTypeCodeMap));
    } else {
      setParsedValues(null);
    }
    setIntakeEntry(text);
    setIntakeOpen(true);
  };

  const handleIntakeBack = (dest) => {
    setIntakeOpen(false);
    setEditingItem(null);
    if (dest === 'transactions') onClose();
  };

  const makePartNumber = (seqNum) => {
    const tid = String(ticketId ?? '').replace(/\D/g, '').padStart(8, '0');
    return `PT-${tid}-${String(seqNum).padStart(2, '0')}`;
  };

  const handleIntakeSave = (item) => {
    setPawnItems(prev => {
      const seq = prev.length + 1;
      return [...prev, { ...item, part_number: makePartNumber(seq) }];
    });
    setItemSearch('');
    setIntakeOpen(false);
  };

  const handleIntakeSaveAndAdd = (item) => {
    setPawnItems(prev => {
      const seq = prev.length + 1;
      return [...prev, { ...item, part_number: makePartNumber(seq) }];
    });
    setItemSearch('');
    setIntakeEntry('');
    setIntakeOpen(true);
  };

  const handleIntakeUpdate = (item) => {
    setPawnItems(prev => prev.map(i => i.id === item.id ? { ...item, part_number: i.part_number } : i));
    setEditingItem(null);
    setIntakeOpen(false);
  };

  const STAT_BOXES = [
    { icon: 'Inventory2',    label: 'Active Pawns',    value: activePawnCount,    color: '#7c3aed', bg: '#f3e8ff' },
    { icon: 'Warning',       label: 'Overdue Pawns',   value: overduePawnCount,   color: '#d97706', bg: '#fff7ed' },
    { icon: 'DonutLarge',    label: 'Forfeit Ratio',   value: `${forfeitRatio}%`, color: '#6d28d9', bg: '#f5f3ff' },
    { icon: 'CalendarMonth', label: 'First Pawn Date', value: firstPawnDate,      color: '#059669', bg: '#ecfdf5' },
  ];

  if (intakeOpen) {
    return (
      <JewelryIntakeScreen
        customer={customer}
        ticketId={ticketId}
        initialEntry={intakeEntry}
        parsedValues={editingItem ? null : parsedValues}
        editItem={editingItem}
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
      <Box sx={{ bgcolor: PURPLE, color: 'white', px: 2.5, py: 0.875, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" fontWeight={400} sx={{ cursor: 'pointer', opacity: 0.8, '&:hover': { textDecoration: 'underline', opacity: 1 } }} onClick={onClose}>
          Transactions
        </Typography>
        <MuiIcons.ChevronRight sx={{ fontSize: 16, opacity: 0.6 }} />
        <Typography variant="body2" fontWeight={700}>
          Pawn Ticket ({ticketId})
        </Typography>
      </Box>

      {/* ── TOP: two equal halves ── */}
      <Box sx={{ display: 'flex', gap: 1.5, p: 1.5 }}>

        {/* Left half — customer info + pawn stats */}
        <Paper sx={{ flex: 1, p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

          {/* Avatar + name + ticket */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: '#e8eaf6', color: '#3949ab', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">Pawn Ticket*</Typography>
                <Typography variant="body2" fontWeight={700}>{ticketId}</Typography>
              </Box>
              <Typography fontWeight={800} fontSize={20} color="#3949ab" lineHeight={1.1}>
                {customer?.first_name} {customer?.last_name}
              </Typography>
              {customer?.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                  <MuiIcons.Phone sx={{ fontSize: 13, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary" fontSize={12}>{customer.phone}</Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Stat boxes — 4 equal columns */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {STAT_BOXES.map(({ icon, label, value, color, bg }) => {
              const Icon = MuiIcons[icon] ?? MuiIcons.Circle;
              return (
                <Box key={label} sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 1, borderRadius: 2, bgcolor: bg }}>
                  <Icon sx={{ color, fontSize: 20, flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 10, lineHeight: 1.2, color: 'text.secondary' }} noWrap>{label}</Typography>
                    <Typography fontWeight={700} fontSize={15} color="text.primary" lineHeight={1.2}>{value}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Paper>

        {/* Right half — Active Pawns */}
        <Paper sx={{ flex: 1, borderRadius: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
            <Typography fontWeight={700} fontSize={13}>Pawn History</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {[{ label: 'Active', value: 'active' }, { label: 'Redeemed', value: 'redeemed' }, { label: 'Forfeited', value: 'forfeited' }].map(({ label, value }) => (
                <Chip key={value} label={label} size="small" onClick={() => setPawnFilter(value)}
                  sx={{ cursor: 'pointer', height: 22, fontSize: 11,
                    bgcolor: pawnFilter === value ? PURPLE : 'transparent',
                    color: pawnFilter === value ? 'white' : 'text.secondary',
                    border: `1px solid ${pawnFilter === value ? PURPLE : '#e0e0e0'}`,
                    '& .MuiChip-label': { px: 1 },
                    '&:hover': { bgcolor: pawnFilter === value ? PURPLE : '#f3e8ff' },
                  }} />
              ))}
            </Box>
          </Box>

          {/* Table header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 150px', gap: 1, px: 2, py: 0.75, bgcolor: '#f8f9fa', borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
            {[
              { label: 'Pawn Ticket #', align: 'left'   },
              { label: 'Item',          align: 'center' },
              { label: 'Amount',        align: 'center' },
              { label: 'Due Date',      align: 'center' },
            ].map(({ label, align }) => (
              <Typography key={label} variant="caption" fontWeight={700} color="text.secondary" sx={{ textAlign: align }}>
                {label}
              </Typography>
            ))}
          </Box>

          <Box sx={{ overflowY: 'auto' }}>
            {loadingPawns ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={22} />
              </Box>
            ) : activePawns.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 3, gap: 0.5 }}>
                <MuiIcons.Inventory2 sx={{ fontSize: 28, color: '#e0e0e0' }} />
                <Typography variant="caption" color="text.secondary">No pawn history on file</Typography>
              </Box>
            ) : (() => {
              const filtered = activePawns.filter(p => {
                if (pawnFilter === 'active')   return p.status === 'ACTIVE' || p.status === 'OVERDUE';
                if (pawnFilter === 'redeemed') return p.status === 'REDEEMED';
                if (pawnFilter === 'forfeited') return p.status === 'FORFEITED';
                return true;
              });
              if (filtered.length === 0) return (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 3, gap: 0.5 }}>
                  <MuiIcons.Inventory2 sx={{ fontSize: 28, color: '#e0e0e0' }} />
                  <Typography variant="caption" color="text.secondary">No {pawnFilter} pawns on file</Typography>
                </Box>
              );
              return filtered.map((pawn, idx) => (
                <Box key={idx} sx={{
                  display: 'grid', gridTemplateColumns: '120px 1fr 80px 150px',
                  gap: 1, px: 2, py: 0.9, borderBottom: '1px solid #f0f0f0', alignItems: 'center',
                  '&:hover': { bgcolor: '#f9f9f9' },
                }}>
                  <Typography variant="caption" color={PURPLE} fontWeight={600} sx={{ cursor: 'pointer' }}>
                    {pawn.ticket}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                    {pawn.status === 'OVERDUE' && (
                      <Chip label="OVERDUE" size="small" icon={<MuiIcons.Warning sx={{ fontSize: '10px !important', color: '#dc2626 !important' }} />}
                        sx={{ height: 16, fontSize: 9, fontWeight: 700, bgcolor: '#fee2e2', color: '#dc2626', flexShrink: 0, '& .MuiChip-label': { px: 0.5 } }} />
                    )}
                    {pawn.status === 'REDEEMED' && (
                      <Chip label="REDEEMED" size="small"
                        sx={{ height: 16, fontSize: 9, fontWeight: 700, bgcolor: '#e8f5e9', color: '#2e7d32', flexShrink: 0, '& .MuiChip-label': { px: 0.5 } }} />
                    )}
                    {pawn.status === 'FORFEITED' && (
                      <Chip label="FORFEITED" size="small"
                        sx={{ height: 16, fontSize: 9, fontWeight: 700, bgcolor: '#fce4ec', color: '#c62828', flexShrink: 0, '& .MuiChip-label': { px: 0.5 } }} />
                    )}
                    <Typography variant="caption" noWrap sx={{ minWidth: 0 }}>{pawn.item}</Typography>
                  </Box>
                  <Typography variant="caption" fontWeight={600} sx={{ textAlign: 'center' }}>{pawn.amount}</Typography>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" display="block" color={pawn.overdue ? '#dc2626' : 'text.primary'} fontWeight={500}>
                      {pawn.dueDate}
                    </Typography>
                    {pawn.daysInfo && (
                      <Typography sx={{ fontSize: 10, color: pawn.overdue ? '#dc2626' : 'text.secondary' }}>{pawn.daysInfo}</Typography>
                    )}
                  </Box>
                </Box>
              ));
            })()}
          </Box>
        </Paper>
      </Box>

      {/* ── Scrollable content ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, px: 1.5, pb: 1.5 }}>

        {/* Search bar */}
        <Paper sx={{ px: 1.5, py: 1, borderRadius: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth size="small"
            placeholder="Scan / Search / Describe Item"
            value={itemSearch}
            onChange={e => setItemSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && itemSearch.trim() && openIntake()}
            InputProps={{
              startAdornment: <InputAdornment position="start"><MuiIcons.Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small"><MuiIcons.QrCodeScanner /></IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <Button variant="outlined" startIcon={<MuiIcons.AddCircleOutline />}
            onClick={openIntake}
            sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
            Free-type Quick Add
          </Button>
          <Button variant="contained" startIcon={<MuiIcons.Refresh />}
            sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13, bgcolor: PURPLE, '&:hover': { bgcolor: PURPLE_DARK } }}>
            Re-Pawn
          </Button>
        </Paper>

        {/* Items being pawned table — grows with content */}
        <Paper sx={{ borderRadius: 2 }}>
          <Box sx={{ px: 2, pt: 1.25, pb: 1 }}>
            <Typography fontWeight={700} fontSize={14}>Items Being Pawned</Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: COL, gap: 1, px: 2, py: 0.75, bgcolor: '#f8f9fa', borderTop: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0' }}>
            {[
              { label: 'Part #',      align: 'left'   },
              { label: 'Photo',       align: 'left'   },
              { label: 'Category',    align: 'left'   },
              { label: 'Item',        align: 'left'   },
              { label: 'Serial #',    align: 'left'   },
              { label: 'Qty',         align: 'center' },
              { label: 'Size',        align: 'center' },
              { label: 'Pawn Amount', align: 'left'   },
              { label: 'Actions',     align: 'right'  },
            ].map(({ label, align }) => (
              <Typography key={label} variant="caption" fontWeight={700} color="text.secondary" sx={{ textAlign: align }}>{label}</Typography>
            ))}
          </Box>

          {pawnItems.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 5, gap: 1 }}>
              <MuiIcons.AddBox sx={{ fontSize: 36, opacity: 0.2 }} />
              <Typography variant="body2" color="text.secondary">Search or scan items above to add them to this pawn ticket</Typography>
            </Box>
          ) : (
            pawnItems.map((row, idx) => (
              <Box key={row.id} sx={{ display: 'grid', gridTemplateColumns: COL, gap: 1, px: 2, py: 0.875, borderBottom: '1px solid #f0f0f0', alignItems: 'center', '&:hover': { bgcolor: '#fafafa' } }}>
                <Typography variant="caption" fontWeight={600} color={PURPLE} sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                  {row.part_number || String(idx + 1).padStart(2, '0')}
                </Typography>
                {(() => {
                  const thumb = row.images?.find(i => i.isPrimary)?.url || row.images?.[0]?.url;
                  return thumb ? (
                    <Box component="img" src={thumb} alt="Item"
                      sx={{ width: 38, height: 38, borderRadius: 1, objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => openItemCamera(row.id)} />
                  ) : (
                    <IconButton size="small"
                      sx={{ width: 38, height: 38, borderRadius: 1, bgcolor: '#f0f0f0', color: '#9e9e9e', '&:hover': { bgcolor: '#e3f2fd', color: '#1976d2' } }}
                      onClick={() => openItemCamera(row.id)}>
                      <MuiIcons.PhotoCamera sx={{ fontSize: 18 }} />
                    </IconButton>
                  );
                })()}
                <Typography variant="caption">{row.category}</Typography>
                <Typography variant="caption" fontWeight={500}>{row.item}</Typography>
                <Typography variant="caption" color="text.secondary">{row.serial || '—'}</Typography>
                <Typography variant="caption" align="center">{row.qty}</Typography>
                <Typography variant="caption" align="center">{row.size || '—'}</Typography>
                <Typography variant="caption" fontWeight={700} color="#2e7d32">{fmt(row.amount)}</Typography>
                <Box sx={{ display: 'flex', gap: 0, alignItems: 'center' }}>
                  <IconButton size="small" sx={{ color: PURPLE }} onClick={() => { setEditingItem(row); setIntakeOpen(true); }}><MuiIcons.Edit sx={{ fontSize: 15 }} /></IconButton>
                  <IconButton size="small" title="Convert" sx={{ color: '#555' }} onClick={(e) => { setConvertAnchor(e.currentTarget); setConvertRow(row); }}><MuiIcons.SwapHoriz sx={{ fontSize: 15 }} /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDeleteItem(row.id)}>
                    <MuiIcons.Delete sx={{ fontSize: 15 }} />
                  </IconButton>
                </Box>
              </Box>
            ))
          )}
        </Paper>

        {/* Bottom three panels */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>

          {/* Pawn Terms */}
          <Paper sx={{ p: 1.75, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
              <MuiIcons.Description sx={{ color: '#3949ab', fontSize: 18 }} />
              <Typography fontWeight={700} fontSize={13}>Pawn Terms</Typography>
            </Box>
            {[
              { label: 'Term (Hours):', value: 'Standard 62-Day Pawn', valueColor: '#2e7d32' },
              { label: 'Interest:',     value: '2%' },
              { label: 'Insurance:',    value: '2%' },
              { label: 'Storage Fee:',  value: '$10.00' },
              { label: 'Due Date:',     value: 'Jul 29, 2026', valueColor: '#2e7d32' },
            ].map(r => (
              <Box key={r.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">{r.label}</Typography>
                <Typography variant="caption" fontWeight={500} color={r.valueColor ?? 'text.primary'}>{r.value}</Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', gap: 0.75, mt: 1.25 }}>
              <Button size="small" variant="outlined" fullWidth sx={{ fontSize: 11, borderRadius: 1.5, textTransform: 'none' }}>Select Pawn Terms</Button>
              <Button size="small" variant="outlined" fullWidth startIcon={<MuiIcons.Settings sx={{ fontSize: 12 }} />}
                sx={{ fontSize: 11, borderRadius: 1.5, textTransform: 'none' }}>Customize Terms</Button>
            </Box>
          </Paper>

          {/* Redemption Details */}
          <Paper sx={{ p: 1.75, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
              <MuiIcons.AttachMoney sx={{ color: '#f59e0b', fontSize: 18 }} />
              <Typography fontWeight={700} fontSize={13}>Redemption Details</Typography>
            </Box>
            {[
              { label: 'Total Pawn Amount:', value: fmt(totalPawnAmount) },
              { label: 'Interest (2%):',     value: fmt(interestAmt)    },
              { label: 'Insurance (2%):',    value: fmt(insuranceAmt)   },
              { label: 'Storage Fee:',       value: fmt(storageFee)     },
            ].map(r => (
              <Box key={r.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">{r.label}</Typography>
                <Typography variant="caption" fontWeight={500}>{r.value}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 0.75 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" fontWeight={700} color="#2e7d32">Total Cost to Redeem:</Typography>
              <Typography variant="caption" fontWeight={700} color="#2e7d32">{fmt(totalToRedeem)}</Typography>
            </Box>
          </Paper>

          {/* Financial Summary */}
          <Paper sx={{ p: 1.75, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
              <MuiIcons.AccountBalanceWallet sx={{ color: PURPLE, fontSize: 18 }} />
              <Typography fontWeight={700} fontSize={13}>Financial Summary</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">Total Pawn Amount</Typography>
            <Typography fontWeight={800} fontSize={30} color={totalPawnAmount > 0 ? '#c62828' : 'text.disabled'} mt={0.5}>
              {fmt(totalPawnAmount)}
            </Typography>
          </Paper>
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
        <IconButton size="small"><MuiIcons.ExpandMore /></IconButton>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Button size="small" variant="outlined" startIcon={<MuiIcons.PriceChange />}
          sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
          Set Total Pawn Amount
        </Button>
        <Button size="small" variant="outlined" startIcon={<MuiIcons.BookmarkBorder />}
          sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
          Save as Quote
        </Button>
        <Button size="small" variant="outlined" color="error" onClick={onClose}
          sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
          Cancel
        </Button>
        <Button size="small" variant="outlined"
          onClick={() => { commitPawnTicketId(); }}
          sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
          Add to Workspace
        </Button>
        <Button size="small" variant="contained" endIcon={<MuiIcons.ArrowForward />}
          onClick={() => { commitPawnTicketId(); }}
          sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontSize: 13, bgcolor: PURPLE, '&:hover': { bgcolor: PURPLE_DARK } }}>
          Checkout Now
        </Button>
      </Paper>

      {/* Camera dialog for item photos */}
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
            sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: PURPLE_DARK }, textTransform: 'none' }}>
            Capture
          </Button>
        </DialogActions>
      </Dialog>

      {/* Convert menu */}
      <Menu anchorEl={convertAnchor} open={Boolean(convertAnchor)} onClose={() => { setConvertAnchor(null); setConvertRow(null); }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1, pb: 0.5, display: 'block', fontWeight: 600, letterSpacing: 0.5 }}>
          CONVERT TO
        </Typography>
        <MenuItem onClick={() => { onConvertTo?.({ type: 'buy', item: convertRow }); setConvertAnchor(null); setConvertRow(null); }}>
          <MuiIcons.ShoppingCart sx={{ fontSize: 16, mr: 1.5, color: '#1976d2' }} />
          <Typography variant="body2">Buy Ticket</Typography>
        </MenuItem>
        <MenuItem onClick={() => { onConvertTo?.({ type: 'trade', item: convertRow }); setConvertAnchor(null); setConvertRow(null); }}>
          <MuiIcons.CompareArrows sx={{ fontSize: 16, mr: 1.5, color: '#388e3c' }} />
          <Typography variant="body2">Trade Ticket</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
}
