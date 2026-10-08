import React from 'react';
import {
  Autocomplete,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';

// Field keys already covered by the Catalog Item's own Make / Model Name inputs.
export const CORE_FIELD_KEYS = ['brand', 'model'];

// Catalog-scope fields from a GET /categories/:id/effective-fields response.
export const catalogScopeFields = (effective) => (effective?.fields || []).filter(f =>
  f.scope === 'CATALOG' && f.required_at !== 'NOT_USED' && !CORE_FIELD_KEYS.includes(f.field_key));

export const isBlankFieldValue = (v) =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

// Stored values are TEXT: multi-select as a JSON array string, booleans as
// 'true' / 'false'. Converts a stored value into what CatalogFieldInput edits.
export function fromStoredFieldValue(dataType, raw) {
  if (raw === null || raw === undefined) return dataType === 'MULTISELECT' ? [] : '';
  if (dataType === 'MULTISELECT') {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [String(raw)];
    } catch (e) {
      return [String(raw)];
    }
  }
  return raw;
}

// Readable form of a stored or edited value ("1 TB", "Black, White", "Yes").
export function displayFieldValue(dataType, value, unit) {
  const v = typeof value === 'string' && dataType === 'MULTISELECT' ? fromStoredFieldValue(dataType, value) : value;
  if (isBlankFieldValue(v)) return '';
  if (Array.isArray(v)) return v.join(', ');
  if (dataType === 'BOOLEAN') return v === true || v === 'true' ? 'Yes' : 'No';
  if (dataType === 'CURRENCY') return `$${v}`;
  return unit ? `${v} ${unit}` : String(v);
}

// ── One Catalog-scope category field, rendered by its Field Library type ──
export default function CatalogFieldInput({ field, value, onChange, label: labelOverride, disabled, error, required }) {
  const label = labelOverride ?? (field.label_override || field.field_label || field.field_key);
  const helper = error || field.help_text || undefined;
  const options = Array.isArray(field.allowed_values) ? field.allowed_values : [];

  switch (field.data_type) {
    case 'NUMBER':
    case 'CURRENCY':
    case 'MEASUREMENT':
      return (
        <TextField fullWidth size="small" type="number" label={label} value={value ?? ''} helperText={helper}
          disabled={disabled} error={!!error} required={required}
          onChange={e => onChange(e.target.value)}
          InputProps={{
            startAdornment: field.data_type === 'CURRENCY' ? <InputAdornment position="start">$</InputAdornment> : undefined,
            endAdornment: field.unit_of_measure ? <InputAdornment position="end">{field.unit_of_measure}</InputAdornment> : undefined,
          }} />
      );
    case 'ENUM':
      if (field.allow_free_type) {
        return (
          <Autocomplete freeSolo size="small" options={options} value={value || null} disabled={disabled}
            onChange={(_, v) => onChange(v || '')}
            onInputChange={(_, v, reason) => { if (reason === 'input') onChange(v); }}
            renderInput={params => <TextField {...params} label={label} helperText={helper} error={!!error} required={required} />} />
        );
      }
      return (
        <FormControl fullWidth size="small" disabled={disabled} error={!!error} required={required}>
          <InputLabel>{label}</InputLabel>
          <Select label={label} value={value ?? ''} onChange={e => onChange(e.target.value)}>
            <MenuItem value=""><em>Not specified</em></MenuItem>
            {options.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
          {helper && <FormHelperText>{helper}</FormHelperText>}
        </FormControl>
      );
    case 'MULTISELECT':
      return (
        <Autocomplete multiple freeSolo={!!field.allow_free_type} size="small" options={options} disabled={disabled}
          value={Array.isArray(value) ? value : []}
          onChange={(_, v) => onChange(v)}
          renderInput={params => <TextField {...params} label={label} helperText={helper} error={!!error} required={required} />} />
      );
    case 'BOOLEAN':
      return (
        <FormControlLabel sx={{ height: 40 }} label={label} disabled={disabled}
          control={<Checkbox checked={value === true || value === 'true'}
            onChange={e => onChange(e.target.checked ? true : null)} />} />
      );
    case 'DATE':
      return (
        <TextField fullWidth size="small" type="date" label={label} value={value ?? ''} helperText={helper}
          disabled={disabled} error={!!error} required={required}
          InputLabelProps={{ shrink: true }} onChange={e => onChange(e.target.value)} />
      );
    default:
      return (
        <TextField fullWidth size="small" label={label} value={value ?? ''} helperText={helper}
          disabled={disabled} error={!!error} required={required}
          onChange={e => onChange(e.target.value)} />
      );
  }
}
