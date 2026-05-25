import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
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
];

const CONDITION_OPTIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor', 'Damaged'];

const EMPTY_FORM = {
  shortDesc: '',
  longDesc: '',
  categoryId: '',
  condition: '',
  source: 'CUSTOMER_PURCHASE',
  partNumber: '',
  notes: '',
  pawnPrice: '',
  buyPrice: '',
  retailPrice: '',
  images: [],
};

function generateTicketId() {
  let last = parseInt(localStorage.getItem('lastBuySaleTicketNumber') || '0');
  last += 1;
  localStorage.setItem('lastBuySaleTicketNumber', last.toString());
  return `BT-${last.toString().padStart(8, '0')}`;
}

function PriceRow({ label, value, onChange, borderBottom = true }) {
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      p: 1.5,
      ...(borderBottom && { borderBottom: '1px solid', borderColor: 'divider' }),
    }}>
      <Typography variant="subtitle1" sx={{ flex: 1, color: 'text.secondary' }}>
        {label}: $
      </Typography>
      <TextField
        size="small"
        type="number"
        value={value}
        variant="standard"
        onChange={e => onChange(e.target.value)}
        inputProps={{ min: 0, step: 0.01, inputMode: 'decimal', style: { width: '80px' } }}
        sx={{ ml: 1, '& .MuiInputBase-root': { ml: 0, pl: 0 } }}
      />
    </Box>
  );
}

function HardgoodsEstimator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();

  const [categories, setCategories] = useState([]);
  const [estimatedItems, setEstimatedItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [categoryFields, setCategoryFields] = useState([]);
  const [categoryFieldValues, setCategoryFieldValues] = useState({});
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [itemDetails, setItemDetails] = useState({ notes: '', condition: '', longDesc: '' });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const divsRes = await axios.get(`${API_BASE_URL}/divisions`);
      const hg = divsRes.data.find(d => d.code === 'HG');
      if (hg) {
        const catRes = await axios.get(`${API_BASE_URL}/categories?division_id=${hg.id}`);
        setCategories(catRes.data);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleCategoryChange = async (catId) => {
    setField('categoryId', catId);
    if (!catId) {
      setCategoryFields([]);
      setCategoryFieldValues({});
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URL}/category-field-rules/${catId}`);
      setCategoryFields(res.data);
      const valMap = {};
      for (const f of res.data) {
        valMap[f.field_key] = f.data_type === 'BOOLEAN'
          ? (f.default_value ?? 'false')
          : (f.default_value ?? '');
      }
      setCategoryFieldValues(valMap);
    } catch (err) {
      console.error('Error loading category fields:', err);
      setCategoryFields([]);
      setCategoryFieldValues({});
    }
  };

  const renderCategoryField = (field) => {
    const label = field.label_override || field.label || field.field_key;
    const val   = categoryFieldValues[field.field_key] ?? '';
    const isRequired = field.required_for_inventory;
    const onChange = (newVal) =>
      setCategoryFieldValues(prev => ({ ...prev, [field.field_key]: newVal }));

    switch (field.data_type) {
      case 'NUMBER':
        return (
          <TextField
            key={field.field_key}
            label={label} type="number" value={val}
            onChange={e => onChange(e.target.value)}
            size="small" fullWidth required={isRequired}
            helperText={field.help_text || undefined}
          />
        );
      case 'ENUM': {
        const opts = Array.isArray(field.allowed_values) ? field.allowed_values : [];
        return (
          <FormControl key={field.field_key} fullWidth size="small" required={isRequired}>
            <InputLabel>{label}</InputLabel>
            <Select value={val} onChange={e => onChange(e.target.value)} label={label}>
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
            key={field.field_key}
            control={
              <Switch
                checked={val === 'true' || val === true}
                onChange={e => onChange(e.target.checked ? 'true' : 'false')}
              />
            }
            label={label}
          />
        );
      case 'DATE':
        return (
          <TextField
            key={field.field_key}
            label={label} type="date" value={val}
            onChange={e => onChange(e.target.value)}
            size="small" fullWidth required={isRequired}
            InputLabelProps={{ shrink: true }}
            helperText={field.help_text || undefined}
          />
        );
      default:
        return (
          <TextField
            key={field.field_key}
            label={label} value={val}
            onChange={e => onChange(e.target.value)}
            size="small" fullWidth required={isRequired}
            helperText={field.help_text || undefined}
          />
        );
    }
  };

  const buildItem = () => {
    const categoryName = categories.find(c => c.id === form.categoryId)?.name || '';
    const attributes = categoryFields
      .map(f => ({ field_key: f.field_key, field_value: categoryFieldValues[f.field_key] ?? null }))
      .filter(a => a.field_value !== null && a.field_value !== '');
    return {
      transaction_type: 'buy',
      price: parseFloat(form.buyPrice),
      description: form.shortDesc,
      short_desc: form.shortDesc,
      long_desc: form.longDesc || null,
      category_id: form.categoryId || null,
      category_name: categoryName,
      condition: form.condition || null,
      source: form.source || null,
      part_number: form.partNumber || null,
      pawn_price: form.pawnPrice ? parseFloat(form.pawnPrice) : null,
      buy_price: parseFloat(form.buyPrice),
      retail_price: form.retailPrice ? parseFloat(form.retailPrice) : null,
      notes: form.notes || null,
      fromEstimator: 'hardgoods',
      attributes,
      images: form.images.map((img, idx) => ({
        url: img.url,
        file: img.file,
        isPrimary: idx === 0,
      })),
    };
  };

  const handleRemoveItem = (index) => {
    setEstimatedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveFormImage = (index) => {
    setField('images', form.images.filter((_, i) => i !== index));
  };

  const handleProceedToCheckout = () => {
    let items = [...estimatedItems];
    if (form.shortDesc.trim()) {
      if (!form.buyPrice || parseFloat(form.buyPrice) <= 0) {
        enqueueSnackbar('Buy price is required for the current item', { variant: 'warning' });
        return;
      }
      // Validate required category fields on the current unsaved item
      const missing = categoryFields.filter(
        f => f.required_for_inventory && !categoryFieldValues[f.field_key]
      );
      if (missing.length > 0) {
        enqueueSnackbar(`Required fields missing: ${missing.map(f => f.label_override || f.label || f.field_key).join(', ')}`, { variant: 'warning' });
        return;
      }
      items = [...items, buildItem()];
    }

    if (items.length === 0) {
      enqueueSnackbar('Add at least one item before proceeding', { variant: 'warning' });
      return;
    }

    const ticketId = generateTicketId();
    const itemsWithTicket = items.map(item => ({ ...item, buyTicketId: ticketId }));

    navigate('/checkout', {
      state: {
        customer: location.state?.customer || null,
        items: itemsWithTicket,
        from: 'hardgoods',
      },
    });
  };

  const handleAddAnother = () => {
    if (!form.shortDesc.trim()) {
      enqueueSnackbar('Description is required', { variant: 'warning' });
      return;
    }
    if (!form.buyPrice || parseFloat(form.buyPrice) <= 0) {
      enqueueSnackbar('Buy price is required', { variant: 'warning' });
      return;
    }
    const missing = categoryFields.filter(
      f => f.required_for_inventory && !categoryFieldValues[f.field_key]
    );
    if (missing.length > 0) {
      enqueueSnackbar(`Required fields missing: ${missing.map(f => f.label_override || f.label || f.field_key).join(', ')}`, { variant: 'warning' });
      return;
    }
    setEstimatedItems(prev => [...prev, buildItem()]);
    setForm(EMPTY_FORM);
    setCategoryFields([]);
    setCategoryFieldValues({});
    enqueueSnackbar('Item added — fill in the next item', { variant: 'success' });
  };

  const handleTransactionTypeChange = (index, newType) => {
    setEstimatedItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], transaction_type: newType };
      return updated;
    });
  };

  const handlePriceChange = (index, newPrice) => {
    setEstimatedItems(prev => {
      const updated = [...prev];
      const item = updated[index];
      const type = item.transaction_type || 'buy';
      const priceKey = type === 'pawn' ? 'pawn_price' : type === 'retail' ? 'retail_price' : 'buy_price';
      updated[index] = { ...item, [priceKey]: parseFloat(newPrice) || 0 };
      return updated;
    });
  };

  const handleOpenDetails = (index) => {
    const item = estimatedItems[index];
    setItemDetails({
      notes: item.notes || '',
      condition: item.condition || '',
      longDesc: item.long_desc || '',
    });
    setSelectedItemIndex(index);
    setOpenDetailsDialog(true);
  };

  const handleDetailChange = (key, value) => {
    setItemDetails(prev => ({ ...prev, [key]: value }));
  };

  const handleDetailSave = () => {
    setEstimatedItems(prev => {
      const updated = [...prev];
      updated[selectedItemIndex] = {
        ...updated[selectedItemIndex],
        notes: itemDetails.notes,
        condition: itemDetails.condition,
        long_desc: itemDetails.longDesc,
      };
      return updated;
    });
    setOpenDetailsDialog(false);
    setSelectedItemIndex(null);
  };

  const handleAddToTicket = () => {
    navigate('/customer-ticket', {
      state: {
        items: estimatedItems,
        customer: location.state?.customer || null,
        from: 'hardgoods',
      },
    });
  };

  const getItemPrice = (item) => {
    const type = item.transaction_type || 'buy';
    if (type === 'pawn') return item.pawn_price || 0;
    if (type === 'retail') return item.retail_price || 0;
    return item.buy_price || 0;
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <Paper elevation={1} sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, zIndex: 1 }}>
        <IconButton onClick={() => navigate(-1)} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
          New Hardgoods Item — Intake
        </Typography>
        <Button
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          onClick={handleProceedToCheckout}
          sx={{ minWidth: 180 }}
        >
          Proceed to Checkout{estimatedItems.length > 0 ? ` (${estimatedItems.length})` : ''}
        </Button>
      </Paper>

      {/* Scrollable body */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>

        {/* 3-panel row */}
        <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>

          {/* Left: intake form */}
          <Box sx={{ flex: 1, px: 3, py: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 700 }}>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Description *"
                  value={form.shortDesc}
                  onChange={e => setField('shortDesc', e.target.value)}
                  fullWidth size="small"
                  placeholder="What is the item?"
                  sx={{ flex: 2 }}
                />
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={form.categoryId}
                    onChange={e => handleCategoryChange(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {categories.map(c => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Dynamic category fields */}
              {categoryFields.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1.5 }}>
                  {categoryFields.map(field => renderCategoryField(field))}
                </Box>
              )}

              <TextField
                label="Additional Details"
                value={form.longDesc}
                onChange={e => setField('longDesc', e.target.value)}
                fullWidth multiline minRows={2} size="small"
                placeholder="Brand, model, serial number, colour, accessories included…"
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Condition</InputLabel>
                  <Select value={form.condition} onChange={e => setField('condition', e.target.value)} label="Condition">
                    <MenuItem value=""><em>Not specified</em></MenuItem>
                    {CONDITION_OPTIONS.map(c => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Source</InputLabel>
                  <Select value={form.source} onChange={e => setField('source', e.target.value)} label="Source">
                    {SOURCE_OPTIONS.map(s => (
                      <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Part / Model Number"
                  value={form.partNumber}
                  onChange={e => setField('partNumber', e.target.value)}
                  fullWidth size="small"
                />
              </Box>

              <TextField
                label="Notes"
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                fullWidth multiline minRows={2} size="small"
              />

            </Box>
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Middle: Photos */}
          <Box sx={{ width: 190, flexShrink: 0, px: 2, py: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Photos</Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {form.images.map((img, idx) => (
                <Box key={idx} sx={{ position: 'relative', width: 72, height: 72 }}>
                  <img
                    src={img.url}
                    alt={`photo-${idx + 1}`}
                    style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'rgba(255,255,255,0.85)', p: 0.25 }}
                    onClick={() => handleRemoveFormImage(idx)}
                  >
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>

            <Button variant="outlined" size="small" component="label" startIcon={<AddIcon />}>
              Add Photos
              <input
                type="file"
                hidden
                multiple
                accept="image/*"
                onChange={e => {
                  const files = Array.from(e.target.files);
                  if (files.length) {
                    const newImgs = files.map((file, i) => ({
                      url: URL.createObjectURL(file),
                      file,
                      isPrimary: form.images.length === 0 && i === 0,
                    }));
                    setField('images', [...form.images, ...newImgs]);
                  }
                  e.target.value = '';
                }}
              />
            </Button>

            {form.images.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                {form.images.length} photo{form.images.length > 1 ? 's' : ''} — uploaded on checkout
              </Typography>
            )}
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Right: price estimates + add another */}
          <Box sx={{ width: 260, flexShrink: 0, px: 2, py: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>

            <Box>
              <Typography variant="h6" sx={{ mb: 1.5 }}>Price Estimates</Typography>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <PriceRow label="Pawn Value"   value={form.pawnPrice}   onChange={v => setField('pawnPrice', v)} />
                <PriceRow label="Buy Value"    value={form.buyPrice}    onChange={v => setField('buyPrice', v)} />
                <PriceRow label="Retail Value" value={form.retailPrice} onChange={v => setField('retailPrice', v)} borderBottom={false} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Buy Value is the amount offered to the customer.
              </Typography>
            </Box>

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddAnother}
              fullWidth
            >
              Add Another Item
            </Button>

          </Box>

        </Box>

        {/* Estimated Items Table */}
        <Paper elevation={3} sx={{ p: 2, m: 2 }}>
          <Typography variant="h6" gutterBottom>
            Estimated Items
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Image</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Transaction Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {estimatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No items added yet — fill in the form above and click "Add Another Item" or "Proceed to Checkout".
                    </TableCell>
                  </TableRow>
                ) : (
                  estimatedItems.map((item, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          '& .action-buttons': { opacity: 1 },
                        },
                      }}
                    >
                      <TableCell>
                        <img
                          src={item.images?.find(img => img.isPrimary)?.url || item.images?.[0]?.url || ''}
                          alt="item"
                          style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.short_desc}{item.category_name ? ` · ${item.category_name}` : ''}
                        </Typography>
                        {item.condition && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Condition: {item.condition}
                          </Typography>
                        )}
                        {item.notes && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {item.notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Select
                          value={item.transaction_type || 'buy'}
                          onChange={e => handleTransactionTypeChange(index, e.target.value)}
                          size="small"
                          sx={{ minWidth: 140 }}
                        >
                          <MenuItem value="buy">
                            <Box>
                              <Typography variant="body2">Buy</Typography>
                              <Typography variant="caption" color="text.secondary">
                                ${(item.buy_price || 0).toFixed(2)}
                              </Typography>
                            </Box>
                          </MenuItem>
                          <MenuItem value="pawn">
                            <Box>
                              <Typography variant="body2">Pawn</Typography>
                              <Typography variant="caption" color="text.secondary">
                                ${(item.pawn_price || 0).toFixed(2)}
                              </Typography>
                            </Box>
                          </MenuItem>
                          <MenuItem value="retail">
                            <Box>
                              <Typography variant="body2">Retail</Typography>
                              <Typography variant="caption" color="text.secondary">
                                ${(item.retail_price || 0).toFixed(2)}
                              </Typography>
                            </Box>
                          </MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <TextField
                          type="number"
                          value={getItemPrice(item).toFixed(2)}
                          onChange={e => handlePriceChange(index, e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          size="small"
                          sx={{ width: 130 }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Box
                          className="action-buttons"
                          sx={{ opacity: 0.7, transition: 'opacity 0.2s', display: 'flex', gap: 1 }}
                        >
                          <IconButton
                            onClick={e => { e.stopPropagation(); handleOpenDetails(index); }}
                            size="small"
                            sx={{ color: 'primary.main' }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={e => { e.stopPropagation(); handleRemoveItem(index); }}
                            size="small"
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Typography variant="h6">
              Total: ${estimatedItems.reduce((sum, item) => sum + getItemPrice(item), 0).toFixed(2)}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleAddToTicket}
                disabled={estimatedItems.length === 0}
              >
                Add to Ticket
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleProceedToCheckout}
                disabled={estimatedItems.length === 0}
                startIcon={<ArrowForwardIcon />}
              >
                Proceed to Checkout
              </Button>
            </Box>
          </Box>
        </Paper>

      </Box>

      {/* Item Details Dialog */}
      <Dialog
        open={openDetailsDialog}
        onClose={() => { setOpenDetailsDialog(false); setSelectedItemIndex(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Item Details</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Condition</InputLabel>
              <Select
                value={itemDetails.condition}
                onChange={e => handleDetailChange('condition', e.target.value)}
                label="Condition"
              >
                <MenuItem value=""><em>Not specified</em></MenuItem>
                {CONDITION_OPTIONS.map(c => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Additional Details"
              value={itemDetails.longDesc}
              onChange={e => handleDetailChange('longDesc', e.target.value)}
              multiline
              rows={3}
              fullWidth
              size="small"
              placeholder="Brand, model, accessories, serial number…"
            />
            <TextField
              label="Internal Notes"
              value={itemDetails.notes}
              onChange={e => handleDetailChange('notes', e.target.value)}
              multiline
              rows={2}
              fullWidth
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenDetailsDialog(false); setSelectedItemIndex(null); }}>Cancel</Button>
          <Button onClick={handleDetailSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default HardgoodsEstimator;
