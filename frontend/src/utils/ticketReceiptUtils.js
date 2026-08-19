import React from 'react';
import axios from 'axios';
import { pdf } from '@react-pdf/renderer';
import PawnTicketTemplate from '../components/PawnTicketTemplate';
import config from '../config';
import { injectPDFScript } from './printUtils';

// Single source of truth for every ticket receipt in the app. Nothing that
// builds receipt HTML/PDF content should live outside this file — screens
// call one of these functions instead of generating their own markup.

/**
 * Fetches receipt data and opens the pawn receipt PDF in a new tab.
 * Used by PawnTransactionScreen, RePawnIntakeScreen, and TransactionJournals.
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

/**
 * Resolves a buy or sale ticket ID via /api/tickets/lookup, fetches its
 * items/customer/business/receipt-config, and opens the receipt in a new
 * tab. Buy tickets print as a buy receipt (no tax line, buy_receipt footer);
 * sale tickets print as a sale receipt (tax line, sales_receipt footer).
 * Used by ModernTransactions (workspace ticket-ID search) and mirrors the
 * same fields TransactionJournals.js's own reprint uses.
 * @param {string} ticketId - The buy_ticket_id or sale_ticket_id
 * @returns {Promise<void>}
 */
export async function openBuySaleReceiptPDF(ticketId) {
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const lookupRes = await axios.get(`${config.apiUrl}/tickets/lookup/${encodeURIComponent(ticketId)}`, { headers });
  const group = lookupRes.data.groups.find(g => g.ticketId === ticketId);
  if (!group || !group.transactionId) throw new Error(`Ticket ${ticketId} not found`);

  const [itemsRes, txListRes, bizRes, receiptConfigRes] = await Promise.all([
    axios.get(`${config.apiUrl}/transactions/${group.transactionId}/items`, { headers }),
    // /api/transactions/:id (singular) queries by internal numeric id, not
    // transaction_id, and is broken — the list endpoint's row shape is what
    // TransactionJournals.js's own reprint actually relies on.
    axios.get(`${config.apiUrl}/transactions`, { headers }),
    axios.get(`${config.apiUrl}/business-info`, { headers }),
    axios.get(`${config.apiUrl}/receipt-config`, { headers }),
  ]);

  const ticketItems = itemsRes.data || [];
  const tx = (txListRes.data || []).find(t => t.transaction_id === group.transactionId) || {};
  const biz = bizRes.data || {};
  const receiptConfig = receiptConfigRes.data || {};
  const isSaleTransaction = group.type === 'SALE';
  const taxRate = 0.13; // same static default TransactionJournals.js uses

  const subtotalAmount = ticketItems.reduce((sum, item) => {
    const price = parseFloat(item.item_price || 0);
    const pp = parseFloat(item.protection_plan || 0);
    const itemDisc = parseFloat(item.item_discount || 0);
    return sum + price + (pp > 0 ? price * pp / 100 : 0) - itemDisc;
  }, 0);
  const globalDiscountAmount = parseFloat(ticketItems[0]?.global_discount || 0);
  const taxableAmount = Math.max(0, subtotalAmount - globalDiscountAmount);
  const taxAmount = isSaleTransaction ? taxableAmount * taxRate : 0;
  const totalAmount = taxableAmount + taxAmount;
  const ticketNoteItem = ticketItems.find(i => i.ticket_note);
  const ticketNote = ticketNoteItem?.ticket_note || null;
  const showOnReceiptNote = ticketNoteItem?.show_on_receipt ?? true;
  const txDate = tx.created_at ? new Date(tx.created_at) : new Date();
  const formattedDate = txDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const formattedTime = txDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${ticketId}</title>
      <style>
        body { font-family: 'Courier New', monospace; max-width: 400px; margin: 10px auto; padding: 15px; font-size: 12px; }
        .header { position: relative; margin-bottom: 15px; border-bottom: 2px dashed #333; padding-bottom: 15px; min-height: 75px; }
        .header-content { padding-right: 80px; }
        .header h1 { margin: 0 0 5px 0; color: #333; font-size: 18px; font-weight: bold; }
        .header p { margin: 3px 0; font-size: 11px; }
        .header img { position: absolute; top: 0; right: 0; max-width: 70px; max-height: 70px; object-fit: contain; }
        .ticket-info { margin-bottom: 15px; }
        .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
        .info-label { font-weight: bold; }
        .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
        .items-table th { padding: 6px 4px; text-align: left; border-bottom: 1px dashed #333; font-weight: bold; }
        .items-table td { padding: 6px 4px; border-bottom: 1px dotted #ccc; }
        .items-table tr:last-child td { border-bottom: none; }
        .total-row { font-weight: bold; border-top: 2px dashed #333; border-bottom: 2px dashed #333; padding-top: 10px; margin-top: 10px; font-size: 12px; }
        .footer { margin-top: 20px; text-align: center; font-size: 10px; border-top: 1px dashed #333; padding-top: 10px; }
        @media print { body { margin: 0; padding: 10px; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        ${biz.logo ? `<img src="data:${biz.logo_mimetype};base64,${biz.logo}" alt="Business Logo" />` : ''}
        <div class="header-content">
          <h1>${biz.business_name || 'POS Pro System'}</h1>
          ${biz.address ? `<p>${biz.address}</p>` : ''}
          ${biz.phone ? `<p>${biz.phone}</p>` : ''}
        </div>
      </div>
      <div class="ticket-info">
        <div class="info-row"><span class="info-label">${isSaleTransaction ? 'Sale' : 'Buy'} Ticket #:</span><span>${ticketId}</span></div>
        <div class="info-row"><span class="info-label">Date &amp; Time:</span><span>${formattedDate} ${formattedTime}</span></div>
        <div class="info-row"><span class="info-label">Customer:</span><span>${tx.customer_name || 'N/A'}</span></div>
        ${tx.customer_phone ? `<div class="info-row"><span class="info-label">Phone:</span><span>${tx.customer_phone}</span></div>` : ''}
        ${tx.customer_address ? `<div class="info-row"><span class="info-label">Address:</span><span>${tx.customer_address}</span></div>` : ''}
        <div class="info-row"><span class="info-label">${tx.parked_by_employee_name ? 'Completed By:' : 'Employee:'}</span><span>${tx.employee_name || 'N/A'}</span></div>
        ${tx.parked_by_employee_name ? `<div class="info-row"><span class="info-label">Parked By:</span><span>${tx.parked_by_employee_name}</span></div>` : ''}
      </div>
      <table class="items-table">
        <thead><tr><th>Item Description</th><th style="text-align: right;">Amount</th></tr></thead>
        <tbody>
          ${ticketItems.map((item, index) => {
            const fullPrice = parseFloat(item.item_price || 0);
            const ppPct = parseFloat(item.protection_plan || 0);
            const ppAmount = ppPct > 0 ? fullPrice * ppPct / 100 : 0;
            const itemDisc = parseFloat(item.item_discount || 0);
            const desc = item.long_desc || item.short_desc || item.item_details?.description || item.description || `Item ${index + 1}`;
            return `
              <tr><td>${desc}</td><td style="text-align: right;">$${fullPrice.toFixed(2)}</td></tr>
              ${ppPct > 0 ? `<tr><td style="padding-left: 16px; font-size: 10px; color: #1565c0; font-style: italic;">Protection Plan (${ppPct}%)</td><td style="text-align: right; font-size: 10px; color: #1565c0;">$${ppAmount.toFixed(2)}</td></tr>` : ''}
              ${itemDisc > 0 ? `<tr><td style="padding-left: 16px; font-size: 10px; color: #c62828; font-style: italic;">Item Discount</td><td style="text-align: right; font-size: 10px; color: #c62828;">-$${itemDisc.toFixed(2)}</td></tr>` : ''}
            `;
          }).join('')}
        </tbody>
      </table>
      <div class="total-row">
        <div class="info-row"><span>Subtotal:</span><span>$${subtotalAmount.toFixed(2)}</span></div>
        ${globalDiscountAmount > 0 ? `<div class="info-row" style="font-size: 11px; color: #c62828;"><span>Ticket Discount:</span><span>-$${globalDiscountAmount.toFixed(2)}</span></div>` : ''}
        ${isSaleTransaction ? `<div class="info-row" style="font-size: 11px; color: #444;"><span>Tax (${(taxRate * 100).toFixed(0)}%):</span><span>$${taxAmount.toFixed(2)}</span></div>` : ''}
        <div class="info-row" style="font-weight: bold; border-top: 1px solid #333; margin-top: 4px; padding-top: 4px;"><span>Total Amount:</span><span>$${totalAmount.toFixed(2)}</span></div>
      </div>
      ${ticketNote && showOnReceiptNote ? `<div style="margin-top: 12px; border-top: 1px dashed #333; padding-top: 10px; font-size: 11px;"><strong>Note:</strong> <span style="white-space: pre-wrap;">${ticketNote}</span></div>` : ''}
      <div class="footer"><p style="white-space: pre-wrap;">${isSaleTransaction ? receiptConfig.sales_receipt : receiptConfig.buy_receipt}</p></div>
      <div class="no-print" style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">Print</button>
        <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; margin-left: 10px; cursor: pointer;">Close</button>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  const pdfReadyHTML = injectPDFScript(receiptHTML, `ticket_${ticketId}`);
  printWindow.document.write(pdfReadyHTML);
  printWindow.document.close();
}

/**
 * Whole-transaction receipt — every ticket under one transaction_id, grouped
 * by ticket, plus the payment breakdown. Same template as
 * TransactionJournals.js's "Reprint" button (handlePrintTransaction), ported
 * here as a self-fetching function. Used whenever more than one ticket is
 * involved (e.g. a trade's buy-in + sale-out, or a bare transaction_id that
 * covers several tickets) — a single ticket instead uses the type-specific
 * receipt (openPawnReceiptPDF / openBuySaleReceiptPDF).
 * @param {string} transactionId
 * @returns {Promise<void>}
 */
export async function openTransactionReceiptPDF(transactionId) {
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [itemsRes, paymentsRes, txListRes, bizRes, receiptConfigRes] = await Promise.all([
    axios.get(`${config.apiUrl}/transactions/${transactionId}/items`, { headers }),
    axios.get(`${config.apiUrl}/transactions/${transactionId}/payments`, { headers }),
    axios.get(`${config.apiUrl}/transactions`, { headers }),
    axios.get(`${config.apiUrl}/business-info`, { headers }),
    axios.get(`${config.apiUrl}/receipt-config`, { headers }),
  ]);

  const transactionItems = itemsRes.data || [];
  const paymentDetails = paymentsRes.data || { payments: [], total_paid: 0 };
  const tx = (txListRes.data || []).find(t => t.transaction_id === transactionId) || {};
  const biz = bizRes.data || {};
  const receiptConfig = receiptConfigRes.data || {};

  // Group items by their own ticket_id (the /items endpoint already tags
  // each row with the ticket it belongs to — no separate buy/sale/pawn
  // ticket cross-referencing needed).
  const allTicketGroups = {};
  transactionItems.forEach(item => {
    const key = item.ticket_id || 'no-ticket';
    if (!allTicketGroups[key]) allTicketGroups[key] = [];
    allTicketGroups[key].push(item);
  });

  const formatTransactionTime = (dateString) => new Date(dateString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Transaction #${transactionId}</title>
      <style>
        body { font-family: 'Courier New', monospace; max-width: 400px; margin: 10px auto; padding: 15px; font-size: 12px; }
        .header { position: relative; margin-bottom: 15px; border-bottom: 2px dashed #333; padding-bottom: 15px; min-height: 75px; }
        .header-content { padding-right: 80px; }
        .header h1 { margin: 0 0 5px 0; color: #333; font-size: 18px; font-weight: bold; }
        .header p { margin: 3px 0; font-size: 11px; }
        .header img { position: absolute; top: 0; right: 0; max-width: 70px; max-height: 70px; object-fit: contain; }
        .transaction-info { margin-bottom: 15px; }
        .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
        .info-label { font-weight: bold; }
        .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
        .items-table td { padding: 6px 4px; border-bottom: 1px dotted #ccc; }
        .items-table tr:last-child td { border-bottom: none; }
        .payment-section { border-top: 1px dashed #333; padding-top: 10px; margin-top: 10px; font-size: 11px; }
        .payment-row { display: flex; justify-content: space-between; padding: 3px 0; }
        .footer { margin-top: 20px; text-align: center; font-size: 10px; border-top: 1px dashed #333; padding-top: 10px; }
        @media print { body { margin: 0; padding: 10px; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        ${biz.logo ? `<img src="data:${biz.logo_mimetype};base64,${biz.logo}" alt="Business Logo" />` : ''}
        <div class="header-content">
          <h1>${biz.business_name || 'POS Pro System'}</h1>
          ${biz.address ? `<p>${biz.address}</p>` : ''}
          ${biz.phone ? `<p>${biz.phone}</p>` : ''}
        </div>
      </div>

      <div class="transaction-info">
        <div class="info-row"><span class="info-label">Transaction #:</span><span>${transactionId}</span></div>
        <div class="info-row"><span class="info-label">Date &amp; Time:</span><span>${formatTransactionTime(tx.created_at)}</span></div>
        <div class="info-row"><span class="info-label">Customer:</span><span>${tx.customer_name || 'N/A'}</span></div>
        ${tx.customer_phone ? `<div class="info-row"><span class="info-label">Phone:</span><span>${tx.customer_phone}</span></div>` : ''}
        ${tx.customer_address ? `<div class="info-row"><span class="info-label">Address:</span><span>${tx.customer_address}</span></div>` : ''}
        <div class="info-row"><span class="info-label">${tx.parked_by_employee_name ? 'Completed By:' : 'Employee:'}</span><span>${tx.employee_name || 'N/A'}</span></div>
        ${tx.parked_by_employee_name ? `<div class="info-row"><span class="info-label">Parked By:</span><span>${tx.parked_by_employee_name}</span></div>` : ''}
      </div>

      ${Object.entries(allTicketGroups).map(([groupTicketId, items]) => `
        ${groupTicketId !== 'no-ticket' ? `
          <div style="margin-top: 15px; padding: 5px; background-color: #e3f2fd; font-weight: bold; font-size: 11px;">
            ${groupTicketId}
          </div>
        ` : ''}
        <table class="items-table">
          <tbody>
            ${items.map((item, index) => {
              const price = parseFloat(item.item_price || 0);
              return `
                <tr>
                  <td>
                    ${item.item_details?.description || `Item ${index + 1}`}
                    ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}
                  </td>
                  <td style="text-align: right;">
                    $${price.toFixed(2)}
                    ${item.quantity > 1 ? `<br><small style="color: #666;">${item.quantity} @ $${(price / item.quantity).toFixed(2)} each</small>` : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `).join('')}

      ${paymentDetails.payments.length > 0 ? `
        <div class="payment-section">
          <h3 style="margin-top: 0;">Payment Methods:</h3>
          ${paymentDetails.payments.map(payment => `
            <div class="payment-row">
              <span>${payment.payment_method.replace(/_/g, ' ').toUpperCase()}:</span>
              <span>$${Math.abs(parseFloat(payment.amount)).toFixed(2)}</span>
            </div>
          `).join('')}
          ${paymentDetails.change_given > 0 ? `
            <div class="payment-row" style="border-top: 1px solid #ddd; margin-top: 10px; padding-top: 10px;">
              <span>Change Given:</span>
              <span>$${parseFloat(paymentDetails.change_given).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="payment-row" style="font-weight: bold; border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; font-size: 1.1em;">
            <span>Total Paid:</span>
            <span>$${parseFloat(paymentDetails.total_paid).toFixed(2)}</span>
          </div>
        </div>
      ` : ''}

      <div class="footer">
        <p style="white-space: pre-wrap;">${receiptConfig.transaction_receipt}</p>
      </div>

      <div class="no-print" style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">Print</button>
        <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; margin-left: 10px; cursor: pointer;">Close</button>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  const pdfReadyHTML = injectPDFScript(receiptHTML, `transaction_${transactionId}`);
  printWindow.document.write(pdfReadyHTML);
  printWindow.document.close();
}
