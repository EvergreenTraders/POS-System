import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemText,
  TextField,
  InputAdornment,
  Grid,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Badge,
  IconButton
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import HistoryIcon from '@mui/icons-material/History';
import { useSnackbar } from 'notistack';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import config from '../config';
import axios from 'axios';

function Jewelry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { cartItems, addToCart } = useCart();

  const handleViewHistory = async (itemId) => {
    console.log('View History clicked for item:', itemId);
    if (!itemId) {
      console.error('No item ID provided');
      enqueueSnackbar('Error: No item selected', { variant: 'error' });
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Fetch history and item details in parallel
      const [historyResponse, itemResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/jewelry/${itemId}/history`),
        axios.get(`${API_BASE_URL}/jewelry/${itemId}`)
      ]);

      // Try to fetch transaction information if item was sold
      let transactionInfo = null;
      try {
        // Check transaction_items table for this item_id
        const transactionResponse = await axios.get(
          `${API_BASE_URL}/transaction-items?item_id=${itemId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (transactionResponse.data && transactionResponse.data.length > 0) {
          // Get the most recent transaction for this item
          const transactionItem = transactionResponse.data[0];

          // Fetch full transaction details
          const txDetailResponse = await axios.get(
            `${API_BASE_URL}/transactions/${transactionItem.transaction_id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (txDetailResponse.data) {
            transactionInfo = txDetailResponse.data;
          }
        }
      } catch (txError) {
        console.log('No transaction found for this item (may not be sold yet)');
      }

      if (historyResponse.data) {
        generateHistoryPDF(historyResponse.data.history, itemId, itemResponse.data, transactionInfo);
      } else {
        enqueueSnackbar('No history found for this item', { variant: 'info' });
      }
    } catch (error) {
      console.error('Error fetching item history:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      enqueueSnackbar(`Error loading history: ${error.message}`, { variant: 'error' });
    }
  };

  const generateHistoryPDF = async (historyData, itemId, itemData, transactionInfo = null) => {
    const doc = new jsPDF();
    const title = `Item Lifecycle History - #${itemId}`;

    // Sort history by date (oldest first for chronological order)
    const sortedHistory = [...historyData].sort((a, b) =>
      new Date(a.changed_at) - new Date(b.changed_at)
    );

    // Get source and bought_from from item details
    const source = itemData?.source || 'N/A';
    const boughtFrom = itemData?.bought_from || 'N/A';
    const category = itemData?.category || 'N/A';
    const metalType = itemData?.metal_type || 'N/A';
    const metalWeight = itemData?.metal_weight || 'N/A';
    const itemPrice = itemData?.item_price || 'N/A';

    // Function to get user-friendly field names - convert snake_case to Title Case
    const getFieldDisplayName = (field) => {
      // Convert snake_case to Title Case (e.g., "inventory_status" -> "Inventory Status")
      return field
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };

    // Function to format event descriptions
    const getEventDescription = (entry) => {
      const changes = entry.changed_fields;

      // Check for status changes (most important)
      if (changes.inventory_status || changes.status) {
        const statusChange = changes.inventory_status || changes.status;
        const from = statusChange.from || 'Unknown';
        const to = statusChange.to || 'Unknown';

        if (to === 'HOLD') return `Item placed on HOLD`;
        if (to === 'IN_PROCESS') return `Item moved to processing`;
        if (to === 'ACTIVE') return `Item activated for sale`;
        if (to === 'SOLD') return `Item SOLD to customer`;
        if (to === 'SCRAP PROCESS') return `Item moved to scrap`;
        if (from === 'Unknown' && to) return `Item received (Status: ${to})`;
        return `Status changed from ${from} to ${to}`;
      }

      // Check for price changes
      if (changes.item_price) {
        return 'Pricing updated';
      }

      // Check for gem/jewelry details
      if (Object.keys(changes).some(k => k.includes('gem') || k.includes('metal'))) {
        return 'Item details/specifications updated';
      }

      // Check for description changes
      if (changes.short_desc || changes.long_desc) {
        return 'Description updated';
      }

      // Default
      return 'Item information updated';
    };

    // Process history data into detailed timeline
    const timelineData = [];

    // Add initial creation event if available
    if (itemData?.created_at) {
      timelineData.push({
        date: new Date(itemData.created_at).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        event: 'Item Received/Created',
        details: '',
        user: 'System',
        section: 'initial'
      });
    }

    sortedHistory.forEach(entry => {
      const changedAt = new Date(entry.changed_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      const changedBy = entry.first_name && entry.last_name
        ? `${entry.first_name} ${entry.last_name}`
        : 'System';

      const changes = entry.changed_fields;
      const eventDesc = getEventDescription(entry);

      // Build detailed change information
      let details = [];

      Object.entries(changes).forEach(([field, value]) => {
        // Special handling for Item Attributes (nested object)
        if (field === 'Item Attributes' && value && typeof value === 'object') {
          Object.entries(value).forEach(([attrName, attrValue]) => {
            if (attrValue && typeof attrValue === 'object' && 'from' in attrValue && 'to' in attrValue) {
              const fromVal = attrValue.from !== null && attrValue.from !== undefined ? String(attrValue.from) : 'None';
              const toVal = attrValue.to !== null && attrValue.to !== undefined ? String(attrValue.to) : 'None';

              if (fromVal !== toVal) {
                details.push(`Attribute ${attrName}: ${fromVal} → ${toVal}`);
              }
            }
          });
        } else if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
          const displayName = getFieldDisplayName(field);
          const fromVal = value.from !== null && value.from !== undefined ? String(value.from) : 'None';
          const toVal = value.to !== null && value.to !== undefined ? String(value.to) : 'None';

          if (fromVal !== toVal) {
            details.push(`${displayName}: ${fromVal} → ${toVal}`);
          }
        }
      });

      if (entry.change_notes) {
        details.push(`Notes: ${entry.change_notes}`);
      }

      timelineData.push({
        date: changedAt,
        event: eventDesc,
        details: details.join('\n'),
        user: changedBy,
        section: 'history'
      });
    });

    // Add transaction/sale information if available
    if (transactionInfo) {
      const saleDate = new Date(transactionInfo.created_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const saleDetails = [
        `Transaction ID: ${transactionInfo.transaction_id}`,
        `Customer: ${transactionInfo.customer_name || 'Walk-in Customer'}`,
        `Employee: ${transactionInfo.employee_name || 'N/A'}`,
        `Transaction Type: ${transactionInfo.transaction_type_name || 'Sale'}`,
        `Amount: $${transactionInfo.total_amount || '0.00'}`,
        `Payment Method: ${transactionInfo.payment_method_name || 'N/A'}`
      ].join('\n');

      timelineData.push({
        date: saleDate,
        event: '🔔 Item SOLD to Customer',
        details: saleDetails,
        user: transactionInfo.employee_name || 'System',
        section: 'transaction'
      });
    }

    // Add primary image to top right corner
    try {
      const imageUrl = getImageUrl(itemData.images);
      if (imageUrl && !imageUrl.includes('placeholder')) {
        // Load the image
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        await new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              // Add image to PDF at top right corner
              const imgWidth = 30;
              const imgHeight = 30;
              const xPos = doc.internal.pageSize.getWidth() - imgWidth - 14;
              const yPos = 10;

              doc.addImage(img, 'JPEG', xPos, yPos, imgWidth, imgHeight);
              resolve();
            } catch (error) {
              console.error('Error adding image to PDF:', error);
              resolve(); // Continue even if image fails
            }
          };

          img.onerror = () => {
            console.error('Failed to load image for PDF');
            resolve(); // Continue even if image fails
          };

          img.src = imageUrl;
        });
      }
    } catch (error) {
      console.error('Error loading image for PDF:', error);
      // Continue with PDF generation even if image fails
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add header background
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Add title in white on blue background
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('ITEM HISTORY REPORT', 14, 20);

    // Add item ID prominently
    doc.setFontSize(14);
    doc.text(`Item #${itemId}`, 14, 32);

    // Add generation date on the right
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    const genDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    doc.text(`Generated: ${genDate}`, pageWidth - 14, 20, { align: 'right' });

    // Add current status badge
    const currentStatus = itemData?.inventory_status || itemData?.status || 'N/A';
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text(`Status: ${currentStatus}`, pageWidth - 14, 32, { align: 'right' });

    // Reset text color for rest of document
    doc.setTextColor(0, 0, 0);

    // Item Details Section
    let yPos = 55;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('ITEM DETAILS', 14, yPos);

    yPos += 2;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, yPos, pageWidth - 14, yPos);

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');

    // Create two-column layout for item details
    const col1X = 14;
    const col2X = pageWidth / 2 + 7;
    const labelWidth = 35;

    // Column 1
    doc.setFont(undefined, 'bold');
    doc.text('Category:', col1X, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(category, col1X + labelWidth, yPos);

    doc.setFont(undefined, 'bold');
    doc.text('Source:', col2X, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(source, col2X + labelWidth, yPos);

    yPos += 6;
    doc.setFont(undefined, 'bold');
    doc.text('Metal Type:', col1X, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(metalType, col1X + labelWidth, yPos);

    doc.setFont(undefined, 'bold');
    doc.text('Bought From:', col2X, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(boughtFrom, col2X + labelWidth, yPos);

    yPos += 6;
    doc.setFont(undefined, 'bold');
    doc.text('Weight:', col1X, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(`${metalWeight}g`, col1X + labelWidth, yPos);

    doc.setFont(undefined, 'bold');
    doc.text('Item Price:', col2X, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(`$${itemPrice}`, col2X + labelWidth, yPos);

    // Transaction History Section
    yPos += 15;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('TRANSACTION HISTORY', 14, yPos);

    yPos += 2;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, yPos, pageWidth - 14, yPos);

    yPos += 6;

    // Create timeline entries as cards
    timelineData.forEach((entry, index) => {
      // Check if we need a new page
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      // Draw card background
      const cardHeight = entry.details ? 22 : 16;
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(14, yPos, pageWidth - 28, cardHeight, 2, 2, 'F');

      // Draw left colored border based on event type
      let borderColor = [100, 100, 100]; // Default gray
      if (entry.event.includes('SOLD')) borderColor = [220, 53, 69]; // Red
      else if (entry.event.includes('ACTIVE')) borderColor = [40, 167, 69]; // Green
      else if (entry.event.includes('HOLD')) borderColor = [255, 193, 7]; // Yellow
      else if (entry.event.includes('IN_PROCESS')) borderColor = [0, 123, 255]; // Blue
      else if (entry.event.includes('Received')) borderColor = [108, 117, 125]; // Gray

      doc.setFillColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.roundedRect(14, yPos, 3, cardHeight, 1, 1, 'F');

      // Add date/time
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'normal');
      doc.text(entry.date, 20, yPos + 5);

      // Add event name
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text(entry.event, 20, yPos + 10);

      // Add user on the right
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'italic');
      doc.text(`by ${entry.user}`, pageWidth - 16, yPos + 5, { align: 'right' });

      // Add details if present
      if (entry.details && entry.details !== '-') {
        doc.setFontSize(7);
        doc.setTextColor(60, 60, 60);
        doc.setFont(undefined, 'normal');
        const detailLines = doc.splitTextToSize(entry.details, pageWidth - 50);
        doc.text(detailLines, 20, yPos + 15);
      }

      yPos += cardHeight + 4;
    });
    
    // Generate PDF blob and open in new tab
    const pdfOutput = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfOutput);
    const newWindow = window.open();
    if (newWindow) {
      newWindow.location.href = pdfUrl;
    } else {
      // Fallback to download if popup is blocked
      doc.save(`item_${itemId}_history.pdf`);
    }
  };
  const API_BASE_URL = config.apiUrl;
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [serialQuery, setSerialQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [jewelryItems, setJewelryItems] = useState([]);
  const [scrapDialogOpen, setScrapDialogOpen] = useState(false);
  const [itemToScrap, setItemToScrap] = useState(null);
  const [scrapBuckets, setScrapBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState('');
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [inventoryStatuses, setInventoryStatuses] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');

  const fetchScrapBuckets = async () => {
    try {
      setLoadingBuckets(true);
      const response = await axios.get(`${API_BASE_URL}/scrap/buckets`);
      // Filter to show only ACTIVE buckets
      const activeBuckets = response.data.filter(bucket => bucket.status === 'ACTIVE');
      setScrapBuckets(activeBuckets);
      if (activeBuckets.length > 0) {
        setSelectedBucket(activeBuckets[0].bucket_id);
      }
    } catch (error) {
      console.error('Error fetching scrap buckets:', error);
      enqueueSnackbar('Failed to load scrap buckets', { variant: 'error' });
    } finally {
      setLoadingBuckets(false);
    }
  };

  const handleMoveToScrap = async () => {
    if (!itemToScrap || !selectedBucket) {
      enqueueSnackbar('Please select a scrap bucket', { variant: 'warning' });
      return;
    }
    
    try {
      // Find the selected bucket by ID to get its name
      const selectedBucketObj = scrapBuckets.find(bucket => bucket.bucket_id === selectedBucket);
      if (!selectedBucketObj) {
        throw new Error('Selected bucket not found');
      }
      
      // Call the move-to-scrap endpoint with the selected bucket name
      const response = await axios.post(
        `${API_BASE_URL}/jewelry/${itemToScrap.item_id}/move-to-scrap`,
        {
          moved_by: currentUser?.id || 1,
          bucket_id: selectedBucket
        }
      );
      
      // Remove the item from the local state
      setJewelryItems(prevItems => 
        prevItems.filter(item => item.item_id !== itemToScrap.item_id)
      );
      
      enqueueSnackbar('Item moved to scrap successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error moving item to scrap:', error);
      enqueueSnackbar(
        error.response?.data?.error || 'Failed to move item to scrap', 
        { variant: 'error' }
      );
    } finally {
      setScrapDialogOpen(false);
      setItemToScrap(null);
    }
  };

  const handleEditClick = async (item) => {
    try {
      // Fetch all secondary gem details and full history in parallel
      const [gemsResponse, historyResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/jewelry_secondary_gems/${item.item_id}`),
        axios.get(`${API_BASE_URL}/jewelry/${item.item_id}/history`)
      ]);

      const secondaryGems = gemsResponse.data || [];
      const fullHistory = historyResponse.data?.history || [];

      // Navigate with item ID, secondary gem data, and full history
      navigate('/jewelry-edit', {
        state: {
          itemId: item.item_id,
          secondaryGems: secondaryGems,
          fullHistory: fullHistory
        },
        replace: true
      });
    } catch (error) {
      console.error('Error fetching secondary gem details:', error);
      // Still navigate even if secondary gem fetch fails
      navigate('/jewelry-edit', { state: { itemId: item.item_id } });
    }
  };

  const handleAddToTicket = (item) => {
    // Check if item is ACTIVE
    const currentStatus = item.inventory_status || item.status;
    if (currentStatus !== 'ACTIVE') {
      enqueueSnackbar('Only ACTIVE items can be added to ticket', { variant: 'warning' });
      return;
    }

    // Navigate to CustomerTicket with the selected item
    const customer = location.state?.customer;
    navigate('/customer-ticket', {
      state: {
        customer,
        selectedInventoryItem: {
          ...item,
          id: item.item_id,
          item_id: item.item_id,
          description: item.short_desc || item.long_desc,
          category: item.category,
          price: item.item_price,
          item_price: item.item_price,
          metal_weight: item.metal_weight,
          transactionType: 'sale',
          fromInventory: true
        }
      }
    });
  };

  const handleAddToCart = (item) => {
    // Check if item is ACTIVE
    const currentStatus = item.inventory_status || item.status;
    if (currentStatus !== 'ACTIVE') {
      enqueueSnackbar('Only ACTIVE items can be added to cart', { variant: 'warning' });
      return;
    }

    // Get or create sale ticket ID for inventory items
    let saleTicketId = sessionStorage.getItem('inventorySaleTicketId');
    if (!saleTicketId) {
      // Generate a new sale ticket ID (format: ST-00000001)
      const storageKey = 'lastSTTicketNumber';
      let lastTicketNumber = parseInt(localStorage.getItem(storageKey) || '0');
      lastTicketNumber += 1;
      localStorage.setItem(storageKey, lastTicketNumber.toString());
      saleTicketId = `ST-${lastTicketNumber.toString().padStart(8, '0')}`;
      sessionStorage.setItem('inventorySaleTicketId', saleTicketId);
    }

    // Add item to cart with sale transaction type (for active inventory)
    const cartItem = {
      ...item,
      id: item.item_id,
      item_id: item.item_id,
      description: item.short_desc || item.long_desc,
      category: item.category,
      price: item.item_price,
      item_price: item.item_price,
      metal_weight: item.metal_weight,
      quantity: 1,
      transactionType: 'sale', // Always set to 'sale' for active inventory
      transaction_type: 'sale', // Ensure both formats are set
      fromInventory: true,
      buyTicketId: saleTicketId, // Group all inventory items under same sale ticket
      employee: {
        id: currentUser.id,
        name: `${currentUser.firstName} ${currentUser.lastName}`,
        username: currentUser.username
      }
    };

    addToCart(cartItem);
    enqueueSnackbar('Item added to cart', { variant: 'success' });
  };

  // Get count of specific item in cart
  const getItemCartCount = (itemId) => {
    return cartItems.filter(item => item.item_id === itemId || item.id === itemId).length;
  };

  useEffect(() => {
    fetchJewelryItems();
    fetchInventoryStatuses();
  }, []);

  const fetchInventoryStatuses = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/inventory-status`);
      if (response.data && response.data.length > 0) {
        setInventoryStatuses(response.data);
      }
    } catch (error) {
      console.error('Error fetching inventory statuses:', error);
    }
  };

  const fetchJewelryItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/jewelry`);
      // Filter out items with status 'SCRAP PROCESS' and 'SOLD TO REFINER'
      const nonScrapItems = response.data.filter(item =>
        item.status !== 'SCRAP PROCESS' && item.status !== 'SOLD TO REFINER'
      );

      // Fetch history for all items and apply latest changes
      const itemsWithHistory = await Promise.all(
        nonScrapItems.map(async (item) => {
          try {
            // Fetch history for this item
            const historyResponse = await axios.get(`${API_BASE_URL}/jewelry/${item.item_id}/history`);
            const history = historyResponse.data?.history || [];

            if (history.length === 0) {
              return item; // No history, return item as-is
            }

            // Sort history by date (newest first) to get latest changes
            const sortedHistory = [...history].sort((a, b) =>
              new Date(b.changed_at) - new Date(a.changed_at)
            );

            // Build current state by applying all history changes
            const latestChanges = {};

            // Process each history entry
            sortedHistory.forEach(entry => {
              const changedFields = typeof entry.changed_fields === 'string'
                ? JSON.parse(entry.changed_fields)
                : entry.changed_fields;

              if (!changedFields) return;

              // Process each field in this history entry
              const processField = (fields, prefix = '') => {
                Object.entries(fields).forEach(([key, value]) => {
                  const fullKey = prefix ? `${prefix}.${key}` : key;

                  // Skip if we already have a newer value for this field
                  if (latestChanges.hasOwnProperty(fullKey)) {
                    return;
                  }

                  // If value has 'to' property, it's a direct change
                  if (value && typeof value === 'object' && 'to' in value) {
                    latestChanges[fullKey] = value.to;
                  }
                  // If it's a nested object (like secondary_gem_1), process recursively
                  else if (value && typeof value === 'object' && !Array.isArray(value)) {
                    processField(value, fullKey);
                  }
                  // Simple value
                  else {
                    latestChanges[fullKey] = value;
                  }
                });
              };

              processField(changedFields);
            });

            // Apply the latest changes to the item
            const updatedItem = { ...item };
            Object.entries(latestChanges).forEach(([key, value]) => {
              if (!key.includes('.')) {
                // Simple field - apply directly
                updatedItem[key] = value;
              }
            });

            return updatedItem;
          } catch (error) {
            console.error(`Error fetching history for item ${item.item_id}:`, error);
            return item; // Return item without history if fetch fails
          }
        })
      );

      setJewelryItems(itemsWithHistory);
      if (itemsWithHistory.length > 0) {
        setSelectedItem(itemsWithHistory[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
  };

  const truncateNumber = (number) => {
    return number.substring(0, 14) + '...' + number.substring(number.length - 4);
  };

  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) {
      return '0.00';
    }
    return price.toFixed(2);
  };

  // Helper function to extract image URL from various image formats
  const getImageUrl = (images) => {
    // Default placeholder image
    const placeholderImage = 'https://via.placeholder.com/150';

    // Helper to convert relative paths to absolute URLs
    const makeAbsoluteUrl = (url) => {
      if (!url) return placeholderImage;
      // If already absolute URL (starts with http:// or https://), return as is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      // If relative path (starts with /uploads), prepend server base URL
      if (url.startsWith('/uploads')) {
        const serverBase = config.apiUrl.replace('/api', '');
        const finalUrl = `${serverBase}${url}`;
        return finalUrl;
      }
      return url;
    };

    try {

      // If images is a string (JSON string), try to parse it
      if (typeof images === 'string') {
        try {
          images = JSON.parse(images);
        } catch (e) {
          return placeholderImage;
        }
      }

      // If no images or empty array
      if (!images || !Array.isArray(images) || images.length === 0) {
        return placeholderImage;
      }

      // Try to find the primary image first - check multiple possible field names
      const primaryImage = images.find(img =>
        img.isPrimary === true
      );

      // If primary image found
      if (primaryImage) {
        // Check for different possible URL structures
        if (primaryImage.url) return makeAbsoluteUrl(primaryImage.url);
        if (primaryImage.image_url) return makeAbsoluteUrl(primaryImage.image_url);
        if (typeof primaryImage === 'string') return makeAbsoluteUrl(primaryImage);
      }

      // Otherwise use the first image
      const firstImage = images[0];
      if (firstImage) {
        if (firstImage.url) return makeAbsoluteUrl(firstImage.url);
        if (firstImage.image_url) return makeAbsoluteUrl(firstImage.image_url);
        if (typeof firstImage === 'string') return makeAbsoluteUrl(firstImage);
      }

      // Default to placeholder if no valid images found
      return placeholderImage;
    } catch (error) {
      console.error('Error processing image:', error);
      return placeholderImage;
    }
  };

  // Filter jewelry items based on search queries and status
  const filteredItems = jewelryItems.filter(item => {
    // Exclude items with 'quoted' status
    const notQuoted = item.status?.toLowerCase() !== 'quoted';

    // Only exclude HOLD items when 'ALL' is selected, not when specifically filtering for HOLD
    const notHold = selectedStatus === 'ALL' ? (item.inventory_status || item.status) !== 'HOLD' : true;

    const matchesSearch = searchQuery === '' ||
      item.short_desc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSerial = serialQuery === '' ||
      item.item_id?.toLowerCase().includes(serialQuery.toLowerCase());

    // Filter by selected status (show all if 'ALL' is selected)
    const matchesStatus = selectedStatus === 'ALL' ||
      (item.inventory_status || item.status) === selectedStatus;

    return matchesSearch && matchesSerial && notQuoted && notHold && matchesStatus;
  });

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Main Content */}
      <Grid container sx={{ flex: 1, overflow: 'hidden' }}>
        {/* Inventory Table Section */}
        <Grid item xs={9} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Search Section */}
          <Box sx={{
            display: 'flex',
            gap: 2,
            p: 2,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            alignItems: 'center'
          }}>
            <TextField
              size="small"
              placeholder="Search inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              size="small"
              placeholder="Search by item ID..."
              value={serialQuery}
              onChange={(e) => setSerialQuery(e.target.value)}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                {inventoryStatuses.map((status) => (
                  <MenuItem key={status.status_code} value={status.status_code}>
                    {status.status_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
            <Table stickyHeader sx={{ minWidth: 650 }} aria-label="jewelry inventory table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '100px' }}>ID</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Weight</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No jewelry items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow
                      key={item.id}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        bgcolor: selectedItem?.id === item.id ? 'action.selected' : 'inherit'
                      }}
                      onClick={() => handleRowClick(item)}
                    >
                      <TableCell>{item.item_id}</TableCell>
                      <TableCell>{item.short_desc || item.long_desc}</TableCell>
                      <TableCell>
                        {typeof item.category === 'object' && item.category !== null
                          ? (item.category.category || item.category.value || item.category.name || '')
                          : (item.category || '')}
                      </TableCell>
                      <TableCell>${item.item_price || 'N/A'}</TableCell>
                      <TableCell>{item.metal_weight}g</TableCell>
                      <TableCell>{item.inventory_status || item.status}</TableCell>
                      <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {/* Only show Edit button for IN_PROCESS status items */}
                          {(item.inventory_status === 'IN_PROCESS' || item.status === 'IN_PROCESS') && (
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(item);
                              }}
                              sx={{
                                minWidth: '60px',
                                height: '28px',
                                fontSize: '0.75rem',
                                padding: '4px 8px',
                                '& .MuiButton-label': {
                                  lineHeight: 1.2
                                }
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          {/* Only show Add to Ticket button for ACTIVE status items */}
                          {(item.inventory_status === 'ACTIVE' || item.status === 'ACTIVE') && (
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToTicket(item);
                              }}
                              startIcon={<ShoppingCartIcon />}
                              sx={{
                                minWidth: '120px',
                                height: '28px',
                                fontSize: '0.7rem',
                                padding: '4px 4px',
                                '& .MuiButton-label': {
                                  lineHeight: 1.2
                                }
                              }}
                            >
                              Add to Ticket
                            </Button>
                          )}
                          {item.status !== 'SCRAP PROCESS' && item.status !== 'SOLD TO REFINER' && (
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToScrap(item);
                                setScrapDialogOpen(true);
                                fetchScrapBuckets().catch((error) => {
                                  console.error('Error fetching scrap buckets:', error);
                                });
                              }}
                              sx={{
                                minWidth: '85px',
                                height: '28px',
                                fontSize: '0.7rem',
                                '& .MuiButton-label': {
                                  lineHeight: 1.1,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }
                              }}
                            >
                              To Scrap
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Details Section */}
        <Grid item xs={3} 
          sx={{ 
            height: '100%',
            borderLeft: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {selectedItem && (
            <Box sx={{ 
              height: '100%',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              p: 2
            }}>
              {/* Image and Basic Info Section */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                {/* Image */}
                <Box sx={{ width: '120px', height: '120px', flexShrink: 0 }}>
                  <img
                    src={getImageUrl(selectedItem.images)}
                    alt={selectedItem.name || 'Item'}
                    onError={(e) => {
                      console.error('Image failed to load:', e.target.src);
                      e.target.src = 'https://via.placeholder.com/150';
                    }}
                    onLoad={(e) => {
                      console.log('Image loaded successfully:', e.target.src);
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                </Box>
                
                {/* Basic Info */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 'bold',
                      mb: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.4
                    }}
                  >
                    {selectedItem.short_desc || selectedItem.long_desc || 'No Description'}
                  </Typography>

                  <Typography variant="h6" sx={{ color: 'success.main', mb: 0.5 }}>
                    ${selectedItem.item_price}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: (selectedItem.status === 'SOLD' || selectedItem.inventory_status === 'SOLD') ? 'error.main' :
                             (selectedItem.status === 'ACTIVE' || selectedItem.inventory_status === 'ACTIVE') ? 'info.main' :
                             'success.main',
                      fontWeight: 'medium'
                    }}
                  >
                    {selectedItem.status || selectedItem.inventory_status || 'HOLD'}
                  </Typography>
                </Box>
              </Box>

              {/* Specifications */}
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
                    Specifications
                  </Typography>
                  <Button 
                    variant="contained" 
                    size="small"
                    color="primary"
                    onClick={() => handleViewHistory(selectedItem.item_id)}
                    startIcon={<HistoryIcon fontSize="small" />}
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      py: 0.5,
                      px: 1.5,
                      borderRadius: 1,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    View History
                  </Button>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Metal Weight</Typography>
                    <Typography variant="body2">{selectedItem.metal_weight}g</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Metal Type</Typography>
                    <Typography variant="body2">{selectedItem.precious_metal_type || selectedItem.non_precious_metal_type || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Purity</Typography>
                    <Typography variant="body2">{selectedItem.metal_purity || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Color</Typography>
                    <Typography variant="body2">{selectedItem.jewelry_color || 'N/A'}</Typography>
                  </Box>
                  {selectedItem.primary_gem_type && (
                    <>
                      <Box>
                        <Typography variant="caption" color="textSecondary">Primary Gem</Typography>
                        <Typography variant="body2">{selectedItem.primary_gem_type}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">Gem Weight</Typography>
                        <Typography variant="body2">{selectedItem.primary_gem_weight}ct</Typography>
                      </Box>
                    </>
                  )}
                  {selectedItem.primary_gem_color && (
                    <Box>
                      <Typography variant="caption" color="textSecondary">Gem Color</Typography>
                      <Typography variant="body2">{selectedItem.primary_gem_color}</Typography>
                    </Box>
                  )}
                  {selectedItem.primary_gem_clarity && (
                    <Box>
                      <Typography variant="caption" color="textSecondary">Gem Clarity</Typography>
                      <Typography variant="body2">{selectedItem.primary_gem_clarity}</Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="caption" color="textSecondary">Created</Typography>
                    <Typography variant="body2">{new Date(selectedItem.created_at).toLocaleDateString()}</Typography>
                  </Box>
                </Box>
              </Paper>

              {/* ID Section */}
              <Paper elevation={0} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="caption" color="textSecondary">Item ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedItem.item_id}</Typography>
              </Paper>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Move to Scrap Confirmation Dialog */}
      <Dialog
        open={scrapDialogOpen}
        onClose={() => setScrapDialogOpen(false)}
        aria-labelledby="scrap-dialog-title"
        aria-describedby="scrap-dialog-description"
      >
        <DialogTitle id="scrap-dialog-title">
          Move to Scrap
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="scrap-dialog-description" sx={{ mb: 2 }}>
            Are you sure you want to move item <strong>{itemToScrap?.item_id}</strong> to scrap?
          </DialogContentText>
          
          {loadingBuckets ? (
            <Box display="flex" justifyContent="center" my={2}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <TextField
              select
              fullWidth
              label="Select Scrap Bucket"
              value={selectedBucket}
              onChange={(e) => setSelectedBucket(e.target.value)}
              variant="outlined"
              margin="normal"
              required
            >
              {scrapBuckets.map((bucket) => (
                <MenuItem key={bucket.bucket_id} value={bucket.bucket_id}>
                  {bucket.bucket_name} ({bucket.bucket_type})
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScrapDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleMoveToScrap} 
            color="error"
            variant="contained"
            autoFocus
          >
            Move to Scrap
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Jewelry;
