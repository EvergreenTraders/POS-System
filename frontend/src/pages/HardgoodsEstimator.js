import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
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

  const buildItem = () => {
    const categoryName = categories.find(c => c.id === form.categoryId)?.name || '';
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
    };
  };

  const handleAddItem = () => {
    if (!form.shortDesc.trim()) {
      enqueueSnackbar('Description is required', { variant: 'warning' });
      return;
    }
    if (!form.buyPrice || parseFloat(form.buyPrice) <= 0) {
      enqueueSnackbar('Buy price is required', { variant: 'warning' });
      return;
    }
    setEstimatedItems(prev => [...prev, buildItem()]);
    setForm(EMPTY_FORM);
    enqueueSnackbar('Item added', { variant: 'success' });
  };

  const handleRemoveItem = (index) => {
    setEstimatedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleProceedToCheckout = () => {
    // If the form has unsaved data, treat it as an implicit "Add Item"
    let items = [...estimatedItems];
    if (form.shortDesc.trim()) {
      if (!form.buyPrice || parseFloat(form.buyPrice) <= 0) {
        enqueueSnackbar('Buy price is required for the current item', { variant: 'warning' });
        return;
      }
      items = [...items, buildItem()];
    }

    if (items.length === 0) {
      enqueueSnackbar('Add at least one item before proceeding', { variant: 'warning' });
      return;
    }

    // All items in one session share one ticket ID; suffix 01, 02, 03... applied in Checkout
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

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <Paper elevation={1} sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, zIndex: 1 }}>
        <IconButton onClick={() => navigate(-1)} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
          New Hardgoods Item — Intake
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddItem}
          sx={{ mr: 1 }}
        >
          Add Item
        </Button>
        <Button
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          onClick={handleProceedToCheckout}
          sx={{ minWidth: 180 }}
        >
          Proceed to Checkout{estimatedItems.length > 0 ? ` (${estimatedItems.length})` : ''}
        </Button>
      </Paper>

      {/* Body: form left, price estimates + summary right */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

        {/* Left: intake form */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 3 }}>
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
                <Select value={form.categoryId} onChange={e => setField('categoryId', e.target.value)} label="Category">
                  <MenuItem value=""><em>None</em></MenuItem>
                  {categories.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

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

        {/* Right: price estimates + items added */}
        <Box sx={{ width: 270, flexShrink: 0, overflow: 'auto', px: 2, py: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Price Estimates for current item */}
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

          {/* Items added this session */}
          {estimatedItems.length > 0 && (
            <Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Items Added ({estimatedItems.length})
              </Typography>
              <List dense disablePadding>
                {estimatedItems.map((item, idx) => (
                  <ListItem
                    key={idx}
                    disablePadding
                    secondaryAction={
                      <IconButton edge="end" size="small" onClick={() => handleRemoveItem(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                    sx={{ pr: 4 }}
                  >
                    <ListItemText
                      primary={`${String(idx + 1).padStart(2, '0')}. ${item.short_desc}`}
                      secondary={`Buy: $${item.buy_price?.toFixed(2)}`}
                      primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

        </Box>

      </Box>
    </Box>
  );
}

export default HardgoodsEstimator;
