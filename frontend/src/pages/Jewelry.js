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
  Select
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import HistoryIcon from '@mui/icons-material/History';
import { useSnackbar } from 'notistack';
import SearchIcon from '@mui/icons-material/Search';
import config from '../config';
import axios from 'axios';

function Jewelry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const handleViewHistory = async (itemId) => {
    console.log('View History clicked for item:', itemId);
    if (!itemId) {
      console.error('No item ID provided');
      enqueueSnackbar('Error: No item selected', { variant: 'error' });
      return;
    }

    try {
      // Fetch both history and item details in parallel
      const [historyResponse, itemResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/jewelry/${itemId}/history`),
        axios.get(`${API_BASE_URL}/jewelry/${itemId}`)
      ]);

      if (historyResponse.data) {
        generateHistoryPDF(historyResponse.data.history, itemId, itemResponse.data);
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

  const generateHistoryPDF = async (historyData, itemId, itemData) => {
    const doc = new jsPDF();
    const title = `Item History - #${itemId}`;
    const headers = [['Date', 'Changed By', 'Field', 'From', 'To', 'Notes']];
    // Sort history by date (newest first)
    const sortedHistory = [...historyData].sort((a, b) =>
      new Date(b.changed_at) - new Date(a.changed_at)
    );

    // Get source and bought_from from item details
    const source = itemData?.source || 'N/A';
    const boughtFrom = itemData?.bought_from || 'N/A';

    // Process history data into table rows
    const tableData = [];

    sortedHistory.forEach(entry => {
      const changedAt = new Date(entry.changed_at).toLocaleString();
      const changedBy = entry.first_name && entry.last_name
        ? `${entry.first_name} ${entry.last_name}`
        : `User ID: ${entry.changed_by || 'System'}`;

      // Process each changed field
      const changes = entry.changed_fields;

      // Handle nested changes (like in secondary_gem_*)
      const processChanges = (changes, prefix = '') => {
        return Object.entries(changes).flatMap(([field, value]) => {
          const fullFieldName = prefix ? `${prefix}.${field}` : field;

          // If the value has 'from' and 'to' properties, it's a direct change
          if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
            return [{
              field: fullFieldName,
              from: value.from !== undefined ? String(value.from) : 'N/A',
              to: value.to !== undefined ? String(value.to) : 'N/A'
            }];
          }
          // If it's a nested object (like secondary_gem_1), process it recursively
          else if (value && typeof value === 'object') {
            return processChanges(value, fullFieldName);
          }
          // Simple value
          return [{
            field: fullFieldName,
            from: 'N/A',
            to: value !== undefined ? String(value) : 'N/A'
          }];
        });
      };

      const fieldChanges = processChanges(changes);

      // Add a row for each changed field
      fieldChanges.forEach((change, index) => {
        tableData.push([
          index === 0 ? changedAt : '',
          index === 0 ? changedBy : '',
          change.field,
          change.from,
          change.to,
          index === 0 ? (entry.change_notes || '') : ''
        ]);
      });

      // Add a separator row between different history entries
      if (fieldChanges.length > 0) {
        tableData.push(Array(6).fill(''));
      }
    });

    // Remove the last separator row if it exists
    if (tableData.length > 0 && tableData[tableData.length - 1].every(cell => cell === '')) {
      tableData.pop();
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

    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    // Add Source and Bought From information
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(`Source: `, 14, 38);
    doc.setFont(undefined, 'normal');
    doc.text(source, 32, 38);

    doc.setFont(undefined, 'bold');
    doc.text(`Bought From: `, 80, 38);
    doc.setFont(undefined, 'normal');
    doc.text(boughtFrom, 110, 38);

    // Register autoTable plugin
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 44,
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 1.5
      },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: 'bold' }, // Date
        1: { cellWidth: 25 }, // Changed By
        2: { cellWidth: 35 }, // Field
        3: { cellWidth: 28 }, // From
        4: { cellWidth: 28 }, // To
        5: { cellWidth: 42 }  // Notes
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 44 },
      didParseCell: function(data) {
        // Make the first column (Date) and second column (Changed By) bold for the first row of each change set
        if (data.column.index <= 1 && data.row.index > 0 && tableData[data.row.index - 1][0] === '') {
        }

        // Add a border between different change sets
        if (data.row.index > 0 && data.column.index === 0 && tableData[data.row.index][0] === '') {
          data.cell.styles.lineWidth = 0.5;
        }
      }
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

    const matchesSearch = searchQuery === '' ||
      item.short_desc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSerial = serialQuery === '' ||
      item.item_id?.toLowerCase().includes(serialQuery.toLowerCase());

    // Filter by selected status (show all if 'ALL' is selected)
    const matchesStatus = selectedStatus === 'ALL' ||
      (item.inventory_status || item.status) === selectedStatus;

    return matchesSearch && matchesSerial && notQuoted && matchesStatus;
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
                      <TableCell>{item.category}</TableCell>
                      <TableCell>${item.buy_price}</TableCell>
                      <TableCell>{item.metal_weight}g</TableCell>
                      <TableCell>{item.inventory_status || item.status}</TableCell>
                      <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {`${selectedItem.metal_weight}g ${selectedItem.metal_purity} ${selectedItem.metal_type}`}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}> {selectedItem.metal_category}
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'success.main', mb: 0.5 }}>
                    ${formatPrice(selectedItem.retail_price)}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: selectedItem.inventory_status === 'HOLD' ? 'success.main' : 'error.main',
                      fontWeight: 'medium'
                    }}
                  >
                    {selectedItem.inventory_status || 'HOLD'}
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
                    <Typography variant="caption" color="textSecondary">Weight</Typography>
                    <Typography variant="body2">{selectedItem.metal_weight}g</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Dimensions</Typography>
                    <Typography variant="body2">{selectedItem.dimensions || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Certification</Typography>
                    <Typography variant="body2">{selectedItem.certification || 'N/A'}</Typography>
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
