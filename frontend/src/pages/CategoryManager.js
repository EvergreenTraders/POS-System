import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useSnackbar } from 'notistack';
import config from '../config';

const API = config.apiUrl;

const DATA_TYPES   = ['TEXT', 'NUMBER', 'ENUM', 'BOOLEAN', 'DATE'];
const ACTIONS      = ['ADD', 'OVERRIDE', 'SUPPRESS'];
const SCOPES       = ['INVENTORY', 'CATALOG', 'TRANSACTION'];
const ACTION_COLOR = { ADD: 'success', OVERRIDE: 'warning', SUPPRESS: 'error' };

const BLANK_CAT_FORM  = { name: '', code: '', description: '' };
const BLANK_FIELD_FORM = { field_key: '', label: '', data_type: 'TEXT', allowed_values: '', unit_of_measure: '' };
const BLANK_RULE_FORM  = {
  action: 'ADD', scope: 'INVENTORY',
  required_for_inventory: false, display_order: 0,
  default_value: '', label_override: '', help_text: '',
};

// ── Recursive tree node ────────────────────────────────────────────────
function CategoryNode({ node, depth, selected, onSelect, onAddChild }) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected  = selected?.id === node.id;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex', alignItems: 'center',
          pl: depth * 2 + 1, pr: 1, py: 0.4,
          cursor: 'pointer', borderRadius: 1,
          bgcolor: isSelected ? 'primary.main' : 'transparent',
          color: isSelected ? 'white' : 'inherit',
          '&:hover': { bgcolor: isSelected ? 'primary.dark' : 'action.hover' },
        }}
        onClick={() => onSelect(node)}
      >
        <IconButton
          size="small"
          sx={{ p: 0.2, mr: 0.5, color: 'inherit', visibility: hasChildren ? 'visible' : 'hidden' }}
          onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        >
          {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>
        {open ? <FolderOpenIcon fontSize="small" sx={{ mr: 0.8, opacity: 0.7 }} />
               : <FolderIcon fontSize="small" sx={{ mr: 0.8, opacity: 0.7 }} />}
        <Typography variant="body2" sx={{ flex: 1, fontWeight: isSelected ? 600 : 400 }}>
          {node.name}
        </Typography>
        <Tooltip title="Add subcategory">
          <IconButton
            size="small"
            sx={{ p: 0.3, color: 'inherit', opacity: 0.6, '&:hover': { opacity: 1 } }}
            onClick={e => { e.stopPropagation(); onAddChild(node); }}
          >
            <AddIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {open && hasChildren && (
        <Box>
          {node.children.map(child => (
            <CategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
              onAddChild={onAddChild}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

// ── Main component ─────────────────────────────────────────────────────
function CategoryManager() {
  const { enqueueSnackbar } = useSnackbar();

  const [tree, setTree]               = useState([]);   // [{id, code, name, categories:[...]}]
  const [divisions, setDivisions]       = useState([]);
  const [allFieldDefs, setAllFieldDefs] = useState([]);
  const [selected, setSelected]       = useState(null); // selected category
  const [rules, setRules]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState(0);

  // Edit category in right panel
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Add Category dialog
  const [catDialogOpen, setCatDialogOpen]   = useState(false);
  const [catDialogError, setCatDialogError] = useState('');
  const [catDialogParent, setCatDialogParent] = useState(null); // {division_id, parent_id|null}
  const [catForm, setCatForm]               = useState(BLANK_CAT_FORM);
  const [catSaving, setCatSaving]           = useState(false);

  // Add Field Rule dialog
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleMode, setRuleMode]             = useState('existing'); // 'existing' | 'new'
  const [ruleFieldId, setRuleFieldId]       = useState('');
  const [ruleFieldForm, setRuleFieldForm]   = useState(BLANK_FIELD_FORM);
  const [ruleForm, setRuleForm]             = useState(BLANK_RULE_FORM);
  const [ruleSaving, setRuleSaving]         = useState(false);

  // Descriptions tab — descConfig is the last-saved server state, descDraft is
  // the locally-edited copy; nothing is persisted until Save Changes.
  const [descConfig, setDescConfig]   = useState(null);
  const [descDraft, setDescDraft]     = useState(null);
  const [descSaving, setDescSaving]   = useState(false);
  const [addTokenAnchor, setAddTokenAnchor] = useState(null);
  const [pillMenu, setPillMenu]       = useState(null); // { anchorEl, index }

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [divsRes, treeRes, fieldsRes] = await Promise.all([
        axios.get(`${API}/divisions`),
        axios.get(`${API}/categories/tree`),
        axios.get(`${API}/field-definitions`),
      ]);

      setDivisions(divsRes.data);
      setAllFieldDefs(fieldsRes.data);

      // Merge: always show all active divisions, attach categories from tree if any
      const treeByDivId = Object.fromEntries(treeRes.data.map(d => [d.id, d.categories || []]));
      setTree(divsRes.data
        .filter(d => d.is_active)
        .map(d => ({ ...d, categories: treeByDivId[d.id] || [] }))
      );
    } catch (err) {
      enqueueSnackbar('Failed to load category data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = async (cat) => {
    setSelected(cat);
    setEditMode(false);
    setEditForm({ name: cat.name, code: cat.code || '', description: cat.description || '' });
    setTab(0);
    try {
      const res = await axios.get(`${API}/category-field-rules/${cat.id}`);
      setRules(res.data);
    } catch {
      setRules([]);
    }
    loadDescriptionConfig(cat.id);
  };

  // ── Descriptions tab ─────────────────────────────────────────────────
  const loadDescriptionConfig = async (categoryId) => {
    try {
      const res = await axios.get(`${API}/categories/${categoryId}/description-config`);
      setDescConfig(res.data);
      setDescDraft(JSON.parse(JSON.stringify(res.data)));
    } catch {
      enqueueSnackbar('Failed to load description settings', { variant: 'error' });
      setDescConfig(null);
      setDescDraft(null);
    }
  };

  const handleSaveDescriptions = async () => {
    try {
      setDescSaving(true);
      const res = await axios.put(`${API}/categories/${selected.id}/description-config`, {
        settings: descDraft.settings,
        fields: descDraft.fields.map(f => ({
          id: f.id,
          short_description: f.short_description,
          long_description: f.long_description,
          search: f.search,
          web_filter: f.web_filter,
        })),
      });
      setDescConfig(res.data);
      setDescDraft(JSON.parse(JSON.stringify(res.data)));
      enqueueSnackbar('Description settings saved', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to save description settings', { variant: 'error' });
    } finally {
      setDescSaving(false);
    }
  };

  const handleCancelDescriptions = () => {
    setDescDraft(JSON.parse(JSON.stringify(descConfig)));
  };

  const handleResetDescriptions = async () => {
    try {
      setDescSaving(true);
      const res = await axios.post(`${API}/categories/${selected.id}/description-config/reset`);
      setDescConfig(res.data);
      setDescDraft(JSON.parse(JSON.stringify(res.data)));
      enqueueSnackbar('Reset to default', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to reset description settings', { variant: 'error' });
    } finally {
      setDescSaving(false);
    }
  };

  const toggleFieldFlag = (fieldId, flagKey) => {
    setDescDraft(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id !== fieldId) return f;
        const next = { ...f, [flagKey]: !f[flagKey] };
        // Web Filter implies Search — turning Web Filter on always turns Search on;
        // turning it off leaves Search as-is (Search without Web Filter is valid).
        if (flagKey === 'web_filter' && next.web_filter) next.search = true;
        return next;
      }),
    }));
  };

  const toggleSetting = (key) => {
    setDescDraft(prev => ({ ...prev, settings: { ...prev.settings, [key]: !prev.settings[key] } }));
  };

  const appendToken = (token) => {
    setDescDraft(prev => ({
      ...prev,
      settings: { ...prev.settings, title_template: [...prev.settings.title_template, token] },
    }));
  };

  const removeTokenAt = (idx) => {
    setDescDraft(prev => ({
      ...prev,
      settings: { ...prev.settings, title_template: prev.settings.title_template.filter((_, i) => i !== idx) },
    }));
  };

  const addFallbackAt = (idx, fieldId) => {
    setDescDraft(prev => {
      const template = [...prev.settings.title_template];
      template[idx] = `${template[idx]}|field:${fieldId}`;
      return { ...prev, settings: { ...prev.settings, title_template: template } };
    });
  };

  // "field:12|field:9" -> "Common Model | Model" using this category's own
  // field rules; a reference to a field no longer on the category shows as such
  // rather than crashing.
  const tokenLabel = (token) => {
    if (token === 'category') return 'Category';
    return token.split('|').map(part => {
      const m = part.match(/^field:(\d+)$/);
      if (!m) return part;
      const f = (descDraft?.fields || []).find(x => String(x.id) === m[1]);
      return f ? (f.label_override || f.label) : '(removed field)';
    }).join(' | ');
  };

  // No real inventory item exists to preview against, so field tokens show
  // their label as a bracketed placeholder; only the Category token (the
  // category's own name) is a real resolved value.
  const previewTitle = () => {
    if (!descDraft) return '';
    return descDraft.settings.title_template
      .map(t => (t === 'category' ? (selected?.name || '') : `[${tokenLabel(t)}]`))
      .join(' ')
      .trim();
  };

  const handleSaveCategory = async () => {
    try {
      await axios.put(`${API}/categories/${selected.id}`, {
        name:        editForm.name,
        code:        editForm.code || null,
        description: editForm.description || null,
      });
      enqueueSnackbar('Category saved', { variant: 'success' });
      setEditMode(false);
      setSelected(s => ({ ...s, name: editForm.name, code: editForm.code.toUpperCase(), description: editForm.description }));
      loadAll();
    } catch {
      enqueueSnackbar('Failed to save category', { variant: 'error' });
    }
  };

  // ── Add category dialog ──────────────────────────────────────────────
  const openAddCategoryDialog = (parentInfo) => {
    setCatDialogParent(parentInfo);
    setCatForm(BLANK_CAT_FORM);
    setCatDialogError('');
    setCatDialogOpen(true);
  };

  const handleCreateCategory = async () => {
    if (!catForm.name.trim() || !catForm.code.trim()) {
      setCatDialogError('Name and code are required');
      return;
    }
    try {
      setCatSaving(true);
      setCatDialogError('');
      await axios.post(`${API}/categories`, {
        division_id:        catDialogParent.division_id,
        parent_category_id: catDialogParent.parent_id || null,
        code:               catForm.code.toUpperCase(),
        name:               catForm.name,
        description:        catForm.description || null,
      });
      enqueueSnackbar('Category created', { variant: 'success' });
      setCatDialogOpen(false);
      loadAll();
    } catch (err) {
      setCatDialogError(err.response?.data?.error || 'Failed to create category');
    } finally {
      setCatSaving(false);
    }
  };

  // ── Add rule dialog ──────────────────────────────────────────────────
  const openAddRuleDialog = () => {
    setRuleMode(allFieldDefs.length === 0 ? 'new' : 'existing');
    setRuleFieldId('');
    setRuleFieldForm(BLANK_FIELD_FORM);
    setRuleForm(BLANK_RULE_FORM);
    setRuleDialogOpen(true);
  };

  const handleCreateRule = async () => {
    try {
      setRuleSaving(true);
      let fieldDefId = ruleFieldId;

      if (ruleMode === 'new') {
        if (!ruleFieldForm.field_key.trim() || !ruleFieldForm.label.trim()) {
          enqueueSnackbar('Field key and label are required', { variant: 'warning' });
          return;
        }
        const fieldRes = await axios.post(`${API}/field-definitions`, {
          field_key:       ruleFieldForm.field_key.toLowerCase().replace(/\s+/g, '_'),
          label:           ruleFieldForm.label,
          data_type:       ruleFieldForm.data_type,
          allowed_values:  ruleFieldForm.data_type === 'ENUM' && ruleFieldForm.allowed_values
            ? ruleFieldForm.allowed_values.split(',').map(s => s.trim()).filter(Boolean)
            : null,
          unit_of_measure: ruleFieldForm.unit_of_measure || null,
        });
        fieldDefId = fieldRes.data.id;
        setAllFieldDefs(prev => [...prev, fieldRes.data]);
      }

      if (!fieldDefId) {
        enqueueSnackbar('Please select or create a field', { variant: 'warning' });
        return;
      }

      await axios.post(`${API}/category-field-rules`, {
        category_id:           selected.id,
        field_definition_id:   fieldDefId,
        action:                ruleForm.action,
        scope:                 ruleForm.scope,
        required_for_inventory: ruleForm.required_for_inventory,
        display_order:         parseInt(ruleForm.display_order, 10) || 0,
        default_value:         ruleForm.default_value || null,
        label_override:        ruleForm.label_override || null,
        help_text:             ruleForm.help_text || null,
      });

      enqueueSnackbar('Field rule added', { variant: 'success' });
      setRuleDialogOpen(false);
      const res = await axios.get(`${API}/category-field-rules/${selected.id}`);
      setRules(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to add rule';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setRuleSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    // Find the field definition id before deleting the rule
    const rule = rules.find(r => r.id === ruleId);
    try {
      // Delete the field definition — CASCADE removes the rule automatically
      await axios.delete(`${API}/field-definitions/${rule.field_definition_id}`);
      setRules(prev => prev.filter(r => r.id !== ruleId));
      setAllFieldDefs(prev => prev.filter(f => f.id !== rule.field_definition_id));
      enqueueSnackbar(`Field '${rule.field_key}' deleted from system`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete field', { variant: 'error' });
    }
  };

  const handleDeleteFieldDef = async (fieldId, fieldKey) => {
    try {
      await axios.delete(`${API}/field-definitions/${fieldId}`);
      setAllFieldDefs(prev => prev.filter(f => f.id !== fieldId));
      if (ruleFieldId === fieldId) setRuleFieldId('');
      // Also remove any rules that referenced this field
      setRules(prev => prev.filter(r => r.field_definition_id !== fieldId));
      enqueueSnackbar(`Field '${fieldKey}' deleted from system`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete field definition', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>

      {/* ── Left panel: heading + tree ───────────────────────────────── */}
      <Box sx={{
        width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: 1, borderColor: 'divider', overflow: 'hidden',
      }}>
        <Paper elevation={1} square sx={{ px: 2, py: 1, flexShrink: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Category Manager</Typography>
        </Paper>

        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.paper' }}>
          {tree.map(division => (
              <Box key={division.id} sx={{ mb: 1 }}>
                {/* Division header */}
                <Box sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  px: 1.5, py: 0.8, bgcolor: 'grey.100',
                  borderBottom: 1, borderTop: 1, borderColor: 'divider',
                  position: 'sticky', top: 0, zIndex: 1,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={division.code} size="small" color="primary" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {division.name}
                    </Typography>
                  </Box>
                  <Tooltip title="Add root category to this division">
                    <IconButton
                      size="small"
                      onClick={() => openAddCategoryDialog({ division_id: division.id, parent_id: null })}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Categories */}
                <Box sx={{ py: 0.5 }}>
                  {division.categories.length === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>
                      No categories yet
                    </Typography>
                  ) : (
                    division.categories.map(cat => (
                      <CategoryNode
                        key={cat.id}
                        node={cat}
                        depth={0}
                        selected={selected}
                        onSelect={handleSelectCategory}
                        onAddChild={node => openAddCategoryDialog({
                          division_id: node.division_id,
                          parent_id:   node.id,
                        })}
                      />
                    ))
                  )}
                </Box>
              </Box>
            ))}
        </Box>
      </Box>

      {/* ── Right panel: details — full height, no shared header ────── */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {!selected ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography color="text.secondary">Select a category from the tree to manage it</Typography>
            </Box>
          ) : (
            <>
              {/* Category header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Chip label={selected.division_code} size="small" color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{selected.name}</Typography>
                <Chip label={selected.code} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
              </Box>

              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tab label="Details" />
                <Tab label={`Fields (${rules.length})`} />
                <Tab label="Descriptions" />
                <Tab label="Processing" />
                <Tab label="Pricing" />
              </Tabs>

              {/* ── Tab 0: Details ──────────────────────────────────── */}
              {tab === 0 && (
                <Box>
                  {!editMode ? (
                    <Box>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, mb: 2 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Name</Typography>
                            <Typography variant="body1">{selected.name}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Code</Typography>
                            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{selected.code}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Division</Typography>
                            <Typography variant="body1">{selected.division_name}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Parent</Typography>
                            <Typography variant="body1">{selected.parent_category_id ? `ID ${selected.parent_category_id}` : 'Root'}</Typography>
                          </Box>
                          <Box sx={{ gridColumn: '1/-1' }}>
                            <Typography variant="caption" color="text.secondary">Description</Typography>
                            <Typography variant="body1">{selected.description || '—'}</Typography>
                          </Box>
                        </Box>
                      </Paper>
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => setEditMode(true)}
                        size="small"
                      >
                        Edit
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ maxWidth: 500 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={8}>
                          <TextField
                            label="Name"
                            value={editForm.name}
                            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            fullWidth size="small"
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField
                            label="Code"
                            value={editForm.code}
                            onChange={e => setEditForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                            fullWidth size="small"
                            inputProps={{ style: { fontFamily: 'monospace', textTransform: 'uppercase' } }}
                            helperText="Unique within parent"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Description"
                            value={editForm.description}
                            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                            fullWidth size="small" multiline minRows={2}
                          />
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained" size="small"
                            startIcon={<SaveIcon />}
                            onClick={handleSaveCategory}
                          >
                            Save
                          </Button>
                          <Button
                            variant="outlined" size="small" color="inherit"
                            startIcon={<CancelIcon />}
                            onClick={() => setEditMode(false)}
                          >
                            Cancel
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Box>
              )}

              {/* ── Tab 1: Field Rules ────────────────────────────── */}
              {tab === 1 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Fields that appear on items in this category
                    </Typography>
                    <Button
                      variant="contained" size="small"
                      startIcon={<AddIcon />}
                      onClick={openAddRuleDialog}
                    >
                      Add Field
                    </Button>
                  </Box>

                  {rules.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No fields defined for this category yet.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {rules.map(rule => (
                        <Paper
                          key={rule.id}
                          variant="outlined"
                          sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {rule.label_override || rule.label}
                              </Typography>
                              <Chip label={rule.data_type} size="small" variant="outlined" />
                              <Chip
                                label={rule.action}
                                size="small"
                                color={ACTION_COLOR[rule.action] || 'default'}
                              />
                              {rule.required_for_inventory && (
                                <Chip label="Required" size="small" color="error" variant="outlined" />
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                              {rule.field_key}
                              {rule.unit_of_measure ? ` · ${rule.unit_of_measure}` : ''}
                              {rule.scope !== 'INVENTORY' ? ` · scope: ${rule.scope}` : ''}
                              {rule.default_value ? ` · default: ${rule.default_value}` : ''}
                            </Typography>
                          </Box>
                          <Tooltip title="Remove rule">
                            <IconButton
                              size="small" color="error"
                              onClick={() => handleDeleteRule(rule.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {/* ── Tab 2: Descriptions ──────────────────────────────── */}
              {tab === 2 && (
                !descDraft ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Descriptions Configuration</Typography>
                        <Tooltip title="Build item titles and descriptions using field tokens.">
                          <InfoOutlinedIcon fontSize="small" color="action" />
                        </Tooltip>
                      </Box>
                      <Button
                        size="small" variant="outlined" startIcon={<RestartAltIcon fontSize="small" />}
                        onClick={handleResetDescriptions}
                        disabled={descSaving}
                      >
                        Reset to Default
                      </Button>
                    </Box>

                    <Grid container spacing={2}>
                      {/* Item Title */}
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Item Title</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                            Create the item title template using field tokens. Tokens are replaced with item data
                            when items are created or edited.
                          </Typography>

                          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                            Title Template Builder
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, p: 1, bgcolor: 'grey.50', borderRadius: 1, mb: 1.5 }}>
                            {descDraft.settings.title_template.map((token, idx) => (
                              <Fragment key={idx}>
                                {idx > 0 && <Typography sx={{ mx: 0.25, color: 'text.secondary' }}>+</Typography>}
                                <Chip
                                  label={tokenLabel(token)}
                                  color="primary" variant="outlined" size="small"
                                  onClick={e => setPillMenu({ anchorEl: e.currentTarget, index: idx })}
                                  onDelete={() => removeTokenAt(idx)}
                                  sx={{ fontWeight: 600 }}
                                />
                              </Fragment>
                            ))}
                            <Tooltip title="Add a token to the template">
                              <IconButton size="small" onClick={e => setAddTokenAnchor(e.currentTarget)}>
                                <ExpandMoreIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>

                          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                            Live Preview
                          </Typography>
                          <TextField
                            size="small" fullWidth disabled
                            value={previewTitle() || '—'}
                            sx={{ mb: 1.5, '& .MuiInputBase-input': { fontStyle: descDraft.settings.title_template.length ? 'normal' : 'italic' } }}
                          />

                          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                            Available Tokens
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                            Click a token to add it to the template.
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            <Chip label="Category" size="small" variant="outlined" onClick={() => appendToken('category')} />
                            {descDraft.fields.length === 0 ? (
                              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                Add fields to this category in the Fields tab to use them here.
                              </Typography>
                            ) : descDraft.fields.map(f => (
                              <Chip
                                key={f.id}
                                label={f.label_override || f.label}
                                size="small" variant="outlined"
                                onClick={() => appendToken(`field:${f.id}`)}
                              />
                            ))}
                          </Box>
                        </Paper>
                      </Grid>

                      {/* Descriptions Field Usage */}
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Descriptions Field Usage</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                            Select which fields are used in Short and Long Descriptions.
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Field</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Short Description</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Long Description</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {descDraft.fields.map(f => (
                                <TableRow key={f.id}>
                                  <TableCell>{f.label_override || f.label}</TableCell>
                                  <TableCell align="center">
                                    <Checkbox size="small" checked={f.short_description}
                                      onChange={() => toggleFieldFlag(f.id, 'short_description')} />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Checkbox size="small" checked={f.long_description}
                                      onChange={() => toggleFieldFlag(f.id, 'long_description')} />
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell>Category</TableCell>
                                <TableCell align="center">
                                  <Checkbox size="small" checked={descDraft.settings.category_in_short_description}
                                    onChange={() => toggleSetting('category_in_short_description')} />
                                </TableCell>
                                <TableCell align="center">
                                  <Checkbox size="small" checked={descDraft.settings.category_in_long_description}
                                    onChange={() => toggleSetting('category_in_long_description')} />
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </Paper>
                      </Grid>

                      {/* Search & Web Behaviour */}
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>Search & Web Behaviour</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                          Configure how titles and descriptions influence search and web filters.
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Search Indexing</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                Fields included in internal item search.
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <FormControlLabel label="Item Title" control={
                                  <Checkbox size="small" checked={descDraft.settings.search_index_title}
                                    onChange={() => toggleSetting('search_index_title')} />
                                } />
                                <FormControlLabel label="Short Description" control={
                                  <Checkbox size="small" checked={descDraft.settings.search_index_short_description}
                                    onChange={() => toggleSetting('search_index_short_description')} />
                                } />
                                <FormControlLabel label="Long Description" control={
                                  <Checkbox size="small" checked={descDraft.settings.search_index_long_description}
                                    onChange={() => toggleSetting('search_index_long_description')} />
                                } />
                              </Box>
                              <Divider sx={{ my: 1 }} />
                              <FormControlLabel label="Boost matches on Item Title" control={
                                <Checkbox size="small" checked={descDraft.settings.boost_title_matches}
                                  onChange={() => toggleSetting('boost_title_matches')} />
                              } />
                            </Paper>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Web Filters</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                Fields that are filterable on the website.
                              </Typography>
                              {descDraft.fields.length === 0 ? (
                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  No fields assigned yet.
                                </Typography>
                              ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                  {descDraft.fields.map(f => (
                                    <FormControlLabel key={f.id} label={`Show ${f.label_override || f.label} as filter`} control={
                                      <Checkbox size="small" checked={f.web_filter}
                                        onChange={() => toggleFieldFlag(f.id, 'web_filter')} />
                                    } />
                                  ))}
                                </Box>
                              )}
                            </Paper>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Web Search Content</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                Fields included in website search.
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <FormControlLabel label="Item Title" control={
                                  <Checkbox size="small" checked={descDraft.settings.web_search_title}
                                    onChange={() => toggleSetting('web_search_title')} />
                                } />
                                <FormControlLabel label="Short Description" control={
                                  <Checkbox size="small" checked={descDraft.settings.web_search_short_description}
                                    onChange={() => toggleSetting('web_search_short_description')} />
                                } />
                                <FormControlLabel label="Long Description" control={
                                  <Checkbox size="small" checked={descDraft.settings.web_search_long_description}
                                    onChange={() => toggleSetting('web_search_long_description')} />
                                } />
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                Website search uses the selected fields to match customer queries.
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                      <Button size="small" onClick={handleCancelDescriptions} disabled={descSaving}>
                        Cancel Changes
                      </Button>
                      <Button size="small" variant="contained" onClick={handleSaveDescriptions} disabled={descSaving}>
                        Save Changes
                      </Button>
                    </Box>

                    {/* Menu: add a new token to the end of the template */}
                    <Menu anchorEl={addTokenAnchor} open={Boolean(addTokenAnchor)} onClose={() => setAddTokenAnchor(null)}>
                      <MenuItem onClick={() => { appendToken('category'); setAddTokenAnchor(null); }}>Category</MenuItem>
                      {descDraft.fields.map(f => (
                        <MenuItem key={f.id} onClick={() => { appendToken(`field:${f.id}`); setAddTokenAnchor(null); }}>
                          {f.label_override || f.label}
                        </MenuItem>
                      ))}
                    </Menu>

                    {/* Menu: click a pill to add a fallback field or remove it */}
                    <Menu anchorEl={pillMenu?.anchorEl} open={Boolean(pillMenu)} onClose={() => setPillMenu(null)}>
                      <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block' }}>
                        Add fallback field
                      </Typography>
                      {descDraft.fields.map(f => (
                        <MenuItem key={f.id} onClick={() => { addFallbackAt(pillMenu.index, f.id); setPillMenu(null); }}>
                          {f.label_override || f.label}
                        </MenuItem>
                      ))}
                      <Divider />
                      <MenuItem sx={{ color: 'error.main' }} onClick={() => { removeTokenAt(pillMenu.index); setPillMenu(null); }}>
                        Remove token
                      </MenuItem>
                    </Menu>
                  </Box>
                )
              )}

              {/* ── Tab 3: Processing (placeholder) ──────────────────── */}
              {tab === 3 && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
                  <Typography color="text.secondary">Processing configuration is coming soon.</Typography>
                </Box>
              )}

              {/* ── Tab 4: Pricing (placeholder) ─────────────────────── */}
              {tab === 4 && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
                  <Typography color="text.secondary">Pricing configuration is coming soon.</Typography>
                </Box>
              )}
            </>
          )}
        </Box>

      {/* ── Add Category Dialog ────────────────────────────────────────── */}
      <Dialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Category</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {catDialogError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCatDialogError('')}>
              {catDialogError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                label="Name" required
                value={catForm.name}
                onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                fullWidth size="small" autoFocus
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Code (e.g. ELEC, PHONE)"
                required
                value={catForm.code}
                onChange={e => setCatForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                fullWidth size="small"
                inputProps={{ style: { fontFamily: 'monospace', textTransform: 'uppercase' } }}
                helperText="Short uppercase code — must be unique within the same parent"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={catForm.description}
                onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))}
                fullWidth size="small" multiline minRows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateCategory}
            disabled={catSaving || !catForm.name.trim() || !catForm.code.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Field Rule Dialog ──────────────────────────────────────── */}
      <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Field to "{selected?.name}"</DialogTitle>
        <DialogContent dividers>

          {/* Pick mode */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Field source
            </Typography>
            <ToggleButtonGroup
              value={ruleMode}
              exclusive
              onChange={(_, v) => v && setRuleMode(v)}
              size="small"
              fullWidth
            >
              <ToggleButton value="existing" disabled={allFieldDefs.length === 0}>
                {(() => {
                  const available = allFieldDefs.filter(f => !rules.find(r => r.field_definition_id === f.id));
                  return available.length === 0
                    ? 'Use existing field — none available'
                    : `Use existing field (${available.length})`;
                })()}
              </ToggleButton>
              <ToggleButton value="new">Create new field</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Existing field selector */}
          {ruleMode === 'existing' && (() => {
            const assignedIds = new Set(rules.map(r => r.field_definition_id));
            const available = allFieldDefs.filter(f => !assignedIds.has(f.id));
            const selectedField = available.find(f => f.id === ruleFieldId);
            return (
              <Box sx={{ mb: 2 }}>
                {available.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    All existing fields are already assigned to this category.
                    Switch to "Create new field" to add more.
                  </Typography>
                ) : (
                  <>
                    <FormControl fullWidth size="small">
                      <InputLabel>Field Definition</InputLabel>
                      <Select
                        value={ruleFieldId}
                        onChange={e => setRuleFieldId(e.target.value)}
                        label="Field Definition"
                      >
                        <MenuItem value=""><em>Select a field…</em></MenuItem>
                        {available.map(f => (
                          <MenuItem key={f.id} value={f.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{f.field_key}</Typography>
                              <Typography variant="caption" color="text.secondary">— {f.label}</Typography>
                              <Chip label={f.data_type} size="small" variant="outlined" sx={{ ml: 'auto' }} />
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {selectedField && (
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          size="small" color="error" startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteFieldDef(selectedField.id, selectedField.field_key)}
                        >
                          Delete "{selectedField.field_key}" from system
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            );
          })()}

          {/* New field form */}
          {ruleMode === 'new' && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>New Field Definition</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <TextField
                    label="Field Key" required size="small" fullWidth
                    value={ruleFieldForm.field_key}
                    onChange={e => setRuleFieldForm(f => ({ ...f, field_key: e.target.value }))}
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                    helperText="snake_case, e.g. screen_size"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Label" required size="small" fullWidth
                    value={ruleFieldForm.label}
                    onChange={e => setRuleFieldForm(f => ({ ...f, label: e.target.value }))}
                    helperText="Display name, e.g. Screen Size"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Data Type</InputLabel>
                    <Select
                      value={ruleFieldForm.data_type}
                      onChange={e => setRuleFieldForm(f => ({ ...f, data_type: e.target.value }))}
                      label="Data Type"
                    >
                      {DATA_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Unit of Measure" size="small" fullWidth
                    value={ruleFieldForm.unit_of_measure}
                    onChange={e => setRuleFieldForm(f => ({ ...f, unit_of_measure: e.target.value }))}
                    placeholder='e.g. inches, GB'
                  />
                </Grid>
                {ruleFieldForm.data_type === 'ENUM' && (
                  <Grid item xs={12}>
                    <TextField
                      label="Allowed Values (comma-separated)" size="small" fullWidth
                      value={ruleFieldForm.allowed_values}
                      onChange={e => setRuleFieldForm(f => ({ ...f, allowed_values: e.target.value }))}
                      placeholder="New, Refurbished, For Parts"
                      helperText="Comma-separated list of valid options"
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Rule settings */}
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Rule Settings</Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Action</InputLabel>
                <Select
                  value={ruleForm.action}
                  onChange={e => setRuleForm(f => ({ ...f, action: e.target.value }))}
                  label="Action"
                >
                  {ACTIONS.map(a => (
                    <MenuItem key={a} value={a}>
                      <Chip label={a} size="small" color={ACTION_COLOR[a]} sx={{ pointerEvents: 'none' }} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Scope</InputLabel>
                <Select
                  value={ruleForm.scope}
                  onChange={e => setRuleForm(f => ({ ...f, scope: e.target.value }))}
                  label="Scope"
                >
                  {SCOPES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Display Order" type="number" size="small" fullWidth
                value={ruleForm.display_order}
                onChange={e => setRuleForm(f => ({ ...f, display_order: e.target.value }))}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Default Value" size="small" fullWidth
                value={ruleForm.default_value}
                onChange={e => setRuleForm(f => ({ ...f, default_value: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Label Override" size="small" fullWidth
                value={ruleForm.label_override}
                onChange={e => setRuleForm(f => ({ ...f, label_override: e.target.value }))}
                placeholder="Leave blank to use field label"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Help Text" size="small" fullWidth
                value={ruleForm.help_text}
                onChange={e => setRuleForm(f => ({ ...f, help_text: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleForm.required_for_inventory}
                    onChange={e => setRuleForm(f => ({ ...f, required_for_inventory: e.target.checked }))}
                    size="small"
                  />
                }
                label="Required for inventory"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateRule}
            disabled={ruleSaving}
          >
            Add Field
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CategoryManager;
