import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  InputAdornment,
  ListSubheader,
  Menu,
  MenuItem,
  Paper,
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
import HistoryIcon from '@mui/icons-material/History';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';
import config from '../config';

const API = config.apiUrl;

// Doc §3: Draft, Active, Inactive, Merged. Merged is only reachable through
// the (future) Merge workflow, so it's never offered as a choice here.
const STATUS_OPTIONS = [
  { value: 'DRAFT',    label: 'Draft' },
  { value: 'ACTIVE',   label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];
const STATUS_CHIP = {
  DRAFT:    { label: 'Draft',    color: 'default' },
  ACTIVE:   { label: 'Active',   color: 'success' },
  INACTIVE: { label: 'Inactive', color: 'warning' },
  MERGED:   { label: 'Merged',   color: 'info' },
};

// Only General is in Phase 1; the rest are shown (per the design) but disabled.
const EDITOR_TABS = ['General', 'Identifiers', 'Fields & Attributes', 'Pricing', 'Descriptions', 'Images', 'History & Status'];

const HISTORY_FIELD_LABELS = {
  category_id: 'Category',
  status: 'Status',
  make_brand: 'Make / Brand',
  model_name: 'Model Name',
  generated_title: 'Generated Title',
  title_override: 'Title Override',
  default_inventory_mode: 'Default Inventory Mode',
  suggested_cost: 'Suggested Cost',
  suggested_retail: 'Suggested Retail',
  retails_new_for: 'Retails New For',
  internal_notes: 'Internal Notes',
  identifiers: 'Identifiers',
  aliases: 'Aliases',
  field_values: 'Catalog Field Values',
  reclassified_inventory: 'Inventory Reclassified',
};
const HISTORY_ACTION_LABELS = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  STATUS_CHANGE: 'Status Changed',
  CATEGORY_CHANGE: 'Category Changed',
};

const NOTES_MAX = 1000;

const EMPTY_DRAFT = {
  category_id: '',
  make_brand: '',
  model_name: '',
  generated_title: '',
  title_override: '',
  status: 'DRAFT',
  default_inventory_mode: '',
  suggested_cost: '',
  suggested_retail: '',
  retails_new_for: '',
  internal_notes: '',
  aliases: [],
};

// Catalog pricing is nullable: null ⇄ '' (blank = "use historical intelligence"), never 0.
const moneyToInput = (v) => (v === null || v === undefined ? '' : String(v));
const inputToMoney = (v) => (v === '' || v === null || v === undefined ? null : v);

const formatMoney = (v) => (v === null || v === undefined || v === ''
  ? '—'
  : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

const formatDate = (v) => (v ? new Date(v).toLocaleDateString() : '—');
const formatTime = (v) => (v ? new Date(v).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');

function draftFromItem(item) {
  return {
    category_id: item.category_id,
    make_brand: item.make_brand || '',
    model_name: item.model_name || '',
    generated_title: item.generated_title || '',
    title_override: item.title_override || '',
    status: item.status,
    default_inventory_mode: item.default_inventory_mode || '',
    suggested_cost: moneyToInput(item.pricing.suggested_cost),
    suggested_retail: moneyToInput(item.pricing.suggested_retail),
    retails_new_for: moneyToInput(item.pricing.retails_new_for),
    internal_notes: item.internal_notes || '',
    // Only staff-entered search terms are editable; previous/merged titles are system-managed.
    aliases: item.aliases.filter(a => a.alias_type === 'SEARCH_TERM' && a.is_active).map(a => a.alias),
  };
}

// Division → categories (depth-first, with depth for indentation and a
// readable path for the selected value).
function flattenCategoryTree(tree) {
  const out = [];
  tree.forEach(div => {
    const walk = (nodes, depth, path) => {
      nodes.forEach(n => {
        const nodePath = [...path, n.name];
        out.push({ id: n.id, name: n.name, is_active: n.is_active, depth, path: nodePath.join(' › '), division_id: div.id, division_name: div.name });
        if (n.children?.length) walk(n.children, depth + 1, nodePath);
      });
    };
    walk(div.categories || [], 0, []);
  });
  return out;
}

function SectionTitle({ children, sx }) {
  return <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, ...sx }}>{children}</Typography>;
}

function SummaryRow({ label, value, indent }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.6, pl: indent ? 1.5 : 0 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
    </Box>
  );
}

function LaterPhasePanel({ title, message, icon }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <SectionTitle>{title}</SectionTitle>
      <Box sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 1, py: 3, px: 2, bgcolor: 'grey.50', borderRadius: 1, border: 1, borderColor: 'divider', borderStyle: 'dashed',
      }}>
        {icon}
        <Typography variant="body2" color="text.secondary" align="center">{message}</Typography>
      </Box>
    </Paper>
  );
}

function historyValue(key, v, categoryNameById) {
  if (v === null || v === undefined || v === '') return '—';
  if (key === 'category_id') return categoryNameById[v] || `#${v}`;
  if (['suggested_cost', 'suggested_retail', 'retails_new_for'].includes(key)) return formatMoney(v);
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'object') return `${Object.keys(v).length} value(s)`;
  return String(v);
}

// ─────────────────────────────────────────────────────────────────────────
// Catalog Item Editor (Phase 1: General tab). Routes:
//   /catalog/items/new   — create (optionally pre-filled by Duplicate)
//   /catalog/items/:id   — edit
// ─────────────────────────────────────────────────────────────────────────
function CatalogItemEditorInner({ itemId, duplicate }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const isNew = !itemId;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [item, setItem] = useState(null);
  const [draft, setDraft] = useState(duplicate?.draft || EMPTY_DRAFT);
  const [savedDraft, setSavedDraft] = useState(duplicate?.draft || EMPTY_DRAFT);
  const [regenerateRequested, setRegenerateRequested] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [categoryTree, setCategoryTree] = useState([]);
  const [inventoryModes, setInventoryModes] = useState([]);
  const [aliasInput, setAliasInput] = useState('');

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saveMenuAnchor, setSaveMenuAnchor] = useState(null);
  const [confirmCategoryMove, setConfirmCategoryMove] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [treeRes, modesRes, itemRes] = await Promise.all([
          axios.get(`${API}/categories/tree`),
          axios.get(`${API}/inventory-modes`),
          isNew ? Promise.resolve(null) : axios.get(`${API}/catalog-items/${itemId}`),
        ]);
        if (cancelled) return;
        setCategoryTree(treeRes.data);
        setInventoryModes(modesRes.data);
        if (itemRes) {
          const d = draftFromItem(itemRes.data);
          setItem(itemRes.data);
          setDraft(d);
          setSavedDraft(d);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.status === 404
            ? 'Catalog item not found.'
            : (err.response?.data?.error || 'Failed to load catalog item.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [itemId, isNew]);

  const categories = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const categoryById = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
  const categoryNameById = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c.name])), [categories]);

  const isMerged = item?.status === 'MERGED';
  const dirty = regenerateRequested || JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const categoryChanged = !isNew && item && Number(draft.category_id) !== item.category_id;
  const makeOrModelChanged = !isNew && item
    && (draft.make_brand.trim() !== (item.make_brand || '') || draft.model_name.trim() !== (item.model_name || ''));

  const setField = (key) => (e) => {
    const value = e.target.value;
    setDraft(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  // Catalog field values feed the title template; the Fields tab isn't built
  // yet, so they come from the saved item (or the duplicated source).
  const currentFieldValues = () => (isNew
    ? (duplicate?.fieldValues || [])
    : (item?.field_values || []).filter(f => f.value !== null).map(f => ({ field_definition_id: f.field_definition_id, value: f.value })));

  const handleRegenerate = async () => {
    if (!draft.category_id) {
      setErrors(prev => ({ ...prev, category_id: 'Select a category first' }));
      return;
    }
    setRegenerating(true);
    try {
      const res = await axios.post(`${API}/catalog-items/generate-title`, {
        category_id: Number(draft.category_id),
        make_brand: draft.make_brand,
        model_name: draft.model_name,
        field_values: currentFieldValues(),
      });
      setDraft(prev => ({ ...prev, generated_title: res.data.generated_title || '' }));
      if (!isNew) setRegenerateRequested(true);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to generate title', { variant: 'error' });
    } finally {
      setRegenerating(false);
    }
  };

  const addAlias = (raw) => {
    const alias = raw.trim().replace(/\s+/g, ' ');
    if (!alias) return;
    setDraft(prev => (prev.aliases.some(a => a.toLowerCase() === alias.toLowerCase())
      ? prev
      : { ...prev, aliases: [...prev.aliases, alias] }));
    setAliasInput('');
  };

  const removeAlias = (alias) => setDraft(prev => ({ ...prev, aliases: prev.aliases.filter(a => a !== alias) }));

  const validate = () => {
    const next = {};
    if (!draft.category_id) next.category_id = 'Category is required';
    if (!draft.make_brand.trim()) next.make_brand = 'Make / Brand is required';
    if (!draft.model_name.trim()) next.model_name = 'Model Name is required';
    ['suggested_cost', 'suggested_retail', 'retails_new_for'].forEach(k => {
      if (draft[k] !== '' && (!Number.isFinite(Number(draft[k])) || Number(draft[k]) < 0)) {
        next[k] = 'Enter a non-negative amount or leave blank';
      }
    });
    if (draft.internal_notes.length > NOTES_MAX) next.internal_notes = `Max ${NOTES_MAX} characters`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = () => ({
    category_id: Number(draft.category_id),
    make_brand: draft.make_brand,
    model_name: draft.model_name,
    title_override: draft.title_override.trim() || null,
    status: draft.status,
    default_inventory_mode: draft.default_inventory_mode || null,
    pricing: {
      suggested_cost: inputToMoney(draft.suggested_cost),
      suggested_retail: inputToMoney(draft.suggested_retail),
      retails_new_for: inputToMoney(draft.retails_new_for),
    },
    internal_notes: draft.internal_notes.trim() || null,
    aliases: draft.aliases,
    employee_id: user?.id,
  });

  const doSave = async () => {
    setConfirmCategoryMove(false);
    setSaving(true);
    try {
      if (isNew) {
        const res = await axios.post(`${API}/catalog-items`, {
          ...buildPayload(),
          ...(duplicate?.fieldValues?.length ? { field_values: duplicate.fieldValues } : {}),
        });
        enqueueSnackbar(`Catalog item ${res.data.friendly_code} (${res.data.catalog_code}) created`, { variant: 'success' });
        navigate(`/catalog/items/${res.data.id}`, { replace: true });
        return;
      }
      const res = await axios.put(`${API}/catalog-items/${itemId}`, {
        ...buildPayload(),
        regenerate_title: regenerateRequested,
      });
      const d = draftFromItem(res.data);
      setItem(res.data);
      setDraft(d);
      setSavedDraft(d);
      setRegenerateRequested(false);
      enqueueSnackbar('Catalog item saved', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save catalog item', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!validate()) {
      enqueueSnackbar('Please fix the highlighted fields', { variant: 'warning' });
      return;
    }
    // Category is structural: moving the item reclassifies linked inventory (doc §1/§4).
    if (categoryChanged && item.summary.linked_inventory > 0) {
      setConfirmCategoryMove(true);
      return;
    }
    doSave();
  };

  const handleStatusAction = async (status) => {
    setSaveMenuAnchor(null);
    if (dirty) {
      enqueueSnackbar('Save or discard your changes before changing status', { variant: 'warning' });
      return;
    }
    try {
      const res = await axios.patch(`${API}/catalog-items/${itemId}/status`, { status, employee_id: user?.id });
      const d = draftFromItem(res.data);
      setItem(res.data);
      setDraft(d);
      setSavedDraft(d);
      enqueueSnackbar(`Catalog item ${STATUS_CHIP[status].label.toLowerCase()}`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to change status', { variant: 'error' });
    }
  };

  const handleDiscard = () => {
    setSaveMenuAnchor(null);
    setDraft(savedDraft);
    setRegenerateRequested(false);
    setErrors({});
  };

  // Duplicate copies the saved definition into a new, unsaved Draft. Identifiers
  // and aliases are intentionally not copied: they identify THIS item, and a
  // copied UPC would collide with it once activated.
  const handleDuplicate = () => {
    const source = draftFromItem(item);
    navigate('/catalog/items/new', {
      state: {
        duplicate: {
          sourceCode: item.catalog_code,
          draft: { ...source, status: 'DRAFT', generated_title: '', title_override: '', aliases: [] },
          fieldValues: item.field_values
            .filter(f => f.value !== null)
            .map(f => ({ field_definition_id: f.field_definition_id, value: f.value })),
        },
      },
    });
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API}/catalog-items/${itemId}/history`);
      setHistory(res.data);
    } catch (err) {
      enqueueSnackbar('Failed to load history', { variant: 'error' });
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }
  if (loadError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{loadError}</Alert>
      </Box>
    );
  }

  const heading = isNew
    ? (draft.model_name.trim() || 'New Catalog Item')
    : (item.title_override || item.generated_title || item.model_name);
  const statusChip = STATUS_CHIP[isNew ? draft.status : item.status];
  const readOnly = isMerged;

  // Category dropdown, grouped by division. Inactive categories can't be
  // chosen, except the one the item already sits in.
  const categoryMenuItems = [];
  let lastDivision = null;
  categories.forEach(c => {
    if (c.division_id !== lastDivision) {
      categoryMenuItems.push(<ListSubheader key={`div-${c.division_id}`}>{c.division_name}</ListSubheader>);
      lastDivision = c.division_id;
    }
    categoryMenuItems.push(
      <MenuItem
        key={c.id}
        value={c.id}
        disabled={!c.is_active && c.id !== item?.category_id}
        sx={{ pl: 2 + c.depth * 2 }}
      >
        {c.name}{!c.is_active ? ' (inactive)' : ''}
      </MenuItem>
    );
  });

  const moneyField = (key, label, helper, tooltip) => (
    <TextField
      fullWidth
      size="small"
      type="number"
      label={(
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          {label}
          <Tooltip title={tooltip}><InfoOutlinedIcon sx={{ fontSize: 15 }} /></Tooltip>
        </Box>
      )}
      value={draft[key]}
      onChange={setField(key)}
      disabled={readOnly}
      error={!!errors[key]}
      helperText={errors[key] || helper}
      inputProps={{ min: 0, step: '0.01' }}
      InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
      InputLabelProps={{ shrink: true, sx: { pointerEvents: 'auto' } }}
    />
  );

  return (
    <Box sx={{ p: 3, bgcolor: 'grey.50', minHeight: '100%' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 1 }}>
        {/* Catalog Manager / Catalog Items list screens are a later phase — shown as plain text. */}
        <Typography variant="body2" color="text.secondary">Catalog Manager</Typography>
        <Typography variant="body2" color="text.secondary">Catalog Items</Typography>
        <Typography variant="body2" color="text.primary">{heading}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>{heading}</Typography>
        <Chip label={statusChip.label} color={statusChip.color} size="small" variant="outlined" />
        {!isNew && (
          <Typography variant="body2" color="text.secondary">
            Catalog ID: <Box component="span" sx={{ fontFamily: 'monospace' }}>{item.catalog_code}</Box>
            &nbsp;·&nbsp;Code: <Box component="span" sx={{ fontFamily: 'monospace' }}>{item.friendly_code}</Box>
          </Typography>
        )}
        {dirty && !isNew && <Chip label="Unsaved changes" size="small" color="warning" />}

        <Box sx={{ flex: 1 }} />

        {!isNew && (
          <>
            <Button variant="outlined" startIcon={<HistoryIcon />} onClick={openHistory}>History</Button>
            <Tooltip title={dirty ? 'Save your changes before duplicating' : ''}>
              <span>
                <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleDuplicate} disabled={dirty}>
                  Duplicate
                </Button>
              </span>
            </Tooltip>
          </>
        )}
        <ButtonGroup variant="contained" disabled={saving || readOnly}>
          <Button startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave} disabled={saving || readOnly || (!isNew && !dirty)}>
            {isNew ? 'Create Catalog Item' : 'Save Changes'}
          </Button>
          {!isNew && (
            <Button size="small" onClick={e => setSaveMenuAnchor(e.currentTarget)}>
              <ArrowDropDownIcon />
            </Button>
          )}
        </ButtonGroup>
        <Menu anchorEl={saveMenuAnchor} open={!!saveMenuAnchor} onClose={() => setSaveMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <MenuItem onClick={handleDiscard} disabled={!dirty}>Discard changes</MenuItem>
        </Menu>
      </Box>

      {duplicate && isNew && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Duplicated from {duplicate.sourceCode}. Identifiers and aliases were not copied. Review the details, then create the new item.
        </Alert>
      )}
      {isMerged && (
        <Alert severity="info" sx={{ mb: 2 }}>This catalog item has been merged and is read-only.</Alert>
      )}

      <Grid container spacing={2} columns={24}>
        {/* ── Main column ─────────────────────────────────────────────── */}
        <Grid item xs={24} lg={17}>
          <Paper variant="outlined" sx={{ mb: 2 }}>
            <Tabs value={0} variant="scrollable" sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
              {/* Only General exists in Phase 1; the other tabs are later phases. */}
              {EDITOR_TABS.map((label, i) => <Tab key={label} label={label} disabled={i !== 0} />)}
            </Tabs>

            {/* Basic Information | Catalog Item Status | Key Summary */}
            <Grid container sx={{ p: 2.5 }} spacing={3}>
              <Grid item xs={12} md={4}>
                <SectionTitle>Basic Information</SectionTitle>
                <TextField
                  select fullWidth size="small" required label="Category" sx={{ mb: 2 }}
                  value={draft.category_id}
                  onChange={setField('category_id')}
                  disabled={readOnly}
                  error={!!errors.category_id}
                  helperText={errors.category_id || (categoryChanged && item.summary.linked_inventory > 0
                    ? `Moving category reclassifies ${item.summary.linked_inventory} linked inventory record(s)`
                    : '')}
                  SelectProps={{
                    renderValue: (v) => categoryById[v]?.path || '',
                    MenuProps: { PaperProps: { sx: { maxHeight: 400 } } },
                  }}
                >
                  {categoryMenuItems}
                </TextField>

                <TextField
                  fullWidth size="small" required label="Make / Brand" sx={{ mb: 2 }}
                  value={draft.make_brand}
                  onChange={setField('make_brand')}
                  disabled={readOnly}
                  error={!!errors.make_brand}
                  helperText={errors.make_brand}
                  inputProps={{ maxLength: 100 }}
                />

                <TextField
                  fullWidth size="small" required label="Model Name" sx={{ mb: 2 }}
                  value={draft.model_name}
                  onChange={setField('model_name')}
                  disabled={readOnly}
                  error={!!errors.model_name}
                  helperText={errors.model_name || 'Common, widely recognized model name.'}
                  inputProps={{ maxLength: 200 }}
                />

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 2 }}>
                  <TextField
                    fullWidth size="small" label="Title (generated)"
                    value={draft.generated_title}
                    placeholder={isNew ? 'Generated on create' : ''}
                    InputProps={{ readOnly: true }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiInputBase-root': { bgcolor: 'grey.100' } }}
                    helperText={makeOrModelChanged && !regenerateRequested
                      ? 'Make/Model changed — Regenerate to update the title'
                      : (regenerateRequested ? 'Regenerated — applied on save' : '')}
                  />
                  <Button variant="outlined" size="small" onClick={handleRegenerate}
                    disabled={readOnly || regenerating}
                    startIcon={regenerating ? <CircularProgress size={14} /> : <RefreshIcon />}
                    sx={{ whiteSpace: 'nowrap', height: 40 }}>
                    Regenerate
                  </Button>
                </Box>

                <TextField
                  fullWidth size="small" label="Title Override (optional)"
                  value={draft.title_override}
                  onChange={setField('title_override')}
                  disabled={readOnly}
                  placeholder="Enter custom title..."
                  helperText="Leave blank to use generated title."
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ maxLength: 300 }}
                />
              </Grid>

              <Grid item xs={12} md={4} sx={{ borderLeft: { md: 1 }, borderColor: { md: 'divider' } }}>
                <SectionTitle>Catalog Item Status</SectionTitle>
                <TextField
                  select fullWidth size="small" required label="Status" sx={{ mb: 2 }}
                  value={draft.status}
                  onChange={setField('status')}
                  disabled={readOnly}
                >
                  {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  {isMerged && <MenuItem value="MERGED" disabled>Merged</MenuItem>}
                </TextField>

                <TextField
                  fullWidth size="small" label="Catalog ID" sx={{ mb: 2, '& .MuiInputBase-root': { bgcolor: 'grey.100' } }}
                  value={isNew ? '' : item.catalog_code}
                  placeholder={isNew ? 'Assigned on create' : ''}
                  InputProps={{ readOnly: true, sx: { fontFamily: 'monospace' } }}
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  fullWidth size="small" label="Staff Code" sx={{ mb: 2, '& .MuiInputBase-root': { bgcolor: 'grey.100' } }}
                  value={isNew ? '' : item.friendly_code}
                  placeholder={isNew ? 'Assigned on create (CAT-HG-BRANDMODEL)' : ''}
                  helperText={isNew ? '' : 'Easy-to-type code. Set once at creation; editing Make/Model does not change it.'}
                  InputProps={{ readOnly: true, sx: { fontFamily: 'monospace' } }}
                  InputLabelProps={{ shrink: true }}
                />

                {!isNew && (
                  <>
                    <Typography variant="caption" color="text.secondary">Created</Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                      {formatDate(item.created_at)}&nbsp;&nbsp;{formatTime(item.created_at)}
                      {item.created_by_name && <>&nbsp;&nbsp;by {item.created_by_name}</>}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Last Updated</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {formatDate(item.updated_at)}&nbsp;&nbsp;{formatTime(item.updated_at)}
                      {item.updated_by_name && <>&nbsp;&nbsp;by {item.updated_by_name}</>}
                    </Typography>
                  </>
                )}

                <TextField
                  select fullWidth size="small" label="Default Inventory Mode"
                  value={draft.default_inventory_mode}
                  onChange={setField('default_inventory_mode')}
                  disabled={readOnly}
                  helperText="Used as the default when creating inventory."
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {inventoryModes.map(m => (
                    <MenuItem key={m.code} value={m.code}>
                      <Tooltip title={m.description || ''} placement="right"><span>{m.label}</span></Tooltip>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={4} sx={{ borderLeft: { md: 1 }, borderColor: { md: 'divider' } }}>
                <SectionTitle>Key Summary</SectionTitle>
                {isNew ? (
                  <Typography variant="body2" color="text.secondary">Available after the item is created.</Typography>
                ) : (
                  <>
                    <SummaryRow label="Identifiers" value={`${item.summary.identifiers} total`} />
                    <SummaryRow label="Fields Defined" value={`${item.summary.fields_defined} of ${item.summary.fields_available}`} />
                    <SummaryRow label="Aliases" value={item.summary.aliases} />
                    <SummaryRow label="Suggested Cost" value={formatMoney(item.pricing.suggested_cost)} />
                    <SummaryRow label="Suggested Retail" value={formatMoney(item.pricing.suggested_retail)} />
                    <SummaryRow label="Linked Inventory Records" value={item.summary.linked_inventory} />
                  </>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* ── Suggested Pricing ───────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Suggested Pricing <Typography component="span" variant="body2" color="text.secondary">(Company Wide)</Typography>
              </Typography>
              <Alert severity="info" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ py: 0, '& .MuiAlert-message': { py: 0.75 } }}>
                Values entered here are suggestions only. Store staff can override during intake or sale.
              </Alert>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                {moneyField('suggested_cost', 'Suggested Cost (Your Cost)',
                  'Leave blank to use historical intelligence.',
                  'Company-wide managed intake target.')}
              </Grid>
              <Grid item xs={12} md={4}>
                {moneyField('suggested_retail', 'Suggested Retail (Used)',
                  'Leave blank to use historical intelligence.',
                  'Company-wide managed retail target.')}
              </Grid>
              <Grid item xs={12} md={4}>
                {moneyField('retails_new_for', 'Retails New For (Optional)',
                  'What it retails new for (if known).',
                  'Optional reference value.')}
              </Grid>
            </Grid>
          </Paper>

          {/* ── Notes / Aliases ────────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <SectionTitle sx={{ mb: 1 }}>Notes</SectionTitle>
                <TextField
                  fullWidth multiline minRows={4}
                  label="Internal Notes (not visible to staff)"
                  placeholder="Enter internal notes about this catalog item..."
                  value={draft.internal_notes}
                  onChange={setField('internal_notes')}
                  disabled={readOnly}
                  error={!!errors.internal_notes}
                  helperText={errors.internal_notes}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ maxLength: NOTES_MAX }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
                  {draft.internal_notes.length} / {NOTES_MAX}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Aliases / Search Terms</Typography>
                  <Tooltip title="Alternate names staff may search for. Kept separate from the current title.">
                    <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  </Tooltip>
                </Box>
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1, minHeight: 100, bgcolor: 'background.paper' }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                    {draft.aliases.map(alias => (
                      <Chip key={alias} label={alias} size="small"
                        onDelete={readOnly ? undefined : () => removeAlias(alias)} />
                    ))}
                    {/* System-managed aliases (previous / merged titles) — read-only */}
                    {(item?.aliases || []).filter(a => a.alias_type !== 'SEARCH_TERM' && a.is_active).map(a => (
                      <Tooltip key={`sys-${a.id}`} title={a.alias_type === 'MERGED_TITLE' ? 'Merged title' : 'Previous title'}>
                        <Chip label={a.alias} size="small" variant="outlined" />
                      </Tooltip>
                    ))}
                  </Box>
                  <TextField
                    fullWidth size="small" variant="standard"
                    placeholder="Add alias or search term..."
                    value={aliasInput}
                    disabled={readOnly}
                    onChange={e => setAliasInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addAlias(aliasInput);
                      }
                    }}
                    onBlur={() => addAlias(aliasInput)}
                    InputProps={{ disableUnderline: true }}
                    inputProps={{ maxLength: 300 }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Use aliases to help staff find this item. Press Enter to add.
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* ── Right column ─────────────────────────────────────────────── */}
        <Grid item xs={24} lg={7}>
          <LaterPhasePanel
            title="Reference Image"
            icon={<ImageNotSupportedOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled' }} />}
            message="Catalog reference images are not available yet."
          />
          <LaterPhasePanel
            title="Item Intelligence"
            icon={<InfoOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />}
            message="Store / Company / Network history (On Hand, Avg Paid, Avg Sold, Days to Sell) will appear here in a later phase."
          />

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <SectionTitle>Quick Actions</SectionTitle>
            <Grid container spacing={1.5}>
              {[
                { key: 'suggest', icon: <LightbulbOutlinedIcon />, title: 'Suggest Catalog Change', sub: 'Report an update needed' },
                { key: 'merge',   icon: <MergeTypeIcon />,         title: 'Merge Catalog Items',    sub: 'Combine with another item' },
                { key: 'split',   icon: <CallSplitIcon />,         title: 'Split Catalog Item',     sub: 'Create variants from this' },
              ].map(a => (
                <Grid item xs={6} key={a.key}>
                  <Tooltip title="Coming in a later phase">
                    <span>
                      <Button fullWidth disabled variant="outlined"
                        sx={{ flexDirection: 'column', alignItems: 'flex-start', textTransform: 'none', p: 1.25, height: '100%' }}>
                        {a.icon}
                        <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{a.title}</Typography>
                        <Typography variant="caption">{a.sub}</Typography>
                      </Button>
                    </span>
                  </Tooltip>
                </Grid>
              ))}
              <Grid item xs={6}>
                {(() => {
                  const canToggle = !isNew && !isMerged;
                  const deactivate = item?.status !== 'INACTIVE';
                  return (
                    <Tooltip title={isNew ? 'Available after the item is created' : ''}>
                      <span>
                        <Button fullWidth variant="outlined" disabled={!canToggle}
                          color={deactivate ? 'inherit' : 'success'}
                          onClick={() => handleStatusAction(deactivate ? 'INACTIVE' : 'ACTIVE')}
                          sx={{ flexDirection: 'column', alignItems: 'flex-start', textTransform: 'none', p: 1.25, height: '100%' }}>
                          {deactivate ? <RemoveCircleOutlineIcon /> : <CheckCircleOutlineIcon />}
                          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                            {deactivate ? 'Deactivate Item' : 'Activate Item'}
                          </Typography>
                          <Typography variant="caption">{deactivate ? 'Keep for history' : 'Make available again'}</Typography>
                        </Button>
                      </span>
                    </Tooltip>
                  );
                })()}
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Category move confirmation ─────────────────────────────────── */}
      <Dialog open={confirmCategoryMove} onClose={() => setConfirmCategoryMove(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Move to another category?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Category is structural. Moving this catalog item to{' '}
            <strong>{categoryById[draft.category_id]?.path}</strong> will also reclassify{' '}
            <strong>{item?.summary.linked_inventory}</strong> linked inventory record(s).
            Their other descriptive values will not change.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCategoryMove(false)}>Cancel</Button>
          <Button variant="contained" onClick={doSave}>Move &amp; Save</Button>
        </DialogActions>
      </Dialog>

      {/* ── History ────────────────────────────────────────────────────── */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>History — {item?.friendly_code} ({item?.catalog_code})</DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : history.length === 0 ? (
            <Typography color="text.secondary">No history recorded.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Who</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Changes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map(h => (
                  <TableRow key={h.id} sx={{ verticalAlign: 'top' }}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(h.performed_at)} {formatTime(h.performed_at)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{h.performed_by_name || '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{HISTORY_ACTION_LABELS[h.action] || h.action}</TableCell>
                    <TableCell>
                      {Object.entries(h.changed_fields).map(([key, change], i) => (
                        <Fragment key={key}>
                          {i > 0 && <Divider sx={{ my: 0.5 }} />}
                          <Typography variant="body2">
                            <strong>{HISTORY_FIELD_LABELS[key] || key}:</strong>{' '}
                            {h.action === 'CREATE' || key === 'reclassified_inventory'
                              ? historyValue(key, change.to, categoryNameById)
                              : <>{historyValue(key, change.from, categoryNameById)} → {historyValue(key, change.to, categoryNameById)}</>}
                          </Typography>
                        </Fragment>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Remount on every navigation (new → saved id, Duplicate → new) so state never
// leaks between items.
export default function CatalogItemEditor() {
  const { id } = useParams();
  const location = useLocation();
  const itemId = id && id !== 'new' ? id : null;
  return (
    <CatalogItemEditorInner
      key={`${id}:${location.key}`}
      itemId={itemId}
      duplicate={itemId ? null : location.state?.duplicate}
    />
  );
}
