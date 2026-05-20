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
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
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

  // Read-only display
  const [originalIntakeDesc, setOriginalIntakeDesc] = useState('');
  const [createdAt, setCreatedAt] = useState('');

  // Editable form state — Tab 1: Details
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

  // Tab 2: Mode & Pricing
  const [mode, setMode] = useState('PIECE');
  const [costPrice, setCostPrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [bucketValue, setBucketValue] = useState('');

  // Tab 3: Processing
  const [status, setStatus] = useState('HOLD');
  const [sellableStatus, setSellableStatus] = useState('NOT_SELLABLE');
  const [processingStatus, setProcessingStatus] = useState('INTAKE_PENDING');
  const [processingQueue, setProcessingQueue] = useState('');
  const [blockingReason, setBlockingReason] = useState('');
  const [nextAction, setNextAction] = useState('');

  // Dynamic attributes
  const [attributes, setAttributes] = useState([]);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  useEffect(() => {
    if (!itemId) {
      enqueueSnackbar('No item ID provided', { variant: 'error' });
      navigate('/inventory/hardgoods');
      return;
    }
    loadAll();
  }, [itemId]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [itemRes, modesRes, procRes, statusRes, divsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/hardgoods/${itemId}`),
        axios.get(`${API_BASE_URL}/inventory-modes`),
        axios.get(`${API_BASE_URL}/processing-statuses`),
        axios.get(`${API_BASE_URL}/inventory-status`),
        axios.get(`${API_BASE_URL}/divisions`),
      ]);

      setModes(modesRes.data);
      setProcessingStatuses(procRes.data);
      setInventoryStatuses(statusRes.data);

      const hg = divsRes.data.find(d => d.code === 'HG');
      if (hg) {
        const catRes = await axios.get(`${API_BASE_URL}/categories?division_id=${hg.id}`);
        setCategories(catRes.data);
      }

      populateForm(itemRes.data);
    } catch (err) {
      console.error('Error loading hardgoods item:', err);
      enqueueSnackbar('Failed to load item', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

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

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        short_desc:         shortDesc   || null,
        long_desc:          longDesc    || null,
        category_id:        categoryId  || null,
        condition:          condition   || null,
        location:           itemLocation || null,
        notes:              notes       || null,
        source:             source      || null,
        part_number:        partNumber  || null,
        is_memo:            isMemo,
        memo_due_date:      isMemo && memoDueDate ? memoDueDate : null,

        mode:               mode,
        cost_price:         costPrice  !== '' ? parseFloat(costPrice)  : null,
        retail_price:       retailPrice !== '' ? parseFloat(retailPrice) : null,
        serial_number:      mode === 'UNIT'   ? (serialNumber || null) : null,
        quantity:           mode === 'STOCK'  ? (quantity !== '' ? parseInt(quantity, 10) : null) : null,
        bucket_value:       mode === 'BUCKET' ? (bucketValue !== '' ? parseFloat(bucketValue) : null) : null,

        status:             status,
        sellable_status:    sellableStatus,
        processing_status:  processingStatus,
        processing_queue:   processingQueue  || null,
        blocking_reason:    blockingReason   || null,
        next_action:        nextAction        || null,

        attributes: attributes.filter(a => a.field_key),
      };

      await axios.put(`${API_BASE_URL}/hardgoods/${itemId}`, payload);
      enqueueSnackbar('Item saved successfully', { variant: 'success' });
    } catch (err) {
      console.error('Error saving hardgoods item:', err);
      enqueueSnackbar('Failed to save item', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAttrChange = (index, field, value) => {
    setAttributes(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const handleAddAttr = () => {
    if (!newAttrKey.trim()) return;
    setAttributes(prev => [...prev, { field_key: newAttrKey.trim(), field_value: newAttrValue }]);
    setNewAttrKey('');
    setNewAttrValue('');
  };

  const handleRemoveAttr = (index) => {
    setAttributes(prev => prev.filter((_, i) => i !== index));
  };

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
            Edit Hardgoods Item
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

      {/* ── Original intake description (locked) ── */}
      {originalIntakeDesc && (
        <Box sx={{ px: 3, pt: 1.5, pb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, bgcolor: 'grey.50', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Tooltip title="Original intake description — cannot be changed">
              <LockIcon fontSize="small" sx={{ mt: 0.2, color: 'text.disabled' }} />
            </Tooltip>
            <Box>
              <Typography variant="caption" color="text.secondary">Original Intake Description</Typography>
              <Typography variant="body2">{originalIntakeDesc}</Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Tabs ── */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, pb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
          <Tab label="Details" />
          <Tab label="Mode & Pricing" />
          <Tab label="Processing" />
          <Tab label={`Attributes (${attributes.length})`} />
        </Tabs>

        {/* ── Tab 0: Details ── */}
        <TabPanel value={tab} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField
                label="Short Description"
                value={shortDesc}
                onChange={e => setShortDesc(e.target.value)}
                fullWidth size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select value={categoryId} onChange={e => setCategoryId(e.target.value)} label="Category">
                  <MenuItem value=""><em>None</em></MenuItem>
                  {categories.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Long Description"
                value={longDesc}
                onChange={e => setLongDesc(e.target.value)}
                fullWidth multiline minRows={3} size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Condition</InputLabel>
                <Select value={condition} onChange={e => setCondition(e.target.value)} label="Condition">
                  <MenuItem value=""><em>Not specified</em></MenuItem>
                  {CONDITION_OPTIONS.map(c => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Location"
                value={itemLocation}
                onChange={e => setItemLocation(e.target.value)}
                fullWidth size="small"
                placeholder="e.g. Showcase 3, Shelf B"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Part Number"
                value={partNumber}
                onChange={e => setPartNumber(e.target.value)}
                fullWidth size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Source</InputLabel>
                <Select value={source} onChange={e => setSource(e.target.value)} label="Source">
                  <MenuItem value=""><em>Not specified</em></MenuItem>
                  {SOURCE_OPTIONS.map(s => (
                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch checked={isMemo} onChange={e => setIsMemo(e.target.checked)} />}
                label="Vendor Memo"
              />
            </Grid>
            {isMemo && (
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Memo Due Date"
                  type="date"
                  value={memoDueDate}
                  onChange={e => setMemoDueDate(e.target.value)}
                  fullWidth size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                label="Notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                fullWidth multiline minRows={2} size="small"
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* ── Tab 1: Mode & Pricing ── */}
        <TabPanel value={tab} index={1}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Mode</InputLabel>
                <Select value={mode} onChange={e => setMode(e.target.value)} label="Mode">
                  {modes.map(m => (
                    <MenuItem key={m.code} value={m.code}>{m.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Cost Price"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                value={costPrice}
                onChange={e => setCostPrice(e.target.value)}
                fullWidth size="small"
              />
            </Grid>
            {mode !== 'BUCKET' && (
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Retail Price"
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                  value={retailPrice}
                  onChange={e => setRetailPrice(e.target.value)}
                  fullWidth size="small"
                />
              </Grid>
            )}

            {mode === 'UNIT' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Serial Number"
                  value={serialNumber}
                  onChange={e => setSerialNumber(e.target.value)}
                  fullWidth size="small"
                />
              </Grid>
            )}
            {mode === 'STOCK' && (
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Quantity on Hand"
                  type="number"
                  inputProps={{ min: 0, step: 1 }}
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  fullWidth size="small"
                />
              </Grid>
            )}
            {mode === 'BUCKET' && (
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Bucket Value"
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                  value={bucketValue}
                  onChange={e => setBucketValue(e.target.value)}
                  fullWidth size="small"
                  helperText="Total value of the mixed lot"
                />
              </Grid>
            )}

            {mode === 'PIECE' && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  PIECE mode — unique one-off item. No serial, quantity, or bucket fields apply.
                </Typography>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* ── Tab 2: Processing ── */}
        <TabPanel value={tab} index={2}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Item Status</InputLabel>
                <Select value={status} onChange={e => setStatus(e.target.value)} label="Item Status">
                  {inventoryStatuses.map(s => (
                    <MenuItem key={s.status_code} value={s.status_code}>{s.status_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Sellable Status</InputLabel>
                <Select value={sellableStatus} onChange={e => setSellableStatus(e.target.value)} label="Sellable Status">
                  <MenuItem value="SELLABLE">
                    <Chip label="Sellable" color="success" size="small" sx={{ pointerEvents: 'none' }} />
                  </MenuItem>
                  <MenuItem value="NOT_SELLABLE">
                    <Chip label="Not Sellable" color="default" size="small" sx={{ pointerEvents: 'none' }} />
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Processing Status</InputLabel>
                <Select value={processingStatus} onChange={e => setProcessingStatus(e.target.value)} label="Processing Status">
                  {processingStatuses.map(s => (
                    <MenuItem key={s.code} value={s.code}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={s.label} color={s.ui_color || 'default'} size="small" sx={{ pointerEvents: 'none' }} />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Processing Queue"
                value={processingQueue}
                onChange={e => setProcessingQueue(e.target.value)}
                fullWidth size="small"
                placeholder="e.g. ELECTRONICS, REPAIRS"
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                label="Blocking Reason"
                value={blockingReason}
                onChange={e => setBlockingReason(e.target.value)}
                fullWidth size="small"
                placeholder="Required when status is EXCEPTION"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Next Action"
                value={nextAction}
                onChange={e => setNextAction(e.target.value)}
                fullWidth size="small"
                placeholder="What needs to happen next"
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* ── Tab 3: Attributes ── */}
        <TabPanel value={tab} index={3}>
          {attributes.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {attributes.map((attr, i) => (
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
              ))}
              <Divider sx={{ my: 2 }} />
            </Box>
          )}

          {/* Add new attribute */}
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

          {attributes.length === 0 && !newAttrKey && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No custom attributes yet. Add key-value pairs above for category-specific details.
            </Typography>
          )}
        </TabPanel>
      </Box>
    </Box>
  );
}

export default HardgoodsEdit;
