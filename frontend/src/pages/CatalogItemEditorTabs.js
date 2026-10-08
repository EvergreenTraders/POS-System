import React, { useState, useRef, Fragment } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import CameraCaptureDialog, { ImageFileInput } from '../components/CameraCaptureDialog';
import CatalogFieldInput, { displayFieldValue, isBlankFieldValue } from '../components/CatalogFieldInput';
import config from '../config';

const API = config.apiUrl;
const assetUrl = (url) => (url && url.startsWith('/uploads') ? `${API.replace(/\/api$/, '')}${url}` : url);

export const IDENTIFIER_TYPES = [
  { value: 'UPC', label: 'UPC' },
  { value: 'EAN', label: 'EAN' },
  { value: 'MANUFACTURER_MODEL', label: 'Manufacturer Model #' },
  { value: 'OTHER', label: 'Other' },
];
const IDENTIFIER_TYPE_LABEL = Object.fromEntries(IDENTIFIER_TYPES.map(t => [t.value, t.label]));
const IDENTIFIER_SOURCE_LABEL = { MANUAL: 'Manual', MANUFACTURER_API: 'Manufacturer API', EXTERNAL_PROVIDER: 'External provider' };
export const BARCODE_TYPES = ['UPC', 'EAN'];
const IMAGE_SOURCE_LABELS = { UPLOAD: 'Uploaded', CAMERA: 'Camera photo', MANUFACTURER_API: 'Manufacturer', EXTERNAL_PROVIDER: 'External provider' };
const PRICING_KEYS = ['suggested_cost', 'suggested_retail', 'retails_new_for'];

// Same normalization as the server (harmless formatting removed).
export const normalizeIdentifier = (v) => String(v ?? '').trim().toUpperCase().replace(/[\s\-_./]/g, '');
export const identifierKey = (i) => `${i.identifier_type}:${normalizeIdentifier(i.raw_value)}`;

const formatMoney = (v) => (v === null || v === undefined || v === ''
  ? '—'
  : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const formatDateTime = (v) => (v ? `${new Date(v).toLocaleDateString()} ${new Date(v).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : '—');

function TabSection({ title, subtitle, action, children, sx }) {
  return (
    <Box sx={{ mb: 3, ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        <Box sx={{ flex: 1 }} />
        {action}
      </Box>
      {children}
    </Box>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Identifiers (doc §5) — unlimited UPC / EAN / model numbers, raw + normalized.
// Saved identifiers are never deleted (lineage): they're deactivated, and can
// be reactivated. Not-yet-saved ones can simply be removed.
// ═════════════════════════════════════════════════════════════════════════
export function IdentifiersTab({ draft, savedKeys, readOnly, error, onChange, aliasesSection }) {
  const [type, setType] = useState('UPC');
  const [value, setValue] = useState('');
  const [addError, setAddError] = useState('');

  const add = () => {
    const raw = value.trim();
    if (!raw) return;
    const normalized = normalizeIdentifier(raw);
    if (!normalized) { setAddError('Enter a value'); return; }
    if (BARCODE_TYPES.includes(type) && !/^\d+$/.test(normalized)) { setAddError(`${type} must contain digits only`); return; }
    const entry = { identifier_type: type, raw_value: raw, is_active: true, source: 'MANUAL', provider: null };
    const existing = draft.identifiers.find(i => identifierKey(i) === identifierKey(entry));
    if (existing?.is_active) { setAddError(`${raw} is already on this item`); return; }
    onChange(existing
      ? draft.identifiers.map(i => (i === existing ? { ...i, is_active: true } : i))
      : [...draft.identifiers, entry]);
    setValue('');
    setAddError('');
  };

  const setActive = (target, active) => onChange(draft.identifiers.map(i => (i === target ? { ...i, is_active: active } : i)));
  const remove = (target) => onChange(draft.identifiers.filter(i => i !== target));

  const ordered = [...draft.identifiers].sort((a, b) => (b.is_active - a.is_active)
    || IDENTIFIER_TYPES.findIndex(t => t.value === a.identifier_type) - IDENTIFIER_TYPES.findIndex(t => t.value === b.identifier_type));
  const activeCount = draft.identifiers.filter(i => i.is_active).length;

  return (
    <>
      <TabSection title={`Identifiers (${activeCount} active)`}
        subtitle="UPC / EAN barcodes and manufacturer model numbers. Searches match the normalized value.">
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        {!readOnly && (
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField select size="small" label="Type" value={type} onChange={e => { setType(e.target.value); setAddError(''); }} sx={{ width: 200 }}>
              {IDENTIFIER_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Value" value={value} placeholder={BARCODE_TYPES.includes(type) ? 'Scan or enter barcode' : 'e.g. CFI-1215A'}
              onChange={e => { setValue(e.target.value); setAddError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              error={!!addError}
              helperText={addError || (value.trim() ? `Normalized: ${normalizeIdentifier(value) || '—'}` : 'Press Enter to add')}
              sx={{ flex: 1, minWidth: 220 }} inputProps={{ maxLength: 100, style: { fontFamily: 'monospace' } }} />
            <Button variant="outlined" startIcon={<AddIcon />} onClick={add} disabled={!value.trim()} sx={{ height: 40 }}>Add</Button>
          </Box>
        )}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Normalized</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {ordered.map(i => {
              const saved = savedKeys.has(identifierKey(i));
              return (
                <TableRow key={identifierKey(i)} sx={{ opacity: i.is_active ? 1 : 0.6 }}>
                  <TableCell>{IDENTIFIER_TYPE_LABEL[i.identifier_type] || i.identifier_type}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{i.raw_value}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{normalizeIdentifier(i.raw_value)}</TableCell>
                  <TableCell>
                    {IDENTIFIER_SOURCE_LABEL[i.source] || i.source || 'Manual'}{i.provider ? ` · ${i.provider}` : ''}
                  </TableCell>
                  <TableCell>
                    {!saved
                      ? <Chip size="small" label="New" color="info" variant="outlined" />
                      : <Chip size="small" label={i.is_active ? 'Active' : 'Inactive'} color={i.is_active ? 'success' : 'default'} variant="outlined" />}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {!readOnly && (!saved
                      ? <Button size="small" color="inherit" onClick={() => remove(i)}>Remove</Button>
                      : i.is_active
                        ? <Tooltip title="Kept for lineage and history; no longer matched by search"><Button size="small" color="inherit" onClick={() => setActive(i, false)}>Deactivate</Button></Tooltip>
                        : <Button size="small" onClick={() => setActive(i, true)}>Reactivate</Button>)}
                  </TableCell>
                </TableRow>
              );
            })}
            {ordered.length === 0 && (
              <TableRow><TableCell colSpan={6} sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>No identifiers yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TabSection>
      {aliasesSection}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Fields & Attributes — Catalog-scope values (doc §3 "Category fields").
// Inventory-scope fields are listed for reference: they're captured per item.
// ═════════════════════════════════════════════════════════════════════════
export function FieldsTab({ categoryPath, catalogFields, inventoryFields, loading, values, errors, readOnly, onChange }) {
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={24} /></Box>;
  return (
    <>
      <TabSection title="Catalog Fields"
        subtitle={`Shared by every inventory record of this item. Fields come from ${categoryPath || 'the category'}; blank values can be filled in at Intake / Processing.`}>
        {catalogFields.length === 0 ? (
          <Typography variant="body2" color="text.secondary">This category has no Catalog fields. Configure them in Category Manager → Fields.</Typography>
        ) : (
          <Grid container spacing={2}>
            {catalogFields.map(f => {
              const id = f.field_definition_id;
              const notes = [
                f.required_for_catalog ? 'Required for Active items' : null,
                f.origin_category_name ? `from ${f.origin_category_name}` : null,
              ].filter(Boolean).join(' · ');
              return (
                <Grid item xs={12} sm={6} key={id}>
                  <CatalogFieldInput field={f} value={values[id] ?? (f.data_type === 'MULTISELECT' ? [] : '')}
                    onChange={v => onChange(id, v)} disabled={readOnly} error={errors[id]} required={f.required_for_catalog} />
                  {notes && <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>{notes}</Typography>}
                </Grid>
              );
            })}
          </Grid>
        )}
      </TabSection>
      <Divider sx={{ mb: 2 }} />
      <TabSection title="Inventory Fields" subtitle="Captured on each inventory record at Intake / Processing — not stored on the catalog item.">
        {inventoryFields.length === 0 ? (
          <Typography variant="body2" color="text.secondary">None.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {inventoryFields.map(f => (
              <Tooltip key={f.field_definition_id} title={[f.required_at && f.required_at !== 'OPTIONAL' ? `Required at ${f.required_at.toLowerCase()}` : 'Optional', f.help_text].filter(Boolean).join(' — ')}>
                <Chip size="small" variant="outlined" label={f.label_override || f.field_label} />
              </Tooltip>
            ))}
          </Box>
        )}
      </TabSection>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Pricing (doc §7) — nullable Catalog pricing defaults, the Category Buy /
// Pawn / Trade % they feed, and the audited pricing history.
// ═════════════════════════════════════════════════════════════════════════
export function PricingTab({ moneyField, draft, categoryPricing, categoryPath, history, historyLoading }) {
  const cost = draft.suggested_cost === '' ? null : Number(draft.suggested_cost);
  const pctRows = [
    ['suggested_buy_pct', 'Suggested Buy'],
    ['suggested_pawn_pct', 'Suggested Pawn'],
    ['suggested_trade_pct', 'Suggested Trade'],
  ];
  const pricingChanges = (history || []).filter(h => PRICING_KEYS.some(k => h.changed_fields?.[k]));
  return (
    <>
      <TabSection title="Suggested Pricing (Company Wide)">
        <Alert severity="info" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ mb: 2 }}>
          Suggestions only — staff can override the actual value during intake or sale. Blank means “use historical intelligence”, never zero.
        </Alert>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>{moneyField('suggested_cost', 'Suggested Cost (Your Cost)', 'Basis for suggested Buy / Pawn / Trade.', 'Company-wide managed intake target.')}</Grid>
          <Grid item xs={12} md={4}>{moneyField('suggested_retail', 'Suggested Retail (Used)', 'Blank = derive from history / market.', 'Company-wide managed retail target.')}</Grid>
          <Grid item xs={12} md={4}>{moneyField('retails_new_for', 'Retails New For (Optional)', 'What it retails new for (if known).', 'Optional reference value.')}</Grid>
        </Grid>
      </TabSection>

      <TabSection title="Suggested Buy / Pawn / Trade" subtitle={`Category percentages from ${categoryPath || 'the category'} applied to Suggested Cost.`}>
        {!categoryPricing ? (
          <Typography variant="body2" color="text.secondary">Loading category pricing…</Typography>
        ) : (
          <Table size="small" sx={{ maxWidth: 640 }}>
            <TableHead>
              <TableRow><TableCell /><TableCell>Category %</TableCell><TableCell>Suggested Amount</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {pctRows.map(([key, label]) => {
                const eff = categoryPricing.effective?.[key] || {};
                const pct = eff.value === null || eff.value === undefined ? null : Number(eff.value);
                const amount = pct !== null && cost !== null && Number.isFinite(cost) ? (cost * pct) / 100 : null;
                return (
                  <TableRow key={key}>
                    <TableCell>{label}</TableCell>
                    <TableCell>
                      {pct === null ? <Typography variant="body2" color="text.disabled">Not set</Typography> : `${pct}%`}
                      {eff.source_category_name && <Typography variant="caption" color="text.secondary"> · from {eff.source_category_name}</Typography>}
                    </TableCell>
                    <TableCell>
                      {amount !== null ? <strong>{formatMoney(amount)}</strong> : (
                        <Typography variant="body2" color="text.secondary">
                          {cost === null ? 'Historical intelligence (no Suggested Cost)' : 'Set the Category % in Category Manager → Pricing'}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TabSection>

      <TabSection title="Pricing History">
        {historyLoading ? <CircularProgress size={20} /> : pricingChanges.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No pricing changes recorded.</Typography>
        ) : (
          <Table size="small">
            <TableHead><TableRow><TableCell>When</TableCell><TableCell>Who</TableCell><TableCell>Change</TableCell></TableRow></TableHead>
            <TableBody>
              {pricingChanges.map(h => (
                <TableRow key={h.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(h.performed_at)}</TableCell>
                  <TableCell>{h.performed_by_name || '—'}</TableCell>
                  <TableCell>
                    {PRICING_KEYS.filter(k => h.changed_fields[k]).map(k => (
                      <Typography key={k} variant="body2">
                        <strong>{{ suggested_cost: 'Suggested Cost', suggested_retail: 'Suggested Retail', retails_new_for: 'Retails New For' }[k]}:</strong>{' '}
                        {h.action === 'CREATE' ? '' : `${formatMoney(h.changed_fields[k].from)} → `}{formatMoney(h.changed_fields[k].to)}
                        {h.from_catalog_code && <Typography component="span" variant="caption" color="text.secondary"> (on {h.from_catalog_code})</Typography>}
                      </Typography>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabSection>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Descriptions — the title and how the category's description settings
// describe this item (live preview from the current, unsaved values).
// ═════════════════════════════════════════════════════════════════════════
export function DescriptionsTab({ draft, categoryPath, categoryName, catalogFields, descriptionSettings, onEditCategory }) {
  const title = draft.title_override.trim() || draft.generated_title || [draft.make_brand, draft.model_name].filter(Boolean).join(' ');
  const valueOf = (f) => displayFieldValue(f.data_type, draft.field_values[f.field_definition_id], f.unit_of_measure);
  const shortFields = catalogFields.filter(f => f.short_description && valueOf(f));
  const longFields = catalogFields.filter(f => f.long_description && valueOf(f));
  const s = descriptionSettings || {};
  const shortText = [
    title,
    ...shortFields.map(valueOf),
    s.category_in_short_description && categoryName ? categoryName : null,
  ].filter(Boolean).join(' · ');
  const longLines = [
    title,
    ...longFields.map(f => `${f.label_override || f.field_label}: ${valueOf(f)}`),
    s.category_in_long_description && categoryPath ? `Category: ${categoryPath}` : null,
  ].filter(Boolean);
  const flagged = (flag) => catalogFields.filter(f => f[flag]).map(f => f.label_override || f.field_label);

  return (
    <>
      <TabSection title="Title">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 3, rowGap: 1 }}>
          <Typography variant="body2" color="text.secondary">Shown as</Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>{title || '—'}</Typography>
          <Typography variant="body2" color="text.secondary">Generated</Typography>
          <Typography variant="body2">{draft.generated_title || '—'}</Typography>
          <Typography variant="body2" color="text.secondary">Override</Typography>
          <Typography variant="body2">{draft.title_override.trim() || <Box component="span" sx={{ color: 'text.disabled' }}>None — edit on the General tab</Box>}</Typography>
        </Box>
      </TabSection>

      <TabSection title="Description Preview" subtitle="Built from this item’s values and the category’s description settings (updates as you edit)."
        action={<Button size="small" onClick={onEditCategory}>Edit category description settings</Button>}>
        {!descriptionSettings ? <CircularProgress size={20} /> : (
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <Typography variant="caption" color="text.secondary">Short Description</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                <Typography variant="body2">{shortText || '—'}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Typography variant="caption" color="text.secondary">Long Description</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                {longLines.map((l, i) => <Typography key={i} variant="body2" sx={{ fontWeight: i === 0 ? 600 : 400 }}>{l}</Typography>)}
              </Paper>
            </Grid>
          </Grid>
        )}
        {catalogFields.some(f => (f.short_description || f.long_description) && !valueOf(f)) && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Blank fields are left out: {catalogFields.filter(f => (f.short_description || f.long_description) && !valueOf(f)).map(f => f.label_override || f.field_label).join(', ')}
          </Typography>
        )}
      </TabSection>

      <TabSection title="Search & Web">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 3, rowGap: 1 }}>
          <Typography variant="body2" color="text.secondary">Searchable fields</Typography>
          <Typography variant="body2">{flagged('search').join(', ') || '—'}</Typography>
          <Typography variant="body2" color="text.secondary">Web filters</Typography>
          <Typography variant="body2">{flagged('web_filter').join(', ') || '—'}</Typography>
          <Typography variant="body2" color="text.secondary">Search terms</Typography>
          <Typography variant="body2">{draft.aliases.join(', ') || '—'} <Typography component="span" variant="caption" color="text.secondary">(Identifiers tab)</Typography></Typography>
        </Box>
      </TabSection>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Images (doc §2/§12) — primary + additional reference images with their
// source metadata. Changes are saved immediately and recorded in History.
// ═════════════════════════════════════════════════════════════════════════
export function ImagesTab({ images, readOnly, busy, onUpload, onSetPrimary, onRemove }) {
  const [menu, setMenu] = useState(null);           // { anchorEl, primary }
  const [cameraFor, setCameraFor] = useState(null); // null | { primary }
  const [confirmRemove, setConfirmRemove] = useState(null);
  const fileRef = useRef(null);
  const pendingPrimary = useRef(true);

  const openPicker = (primary) => (e) => setMenu({ anchorEl: e.currentTarget, primary });
  const pickFile = () => { pendingPrimary.current = menu.primary; setMenu(null); fileRef.current?.click(); };
  const openCamera = () => { setCameraFor({ primary: menu.primary }); setMenu(null); };

  return (
    <TabSection title={`Reference Images (${images.length})`}
      subtitle="Clean product images for this catalog item. Intake photos stay on each inventory record."
      action={!readOnly && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={openPicker(false)} disabled={busy}>Add Additional Image</Button>
          <Button size="small" variant="contained" onClick={openPicker(true)} disabled={busy}>
            {images.some(i => i.is_primary) ? 'Replace Primary Image' : 'Add Primary Image'}
          </Button>
        </Box>
      )}>
      {busy && <Box sx={{ mb: 1 }}><CircularProgress size={18} /></Box>}
      {images.length === 0 ? (
        <Box sx={{ py: 5, textAlign: 'center', border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 1 }}>
          <ImageNotSupportedOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
          <Typography variant="body2" color="text.secondary">No reference images yet.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {images.map(img => (
            <Grid item xs={12} sm={6} md={4} key={img.id}>
              <Paper variant="outlined" sx={{ p: 1, borderColor: img.is_primary ? 'primary.main' : 'divider', borderWidth: img.is_primary ? 2 : 1 }}>
                <Box sx={{ height: 160, bgcolor: 'grey.50', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  <Box component="img" src={assetUrl(img.image_url)} alt="" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  {img.is_primary && <Chip size="small" color="primary" icon={<StarIcon />} label="Primary" sx={{ position: 'absolute', top: 6, left: 6 }} />}
                </Box>
                <Box sx={{ mt: 1, px: 0.5 }}>
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    {IMAGE_SOURCE_LABELS[img.source] || img.source}{img.provider ? ` · ${img.provider}` : ''}
                  </Typography>
                  {img.source_url && (
                    <Link variant="caption" href={img.source_url} target="_blank" rel="noreferrer" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {img.source_url}
                    </Link>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {formatDateTime(img.created_at)}{img.uploaded_by_name ? ` · ${img.uploaded_by_name}` : ''}
                  </Typography>
                </Box>
                {!readOnly && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
                    {!img.is_primary && (
                      <Tooltip title="Make primary"><span>
                        <IconButton size="small" onClick={() => onSetPrimary(img)} disabled={busy}><StarBorderIcon fontSize="small" /></IconButton>
                      </span></Tooltip>
                    )}
                    <Tooltip title="Remove from this item"><span>
                      <IconButton size="small" onClick={() => setConfirmRemove(img)} disabled={busy}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </span></Tooltip>
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Menu anchorEl={menu?.anchorEl} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={pickFile}><FileUploadIcon fontSize="small" sx={{ mr: 1 }} /> Upload Image</MenuItem>
        <MenuItem onClick={openCamera}><PhotoCameraIcon fontSize="small" sx={{ mr: 1 }} /> Take Photo</MenuItem>
      </Menu>
      <ImageFileInput ref={fileRef} accept="image/jpeg,image/png,image/webp,image/gif" readAsDataUrl={false}
        onSelect={([picked]) => onUpload(picked.file, 'UPLOAD', pendingPrimary.current)} />
      <CameraCaptureDialog
        open={!!cameraFor}
        title={cameraFor?.primary ? 'Take Primary Reference Photo' : 'Take Additional Reference Photo'}
        fileNamePrefix="catalog-reference"
        onClose={() => setCameraFor(null)}
        onCapture={({ file }) => { const primary = cameraFor?.primary; setCameraFor(null); onUpload(file, 'CAMERA', primary); }}
      />
      <Dialog open={!!confirmRemove} onClose={() => setConfirmRemove(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove this image?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            It will no longer be shown for this catalog item{confirmRemove?.is_primary ? ', which will have no primary image until you choose another' : ''}. The removal is recorded in History.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemove(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => { onRemove(confirmRemove); setConfirmRemove(null); }}>Remove</Button>
        </DialogActions>
      </Dialog>
    </TabSection>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// History & Status — status changes, merge / split lineage, linked
// inventory and the full audit trail (including inherited history).
// ═════════════════════════════════════════════════════════════════════════
export function HistoryStatusTab({
  item, statusChip, dirty, readOnly, onStatus, onOpenItem, onMerge, onSplit,
  history, historyLoading, renderChanges, actionLabels,
}) {
  const status = item.status;
  const actions = [
    status !== 'ACTIVE' && { status: 'ACTIVE', label: 'Activate', color: 'success' },
    status !== 'INACTIVE' && { status: 'INACTIVE', label: 'Deactivate', color: 'inherit' },
    status !== 'DRAFT' && { status: 'DRAFT', label: 'Move to Draft', color: 'inherit' },
  ].filter(Boolean);
  const lineageGroups = [
    ['into', 'MERGE', 'Merged into'], ['into', 'SPLIT', 'Split into'],
    ['from', 'MERGE', 'Merged from'], ['from', 'SPLIT', 'Split from'],
  ].map(([dir, type, label]) => ({ label, rows: (item.lineage?.[dir] || []).filter(l => l.relationship_type === type) }))
    .filter(g => g.rows.length);

  return (
    <>
      <TabSection title="Status">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
          <Chip label={statusChip.label} color={statusChip.color} variant="outlined" />
          {!readOnly && actions.map(a => (
            <Tooltip key={a.status} title={dirty ? 'Save or discard your changes first' : ''}>
              <span><Button size="small" variant="outlined" color={a.color} disabled={dirty} onClick={() => onStatus(a.status)}>{a.label}</Button></span>
            </Tooltip>
          ))}
          {!readOnly && (
            <>
              <Divider orientation="vertical" flexItem />
              <Button size="small" onClick={onMerge}>Merge with Another Item…</Button>
              <Button size="small" onClick={onSplit}>Split into Two Items…</Button>
            </>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          Active items appear in Intake search. Inactive keeps the item and all history but hides it from normal Intake search. Merged items are read-only.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 3, rowGap: 0.5, mt: 2 }}>
          <Typography variant="body2" color="text.secondary">Linked inventory</Typography>
          <Typography variant="body2">{item.summary.linked_inventory} record(s), all stores</Typography>
          <Typography variant="body2" color="text.secondary">Created</Typography>
          <Typography variant="body2">{formatDateTime(item.created_at)}{item.created_by_name ? ` by ${item.created_by_name}` : ''}</Typography>
          <Typography variant="body2" color="text.secondary">Last updated</Typography>
          <Typography variant="body2">{formatDateTime(item.updated_at)}{item.updated_by_name ? ` by ${item.updated_by_name}` : ''}</Typography>
          {lineageGroups.map(g => (
            <Fragment key={g.label}>
              <Typography variant="body2" color="text.secondary">{g.label}</Typography>
              <Typography variant="body2">
                {g.rows.map((l, i) => (
                  <Fragment key={l.id}>
                    {i > 0 && ', '}
                    <Link component="button" variant="body2" onClick={() => onOpenItem(l.id)} sx={{ verticalAlign: 'baseline' }}>{l.catalog_code} — {l.title}</Link>
                  </Fragment>
                ))}
                {' '}<Typography component="span" variant="caption" color="text.secondary">({formatDateTime(g.rows[0].performed_at)})</Typography>
              </Typography>
            </Fragment>
          ))}
        </Box>
      </TabSection>

      <TabSection title="History" subtitle="Every change, newest first — including history of items this one was merged or split from.">
        {historyLoading ? <CircularProgress size={20} /> : !history?.length ? (
          <Typography variant="body2" color="text.secondary">No history recorded.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow><TableCell>When</TableCell><TableCell>Who</TableCell><TableCell>Action</TableCell><TableCell>Changes</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {history.map(h => (
                <TableRow key={h.id} sx={{ verticalAlign: 'top' }}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(h.performed_at)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{h.performed_by_name || '—'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {actionLabels[h.action] || h.action}
                    {h.from_catalog_code && (
                      <Tooltip title="Recorded on a source item this item was merged or split from">
                        <Chip size="small" variant="outlined" label={`on ${h.from_catalog_code}`}
                          onClick={() => onOpenItem(h.from_catalog_item_id)} sx={{ ml: 1, fontFamily: 'monospace', height: 20 }} />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>{renderChanges(h)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabSection>
    </>
  );
}

// Helper for the editor: blank values are dropped so "cleared" equals "never set".
export function setFieldValue(values, id, value) {
  const next = { ...values };
  if (isBlankFieldValue(value)) delete next[id]; else next[id] = value;
  return next;
}

