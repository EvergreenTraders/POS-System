import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  ListSubheader,
  MenuItem,
  Pagination,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import BarChartIcon from '@mui/icons-material/BarChart';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import { useSnackbar } from 'notistack';
import config from '../config';
import { flattenCategoryTree } from '../utils/categoryTree';

const API = config.apiUrl;
// Stored image paths are server-relative (/uploads/…); the API base ends in /api.
const assetUrl = (url) => (url && url.startsWith('/uploads') ? `${API.replace(/\/api$/, '')}${url}` : url);

// "Search by" → the search API's mode (doc §9 priorities).
const SEARCH_MODES = [
  { value: 'identifier', label: 'UPC / Barcode', placeholder: 'Scan UPC or enter barcode…' },
  { value: 'model',      label: 'Model Number',  placeholder: 'Enter manufacturer model number (e.g. CFI-1215A)…' },
  { value: 'keyword',    label: 'Keyword (Title)', placeholder: 'Enter title keywords or a CAT- code…' },
];
const STATUS_FILTERS = [
  { value: 'ACTIVE',   label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DRAFT',    label: 'Draft' },
  { value: 'MERGED',   label: 'Merged' },
  { value: 'ALL',      label: 'All Statuses' },
];
const SORTS = [
  { value: 'best_match', label: 'Best Match' },
  { value: 'title',      label: 'Title (A–Z)' },
  { value: 'updated',    label: 'Recently Updated' },
];
const PAGE_SIZES = [10, 25, 50, 100];
const MATCH_TYPE_LABELS = {
  CODE:         'Catalog / staff code match',
  IDENTIFIER:   'Exact identifier match',
  MODEL_PREFIX: 'Model number match',
  KEYWORD:      'Keyword match',
};
const STATUS_CHIP = {
  DRAFT:    { label: 'Draft',    color: 'default' },
  ACTIVE:   { label: 'Active',   color: 'success' },
  INACTIVE: { label: 'Inactive', color: 'warning' },
  MERGED:   { label: 'Merged',   color: 'info' },
};
const MATCH_CHIP = {
  EXACT:  { label: 'Exact',  sx: { bgcolor: '#e8f5e9', color: '#1b5e20', borderColor: '#a5d6a7' } },
  HIGH:   { label: 'High',   sx: { bgcolor: '#f1f8e9', color: '#33691e', borderColor: '#c5e1a5' } },
  MEDIUM: { label: 'Medium', sx: { bgcolor: '#fff8e1', color: '#e65100', borderColor: '#ffe082' } },
  LOW:    { label: 'Low',    sx: { bgcolor: '#f5f5f5', color: '#616161', borderColor: '#e0e0e0' } },
};

// Typed text is debounced; a barcode-looking entry, Enter, or a filter change searches at once.
const TYPING_DEBOUNCE_MS = 250;
const looksLikeBarcode = (q) => /^\d{8,14}$/.test(q.replace(/[\s-]/g, ''));

// Search/filter/page/selection survive a trip to the editor and back.
const STATE_KEY = 'catalogManagerState';
const DEFAULT_STATE = {
  tab: 'search',
  mode: 'identifier',
  query: '',
  categoryId: '',
  make: '',
  status: 'ACTIVE',
  sort: 'best_match',
  page: 1,
  pageSize: 25,
  selectedId: null,
};
const loadSavedState = () => {
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}') };
  } catch (e) {
    return DEFAULT_STATE;
  }
};

const formatMoney = (v) => (v === null || v === undefined
  ? '—'
  : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

function PanelSection({ title, action, children }) {
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>{title}</Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}

function IdentifierList({ label, values }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? values : values.slice(0, 3);
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary">{label} ({values.length})</Typography>
      {values.length === 0 ? (
        <Typography variant="body2" color="text.disabled">None</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {visible.map(v => (
            <Typography key={v} variant="body2" sx={{ fontFamily: 'monospace' }}>{v}</Typography>
          ))}
          {values.length > 3 && (
            <Button size="small" onClick={() => setShowAll(s => !s)} sx={{ minWidth: 0, p: 0, textTransform: 'none' }}>
              {showAll ? 'Show less' : 'View all'}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Catalog Manager — search / browse Catalog Items (server-side, paginated),
// preview the selected item, then "Open in Catalog Item Editor" or create a
// "New Catalog Item". Intelligence, Advanced Search and Suggest New Item
// are not built yet and are shown as unavailable.
// ─────────────────────────────────────────────────────────────────────────
export default function CatalogManager() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const saved = useMemo(loadSavedState, []);

  const [tab, setTab] = useState(saved.tab);
  const [mode, setMode] = useState(saved.mode);
  const [query, setQuery] = useState(saved.query);
  const [categoryId, setCategoryId] = useState(saved.categoryId);
  const [make, setMake] = useState(saved.make);
  const [status, setStatus] = useState(saved.status);
  const [sort, setSort] = useState(saved.sort);
  const [page, setPage] = useState(saved.page);
  const [pageSize, setPageSize] = useState(saved.pageSize);
  const [selectedId, setSelectedId] = useState(saved.selectedId);

  const [categoryTree, setCategoryTree] = useState([]);
  const [makes, setMakes] = useState([]);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(null);
  const [matchType, setMatchType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const requestSeq = useRef(0);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const lastQueryRef = useRef(null);

  // Persist the view so returning from the editor restores it.
  useEffect(() => {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({
        tab, mode, query, categoryId, make, status, sort, page, pageSize, selectedId,
      }));
    } catch (e) { /* storage unavailable — state just won't persist */ }
  }, [tab, mode, query, categoryId, make, status, sort, page, pageSize, selectedId]);

  useEffect(() => {
    axios.get(`${API}/categories/tree`)
      .then(res => setCategoryTree(res.data || []))
      .catch(() => enqueueSnackbar('Failed to load categories', { variant: 'error' }));
  }, [enqueueSnackbar]);

  const categories = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const categoryById = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);

  // Make/Brand options follow the category + status filters (browse step 2).
  useEffect(() => {
    axios.get(`${API}/catalog-items/makes`, { params: { category_id: categoryId || undefined, status } })
      .then(res => setMakes(res.data || []))
      .catch(() => setMakes([]));
  }, [categoryId, status]);

  const runSearch = useCallback(async (params) => {
    clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++requestSeq.current;
    setLoading(true);
    setSearchError('');
    try {
      const q = params.tab === 'search' ? params.query.trim() : '';
      const res = await axios.get(`${API}/catalog-items/search`, {
        params: {
          q: q || undefined,
          mode: q ? params.mode : undefined,
          category_id: params.categoryId || undefined,
          make_brand: params.make || undefined,
          status: params.status,
          sort: params.sort,
          page: params.page,
          page_size: params.pageSize,
          // No search text: the Catalog Manager lists the filtered catalog, one page at a time.
          browse_all: q ? undefined : 'true',
        },
        signal: controller.signal,
      });
      if (seq !== requestSeq.current) return;
      setResults(res.data.results || []);
      setTotal(res.data.total || 0);
      setMatchType(res.data.match_type);
      setElapsedMs(res.data.elapsed_ms);
    } catch (err) {
      if (err.name === 'CanceledError' || seq !== requestSeq.current) return;
      setResults([]);
      setTotal(0);
      setMatchType(null);
      setSearchError(err.response?.data?.error || 'Catalog search failed');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  // Search on any change: immediately for filters/paging/scans, debounced for typing.
  useEffect(() => {
    const params = { tab, mode, query, categoryId, make, status, sort, page, pageSize };
    const typing = lastQueryRef.current !== null && lastQueryRef.current !== query;
    lastQueryRef.current = query;
    clearTimeout(debounceRef.current);
    if (typing && tab === 'search' && !looksLikeBarcode(query)) {
      debounceRef.current = setTimeout(() => runSearch(params), TYPING_DEBOUNCE_MS);
    } else {
      runSearch(params);
    }
    return () => clearTimeout(debounceRef.current);
  }, [tab, mode, query, categoryId, make, status, sort, page, pageSize, runSearch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Selected Item Preview: full item, loaded only after selection (doc §13 step 5).
  useEffect(() => {
    if (!selectedId) { setPreview(null); return; }
    let cancelled = false;
    setPreviewLoading(true);
    axios.get(`${API}/catalog-items/${selectedId}`)
      .then(res => { if (!cancelled) setPreview(res.data); })
      .catch(() => {
        if (cancelled) return;
        setPreview(null);
        setSelectedId(null);
      })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  // Any change to what's being searched starts again at page 1.
  const resetPage = (setter) => (value) => { setter(value); setPage(1); };

  const openEditor = (id) => navigate(`/catalog/items/${id}`);

  const categoryMenuItems = useMemo(() => {
    const items = [<MenuItem key="all" value="">All Categories</MenuItem>];
    let lastDivision = null;
    categories.forEach(c => {
      if (c.division_id !== lastDivision) {
        items.push(<ListSubheader key={`div-${c.division_id}`}>{c.division_name}</ListSubheader>);
        lastDivision = c.division_id;
      }
      items.push(
        <MenuItem key={c.id} value={c.id} sx={{ pl: 2 + c.depth * 2 }}>
          {c.name}{!c.is_active ? ' (inactive)' : ''}
        </MenuItem>
      );
    });
    return items;
  }, [categories]);

  const searchMode = SEARCH_MODES.find(m => m.value === mode) || SEARCH_MODES[0];
  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastShown = Math.min(page * pageSize, total);
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);

  const previewModels = (preview?.identifiers || [])
    .filter(i => i.is_active && i.identifier_type === 'MANUFACTURER_MODEL').map(i => i.raw_value);
  const previewUpcs = (preview?.identifiers || [])
    .filter(i => i.is_active && ['UPC', 'EAN'].includes(i.identifier_type)).map(i => i.raw_value);

  const emptyMessage = () => {
    if (tab === 'search' && query.trim()) {
      return mode === 'identifier'
        ? 'No catalog item has this UPC / barcode. Try Model Number or Keyword.'
        : mode === 'model'
          ? 'No catalog item has this model number. Try Keyword.'
          : 'No catalog items match these keywords.';
    }
    return 'No catalog items match these filters.';
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'grey.50', minHeight: '100%' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, flex: 1 }}>Catalog Manager</Typography>
        <Tooltip title="Coming in a later phase">
          <span>
            <Button variant="outlined" startIcon={<LightbulbOutlinedIcon />} disabled>Suggest New Item</Button>
          </span>
        </Tooltip>
        <Button variant="outlined" startIcon={<CallMergeIcon />} onClick={() => navigate('/catalog/merge')}>
          Merge Items
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/catalog/items/new')}>
          New Catalog Item
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: { xs: 'wrap', lg: 'nowrap' } }}>
        {/* ── Search / browse + results ─────────────────────────────────── */}
        <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, width: { xs: '100%', lg: 'auto' } }}>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(1); }} sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
            <Tab value="search" label="Search" />
            <Tab value="browse" label="Browse by Category" />
          </Tabs>

          {tab === 'search' && (
            <Box sx={{ display: 'flex', gap: 3, px: 2.5, pt: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5 }}>Search by</Typography>
                <RadioGroup value={mode} onChange={e => resetPage(setMode)(e.target.value)}>
                  {SEARCH_MODES.map(m => (
                    <FormControlLabel key={m.value} value={m.value} control={<Radio size="small" />}
                      label={<Typography variant="body2">{m.label}</Typography>} sx={{ my: -0.5 }} />
                  ))}
                </RadioGroup>
              </Box>
              <TextField
                size="small" autoFocus value={query}
                placeholder={searchMode.placeholder}
                onChange={e => resetPage(setQuery)(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    runSearch({ tab, mode, query, categoryId, make, status, sort, page: 1, pageSize });
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {loading ? <CircularProgress size={18} /> : <SearchIcon color="action" />}
                    </InputAdornment>
                  ),
                }}
                sx={{ flex: 1, minWidth: 260, mt: 3 }}
              />
              <Tooltip title="Coming in a later phase">
                <span>
                  <Button variant="outlined" endIcon={<ExpandMoreIcon />} disabled sx={{ mt: 3 }}>Advanced Search</Button>
                </span>
              </Tooltip>
            </Box>
          )}

          {/* Filters (Category → Make → Status). Browse = these filters with no search text. */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', m: 2, p: 1.5, bgcolor: 'grey.50', border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel shrink>Category</InputLabel>
              <Select value={categoryId} label="Category" displayEmpty notched
                onChange={e => { setCategoryId(e.target.value); setMake(''); setPage(1); }}
                renderValue={v => (v ? categoryById[v]?.path || '' : 'All Categories')}
                MenuProps={{ PaperProps: { sx: { maxHeight: 400 } } }}>
                {categoryMenuItems}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel shrink>Make</InputLabel>
              <Select value={make} label="Make" displayEmpty notched onChange={e => resetPage(setMake)(e.target.value)}>
                <MenuItem value="">All Makes</MenuItem>
                {makes.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={e => resetPage(setStatus)(e.target.value)}>
                {STATUS_FILTERS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </Select>
            </FormControl>
            <Tooltip title="Store / Company / Network item intelligence is a later phase">
              <span>
                <FormControl size="small" sx={{ minWidth: 160 }} disabled>
                  <InputLabel>Show data for</InputLabel>
                  <Select value="STORE" label="Show data for">
                    <MenuItem value="STORE">My Store (Default)</MenuItem>
                  </Select>
                </FormControl>
              </span>
            </Tooltip>
            <Tooltip title="Coming in a later phase">
              <span>
                <Button variant="outlined" size="small" startIcon={<BarChartIcon />} disabled>View Other Data Sets</Button>
              </span>
            </Tooltip>
          </Box>

          {/* Results bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, pb: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2">
              Results: <strong>{total}</strong> {total === 1 ? 'item' : 'items'}
            </Typography>
            {elapsedMs !== null && !loading && (
              <Typography variant="caption" color="text.secondary">({(elapsedMs / 1000).toFixed(2)} sec)</Typography>
            )}
            {loading && <CircularProgress size={14} />}
            {!loading && total > 0 && MATCH_TYPE_LABELS[matchType] && (
              <Chip size="small" variant="outlined" label={MATCH_TYPE_LABELS[matchType]} />
            )}
            <Box sx={{ flex: 1 }} />
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Sort by</InputLabel>
              <Select value={sort} label="Sort by" onChange={e => resetPage(setSort)(e.target.value)}>
                {SORTS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {searchError && <Alert severity="error" sx={{ mx: 2, mb: 1 }}>{searchError}</Alert>}

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>Match</TableCell>
                  <TableCell>Image</TableCell>
                  <TableCell>Title / Model Name<br /><Typography variant="caption" color="text.secondary">Make</Typography></TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Identifiers<br /><Typography variant="caption" color="text.secondary">(Models / UPCs)</Typography></TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>
                    Suggested Cost / Retail<br />
                    <Typography variant="caption" color="text.secondary">(Catalog)</Typography>
                  </TableCell>
                  <TableCell padding="checkbox" />
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map(r => {
                  const match = MATCH_CHIP[r.match_strength];
                  const statusChip = STATUS_CHIP[r.status] || { label: r.status, color: 'default' };
                  return (
                    <TableRow
                      key={r.id} hover selected={r.id === selectedId}
                      onClick={() => setSelectedId(r.id)}
                      onDoubleClick={() => openEditor(r.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        {match
                          ? <Chip size="small" variant="outlined" label={match.label} sx={{ minWidth: 64, ...match.sx }} />
                          : <Typography variant="caption" color="text.disabled">—</Typography>}
                      </TableCell>
                      <TableCell>
                        {/* Thumbnail = the item's primary reference image */}
                        <Box sx={{ width: 44, height: 44, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {r.primary_image_url
                            ? <Box component="img" src={assetUrl(r.primary_image_url)} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            : <LocalOfferOutlinedIcon sx={{ color: 'grey.400' }} />}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.title || r.model_name}</Typography>
                        <Typography variant="body2" color="text.secondary">{r.make_brand || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{r.friendly_code}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{categoryById[r.category_id]?.path || r.category_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{r.model_count} / {r.upc_count}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={statusChip.label} color={statusChip.color} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="success.main">{formatMoney(r.suggested_cost)}</Typography>
                        <Typography variant="body2" color="secondary.main">{formatMoney(r.suggested_retail)}</Typography>
                      </TableCell>
                      <TableCell padding="checkbox">
                        <IconButton size="small" onClick={e => { e.stopPropagation(); setSelectedId(r.id); }}>
                          <ChevronRightIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && results.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 5, textAlign: 'center' }}>
                      <Typography color="text.secondary">{emptyMessage()}</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          {/* Pagination */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.5, borderTop: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {firstShown} to {lastShown} of {total} items
            </Typography>
            <FormControl size="small" sx={{ minWidth: 90 }}>
              <InputLabel>Items per page</InputLabel>
              <Select value={pageSize} label="Items per page" onChange={e => resetPage(setPageSize)(e.target.value)}>
                {PAGE_SIZES.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Pagination
              count={pageCount} page={Math.min(page, pageCount)}
              onChange={(_, p) => setPage(p)}
              showFirstButton showLastButton shape="rounded" color="primary"
            />
          </Box>
        </Paper>

        {/* ── Selected Item Preview ──────────────────────────────────────── */}
        <Paper variant="outlined" sx={{ width: { xs: '100%', lg: 380 }, flexShrink: 0, p: 2, position: { lg: 'sticky' }, top: { lg: 16 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>Selected Item Preview</Typography>
            {selectedId && (
              <IconButton size="small" onClick={() => setSelectedId(null)}><CloseIcon fontSize="small" /></IconButton>
            )}
          </Box>

          {!selectedId ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              Select a catalog item to preview it.
            </Typography>
          ) : previewLoading || !preview ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} /></Box>
          ) : (
            <>
              <Box sx={{
                height: 180, mb: 1.5, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.50', border: 1, borderColor: 'divider',
                borderStyle: preview.primary_image ? 'solid' : 'dashed',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5,
              }}>
                {preview.primary_image ? (
                  <Box component="img" src={assetUrl(preview.primary_image.image_url)} alt={preview.title}
                    sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <>
                    <ImageNotSupportedOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary">No reference image — add one in the Catalog Item Editor</Typography>
                  </>
                )}
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{preview.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{preview.make_brand}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 2, rowGap: 0.5, mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary">Category:</Typography>
                <Typography variant="body2">{categoryById[preview.category_id]?.path || preview.category_name}</Typography>
                <Typography variant="body2" color="text.secondary">Catalog ID:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{preview.catalog_code}</Typography>
                <Typography variant="body2" color="text.secondary">Staff Code:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{preview.friendly_code}</Typography>
                <Typography variant="body2" color="text.secondary">Status:</Typography>
                <Box>
                  <Chip size="small" variant="outlined"
                    label={(STATUS_CHIP[preview.status] || {}).label || preview.status}
                    color={(STATUS_CHIP[preview.status] || {}).color || 'default'} />
                </Box>
              </Box>

              {/* Merge lineage: where a Merged item went / what a merged item came from. */}
              {preview.lineage?.into?.length > 0 && (
                <Alert severity="info" sx={{ mb: 1.5 }}>
                  Merged into{' '}
                  {preview.lineage.into.map((l, i) => (
                    <React.Fragment key={l.id}>
                      {i > 0 && ', '}
                      <Link component="button" variant="body2" onClick={() => setSelectedId(l.id)} sx={{ verticalAlign: 'baseline' }}>
                        {l.catalog_code} — {l.title}
                      </Link>
                    </React.Fragment>
                  ))}
                </Alert>
              )}
              {preview.lineage?.from?.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Merged from {preview.lineage.from.map(l => l.catalog_code).join(' + ')}
                </Typography>
              )}

              <PanelSection title="Identifiers">
                <IdentifierList label="Model Numbers" values={previewModels} />
                <IdentifierList label="UPCs" values={previewUpcs} />
              </PanelSection>

              <PanelSection title="Item Intelligence">
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <InfoOutlinedIcon fontSize="small" color="disabled" />
                  <Typography variant="body2" color="text.secondary">
                    On Hand, Avg/Last Paid, Avg/Last Sold and Days to Sell (Store / Company / Network) will appear here in a later phase.
                  </Typography>
                </Box>
              </PanelSection>

              <PanelSection title="Suggested Prices (Company Wide)">
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Suggested Retail</Typography>
                  <Typography variant="body2">{formatMoney(preview.pricing.suggested_retail)}</Typography>
                  <Typography variant="body2" color="text.secondary">Suggested Cost</Typography>
                  <Typography variant="body2">{formatMoney(preview.pricing.suggested_cost)}</Typography>
                  <Typography variant="body2" color="text.secondary">Retails New For</Typography>
                  <Typography variant="body2">{formatMoney(preview.pricing.retails_new_for)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  Suggested Buy / Pawn need Category Buy % / Pawn %, which aren't configured yet.
                  Blank prices mean "use historical intelligence".
                </Typography>
              </PanelSection>

              <Button fullWidth variant="contained" size="large" startIcon={<EditIcon />} onClick={() => openEditor(preview.id)}>
                Open in Catalog Item Editor
              </Button>
              {preview.status !== 'MERGED' && (
                <Button fullWidth variant="outlined" startIcon={<CallMergeIcon />} sx={{ mt: 1 }}
                  onClick={() => navigate(`/catalog/merge?a=${preview.id}`)}>
                  Merge with Another Item…
                </Button>
              )}
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
