import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, TextField, Select, MenuItem,
  FormControl, InputLabel, Chip, Divider, Checkbox, FormControlLabel,
  InputAdornment,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';

const GREEN      = '#2e5c3e';
const DARK_GREEN = '#1a3d28';

export default function JewelryIntakeScreen({
  customer,
  ticketId,
  initialEntry = '',
  onBack,
  onSaveItem,
  onSaveAndAddAnother,
}) {
  const [itemName,          setItemName]          = useState('10K Yellow Gold Ring');
  const [category,          setCategory]          = useState('Ring');
  const [metal,             setMetal]             = useState('Gold');
  const [purity,            setPurity]            = useState('10K (41.7%)');
  const [colour,            setColour]            = useState('Yellow');
  const [grossWeight,       setGrossWeight]       = useState('6.25');
  const [stoneWeight,       setStoneWeight]       = useState('0.55');
  const [netMetalWeight]                          = useState('5.70');
  const [condition,         setCondition]         = useState('Good');
  const [ringSize,          setRingSize]          = useState('7.5');
  const [shape,             setShape]             = useState('Round');
  const [style,             setStyle]             = useState('Cluster');
  const [additionalMarkings,setAdditionalMarkings]= useState('');
  const [estimatedYear,     setEstimatedYear]     = useState('');
  const [origin,            setOrigin]            = useState('Unknown');
  const [notes,             setNotes]             = useState('');
  const [mode,              setMode]              = useState('unique');
  const [suggestCatalog,    setSuggestCatalog]    = useState(true);
  const [paidAmount,        setPaidAmount]        = useState('478.00');

  const secondaryGems = [
    { type: 'Ruby', qty: 12, shape: 'Round', color: '#dc2626', bg: '#fee2e2' },
    { type: 'CZ',   qty: 18, shape: 'Round', color: '#9ca3af', bg: '#f3f4f6' },
  ];

  const parsedParts = ['Ring', 'Yellow Gold', 'Gold', '10K'];

  const breadcrumbs = [
    { label: 'Transactions',                    onClick: () => onBack('transactions') },
    { label: `Pawn Ticket (${ticketId ?? '—'})`, onClick: () => onBack('pawn') },
    { label: 'Intake' },
    { label: 'Jewellery Item Intake' },
    { label: 'Unique Jewellery Item', current: true },
  ];

  function handleSave() {
    const item = {
      id:       Date.now(),
      item:     itemName,
      category,
      amount:   parseFloat(paidAmount) || 0,
      qty:      1,
      serial:   '',
      size:     ringSize,
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

        {/* ── LEFT: Photo + form ── */}
        <Box sx={{ width: '41%', display: 'flex', flexDirection: 'column', overflow: 'auto', p: 2, gap: 1.5, borderRight: '1px solid #e8e8e8' }}>

          {/* Photo carousel */}
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ position: 'relative', bgcolor: '#1e1e1e', height: 190, display: 'flex' }}>
              {/* Main photo area */}
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MuiIcons.DiamondOutlined sx={{ fontSize: 72, color: '#555' }} />
              </Box>
              {/* Thumbnail strip */}
              <Box sx={{ width: 56, display: 'flex', flexDirection: 'column', gap: 0.5, p: 0.75, bgcolor: '#161616' }}>
                {[0, 1, 2].map(i => (
                  <Box key={i} sx={{ width: '100%', aspectRatio: '1', borderRadius: 1, bgcolor: '#333',
                    border: i === 0 ? '2px solid white' : '1px solid #444', flexShrink: 0 }} />
                ))}
              </Box>
              <IconButton size="small" sx={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(255,255,255,0.12)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }}>
                <MuiIcons.ChevronLeft fontSize="small" />
              </IconButton>
              <IconButton size="small" sx={{ position: 'absolute', right: 64, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(255,255,255,0.12)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }}>
                <MuiIcons.ChevronRight fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, p: 1.25 }}>
              <Button size="small" variant="contained" startIcon={<MuiIcons.PhotoCamera sx={{ fontSize: 13 }} />}
                sx={{ textTransform: 'none', fontSize: 12, bgcolor: GREEN, '&:hover': { bgcolor: DARK_GREEN }, borderRadius: 1.5 }}>
                Take Photo
              </Button>
              <Button size="small" variant="outlined" startIcon={<MuiIcons.Upload sx={{ fontSize: 13 }} />}
                sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5 }}>
                Upload
              </Button>
              <Button size="small" variant="outlined" startIcon={<MuiIcons.Add sx={{ fontSize: 13 }} />}
                sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5 }}>
                Add View
              </Button>
            </Box>
          </Paper>

          {/* Item name */}
          <TextField label="Item *" value={itemName} onChange={e => setItemName(e.target.value)}
            size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

          <FormControlLabel
            control={<Checkbox size="small" checked={suggestCatalog} onChange={e => setSuggestCatalog(e.target.checked)} sx={{ color: GREEN, '&.Mui-checked': { color: GREEN } }} />}
            label={<Typography variant="body2">Suggest add to catalog/template</Typography>}
            sx={{ mt: -0.5 }}
          />

          {/* Form grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Category *</InputLabel>
              <Select value={category} label="Category *" onChange={e => setCategory(e.target.value)} sx={{ borderRadius: 2 }}>
                {['Ring','Necklace','Bracelet','Earrings','Watch','Brooch','Pendant','Other'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Metal *</InputLabel>
              <Select value={metal} label="Metal *" onChange={e => setMetal(e.target.value)} sx={{ borderRadius: 2 }}>
                {['Gold','Silver','Platinum','White Gold','Rose Gold','Palladium','Titanium','Stainless Steel'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel>Purity *</InputLabel>
              <Select value={purity} label="Purity *" onChange={e => setPurity(e.target.value)} sx={{ borderRadius: 2 }}>
                {['24K (99.9%)','22K (91.7%)','18K (75%)','14K (58.3%)','10K (41.7%)','9K (37.5%)','Sterling (92.5%)'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Colour *</InputLabel>
              <Select value={colour} label="Colour *" onChange={e => setColour(e.target.value)} sx={{ borderRadius: 2 }}>
                {['Yellow','White','Rose','Two-tone','Tri-tone'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField label="Gross Weight *" size="small" value={grossWeight} onChange={e => setGrossWeight(e.target.value)}
              InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">g</Typography></InputAdornment> }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField label="Estimated Stone Weight *" size="small" value={stoneWeight} onChange={e => setStoneWeight(e.target.value)}
              InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">g</Typography></InputAdornment> }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

            <TextField label="Net Metal Weight" size="small" value={netMetalWeight} disabled
              InputProps={{ endAdornment: <InputAdornment position="end"><MuiIcons.Lock sx={{ fontSize: 13, color: 'text.disabled' }} /></InputAdornment> }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <FormControl size="small" fullWidth>
              <InputLabel>Condition *</InputLabel>
              <Select value={condition} label="Condition *" onChange={e => setCondition(e.target.value)} sx={{ borderRadius: 2 }}>
                {['Excellent','Very Good','Good','Fair','Poor'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField label="Ring Size" size="small" value={ringSize} onChange={e => setRingSize(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <FormControl size="small" fullWidth>
              <InputLabel>Shape *</InputLabel>
              <Select value={shape} label="Shape *" onChange={e => setShape(e.target.value)} sx={{ borderRadius: 2 }}>
                {['Round','Princess','Oval','Marquise','Cushion','Emerald','Pear','Radiant','Asscher','Heart'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField label="Style" size="small" value={style} onChange={e => setStyle(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <Box />

            {/* Hallmark row — chip + dropdown */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip label="10K" size="small" onDelete={() => {}} sx={{ fontWeight: 600, height: 24 }} />
              <FormControl size="small" sx={{ flex: 1 }}>
                <Select displayEmpty renderValue={() => <Typography variant="caption" color="text.disabled">Add hallmark…</Typography>} sx={{ borderRadius: 2 }}>
                  {['10K','14K','18K','925','750','999'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <TextField label="Additional Markings" size="small" value={additionalMarkings} onChange={e => setAdditionalMarkings(e.target.value)}
              placeholder="e.g. Maker's mark" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

            <TextField label="Estimated Year" size="small" value={estimatedYear} onChange={e => setEstimatedYear(e.target.value)}
              placeholder="e.g. 2000" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <FormControl size="small" fullWidth>
              <InputLabel>Origin</InputLabel>
              <Select value={origin} label="Origin" onChange={e => setOrigin(e.target.value)} sx={{ borderRadius: 2 }}>
                {['Unknown','Canada','USA','Italy','France','UK','China','India','Japan'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <TextField label="Notes" size="small" fullWidth multiline rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Add any additional notes about this item…"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </Box>

        {/* ── MIDDLE: Description preview + gems ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', p: 2, gap: 2 }}>

          {/* Description Preview */}
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography fontWeight={700} fontSize={13}>Description Preview</Typography>
              <Typography variant="caption" color="text.secondary">(Only one primary gem entry)</Typography>
            </Box>

            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1.5, p: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#e8eaf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MuiIcons.Diamond sx={{ color: '#3949ab', fontSize: 24 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} color={GREEN} mb={1}>{itemName}</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 0.5, alignItems: 'start' }}>
                    <Box>
                      {[['Quantity:', '1'],['Shape:', 'Round'],['Cut:', 'Very Good']].map(([k, v]) => (
                        <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                          <Typography variant="caption" color="text.secondary">{k}</Typography>
                          <Typography variant="caption" fontWeight={600}>{v}</Typography>
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: 1.5, gap: 0.25 }}>
                      <Typography variant="caption" color="text.secondary" noWrap>Total Carat:</Typography>
                      <Typography fontWeight={800} fontSize={18} lineHeight={1}>0.35</Typography>
                      <Typography variant="caption" color="text.secondary">Ct</Typography>
                    </Box>
                    <Box>
                      {[['Colour:', 'G-H'],['Clarity:', 'SI1']].map(([k, v]) => (
                        <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                          <Typography variant="caption" color="text.secondary">{k}</Typography>
                          <Typography variant="caption" fontWeight={600}>{v}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 1.25 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Estimated Gem Value</Typography>
                  <Typography fontWeight={700} fontSize={16}>$ 180.00</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Applied Value</Typography>
                  <Typography fontWeight={700} fontSize={16}>$ 180.00</Typography>
                </Box>
              </Box>
            </Box>

            <Button size="small" variant="outlined"
              startIcon={<MuiIcons.Edit sx={{ fontSize: 13 }} />}
              sx={{ mt: 1.5, textTransform: 'none', fontSize: 12, borderRadius: 1.5, borderColor: '#ccc', color: 'text.primary' }}>
              Edit Primary Gem
            </Button>
          </Paper>

          {/* Secondary Gems */}
          <Paper sx={{ p: 2, borderRadius: 2, flex: 1 }}>
            <Box sx={{ mb: 1.5 }}>
              <Typography fontWeight={700} fontSize={13}>Secondary Gem(s)</Typography>
              <Typography variant="caption" color="text.secondary">(May be included in description even if no value)</Typography>
            </Box>

            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1.5, overflow: 'hidden' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '70px 50px 80px 1fr 130px 90px', gap: 1, px: 1.5, py: 0.75, bgcolor: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                {['Type','Qty','Shape','Est. Total Carat','Manual Value','Actions'].map(h => (
                  <Typography key={h} variant="caption" fontWeight={700} color="text.secondary">{h}</Typography>
                ))}
              </Box>
              {secondaryGems.map((gem, i) => (
                <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '70px 50px 80px 1fr 130px 90px', gap: 1, px: 1.5, py: 0.875, borderBottom: i < secondaryGems.length - 1 ? '1px solid #f0f0f0' : 'none', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: gem.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: gem.color }} />
                    </Box>
                    <Typography variant="caption">{gem.type}</Typography>
                  </Box>
                  <Typography variant="caption">{gem.qty}</Typography>
                  <Typography variant="caption">{gem.shape}</Typography>
                  <Typography variant="caption" color="text.secondary">—</Typography>
                  <Box>
                    <Typography variant="caption" display="block">$ 0.00</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Description only</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0 }}>
                    <IconButton size="small"><MuiIcons.Edit sx={{ fontSize: 14 }} /></IconButton>
                    <IconButton size="small"><MuiIcons.ContentCopy sx={{ fontSize: 14 }} /></IconButton>
                    <IconButton size="small" color="error"><MuiIcons.Delete sx={{ fontSize: 14 }} /></IconButton>
                  </Box>
                </Box>
              ))}
            </Box>

            <Button size="small" variant="outlined"
              startIcon={<MuiIcons.Add sx={{ fontSize: 13 }} />}
              sx={{ mt: 1.5, textTransform: 'none', fontSize: 12, borderRadius: 1.5 }}>
              Add Gem
            </Button>
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
                <TextField size="small" fullWidth defaultValue="52.30"
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Per Ounce *</Typography>
                <TextField size="small" fullWidth defaultValue="1,626.00"
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Box>
              <Typography variant="body2" color="text.secondary" display="inline">Melt Value </Typography>
              <Typography variant="caption" color="text.disabled">(Metal Only)</Typography>
            </Box>
            <Typography variant="body2" fontWeight={600}>$ 426.00</Typography>
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
        <Button size="small" variant="contained" onClick={handleSaveAndAdd}
          sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13, bgcolor: GREEN, '&:hover': { bgcolor: DARK_GREEN } }}>
          Save + Add Another
        </Button>
      </Paper>
    </Box>
  );
}
