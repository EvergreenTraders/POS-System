import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from 'notistack';
import config from '../config';

const API_BASE_URL = config.apiUrl;

const SOURCE_OPTIONS = [
  { value: 'CUSTOMER_PURCHASE', label: 'Customer Purchase' },
  { value: 'CUSTOMER_TRADE',    label: 'Customer Trade' },
  { value: 'CONSIGNMENT',       label: 'Consignment' },
  { value: 'PAWN_DEFAULT',      label: 'Pawn Default' },
  { value: 'VENDOR_PURCHASE',   label: 'Vendor Purchase' },
  { value: 'VENDOR_MEMO',       label: 'Vendor Memo' },
  { value: 'STORE_TRANSFER',    label: 'Store Transfer' },
  { value: 'BULK_IMPORT',       label: 'Bulk Import' },
];

const CONDITION_OPTIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor', 'Damaged'];

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

function HardgoodsEdit() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);

  // Reference data
  const [modes, setModes] = useState([]);
  const [processingStatuses, setProcessingStatuses] = useState([]);
  const [inventoryStatuses, setInventoryStatuses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [storageLocations, setStorageLocations] = useState([]);

  // Read-only display (edit mode only)
  const [originalIntakeDesc, setOriginalIntakeDesc] = useState('');
  const [createdAt, setCreatedAt] = useState('');

  // Editable form state — Tab 0: Details
  const [shortDesc, setShortDesc] = useState('');
  const [longDesc, setLongDesc] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [condition, setCondition] = useState('');
  const [itemLocation, setItemLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [isMemo, setIsMemo] = useState(false);
  const [memoDueDate, setMemoDueDate] = useState('');

  // Tab 1: Mode & Pricing
  const [mode, setMode] = useState('PIECE');
  const [costPrice, setCostPrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [bucketValue, setBucketValue] = useState('');

  // Tab 2: Processing
  const [status, setStatus] = useState('HOLD');
  const [sellableStatus, setSellableStatus] = useState('NOT_SELLABLE');
  const [processingStatus, setProcessingStatus] = useState('INTAKE_PENDING');
  const [processingQueue, setProcessingQueue] = useState('');
  const [blockingReason, setBlockingReason] = useState('');
  const [nextAction, setNextAction] = useState('');

  // Tab 3: Attributes
  const [attributes, setAttributes] = useState([]);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  // Category-driven schema fields
  const [categoryFields, setCategoryFields] = useState([]);
  const [categoryFieldValues, setCategoryFieldValues] = useState({});

  useEffect(() => {
    if (!itemId) {
      navigate('/inventory/hardgoods');
      return;
    }
    loadAll();
  }, [itemId]);

  // ── Full load (edit mode) ───────────────────────────────────────────────────
  const loadAll = async () => {
    try {
      setLoading(true);
      const [itemRes, modesRes, procRes, statusRes, divsRes, locRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/hardgoods/${itemId}`),
        axios.get(`${API_BASE_URL}/inventory-modes`),
        axios.get(`${API_BASE_URL}/processing-statuses`),
        axios.get(`${API_BASE_URL}/inventory-status`),
        axios.get(`${API_BASE_URL}/divisions`),
        axios.get(`${API_BASE_URL}/storage-locations`),
      ]);

      setModes(modesRes.data);
      setProcessingStatuses(procRes.data);
      setInventoryStatuses(statusRes.data);
      setStorageLocations(locRes.data);

      const hg = divsRes.data.find(d => d.code === 'HG');
      if (hg) {
        const catRes = await axios.get(`${API_BASE_URL}/categories?division_id=${hg.id}`);
        setCategories(catRes.data);
      }

      populateForm(itemRes.data);

      if (itemRes.data.category_id) {
        await loadCategoryFields(itemRes.data.category_id, itemRes.data.attributes || []);
      }
    } catch (err) {
      console.error('Error loading hardgoods item:', err);
      enqueueSnackbar('Failed to load item', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ── Category field schema ───────────────────────────────────────────────────
  const loadCategoryFields = async (catId, existingAttrs = []) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/category-field-rules/${catId}`);
      setCategoryFields(res.data);
      const valMap = {};
      for (const f of res.data) {
        const existing = existingAttrs.find(a => a.field_key === f.field_key);
        valMap[f.field_key] = existing
          ? (existing.field_value ?? '')
          : f.data_type === 'BOOLEAN'
            ? (f.default_value ?? 'false')
            : (f.default_value ?? '');
      }
      setCategoryFieldValues(valMap);
    } catch (err) {
      console.error('Error loading category fields:', err);
    }
  };

  const handleCategoryChange = async (newCatId) => {
    setCategoryId(newCatId);
    if (newCatId) {
      await loadCategoryFields(newCatId, attributes);
    } else {
      setCategoryFields([]);
      setCategoryFieldValues({});
    }
  };

  // ── Populate form from API response ────────────────────────────────────────
  const populateForm = (item) => {
    setOriginalIntakeDesc(item.original_intake_description || '');
    setCreatedAt(item.created_at ? new Date(item.created_at).toLocaleString() : '');

    setShortDesc(item.short_desc || '');
    setLongDesc(item.long_desc || '');
    setCategoryId(item.category_id || '');
    setCondition(item.condition || '');
    setItemLocation(item.location || '');
    setNotes(item.notes || '');
    setSource(item.source || '');
    setPartNumber(item.part_number || '');
    setIsMemo(item.is_memo || false);
    setMemoDueDate(item.memo_due_date ? item.memo_due_date.substring(0, 10) : '');

    setMode(item.mode || 'PIECE');
    setCostPrice(item.cost_price ?? '');
    setRetailPrice(item.retail_price ?? '');
    setSerialNumber(item.serial_number || '');
    setQuantity(item.quantity ?? '');
    setBucketValue(item.bucket_value ?? '');

    setStatus(item.status || 'HOLD');
    setSellableStatus(item.sellable_status || 'NOT_SELLABLE');
    setProcessingStatus(item.processing_status || 'INTAKE_PENDING');
    setProcessingQueue(item.processing_queue || '');
    setBlockingReason(item.blocking_reason || '');
    setNextAction(item.next_action || '');

    setAttributes(item.attributes || []);
  };

  // ── Build payload (shared by POST and PUT) ─────────────────────────────────
  const buildPayload = () => {
    const skKeys = new Set(categoryFields.map(f => f.field_key));
    const schemaAttrList = categoryFields
      .map(f => ({ field_key: f.field_key, field_value: categoryFieldValues[f.field_key] ?? null }))
      .filter(a => a.field_value !== null && a.field_value !== '');
    const freeAttrList = attributes.filter(a => a.field_key && !skKeys.has(a.field_key));

    return {
      short_desc:        shortDesc    || null,
      long_desc:         longDesc     || null,
      category_id:       categoryId   || null,
      condition:         condition    || null,
      location:          itemLocation || null,
      notes:             notes        || null,
      source:            source       || null,
      part_number:       partNumber   || null,
      is_memo:           isMemo,
      memo_due_date:     isMemo && memoDueDate ? memoDueDate : null,

      mode,
      cost_price:        costPrice   !== '' ? parseFloat(costPrice)   : null,
      retail_price:      retailPrice !== '' ? parseFloat(retailPrice) : null,
      serial_number:     mode === 'UNIT'   ? (serialNumber || null)                                  : null,
      quantity:          mode === 'STOCK'  ? (quantity !== '' ? parseInt(quantity, 10) : null)       : null,
      bucket_value:      mode === 'BUCKET' ? (bucketValue !== '' ? parseFloat(bucketValue) : null)   : null,

      status,
      sellable_status:   sellableStatus,
      processing_status: processingStatus,
      processing_queue:  processingQueue  || null,
      blocking_reason:   blockingReason   || null,
      next_action:       nextAction       || null,

      attributes: [...schemaAttrList, ...freeAttrList],
    };
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    // Validate required category fields
    const requiredMissing = categoryFields.filter(
      f => f.required_for_inventory && !categoryFieldValues[f.field_key]
    );
    if (requiredMissing.length > 0) {
      const keys = requiredMissing
        .map(f => f.label_override || f.label || f.field_key)
        .join(', ');
      enqueueSnackbar(`Required fields missing: ${keys}`, { variant: 'warning' });
      setTab(1);
      return;
    }

    try {
      setSaving(true);
      await axios.put(`${API_BASE_URL}/hardgoods/${itemId}`, buildPayload());
      enqueueSnackbar('Item saved', { variant: 'success' });
    } catch (err) {
      console.error('Error saving hardgoods item:', err);
      enqueueSnackbar('Failed to save item', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Free-form attribute helpers ────────────────────────────────────────────
  const handleAttrChange = (index, field, value) => {
    setAttributes(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const handleAddAttr = () => {
    if (!newAttrKey.trim()) return;
    if (categoryFields.some(f => f.field_key === newAttrKey.trim())) {
      enqueueSnackbar(`'${newAttrKey.trim()}' is managed by category fields above`, { variant: 'info' });
      return;
    }
    setAttributes(prev => [...prev, { field_key: newAttrKey.trim(), field_value: newAttrValue }]);
    setNewAttrKey('');
    setNewAttrValue('');
  };

  const handleRemoveAttr = (index) => {
    setAttributes(prev => prev.filter((_, i) => i !== index));
  };

  // ── Typed input renderer for schema fields ─────────────────────────────────
  const renderCategoryField = (field) => {
    const label = field.label_override || field.label || field.field_key;
    const val = categoryFieldValues[field.field_key] ?? '';
    const isRequired = field.required_for_inventory;
    const onCFVChange = (newVal) =>
      setCategoryFieldValues(prev => ({ ...prev, [field.field_key]: newVal }));

    switch (field.data_type) {
      case 'NUMBER':
        return (
          <TextField
            label={label} type="number" value={val}
            onChange={e => onCFVChange(e.target.value)}
            size="small" fullWidth required={isRequired}
            helperText={field.help_text || undefined}
          />
        );
      case 'ENUM': {
        const opts = Array.isArray(field.allowed_values) ? field.allowed_values : [];
        return (
          <FormControl fullWidth size="small" required={isRequired}>
            <InputLabel>{label}</InputLabel>
            <Select value={val} onChange={e => onCFVChange(e.target.value)} label={label}>
              <MenuItem value=""><em>Not specified</em></MenuItem>
              {opts.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
            {field.help_text && <FormHelperText>{field.help_text}</FormHelperText>}
          </FormControl>
        );
      }
      case 'BOOLEAN':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={val === 'true' || val === true}
                onChange={e => onCFVChange(e.target.checked ? 'true' : 'false')}
              />
            }
            label={label}
          />
        );
      case 'DATE':
        return (
          <TextField
            label={label} type="date" value={val}
            onChange={e => onCFVChange(e.target.value)}
            size="small" fullWidth required={isRequired}
            InputLabelProps={{ shrink: true }}
            helperText={field.help_text || undefined}
          />
        );
      default: // TEXT
        return (
          <TextField
            label={label} value={val}
            onChange={e => onCFVChange(e.target.value)}
            size="small" fullWidth required={isRequired}
            helperText={field.help_text || undefined}
          />
        );
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const schemaKeys = new Set(categoryFields.map(f => f.field_key));
  const freeFormAttrs = attributes.filter(a => a.field_key && !schemaKeys.has(a.field_key));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Header bar ── */}
      <Paper elevation={1} sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <IconButton onClick={() => navigate('/inventory/hardgoods')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {originalIntakeDesc || 'Hardgoods Item'}
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
            {itemId}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Added {createdAt}
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ minWidth: 100 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Paper>


      {/* ── Tabs ── */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, pb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
          <Tab label="Details" />
          <Tab label={`Attributes (${categoryFields.length + freeFormAttrs.length})`} />
        </Tabs>

        {/* ── Tab 0: Details (description + mode/pricing + processing) ── */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ display: 'flex', gap: 2 }}>

            {/* Left column: item details */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField label="Short Description" value={shortDesc} onChange={e => setShortDesc(e.target.value)} size="small" sx={{ flex: 2 }} />
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Category</InputLabel>
                  <Select value={categoryId} onChange={e => handleCategoryChange(e.target.value)} label="Category">
                    <MenuItem value=""><em>None</em></MenuItem>
                    {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <TextField label="Long Description" value={longDesc} onChange={e => setLongDesc(e.target.value)} fullWidth multiline minRows={2} size="small" />
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Condition</InputLabel>
                  <Select value={condition} onChange={e => setCondition(e.target.value)} label="Condition">
                    <MenuItem value=""><em>Not specified</em></MenuItem>
                    {CONDITION_OPTIONS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Location</InputLabel>
                  <Select value={itemLocation} onChange={e => setItemLocation(e.target.value)} label="Location">
                    <MenuItem value=""><em>None</em></MenuItem>
                    {storageLocations.map(loc => <MenuItem key={loc.location_id} value={loc.location}>{loc.location}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField label="Part Number" value={partNumber} onChange={e => setPartNumber(e.target.value)} size="small" sx={{ flex: 1 }} />
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Source</InputLabel>
                  <Select value={source} onChange={e => setSource(e.target.value)} label="Source">
                    <MenuItem value=""><em>Not specified</em></MenuItem>
                    {SOURCE_OPTIONS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <FormControlLabel control={<Switch checked={isMemo} onChange={e => setIsMemo(e.target.checked)} />} label="Vendor Memo" />
                {isMemo && (
                  <TextField label="Memo Due Date" type="date" value={memoDueDate} onChange={e => setMemoDueDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
                )}
              </Box>
              <TextField label="Notes" value={notes} onChange={e => setNotes(e.target.value)} fullWidth multiline minRows={2} size="small" />
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* Right column: mode/pricing + processing */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Mode &amp; Pricing
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Mode</InputLabel>
                  <Select value={mode} onChange={e => setMode(e.target.value)} label="Mode">
                    {modes.map(m => <MenuItem key={m.code} value={m.code}>{m.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Cost Price" type="number" inputProps={{ min: 0, step: 0.01 }} value={costPrice} onChange={e => setCostPrice(e.target.value)} size="small" sx={{ flex: 1 }} />
                {mode !== 'BUCKET' && (
                  <TextField label="Retail Price" type="number" inputProps={{ min: 0, step: 0.01 }} value={retailPrice} onChange={e => setRetailPrice(e.target.value)} size="small" sx={{ flex: 1 }} />
                )}
              </Box>
              {mode === 'UNIT' && (
                <TextField label="Serial Number" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} size="small" fullWidth />
              )}
              {mode === 'STOCK' && (
                <TextField label="Quantity on Hand" type="number" inputProps={{ min: 0, step: 1 }} value={quantity} onChange={e => setQuantity(e.target.value)} size="small" fullWidth />
              )}
              {mode === 'BUCKET' && (
                <TextField label="Bucket Value" type="number" inputProps={{ min: 0, step: 0.01 }} value={bucketValue} onChange={e => setBucketValue(e.target.value)} size="small" fullWidth helperText="Total value of the mixed lot" />
              )}

              <Divider />

              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Processing
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Item Status</InputLabel>
                  <Select value={status} onChange={e => setStatus(e.target.value)} label="Item Status">
                    {inventoryStatuses.map(s => <MenuItem key={s.status_code} value={s.status_code}>{s.status_name}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Sellable Status</InputLabel>
                  <Select value={sellableStatus} onChange={e => setSellableStatus(e.target.value)} label="Sellable Status">
                    <MenuItem value="SELLABLE"><Chip label="Sellable" color="success" size="small" sx={{ pointerEvents: 'none' }} /></MenuItem>
                    <MenuItem value="NOT_SELLABLE"><Chip label="Not Sellable" color="default" size="small" sx={{ pointerEvents: 'none' }} /></MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Processing Status</InputLabel>
                  <Select value={processingStatus} onChange={e => setProcessingStatus(e.target.value)} label="Processing Status">
                    {processingStatuses.map(s => (
                      <MenuItem key={s.code} value={s.code}>
                        <Chip label={s.label} color={s.ui_color || 'default'} size="small" sx={{ pointerEvents: 'none' }} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField label="Processing Queue" value={processingQueue} onChange={e => setProcessingQueue(e.target.value)} size="small" sx={{ flex: 1 }} placeholder="e.g. ELECTRONICS" />
              </Box>
              <TextField label="Blocking Reason" value={blockingReason} onChange={e => setBlockingReason(e.target.value)} fullWidth size="small" placeholder="Required when status is EXCEPTION" />
              <TextField label="Next Action" value={nextAction} onChange={e => setNextAction(e.target.value)} fullWidth size="small" placeholder="What needs to happen next" />

            </Box>
          </Box>
        </TabPanel>

        {/* ── Tab 1: Attributes ── */}
        <TabPanel value={tab} index={1}>

          {/* Schema-defined category fields */}
          {categoryFields.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Category Fields
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {categoryFields.map(field => (
                  <Box key={field.field_key} sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 200 }}>
                    {renderCategoryField(field)}
                  </Box>
                ))}
              </Box>
              <Divider sx={{ mt: 2, mb: 2 }} />
            </Box>
          )}

          {/* Free-form attributes (skip schema-managed keys) */}
          {freeFormAttrs.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {categoryFields.length > 0 && (
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Custom Attributes
                </Typography>
              )}
              {attributes.map((attr, i) =>
                schemaKeys.has(attr.field_key) ? null : (
                  <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                    <TextField
                      label="Field Key"
                      value={attr.field_key}
                      onChange={e => handleAttrChange(i, 'field_key', e.target.value)}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Value"
                      value={attr.field_value || ''}
                      onChange={e => handleAttrChange(i, 'field_value', e.target.value)}
                      size="small"
                      sx={{ flex: 2 }}
                    />
                    <IconButton size="small" color="error" onClick={() => handleRemoveAttr(i)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )
              )}
              <Divider sx={{ my: 2 }} />
            </Box>
          )}

          {/* Add free-form attribute */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              label="New Field Key"
              value={newAttrKey}
              onChange={e => setNewAttrKey(e.target.value)}
              size="small"
              sx={{ flex: 1 }}
              placeholder="e.g. brand, model, color"
            />
            <TextField
              label="Value"
              value={newAttrValue}
              onChange={e => setNewAttrValue(e.target.value)}
              size="small"
              sx={{ flex: 2 }}
            />
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddAttr}
              disabled={!newAttrKey.trim()}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Add
            </Button>
          </Box>

          {categoryFields.length === 0 && freeFormAttrs.length === 0 && !newAttrKey && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {categoryId
                ? 'No fields defined for this category. Add custom key-value pairs above.'
                : 'Select a category on the Details tab to see its fields, or add custom key-value pairs above.'}
            </Typography>
          )}
        </TabPanel>
      </Box>
    </Box>
  );
}

export default HardgoodsEdit;
