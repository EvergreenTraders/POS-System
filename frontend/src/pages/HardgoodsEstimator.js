import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
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

function generateTicketId() {
  let last = parseInt(localStorage.getItem('lastBuySaleTicketNumber') || '0');
  last += 1;
  localStorage.setItem('lastBuySaleTicketNumber', last.toString());
  return `BT-${last.toString().padStart(8, '0')}`;
}

function HardgoodsEstimator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();

  const [categories, setCategories] = useState([]);

  const [shortDesc, setShortDesc]     = useState('');
  const [longDesc, setLongDesc]       = useState('');
  const [categoryId, setCategoryId]   = useState('');
  const [condition, setCondition]     = useState('');
  const [source, setSource]           = useState('CUSTOMER_PURCHASE');
  const [partNumber, setPartNumber]   = useState('');
  const [buyPrice, setBuyPrice]       = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [notes, setNotes]             = useState('');

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

  const handleProceedToCheckout = () => {
    if (!shortDesc.trim()) {
      enqueueSnackbar('Description is required', { variant: 'warning' });
      return;
    }
    if (!buyPrice || parseFloat(buyPrice) <= 0) {
      enqueueSnackbar('Buy price is required', { variant: 'warning' });
      return;
    }

    const ticketId = generateTicketId();
    const categoryName = categories.find(c => c.id === categoryId)?.name || '';

    const item = {
      transaction_type: 'buy',
      price: parseFloat(buyPrice),
      description: shortDesc,
      short_desc: shortDesc,
      long_desc: longDesc || null,
      category_id: categoryId || null,
      category_name: categoryName,
      condition: condition || null,
      source: source || null,
      part_number: partNumber || null,
      retail_price: retailPrice ? parseFloat(retailPrice) : null,
      notes: notes || null,
      fromEstimator: 'hardgoods',
      buyTicketId: ticketId,
    };

    navigate('/checkout', {
      state: {
        customer: location.state?.customer || null,
        items: [item],
        from: 'hardgoods',
      },
    });
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <Paper elevation={1} sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
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
          Proceed to Checkout
        </Button>
      </Paper>

      {/* Form */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 3 }}>
        <Grid container spacing={2} sx={{ maxWidth: 800 }}>

          <Grid item xs={12} sm={8}>
            <TextField
              label="Description *"
              value={shortDesc}
              onChange={e => setShortDesc(e.target.value)}
              fullWidth size="small"
              placeholder="What is the item?"
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
              label="Additional Details"
              value={longDesc}
              onChange={e => setLongDesc(e.target.value)}
              fullWidth multiline minRows={2} size="small"
              placeholder="Brand, model, serial number, colour, accessories included…"
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
            <FormControl fullWidth size="small">
              <InputLabel>Source</InputLabel>
              <Select value={source} onChange={e => setSource(e.target.value)} label="Source">
                {SOURCE_OPTIONS.map(s => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Part / Model Number"
              value={partNumber}
              onChange={e => setPartNumber(e.target.value)}
              fullWidth size="small"
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, mt: 1 }}>
              Pricing
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Buy Price (offer to customer) *"
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              value={buyPrice}
              onChange={e => setBuyPrice(e.target.value)}
              fullWidth size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Retail Price (optional)"
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              value={retailPrice}
              onChange={e => setRetailPrice(e.target.value)}
              fullWidth size="small"
              helperText="Can be set later in Edit"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              fullWidth multiline minRows={2} size="small"
            />
          </Grid>

        </Grid>
      </Box>
    </Box>
  );
}

export default HardgoodsEstimator;
