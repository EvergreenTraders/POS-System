import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, Grid, Avatar, Button, IconButton, Chip,
  Divider, TextField, InputAdornment, Badge, Tooltip, Stack, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import PawnTransactionScreen from './PawnTransactionScreen';
import SaleTransactionScreen from './SaleTransactionScreen';
import BuyTransactionScreen from './BuyTransactionScreen';
import TradeTransactionScreen from './TradeTransactionScreen';
import PaymentTransactionScreen from './PaymentTransactionScreen';

const GREEN = '#1a472a';
const GREEN_LIGHT = '#2d6a4f';
const BUY_BLUE = '#0284c7';

// Maps workspace transaction type to the localStorage keys each ticket screen uses
// to track voided ticket numbers (so they're never reused) and the in-flight
// "pending" ticket id (so a voided-but-uncommitted id isn't handed out again).
const VOID_STORAGE_KEYS = {
  PAWN:  { voided: 'voidedPawnTickets',  pending: 'pendingPTTicketId' },
  BUY:   { voided: 'voidedBuyTickets',   pending: 'pendingBTTicketId' },
  TRADE: { voided: 'voidedTradeTickets', pending: 'pendingTTTicketId' },
  SALE:  { voided: 'voidedSaleTickets',  pending: 'pendingSTTicketId' },
};

function voidTicketId(type, ticketId) {
  const keys = VOID_STORAGE_KEYS[type];
  if (!keys || !ticketId) return;
  const voided = JSON.parse(localStorage.getItem(keys.voided) || '[]');
  if (!voided.includes(ticketId)) {
    voided.push(ticketId);
    localStorage.setItem(keys.voided, JSON.stringify(voided));
  }
  if (localStorage.getItem(keys.pending) === ticketId) {
    localStorage.removeItem(keys.pending);
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

const PAWN_ACCENT = '#6a1b9a';

function PawnTransactionCard({ tx, pawnIcon, pawnColor, onOpen, onVoid }) {
  const totalPawnAmount = Number(tx.totalPawnAmount) || 0;
  const costToRedeem = Number(tx.costToRedeem) || 0;
  const fmt = (n) => `$${Number(n).toFixed(2)}`;
  const overduePawnCount = tx.overduePawnCount ?? 0;
  const accent = pawnColor || PAWN_ACCENT;
  const PawnIconComponent = pawnIcon ? (MuiIcons[pawnIcon] ?? MuiIcons.Casino) : MuiIcons.Casino;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#e0e0e0' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1, borderLeft: `4px solid ${accent}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PawnIconComponent sx={{ fontSize: 20, color: accent }} />
          <Typography fontWeight={700} fontSize={13} color={accent}>PAWN</Typography>
        </Box>
        <Chip label={tx.ticketId} size="small"
          sx={{ fontWeight: 700, fontSize: 11, height: 20, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }} />
      </Box>

      <Box sx={{ px: 1.5, pb: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
          <Chip
            icon={<MuiIcons.ShoppingBag sx={{ fontSize: 14 }} />}
            label={`${tx.pawnItems?.length || 0} ${(tx.pawnItems?.length || 0) === 1 ? 'item' : 'items'}`}
            size="small"
            sx={{ fontSize: 12, height: 24, bgcolor: '#e3f2fd', color: '#1565c0', '& .MuiChip-icon': { color: '#1565c0' } }}
          />
          <Chip label="Active" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: '#1565c0', color: '#fff' }} />
        </Box>

        {/* Item rows */}
        {(tx.pawnItems || []).map((item, i) => {
          const thumb = item.images?.find(img => img.isPrimary)?.url || item.images?.[0]?.url;
          return (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid #f0f0f0' }}>
              {thumb ? (
                <Box component="img" src={thumb} alt="" sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: '#f5f5f5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MuiIcons.Inventory2 sx={{ fontSize: 20, color: '#bdbdbd' }} />
                </Box>
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" fontWeight={600} display="block" noWrap>{item.item}</Typography>
                <Typography variant="caption" color="text.secondary">Pawn Amount: {fmt(item.amount)}</Typography>
              </Box>
            </Box>
          );
        })}

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption">Total Pawn Amount</Typography>
          <Typography variant="caption" fontWeight={600}>{fmt(totalPawnAmount)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption">Due Date</Typography>
          <Typography variant="caption" fontWeight={700}>{tx.dueDate || '—'}</Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" fontWeight={600} color={PAWN_ACCENT}>Cost to Redeem</Typography>
          <Typography variant="caption" fontWeight={700} color={PAWN_ACCENT}>{fmt(costToRedeem)}</Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" fontWeight={600} color="#c62828">Net Effect</Typography>
          <Typography variant="caption" fontWeight={700} color="#c62828">-{fmt(totalPawnAmount)}</Typography>
        </Box>

        {tx.overduePawnCount > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: '#fef2f2', borderRadius: 1, px: 1, py: 0.75, mb: 1 }}>
            <MuiIcons.Warning sx={{ fontSize: 15, color: '#dc2626', flexShrink: 0 }} />
            <Typography variant="caption" color="#dc2626">
              Customer has {tx.overduePawnCount} overdue {tx.overduePawnCount === 1 ? 'pawn' : 'pawns'}.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<MuiIcons.OpenInNew sx={{ fontSize: 13 }} />}
            onClick={onOpen}
            sx={{ flex: 1, fontSize: 11 }}>
            Open
          </Button>
          <IconButton size="small" color="error" onClick={onVoid}
            sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 1 }}>
            <MuiIcons.Block fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}

function SaleTransactionCard({ tx, saleIcon, saleColor, onOpen, onVoid }) {
  const fmt = (n) => `$${Number(n).toFixed(2)}`;
  const accent = saleColor || GREEN;
  const SaleIconComponent = saleIcon ? (MuiIcons[saleIcon] ?? MuiIcons.ShoppingCart) : MuiIcons.ShoppingCart;
  const items = tx.saleItems || [];
  const itemCount = items.length;
  const subtotal = tx.subtotal || items.reduce((s, i) => s + i.price * (i.quantity || 1), 0);
  const itemDiscounts = tx.itemDiscounts || items.reduce((s, i) => s + (i.discount || 0) * (i.quantity || 1), 0);
  const totalDiscount = itemDiscounts + (tx.globalDiscount || 0);
  const taxAmt = tx.taxAmt || 0;
  const total = tx.total || 0;
  const SHOW = 2;
  const shownItems = items.slice(0, SHOW);
  const moreCount = itemCount - SHOW;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#e0e0e0' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1, borderLeft: `4px solid ${accent}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SaleIconComponent sx={{ fontSize: 20, color: accent }} />
          <Typography fontWeight={700} fontSize={13} color={accent}>SALE</Typography>
        </Box>
        <Chip label={tx.ticketId} size="small"
          sx={{ fontWeight: 700, fontSize: 11, height: 20, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }} />
      </Box>

      <Box sx={{ px: 1.5, pb: 1.25 }}>
        {/* Items count + Active chip */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
          <Chip
            icon={<MuiIcons.ShoppingBag sx={{ fontSize: 14 }} />}
            label={`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
            size="small"
            sx={{ fontSize: 12, height: 24, bgcolor: '#e3f2fd', color: '#1565c0', '& .MuiChip-icon': { color: '#1565c0' } }}
          />
          <Chip label="Active" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: '#1565c0', color: '#fff' }} />
        </Box>

        {/* Item rows */}
        {shownItems.map((item, i) => {
          const thumb = item.images?.find(img => img.is_primary || img.isPrimary)?.url || item.images?.[0]?.url;
          const ppAmt = item.protectionPlan ? item.price * 0.15 : 0;
          const accs  = item.accessories || [];
          return (
            <Box key={i} sx={{ borderBottom: '1px solid #f0f0f0' }}>
              {/* Item row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75 }}>
                {thumb ? (
                  <Box component="img" src={thumb} alt="" sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: '#f5f5f5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MuiIcons.Inventory2 sx={{ fontSize: 20, color: '#bdbdbd' }} />
                  </Box>
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" fontWeight={600} display="block" noWrap>{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{fmt(item.price * (item.quantity || 1))}</Typography>
                </Box>
              </Box>

              {/* Protection Plan sub-row */}
              {item.protectionPlan && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 1, py: 0.4, bgcolor: '#f0f7ff' }}>
                  <MuiIcons.Security sx={{ fontSize: 12, color: '#1565c0' }} />
                  <Typography fontSize={11} color="#1565c0" fontStyle="italic" flex={1}>Protection Plan (15%)</Typography>
                  <Typography fontSize={11} color="#1565c0" fontWeight={600}>{fmt(ppAmt)}</Typography>
                </Box>
              )}

              {/* Accessory sub-rows */}
              {accs.map(acc => (
                <Box key={acc.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 6, py: 0.4, bgcolor: '#fafafa' }}>
                  <MuiIcons.Extension sx={{ fontSize: 12, color: '#607d8b' }} />
                  <Typography fontSize={11} color="text.secondary" fontStyle="italic" flex={1} noWrap>{acc.name}</Typography>
                  <Typography fontSize={11} fontWeight={600}>{fmt(acc.price)}</Typography>
                </Box>
              ))}
            </Box>
          );
        })}
        {moreCount > 0 && (
          <Typography fontSize={13} color="#1565c0" sx={{ cursor: 'pointer', mt: 0.25 }} onClick={onOpen}>
            + {moreCount} more {moreCount === 1 ? 'item' : 'items'}
          </Typography>
        )}

        <Divider sx={{ my: 1.25 }} />

        {/* Financials */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
          <Typography fontSize={13} color="text.secondary">Subtotal:</Typography>
          <Typography fontSize={13}>{fmt(subtotal)}</Typography>
        </Box>
        {totalDiscount > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
            <Typography fontSize={13} color="text.secondary">Discounts:</Typography>
            <Typography fontSize={13} color="error.main">-{fmt(totalDiscount)}</Typography>
          </Box>
        )}
        {taxAmt > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
            <Typography fontSize={13} color="text.secondary">Tax:</Typography>
            <Typography fontSize={13}>{fmt(taxAmt)}</Typography>
          </Box>
        )}
        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" fontWeight={600} color="#1a472a">Net Effect</Typography>
          <Typography variant="caption" fontWeight={700} color="#1a472a">+{fmt(total)}</Typography>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<MuiIcons.OpenInNew sx={{ fontSize: 13 }} />}
            onClick={onOpen}
            sx={{ flex: 1, fontSize: 11 }}>
            Open
          </Button>
          <IconButton size="small" color="error" onClick={onVoid}
            sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 1 }}>
            <MuiIcons.Block fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}

const PAYMENT_AMBER = '#d97706';

function PaymentTransactionCard({ tx, onOpen, onVoid }) {
  const fmt = (n) => `$${Number(n).toFixed(2)}`;
  const pawnCount = (tx.selectedPayments || []).filter(p => p.type === 'pawn_extension').length;
  const layawayCount = (tx.selectedPayments || []).filter(p => p.type === 'layaway').length;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#e0e0e0' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1, borderLeft: `4px solid ${PAYMENT_AMBER}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MuiIcons.Payment sx={{ fontSize: 20, color: PAYMENT_AMBER }} />
          <Typography fontWeight={700} fontSize={13} color={PAYMENT_AMBER}>PAYMENT</Typography>
        </Box>
        <Chip label={tx.ticketId} size="small"
          sx={{ fontWeight: 700, fontSize: 11, height: 20, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }} />
      </Box>

      <Box sx={{ px: 1.5, pb: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75, mt: 0.75 }}>
          {pawnCount > 0 && (
            <Chip icon={<MuiIcons.LocalOffer sx={{ fontSize: 14 }} />}
              label={`${pawnCount} pawn ext.`} size="small"
              sx={{ fontSize: 11, height: 22, bgcolor: '#fef3c7', color: PAYMENT_AMBER, '& .MuiChip-icon': { color: PAYMENT_AMBER } }} />
          )}
          {layawayCount > 0 && (
            <Chip icon={<MuiIcons.CalendarMonth sx={{ fontSize: 14 }} />}
              label={`${layawayCount} layaway`} size="small"
              sx={{ fontSize: 11, height: 22, bgcolor: '#ede9fe', color: '#7c3aed', '& .MuiChip-icon': { color: '#7c3aed' } }} />
          )}
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Pawn Extensions</Typography>
          <Typography variant="caption" fontWeight={600}>{fmt(tx.pawnTotal || 0)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Layaway Payments</Typography>
          <Typography variant="caption" fontWeight={600}>{fmt(tx.layawayTotal || 0)}</Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" fontWeight={600} color={PAYMENT_AMBER}>Total Payment</Typography>
          <Typography variant="caption" fontWeight={700} color={PAYMENT_AMBER}>{fmt(tx.totalPayment || 0)}</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<MuiIcons.OpenInNew sx={{ fontSize: 13 }} />}
            onClick={onOpen}
            sx={{ flex: 1, fontSize: 11, borderColor: PAYMENT_AMBER, color: PAYMENT_AMBER, '&:hover': { borderColor: '#b45309' } }}>
            Open
          </Button>
          <IconButton size="small" color="error" onClick={onVoid}
            sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 1 }}>
            <MuiIcons.Block fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}

function TransactionTypeButton({ label, icon, color, onClick, count }) {
  return (
    <Badge badgeContent={count || 0} color="primary" overlap="rectangular"
      sx={{ '& .MuiBadge-badge': { fontSize: 9, minWidth: 16, height: 16, top: 4, right: 4 } }}>
      <Paper
        variant="outlined"
        onClick={onClick}
        sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          p: { md: 1, xl: 0.75 }, cursor: 'pointer', borderRadius: 2, borderColor: '#e0e0e0',
          minWidth: { md: 70, xl: 60 },
          '&:hover': { bgcolor: '#f5f5f5', borderColor: color },
          transition: 'all 0.15s',
        }}
      >
        <Box sx={{ color, mb: 0.25, '& svg': { fontSize: { md: 24, xl: 20 } } }}>{icon}</Box>
        <Typography align="center" fontWeight={500} sx={{ fontSize: { md: 10, xl: 9 }, color }}>{label}</Typography>
      </Paper>
    </Badge>
  );
}

// ── Workspace localStorage helpers (mirrors CustomerTicket.js pattern) ────────

const WORKSPACE_EXPIRY_MS = 24 * 60 * 60 * 1000;

function saveWorkspaceForId(customerId, transactions) {
  try {
    const key = customerId ? `workspace_${customerId}` : 'workspace_global';
    localStorage.setItem(key, JSON.stringify({ transactions, timestamp: Date.now() }));
  } catch (e) {
    console.error('Error saving workspace:', e);
  }
}

function loadWorkspaceForId(customerId) {
  try {
    const key = customerId ? `workspace_${customerId}` : 'workspace_global';
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.timestamp) {
      if (Date.now() - parsed.timestamp > WORKSPACE_EXPIRY_MS) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed.transactions;
    }
    return null;
  } catch (e) {
    console.error('Error loading workspace:', e);
    return null;
  }
}

function cleanupExpiredWorkspaces() {
  try {
    const now = Date.now();
    Object.keys(localStorage)
      .filter(k => k.startsWith('workspace_'))
      .forEach(key => {
        try {
          const parsed = JSON.parse(localStorage.getItem(key));
          if (parsed?.timestamp && now - parsed.timestamp > WORKSPACE_EXPIRY_MS) {
            localStorage.removeItem(key);
          }
        } catch (e) { /* skip invalid entries */ }
      });
  } catch (e) {
    console.error('Error cleaning up expired workspaces:', e);
  }
}

function BuyTransactionCard({ tx, buyIcon, buyColor, onOpen, onVoid }) {
  const fmt    = (n) => `$${Number(n).toFixed(2)}`;
  const accent = buyColor || BUY_BLUE;
  const BuyIconComponent = buyIcon ? (MuiIcons[buyIcon] ?? MuiIcons.ShoppingBag) : MuiIcons.ShoppingBag;
  const items     = tx.buyItems || [];
  const totalPaid = tx.totalPaid || items.reduce((s, i) => s + (parseFloat(i.paid) || 0) * (parseInt(i.qty) || 1), 0);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#e0e0e0' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1, borderLeft: `4px solid ${accent}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BuyIconComponent sx={{ fontSize: 20, color: accent }} />
          <Typography fontWeight={700} fontSize={13} color={accent}>BUY</Typography>
        </Box>
        <Chip label={tx.ticketId} size="small"
          sx={{ fontWeight: 700, fontSize: 11, height: 20, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }} />
      </Box>

      <Box sx={{ px: 1.5, pb: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
          <Chip icon={<MuiIcons.ShoppingBag sx={{ fontSize: 14 }} />}
            label={`${items.length} ${items.length === 1 ? 'item' : 'items'}`}
            size="small"
            sx={{ fontSize: 12, height: 24, bgcolor: '#fef3c7', color: accent, '& .MuiChip-icon': { color: accent } }} />
          <Chip label="Active" size="small"
            sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: accent, color: '#fff' }} />
        </Box>

        {items.slice(0, 2).map((item, i) => {
          const thumb = item.images?.find(img => img.isPrimary)?.url || item.images?.[0]?.url;
          return (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid #f0f0f0' }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: '#f5f5f5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {thumb
                ? <Box component="img" src={thumb} alt="" sx={{ width: 36, height: 36, objectFit: 'cover' }} />
                : <MuiIcons.Inventory2 sx={{ fontSize: 18, color: '#bdbdbd' }} />}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" fontWeight={600} display="block" noWrap>{item.description || item.part_no}</Typography>
              <Typography variant="caption" color="text.secondary">{item.category_name || '—'}</Typography>
            </Box>
            <Typography variant="caption" fontWeight={700} color={accent}>{fmt(item.paid)}</Typography>
          </Box>
          );
        })}
        {items.length > 2 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', py: 0.5 }}>
            +{items.length - 2} more item(s)
          </Typography>
        )}

        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" fontWeight={600} color={accent}>Total Paid to Customer</Typography>
          <Typography variant="caption" fontWeight={700} color={accent}>{fmt(totalPaid)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" fontWeight={600} color="#c62828">Net Effect</Typography>
          <Typography variant="caption" fontWeight={700} color="#c62828">-{fmt(totalPaid)}</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<MuiIcons.OpenInNew sx={{ fontSize: 13 }} />}
            onClick={onOpen} sx={{ flex: 1, fontSize: 11, borderColor: accent, color: accent, '&:hover': { borderColor: accent } }}>
            Open
          </Button>
          <IconButton size="small" color="error" onClick={onVoid}
            sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 1 }}>
            <MuiIcons.Block fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}

function TradeTransactionCard({ tx, tradeIcon, tradeColor, onOpen, onVoid }) {
  const fmt    = (n) => `$${Number(n || 0).toFixed(2)}`;
  const accent = tradeColor || '#0891b2';
  const TradeIconComponent = tradeIcon ? (MuiIcons[tradeIcon] ?? MuiIcons.Balance) : MuiIcons.Balance;
  const tradeItems = tx.tradeItems || [];
  const saleItems  = tx.saleItems  || [];
  const net        = Number(tx.netDueToCustomer || 0);
  const taxAmt     = Number(tx.taxAmount || 0);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#e0e0e0' }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1, borderLeft: `4px solid ${accent}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TradeIconComponent sx={{ fontSize: 20, color: accent }} />
          <Typography fontWeight={700} fontSize={13} color={accent}>TRADE</Typography>
        </Box>
        <Chip label={tx.ticketId} size="small"
          sx={{ fontWeight: 700, fontSize: 11, height: 20, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }} />
      </Box>

      {/* ── Trading In + Receiving side-by-side ── */}
      <Box sx={{ display: 'flex', gap: 1.25, px: 1.5, pt: 1.25, pb: 0 }}>
        {[
          { label: 'Trading In', icon: 'MoveToInbox', count: tradeItems.length, amount: tx.totalTradeAllowance },
          { label: 'Receiving',  icon: 'Outbox',      count: saleItems.length,  amount: tx.totalSaleAfterTax  },
        ].map(({ label, icon, count, amount }) => {
          const Icon = MuiIcons[icon];
          return (
            <Paper key={label} variant="outlined" sx={{ flex: 1, minWidth: 0, px: 1.25, py: 1, borderRadius: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography fontWeight={700} fontSize={12} color={accent}>{label}</Typography>
                <Icon sx={{ fontSize: 16, color: accent, opacity: 0.7 }} />
              </Box>
              <Typography fontSize={11} color="text.secondary" mb={0.5}>{count} item{count !== 1 ? 's' : ''}</Typography>
              <Typography fontWeight={800} fontSize={16}>{fmt(amount)}</Typography>
            </Paper>
          );
        })}
      </Box>

      {/* ── Tax + Net ── */}
      
        <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 1.5, pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Tax Rule</Typography>
          <Typography variant="caption">Tax on Difference</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">Tax ({(tx.taxRate * 100 || 0).toFixed(1)}%)</Typography>
          <Typography variant="caption">{fmt(taxAmt)}</Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" fontWeight={600} color={net <= 0 ? '#1a472a' : '#c62828'}>Net Effect</Typography>
          <Typography variant="caption" fontWeight={700} color={net <= 0 ? '#1a472a' : '#c62828'}>
            {net <= 0 ? '+' : '-'}{fmt(Math.abs(net))}
          </Typography>
        </Box>
      </Box>


      {/* ── Action buttons ── */}
      <Box sx={{ px: 1.5, pb: 1.5, display: 'flex', gap: 1 }}>
        <Button size="small" variant="outlined" startIcon={<MuiIcons.OpenInNew sx={{ fontSize: 13 }} />}
          onClick={onOpen}
          sx={{ flex: 1, fontSize: 11, borderRadius: 2, color: accent, borderColor: accent, textTransform: 'none', '&:hover': { bgcolor: '#e0f9ff' } }}>
          Open
        </Button>
        <IconButton size="small" color="error" onClick={onVoid}
          sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 1 }}>
          <MuiIcons.Block fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ModernTransactions() {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [pawnOpen, setPawnOpen]           = useState(false);
  const [buyOpen, setBuyOpen] = useState(() => {
    if (location.state?.customerUpdated) {
      const raw = sessionStorage.getItem('pendingBuyState');
      return !!raw;
    }
    if (location.state?.returnToBuy) {
      const raw = sessionStorage.getItem('pendingBuyReturn');
      return !!raw;
    }
    return false;
  });
  const [existingBuyData, setExistingBuyData] = useState(() => {
    if (location.state?.customerUpdated) {
      const raw = sessionStorage.getItem('pendingBuyState');
      if (!raw) return null;
      try {
        const { ticketId, buyItems, buyPawnNotes, ticketNote, showOnReceipt } = JSON.parse(raw);
        return { ticketId, buyItems, buyPawnNotes, ticketNote, showOnReceipt };
      } catch { return null; }
    }
    if (location.state?.returnToBuy) {
      const raw = sessionStorage.getItem('pendingBuyReturn');
      if (!raw) return null;
      try {
        const { ticketId, buyItems, buyPawnNotes, ticketNote, showOnReceipt } = JSON.parse(raw);
        return { ticketId, buyItems, buyPawnNotes, ticketNote, showOnReceipt };
      } catch { return null; }
    }
    return null;
  });
  const [saleOpen, setSaleOpen]           = useState(() => {
    if (location.state?.returnToSale) {
      const raw = sessionStorage.getItem('pendingSaleReturn');
      return !!raw;
    }
    return false;
  });
  const [openingTxId, setOpeningTxId]     = useState(null);
  const [restoredPawnData, setRestoredPawnData] = useState(null);
  const [existingSaleData, setExistingSaleData] = useState(() => {
    if (location.state?.returnToSale) {
      const raw = sessionStorage.getItem('pendingSaleReturn');
      if (!raw) return null;
      try {
        const { ticketId, saleItems, ticketNote, showOnReceipt, globalDiscount } = JSON.parse(raw);
        return { ticketId, saleItems, ticketNote, showOnReceipt, globalDiscount };
      } catch { return null; }
    }
    return null;
  });
  const [tradeOpen, setTradeOpen]         = useState(() => {
    if (location.state?.customerUpdated) {
      const raw = sessionStorage.getItem('pendingTradeState');
      return !!raw;
    }
    if (location.state?.returnToTrade) {
      const raw = sessionStorage.getItem('pendingTradeReturn');
      return !!raw;
    }
    return false;
  });
  const [existingTradeData, setExistingTradeData] = useState(() => {
    if (location.state?.customerUpdated) {
      const raw = sessionStorage.getItem('pendingTradeState');
      if (!raw) return null;
      try {
        const { ticketId, tradeItems, saleItems, ticketNote, showOnReceipt, isStoreCreditNet, buyTicketId, saleTicketId } = JSON.parse(raw);
        return { ticketId, tradeItems, saleItems, ticketNote, showOnReceipt, isStoreCreditNet, buyTicketId, saleTicketId };
      } catch { return null; }
    }
    if (location.state?.returnToTrade) {
      const raw = sessionStorage.getItem('pendingTradeReturn');
      if (!raw) return null;
      try {
        const { ticketId, tradeItems, saleItems, ticketNote, showOnReceipt, isStoreCreditNet, buyTicketId, saleTicketId } = JSON.parse(raw);
        return { ticketId, tradeItems, saleItems, ticketNote, showOnReceipt, isStoreCreditNet, buyTicketId, saleTicketId };
      } catch { return null; }
    }
    return null;
  });
  const [paymentOpen, setPaymentOpen] = useState(() => {
    if (location.state?.customerUpdated) {
      const raw = sessionStorage.getItem('pendingPaymentState');
      return !!raw;
    }
    if (location.state?.returnToPayment) {
      const raw = sessionStorage.getItem('pendingPaymentReturn');
      return !!raw;
    }
    return false;
  });
  const [existingPaymentData, setExistingPaymentData] = useState(() => {
    if (location.state?.customerUpdated) {
      const raw = sessionStorage.getItem('pendingPaymentState');
      if (!raw) return null;
      try {
        const { ticketId, selectedPayments, notes, ticketNote, showOnReceipt } = JSON.parse(raw);
        return { ticketId, selectedPayments, notes, ticketNote, showOnReceipt };
      } catch { return null; }
    }
    if (location.state?.returnToPayment) {
      const raw = sessionStorage.getItem('pendingPaymentReturn');
      if (!raw) return null;
      try {
        const { ticketId, selectedPayments, notes, ticketNote, showOnReceipt } = JSON.parse(raw);
        return { ticketId, selectedPayments, notes, ticketNote, showOnReceipt };
      } catch { return null; }
    }
    return null;
  });
  const [voidConfirm, setVoidConfirm]     = useState(null); // workspace tx to void
  const [noCustomerWarning, setNoCustomerWarning] = useState(false);
  const [workspaceTransactions, setWorkspaceTransactions] = useState([]);

  // Refs for localStorage persistence (mirrors CustomerTicket.js pattern)
  const customerIdRef = useRef(undefined);
  const workspaceTransactionsRef = useRef(workspaceTransactions);
  const initialLoadCompleteRef = useRef(false);

  // Customer state
  const [customer, setCustomer] = useState(null);
  const [customerStats, setCustomerStats] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    axios.get(`${config.apiUrl}/transaction-types`)
      .then(res => setTransactionTypes(res.data))
      .catch(err => console.error('Failed to load transaction types:', err));
  }, []);

  // Clean up expired workspace entries on mount
  useEffect(() => { cleanupExpiredWorkspaces(); }, []);

  // On customer change: save old customer's workspace, load new customer's workspace
  useEffect(() => {
    const prevId = customerIdRef.current;
    const newId = customer?.id;
    const customerChanged = prevId !== newId;

    if (!initialLoadCompleteRef.current || customerChanged) {
      if (customerChanged && prevId !== undefined) {
        saveWorkspaceForId(prevId, workspaceTransactionsRef.current);
      }
      const saved = loadWorkspaceForId(newId);
      setWorkspaceTransactions(saved || []);
      customerIdRef.current = newId;
      initialLoadCompleteRef.current = true;
    }
  }, [customer?.id]);

  // Keep ref in sync and auto-save to localStorage whenever workspace changes
  useEffect(() => {
    workspaceTransactionsRef.current = workspaceTransactions;
    if (initialLoadCompleteRef.current) {
      saveWorkspaceForId(customer?.id, workspaceTransactions);
    }
  }, [workspaceTransactions, customer?.id]);

  // When customerStats loads, refresh overduePawnCount on all PAWN cards in the workspace
  // (handles stale localStorage cards and race conditions during card creation)
  useEffect(() => {
    if (!customerStats) return;
    setWorkspaceTransactions(prev =>
      prev.map(tx =>
        tx.type === 'PAWN'
          ? { ...tx, overduePawnCount: customerStats.overdue_pawns ?? 0 }
          : tx
      )
    );
  }, [customerStats]);

  // Restore pawn screen after returning from Checkout (user pressed Cancel/Back)
  useEffect(() => {
    if (!location.state?.returnToPawn) return;
    const raw = sessionStorage.getItem('pendingPawnReturn');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingPawnReturn');
    const { customerId, ticketId, pawnItems, totalPawnAmount, ticketNote, showOnReceipt } = pending;
    if (!customerId) return;
    (async () => {
      try {
        const [custRes, statsRes] = await Promise.all([
          axios.get(`${config.apiUrl}/customers/${customerId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          axios.get(`${config.apiUrl}/customers/${customerId}/pawn/stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
        ]);
        setCustomer(custRes.data);
        setCustomerStats(statsRes.data);
        setRestoredPawnData({ ticketId, pawnItems, totalPawnAmount, ticketNote, showOnReceipt });
        setPawnOpen(true);
      } catch (err) {
        console.error('Failed to restore pawn session after checkout cancel:', err);
      }
    })();
  }, [location.state]);

  // Refresh customer data after returning from Checkout; saleOpen/existingSaleData seeded in useState.
  useEffect(() => {
    if (!location.state?.returnToSale) return;
    const raw = sessionStorage.getItem('pendingSaleReturn');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingSaleReturn');
    const { customerId, customer: savedCustomer } = pending;
    if (savedCustomer) setCustomer(savedCustomer);
    if (customerId) {
      axios.get(`${config.apiUrl}/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then(res => setCustomer(res.data))
        .catch(err => console.error('Failed to refresh customer after sale checkout cancel:', err));
    }
  }, [location.state]);

  // Refresh customer data after returning from Checkout via Buy Ticket breadcrumb; buyOpen/existingBuyData seeded in useState.
  useEffect(() => {
    if (!location.state?.returnToBuy) return;
    const raw = sessionStorage.getItem('pendingBuyReturn');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingBuyReturn');
    const { customerId, customer: savedCustomer } = pending;
    if (savedCustomer) setCustomer(savedCustomer);
    if (customerId) {
      axios.get(`${config.apiUrl}/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then(res => setCustomer(res.data))
        .catch(err => console.error('Failed to refresh customer after buy checkout cancel:', err));
    }
  }, [location.state]);

  // Refresh customer data after returning from Checkout via Trade Ticket breadcrumb; tradeOpen/existingTradeData seeded in useState.
  useEffect(() => {
    if (!location.state?.returnToTrade) return;
    const raw = sessionStorage.getItem('pendingTradeReturn');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingTradeReturn');
    const { customerId, customer: savedCustomer } = pending;
    if (savedCustomer) setCustomer(savedCustomer);
    if (customerId) {
      axios.get(`${config.apiUrl}/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then(res => setCustomer(res.data))
        .catch(err => console.error('Failed to refresh customer after trade checkout cancel:', err));
    }
  }, [location.state]);

  // Restore pawn screen after returning from CustomerEditor
  useEffect(() => {
    if (!location.state?.customerUpdated) return;
    const raw = sessionStorage.getItem('pendingPawnState');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingPawnState');
    const { customerId, ticketId, pawnItems, totalPawnOverride } = pending;
    if (!customerId) return;
    (async () => {
      try {
        const [custRes, statsRes] = await Promise.all([
          axios.get(`${config.apiUrl}/customers/${customerId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          axios.get(`${config.apiUrl}/customers/${customerId}/pawn/stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
        ]);
        setCustomer(custRes.data);
        setCustomerStats(statsRes.data);
        setRestoredPawnData({ ticketId, pawnItems, totalPawnOverride });
        setPawnOpen(true);
      } catch (err) {
        console.error('Failed to restore pawn session after customer edit:', err);
      }
    })();
  }, [location.state]);

  // Restore sale screen after returning from CustomerEditor
  useEffect(() => {
    if (!location.state?.customerUpdated) return;
    const raw = sessionStorage.getItem('pendingSaleState');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingSaleState');
    const { customerId, customer: savedCustomer, ticketId, saleItems, ticketNote, showOnReceipt, globalDiscount } = pending;
    if (!customerId) return;
    // Open immediately with saved customer so there's no empty-screen flash
    if (savedCustomer) setCustomer(savedCustomer);
    setExistingSaleData({ ticketId, saleItems, ticketNote, showOnReceipt, globalDiscount });
    setSaleOpen(true);
    // Refresh customer in background to pick up any edits just made
    axios.get(`${config.apiUrl}/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => setCustomer(res.data))
      .catch(err => console.error('Failed to refresh customer after sale edit:', err));
  }, [location.state]);

  // Restore buy screen after returning from CustomerEditor
  useEffect(() => {
    if (!location.state?.customerUpdated) return;
    const raw = sessionStorage.getItem('pendingBuyState');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingBuyState');
    const { customerId, customer: savedCustomer, ticketId, buyItems, buyPawnNotes, ticketNote, showOnReceipt } = pending;
    if (!customerId) return;
    if (savedCustomer) setCustomer(savedCustomer);
    setExistingBuyData({ ticketId, buyItems, buyPawnNotes, ticketNote, showOnReceipt });
    setBuyOpen(true);
    axios.get(`${config.apiUrl}/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => setCustomer(res.data))
      .catch(err => console.error('Failed to refresh customer after buy edit:', err));
  }, [location.state]);

  // Restore trade screen after returning from CustomerEditor
  useEffect(() => {
    if (!location.state?.customerUpdated) return;
    const raw = sessionStorage.getItem('pendingTradeState');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingTradeState');
    const { customerId, customer: savedCustomer, ticketId, tradeItems, saleItems, ticketNote, showOnReceipt, isStoreCreditNet, buyTicketId, saleTicketId } = pending;
    if (!customerId) return;
    if (savedCustomer) setCustomer(savedCustomer);
    setExistingTradeData({ ticketId, tradeItems, saleItems, ticketNote, showOnReceipt, isStoreCreditNet, buyTicketId, saleTicketId });
    setTradeOpen(true);
    axios.get(`${config.apiUrl}/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => setCustomer(res.data))
      .catch(err => console.error('Failed to refresh customer after trade edit:', err));
  }, [location.state]);

  // Restore payment screen after returning from CustomerEditor
  useEffect(() => {
    if (!location.state?.customerUpdated) return;
    const raw = sessionStorage.getItem('pendingPaymentState');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingPaymentState');
    const { customerId, customer: savedCustomer, ticketId, selectedPayments, notes, ticketNote, showOnReceipt } = pending;
    if (!customerId) return;
    if (savedCustomer) setCustomer(savedCustomer);
    setExistingPaymentData({ ticketId, selectedPayments, notes, ticketNote, showOnReceipt });
    setPaymentOpen(true);
    axios.get(`${config.apiUrl}/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => setCustomer(res.data))
      .catch(err => console.error('Failed to refresh customer after payment edit:', err));
  }, [location.state]);

  // Restore payment screen after navigating back from Checkout
  useEffect(() => {
    if (!location.state?.returnToPayment) return;
    const raw = sessionStorage.getItem('pendingPaymentReturn');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingPaymentReturn');
    const { customerId, customer: savedCustomer, ticketId, selectedPayments, notes, ticketNote, showOnReceipt } = pending;
    if (!customerId) return;
    if (savedCustomer) setCustomer(savedCustomer);
    setExistingPaymentData({ ticketId, selectedPayments, notes, ticketNote, showOnReceipt });
    setPaymentOpen(true);
    axios.get(`${config.apiUrl}/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => setCustomer(res.data))
      .catch(err => console.error('Failed to refresh customer after checkout back:', err));
  }, [location.state]);

  const handleCustomerSearch = async (query) => {
    setCustomerSearch(query);
    if (!query.trim()) { setCustomerResults([]); setShowResults(false); return; }
    setSearchingCustomer(true);
    try {
      const res = await axios.get(`${config.apiUrl}/customers/search`, {
        params: { first_name: query, last_name: query, phone: query, email: query },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCustomerResults(res.data);
      setShowResults(true);
    } catch (err) {
      console.error('Customer search failed:', err);
    } finally {
      setSearchingCustomer(false);
    }
  };

  const handleSelectCustomer = async (c) => {
    setCustomerStats(null);
    setCustomerSearch('');
    setCustomerResults([]);
    setShowResults(false);
    setCustomerLoading(true);
    // Show name immediately while full record loads
    setCustomer({ id: c.id, first_name: c.first_name, last_name: c.last_name });
    try {
      const [fullRes, statsRes] = await Promise.all([
        axios.get(`${config.apiUrl}/customers/${c.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        axios.get(`${config.apiUrl}/customers/${c.id}/pawn/stats`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);
      setCustomer(fullRes.data);
      setCustomerStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch customer data:', err);
      setCustomerStats(null);
    } finally {
      setCustomerLoading(false);
    }
  };

  const handleClearCustomer = () => { setCustomer(null); setCustomerStats(null); };

  const handleAddPawnToWorkspace = (pawnData) => {
    setWorkspaceTransactions(prev => {
      if (openingTxId) {
        return prev.map(tx => tx.id === openingTxId ? { ...tx, ...pawnData } : tx);
      }
      return [...prev, { id: Date.now(), type: 'PAWN', ...pawnData }];
    });
    setOpeningTxId(null);
  };

  const handleConfirmVoid = () => {
    if (!voidConfirm) return;
    if (voidConfirm.ticketId) {
      voidTicketId(voidConfirm.type, voidConfirm.ticketId);
    }
    setWorkspaceTransactions(prev => prev.filter(t => t.id !== voidConfirm.id));
    setVoidConfirm(null);
  };

  const summaryLines = workspaceTransactions.map(tx => {
    if (tx.type === 'PAWN') {
      const count = tx.pawnItems?.length || 0;
      return {
        label: `Pawn Loan (${count} item${count !== 1 ? 's' : ''})`,
        value: `-$${Number(tx.totalPawnAmount).toFixed(2)}`,
        color: '#c62828',
      };
    }
    if (tx.type === 'SALE') {
      const count = tx.saleItems?.length || 0;
      return {
        label: `Sale (${count} item${count !== 1 ? 's' : ''})`,
        value: `+$${Number(tx.total || 0).toFixed(2)}`,
        color: '#1a472a',
      };
    }
    if (tx.type === 'TRADE') {
      const net = Number(tx.netDueToCustomer || 0);
      return {
        label: `Trade (${(tx.tradeItems?.length || 0)} in / ${(tx.saleItems?.length || 0)} out)`,
        value: net >= 0 ? `-$${net.toFixed(2)}` : `+$${Math.abs(net).toFixed(2)}`,
        color: net >= 0 ? '#c62828' : '#0891b2',
      };
    }
    if (tx.type === 'PAYMENT') {
      return {
        label: `Payment (${tx.ticketId})`,
        value: `+$${Number(tx.totalPayment || 0).toFixed(2)}`,
        color: PAYMENT_AMBER,
      };
    }
    return null;
  }).filter(Boolean);

  const netDue = workspaceTransactions.reduce((sum, tx) => {
    if (tx.type === 'PAWN')    return sum - Number(tx.totalPawnAmount);
    if (tx.type === 'SALE')    return sum + Number(tx.total || 0);
    if (tx.type === 'BUY')     return sum - Number(tx.totalPaid || 0);
    if (tx.type === 'TRADE')   return sum - Number(tx.netDueToCustomer || 0);
    if (tx.type === 'PAYMENT') return sum + Number(tx.totalPayment || 0);
    return sum;
  }, 0);

  const handleTransactionTypeClick = (type) => {
    if (type === 'pawn') {
      if (!customer) { setNoCustomerWarning(true); return; }
      if (customerLoading) return;
      setPawnOpen(true);
    } else if (type === 'sale') {
      setSaleOpen(true);
    } else if (type === 'buy') {
      if (!customer) { setNoCustomerWarning(true); return; }
      setBuyOpen(true);
    } else if (type === 'trade') {
      if (!customer) { setNoCustomerWarning(true); return; }
      setTradeOpen(true);
    } else if (type === 'payment') {
      if (!customer) { setNoCustomerWarning(true); return; }
      setPaymentOpen(true);
    }
  };

  const handleAddPaymentToWorkspace = (paymentData) => {
    setWorkspaceTransactions(prev => {
      const existingIdx = prev.findIndex(t => t.type === 'PAYMENT' && t.ticketId === paymentData.ticketId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...paymentData };
        return updated;
      }
      return [...prev, { id: Date.now(), type: 'PAYMENT', ...paymentData }];
    });
    setPaymentOpen(false);
    setExistingPaymentData(null);
  };

  const handleAddBuyToWorkspace = (buyData) => {
    setWorkspaceTransactions(prev => {
      const existingIdx = prev.findIndex(t => t.type === 'BUY' && t.ticketId === buyData.ticketId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...buyData };
        return updated;
      }
      return [...prev, { id: Date.now(), type: 'BUY', ...buyData }];
    });
    setBuyOpen(false);
    setExistingBuyData(null);
  };

  const handleAddTradeToWorkspace = (tradeData) => {
    setWorkspaceTransactions(prev => {
      const existingIdx = prev.findIndex(t => t.type === 'TRADE' && t.ticketId === tradeData.ticketId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...tradeData };
        return updated;
      }
      return [...prev, { id: Date.now(), type: 'TRADE', ...tradeData }];
    });
    setTradeOpen(false);
    setExistingTradeData(null);
  };

  const handleAddSaleToWorkspace = (saleData) => {
    setWorkspaceTransactions(prev => {
      const existingIdx = prev.findIndex(t => t.type === 'SALE' && t.ticketId === saleData.ticketId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...saleData };
        return updated;
      }
      return [...prev, { id: Date.now(), type: 'SALE', ...saleData }];
    });
    setSaleOpen(false);
    setExistingSaleData(null);
  };

  // Called when TradeTransactionScreen detects only trade-in items exist.
  // Converts all trade-in items to a new Buy ticket and opens it.
  const handleSwitchToBuy = ({ tradeItems, ticketNote, showOnReceipt }) => {
    const buyItems = tradeItems.map(item => ({
      _lineId: item._lineId,
      part_no: item.part_no,
      category_id: item.category_id || '',
      category_name: item.category_name || '',
      description: item.description || '',
      serial_number: item.serial_number || '',
      qty: item.qty || 1,
      paid: parseFloat(item.tradeAllowance) || 0,
      images: item.images || [],
      sourceEstimator: item.sourceEstimator || 'jewelry',
      jewelryData: item.jewelryData,
      ...(item.fromInventory && { fromInventory: true, item_id: item.item_id }),
    }));
    setTradeOpen(false);
    setExistingTradeData(null);
    setExistingBuyData({ buyItems, ticketNote, showOnReceipt });
    setBuyOpen(true);
  };

  // Called when TradeTransactionScreen detects only sale items exist.
  // Moves all sale items to a new Sale ticket and opens it.
  const handleSwitchToSale = ({ saleItems, ticketNote, showOnReceipt }) => {
    setTradeOpen(false);
    setExistingTradeData(null);
    setExistingSaleData({ saleItems, ticketNote, showOnReceipt, globalDiscount: 0 });
    setSaleOpen(true);
  };

  const handleConvertTradeItemToBuy = (tradeItem, targetTicketId) => {
    const buyItem = {
      _lineId: tradeItem._lineId,
      part_no: tradeItem.part_no,
      category_id: tradeItem.category_id || '',
      category_name: tradeItem.category_name || '',
      description: tradeItem.description || '',
      serial_number: tradeItem.serial_number || '',
      qty: tradeItem.qty || 1,
      paid: parseFloat(tradeItem.tradeAllowance) || 0,
      images: tradeItem.images || [],
      sourceEstimator: tradeItem.sourceEstimator,
      jewelryData: tradeItem.jewelryData,
      ...(tradeItem.fromInventory && { fromInventory: true, item_id: tradeItem.item_id }),
    };
    if (targetTicketId) {
      setWorkspaceTransactions(prev => prev.map(t =>
        t.type === 'BUY' && t.ticketId === targetTicketId
          ? { ...t, buyItems: [...(t.buyItems || []), buyItem] }
          : t
      ));
    } else {
      const last = parseInt(localStorage.getItem('lastBTTicketNumber') || '0') + 1;
      localStorage.setItem('lastBTTicketNumber', last.toString());
      const newTicketId = `BT-${last.toString().padStart(8, '0')}`;
      setWorkspaceTransactions(prev => [
        ...prev,
        { id: Date.now(), type: 'BUY', ticketId: newTicketId, buyItems: [buyItem], customer },
      ]);
    }
  };

  const handleBuyConvertTo = ({ type, item, targetTicketId }) => {
    if (type === 'pawn') {
      const pawnItem = item.jewelryData
        ? item.jewelryData
        : {
            id: Date.now(),
            item: item.description || '',
            category: item.category_name || '',
            serial_number: item.serial_number || '',
            serial: item.serial_number || '',
            qty: 1,
            amount: 0,
            images: item.images || [],
            sourceEstimator: 'jewelry',
          };
      setBuyOpen(false);
      setExistingBuyData(null);
      setRestoredPawnData({ pawnItems: [pawnItem], ticketNote: '', showOnReceipt: false });
      setPawnOpen(true);
    }
    if (type === 'trade') {
      const tradeAllowance = parseFloat(item.paid) || 0;
      const qty = parseInt(item.qty) || 1;
      const tradeItem = {
        _lineId: item._lineId,
        part_no: item.part_no || '',
        category_id: item.category_id || '',
        category_name: item.category_name || '',
        description: item.description || '',
        serial_number: item.serial_number || '',
        qty,
        tradeAllowance,
        images: item.images || [],
        sourceEstimator: item.sourceEstimator,
        jewelryData: item.jewelryData,
        ...(item.fromInventory && { fromInventory: true, item_id: item.item_id }),
      };
      const buyTicketId = existingBuyData?.ticketId;
      setWorkspaceTransactions(prev => {
        // Remove converted item from the buy ticket in workspace
        const withBuyUpdated = prev.map(t => {
          if (!(t.type === 'BUY' && t.ticketId === buyTicketId)) return t;
          return { ...t, buyItems: (t.buyItems || []).filter(i => i._lineId !== item._lineId) };
        });
        if (targetTicketId) {
          return withBuyUpdated.map(t => {
            if (!(t.type === 'TRADE' && t.ticketId === targetTicketId)) return t;
            const newTradeItems = [...(t.tradeItems || []), tradeItem];
            const newTotal = newTradeItems.reduce((s, i) => s + (parseFloat(i.tradeAllowance) || 0) * (parseInt(i.qty) || 1), 0);
            return { ...t, tradeItems: newTradeItems, totalTradeAllowance: newTotal, netDueToCustomer: newTotal - (t.totalSaleAfterTax || 0) };
          });
        } else {
          const last = parseInt(localStorage.getItem('lastTTTicketNumber') || '100000') + 1;
          localStorage.setItem('lastTTTicketNumber', last.toString());
          const newTicketId = `TT-${last}`;
          return [
            ...withBuyUpdated,
            {
              id: Date.now(), type: 'TRADE', ticketId: newTicketId,
              tradeItems: [tradeItem], saleItems: [],
              totalTradeAllowance: tradeAllowance * qty,
              totalSaleAfterTax: 0,
              netDueToCustomer: tradeAllowance * qty,
              taxAmount: 0, taxRate: 0.07,
              customer,
            },
          ];
        }
      });
    }
  };

  if (pawnOpen) {
    const existingPawnData = openingTxId
      ? workspaceTransactions.find(t => t.id === openingTxId)
      : restoredPawnData;
    return (
      <PawnTransactionScreen
        customer={customer}
        customerStats={customerStats}
        onClose={() => { setPawnOpen(false); setOpeningTxId(null); setRestoredPawnData(null); }}
        onAddToWorkspace={(data) => { handleAddPawnToWorkspace(data); setRestoredPawnData(null); }}
        existingPawnData={existingPawnData}
      />
    );
  }

  if (saleOpen) {
    return (
      <SaleTransactionScreen
        customer={customer}
        customerStats={customerStats}
        onClose={() => { setSaleOpen(false); setExistingSaleData(null); }}
        onAddToWorkspace={handleAddSaleToWorkspace}
        onRemoveFromWorkspace={(ticketId) => {
          setWorkspaceTransactions(prev => prev.filter(t => !(t.type === 'SALE' && t.ticketId === ticketId)));
          setSaleOpen(false);
          setExistingSaleData(null);
        }}
        existingSaleData={existingSaleData}
      />
    );
  }

  if (buyOpen) {
    const workspaceTradeTickets = workspaceTransactions.filter(t => t.type === 'TRADE');
    return (
      <BuyTransactionScreen
        customer={customer}
        customerStats={customerStats}
        onClose={() => { setBuyOpen(false); setExistingBuyData(null); }}
        onAddToWorkspace={handleAddBuyToWorkspace}
        onRemoveFromWorkspace={(ticketId) => {
          setWorkspaceTransactions(prev => prev.filter(t => !(t.type === 'BUY' && t.ticketId === ticketId)));
          setBuyOpen(false);
          setExistingBuyData(null);
        }}
        onConvertTo={handleBuyConvertTo}
        existingBuyData={existingBuyData}
        workspaceTradeTickets={workspaceTradeTickets}
      />
    );
  }

  if (tradeOpen) {
    const workspaceBuyTickets  = workspaceTransactions.filter(t => t.type === 'BUY');
    const workspaceSaleTickets = workspaceTransactions.filter(t => t.type === 'SALE');
    return (
      <TradeTransactionScreen
        customer={customer}
        customerStats={customerStats}
        onClose={() => { setTradeOpen(false); setExistingTradeData(null); }}
        onAddToWorkspace={handleAddTradeToWorkspace}
        onConvertToBuy={handleConvertTradeItemToBuy}
        onRemoveFromWorkspace={(ticketId) => {
          setWorkspaceTransactions(prev => prev.filter(t => !(t.type === 'TRADE' && t.ticketId === ticketId)));
          setTradeOpen(false);
          setExistingTradeData(null);
        }}
        existingTradeData={existingTradeData}
        workspaceBuyTickets={workspaceBuyTickets}
        onConsumeWorkspaceBuy={(buyTicketId) =>
          setWorkspaceTransactions(prev => prev.filter(t => !(t.type === 'BUY' && t.ticketId === buyTicketId)))
        }
        workspaceSaleTickets={workspaceSaleTickets}
        onConsumeWorkspaceSale={(saleTicketId) =>
          setWorkspaceTransactions(prev => prev.filter(t => !(t.type === 'SALE' && t.ticketId === saleTicketId)))
        }
        onSwitchToBuy={handleSwitchToBuy}
        onSwitchToSale={handleSwitchToSale}
      />
    );
  }

  if (paymentOpen) {
    return (
      <PaymentTransactionScreen
        customer={customer}
        customerStats={customerStats}
        onClose={() => { setPaymentOpen(false); setExistingPaymentData(null); }}
        onAddToWorkspace={handleAddPaymentToWorkspace}
        existingPaymentData={existingPaymentData}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', bgcolor: '#f5f6fa', overflow: 'hidden' }}>

      {/* ── Top search bar ── */}
      <Paper elevation={1} sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1.5, borderRadius: 0, zIndex: 10 }}>
        <TextField
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Scan barcode or search (item, customer, ticket, receipt, SKU, phone...)"
          size="small"
          fullWidth
          InputProps={{
            startAdornment: <InputAdornment position="start"><MuiIcons.Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small"><MuiIcons.QrCodeScanner /></IconButton>
                <IconButton size="small"><MuiIcons.PhotoCamera /></IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
        <Button variant="outlined" startIcon={<MuiIcons.LocalParking />} sx={{ whiteSpace: 'nowrap', borderRadius: 2 }}>
          Park Transaction
        </Button>
        <Button variant="outlined" startIcon={<MuiIcons.PlayArrow />} sx={{ whiteSpace: 'nowrap', borderRadius: 2 }}>
          Resume
        </Button>
      </Paper>

      {/* ── Body (three columns + full-width bottom bar) ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, gap: { md: 1.5, xl: 1 }, p: { md: 1.5, xl: 1 }, overflow: 'hidden' }}>

      {/* Three-column row */}
      <Box sx={{ display: 'flex', flex: 1, gap: { md: 1.5, xl: 1 }, overflow: 'hidden', minHeight: 0 }}>

        {/* ── LEFT: Customer panel ── */}
        <Paper sx={{ width: 240, flexShrink: 0, borderRadius: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden', alignSelf: 'flex-start', maxHeight: '100%' }}>
          <Box sx={{ px: { md: 2, xl: 1.5 }, py: { md: 1, xl: 0.75 }, bgcolor: GREEN, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight={700} fontSize={{ md: 13, xl: 11 }} letterSpacing={1}>CUSTOMER</Typography>
          </Box>

          <Box sx={{ p: { md: 1.5, xl: 1 }, flex: 1, overflowY: 'auto' }}>
            {customer ? (
              /* ── Customer selected ── */
              <>
                {/* Name + avatar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { md: 1.5, xl: 1 }, mb: { md: 1.5, xl: 1 } }}>
                  <Avatar sx={{ bgcolor: GREEN, width: { md: 40, xl: 32 }, height: { md: 40, xl: 32 }, fontSize: { md: 15, xl: 12 }, fontWeight: 700 }}>
                    {customer.first_name?.[0]}{customer.last_name?.[0]}
                  </Avatar>
                  <Typography fontWeight={700} fontSize={{ md: 15, xl: 13 }} lineHeight={1.2}>
                    {customer.first_name} {customer.last_name}
                  </Typography>
                </Box>

                {/* Contact info */}
                <Stack spacing={{ md: 0.5, xl: 0.25 }} mb={{ md: 1.5, xl: 1 }}>
                  {customer.phone && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Phone:</Typography>
                      <Typography variant="caption" fontWeight={500}>{customer.phone}</Typography>
                    </Box>
                  )}
                  {customer.email && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>Email:</Typography>
                      <Typography variant="caption" fontWeight={500} noWrap>{customer.email}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">ID:</Typography>
                    {customer.id_number ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" fontWeight={500}>Verified</Typography>
                        <MuiIcons.CheckCircle sx={{ fontSize: 13, color: '#2e7d32' }} />
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary" fontStyle="italic">Not on file</Typography>
                    )}
                  </Box>
                </Stack>

                <Divider sx={{ mb: { md: 1.5, xl: 1 } }} />

                {/* Stats rows — icons/colors pulled from transaction_type DB via transactionTypes state */}
                <Stack spacing={{ md: 0.75, xl: 0.5 }} mb={{ md: 1.5, xl: 1 }}>
                  {(() => {
                    const byType = (type) => transactionTypes.find(t => t.type === type) ?? {};
                    const pawn    = byType('pawn');
                    const layaway = byType('layaway');
                    const repair  = byType('repair');
                    return [
                      { icon: pawn.icon,  label: 'Active Pawns',   value: customerStats?.active_pawns    ?? 0,  color: pawn.color },
                      { icon: layaway.icon, label: 'Active Layaways', value: customerStats?.active_layaways ?? 0,  color: layaway.color },
                      { icon: repair.icon,  label: 'Open Repairs',    value: customerStats?.open_repairs    ?? 0,  color: repair.color  },
                      { icon: 'CreditCard',  label: 'Store Credit',    value: customerStats?.store_credit != null ? `$${Number(customerStats.store_credit).toFixed(2)}` : '$0.00', color: '#2e7d32' },
                      { icon: 'AccessTime',   label: 'Customer Since',  value: customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', color: '#546e7a' },
                    ];
                  })().map(({ icon, label, value, color }) => {
                    const Icon = MuiIcons[icon] ?? MuiIcons.Circle;
                    return (
                      <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Icon sx={{ fontSize: { md: 15, xl: 13 }, color }} />
                          <Typography sx={{ fontSize: { md: 12, xl: 11 } }} color="text.secondary">{label}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: { md: 12, xl: 11 } }} fontWeight={600}
                          color={label === 'Store Credit' ? '#2e7d32' : 'text.primary'}>
                          {value}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>

                <Divider sx={{ mb: 1 }} />

                <Stack spacing={0.75}>
                  <Button fullWidth variant="contained" size="small"
                    sx={{ bgcolor: GREEN, '&:hover': { bgcolor: GREEN_LIGHT }, borderRadius: 2, fontSize: 11, fontWeight: 700 }}>
                    Select Customer
                  </Button>
                  <Button fullWidth variant="outlined" size="small"
                    startIcon={<MuiIcons.Edit fontSize="small" />}
                    onClick={() => navigate('/customer-editor', {
                      state: {
                        customer: {
                          ...customer,
                          id_expiry_date: customer.id_expiry_date ? new Date(customer.id_expiry_date).toISOString().substring(0, 10) : '',
                          date_of_birth:  customer.date_of_birth  ? new Date(customer.date_of_birth).toISOString().substring(0, 10)  : '',
                        },
                        mode: 'edit',
                        returnTo: location.pathname,
                      },
                    })}
                    sx={{ borderRadius: 2, fontSize: 11, justifyContent: 'flex-start' }}>
                    Edit Customer
                  </Button>
                  <Button fullWidth variant="outlined" size="small" color="error"
                    onClick={handleClearCustomer}
                    startIcon={<MuiIcons.Clear fontSize="small" />}
                    sx={{ borderRadius: 2, fontSize: 11, justifyContent: 'flex-start' }}>
                    Clear Customer
                  </Button>
                </Stack>
              </>
            ) : (
              /* ── No customer selected ── */
              <>
                {/* Search box */}
                <Box sx={{ position: 'relative', mb: 1.5 }}>
                  <TextField
                    fullWidth size="small"
                    placeholder="Search by name, phone, email..."
                    value={customerSearch}
                    onChange={e => handleCustomerSearch(e.target.value)}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    onFocus={() => customerResults.length > 0 && setShowResults(true)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {searchingCustomer
                            ? <MuiIcons.HourglassEmpty fontSize="small" sx={{ color: 'text.secondary' }} />
                            : <MuiIcons.Search fontSize="small" sx={{ color: 'text.secondary' }} />}
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  {showResults && customerResults.length > 0 && (
                    <Paper elevation={4} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: 200, overflowY: 'auto', borderRadius: 1, mt: 0.5 }}>
                      {customerResults.map(c => (
                        <Box
                          key={c.id}
                          onMouseDown={() => handleSelectCustomer(c)}
                          sx={{ px: 1.5, py: 1, cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' }, borderBottom: '1px solid #f0f0f0' }}
                        >
                          <Typography fontSize={12} fontWeight={600}>{c.first_name} {c.last_name}</Typography>
                          {c.phone && <Typography fontSize={11} color="text.secondary">{c.phone}</Typography>}
                          {c.email && <Typography fontSize={11} color="text.secondary" noWrap>{c.email}</Typography>}
                        </Box>
                      ))}
                    </Paper>
                  )}
                  {showResults && customerResults.length === 0 && !searchingCustomer && customerSearch && (
                    <Paper elevation={4} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, borderRadius: 1, mt: 0.5, px: 1.5, py: 1 }}>
                      <Typography fontSize={12} color="text.secondary">No customers found</Typography>
                    </Paper>
                  )}
                </Box>

              </>
            )}

            {/* Always visible */}
            <Stack spacing={0.75} mt={1.5}>
              <Divider />
              <Button fullWidth variant="outlined" size="small"
                startIcon={<MuiIcons.PersonAdd fontSize="small" />}
                onClick={() => navigate('/customer-editor', { state: { mode: 'create', returnTo: location.pathname } })}
                sx={{ borderRadius: 2, fontSize: 11, justifyContent: 'flex-start' }}>
                New Customer
              </Button>
              <Button fullWidth variant="outlined" size="small"
                startIcon={<MuiIcons.QrCode2 fontSize="small" />}
                sx={{ borderRadius: 2, fontSize: 11, justifyContent: 'flex-start' }}>
                Scan ID
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* ── MIDDLE: Transaction workspace ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden', minWidth: 0 }}>
          {/* Workspace header */}
          <Paper sx={{ px: { md: 2, xl: 1.5 }, py: { md: 1, xl: 0.75 }, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography fontWeight={700} fontSize={{ md: 13, xl: 11 }} letterSpacing={1}>TRANSACTION WORKSPACE</Typography>
              <Badge badgeContent={workspaceTransactions.length} color="primary" sx={{ '& .MuiBadge-badge': { position: 'relative', transform: 'none', ml: 0.5 } }}>
                <Box />
              </Badge>
              <Typography variant="caption" color="text.secondary">Add, edit or remove transactions before checkout.</Typography>
            </Box>
          </Paper>

          {/* Transaction cards grid */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {workspaceTransactions.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1.5, color: 'text.secondary' }}>
                <MuiIcons.Receipt sx={{ fontSize: 48, opacity: 0.15 }} />
                <Typography variant="body2" color="text.secondary">No transactions in workspace yet.</Typography>
                <Typography variant="caption" color="text.secondary">Use the buttons below to start a pawn, sale, or other transaction.</Typography>
              </Box>
            ) : (
              <Grid container spacing={{ md: 1.5, xl: 1 }}>
                {workspaceTransactions.map(tx => (
                  <Grid item xs={12} sm={6} md={4} key={tx.id}>
                    {tx.type === 'PAWN' ? (
                      <PawnTransactionCard
                        tx={tx}
                        pawnIcon={transactionTypes.find(t => t.type === 'pawn')?.icon}
                        pawnColor={transactionTypes.find(t => t.type === 'pawn')?.color}
                        onOpen={() => { setOpeningTxId(tx.id); setPawnOpen(true); }}
                        onVoid={() => setVoidConfirm(tx)}
                      />
                    ) : tx.type === 'SALE' ? (
                      <SaleTransactionCard
                        tx={tx}
                        saleIcon={transactionTypes.find(t => t.type === 'sale')?.icon}
                        saleColor={transactionTypes.find(t => t.type === 'sale')?.color}
                        onOpen={() => { setExistingSaleData(tx); setSaleOpen(true); }}
                        onVoid={() => setVoidConfirm(tx)}
                      />
                    ) : tx.type === 'BUY' ? (
                      <BuyTransactionCard
                        tx={tx}
                        buyIcon={transactionTypes.find(t => t.type === 'buy')?.icon}
                        buyColor={transactionTypes.find(t => t.type === 'buy')?.color}
                        onOpen={() => { setExistingBuyData(tx); setBuyOpen(true); }}
                        onVoid={() => setVoidConfirm(tx)}
                      />
                    ) : tx.type === 'TRADE' ? (
                      <TradeTransactionCard
                        tx={tx}
                        tradeIcon={transactionTypes.find(t => t.type === 'trade')?.icon}
                        tradeColor={transactionTypes.find(t => t.type === 'trade')?.color}
                        onOpen={() => { setExistingTradeData(tx); setTradeOpen(true); }}
                        onVoid={() => setVoidConfirm(tx)}
                      />
                    ) : tx.type === 'PAYMENT' ? (
                      <PaymentTransactionCard
                        tx={tx}
                        onOpen={() => { setExistingPaymentData(tx); setPaymentOpen(true); }}
                        onVoid={() => setVoidConfirm(tx)}
                      />
                    ) : null}
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

        </Box>

        {/* ── RIGHT: Summary panel ── */}
        <Paper sx={{ width: 220, flexShrink: 0, borderRadius: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden', alignSelf: 'flex-start', maxHeight: '100%' }}>
          <Box sx={{ px: { md: 2, xl: 1.5 }, py: { md: 1, xl: 0.75 }, bgcolor: GREEN, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <Typography fontWeight={700} fontSize={{ md: 13, xl: 11 }} letterSpacing={1}>SUMMARY</Typography>
            <IconButton size="small" sx={{ color: '#fff' }}><MuiIcons.ExpandMore fontSize="small" /></IconButton>
          </Box>

          {/* Scrollable: summary lines + net due + checkout + workspace status */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: { md: 1.5, xl: 1 }, minHeight: 0 }}>
            {summaryLines.length === 0 ? (
              <Typography variant="caption" color="text.secondary" fontStyle="italic">No transactions yet.</Typography>
            ) : summaryLines.map((l, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="caption" color="text.secondary">{l.label}</Typography>
                <Typography variant="caption" fontWeight={600} color={l.color}>{l.value}</Typography>
              </Box>
            ))}

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
              NET DUE FROM CUSTOMER
            </Typography>
            <Typography fontWeight={800} color={netDue >= 0 ? GREEN : '#c62828'} mb={{ md: 2, xl: 1 }} sx={{ fontSize: { md: '1.5rem', xl: '1.2rem' } }}>
              {netDue < 0 ? `-$${Math.abs(netDue).toFixed(2)}` : `$${netDue.toFixed(2)}`}
            </Typography>

            <Typography variant="caption" color="text.secondary" display="block" mb={{ md: 1.5, xl: 0.75 }}>
              No payment has been entered yet.
            </Typography>

            <Button fullWidth variant="contained" size="small" disabled={workspaceTransactions.length === 0}
              sx={{ bgcolor: GREEN, '&:hover': { bgcolor: GREEN_LIGHT }, borderRadius: 2, fontWeight: 700, mb: { md: 2, xl: 1 } }}>
              Checkout / Payment
            </Button>

            <Divider sx={{ mb: 1.5 }} />

            <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1} display="block" mb={1}>
              WORKSPACE STATUS
            </Typography>
            {workspaceTransactions.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                <MuiIcons.RadioButtonUnchecked sx={{ fontSize: 14, color: '#bdbdbd' }} />
                <Typography variant="caption" color="text.secondary">No transactions added</Typography>
              </Box>
            ) : [
              'All required fields complete',
              'Customer linked to all transactions',
              'Ready to checkout',
            ].map(msg => (
              <Box key={msg} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                <MuiIcons.CheckCircle sx={{ fontSize: 14, color: '#2e7d32' }} />
                <Typography variant="caption" color="text.secondary">{msg}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>{/* end three-column row */}

      {/* ── Full-width bottom bar: ADD TRANSACTION + ACTIONS ── */}
      <Paper sx={{ p: { md: 1.5, xl: 1 }, borderRadius: 2, flexShrink: 0, display: 'flex', gap: { md: 2, xl: 1.5 }, alignItems: 'flex-start' }}>
        {/* ADD TRANSACTION */}
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={700} color="text.secondary" letterSpacing={1} display="block" mb={{ md: 1, xl: 0.5 }} sx={{ fontSize: { md: 12, xl: 10 } }}>
            ADD TRANSACTION
          </Typography>
          <Box sx={{ display: 'flex', gap: { md: 1, xl: 0.75 }, flexWrap: 'wrap' }}>
            {transactionTypes.map(t => {
              const IconComponent = MuiIcons[t.icon] ?? MuiIcons.Add;
              const count = workspaceTransactions.filter(tx => tx.type === t.type.toUpperCase()).length;
              return (
                <TransactionTypeButton
                  key={t.id}
                  label={t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                  icon={<IconComponent />}
                  color={t.color ?? '#607d8b'}
                  onClick={() => handleTransactionTypeClick(t.type)}
                  count={count}
                />
              );
            })}
          </Box>
        </Box>

        {/* Divider */}
        <Divider orientation="vertical" flexItem />

        {/* ACTIONS */}
        <Box sx={{ flexShrink: 0 }}>
          <Typography fontWeight={700} color="text.secondary" letterSpacing={1} display="block" mb={{ md: 1, xl: 0.5 }} sx={{ fontSize: { md: 12, xl: 10 } }}>
            ACTIONS
          </Typography>
          <Box sx={{ display: 'flex', gap: { md: 1, xl: 0.75 } }}>
            {[
              { label: 'Notes',    icon: 'Assignment' },
              { label: 'Discount', icon: 'Percent'    },
              { label: 'Void',     icon: 'Block'      },
              { label: 'Print',    icon: 'Print'      },
            ].map(a => {
              const Icon = MuiIcons[a.icon];
              return (
                <TransactionTypeButton key={a.label} label={a.label} icon={<Icon />} color="#607d8b" />
              );
            })}
          </Box>
        </Box>
      </Paper>

      </Box>{/* end body wrapper */}

      <Snackbar
        open={noCustomerWarning}
        autoHideDuration={4000}
        onClose={() => setNoCustomerWarning(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="warning" onClose={() => setNoCustomerWarning(false)} sx={{ fontWeight: 600 }}>
          Please select a customer before opening a pawn ticket.
        </Alert>
      </Snackbar>

      <Dialog open={!!voidConfirm} onClose={() => setVoidConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Void Pawn Ticket?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Ticket <strong>{voidConfirm?.ticketId}</strong> will be permanently voided and cannot be used again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmVoid}>Void Ticket</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
