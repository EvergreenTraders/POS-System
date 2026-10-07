import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormHelperText,
  IconButton,
  InputBase,
  Link,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import CatalogFieldInput, { catalogScopeFields } from '../components/CatalogFieldInput';
import { flattenCategoryTree } from '../utils/categoryTree';
import CameraCaptureDialog, { ImageFileInput } from '../components/CameraCaptureDialog';

const API = config.apiUrl;
const CATALOG_MANAGER_PATH = '/catalog';
const NOTES_MAX = 1000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// Make / Model are core Catalog Item columns, so same-keyed Field Library
// fields aren't shown again as category fields.

// Same normalization the server uses for identifier search keys.
const normalizeIdentifier = (raw) => String(raw || '').trim().toUpperCase().replace(/[\s\-_./]/g, '');

// ── Chip list with an inline input + Add button (model numbers, UPCs) ─────
function ChipListInput({ label, values, onChange, placeholder, validate, disabled }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const add = () => {
    const value = text.trim();
    if (!value) return;
    const problem = validate ? validate(value) : '';
    if (problem) { setError(problem); return; }
    if (values.some(v => normalizeIdentifier(v) === normalizeIdentifier(value))) {
      setError(`${value} is already added`);
      return;
    }
    onChange([...values, value]);
    setText('');
    setError('');
  };

  return (
    <Box>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.25 }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <Box sx={{
          flex: 1, minHeight: 40, maxHeight: 64, overflowY: 'auto',
          px: 1, py: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center',
          border: 1, borderColor: error ? 'error.main' : 'rgba(0,0,0,0.23)', borderRadius: 1, bgcolor: 'background.paper',
        }}>
          {values.map(v => (
            <Chip key={v} size="small" label={v} sx={{ fontFamily: 'monospace' }}
              onDelete={disabled ? undefined : () => onChange(values.filter(x => x !== v))} />
          ))}
          <InputBase
            value={text}
            disabled={disabled}
            placeholder={values.length ? '' : placeholder}
            onChange={e => { setText(e.target.value); if (error) setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            onBlur={() => { if (text.trim()) add(); }}
            sx={{ flex: 1, minWidth: 120, fontSize: 14 }}
          />
        </Box>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={add} disabled={disabled || !text.trim()} sx={{ height: 40 }}>
          Add
        </Button>
      </Box>
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  );
}

// Compact section card — the page is laid out to fit one screen.
function Section({ title, subtitle, children, sx }) {
  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1.25, ...sx }}>
      {(title || subtitle) && (
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
          {title && <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{title}</Typography>}
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
      )}
      {children}
    </Paper>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// New Catalog Item (/catalog/items/new) — Catalog Manager's "New Catalog
// Item" (and the editor's Duplicate). Creates the Catalog Item with its
// identifiers, Catalog-scope field values and reference images, then opens
// it in the Catalog Item Editor for pricing, aliases, status and the rest.
// Inventory-scope details (serial number, condition, accessories) belong to
// the physical item at Intake, not to the reusable Catalog Item.
// ─────────────────────────────────────────────────────────────────────────
export default function NewCatalogItem() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const duplicate = location.state?.duplicate || null;

  const [categoryTree, setCategoryTree] = useState([]);
  const [categoryId, setCategoryId] = useState(duplicate?.draft?.category_id || '');
  const [makeBrand, setMakeBrand] = useState(duplicate?.draft?.make_brand || '');
  const [modelName, setModelName] = useState(duplicate?.draft?.model_name || '');
  const [modelNumbers, setModelNumbers] = useState([]);
  const [upcs, setUpcs] = useState([]);
  const [notes, setNotes] = useState(duplicate?.draft?.internal_notes || '');

  const [fields, setFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldValues, setFieldValues] = useState(() => Object.fromEntries(
    (duplicate?.fieldValues || []).map(f => [f.field_definition_id, f.value])
  ));
  // Latest values for the category-change effect (which only re-runs on category).
  const fieldValuesRef = useRef(fieldValues);
  fieldValuesRef.current = fieldValues;

  const [photos, setPhotos] = useState([]); // [{ id, file, url, source }]
  const [dragOver, setDragOver] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(null); // 'DRAFT' | 'ACTIVE' while saving

  useEffect(() => {
    axios.get(`${API}/categories/tree`)
      .then(res => setCategoryTree(res.data || []))
      .catch(() => enqueueSnackbar('Failed to load categories', { variant: 'error' }));
  }, [enqueueSnackbar]);

  // Release preview object URLs when leaving the page.
  useEffect(() => () => photosRef.current.forEach(p => URL.revokeObjectURL(p.url)), []);

  const categories = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const categoryById = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
  const categoryPath = categoryById[categoryId]?.path || '';

  // Catalog-scope fields for the category (division + parent inheritance).
  // Values for fields the new category doesn't have are dropped.
  useEffect(() => {
    if (!categoryId) { setFields([]); return undefined; }
    let cancelled = false;
    setFieldsLoading(true);
    axios.get(`${API}/categories/${categoryId}/effective-fields`)
      .then(res => {
        if (cancelled) return;
        const catalogFields = catalogScopeFields(res.data);
        setFields(catalogFields);
        const next = {};
        let dropped = 0;
        const ids = new Set(catalogFields.map(f => f.field_definition_id));
        Object.entries(fieldValuesRef.current).forEach(([id, v]) => {
          if (ids.has(Number(id))) next[id] = v;
          else if (v !== null && v !== '' && !(Array.isArray(v) && !v.length)) dropped += 1;
        });
        catalogFields.forEach(f => {
          if (next[f.field_definition_id] === undefined && f.default_value) next[f.field_definition_id] = f.default_value;
        });
        setFieldValues(next);
        if (dropped) enqueueSnackbar(`${dropped} field value(s) cleared — they don't apply to this category`, { variant: 'info' });
      })
      .catch(() => { if (!cancelled) { setFields([]); enqueueSnackbar('Failed to load category fields', { variant: 'error' }); } })
      .finally(() => { if (!cancelled) setFieldsLoading(false); });
    return () => { cancelled = true; };
  }, [categoryId, enqueueSnackbar]);

  const categoryMenuItems = useMemo(() => {
    const items = [];
    let lastDivision = null;
    categories.forEach(c => {
      if (c.division_id !== lastDivision) {
        items.push(<ListSubheader key={`div-${c.division_id}`}>{c.division_name}</ListSubheader>);
        lastDivision = c.division_id;
      }
      items.push(
        <MenuItem key={c.id} value={c.id} disabled={!c.is_active} sx={{ pl: 2 + c.depth * 2 }}>
          {c.name}{!c.is_active ? ' (inactive)' : ''}
        </MenuItem>
      );
    });
    return items;
  }, [categories]);

  // ── Photos (shared ImageFileInput / CameraCaptureDialog + drag & drop) ──
  const addPhotoFiles = (files, source) => {
    const accepted = [];
    let rejected = 0;
    files.forEach(file => {
      if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) { rejected += 1; return; }
      accepted.push({ id: `${Date.now()}-${Math.random()}`, file, url: URL.createObjectURL(file), source });
    });
    if (rejected) enqueueSnackbar(`${rejected} file(s) skipped — JPG, PNG, WebP or GIF up to 10 MB`, { variant: 'warning' });
    if (accepted.length) {
      setPhotos(prev => [...prev, ...accepted]);
      setErrors(prev => ({ ...prev, photos: undefined }));
    }
  };

  const removePhoto = (id) => setPhotos(prev => {
    const target = prev.find(p => p.id === id);
    if (target) URL.revokeObjectURL(target.url);
    return prev.filter(p => p.id !== id);
  });

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addPhotoFiles(Array.from(e.dataTransfer.files || []), 'UPLOAD');
  };

  // ── Save ────────────────────────────────────────────────────────────────
  const validate = () => {
    const next = {};
    if (!categoryId) next.category = 'Category is required';
    if (!makeBrand.trim()) next.makeBrand = 'Make / Brand is required';
    if (!modelName.trim()) next.modelName = 'Model Name is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (status) => {
    if (!validate()) {
      enqueueSnackbar('Please fill in the required fields', { variant: 'warning' });
      return;
    }
    setSaving(status);
    try {
      const res = await axios.post(`${API}/catalog-items`, {
        category_id: Number(categoryId),
        make_brand: makeBrand,
        model_name: modelName,
        status,
        internal_notes: notes.trim() || null,
        identifiers: [
          ...modelNumbers.map(raw => ({ identifier_type: 'MANUFACTURER_MODEL', raw_value: raw })),
          ...upcs.map(raw => ({ identifier_type: normalizeIdentifier(raw).length === 13 ? 'EAN' : 'UPC', raw_value: raw })),
        ],
        field_values: Object.entries(fieldValues)
          .filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length))
          .map(([id, value]) => ({ field_definition_id: Number(id), value })),
        employee_id: user?.id,
      });
      const created = res.data;

      // Reference images: the first photo is the primary.
      let failed = 0;
      for (let i = 0; i < photos.length; i += 1) {
        try {
          const form = new FormData();
          form.append('image', photos[i].file);
          form.append('source', photos[i].source);
          form.append('make_primary', i === 0 ? 'true' : 'false');
          if (user?.id) form.append('employee_id', user.id);
          await axios.post(`${API}/catalog-items/${created.id}/images`, form);
        } catch (err) {
          failed += 1;
        }
      }

      enqueueSnackbar(`Catalog item ${created.friendly_code} (${created.catalog_code}) created`, { variant: 'success' });
      if (failed) enqueueSnackbar(`${failed} photo(s) couldn't be uploaded — add them in the editor`, { variant: 'warning' });
      navigate(`/catalog/items/${created.id}`, { replace: true });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to create catalog item', { variant: 'error' });
      setSaving(null);
    }
  };

  // One-screen layout: header + scroll-free body + action bar fill the
  // viewport below the 64px navbar. The body only scrolls if the window is
  // too small for everything (nothing is ever cut off).
  const requiredMark = <Box component="span" sx={{ color: 'error.main' }}>*</Box>;

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', bgcolor: 'grey.50', overflow: 'hidden' }}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <Box sx={{ px: 3, pt: 1.5, pb: 1, display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap', flexShrink: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ '& .MuiBreadcrumbs-li': { lineHeight: 1.2 } }}>
            <Link component="button" variant="caption" underline="hover" onClick={() => navigate(CATALOG_MANAGER_PATH)}>
              Catalog Manager
            </Link>
            <Typography variant="caption" color="text.primary">New Catalog Item</Typography>
          </Breadcrumbs>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }}>Create New Catalog Item</Typography>
          <Typography variant="caption" color="text.secondary">
            Pricing, aliases and status can be refined in the Catalog Item Editor after it's created.
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Required fields are marked with {requiredMark}
        </Typography>
      </Box>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 3, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {duplicate && (
          <Alert severity="info" sx={{ py: 0 }}>
            Duplicated from {duplicate.sourceCode}. Identifiers, aliases and images were not copied.
          </Alert>
        )}

        {/* Category */}
        <Section>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Category {requiredMark}</Typography>
            <FormControl size="small" error={!!errors.category} sx={{ width: 380, maxWidth: '100%' }}>
              <Select value={categoryId} displayEmpty
                onChange={e => { setCategoryId(e.target.value); setErrors(prev => ({ ...prev, category: undefined })); }}
                renderValue={v => (v ? categoryById[v]?.path || '' : <Typography color="text.disabled" variant="body2">Select a category…</Typography>)}
                MenuProps={{ PaperProps: { sx: { maxHeight: 420 } } }}>
                {categoryMenuItems}
              </Select>
              {errors.category && <FormHelperText>{errors.category}</FormHelperText>}
            </FormControl>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 220 }}>
              <WarningAmberIcon sx={{ color: 'warning.main' }} fontSize="small" />
              <Typography variant="caption" color="text.secondary">Changing category may reset some entered fields.</Typography>
            </Box>
            <Tooltip title="External product lookup is coming in a later phase. Import can pre-fill fields; you can still edit everything.">
              <span>
                <Button variant="outlined" size="small" startIcon={<CloudUploadOutlinedIcon />} disabled>
                  Import from API
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Section>

        {/* Basic Details */}
        <Section title="Basic Details">
          {/* Fixed, content-sized widths (wrap on narrow screens) */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, rowGap: 1.25, mb: 1.25, '& > *': { maxWidth: '100%' } }}>
            <Box sx={{ width: 240 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.25 }}>Make / Brand {requiredMark}</Typography>
              <TextField fullWidth size="small" value={makeBrand} error={!!errors.makeBrand} helperText={errors.makeBrand}
                inputProps={{ maxLength: 100 }}
                onChange={e => { setMakeBrand(e.target.value); setErrors(prev => ({ ...prev, makeBrand: undefined })); }} />
            </Box>
            <Box sx={{ width: 300 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.25 }}>Model Name {requiredMark}</Typography>
              <TextField fullWidth size="small" value={modelName} error={!!errors.modelName} helperText={errors.modelName}
                placeholder="Common, widely recognized model name"
                inputProps={{ maxLength: 200 }}
                onChange={e => { setModelName(e.target.value); setErrors(prev => ({ ...prev, modelName: undefined })); }} />
            </Box>
            <Box sx={{ width: 360 }}>
              <ChipListInput label="Manufacturer Model Numbers" values={modelNumbers} onChange={setModelNumbers}
                placeholder="e.g. CFI-1215A" />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, rowGap: 1.25, '& > *': { maxWidth: '100%' } }}>
            <Box sx={{ width: 360 }}>
              <ChipListInput label="UPC / EAN" values={upcs} onChange={setUpcs} placeholder="Scan or type a barcode"
                validate={v => (/^\d+$/.test(normalizeIdentifier(v)) ? '' : 'UPC / EAN must contain digits only')} />
            </Box>
            <Box sx={{ width: 560 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                <Typography variant="caption">Notes (optional)</Typography>
                <Typography variant="caption" color="text.secondary">{notes.length} / {NOTES_MAX}</Typography>
              </Box>
              <TextField fullWidth size="small" multiline maxRows={2} value={notes}
                placeholder="Add any notes about this item…" inputProps={{ maxLength: NOTES_MAX }}
                onChange={e => setNotes(e.target.value)} />
            </Box>
          </Box>
        </Section>

        {/* Category-Specific Fields + Reference Images, side by side */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, gap: 1.25, alignItems: 'stretch' }}>
          <Section title="Category-Specific Fields"
            subtitle={categoryPath ? `Specific to ${categoryPath}` : 'Select a category to see its fields.'}>
            {!categoryId ? null : fieldsLoading ? (
              <Box sx={{ py: 1, display: 'flex', justifyContent: 'center' }}><CircularProgress size={20} /></Box>
            ) : fields.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No catalog-level fields for this category. Item-specific details (serial number, condition, accessories) are captured at Intake.
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 240px))', gap: 1.5 }}>
                {fields.map(f => (
                  <CatalogFieldInput key={f.field_definition_id} field={f} value={fieldValues[f.field_definition_id]}
                    onChange={v => setFieldValues(prev => ({ ...prev, [f.field_definition_id]: v }))} />
                ))}
              </Box>
            )}
          </Section>

          <Section title="Reference Images" subtitle="The first image is the primary.">
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'stretch' }}>
              <Box
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                sx={{
                  flex: '1 1 180px', minHeight: 84, px: 1.5, py: 1, cursor: 'pointer', borderRadius: 1,
                  border: 2, borderStyle: 'dashed', borderColor: dragOver ? 'primary.main' : 'divider',
                  bgcolor: dragOver ? 'action.hover' : 'background.paper',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <PhotoCameraOutlinedIcon color="action" fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Add images</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">Click or drag & drop · JPG, PNG, WebP, GIF ≤ 10 MB</Typography>
                <Button size="small" startIcon={<PhotoCameraIcon />} sx={{ py: 0 }}
                  onClick={e => { e.stopPropagation(); setCameraOpen(true); }}>
                  Take Photo
                </Button>
              </Box>
              {photos.map((p, i) => (
                <Box key={p.id} sx={{ position: 'relative', width: 84, height: 84, borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider', bgcolor: 'grey.100' }}>
                  <Box component="img" src={p.url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  {i === 0 && (
                    <Chip size="small" label="Primary" color="primary" sx={{ position: 'absolute', bottom: 2, left: 2, height: 18, fontSize: 10 }} />
                  )}
                  <IconButton size="small" onClick={() => removePhoto(p.id)}
                    sx={{ position: 'absolute', top: 1, right: 1, p: 0.25, bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'white' } }}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
            <ImageFileInput ref={fileInputRef} multiple readAsDataUrl={false} accept={IMAGE_TYPES.join(',')}
              onSelect={results => addPhotoFiles(results.map(r => r.file), 'UPLOAD')} />
            <CameraCaptureDialog
              open={cameraOpen}
              title="Take Reference Photo"
              fileNamePrefix="catalog-reference"
              onClose={() => setCameraOpen(false)}
              onCapture={({ file }) => { addPhotoFiles([file], 'CAMERA'); setCameraOpen(false); }}
            />
          </Section>
        </Box>
      </Box>

      {/* ── Action bar ───────────────────────────────────────────────── */}
      <Paper square elevation={3} sx={{ px: 3, py: 1, display: 'flex', justifyContent: 'flex-end', gap: 1.5, flexShrink: 0 }}>
        <Button variant="outlined" color="inherit" onClick={() => navigate(CATALOG_MANAGER_PATH)} disabled={!!saving}>
          Cancel
        </Button>
        <Tooltip title="Saved but not selectable in Intake search until activated">
          <span>
            <Button variant="outlined" onClick={() => handleSave('DRAFT')} disabled={!!saving}
              startIcon={saving === 'DRAFT' ? <CircularProgress size={16} /> : null}>
              Save as Draft
            </Button>
          </span>
        </Tooltip>
        <Button variant="contained" onClick={() => handleSave('ACTIVE')} disabled={!!saving}
          startIcon={saving === 'ACTIVE' ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ minWidth: 200 }}>
          Create Catalog Item
        </Button>
      </Paper>
    </Box>
  );
}
