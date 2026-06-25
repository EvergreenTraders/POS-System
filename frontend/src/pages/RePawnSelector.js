import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, CircularProgress, Button, Chip,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';

const PURPLE      = '#6a1b9a';
const PURPLE_DARK = '#4a148c';

export default function RePawnSelector({ customer, onBack, onSelectItem }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!customer?.id) return;
    const token = localStorage.getItem('token');
    axios.get(`${config.apiUrl}/customers/${customer.id}/repawn-candidates`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => setCandidates(res.data || []))
      .catch(err => console.error('Error fetching repawn candidates:', err))
      .finally(() => setLoading(false));
  }, [customer?.id]);

  const backendBase = config.apiUrl.replace('/api', '');

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', bgcolor: '#f5f6fa' }}>
      {/* Breadcrumb */}
      <Box sx={{ bgcolor: PURPLE, color: 'white', px: 2.5, py: 0.875, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" sx={{ cursor: 'pointer', opacity: 0.8, '&:hover': { opacity: 1 } }} onClick={onBack}>
          Pawn Transaction
        </Typography>
        <MuiIcons.ChevronRight sx={{ fontSize: 16, opacity: 0.6 }} />
        <Typography variant="body2" fontWeight={700}>Re-Pawn Selector</Typography>
      </Box>

      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MuiIcons.Refresh sx={{ fontSize: 18, color: 'white' }} />
          </Box>
          <Typography variant="h6" fontWeight={800} letterSpacing={0.5}>RE-PAWN SELECTOR</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select a previously redeemed item to re-pawn for{' '}
          <strong>{customer?.first_name} {customer?.last_name}</strong>.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: PURPLE }} />
          </Box>
        ) : candidates.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <MuiIcons.Inventory2 sx={{ fontSize: 52, color: '#d0d0d0', mb: 1.5 }} />
            <Typography fontWeight={600} color="text.secondary">No previously redeemed items found.</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              This customer has no redeemed or forfeited pawn tickets.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {candidates.map(item => {
              const rawUrl = Array.isArray(item.images) && item.images[0]?.url;
              const thumb = rawUrl
                ? (rawUrl.startsWith('http') ? rawUrl : `${backendBase}${rawUrl}`)
                : null;
              return (
                <Paper key={item.item_id} elevation={0} sx={{ p: 2, borderRadius: 2, display: 'flex', gap: 2, alignItems: 'center', border: '1px solid #e0e0e0', bgcolor: 'white', '&:hover': { borderColor: PURPLE, boxShadow: `0 0 0 1px ${PURPLE}40` }, transition: 'all 0.15s' }}>
                  {thumb ? (
                    <Box component="img" src={thumb} sx={{ width: 68, height: 68, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0, border: '1px solid #e0e0e0' }} />
                  ) : (
                    <Box sx={{ width: 68, height: 68, borderRadius: 1.5, bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MuiIcons.Diamond sx={{ fontSize: 28, color: '#c0c0c0' }} />
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} fontSize={14} noWrap>
                      {item.short_desc || item.long_desc || 'Unnamed Item'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.category} · Ticket #{item.last_ticket_id}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2.5, mt: 0.5 }}>
                      <Typography variant="caption">
                        {item.source_type === 'sale' ? 'Sale Price' : 'Last Amount'}: <strong>${parseFloat(item.item_price || 0).toFixed(2)}</strong>
                      </Typography>
                      <Typography variant="caption">
                        {item.source_type === 'sale' ? 'Purchased' : 'Last Pawned'}: <strong>{fmtDate(item.last_pawn_date)}</strong>
                      </Typography>
                      {item.source_type !== 'sale' && item.last_status_date && (
                        <Typography variant="caption">
                          {item.ticket_status === 'FORFEITED' ? 'Forfeited' : 'Redeemed'}: <strong>{fmtDate(item.last_status_date)}</strong>
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Chip
                    label={item.ticket_status}
                    size="small"
                    sx={{
                      bgcolor: item.ticket_status === 'REDEEMED'  ? '#e8f5e9'
                             : item.ticket_status === 'PURCHASED' ? '#e3f2fd'
                             : '#fce4ec',
                      color:   item.ticket_status === 'REDEEMED'  ? '#2e7d32'
                             : item.ticket_status === 'PURCHASED' ? '#1565c0'
                             : '#c62828',
                      fontWeight: 700, fontSize: 11, mr: 1, flexShrink: 0,
                    }}
                  />
                  <Button variant="contained" onClick={() => onSelectItem(item)} sx={{ textTransform: 'none', bgcolor: PURPLE, '&:hover': { bgcolor: PURPLE_DARK }, borderRadius: 2, flexShrink: 0, px: 2.5 }}>
                    Select
                  </Button>
                </Paper>
              );
            })}
          </Box>
        )}
      </Box>

      <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #e0e0e0', bgcolor: 'white' }}>
        <Button variant="outlined" startIcon={<MuiIcons.ArrowBack />} onClick={onBack}
          sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#ccc', color: 'text.secondary', '&:hover': { borderColor: PURPLE, color: PURPLE, bgcolor: '#f3e5f5' } }}>
          Back to Pawn Transaction
        </Button>
      </Box>
    </Box>
  );
}
