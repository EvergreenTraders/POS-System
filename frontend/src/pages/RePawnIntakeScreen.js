import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import config from '../config';
import { openPawnReceiptPDF } from '../utils/pawnReceiptUtils';
import {
  Box, Typography, Paper, CircularProgress, Button, Chip,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Checkbox, FormControlLabel, Divider,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';

const PURPLE      = '#6a1b9a';
const PURPLE_DARK = '#4a148c';

const CONDITIONS     = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
const VERIFY_ITEMS   = [
  'Item matches previous record',
  'Serial number verified',
  'Condition checked',
];

export default function RePawnIntakeScreen({
  customer,
  selectedItem,
  stats,
  newPartNumber,
  onBack,
  onCancel,
  onSaveItem,
  onSaveAndAddAnother,
}) {
  const [pawnHistory,   setPawnHistory]   = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [condition,     setCondition]     = useState('');
  const [verification,  setVerification]  = useState({});
  const [photoPreview,  setPhotoPreview]  = useState(null);
  const [notes,         setNotes]         = useState('');
  const [pawnAmount,    setPawnAmount]    = useState(
    String(parseFloat(selectedItem?.item_price || 0).toFixed(2))
  );
  const photoInputRef  = useRef(null);
  const cameraInputRef = useRef(null);

  const backendBase = config.apiUrl.replace('/api', '');

  useEffect(() => {
    if (!selectedItem?.item_id) return;
    const token = localStorage.getItem('token');
    axios
      .get(`${config.apiUrl}/jewelry/${selectedItem.item_id}/repawn-history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => setPawnHistory(res.data || []))
      .catch(err => console.error('Error fetching repawn history:', err))
      .finally(() => setHistoryLoading(false));
  }, [selectedItem?.item_id]);

  const histStats = useMemo(() => {
    if (!pawnHistory.length) return null;
    const amounts = pawnHistory.map(h => parseFloat(h.pawn_amount) || 0);
    const redeemed  = pawnHistory.filter(h => h.status === 'REDEEMED').length;
    const forfeited = pawnHistory.filter(h => h.status === 'FORFEITED').length;
    const last = pawnHistory[pawnHistory.length - 1];
    return {
      times:      pawnHistory.length,
      lastDate:   last?.pawn_date,
      lastAmount: last?.pawn_amount,
      avg:        amounts.reduce((s, a) => s + a, 0) / amounts.length,
      min:        Math.min(...amounts),
      max:        Math.max(...amounts),
      redeemed,
      forfeited,
    };
  }, [pawnHistory]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
  };

  const buildItem = () => ({
    ...selectedItem,
    id:          selectedItem.item_id,
    item_id:     selectedItem.item_id,
    item:        selectedItem.short_desc || selectedItem.long_desc || '',
    long_desc:   selectedItem.long_desc  || selectedItem.short_desc || '',
    short_desc:  selectedItem.short_desc || '',
    category:    selectedItem.category   || '',
    metal_category: selectedItem.category || '',
    serial:      selectedItem.serial_number || '',
    serial_number: selectedItem.serial_number || '',
    amount:      parseFloat(pawnAmount) || 0,
    price:       parseFloat(pawnAmount) || 0,
    qty:         1,
    condition,
    notes,
    isRePawn:    true,
    sourceEstimator: 'jewelry',
  });

  const handleSave = (andAddAnother = false) => {
    const item = buildItem();
    if (andAddAnother) onSaveAndAddAnother(item);
    else onSaveItem(item);
  };

  const fmt     = (n) => `$${parseFloat(n || 0).toFixed(2)}`;
  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  const thumb = (() => {
    const raw = Array.isArray(selectedItem?.images) && selectedItem.images[0]?.url;
    if (!raw) return null;
    return raw.startsWith('http') ? raw : `${backendBase}${raw}`;
  })();

  const itemLabel = selectedItem?.ticket_status === 'FORFEITED' ? 'Forfeited' : 'Redeemed';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', bgcolor: '#f5f6fa' }}>
      {/* Breadcrumb */}
      <Box sx={{ bgcolor: PURPLE, color: 'white', px: 2.5, py: 0.875, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" sx={{ cursor: 'pointer', opacity: 0.8, '&:hover': { opacity: 1 } }} onClick={onCancel}>
          Pawn Transaction
        </Typography>
        <MuiIcons.ChevronRight sx={{ fontSize: 16, opacity: 0.6 }} />
        <Typography variant="body2" sx={{ cursor: 'pointer', opacity: 0.8, '&:hover': { opacity: 1 } }} onClick={onBack}>
          Re-Pawn Selector
        </Typography>
        <MuiIcons.ChevronRight sx={{ fontSize: 16, opacity: 0.6 }} />
        <Typography variant="body2" fontWeight={700}>Re-Pawn Intake</Typography>
      </Box>

      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        {/* Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MuiIcons.Refresh sx={{ fontSize: 18, color: 'white' }} />
          </Box>
          <Typography variant="h6" fontWeight={800} letterSpacing={0.5}>RE-PAWN ITEM INTAKE</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Verify the previously pawned item and capture today's intake details.
        </Typography>

        {/* Row 1: Source Item + Customer */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          {/* Source Item */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Typography fontWeight={700} fontSize={13} color={PURPLE} sx={{ mb: 1.5, letterSpacing: 0.5 }}>SOURCE ITEM</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Previous Ticket</Typography>
                <Typography variant="body2" fontWeight={700} fontFamily="monospace">{selectedItem?.last_ticket_id || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Last Pawn Date</Typography>
                <Typography variant="body2" fontWeight={600}>{fmtDate(selectedItem?.last_pawn_date)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Last {itemLabel}</Typography>
                <Typography variant="body2" fontWeight={600}>{fmtDate(selectedItem?.last_status_date)}</Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Previous Pawn Amount</Typography>
                <Typography variant="body2" fontWeight={700} color="#2e7d32">{fmt(selectedItem?.item_price)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">New Part #</Typography>
                <Typography variant="body2" fontWeight={700} fontFamily="monospace" color={PURPLE}>{newPartNumber}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Customer */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Typography fontWeight={700} fontSize={13} color={PURPLE} sx={{ mb: 1.5, letterSpacing: 0.5 }}>CUSTOMER</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#e8eaf6', color: '#3949ab', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                {customer?.first_name?.[0]}{customer?.last_name?.[0]}
              </Box>
              <Box>
                <Typography fontWeight={700} fontSize={14}>{customer?.first_name} {customer?.last_name}</Typography>
                <Typography variant="caption" color="text.secondary">{customer?.phone || '—'}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.75 }}>
              {[
                { label: 'Active Pawns',  value: stats?.active_pawns ?? '—' },
                { label: 'Overdue Pawns', value: stats?.overdue_pawns ?? '—' },
                { label: 'Forfeit Ratio', value: stats ? `${stats.forfeit_ratio}%` : '—' },
                { label: 'First Pawn',    value: stats?.first_pawn_date ? fmtDate(stats.first_pawn_date) : '—' },
              ].map(s => (
                <Box key={s.label} sx={{ textAlign: 'center', bgcolor: '#f8f9fa', borderRadius: 1.5, p: 0.75 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10, lineHeight: 1.3 }}>{s.label}</Typography>
                  <Typography fontWeight={700} fontSize={13}>{s.value}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* Row 2: Previous Item + Today's Verification */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          {/* Previous Item */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Typography fontWeight={700} fontSize={13} color={PURPLE} sx={{ mb: 1.5, letterSpacing: 0.5 }}>PREVIOUS ITEM</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
              {thumb ? (
                <Box component="img" src={thumb} sx={{ width: 110, height: 110, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0, border: '1px solid #e0e0e0' }} />
              ) : (
                <Box sx={{ width: 110, height: 110, borderRadius: 1.5, bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MuiIcons.Diamond sx={{ fontSize: 38, color: '#c0c0c0' }} />
                </Box>
              )}
              <Box sx={{ flex: 1 }}>
                {[
                  { label: 'Category', value: selectedItem?.category },
                  { label: 'Item',     value: selectedItem?.short_desc || selectedItem?.long_desc },
                  { label: 'Brand',    value: selectedItem?.brand },
                  { label: 'Serial #', value: selectedItem?.serial_number },
                  { label: 'Colour',   value: selectedItem?.jewelry_color },
                  { label: 'Purity',   value: selectedItem?.metal_purity },
                ].filter(r => r.value).map(r => (
                  <Box key={r.label} sx={{ display: 'flex', gap: 1, mb: 0.35 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60, flexShrink: 0 }}>{r.label}</Typography>
                    <Typography variant="caption" fontWeight={600}>{r.value}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Button size="small" variant="outlined"
              startIcon={<MuiIcons.OpenInNew sx={{ fontSize: 13 }} />}
              onClick={() => openPawnReceiptPDF(selectedItem?.last_ticket_id).catch(console.error)}
              sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5, borderColor: PURPLE, color: PURPLE, '&:hover': { bgcolor: '#f3e5f5', borderColor: PURPLE_DARK } }}>
              View Previous Ticket
            </Button>
          </Paper>

          {/* Today's Verification */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Typography fontWeight={700} fontSize={13} color={PURPLE} sx={{ mb: 1.5, letterSpacing: 0.5 }}>TODAY'S VERIFICATION</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {/* Photo capture */}
              <Box>
                <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.75 }}>Current Intake Photo</Typography>
                <Box sx={{ border: `1.5px dashed ${PURPLE}60`, borderRadius: 2, height: 112, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, overflow: 'hidden', bgcolor: '#fafafa' }}>
                  {photoPreview ? (
                    <Box component="img" src={photoPreview} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Box sx={{ textAlign: 'center' }}>
                      <MuiIcons.PhotoCamera sx={{ fontSize: 26, color: '#c0c0c0', mb: 0.5 }} />
                      <Typography variant="caption" color="text.disabled" display="block">No photo taken yet</Typography>
                    </Box>
                  )}
                </Box>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoChange} />
                <input ref={photoInputRef}  type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  <Button size="small" variant="outlined" startIcon={<MuiIcons.PhotoCamera sx={{ fontSize: 13 }} />}
                    onClick={() => cameraInputRef.current?.click()}
                    sx={{ flex: 1, textTransform: 'none', fontSize: 11, borderRadius: 1.5 }}>
                    Take Photo
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<MuiIcons.Upload sx={{ fontSize: 13 }} />}
                    onClick={() => photoInputRef.current?.click()}
                    sx={{ flex: 1, textTransform: 'none', fontSize: 11, borderRadius: 1.5 }}>
                    Upload
                  </Button>
                </Box>
              </Box>

              {/* Condition + Verification checkboxes */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Condition</InputLabel>
                  <Select value={condition} label="Condition" onChange={e => setCondition(e.target.value)} sx={{ borderRadius: 1.5 }}>
                    {CONDITIONS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>


                <Box>
                  <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>Verification</Typography>
                  {VERIFY_ITEMS.map(v => (
                    <FormControlLabel key={v}
                      control={<Checkbox size="small" checked={!!verification[v]}
                        onChange={e => setVerification(vr => ({ ...vr, [v]: e.target.checked }))}
                        sx={{ py: 0.2, color: PURPLE, '&.Mui-checked': { color: PURPLE } }} />}
                      label={<Typography variant="caption">{v}</Typography>}
                      sx={{ display: 'flex', m: 0 }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Row 3: Pawn History + Pawn Amount */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 2, mb: 2 }}>
          {/* Pawn History */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Typography fontWeight={700} fontSize={13} color={PURPLE} sx={{ mb: 1.5, letterSpacing: 0.5 }}>THIS ITEM'S PAWN HISTORY</Typography>
            {historyLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={22} sx={{ color: PURPLE }} />
              </Box>
            ) : (
              <>
                {histStats && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75, mb: 1.5 }}>
                    {[
                      { label: 'Times Pawned',        value: histStats.times },
                      { label: 'Last Pawn Date',       value: fmtDate(histStats.lastDate) },
                      { label: 'Last Pawn Amount',     value: fmt(histStats.lastAmount) },
                      { label: 'Average Pawn Amount',  value: fmt(histStats.avg) },
                      { label: 'Highest Pawn Amount',  value: fmt(histStats.max) },
                      { label: 'Redeemed',             value: histStats.redeemed },
                      {
                        label: 'Forfeited',
                        value: (
                          <Typography component="span" fontWeight={700} fontSize={12} color={histStats.forfeited > 0 ? 'error' : 'inherit'}>
                            {histStats.forfeited}
                          </Typography>
                        ),
                      },
                    ].map(s => (
                      <Box key={s.label} sx={{ textAlign: 'center', bgcolor: '#f8f9fa', borderRadius: 1.5, p: 0.75 }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10, lineHeight: 1.3 }}>{s.label}</Typography>
                        <Typography fontWeight={700} fontSize={12}>{s.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      {['Ticket #', 'Pawn Date', 'Pawn Amount', 'Redeemed'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, py: 0.75 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pawnHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 12 }}>No history found</TableCell>
                      </TableRow>
                    ) : pawnHistory.map(row => (
                      <TableRow key={row.pawn_ticket_id} hover>
                        <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', py: 0.75 }}>{row.pawn_ticket_id}</TableCell>
                        <TableCell sx={{ fontSize: 12, py: 0.75 }}>{fmtDate(row.pawn_date)}</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600, py: 0.75 }}>{fmt(row.pawn_amount)}</TableCell>
                        <TableCell sx={{ fontSize: 12, py: 0.75 }}>
                          {row.status === 'REDEEMED'  ? fmtDate(row.redeemed_date) :
                           row.status === 'FORFEITED' ? <Chip label="Forfeited" size="small" sx={{ bgcolor: '#fce4ec', color: '#c62828', fontSize: 10, height: 18 }} /> :
                           '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </Paper>

          {/* Pawn Amount */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
            <Typography fontWeight={700} fontSize={13} color={PURPLE} sx={{ mb: 1.5, letterSpacing: 0.5 }}>PAWN AMOUNT</Typography>
            {histStats && (
              <Box sx={{ mb: 1.5, p: 1.25, bgcolor: '#f3e5f5', borderRadius: 1.5 }}>
                <Typography fontWeight={800} fontSize={18} color={PURPLE}>
                  {fmt(histStats.min)} – {fmt(histStats.max)}
                </Typography>
                <Typography variant="caption" color="text.secondary">Based on this item's pawn history.</Typography>
              </Box>
            )}
            <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
              Pawn Amount <Typography component="span" color="error" variant="caption">*</Typography>
            </Typography>
            <TextField
              fullWidth size="small"
              type="number"
              value={pawnAmount}
              onChange={e => setPawnAmount(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary', fontSize: 14 }}>$</Typography> }}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
            <Box sx={{ flex: 1 }} />
            <Button fullWidth variant="outlined" onClick={onBack}
              sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5, borderColor: '#ccc', color: 'text.secondary', '&:hover': { bgcolor: '#f5f5f5', borderColor: '#999' } }}>
              This is not the same item
            </Button>
          </Paper>
        </Box>

        {/* Notes */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0', display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110, pt: 1, flexShrink: 0 }}>Notes (optional)</Typography>
          <TextField fullWidth size="small" multiline rows={2}
            placeholder="Add any notes about this re-pawn item…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          />
        </Paper>
      </Box>

      {/* Footer action bar */}
      <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #e0e0e0', bgcolor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<MuiIcons.Close />} onClick={onCancel}
            sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#ccc', color: 'text.secondary', '&:hover': { borderColor: '#999' } }}>
            Cancel
          </Button>
          <Button variant="outlined" startIcon={<MuiIcons.ArrowBack />} onClick={onBack}
            sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#ccc', color: 'text.secondary', '&:hover': { borderColor: '#999' } }}>
            Back to Re-Pawn List
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<MuiIcons.CheckCircle />} onClick={() => handleSave(false)}
            sx={{ textTransform: 'none', borderRadius: 2, bgcolor: PURPLE, '&:hover': { bgcolor: PURPLE_DARK } }}>
            Save Item to Ticket
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
