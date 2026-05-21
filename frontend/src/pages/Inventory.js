import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Chip, CircularProgress,
  Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';
import { useStoreStatus } from '../context/StoreStatusContext';
import axios from 'axios';
import config from '../config';

const API_BASE_URL = config.apiUrl;

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%23f5f5f5'/%3E%3Ctext x='60' y='68' font-family='sans-serif' font-size='11' fill='%23bbb' text-anchor='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

const PROC_STYLES = {
  ON_RETAIL_FLOOR: { color: 'success', label: 'Retail Floor' },
  READY_HOLDING:   { color: 'info',    label: 'Ready/Holding' },
  IN_PROCESSING:   { color: 'warning', label: 'In Processing' },
  INTAKE_PENDING:  { color: 'default', label: 'Intake Pending' },
  EXCEPTION:       { color: 'error',   label: 'Exception' },
};

const DIVISION_LABELS = { jewelry: 'Jewelry', hardgoods: 'Hardgoods' };

function getImageUrl(images) {
  try {
    if (typeof images === 'string') images = JSON.parse(images);
    if (!images || !Array.isArray(images) || images.length === 0) return PLACEHOLDER_IMAGE;
    const primary = images.find(img => img.isPrimary) || images[0];
    const raw = primary?.url || primary?.image_url || (typeof primary === 'string' ? primary : null);
    if (!raw) return PLACEHOLDER_IMAGE;
    if (raw.startsWith('http') || raw.startsWith('blob:') || raw.startsWith('data:')) return raw;
    if (raw.startsWith('/uploads')) return `${config.apiUrl.replace('/api', '')}${raw}`;
    return raw;
  } catch {
    return PLACEHOLDER_IMAGE;
  }
}

function fmt(val) {
  const n = parseFloat(val);
  return isNaN(n) ? '0.00' : n.toFixed(2);
}

function Inventory() {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const { user: currentUser } = useAuth();
  const { isStoreClosed } = useStoreStatus();

  const [allItems, setAllItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inventoryStatuses, setInventoryStatuses] = useState([]);

  // Scrap dialog state
  const [scrapDialogOpen, setScrapDialogOpen] = useState(false);
  const [itemToScrap, setItemToScrap] = useState(null);
  const [scrapBuckets, setScrapBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState('');
  const [loadingBuckets, setLoadingBuckets] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [itemIdQuery, setItemIdQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDivision, setSelectedDivision] = useState('all');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/inventory-status`)
      .then(r => setInventoryStatuses(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchItems();
  }, [selectedStatus]);

  const fetchItems = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const params = new URLSearchParams();
    if (selectedStatus === 'SELLABLE') {
      params.set('sellable_status', 'SELLABLE');
    } else if (selectedStatus !== 'ALL') {
      params.set('status', selectedStatus);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';

    const [jRes, hRes] = await Promise.allSettled([
      axios.get(`${API_BASE_URL}/jewelry${qs}`, { headers }),
      axios.get(`${API_BASE_URL}/hardgoods${qs}`, { headers }),
    ]);

    const jewelry   = jRes.status === 'fulfilled' ? jRes.value.data.map(i => ({ ...i, _type: 'jewelry'   })) : [];
    const hardgoods = hRes.status === 'fulfilled' ? hRes.value.data.map(i => ({ ...i, _type: 'hardgoods' })) : [];

    const merged = [...jewelry, ...hardgoods].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    setAllItems(merged);
    setSelectedItem(merged.length > 0 ? merged[0] : null);
    setLoading(false);
  };

  const filteredItems = allItems.filter(item => {
    if (selectedDivision !== 'all' && item._type !== selectedDivision) return false;
    if (item.status?.toLowerCase() === 'quoted') return false;
    const desc = (item.short_desc || item.long_desc || '').toLowerCase();
    const cat  = (item.category_name || item.category || '').toLowerCase();
    if (searchQuery && !desc.includes(searchQuery.toLowerCase()) && !cat.includes(searchQuery.toLowerCase())) return false;
    if (itemIdQuery && !item.item_id?.toLowerCase().includes(itemIdQuery.toLowerCase())) return false;
    return true;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEditClick = async (item) => {
    if (item._type === 'hardgoods') {
      navigate(`/hardgoods-edit/${item.item_id}`);
      return;
    }
    // Jewelry: fetch secondary gems + history first
    try {
      const [gemsRes, histRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/jewelry_secondary_gems/${item.item_id}`),
        axios.get(`${API_BASE_URL}/jewelry/${item.item_id}/history`),
      ]);
      navigate('/jewelry-edit', {
        state: {
          itemId: item.item_id,
          secondaryGems: gemsRes.data,
          history: histRes.data,
        },
      });
    } catch {
      navigate('/jewelry-edit', { state: { itemId: item.item_id } });
    }
  };

  const handleAddToTicket = (item) => {
    const status = item.inventory_status || item.status;
    if (status !== 'ACTIVE') {
      enqueueSnackbar('Only ACTIVE items can be added to ticket', { variant: 'warning' });
      return;
    }
    navigate('/customer-ticket', {
      state: {
        customer: location.state?.customer,
        selectedInventoryItem: {
          ...item,
          id: item.item_id,
          description: item.short_desc || item.long_desc,
          category: item.category,
          price: item.item_price,
          item_price: item.item_price,
          metal_weight: item.metal_weight,
          transactionType: 'sale',
          fromInventory: true,
        },
      },
    });
  };

  const fetchScrapBuckets = async () => {
    try {
      setLoadingBuckets(true);
      const res = await axios.get(`${API_BASE_URL}/scrap/buckets`);
      setScrapBuckets(res.data.filter(b => b.status === 'ACTIVE'));
    } catch (err) {
      console.error('Error fetching scrap buckets:', err);
    } finally {
      setLoadingBuckets(false);
    }
  };

  const handleMoveToScrap = async () => {
    if (!itemToScrap || !selectedBucket) {
      enqueueSnackbar('Please select a scrap bucket', { variant: 'warning' });
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/jewelry/${itemToScrap.item_id}/move-to-scrap`, {
        moved_by: currentUser?.id || 1,
        bucket_id: selectedBucket,
      });
      setAllItems(prev => prev.filter(i => i.item_id !== itemToScrap.item_id));
      if (selectedItem?.item_id === itemToScrap.item_id) setSelectedItem(null);
      enqueueSnackbar('Item moved to scrap successfully', { variant: 'success' });
    } catch (err) {
      console.error('Error moving item to scrap:', err);
      enqueueSnackbar('Failed to move item to scrap', { variant: 'error' });
    } finally {
      setScrapDialogOpen(false);
      setItemToScrap(null);
      setSelectedBucket('');
    }
  };

  const displayPrice = (item) => {
    if (item._type === 'hardgoods') {
      if (item.mode === 'BUCKET') return `$${fmt(item.bucket_value)}`;
      return `$${fmt(item.retail_price)}`;
    }
    return `$${fmt(item.item_price || item.retail_price || 0)}`;
  };

  const procStyle = (code) => PROC_STYLES[code] || { color: 'default', label: code };

  // ── Detail Panel ──────────────────────────────────────────────────────────

  const DetailPanel = () => {
    if (!selectedItem) {
      return (
        <Box sx={{ p: 3, color: 'text.secondary', textAlign: 'center', mt: 4 }}>
          <Typography variant="body2">Select an item to view details</Typography>
        </Box>
      );
    }

    const item = selectedItem;
    const isJewelry   = item._type === 'jewelry';
    const isHardgoods = item._type === 'hardgoods';

    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Image + title */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ width: 100, height: 100, flexShrink: 0 }}>
            <img
              src={getImageUrl(item.images)}
              alt={item.short_desc || item.long_desc || 'Item'}
              onError={e => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMAGE; }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Chip label={DIVISION_LABELS[item._type]} size="small" variant="outlined" sx={{ mb: 0.5 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {item.short_desc || item.long_desc || 'No Description'}
            </Typography>
            <Typography variant="h6" sx={{ color: 'success.main' }}>
              {displayPrice(item)}
            </Typography>
          </Box>
        </Box>

        {/* Details grid */}
        <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ color: 'primary.main', mb: 1 }}>Details</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Box>
              <Typography variant="caption" color="textSecondary">Category</Typography>
              <Typography variant="body2">{item.category_name || item.category || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary">Status</Typography>
              <Typography variant="body2">{item.status || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary">Condition</Typography>
              <Typography variant="body2">{item.condition || '—'}</Typography>
            </Box>
            {isJewelry && (
              <Box>
                <Typography variant="caption" color="textSecondary">Metal Weight</Typography>
                <Typography variant="body2">{item.metal_weight ? `${item.metal_weight}g` : '—'}</Typography>
              </Box>
            )}
            {isHardgoods && (
              <>
                <Box>
                  <Typography variant="caption" color="textSecondary">Location</Typography>
                  <Typography variant="body2">{item.location || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">Cost</Typography>
                  <Typography variant="body2">${fmt(item.cost_price)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">Retail</Typography>
                  <Typography variant="body2">${fmt(item.retail_price)}</Typography>
                </Box>
                {item.mode === 'UNIT' && item.serial_number && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="caption" color="textSecondary">Serial #</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{item.serial_number}</Typography>
                  </Box>
                )}
                {item.mode === 'STOCK' && (
                  <Box>
                    <Typography variant="caption" color="textSecondary">Qty on Hand</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{item.quantity ?? '—'}</Typography>
                  </Box>
                )}
              </>
            )}
            <Box>
              <Typography variant="caption" color="textSecondary">Added</Typography>
              <Typography variant="body2">{item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}</Typography>
            </Box>
          </Box>
        </Paper>

        {/* Processing */}
        {item.processing_status && (
          <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ color: 'primary.main', mb: 1 }}>Processing</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {(() => { const s = procStyle(item.processing_status); return <Chip label={s.label} color={s.color} size="small" sx={{ alignSelf: 'flex-start' }} />; })()}
              {item.blocking_reason && (
                <Typography variant="caption" sx={{ color: 'warning.main' }}>{item.blocking_reason}</Typography>
              )}
              {item.next_action && (
                <Typography variant="caption" color="textSecondary">Next: {item.next_action}</Typography>
              )}
            </Box>
          </Paper>
        )}

        {/* IDs */}
        <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Box>
            <Typography variant="caption" color="textSecondary">Item ID</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{item.item_id}</Typography>
          </Box>
          {item.part_number && (
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="textSecondary">Part #</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{item.part_number}</Typography>
            </Box>
          )}
        </Paper>

        {((isJewelry && (item.status || item.inventory_status) === 'IN_PROCESS') ||
          (isHardgoods && (item.status || item.inventory_status) !== 'SOLD')) && (
          <Button
            variant="contained"
            fullWidth
            disabled={isStoreClosed}
            onClick={() => handleEditClick(item)}
          >
            Edit Item
          </Button>
        )}
      </Box>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Grid container sx={{ flex: 1, overflow: 'hidden' }}>

        {/* Left: table 75% */}
        <Grid item xs={9} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* Filters bar */}
          <Box sx={{
            display: 'flex', gap: 1.5, p: 2,
            bgcolor: 'background.paper',
            borderBottom: 1, borderColor: 'divider',
            alignItems: 'center', flexWrap: 'wrap',
          }}>
            <TextField
              size="small"
              placeholder="Search description / category…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              sx={{ flex: 2, minWidth: 180 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
            <TextField
              size="small"
              placeholder="Item ID…"
              value={itemIdQuery}
              onChange={e => setItemIdQuery(e.target.value)}
              sx={{ flex: 1, minWidth: 130 }}
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
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Division</InputLabel>
              <Select value={selectedDivision} onChange={e => setSelectedDivision(e.target.value)} label="Division">
                <MenuItem value="all">All Divisions</MenuItem>
                <MenuItem value="jewelry">Jewelry</MenuItem>
                <MenuItem value="hardgoods">Hardgoods</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Table */}
          <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 90 }}>Division</TableCell>
                  <TableCell sx={{ width: 150 }}>Item ID</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell sx={{ width: 130 }}>Category</TableCell>
                  <TableCell sx={{ width: 90 }}>Condition</TableCell>
                  <TableCell sx={{ width: 90 }}>Status</TableCell>
                  <TableCell sx={{ width: 90 }} align="right">Price</TableCell>
                  <TableCell sx={{ width: 95 }}>Date</TableCell>
                  <TableCell sx={{ width: 220 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress /></TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>No inventory items found</TableCell>
                  </TableRow>
                ) : filteredItems.map((item, idx) => {
                  const status = item.inventory_status || item.status;
                  return (
                    <TableRow
                      key={idx}
                      hover
                      sx={{
                        cursor: 'pointer',
                        bgcolor: selectedItem?.item_id === item.item_id && selectedItem?._type === item._type
                          ? 'action.selected' : 'inherit',
                      }}
                      onClick={() => setSelectedItem(item)}
                    >
                      <TableCell>
                        <Chip
                          label={DIVISION_LABELS[item._type]}
                          size="small"
                          variant="outlined"
                          color={item._type === 'jewelry' ? 'secondary' : 'primary'}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.item_id}</TableCell>
                      <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.short_desc || item.long_desc || '—'}
                      </TableCell>
                      <TableCell>{item.category_name || item.category || '—'}</TableCell>
                      <TableCell>{item.condition || '—'}</TableCell>
                      <TableCell>{status || '—'}</TableCell>
                      <TableCell align="right">{displayPrice(item)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {item._type === 'jewelry' ? (
                            <>
                              {status === 'IN_PROCESS' && (
                                <Button
                                  variant="contained" color="primary" size="small"
                                  disabled={isStoreClosed}
                                  onClick={e => { e.stopPropagation(); handleEditClick(item); }}
                                  sx={{ minWidth: 60, height: 28, fontSize: '0.75rem', px: 1 }}
                                >
                                  Edit
                                </Button>
                              )}
                              {status === 'ACTIVE' && (
                                <Button
                                  variant="contained" color="success" size="small"
                                  disabled={isStoreClosed}
                                  startIcon={<ShoppingCartIcon />}
                                  onClick={e => { e.stopPropagation(); handleAddToTicket(item); }}
                                  sx={{ minWidth: 120, height: 28, fontSize: '0.7rem', px: 1 }}
                                >
                                  Add to Ticket
                                </Button>
                              )}
                              {status !== 'SCRAP PROCESS' && status !== 'SOLD TO REFINER' && status !== 'SOLD' && (
                                <Button
                                  variant="outlined" color="error" size="small"
                                  disabled={isStoreClosed}
                                  onClick={e => {
                                    e.stopPropagation();
                                    setItemToScrap(item);
                                    setScrapDialogOpen(true);
                                    fetchScrapBuckets();
                                  }}
                                  sx={{ minWidth: 85, height: 28, fontSize: '0.7rem' }}
                                >
                                  To Scrap
                                </Button>
                              )}
                            </>
                          ) : (
                            status !== 'SOLD' && (
                              <Button
                                variant="contained" size="small"
                                disabled={isStoreClosed}
                                onClick={e => { e.stopPropagation(); handleEditClick(item); }}
                                sx={{ fontSize: '0.72rem', py: 0.4, px: 1 }}
                              >
                                Edit
                              </Button>
                            )
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Right: detail panel 25% */}
        <Grid item xs={3} sx={{
          height: '100%', borderLeft: 1, borderColor: 'divider',
          bgcolor: 'background.paper', overflow: 'auto',
        }}>
          <DetailPanel />
        </Grid>

      </Grid>

      {/* Scrap Dialog */}
      <Dialog open={scrapDialogOpen} onClose={() => setScrapDialogOpen(false)}>
        <DialogTitle>Move to Scrap</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to move item <strong>{itemToScrap?.item_id}</strong> to scrap?
          </DialogContentText>
          {loadingBuckets ? (
            <Box display="flex" justifyContent="center" my={2}><CircularProgress size={24} /></Box>
          ) : (
            <TextField
              select fullWidth label="Select Scrap Bucket"
              value={selectedBucket}
              onChange={e => setSelectedBucket(e.target.value)}
              variant="outlined" margin="normal" required
            >
              {scrapBuckets.map(b => (
                <MenuItem key={b.bucket_id} value={b.bucket_id}>
                  {b.bucket_name} ({b.bucket_type})
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScrapDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleMoveToScrap} color="error" variant="contained" disabled={isStoreClosed} autoFocus>
            Move to Scrap
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Inventory;
