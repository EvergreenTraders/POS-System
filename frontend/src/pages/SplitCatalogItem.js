import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Autocomplete,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useSnackbar } from 'notistack';
import config from '../config';
import { useAuth } from '../context/AuthContext';
import { flattenCategoryTree } from '../utils/categoryTree';
import { CatalogItemPicker, CategorySelect } from '../components/CatalogPickers';
import CatalogFieldInput, { catalogScopeFields, fromStoredFieldValue, isBlankFieldValue } from '../components/CatalogFieldInput';

const API = config.apiUrl;
// Stored image paths are server-relative (/uploads/…); the API base ends in /api.
const assetUrl = (url) => (url && url.startsWith('/uploads') ? `${API.replace(/\/api$/, '')}${url}` : url);

const CATALOG_MANAGER_PATH = '/catalog';
const SIDES = ['A', 'B'];
// New Item A / B accent colours (A = green, B = purple), as in the design.
const SIDE_COLOR = { A: '#1b5e20', B: '#6a1b9a' };
const SIDE_BG = { A: '#e8f5e9', B: '#f3e5f5' };
const STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'INACTIVE', label: 'Inactive' },
];
const STATUS_LABEL = { ACTIVE: 'Active', DRAFT: 'Draft', INACTIVE: 'Inactive', MERGED: 'Merged' };
const MODEL_TYPES = ['MANUFACTURER_MODEL', 'OTHER'];
const UPC_TYPES = ['UPC', 'EAN'];
const NOTES_MAX = 1000;

// Same normalization as the server (harmless formatting removed).
const normalizeIdentifier = (v) => String(v ?? '').trim().toUpperCase().replace(/[\s\-_./]/g, '');
const normalizeAlias = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const identifierKey = (i) => `${i.identifier_type}:${normalizeIdentifier(i.raw_value)}`;
const formatDate = (v) => (v ? new Date(v).toLocaleDateString() : '—');
const sourceTitle = (item) => item.title || item.model_name;

function blankSide(source) {
  return {
    model_name: source.model_name || '',
    make_brand: source.make_brand || '',
    category_id: source.category_id,
    status: 'ACTIVE',
    internal_notes: source.internal_notes || '',
    identifiers: [],
    aliases: [],
    // Starts from the source's Catalog field values; each side edits its own copy.
    field_values: Object.fromEntries(source.field_values
      .filter(fv => !isBlankFieldValue(fv.value))
      .map(fv => [fv.field_definition_id, fromStoredFieldValue(fv.data_type, fv.value)])),
  };
}

// ── Inline "+ Add …" input (Enter adds, Esc cancels — no popup) ─────────
function InlineAdd({ addLabel, placeholder, options, onAdd, color }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const close = () => { setOpen(false); setText(''); };
  const commit = (value) => {
    const v = String(value ?? '').trim();
    if (!v) { close(); return; }
    if (onAdd(v) !== false) setText('');
  };

  if (!open) {
    return (
      <Button size="small" startIcon={<AddIcon />} onClick={() => setOpen(true)}
        sx={{ textTransform: 'none', color, alignSelf: 'flex-start', px: 0.5 }}>
        {addLabel}
      </Button>
    );
  }
  return (
    <Autocomplete
      freeSolo size="small" options={options} inputValue={text}
      onInputChange={(_, v, reason) => { if (reason !== 'reset') setText(v); }}
      onChange={(_, v) => { if (typeof v === 'string' || v) commit(typeof v === 'string' ? v : v.label); }}
      getOptionLabel={o => (typeof o === 'string' ? o : o.label)}
      renderOption={(props, o) => (
        <li {...props} key={o.label}>
          <Typography variant="body2" sx={{ fontFamily: o.mono ? 'monospace' : undefined }}>{o.label}</Typography>
          {o.hint && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{o.hint}</Typography>}
        </li>
      )}
      renderInput={params => (
        <TextField {...params} autoFocus placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }}
          onBlur={() => { if (!text.trim()) close(); }} />
      )}
    />
  );
}

// ── Identifier list for one side (Model Numbers or UPCs) ────────────────
function IdentifierEditor({ label, addLabel, placeholder, values, options, onAdd, onRemove, color }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>{label} ({values.length})</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {values.map(v => (
          <Box key={identifierKey(v)} sx={{
            display: 'flex', alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 1, pl: 1.25, pr: 0.5, py: 0.25,
          }}>
            <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace' }}>
              {['EAN', 'OTHER'].includes(v.identifier_type) && (
                <Typography component="span" variant="caption" color="text.secondary">
                  {v.identifier_type === 'EAN' ? 'EAN: ' : 'Other: '}
                </Typography>
              )}
              {v.raw_value}
            </Typography>
            <IconButton size="small" onClick={() => onRemove(v)} aria-label={`Remove ${v.raw_value}`}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <InlineAdd addLabel={addLabel} placeholder={placeholder} options={options} onAdd={onAdd} color={color} />
      </Box>
    </Box>
  );
}

// ── New Item A / B panel ────────────────────────────────────────────────
function NewItemPanel({ side, draft, errors, categories, source, otherDraft, onChange, notify, fields, fieldsLoading }) {
  const color = SIDE_COLOR[side];
  const other = side === 'A' ? 'B' : 'A';
  const set = (patch) => onChange({ ...draft, ...patch });
  const ownKeys = new Set(draft.identifiers.map(identifierKey));
  const otherKeys = new Set(otherDraft.identifiers.map(identifierKey));

  // Source identifiers not yet on this side, offered when adding.
  const sourceOptions = (types) => source.identifiers
    .filter(i => i.is_active && types.includes(i.identifier_type) && !ownKeys.has(identifierKey(i)))
    .map(i => ({ label: i.raw_value, mono: true, identifier_type: i.identifier_type, hint: otherKeys.has(identifierKey(i)) ? `on Item ${other}` : 'from source' }));

  const addIdentifier = (types) => (raw) => {
    const fromSource = source.identifiers.find(i => types.includes(i.identifier_type)
      && normalizeIdentifier(i.raw_value) === normalizeIdentifier(raw));
    let type = fromSource?.identifier_type;
    if (!type) {
      if (types === UPC_TYPES) {
        const digits = normalizeIdentifier(raw);
        if (!/^\d+$/.test(digits)) { notify(`UPC "${raw}" must contain digits only`); return false; }
        type = digits.length === 13 ? 'EAN' : 'UPC';
      } else {
        type = 'MANUFACTURER_MODEL';
      }
    }
    const entry = { identifier_type: type, raw_value: fromSource?.raw_value || raw };
    if (ownKeys.has(identifierKey(entry))) { notify(`${raw} is already on New Item ${side}`); return false; }
    set({ identifiers: [...draft.identifiers, entry] });
    return true;
  };
  const removeIdentifier = (v) => set({ identifiers: draft.identifiers.filter(i => identifierKey(i) !== identifierKey(v)) });

  const aliasOptions = source.aliases
    .filter(a => a.is_active && a.alias_type === 'SEARCH_TERM' && !draft.aliases.some(x => normalizeAlias(x) === a.normalized_alias))
    .map(a => ({ label: a.alias, hint: 'from source' }));
  const addAlias = (alias) => {
    if (draft.aliases.some(x => normalizeAlias(x) === normalizeAlias(alias))) { notify(`"${alias}" is already an alias`); return false; }
    set({ aliases: [...draft.aliases, alias] });
    return true;
  };

  return (
    <Paper variant="outlined" sx={{ flex: 1, minWidth: 460 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, bgcolor: SIDE_BG[side], borderBottom: 1, borderColor: 'divider' }}>
        <DescriptionOutlinedIcon sx={{ color }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color, letterSpacing: 0.3 }}>NEW ITEM {side}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {[draft.make_brand, draft.model_name].filter(Boolean).join(' ') || 'Untitled'}
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 130, bgcolor: 'background.paper' }}>
          <InputLabel>Status</InputLabel>
          <Select value={draft.status} label="Status" onChange={e => set({ status: e.target.value })}>
            {STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField size="small" label="Model Name" required value={draft.model_name}
            onChange={e => set({ model_name: e.target.value })}
            error={!!errors.model_name} helperText={errors.model_name} inputProps={{ maxLength: 200 }} />
          <TextField size="small" label="Make / Brand" required value={draft.make_brand}
            onChange={e => set({ make_brand: e.target.value })}
            error={!!errors.make_brand} helperText={errors.make_brand} inputProps={{ maxLength: 100 }} />
          <CategorySelect categories={categories} value={draft.category_id} error={errors.category_id}
            onChange={v => set({ category_id: v })} />
          <TextField size="small" label="Description (optional)" multiline minRows={5} maxRows={10}
            value={draft.internal_notes} onChange={e => set({ internal_notes: e.target.value })}
            error={!!errors.internal_notes}
            helperText={errors.internal_notes || 'Saved as the item’s Internal Notes'} />
        </Box>

        <Box sx={{ borderLeft: { md: 1 }, borderColor: { md: 'divider' }, pl: { md: 2.5 } }}>
          <IdentifierEditor label="Model Numbers" addLabel="Add Model Number" placeholder="Model number — Enter to add"
            values={draft.identifiers.filter(i => MODEL_TYPES.includes(i.identifier_type))}
            options={sourceOptions(MODEL_TYPES)} onAdd={addIdentifier(MODEL_TYPES)} onRemove={removeIdentifier} color={color} />
          <IdentifierEditor label="UPCs" addLabel="Add UPC" placeholder="UPC / EAN — Enter to add"
            values={draft.identifiers.filter(i => UPC_TYPES.includes(i.identifier_type))}
            options={sourceOptions(UPC_TYPES)} onAdd={addIdentifier(UPC_TYPES)} onRemove={removeIdentifier} color={color} />
          {errors.identifiers && <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>{errors.identifiers}</Typography>}

          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>Aliases / Search Terms ({draft.aliases.length})</Typography>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {draft.aliases.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {draft.aliases.map(a => (
                  <Chip key={normalizeAlias(a)} size="small" label={a} variant="outlined"
                    onDelete={() => set({ aliases: draft.aliases.filter(x => x !== a) })} />
                ))}
              </Box>
            )}
            <InlineAdd addLabel="Add Alias" placeholder="Search term — Enter to add" options={aliasOptions} onAdd={addAlias} color={color} />
          </Box>
        </Box>
      </Box>

      {/* Catalog field values — this item's own (e.g. color, edition, storage). */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Catalog Fields ({fields.length})
          {fieldsLoading && <CircularProgress size={12} sx={{ ml: 1 }} />}
        </Typography>
        {fields.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {fieldsLoading ? 'Loading fields…' : 'This category has no Catalog fields.'}
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
            {fields.map(fd => {
              const id = fd.field_definition_id;
              return (
                <CatalogFieldInput key={id} field={fd} required={fd.required_for_catalog}
                  value={draft.field_values[id] ?? (fd.data_type === 'MULTISELECT' ? [] : '')}
                  error={errors.fields?.[id]}
                  onChange={v => {
                    const next = { ...draft.field_values };
                    if (isBlankFieldValue(v)) delete next[id]; else next[id] = v;
                    set({ field_values: next });
                  }} />
              );
            })}
          </Box>
        )}
      </Box>
    </Paper>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Split Catalog Item (doc §6) — create two NEW catalog items from a source.
// Each side gets its own details, identifiers, aliases and Catalog field
// values. Every inventory record linked to the source must be assigned to
// New Item A or B (a suggestion comes from matching each record's part
// number / attributes against the identifiers, but the manager chooses).
// On Process the source keeps its data and history but is marked Inactive.
// Route: /catalog/split?source=<id>
// ─────────────────────────────────────────────────────────────────────────
export default function SplitCatalogItem() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sourceId = parseInt(searchParams.get('source'), 10) || null;

  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [drafts, setDrafts] = useState(null);       // { A: {...}, B: {...} }
  const [assignments, setAssignments] = useState({}); // item_id → 'A' | 'B' (unset = not chosen yet)
  const [inventoryError, setInventoryError] = useState('');
  // Catalog field definitions for each side's category: { A: { categoryId, defs, loading }, B: … }
  const [sideFields, setSideFields] = useState({ A: { categoryId: null, defs: [], loading: false }, B: { categoryId: null, defs: [], loading: false } });
  const [errors, setErrors] = useState({ A: {}, B: {} });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const loadSeq = useRef(0);

  useEffect(() => {
    axios.get(`${API}/categories/tree`)
      .then(res => setCategoryTree(res.data || []))
      .catch(() => enqueueSnackbar('Failed to load categories', { variant: 'error' }));
  }, [enqueueSnackbar]);
  const categories = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const categoryById = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);

  // Load the source + its linked inventory; reset both new items from it.
  useEffect(() => {
    const seq = ++loadSeq.current;
    setSource(null); setDrafts(null); setInventory([]); setAssignments({}); setInventoryError(''); setErrors({ A: {}, B: {} });
    if (!sourceId) return;
    setLoading(true);
    Promise.all([
      axios.get(`${API}/catalog-items/${sourceId}`),
      axios.get(`${API}/catalog-items/${sourceId}/linked-inventory`),
    ]).then(([itemRes, invRes]) => {
      if (seq !== loadSeq.current) return;
      if (itemRes.data.status === 'MERGED') {
        enqueueSnackbar(`${itemRes.data.catalog_code} has been merged and can't be split`, { variant: 'warning' });
        setSearchParams({}, { replace: true });
        return;
      }
      setSource(itemRes.data);
      setInventory(invRes.data || []);
      setDrafts({ A: blankSide(itemRes.data), B: blankSide(itemRes.data) });
    }).catch(() => {
      if (seq === loadSeq.current) enqueueSnackbar('Failed to load the source item', { variant: 'error' });
    }).finally(() => {
      if (seq === loadSeq.current) setLoading(false);
    });
  }, [sourceId, enqueueSnackbar, setSearchParams]);

  // Load each side's Catalog fields when its category changes.
  const categoryA = drafts?.A.category_id;
  const categoryB = drafts?.B.category_id;
  useEffect(() => {
    const loaders = [['A', categoryA], ['B', categoryB]].map(([side, categoryId]) => {
      if (!categoryId) return null;
      let cancelled = false;
      setSideFields(prev => ({ ...prev, [side]: { ...prev[side], loading: true } }));
      axios.get(`${API}/categories/${categoryId}/effective-fields`)
        .then(res => { if (!cancelled) setSideFields(prev => ({ ...prev, [side]: { categoryId, defs: catalogScopeFields(res.data), loading: false } })); })
        .catch(() => {
          if (cancelled) return;
          setSideFields(prev => ({ ...prev, [side]: { categoryId: null, defs: [], loading: false } }));
          enqueueSnackbar(`Failed to load fields for New Item ${side}`, { variant: 'error' });
        });
      return () => { cancelled = true; };
    });
    return () => loaders.forEach(cancel => cancel && cancel());
  }, [categoryA, categoryB, enqueueSnackbar]);
  // A side's fields, only once they belong to its current category.
  const fieldsFor = (side) => (sideFields[side].categoryId === drafts?.[side].category_id ? sideFields[side].defs : []);

  const notify = (msg) => enqueueSnackbar(msg, { variant: 'warning' });
  const updateDraft = (side) => (next) => {
    setDrafts(prev => ({ ...prev, [side]: next }));
    setErrors(prev => ({ ...prev, [side]: {} }));
  };

  // Suggested side per inventory record: its part number / attribute values
  // match identifiers on exactly one new item.
  const suggestions = useMemo(() => {
    if (!drafts) return {};
    const keys = Object.fromEntries(SIDES.map(s => [s, new Map(drafts[s].identifiers.map(i => [normalizeIdentifier(i.raw_value), i.raw_value]))]));
    return Object.fromEntries(inventory.map(r => {
      const hits = SIDES.map(s => ({ side: s, value: r.match_values.map(v => keys[s].get(v)).find(Boolean) })).filter(h => h.value);
      return [r.item_id, hits.length === 1 ? hits[0] : null];
    }));
  }, [inventory, drafts]);
  // Suggestions only recommend: a record counts as assigned once the manager chooses A or B.
  const assignmentOf = (r) => assignments[r.item_id] || null;
  const counts = inventory.reduce((acc, r) => {
    const a = assignmentOf(r) || 'UNASSIGNED';
    return { ...acc, [a]: acc[a] + 1 };
  }, { A: 0, B: 0, UNASSIGNED: 0 });
  const assign = (patch) => { setAssignments(prev => ({ ...prev, ...patch })); setInventoryError(''); };
  const setAll = (value) => assign(Object.fromEntries(inventory.map(r => [r.item_id, value])));
  const applySuggestions = () => assign(Object.fromEntries(inventory
    .filter(r => suggestions[r.item_id]).map(r => [r.item_id, suggestions[r.item_id].side])));
  const suggestedCount = inventory.filter(r => suggestions[r.item_id]).length;

  const validate = () => {
    const next = { A: {}, B: {} };
    SIDES.forEach(s => {
      const d = drafts[s];
      if (!d.model_name.trim()) next[s].model_name = 'Model Name is required';
      if (!d.make_brand.trim()) next[s].make_brand = 'Make / Brand is required';
      if (!d.category_id) next[s].category_id = 'Category is required';
      if (d.internal_notes.length > NOTES_MAX) next[s].internal_notes = `Max ${NOTES_MAX} characters`;
      // Fields marked "Required for catalog" must be filled for an Active item.
      if (d.status === 'ACTIVE') {
        const missing = Object.fromEntries(fieldsFor(s)
          .filter(fd => fd.required_for_catalog && isBlankFieldValue(d.field_values[fd.field_definition_id]))
          .map(fd => [fd.field_definition_id, 'Required for an Active catalog item']));
        if (Object.keys(missing).length) next[s].fields = missing;
      }
    });
    // A UPC / EAN may belong to only one of the new items.
    const upcKeysB = new Set(drafts.B.identifiers.filter(i => UPC_TYPES.includes(i.identifier_type)).map(identifierKey));
    const shared = drafts.A.identifiers.filter(i => UPC_TYPES.includes(i.identifier_type) && upcKeysB.has(identifierKey(i)));
    if (shared.length) {
      const msg = `UPC ${shared.map(i => i.raw_value).join(', ')} is on both new items — keep it on one`;
      next.A.identifiers = msg; next.B.identifiers = msg;
    }
    setErrors(next);
    const ok = SIDES.every(s => Object.keys(next[s]).length === 0);
    if (!ok) { notify('Fix the highlighted fields first'); return false; }
    if (counts.UNASSIGNED > 0) {
      const msg = `Assign every inventory record to New Item A or B — ${counts.UNASSIGNED} not assigned yet`;
      setInventoryError(msg);
      notify(msg);
      return false;
    }
    return true;
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const res = await axios.post(`${API}/catalog-items/${source.id}/split`, {
        items: SIDES.map(s => ({
          model_name: drafts[s].model_name,
          make_brand: drafts[s].make_brand,
          category_id: drafts[s].category_id,
          status: drafts[s].status,
          internal_notes: drafts[s].internal_notes || null,
          identifiers: drafts[s].identifiers,
          aliases: drafts[s].aliases,
          // This item's own values for the Catalog fields of its category.
          field_values: fieldsFor(s).map(fd => ({
            field_definition_id: fd.field_definition_id,
            value: drafts[s].field_values[fd.field_definition_id] ?? null,
          })),
        })),
        inventory: inventory
          .map(r => ({ item_id: r.item_id, inventory_table: r.inventory_table, target: SIDES.indexOf(assignmentOf(r)) })),
        employee_id: user?.id,
      });
      const [a, b] = res.data.items;
      enqueueSnackbar(`Split into ${a.catalog_code} and ${b.catalog_code}`, { variant: 'success' });
      navigate(`/catalog/items/${a.id}`);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to split catalog item', { variant: 'error' });
      setConfirmOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  // Source identifiers / search terms that neither new item kept.
  const unassigned = drafts && source ? [
    ...source.identifiers.filter(i => i.is_active
      && !SIDES.some(s => drafts[s].identifiers.some(x => identifierKey(x) === identifierKey(i)))).map(i => i.raw_value),
    ...source.aliases.filter(a => a.is_active && a.alias_type === 'SEARCH_TERM'
      && !SIDES.some(s => drafts[s].aliases.some(x => normalizeAlias(x) === a.normalized_alias))).map(a => a.alias),
  ] : [];

  const modelCount = source ? source.identifiers.filter(i => i.is_active && i.identifier_type === 'MANUFACTURER_MODEL').length : 0;
  const upcCount = source ? source.identifiers.filter(i => i.is_active && UPC_TYPES.includes(i.identifier_type)).length : 0;

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
        <Typography variant="body2" color="text.primary">Split Catalog Item</Typography>
      </Breadcrumbs>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Split Catalog Item</Typography>
          <Typography variant="body2" color="text.secondary">
            Split the selected catalog item into two new items. Edit the details for each new item below.
          </Typography>
        </Box>
        <Button variant="outlined" size="large" onClick={() => navigate(CATALOG_MANAGER_PATH)} disabled={processing}>Cancel</Button>
        <Button variant="contained" size="large" disabled={!drafts || processing}
          onClick={() => { if (validate()) setConfirmOpen(true); }}>
          Process
        </Button>
      </Box>

      {/* ── Source item ────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <DescriptionOutlinedIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
            SOURCE ITEM{' '}
            <Typography component="span" variant="body2" color="text.secondary">
              (details and history kept — all its inventory moves to New Item A or B, and it will be marked Inactive)
            </Typography>
          </Typography>
          {source && <Button size="small" startIcon={<SwapHorizIcon />} onClick={() => setSearchParams({}, { replace: true })}>Change</Button>}
        </Box>
        <Box sx={{ p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
          ) : !source ? (
            <Box sx={{ maxWidth: 520 }}>
              <CatalogItemPicker placeholder="Search for the catalog item to split…"
                onPick={id => setSearchParams({ source: String(id) }, { replace: true })} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Box sx={{ width: 110, height: 110, flexShrink: 0, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {source.primary_image
                  ? <Box component="img" src={assetUrl(source.primary_image.image_url)} alt="" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  : <LocalOfferOutlinedIcon sx={{ fontSize: 40, color: 'grey.400' }} />}
              </Box>
              <Box sx={{ minWidth: 300, flex: 1.4, pr: 3, borderRight: { md: 1 }, borderColor: { md: 'divider' } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{sourceTitle(source)}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{source.make_brand}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 3, rowGap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Category:</Typography>
                  <Typography variant="body2">{categoryById[source.category_id]?.path || source.category_name}</Typography>
                  <Typography variant="body2" color="text.secondary">Catalog ID:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{source.catalog_code}</Typography>
                  <Typography variant="body2" color="text.secondary">Status:</Typography>
                  <Typography variant="body2">{STATUS_LABEL[source.status] || source.status}</Typography>
                </Box>
              </Box>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Identifiers</Typography>
                <Typography variant="body2">{modelCount} Model Number{modelCount === 1 ? '' : 's'}</Typography>
                <Typography variant="body2">{upcCount} UPC{upcCount === 1 ? '' : 's'}</Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Tooltip title="Inventory records (all stores) linked to this catalog item">
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Linked Inventory</Typography>
                </Tooltip>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{source.summary.linked_inventory}</Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 140 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Created</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>{formatDate(source.created_at)}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Last Updated</Typography>
                <Typography variant="body2">{formatDate(source.updated_at)}</Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {drafts && source && (
        <>
          {/* ── New items ──────────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            {SIDES.map(s => (
              <NewItemPanel key={s} side={s} draft={drafts[s]} errors={errors[s]} categories={categories}
                source={source} otherDraft={drafts[s === 'A' ? 'B' : 'A']} onChange={updateDraft(s)} notify={notify}
                fields={fieldsFor(s)} fieldsLoading={sideFields[s].loading} />
            ))}
          </Box>

          {unassigned.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Not kept on either new item (they stay only on the inactive source): {unassigned.join(', ')}
            </Alert>
          )}

          {/* ── Inventory assignment ───────────────────────────────────── */}
          <Paper variant="outlined" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 260 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Linked Inventory ({inventory.length})</Typography>
                <Typography variant="caption" color="text.secondary">
                  Every record must move to New Item A or B. Suggestions come from matching part numbers / attributes to each item’s identifiers — they’re only recommendations until you choose.
                </Typography>
              </Box>
              {inventory.length > 0 && (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    A: <strong>{counts.A}</strong> · B: <strong>{counts.B}</strong> ·{' '}
                    <Box component="span" sx={{ color: counts.UNASSIGNED ? 'warning.dark' : 'inherit' }}>Not assigned: <strong>{counts.UNASSIGNED}</strong></Box>
                  </Typography>
                  <Button size="small" onClick={() => setAll('A')}>All → A</Button>
                  <Button size="small" onClick={() => setAll('B')}>All → B</Button>
                  <Tooltip title={suggestedCount ? `Assign the ${suggestedCount} record(s) that have a suggestion` : 'No suggestions yet — add identifiers to the new items'}>
                    <span><Button size="small" onClick={applySuggestions} disabled={!suggestedCount}>Apply Suggestions</Button></span>
                  </Tooltip>
                </>
              )}
            </Box>
            {inventoryError && <Alert severity="warning" sx={{ m: 2, mb: 0 }}>{inventoryError}</Alert>}
            {inventory.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No inventory is linked to this catalog item.</Typography>
            ) : (
              <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item ID</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Part # / Serial</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Suggested</TableCell>
                      <TableCell align="right">Assign To</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inventory.map(r => {
                      const sug = suggestions[r.item_id];
                      return (
                        <TableRow key={`${r.inventory_table}-${r.item_id}`} hover
                          sx={{ bgcolor: !assignmentOf(r) && inventoryError ? '#fff4e5' : undefined }}>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{r.item_id}</TableCell>
                          <TableCell sx={{ maxWidth: 320 }}>
                            <Typography variant="body2" noWrap title={r.description || ''}>{r.description || '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{r.part_number || '—'}</Typography>
                            {r.serial_number && <Typography variant="caption" color="text.secondary">SN {r.serial_number}</Typography>}
                          </TableCell>
                          <TableCell>{r.status || '—'}</TableCell>
                          <TableCell>
                            {sug ? (
                              <Chip size="small" label={`${sug.side} · ${sug.value}`}
                                sx={{ bgcolor: SIDE_BG[sug.side], color: SIDE_COLOR[sug.side], fontFamily: 'monospace' }} />
                            ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                          </TableCell>
                          <TableCell align="right">
                            <ToggleButtonGroup size="small" exclusive value={assignmentOf(r)}
                              onChange={(_, v) => v && assign({ [r.item_id]: v })}
                              sx={!assignmentOf(r) && inventoryError ? { outline: 2, outlineColor: 'warning.main', borderRadius: 1 } : undefined}>
                              <ToggleButton value="A" sx={{ px: 1.5, '&.Mui-selected': { bgcolor: SIDE_BG.A, color: SIDE_COLOR.A } }}>Item A</ToggleButton>
                              <ToggleButton value="B" sx={{ px: 1.5, '&.Mui-selected': { bgcolor: SIDE_BG.B, color: SIDE_COLOR.B } }}>Item B</ToggleButton>
                            </ToggleButtonGroup>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>
        </>
      )}

      {/* ── Confirm ────────────────────────────────────────────────────── */}
      <Dialog open={confirmOpen} onClose={() => !processing && setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Split this catalog item?</DialogTitle>
        <DialogContent>
          {drafts && source && (
            <>
              <Typography variant="body2" sx={{ mb: 1.5 }}>Two new catalog items will be created:</Typography>
              <Box component="ul" sx={{ mt: 0, pl: 3 }}>
                {SIDES.map(s => (
                  <li key={s}><Typography variant="body2">
                    <strong>{drafts[s].make_brand} {drafts[s].model_name}</strong> ({STATUS_LABEL[drafts[s].status]})
                    {' — '}{counts[s]} inventory record{counts[s] === 1 ? '' : 's'}
                  </Typography></li>
                ))}
              </Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {source.catalog_code} keeps its details and history, no longer has any inventory linked to it, and will be marked <strong>Inactive</strong>.
              </Typography>
              <Typography variant="body2" color="text.secondary">This can’t be undone.</Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={processing}>Cancel</Button>
          <Button variant="contained" onClick={handleProcess} disabled={processing}
            startIcon={processing ? <CircularProgress size={16} color="inherit" /> : null}>
            Process Split
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
