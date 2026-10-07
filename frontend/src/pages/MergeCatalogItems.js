import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Radio,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useSnackbar } from 'notistack';
import config from '../config';
import { useAuth } from '../context/AuthContext';
import { flattenCategoryTree } from '../utils/categoryTree';
import { CatalogItemPicker, CategorySelect } from '../components/CatalogPickers';

const API = config.apiUrl;
// Stored image paths are server-relative (/uploads/…); the API base ends in /api.
const assetUrl = (url) => (url && url.startsWith('/uploads') ? `${API.replace(/\/api$/, '')}${url}` : url);

const CATALOG_MANAGER_PATH = '/catalog';
// Source A / B accent colours (A = green, B = purple), as in the design.
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

const formatMoney = (v) => (v === null || v === undefined
  ? 'Not set'
  : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const sourceTitle = (item) => item.title || item.model_name;

// The "Choose Values from A/B" rows: what each choice shows and what it sets.
const CHOICE_ROWS = [
  { key: 'title', label: 'Title / Model Name', display: sourceTitle },
  { key: 'suggested_cost', label: 'Suggested Cost', display: (i) => formatMoney(i.pricing.suggested_cost) },
  { key: 'suggested_retail', label: 'Suggested Retail', display: (i) => formatMoney(i.pricing.suggested_retail) },
  { key: 'retails_new_for', label: 'Retails New For', display: (i) => formatMoney(i.pricing.retails_new_for) },
  { key: 'description', label: 'Description (optional)', display: (i) => i.internal_notes || 'None', multiline: true },
];

// Draft values a choice copies from a source into the Merged Item.
function valuesFromChoice(key, item) {
  switch (key) {
    case 'title':
      return { model_name: item.model_name || '', make_brand: item.make_brand || '', title_override: item.title_override || '' };
    case 'description':
      return { internal_notes: item.internal_notes || '' };
    default:
      return { [key]: item.pricing[key] };
  }
}

function sideIdentifiers(item, types) {
  return (item?.identifiers || []).filter(i => i.is_active && types.includes(i.identifier_type));
}

// ── Source item card ────────────────────────────────────────────────────
function SourceCard({ side, item, loading, categoryPath, excludeIds, onPick, onChange }) {
  const color = SIDE_COLOR[side];
  return (
    <Paper variant="outlined" sx={{ flex: 1, minWidth: 340, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <DescriptionOutlinedIcon fontSize="small" sx={{ color }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color, flex: 1, letterSpacing: 0.3 }}>
          SOURCE ITEM {side}
        </Typography>
        {item && (
          <Button size="small" startIcon={<SwapHorizIcon />} onClick={onChange}>Change</Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
      ) : !item ? (
        <CatalogItemPicker placeholder={`Search for Source Item ${side}…`} excludeIds={excludeIds} onPick={onPick} />
      ) : (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{
            width: 96, height: 96, flexShrink: 0, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.50',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {item.primary_image
              ? <Box component="img" src={assetUrl(item.primary_image.image_url)} alt="" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              : <LocalOfferOutlinedIcon sx={{ fontSize: 36, color: 'grey.400' }} />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{sourceTitle(item)}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>{item.make_brand}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 2, rowGap: 0.25 }}>
              <Typography variant="body2" color="text.secondary">Category:</Typography>
              <Typography variant="body2">{categoryPath || item.category_name}</Typography>
              <Typography variant="body2" color="text.secondary">Catalog ID:</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{item.catalog_code}</Typography>
              <Typography variant="body2" color="text.secondary">Status:</Typography>
              <Typography variant="body2">{STATUS_LABEL[item.status] || item.status}</Typography>
            </Box>
          </Box>
          <Box sx={{
            borderLeft: 1, borderColor: 'divider', pl: 2, display: 'grid',
            gridTemplateColumns: 'auto auto', columnGap: 2, rowGap: 1, alignSelf: 'center',
          }}>
            <Typography variant="body2" color="text.secondary">Model Numbers</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{sideIdentifiers(item, ['MANUFACTURER_MODEL']).length}</Typography>
            <Typography variant="body2" color="text.secondary">UPCs</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{sideIdentifiers(item, UPC_TYPES).length}</Typography>
            <Tooltip title="Inventory records (all stores) linked to this catalog item">
              <Typography variant="body2" color="text.secondary">Linked Inventory</Typography>
            </Tooltip>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.summary.linked_inventory}</Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

// ── One selectable value (radio card) ───────────────────────────────────
function ChoiceCard({ side, label, value, selected, multiline, onSelect }) {
  const color = SIDE_COLOR[side];
  return (
    <Box
      onClick={onSelect}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, mb: 1, cursor: 'pointer',
        border: 1, borderRadius: 1, borderColor: selected ? color : 'divider',
        bgcolor: selected ? SIDE_BG[side] : 'background.paper',
        '&:hover': { borderColor: color },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>{label}</Typography>
        <Typography variant="body2" sx={{
          ...(multiline
            ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
            : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
          color: value === 'Not set' || value === 'None' ? 'text.disabled' : 'text.primary',
        }}>
          {value}
        </Typography>
      </Box>
      <Radio size="small" checked={selected} sx={{ color, '&.Mui-checked': { color } }} />
    </Box>
  );
}

// ── "Select to keep" box (identifiers / aliases) ────────────────────────
function KeepBox({ title, help, entries, kept, onToggle }) {
  return (
    <Paper variant="outlined" sx={{ flex: 1, minWidth: 300, p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Tooltip title={help}><InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></Tooltip>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary">Select to keep</Typography>
      </Box>
      {entries.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>None on either item</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {entries.map(e => {
            const checked = kept.has(e.id);
            return (
              <Box key={e.id} onClick={() => onToggle(e.id)} sx={{
                display: 'flex', alignItems: 'center', gap: 0.5, pr: 1.25, cursor: 'pointer',
                border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: checked ? 'background.paper' : 'grey.50',
              }}>
                <Checkbox size="small" checked={checked} sx={{ p: 0.5, color: SIDE_COLOR[e.side], '&.Mui-checked': { color: SIDE_COLOR[e.side] } }} />
                <Box sx={{
                  px: 0.6, borderRadius: 0.5, fontSize: 11, fontWeight: 700,
                  bgcolor: SIDE_BG[e.side], color: SIDE_COLOR[e.side],
                }}>{e.side}</Box>
                <Typography variant="body2" sx={{
                  fontFamily: e.mono ? 'monospace' : undefined,
                  color: checked ? 'text.primary' : 'text.disabled',
                  textDecoration: checked ? 'none' : 'line-through',
                }}>
                  {e.prefix && <Typography component="span" variant="caption" color="text.secondary">{e.prefix} </Typography>}
                  {e.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        • Old titles become aliases.
      </Typography>
    </Paper>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Merge Catalog Items (doc §6) — combine two catalog items into one NEW item.
// The user chooses the surviving values and which identifiers / aliases to
// keep, edits the merged result, then Process: inventory and history from
// both sources are re-linked to the new item and both sources are retired
// as Merged (kept for reference). Route: /catalog/merge?a=<id>&b=<id>
// ─────────────────────────────────────────────────────────────────────────
export default function MergeCatalogItems() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const aId = parseInt(searchParams.get('a'), 10) || null;
  const bId = parseInt(searchParams.get('b'), 10) || null;

  const [items, setItems] = useState({ A: null, B: null });
  const [loadingSide, setLoadingSide] = useState({ A: false, B: false });
  const [categoryTree, setCategoryTree] = useState([]);

  const [choices, setChoices] = useState({});      // row key → 'A' | 'B'
  const [draft, setDraft] = useState(null);        // the Merged Item form
  const [keptIdentifiers, setKeptIdentifiers] = useState(new Set());
  const [keptAliases, setKeptAliases] = useState(new Set());
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    axios.get(`${API}/categories/tree`)
      .then(res => setCategoryTree(res.data || []))
      .catch(() => enqueueSnackbar('Failed to load categories', { variant: 'error' }));
  }, [enqueueSnackbar]);

  const categories = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const categoryById = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);

  // Load a source when its id (URL) changes. A Merged item can't be merged again.
  const loadSource = useCallback(async (side, id) => {
    if (!id) { setItems(prev => ({ ...prev, [side]: null })); return; }
    setLoadingSide(prev => ({ ...prev, [side]: true }));
    try {
      const res = await axios.get(`${API}/catalog-items/${id}`);
      if (res.data.status === 'MERGED') {
        enqueueSnackbar(`${res.data.catalog_code} has already been merged and can't be merged again`, { variant: 'warning' });
        setItems(prev => ({ ...prev, [side]: null }));
      } else {
        setItems(prev => ({ ...prev, [side]: res.data }));
      }
    } catch {
      enqueueSnackbar(`Failed to load Source Item ${side}`, { variant: 'error' });
      setItems(prev => ({ ...prev, [side]: null }));
    } finally {
      setLoadingSide(prev => ({ ...prev, [side]: false }));
    }
  }, [enqueueSnackbar]);
  useEffect(() => { loadSource('A', aId); }, [aId, loadSource]);
  useEffect(() => { loadSource('B', bId); }, [bId, loadSource]);

  const { A: itemA, B: itemB } = items;
  const ready = !!(itemA && itemB && itemA.id === aId && itemB.id === bId);

  // Start every merge from Source A's values with everything kept; reset
  // whenever either source changes.
  useEffect(() => {
    if (!ready) { setDraft(null); return; }
    const start = Object.fromEntries(CHOICE_ROWS.map(r => [r.key, 'A']));
    setChoices(start);
    setDraft({
      ...CHOICE_ROWS.reduce((acc, r) => ({ ...acc, ...valuesFromChoice(r.key, itemA) }), {}),
      category_id: itemA.category_id,
      status: 'ACTIVE',
    });
    const allIds = (list) => new Set(list.map(x => x.id));
    setKeptIdentifiers(allIds([...sideIdentifiers(itemA, [...MODEL_TYPES, ...UPC_TYPES]), ...sideIdentifiers(itemB, [...MODEL_TYPES, ...UPC_TYPES])]));
    setKeptAliases(allIds([...itemA.aliases, ...itemB.aliases].filter(a => a.is_active)));
    setErrors({});
  }, [ready, itemA, itemB]);

  const setSource = (side, id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set(side.toLowerCase(), id); else next.delete(side.toLowerCase());
    setSearchParams(next, { replace: true });
  };

  const choose = (key, side) => {
    setChoices(prev => ({ ...prev, [key]: side }));
    setDraft(prev => ({ ...prev, ...valuesFromChoice(key, items[side]) }));
  };

  const setField = (key) => (e) => {
    setDraft(prev => ({ ...prev, [key]: e.target.value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const toggle = (setter) => (id) => setter(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const keepEntries = (types) => [['A', itemA], ['B', itemB]].flatMap(([side, item]) =>
    sideIdentifiers(item, types).map(i => ({
      id: i.id, side, label: i.raw_value, mono: true,
      prefix: i.identifier_type === 'OTHER' ? 'Other:' : i.identifier_type === 'EAN' ? 'EAN:' : null,
    })));
  const aliasEntries = [['A', itemA], ['B', itemB]].flatMap(([side, item]) =>
    (item?.aliases || []).filter(a => a.is_active).map(a => ({ id: a.id, side, label: a.alias })));

  const validate = () => {
    const next = {};
    if (!draft.model_name.trim()) next.model_name = 'Model Name is required';
    if (!draft.make_brand.trim()) next.make_brand = 'Make / Brand is required';
    if (!draft.category_id) next.category_id = 'Category is required';
    if (draft.internal_notes.length > 1000) next.internal_notes = 'Max 1000 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleProcessClick = () => {
    if (!ready || !draft) return;
    if (validate()) setConfirmOpen(true);
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const res = await axios.post(`${API}/catalog-items/merge`, {
        source_a_id: itemA.id,
        source_b_id: itemB.id,
        values_from: choices.title,
        merged: {
          model_name: draft.model_name,
          make_brand: draft.make_brand,
          category_id: draft.category_id,
          status: draft.status,
          title_override: draft.title_override || null,
          internal_notes: draft.internal_notes || null,
          pricing: {
            suggested_cost: draft.suggested_cost,
            suggested_retail: draft.suggested_retail,
            retails_new_for: draft.retails_new_for,
          },
        },
        identifier_ids: [...keptIdentifiers],
        alias_ids: [...keptAliases],
        employee_id: user?.id,
      });
      enqueueSnackbar(`Merged into ${res.data.catalog_code} — ${res.data.title}`, { variant: 'success' });
      navigate(`/catalog/items/${res.data.id}`);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to merge catalog items', { variant: 'error' });
      setConfirmOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  const linkedTotal = ready ? itemA.summary.linked_inventory + itemB.summary.linked_inventory : 0;

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
        <Typography variant="body2" color="text.primary">Merge Catalog Items</Typography>
      </Breadcrumbs>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Merge Catalog Items</Typography>
          <Typography variant="body2" color="text.secondary">
            Combine two catalog items into one final item. Choose which values to keep and edit the merged result below.
          </Typography>
        </Box>
        <Button variant="outlined" size="large" onClick={() => navigate(CATALOG_MANAGER_PATH)} disabled={processing}>Cancel</Button>
        <Button variant="contained" size="large" onClick={handleProcessClick} disabled={!ready || !draft || processing}>
          Process
        </Button>
      </Box>

      {/* ── Source items ───────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {['A', 'B'].map(side => (
          <SourceCard
            key={side} side={side} item={items[side]} loading={loadingSide[side]}
            categoryPath={items[side] && categoryById[items[side].category_id]?.path}
            excludeIds={[aId, bId].filter(Boolean)}
            onPick={id => setSource(side, id)}
            onChange={() => setSource(side, null)}
          />
        ))}
      </Box>

      {!ready || !draft ? (
        <Alert severity="info">Choose both source items to set up the merged item.</Alert>
      ) : (
        <>
          {/* ── Merged item ──────────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: SIDE_BG.A, borderBottom: 1, borderColor: 'divider' }}>
              <DescriptionOutlinedIcon fontSize="small" sx={{ color: SIDE_COLOR.A }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: SIDE_COLOR.A, letterSpacing: 0.3 }}>MERGED ITEM</Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.4fr 1fr' }, gap: 3, p: 2 }}>
              {/* Choose values from A */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: SIDE_COLOR.A, mb: 1 }}>Choose Values from A</Typography>
                {CHOICE_ROWS.map(r => (
                  <ChoiceCard key={r.key} side="A" label={r.label} value={r.display(itemA)} multiline={r.multiline}
                    selected={choices[r.key] === 'A'} onSelect={() => choose(r.key, 'A')} />
                ))}
              </Box>

              {/* Merged result (editable) */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: SIDE_COLOR.A, mb: 1.5 }}>MERGED ITEM</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 2 }}>
                  <TextField size="small" label="Model Name" required value={draft.model_name} onChange={setField('model_name')}
                    error={!!errors.model_name} helperText={errors.model_name} inputProps={{ maxLength: 200 }} />
                  <TextField size="small" label="Make / Brand" required value={draft.make_brand} onChange={setField('make_brand')}
                    error={!!errors.make_brand} helperText={errors.make_brand} inputProps={{ maxLength: 100 }} />
                  <CategorySelect categories={categories} value={draft.category_id} error={errors.category_id}
                    onChange={v => { setDraft(prev => ({ ...prev, category_id: v })); setErrors(prev => ({ ...prev, category_id: undefined })); }} />
                  <FormControl size="small" required>
                    <InputLabel>Status</InputLabel>
                    <Select value={draft.status} label="Status" onChange={setField('status')}>
                      {STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField size="small" label="Title Override (optional)" value={draft.title_override} onChange={setField('title_override')}
                    placeholder="(leave blank to use the generated title)" InputLabelProps={{ shrink: true }}
                    inputProps={{ maxLength: 300 }} sx={{ gridColumn: '1 / -1' }} />
                  <Box sx={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                    {[['suggested_cost', 'Suggested Cost'], ['suggested_retail', 'Suggested Retail'], ['retails_new_for', 'Retails New For']].map(([k, label]) => (
                      <Box key={k} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, px: 1.25, py: 0.75 }}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: draft[k] === null ? 'text.disabled' : 'text.primary' }}>
                          {formatMoney(draft[k])}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <TextField size="small" label="Description (optional)" multiline minRows={3} maxRows={6}
                    value={draft.internal_notes} onChange={setField('internal_notes')}
                    error={!!errors.internal_notes}
                    helperText={errors.internal_notes || 'Saved as the item’s Internal Notes'}
                    sx={{ gridColumn: '1 / -1' }} />
                </Box>
                {draft.category_id !== itemA.category_id || draft.category_id !== itemB.category_id ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Linked inventory from both items will be classified under {categoryById[draft.category_id]?.path || 'this category'}.
                  </Typography>
                ) : null}
              </Box>

              {/* Choose values from B */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: SIDE_COLOR.B, mb: 1 }}>Choose Values from B</Typography>
                {CHOICE_ROWS.map(r => (
                  <ChoiceCard key={r.key} side="B" label={r.label} value={r.display(itemB)} multiline={r.multiline}
                    selected={choices[r.key] === 'B'} onSelect={() => choose(r.key, 'B')} />
                ))}
              </Box>
            </Box>
          </Paper>

          {/* ── Identifiers / aliases to keep ────────────────────────── */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <KeepBox title="Model Numbers" help="Manufacturer model numbers (and other identifiers) the merged item keeps"
              entries={keepEntries(MODEL_TYPES)} kept={keptIdentifiers} onToggle={toggle(setKeptIdentifiers)} />
            <KeepBox title="UPCs" help="UPC / EAN barcodes the merged item keeps"
              entries={keepEntries(UPC_TYPES)} kept={keptIdentifiers} onToggle={toggle(setKeptIdentifiers)} />
            <KeepBox title="Aliases / Search Terms" help="Alternate titles and search terms the merged item keeps"
              entries={aliasEntries} kept={keptAliases} onToggle={toggle(setKeptAliases)} />
          </Box>

          <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ border: 1, borderColor: 'info.light' }}>
            After processing, inventory and history from both source items will be linked to the merged item.
            The source items will be retired and kept for reference.
          </Alert>
        </>
      )}

      {/* ── Confirm ────────────────────────────────────────────────────── */}
      <Dialog open={confirmOpen} onClose={() => !processing && setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Merge these catalog items?</DialogTitle>
        <DialogContent>
          {ready && draft && (
            <>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                A new catalog item <strong>{draft.title_override || `${draft.make_brand} ${draft.model_name}`}</strong> will be created and:
              </Typography>
              <Box component="ul" sx={{ mt: 0, pl: 3 }}>
                <li><Typography variant="body2">
                  {linkedTotal} linked inventory record{linkedTotal === 1 ? '' : 's'} will move to it
                </Typography></li>
                <li><Typography variant="body2">
                  {itemA.catalog_code} and {itemB.catalog_code} will be retired as <Chip size="small" label="Merged" color="info" variant="outlined" /> and become read-only
                </Typography></li>
                <li><Typography variant="body2">
                  {keptIdentifiers.size} identifier{keptIdentifiers.size === 1 ? '' : 's'} and {keptAliases.size} alias{keptAliases.size === 1 ? '' : 'es'} will be kept; both old titles become aliases
                </Typography></li>
              </Box>
              <Typography variant="body2" color="text.secondary">This can’t be undone.</Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={processing}>Cancel</Button>
          <Button variant="contained" onClick={handleProcess} disabled={processing}
            startIcon={processing ? <CircularProgress size={16} color="inherit" /> : null}>
            Process Merge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
