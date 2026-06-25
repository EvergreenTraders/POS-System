import React from 'react';
import axios from 'axios';
import { pdf } from '@react-pdf/renderer';
import PawnTicketTemplate from '../components/PawnTicketTemplate';
import config from '../config';

/**
 * Fetches receipt data and opens the pawn receipt PDF in a new tab.
 * Single source of truth — used by PawnTransactionScreen and TransactionJournals.
 * @param {string} ticketId - The pawn_ticket_id
 * @returns {Promise<void>}
 */
export async function openPawnReceiptPDF(ticketId) {
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [receiptRes, bizRes, pawnConfigRes] = await Promise.all([
    axios.get(`${config.apiUrl}/pawn-tickets/${ticketId}/receipt-data`, { headers }),
    axios.get(`${config.apiUrl}/business-info`, { headers }),
    axios.get(`${config.apiUrl}/pawn-config`, { headers }),
  ]);

  const r   = receiptRes.data;
  const biz = bizRes.data;
  const pc  = pawnConfigRes.data;

  const termDays     = parseInt(r.term_days)       || parseInt(pc.term_days)       || 90;
  const interestRate = parseFloat(r.interest_rate) || parseFloat(pc.interest_rate) || 2.9;
  const freqDays     = parseInt(r.frequency_days)  || parseInt(pc.frequency_days)  || 30;
  const principal    = r.items.reduce((s, i) => s + i.item_price, 0);
  const periods      = Math.ceil(termDays / freqDays);
  const interestAmt  = principal * (interestRate / 100) * periods;
  const insuranceCost = principal * 0.01 * periods;
  const totalCost    = interestAmt + insuranceCost;
  const extCost      = principal * (interestRate / 100) + principal * 0.01;

  const txDate       = new Date(r.transaction_date);
  const formattedDate = txDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const formattedTime = txDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const dueDate = r.due_date
    ? new Date(r.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const pdfDoc = (
    <PawnTicketTemplate
      ticketType="pawn"
      businessName={biz.business_name || ''}
      businessAddress={biz.address || ''}
      businessPhone={biz.phone || ''}
      businessLogo={biz.logo || ''}
      businessLogoMimetype={biz.logo_mimetype || ''}
      customerName={r.customer_name}
      customerAddress={r.customer_address}
      customerPhone={r.customer_phone}
      customerID={r.customer_id}
      employeeName={r.employee_name}
      ticketId={ticketId}
      formattedDate={formattedDate}
      formattedTime={formattedTime}
      dueDate={dueDate}
      ticketItems={r.items}
      principalAmount={principal}
      appraisalFee={0}
      interestRate={interestRate}
      interestAmount={interestAmt}
      insuranceCost={insuranceCost}
      extensionCost={extCost}
      totalCostOfBorrowing={totalCost}
      totalRedemptionAmount={principal + totalCost}
      legalTerms={pc.pawn_receipt || ''}
      termDays={termDays}
      frequencyDays={freqDays}
      ticketNote={r.show_on_receipt && r.ticket_note ? r.ticket_note : null}
    />
  );

  const blob = await pdf(pdfDoc).toBlob();
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
