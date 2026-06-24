import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, TextField, Select, MenuItem,
  FormControl, InputLabel, Chip, Divider, Checkbox, FormControlLabel,
  InputAdornment, Dialog, DialogContent, DialogActions, DialogTitle,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import axios from 'axios';
import config from '../config';
import { RadioGroup, Radio, Slider } from '@mui/material';

const GREEN      = '#2e5c3e';
const DARK_GREEN = '#1a3d28';

// ── Gem entry dialog — mirrors GemEstimator's primary/secondary gem form ──────
const COLOR_SCALE = Array.from({ length: 23 }, (_, i) => String.fromCharCode(68 + i)); // D–Z

function GemEntryDialog({ open, onClose, onSave, title = 'Gem', initial = null }) {
  // ── diamond form state ────────────────────────────────────────────────────
  const [gemType,    setGemType]    = useState('diamond');
  const [shape,      setShape]      = useState('Round');
  const [shapeIdx,   setShapeIdx]   = useState(0);
  const [quantity,   setQuantity]   = useState(1);
  const [size,       setSize]       = useState('');
  const [caratWeight,setCaratWeight]= useState('');
  const [exactColor, setExactColor] = useState('D');
  const [color,      setColor]      = useState('Colorless');
  const [clarity,    setClarity]    = useState('');
  const [clarityIdx, setClarityIdx] = useState(0);
  const [cut,        setCut]        = useState('');
  const [labGrown,   setLabGrown]   = useState(false);

  // ── stone form state ──────────────────────────────────────────────────────
  const [stoneType,    setStoneType]    = useState('');
  const [stoneColorId, setStoneColorId] = useState(null);
  const [stoneColor,   setStoneColor]   = useState('');
  const [stoneShape,   setStoneShape]   = useState('');
  const [stoneWeight,  setStoneWeight]  = useState('');
  const [stoneWidth,   setStoneWidth]   = useState('');
  const [stoneDepth,   setStoneDepth]   = useState('');
  const [stoneQty,     setStoneQty]     = useState(1);
  const [authentic,    setAuthentic]    = useState(false);

  const [estValue, setEstValue] = useState('');

  // ── API data ──────────────────────────────────────────────────────────────
  const [shapes,      setShapes]      = useState([]);
  const [clarities,   setClarities]   = useState([]);
  const [dColors,     setDColors]     = useState([]);
  const [cuts,        setCuts]        = useState([]);
  const [sizes,       setSizes]       = useState([]);
  const [stoneTypes,  setStoneTypes]  = useState([]);
  const [stoneShapes, setStoneShapes] = useState([]);
  const [stoneColors, setStoneColors] = useState([]);

  const fetchSizes = async (shapeId) => {
    try {
      const res = await axios.get(`${config.apiUrl}/diamond_size_weight/${shapeId}`);
      setSizes(res.data || []);
    } catch { setSizes([]); }
  };

  useEffect(() => {
    if (!open) return;

    // reset diamond fields
    const g = initial?.gemType || 'diamond';
    setGemType(g);
    setShape(initial?.shape        || 'Round');
    setQuantity(initial?.quantity  || 1);
    setSize(initial?.size          || '');
    setCaratWeight(initial?.caratWeight || '');
    setExactColor(initial?.exactColor   || 'D');
    setColor(initial?.color        || 'Colorless');
    setClarity(initial?.clarity    || '');
    setCut(initial?.cut            || '');
    setLabGrown(initial?.labGrown  || false);
    // reset stone fields
    setStoneType(initial?.stoneType    || '');
    setStoneColorId(initial?.stoneColorId || null);
    setStoneColor(initial?.stoneColor  || '');
    setStoneShape(initial?.stoneShape  || '');
    setStoneWeight(initial?.stoneWeight || '');
    setStoneWidth(initial?.stoneWidth  || '');
    setStoneDepth(initial?.stoneDepth  || '');
    setStoneQty(initial?.stoneQty      || 1);
    setAuthentic(initial?.authentic    || false);
    setEstValue(initial?.estValue      || '');

    Promise.all([
      axios.get(`${config.apiUrl}/diamond_shape`),
      axios.get(`${config.apiUrl}/diamond_clarity`),
      axios.get(`${config.apiUrl}/diamond_color`),
      axios.get(`${config.apiUrl}/diamond_cut`),
      axios.get(`${config.apiUrl}/stone_types`),
      axios.get(`${config.apiUrl}/stone_shape`),
      axios.get(`${config.apiUrl}/stone_color`),
    ]).then(([ds, cl, dc, cu, st, ss, sc]) => {
      // diamond shapes
      const shapesData = (ds.data || []).map(sh => ({
        id: sh.id, name: sh.shape,
        image: sh.image_path?.replace('.jpg', '.png') || sh.image_path,
      }));
      setShapes(shapesData);
      const initShape = initial?.shape || 'Round';
      const sIdx = shapesData.findIndex(sh => sh.name === initShape);
      const resolvedIdx = sIdx >= 0 ? sIdx : 0;
      setShapeIdx(resolvedIdx);
      if (shapesData[resolvedIdx]) fetchSizes(shapesData[resolvedIdx].id || (resolvedIdx + 1));

      // diamond clarity
      const clarityData = (cl.data || []).map(c => ({ name: c.name, image: c.image_path }));
      setClarities(clarityData);
      const cIdx = clarityData.findIndex(c => c.name === (initial?.clarity || ''));
      setClarityIdx(cIdx >= 0 ? cIdx : 0);
      if (!initial?.clarity && clarityData[0]) setClarity(clarityData[0].name);

      setDColors(dc.data || []);
      setCuts(cu.data    || []);

      // stone
      setStoneTypes(st.data  || []);
      setStoneShapes((ss.data || []).map(s => ({
        name: s.shape,
        image: s.image_path?.replace('.jpg', '.png') || s.image_path,
      })));
      setStoneColors(sc.data || []);
    }).catch(err => console.error('Error fetching gem data:', err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleShapeSelect = (newShape, idx) => {
    setShape(newShape);
    setShapeIdx(idx);
    setSize('');
    setCaratWeight('');
    const shapeId = shapes[idx]?.id || (idx + 1);
    fetchSizes(shapeId);
  };

  const handleDColorCardClick = (c) => {
    const start = c.range?.split('-')[0] || 'D';
    setColor(c.name); setExactColor(start);
  };

  const handleSlider = (_, val) => {
    const ec = COLOR_SCALE[val];
    setExactColor(ec);
    const cat = dColors.find(c => {
      const [s, e] = (c.range || '').split('-');
      return ec >= s && ec <= (e || s);
    });
    if (cat) setColor(cat.name);
  };

  const handleStoneColorClick = (sc) => {
    setStoneColor(sc.color);
    setStoneColorId(sc.id);
    setStoneType(''); // reset type when color changes
  };

  const handleStoneTypeClick = (type) => {
    setStoneType(type);
  };

  const handleSave = () => {
    if (gemType === 'diamond') {
      const shapeImage = shapes[shapeIdx]?.image || null;
      onSave({ gemType, shape, shapeImage, quantity: Number(quantity), size, caratWeight, exactColor, color, clarity, cut, labGrown, estValue });
    } else {
      const name = stoneType === 'Unknown' ? `${stoneColor} Stone` : stoneType;
      const typeObj = stoneTypes.find(s => s.type === stoneType);
      const shapeObj = stoneShapes.find(s => s.name === stoneShape);
      const stoneTypeImage = typeObj?.image_path || null;
      const stoneShapeImage = shapeObj?.image || null;
      onSave({ gemType, stoneType, stoneName: name, stoneColor, stoneColorId, stoneShape, stoneTypeImage, stoneShapeImage, quantity: Number(stoneQty), caratWeight: stoneWeight, stoneWidth, stoneDepth, authentic, estValue });
    }
    onClose();
  };

  const SL = ({ children }) => (
    <Typography variant="subtitle2" fontWeight={700} mb={0.75} mt={1.25}>{children}</Typography>
  );

  const colorSpecificTypes = stoneTypes.filter(s => s.color_id && stoneColorId && s.color_id === stoneColorId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 2, maxHeight: '92vh' } }}>
      <DialogTitle sx={{ py: 1.5, px: 2.5, bgcolor: GREEN, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography fontWeight={700} fontSize={15}>{title}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}><MuiIcons.Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, overflow: 'auto' }}>
        {/* Diamond / Stone toggle */}
        <RadioGroup row value={gemType} onChange={e => setGemType(e.target.value)} sx={{ mb: 1 }}>
          <FormControlLabel value="diamond" control={<Radio size="small" sx={{ color: GREEN, '&.Mui-checked': { color: GREEN } }} />}
            label={<Typography variant="body2" fontWeight={600}>Diamond</Typography>} />
          <FormControlLabel value="stone" control={<Radio size="small" sx={{ color: GREEN, '&.Mui-checked': { color: GREEN } }} />}
            label={<Typography variant="body2" fontWeight={600}>Stone</Typography>} />
        </RadioGroup>

        {gemType === 'diamond' ? (
          <>
            {/* ── Shape ── */}
            <SL>Shape *</SL>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 1 }}>
              {/* Image preview + arrows */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100 }}>
                {shapes.length > 0 && (
                  <>
                    <Box component="img" src={shapes[shapeIdx]?.image} alt={shapes[shapeIdx]?.name}
                      sx={{ width: 80, height: 80, objectFit: 'contain' }} />
                    <Box sx={{ display: 'flex', mt: 0.25 }}>
                      <IconButton size="small" disabled={shapeIdx === 0}
                        onClick={() => handleShapeSelect(shapes[shapeIdx - 1].name, shapeIdx - 1)}>
                        <MuiIcons.ArrowBack fontSize="small" />
                      </IconButton>
                      <IconButton size="small" disabled={shapeIdx === shapes.length - 1}
                        onClick={() => handleShapeSelect(shapes[shapeIdx + 1].name, shapeIdx + 1)}>
                        <MuiIcons.ArrowForward fontSize="small" />
                      </IconButton>
                    </Box>
                  </>
                )}
              </Box>
              {/* Shape dropdown + fields */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Shape</InputLabel>
                  <Select value={shape} label="Shape"
                    onChange={e => { const i = shapes.findIndex(s => s.name === e.target.value); handleShapeSelect(e.target.value, i >= 0 ? i : 0); }}>
                    {shapes.map(s => <MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField label="Qty" type="number" size="small" sx={{ width: 70 }}
                    value={quantity} onChange={e => setQuantity(e.target.value)} inputProps={{ min: 1 }} />
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Size</InputLabel>
                    <Select value={size} label="Size"
                      onChange={e => { const s = sizes.find(sz => sz.size === e.target.value); setSize(e.target.value); if (s) setCaratWeight(String(s.weight)); }}>
                      <MenuItem value=""><em>Select…</em></MenuItem>
                      {sizes.map(s => <MenuItem key={s.size} value={s.size}>{s.size}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField label="Weight (ct)" type="number" size="small" sx={{ flex: 1 }}
                    value={caratWeight} onChange={e => setCaratWeight(e.target.value)} inputProps={{ step: '0.01', min: '0' }} />
                </Box>
              </Box>
            </Box>

            {/* ── Color ── */}
            <SL>Color *</SL>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {dColors.map(c => (
                <Paper key={c.name} elevation={color === c.name ? 8 : 1}
                  onClick={() => handleDColorCardClick(c)}
                  sx={{ p: 0.75, cursor: 'pointer', width: 64, height: 64, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', bgcolor: c.color, borderRadius: 1.5,
                    border: color === c.name ? `2px solid ${GREEN}` : '2px solid transparent' }}>
                  <Typography variant="caption" align="center" fontWeight={600} fontSize={9}>{c.name}</Typography>
                  <Typography variant="caption" align="center" fontSize={8}>{c.range}</Typography>
                </Paper>
              ))}
            </Box>
            <Box sx={{ px: 1, mb: 1.5 }}>
              <Typography variant="body2" gutterBottom>Exact Color: <strong>{exactColor}</strong></Typography>
              <Slider value={COLOR_SCALE.indexOf(exactColor)} onChange={handleSlider}
                step={1} marks min={0} max={COLOR_SCALE.length - 1}
                valueLabelDisplay="auto" valueLabelFormat={v => COLOR_SCALE[v]}
                sx={{ color: GREEN }} />
            </Box>

            {/* ── Clarity ── */}
            <SL>Clarity *</SL>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              {clarities.map((c, i) => (
                <Paper key={c.name} elevation={clarityIdx === i ? 8 : 1}
                  onClick={() => { setClarity(c.name); setClarityIdx(i); }}
                  sx={{ p: 0.75, cursor: 'pointer', width: 64, height: 64, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', borderRadius: 1.5,
                    border: clarityIdx === i ? `2px solid ${GREEN}` : '2px solid transparent' }}>
                  <Box component="img" src={c.image} alt={c.name} sx={{ width: 32, height: 32 }} />
                  <Typography variant="caption" align="center" fontSize={9}>{c.name}</Typography>
                </Paper>
              ))}
            </Box>

            {/* ── Cut + Lab Grown ── */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 0.5 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Cut *</InputLabel>
                <Select value={cut} label="Cut *" onChange={e => setCut(e.target.value)}>
                  {cuts.map(c => <MenuItem key={c.id || c.name} value={c.name}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControlLabel control={<Checkbox checked={labGrown} onChange={e => setLabGrown(e.target.checked)}
                sx={{ color: GREEN, '&.Mui-checked': { color: GREEN } }} />}
                label={<Typography variant="body2">Lab Grown</Typography>} />
            </Box>
          </>
        ) : (
          /* ── Stone form ── */
          <>
            {/* Color picker */}
            <SL>Color *</SL>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden', mb: 1.5 }}>
              {stoneColors.map(sc => (
                <Box key={sc.id} onClick={() => handleStoneColorClick(sc)}
                  sx={{ p: 1.25, cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid #ccc', borderRight: '1px solid #ccc',
                    bgcolor: stoneColorId === sc.id ? 'mediumseagreen' : 'transparent',
                    '&:hover': { bgcolor: stoneColorId === sc.id ? 'mediumseagreen' : '#f0f0f0' } }}>
                  <Typography variant="body2" fontSize={12}>{sc.color}</Typography>
                </Box>
              ))}
            </Box>

            {/* Stone Type */}
            <SL>Type *</SL>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              {/* Unknown option */}
              <Paper elevation={stoneType === 'Unknown' ? 8 : 1}
                onClick={() => handleStoneTypeClick('Unknown')}
                sx={{ p: 0.75, cursor: 'pointer', width: 64, height: 64, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', borderRadius: 1.5,
                  border: stoneType === 'Unknown' ? `2px solid ${GREEN}` : '2px solid transparent' }}>
                <Typography variant="h6" sx={{ fontSize: 28 }}>?</Typography>
                <Typography variant="caption" align="center" fontSize={9}>Unknown</Typography>
              </Paper>
              {colorSpecificTypes.map(st => (
                <Paper key={st.type} elevation={stoneType === st.type ? 8 : 1}
                  onClick={() => handleStoneTypeClick(st.type)}
                  sx={{ p: 0.75, cursor: 'pointer', width: 64, height: 64, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', borderRadius: 1.5,
                    border: stoneType === st.type ? `2px solid ${GREEN}` : '2px solid transparent' }}>
                  <Box component="img" src={st.image_path} alt={st.type} sx={{ width: 32, height: 32 }} />
                  <Typography variant="caption" align="center" fontSize={9}>{st.type}</Typography>
                </Paper>
              ))}
              {!stoneColorId && (
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 1 }}>
                  Select a color first
                </Typography>
              )}
            </Box>

            {/* Stone Shape */}
            <SL>Shape *</SL>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              {stoneShapes.map(ss => (
                <Paper key={ss.name} elevation={stoneShape === ss.name ? 8 : 1}
                  onClick={() => setStoneShape(ss.name)}
                  sx={{ p: 0.75, cursor: 'pointer', width: 64, height: 64, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', borderRadius: 1.5,
                    border: stoneShape === ss.name ? `2px solid ${GREEN}` : '2px solid transparent' }}>
                  <Box component="img" src={ss.image} alt={ss.name} sx={{ width: 32, height: 32 }} />
                  <Typography variant="caption" align="center" fontSize={9}>{ss.name}</Typography>
                </Paper>
              ))}
            </Box>

            {/* Measurements */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField label="Qty" type="number" size="small" sx={{ width: 70 }}
                value={stoneQty} onChange={e => setStoneQty(e.target.value)} inputProps={{ min: 1 }} />
              <TextField label="Weight (ct)" type="number" size="small" sx={{ flex: 1 }}
                value={stoneWeight} onChange={e => setStoneWeight(e.target.value)} inputProps={{ step: '0.01', min: '0' }} />
              <TextField label="Width (mm)" type="number" size="small" sx={{ flex: 1 }}
                value={stoneWidth} onChange={e => setStoneWidth(e.target.value)} inputProps={{ step: '0.1', min: '0' }} />
              <TextField label="Depth (mm)" type="number" size="small" sx={{ flex: 1 }}
                value={stoneDepth} onChange={e => setStoneDepth(e.target.value)} inputProps={{ step: '0.1', min: '0' }} />
            </Box>

            <FormControlLabel control={<Checkbox checked={authentic} onChange={e => setAuthentic(e.target.checked)}
              sx={{ color: GREEN, '&.Mui-checked': { color: GREEN } }} />}
              label={<Typography variant="body2">Genuine / Authentic</Typography>} />
          </>
        )}

        <Divider sx={{ my: 1.25 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} whiteSpace="nowrap">Est. Value $:</Typography>
          <TextField size="small" value={estValue} onChange={e => setEstValue(e.target.value)}
            inputProps={{ inputMode: 'decimal' }} sx={{ width: 140 }} />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.25, borderTop: '1px solid #e0e0e0', gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', borderRadius: 2 }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}
          sx={{ textTransform: 'none', borderRadius: 2, bgcolor: GREEN, '&:hover': { bgcolor: DARK_GREEN }, px: 3 }}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function JewelryIntakeScreen({
  customer,
  ticketId,
  initialEntry = '',
  parsedValues = null,
  onBack,
  onSaveItem,
  onSaveAndAddAnother,
}) {
  const [images,            setImages]            = useState([]);
  const [selectedImg,       setSelectedImg]       = useState(0);
  const [showCamera,        setShowCamera]        = useState(false);
  const [stream,            setStream]            = useState(null);
  const [isVideoReady,      setIsVideoReady]      = useState(false);
  const [isPopupOpen,       setIsPopupOpen]       = useState(false);
  const [popupImageIndex,   setPopupImageIndex]   = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const videoRef          = useRef(null);
  const pendingPurityRef  = useRef(null);
  const parsedAppliedRef  = useRef(false);
  // Metal lookup data from API
  const [preciousMetalTypes,    setPreciousMetalTypes]    = useState([]);
  const [nonPreciousMetalTypes, setNonPreciousMetalTypes] = useState([]);
  const [metalCategories,       setMetalCategories]       = useState([]);
  const [metalColors,           setMetalColors]           = useState([]);
  const [metalPurities,         setMetalPurities]         = useState([]);
  const [metalTypeId,           setMetalTypeId]           = useState(null);

  const [itemName,          setItemName]          = useState('');
  const [category,          setCategory]          = useState('');
  const [metal,             setMetal]             = useState('');
  const [purity,            setPurity]            = useState({ id: '', purity: '', value: '' });
  const [colour,            setColour]            = useState('');
  const [grossWeight,       setGrossWeight]       = useState('6.25');
  const [stoneWeight,       setStoneWeight]       = useState('0.55');
  const [netMetalWeight]                          = useState('5.70');
  const [condition,         setCondition]         = useState('Good');
  const [ringSize,          setRingSize]          = useState('7.5');
  const [shape,             setShape]             = useState('Round');
  const [style,             setStyle]             = useState('Cluster');
  const [spotPrice,         setSpotPrice]         = useState('');
  const [metalSpotPrices,   setMetalSpotPrices]   = useState({ CADXAU: 0, CADXAG: 0, CADXPT: 0, CADXPD: 0 });
  const [isLivePricing,     setIsLivePricing]     = useState(false);
  const [isPerTransaction,  setIsPerTransaction]  = useState(false);
  const [lastFetched,       setLastFetched]       = useState(null);
  const [cachedRates,       setCachedRates]       = useState({});
  const [estimatedYear,     setEstimatedYear]     = useState('');
  const [origin,            setOrigin]            = useState('Unknown');
  const [estMetalValue,        setEstMetalValue]        = useState('');
  const [isMetalValueManual,   setIsMetalValueManual]   = useState(false);
  const [primaryGemDialogOpen, setPrimaryGemDialogOpen] = useState(false);
  const [primaryGem,           setPrimaryGem]           = useState(null);
  const [secondaryGems,        setSecondaryGems]        = useState([]);
  const [secGemDialogOpen,     setSecGemDialogOpen]     = useState(false);
  const [editingSecIdx,        setEditingSecIdx]        = useState(null);
  const [mode,              setMode]              = useState('unique');
  const [suggestCatalog,    setSuggestCatalog]    = useState(true);
  const [paidAmount,        setPaidAmount]        = useState('478.00');

  const parsedParts = [category, colour, metal, purity.purity].filter(Boolean);

  const breadcrumbs = [
    { label: 'Transactions',                    onClick: () => onBack('transactions') },
    { label: `Pawn Ticket (${ticketId ?? '—'})`, onClick: () => onBack('pawn') },
    { label: 'Intake' },
    { label: 'Jewellery Item Intake' },
    { label: 'Unique Jewellery Item', current: true },
  ];

  // ── Metal data fetching (ported from MetalEstimator) ─────────────────────

  const fetchPurities = useCallback(async (typeId) => {
    if (!typeId) return;
    try {
      const res = await axios.get(`${config.apiUrl}/metal_purity/${typeId}`);
      setMetalPurities(res.data || []);
    } catch (err) {
      console.error('Error fetching metal purities:', err);
    }
  }, []);

  useEffect(() => {
    const fetchAllMetalData = async () => {
      try {
        const [typesRes, nonPreciousRes, categoriesRes, colorsRes] = await Promise.all([
          axios.get(`${config.apiUrl}/precious_metal_type`),
          axios.get(`${config.apiUrl}/non_precious_metal_type`),
          axios.get(`${config.apiUrl}/metal_category`),
          axios.get(`${config.apiUrl}/metal_color`),
        ]);
        setPreciousMetalTypes(typesRes.data   || []);
        setNonPreciousMetalTypes(nonPreciousRes.data || []);
        setMetalCategories(categoriesRes.data || []);
        setMetalColors(colorsRes.data         || []);
      } catch (err) {
        console.error('Error fetching metal data:', err);
      }
    };
    const fetchSpotPricing = async () => {
      try {
        const lpRes = await axios.get(`${config.apiUrl}/live_pricing`);
        const lp = lpRes.data[0] || {};
        setIsLivePricing(lp.islivepricing);
        setIsPerTransaction(lp.per_transaction);
        if (lp.islivepricing) {
          if (lp.per_transaction) {
            const res = await axios.get(`${config.apiUrl}/live_spot_prices`);
            const row = res.data[0] || {};
            const mapped = { CADXAU: row.cadxau || 0, CADXAG: row.cadxag || 0, CADXPT: row.cadxpt || 0, CADXPD: row.cadxpd || 0 };
            setMetalSpotPrices(mapped);
            setSpotPrice(String(mapped.CADXAU || ''));
          } else {
            const apiRes = await axios.get('https://api.metalpriceapi.com/v1/latest?api_key=8b7bc38e033b653f05f39fd6dc809ca4&base=CAD&currencies=XPD,XAU,XAG,XPT');
            const rates = apiRes.data.rates;
            const mapped = {
              CADXAU: (rates.CADXAU / 31).toFixed(2),
              CADXAG: (rates.CADXAG / 31).toFixed(2),
              CADXPT: (rates.CADXPT / 31).toFixed(2),
              CADXPD: (rates.CADXPD / 31).toFixed(2),
            };
            setCachedRates(mapped);
            setLastFetched(new Date());
            setMetalSpotPrices(mapped);
            setSpotPrice(String(mapped.CADXAU || ''));
          }
        } else {
          const res = await axios.get(`${config.apiUrl}/spot_prices`);
          const prices = {};
          (res.data || []).forEach(item => { prices[item.precious_metal_type_id] = item.spot_price; });
          const mapped = { CADXAU: prices[1] || 0, CADXAG: prices[3] || 0, CADXPT: prices[2] || 0, CADXPD: prices[4] || 0 };
          setMetalSpotPrices(mapped);
          setSpotPrice(String(mapped.CADXAU || ''));
        }
      } catch (err) {
        console.error('Error fetching spot prices:', err);
      }
    };
    fetchAllMetalData();
    fetchSpotPricing();
  }, []);

  // Fetch purities whenever the selected metal type ID changes
  useEffect(() => {
    if (metalTypeId) fetchPurities(metalTypeId);
    else setMetalPurities([]);
  }, [metalTypeId, fetchPurities]);

  const handleSavePrimaryGem = (gemData) => setPrimaryGem(gemData);

  const handleEditSecGem = (idx) => { setEditingSecIdx(idx); setSecGemDialogOpen(true); };
  const handleAddSecGem  = ()    => { setEditingSecIdx(null); setSecGemDialogOpen(true); };
  const handleSaveSecGem = (gemData) => {
    setSecondaryGems(prev => {
      if (editingSecIdx === null) return [...prev, gemData];
      const next = [...prev]; next[editingSecIdx] = gemData; return next;
    });
  };
  const handleDeleteSecGem = (idx) => setSecondaryGems(prev => prev.filter((_, i) => i !== idx));

  const spotPriceForMetal = (metalType, prices) => {
    switch (metalType) {
      case 'Silver':    return prices.CADXAG;
      case 'Platinum':  return prices.CADXPT;
      case 'Palladium': return prices.CADXPD;
      default:          return prices.CADXAU;
    }
  };

  const handleMetalChange = (value) => {
    setMetal(value);
    setPurity({ id: '', purity: '', value: '' });
    const typeObj = preciousMetalTypes.find(t => t.type === value);
    setMetalTypeId(typeObj?.id ?? null);
    setSpotPrice(String(spotPriceForMetal(value, metalSpotPrices) || ''));
  };

  const applyRates = useCallback((mapped, currentMetal) => {
    setMetalSpotPrices(mapped);
    setSpotPrice(String(spotPriceForMetal(currentMetal || metal, mapped) || ''));
  }, [metal]);

  const fetchLiveSpotPrice = useCallback(async (currentMetal) => {
    try {
      if (isPerTransaction) {
        const res = await axios.get(`${config.apiUrl}/live_spot_prices`);
        const row = res.data[0] || {};
        const mapped = { CADXAU: row.cadxau, CADXAG: row.cadxag, CADXPT: row.cadxpt, CADXPD: row.cadxpd };
        applyRates(mapped, currentMetal);
      } else {
        const now = new Date();
        const hoursDiff = Math.abs(now - lastFetched) / 36e5;
        if (hoursDiff >= 24) {
          const apiRes = await axios.get('https://api.metalpriceapi.com/v1/latest?api_key=8b7bc38e033b653f05f39fd6dc809ca4&base=CAD&currencies=XPD,XAU,XAG,XPT');
          const rates = apiRes.data.rates;
          const mapped = {
            CADXAU: (rates.CADXAU / 31).toFixed(2),
            CADXAG: (rates.CADXAG / 31).toFixed(2),
            CADXPT: (rates.CADXPT / 31).toFixed(2),
            CADXPD: (rates.CADXPD / 31).toFixed(2),
          };
          setCachedRates(mapped);
          setLastFetched(now);
          await axios.put(`${config.apiUrl}/live_spot_prices`, { ...mapped, last_fetched: now.toISOString() });
          applyRates(mapped, currentMetal);
        } else {
          applyRates(cachedRates, currentMetal);
        }
      }
    } catch (err) {
      console.error('Error fetching live spot prices:', err);
    }
  }, [isPerTransaction, lastFetched, cachedRates, applyRates]);

  const handlePurityChange = (selectedId) => {
    const found = metalPurities.find(p => String(p.id) === String(selectedId));
    setPurity(found ? { id: found.id, purity: found.purity, value: found.value } : { id: '', purity: '', value: '' });
  };

  // Apply parsedValues once API data is loaded
  useEffect(() => {
    if (!parsedValues || parsedAppliedRef.current) return;
    if (!metalCategories.length || !metalColors.length || !preciousMetalTypes.length) return;
    parsedAppliedRef.current = true;

    if (parsedValues.category) setCategory(parsedValues.category);
    if (parsedValues.color)    setColour(parsedValues.color);
    if (parsedValues.weight != null) setGrossWeight(String(parsedValues.weight));

    // Build human-readable item name from parsed tokens
    const nameParts = [
      parsedValues.purity  != null ? String(parsedValues.purity)               : null,
      parsedValues.weight  != null ? `${parsedValues.weight}g`                 : null,
      parsedValues.color   ?? null,
      parsedValues.metal   ?? null,
      parsedValues.category ?? null,
    ].filter(Boolean);
    if (nameParts.length) setItemName(nameParts.join(' '));

    if (parsedValues.metal) {
      const matchedType = preciousMetalTypes.find(t => t.type === parsedValues.metal);
      setMetal(parsedValues.metal);
      setPurity({ id: '', purity: '', value: '' });
      setMetalTypeId(matchedType?.id ?? null);
      setSpotPrice(prev => String(spotPriceForMetal(parsedValues.metal, metalSpotPrices) || prev));
      if (parsedValues.purity != null) pendingPurityRef.current = parsedValues.purity;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metalCategories, metalColors, preciousMetalTypes]);

  // Apply pending purity once purities are loaded for selected metal
  useEffect(() => {
    if (!pendingPurityRef.current || !metalPurities.length) return;
    const pending = pendingPurityRef.current;
    pendingPurityRef.current = null;

    let found;
    if (typeof pending === 'string' && pending.match(/^\d+K$/i)) {
      found = metalPurities.find(p => p.purity?.toUpperCase() === pending.toUpperCase());
    } else if (typeof pending === 'number') {
      found = metalPurities.find(p => parseFloat(p.value) === pending);
    } else if (typeof pending === 'string') {
      found = metalPurities.find(p => p.purity?.toLowerCase() === pending.toLowerCase());
    }
    if (found) setPurity({ id: found.id, purity: found.purity, value: found.value });
  }, [metalPurities]);

  // Auto-calculate est. metal value whenever inputs change
  useEffect(() => {
    if (isMetalValueManual) return;
    const sp  = parseFloat(spotPrice);
    const pv  = parseFloat(purity.value);
    const gw  = parseFloat(grossWeight);
    const sw  = parseFloat(stoneWeight) || 0;
    if (sp > 0 && pv > 0 && gw > 0) {
      const net = gw - sw;
      if (net > 0) setEstMetalValue((sp * pv * net).toFixed(2));
    }
  }, [spotPrice, purity.value, grossWeight, stoneWeight, isMetalValueManual]);

  // ──────────────────────────────────────────────────────────────────────────

  // ── Camera / image handlers (ported from JewelEstimator) ─────────────────

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newImages = files.map((file, i) => ({
      file,
      url: URL.createObjectURL(file),
      isPrimary: false,
    }));
    setImages(prev => {
      if (prev.length === 0) newImages[0].isPrimary = true;
      const next = [...prev, ...newImages];
      setSelectedImg(prev.length);
      return next;
    });
    e.target.value = '';
  };

  const startCamera = async () => {
    setIsVideoReady(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access camera. Please check camera permissions.');
    }
  };

  const stopCamera = () => {
    setIsVideoReady(false);
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStream(null);
    setShowCamera(false);
  };

  const captureImage = () => {
    if (!videoRef.current || !isVideoReady) {
      alert('Camera is not ready yet. Please wait a moment.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth  || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) { alert('Failed to capture image. Please try again.'); return; }
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setImages(prev => {
        const newImg = { file, url: URL.createObjectURL(file), type: 'capture', isPrimary: prev.length === 0 };
        setSelectedImg(prev.length);
        return [...prev, newImg];
      });
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      const handleCanPlay = () => setIsVideoReady(true);
      videoRef.current.addEventListener('canplay', handleCanPlay);
      return () => videoRef.current?.removeEventListener('canplay', handleCanPlay);
    }
  }, [stream]);

  // Stop camera on unmount
  useEffect(() => () => { if (stream) stream.getTracks().forEach(t => t.stop()); }, [stream]);

  const openPopup  = (idx) => { setPopupImageIndex(idx); setIsPopupOpen(true); };
  const closePopup = ()    => setIsPopupOpen(false);

  const handleDeleteImage = () => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== popupImageIndex);
      if (popupImageIndex >= next.length && popupImageIndex > 0) setPopupImageIndex(p => p - 1);
      if (selectedImg >= next.length) setSelectedImg(Math.max(0, next.length - 1));
      if (next.length === 0) closePopup();
      return next;
    });
    setShowDeleteConfirm(false);
  };

  const handleMakePrimary = (e) => {
    const checked = e.target.checked;
    setImages(prev => prev.map((img, i) => ({ ...img, isPrimary: checked ? i === popupImageIndex : i === 0 })));
  };

  // ──────────────────────────────────────────────────────────────────────────

  function handleSave() {
    const item = {
      id:           Date.now(),
      item:         itemName,
      category,
      metal,
      colour,
      purity:       purity.purity,
      purity_value: parseFloat(purity.value) || 0,
      amount:       parseFloat(paidAmount) || 0,
      qty:          1,
      serial:       '',
      size:         ringSize,
    };
    onSaveItem(item);
  }

  function handleSaveAndAdd() {
    const item = {
      id:       Date.now(),
      item:     itemName,
      category,
      amount:   parseFloat(paidAmount) || 0,
      qty:      1,
      serial:   '',
      size:     ringSize,
    };
    if (onSaveAndAddAnother) onSaveAndAddAnother(item);
    else onSaveItem(item);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', bgcolor: '#f5f6fa', overflow: 'hidden' }}>

      {/* Breadcrumb bar */}
      <Box sx={{ bgcolor: GREEN, color: 'white', px: 2.5, py: 1, display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <MuiIcons.ChevronRight sx={{ fontSize: 16, opacity: 0.6 }} />}
            <Typography
              variant="body2"
              fontWeight={crumb.current ? 700 : 400}
              onClick={crumb.onClick}
              sx={{
                cursor:  crumb.onClick ? 'pointer' : 'default',
                opacity: crumb.current ? 1 : 0.8,
                '&:hover': crumb.onClick ? { textDecoration: 'underline', opacity: 1 } : {},
              }}
            >
              {crumb.label}
            </Typography>
          </React.Fragment>
        ))}
      </Box>

      {/* Entry + mode bar */}
      <Box sx={{ bgcolor: 'white', px: 2.5, py: 1, display: 'flex', alignItems: 'center', gap: 3, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">Original Entry:</Typography>
          <Typography variant="body2" fontWeight={700} fontFamily="monospace">
            {initialEntry || 'JERIYG10K'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">Parsed As:</Typography>
          {parsedParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Typography variant="body2" color="#ccc">|</Typography>}
              <Typography variant="body2" fontWeight={500}>{part}</Typography>
            </React.Fragment>
          ))}
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">Mode:</Typography>
          <Box sx={{ display: 'flex', border: `1px solid ${GREEN}`, borderRadius: 2, overflow: 'hidden' }}>
            <Button size="small" onClick={() => setMode('unique')}
              startIcon={<MuiIcons.Diamond sx={{ fontSize: 14 }} />}
              sx={{ borderRadius: 0, textTransform: 'none', fontSize: 12, px: 1.5,
                bgcolor: mode === 'unique' ? GREEN : 'transparent', color: mode === 'unique' ? 'white' : GREEN,
                '&:hover': { bgcolor: mode === 'unique' ? DARK_GREEN : '#f0faf4' } }}>
              Unique Item
            </Button>
            <Button size="small" onClick={() => setMode('scrap')}
              startIcon={<MuiIcons.LayersClear sx={{ fontSize: 14 }} />}
              sx={{ borderRadius: 0, textTransform: 'none', fontSize: 12, px: 1.5,
                bgcolor: mode === 'scrap' ? GREEN : 'transparent', color: mode === 'scrap' ? 'white' : GREEN,
                '&:hover': { bgcolor: mode === 'scrap' ? DARK_GREEN : '#f0faf4' } }}>
              Scrap Lot
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Main 3-column content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── LEFT: scrollable form ── */}
        <Box sx={{ width: '41%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e8e8e8', overflow: 'hidden' }}>

          {/* Scrollable form fields */}
          <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>

          {/* Top row: photo (half) + item name / checkbox (half) */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>

          {/* Photo section — half width */}
          <Paper sx={{ width: '50%', flexShrink: 0, borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0' }}>

            {/* Display area — compact when empty, taller when showing content */}
            <Box sx={{ display: 'flex', height: (showCamera || images.length > 0) ? 210 : 90, bgcolor: '#f7f7f7', transition: 'height 0.2s' }}>

              {/* Main view: camera OR image OR placeholder */}
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {showCamera ? (
                  <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                    <Button size="small" variant="contained" startIcon={<MuiIcons.PhotoCamera sx={{ fontSize: 13 }} />}
                      onClick={captureImage}
                      sx={{ textTransform: 'none', fontSize: 12, bgcolor: GREEN, '&:hover': { bgcolor: DARK_GREEN }, borderRadius: 1.5 }}>
                      Capture
                    </Button>
                  </Box>
                ) : images.length > 0 ? (
                  <>
                    <Box component="img" src={images[selectedImg]?.url} alt="Item"
                      onClick={() => openPopup(selectedImg)}
                      sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'pointer' }} />
                    {images.length > 1 && (
                      <IconButton size="small"
                        onClick={() => setSelectedImg(i => (i - 1 + images.length) % images.length)}
                        sx={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.28)', color: 'white', width: 26, height: 26, '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' } }}>
                        <MuiIcons.ChevronLeft fontSize="small" />
                      </IconButton>
                    )}
                    {images.length > 1 && (
                      <IconButton size="small"
                        onClick={() => setSelectedImg(i => (i + 1) % images.length)}
                        sx={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.28)', color: 'white', width: 26, height: 26, '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' } }}>
                        <MuiIcons.ChevronRight fontSize="small" />
                      </IconButton>
                    )}
                  </>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, userSelect: 'none' }}>
                    <MuiIcons.AddAPhoto sx={{ fontSize: 40, color: '#c0c0c0' }} />
                    <Typography variant="caption" color="text.disabled">No photo yet</Typography>
                  </Box>
                )}
              </Box>

              {/* Thumbnail strip — only when images exist */}
              {images.length > 0 && (
                <Box sx={{ width: 62, display: 'flex', flexDirection: 'column', gap: 0.5, p: 0.625, bgcolor: '#ebebeb', borderLeft: '1px solid #e0e0e0', overflowY: 'auto' }}>
                  {images.map((img, i) => (
                    <Box key={i} component="img" src={img.url} alt={`View ${i + 1}`}
                      onClick={() => { setSelectedImg(i); if (showCamera) stopCamera(); }}
                      sx={{ width: '100%', aspectRatio: '1', borderRadius: 1, objectFit: 'cover', flexShrink: 0, cursor: 'pointer',
                        border: i === selectedImg ? `2px solid ${GREEN}` : '2px solid transparent',
                        '&:hover': { borderColor: GREEN } }} />
                  ))}
                </Box>
              )}
            </Box>

            {/* Buttons */}
            <input id="jewelry-upload-input" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileUpload} />
            <Box sx={{ display: 'flex', gap: 1, p: 1.25 }}>
              <Button size="small"
                variant={showCamera ? 'outlined' : 'contained'}
                startIcon={<MuiIcons.PhotoCamera sx={{ fontSize: 13 }} />}
                onClick={showCamera ? stopCamera : startCamera}
                sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5,
                  ...(showCamera ? { color: 'error.main', borderColor: 'error.main' } : { bgcolor: GREEN, '&:hover': { bgcolor: DARK_GREEN } }) }}>
                {showCamera ? 'Stop Camera' : 'Take Photo'}
              </Button>
              <Button size="small" variant="outlined" startIcon={<MuiIcons.Upload sx={{ fontSize: 13 }} />}
                onClick={() => document.getElementById('jewelry-upload-input').click()}
                sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5 }}>
                Upload
              </Button>
            </Box>

            {/* Image popup dialog */}
            {isPopupOpen && images.length > 0 && (
              <Dialog open={isPopupOpen} onClose={closePopup} maxWidth="sm" fullWidth>
                <DialogContent sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                    <IconButton onClick={() => setPopupImageIndex(i => Math.max(0, i - 1))} disabled={popupImageIndex === 0}>
                      <MuiIcons.ChevronLeft />
                    </IconButton>
                    <Box component="img"
                      src={images[Math.min(popupImageIndex, images.length - 1)]?.url}
                      alt="Preview"
                      sx={{ maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain', borderRadius: 1 }} />
                    <IconButton onClick={() => setPopupImageIndex(i => Math.min(images.length - 1, i + 1))} disabled={popupImageIndex >= images.length - 1}>
                      <MuiIcons.ChevronRight />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <Typography variant="caption" color="text.secondary">{popupImageIndex + 1} / {images.length}</Typography>
                    <Button size="small" variant="contained" color="error"
                      startIcon={<MuiIcons.Delete sx={{ fontSize: 14 }} />}
                      onClick={() => setShowDeleteConfirm(true)}
                      sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5 }}>
                      Delete
                    </Button>
                  </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2, py: 1 }}>
                  <Button onClick={closePopup} sx={{ textTransform: 'none' }}>Close</Button>
                </DialogActions>
              </Dialog>
            )}

            {/* Delete confirmation */}
            <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
              <DialogTitle>Delete Image</DialogTitle>
              <DialogContent>
                <Typography>Are you sure you want to delete this image? This cannot be undone.</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowDeleteConfirm(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
                <Button onClick={handleDeleteImage} color="error" variant="contained" sx={{ textTransform: 'none' }}>Delete</Button>
              </DialogActions>
            </Dialog>
          </Paper>

          {/* Right side of top row: item name + checkbox */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField label="Item *" value={itemName} onChange={e => setItemName(e.target.value)}
              size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <FormControlLabel
              control={<Checkbox size="small" checked={suggestCatalog} onChange={e => setSuggestCatalog(e.target.checked)} sx={{ color: GREEN, '&.Mui-checked': { color: GREEN } }} />}
              label={<Typography variant="body2" fontSize={12}>Suggest add to catalog/template</Typography>}
            />
          </Box>
          </Box>{/* end top row */}

          {/* Form grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Category *</InputLabel>
              <Select value={category} label="Category *" onChange={e => setCategory(e.target.value)} sx={{ borderRadius: 2 }}>
                {metalCategories.map(c => <MenuItem key={c.id} value={c.category}>{c.category}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Metal *</InputLabel>
              <Select value={metal} label="Metal *" onChange={e => handleMetalChange(e.target.value)} sx={{ borderRadius: 2 }}>
                {preciousMetalTypes.map(t => <MenuItem key={t.id} value={t.type}>{t.type}</MenuItem>)}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                <InputLabel>Purity *</InputLabel>
                <Select value={purity.id} label="Purity *"
                  onChange={e => handlePurityChange(e.target.value)}
                  sx={{ borderRadius: 2 }} disabled={metalPurities.length === 0}>
                  {metalPurities
                    .filter((p, i, arr) =>
                      metal === 'Platinum' || metal === 'Palladium'
                        ? arr.findIndex(x => x.value === p.value) === i
                        : arr.findIndex(x => x.purity === p.purity) === i
                    )
                    .map(p => (
                      <MenuItem key={p.id} value={p.id}>
                        {metal === 'Platinum' || metal === 'Palladium' ? p.value : p.purity}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              {metal !== 'Platinum' && metal !== 'Palladium' && (
                <TextField size="small" label="Value" sx={{ width: 80, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  value={purity.value}
                  onChange={e => setPurity(prev => ({ ...prev, value: e.target.value }))}
                  inputProps={{ inputMode: 'decimal', pattern: '[0-9]*\\.?[0-9]*' }}
                />
              )}
            </Box>
            <FormControl size="small" fullWidth>
              <InputLabel>Color *</InputLabel>
              <Select value={colour} label="Color *" onChange={e => setColour(e.target.value)} sx={{ borderRadius: 2 }}>
                {metalColors.map(c => <MenuItem key={c.id} value={c.color}>{c.color}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField label="Weight *" size="small" value={grossWeight} onChange={e => setGrossWeight(e.target.value)}
              InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">g</Typography></InputAdornment> }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            
            <FormControl size="small" fullWidth>
              <InputLabel>Condition *</InputLabel>
              <Select value={condition} label="Condition *" onChange={e => setCondition(e.target.value)} sx={{ borderRadius: 2 }}>
                {['Excellent','Very Good','Good','Fair','Poor'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
              <TextField label="Spot Price/gr" size="small" sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                value={spotPrice} onChange={e => setSpotPrice(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
              <Button size="small" variant="outlined" onClick={() => fetchLiveSpotPrice(metal)}
                sx={{ height: 40, minWidth: 0, px: 1.5, borderRadius: 2, whiteSpace: 'nowrap', flexShrink: 0 }}>
                Update
              </Button>
            </Box>
          </Box>

          <TextField
            label="Est. Metal Value"
            size="small"
            fullWidth
            value={estMetalValue}
            onChange={e => { setEstMetalValue(e.target.value); setIsMetalValueManual(true); }}
            onBlur={e => { if (!e.target.value.trim()) setIsMetalValueManual(false); }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            inputProps={{ inputMode: 'decimal' }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          </Box>{/* end scrollable form */}
        </Box>{/* end left column */}

        {/* ── MIDDLE: Description preview + gems ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', p: 2, gap: 2 }}>

          {/* Primary Gem */}
          <Paper sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${primaryGem ? GREEN + '55' : '#e0e0e0'}` }}>
            {/* Header */}
            <Box sx={{ px: 2, py: 1.25, bgcolor: primaryGem ? GREEN + '14' : '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8e8e8' }}>
              <Box>
                <Typography fontWeight={700} fontSize={13}>Primary Gem</Typography>
                <Typography variant="caption" color="text.secondary">Only one primary gem entry</Typography>
              </Box>
              <Button size="small" startIcon={<MuiIcons.Edit sx={{ fontSize: 12 }} />}
                onClick={() => setPrimaryGemDialogOpen(true)}
                sx={{ textTransform: 'none', fontSize: 11, borderRadius: 1.5, color: GREEN, border: `1px solid ${GREEN}40` }}>
                {primaryGem ? 'Edit' : 'Add'}
              </Button>
            </Box>

            {primaryGem ? (
              <Box sx={{ p: 1.75 }}>
                {/* Image + title + weight */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1.25 }}>
                  {/* Gem image */}
                  {(primaryGem.shapeImage || primaryGem.stoneTypeImage || primaryGem.stoneShapeImage) ? (
                    <Box component="img"
                      src={primaryGem.gemType === 'diamond' ? primaryGem.shapeImage : (primaryGem.stoneTypeImage || primaryGem.stoneShapeImage)}
                      alt={primaryGem.shape || primaryGem.stoneType}
                      sx={{ width: 52, height: 52, objectFit: 'contain', flexShrink: 0 }} />
                  ) : (
                    <Box sx={{ width: 52, height: 52, borderRadius: 1.5, bgcolor: '#e8eaf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MuiIcons.Diamond sx={{ color: '#5c6bc0', fontSize: 28 }} />
                    </Box>
                  )}
                  {/* Name + subtitle */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Typography fontWeight={700} fontSize={14} color={GREEN}>
                        {primaryGem.gemType === 'diamond' ? 'Diamond' : (primaryGem.stoneName || 'Gemstone')}
                      </Typography>
                      {primaryGem.labGrown && (
                        <Chip label="Lab Grown" size="small" sx={{ height: 18, fontSize: 10, bgcolor: '#e8f5e9', color: GREEN }} />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {primaryGem.gemType === 'diamond'
                        ? `${primaryGem.shape || ''}${primaryGem.cut ? ` · ${primaryGem.cut} Cut` : ''}`
                        : `${primaryGem.stoneColor || ''}${primaryGem.stoneShape ? ` · ${primaryGem.stoneShape}` : ''}`
                      }
                    </Typography>
                  </Box>
                  {/* Weight callout */}
                  <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Weight</Typography>
                    <Typography fontWeight={800} fontSize={20} lineHeight={1.1} color={GREEN}>
                      {primaryGem.caratWeight || '0'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">ct</Typography>
                  </Box>
                </Box>

                {/* Details grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid #f0f0f0', borderRadius: 1, overflow: 'hidden' }}>
                  {(primaryGem.gemType === 'diamond' ? [
                    ['Color',   `${primaryGem.color || '—'}${primaryGem.exactColor ? ` (${primaryGem.exactColor})` : ''}`],
                    ['Clarity', primaryGem.clarity  || '—'],
                    ['Qty',     primaryGem.quantity  || '—'],
                    ['Size',    primaryGem.size      || '—'],
                  ] : [
                    ['Color',     primaryGem.stoneColor  || '—'],
                    ['Qty',       primaryGem.quantity     || '—'],
                    ['Width',     primaryGem.stoneWidth   ? `${primaryGem.stoneWidth} mm`  : '—'],
                    ['Depth',     primaryGem.stoneDepth   ? `${primaryGem.stoneDepth} mm`  : '—'],
                    ['Authentic', primaryGem.authentic    ? 'Yes' : 'No'],
                  ]).map(([k, v], i) => (
                    <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 0.5,
                      bgcolor: i % 2 === 0 ? '#fafafa' : 'white',
                      borderBottom: '1px solid #f0f0f0' }}>
                      <Typography variant="caption" color="text.secondary">{k}</Typography>
                      <Typography variant="caption" fontWeight={600}>{v}</Typography>
                    </Box>
                  ))}
                </Box>

                {primaryGem.estValue && (
                  <Box sx={{ mt: 1.25, pt: 1, borderTop: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Estimated Gem Value</Typography>
                    <Typography fontWeight={700} fontSize={15} color={GREEN}>$ {primaryGem.estValue}</Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ p: 2.5, textAlign: 'center' }}>
                <MuiIcons.Diamond sx={{ color: '#bdbdbd', fontSize: 34, mb: 0.5 }} />
                <Typography variant="body2" color="text.secondary">No primary gem added</Typography>
                <Typography variant="caption" color="text.disabled">Click Add to get started</Typography>
              </Box>
            )}

            <GemEntryDialog
              open={primaryGemDialogOpen}
              onClose={() => setPrimaryGemDialogOpen(false)}
              onSave={handleSavePrimaryGem}
              title="Primary Gem"
              initial={primaryGem}
            />
          </Paper>

          {/* Secondary Gems */}
          <Paper sx={{ p: 2, borderRadius: 2, flex: 1 }}>
            <Box sx={{ mb: 1.5 }}>
              <Typography fontWeight={700} fontSize={13}>Secondary Gem(s)</Typography>
              <Typography variant="caption" color="text.secondary">(May be included in description even if no value)</Typography>
            </Box>

            {secondaryGems.length === 0 ? (
              <Box sx={{ border: '1px dashed #e0e0e0', borderRadius: 1.5, p: 1.5, textAlign: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.disabled">No secondary gems added</Typography>
              </Box>
            ) : (
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1.5, overflow: 'hidden', mb: 1 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 40px 80px 80px 80px 80px', gap: 1, px: 1.5, py: 0.75, bgcolor: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                  {['Type / Name','Qty','Shape','Carat','Value',''].map(h => (
                    <Typography key={h} variant="caption" fontWeight={700} color="text.secondary">{h}</Typography>
                  ))}
                </Box>
                {secondaryGems.map((gem, i) => (
                  <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 40px 80px 80px 80px 80px', gap: 1, px: 1.5, py: 0.75, borderBottom: i < secondaryGems.length - 1 ? '1px solid #f0f0f0' : 'none', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="caption" fontWeight={600}>{gem.gemType === 'diamond' ? 'Diamond' : gem.stoneName || 'Stone'}</Typography>
                      {gem.color && <Typography variant="caption" color="text.secondary" display="block">{gem.color}</Typography>}
                    </Box>
                    <Typography variant="caption">{gem.quantity}</Typography>
                    <Typography variant="caption">{gem.shape || '—'}</Typography>
                    <Typography variant="caption">{gem.caratWeight || '—'} ct</Typography>
                    <Typography variant="caption">{gem.estValue ? `$${gem.estValue}` : '—'}</Typography>
                    <Box sx={{ display: 'flex', gap: 0 }}>
                      <IconButton size="small" onClick={() => handleEditSecGem(i)}><MuiIcons.Edit sx={{ fontSize: 14 }} /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteSecGem(i)}><MuiIcons.Delete sx={{ fontSize: 14 }} /></IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            <Button size="small" variant="outlined"
              startIcon={<MuiIcons.Add sx={{ fontSize: 13 }} />}
              onClick={handleAddSecGem}
              sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5 }}>
              Add Gem
            </Button>

            <GemEntryDialog
              open={secGemDialogOpen}
              onClose={() => setSecGemDialogOpen(false)}
              onSave={handleSaveSecGem}
              title={editingSecIdx !== null ? 'Edit Secondary Gem' : 'Add Secondary Gem'}
              initial={editingSecIdx !== null ? secondaryGems[editingSecIdx] : null}
            />
          </Paper>
        </Box>

        {/* ── RIGHT: Pricing ── */}
        <Box sx={{ width: 290, bgcolor: 'white', borderLeft: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', overflow: 'auto', p: 2, gap: 1.75, flexShrink: 0 }}>

          <Typography fontWeight={800} fontSize={14} letterSpacing={0.5}>PRICING</Typography>

          {/* Spot price */}
          <Box>
            <Typography variant="body2" fontWeight={600} mb={0.75}>Spot Price</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Per Gram *</Typography>
                <TextField size="small" fullWidth value={spotPrice} onChange={e => setSpotPrice(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Per Ounce *</Typography>
                <TextField size="small" fullWidth
                  value={spotPrice ? (parseFloat(spotPrice) * 31.1035).toFixed(2) : ''}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment>, readOnly: true }}
                  sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Box>
              <Typography variant="body2" color="text.secondary" display="inline">Melt Value </Typography>
              <Typography variant="caption" color="text.disabled">(Metal Only)</Typography>
            </Box>
            <Typography variant="body2" fontWeight={600}>{estMetalValue ? `$ ${estMetalValue}` : '—'}</Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Box>
              <Typography variant="body2" color="text.secondary" display="inline">Suggested Retail </Typography>
              <Typography variant="caption" color="text.disabled">(from formula)</Typography>
            </Box>
            <Typography variant="body2" fontWeight={600}>$ 946.00</Typography>
          </Box>

          <Divider />

          {/* Price calculation table */}
          <Box>
            <Typography fontWeight={700} fontSize={11} letterSpacing={0.5} color="text.secondary" mb={0.75}>PRICE CALCULATION</Typography>
            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1.5, overflow: 'hidden' }}>
              {/* Header */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '72px 44px 60px 40px 58px', gap: 0.5, px: 1, py: 0.75, bgcolor: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                {['Component','Buy/Trade %','Buy/Trade Value','Pawn %','Pawn Value'].map(h => (
                  <Typography key={h} variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: 10, lineHeight: 1.2 }}>{h}</Typography>
                ))}
              </Box>
              {[
                { label: 'Metal',          buyPct: 70, buyVal: 298.00, pawnPct: 50, pawnVal: 213.00 },
                { label: 'Diamonds',       buyPct: 75, buyVal: 180.00, pawnPct: 55, pawnVal: 132.00 },
                { label: 'Stones / Other', buyPct: 0,  buyVal: 0.00,  pawnPct: 0,  pawnVal: 0.00  },
              ].map(row => (
                <Box key={row.label} sx={{ display: 'grid', gridTemplateColumns: '72px 44px 60px 40px 58px', gap: 0.5, px: 1, py: 0.75, borderBottom: '1px solid #f0f0f0', alignItems: 'center' }}>
                  <Typography variant="caption" fontSize={11}>{row.label}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <TextField size="small" defaultValue={row.buyPct}
                      sx={{ width: 32, '& .MuiInputBase-input': { p: '2px 4px', fontSize: 11, textAlign: 'center' }, '& .MuiOutlinedInput-root': { borderRadius: 1 } }} />
                    <Typography variant="caption" color="text.secondary">%</Typography>
                  </Box>
                  <Typography variant="caption" fontWeight={500} fontSize={11}>$ {row.buyVal.toFixed(2)}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <TextField size="small" defaultValue={row.pawnPct}
                      sx={{ width: 32, '& .MuiInputBase-input': { p: '2px 4px', fontSize: 11, textAlign: 'center' }, '& .MuiOutlinedInput-root': { borderRadius: 1 } }} />
                    <Typography variant="caption" color="text.secondary">%</Typography>
                  </Box>
                  <Typography variant="caption" fontWeight={500} fontSize={11}>$ {row.pawnVal.toFixed(2)}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" fontWeight={600} fontSize={12}>Suggested Buy/Trade Total</Typography>
            <Typography variant="body2" fontWeight={700}>$ 478.00</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" fontWeight={600} fontSize={12}>Suggested Pawn Total</Typography>
            <Typography variant="body2" fontWeight={700}>$ 345.00</Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="body2" fontWeight={600} mb={0.75}>Paid Amount *</Typography>
            <TextField size="small" fullWidth value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
          </Box>
        </Box>
      </Box>

      {/* Bottom action bar */}
      <Paper sx={{ px: 2, py: 1.25, borderRadius: 0, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight={600} color="text.secondary">Initial Route:</Typography>
          <Typography variant="body2">Jewellery Triage &gt; Gold</Typography>
          <Button size="small" variant="outlined" startIcon={<MuiIcons.Edit sx={{ fontSize: 12 }} />}
            sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5, py: 0.25, borderColor: '#ccc', color: 'text.primary' }}>
            Change
          </Button>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="outlined" color="inherit" onClick={() => onBack('pawn')}
          sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
          Cancel
        </Button>
        <Button size="small" variant="outlined" onClick={() => onBack('pawn')}
          sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
          Back to Results
        </Button>
        <Button size="small" variant="contained" onClick={handleSave}
          sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13, bgcolor: GREEN, '&:hover': { bgcolor: DARK_GREEN } }}>
          Save Item to Ticket
        </Button>
      </Paper>
    </Box>
  );
}
