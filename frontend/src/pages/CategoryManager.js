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
  Radio,
  RadioGroup,
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
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import CheckIcon from '@mui/icons-material/Check';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useSnackbar } from 'notistack';
import config from '../config';

const API = config.apiUrl;

// Doc: Text, Number, Currency, Yes/No, Dropdown, Multi-select, Date, Measurement
const FIELD_DATA_TYPES = [
  { value: 'TEXT',        label: 'Text' },
  { value: 'NUMBER',      label: 'Number' },
  { value: 'CURRENCY',    label: 'Currency' },
  { value: 'BOOLEAN',     label: 'Yes/No' },
  { value: 'ENUM',        label: 'Dropdown' },
  { value: 'MULTISELECT', label: 'Multi-select' },
  { value: 'DATE',        label: 'Date' },
  { value: 'MEASUREMENT', label: 'Measurement' },
];
const HAS_ALLOWED_VALUES = ['ENUM', 'MULTISELECT'];

// category_field_rules.scope — Transaction is a legacy third option not
// surfaced in this tab's UI (the doc only calls for Catalog Item / Inventory
// Record) but existing data using it is left alone.
const SCOPE_OPTIONS = [
  { value: 'CATALOG',   label: 'Catalog Item' },
  { value: 'INVENTORY', label: 'Inventory Record' },
];

const REQUIRED_AT_OPTIONS = [
  { value: 'INTAKE',     label: 'Intake',     color: 'success' },
  { value: 'PROCESSING', label: 'Processing', color: 'warning' },
  { value: 'OPTIONAL',   label: 'Optional',   color: 'default' },
  { value: 'NOT_USED',   label: 'Not Used',   color: 'default' },
];
const REQUIRED_AT_COLOR = Object.fromEntries(REQUIRED_AT_OPTIONS.map(o => [o.value, o.color]));
const REQUIRED_AT_LABEL = Object.fromEntries(REQUIRED_AT_OPTIONS.map(o => [o.value, o.label]));

const BLANK_CAT_FORM  = { name: '', code: '', description: '' };
const BLANK_NEW_FIELD_FORM = { field_key: '', label: '', data_type: 'TEXT', allowed_values: '', unit_of_measure: '' };

// Rebuilds the Fields tab's grid rows from a GET/PUT /effective-fields
// response — used on load, after Save, on Cancel, and to detect unsaved
// edits (by re-deriving the pristine shape and diffing against the draft).
function rowsFromFieldsSaved(saved, categoryId) {
  if (!saved) return [];
  const activeRows = saved.fields.map(f => ({ ...f, hidden: false }));
  const hiddenRows = saved.suppressed.map(s => ({
    field_definition_id: s.field_definition_id, field_key: s.field_key, field_label: s.label,
    id: s.id, is_own: true, action: 'SUPPRESS', hidden: true,
    data_type: null, allowed_values: null, unit_of_measure: null, allow_free_type: false,
    scope: 'INVENTORY', required_at: 'OPTIONAL', default_value: null, label_override: null, help_text: null,
    short_description: false, long_description: false, search: false, web_filter: false, display_order: 0,
    origin_category_id: categoryId, origin_category_name: null,
  }));
  return [...activeRows, ...hiddenRows];
}

// Builds the Details tab's editable draft from a /api/categories/:id response.
function detailsDraftFromCategory(cat) {
  return {
    name: cat.name || '',
    code: cat.code || '',
    is_active: cat.is_active !== false,
    display_order: cat.display_order ?? 0,
    parent_category_id: cat.parent_category_id ?? '',
    division_id: cat.division_id,
    alternate_names: (cat.alternate_names || []).join(', '),
    internal_notes: cat.internal_notes || '',
  };
}

// Flattens the tree state (divisions -> categories -> children) into one
// array, for populating the Parent Category dropdown and walking descendants.
function flattenCategoryTree(tree) {
  const out = [];
  const walk = (nodes) => {
    nodes.forEach(n => {
      out.push({ id: n.id, name: n.name, parent_category_id: n.parent_category_id, division_id: n.division_id, is_active: n.is_active });
      if (n.children?.length) walk(n.children);
    });
  };
  tree.forEach(div => walk(div.categories || []));
  return out;
}

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
        <Typography variant="body2" sx={{
          flex: 1, fontWeight: isSelected ? 600 : 400,
          fontStyle: node.is_active === false ? 'italic' : 'normal',
          opacity: node.is_active === false ? 0.6 : 1,
        }}>
          {node.name}{node.is_active === false ? ' (Inactive)' : ''}
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
  const [selectedDivision, setSelectedDivision] = useState(null); // selected division (mutually exclusive with `selected`)
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState(0);

  // Details tab — detailsSaved is the last-saved server state (as a draft
  // shape), detailsDraft is the locally-edited copy; nothing is persisted
  // until Save Changes, matching the Fields/Descriptions tabs.
  const [detailsSaved, setDetailsSaved] = useState(null);
  const [detailsDraft, setDetailsDraft] = useState(null);
  const [detailsSaving, setDetailsSaving] = useState(false);

  // Add Category dialog
  const [catDialogOpen, setCatDialogOpen]   = useState(false);
  const [catDialogError, setCatDialogError] = useState('');
  const [catDialogParent, setCatDialogParent] = useState(null); // {division_id, parent_id|null}
  const [catForm, setCatForm]               = useState(BLANK_CAT_FORM);
  const [catSaving, setCatSaving]           = useState(false);

  // Fields tab — fieldsSaved is the last-saved server state, fieldsRows is the
  // locally-edited draft grid (own + inherited + hidden rows, one per field);
  // nothing is persisted until Save Changes. origDefsRef tracks each field
  // definition's Field-Library-level values as loaded, so Save only PATCHes
  // definitions that actually changed.
  const [fieldsSaved, setFieldsSaved] = useState(null);
  const [fieldsRows, setFieldsRows]   = useState([]);
  const [fieldsSaving, setFieldsSaving] = useState(false);
  const [activeFieldKey, setActiveFieldKey] = useState(null); // selected row's field_definition_id
  const origDefsRef = React.useRef({});

  // Add Field dialog
  const [addFieldOpen, setAddFieldOpen]     = useState(false);
  const [addFieldMode, setAddFieldMode]     = useState('existing'); // 'existing' | 'new'
  const [addFieldId, setAddFieldId]         = useState('');
  const [newFieldForm, setNewFieldForm]     = useState(BLANK_NEW_FIELD_FORM);
  const [addFieldSaving, setAddFieldSaving] = useState(false);

  // Field Library dialog (manage global field definitions)
  const [fieldLibraryOpen, setFieldLibraryOpen] = useState(false);

  // Fields tab row-actions menu (chevron)
  const [rowMenu, setRowMenu] = useState(null); // { anchorEl, row }

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
    setSelectedDivision(null);
    setSelected(cat);
    setTab(0);
    loadFields('category', cat.id);
    loadDescriptionConfig(cat.id);
    loadCategoryDetails(cat.id);
  };

  // ── Details tab ──────────────────────────────────────────────────────
  const loadCategoryDetails = async (categoryId) => {
    try {
      const res = await axios.get(`${API}/categories/${categoryId}`);
      setSelected(res.data); // richer than the tree node — includes parent_category_name etc.
      const draft = detailsDraftFromCategory(res.data);
      setDetailsSaved(draft);
      setDetailsDraft(draft);
    } catch {
      enqueueSnackbar('Failed to load category details', { variant: 'error' });
      setDetailsSaved(null);
      setDetailsDraft(null);
    }
  };

  const updateDetailsDraft = (patch) => setDetailsDraft(prev => ({ ...prev, ...patch }));

  const handleSaveDetails = async () => {
    try {
      setDetailsSaving(true);
      await axios.put(`${API}/categories/${selected.id}`, {
        name: detailsDraft.name,
        is_active: detailsDraft.is_active,
        display_order: parseInt(detailsDraft.display_order, 10) || 0,
        parent_category_id: detailsDraft.parent_category_id || null,
        division_id: detailsDraft.division_id,
        alternate_names: detailsDraft.alternate_names.split(',').map(s => s.trim()).filter(Boolean),
        internal_notes: detailsDraft.internal_notes || null,
      });
      await loadCategoryDetails(selected.id);
      loadAll(); // tree name/order/parent may have changed
      enqueueSnackbar('Category details saved', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save category details', { variant: 'error' });
    } finally {
      setDetailsSaving(false);
    }
  };

  const handleCancelDetails = () => {
    if (detailsSaved) setDetailsDraft(detailsSaved);
  };

  const detailsDirty = detailsSaved && detailsDraft
    ? JSON.stringify(detailsDraft) !== JSON.stringify(detailsSaved)
    : false;

  const handleSelectDivision = (div) => {
    setSelected(null);
    setSelectedDivision(div);
    loadFields('division', div.id);
  };

  // ── Fields tab (shared by categories and divisions — a division has no
  // parent, so all its rows always come back is_own:true and the Override/
  // Hide affordances below simply never render for them) ─────────────────
  const fieldsKind      = selectedDivision ? 'division' : 'category';
  const fieldsEntityId  = selectedDivision ? selectedDivision.id : selected?.id;
  const fieldsEntityName = selectedDivision ? selectedDivision.name : selected?.name;
  const fieldsApiBase  = `${API}/${fieldsKind === 'division' ? 'divisions' : 'categories'}/${fieldsEntityId}`;

  const loadFields = async (kind, id) => {
    try {
      const base = `${API}/${kind === 'division' ? 'divisions' : 'categories'}/${id}`;
      const res = await axios.get(`${base}/effective-fields`);
      setFieldsSaved(res.data);
      setFieldsRows(rowsFromFieldsSaved(res.data, id));
      origDefsRef.current = Object.fromEntries(res.data.fields.map(f => [f.field_definition_id, {
        label: f.field_label, data_type: f.data_type, allowed_values: f.allowed_values,
        unit_of_measure: f.unit_of_measure, allow_free_type: f.allow_free_type,
      }]));
      setActiveFieldKey(null);
    } catch {
      enqueueSnackbar('Failed to load fields', { variant: 'error' });
      setFieldsSaved(null);
      setFieldsRows([]);
    }
  };

  const activeFieldRow = fieldsRows.find(r => r.field_definition_id === activeFieldKey) || null;

  const updateActiveField = (patch) => {
    setFieldsRows(prev => prev.map(r => (r.field_definition_id === activeFieldKey ? { ...r, ...patch } : r)));
  };

  const handleOverrideField = (row) => {
    setFieldsRows(prev => prev.map(r => (r.field_definition_id === row.field_definition_id
      ? { ...r, is_own: true, id: null, action: 'OVERRIDE' }
      : r)));
    setActiveFieldKey(row.field_definition_id);
  };

  // Restoring/un-hiding/deleting all just drop the local row — Save omits it
  // from the "own rules" payload, which deletes the underlying row (if any)
  // and lets inheritance resolve fresh from the server on next load.
  const dropFieldRow = (row) => {
    setFieldsRows(prev => prev.filter(r => r.field_definition_id !== row.field_definition_id));
    if (activeFieldKey === row.field_definition_id) setActiveFieldKey(null);
  };

  const handleHideField = (row) => {
    setFieldsRows(prev => prev.map(r => (r.field_definition_id === row.field_definition_id
      ? { ...r, is_own: true, id: null, action: 'SUPPRESS', hidden: true }
      : r)));
    if (activeFieldKey === row.field_definition_id) setActiveFieldKey(null);
  };

  const handleAddAllowedValue = () => {
    updateActiveField({ allowed_values: [...(activeFieldRow.allowed_values || []), ''] });
  };
  const handleChangeAllowedValue = (idx, value) => {
    const next = [...(activeFieldRow.allowed_values || [])];
    next[idx] = value;
    updateActiveField({ allowed_values: next });
  };
  const handleRemoveAllowedValue = (idx) => {
    updateActiveField({ allowed_values: (activeFieldRow.allowed_values || []).filter((_, i) => i !== idx) });
  };
  const handleMoveAllowedValue = (idx, dir) => {
    const next = [...(activeFieldRow.allowed_values || [])];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    updateActiveField({ allowed_values: next });
  };

  // Drag-to-reorder the Fields grid — rows keep whatever order they were
  // added in (via r.id ASC, matching creation order) until dragged. display_
  // order only persists on rows this category owns (Save only sends own
  // rules), so any inherited row involved in a reorder is overridden here
  // too — otherwise its position would silently snap back to the ancestor's
  // order on the next reload while everything around it stayed put.
  const [dragFieldKey, setDragFieldKey] = useState(null);
  const handleReorderFields = (fromKey, toKey) => {
    if (fromKey === toKey) return;
    setFieldsRows(prev => {
      const hiddenRows = prev.filter(r => r.hidden);
      const visibleRows = prev.filter(r => !r.hidden);
      const fromIdx = visibleRows.findIndex(r => r.field_definition_id === fromKey);
      const toIdx = visibleRows.findIndex(r => r.field_definition_id === toKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const reordered = [...visibleRows];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      const withOrder = reordered.map((r, i) => (
        r.is_own
          ? { ...r, display_order: i }
          : { ...r, is_own: true, id: null, action: 'OVERRIDE', display_order: i }
      ));
      return [...withOrder, ...hiddenRows];
    });
  };

  const handleSaveFields = async () => {
    try {
      setFieldsSaving(true);
      const ownRows = fieldsRows.filter(r => r.is_own);

      // PATCH any Field Library (global) definition properties that changed.
      await Promise.all(ownRows.map(r => {
        if (r.hidden) return null; // suppressed rows carry no def edits
        const orig = origDefsRef.current[r.field_definition_id];
        if (!orig) return null; // freshly-added field — definition already current
        const changed = orig.label !== r.field_label || orig.data_type !== r.data_type
          || orig.unit_of_measure !== r.unit_of_measure || orig.allow_free_type !== r.allow_free_type
          || JSON.stringify(orig.allowed_values || []) !== JSON.stringify(r.allowed_values || []);
        if (!changed) return null;
        return axios.put(`${API}/field-definitions/${r.field_definition_id}`, {
          label: r.field_label, data_type: r.data_type, unit_of_measure: r.unit_of_measure || null,
          allow_free_type: r.allow_free_type,
          allowed_values: HAS_ALLOWED_VALUES.includes(r.data_type) ? (r.allowed_values || []).filter(v => v.trim()) : null,
        });
      }));

      const res = await axios.put(`${fieldsApiBase}/field-rules`, {
        rules: ownRows.map(r => ({
          id: r.id, field_definition_id: r.field_definition_id, action: r.action, scope: r.scope,
          required_at: r.required_at, default_value: r.default_value, label_override: r.label_override,
          help_text: r.help_text, short_description: r.short_description, long_description: r.long_description,
          search: r.search, web_filter: r.web_filter, display_order: r.display_order,
        })),
      });

      // Refresh field definitions used app-wide (labels/types may have changed).
      const defsRes = await axios.get(`${API}/field-definitions`);
      setAllFieldDefs(defsRes.data);

      setFieldsSaved(res.data);
      setFieldsRows(rowsFromFieldsSaved(res.data, fieldsEntityId));
      origDefsRef.current = Object.fromEntries(res.data.fields.map(f => [f.field_definition_id, {
        label: f.field_label, data_type: f.data_type, allowed_values: f.allowed_values,
        unit_of_measure: f.unit_of_measure, allow_free_type: f.allow_free_type,
      }]));
      setActiveFieldKey(null);
      enqueueSnackbar('Fields saved', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save fields', { variant: 'error' });
    } finally {
      setFieldsSaving(false);
    }
  };

  const handleCancelFields = () => {
    if (!fieldsSaved) return;
    setFieldsRows(rowsFromFieldsSaved(fieldsSaved, fieldsEntityId));
    setActiveFieldKey(null);
  };

  const fieldsDirty = fieldsSaved
    ? JSON.stringify(fieldsRows) !== JSON.stringify(rowsFromFieldsSaved(fieldsSaved, fieldsEntityId))
    : false;

  // ── Add Field dialog ─────────────────────────────────────────────────
  const openAddFieldDialog = () => {
    setAddFieldMode(allFieldDefs.length === 0 ? 'new' : 'existing');
    setAddFieldId('');
    setNewFieldForm(BLANK_NEW_FIELD_FORM);
    setAddFieldOpen(true);
  };

  const handleAddField = async () => {
    try {
      setAddFieldSaving(true);
      let def;
      if (addFieldMode === 'new') {
        if (!newFieldForm.field_key.trim() || !newFieldForm.label.trim()) {
          enqueueSnackbar('Field key and label are required', { variant: 'warning' });
          return;
        }
        const res = await axios.post(`${API}/field-definitions`, {
          field_key:       newFieldForm.field_key.toLowerCase().replace(/\s+/g, '_'),
          label:           newFieldForm.label,
          data_type:       newFieldForm.data_type,
          allowed_values:  HAS_ALLOWED_VALUES.includes(newFieldForm.data_type) && newFieldForm.allowed_values
            ? newFieldForm.allowed_values.split(',').map(s => s.trim()).filter(Boolean)
            : null,
          unit_of_measure: newFieldForm.unit_of_measure || null,
        });
        def = res.data;
        setAllFieldDefs(prev => [...prev, def]);
      } else {
        def = allFieldDefs.find(f => f.id === addFieldId);
        if (!def) {
          enqueueSnackbar('Please select a field', { variant: 'warning' });
          return;
        }
      }
      if (fieldsRows.some(r => r.field_definition_id === def.id)) {
        enqueueSnackbar('That field is already used here', { variant: 'warning' });
        return;
      }
      const newRow = {
        field_definition_id: def.id, field_key: def.field_key, field_label: def.label,
        data_type: def.data_type, allowed_values: def.allowed_values, unit_of_measure: def.unit_of_measure,
        allow_free_type: def.allow_free_type,
        id: null, is_own: true, action: 'ADD', hidden: false,
        origin_category_id: fieldsKind === 'category' ? fieldsEntityId : null, origin_category_name: fieldsEntityName,
        scope: 'INVENTORY', required_at: 'OPTIONAL', default_value: null, label_override: null, help_text: null,
        short_description: false, long_description: false, search: false, web_filter: false, display_order: 0,
      };
      setFieldsRows(prev => [...prev, newRow]);
      setActiveFieldKey(def.id);
      setAddFieldOpen(false);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to add field', { variant: 'error' });
    } finally {
      setAddFieldSaving(false);
    }
  };

  const handleDeleteFieldDef = async (fieldId, fieldKey) => {
    try {
      await axios.delete(`${API}/field-definitions/${fieldId}`);
      setAllFieldDefs(prev => prev.filter(f => f.id !== fieldId));
      setFieldsRows(prev => prev.filter(r => r.field_definition_id !== fieldId));
      enqueueSnackbar(`Field '${fieldKey}' deleted from system`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete field definition', { variant: 'error' });
    }
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

  const descDirty = descConfig && descDraft ? JSON.stringify(descDraft) !== JSON.stringify(descConfig) : false;

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

  // Shared by the category "Fields" tab and a division's standalone Fields
  // page — a division has no parent, so every one of its rows always comes
  // back is_own:true and the Override/Hide affordances below simply never
  // render for it.
  const renderFieldsSection = () => {
    const visibleRows = fieldsRows.filter(r => !r.hidden);
    const hiddenRows  = fieldsRows.filter(r => r.hidden);
    const entityWord = fieldsKind === 'division' ? 'division' : 'category';
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Fields Configuration</Typography>
            <Tooltip title={`Define which fields are used for this ${entityWord} and how they behave.`}>
              <InfoOutlinedIcon fontSize="small" color="action" />
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<LibraryBooksIcon fontSize="small" />}
              onClick={() => setFieldLibraryOpen(true)}>
              Field Library
            </Button>
            <Button size="small" variant="contained" startIcon={<AddIcon fontSize="small" />}
              onClick={openAddFieldDialog}>
              Add Field
            </Button>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Define which fields are used for this {entityWord} and how they behave.
        </Typography>

        {visibleRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No fields used by this {entityWord} yet.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 32 }} />
                <TableCell sx={{ fontWeight: 700 }}>Field</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Scope</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Required At</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Short Desc</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Long Desc</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Search</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Web Filter</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map(row => (
                <TableRow
                  key={row.field_definition_id}
                  hover
                  draggable
                  selected={activeFieldKey === row.field_definition_id}
                  sx={{ cursor: 'pointer', opacity: dragFieldKey === row.field_definition_id ? 0.4 : 1 }}
                  onClick={() => setActiveFieldKey(row.field_definition_id)}
                  onDragStart={() => setDragFieldKey(row.field_definition_id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    if (dragFieldKey != null) handleReorderFields(dragFieldKey, row.field_definition_id);
                    setDragFieldKey(null);
                  }}
                  onDragEnd={() => setDragFieldKey(null)}
                >
                  <TableCell sx={{ cursor: 'grab', px: 0.5 }} onClick={e => e.stopPropagation()}>
                    <DragIndicatorIcon fontSize="small" sx={{ color: 'text.disabled', display: 'block' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {row.label_override || row.field_label}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {row.scope === 'CATALOG' ? 'Catalog' : row.scope === 'INVENTORY' ? 'Inventory' : row.scope}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={REQUIRED_AT_LABEL[row.required_at]}
                      size="small"
                      color={REQUIRED_AT_COLOR[row.required_at]}
                      variant={row.required_at === 'INTAKE' || row.required_at === 'PROCESSING' ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="center">{row.short_description && <CheckIcon fontSize="small" color="success" />}</TableCell>
                  <TableCell align="center">{row.long_description && <CheckIcon fontSize="small" color="success" />}</TableCell>
                  <TableCell align="center">{row.search && <CheckIcon fontSize="small" color="success" />}</TableCell>
                  <TableCell align="center">{row.web_filter && <CheckIcon fontSize="small" color="success" />}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {row.is_own ? `This ${entityWord === 'division' ? 'Division' : 'Category'}` : `Inherited from ${row.origin_category_name}`}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" onClick={e => e.stopPropagation()}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}>
                      {row.is_own ? (
                        <Button size="small" onClick={() => setActiveFieldKey(row.field_definition_id)}>Edit</Button>
                      ) : (
                        <Button size="small" onClick={() => handleOverrideField(row)}>Override</Button>
                      )}
                      <IconButton size="small" onClick={e => setRowMenu({ anchorEl: e.currentTarget, row })}>
                        <ExpandMoreIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {hiddenRows.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={0.5}>
              HIDDEN FIELDS
            </Typography>
            {hiddenRows.map(row => (
              <Box key={row.field_definition_id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                <VisibilityOffIcon fontSize="small" color="disabled" />
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{row.field_label}</Typography>
                <Button size="small" onClick={() => dropFieldRow(row)}>Un-hide</Button>
              </Box>
            ))}
          </Box>
        )}

        {/* Field Details editor */}
        {activeFieldRow && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2, borderLeft: 4, borderColor: 'primary.main' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Field Details: {activeFieldRow.label_override || activeFieldRow.field_label}
              </Typography>
              {!activeFieldRow.is_own && (
                <Button size="small" variant="outlined" onClick={() => handleOverrideField(activeFieldRow)}>
                  Override to Edit
                </Button>
              )}
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>Field Name</Typography>
                <TextField
                  size="small" fullWidth disabled={!activeFieldRow.is_own}
                  value={activeFieldRow.field_label}
                  onChange={e => updateActiveField({ field_label: e.target.value })}
                  sx={{ mb: 1.5 }}
                />
                <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>Scope</Typography>
                <FormControl size="small" fullWidth disabled={!activeFieldRow.is_own}>
                  <Select value={activeFieldRow.scope} onChange={e => updateActiveField({ scope: e.target.value })}>
                    {SCOPE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {activeFieldRow.scope === 'CATALOG'
                    ? 'Common to all examples of this product.'
                    : 'Describes this specific physical item.'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>Required At</Typography>
                <RadioGroup
                  value={activeFieldRow.required_at}
                  onChange={e => updateActiveField({ required_at: e.target.value })}
                >
                  {REQUIRED_AT_OPTIONS.map(o => (
                    <FormControlLabel key={o.value} value={o.value} disabled={!activeFieldRow.is_own}
                      control={<Radio size="small" />} label={o.label} />
                  ))}
                </RadioGroup>
                {activeFieldRow.required_at === 'PROCESSING' && (
                  <Typography variant="caption" color="text.secondary">
                    Must be completed at Processing before item can become sellable.
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>Input Type</Typography>
                <FormControl size="small" fullWidth disabled={!activeFieldRow.is_own} sx={{ mb: 1.5 }}>
                  <Select
                    value={activeFieldRow.data_type}
                    onChange={e => updateActiveField({
                      data_type: e.target.value,
                      allowed_values: HAS_ALLOWED_VALUES.includes(e.target.value) ? (activeFieldRow.allowed_values || []) : null,
                    })}
                  >
                    {FIELD_DATA_TYPES.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </Select>
                </FormControl>

                {HAS_ALLOWED_VALUES.includes(activeFieldRow.data_type) && (
                  <>
                    <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>Allowed Values</Typography>
                    <Paper variant="outlined" sx={{ p: 1, mb: 1 }}>
                      {(activeFieldRow.allowed_values || []).map((val, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <TextField size="small" fullWidth disabled={!activeFieldRow.is_own}
                            value={val} onChange={e => handleChangeAllowedValue(idx, e.target.value)} />
                          {activeFieldRow.is_own && (
                            <>
                              <IconButton size="small" disabled={idx === 0} onClick={() => handleMoveAllowedValue(idx, -1)}>
                                <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              <IconButton size="small" disabled={idx === (activeFieldRow.allowed_values || []).length - 1}
                                onClick={() => handleMoveAllowedValue(idx, 1)}>
                                <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleRemoveAllowedValue(idx)}>
                                <DeleteIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </>
                          )}
                        </Box>
                      ))}
                      {activeFieldRow.is_own && (
                        <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={handleAddAllowedValue}>
                          Add Value
                        </Button>
                      )}
                    </Paper>
                    <FormControlLabel
                      control={
                        <Checkbox size="small" disabled={!activeFieldRow.is_own}
                          checked={!!activeFieldRow.allow_free_type}
                          onChange={e => updateActiveField({ allow_free_type: e.target.checked })} />
                      }
                      label={<Typography variant="caption">Allow custom values not in the list above.</Typography>}
                    />
                  </>
                )}
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>Use In</Typography>
                <FormControlLabel
                  control={<Checkbox size="small" disabled={!activeFieldRow.is_own} checked={!!activeFieldRow.short_description}
                    onChange={e => updateActiveField({ short_description: e.target.checked })} />}
                  label="Short Description"
                />
                <FormControlLabel
                  control={<Checkbox size="small" disabled={!activeFieldRow.is_own} checked={!!activeFieldRow.long_description}
                    onChange={e => updateActiveField({ long_description: e.target.checked })} />}
                  label="Long Description"
                />
                <FormControlLabel
                  control={<Checkbox size="small" disabled={!activeFieldRow.is_own} checked={!!activeFieldRow.search}
                    onChange={e => updateActiveField({ search: e.target.checked })} />}
                  label="Search"
                />
                <FormControlLabel
                  control={<Checkbox size="small" disabled={!activeFieldRow.is_own} checked={!!activeFieldRow.web_filter}
                    onChange={e => updateActiveField({ web_filter: e.target.checked, search: e.target.checked ? true : activeFieldRow.search })} />}
                  label="Web Filter"
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Selecting Web Filter will automatically make the field searchable.
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
          <Button size="small" onClick={handleCancelFields} disabled={fieldsSaving || !fieldsDirty}>Cancel Changes</Button>
          <Button size="small" variant="contained" onClick={handleSaveFields} disabled={fieldsSaving || !fieldsDirty}>Save Changes</Button>
        </Box>

        {/* Row actions menu */}
        <Menu anchorEl={rowMenu?.anchorEl} open={Boolean(rowMenu)} onClose={() => setRowMenu(null)}>
          {rowMenu && rowMenu.row.is_own && rowMenu.row.action === 'OVERRIDE' && [
            <MenuItem key="restore" onClick={() => { dropFieldRow(rowMenu.row); setRowMenu(null); }}>
              Restore inheritance
            </MenuItem>,
          ]}
          {rowMenu && rowMenu.row.is_own && rowMenu.row.action === 'ADD' && [
            <MenuItem key="remove" sx={{ color: 'error.main' }} onClick={() => { dropFieldRow(rowMenu.row); setRowMenu(null); }}>
              Remove field from {entityWord}
            </MenuItem>,
          ]}
          {rowMenu && !rowMenu.row.is_own && [
            <MenuItem key="hide" onClick={() => { handleHideField(rowMenu.row); setRowMenu(null); }}>
              Hide for this {entityWord}
            </MenuItem>,
          ]}
        </Menu>
      </Box>
    );
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
                {/* Division header — clickable to manage division-level Fields
                    (inherited by every category in the division) */}
                <Box sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  px: 1.5, py: 0.8, cursor: 'pointer',
                  bgcolor: selectedDivision?.id === division.id ? 'primary.main' : 'grey.100',
                  color: selectedDivision?.id === division.id ? 'white' : 'inherit',
                  borderBottom: 1, borderTop: 1, borderColor: 'divider',
                  position: 'sticky', top: 0, zIndex: 1,
                }}
                  onClick={() => handleSelectDivision(division)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={division.code} size="small" color="primary" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {division.name}
                    </Typography>
                  </Box>
                  <Tooltip title="Add root category to this division">
                    <IconButton
                      size="small"
                      sx={{ color: 'inherit' }}
                      onClick={e => { e.stopPropagation(); openAddCategoryDialog({ division_id: division.id, parent_id: null }); }}
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
          {selectedDivision ? (
            <>
              {/* Division header — Fields only, no Details/Descriptions/
                  Processing/Pricing tabs (a division has none of those concepts) */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Chip label={selectedDivision.code} size="small" color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{selectedDivision.name}</Typography>
                <Chip label="Division" size="small" variant="outlined" />
              </Box>
              {renderFieldsSection()}
            </>
          ) : !selected ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography color="text.secondary">Select a category or division from the tree to manage it</Typography>
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
                <Tab label={`Fields (${fieldsRows.filter(r => !r.hidden).length})`} />
                <Tab label="Descriptions" />
                <Tab label="Processing" />
                <Tab label="Pricing" />
              </Tabs>

              {/* ── Tab 0: Details ──────────────────────────────────── */}
              {tab === 0 && (
                !detailsDraft ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (() => {
                  const flatCategories = flattenCategoryTree(tree);
                  const byParent = new Map();
                  flatCategories.forEach(c => {
                    const key = c.parent_category_id || null;
                    if (!byParent.has(key)) byParent.set(key, []);
                    byParent.get(key).push(c.id);
                  });
                  const descendantIds = [];
                  const collect = (id) => {
                    (byParent.get(id) || []).forEach(childId => {
                      descendantIds.push(childId);
                      collect(childId);
                    });
                  };
                  collect(selected.id);
                  const parentOptions = flatCategories.filter(c =>
                    c.division_id === Number(detailsDraft.division_id)
                    && c.id !== selected.id
                    && !descendantIds.includes(c.id)
                  );
                  return (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Categories classify items and control default field behavior for items created in this category.
                      </Typography>

                      <Paper variant="outlined" sx={{ p: 2.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Category Details</Typography>
                        <Grid container spacing={2.5}>
                          <Grid item xs={12} sm={6} md={4}>
                            <TextField
                              label="Category Name" required fullWidth size="small"
                              value={detailsDraft.name}
                              onChange={e => updateDetailsDraft({ name: e.target.value })}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6} md={2.5}>
                            <TextField
                              label="Category Code" fullWidth size="small" disabled
                              value={detailsDraft.code}
                              helperText="Category codes cannot be changed."
                              inputProps={{ style: { fontFamily: 'monospace' } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6} md={2.5}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Status</InputLabel>
                              <Select
                                label="Status"
                                value={detailsDraft.is_active ? 'active' : 'inactive'}
                                onChange={e => updateDetailsDraft({ is_active: e.target.value === 'active' })}
                              >
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <TextField
                              label="Display Order" type="number" fullWidth size="small"
                              value={detailsDraft.display_order}
                              onChange={e => updateDetailsDraft({ display_order: e.target.value })}
                              helperText="Lower numbers appear first."
                              inputProps={{ min: 0 }}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6} md={4}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Parent Category</InputLabel>
                              <Select
                                label="Parent Category"
                                value={detailsDraft.parent_category_id}
                                onChange={e => updateDetailsDraft({ parent_category_id: e.target.value })}
                              >
                                <MenuItem value=""><em>None (root category)</em></MenuItem>
                                {parentOptions.map(c => (
                                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6} md={4}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Division</InputLabel>
                              <Select
                                label="Division"
                                value={detailsDraft.division_id || ''}
                                onChange={e => updateDetailsDraft({ division_id: e.target.value, parent_category_id: '' })}
                              >
                                {divisions.map(d => (
                                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">Alternate / Search Names</Typography>
                              <Tooltip title="Comma-separated alternate names customers or staff might search for.">
                                <InfoOutlinedIcon sx={{ fontSize: 14 }} color="action" />
                              </Tooltip>
                            </Box>
                            <TextField
                              fullWidth size="small" multiline minRows={2}
                              value={detailsDraft.alternate_names}
                              onChange={e => updateDetailsDraft({ alternate_names: e.target.value })}
                              placeholder="e.g. PlayStation 5, PS5, Sony PS5, PS 5"
                              helperText="Enter alternate names (comma separated) to improve search."
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1.5, bgcolor: '#fff8e1', border: '1px solid #ffe082', borderRadius: 1 }}>
                              <Typography sx={{ fontSize: 18, lineHeight: 1 }}>⚠️</Typography>
                              <Typography variant="body2">
                                <strong>Changing the parent category will affect inherited field behavior.</strong><br />
                                Items in this category inherit fields from their parent. Moving this category to a different parent may change which fields are inherited.
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              Internal Notes / Admin Notes
                            </Typography>
                            <TextField
                              fullWidth size="small" multiline minRows={3}
                              value={detailsDraft.internal_notes}
                              onChange={e => updateDetailsDraft({ internal_notes: e.target.value })}
                              helperText="These notes are for internal use only and are not visible on receipts or to customers."
                            />
                          </Grid>
                        </Grid>
                      </Paper>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                        <Button size="small" onClick={handleCancelDetails} disabled={detailsSaving || !detailsDirty}>
                          Cancel Changes
                        </Button>
                        <Button size="small" variant="contained" onClick={handleSaveDetails} disabled={detailsSaving || !detailsDirty}>
                          Save Changes
                        </Button>
                      </Box>
                    </Box>
                  );
                })()
              )}

              {/* ── Tab 1: Fields ────────────────────────────────────── */}
              {tab === 1 && renderFieldsSection()}

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
                      <Button size="small" onClick={handleCancelDescriptions} disabled={descSaving || !descDirty}>
                        Cancel Changes
                      </Button>
                      <Button size="small" variant="contained" onClick={handleSaveDescriptions} disabled={descSaving || !descDirty}>
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

      {/* ── Add Field Dialog ──────────────────────────────────────────── */}
      <Dialog open={addFieldOpen} onClose={() => setAddFieldOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Field to "{fieldsEntityName}"</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Field source
            </Typography>
            <ToggleButtonGroup
              value={addFieldMode}
              exclusive
              onChange={(_, v) => v && setAddFieldMode(v)}
              size="small"
              fullWidth
            >
              <ToggleButton value="existing" disabled={allFieldDefs.length === 0}>
                {(() => {
                  const usedIds = new Set(fieldsRows.map(r => r.field_definition_id));
                  const available = allFieldDefs.filter(f => !usedIds.has(f.id));
                  return available.length === 0
                    ? 'Use existing field — none available'
                    : `Use existing field (${available.length})`;
                })()}
              </ToggleButton>
              <ToggleButton value="new">Create new field</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {addFieldMode === 'existing' && (() => {
            const usedIds = new Set(fieldsRows.map(r => r.field_definition_id));
            const available = allFieldDefs.filter(f => !usedIds.has(f.id));
            return (
              <Box sx={{ mb: 2 }}>
                {available.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Every Field Library field is already used by this category (directly or inherited).
                    Switch to "Create new field" to add more.
                  </Typography>
                ) : (
                  <FormControl fullWidth size="small">
                    <InputLabel>Field Definition</InputLabel>
                    <Select value={addFieldId} onChange={e => setAddFieldId(e.target.value)} label="Field Definition">
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
                )}
              </Box>
            );
          })()}

          {addFieldMode === 'new' && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>New Field Definition</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <TextField
                    label="Field Key" required size="small" fullWidth
                    value={newFieldForm.field_key}
                    onChange={e => setNewFieldForm(f => ({ ...f, field_key: e.target.value }))}
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                    helperText="snake_case, e.g. screen_size"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Label" required size="small" fullWidth
                    value={newFieldForm.label}
                    onChange={e => setNewFieldForm(f => ({ ...f, label: e.target.value }))}
                    helperText="Display name, e.g. Screen Size"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Input Type</InputLabel>
                    <Select
                      value={newFieldForm.data_type}
                      onChange={e => setNewFieldForm(f => ({ ...f, data_type: e.target.value }))}
                      label="Input Type"
                    >
                      {FIELD_DATA_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Unit of Measure" size="small" fullWidth
                    value={newFieldForm.unit_of_measure}
                    onChange={e => setNewFieldForm(f => ({ ...f, unit_of_measure: e.target.value }))}
                    placeholder='e.g. inches, GB'
                  />
                </Grid>
                {HAS_ALLOWED_VALUES.includes(newFieldForm.data_type) && (
                  <Grid item xs={12}>
                    <TextField
                      label="Allowed Values (comma-separated)" size="small" fullWidth
                      value={newFieldForm.allowed_values}
                      onChange={e => setNewFieldForm(f => ({ ...f, allowed_values: e.target.value }))}
                      placeholder="New, Refurbished, For Parts"
                      helperText="Comma-separated list of valid options — Allow free-type and other behaviour can be set afterward in Field Details"
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddFieldOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddField}
            disabled={addFieldSaving || (addFieldMode === 'existing' && !addFieldId)}
          >
            Add Field
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Field Library Dialog — manage global field definitions ──────── */}
      <Dialog open={fieldLibraryOpen} onClose={() => setFieldLibraryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Field Library</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Reusable company-level field definitions. Deleting a field here removes it — and any category's use of
            it — everywhere, not just this category.
          </Typography>
          {allFieldDefs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No fields defined yet. Use "Add Field" on a category's Fields tab to create the first one.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {allFieldDefs.map(f => (
                <Paper key={f.id} variant="outlined" sx={{ p: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.label}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {f.field_key}{f.unit_of_measure ? ` · ${f.unit_of_measure}` : ''}
                    </Typography>
                  </Box>
                  <Chip label={FIELD_DATA_TYPES.find(t => t.value === f.data_type)?.label || f.data_type} size="small" variant="outlined" />
                  <Tooltip title="Delete from system">
                    <IconButton size="small" color="error" onClick={() => handleDeleteFieldDef(f.id, f.field_key)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldLibraryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CategoryManager;
