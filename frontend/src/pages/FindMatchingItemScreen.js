import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog, DialogContent, Box, Typography, TextField, Button, IconButton,
  Select, MenuItem, FormControl, InputLabel, Chip, Tooltip, InputAdornment,
  CircularProgress,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import axios from 'axios';
import config from '../config';

// Typed text is debounced; a barcode-looking entry (or Enter) searches at once.
const TYPING_DEBOUNCE_MS = 250;
const looksLikeBarcode = (q) => /^\d{8,14}$/.test(q.replace(/[\s-]/g, ''));

const MATCH_TYPE_LABELS = {
  IDENTIFIER:   'Exact identifier match',
  MODEL_PREFIX: 'Model number match',
  KEYWORD:      'Keyword match',
  BROWSE:       'Browsing category',
};

const IDENTIFIER_LABELS = { UPC: 'UPC', EAN: 'EAN', MANUFACTURER_MODEL: 'Model', OTHER: 'ID' };
// Stored image paths are server-relative (/uploads/…); the API base ends in /api.
const assetUrl = (url) => (url && url.startsWith('/uploads') ? `${config.apiUrl.replace(/\/api$/, '')}${url}` : url);

// Intake step 1–2: Search Catalog → Select Catalog Item.
// Search runs server-side against the Catalog (GET /api/catalog-items/search):
// UPC/EAN → model number → keyword, or Category → Make browse when there's no
// text. Only Active Hardgoods catalog items are returned, as a small, light
// result set (no pricing/history). Selecting loads the full Catalog Item and
// hands it to Hardgoods Intake as the prefill source.
export default function FindMatchingItemScreen({
  open,
  initialQuery = '',
  onClose,
  onSelect,
  onAddNonCatalog,
}) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [matchType, setMatchType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selecting, setSelecting] = useState(null);

  const [divisionId, setDivisionId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [makes, setMakes] = useState([]);
  const [makeFilter, setMakeFilter] = useState('');

  // Only the latest request's response is applied; older ones are aborted/ignored.
  const requestSeq = useRef(0);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setSearchQuery(initialQuery);
    setCategoryFilter('');
    setMakeFilter('');
    setResults([]);
    setMatchType(null);
    axios.get(`${config.apiUrl}/divisions`)
      .then(divsRes => {
        const hg = divsRes.data.find(d => d.code === 'HG');
        if (!hg) return null;
        setDivisionId(hg.id);
        return axios.get(`${config.apiUrl}/categories?division_id=${hg.id}`);
      })
      .then(catRes => setCategories((catRes?.data || []).filter(c => c.is_active)))
      .catch(err => console.error('Error loading hardgoods categories:', err));
  }, [open, initialQuery]);

  const runSearch = useCallback(async ({ q, categoryId, make }) => {
    clearTimeout(debounceRef.current);
    const query = (q || '').trim();
    if (!query && !categoryId) {
      abortRef.current?.abort();
      setResults([]);
      setMatchType(null);
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++requestSeq.current;
    setLoading(true);
    setSearchError('');
    try {
      const res = await axios.get(`${config.apiUrl}/catalog-items/search`, {
        params: {
          q: query || undefined,
          division_id: divisionId || undefined,
          category_id: categoryId || undefined,
          make_brand: make || undefined,
        },
        signal: controller.signal,
      });
      if (seq !== requestSeq.current) return;
      setResults(res.data.results || []);
      setMatchType(res.data.match_type);
    } catch (err) {
      if (axios.isCancel?.(err) || err.name === 'CanceledError' || seq !== requestSeq.current) return;
      console.error('Error searching catalog:', err);
      setResults([]);
      setMatchType(null);
      setSearchError(err.response?.data?.error || 'Catalog search failed');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [divisionId]);

  // Re-search when text or filters change: immediately for scans and filter
  // changes, debounced for typing.
  const lastQueryRef = useRef(null);
  useEffect(() => {
    if (!open || divisionId === null) return;
    const params = { q: searchQuery, categoryId: categoryFilter, make: makeFilter };
    const textChanged = lastQueryRef.current !== null && lastQueryRef.current !== searchQuery;
    lastQueryRef.current = searchQuery;
    clearTimeout(debounceRef.current);
    if (textChanged && !looksLikeBarcode(searchQuery)) {
      debounceRef.current = setTimeout(() => runSearch(params), TYPING_DEBOUNCE_MS);
    } else {
      runSearch(params);
    }
    return () => clearTimeout(debounceRef.current);
  }, [open, divisionId, searchQuery, categoryFilter, makeFilter, runSearch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Make/Brand options for the selected category (browse step 2).
  useEffect(() => {
    setMakeFilter('');
    if (!categoryFilter) { setMakes([]); return; }
    axios.get(`${config.apiUrl}/catalog-items/makes`, { params: { category_id: categoryFilter } })
      .then(res => setMakes(res.data || []))
      .catch(() => setMakes([]));
  }, [categoryFilter]);

  const categoryPath = useCallback((categoryId) => {
    if (!categoryId || categories.length === 0) return '';
    const byId = Object.fromEntries(categories.map(c => [c.id, c]));
    const chain = [];
    let cur = byId[categoryId];
    let guard = 0;
    while (cur && guard++ < 10) { chain.unshift(cur.name); cur = cur.parent_category_id ? byId[cur.parent_category_id] : null; }
    return ['Hardgoods', ...chain].join(' > ');
  }, [categories]);

  // Step 5 (doc §13): only now load the full Catalog Item + current defaults.
  const handleSelect = async (result) => {
    setSelecting(result.id);
    try {
      const res = await axios.get(`${config.apiUrl}/catalog-items/${result.id}`);
      onSelect(res.data);
    } catch (err) {
      console.error('Error loading catalog item:', err);
      setSearchError(err.response?.data?.error || 'Failed to load the selected catalog item');
    } finally {
      setSelecting(null);
    }
  };

  const hasCriteria = !!(searchQuery.trim() || categoryFilter);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogContent sx={{ p: 3 }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>Find Matching Item</Typography>
            <Typography variant="body2" color="text.secondary">
              Scan a barcode or search the catalog by model number or keyword, or browse by category.
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <IconButton onClick={onClose} size="small"><MuiIcons.Close /></IconButton>
        </Box>

        {/* Search + Original Entry */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'stretch' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Search</Typography>
            <TextField
              size="small" fullWidth autoFocus value={searchQuery}
              placeholder="UPC, model number (e.g. CFI-1215A) or keywords"
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') runSearch({ q: searchQuery, categoryId: categoryFilter, make: makeFilter });
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><MuiIcons.Search sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
                endAdornment: loading ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment> : null,
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
          <Box sx={{ width: 300, bgcolor: '#e3f2fd', borderRadius: 2, p: 1.5 }}>
            <Typography variant="caption" fontWeight={700} color="#1565c0">Original Entry</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ mt: 0.25 }}>"{initialQuery || '—'}"</Typography>
            <Typography variant="caption" color="text.secondary">You can edit the search above or browse by category.</Typography>
          </Box>
        </Box>

        {/* Browse filters: Category → Make/Brand */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'flex-end', bgcolor: '#f5f6fa', borderRadius: 2, p: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 170 }} disabled>
            <InputLabel>Division</InputLabel>
            <Select value="HG" label="Division" sx={{ borderRadius: 2 }}>
              <MenuItem value="HG">Hardgoods</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel shrink>Category</InputLabel>
            <Select value={categoryFilter} label="Category" displayEmpty notched
              onChange={e => setCategoryFilter(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(c => <MenuItem key={c.id} value={c.id}>{categoryPath(c.id).replace(/^Hardgoods > /, '')}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 190 }} disabled={!categoryFilter || makes.length === 0}>
            <InputLabel shrink>Make / Brand</InputLabel>
            <Select value={makeFilter} label="Make / Brand" displayEmpty notched
              onChange={e => setMakeFilter(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">All Makes</MenuItem>
              {makes.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {/* Results header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2">
            {searchQuery.trim()
              ? <>Results for <Typography component="span" variant="body2" fontWeight={700} color="#1565c0">"{searchQuery.trim()}"</Typography></>
              : categoryFilter ? 'Catalog items in category' : 'Enter a search or choose a category'}
          </Typography>
          {hasCriteria && !loading && (
            <Chip size="small" label={`${results.length} ${results.length === 1 ? 'match' : 'matches'}`} sx={{ height: 20, fontSize: 11 }} />
          )}
          {matchType && results.length > 0 && (
            <Chip size="small" variant="outlined" label={MATCH_TYPE_LABELS[matchType]} sx={{ height: 20, fontSize: 11 }} />
          )}
          {results.length >= 25 && (
            <Typography variant="caption" color="text.secondary">Showing the best 25 — refine to narrow down.</Typography>
          )}
        </Box>
        {searchError && <Typography variant="body2" color="error" sx={{ mb: 1 }}>{searchError}</Typography>}

        {/* Results list */}
        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, maxHeight: 440, overflow: 'auto' }}>
          {results.map(r => (
            <Box key={r.id} sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderBottom: '1px solid #f0f0f0',
              bgcolor: matchType === 'IDENTIFIER' ? '#f1f8e9' : 'transparent', '&:hover': { bgcolor: '#fafafa' },
            }}>
              {/* Thumbnail = the catalog item's primary reference image (doc §9: image in the match popup) */}
              <Box sx={{ width: 56, height: 56, borderRadius: 1.5, overflow: 'hidden', bgcolor: '#f5f6fa', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {r.primary_image_url
                  ? <Box component="img" src={assetUrl(r.primary_image_url)} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <MuiIcons.LocalOfferOutlined sx={{ color: '#bbb' }} />}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>{r.title || 'Untitled catalog item'}</Typography>
                  <Chip size="small" label="Catalog Item" sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: '#e3f2fd', color: '#1565c0' }} />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: 'monospace' }}>
                  {r.friendly_code} · {r.catalog_code}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">{categoryPath(r.category_id) || r.category_name}</Typography>
              </Box>
              <Box sx={{ width: 260, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {r.identifiers.length === 0 ? (
                  <Typography variant="caption" color="text.disabled">No identifiers</Typography>
                ) : r.identifiers.map(i => (
                  <Chip key={`${i.identifier_type}:${i.raw_value}`} size="small" variant="outlined"
                    label={`${IDENTIFIER_LABELS[i.identifier_type] || i.identifier_type}: ${i.raw_value}`}
                    sx={{ height: 20, fontSize: 11, fontFamily: 'monospace' }} />
                ))}
              </Box>
              <Box sx={{ width: 110 }}>
                <Typography variant="caption" color="text.secondary" display="block">Make</Typography>
                <Typography variant="body2" noWrap>{r.make_brand || '—'}</Typography>
              </Box>
              <Box sx={{ width: 64 }}>
                <Button size="small" variant="outlined" onClick={() => handleSelect(r)} disabled={selecting !== null}
                  sx={{ textTransform: 'none', borderRadius: 2 }}>
                  {selecting === r.id ? <CircularProgress size={14} /> : 'Select'}
                </Button>
              </Box>
            </Box>
          ))}

          {hasCriteria && !loading && results.length === 0 && !searchError && (
            <Box sx={{ px: 1.5, py: 2, borderBottom: '1px solid #f0f0f0' }}>
              <Typography variant="body2" color="text.secondary">No active catalog items match. Refine the search, or add it as a non-catalog item below.</Typography>
            </Box>
          )}

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
              <Typography variant="caption" color="text.secondary" display="block">Intake without a catalog link, based on your entry</Typography>
            </Box>
            <Box sx={{ width: 64 }}>
              <Tooltip title="Continue intake without linking a catalog item">
                <Button size="small" variant="outlined" onClick={() => onAddNonCatalog(searchQuery)} sx={{ textTransform: 'none', borderRadius: 2 }}>
                  Select
                </Button>
              </Tooltip>
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
