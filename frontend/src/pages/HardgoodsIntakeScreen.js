import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, TextField, Select, MenuItem,
  FormControl, InputLabel, FormHelperText, Chip, Divider, Checkbox, FormControlLabel,
  InputAdornment, Tabs, Tab, Tooltip, Autocomplete,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import axios from 'axios';
import config from '../config';

const GREEN      = '#2e5c3e';
const DARK_GREEN = '#1a3d28';

const CONDITION_OPTIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor', 'Damaged'];
const COLOUR_OPTIONS = ['Black', 'White', 'Silver', 'Gold', 'Blue', 'Red', 'Green', 'Grey', 'Brown', 'Multi-color'];
const PROCESSING_ROUTES = ['Hardgoods Processing', 'Repair Queue', 'Direct to Floor', 'Manager Review Queue'];
const DEFAULT_VIEWS = ['Front', 'Back', 'Serial', 'Damage'];
// Single-item intake creates Piece/Unit records; Stock and Bucket need stock SKU /
// bucket records that intake doesn't create yet.
const INTAKE_MODES = ['PIECE', 'UNIT'];
const SUGGESTION_TYPES = [
  { key: 'buy',    label: 'Buy' },
  { key: 'pawn',   label: 'Pawn' },
  { key: 'trade',  label: 'Trade' },
  { key: 'retail', label: 'Retail' },
];

function StatCard({ icon, label, value, sub, width = 92 }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, border: '1px solid #e0e0e0', borderRadius: 2, px: 0.875, py: 0.625, width, flexShrink: 0, overflow: 'hidden' }}>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ lineHeight: 1.2, fontSize: 11 }}>{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, '& .MuiSvgIcon-root': { fontSize: 17, flexShrink: 0 } }}>
        {icon}
        <Typography variant="body2" fontWeight={700} noWrap sx={{ lineHeight: 1.2 }}>{value}</Typography>
      </Box>
      {sub && <Typography variant="caption" color="text.disabled" noWrap sx={{ lineHeight: 1.2 }}>{sub}</Typography>}
    </Box>
  );
}

export default function HardgoodsIntakeScreen({
  customer,
  ticketId,
  ticketLabel = 'Buy Ticket',
  initialEntry = '',
  editItem = null,
  matchPrefill = null,
  readOnly = false,
  onBack,
  onSaveItem,
  onSaveAndAddAnother,
  onUpdateItem,
  onChangeMatch,
}) {
  const editAttr = (key) => editItem?.attributes?.find(a => a.field_key === key)?.field_value;

  // matchPrefill is the full Catalog Item (GET /api/catalog-items/:id) chosen in
  // Find Matching Item. Its current values PREFILL this intake; the employee may
  // override anything for the item in front of them, and the saved inventory
  // record keeps its own snapshot, linked back only by catalog_item_id.
  const catalogSource = editItem ? null : matchPrefill;
  const [linkedCatalog, setLinkedCatalog] = useState(() => {
    if (editItem?.catalog_item_id) {
      return { id: editItem.catalog_item_id, catalog_code: editItem.catalog_code, friendly_code: editItem.catalog_friendly_code, title: editItem.catalog_title, pricing: editItem.catalog_pricing || null };
    }
    if (catalogSource) {
      return { id: catalogSource.id, catalog_code: catalogSource.catalog_code, friendly_code: catalogSource.friendly_code, title: catalogSource.title, pricing: catalogSource.pricing };
    }
    return null;
  });
  // field_key → value the catalog prefilled, so the UI can tell "from catalog"
  // apart from "overridden for this item". Carried on the ticket item so an
  // edit later still shows the same markers.
  const [catalogPrefill, setCatalogPrefill] = useState(() => {
    if (editItem) return editItem.catalog_prefill || {};
    if (!catalogSource) return {};
    const values = { item: catalogSource.title || '', brand: catalogSource.make_brand || '', model: catalogSource.model_name || '' };
    // Brand/Model come from the Catalog Item's core make_brand/model_name; a
    // same-keyed Field Library value must not shadow them (intake hides those
    // Field Library fields in favour of its fixed core inputs).
    (catalogSource.field_values || []).forEach(f => {
      if (['item', 'brand', 'model', 'type'].includes(f.field_key)) return;
      if (f.value !== null && f.value !== '') values[f.field_key] = f.value;
    });
    return values;
  });

  const [itemName,     setItemName]     = useState(editItem?.item || editItem?.short_desc || catalogSource?.title || initialEntry || '');
  const [brand,        setBrand]        = useState(editItem?.brand || editAttr('brand') || catalogSource?.make_brand || '');
  const [model,        setModel]        = useState(editItem?.model || editAttr('model') || catalogSource?.model_name || '');
  const [itemType,     setItemType]     = useState(editItem?.type || editAttr('type') || '');
  const [serialNumber, setSerialNumber] = useState(editItem?.serial || editItem?.serial_number || '');
  const [condition,    setCondition]    = useState(editItem?.condition || '');
  // Catalog default_inventory_mode is the default, when intake supports it.
  const [inventoryMode, setInventoryMode] = useState(() => {
    const preferred = editItem?.mode || catalogSource?.default_inventory_mode;
    return INTAKE_MODES.includes(preferred) ? preferred : 'PIECE';
  });
  const [inventoryModes, setInventoryModes] = useState([]);
  const [colour,       setColour]       = useState(editItem?.colour || '');
  const [year,         setYear]         = useState(editItem?.year || '');
  const [notes,        setNotes]        = useState(editItem?.notes || '');
  const [accessories,  setAccessories]  = useState(editItem?.accessories || []);
  const [newAccessory, setNewAccessory] = useState('');
  const [suggestCatalog, setSuggestCatalog] = useState(false);

  const [categories, setCategories]   = useState([]);
  // A catalog-linked item takes its Category from the Catalog Item (structural).
  const [category,   setCategory]     = useState(editItem?.category_id || catalogSource?.category_id || '');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(!editItem?.category_id && !catalogSource?.category_id);
  const [categoryFields, setCategoryFields] = useState([]);
  const [categoryFieldValues, setCategoryFieldValues] = useState({});

  const [views, setViews] = useState(() => {
    const base = DEFAULT_VIEWS.map(label => ({ label, image: null }));
    (editItem?.images || []).forEach((img, idx) => {
      const target = base.find(v => v.label === img.label) || base[idx] || base[0];
      if (target) target.image = { url: img.url, file: img.file };
    });
    return base;
  });
  const [activeView, setActiveView] = useState(0);
  const [addViewOpen, setAddViewOpen] = useState(false);
  const [newViewLabel, setNewViewLabel] = useState('');

  const [selectedSuggestion, setSelectedSuggestion] = useState('buy');
  const [paidAmount,   setPaidAmount]   = useState(editItem?.paid_amount != null ? String(editItem.paid_amount) : (editItem?.amount != null ? String(editItem.amount) : ''));
  // Suggested Values are shown as a low–high range (like the mockup's "$250 - $325"),
  // staff-entered rather than computed — there's no market-pricing data source to
  // derive a real range from. Only the low end feeds the persisted single-value
  // price columns; the high end is just a suggestion aid.
  const [suggestions, setSuggestions] = useState(() => {
    const seed = (single) => ({ low: single != null ? String(single) : '', high: '' });
    // Catalog Suggested Retail, when set, is the retail suggestion (doc §7).
    // Buy/Pawn are NOT derived from Suggested Cost: that needs Category Buy%/
    // Pawn% configuration, which doesn't exist yet.
    return {
      buy:    seed(editItem?.buy_price),
      pawn:   seed(editItem?.pawn_price),
      trade:  seed(editItem?.trade_price),
      retail: seed(editItem?.retail_price ?? catalogSource?.pricing?.suggested_retail),
    };
  });
  const updateSuggestion = (key, field, value) => setSuggestions(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const [processingRoute,       setProcessingRoute]       = useState(editItem?.processing_queue || PROCESSING_ROUTES[0]);
  const [needsRepair,           setNeedsRepair]           = useState(false);
  const [damagedMissingParts,   setDamagedMissingParts]   = useState(false);
  const [managerReview,         setManagerReview]         = useState(!!editItem?.blocking_reason);

  const [marketStats,   setMarketStats]   = useState(null);
  const [statsLoading,  setStatsLoading]  = useState(false);
  const [formErrors,    setFormErrors]    = useState({});

  const breadcrumbs = [
    { label: 'Transactions',                        onClick: () => onBack && onBack('transactions') },
    { label: `${ticketLabel} (${ticketId ?? '—'})`, onClick: () => onBack && onBack() },
    { label: 'Intake' },
    { label: editItem ? 'Edit Hardgoods Item' : 'Hardgoods Item Intake', current: true },
  ];

  // ── Categories (Hardgoods division) ───────────────────────────────────────
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const divsRes = await axios.get(`${config.apiUrl}/divisions`);
        const hg = divsRes.data.find(d => d.code === 'HG');
        if (hg) {
          const catRes = await axios.get(`${config.apiUrl}/categories?division_id=${hg.id}`);
          setCategories(catRes.data || []);
        }
      } catch (err) {
        console.error('Error loading hardgoods categories:', err);
      }
    };
    loadCategories();
    axios.get(`${config.apiUrl}/inventory-modes`)
      .then(res => setInventoryModes(res.data || []))
      .catch(err => console.error('Error loading inventory modes:', err));
  }, []);

  // Hardgoods > Parent > ... > Selected — walked from the flat categories list via parent_category_id
  const categoryPath = (() => {
    if (!category || categories.length === 0) return null;
    const byId = Object.fromEntries(categories.map(c => [c.id, c]));
    const chain = [];
    let cur = byId[category];
    let guard = 0;
    while (cur && guard++ < 10) { chain.unshift(cur.name); cur = cur.parent_category_id ? byId[cur.parent_category_id] : null; }
    return ['Hardgoods', ...chain].join(' > ');
  })();

  // Effective fields = division + ancestor-category inheritance, each tagged
  // with its scope: CATALOG fields prefill from the Catalog Item, INVENTORY
  // fields describe this physical item and are entered by the employee.
  const loadCategoryFields = useCallback(async (catId, prefillValues = {}) => {
    if (!catId) { setCategoryFields([]); setCategoryFieldValues({}); return; }
    try {
      const res = await axios.get(`${config.apiUrl}/categories/${catId}/effective-fields`);
      // Brand / Model / Type are already surfaced as fixed core fields — don't duplicate them here.
      const fields = (res.data?.fields || []).filter(f =>
        !['brand', 'model', 'type'].includes(f.field_key) && f.required_at !== 'NOT_USED');
      setCategoryFields(fields);
      const valMap = {};
      for (const f of fields) {
        valMap[f.field_key] = prefillValues[f.field_key] ?? (f.data_type === 'BOOLEAN' ? (f.default_value ?? 'false') : (f.default_value ?? ''));
      }
      setCategoryFieldValues(valMap);
    } catch (err) {
      console.error('Error loading category fields:', err);
      setCategoryFields([]);
      setCategoryFieldValues({});
    }
  }, []);

  useEffect(() => {
    if (category) {
      // Current catalog values first, then anything already saved on this
      // ticket item (its own snapshot/overrides) on top.
      const prefill = { ...catalogPrefill };
      (editItem?.attributes || []).forEach(a => { prefill[a.field_key] = a.field_value; });
      loadCategoryFields(category, prefill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // "From catalog" / "Overridden" marker for a prefilled value.
  const prefillNote = (key, value) => {
    const prefilled = catalogPrefill[key];
    if (!linkedCatalog || prefilled === undefined || prefilled === null || prefilled === '') return null;
    return String(value ?? '') === String(prefilled) ? 'From catalog' : `Overridden (catalog: ${prefilled})`;
  };

  // Drop the catalog link: values stay as typed, but become plain intake
  // entries and the category can be changed again.
  const handleUnlinkCatalog = () => {
    setLinkedCatalog(null);
    setCatalogPrefill({});
  };

  const handleCategoryChange = (catId) => {
    setCategory(catId);
    setCategoryPickerOpen(false);
    setFormErrors(p => ({ ...p, category: false }));
  };

  const renderCategoryField = (field) => {
    const label = field.label_override || field.field_label || field.label || field.field_key;
    const val   = categoryFieldValues[field.field_key] ?? '';
    const onChange = (newVal) => setCategoryFieldValues(prev => ({ ...prev, [field.field_key]: newVal }));
    const note = prefillNote(field.field_key, val);
    const noteSx = { color: note?.startsWith('Overridden') ? '#e65100' : GREEN };

    switch (field.data_type) {
      case 'NUMBER':
      case 'CURRENCY':
        return <TextField key={field.field_key} label={label} type="number" value={val} onChange={e => onChange(e.target.value)} size="small" fullWidth disabled={readOnly}
          helperText={note} FormHelperTextProps={{ sx: noteSx }} />;
      case 'ENUM': {
        const opts = Array.isArray(field.allowed_values) ? [...field.allowed_values] : [];
        // A prefilled/free-typed value outside the list must still display.
        if (val && !opts.includes(val)) opts.push(val);
        return (
          <FormControl key={field.field_key} fullWidth size="small" disabled={readOnly}>
            <InputLabel>{label}</InputLabel>
            <Select value={val} onChange={e => onChange(e.target.value)} label={label}>
              <MenuItem value=""><em>Not specified</em></MenuItem>
              {opts.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
            {note && <FormHelperText sx={noteSx}>{note}</FormHelperText>}
          </FormControl>
        );
      }
      case 'BOOLEAN':
        return (
          <Box key={field.field_key}>
            <FormControlLabel disabled={readOnly}
              control={<Checkbox size="small" checked={val === 'true' || val === true} onChange={e => onChange(e.target.checked ? 'true' : 'false')} />}
              label={<Typography variant="body2" fontSize={12}>{label}</Typography>}
            />
            {note && <FormHelperText sx={{ ...noteSx, mt: -0.5 }}>{note}</FormHelperText>}
          </Box>
        );
      default:
        return <TextField key={field.field_key} label={label} value={val} onChange={e => onChange(e.target.value)} size="small" fullWidth disabled={readOnly}
          helperText={note} FormHelperTextProps={{ sx: noteSx }} />;
    }
  };

  const catalogScopeFields   = categoryFields.filter(f => f.scope === 'CATALOG');
  const inventoryScopeFields = categoryFields.filter(f => f.scope !== 'CATALOG');

  // ── Pricing Intelligence — real aggregates from existing hardgoods rows in the same category ──
  useEffect(() => {
    if (!category) { setMarketStats(null); return; }
    let cancelled = false;
    setStatsLoading(true);
    axios.get(`${config.apiUrl}/hardgoods`, { params: { category_id: category } })
      .then(res => {
        if (cancelled) return;
        const rows = res.data || [];
        const paidRows = rows.filter(r => r.cost_price != null && !isNaN(parseFloat(r.cost_price)));
        const sortedByDate = (arr) => [...arr].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        const lastPaidRow = sortedByDate(paidRows)[0] || null;
        setMarketStats({
          onHand:       rows.filter(r => r.status === 'ACTIVE').length,
          inProcessing: rows.filter(r => r.processing_status && r.processing_status !== 'COMPLETE').length,
          onPawn:       rows.filter(r => r.source === 'PAWN_DEFAULT').length,
          lastPaid:     lastPaidRow ? parseFloat(lastPaidRow.cost_price) : null,
          lastPaidDate: lastPaidRow?.created_at || null,
          avgPaid:      paidRows.length ? paidRows.reduce((s, r) => s + parseFloat(r.cost_price), 0) / paidRows.length : null,
        });
      })
      .catch(err => { console.error('Error loading hardgoods pricing intelligence:', err); if (!cancelled) setMarketStats(null); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, [category]);

  // ── Photos ─────────────────────────────────────────────────────────────────
  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setViews(prev => prev.map((v, i) => (i === activeView ? { ...v, image: { url, file } } : v)));
    e.target.value = '';
  };

  const handleRemovePhoto = (idx) => {
    setViews(prev => prev.map((v, i) => (i === idx ? { ...v, image: null } : v)));
  };

  const handleAddView = () => {
    const label = newViewLabel.trim();
    if (!label) return;
    setViews(prev => [...prev, { label, image: null }]);
    setActiveView(views.length);
    setNewViewLabel('');
    setAddViewOpen(false);
  };

  // Catalog reference images are a later phase, so this mirrors the first
  // intake photo. Intake photos belong to the inventory record only.
  const catalogPhoto = views.find(v => v.image)?.image || null;

  // ── Accessories ────────────────────────────────────────────────────────────
  const handleAddAccessory = () => {
    const label = newAccessory.trim();
    if (!label || accessories.includes(label)) return;
    setAccessories(prev => [...prev, label]);
    setNewAccessory('');
  };
  const handleRemoveAccessory = (label) => setAccessories(prev => prev.filter(a => a !== label));

  // ── Save ───────────────────────────────────────────────────────────────────
  const validate = () => {
    const errors = {
      itemName: !itemName.trim(),
      brand: !brand.trim(),
      model: !model.trim(),
      itemType: !itemType.trim(),
      category: !category,
      condition: !condition,
      colour: !colour.trim(),
      year: !year.trim(),
      paidAmount: paidAmount === '' || isNaN(parseFloat(paidAmount)),
    };
    setFormErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const buildItem = () => {
    const categoryName = categories.find(c => c.id === category)?.name || '';
    const attributes = [
      { field_key: 'brand', field_label: 'Brand', field_value: brand || null },
      { field_key: 'model', field_label: 'Model', field_value: model || null },
      { field_key: 'type',  field_label: 'Type',  field_value: itemType || null },
      ...categoryFields.map(f => ({ field_key: f.field_key, field_label: f.label_override || f.label || f.field_key, field_value: categoryFieldValues[f.field_key] ?? null })),
    ].filter(a => a.field_value !== null && a.field_value !== '');
    const flagNotes = [
      needsRepair && 'Needs repair',
      damagedMissingParts && 'Damaged / missing parts',
      managerReview && 'Manager review',
    ].filter(Boolean);
    const paid = parseFloat(paidAmount) || 0;
    const shortDesc = itemName.trim();
    const longDesc = [shortDesc, brand, model, condition, colour, year].filter(Boolean).join(' · ');

    return {
      id:             editItem ? editItem.id : Date.now(),
      item:           shortDesc,
      brand,
      model,
      type:           itemType,
      category:       categoryName,
      category_id:    category || null,
      category_name:  categoryName,
      serial:         serialNumber,
      serial_number:  serialNumber,
      condition:      condition || null,
      colour:         colour || null,
      year:           year || null,
      qty:            1,
      amount:         paid,
      pawn_price:     parseFloat(suggestions.pawn.low)  || paid,
      buy_price:      parseFloat(suggestions.buy.low)   || paid,
      trade_price:    suggestions.trade.low  ? parseFloat(suggestions.trade.low)  : null,
      retail_price:   suggestions.retail.low ? parseFloat(suggestions.retail.low) : null,
      paid_amount:    paid,
      price:          paid,
      accessories,
      notes:          notes || null,
      part_number:    serialNumber || null,
      source:         'CUSTOMER_PURCHASE',
      processing_queue: processingRoute || null,
      sellable_status: flagNotes.length ? 'NOT_SELLABLE' : null,
      blocking_reason: flagNotes.length ? flagNotes.join(', ') : null,
      suggest_catalog: linkedCatalog ? false : suggestCatalog,
      // Inventory snapshot: `attributes` holds the resolved values (catalog
      // prefill + employee overrides + inventory fields) and is what gets
      // saved on the inventory record. catalog_item_id only links back for
      // grouping/history; later catalog edits never rewrite this item.
      catalog_item_id: linkedCatalog?.id || null,
      catalog_code:    linkedCatalog?.catalog_code || null,
      catalog_friendly_code: linkedCatalog?.friendly_code || null,
      catalog_title:   linkedCatalog?.title || null,
      catalog_pricing: linkedCatalog?.pricing || null,
      catalog_prefill: linkedCatalog ? catalogPrefill : {},
      attributes,
      images: views.filter(v => v.image).map((v, idx) => ({ url: v.image.url, file: v.image.file, isPrimary: idx === 0, label: v.label })),
      short_desc: shortDesc,
      long_desc:  longDesc,
      original_entry: initialEntry,
      sourceEstimator: 'hardgoods',
      fromEstimator:   'hardgoods',
      mode: inventoryMode || 'PIECE',
    };
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editItem && onUpdateItem) onUpdateItem(buildItem());
    else onSaveItem(buildItem());
  };

  const handleSaveAndAdd = () => {
    if (!validate()) return;
    const item = buildItem();
    if (onSaveAndAddAnother) onSaveAndAddAnother(item);
    else onSaveItem(item);
  };

  const isReady = itemName.trim() && category && condition && paidAmount !== '';
  const missingStatus = isReady ? 'Ready to add to ticket' : 'Missing required fields';

  const fmt = (n) => (n == null ? '—' : `$${Number(n).toFixed(2)}`);
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', bgcolor: '#f5f6fa', overflow: 'hidden', ...(readOnly && { pointerEvents: 'none', userSelect: 'none' }) }}>

      {/* Breadcrumb bar */}
      <Box sx={{ bgcolor: GREEN, color: 'white', px: 2.5, py: 1, display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <MuiIcons.ChevronRight sx={{ fontSize: 16, opacity: 0.6 }} />}
            <Typography variant="body2" fontWeight={crumb.current ? 700 : 400} onClick={crumb.onClick}
              sx={{ cursor: crumb.onClick ? 'pointer' : 'default', opacity: crumb.current ? 1 : 0.8, '&:hover': crumb.onClick ? { textDecoration: 'underline', opacity: 1 } : {} }}>
              {crumb.label}
            </Typography>
          </React.Fragment>
        ))}
      </Box>

      {/* Title + catalog-match info bar */}
      <Box sx={{ bgcolor: 'white', px: 2.5, py: 1.25, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', mb: readOnly ? 0 : 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="body2" color="text.secondary">Catalog Item:</Typography>
            {linkedCatalog ? (
              <>
                <Chip size="small" title={linkedCatalog.catalog_code || ''}
                  label={linkedCatalog.friendly_code || linkedCatalog.catalog_code || `#${linkedCatalog.id}`}
                  sx={{ height: 20, fontSize: 11, fontFamily: 'monospace', bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700 }} />
                <Typography variant="body2" fontWeight={700}>{linkedCatalog.title || '—'}</Typography>
              </>
            ) : (
              <Typography variant="body2" fontWeight={700} color="text.secondary">Not linked (non-catalog item)</Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="body2" color="text.secondary">Category:</Typography>
            {categoryPickerOpen && !linkedCatalog ? (
              <FormControl size="small" sx={{ minWidth: 240 }} error={!!formErrors.category} disabled={readOnly}>
                <Select value={category} displayEmpty onChange={e => handleCategoryChange(e.target.value)} sx={{ borderRadius: 2 }}>
                  <MenuItem value=""><em>Select category…</em></MenuItem>
                  {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body2" fontWeight={700}>{categoryPath}</Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
            <Typography variant="body2" color="text.secondary">Original Entry:</Typography>
            <Typography variant="body2" fontWeight={700} fontFamily="monospace">"{initialEntry || '—'}"</Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="body2" color="text.secondary">Inventory Mode:</Typography>
            <FormControl size="small" sx={{ minWidth: 110 }} disabled={readOnly}>
              <Select value={inventoryMode} onChange={e => setInventoryMode(e.target.value)} sx={{ borderRadius: 2 }}>
                {/* Stock / Bucket need stock SKU and bucket records, which intake doesn't create yet. */}
                {inventoryModes.filter(m => INTAKE_MODES.includes(m.code)).map(m => (
                  <MenuItem key={m.code} value={m.code}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {!linkedCatalog && (
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
              <FormControlLabel disabled={readOnly}
                control={<Checkbox size="small" checked={suggestCatalog} onChange={e => setSuggestCatalog(e.target.checked)} sx={{ color: GREEN, '&.Mui-checked': { color: GREEN } }} />}
                label={<Typography variant="body2" fontSize={12}>Suggest add to catalog</Typography>} />
              <Tooltip title="Flags this item for staff to consider adding as a reusable catalog template">
                <MuiIcons.InfoOutlined sx={{ fontSize: 15, color: 'text.secondary' }} />
              </Tooltip>
            </Box>
          )}
        </Box>

        {!readOnly && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onChangeMatch ? (
              <Button size="small" variant="outlined" startIcon={<MuiIcons.SwapHoriz sx={{ fontSize: 15 }} />}
                onClick={() => onChangeMatch(itemName || initialEntry)}
                sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12.5 }}>
                Change Match
              </Button>
            ) : (
              <Tooltip title="Not available while editing an item already on the ticket">
                <span>
                  <Button size="small" variant="outlined" disabled startIcon={<MuiIcons.SwapHoriz sx={{ fontSize: 15 }} />} sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12.5 }}>
                    Change Match
                  </Button>
                </span>
              </Tooltip>
            )}
            <Tooltip title={linkedCatalog ? 'Category comes from the linked catalog item. Change the match or unlink it to pick another category.' : ''}>
              <span>
                <Button size="small" variant="outlined" startIcon={<MuiIcons.FolderOpen sx={{ fontSize: 15 }} />} onClick={() => setCategoryPickerOpen(true)}
                  disabled={!!linkedCatalog}
                  sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12.5 }}>
                  Change Category
                </Button>
              </span>
            </Tooltip>
            {linkedCatalog && (
              <Tooltip title="Keep the values entered so far but save this item without a catalog link">
                <Button size="small" variant="outlined" color="inherit" startIcon={<MuiIcons.LinkOff sx={{ fontSize: 15 }} />}
                  onClick={handleUnlinkCatalog}
                  sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12.5 }}>
                  Unlink Catalog
                </Button>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>

      {/* Scrollable body */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

        {/* Catalog Photo + Catalog Fields + Intake Photos */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Paper sx={{ p: 1.5, borderRadius: 2, width: 190, flexShrink: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Catalog Photo</Typography>
            <Box sx={{ width: '100%', height: 130, borderRadius: 1.5, overflow: 'hidden', bgcolor: '#fafafa', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {catalogPhoto ? (
                <Box component="img" src={catalogPhoto.url} alt="Catalog" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <MuiIcons.ImageOutlined sx={{ fontSize: 32, color: '#ccc' }} />
              )}
            </Box>
          </Paper>

          <Paper sx={{ p: 1.5, borderRadius: 2, width: 220, flexShrink: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Catalog Fields</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[{ label: 'Brand', value: brand }, { label: 'Model', value: model }, { label: 'Type', value: itemType }].map(f => (
                <Box key={f.label}>
                  <Typography variant="caption" color="text.secondary">{f.label}:</Typography>
                  <Box sx={{ bgcolor: '#f5f6fa', border: '1px solid #e0e0e0', borderRadius: 1.5, px: 1, py: 0.5, mt: 0.25 }}>
                    <Typography variant="body2">{f.value || '—'}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>

          <Paper sx={{ p: 1.5, borderRadius: 2, flex: 1, minWidth: 320 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>Intake Photos *</Typography>
              <Box sx={{ flex: 1 }} />
              {!readOnly && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" component="label" startIcon={<MuiIcons.PhotoCamera sx={{ fontSize: 16 }} />}
                    sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12.5 }}>
                    Take Photo
                    <input type="file" hidden accept="image/*" capture="environment" onChange={handleFileSelected} />
                  </Button>
                  <Button size="small" variant="outlined" component="label" startIcon={<MuiIcons.Upload sx={{ fontSize: 16 }} />}
                    sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12.5 }}>
                    Upload
                    <input type="file" hidden accept="image/*" onChange={handleFileSelected} />
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<MuiIcons.Add sx={{ fontSize: 16 }} />}
                    onClick={() => setAddViewOpen(o => !o)}
                    sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12.5 }}>
                    Add View
                  </Button>
                </Box>
              )}
            </Box>

            {addViewOpen && (
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <TextField size="small" placeholder="View label (e.g. Underside)" value={newViewLabel}
                  onChange={e => setNewViewLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddView()} sx={{ flex: 1 }} />
                <Button size="small" variant="contained" onClick={handleAddView} sx={{ textTransform: 'none', bgcolor: GREEN, '&:hover': { bgcolor: DARK_GREEN } }}>Add</Button>
              </Box>
            )}

            <Tabs value={activeView} onChange={(e, v) => setActiveView(v)} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 32, mb: 1 }}>
              {views.map((v, i) => (
                <Tab key={i} value={i} label={v.label} icon={v.image ? <MuiIcons.CheckCircle sx={{ fontSize: 13, color: GREEN }} /> : undefined}
                  iconPosition="end" sx={{ minHeight: 32, textTransform: 'none', fontSize: 12.5, py: 0.5 }} />
              ))}
            </Tabs>

            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
              {views.map((v, i) => (
                <Box key={i} onClick={() => setActiveView(i)}
                  sx={{ position: 'relative', width: 110, height: 96, flexShrink: 0, borderRadius: 1.5, overflow: 'hidden', cursor: 'pointer', border: i === activeView ? `2px solid ${GREEN}` : '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
                  {v.image ? (
                    <Box component="img" src={v.image.url} alt={v.label} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}>
                      <MuiIcons.ImageOutlined sx={{ fontSize: 26 }} />
                    </Box>
                  )}
                  <Typography variant="caption" sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', textAlign: 'center', fontSize: 10.5, py: 0.25 }}>
                    {v.label}
                  </Typography>
                  {v.image && !readOnly && (
                    <IconButton size="small" onClick={e => { e.stopPropagation(); handleRemovePhoto(i); }}
                      sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(255,255,255,0.85)', p: 0.25 }}>
                      <MuiIcons.Close sx={{ fontSize: 12 }} />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* Item Details + Pricing Intelligence */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)', gap: 1.5, alignItems: 'start' }}>

          {/* LEFT — Item Details */}
          <Paper sx={{ p: 1.5, borderRadius: 2, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} letterSpacing={0.3} sx={{ mb: 1 }}>ITEM DETAILS</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1.5 }}>

              {/* Left sub-column: Item / Brand / Model / Type + Accessories */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {[
                  { key: 'item',  label: 'Item *',  value: itemName, set: setItemName, err: 'itemName' },
                  { key: 'brand', label: 'Brand *', value: brand,    set: setBrand,    err: 'brand' },
                  { key: 'model', label: 'Model *', value: model,    set: setModel,    err: 'model' },
                ].map(f => {
                  const note = prefillNote(f.key, f.value);
                  return (
                    <TextField key={f.key} label={f.label} value={f.value}
                      onChange={e => { f.set(e.target.value); setFormErrors(p => ({ ...p, [f.err]: false })); }}
                      size="small" fullWidth disabled={readOnly} error={!!formErrors[f.err]}
                      helperText={note}
                      FormHelperTextProps={{ sx: { color: note?.startsWith('Overridden') ? '#e65100' : GREEN } }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  );
                })}
                <Autocomplete
                  freeSolo
                  disabled={readOnly}
                  options={[]}
                  inputValue={itemType}
                  onInputChange={(e, val) => { setItemType(val); setFormErrors(p => ({ ...p, itemType: false })); }}
                  renderInput={(params) => (
                    <TextField {...params} label="Type *" size="small" fullWidth error={!!formErrors.itemType}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  )}
                />

                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Accessories</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mb: 1 }}>
                    {accessories.map(a => (
                      <FormControlLabel key={a} disabled={readOnly}
                        control={<Checkbox size="small" checked onChange={() => handleRemoveAccessory(a)} />}
                        label={<Typography variant="body2">{a} included</Typography>} />
                    ))}
                  </Box>
                  {!readOnly && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField size="small" placeholder="Add accessory (e.g. Case)" value={newAccessory}
                        onChange={e => setNewAccessory(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddAccessory()}
                        sx={{ flex: 1 }} />
                      <Button size="small" variant="outlined" onClick={handleAddAccessory} sx={{ textTransform: 'none' }}>Add</Button>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Right sub-column: Catalog Details + Required Intake Fields + Item Notes */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {catalogScopeFields.length > 0 && (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>Catalog Details</Typography>
                      <Tooltip title={linkedCatalog
                        ? 'Prefilled from the catalog item. Changes here apply to this item only; the catalog is not updated.'
                        : 'Catalog-level fields for this category.'}>
                        <MuiIcons.InfoOutlined sx={{ fontSize: 14, color: 'text.secondary' }} />
                      </Tooltip>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1.25 }}>
                      {catalogScopeFields.map(field => renderCategoryField(field))}
                    </Box>
                  </>
                )}
                <Typography variant="body2" fontWeight={600}>Required Intake Fields</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1.25 }}>
                  <TextField label="Serial Number *" value={serialNumber} onChange={e => setSerialNumber(e.target.value)}
                    size="small" fullWidth disabled={readOnly} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  <FormControl size="small" fullWidth disabled={readOnly} error={!!formErrors.condition}>
                    <InputLabel>Condition *</InputLabel>
                    <Select value={condition} label="Condition *" onChange={e => { setCondition(e.target.value); setFormErrors(p => ({ ...p, condition: false })); }} sx={{ borderRadius: 2 }}>
                      {CONDITION_OPTIONS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" fullWidth disabled={readOnly} error={!!formErrors.colour}>
                    <InputLabel>Colour *</InputLabel>
                    <Select value={colour} label="Colour *" onChange={e => { setColour(e.target.value); setFormErrors(p => ({ ...p, colour: false })); }} sx={{ borderRadius: 2 }}>
                      {COLOUR_OPTIONS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField label="Year *" value={year} onChange={e => { setYear(e.target.value); setFormErrors(p => ({ ...p, year: false })); }}
                    size="small" fullWidth disabled={readOnly} error={!!formErrors.year} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  {inventoryScopeFields.map(field => renderCategoryField(field))}
                </Box>

                <TextField label="Item Notes" value={notes} onChange={e => setNotes(e.target.value)}
                  size="small" fullWidth multiline minRows={3} disabled={readOnly}
                  placeholder="Customer says electronics work well, small nick on lower body…"
                  sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Box>
            </Box>
          </Paper>

          {/* RIGHT — Pricing Intelligence */}
          <Paper sx={{ p: 1.5, borderRadius: 2, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} letterSpacing={0.3} sx={{ mb: 1 }}>PRICING INTELLIGENCE</Typography>

            {!category ? (
              <Typography variant="body2" color="text.secondary">Select a category to see on-hand counts and paid history.</Typography>
            ) : statsLoading ? (
              <Typography variant="body2" color="text.secondary">Loading…</Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 0.75 }}>
                  <StatCard icon={<MuiIcons.Inventory2Outlined sx={{ color: GREEN }} />} label="On Hand" value={marketStats?.onHand ?? 0} />
                  <StatCard icon={<MuiIcons.SettingsOutlined sx={{ color: '#f57c00' }} />} label="In Processing" value={marketStats?.inProcessing ?? 0} />
                  <StatCard icon={<MuiIcons.AttachMoneyOutlined sx={{ color: '#6a1b9a' }} />} label="On Pawn" value={marketStats?.onPawn ?? 0} />
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                  <StatCard icon={<MuiIcons.PaidOutlined sx={{ color: GREEN }} />} label="Last Paid" value={fmt(marketStats?.lastPaid)} sub={fmtDate(marketStats?.lastPaidDate)} />
                  <Tooltip title="Sales history isn't tracked for hardgoods yet">
                    <Box><StatCard icon={<MuiIcons.LocalOfferOutlined sx={{ color: '#9e9e9e' }} />} label="Last Sold" value="—" /></Box>
                  </Tooltip>
                  <StatCard icon={<MuiIcons.TrendingUpOutlined sx={{ color: GREEN }} />} label="Avg Paid" value={fmt(marketStats?.avgPaid)} />
                  <Tooltip title="Sales history isn't tracked for hardgoods yet">
                    <Box><StatCard icon={<MuiIcons.TrendingUpOutlined sx={{ color: '#9e9e9e' }} />} label="Avg Sold" value="—" /></Box>
                  </Tooltip>
                  <Tooltip title="Sales history isn't tracked for hardgoods yet">
                    <Box><StatCard icon={<MuiIcons.CalendarTodayOutlined sx={{ color: '#9e9e9e' }} />} label="Avg Days to Sell" value="—" width={128} /></Box>
                  </Tooltip>
                </Box>
              </>
            )}

            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Suggested Values</Typography>
                {linkedCatalog?.pricing && (linkedCatalog.pricing.suggested_cost != null || linkedCatalog.pricing.suggested_retail != null) && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    Catalog suggestions — Cost: {fmt(linkedCatalog.pricing.suggested_cost)} · Retail: {fmt(linkedCatalog.pricing.suggested_retail)}
                    {linkedCatalog.pricing.retails_new_for != null && <> · New: {fmt(linkedCatalog.pricing.retails_new_for)}</>}
                  </Typography>
                )}
                <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                  {SUGGESTION_TYPES.map(({ key, label }) => {
                    const { low, high } = suggestions[key];
                    const selected = selectedSuggestion === key;
                    const selectRow = () => {
                      if (readOnly) return;
                      setSelectedSuggestion(key);
                      const l = parseFloat(low), h = parseFloat(high);
                      const mid = !isNaN(l) && !isNaN(h) ? (l + h) / 2 : (!isNaN(l) ? l : (!isNaN(h) ? h : null));
                      if (mid != null) setPaidAmount(String(Math.round(mid * 100) / 100));
                    };
                    return (
                      <Box key={key} onClick={selectRow}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.75, cursor: readOnly ? 'default' : 'pointer',
                          bgcolor: selected ? '#e8f5e9' : 'transparent',
                          borderBottom: key !== 'retail' ? '1px solid #f0f0f0' : 'none',
                        }}>
                        {selected ? <MuiIcons.CheckCircle sx={{ fontSize: 15, color: GREEN, mr: 0.25 }} /> : <Box sx={{ width: 15, mr: 0.25 }} />}
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: selected ? 700 : 400 }}>{label}</Typography>
                        <TextField
                          size="small" type="number" value={low} disabled={readOnly} placeholder="Low"
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateSuggestion(key, 'low', e.target.value)}
                          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                          inputProps={{ min: 0, step: 0.01, style: { width: 52, textAlign: 'right' } }}
                          sx={{ '& .MuiInputBase-input': { py: 0.5 } }}
                        />
                        <Typography variant="body2" color="text.secondary">–</Typography>
                        <TextField
                          size="small" type="number" value={high} disabled={readOnly} placeholder="High"
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateSuggestion(key, 'high', e.target.value)}
                          inputProps={{ min: 0, step: 0.01, style: { width: 52, textAlign: 'right' } }}
                          sx={{ '& .MuiInputBase-input': { py: 0.5 } }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <Box sx={{ width: 160, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <TextField label="Paid Amount *" value={paidAmount}
                  onChange={e => { setPaidAmount(e.target.value); setFormErrors(p => ({ ...p, paidAmount: false })); }}
                  size="small" fullWidth type="number" disabled={readOnly} error={!!formErrors.paidAmount}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

                <Tooltip title="Not configured for this store">
                  <span>
                    <Button fullWidth size="small" variant="outlined" disabled startIcon={<MuiIcons.MusicNote sx={{ fontSize: 15 }} />} sx={{ textTransform: 'none' }}>Check Reverb</Button>
                  </span>
                </Tooltip>
                <Tooltip title="Not configured for this store">
                  <span>
                    <Button fullWidth size="small" variant="outlined" disabled startIcon={<MuiIcons.Storefront sx={{ fontSize: 15 }} />} sx={{ textTransform: 'none' }}>Check eBay</Button>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Processing Route / flags / status — full width strip */}
        <Paper sx={{ px: 2, py: 1.25, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>Processing Route:</Typography>
            <FormControl size="small" disabled={readOnly} sx={{ minWidth: 190 }}>
              <Select value={processingRoute} onChange={e => setProcessingRoute(e.target.value)} sx={{ borderRadius: 2 }}>
                {PROCESSING_ROUTES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <FormControlLabel disabled={readOnly}
            control={<Checkbox size="small" checked={needsRepair} onChange={e => setNeedsRepair(e.target.checked)} />}
            label={<Typography variant="body2">Needs repair</Typography>} />
          <FormControlLabel disabled={readOnly}
            control={<Checkbox size="small" checked={damagedMissingParts} onChange={e => setDamagedMissingParts(e.target.checked)} />}
            label={<Typography variant="body2">Damaged / missing parts</Typography>} />
          <FormControlLabel disabled={readOnly}
            control={<Checkbox size="small" checked={managerReview} onChange={e => setManagerReview(e.target.checked)} />}
            label={<Typography variant="body2">Manager review</Typography>} />
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="body2" fontWeight={600} color="text.secondary">Missing/Status:</Typography>
            <Typography variant="body2" fontWeight={700} color={isReady ? '#2e7d32' : '#e65100'}>{missingStatus}</Typography>
          </Box>
        </Paper>
      </Box>

      {/* Bottom action bar */}
      <Paper sx={{ px: 2, py: 1.25, borderRadius: 0, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, pointerEvents: 'auto', userSelect: 'auto' }}>
        {readOnly && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5, bgcolor: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: 1.5 }}>
            <MuiIcons.Visibility sx={{ fontSize: 14, color: '#7c3aed' }} />
            <Typography variant="caption" color="#7c3aed" fontWeight={600}>View Only — fields are not editable</Typography>
          </Box>
        )}
        <Box sx={{ flex: 1 }} />
        {!readOnly && Object.values(formErrors).some(Boolean) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1, px: 1.5, py: 0.5, bgcolor: '#fff5f5', border: '1px solid #ffcdd2', borderRadius: 1.5 }}>
            <MuiIcons.ErrorOutline sx={{ fontSize: 14, color: '#d32f2f' }} />
            <Typography variant="caption" color="error" fontWeight={500}>
              Required:{' '}
              {[
                formErrors.itemName   && 'Item',
                formErrors.brand      && 'Brand',
                formErrors.model      && 'Model',
                formErrors.itemType   && 'Type',
                formErrors.category   && 'Category',
                formErrors.condition  && 'Condition',
                formErrors.colour     && 'Colour',
                formErrors.year       && 'Year',
                formErrors.paidAmount && 'Paid Amount',
              ].filter(Boolean).join(', ')}
            </Typography>
          </Box>
        )}
        {readOnly ? (
          <Button size="small" variant="outlined" color="inherit" onClick={() => onBack && onBack('pawn')} sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
            Close
          </Button>
        ) : (
          <>
            <Button size="small" variant="outlined" color="inherit" onClick={() => onBack && onBack('pawn')} sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
              Cancel
            </Button>
            <Button size="small" variant="outlined" onClick={() => onBack && onBack('pawn')} sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13 }}>
              Back to Results
            </Button>
            <Button size="small" variant="contained" onClick={handleSave}
              sx={{ borderRadius: 2, textTransform: 'none', fontSize: 13, bgcolor: GREEN, '&:hover': { bgcolor: DARK_GREEN } }}>
              {editItem ? 'Update Item' : 'Save Item to Ticket'}
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
}
