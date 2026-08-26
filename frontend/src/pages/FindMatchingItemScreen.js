import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog, DialogContent, Box, Typography, TextField, Button, IconButton,
  Select, MenuItem, FormControl, InputLabel, Chip, Tooltip, InputAdornment,
  CircularProgress,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import axios from 'axios';
import config from '../config';

const RESULT_TYPES = [
  { value: 'all',     label: 'All (Catalog & Stock)' },
  { value: 'catalog', label: 'Catalog Item' },
  { value: 'stock',   label: 'Stock SKU' },
];
const INVENTORY_MODES = [
  { value: 'all',    label: 'All Modes' },
  { value: 'PIECE',  label: 'Piece' },
  { value: 'UNIT',   label: 'Unit' },
  { value: 'STOCK',  label: 'Stock' },
  { value: 'BUCKET', label: 'Bucket' },
];
const STOCK_MODES = ['STOCK', 'BUCKET'];

const fmt = (n) => (n == null ? null : `$${Number(n).toFixed(2)}`);

// Search results are drawn from real hardgoods intake history — items this
// store has actually taken in before — rather than a separate product
// catalog table, which doesn't exist yet. Rows sharing the same description
// + category are grouped into one "known item" match with aggregated stats.
export default function FindMatchingItemScreen({
  open,
  initialQuery = '',
  onClose,
  onSelect,
  onAddNonCatalog,
}) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [resultTypeFilter, setResultTypeFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${config.apiUrl}/hardgoods`);
      setAllItems(res.data || []);
    } catch (err) {
      console.error('Error searching hardgoods intake history:', err);
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSearchQuery(initialQuery);
    setCategoryFilter('');
    setResultTypeFilter('all');
    setModeFilter('all');
    fetchItems();
    axios.get(`${config.apiUrl}/divisions`)
      .then(divsRes => {
        const hg = divsRes.data.find(d => d.code === 'HG');
        if (!hg) return [];
        return axios.get(`${config.apiUrl}/categories?division_id=${hg.id}`);
      })
      .then(catRes => setCategories(catRes?.data || []))
      .catch(err => console.error('Error loading hardgoods categories:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuery]);

  const categoryPath = useCallback((categoryId) => {
    if (!categoryId || categories.length === 0) return '';
    const byId = Object.fromEntries(categories.map(c => [c.id, c]));
    const chain = [];
    let cur = byId[categoryId];
    let guard = 0;
    while (cur && guard++ < 10) { chain.unshift(cur.name); cur = cur.parent_category_id ? byId[cur.parent_category_id] : null; }
    return ['Hardgoods', ...chain].join(' > ');
  }, [categories]);

  const groupedResults = useMemo(() => {
    const groups = {};
    allItems.forEach(r => {
      const key = `${(r.short_desc || '').trim().toLowerCase()}|${r.category_id}`;
      (groups[key] = groups[key] || []).push(r);
    });
    return Object.values(groups).map(rows => {
      const byDateDesc = [...rows].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      const latest = byDateDesc[0];
      const latestRetail = byDateDesc.find(r => r.retail_price != null);
      const latestPaid = byDateDesc.find(r => r.cost_price != null);
      return {
        key: `${latest.short_desc}|${latest.category_id}`,
        item_id: latest.item_id,
        short_desc: latest.short_desc,
        category_id: latest.category_id,
        category_name: latest.category_name,
        mode: latest.mode,
        condition: latest.condition,
        image: latest.images?.find(i => i.isPrimary)?.url || latest.images?.[0]?.url || null,
        retail: latestRetail ? parseFloat(latestRetail.retail_price) : null,
        lastPaid: latestPaid ? parseFloat(latestPaid.cost_price) : null,
        onHand: rows.filter(r => r.status === 'ACTIVE').length,
        rows,
      };
    });
  }, [allItems]);

  const filteredResults = useMemo(() => {
    const words = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return groupedResults
      .filter(g => {
        if (categoryFilter && g.category_id !== categoryFilter) return false;
        const isStock = STOCK_MODES.includes(g.mode);
        if (resultTypeFilter === 'catalog' && isStock) return false;
        if (resultTypeFilter === 'stock' && !isStock) return false;
        if (modeFilter !== 'all' && g.mode !== modeFilter) return false;
        if (words.length === 0) return true;
        const hay = `${g.short_desc || ''} ${g.category_name || ''}`.toLowerCase();
        return words.every(w => hay.includes(w));
      })
      .sort((a, b) => (b.onHand - a.onHand) || (a.short_desc || '').localeCompare(b.short_desc || ''));
  }, [groupedResults, searchQuery, categoryFilter, resultTypeFilter, modeFilter]);

  const handleSelect = async (group) => {
    setSelecting(group.key);
    try {
      const res = await axios.get(`${config.apiUrl}/hardgoods/${group.item_id}`);
      const detail = res.data;
      onSelect({
        short_desc: detail.short_desc,
        category_id: detail.category_id,
        category_name: detail.category_name,
        condition: detail.condition,
        cost_price: group.lastPaid,
        retail_price: group.retail,
        attributes: detail.attributes || [],
        image: group.image,
        mode: detail.mode,
      });
    } catch (err) {
      console.error('Error loading matched item details:', err);
      onSelect({
        short_desc: group.short_desc,
        category_id: group.category_id,
        category_name: group.category_name,
        condition: group.condition,
        cost_price: group.lastPaid,
        retail_price: group.retail,
        attributes: [],
        image: group.image,
        mode: group.mode,
      });
    } finally {
      setSelecting(null);
    }
  };

  const typeChip = (mode) => {
    const isStock = STOCK_MODES.includes(mode);
    return (
      <Chip size="small" label={isStock ? 'Stock SKU' : 'Catalog Item'}
        sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: isStock ? '#e8f5e9' : '#e3f2fd', color: isStock ? '#2e7d32' : '#1565c0' }} />
    );
  };

  const typeCell = (mode) => {
    const isStock = STOCK_MODES.includes(mode);
    const Icon = isStock ? MuiIcons.Inventory2Outlined : MuiIcons.LocalOfferOutlined;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Icon sx={{ fontSize: 15, color: isStock ? '#2e7d32' : '#1565c0' }} />
        <Typography variant="caption">{isStock ? 'Stock SKU' : 'Catalog'}</Typography>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogContent sx={{ p: 3 }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>Find Matching Item</Typography>
            <Typography variant="body2" color="text.secondary">
              Select an existing item that matches your entry, or add a non-catalog item.
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <IconButton onClick={onClose} size="small"><MuiIcons.Close /></IconButton>
        </Box>

        {/* Search + Original Entry */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'stretch' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Search</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small" fullWidth value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchItems()}
                InputProps={{ startAdornment: <InputAdornment position="start"><MuiIcons.Search sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment> }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <Button variant="contained" startIcon={<MuiIcons.Search sx={{ fontSize: 16 }} />} onClick={fetchItems}
                sx={{ textTransform: 'none', borderRadius: 2, whiteSpace: 'nowrap' }}>
                Search Again
              </Button>
            </Box>
          </Box>
          <Box sx={{ width: 300, bgcolor: '#e3f2fd', borderRadius: 2, p: 1.5 }}>
            <Typography variant="caption" fontWeight={700} color="#1565c0">Original Entry</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ mt: 0.25 }}>"{initialQuery || '—'}"</Typography>
            <Typography variant="caption" color="text.secondary">You can edit the search above or refine the filters.</Typography>
          </Box>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'flex-end', bgcolor: '#f5f6fa', borderRadius: 2, p: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 170 }} disabled>
            <InputLabel>Division</InputLabel>
            <Select value="HG" label="Division" sx={{ borderRadius: 2 }}>
              <MenuItem value="HG">Hardgoods</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Category</InputLabel>
            <Select value={categoryFilter} label="Category" displayEmpty onChange={e => setCategoryFilter(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Result Type</InputLabel>
            <Select value={resultTypeFilter} label="Result Type" onChange={e => setResultTypeFilter(e.target.value)} sx={{ borderRadius: 2 }}>
              {RESULT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Inventory Mode</InputLabel>
            <Select value={modeFilter} label="Inventory Mode" onChange={e => setModeFilter(e.target.value)} sx={{ borderRadius: 2 }}>
              {INVENTORY_MODES.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Tooltip title="No additional filters configured yet">
            <span>
              <Button size="small" variant="outlined" disabled startIcon={<MuiIcons.FilterAlt sx={{ fontSize: 16 }} />} sx={{ textTransform: 'none', borderRadius: 2 }}>
                More Filters
              </Button>
            </span>
          </Tooltip>
        </Box>

        {/* Results header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2">
            Results for <Typography component="span" variant="body2" fontWeight={700} color="#1565c0">"{searchQuery || '—'}"</Typography>
          </Typography>
          <Chip size="small" label={`${filteredResults.length + 1} results`} sx={{ height: 20, fontSize: 11 }} />
          {loading && <CircularProgress size={14} />}
        </Box>

        {/* Results list */}
        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, maxHeight: 440, overflow: 'auto' }}>
          {filteredResults.map(g => (
            <Box key={g.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderBottom: '1px solid #f0f0f0', '&:hover': { bgcolor: '#fafafa' } }}>
              <Box sx={{ width: 56, height: 56, borderRadius: 1.5, overflow: 'hidden', bgcolor: '#f5f6fa', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {g.image ? <Box component="img" src={g.image} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <MuiIcons.ImageOutlined sx={{ color: '#ccc' }} />}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>{g.short_desc || 'Untitled item'}</Typography>
                  {typeChip(g.mode)}
                </Box>
                <Typography variant="caption" color="text.secondary" display="block">{g.item_id}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">{categoryPath(g.category_id)}</Typography>
              </Box>
              <Box sx={{ width: 90 }}>{typeCell(g.mode)}</Box>
              <Box sx={{ width: 140 }}>
                <Typography variant="caption" display="block">Retail: {fmt(g.retail) || '—'}</Typography>
                <Typography variant="caption" display="block" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                  Last Paid: {fmt(g.lastPaid) || '—'}
                </Typography>
              </Box>
              <Box sx={{ width: 70, textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700}>{g.onHand}</Typography>
                <Typography variant="caption" color="text.secondary">On Hand</Typography>
              </Box>
              <Box sx={{ width: 60 }}>
                <Button size="small" variant="outlined" onClick={() => handleSelect(g)} disabled={selecting === g.key}
                  sx={{ textTransform: 'none', borderRadius: 2 }}>
                  {selecting === g.key ? <CircularProgress size={14} /> : 'Select'}
                </Button>
              </Box>
            </Box>
          ))}

          {/* Always-present fallback row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 1.5, bgcolor: '#f5f6fa', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MuiIcons.HelpOutline sx={{ color: '#bbb' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight={700}>Unmatched / Unknown Item</Typography>
                <Chip size="small" label="No Match" sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: '#f3e8ff', color: '#7c3aed' }} />
              </Box>
              <Typography variant="caption" color="text.secondary" display="block">Based on your entry</Typography>
              <Typography variant="caption" color="text.secondary" display="block">Category unknown</Typography>
            </Box>
            <Box sx={{ width: 90 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <MuiIcons.HelpOutline sx={{ fontSize: 15, color: '#9e9e9e' }} />
                <Typography variant="caption">No Match</Typography>
              </Box>
            </Box>
            <Box sx={{ width: 140 }}><Typography variant="body2" color="text.disabled">—</Typography></Box>
            <Box sx={{ width: 70, textAlign: 'center' }}><Typography variant="body2" color="text.disabled">—</Typography></Box>
            <Box sx={{ width: 60 }}>
              <Button size="small" variant="outlined" onClick={() => onAddNonCatalog(searchQuery)} sx={{ textTransform: 'none', borderRadius: 2 }}>
                Select
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Button variant="outlined" onClick={onClose} sx={{ textTransform: 'none', borderRadius: 2 }}>Cancel</Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" startIcon={<MuiIcons.Add sx={{ fontSize: 18 }} />} onClick={() => onAddNonCatalog(searchQuery)}
            sx={{ textTransform: 'none', borderRadius: 2 }}>
            Add Non-Catalog Item
          </Button>
        </Box>

      </DialogContent>
    </Dialog>
  );
}
