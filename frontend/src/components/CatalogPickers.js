import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  Autocomplete,
  Box,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import config from '../config';

const API = config.apiUrl;
const SEARCH_DEBOUNCE_MS = 250;
const STATUS_LABEL = { ACTIVE: 'Active', DRAFT: 'Draft', INACTIVE: 'Inactive', MERGED: 'Merged' };
const itemTitle = (item) => item.title || item.model_name;

// Server-side catalog item search box (Merge / Split source pickers).
// Merged items are retired and never offered; excludeIds hides others.
export function CatalogItemPicker({ placeholder, excludeIds = [], onPick }) {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const excludeKey = excludeIds.join(',');

  useEffect(() => {
    const q = input.trim();
    if (!q) { setOptions([]); return undefined; }
    const mySeq = ++seq.current;
    const excluded = excludeKey ? excludeKey.split(',').map(Number) : [];
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/catalog-items/search`, { params: { q, status: 'ALL', page_size: 15 } });
        if (mySeq !== seq.current) return;
        setOptions((res.data.results || []).filter(r => r.status !== 'MERGED' && !excluded.includes(r.id)));
      } catch {
        if (mySeq === seq.current) setOptions([]);
      } finally {
        if (mySeq === seq.current) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, excludeKey]);

  return (
    <Autocomplete
      size="small"
      options={options}
      loading={loading}
      filterOptions={x => x}
      getOptionLabel={o => itemTitle(o)}
      onInputChange={(_, v) => setInput(v)}
      onChange={(_, v) => v && onPick(v.id)}
      noOptionsText={input.trim() ? 'No matching catalog items' : 'Type a title, model number, UPC or CAT- code'}
      renderOption={(props, o) => (
        <li {...props} key={o.id}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{itemTitle(o)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {o.make_brand || '—'} · {o.category_name} · <Box component="span" sx={{ fontFamily: 'monospace' }}>{o.catalog_code}</Box>
              {' · '}{STATUS_LABEL[o.status] || o.status}
            </Typography>
          </Box>
        </li>
      )}
      renderInput={params => (
        <TextField {...params} autoFocus placeholder={placeholder}
          InputProps={{ ...params.InputProps, endAdornment: <>{loading && <CircularProgress size={16} />}{params.InputProps.endAdornment}</> }} />
      )}
    />
  );
}

// Category dropdown grouped by division, indented by depth, showing the full
// path when closed. categories = flattenCategoryTree(tree). Inactive
// categories are listed but can't be chosen.
export function CategorySelect({ categories, value, onChange, error, label = 'Category', required = true }) {
  const byId = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
  const items = useMemo(() => {
    const out = [];
    let lastDivision = null;
    categories.forEach(c => {
      if (c.division_id !== lastDivision) {
        out.push(<ListSubheader key={`div-${c.division_id}`}>{c.division_name}</ListSubheader>);
        lastDivision = c.division_id;
      }
      out.push(
        <MenuItem key={c.id} value={c.id} disabled={!c.is_active} sx={{ pl: 2 + c.depth * 2 }}>
          {c.name}{!c.is_active ? ' (inactive)' : ''}
        </MenuItem>
      );
    });
    return out;
  }, [categories]);

  return (
    <FormControl size="small" required={required} error={!!error} fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select value={value || ''} label={label} onChange={e => onChange(e.target.value)}
        renderValue={v => byId[v]?.path || ''} MenuProps={{ PaperProps: { sx: { maxHeight: 400 } } }}>
        {items}
      </Select>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
}
