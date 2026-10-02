import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';
import config from '../config';

const API = config.apiUrl;

const SOURCE_LABELS = {
  STORE: 'This Store',
  COMPANY: 'Evergreen All Stores',
  NETWORK: 'Broader Network',
};
const VALUATION_METHODS = [
  { value: 'AUTOMATIC', label: 'Automatic (Recommended)', help: 'Uses the Catalog Item’s Suggested Cost when it is set; otherwise historical intelligence.' },
];
const RETAIL_LOGIC = [
  { value: 'CATALOG_THEN_INTELLIGENCE', label: 'Catalog Suggested Retail, then intelligence', help: 'Uses the Catalog Item’s Suggested Retail when it is set; otherwise historical/market intelligence.' },
];
const PCT_FIELDS = [
  { key: 'suggested_buy_pct',   label: 'Suggested Buy %',   help: 'Suggested buy price as a % of the Catalog Item’s Suggested Cost.' },
  { key: 'suggested_pawn_pct',  label: 'Suggested Pawn %',  help: 'Suggested pawn advance as a % of the Catalog Item’s Suggested Cost.' },
  { key: 'suggested_trade_pct', label: 'Suggested Trade %', help: 'Suggested trade value as a % of the Catalog Item’s Suggested Cost.' },
];
const EXAMPLE_COST = 250;

// Own settings → editable draft (percentages as strings; '' / null = inherit).
const draftFromOwn = (own) => ({
  suggested_buy_pct: own.suggested_buy_pct ?? '',
  suggested_pawn_pct: own.suggested_pawn_pct ?? '',
  suggested_trade_pct: own.suggested_trade_pct ?? '',
  source_priority: own.source_priority || null,
  valuation_method: own.valuation_method || null,
  retail_logic: own.retail_logic || null,
});

function InfoTip({ title }) {
  return (
    <Tooltip title={title}>
      <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', ml: 0.5, verticalAlign: 'middle' }} />
    </Tooltip>
  );
}

// "Inherited from Consoles" / "Default" / "Overrides Consoles (60%)" helper.
function inheritanceNote(ownValue, parentEffective, format = v => v) {
  const hasOwn = ownValue !== null && ownValue !== '' && ownValue !== undefined;
  if (hasOwn) {
    return parentEffective?.value !== null && parentEffective?.value !== undefined && parentEffective?.source_category_name
      ? `Overrides ${parentEffective.source_category_name} (${format(parentEffective.value)})`
      : 'Set on this category';
  }
  if (parentEffective?.source_category_name) return `Inherited from ${parentEffective.source_category_name}`;
  return parentEffective?.value !== null && parentEffective?.value !== undefined ? 'System default' : 'Not configured';
}

// ─────────────────────────────────────────────────────────────────────────
// Category Manager → Pricing tab. Each setting either belongs to this
// category or is inherited from the nearest ancestor that sets it; clearing
// a value (or "Use inherited") goes back to inheriting.
// ─────────────────────────────────────────────────────────────────────────
export default function CategoryPricingTab({ category }) {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState(null);       // { own, effective }
  const [inherited, setInherited] = useState(null); // effective values if this category set nothing
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  // What this category would inherit = the parent's effective settings.
  const load = useCallback(async () => {
    setData(null);
    try {
      const [mine, parent] = await Promise.all([
        axios.get(`${API}/categories/${category.id}/pricing`),
        category.parent_category_id
          ? axios.get(`${API}/categories/${category.parent_category_id}/pricing`)
          : Promise.resolve(null),
      ]);
      setData(mine.data);
      setInherited(parent ? parent.data.effective : null);
      setDraft(draftFromOwn(mine.data.own));
    } catch (err) {
      enqueueSnackbar('Failed to load pricing settings', { variant: 'error' });
    }
  }, [category.id, category.parent_category_id, enqueueSnackbar]);

  useEffect(() => { load(); }, [load]);

  if (!data || !draft) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} /></Box>;
  }

  // Fallback shown when this category doesn't set a value itself.
  const fallback = (field) => (inherited ? inherited[field] : { value: defaultFor(field), source_category_name: null });
  function defaultFor(field) {
    if (field === 'source_priority') return ['STORE', 'COMPANY', 'NETWORK'];
    if (field === 'valuation_method') return 'AUTOMATIC';
    if (field === 'retail_logic') return 'CATALOG_THEN_INTELLIGENCE';
    return null;
  }
  const resolved = (field) => {
    const own = draft[field];
    return own !== null && own !== '' && own !== undefined ? own : fallback(field)?.value;
  };

  const own = draftFromOwn(data.own);
  const dirty = JSON.stringify(draft) !== JSON.stringify(own);
  const priority = resolved('source_priority') || ['STORE', 'COMPANY', 'NETWORK'];

  const setField = (field, value) => setDraft(prev => ({ ...prev, [field]: value }));
  const moveSource = (index, delta) => {
    const next = [...priority];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setField('source_priority', next);
  };

  const pctError = (v) => (v === '' || v === null ? '' : (!Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > 200 ? '0 – 200' : ''));
  const hasErrors = PCT_FIELDS.some(f => pctError(draft[f.key]));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/categories/${category.id}/pricing`, {
        suggested_buy_pct: draft.suggested_buy_pct === '' ? null : draft.suggested_buy_pct,
        suggested_pawn_pct: draft.suggested_pawn_pct === '' ? null : draft.suggested_pawn_pct,
        suggested_trade_pct: draft.suggested_trade_pct === '' ? null : draft.suggested_trade_pct,
        source_priority: draft.source_priority,
        valuation_method: draft.valuation_method,
        retail_logic: draft.retail_logic,
        employee_id: user?.id,
      });
      setData(res.data);
      setDraft(draftFromOwn(res.data.own));
      enqueueSnackbar('Pricing defaults saved', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save pricing defaults', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const pctExample = (field) => {
    const pct = resolved(field);
    return pct === null || pct === undefined || pct === '' ? null : (EXAMPLE_COST * Number(pct)) / 100;
  };
  const example = PCT_FIELDS.map(f => ({ label: f.label.replace('Suggested ', '').replace(' %', ''), amount: pctExample(f.key), pct: resolved(f.key) }))
    .filter(e => e.amount !== null);

  // Clearing a setting returns it to inheriting ('' for % inputs, null otherwise).
  const inheritLink = (field) => (draft[field] !== null && draft[field] !== '' ? (
    <Link component="button" variant="caption" sx={{ ml: 1 }}
      onClick={() => setField(field, PCT_FIELDS.some(f => f.key === field) ? '' : null)}>
      Use inherited
    </Link>
  ) : null);

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>Pricing Defaults for {category.name}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Configure default pricing behaviour and intelligence settings for this category. Settings left blank are inherited from the parent category.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2, alignItems: 'start' }}>
        {/* ── Price Intelligence ───────────────────────────────────────── */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                Price Intelligence <InfoTip title="Store, Company and Network are separate data scopes — they are never blended into one average." />
              </Typography>

              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Pricing Source Priority <InfoTip title="The first source is shown by default; the others stay available on demand." />
              </Typography>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', mb: 0.5 }}>
                {priority.map((source, i) => (
                  <Box key={source} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.75,
                    bgcolor: i === 0 ? 'action.selected' : 'background.paper',
                    borderTop: i ? 1 : 0, borderColor: 'divider',
                  }}>
                    <Typography variant="body2" sx={{ width: 16, color: 'text.secondary' }}>{i + 1}</Typography>
                    <Typography variant="body2" sx={{ flex: 1 }}>{SOURCE_LABELS[source]}</Typography>
                    <IconButton size="small" disabled={i === 0} onClick={() => moveSource(i, -1)}><ArrowUpwardIcon fontSize="inherit" /></IconButton>
                    <IconButton size="small" disabled={i === priority.length - 1} onClick={() => moveSource(i, 1)}><ArrowDownwardIcon fontSize="inherit" /></IconButton>
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {inheritanceNote(draft.source_priority, fallback('source_priority'), v => SOURCE_LABELS[v?.[0]] || '')}
                {inheritLink('source_priority')}
              </Typography>

              <Typography variant="body2" sx={{ mt: 2, mb: 0.5 }}>
                Default Valuation Method <InfoTip title={VALUATION_METHODS[0].help} />
              </Typography>
              <TextField select fullWidth size="small" value={resolved('valuation_method') || 'AUTOMATIC'}
                onChange={e => setField('valuation_method', e.target.value)}
                helperText={inheritanceNote(draft.valuation_method, fallback('valuation_method'))}>
                {VALUATION_METHODS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
            </Box>

            {/* Sample Price Intelligence — no summary data exists yet, so nothing is shown rather than invented. */}
            <Box sx={{ borderLeft: { md: 1 }, borderColor: { md: 'divider' }, pl: { md: 3 } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Sample Price Intelligence <InfoTip title="Median buy and retail prices per source for an item in this category." />
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto', columnGap: 3, rowGap: 1, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Source</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Buy Price</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Retail Price</Typography>
                {priority.map(source => (
                  <React.Fragment key={source}>
                    <Typography variant="body2">{SOURCE_LABELS[source]}</Typography>
                    <Typography variant="body2" color="text.disabled">—</Typography>
                    <Typography variant="body2" color="text.disabled">—</Typography>
                  </React.Fragment>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                Price intelligence needs Store / Company / Network summary data, which isn't collected yet.
              </Typography>
              <Box sx={{ textAlign: 'center' }}>
                <Tooltip title="Available once price intelligence is implemented">
                  <span><Button size="small" variant="outlined" startIcon={<RefreshIcon />} disabled>Refresh Intelligence</Button></span>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* ── Suggested Values ─────────────────────────────────────────── */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
            Suggested Values <InfoTip title="Applied to a Catalog Item’s Suggested Cost to suggest Buy / Pawn / Trade. Staff can always override at intake." />
          </Typography>
          {PCT_FIELDS.map(f => {
            const fb = fallback(f.key);
            return (
              <Box key={f.key} sx={{ mb: 1.5 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>{f.label} <InfoTip title={f.help} /></Typography>
                <TextField fullWidth size="small" type="number" value={draft[f.key]}
                  placeholder={fb?.value !== null && fb?.value !== undefined ? Number(fb.value).toFixed(2) : 'Not set'}
                  onChange={e => setField(f.key, e.target.value)}
                  error={!!pctError(draft[f.key])}
                  helperText={pctError(draft[f.key]) || (
                    <>{inheritanceNote(draft[f.key], fb, v => `${Number(v).toFixed(2)}%`)}{inheritLink(f.key)}</>
                  )}
                  inputProps={{ min: 0, max: 200, step: 0.01 }}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
              </Box>
            );
          })}

          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Suggested Retail Logic <InfoTip title={RETAIL_LOGIC[0].help} />
          </Typography>
          <TextField select fullWidth size="small" value={resolved('retail_logic') || 'CATALOG_THEN_INTELLIGENCE'}
            onChange={e => setField('retail_logic', e.target.value)}
            helperText={inheritanceNote(draft.retail_logic, fallback('retail_logic'))}>
            {RETAIL_LOGIC.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </TextField>

          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" color="text.secondary">
            {example.length
              ? <>Example — Suggested Cost ${EXAMPLE_COST.toFixed(2)}: {example.map(e => `${e.label} $${e.amount.toFixed(2)} (${Number(e.pct).toFixed(2)}%)`).join(' · ')}</>
              : 'Set Buy / Pawn / Trade % to calculate suggestions from a Catalog Item’s Suggested Cost.'}
          </Typography>
        </Paper>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2 }}>
        <Button variant="outlined" color="inherit" disabled={!dirty || saving} onClick={() => setDraft(own)}>
          Cancel Changes
        </Button>
        <Button variant="contained" disabled={!dirty || saving || hasErrors} onClick={handleSave}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}>
          Save Changes
        </Button>
      </Box>
    </Box>
  );
}
