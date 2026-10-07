import React, { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Breadcrumbs,
  Link,
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
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import { flattenCategoryTree } from '../utils/categoryTree';
import CameraCaptureDialog, { ImageFileInput } from '../components/CameraCaptureDialog';

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
  reference_image: 'Reference Image',
  additional_image: 'Additional Image',
  merged_into: 'Merged Into',
  merged_from: 'Merged From',
  split_into: 'Split Into',
  split_from: 'Split From',
  relinked_inventory: 'Inventory Re-linked',
};
const HISTORY_ACTION_LABELS = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  STATUS_CHANGE: 'Status Changed',
  CATEGORY_CHANGE: 'Category Changed',
  MERGE: 'Merged',
  SPLIT: 'Split',
};

const NOTES_MAX = 1000;

// Where "back" goes from both the New Catalog Item page and an existing item.
const CATALOG_MANAGER_PATH = '/catalog';

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

const IMAGE_SOURCE_LABELS = {
  UPLOAD: 'Uploaded',
  CAMERA: 'Camera photo',
  MANUFACTURER_API: 'Manufacturer',
  EXTERNAL_PROVIDER: 'External provider',
};
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// Stored image paths are server-relative (/uploads/…); the API base ends in /api.
const assetUrl = (url) => (url && url.startsWith('/uploads') ? `${API.replace(/\/api$/, '')}${url}` : url);

// Reference image + "Change Image" (Upload Image / Take Photo). The upload is
// saved immediately (independent of Save Changes) and recorded in History.
function ReferenceImagePanel({ image, disabledReason, uploading, onUpload }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef(null);

  const pickFile = () => {
    setMenuAnchor(null);
    fileInputRef.current?.click();
  };
  const openCamera = () => {
    setMenuAnchor(null);
    setCameraOpen(true);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <SectionTitle>Reference Image</SectionTitle>
      <Box sx={{
        height: 220, mb: 1.5, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.50',
        border: 1, borderColor: 'divider', borderStyle: image ? 'solid' : 'dashed',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        {image ? (
          <Box component="img" src={assetUrl(image.image_url)} alt="Catalog reference"
            sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <ImageNotSupportedOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary">No reference image yet</Typography>
          </Box>
        )}
        {uploading && (
          <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Tooltip title={disabledReason || ''}>
          <span>
            <Button variant="contained" size="small" endIcon={<ArrowDropDownIcon />}
              disabled={!!disabledReason || uploading}
              onClick={e => setMenuAnchor(e.currentTarget)}>
              {image ? 'Change Image' : 'Add Image'}
            </Button>
          </span>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        {image && (
          <Typography variant="body2" color="text.secondary">
            Source: {IMAGE_SOURCE_LABELS[image.source] || image.source}{image.provider ? ` · ${image.provider}` : ''}
          </Typography>
        )}
      </Box>
      {image && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Image last updated: {formatDate(image.created_at)}
          {image.uploaded_by_name && <> by {image.uploaded_by_name}</>}
        </Typography>
      )}

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={pickFile}><FileUploadIcon fontSize="small" sx={{ mr: 1 }} /> Upload Image</MenuItem>
        <MenuItem onClick={openCamera}><PhotoCameraIcon fontSize="small" sx={{ mr: 1 }} /> Take Photo</MenuItem>
      </Menu>
      <ImageFileInput ref={fileInputRef} accept="image/jpeg,image/png,image/webp,image/gif" readAsDataUrl={false}
        onSelect={([picked]) => onUpload(picked.file, 'UPLOAD')} />
      <CameraCaptureDialog
        open={cameraOpen}
        title="Take Reference Photo"
        fileNamePrefix="catalog-reference"
        onClose={() => setCameraOpen(false)}
        onCapture={({ file }) => { setCameraOpen(false); onUpload(file, 'CAMERA'); }}
      />
    </Paper>
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
  if (typeof v === 'object') {
    const entries = Object.entries(v);
    return entries.length ? entries.map(([k, val]) => `${k}: ${val}`).join(', ') : '—';
  }
  return String(v);
}

// One line per change: lists show what was added/removed, field values show
// each changed field, everything else "old → new". A CREATE shows the values set.
function describeHistoryChange(action, key, change, categoryNameById) {
  const { from, to } = change;
  if (key === 'reference_image' || key === 'additional_image') {
    return `${from ? 'replaced' : 'added'} (${(IMAGE_SOURCE_LABELS[change.source] || 'image').toLowerCase()})`;
  }
  if (action === 'CREATE' || key === 'reclassified_inventory') return historyValue(key, to, categoryNameById);

  if (Array.isArray(from) || Array.isArray(to)) {
    const before = from || [];
    const after = to || [];
    const added = after.filter(x => !before.includes(x));
    const removed = before.filter(x => !after.includes(x));
    return [
      added.length ? `added ${added.join(', ')}` : null,
      removed.length ? `removed ${removed.join(', ')}` : null,
    ].filter(Boolean).join('; ') || '—';
  }

  if ((from && typeof from === 'object') || (to && typeof to === 'object')) {
    const before = from || {};
    const after = to || {};
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .filter(k => before[k] !== after[k]);
    return keys.map(k => `${k}: ${before[k] ?? '—'} → ${after[k] ?? '—'}`).join('; ') || '—';
  }

  return `${historyValue(key, from, categoryNameById)} → ${historyValue(key, to, categoryNameById)}`;
}

// The generated title is derived (the server recomputes it on save), so it
// never makes the form "dirty" on its own.
const withoutGeneratedTitle = ({ generated_title, ...rest }) => rest;

// ─────────────────────────────────────────────────────────────────────────
// Catalog Item Editor (Phase 1: General tab). Routes:
//   /catalog/items/new   — New Catalog Item (Catalog Manager's "New Catalog
//                          Item" button; optionally pre-filled by Duplicate)
//   /catalog/items/:id   — existing item (Catalog Manager's "Open in Catalog
//                          Item Editor")
// Both lead back to the Catalog Manager (/catalog).
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
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
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
  const dirty = JSON.stringify(withoutGeneratedTitle(draft)) !== JSON.stringify(withoutGeneratedTitle(savedDraft));
  const categoryChanged = !isNew && item && Number(draft.category_id) !== item.category_id;

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

  // Generated title follows its inputs automatically: previewed live
  // (debounced) whenever Make, Model or Category change, and recomputed by the
  // server on every save. Unchanged inputs just show the saved title.
  const titleInputs = `${draft.category_id}|${draft.make_brand.trim()}|${draft.model_name.trim()}`;
  useEffect(() => {
    if (loading || !draft.category_id) return undefined;
    const matchesSaved = !isNew && item
      && Number(draft.category_id) === item.category_id
      && draft.make_brand.trim() === (item.make_brand || '')
      && draft.model_name.trim() === (item.model_name || '');
    if (matchesSaved) {
      const savedTitle = item.generated_title || '';
      setDraft(prev => (prev.generated_title === savedTitle ? prev : { ...prev, generated_title: savedTitle }));
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await axios.post(`${API}/catalog-items/generate-title`, {
          category_id: Number(draft.category_id),
          make_brand: draft.make_brand,
          model_name: draft.model_name,
          field_values: currentFieldValues(),
        });
        if (!cancelled) setDraft(prev => ({ ...prev, generated_title: res.data.generated_title || '' }));
      } catch (err) {
        // Preview only — the server generates the real title on save.
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleInputs, loading]);

  // Saved straight away (not part of Save Changes). Only the item record is
  // refreshed, so any unsaved edits in the form are kept.
  const handleImageUpload = async (file, source) => {
    if (file.size > MAX_IMAGE_BYTES) {
      enqueueSnackbar('Image must be 10 MB or smaller', { variant: 'warning' });
      return;
    }
    setImageUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('source', source);
      if (user?.id) form.append('employee_id', user.id);
      const res = await axios.post(`${API}/catalog-items/${itemId}/images`, form);
      setItem(res.data);
      enqueueSnackbar('Reference image updated', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to upload image', { variant: 'error' });
    } finally {
      setImageUploading(false);
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
      const res = await axios.put(`${API}/catalog-items/${itemId}`, buildPayload());
      const d = draftFromItem(res.data);
      setItem(res.data);
      setDraft(d);
      setSavedDraft(d);
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
        <Link component="button" variant="body2" underline="hover" onClick={() => navigate(CATALOG_MANAGER_PATH)}>
          Catalog Manager
        </Link>
        <Link component="button" variant="body2" underline="hover" color="text.secondary" onClick={() => navigate(CATALOG_MANAGER_PATH)}>
          Catalog Items
        </Link>
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
                  Copy
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
        <Alert severity="info" sx={{ mb: 2 }}>
          This catalog item has been merged and is read-only.
          {item.lineage?.into?.map(l => (
            <React.Fragment key={l.id}>
              {' '}Merged into{' '}
              <Link component="button" variant="body2" onClick={() => navigate(`/catalog/items/${l.id}`)} sx={{ verticalAlign: 'baseline' }}>
                {l.catalog_code} — {l.title}
              </Link>.
            </React.Fragment>
          ))}
        </Alert>
      )}
      {!isMerged && item?.lineage?.into?.some(l => l.relationship_type === 'SPLIT') && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This catalog item was split into{' '}
          {item.lineage.into.filter(l => l.relationship_type === 'SPLIT').map((l, i) => (
            <React.Fragment key={l.id}>
              {i > 0 && ' and '}
              <Link component="button" variant="body2" onClick={() => navigate(`/catalog/items/${l.id}`)} sx={{ verticalAlign: 'baseline' }}>
                {l.catalog_code} — {l.title}
              </Link>
            </React.Fragment>
          ))}.
        </Alert>
      )}
      {!isMerged && item?.lineage?.from?.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {item.lineage.from[0].relationship_type === 'SPLIT' ? 'Split from' : 'Created by merging'}{' '}
          {item.lineage.from.map(l => l.catalog_code).join(' + ')}.
        </Alert>
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

                <TextField
                  fullWidth size="small" label="Title (generated)" sx={{ mb: 2, '& .MuiInputBase-root': { bgcolor: 'grey.100' } }}
                  value={draft.generated_title}
                  placeholder="Generated from Make / Brand and Model Name"
                  InputProps={{ readOnly: true }}
                  InputLabelProps={{ shrink: true }}
                  helperText="Updates automatically when Make / Brand, Model Name or Category change."
                />

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
          <ReferenceImagePanel
            image={item?.primary_image || null}
            uploading={imageUploading}
            disabledReason={isNew
              ? 'Create the catalog item first, then add its reference image'
              : (isMerged ? 'Merged catalog items are read-only' : '')}
            onUpload={handleImageUpload}
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
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {HISTORY_ACTION_LABELS[h.action] || h.action}
                      {/* Inherited through a merge / split: recorded on the source item. */}
                      {h.from_catalog_code && (
                        <Tooltip title="Recorded on a source item this item was merged or split from">
                          <Chip size="small" variant="outlined" label={`on ${h.from_catalog_code}`}
                            onClick={() => { setHistoryOpen(false); navigate(`/catalog/items/${h.from_catalog_item_id}`); }}
                            sx={{ ml: 1, fontFamily: 'monospace', height: 20 }} />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      {Object.entries(h.changed_fields).map(([key, change], i) => (
                        <Fragment key={key}>
                          {i > 0 && <Divider sx={{ my: 0.5 }} />}
                          <Typography variant="body2">
                            <strong>{HISTORY_FIELD_LABELS[key] || key}:</strong>{' '}
                            {describeHistoryChange(h.action, key, change, categoryNameById)}
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
