import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import {
  Box, Typography, Paper, Grid, Avatar, Button, IconButton, Chip,
  Divider, TextField, InputAdornment, Badge, Tooltip, Stack, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Menu, FormControlLabel, Checkbox, Popper,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import PawnTransactionScreen from './PawnTransactionScreen';
import SaleTransactionScreen from './SaleTransactionScreen';
import BuyTransactionScreen from './BuyTransactionScreen';
import TradeTransactionScreen from './TradeTransactionScreen';
import PaymentTransactionScreen from './PaymentTransactionScreen';
import RedeemTransactionScreen from './RedeemTransactionScreen';
import { useWorkspaceGuard } from '../context/WorkspaceGuardContext';
import { useAuth } from '../context/AuthContext';

const GREEN = '#1a472a';
const GREEN_LIGHT = '#2d6a4f';
const BUY_BLUE = '#0284c7';

// Converts a Buffer-like object (from backend) to a base64 data URL for image preview
function bufferToDataUrl(bufferObj) {
  if (!bufferObj || !bufferObj.data) return null;
  const base64 = btoa(
    new Uint8Array(bufferObj.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return `data:image/jpeg;base64,${base64}`;
}

// ── "scrap" search-bar shortcut parsing ──────────────────────────────────────
// Recognizes a weight + purity (in any order, e.g. "5.6g 14k" or "14k 5.6g")
// typed into the transactions search bar. rowKey matches one of
// JewelryIntakeScreen's SCRAP_FIXED_ROWS keys (one row per metal); the actual
// purity option within that row is resolved there once its dropdown loads.
const SCRAP_PURITY_BY_DECIMAL = [
  { rowKey: 'gold',   value: 0.417, metal: 'Gold',   karat: 10 },
  { rowKey: 'gold',   value: 0.585, metal: 'Gold',   karat: 14 },
  { rowKey: 'gold',   value: 0.750, metal: 'Gold',   karat: 18 },
  { rowKey: 'gold',   value: 0.917, metal: 'Gold',   karat: 22 },
  { rowKey: 'silver', value: 0.925, metal: 'Silver', karat: null },
];
const SCRAP_METAL_WORDS = { gold: 'Gold', silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium' };
const SCRAP_ROW_KEY_BY_METAL = { Gold: 'gold', Silver: 'silver', Platinum: 'platinum', Palladium: 'palladium' };

function parseQuickScrapEntry(text) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  let hasScrapWord = false;
  let weightG = null;
  let karat = null;
  let purityValue = null;
  let metal = null;
  const leftover = [];

  for (const tok of tokens) {
    const lower = tok.toLowerCase();
    let m;
    if (lower === 'scrap') { hasScrapWord = true; continue; }
    if (SCRAP_METAL_WORDS[lower]) { metal = SCRAP_METAL_WORDS[lower]; continue; }
    if (weightG === null && (m = lower.match(/^(\d+(?:\.\d+)?)g$/))) {
      weightG = parseFloat(m[1]);
      continue;
    }
    if (purityValue === null && (m = lower.match(/^(\d+)k$/))) {
      const k = parseInt(m[1], 10);
      karat = k;
      purityValue = Math.round((k / 24) * 1000) / 1000;
      metal = metal || 'Gold';
      continue;
    }
    if (purityValue === null && (m = lower.match(/^0?(\.\d+)$/))) {
      const dec = parseFloat(`0${m[1]}`);
      const nearest = SCRAP_PURITY_BY_DECIMAL.reduce((best, c) =>
        Math.abs(c.value - dec) < Math.abs(best.value - dec) ? c : best, SCRAP_PURITY_BY_DECIMAL[0]);
      if (Math.abs(nearest.value - dec) <= 0.01) {
        purityValue = nearest.value;
        karat = nearest.karat;
        metal = metal || nearest.metal;
      } else {
        purityValue = dec;
        metal = metal || 'Gold';
      }
      continue;
    }
    leftover.push(tok);
  }

  const rowKey = metal ? SCRAP_ROW_KEY_BY_METAL[metal] : null;
  const hasWeightAndPurity = weightG != null && purityValue != null;
  const isBulkScrap = hasScrapWord || (hasWeightAndPurity && leftover.length === 0);
  const isUniqueWithPrefill = !isBulkScrap && hasWeightAndPurity;

  return { hasScrapWord, weightG, karat, purityValue, metal, rowKey, leftover, isBulkScrap, isUniqueWithPrefill };
}

// ── Dashboard-style placeholder cards shown when the workspace is empty ──────
// Copied from Home.js's Messages/Tasks/Loans-Layaways widgets (same dummy data,
// not wired to any live source) so this screen doubles as a landing page.
const DASHBOARD_MESSAGES = [
  { type: 'announcement', text: 'Easter Promotion starts today – click for details' },
  { type: 'incoming text', text: "+1 (506)455-1234: I'll be in tomorrow to pay" },
  { type: 'email', text: 'From: joe@gmail.com Subject: E-transfer Sent' },
  { type: 'facebook', text: 'From: facebook_user – Can you give me a quote on the following items that I would...' },
  { type: 'web', text: 'From: I want to sell gold | "I have 3 rings I want to sell."' },
  { type: 'website', text: 'New online sale WEB-S876511 in for in-store pickup' },
];

const DASHBOARD_TASKS = [
  '5 Items to be located',
  '2 Online orders to fill (1 is in-store pickup)',
  '23 Loans to be pulled',
  '12 Buys to expire',
  '87 Items to be priced',
  '31 Items to be marked down',
  '18 Loans to call',
  '7 Layaways overdue',
  '3 Returns to process',
  '"Remerchandise the laptop cabinet"',
  '"Ask 5 customers for reviews"',
];

const DASHBOARD_LOANS_LAYAWAYS_DUE_TODAY = [
  { id: 'PT-00001234', name: 'John Smith', type: 'Loan', details: '$450.00 due' },
  { id: 'LWY-00456', name: 'Maria Garcia', type: 'Layaway', details: '$120.00 payment due' },
  { id: 'PT-00001198', name: 'Robert Chen', type: 'Loan', details: '$210.00 due' },
];

// Copied from the now-removed Dashboard.js screen (same dummy data, not wired to
// any live source).
const DASHBOARD_STATS = [
  { title: 'Daily Revenue', value: '$2,854', iconName: 'CurrencyExchange', change: '12.5%', timeFrame: 'last month' },
  { title: 'Protection Plans sold', value: '124', iconName: 'Inventory', change: '8.2%', timeFrame: 'last month' },
  { title: 'New Customers', value: '48', iconName: 'Person', change: '-3.1%', timeFrame: 'last month' },
  { title: 'Sales Growth', value: '15.2%', iconName: 'TrendingUp', change: '2.3%', timeFrame: 'last month' },
];

function StatCard({ title, value, iconName, change, timeFrame }) {
  const isPositive = !change.includes('-');
  const IconComponent = MuiIcons[iconName];
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography color="text.secondary" variant="body2" gutterBottom>{title}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{value}</Typography>
        </Box>
        <Box sx={{ bgcolor: '#e7f7ed', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconComponent sx={{ color: GREEN, fontSize: 18 }} />
        </Box>
      </Box>
      <Typography variant="caption" sx={{ color: isPositive ? '#00a862' : '#d32f2f', display: 'flex', alignItems: 'center' }}>
        <MuiIcons.TrendingUpOutlined sx={{ fontSize: 14, mr: 0.5, transform: !isPositive ? 'rotate(180deg)' : 'none' }} />
        {change} vs {timeFrame}
      </Typography>
    </Paper>
  );
}

// Maps workspace transaction type to the localStorage keys each ticket screen uses
// to track voided ticket numbers (so they're never reused) and the in-flight
// "pending" ticket id (so a voided-but-uncommitted id isn't handed out again).
const VOID_STORAGE_KEYS = {
  PAWN:   { voided: 'voidedPawnTickets',  pending: 'pendingPTTicketId' },
  BUY:    { voided: 'voidedBuyTickets',   pending: 'pendingBTTicketId' },
  TRADE:  { voided: 'voidedTradeTickets', pending: 'pendingTTTicketId' },
  SALE:   { voided: 'voidedSaleTickets',  pending: 'pendingSTTicketId' },
  REDEEM: { voided: 'voidedRDMTickets',   pending: 'pendingRDMTicketId' },
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

const REDEEM_ACCENT = '#0d9488'; // fallback only — actual color comes from the transaction_type DB row

function RedeemTransactionCard({ tx, redeemIcon, redeemColor, onOpen, onVoid }) {
  const fmt = (n) => `$${Number(n).toFixed(2)}`;
  const itemCount = (tx.selectedRedemptions || []).length;
  const accent = redeemColor || REDEEM_ACCENT;
  const RedeemIconComponent = redeemIcon ? (MuiIcons[redeemIcon] ?? MuiIcons.Redeem) : MuiIcons.Redeem;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: '#e0e0e0' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1, borderLeft: `4px solid ${accent}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RedeemIconComponent sx={{ fontSize: 20, color: accent }} />
          <Typography fontWeight={700} fontSize={13} color={accent}>REDEEM</Typography>
        </Box>
        <Chip label={tx.ticketId} size="small"
          sx={{ fontWeight: 700, fontSize: 11, height: 20, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }} />
      </Box>

      <Box sx={{ px: 1.5, pb: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75, mt: 0.75 }}>
          <Chip
            icon={<MuiIcons.Savings sx={{ fontSize: 14 }} />}
            label={`${itemCount} pawn${itemCount === 1 ? '' : 's'}`}
            size="small"
            sx={{ fontSize: 11, height: 22, bgcolor: '#ccfbf1', color: accent, '& .MuiChip-icon': { color: accent } }} />
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" fontWeight={600} color={accent}>Total Due</Typography>
          <Typography variant="caption" fontWeight={700} color={accent}>{fmt(tx.totalRedeem || 0)}</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<MuiIcons.OpenInNew sx={{ fontSize: 13 }} />}
            onClick={onOpen}
            sx={{ flex: 1, fontSize: 11, borderColor: accent, color: accent }}>
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

// ── Workspace localStorage cleanup (legacy) ───────────────────────────────────
// The workspace no longer auto-persists to localStorage or auto-restores on
// customer switch/reload — an unfinished workspace only survives via explicit
// "Park" (backed by the parked_workspaces table). This just clears out any
// stale workspace_* entries left over from before that change.

const WORKSPACE_EXPIRY_MS = 24 * 60 * 60 * 1000;

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

// Strip base64 image fields before sending workspace to server (keeps payload small)
function stripImages(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripImages);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'image' && typeof v === 'string' && v.length > 200) continue; // base64 blob
    out[k] = stripImages(v);
  }
  return out;
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
  const { registerGuard } = useWorkspaceGuard();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [quickSaleMaxAmount, setQuickSaleMaxAmount] = useState(100);
  const [employees, setEmployees] = useState([]);
  const [pawnOpen, setPawnOpen]           = useState(false);
  const [buyAutoScrap, setBuyAutoScrap]   = useState(false);
  const [scrapPrefill, setScrapPrefill]   = useState(null);
  const [buyAutoUnique, setBuyAutoUnique] = useState(false);
  const [uniquePrefill, setUniquePrefill] = useState(null);
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

  const [redeemOpen, setRedeemOpen] = useState(() => {
    if (location.state?.customerUpdated) {
      const raw = sessionStorage.getItem('pendingRedeemState');
      return !!raw;
    }
    if (location.state?.returnToRedeem) {
      const raw = sessionStorage.getItem('pendingRedeemReturn');
      return !!raw;
    }
    return false;
  });
  const [existingRedeemData, setExistingRedeemData] = useState(() => {
    if (location.state?.customerUpdated) {
      const raw = sessionStorage.getItem('pendingRedeemState');
      if (!raw) return null;
      try {
        const { ticketId, selectedRedemptions, notes, ticketNote, showOnReceipt } = JSON.parse(raw);
        return { ticketId, selectedRedemptions, notes, ticketNote, showOnReceipt };
      } catch { return null; }
    }
    if (location.state?.returnToRedeem) {
      const raw = sessionStorage.getItem('pendingRedeemReturn');
      if (!raw) return null;
      try {
        const { ticketId, selectedRedemptions, notes, ticketNote, showOnReceipt } = JSON.parse(raw);
        return { ticketId, selectedRedemptions, notes, ticketNote, showOnReceipt };
      } catch { return null; }
    }
    return null;
  });
  const [voidConfirm, setVoidConfirm]     = useState(null); // workspace tx to void
  const [noCustomerWarning, setNoCustomerWarning] = useState('');
  const [workspaceTransactions, setWorkspaceTransactions] = useState([]);
  const [parkSnackbar, setParkSnackbar]   = useState(null); // { severity, message }

  const customerIdRef = useRef(undefined);
  const pendingResumeWorkspaceRef = useRef(null); // workspace to load on next customer change (from Park resume)

  // Customer state
  const [customer, setCustomer] = useState(null);
  const [customerStats, setCustomerStats] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [showResults, setShowResults] = useState(false);
  // Anchors the results Popper — rendered via portal so it isn't clipped or
  // scrolled by the Customer panel's own overflowY:auto container.
  const customerSearchBoxRef = useRef(null);

  // Full search-results dialog (opened on Enter), copied from the old Home
  // page customer lookup's layout. Uses the same /api/customers/search general
  // search as the inline dropdown below (all four fields set to the same
  // query), which now searches id_number and normalizes phone digits too —
  // see the isSameSearchTerm branch in server.js.
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [dialogSearchResults, setDialogSearchResults] = useState([]);
  const [selectedDialogIdx, setSelectedDialogIdx] = useState(-1);
  const [searchingDialog, setSearchingDialog] = useState(false);

  const handleOpenSearchDialog = async () => {
    const query = customerSearch.trim();
    if (!query) return;
    setShowResults(false);
    setSearchingDialog(true);
    try {
      const res = await axios.get(`${config.apiUrl}/customers/search`, {
        params: { first_name: query, last_name: query, phone: query, email: query },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setDialogSearchResults(res.data);
      setSelectedDialogIdx(res.data.length > 0 ? 0 : -1);
      setSearchDialogOpen(true);
    } catch (err) {
      console.error('Customer search failed:', err);
    } finally {
      setSearchingDialog(false);
    }
  };

  const handleCloseSearchDialog = () => {
    setSearchDialogOpen(false);
    setDialogSearchResults([]);
    setSelectedDialogIdx(-1);
  };

  useEffect(() => {
    axios.get(`${config.apiUrl}/transaction-types`)
      .then(res => setTransactionTypes(res.data))
      .catch(err => console.error('Failed to load transaction types:', err));
    axios.get(`${config.apiUrl}/quick-sale-config`)
      .then(res => setQuickSaleMaxAmount(parseFloat(res.data?.max_amount) || 0))
      .catch(err => console.error('Failed to load quick sale config:', err));
    axios.get(`${config.apiUrl}/employees`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => setEmployees(res.data))
      .catch(err => console.error('Failed to load employees:', err));
  }, []);

  // Clean up expired workspace entries on mount
  useEffect(() => { cleanupExpiredWorkspaces(); }, []);

  // Which of the empty-workspace dashboard cards this employee sees. A manager can
  // set this for anyone from SystemConfig's Employee Configuration tab, but each
  // employee can also override it for themselves via the gear icon below.
  const currentEmployee = employees.find(e => e.employee_id === currentUser?.id);
  const showMessagesCard = currentEmployee?.show_messages_card !== false;
  const showTasksCard = currentEmployee?.show_tasks_card !== false;
  const showLoansLayawaysCard = currentEmployee?.show_loans_layaways_card !== false;
  const showStatsCard = currentEmployee?.show_stats_card !== false;

  const [cardPrefsAnchor, setCardPrefsAnchor] = useState(null);
  const handleToggleCardPref = async (field, currentValue) => {
    const nextValue = !currentValue;
    setEmployees(prev => prev.map(e => e.employee_id === currentUser?.id ? { ...e, [field]: nextValue } : e));
    try {
      await axios.put(`${config.apiUrl}/employees/${currentUser.id}/workspace-card-preferences`, {
        showMessagesCard: field === 'show_messages_card' ? nextValue : showMessagesCard,
        showTasksCard: field === 'show_tasks_card' ? nextValue : showTasksCard,
        showLoansLayawaysCard: field === 'show_loans_layaways_card' ? nextValue : showLoansLayawaysCard,
        showStatsCard: field === 'show_stats_card' ? nextValue : showStatsCard,
      });
    } catch (err) {
      console.error('Failed to update workspace card preferences:', err);
      setEmployees(prev => prev.map(e => e.employee_id === currentUser?.id ? { ...e, [field]: currentValue } : e));
    }
  };



  // On customer change: the workspace is never auto-restored — it starts
  // empty for whichever customer is now selected. The one exception is
  // resuming an explicitly Parked workspace (pendingResumeWorkspaceRef, set
  // by the "Resume" flow below), which supplies its own transactions.
  // Actually switching customers while there's unparked work is gated
  // upstream by confirmLeaveWorkspace (see handleSelectCustomer/handleClearCustomer),
  // so by the time this effect runs, workspaceTransactions is already safe to reset.
  useEffect(() => {
    const prevId = customerIdRef.current;
    const newId = customer?.id;
    if (prevId === newId) return;
    if (pendingResumeWorkspaceRef.current !== null) {
      setWorkspaceTransactions(pendingResumeWorkspaceRef.current);
      pendingResumeWorkspaceRef.current = null;
    } else {
      setWorkspaceTransactions([]);
    }
    customerIdRef.current = newId;
  }, [customer?.id]);

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

  // Load a resumed workspace when navigated here from the Navbar resume dialog
  useEffect(() => {
    if (!location.state?.resumedWorkspace) return;
    const { resumedWorkspace, resumedCustomerId } = location.state;
    pendingResumeWorkspaceRef.current = resumedWorkspace || [];
    if (resumedCustomerId) {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      axios.get(`${config.apiUrl}/customers/${resumedCustomerId}`, { headers })
        .then(res => setCustomer(res.data))
        .catch(() => {
          setWorkspaceTransactions(resumedWorkspace || []);
          setParkSnackbar({ severity: 'warning', message: 'Workspace restored. Please re-select the customer.' });
          pendingResumeWorkspaceRef.current = null;
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.resumedWorkspace]);

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
        const [custRes, statsRes, creditRes] = await Promise.all([
          axios.get(`${config.apiUrl}/customers/${customerId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          axios.get(`${config.apiUrl}/customers/${customerId}/pawn/stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          axios.get(`${config.apiUrl}/customers/${customerId}/stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
        ]);
        setCustomer(custRes.data);
        setCustomerStats({ ...statsRes.data, store_credit: creditRes.data?.store_credit ?? 0 });
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
        const [custRes, statsRes, creditRes] = await Promise.all([
          axios.get(`${config.apiUrl}/customers/${customerId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          axios.get(`${config.apiUrl}/customers/${customerId}/pawn/stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          axios.get(`${config.apiUrl}/customers/${customerId}/stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
        ]);
        setCustomer(custRes.data);
        setCustomerStats({ ...statsRes.data, store_credit: creditRes.data?.store_credit ?? 0 });
        setRestoredPawnData({ ticketId, pawnItems, totalPawnOverride });
        setPawnOpen(true);
      } catch (err) {
        console.error('Failed to restore pawn session after customer edit:', err);
      }
    })();
  }, [location.state]);

  // Restore sale screen after returning from CustomerEditor (either an
  // existing customer was edited, or — from the quick sale customer picker's
  // "Register New Customer" — a brand new one was just created).
  useEffect(() => {
    if (!location.state?.customerUpdated) return;
    const raw = sessionStorage.getItem('pendingSaleState');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingSaleState');
    const { customerId, customer: savedCustomer, ticketId, saleItems, ticketNote, showOnReceipt, globalDiscount } = pending;
    const newCustomer = location.state?.newCustomer;
    const idToRefresh = newCustomer?.id || customerId;
    if (!idToRefresh) return;
    // Open immediately with saved/new customer so there's no empty-screen flash
    if (newCustomer) setCustomer(newCustomer);
    else if (savedCustomer) setCustomer(savedCustomer);
    setExistingSaleData({ ticketId, saleItems, ticketNote, showOnReceipt, globalDiscount });
    setSaleOpen(true);
    // Refresh customer in background to pick up any edits/the full new record
    axios.get(`${config.apiUrl}/customers/${idToRefresh}`, {
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

  // Restore redeem screen after returning from CustomerEditor
  useEffect(() => {
    if (!location.state?.customerUpdated) return;
    const raw = sessionStorage.getItem('pendingRedeemState');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingRedeemState');
    const { customerId, customer: savedCustomer, ticketId, selectedRedemptions, notes, ticketNote, showOnReceipt } = pending;
    if (!customerId) return;
    if (savedCustomer) setCustomer(savedCustomer);
    setExistingRedeemData({ ticketId, selectedRedemptions, notes, ticketNote, showOnReceipt });
    setRedeemOpen(true);
    axios.get(`${config.apiUrl}/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => setCustomer(res.data))
      .catch(err => console.error('Failed to refresh customer after redeem edit:', err));
  }, [location.state]);

  // Restore redeem screen after navigating back from Checkout
  useEffect(() => {
    if (!location.state?.returnToRedeem) return;
    const raw = sessionStorage.getItem('pendingRedeemReturn');
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    sessionStorage.removeItem('pendingRedeemReturn');
    const { customerId, customer: savedCustomer, ticketId, selectedRedemptions, notes, ticketNote, showOnReceipt } = pending;
    if (!customerId) return;
    if (savedCustomer) setCustomer(savedCustomer);
    setExistingRedeemData({ ticketId, selectedRedemptions, notes, ticketNote, showOnReceipt });
    setRedeemOpen(true);
    axios.get(`${config.apiUrl}/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => setCustomer(res.data))
      .catch(err => console.error('Failed to refresh customer after redeem checkout back:', err));
  }, [location.state]);

  const handleCustomerSearch = async (query) => {
    setCustomerSearch(query);
    if (!query.trim()) { setCustomerResults([]); setShowResults(false); return; }
    setSearchingCustomer(true);
    try {
      const res = await axios.get(`${config.apiUrl}/customers/search`, {
        params: { first_name: query, last_name: query, phone: query, email: query, limit: 5 },
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
    const proceed = await confirmLeaveWorkspace();
    if (!proceed) return;

    setCustomerStats(null);
    setCustomerSearch('');
    setCustomerResults([]);
    setShowResults(false);
    setCustomerLoading(true);
    // Show name immediately while full record loads
    setCustomer({ id: c.id, first_name: c.first_name, last_name: c.last_name });
    try {
      const [fullRes, statsRes, creditRes] = await Promise.all([
        axios.get(`${config.apiUrl}/customers/${c.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        axios.get(`${config.apiUrl}/customers/${c.id}/pawn/stats`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        axios.get(`${config.apiUrl}/customers/${c.id}/stats`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);
      setCustomer(fullRes.data);
      setCustomerStats({ ...statsRes.data, store_credit: creditRes.data?.store_credit ?? 0 });
    } catch (err) {
      console.error('Failed to fetch customer data:', err);
      setCustomerStats(null);
    } finally {
      setCustomerLoading(false);
    }
  };

  const handleClearCustomer = async () => {
    const proceed = await confirmLeaveWorkspace();
    if (!proceed) return;
    setCustomer(null);
    setCustomerStats(null);
  };

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

  // Core park POST, shared by the "Park" button and the leave-workspace
  // warning dialog's "Park" option. Does not touch customer/workspace state —
  // callers decide what to reset after a successful park.
  const parkWorkspace = async (targetCustomer, targetTransactions) => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    try {
      await axios.post(`${config.apiUrl}/parked-workspaces`, {
        customer_id: targetCustomer.id,
        workspace_data: stripImages(targetTransactions),
        parked_by_employee_id: u.id || null,
      }, { headers });
      window.dispatchEvent(new CustomEvent('parkedWorkspacesChanged'));
      return true;
    } catch {
      return false;
    }
  };

  const handleParkTransaction = async () => {
    if (!customer) {
      setParkSnackbar({ severity: 'warning', message: 'Select a customer before parking.' });
      return;
    }
    if (workspaceTransactions.length === 0) {
      setParkSnackbar({ severity: 'warning', message: 'Workspace is empty — nothing to park.' });
      return;
    }
    const ok = await parkWorkspace(customer, workspaceTransactions);
    if (ok) {
      setWorkspaceTransactions([]);
      setParkSnackbar({ severity: 'success', message: `Workspace parked for ${customer.first_name}. Any employee can resume it.` });
      setCustomer(null);
    } else {
      setParkSnackbar({ severity: 'error', message: 'Failed to park workspace. Try again.' });
    }
  };

  // ── Leave-workspace guard ──────────────────────────────────────────────────
  // Anything sitting in the workspace that hasn't been explicitly Parked is
  // considered "unsaved" — switching customers or navigating away (via the
  // Sidebar) triggers this dialog instead of silently carrying it along or
  // silently discarding it.
  const [leaveWarningOpen, setLeaveWarningOpen] = useState(false);
  const leaveResolveRef = useRef(null);

  const confirmLeaveWorkspace = useCallback(() => {
    if (workspaceTransactions.length === 0) return Promise.resolve(true);
    return new Promise(resolve => {
      leaveResolveRef.current = resolve;
      setLeaveWarningOpen(true);
    });
  }, [workspaceTransactions.length]);

  const resolveLeaveWarning = (proceed) => {
    setLeaveWarningOpen(false);
    const resolve = leaveResolveRef.current;
    leaveResolveRef.current = null;
    resolve?.(proceed);
  };

  const handleLeaveDelete = () => {
    setWorkspaceTransactions([]);
    setParkSnackbar({ severity: 'info', message: 'Workspace items discarded.' });
    resolveLeaveWarning(true);
  };

  const handleLeaveReturn = () => resolveLeaveWarning(false);

  const handleLeavePark = async () => {
    if (!customer) {
      setParkSnackbar({ severity: 'warning', message: 'Select a customer before parking.' });
      resolveLeaveWarning(false);
      return;
    }
    const ok = await parkWorkspace(customer, workspaceTransactions);
    if (ok) {
      setWorkspaceTransactions([]);
      setParkSnackbar({ severity: 'success', message: `Workspace parked for ${customer.first_name}. Any employee can resume it.` });
      resolveLeaveWarning(true);
    } else {
      setParkSnackbar({ severity: 'error', message: 'Failed to park workspace. Try again.' });
      resolveLeaveWarning(false);
    }
  };

  // Let the Sidebar (or anything else using WorkspaceGuardContext) ask
  // permission before navigating away from this page.
  useEffect(() => {
    const unregister = registerGuard({
      hasUnparkedWork: workspaceTransactions.length > 0,
      confirmLeave: confirmLeaveWorkspace,
    });
    return unregister;
  }, [registerGuard, workspaceTransactions.length, confirmLeaveWorkspace]);


  const handleCheckoutAll = () => {
    if (workspaceTransactions.length === 0) return;
    const isAllSale = workspaceTransactions.every(tx => tx.type === 'SALE');
    const quickSaleTotal = isAllSale
      ? workspaceTransactions.reduce((sum, tx) => sum + Number(tx.total || 0), 0)
      : 0;
    // A no-customer "quick sale" is only allowed under the configured limit —
    // above it, require a real customer just like any other sale.
    const isQuickSale = !customer && isAllSale && quickSaleTotal <= quickSaleMaxAmount;
    if (!customer && !isQuickSale) {
      if (isAllSale && quickSaleTotal > quickSaleMaxAmount) {
        setParkSnackbar({
          severity: 'warning',
          message: `Quick sale total ($${quickSaleTotal.toFixed(2)}) exceeds the $${quickSaleMaxAmount.toFixed(2)} limit — select a customer to continue.`,
        });
      }
      return;
    }
    const u = JSON.parse(localStorage.getItem('user') || '{}');

    // For quick sale, cartCustomer is null — Checkout.js will create a walk-in customer in handleSubmit
    const cartCustomer = customer ? {
      id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
      phone: customer.phone || '',
      email: customer.email || '',
      tax_exempt: customer.tax_exempt || false,
    } : null;
    const employeeObj = u.id
      ? { id: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim(), role: u.role }
      : null;

    const checkoutItems = workspaceTransactions.flatMap(tx => {
      if (tx.type === 'PAWN') {
        const rawTotal = (tx.pawnItems || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
        const scale = rawTotal > 0 ? (parseFloat(tx.totalPawnAmount) || rawTotal) / rawTotal : 1;
        return (tx.pawnItems || []).map(item => ({
          ...item,
          transaction_type: 'pawn',
          pawnTicketId: tx.ticketId,
          buyTicketId: tx.ticketId,
          price: (parseFloat(item.amount) || 0) * scale,
          value: (parseFloat(item.amount) || 0) * scale,
          ticket_note: tx.ticketNote || null,
          show_on_receipt: tx.showOnReceipt,
          customer: cartCustomer,
          employee: employeeObj,
        }));
      }
      if (tx.type === 'SALE') {
        return (tx.saleItems || []).flatMap(item =>
          Array.from({ length: parseInt(item.quantity) || 1 }, () => ({
            ...item,
            id: `${tx.ticketId}_${item.item_id}_${Date.now()}_${Math.random()}`,
            description: item.name,
            price: item.price,
            retail_price: item.price,
            value: item.price,
            transaction_type: 'sale',
            fromInventory: true,
            buyTicketId: tx.ticketId,
            globalDiscount: tx.globalDiscount || 0,
            ticket_note: tx.ticketNote || null,
            show_on_receipt: tx.showOnReceipt,
            customer: cartCustomer,
            employee: employeeObj,
          }))
        );
      }
      if (tx.type === 'BUY') {
        const rawTotal = (tx.buyItems || []).reduce((s, i) => s + (parseFloat(i.paid) || 0) * (parseInt(i.qty) || 1), 0);
        const scale = rawTotal > 0 ? (parseFloat(tx.totalPaid) || rawTotal) / rawTotal : 1;
        return (tx.buyItems || []).flatMap(item => {
          const jewelryBase = item.jewelryData ? { ...item.jewelryData } : {};
          const itemPaid = (parseFloat(item.paid) || 0) * scale;
          return Array.from({ length: parseInt(item.qty) || 1 }, () => ({
            ...jewelryBase,
            ...item,
            id: `${tx.ticketId}_${item._lineId}_${Date.now()}`,
            description: item.description || item.jewelryData?.short_desc || item.part_no,
            short_desc: item.description || item.jewelryData?.short_desc || '',
            long_desc: item.jewelryData?.long_desc || item.description || '',
            price: itemPaid,
            value: itemPaid,
            transaction_type: 'buy',
            buyTicketId: tx.ticketId,
            ticket_note: tx.ticketNote || null,
            show_on_receipt: tx.showOnReceipt,
            customer: cartCustomer,
            employee: employeeObj,
          }));
        });
      }
      if (tx.type === 'TRADE') {
        const saleId = tx.saleTicketId || tx.ticketId;
        const buyId = tx.buyTicketId || tx.ticketId;
        return [
          ...(tx.saleItems || []).flatMap(item =>
            Array.from({ length: parseInt(item.quantity) || 1 }, () => ({
              ...item,
              id: `${tx.ticketId}_sale_${item._lineId}_${Date.now()}`,
              description: item.name || item.sku,
              short_desc: item.name || '',
              price: parseFloat(item.price) || 0,
              value: parseFloat(item.price) || 0,
              transaction_type: 'trade_sale',
              fromInventory: true,
              tradeTicketId: tx.ticketId,
              saleTicketId: saleId,
              ticket_note: tx.ticketNote || null,
              show_on_receipt: tx.showOnReceipt,
              customer: cartCustomer,
              employee: employeeObj,
            }))
          ),
          ...(tx.tradeItems || []).map(item => {
            const jewelryBase = item.jewelryData ? { ...item.jewelryData } : {};
            return {
              ...jewelryBase,
              ...item,
              id: `${tx.ticketId}_trade_${item._lineId}_${Date.now()}`,
              description: item.description || item.jewelryData?.short_desc || item.part_no,
              short_desc: item.description || item.jewelryData?.short_desc || '',
              long_desc: item.jewelryData?.long_desc || item.description || '',
              price: -((parseFloat(item.tradeAllowance) || 0) * (parseInt(item.qty) || 1)),
              value: -((parseFloat(item.tradeAllowance) || 0) * (parseInt(item.qty) || 1)),
              transaction_type: 'trade_in',
              tradeTicketId: tx.ticketId,
              buyTicketId: buyId,
              ticket_note: tx.ticketNote || null,
              show_on_receipt: tx.showOnReceipt,
              customer: cartCustomer,
              employee: employeeObj,
            };
          }),
        ];
      }
      if (tx.type === 'PAYMENT') {
        return (tx.selectedPayments || [])
          .filter(p => p.type === 'pawn_extension')
          .map(p => {
            const numPeriods = p.numPeriods || 1;
            const extensionDays = (p.frequency_days || 30) * numPeriods;
            const prevDate = p.due_date_raw || null;
            const newDate = p.newDueDateRaw ? new Date(p.newDueDateRaw).toISOString().split('T')[0] : null;
            const interestPaid = Math.round(p.principal * (p.interest_rate / 100) * numPeriods * 100) / 100;
            const feePaid = Math.round((p.principal * (p.insurance_rate / 100) + (p.storage_fee || 0)) * numPeriods * 100) / 100;
            return {
              id: `${tx.ticketId}_${p.ref}_${Date.now()}`,
              description: `${p.ref} — ${p.description}`,
              price: parseFloat(p.paymentAmount) || 0,
              value: parseFloat(p.paymentAmount) || 0,
              transaction_type: 'payment',
              pawnTicketId: p.ref,
              paymentTicketId: tx.ticketId,
              principal: p.principal,
              interest_paid: interestPaid,
              fee_paid: feePaid,
              total_paid: parseFloat(p.paymentAmount) || 0,
              previous_due_date: prevDate,
              new_due_date: newDate,
              extension_days: extensionDays,
              numPeriods,
              ticket_note: tx.ticketNote || null,
              show_on_receipt: tx.showOnReceipt,
              customer: cartCustomer,
              employee: employeeObj,
            };
          });
      }
      if (tx.type === 'REDEEM') {
        // One cart item per physical item in the pawn ticket — only the first
        // item of each ticket carries the redemption price/principal (the
        // rest price at 0), matching Checkout.js's redeem handling.
        return (tx.selectedRedemptions || []).flatMap(p => {
          const items = (p.items && p.items.length > 0) ? p.items : [{ item_id: null, description: p.description, location: null }];
          return items.map((it, idx) => ({
            id: `${tx.ticketId}_${p.ref}_${it.item_id || idx}_${Date.now()}`,
            description: it.description || p.description,
            long_desc: it.description || p.description,
            short_desc: it.description || p.description,
            price: idx === 0 ? (parseFloat(p.redeem_amount) || 0) : 0,
            value: idx === 0 ? (parseFloat(p.redeem_amount) || 0) : 0,
            transaction_type: 'redeem',
            pawnTicketId: p.ref,
            redeemTicketId: tx.ticketId,
            item_id: it.item_id,
            location: it.location,
            principal: idx === 0 ? p.principal : 0,
            interest: idx === 0 ? (parseFloat(p.interest_amount) || 0) + (parseFloat(p.insurance_amount) || 0) : 0,
            totalRedemptionAmount: idx === 0 ? (parseFloat(p.redeem_amount) || 0) : 0,
            ticket_note: tx.ticketNote || null,
            show_on_receipt: tx.showOnReceipt,
            customer: cartCustomer,
            employee: employeeObj,
          }));
        });
      }
      return [];
    });

    sessionStorage.setItem('checkoutItems', JSON.stringify(checkoutItems));
    if (cartCustomer) {
      sessionStorage.setItem('selectedCustomer', JSON.stringify(cartCustomer));
    } else {
      sessionStorage.removeItem('selectedCustomer');
    }
    sessionStorage.setItem('checkoutFrom', 'workspace');
    navigate('/checkout', {
      state: { items: checkoutItems, allCartItems: checkoutItems, customer: cartCustomer, from: 'workspace' },
    });
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
    if (tx.type === 'REDEEM') {
      const count = tx.selectedRedemptions?.length || 0;
      return {
        label: `Redeem (${count} pawn${count !== 1 ? 's' : ''})`,
        value: `+$${Number(tx.totalRedeem || 0).toFixed(2)}`,
        color: transactionTypes.find(t => t.type === 'redeem')?.color || REDEEM_ACCENT,
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
    if (tx.type === 'REDEEM')  return sum + Number(tx.totalRedeem || 0);
    return sum;
  }, 0);

  const handleTransactionTypeClick = (type) => {
    if (type === 'quick_sale') {
      setSaleOpen(true);
    } else if (type === 'pawn') {
      if (!customer) { setNoCustomerWarning('pawn ticket'); return; }
      if (customerLoading) return;
      setPawnOpen(true);
    } else if (type === 'sale') {
      if (!customer) { setNoCustomerWarning('sale ticket'); return; }
      setSaleOpen(true);
    } else if (type === 'buy') {
      if (!customer) { setNoCustomerWarning('buy ticket'); return; }
      setBuyAutoScrap(false);
      setScrapPrefill(null);
      setBuyAutoUnique(false);
      setUniquePrefill(null);
      setBuyOpen(true);
    } else if (type === 'trade') {
      if (!customer) { setNoCustomerWarning('trade ticket'); return; }
      setTradeOpen(true);
    } else if (type === 'payment') {
      if (!customer) { setNoCustomerWarning('payment ticket'); return; }
      setPaymentOpen(true);
    } else if (type === 'redeem') {
      if (!customer) { setNoCustomerWarning('redeem ticket'); return; }
      setRedeemOpen(true);
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

  const handleAddRedeemToWorkspace = (redeemData) => {
    setWorkspaceTransactions(prev => {
      const existingIdx = prev.findIndex(t => t.type === 'REDEEM' && t.ticketId === redeemData.ticketId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...redeemData };
        return updated;
      }
      return [...prev, { id: Date.now(), type: 'REDEEM', ...redeemData }];
    });
    setRedeemOpen(false);
    setExistingRedeemData(null);
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
    setBuyAutoScrap(false);
    setScrapPrefill(null);
    setBuyAutoUnique(false);
    setUniquePrefill(null);
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
    setBuyAutoScrap(false);
    setScrapPrefill(null);
    setBuyAutoUnique(false);
    setUniquePrefill(null);
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
      const buyTicketId = existingBuyData?.ticketId;
      setWorkspaceTransactions(prev => {
        // Remove converted item from the buy ticket in workspace
        const withBuyUpdated = prev.map(t => {
          if (!(t.type === 'BUY' && t.ticketId === buyTicketId)) return t;
          return { ...t, buyItems: (t.buyItems || []).filter(i => i._lineId !== item._lineId) };
        });
        if (targetTicketId) {
          return withBuyUpdated.map(t => {
            if (!(t.type === 'PAWN' && t.ticketId === targetTicketId)) return t;
            const newPawnItems = [...(t.pawnItems || []), pawnItem];
            const newTotal = newPawnItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
            return { ...t, pawnItems: newPawnItems, totalPawnAmount: newTotal };
          });
        }
        return withBuyUpdated;
      });
      setBuyOpen(false);
      setExistingBuyData(null);
      if (targetTicketId) {
        // Merged silently into an existing pawn ticket already in the workspace
        // (matches how merging into an existing trade/buy ticket behaves elsewhere)
      } else {
        setRestoredPawnData({ pawnItems: [pawnItem], ticketNote: '', showOnReceipt: false });
        setPawnOpen(true);
      }
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

  const handleSaleConvertTo = ({ type, item, targetTicketId }) => {
    if (type !== 'trade') return;
    const saleTradeItem = {
      _lineId: item._lineId,
      part_no: item.sku || item.item_id || '',
      item_id: item.item_id,
      sku: item.sku || item.item_id,
      inventory_type: item.inventory_type,
      name: item.name || '',
      category_name: item.category_name || '',
      price: parseFloat(item.price) || 0,
      quantity: parseInt(item.quantity) || 1,
      discount: item.discount || 0,
      discountType: item.discountType || 'amount',
      images: item.images || [],
    };
    const saleTicketId = existingSaleData?.ticketId;
    setWorkspaceTransactions(prev => {
      // Remove converted item from the sale ticket in workspace
      const withSaleUpdated = prev.map(t => {
        if (!(t.type === 'SALE' && t.ticketId === saleTicketId)) return t;
        return { ...t, saleItems: (t.saleItems || []).filter(i => i._lineId !== item._lineId) };
      });
      if (targetTicketId) {
        return withSaleUpdated.map(t => {
          if (!(t.type === 'TRADE' && t.ticketId === targetTicketId)) return t;
          const newSaleItems = [...(t.saleItems || []), saleTradeItem];
          const newSaleTotal = newSaleItems.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1), 0);
          return { ...t, saleItems: newSaleItems, totalSaleAfterTax: newSaleTotal, netDueToCustomer: (t.totalTradeAllowance || 0) - newSaleTotal };
        });
      } else {
        const last = parseInt(localStorage.getItem('lastTTTicketNumber') || '100000') + 1;
        localStorage.setItem('lastTTTicketNumber', last.toString());
        const newTicketId = `TT-${last}`;
        const saleTotal = saleTradeItem.price * saleTradeItem.quantity;
        return [
          ...withSaleUpdated,
          {
            id: Date.now(), type: 'TRADE', ticketId: newTicketId,
            tradeItems: [], saleItems: [saleTradeItem],
            totalTradeAllowance: 0,
            totalSaleAfterTax: saleTotal,
            netDueToCustomer: -saleTotal,
            taxAmount: 0, taxRate: 0.07,
            customer,
          },
        ];
      }
    });
  };

  const handlePawnConvertTo = ({ type, item, targetTicketId, sourceTicketId }) => {
    const removePawnItem = (t) => {
      if (!(t.type === 'PAWN' && t.ticketId === sourceTicketId)) return t;
      const newPawnItems = (t.pawnItems || []).filter(i => i.id !== item.id);
      const newTotal = newPawnItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
      return { ...t, pawnItems: newPawnItems, totalPawnAmount: newTotal };
    };

    // Pawn items store jewelry fields flattened on the item itself (no nested
    // jewelryData wrapper, unlike Buy/Trade items) — so a jewelry-sourced pawn
    // item IS its own jewelryData once converted.
    const jewelryData = item.jewelryData || (item.sourceEstimator === 'jewelry' ? item : undefined);

    if (type === 'buy') {
      const buyItem = {
        _lineId: item.id,
        part_no: item.part_number || '',
        category_id: item.category_id || '',
        category_name: item.category || '',
        description: item.item || '',
        serial_number: item.serial_number || item.serial || '',
        qty: item.qty || 1,
        paid: parseFloat(item.amount) || 0,
        images: item.images || [],
        sourceEstimator: item.sourceEstimator,
        jewelryData,
        ...(item.fromInventory && { fromInventory: true, item_id: item.item_id }),
      };
      setWorkspaceTransactions(prev => {
        const withPawnUpdated = prev.map(removePawnItem);
        if (targetTicketId) {
          return withPawnUpdated.map(t => {
            if (!(t.type === 'BUY' && t.ticketId === targetTicketId)) return t;
            return { ...t, buyItems: [...(t.buyItems || []), buyItem] };
          });
        } else {
          const last = parseInt(localStorage.getItem('lastBTTicketNumber') || '0') + 1;
          localStorage.setItem('lastBTTicketNumber', last.toString());
          const newTicketId = `BT-${last.toString().padStart(8, '0')}`;
          return [
            ...withPawnUpdated,
            { id: Date.now(), type: 'BUY', ticketId: newTicketId, buyItems: [buyItem], customer },
          ];
        }
      });
    }

    if (type === 'trade') {
      const tradeAllowance = parseFloat(item.amount) || 0;
      const qty = item.qty || 1;
      const tradeItem = {
        _lineId: item.id,
        part_no: item.part_number || '',
        category_id: item.category_id || '',
        category_name: item.category || '',
        description: item.item || '',
        serial_number: item.serial_number || item.serial || '',
        qty,
        tradeAllowance,
        images: item.images || [],
        sourceEstimator: item.sourceEstimator,
        jewelryData,
        ...(item.fromInventory && { fromInventory: true, item_id: item.item_id }),
      };
      setWorkspaceTransactions(prev => {
        const withPawnUpdated = prev.map(removePawnItem);
        if (targetTicketId) {
          return withPawnUpdated.map(t => {
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
            ...withPawnUpdated,
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
    const workspaceBuyTickets = workspaceTransactions.filter(t => t.type === 'BUY');
    const workspaceTradeTickets = workspaceTransactions.filter(t => t.type === 'TRADE');
    return (
      <PawnTransactionScreen
        customer={customer}
        customerStats={customerStats}
        onClose={() => { setPawnOpen(false); setOpeningTxId(null); setRestoredPawnData(null); }}
        onAddToWorkspace={(data) => { handleAddPawnToWorkspace(data); setRestoredPawnData(null); }}
        onConvertTo={handlePawnConvertTo}
        onRemoveFromWorkspace={(ticketId) => {
          setWorkspaceTransactions(prev => prev.filter(t => !(t.type === 'PAWN' && t.ticketId === ticketId)));
          setPawnOpen(false);
          setOpeningTxId(null);
          setRestoredPawnData(null);
        }}
        existingPawnData={existingPawnData}
        workspaceBuyTickets={workspaceBuyTickets}
        workspaceTradeTickets={workspaceTradeTickets}
      />
    );
  }

  if (saleOpen) {
    const workspaceTradeTickets = workspaceTransactions.filter(t => t.type === 'TRADE');
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
        onSelectCustomer={handleSelectCustomer}
        existingSaleData={existingSaleData}
        onConvertTo={handleSaleConvertTo}
        workspaceTradeTickets={workspaceTradeTickets}
      />
    );
  }

  if (buyOpen) {
    const workspaceTradeTickets = workspaceTransactions.filter(t => t.type === 'TRADE');
    const workspacePawnTickets = workspaceTransactions.filter(t => t.type === 'PAWN');
    return (
      <BuyTransactionScreen
        customer={customer}
        customerStats={customerStats}
        onClose={() => {
          setBuyOpen(false); setExistingBuyData(null);
          setBuyAutoScrap(false); setScrapPrefill(null);
          setBuyAutoUnique(false); setUniquePrefill(null);
        }}
        onAddToWorkspace={handleAddBuyToWorkspace}
        onRemoveFromWorkspace={(ticketId) => {
          setWorkspaceTransactions(prev => prev.filter(t => !(t.type === 'BUY' && t.ticketId === ticketId)));
          setBuyOpen(false);
          setExistingBuyData(null);
          setBuyAutoScrap(false);
          setScrapPrefill(null);
          setBuyAutoUnique(false);
          setUniquePrefill(null);
        }}
        onConvertTo={handleBuyConvertTo}
        existingBuyData={existingBuyData}
        workspaceTradeTickets={workspaceTradeTickets}
        workspacePawnTickets={workspacePawnTickets}
        autoOpenScrap={buyAutoScrap}
        scrapPrefill={scrapPrefill}
        autoOpenUnique={buyAutoUnique}
        uniqueParsedValues={uniquePrefill}
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

  if (redeemOpen) {
    return (
      <RedeemTransactionScreen
        customer={customer}
        customerStats={customerStats}
        onClose={() => { setRedeemOpen(false); setExistingRedeemData(null); }}
        onAddToWorkspace={handleAddRedeemToWorkspace}
        existingRedeemData={existingRedeemData}
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
          onKeyDown={e => {
            if (e.key !== 'Enter') return;
            const parsed = parseQuickScrapEntry(search);
            if (!parsed.isBulkScrap && !parsed.isUniqueWithPrefill) return;
            if (!customer) { setNoCustomerWarning('buy ticket'); return; }
            if (parsed.isBulkScrap) {
              setSearch('');
              setExistingBuyData(null);
              setBuyAutoScrap(true);
              setScrapPrefill(parsed.rowKey && parsed.weightG != null
                ? { rowKey: parsed.rowKey, grossWt: String(parsed.weightG), purityValue: parsed.purityValue, karat: parsed.karat }
                : null);
              setBuyAutoUnique(false);
              setUniquePrefill(null);
              setBuyOpen(true);
            } else if (parsed.isUniqueWithPrefill) {
              setSearch('');
              setExistingBuyData(null);
              setBuyAutoScrap(false);
              setScrapPrefill(null);
              setUniquePrefill({
                weight: parsed.weightG,
                metal: parsed.metal,
                purity: parsed.karat != null ? `${parsed.karat}K` : parsed.purityValue,
              });
              setBuyAutoUnique(true);
              setBuyOpen(true);
            }
          }}
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
        <Button
          variant="outlined"
          startIcon={<MuiIcons.LocalParking />}
          onClick={handleParkTransaction}
          disabled={!customer || workspaceTransactions.length === 0}
          sx={{ whiteSpace: 'nowrap', borderRadius: 2 }}
        >
          Park Transaction
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
                <Box ref={customerSearchBoxRef} sx={{ position: 'relative', mb: 1.5 }}>
                  <TextField
                    fullWidth size="small"
                    placeholder="Search by name, phone, email..."
                    value={customerSearch}
                    onChange={e => handleCustomerSearch(e.target.value)}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    onFocus={() => customerResults.length > 0 && setShowResults(true)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleOpenSearchDialog(); } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {(searchingCustomer || searchingDialog)
                            ? <MuiIcons.HourglassEmpty fontSize="small" sx={{ color: 'text.secondary' }} />
                            : <MuiIcons.Search fontSize="small" sx={{ color: 'text.secondary' }} />}
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  {/* Rendered via Popper (portaled to <body>) so the results
                      list floats above the page instead of being clipped or
                      forcing the Customer panel's own scroll container to
                      scroll — the panel stays a fixed size, the list doesn't. */}
                  <Popper
                    open={showResults && !!customerSearch}
                    anchorEl={customerSearchBoxRef.current}
                    placement="bottom-start"
                    style={{ zIndex: 1300, width: customerSearchBoxRef.current?.clientWidth }}
                    modifiers={[{ name: 'offset', options: { offset: [0, 4] } }]}
                  >
                    {customerResults.length > 0 ? (
                      <Paper elevation={4} sx={{ borderRadius: 1, maxHeight: 200, overflowY: 'auto' }}>
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
                    ) : !searchingCustomer && (
                      <Paper elevation={4} sx={{ borderRadius: 1, px: 1.5, py: 1 }}>
                        <Typography fontSize={12} color="text.secondary">No customers found</Typography>
                      </Paper>
                    )}
                  </Popper>
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
          {workspaceTransactions.length > 0 && (
            <Paper sx={{ px: { md: 2, xl: 1.5 }, py: { md: 1, xl: 0.75 }, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography fontWeight={700} fontSize={{ md: 13, xl: 11 }} letterSpacing={1}>TRANSACTION WORKSPACE</Typography>
                <Badge badgeContent={workspaceTransactions.length} color="primary" sx={{ '& .MuiBadge-badge': { position: 'relative', transform: 'none', ml: 0.5 } }}>
                  <Box />
                </Badge>
                <Typography variant="caption" color="text.secondary">Add, edit or remove transactions before checkout.</Typography>
              </Box>
            </Paper>
          )}

          {/* Transaction cards grid */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {workspaceTransactions.length === 0 ? (
              <Box sx={{ py: 1, position: 'relative' }}>
                <Tooltip title="Choose which cards you see here">
                  <IconButton
                    size="small"
                    onClick={(e) => setCardPrefsAnchor(e.currentTarget)}
                    sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                  >
                    <MuiIcons.Settings fontSize="small" />
                  </IconButton>
                </Tooltip>

                {showStatsCard && (
                  <Grid container spacing={{ md: 1.5, xl: 1 }} sx={{ mb: 2, pr: 5 }}>
                    {DASHBOARD_STATS.map((stat) => (
                      <Grid item xs={12} sm={6} md={3} key={stat.title}>
                        <StatCard {...stat} />
                      </Grid>
                    ))}
                  </Grid>
                )}

                <Menu anchorEl={cardPrefsAnchor} open={Boolean(cardPrefsAnchor)} onClose={() => setCardPrefsAnchor(null)}>
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Show on this screen
                    </Typography>
                    <FormControlLabel
                      control={<Checkbox size="small" checked={showStatsCard} onChange={() => handleToggleCardPref('show_stats_card', showStatsCard)} />}
                      label={<Typography variant="body2">Stats</Typography>}
                    />
                    <FormControlLabel
                      control={<Checkbox size="small" checked={showMessagesCard} onChange={() => handleToggleCardPref('show_messages_card', showMessagesCard)} />}
                      label={<Typography variant="body2">Messages</Typography>}
                    />
                    <FormControlLabel
                      control={<Checkbox size="small" checked={showTasksCard} onChange={() => handleToggleCardPref('show_tasks_card', showTasksCard)} />}
                      label={<Typography variant="body2">Tasks</Typography>}
                    />
                    <FormControlLabel
                      control={<Checkbox size="small" checked={showLoansLayawaysCard} onChange={() => handleToggleCardPref('show_loans_layaways_card', showLoansLayawaysCard)} />}
                      label={<Typography variant="body2">Loans/Layaways Due Today</Typography>}
                    />
                  </Box>
                </Menu>

                {!showStatsCard && !showMessagesCard && !showTasksCard && !showLoansLayawaysCard ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1.5, color: 'text.secondary' }}>
                    <MuiIcons.Receipt sx={{ fontSize: 48, opacity: 0.15 }} />
                    <Typography variant="body2" color="text.secondary">No transactions in workspace yet.</Typography>
                    <Typography variant="caption" color="text.secondary">Use the buttons below to start a pawn, sale, or other transaction.</Typography>
                  </Box>
                ) : (
                  <Grid container spacing={{ md: 1.5, xl: 1 }}>
                    {showMessagesCard && (
                      <Grid item xs={12} md={4}>
                        <Paper variant="outlined" sx={{ p: 2, minHeight: 220 }}>
                          <Typography variant="h6" fontSize={15} gutterBottom>Messages</Typography>
                          <List dense sx={{ p: 0 }}>
                            {DASHBOARD_MESSAGES.map((msg, idx) => (
                              <ListItem key={idx} divider={idx < DASHBOARD_MESSAGES.length - 1} sx={{ px: 0 }}>
                                <ListItemText
                                  primaryTypographyProps={{ fontSize: 12.5 }}
                                  secondaryTypographyProps={{ fontSize: 11 }}
                                  primary={`[${msg.type}] ${msg.text}`}
                                  secondary={msg.type === 'announcement' ? 'Pinned' : ''}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Paper>
                      </Grid>
                    )}
                    {showTasksCard && (
                      <Grid item xs={12} md={4}>
                        <Paper variant="outlined" sx={{ p: 2, minHeight: 220 }}>
                          <Typography variant="h6" fontSize={15} gutterBottom>Tasks</Typography>
                          <List dense sx={{ p: 0 }}>
                            {DASHBOARD_TASKS.map((task, idx) => (
                              <ListItem key={idx} divider={idx < DASHBOARD_TASKS.length - 1} sx={{ px: 0 }}>
                                <ListItemText primaryTypographyProps={{ fontSize: 12.5 }} primary={task} />
                              </ListItem>
                            ))}
                          </List>
                        </Paper>
                      </Grid>
                    )}
                    {showLoansLayawaysCard && (
                      <Grid item xs={12} md={4}>
                        <Paper variant="outlined" sx={{ p: 2, minHeight: 220 }}>
                          <Typography variant="h6" fontSize={15} gutterBottom>Loans/Layaways Due Today</Typography>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontSize: 11 }}>ID</TableCell>
                                  <TableCell sx={{ fontSize: 11 }}>Name</TableCell>
                                  <TableCell sx={{ fontSize: 11 }}>Type</TableCell>
                                  <TableCell sx={{ fontSize: 11 }}>Details</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {DASHBOARD_LOANS_LAYAWAYS_DUE_TODAY.map((item, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell sx={{ fontSize: 12 }}>{item.id}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{item.name}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{item.type}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{item.details}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                )}
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
                        onOpen={() => {
                          setExistingBuyData(tx);
                          setBuyAutoScrap(false); setScrapPrefill(null);
                          setBuyAutoUnique(false); setUniquePrefill(null);
                          setBuyOpen(true);
                        }}
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
                    ) : tx.type === 'REDEEM' ? (
                      <RedeemTransactionCard
                        tx={tx}
                        redeemIcon={transactionTypes.find(t => t.type === 'redeem')?.icon}
                        redeemColor={transactionTypes.find(t => t.type === 'redeem')?.color}
                        onOpen={() => { setExistingRedeemData(tx); setRedeemOpen(true); }}
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
              onClick={handleCheckoutAll}
              sx={{ bgcolor: GREEN, '&:hover': { bgcolor: GREEN_LIGHT }, borderRadius: 2, fontWeight: 700, mb: { md: 2, xl: 1 } }}>
              Checkout
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
        open={!!noCustomerWarning}
        autoHideDuration={4000}
        onClose={() => setNoCustomerWarning('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="warning" onClose={() => setNoCustomerWarning('')} sx={{ fontWeight: 600 }}>
          Please select a customer before opening a {noCustomerWarning}.
        </Alert>
      </Snackbar>

      {/* ── Customer search-results dialog (Enter in the lookup box) — same
          layout/behavior as the old Home page's Customer Lookup search ── */}
      <Dialog
        open={searchDialogOpen}
        onClose={handleCloseSearchDialog}
        aria-labelledby="workspace-customer-search-dialog-title"
        maxWidth={false}
        fullWidth
        onKeyDown={e => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (dialogSearchResults.length > 0) {
              setSelectedDialogIdx(Math.min(selectedDialogIdx + 1, dialogSearchResults.length - 1));
            }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (dialogSearchResults.length > 0 && selectedDialogIdx > 0) {
              setSelectedDialogIdx(selectedDialogIdx - 1);
            }
          } else if (e.key === 'Enter' && selectedDialogIdx >= 0 && dialogSearchResults[selectedDialogIdx]) {
            handleSelectCustomer(dialogSearchResults[selectedDialogIdx]);
            handleCloseSearchDialog();
          }
        }}
        PaperProps={{ sx: { width: 800, height: 420, maxWidth: '100vw', maxHeight: '100vh', overflow: 'visible', position: 'relative' } }}
      >
        {dialogSearchResults.length > 0 && (
          <Box sx={{ position: 'absolute', top: 12, right: 20, zIndex: 10, display: 'flex', gap: 1 }}>
            <Button variant="outlined" color="primary" size="small" onClick={handleOpenSearchDialog}
              sx={{ minWidth: 100, px: 2, fontWeight: 600, borderRadius: 2, fontSize: 14 }}>
              Search Again
            </Button>
            <Button variant="outlined" color="secondary" size="small" onClick={handleCloseSearchDialog}
              sx={{ minWidth: 44, px: 1, ml: 1, fontWeight: 700, borderRadius: 2, fontSize: 18, lineHeight: 1, minHeight: 36 }}>
              ×
            </Button>
          </Box>
        )}
        <DialogTitle>{dialogSearchResults.length > 0 ? 'Search Results' : 'No Customers Found'}</DialogTitle>
        <DialogContent sx={{ overflow: 'visible' }}>
          {dialogSearchResults.length > 0 ? (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', minWidth: 700, gap: 0 }}>
                <Box sx={{ minWidth: 140, maxWidth: 180, mr: 0, pl: 0, ml: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', pt: 1, gap: 2 }}>
                  {dialogSearchResults[selectedDialogIdx]?.image && (
                    <img
                      src={
                        typeof dialogSearchResults[selectedDialogIdx].image === 'string'
                          ? dialogSearchResults[selectedDialogIdx].image
                          : dialogSearchResults[selectedDialogIdx].image?.data
                          ? bufferToDataUrl(dialogSearchResults[selectedDialogIdx].image)
                          : undefined
                      }
                      alt="Customer"
                      style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, margin: '0 auto', border: `2px solid ${GREEN}`, background: '#fafafa', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)', display: 'block' }}
                    />
                  )}
                  {dialogSearchResults[selectedDialogIdx]?.id_image_front && (
                    <img
                      src={
                        typeof dialogSearchResults[selectedDialogIdx].id_image_front === 'string'
                          ? dialogSearchResults[selectedDialogIdx].id_image_front
                          : dialogSearchResults[selectedDialogIdx].id_image_front?.data
                          ? bufferToDataUrl(dialogSearchResults[selectedDialogIdx].id_image_front)
                          : undefined
                      }
                      alt="ID Front"
                      style={{ width: 120, height: 100, objectFit: 'cover', borderRadius: 8, margin: '0 auto', border: '2px solid #ff9800', background: '#fafafa', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)', display: 'block' }}
                    />
                  )}
                </Box>
                <Box sx={{ flex: 1, position: 'relative', display: 'flex' }}>
                  <TableContainer component={Paper} sx={{ mb: 0, maxHeight: 300, overflowY: 'auto', p: 0, m: 0, flex: '1 1 auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>DOB</TableCell>
                          <TableCell>Phone</TableCell>
                          <TableCell>ID</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dialogSearchResults.map((c, index) => (
                          <TableRow key={c.id} hover selected={selectedDialogIdx === index} sx={{ cursor: 'pointer' }}
                            onClick={() => setSelectedDialogIdx(index)}
                            onDoubleClick={() => { handleSelectCustomer(c); handleCloseSearchDialog(); }}>
                            <TableCell sx={{ width: 140, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.first_name} {c.last_name}</TableCell>
                            <TableCell>{c.date_of_birth ? c.date_of_birth.substring(0, 10) : ''}</TableCell>
                            <TableCell>{c.phone || ''}</TableCell>
                            <TableCell>{c.id_number || ''}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Box>

              {selectedDialogIdx >= 0 && dialogSearchResults[selectedDialogIdx] && (
                <Box sx={{ position: 'relative', mt: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, width: '100%' }}>
                    <Button variant="outlined" size="small" sx={{ minWidth: 70 }}
                      onClick={e => {
                        e.stopPropagation();
                        const c = dialogSearchResults[selectedDialogIdx];
                        navigate('/customer-editor', {
                          state: {
                            customer: {
                              ...c,
                              id_expiry_date: c.id_expiry_date ? new Date(c.id_expiry_date).toISOString().substring(0, 10) : '',
                              date_of_birth:  c.date_of_birth  ? new Date(c.date_of_birth).toISOString().substring(0, 10)  : '',
                            },
                            mode: 'edit',
                            returnTo: location.pathname,
                          },
                        });
                      }}>
                      Edit
                    </Button>
                    <Button variant="contained" size="small" sx={{ minWidth: 70, bgcolor: GREEN, '&:hover': { bgcolor: GREEN_LIGHT } }}
                      onClick={e => { e.stopPropagation(); handleSelectCustomer(dialogSearchResults[selectedDialogIdx]); handleCloseSearchDialog(); }}>
                      Select
                    </Button>
                  </Box>
                  <Box sx={{ position: 'absolute', right: 0, top: 0 }}>
                    <Button variant="contained" color="primary" size="small" sx={{ minWidth: 160 }}
                      onClick={e => {
                        e.stopPropagation();
                        handleCloseSearchDialog();
                        navigate('/customer-editor', { state: { mode: 'create', returnTo: location.pathname } });
                      }}>
                      Add New Customer
                    </Button>
                  </Box>
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="body1" color="text.secondary">No customers found matching your search.</Typography>
              </Box>
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button variant="contained" sx={{ height: 48, flex: 1, bgcolor: GREEN, '&:hover': { bgcolor: GREEN_LIGHT } }}
                  onClick={() => {
                    handleCloseSearchDialog();
                    navigate('/customer-editor', { state: { mode: 'create', returnTo: location.pathname } });
                  }}>
                  Add New Customer
                </Button>
                <Button variant="outlined" sx={{ height: 48, flex: 1 }} onClick={handleCloseSearchDialog}>
                  Search Again
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

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

      {/* ── Leave-workspace warning: shown when switching customers or navigating
          away while the workspace has unparked items ── */}
      <Dialog open={leaveWarningOpen} onClose={handleLeaveReturn} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Open Ticket in Workspace</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            You have {workspaceTransactions.length} unsaved transaction{workspaceTransactions.length !== 1 ? 's' : ''} in the workspace.
            Park it to save for later, delete it, or go back and finish it now.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
          <Button color="error" onClick={handleLeaveDelete}>Delete</Button>
          <Button onClick={handleLeaveReturn}>Return to Workspace</Button>
          <Button variant="contained" sx={{ bgcolor: GREEN, '&:hover': { bgcolor: GREEN_LIGHT } }} onClick={handleLeavePark}>
            Park
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Park feedback snackbar ── */}
      <Snackbar
        open={!!parkSnackbar}
        autoHideDuration={4000}
        onClose={() => setParkSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={parkSnackbar?.severity || 'info'} onClose={() => setParkSnackbar(null)} sx={{ width: '100%' }}>
          {parkSnackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
