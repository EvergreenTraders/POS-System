import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility as ViewIcon, AttachMoney as AttachMoneyIcon, Warning as WarningIcon, Print as PrintIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Avatar } from '@mui/material';
import { pdf } from '@react-pdf/renderer';
import PawnTicketTemplate from '../components/PawnTicketTemplate';
import config from '../config';

function TransactionJournals() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [store, setStore] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [employee, setEmployee] = useState('');
  const [businessDate, setBusinessDate] = useState(null);
  const [transactionNumber, setTransactionNumber] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [amountFilter, setAmountFilter] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionItems, setTransactionItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({ payments: [], total_paid: 0 });
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [isEditingPayments, setIsEditingPayments] = useState(false);
  const [editedPayments, setEditedPayments] = useState([]);
  const [buyTickets, setBuyTickets] = useState([]);
  const [saleTickets, setSaleTickets] = useState([]);
  const [pawnTickets, setPawnTickets] = useState([]);
  const API_BASE_URL = config.apiUrl;

  const [transactions, setTransactions] = useState([]);
  const [transactionItemsMap, setTransactionItemsMap] = useState({});
  const [buyTicketsMap, setBuyTicketsMap] = useState({}); // Map of transaction_id to buy_tickets
  const [saleTicketsMap, setSaleTicketsMap] = useState({}); // Map of transaction_id to sale_tickets
  const [pawnTicketsMap, setPawnTicketsMap] = useState({}); // Map of transaction_id to pawn_tickets
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stores, setStores] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [receiptConfig, setReceiptConfig] = useState({
    transaction_receipt: 'Thank you for shopping with us',
    buy_receipt: 'Thank you for shopping with us',
    sales_receipt: 'Thank you for shopping with us',
    pawn_receipt: ''
  });

  // Fetch receipt config from API
  useEffect(() => {
    const fetchReceiptConfig = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/receipt-config`);
        if (response.data) {
          setReceiptConfig({
            transaction_receipt: response.data.transaction_receipt || 'Thank you for shopping with us',
            buy_receipt: response.data.buy_receipt || 'Thank you for shopping with us',
            sales_receipt: response.data.sales_receipt || 'Thank you for shopping with us',
            pawn_receipt: response.data.pawn_receipt || ''
          });
        }
      } catch (error) {
        console.error('Error fetching receipt config:', error);
      }
    };

    fetchReceiptConfig();
  }, [API_BASE_URL]);

  // Fetch transaction types from API
  useEffect(() => {
    const fetchTransactionTypes = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/transaction-types`);
        // Transform the data to match the expected format
        const types = response.data.map(type => ({
          value: type.type.toLowerCase(),
          label: type.type.charAt(0).toUpperCase() + type.type.slice(1)
        }));
        setTransactionTypes(types);
      } catch (error) {
        console.error('Error fetching transaction types:', error);
      }
    };

    fetchTransactionTypes();
  }, []);

  // Fetch payment methods from API
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/payment-methods`);
        setPaymentMethods(response.data);
      } catch (error) {
        console.error('Error fetching payment methods:', error);
      }
    };

    fetchPaymentMethods();
  }, []);
  
  const handleViewTransaction = async (transaction) => {
    setSelectedTransaction(transaction);
    setLoadingItems(true);
    setLoadingPayments(true);
    setViewDialogOpen(true);

    try {
      // Fetch transaction items from the updated endpoint (reads from buy_ticket/sale_ticket)
      const itemsResponse = await axios.get(`${API_BASE_URL}/transactions/${transaction.transaction_id}/items`);
      const items = itemsResponse.data || [];
      setTransactionItems(items);

      // Fetch payment details
      const response = await axios.get(`${API_BASE_URL}/transactions/${transaction.transaction_id}/payments`);
      setPaymentDetails({
        payments: response.data.payments || [],
        total_paid: response.data.total_paid || 0
      });

      // Fetch buy_ticket and sale_ticket data for this transaction
      try {
        const buyTicketResponse = await axios.get(`${API_BASE_URL}/buy-ticket?transaction_id=${transaction.transaction_id}`);
        setBuyTickets(buyTicketResponse.data || []);
      } catch (buyTicketError) {
        console.error('Error fetching buy tickets:', buyTicketError);
        setBuyTickets([]);
      }

      try {
        const saleTicketResponse = await axios.get(`${API_BASE_URL}/sale-ticket?transaction_id=${transaction.transaction_id}`);
        setSaleTickets(saleTicketResponse.data || []);
      } catch (saleTicketError) {
        console.error('Error fetching sale tickets:', saleTicketError);
        setSaleTickets([]);
      }

      try {
        const pawnTicketResponse = await axios.get(`${API_BASE_URL}/pawn-ticket?transaction_id=${transaction.transaction_id}`);
        setPawnTickets(pawnTicketResponse.data || []);
      } catch (pawnTicketError) {
        console.error('Error fetching pawn tickets:', pawnTicketError);
        setPawnTickets([]);
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      // Initialize with empty data if there's an error
      setTransactionItems([]);
      setPaymentDetails({ payments: [], total_paid: 0 });
      setBuyTickets([]);
      setSaleTickets([]);
      setPawnTickets([]);
    } finally {
      setLoadingItems(false);
      setLoadingPayments(false);
    }
  };
  
  const handleCloseDialog = () => {
    setViewDialogOpen(false);
    setSelectedTransaction(null);
    // Reset payment details when closing dialog
    setPaymentDetails({ payments: [], total_paid: 0 });
    setBuyTickets([]);
    setSaleTickets([]);
    setPawnTickets([]);
    // Don't clear transaction items to keep them in memory
  };

  // Group transaction items by ticket_id (buy_ticket or sale_ticket)
  const groupItemsByTicket = () => {
    const grouped = {};

    transactionItems.forEach((item, index) => {
      // Use ticket_id directly from the item (returned by backend query)
      const ticketId = item.ticket_id || 'no-ticket';

      if (!grouped[ticketId]) {
        grouped[ticketId] = [];
      }
      grouped[ticketId].push({ ...item, originalIndex: index });
    });

    return grouped;
  };

  // Handle double click on ticket_id to show receipt using PDF template
  const handleBuyTicketClick = async (ticketId) => {
    // Determine if this is a sale, buy, or pawn ticket by checking which ticket list contains it
    const isSaleTicket = saleTickets.some(st => st.sale_ticket_id === ticketId);
    const isBuyTicket = buyTickets.some(bt => bt.buy_ticket_id === ticketId);
    const isPawnTicket = pawnTickets.some(pt => pt.pawn_ticket_id === ticketId);

    // Get items for this ticket
    let ticketItems = [];
    if (isSaleTicket) {
      ticketItems = transactionItems.filter(item => {
        const saleTicket = saleTickets.find(st => st.item_id === item.item_id);
        return saleTicket?.sale_ticket_id === ticketId;
      });
    } else if (isBuyTicket) {
      ticketItems = transactionItems.filter(item => {
        const buyTicket = buyTickets.find(bt => bt.item_id === item.item_id);
        return buyTicket?.buy_ticket_id === ticketId;
      });
    } else if (isPawnTicket) {
      ticketItems = transactionItems.filter(item => {
        const pawnTicket = pawnTickets.find(pt => pt.item_id === item.item_id);
        return pawnTicket?.pawn_ticket_id === ticketId;
      });
    }

    if (ticketItems.length === 0) {
      alert('No items found for this ticket');
      return;
    }

    // Determine if this is a sale transaction
    const isSaleTransaction = isSaleTicket || ticketItems.some(item =>
      item.transaction_type?.toLowerCase() === 'sale'
    ) || selectedTransaction?.transaction_type_name?.toLowerCase() === 'sale';

    // Fetch business info
    let businessName = 'PAWNALL NEW MOBILE';
    let businessAddress = '';
    let businessPhone = '';
    let businessLogo = '';
    let businessLogoMimetype = '';

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/business-info`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      businessName = response.data.business_name || businessName;
      businessAddress = response.data.address || '';
      businessPhone = response.data.phone || '';
      if (response.data.logo && response.data.logo_mimetype) {
        businessLogo = response.data.logo;
        businessLogoMimetype = response.data.logo_mimetype;
      }
    } catch (error) {
      console.error('Error fetching business info:', error);
    }

    // Fetch pawn config to get term_days
    let termDays = 62; // Default value
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/pawn-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      termDays = parseInt(response.data.term_days) || 62;
    } catch (error) {
      console.error('Error fetching pawn config:', error);
    }

    // Calculate total and due date
    const totalAmount = ticketItems.reduce((sum, item) => sum + (parseFloat(item.item_price || 0)), 0);
    const transactionDate = selectedTransaction ? new Date(selectedTransaction.created_at) : new Date();
    const formattedDate = transactionDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const formattedTime = transactionDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Calculate due date using term_days from pawn_config
    const dueDateObj = new Date(transactionDate);
    dueDateObj.setDate(dueDateObj.getDate() + termDays);
    const dueDate = dueDateObj.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Get pawn ticket details if this is a pawn ticket
    const pawnTicketData = isPawnTicket ? pawnTickets.find(pt => pt.pawn_ticket_id === ticketId) : null;

    // Calculate fees (these should come from pawn_ticket table in reality)
    const principalAmount = pawnTicketData?.principal_amount || totalAmount;
    const appraisalFee = pawnTicketData?.appraisal_fee || 0;
    const interestRate = pawnTicketData?.interest_rate || 2.9;
    const interestAmount = pawnTicketData?.interest_amount || (principalAmount * 0.029);
    const insuranceCost = pawnTicketData?.insurance_cost || (principalAmount * 0.01);
    const storageFee = pawnTicketData?.storage_fee || 0;
    const totalCostOfBorrowing = appraisalFee + interestAmount + insuranceCost + storageFee;
    const extensionCost = interestAmount + insuranceCost + storageFee;

    // Get legal terms based on ticket type
    const legalTerms = isPawnTicket ? receiptConfig.pawn_receipt : (isSaleTransaction ? receiptConfig.sales_receipt : receiptConfig.buy_receipt);

    // Generate PDF using template
    const pdfDocument = (
      <PawnTicketTemplate
        businessName={businessName}
        businessAddress={businessAddress}
        businessPhone={businessPhone}
        businessLogo={businessLogo}
        businessLogoMimetype={businessLogoMimetype}
        customerName={selectedTransaction?.customer_name}
        customerAddress={selectedTransaction?.customer_address}
        customerPhone={selectedTransaction?.customer_phone}
        customerID={selectedTransaction?.customer_id}
        employeeName={selectedTransaction?.employee_name}
        ticketId={ticketId}
        formattedDate={formattedDate}
        formattedTime={formattedTime}
        dueDate={dueDate}
        ticketItems={ticketItems}
        principalAmount={principalAmount}
        appraisalFee={appraisalFee}
        interestRate={interestRate}
        interestAmount={interestAmount}
        insuranceCost={insuranceCost}
        storageFee={storageFee}
        extensionCost={extensionCost}
        totalCostOfBorrowing={totalCostOfBorrowing}
        legalTerms={legalTerms}
        termDays={termDays}
      />
    );

    // Generate PDF blob and open in new tab
    const blob = await pdf(pdfDocument).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handlePrintTransaction = async () => {
    if (!selectedTransaction) return;

    // Fetch business info
    let businessName = '';
    let businessAddress = '';
    let businessPhone = '';
    let businessLogo = '';
    let businessLogoMimetype = '';

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/business-info`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        businessName = response.data.business_name || 'POS Pro System';
        businessAddress = response.data.address || '';
        businessPhone = response.data.phone || '';
        if (response.data.logo && response.data.logo_mimetype) {
          businessLogo = response.data.logo;
          businessLogoMimetype = response.data.logo_mimetype;
        }
      }
    } catch (error) {
      console.error('Error fetching business info:', error);
    }

    // Get customer address and phone from transaction data (already fetched from backend)
    const customerAddress = selectedTransaction?.customer_address || '';
    const customerPhone = selectedTransaction?.customer_phone || '';

    // Group items by ticket ID
    const allTicketGroups = {};
    transactionItems.forEach(item => {
      const buyTicket = buyTickets.find(bt => bt.item_id === item.item_id);
      const ticketId = buyTicket?.buy_ticket_id || 'no-ticket';

      if (!allTicketGroups[ticketId]) {
        allTicketGroups[ticketId] = [];
      }
      allTicketGroups[ticketId].push(item);
    });

    // Create HTML content for the transaction receipt
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transaction #${selectedTransaction.transaction_id || selectedTransaction.id}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            max-width: 400px;
            margin: 10px auto;
            padding: 15px;
            font-size: 12px;
          }
          .header {
            position: relative;
            margin-bottom: 15px;
            border-bottom: 2px dashed #333;
            padding-bottom: 15px;
            min-height: 75px;
          }
          .header-content {
            padding-right: 80px;
          }
          .header h1 {
            margin: 0 0 5px 0;
            color: #333;
            font-size: 18px;
            font-weight: bold;
          }
          .header p {
            margin: 3px 0;
            font-size: 11px;
          }
          .header img {
            position: absolute;
            top: 0;
            right: 0;
            max-width: 70px;
            max-height: 70px;
            object-fit: contain;
          }
          .transaction-info {
            margin-bottom: 15px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 11px;
          }
          .info-label {
            font-weight: bold;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 11px;
          }
          .items-table th {
            padding: 6px 4px;
            text-align: left;
            border-bottom: 1px dashed #333;
            font-weight: bold;
          }
          .items-table td {
            padding: 6px 4px;
            border-bottom: 1px dotted #ccc;
          }
          .items-table tr:last-child td {
            border-bottom: none;
          }
          .total-row {
            font-weight: bold;
            border-top: 2px dashed #333;
            border-bottom: 2px dashed #333;
          }
          .payment-section {
            border-top: 1px dashed #333;
            padding-top: 10px;
            margin-top: 10px;
            font-size: 11px;
          }
          .payment-row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            border-top: 1px dashed #333;
            padding-top: 10px;
          }
          @media print {
            body { margin: 0; padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${businessLogo ? `<img src="data:${businessLogoMimetype};base64,${businessLogo}" alt="Business Logo" />` : ''}
          <div class="header-content">
            <h1>${businessName}</h1>
            ${businessAddress ? `<p>${businessAddress}</p>` : ''}
            ${businessPhone ? `<p>${businessPhone}</p>` : ''}
          </div>
        </div>

        <div class="transaction-info">
          <div class="info-row">
            <span class="info-label">Transaction #:</span>
            <span>${selectedTransaction.transaction_id || selectedTransaction.id}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date & Time:</span>
            <span>${formatTransactionTime(selectedTransaction.created_at)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Customer:</span>
            <span>${selectedTransaction.customer_name || 'N/A'}</span>
          </div>
          ${customerPhone ? `
          <div class="info-row">
            <span class="info-label">Phone:</span>
            <span>${customerPhone}</span>
          </div>
          ` : ''}
          ${customerAddress ? `
          <div class="info-row">
            <span class="info-label">Address:</span>
            <span>${customerAddress}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="info-label">Employee:</span>
            <span>${selectedTransaction.employee_name || 'N/A'}</span>
          </div>
        </div>

        ${Object.entries(allTicketGroups).map(([ticketId, items]) => `
          ${ticketId !== 'no-ticket' ? `
            <div style="margin-top: 15px; padding: 5px; background-color: #e3f2fd; font-weight: bold; font-size: 11px;">
             ${ticketId}
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

    // Open in new tab
    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  };

  const handleEditPayments = () => {
    setEditedPayments(paymentDetails.payments.map(p => ({ ...p })));
    setIsEditingPayments(true);
  };

  const handlePaymentChange = (index, field, value) => {
    const updated = [...editedPayments];
    updated[index][field] = value;
    setEditedPayments(updated);
  };

  const handleAddPayment = () => {
    setEditedPayments([...editedPayments, { payment_method: 'cash', amount: 0 }]);
  };

  const handleRemovePayment = (index) => {
    const updated = editedPayments.filter((_, i) => i !== index);
    setEditedPayments(updated);
  };

  const handleSavePayments = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/transactions/${selectedTransaction.transaction_id}/payments`,
        { payments: editedPayments },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh payment details
      const response = await axios.get(
        `${API_BASE_URL}/transactions/${selectedTransaction.transaction_id}/payments`
      );
      setPaymentDetails({
        payments: response.data.payments || [],
        total_paid: response.data.total_paid || 0
      });

      setIsEditingPayments(false);
      alert('Payment methods updated successfully');
    } catch (error) {
      console.error('Error updating payments:', error);
      alert('Failed to update payment methods');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingPayments(false);
    setEditedPayments([]);
  };

  // Fetch transactions, their items, and filter options
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch transactions and employees in parallel
        const [transactionsRes, employeesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/transactions`),
          axios.get(`${API_BASE_URL}/employees`)
        ]);
        
        const transactionsData = transactionsRes.data;
        setTransactions(transactionsData);
        
        // Fetch all transaction items in parallel
        const itemsPromises = transactionsData.map(tx => 
          axios.get(`${API_BASE_URL}/transactions/${tx.transaction_id}/items`)
            .then(res => ({
              transactionId: tx.transaction_id,
              items: res.data
            }))
            .catch(() => ({
              transactionId: tx.transaction_id,
              items: []
            }))
        );
        
        // Process all items responses
        const itemsResponses = await Promise.all(itemsPromises);
        const itemsMap = {};
        itemsResponses.forEach(({ transactionId, items }) => {
          itemsMap[transactionId] = items;
        });
        setTransactionItemsMap(itemsMap);

        // Fetch all buy tickets in parallel
        const buyTicketsPromises = transactionsData.map(tx =>
          axios.get(`${API_BASE_URL}/buy-ticket?transaction_id=${tx.transaction_id}`)
            .then(res => ({
              transactionId: tx.transaction_id,
              buyTickets: res.data || []
            }))
            .catch(() => ({
              transactionId: tx.transaction_id,
              buyTickets: []
            }))
        );

        // Process all buy tickets responses
        const buyTicketsResponses = await Promise.all(buyTicketsPromises);
        const buyTicketsMapData = {};
        buyTicketsResponses.forEach(({ transactionId, buyTickets }) => {
          buyTicketsMapData[transactionId] = buyTickets;
        });
        setBuyTicketsMap(buyTicketsMapData);

        // Fetch all sale tickets in parallel
        const saleTicketsPromises = transactionsData.map(tx =>
          axios.get(`${API_BASE_URL}/sale-ticket?transaction_id=${tx.transaction_id}`)
            .then(res => ({
              transactionId: tx.transaction_id,
              saleTickets: res.data || []
            }))
            .catch(() => ({
              transactionId: tx.transaction_id,
              saleTickets: []
            }))
        );

        // Process all sale tickets responses
        const saleTicketsResponses = await Promise.all(saleTicketsPromises);
        const saleTicketsMapData = {};
        saleTicketsResponses.forEach(({ transactionId, saleTickets }) => {
          saleTicketsMapData[transactionId] = saleTickets;
        });
        setSaleTicketsMap(saleTicketsMapData);

        // Transform employees data for the dropdown
        const employeeOptions = employeesRes.data.map(emp => ({
          id: emp.employee_id,
          name: `${emp.first_name} ${emp.last_name}`,
          ...emp
        }));

        setEmployees(employeeOptions);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load transactions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleOpenDeleteDialog = (transactionId) => {
    const transaction = transactions.find(tx => tx.id === transactionId);
    
    if (!transaction) {
      console.error('Transaction not found');
      return;
    }
    
    const transactionDate = new Date(transaction.created_at).toDateString();
    const today = new Date().toDateString();
    
    if (transactionDate !== today) {
      alert('You can only delete transactions made today.');
      return;
    }
    
    setTransactionToDelete(transactionId);
    setDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };
  
  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    
    try {
      // Delete the transaction and all related data
      await axios.delete(`${API_BASE_URL}/transactions/${transactionToDelete}`);
      
      // Update the UI by removing the deleted transaction
      const updatedTransactions = transactions.filter(tx => tx.id !== transactionToDelete);
      setTransactions(updatedTransactions);
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction. Please try again.');
    } finally {
      handleCloseDeleteDialog();
    }
  };
  
  const formatTransactionTime = (dateString) => {
    const options = { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true 
    };
    return new Date(dateString).toLocaleString('en-US', options);
  };
  
  // Filter transactions based on search criteria
  const filteredTransactions = transactions.filter(tx => {
    const matchesStore = !store || tx.store_id === store;

    // Check employee match if employee is selected
    let matchesEmployee = true;
    if (employee) {
      matchesEmployee = tx.employee_id?.toString() === employee.toString();
    }

    const matchesTransactionNumber = !transactionNumber ||
      tx.transaction_id?.toLowerCase().includes(transactionNumber.toLowerCase());

    // Check transaction type match
    let matchesTransactionType = !transactionType;
    if (transactionType) {
      const items = transactionItemsMap[tx.transaction_id] || [];
      // Match if transaction type matches any item's type or the transaction's main type
      matchesTransactionType = items.some(item =>
        item.transaction_type?.toLowerCase() === transactionType.toLowerCase()
      ) || tx.transaction_type_name?.toLowerCase() === transactionType.toLowerCase();
    }

    // Check date match if businessDate is set
    let matchesDate = true;
    if (businessDate) {
      const txDate = tx.created_at ? new Date(tx.created_at).toDateString() : '';
      const selectedDate = new Date(businessDate).toDateString();
      matchesDate = txDate === selectedDate;
    }

    // Check ticket ID match - search through buy_tickets and sale_tickets for this transaction
    let matchesTicketId = true;
    if (ticketId) {
      const txBuyTickets = buyTicketsMap[tx.transaction_id] || [];
      const txSaleTickets = saleTicketsMap[tx.transaction_id] || [];
      // Match if any buy ticket ID or sale ticket ID contains the search string
      matchesTicketId = txBuyTickets.some(ticket =>
        ticket.buy_ticket_id?.toLowerCase().includes(ticketId.toLowerCase())
      ) || txSaleTickets.some(ticket =>
        ticket.sale_ticket_id?.toLowerCase().includes(ticketId.toLowerCase())
      );
    }

    // Check amount match
    let matchesAmount = true;
    if (amountFilter) {
      const filterAmount = parseFloat(amountFilter);
      if (!isNaN(filterAmount)) {
        const txAmount = parseFloat(tx.total_amount || 0);
        matchesAmount = Math.abs(txAmount - filterAmount) < 0.01; // Match with small tolerance for floating point
      }
    }

    return matchesStore && matchesEmployee && matchesTransactionNumber &&
           matchesDate && matchesTransactionType && matchesTicketId && matchesAmount;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Void/View Transactions
      </Typography>
      
      {/* Filter Section */}
      <Paper sx={{ p: 3, mb: 3 }} elevation={2}>
        <Box display="flex" flexWrap="wrap" gap={2}>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150, flex: 1 }}>
            <InputLabel id="store-label">Store</InputLabel>
            <Select
              labelId="store-label"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              label="Store"
            >
              <MenuItem value="">
                <em>All Stores</em>
              </MenuItem>
              {stores.map((store) => (
                <MenuItem key={store} value={store}>
                  {store}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" sx={{ minWidth: 180, flex: 1 }}>
            <InputLabel id="transaction-type-label">Transaction Type</InputLabel>
            <Select
              labelId="transaction-type-label"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              label="Transaction Type"
            >
              <MenuItem value="">
                <em>All Types</em>
              </MenuItem>
              {transactionTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" sx={{ minWidth: 200, flex: 1 }}>
            <InputLabel id="employee-label">Employee</InputLabel>
            <Select
              labelId="employee-label"
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              label="Employee"
            >
              <MenuItem value="">
                <em>All Employees</em>
              </MenuItem>
              {employees.map((emp) => (
                <MenuItem key={emp.employee_id} value={emp.employee_id}>
                  {emp.first_name} {emp.last_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Business Date"
              value={businessDate}
              onChange={(newValue) => setBusinessDate(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  sx={{ minWidth: 180, flex: 1 }}
                />
              )}
            />
          </LocalizationProvider>

          <TextField
            label="T# / Section"
            variant="outlined"
            size="small"
            value={transactionNumber}
            onChange={(e) => setTransactionNumber(e.target.value)}
            sx={{ minWidth: 200, flex: 1 }}
          />

          <TextField
            label="Ticket ID"
            variant="outlined"
            size="small"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            sx={{ minWidth: 150, flex: 1 }}
            placeholder="Search by ticket ID"
          />

          <TextField
            label="Amount"
            variant="outlined"
            size="small"
            type="number"
            value={amountFilter}
            onChange={(e) => setAmountFilter(e.target.value)}
            sx={{ minWidth: 150, flex: 1 }}
            placeholder="Filter by amount"
          />
        </Box>
      </Paper>

      {/* Transactions Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Transaction ID</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Void</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'error.main' }}>
                  {error}
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  No transactions found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((txn) => (
                <TableRow key={txn.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <span style={{ marginRight: 8 }}>{txn.transaction_id || txn.id}</span>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleViewTransaction(txn)}
                        title="View Transaction Details"
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>{formatTransactionTime(txn.created_at)}</TableCell>
                  <TableCell>{txn.customer_name || 'N/A'}</TableCell>
                  <TableCell>{txn.employee_name || 'N/A'}</TableCell>
                  <TableCell>${parseFloat(txn.total_amount || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {txn.status !== 'voided' && (
                        <Checkbox
                          onChange={() => handleOpenDeleteDialog(txn.id)}
                          color="error"
                          size="small"
                        />
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Transaction Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Transaction #{selectedTransaction.transaction_id || selectedTransaction.id}
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell variant="head">Date & Time</TableCell>
                      <TableCell>{formatTransactionTime(selectedTransaction.created_at)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head">Customer</TableCell>
                      <TableCell>{selectedTransaction.customer_name || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head">Employee</TableCell>
                      <TableCell>{selectedTransaction.employee_name || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head">Amount</TableCell>
                      <TableCell>${(Math.abs(parseFloat(selectedTransaction.total_amount || 0))).toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head" colSpan={2} sx={{ fontWeight: 'bold', pt: 3 }}>
                        Items ({transactionItems.length})
                      </TableCell>
                    </TableRow>
                    {loadingItems ? (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ py: 2 }}>
                          Loading items...
                        </TableCell>
                      </TableRow>
                    ) : transactionItems.length > 0 ? (
                      <>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell><strong>Image</strong></TableCell>
                          <TableCell><strong>Description</strong></TableCell>
                          <TableCell><strong>Transaction Type</strong></TableCell>
                          <TableCell align="right"><strong>Price</strong></TableCell>
                        </TableRow>
                        {Object.entries(groupItemsByTicket()).map(([ticketId, ticketItems]) => (
                          <React.Fragment key={ticketId}>
                            {ticketId !== 'no-ticket' && (
                              <TableRow>
                                <TableCell colSpan={4} sx={{ bgcolor: '#e3f2fd', py: 1 }}>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      '&:hover': { textDecoration: 'underline' }
                                    }}
                                    onClick={() => handleBuyTicketClick(ticketId)}
                                    title="Click to view ticket receipt"
                                  >
                                    {ticketId}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            )}
                            {ticketItems.map((item, index) => (
                              <TableRow key={`${ticketId}-${index}`}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {item.item_details?.images?.[0] ? (
                                  <Avatar
                                    src={item.item_details.images[0].url}
                                    alt="Item"
                                    variant="rounded"
                                    sx={{ width: 50, height: 50, objectFit: 'cover' }}
                                  />
                                ) : (
                                  <Avatar
                                    variant="rounded"
                                    sx={{ width: 50, height: 50, bgcolor: 'grey.300' }}
                                  >
                                    <AttachMoneyIcon />
                                  </Avatar>
                                )}

                              </Box>
                            </TableCell>
                            <TableCell>
                                <Box>
                                  <div>{item.item_details?.description || `Item ${index + 1}`}</div>
                                  {item.description && <div style={{ fontSize: '0.8em', color: '#666' }}>{item.description}</div>}
                                </Box>
                            </TableCell>
                            <TableCell>{item.transaction_type}</TableCell>
                            <TableCell align="right">
                                  ${parseFloat(item.item_price || 0).toFixed(2)}
                                  {item.quantity > 1 && (
                                    <div style={{ fontSize: '0.8em', color: '#666' }}>
                                      {item.quantity} @ ${(parseFloat(item.item_price || 0) / item.quantity).toFixed(2)} each
                                    </div>
                                  )}
                            </TableCell>
                          </TableRow>
                            ))}
                          </React.Fragment>
                        ))}
                        <TableRow sx={{ '&:last-child td': { border: 0 }, backgroundColor: '#f9f9f9' }}>
                          <TableCell colSpan={3} align="right"><strong>Subtotal:</strong></TableCell>
                          <TableCell align="right">
                            <strong>
                              ${transactionItems.reduce((sum, item) => sum + (parseFloat(item.item_price || 0) * (item.quantity || 1)), 0).toFixed(2)}
                            </strong>
                          </TableCell>
                        </TableRow>

                        {/* Payment Methods Section */}
                        <TableRow sx={{ '&:last-child td': { border: 0 }, backgroundColor: '#f5f9ff' }}>
                          <TableCell colSpan={4} sx={{ pt: 1, pb: 1 }}>
                            <Box sx={{ textAlign: 'right' }}>
                              <Box display="flex" justifyContent="flex-end" alignItems="center" mb={1} gap={1}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Payment Methods:</Typography>
                                {isEditingPayments && (
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={handleAddPayment}
                                  >
                                    <Typography sx={{ fontSize: 20, fontWeight: 'bold' }}>+</Typography>
                                  </IconButton>
                                )}
                              </Box>
                            {loadingPayments ? (
                              <Typography>Loading payment details...</Typography>
                            ) : isEditingPayments ? (
                              <Box>
                                {editedPayments.map((payment, index) => (
                                  <Box key={index} display="flex" justifyContent="flex-end" gap={1} mb={1} alignItems="center">
                                    <FormControl size="small" sx={{ minWidth: 150 }}>
                                      <Select
                                        value={payment.payment_method}
                                        onChange={(e) => handlePaymentChange(index, 'payment_method', e.target.value)}
                                      >
                                        {paymentMethods.map((method) => (
                                          <MenuItem key={method.id} value={method.method_value}>
                                            {method.method_name}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={Math.abs(parseFloat(payment.amount))}
                                      onChange={(e) => handlePaymentChange(index, 'amount', e.target.value)}
                                      sx={{ width: 120 }}
                                      InputProps={{
                                        startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography>,
                                      }}
                                    />
                                    {editedPayments.length > 1 && (
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleRemovePayment(index)}
                                      >
                                        <Typography sx={{ fontSize: 18 }}>×</Typography>
                                      </IconButton>
                                    )}
                                  </Box>
                                ))}
                                <Divider sx={{ my: 1 }} />
                                <Box display="flex" justifyContent="flex-end" gap={2} fontWeight="bold">
                                  <span>Total:</span>
                                  <span>${editedPayments.reduce((sum, p) => sum + Math.abs(parseFloat(p.amount || 0)), 0).toFixed(2)}</span>
                                </Box>
                              </Box>
                            ) : paymentDetails.payments.length > 0 ? (
                              <Box sx={{ textAlign: 'right' }}>
                                {paymentDetails.payments.map((payment, index) => (
                                  <Box key={index} display="flex" justifyContent="flex-end" gap={2} mb={1}>
                                    <span>{payment.payment_method.replace(/_/g, ' ').toUpperCase()}:</span>
                                    <span>${Math.abs(parseFloat(payment.amount)).toFixed(2)}</span>
                                  </Box>
                                ))}
                                <Divider sx={{ my: 1 }} />
                                <Box display="flex" justifyContent="flex-end" gap={2} fontWeight="bold">
                                  <span>Total Paid:</span>
                                  <span>${parseFloat(paymentDetails.total_paid).toFixed(2)}</span>
                                </Box>
                              </Box>
                            ) : (
                              <Typography>No payment information available</Typography>
                            )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ py: 2, fontStyle: 'italic' }}>
                          No items found for this transaction
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {isEditingPayments ? (
            <>
              <Button onClick={handleCancelEdit} color="error">
                Cancel
              </Button>
              <Button onClick={handleSavePayments} variant="contained" color="primary">
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleEditPayments}
                color="secondary"
                variant="outlined"
              >
                Edit Transaction
              </Button>
              <Button
                onClick={handlePrintTransaction}
                color="primary"
                variant="contained"
                startIcon={<PrintIcon />}
              >
                Reprint
              </Button>
              <Button onClick={handleCloseDialog} color="primary">
                Close
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            Confirm Deletion
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" alignItems="center" gap={2} p={1}>
            <WarningIcon color="warning" style={{ fontSize: 40 }} />
            <Typography variant="body1">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            startIcon={<WarningIcon />}
            autoFocus
          >
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TransactionJournals;
