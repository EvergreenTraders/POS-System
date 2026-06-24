import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, TextField, Select, MenuItem,
  FormControl, InputLabel, FormHelperText, Chip, Divider, Checkbox, FormControlLabel,
  InputAdornment, Dialog, DialogContent, DialogActions, DialogTitle,
  Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
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
    setStoneWeight(initial?.stoneWeight || initial?.caratWeight || '');
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

  const [gemErrors, setGemErrors] = useState({});

  const handleSave = () => {
    const errs = {};
    if (gemType === 'diamond') {
      if (!shape)   errs.shape   = true;
      if (!cut)     errs.cut     = true;
      if (!clarity) errs.clarity = true;
      if (!color)   errs.color   = true;
    } else {
      if (!stoneType)   errs.stoneType   = true;
      if (!stoneColor)  errs.stoneColor  = true;
      if (!stoneShape)  errs.stoneShape  = true;
      if (!stoneWeight) errs.stoneWeight = true;
    }
    if (Object.keys(errs).length) { setGemErrors(errs); return; }
    setGemErrors({});

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

      <DialogActions sx={{ px: 2, py: 1.25, borderTop: '1px solid #e0e0e0', gap: 1, flexDirection: 'column', alignItems: 'stretch' }}>
        {Object.keys(gemErrors).length > 0 && (
          <Typography variant="caption" color="error" sx={{ mb: 0.5 }}>
            Required: {[
              gemErrors.shape   && 'Shape',
              gemErrors.cut     && 'Cut',
              gemErrors.clarity && 'Clarity',
              gemErrors.color   && 'Color',
              gemErrors.stoneType   && 'Type',
              gemErrors.stoneColor  && 'Color',
              gemErrors.stoneShape  && 'Shape',
              gemErrors.stoneWeight && 'Weight',
            ].filter(Boolean).join(', ')}
          </Typography>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', borderRadius: 2 }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}
          sx={{ textTransform: 'none', borderRadius: 2, bgcolor: GREEN, '&:hover': { bgcolor: DARK_GREEN }, px: 3 }}>
          Save
        </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

export default function JewelryIntakeScreen({
  customer,
  ticketId,
  initialEntry = '',
  parsedValues = null,
  editItem = null,
  onBack,
  onSaveItem,
  onSaveAndAddAnother,
  onUpdateItem,
}) {
  const [images,            setImages]            = useState([]);
  const [selectedImg,       setSelectedImg]       = useState(0);
  const [showCamera,        setShowCamera]        = useState(false);
  const [stream,            setStream]            = useState(null);
  const [isVideoReady,      setIsVideoReady]      = useState(false);
  const [isPopupOpen,       setIsPopupOpen]       = useState(false);
  const [popupImageIndex,   setPopupImageIndex]   = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCameraEnabled,   setIsCameraEnabled]   = useState(false);
  const videoRef          = useRef(null);
  const pendingPurityRef  = useRef(null);
  const parsedAppliedRef  = useRef(false);
  const editAppliedRef    = useRef(false);
  // Metal lookup data from API
  const [preciousMetalTypes,    setPreciousMetalTypes]    = useState([]);
  const [metalCategories,       setMetalCategories]       = useState([]);
  const [metalColors,           setMetalColors]           = useState([]);
  const [metalPurities,         setMetalPurities]         = useState([]);
  const [metalTypeId,           setMetalTypeId]           = useState(null);

  const [itemName,          setItemName]          = useState('');
  const [category,          setCategory]          = useState('');
  const [metal,             setMetal]             = useState('');
  const [purity,            setPurity]            = useState({ id: '', purity: '', value: '' });
  const [colour,            setColour]            = useState('');
  const [grossWeight,       setGrossWeight]       = useState('');
  const [spotPrice,         setSpotPrice]         = useState('');
  const [metalSpotPrices,   setMetalSpotPrices]   = useState({ CADXAU: 0, CADXAG: 0, CADXPT: 0, CADXPD: 0 });
  const [isPerTransaction,  setIsPerTransaction]  = useState(false);
  const [lastFetched,       setLastFetched]       = useState(null);
  const [cachedRates,       setCachedRates]       = useState({});
  const [estMetalValue,        setEstMetalValue]        = useState('');
  const [isMetalValueManual,   setIsMetalValueManual]   = useState(false);
  const [primaryGemDialogOpen, setPrimaryGemDialogOpen] = useState(false);
  const [primaryGem,           setPrimaryGem]           = useState(null);
  const [secondaryGems,        setSecondaryGems]        = useState([]);
  const [gemTab,               setGemTab]               = useState(0);
  const [secGemDialogOpen,     setSecGemDialogOpen]     = useState(false);
  const [editingSecIdx,        setEditingSecIdx]        = useState(null);
  const [mode,              setMode]              = useState('unique');
  const [suggestCatalog,    setSuggestCatalog]    = useState(true);
  const [paidAmount,        setPaidAmount]        = useState('');
  // Pricing
  const [priceEstimatePercentages, setPriceEstimatePercentages] = useState({});
  const [diamondEstimates,         setDiamondEstimates]         = useState([]);
  const [compMetalVal,    setCompMetalVal]    = useState('');
  const [compDiamondVal,  setCompDiamondVal]  = useState('');
  const [compStoneVal,    setCompStoneVal]    = useState('');
  const [pawnPct,  setPawnPct]  = useState('');
  const [buyPct,   setBuyPct]   = useState('');
  const [meltPct,  setMeltPct]  = useState('98');
  const [pawnVal,  setPawnVal]  = useState('');
  const [buyVal,   setBuyVal]   = useState('');
  const [meltVal,  setMeltVal]  = useState('');

  const parsedParts = [category, colour, metal, purity.purity || String(purity.value || '')].filter(Boolean);

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
        const [typesRes, categoriesRes, colorsRes, priceEstRes, diamEstRes, prefsRes] = await Promise.all([
          axios.get(`${config.apiUrl}/precious_metal_type`),
          axios.get(`${config.apiUrl}/metal_category`),
          axios.get(`${config.apiUrl}/metal_color`),
          axios.get(`${config.apiUrl}/price_estimates`),
          axios.get(`${config.apiUrl}/diamond_estimates`),
          axios.get(`${config.apiUrl}/user_preferences`),
        ]);
        const camPref = (prefsRes.data || []).find(p => p.preference_name === 'cameraEnabled');
        setIsCameraEnabled(camPref ? camPref.preference_value === 'true' : false);
        setPreciousMetalTypes(typesRes.data   || []);
        setMetalCategories(categoriesRes.data || []);
        setMetalColors(colorsRes.data         || []);
        setDiamondEstimates(diamEstRes.data   || []);
        const grouped = {};
        (priceEstRes.data || []).forEach(e => {
          if (!grouped[e.precious_metal_type_id]) grouped[e.precious_metal_type_id] = [];
          grouped[e.precious_metal_type_id].push(e);
        });
        setPriceEstimatePercentages(grouped);
      } catch (err) {
        console.error('Error fetching metal data:', err);
      }
    };
    const fetchSpotPricing = async () => {
      try {
        const lpRes = await axios.get(`${config.apiUrl}/live_pricing`);
        const lp = lpRes.data[0] || {};
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
    setColour(value === 'Gold' ? 'Yellow' : '');
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

  // Apply editItem fields once API data is loaded
  useEffect(() => {
    if (!editItem || editAppliedRef.current) return;
    if (!metalCategories.length || !preciousMetalTypes.length) return;
    editAppliedRef.current = true;

    setItemName(editItem.item || '');
    setCategory(editItem.metal_category || '');
    setColour(editItem.jewelry_color || '');
    setGrossWeight(String(editItem.metal_weight || ''));
    setSpotPrice(String(editItem.metal_spot_price || ''));
    setEstMetalValue(String(editItem.est_metal_value || ''));
    setIsMetalValueManual(true);
    setPaidAmount(String(editItem.paid_amount || ''));
    setMode(editItem.mode || 'unique');
    setImages(editItem.images || []);

    const metalValue = editItem.precious_metal_type || '';
    if (metalValue) {
      const typeObj = preciousMetalTypes.find(t => t.type === metalValue);
      setMetal(metalValue);
      setMetalTypeId(typeObj?.id ?? null);
      const isPtPd = metalValue === 'Platinum' || metalValue === 'Palladium';
      pendingPurityRef.current = isPtPd ? editItem.purity_value : editItem.metal_purity;
    }

    if (editItem.primary_gem_category === 'diamond') {
      setPrimaryGem({
        gemType: 'diamond',
        shape: editItem.primary_gem_shape || '',
        clarity: editItem.primary_gem_clarity || '',
        color: editItem.primary_gem_color || '',
        exactColor: editItem.primary_gem_exact_color || '',
        cut: editItem.primary_gem_cut || '',
        caratWeight: String(editItem.primary_gem_weight || ''),
        size: editItem.primary_gem_size || '',
        quantity: editItem.primary_gem_quantity || 1,
        labGrown: editItem.primary_gem_lab_grown || false,
        estValue: String(editItem.primary_gem_value || ''),
      });
    } else if (editItem.primary_gem_category === 'stone') {
      setPrimaryGem({
        gemType: 'stone',
        stoneShape: editItem.primary_gem_shape || '',
        stoneType: editItem.primary_gem_type || '',
        stoneColor: editItem.primary_gem_color || '',
        caratWeight: String(editItem.primary_gem_weight || ''),
        quantity: editItem.primary_gem_quantity || 1,
        authentic: editItem.primary_gem_authentic || false,
        estValue: String(editItem.primary_gem_value || ''),
      });
    }

    if (editItem.secondary_gems?.length) {
      setSecondaryGems(editItem.secondary_gems.map(gem =>
        gem.secondary_gem_category === 'diamond' ? {
          gemType: 'diamond',
          shape: gem.secondary_gem_shape || '',
          clarity: gem.secondary_gem_clarity || '',
          color: gem.secondary_gem_color || '',
          exactColor: gem.secondary_gem_exact_color || '',
          cut: gem.secondary_gem_cut || '',
          caratWeight: String(gem.secondary_gem_weight || ''),
          size: gem.secondary_gem_size || '',
          quantity: gem.secondary_gem_quantity || 1,
          labGrown: gem.secondary_gem_lab_grown || false,
          estValue: String(gem.secondary_gem_value || ''),
        } : {
          gemType: 'stone',
          stoneShape: gem.secondary_gem_shape || '',
          stoneType: gem.secondary_gem_type || '',
          stoneColor: gem.secondary_gem_color || '',
          caratWeight: String(gem.secondary_gem_weight || ''),
          quantity: gem.secondary_gem_quantity || 1,
          authentic: gem.secondary_gem_authentic || false,
          estValue: String(gem.secondary_gem_value || ''),
        }
      ));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItem, metalCategories, preciousMetalTypes]);

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
    if (sp > 0 && pv > 0 && gw > 0) {
      setEstMetalValue((sp * pv * gw).toFixed(2));
    }
  }, [spotPrice, purity.value, grossWeight, isMetalValueManual]);

  // Sync component metal value from calculated estMetalValue
  useEffect(() => { setCompMetalVal(estMetalValue); }, [estMetalValue]);

  // Sync gem component values from primaryGem + secondaryGems
  useEffect(() => {
    const all = [primaryGem, ...secondaryGems].filter(Boolean);
    const dTotal = all.filter(g => g.gemType === 'diamond')
      .reduce((s, g) => s + (parseFloat(g.estValue) || 0), 0);
    const sTotal = all.filter(g => g.gemType !== 'diamond')
      .reduce((s, g) => s + (parseFloat(g.estValue) || 0), 0);
    setCompDiamondVal(dTotal > 0 ? dTotal.toFixed(2) : '');
    setCompStoneVal(sTotal > 0 ? sTotal.toFixed(2) : '');
  }, [primaryGem, secondaryGems]);

  // Load pawn/buy % from API when metalTypeId or percentages load
  useEffect(() => {
    if (!metalTypeId || !Object.keys(priceEstimatePercentages).length) return;
    const ests = priceEstimatePercentages[metalTypeId] || [];
    const pp = ests.find(e => e.transaction_type === 'pawn')?.estimate;
    const bp = ests.find(e => e.transaction_type === 'buy')?.estimate;
    if (pp != null) setPawnPct(String(pp));
    if (bp != null) setBuyPct(String(bp));
  }, [metalTypeId, priceEstimatePercentages]);

  // Recalculate suggested transaction values
  useEffect(() => {
    const metal  = parseFloat(compMetalVal)   || 0;
    const diamond = parseFloat(compDiamondVal) || 0;
    const stone  = parseFloat(compStoneVal)   || 0;
    const total  = metal + diamond + stone;
    if (total <= 0) return;
    const pp = parseFloat(pawnPct) || 0;
    const bp = parseFloat(buyPct)  || 0;
    const mp = parseFloat(meltPct) || 98;
    setPawnVal((total * pp / 100).toFixed(2));
    setBuyVal((total  * bp / 100).toFixed(2));
    setMeltVal((metal * mp / 100).toFixed(2));
  }, [compMetalVal, compDiamondVal, compStoneVal, pawnPct, buyPct, meltPct]);

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
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (images.length > 0 && formErrors.photo) setFormErrors(p => ({ ...p, photo: false }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  function validate() {
    const errs = {};
    if (!category)      errs.category = true;
    if (!metal)         errs.metal    = true;
    const isPtPd = metal === 'Platinum' || metal === 'Palladium';
    if (isPtPd ? !(parseFloat(purity.value) > 0) : !purity.purity) errs.purity = true;
    if (!grossWeight || parseFloat(grossWeight) <= 0) errs.grossWeight = true;
    if (isCameraEnabled && images.length === 0) errs.photo = true;
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function buildItem() {
    const primaryGemFields = !primaryGem ? {} :
      primaryGem.gemType === 'diamond' ? {
        primary_gem_shape:       primaryGem.shape        || '',
        primary_gem_clarity:     primaryGem.clarity      || '',
        primary_gem_color:       primaryGem.color        || '',
        primary_gem_exact_color: primaryGem.exactColor   || '',
        primary_gem_cut:         primaryGem.cut          || '',
        primary_gem_weight:      parseFloat(primaryGem.caratWeight) || 0,
        primary_gem_size:        primaryGem.size         || '',
        primary_gem_quantity:    primaryGem.quantity      || 1,
        primary_gem_lab_grown:   primaryGem.labGrown     || false,
        primary_gem_value:       primaryGem.estValue      || 0,
      } : {
        primary_gem_shape:    primaryGem.stoneShape  || '',
        primary_gem_type:     primaryGem.stoneType   || '',
        primary_gem_color:    primaryGem.stoneColor  || '',
        primary_gem_weight:   parseFloat(primaryGem.caratWeight) || 0,
        primary_gem_quantity: primaryGem.quantity     || 1,
        primary_gem_authentic:primaryGem.authentic    || false,
        primary_gem_value:    primaryGem.estValue      || 0,
      };

    const secondary_gems = secondaryGems.map(gem =>
      gem.gemType === 'diamond' ? {
        secondary_gem_category:    'diamond',
        secondary_gem_shape:       gem.shape       || '',
        secondary_gem_clarity:     gem.clarity     || '',
        secondary_gem_color:       gem.color       || '',
        secondary_gem_exact_color: gem.exactColor  || '',
        secondary_gem_cut:         gem.cut         || '',
        secondary_gem_weight:      parseFloat(gem.caratWeight) || 0,
        secondary_gem_size:        gem.size        || '',
        secondary_gem_quantity:    gem.quantity    || 1,
        secondary_gem_lab_grown:   gem.labGrown    || false,
        secondary_gem_value:       gem.estValue    || 0,
      } : {
        secondary_gem_category: 'stone',
        secondary_gem_shape:    gem.stoneShape  || '',
        secondary_gem_type:     gem.stoneType   || '',
        secondary_gem_color:    gem.stoneColor  || '',
        secondary_gem_weight:   parseFloat(gem.caratWeight) || 0,
        secondary_gem_quantity: gem.quantity    || 1,
        secondary_gem_authentic:gem.authentic   || false,
        secondary_gem_value:    gem.estValue    || 0,
      }
    );

    const purityLabel = purity.purity || String(purity.value || '');
    const shortDesc = [purityLabel, grossWeight ? `${grossWeight}g` : '', metal === 'Gold' ? colour : '', metal, category].filter(Boolean).join(' ');
    const longDesc  = [
      shortDesc,
      primaryGem?.gemType === 'diamond' ? `${primaryGem.shape || ''} Diamond`.trim() : (primaryGem?.stoneName || ''),
      secondaryGems.length ? `with ${secondaryGems.length} secondary gem${secondaryGems.length > 1 ? 's' : ''}` : '',
    ].filter(Boolean).join(' · ');

    return {
      id:             editItem ? editItem.id : Date.now(),
      item:           itemName || shortDesc,
      category,
      serial:         '',
      qty:            1,
      amount:         parseFloat(pawnVal) || parseFloat(paidAmount) || 0,
      // Metal
      precious_metal_type: metal,
      metal_category:      category,
      jewelry_color:       metal === 'Gold' ? colour : '',
      metal_purity:        purity.purity || String(purity.value || ''),
      purity_value:        parseFloat(purity.value) || 0,
      metal_weight:        parseFloat(grossWeight)  || 0,
      metal_spot_price:    parseFloat(spotPrice)    || 0,
      est_metal_value:     estMetalValue            || 0,
      // Primary gem
      primary_gem_category: primaryGem?.gemType || null,
      ...primaryGemFields,
      // Secondary gems
      secondary_gems,
      // Price estimates
      pawn_price:   parseFloat(pawnVal)  || 0,
      buy_price:    parseFloat(buyVal)   || 0,
      melt_value:   parseFloat(meltVal)  || 0,
      paid_amount:  parseFloat(paidAmount) || 0,
      price_estimates: {
        pawn: parseFloat(pawnVal)  || 0,
        buy:  parseFloat(buyVal)   || 0,
        melt: parseFloat(meltVal)  || 0,
      },
      // Images — preserve File objects for upload
      images: images.map(img => ({ url: img.url, isPrimary: img.isPrimary || false, file: img.file, type: img.type })),
      // Descriptions
      short_desc: shortDesc,
      long_desc:  longDesc,
      // Metadata
      sourceEstimator: 'jewelry',
      mode,
    };
  }

  function handleSave() {
    if (!validate()) return;
    if (editItem && onUpdateItem) onUpdateItem(buildItem());
    else onSaveItem(buildItem());
  }

  function handleSaveAndAdd() {
    if (!validate()) return;
    const item = buildItem();
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
          <Paper sx={{ width: '50%', flexShrink: 0, borderRadius: 2, overflow: 'hidden', border: formErrors.photo ? '1px solid #d32f2f' : '1px solid #e0e0e0' }}>

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
                    <MuiIcons.AddAPhoto sx={{ fontSize: 40, color: isCameraEnabled ? '#d32f2f' : '#c0c0c0' }} />
                    <Typography variant="caption" color={isCameraEnabled ? 'error' : 'text.disabled'}>
                      {isCameraEnabled ? 'Photo required *' : 'No photo yet'}
                    </Typography>
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
            <Box sx={{ display: 'flex', gap: 1, p: 1.25, alignItems: 'center' }}>
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
              {formErrors.photo && (
                <Typography variant="caption" color="error" sx={{ ml: 0.5, display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <MuiIcons.ErrorOutline sx={{ fontSize: 13 }} /> Photo required
                </Typography>
              )}
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
            <FormControl size="small" fullWidth error={!!formErrors.category}>
              <InputLabel>Category *</InputLabel>
              <Select value={category} label="Category *" onChange={e => { setCategory(e.target.value); setFormErrors(p => ({ ...p, category: false })); }} sx={{ borderRadius: 2 }}>
                {metalCategories.map(c => <MenuItem key={c.id} value={c.category}>{c.category}</MenuItem>)}
              </Select>
              {formErrors.category && <FormHelperText>Required</FormHelperText>}
            </FormControl>
            <FormControl size="small" fullWidth error={!!formErrors.metal}>
              <InputLabel>Metal *</InputLabel>
              <Select value={metal} label="Metal *" onChange={e => { handleMetalChange(e.target.value); setFormErrors(p => ({ ...p, metal: false })); }} sx={{ borderRadius: 2 }}>
                {preciousMetalTypes.map(t => <MenuItem key={t.id} value={t.type}>{t.type}</MenuItem>)}
              </Select>
              {formErrors.metal && <FormHelperText>Required</FormHelperText>}
            </FormControl>

            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <FormControl size="small" sx={{ flex: 1, minWidth: 0 }} error={!!formErrors.purity}>
                <InputLabel>Purity *</InputLabel>
                <Select value={purity.id} label="Purity *"
                  onChange={e => { handlePurityChange(e.target.value); setFormErrors(p => ({ ...p, purity: false })); }}
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
                {formErrors.purity && <FormHelperText>Required</FormHelperText>}
              </FormControl>
              {metal !== 'Platinum' && metal !== 'Palladium' && (
                <TextField size="small" label="Value" sx={{ width: 80, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  value={purity.value}
                  onChange={e => setPurity(prev => ({ ...prev, value: e.target.value }))}
                  inputProps={{ inputMode: 'decimal', pattern: '[0-9]*\\.?[0-9]*' }}
                />
              )}
            </Box>
            {metal === 'Gold' && (
              <FormControl size="small" fullWidth>
                <InputLabel>Color *</InputLabel>
                <Select value={colour} label="Color *" onChange={e => setColour(e.target.value)} sx={{ borderRadius: 2 }}>
                  {metalColors.map(c => <MenuItem key={c.id} value={c.color}>{c.color}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            <TextField label="Weight *" size="small" value={grossWeight}
              onChange={e => { setGrossWeight(e.target.value); setFormErrors(p => ({ ...p, grossWeight: false })); }}
              error={!!formErrors.grossWeight}
              helperText={formErrors.grossWeight ? 'Required' : ''}
              InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">g</Typography></InputAdornment> }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

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

        {/* ── MIDDLE: Gem tabs ── */}
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 0, overflow: 'hidden', borderLeft: '1px solid #e8e8e8', borderRight: '1px solid #e8e8e8' }}>

          {/* Tab bar */}
          <Tabs value={gemTab} onChange={(_, v) => setGemTab(v)}
            sx={{
              borderBottom: '1px solid #e0e0e0', minHeight: 44, flexShrink: 0,
              '& .MuiTabs-indicator': { bgcolor: GREEN },
            }}>
            <Tab label="Primary Gem" disableRipple
              sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600, minHeight: 44,
                color: gemTab === 0 ? GREEN : 'text.secondary',
                '&.Mui-selected': { color: GREEN } }} />
            <Tab label={`Secondary Gems${secondaryGems.length ? ` (${secondaryGems.length})` : ''}`}
              disabled={!primaryGem} disableRipple
              sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600, minHeight: 44,
                color: gemTab === 1 ? GREEN : 'text.secondary',
                '&.Mui-selected': { color: GREEN } }} />
          </Tabs>

          {/* ── Tab 0: Primary Gem ── */}
          {gemTab === 0 && (
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {/* Action row */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box>
                  <Typography fontWeight={700} fontSize={14}>Primary Gem</Typography>
                  <Typography variant="caption" color="text.secondary">Only one primary gem entry</Typography>
                </Box>
                <Button size="small" variant="outlined"
                  startIcon={<MuiIcons.Edit sx={{ fontSize: 13 }} />}
                  onClick={() => setPrimaryGemDialogOpen(true)}
                  sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5, color: GREEN, borderColor: GREEN + '60' }}>
                  {primaryGem ? 'Edit' : 'Add'}
                </Button>
              </Box>

              {primaryGem ? (
                <>
                  {/* Image + title + weight */}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1.25 }}>
                    {(primaryGem.shapeImage || primaryGem.stoneTypeImage || primaryGem.stoneShapeImage) ? (
                      <Box component="img"
                        src={primaryGem.gemType === 'diamond' ? primaryGem.shapeImage : (primaryGem.stoneTypeImage || primaryGem.stoneShapeImage)}
                        alt={primaryGem.shape || primaryGem.stoneType}
                        sx={{ width: 70, height: 70, objectFit: 'contain', flexShrink: 0 }} />
                    ) : (
                      <Box sx={{ width: 70, height: 70, borderRadius: 2, bgcolor: '#e8eaf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MuiIcons.Diamond sx={{ color: '#5c6bc0', fontSize: 42 }} />
                      </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography fontWeight={700} fontSize={18} color={GREEN}>
                          {primaryGem.gemType === 'diamond' ? 'Diamond' : (primaryGem.stoneName || 'Gemstone')}
                        </Typography>
                        {primaryGem.labGrown && (
                          <Chip label="Lab Grown" size="small" sx={{ height: 20, fontSize: 11, bgcolor: '#e8f5e9', color: GREEN }} />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {primaryGem.gemType === 'diamond'
                          ? `${primaryGem.shape || ''}${primaryGem.cut ? ` · ${primaryGem.cut} Cut` : ''}`
                          : `${primaryGem.stoneColor || ''}${primaryGem.stoneShape ? ` · ${primaryGem.stoneShape}` : ''}`}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', flexShrink: 0, bgcolor: GREEN + '10', borderRadius: 2, px: 2, py: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block">Weight</Typography>
                      <Typography fontWeight={700} fontSize={18} lineHeight={1.1} color={GREEN}>
                        {primaryGem.caratWeight || '0'} ct
                      </Typography>
                    </Box>
                  </Box>

                  {/* Details grid */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid #eeeeee', borderRadius: 1.5, overflow: 'hidden', mb: 1 }}>
                    {(primaryGem.gemType === 'diamond' ? [
                      ['Color',   `${primaryGem.color || '—'}${primaryGem.exactColor ? ` (${primaryGem.exactColor})` : ''}`],
                      ['Clarity', primaryGem.clarity  || '—'],
                      ['Cut',     primaryGem.cut       || '—'],
                      ['Qty',     primaryGem.quantity  || '—'],
                      ['Size',    primaryGem.size      || '—'],
                      ['Lab Grown', primaryGem.labGrown ? 'Yes' : 'No'],
                    ] : [
                      ['Type',      primaryGem.stoneType  || '—'],
                      ['Shape',     primaryGem.stoneShape || '—'],
                      ['Qty',       primaryGem.quantity   || '—'],
                      ['Width',     primaryGem.stoneWidth  ? `${primaryGem.stoneWidth} mm` : '—'],
                      ['Depth',     primaryGem.stoneDepth  ? `${primaryGem.stoneDepth} mm` : '—'],
                      ['Authentic', primaryGem.authentic   ? 'Yes' : 'No'],
                    ]).map(([k, v], i) => (
                      <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', px: 1.5, py: 0.75,
                        bgcolor: i % 2 === 0 ? '#fafafa' : 'white', borderBottom: '1px solid #f0f0f0' }}>
                        <Typography variant="body2" color="text.secondary">{k}</Typography>
                        <Typography variant="body2" fontWeight={500}>{v}</Typography>
                      </Box>
                    ))}
                  </Box>

                  {primaryGem.estValue && (
                    <Box sx={{ pt: 0.75, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Estimated Gem Value</Typography>
                      <Typography fontWeight={700} fontSize={16} color={GREEN}>$ {primaryGem.estValue}</Typography>
                    </Box>
                  )}
                </>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 1 }}>
                  <MuiIcons.Diamond sx={{ color: '#d0d0d0', fontSize: 56 }} />
                  <Typography variant="body1" color="text.secondary" fontWeight={500}>No primary gem added</Typography>
                  <Typography variant="body2" color="text.disabled">Click Add to get started</Typography>
                </Box>
              )}

              <GemEntryDialog
                open={primaryGemDialogOpen}
                onClose={() => setPrimaryGemDialogOpen(false)}
                onSave={handleSavePrimaryGem}
                title="Primary Gem"
                initial={primaryGem}
              />
            </Box>
          )}

          {/* ── Tab 1: Secondary Gems ── */}
          {gemTab === 1 && (
            <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography fontWeight={700} fontSize={14}>Secondary Gems</Typography>
                  <Typography variant="caption" color="text.secondary">May be included even if no value</Typography>
                </Box>
                <Button size="small" variant="outlined"
                  startIcon={<MuiIcons.Add sx={{ fontSize: 13 }} />}
                  onClick={handleAddSecGem}
                  sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5, color: GREEN, borderColor: GREEN + '60' }}>
                  Add Gem
                </Button>
              </Box>

              {secondaryGems.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 1 }}>
                  <MuiIcons.Spa sx={{ color: '#d0d0d0', fontSize: 48 }} />
                  <Typography variant="body1" color="text.secondary" fontWeight={500}>No secondary gems added</Typography>
                  <Typography variant="body2" color="text.disabled">Click Add Gem to include one</Typography>
                </Box>
              ) : (
                <Table size="small" sx={{ borderRadius: 1.5, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary', py: 0.75 }}>Gem</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary', py: 0.75 }}>Qty</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary', py: 0.75 }}>Shape</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary', py: 0.75 }}>Weight</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary', py: 0.75 }}>Value</TableCell>
                      <TableCell sx={{ py: 0.75 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {secondaryGems.map((gem, i) => (
                      <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? 'white' : '#fafafa', '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ py: 0.75 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {gem.gemType === 'diamond' ? 'Diamond' : gem.stoneName || 'Stone'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {gem.gemType === 'diamond' ? gem.color || '' : gem.stoneColor || ''}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.75 }}>{gem.quantity}</TableCell>
                        <TableCell align="center" sx={{ py: 0.75 }}>
                          {gem.gemType === 'diamond' ? (gem.shape || '—') : (gem.stoneShape || '—')}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.75 }}>{gem.caratWeight || gem.weight || '—'} ct</TableCell>
                        <TableCell align="center" sx={{ py: 0.75 }}>{gem.estValue ? `$${gem.estValue}` : '—'}</TableCell>
                        <TableCell align="right" sx={{ py: 0.75, whiteSpace: 'nowrap' }}>
                          <IconButton size="small" onClick={() => handleEditSecGem(i)}><MuiIcons.Edit sx={{ fontSize: 15 }} /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteSecGem(i)}><MuiIcons.Delete sx={{ fontSize: 15 }} /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <GemEntryDialog
                open={secGemDialogOpen}
                onClose={() => setSecGemDialogOpen(false)}
                onSave={handleSaveSecGem}
                title={editingSecIdx !== null ? 'Edit Secondary Gem' : 'Add Secondary Gem'}
                initial={editingSecIdx !== null ? secondaryGems[editingSecIdx] : null}
              />
            </Box>
          )}
        </Paper>

        {/* ── RIGHT: Pricing ── */}
        <Box sx={{ width: 300, bgcolor: 'white', borderLeft: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', overflow: 'auto', p: 2, gap: 1.5, flexShrink: 0 }}>

          <Typography fontWeight={800} fontSize={14} letterSpacing={0.5}>PRICING</Typography>

          {/* Component estimated values table */}
          <Box>
            <Typography fontWeight={700} fontSize={11} letterSpacing={0.5} color="text.secondary" mb={0.75}>ESTIMATED VALUE BY COMPONENT</Typography>
            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1.5, overflow: 'hidden' }}>
              {/* Header */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', px: 1.25, py: 0.75, bgcolor: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" fontSize={11}>Component</Typography>
                <Typography variant="caption" fontWeight={700} color="text.secondary" fontSize={11}>Est. Value</Typography>
              </Box>
              {[
                { label: 'Metal',     val: compMetalVal,   set: setCompMetalVal },
                { label: 'Diamonds',  val: compDiamondVal, set: setCompDiamondVal },
                { label: 'Stones',    val: compStoneVal,   set: setCompStoneVal },
              ].map((row, i) => (
                <Box key={row.label} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', px: 1.25, py: 0.5, borderBottom: '1px solid #f0f0f0', alignItems: 'center' }}>
                  <Typography variant="caption" fontSize={12}>{row.label}</Typography>
                  <TextField
                    size="small" value={row.val}
                    onChange={e => row.set(e.target.value)}
                    placeholder="—"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Typography variant="caption">$</Typography></InputAdornment> }}
                    inputProps={{ inputMode: 'decimal', style: { width: 64, padding: '3px 4px', fontSize: 12 } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, fontSize: 12 }, '& .MuiInputAdornment-root': { mr: 0.25 } }}
                  />
                </Box>
              ))}
              {/* Total row */}
              {(() => {
                const total = (parseFloat(compMetalVal) || 0) + (parseFloat(compDiamondVal) || 0) + (parseFloat(compStoneVal) || 0);
                return (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', px: 1.25, py: 0.75, bgcolor: '#f8f9fa', alignItems: 'center' }}>
                    <Typography variant="caption" fontWeight={700} fontSize={12}>Total</Typography>
                    <Typography variant="caption" fontWeight={700} fontSize={12} sx={{ pr: 0.5 }}>
                      {total > 0 ? `$ ${total.toFixed(2)}` : '—'}
                    </Typography>
                  </Box>
                );
              })()}
            </Box>
          </Box>

          {/* Suggested transaction values */}
          <Box>
            <Typography fontWeight={700} fontSize={11} letterSpacing={0.5} color="text.secondary" mb={0.75}>SUGGESTED TRANSACTION VALUES</Typography>
            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1.5, overflow: 'hidden' }}>
              {/* Header */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '70px 52px 1fr', px: 1.25, py: 0.75, bgcolor: '#f8f9fa', borderBottom: '1px solid #e0e0e0', gap: 1 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" fontSize={11}>Type</Typography>
                <Typography variant="caption" fontWeight={700} color="text.secondary" fontSize={11}>%</Typography>
                <Typography variant="caption" fontWeight={700} color="text.secondary" fontSize={11}>Value</Typography>
              </Box>
              {[
                { label: 'Pawn', pct: pawnPct, setPct: setPawnPct, val: pawnVal, setVal: setPawnVal },
                { label: 'Buy',  pct: buyPct,  setPct: setBuyPct,  val: buyVal,  setVal: setBuyVal  },
                { label: 'Melt', pct: meltPct, setPct: setMeltPct, val: meltVal, setVal: setMeltVal },
              ].map((row, i) => (
                <Box key={row.label} sx={{ display: 'grid', gridTemplateColumns: '70px 52px 1fr', px: 1.25, py: 0.5, borderBottom: i < 2 ? '1px solid #f0f0f0' : 'none', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" fontSize={12} fontWeight={600}>{row.label}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <TextField
                      size="small" value={row.pct}
                      onChange={e => row.setPct(e.target.value)}
                      inputProps={{ inputMode: 'decimal', style: { width: 30, padding: '3px 4px', fontSize: 11, textAlign: 'center' } }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, fontSize: 11 } }}
                    />
                    <Typography variant="caption" color="text.secondary">%</Typography>
                  </Box>
                  <TextField
                    size="small" value={row.val}
                    onChange={e => row.setVal(e.target.value)}
                    placeholder="—"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Typography variant="caption">$</Typography></InputAdornment> }}
                    inputProps={{ inputMode: 'decimal', style: { width: 56, padding: '3px 4px', fontSize: 12 } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, fontSize: 12 }, '& .MuiInputAdornment-root': { mr: 0.25 } }}
                  />
                </Box>
              ))}
            </Box>
          </Box>

          <Divider />


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
        {Object.values(formErrors).some(Boolean) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1, px: 1.5, py: 0.5, bgcolor: '#fff5f5', border: '1px solid #ffcdd2', borderRadius: 1.5 }}>
            <MuiIcons.ErrorOutline sx={{ fontSize: 14, color: '#d32f2f' }} />
            <Typography variant="caption" color="error" fontWeight={500}>
              Required:{' '}
              {[
                formErrors.category    && 'Category',
                formErrors.metal       && 'Metal',
                formErrors.purity      && 'Purity',
                formErrors.grossWeight && 'Weight',
                formErrors.photo       && 'Photo',
              ].filter(Boolean).join(', ')}
            </Typography>
          </Box>
        )}
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
