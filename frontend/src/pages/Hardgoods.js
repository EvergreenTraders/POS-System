import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Grid,
  Tooltip,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useStoreStatus } from '../context/StoreStatusContext';
import config from '../config';
import axios from 'axios';

const API_BASE_URL = config.apiUrl;

const FALLBACK_MODE = { label: 'Unknown', color: 'default' };
const FALLBACK_PROC = { label: 'Unknown', color: 'default' };

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%23f5f5f5'/%3E%3Ctext x='60' y='68' font-family='sans-serif' font-size='11' fill='%23bbb' text-anchor='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

function getImageUrl(images) {
  try {
    if (typeof images === 'string') images = JSON.parse(images);
    if (!images || !Array.isArray(images) || images.length === 0) return PLACEHOLDER_IMAGE;
    const primary = images.find(img => img.isPrimary) || images[0];
    const raw = primary?.url || primary?.image_url || (typeof primary === 'string' ? primary : null);
    if (!raw) return PLACEHOLDER_IMAGE;
    if (raw.startsWith('http')) return raw;
    if (raw.startsWith('/uploads')) return `${config.apiUrl.replace('/api', '')}${raw}`;
    return raw;
  } catch {
    return PLACEHOLDER_IMAGE;
  }
}

function formatPrice(val) {
  const n = parseFloat(val);
  return isNaN(n) ? '0.00' : n.toFixed(2);
}

function Hardgoods() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { isStoreClosed } = useStoreStatus();

  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reference data loaded from API
  const [modes, setModes] = useState([]);               // inventory_modes
  const [processingStatuses, setProcessingStatuses] = useState([]);  // processing_statuses
  const [inventoryStatuses, setInventoryStatuses] = useState([]);    // inventory_status

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [itemIdQuery, setItemIdQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('SELLABLE');
  const [selectedMode, setSelectedMode] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  const showProcessingCols = selectedStatus !== 'SELLABLE';

  // Lookup helpers derived from API data
  const getMode = (code) => modes.find(m => m.code === code) || FALLBACK_MODE;
  const getProcStatus = (code) => processingStatuses.find(p => p.code === code) || FALLBACK_PROC;

  useEffect(() => {
    fetchReferenceData();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [selectedStatus, selectedMode, selectedCategory]);

  const fetchReferenceData = async () => {
    try {
      const [modesRes, procRes, statusRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/inventory-modes`),
        axios.get(`${API_BASE_URL}/processing-statuses`),
        axios.get(`${API_BASE_URL}/inventory-status`),
      ]);
      setModes(modesRes.data);
      setProcessingStatuses(procRes.data);
      setInventoryStatuses(statusRes.data);
    } catch (err) {
      console.error('Error fetching reference data:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      // Find HG division id then fetch its categories
      const divsRes = await axios.get(`${API_BASE_URL}/divisions`);
      const hg = divsRes.data.find(d => d.code === 'HG');
      if (!hg) return;
      const catRes = await axios.get(`${API_BASE_URL}/categories?division_id=${hg.id}`);
      setCategories(catRes.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus === 'SELLABLE') {
        params.set('sellable_status', 'SELLABLE');
      } else if (selectedStatus !== 'ALL') {
        params.set('status', selectedStatus);
      }
      if (selectedMode)     params.set('mode', selectedMode);
      if (selectedCategory) params.set('category_id', selectedCategory);

      const res = await axios.get(`${API_BASE_URL}/hardgoods?${params.toString()}`);
      setItems(res.data);
      if (res.data.length > 0) setSelectedItem(res.data[0]);
      else setSelectedItem(null);
    } catch (err) {
      console.error('Error fetching hardgoods:', err);
      enqueueSnackbar('Failed to load hardgoods', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    navigate('/hardgoods-edit', { state: { itemId: item.item_id } });
  };

  // Client-side search filter
  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery === '' ||
      item.short_desc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.long_desc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesId = itemIdQuery === '' ||
      item.item_id?.toLowerCase().includes(itemIdQuery.toLowerCase()) ||
      item.part_number?.toLowerCase().includes(itemIdQuery.toLowerCase());
    return matchesSearch && matchesId;
  });

  // Price display depends on mode
  const displayPrice = (item) => {
    if (item.mode === 'BUCKET') return `$${formatPrice(item.bucket_value)}`;
    return `$${formatPrice(item.retail_price)}`;
  };

  // Quantity/value display for STOCK and BUCKET
  const displayQtyOrValue = (item) => {
    if (item.mode === 'STOCK')  return `Qty: ${item.quantity ?? '-'}`;
    if (item.mode === 'BUCKET') return `Value: $${formatPrice(item.bucket_value)}`;
    if (item.mode === 'UNIT' && item.serial_number) return `S/N: ${item.serial_number}`;
    return '-';
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Grid container sx={{ flex: 1, overflow: 'hidden' }}>

        {/* ── Table Section (75%) ── */}
        <Grid item xs={9} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* Filters bar */}
          <Box sx={{
            display: 'flex', gap: 1.5, p: 2,
            bgcolor: 'background.paper',
            borderBottom: 1, borderColor: 'divider',
            alignItems: 'center', flexWrap: 'wrap'
          }}>
            <TextField
              size="small"
              placeholder="Search description / category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              sx={{ flex: 2, minWidth: 180 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
            <TextField
              size="small"
              placeholder="Item ID / Part #..."
              value={itemIdQuery}
              onChange={e => setItemIdQuery(e.target.value)}
              sx={{ flex: 1, minWidth: 140 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} label="Status">
                <MenuItem value="SELLABLE">Sellable Items</MenuItem>
                <MenuItem value="ALL">All Statuses</MenuItem>
                {inventoryStatuses.map(s => (
                  <MenuItem key={s.status_code} value={s.status_code}>{s.status_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Mode</InputLabel>
              <Select value={selectedMode} onChange={e => setSelectedMode(e.target.value)} label="Mode">
                <MenuItem value="">All Modes</MenuItem>
                {modes.map(m => (
                  <MenuItem key={m.code} value={m.code}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} label="Category">
                <MenuItem value="">All Categories</MenuItem>
                {categories.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Table */}
          <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
            <Table stickyHeader size="small" aria-label="hardgoods inventory">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 140 }}>Item ID</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell sx={{ width: 120 }}>Category</TableCell>
                  <TableCell sx={{ width: 90 }}>Mode</TableCell>
                  <TableCell sx={{ width: 110 }}>Qty / Serial</TableCell>
                  <TableCell sx={{ width: 90 }}>Price</TableCell>
                  <TableCell sx={{ width: 80 }}>Status</TableCell>
                  <TableCell sx={{ width: 90 }}>Added</TableCell>
                  {showProcessingCols && <TableCell sx={{ width: 120 }}>Stage</TableCell>}
                  {showProcessingCols && <TableCell sx={{ width: 130 }}>Blocking Reason</TableCell>}
                  <TableCell sx={{ width: 80 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9 + (showProcessingCols ? 2 : 0)} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9 + (showProcessingCols ? 2 : 0)} align="center" sx={{ py: 4 }}>
                      No hardgoods items found
                    </TableCell>
                  </TableRow>
                ) : filteredItems.map(item => (
                  <TableRow
                    key={item.item_id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      bgcolor: selectedItem?.item_id === item.item_id ? 'action.selected' : 'inherit'
                    }}
                    onClick={() => setSelectedItem(item)}
                  >
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {item.item_id}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 240 }}>
                        {item.short_desc || item.long_desc || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>{item.category_name || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const m = getMode(item.mode);
                        return <Chip label={m.label} color={m.color || m.ui_color || 'default'} size="small" />;
                      })()}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                      {displayQtyOrValue(item)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{displayPrice(item)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {item.status}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    {showProcessingCols && (
                      <TableCell>
                        {item.processing_status ? (() => {
                          const s = getProcStatus(item.processing_status);
                          return (
                            <Chip
                              label={s.label}
                              color={s.color || s.ui_color || 'default'}
                              size="small"
                              icon={item.processing_status === 'EXCEPTION' ? <WarningAmberIcon /> : undefined}
                            />
                          );
                        })() : '—'}
                      </TableCell>
                    )}
                    {showProcessingCols && (
                      <TableCell>
                        {item.blocking_reason ? (
                          <Tooltip title={item.blocking_reason} arrow>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'warning.main' }}>
                              <WarningAmberIcon fontSize="small" />
                              <Typography variant="caption" noWrap sx={{ maxWidth: 120 }}>
                                {item.blocking_reason}
                              </Typography>
                            </Box>
                          </Tooltip>
                        ) : '—'}
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        disabled={isStoreClosed}
                        onClick={e => { e.stopPropagation(); handleEditClick(item); }}
                        sx={{ fontSize: '0.72rem', py: 0.4, px: 1 }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* ── Detail Panel (25%) ── */}
        <Grid item xs={3} sx={{
          height: '100%', borderLeft: 1, borderColor: 'divider',
          bgcolor: 'background.paper', overflow: 'auto'
        }}>
          {selectedItem ? (
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>

              {/* Image + title */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ width: 100, height: 100, flexShrink: 0 }}>
                  <img
                    src={getImageUrl(selectedItem.images)}
                    alt={selectedItem.short_desc || 'Item'}
                    onError={e => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMAGE; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {selectedItem.short_desc || selectedItem.long_desc || 'No Description'}
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'success.main', mb: 0.5 }}>
                    {displayPrice(selectedItem)}
                  </Typography>
                  {(() => {
                    const m = getMode(selectedItem.mode);
                    return <Chip label={m.label} color={m.color || m.ui_color || 'default'} size="small" />;
                  })()}
                </Box>
              </Box>

              {/* Specs grid */}
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'primary.main', mb: 1 }}>
                  Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Category</Typography>
                    <Typography variant="body2">{selectedItem.category_name || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Status</Typography>
                    <Typography variant="body2">{selectedItem.status}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Condition</Typography>
                    <Typography variant="body2">{selectedItem.condition || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Location</Typography>
                    <Typography variant="body2">{selectedItem.location || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Cost</Typography>
                    <Typography variant="body2">${formatPrice(selectedItem.cost_price)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Retail</Typography>
                    <Typography variant="body2">${formatPrice(selectedItem.retail_price)}</Typography>
                  </Box>

                  {/* Mode-specific fields */}
                  {selectedItem.mode === 'UNIT' && (
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <Typography variant="caption" color="textSecondary">Serial Number</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {selectedItem.serial_number || '—'}
                      </Typography>
                    </Box>
                  )}
                  {selectedItem.mode === 'STOCK' && (
                    <Box>
                      <Typography variant="caption" color="textSecondary">Qty on Hand</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {selectedItem.quantity ?? '—'}
                      </Typography>
                    </Box>
                  )}
                  {selectedItem.mode === 'BUCKET' && (
                    <Box>
                      <Typography variant="caption" color="textSecondary">Bucket Value</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                        ${formatPrice(selectedItem.bucket_value)}
                      </Typography>
                    </Box>
                  )}

                  <Box>
                    <Typography variant="caption" color="textSecondary">Added</Typography>
                    <Typography variant="body2">
                      {new Date(selectedItem.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Processing status (shown when not SELLABLE filter) */}
              {selectedItem.processing_status && (
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: 'primary.main', mb: 1 }}>
                    Processing
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {(() => {
                      const s = getProcStatus(selectedItem.processing_status);
                      return (
                        <Chip
                          label={s.label}
                          color={s.color || s.ui_color || 'default'}
                          size="small"
                          sx={{ alignSelf: 'flex-start' }}
                        />
                      );
                    })()}
                    {selectedItem.blocking_reason && (
                      <Typography variant="caption" sx={{ color: 'warning.main', mt: 0.5 }}>
                        {selectedItem.blocking_reason}
                      </Typography>
                    )}
                    {selectedItem.next_action && (
                      <Typography variant="caption" color="textSecondary">
                        Next: {selectedItem.next_action}
                      </Typography>
                    )}
                  </Box>
                </Paper>
              )}

              {/* IDs */}
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Item ID</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedItem.item_id}</Typography>
                  </Box>
                  {selectedItem.part_number && (
                    <Box>
                      <Typography variant="caption" color="textSecondary">Part #</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedItem.part_number}</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>

              <Button
                variant="contained"
                fullWidth
                disabled={isStoreClosed}
                onClick={() => handleEditClick(selectedItem)}
              >
                Edit Item
              </Button>
            </Box>
          ) : (
            <Box sx={{ p: 3, color: 'text.secondary', textAlign: 'center', mt: 4 }}>
              <Typography variant="body2">Select an item to view details</Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default Hardgoods;
