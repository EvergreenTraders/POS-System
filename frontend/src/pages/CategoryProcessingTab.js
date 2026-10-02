import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
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
import DownloadIcon from '@mui/icons-material/Download';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';
import config from '../config';

const API = config.apiUrl;

function WorkflowStep({ icon, title, children, last }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '50%', border: 1, borderColor: 'divider',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', flexShrink: 0,
        }}>
          {icon}
        </Box>
        {!last && <ArrowDownwardIcon sx={{ fontSize: 16, color: 'text.disabled', my: 0.5 }} />}
      </Box>
      <Box sx={{ pb: last ? 0 : 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{children}</Typography>
      </Box>
    </Box>
  );
}

// Own settings from the API → editable draft.
const draftFromData = (data) => ({
  requirements: Object.fromEntries(data.requirements.map(r => [r.id, r.own])), // id → true | false | null (inherit)
  checklist: data.checklist.own ? data.checklist.own.map(row => ({ ...row })) : null, // null = inherit
});

// ─────────────────────────────────────────────────────────────────────────
// Category Manager → Processing tab (06 Category Manager Processing doc).
// Nothing is hard-coded: staff build the processing-requirement library
// themselves and tick the ones this category needs (like the Fields tab),
// and edit the category's checklist. Both inherit from the parent category.
// Also shows the live "Required At: Processing" fields, which the server
// enforces before an item's Processing can complete.
// ─────────────────────────────────────────────────────────────────────────
export default function CategoryProcessingTab({ category, onOpenFieldsTab }) {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [fields, setFields] = useState(null);
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  // Library edits are inline (save immediately); delete still confirms.
  const [adding, setAdding] = useState(false);       // inline "add requirement" field open
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);  // requirement being renamed inline
  const [editingName, setEditingName] = useState('');
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Checklist inputs, so Enter can move focus to the next row.
  const checklistInputs = useRef([]);
  const [focusRow, setFocusRow] = useState(null);
  useEffect(() => {
    if (focusRow === null) return;
    checklistInputs.current[focusRow]?.focus();
    setFocusRow(null);
  }, [focusRow, draft]);

  const load = useCallback(async () => {
    try {
      const [fieldsRes, processingRes] = await Promise.all([
        axios.get(`${API}/categories/${category.id}/effective-fields`),
        axios.get(`${API}/categories/${category.id}/processing`),
      ]);
      setFields(fieldsRes.data?.fields || []);
      setData(processingRes.data);
      setDraft(draftFromData(processingRes.data));
    } catch (err) {
      enqueueSnackbar('Failed to load processing settings', { variant: 'error' });
      setFields([]);
    }
  }, [category.id, enqueueSnackbar]);

  useEffect(() => { load(); }, [load]);

  if (!data || !draft) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} /></Box>;
  }

  const processingFields = (fields || []).filter(f => f.required_at === 'PROCESSING');
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFromData(data));

  // ── Requirements (tick = required for this category) ─────────────────
  const isRequired = (r) => (draft.requirements[r.id] ?? null) !== null ? draft.requirements[r.id] : r.inherited_required;
  const setOwnRequirement = (id, value) => setDraft(prev => ({ ...prev, requirements: { ...prev.requirements, [id]: value } }));
  const requirementNote = (r) => {
    const own = draft.requirements[r.id] ?? null;
    if (own === null) return r.inherited_from ? `Inherited from ${r.inherited_from}` : null;
    return r.inherited_from && r.inherited_required !== own
      ? `Overrides ${r.inherited_from} (${r.inherited_required ? 'required' : 'not required'})`
      : 'Set on this category';
  };
  const requiredWork = data.requirements.filter(isRequired);

  // Inline add: Enter adds the requirement (ticked for this category) and
  // leaves an empty field ready for the next one.
  const addRequirement = async () => {
    const name = newName.trim();
    if (!name || libraryBusy) return;
    setLibraryBusy(true);
    try {
      const res = await axios.post(`${API}/processing-requirements`, { name });
      setData(prev => ({
        ...prev,
        requirements: [...prev.requirements, { ...res.data, own: null, required: false, inherited_required: false, inherited_from: null }]
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
      setOwnRequirement(res.data.id, true); // saved with Save Changes
      setNewName('');
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to add requirement', { variant: 'error' });
    } finally {
      setLibraryBusy(false);
    }
  };

  const closeAdding = () => { setAdding(false); setNewName(''); };

  // Inline rename (applies to every category using the requirement).
  const renameRequirement = async (r) => {
    const name = editingName.trim();
    if (!name || name === r.name) { setEditingId(null); return; }
    setLibraryBusy(true);
    try {
      const res = await axios.put(`${API}/processing-requirements/${r.id}`, { name, description: r.description });
      setData(prev => ({
        ...prev,
        requirements: prev.requirements.map(x => (x.id === r.id ? { ...x, ...res.data } : x))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
      setEditingId(null);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to rename requirement', { variant: 'error' });
    } finally {
      setLibraryBusy(false);
    }
  };

  const deleteRequirement = async () => {
    const target = confirmDelete;
    setConfirmDelete(null);
    try {
      await axios.delete(`${API}/processing-requirements/${target.id}`);
      setData(prev => ({ ...prev, requirements: prev.requirements.filter(r => r.id !== target.id) }));
      setDraft(prev => {
        const next = { ...prev.requirements };
        delete next[target.id];
        return { ...prev, requirements: next };
      });
      enqueueSnackbar(`"${target.name}" deleted`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to delete requirement', { variant: 'error' });
    }
  };

  // ── Checklist ───────────────────────────────────────────────────────────
  const ownChecklist = draft.checklist; // null = inheriting
  const setChecklist = (rows) => setDraft(prev => ({ ...prev, checklist: rows }));
  const updateRow = (i, patch) => setChecklist(ownChecklist.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const moveRow = (i, delta) => {
    const next = [...ownChecklist];
    const j = i + delta;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setChecklist(next);
  };
  const shownChecklist = ownChecklist ?? data.checklist.inherited;
  const blankRow = () => ({ requirement: '', required: true, must_pass: true });
  const addChecklistRow = () => {
    setChecklist([...ownChecklist, blankRow()]);
    setFocusRow(ownChecklist.length);
  };
  // Enter = done typing this row: go to the next row, or start a new one.
  const handleChecklistKeyDown = (e, i) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!ownChecklist[i].requirement.trim()) return;
    if (i === ownChecklist.length - 1) setChecklist([...ownChecklist, blankRow()]);
    setFocusRow(i + 1);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/categories/${category.id}/processing`, {
        requirements: data.requirements.map(r => ({ requirement_id: r.id, required: draft.requirements[r.id] ?? null })),
        // Blank rows (e.g. the empty row Enter leaves at the end) are dropped.
        checklist: ownChecklist ? ownChecklist.filter(row => row.requirement.trim()) : null,
        employee_id: user?.id,
      });
      setData(res.data);
      setDraft(draftFromData(res.data));
      enqueueSnackbar('Processing settings saved', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save processing settings', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.7fr 1fr' }, gap: 2, alignItems: 'start' }}>
        {/* ── Processing Defaults ──────────────────────────────────────── */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Processing Defaults</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure how items in this category are processed and made sellable. Unticked settings are inherited from the parent category.
          </Typography>

          {/* Required work — staff-defined library, ticked per category */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>Required Work</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setAdding(true)} disabled={adding}>
              Add Requirement
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Tick the work items in this category need. Requirements are shared by all categories — add, rename or delete them here.
          </Typography>
          {data.requirements.length === 0 && !adding ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              No requirements yet — use <strong>Add Requirement</strong> to create one (e.g. “Testing Required”).
            </Typography>
          ) : (
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 2 }}>
              {data.requirements.map((r, i) => {
                const note = requirementNote(r);
                const own = draft.requirements[r.id] ?? null;
                const renaming = editingId === r.id;
                return (
                  <Box key={r.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, px: 1, py: 0.75, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                    <Checkbox size="small" checked={isRequired(r)} sx={{ mt: -0.5 }}
                      onChange={e => setOwnRequirement(r.id, e.target.checked)} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {renaming ? (
                        // Enter saves the new name (all categories); Esc / clicking away cancels.
                        <TextField fullWidth size="small" variant="standard" autoFocus value={editingName}
                          inputProps={{ maxLength: 100, readOnly: libraryBusy }}
                          helperText="Enter to save · Esc to cancel · renames it for every category"
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); renameRequirement(r); }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onBlur={() => { if (!libraryBusy) setEditingId(null); }} />
                      ) : (
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{r.name}</Typography>
                      )}
                      {r.description && <Typography variant="caption" color="text.secondary" display="block">{r.description}</Typography>}
                      {note && (
                        <Typography variant="caption" color="text.disabled">
                          {note}
                          {own !== null && (
                            <Link component="button" variant="caption" sx={{ ml: 1 }} onClick={() => setOwnRequirement(r.id, null)}>
                              Use inherited
                            </Link>
                          )}
                        </Typography>
                      )}
                    </Box>
                    {!renaming && (
                      <>
                        <Tooltip title="Rename (all categories)">
                          <IconButton size="small" onClick={() => { setEditingId(r.id); setEditingName(r.name); }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete (all categories)">
                          <IconButton size="small" onClick={() => setConfirmDelete(r)}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                );
              })}
              {adding && (
                // Inline add: Enter adds it and keeps the field open for the next one.
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.75, borderTop: data.requirements.length ? 1 : 0, borderColor: 'divider' }}>
                  <AddIcon fontSize="small" color="action" sx={{ mx: 1.25 }} />
                  <TextField fullWidth size="small" variant="standard" autoFocus value={newName}
                    inputProps={{ maxLength: 100, readOnly: libraryBusy }}
                    placeholder="Type a requirement (e.g. Testing Required) and press Enter"
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addRequirement(); }
                      if (e.key === 'Escape') closeAdding();
                    }}
                    onBlur={() => { if (!newName.trim() && !libraryBusy) closeAdding(); }} />
                </Box>
              )}
            </Box>
          )}
        </Paper>

        {/* ── Workflow Summary ─────────────────────────────────────────── */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Processing Workflow Summary</Typography>
          <WorkflowStep icon={<DownloadIcon fontSize="small" />} title="Intake">
            Item is received and assigned to processing.
          </WorkflowStep>
          <WorkflowStep icon={<AssignmentOutlinedIcon fontSize="small" />} title="Process & Verify">
            {requiredWork.length ? <>Complete: {requiredWork.map(r => r.name).join(', ')}. </> : null}
            {processingFields.length
              ? <>Fill in {processingFields.length} required field{processingFields.length === 1 ? '' : 's'}. </>
              : null}
            {shownChecklist.length ? <>Work through the {shownChecklist.length}-item checklist.</> : null}
            {!requiredWork.length && !processingFields.length && !shownChecklist.length && 'No processing requirements set for this category.'}
          </WorkflowStep>
          <WorkflowStep icon={<CheckCircleOutlineIcon fontSize="small" />} title="Complete" last>
            Processing is completed and the item becomes sellable.
          </WorkflowStep>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
            These are category defaults. Each item keeps its own processing status, queue, location and sellable state.
          </Typography>
        </Paper>
      </Box>

      {/* ── Checklist ───────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Processing Checklist & Rules</Typography>
          <Box sx={{ flex: 1 }} />
          {ownChecklist === null ? (
            <Button size="small" variant="outlined" startIcon={<EditIcon />}
              onClick={() => setChecklist(data.checklist.inherited.map(row => ({ ...row })))}>
              {data.checklist.inherited.length ? 'Customize for this category' : 'Edit Checklist'}
            </Button>
          ) : (
            <>
              <Button size="small" startIcon={<AddIcon />} onClick={addChecklistRow}>
                Add Row
              </Button>
              {(data.checklist.inherited_from || data.checklist.own !== null) && (
                <Button size="small" color="inherit" onClick={() => setChecklist(null)}>Use inherited checklist</Button>
              )}
            </>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {ownChecklist === null
            ? (data.checklist.inherited_from
              ? `Inherited from ${data.checklist.inherited_from}.`
              : 'No checklist yet.')
            : 'Checklist for this category — items should meet every requirement before processing is completed.'}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              {ownChecklist !== null && <TableCell sx={{ width: 72 }} />}
              <TableCell>Requirement</TableCell>
              <TableCell align="center" sx={{ width: 120 }}>Required</TableCell>
              <TableCell align="center" sx={{ width: 120 }}>Must Pass</TableCell>
              {ownChecklist !== null && <TableCell sx={{ width: 48 }} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {shownChecklist.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ color: 'text.secondary', textAlign: 'center', py: 2.5 }}>
                  {ownChecklist === null ? 'No checklist rows.' : 'No rows yet — use Add Row.'}
                </TableCell>
              </TableRow>
            )}
            {ownChecklist === null
              ? shownChecklist.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.requirement}</TableCell>
                  <TableCell align="center">{row.required ? 'Yes' : 'No'}</TableCell>
                  <TableCell align="center">{row.must_pass ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))
              : ownChecklist.map((row, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" disabled={i === 0} onClick={() => moveRow(i, -1)}><ArrowUpwardIcon fontSize="inherit" /></IconButton>
                    <IconButton size="small" disabled={i === ownChecklist.length - 1} onClick={() => moveRow(i, 1)}><ArrowDownwardIcon fontSize="inherit" /></IconButton>
                  </TableCell>
                  <TableCell>
                    <TextField fullWidth size="small" variant="standard" value={row.requirement}
                      placeholder="Type a requirement and press Enter" inputProps={{ maxLength: 200 }}
                      inputRef={el => { checklistInputs.current[i] = el; }}
                      onKeyDown={e => handleChecklistKeyDown(e, i)}
                      onChange={e => updateRow(i, { requirement: e.target.value })} />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox size="small" checked={row.required} onChange={e => updateRow(i, { required: e.target.checked })} />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox size="small" checked={row.must_pass} onChange={e => updateRow(i, { must_pass: e.target.checked })} />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => setChecklist(ownChecklist.filter((_, idx) => idx !== i))}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5, mt: 2 }}>
        <Button variant="outlined" color="inherit" disabled={!dirty || saving} onClick={() => setDraft(draftFromData(data))}>
          Cancel Changes
        </Button>
        <Button variant="contained" disabled={!dirty || saving} onClick={handleSave}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}>
          Save Changes
        </Button>
      </Box>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete requirement?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            “{confirmDelete?.name}” will be removed from <strong>every category</strong> that uses it. This can’t be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={deleteRequirement}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
