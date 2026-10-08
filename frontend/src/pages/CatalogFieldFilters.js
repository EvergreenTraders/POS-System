import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import config from '../config';
import { CORE_FIELD_KEYS } from '../components/CatalogFieldInput';

const API = config.apiUrl;
const NUMERIC_TYPES = ['NUMBER', 'CURRENCY', 'MEASUREMENT'];
const COMMIT_DELAY_MS = 350; // typed filters search after a short pause

// ─────────────────────────────────────────────────────────────────────────
// Advanced Search field filters (Catalog Manager). One filter per Catalog
// field marked "Search" in Category Manager for the selected category:
//   TEXT → starts with (suggests existing values)   ENUM / MULTISELECT → any of
//   BOOLEAN → Yes / No                               NUMBER / DATE → from – to
// filters = { [field_definition_id]: { type, value | values | min / max } }
// ─────────────────────────────────────────────────────────────────────────

// Searchable Catalog fields of the category: [] until loaded.
export function useSearchableFields(categoryId) {
  const [state, setState] = useState({ categoryId: null, fields: [], loading: false });
  useEffect(() => {
    if (!categoryId) { setState({ categoryId: null, fields: [], loading: false }); return undefined; }
    let cancelled = false;
    setState(prev => ({ ...prev, loading: true }));
    axios.get(`${API}/categories/${categoryId}/effective-fields`)
      .then(res => {
        if (cancelled) return;
        const fields = (res.data?.fields || []).filter(f =>
          f.scope === 'CATALOG' && f.search && f.required_at !== 'NOT_USED' && !CORE_FIELD_KEYS.includes(f.field_key));
        setState({ categoryId, fields, loading: false });
      })
      .catch(() => { if (!cancelled) setState({ categoryId: null, fields: [], loading: false }); });
    return () => { cancelled = true; };
  }, [categoryId]);
  return state;
}

const isEmptyFilter = (f) => !f || (
  (f.value === undefined || f.value === null || f.value === '')
  && !(Array.isArray(f.values) && f.values.length)
  && (f.min === undefined || f.min === null || f.min === '')
  && (f.max === undefined || f.max === null || f.max === '')
);

export const activeFilterCount = (filters) => Object.values(filters || {}).filter(f => !isEmptyFilter(f)).length;

// The search API's field_filters JSON (empty filters left out).
export function serializeFieldFilters(filters) {
  const list = Object.entries(filters || {})
    .filter(([, f]) => !isEmptyFilter(f))
    .map(([id, { type, ...f }]) => ({ field_definition_id: Number(id), ...f }));
  return list.length ? JSON.stringify(list) : undefined;
}

// Local text state, committed after a short pause (and on Enter / blur).
function useDebouncedCommit(initial, commit) {
  const [text, setText] = useState(initial ?? '');
  const timer = useRef(null);
  useEffect(() => { setText(initial ?? ''); }, [initial]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const change = (v) => {
    setText(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(v), COMMIT_DELAY_MS);
  };
  const flush = () => { clearTimeout(timer.current); commit(text); };
  return [text, change, flush];
}

function TextFilter({ field, label, categoryId, status, filter, onChange }) {
  const [options, setOptions] = useState(null);
  // Committed as typed (the server trims), so the box never rewrites what's being typed.
  const [text, change, flush] = useDebouncedCommit(filter?.value, v => onChange(v.trim() ? { type: field.data_type, value: v } : null));
  const loadOptions = () => {
    if (options) return;
    axios.get(`${API}/catalog-items/field-values`, { params: { category_id: categoryId, field_definition_id: field.field_definition_id, status } })
      .then(res => setOptions(res.data || []))
      .catch(() => setOptions([]));
  };
  return (
    <Autocomplete
      freeSolo size="small" options={options || []} inputValue={text} onOpen={loadOptions}
      onInputChange={(_, v, reason) => { if (reason === 'input' || reason === 'clear') change(v); }}
      onChange={(_, v) => { change(v || ''); onChange(v ? { type: field.data_type, value: v } : null); }}
      renderInput={params => (
        <TextField {...params} label={label} placeholder="Starts with…"
          onKeyDown={e => { if (e.key === 'Enter') flush(); }} onBlur={flush} />
      )}
    />
  );
}

function RangeFilter({ field, label, filter, onChange }) {
  const isDate = field.data_type === 'DATE';
  // Both boxes share one pending commit, so From + To typed quickly both apply.
  const [range, setRange] = useState({ min: filter?.min ?? '', max: filter?.max ?? '' });
  const latest = useRef(range);
  const timer = useRef(null);
  useEffect(() => {
    const next = { min: filter?.min ?? '', max: filter?.max ?? '' };
    latest.current = next;
    setRange(next);
  }, [filter?.min, filter?.max]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const commitNow = () => {
    clearTimeout(timer.current);
    const { min, max } = latest.current;
    onChange(min === '' && max === '' ? null : { type: field.data_type, min, max });
  };
  const update = (key) => (value) => {
    latest.current = { ...latest.current, [key]: value };
    setRange(latest.current);
    clearTimeout(timer.current);
    timer.current = setTimeout(commitNow, COMMIT_DELAY_MS);
  };
  const { min, max } = range;
  const [changeMin, changeMax, flushMin, flushMax] = [update('min'), update('max'), commitNow, commitNow];
  const unit = field.unit_of_measure ? <InputAdornment position="end">{field.unit_of_measure}</InputAdornment> : undefined;
  const money = field.data_type === 'CURRENCY' ? <InputAdornment position="start">$</InputAdornment> : undefined;
  const props = { size: 'small', type: isDate ? 'date' : 'number', InputLabelProps: { shrink: true }, InputProps: { endAdornment: unit, startAdornment: money }, sx: { flex: 1 } };
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField {...props} label="From" value={min} onChange={e => changeMin(e.target.value)} onBlur={flushMin} />
        <TextField {...props} label="To" value={max} onChange={e => changeMax(e.target.value)} onBlur={flushMax} />
      </Box>
    </Box>
  );
}

function FieldFilter({ field, categoryId, status, filter, onChange }) {
  const label = field.label_override || field.field_label;
  const options = Array.isArray(field.allowed_values) ? field.allowed_values : [];

  if (field.data_type === 'BOOLEAN') {
    const value = filter ? (filter.value ? 'yes' : 'no') : '';
    return (
      <FormControl size="small" fullWidth>
        <InputLabel shrink>{label}</InputLabel>
        <Select label={label} notched displayEmpty value={value}
          onChange={e => onChange(e.target.value ? { type: field.data_type, value: e.target.value === 'yes' } : null)}>
          <MenuItem value="">Any</MenuItem>
          <MenuItem value="yes">Yes</MenuItem>
          <MenuItem value="no">No</MenuItem>
        </Select>
      </FormControl>
    );
  }
  if (NUMERIC_TYPES.includes(field.data_type) || field.data_type === 'DATE') {
    return <RangeFilter field={field} label={label} filter={filter} onChange={onChange} />;
  }
  if ((field.data_type === 'ENUM' || field.data_type === 'MULTISELECT') && options.length) {
    return (
      <Autocomplete multiple size="small" options={options} value={filter?.values || []}
        onChange={(_, v) => onChange(v.length ? { type: field.data_type, values: v } : null)}
        renderInput={params => <TextField {...params} label={label} placeholder={filter?.values?.length ? '' : 'Any of…'} />} />
    );
  }
  return <TextFilter field={field} label={label} categoryId={categoryId} status={status} filter={filter} onChange={onChange} />;
}

export default function CatalogFieldFilters({ categoryId, categoryPath, status, searchable, filters, onChange }) {
  if (!categoryId) {
    return (
      <Typography variant="body2" color="text.secondary">
        Choose a Category to filter by its fields (the ones marked “Search” in Category Manager).
      </Typography>
    );
  }
  if (searchable.loading || searchable.categoryId !== categoryId) {
    return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={14} /><Typography variant="body2" color="text.secondary">Loading fields…</Typography></Box>;
  }
  if (!searchable.fields.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {categoryPath || 'This category'} has no Catalog fields marked “Search” — set them in Category Manager → Fields.
      </Typography>
    );
  }
  const count = activeFilterCount(filters);
  const setFilter = (id) => (next) => {
    const copy = { ...filters };
    if (next) copy[id] = next; else delete copy[id];
    onChange(copy);
  };
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>Category Fields</Typography>
        <Typography variant="caption" color="text.secondary">fields marked “Search” in {categoryPath || 'this category'}</Typography>
        <Box sx={{ flex: 1 }} />
        {count > 0 && <Button size="small" onClick={() => onChange({})}>Clear {count} field filter{count === 1 ? '' : 's'}</Button>}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1.5, alignItems: 'end' }}>
        {searchable.fields.map(f => (
          <FieldFilter key={f.field_definition_id} field={f} categoryId={categoryId} status={status}
            filter={filters[f.field_definition_id]} onChange={setFilter(f.field_definition_id)} />
        ))}
      </Box>
    </Box>
  );
}
