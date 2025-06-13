import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Grid, FormControl, InputLabel, Select, MenuItem,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Accordion, AccordionSummary, AccordionDetails, Chip, CircularProgress,
  IconButton, Tooltip, Checkbox, FormControlLabel, FormGroup, Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Clear as ClearIcon,
  DateRange as DateRangeIcon,
  PictureAsPdf as PdfIcon,
  TableChart as TableChartIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import axios from 'axios';

const API_BASE_URL = config.apiUrl;

const CustomerReporting = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportFilters, setReportFilters] = useState({
    status: '',
    risk_level: '',
    date_created_from: '',
    date_created_to: '',
    id_type: '',
    has_purchases: false,
    has_pawns: false,
    last_transaction_days: ''
  });
  // Initialize reportColumns as empty object, will be populated from API
  const [reportColumns, setReportColumns] = useState({});
  
  // State to track header preferences from API
  const [headerPreferences, setHeaderPreferences] = useState({});
  const [reportFormat, setReportFormat] = useState('screen');
  const [reportTitle, setReportTitle] = useState('Customer Report');
  const [reportError, setReportError] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Call fetchCustomerHeaderPreferences when the component mounts
  useEffect(() => {
    fetchCustomerHeaderPreferences();
  }, []);

  // Group column selections for better organization in the UI
  const [columnGroups, setColumnGroups] = useState({
    'Basic Info': [],
    'Transactions': ['last_transaction_date', 'total_purchase_amount', 'total_pawn_amount'],
    'Address': [],
    'Identification': []
  });

  // Format column names for display
  const formatColumnName = (column) => {
    return column
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Dialog-related handlers removed as component is now directly embedded

  const handleReportFilterChange = (e) => {
    const { name, value } = e.target;
    setReportFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setReportFilters(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleReportColumnChange = (e) => {
    const { name, checked } = e.target;
    // Update the report columns state directly with the checkbox value
    setReportColumns(prev => ({
      ...prev,
      [name]: checked
    }));
    
    // Also update in header preferences with the show_ prefix
    const prefKey = name.startsWith('show_') ? name : `show_${name}`;
    setHeaderPreferences(prev => ({
      ...prev,
      [prefKey]: checked
    }));
  };


  // Fetch customer header preferences from API
  const fetchCustomerHeaderPreferences = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/customer-preferences/config`);
      const preferences = response.data || {};
      
      // Store the header preferences
      setHeaderPreferences(preferences);
      
      // Initialize a new reportColumns object based on API data
      const newReportColumns = {};
      
      // Extract all fields that start with 'show_' from the preferences
      Object.entries(preferences).forEach(([key, value]) => {
        if (key.startsWith('show_')) {
          const columnName = key.replace('show_', '');
          // Add to report columns with the boolean value from API
          newReportColumns[columnName] = value;
        }
      });
      
      // Make sure we have some default transaction fields even if not in API
      const defaultFields = ['last_transaction_date', 'total_purchase_amount', 'total_pawn_amount'];
      defaultFields.forEach(field => {
        if (!(field in newReportColumns)) {
          newReportColumns[field] = false;
        }
      });
      
      // Set the report columns from the API
      setReportColumns(newReportColumns);
      
      // Organize columns into appropriate groups based on field type
      const basicInfoFields = [];
      const addressFields = [];
      const identificationFields = [];
      const transactionFields = ['last_transaction_date', 'total_purchase_amount', 'total_pawn_amount'];
      
      Object.keys(newReportColumns).forEach(column => {
        if (['id', 'image', 'first_name', 'last_name', 'email', 'phone', 'status', 'notes','risk_level', 'created_at'].includes(column)) {
          basicInfoFields.push(column);
        } else if (['address_line1', 'address_line2','city', 'state', 'postal_code', 'country'].includes(column)) {
          addressFields.push(column);
        } else if (column.includes('id_') || column.includes('identification')) {
          identificationFields.push(column);
        }
      });
      
      // Update column groups with the organized fields
      setColumnGroups({
        'Basic Info': basicInfoFields,
        'Transactions': transactionFields,
        'Address': addressFields,
        'Identification': identificationFields
      });
   
      
    } catch (error) {
      console.error('Error fetching customer header preferences:', error);
    }
  };

  const handleReportFormatChange = (e) => {
    setReportFormat(e.target.value);
  };

  const clearReportFilters = () => {
    setReportFilters({
      status: '',
      risk_level: '',
      date_created_from: '',
      date_created_to: '',
      id_type: '',
      has_purchases: false,
      has_pawns: false,
      last_transaction_days: ''
    });
  };

  const generateReport = async () => {
    setReportLoading(true);
    setReportError(null);
    
    try {
      // Build query parameters for report
      const params = new URLSearchParams();
      
      // Add filter parameters - keeping this intact as requested
      Object.entries(reportFilters).forEach(([key, value]) => {
        if (value !== '' && value !== false) {
          params.append(key, value);
        }
      });
      
      // Extract selected columns based on reportColumns state
      const selectedColumns = Object.entries(reportColumns)
        .filter(([_, isSelected]) => isSelected)
        .map(([column]) => column);
      
      if (selectedColumns.length === 0) {
        setReportError('Please select at least one column for the report.');
        setReportLoading(false);
        return;
      }
      
      console.log('Selected columns for report:', selectedColumns, reportColumns);
      
      // Add selected columns to params
      params.append('columns', selectedColumns.join(','));
      
      // Add report format
      params.append('format', reportFormat);
      
      // Add report title
      params.append('title', reportTitle);
      
      // Generate appropriate endpoint URL based on the report format
      const endpoint = reportFormat === 'screen' ? 
        `${API_BASE_URL}/customers` : 
        `${API_BASE_URL}/reports/customers/export`;
      
      const response = await axios({
        method: 'get',
        url: `${endpoint}?${params.toString()}`,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        responseType: reportFormat === 'pdf' || reportFormat === 'excel' ? 'blob' : 'json',
      });
      
      if (reportFormat === 'pdf' || reportFormat === 'excel') {
        // For file downloads
        const contentType = reportFormat === 'pdf' 
          ? 'application/pdf' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          
        const fileExtension = reportFormat === 'pdf' ? '.pdf' : '.xlsx';
        const filename = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}${fileExtension}`;
        
        const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        // For screen display - filter the data to only show selected columns
        const filteredResponseData = response.data.map(customer => {
          const filteredCustomer = {};
          selectedColumns.forEach(column => {
            filteredCustomer[column] = customer[column];
          });
          return filteredCustomer;
        });
        
        setReportData(filteredResponseData);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setReportError('Failed to generate report. Please try again.');
    } finally {
      setReportLoading(false);
    }
  };

  const exportTableToCsv = () => {
    if (reportData.length === 0) return;
    
    // Get visible columns
    const visibleColumns = Object.keys(reportColumns).filter(col => reportColumns[col]);
    
    // Create header row
    const headerRow = visibleColumns.map(formatColumnName).join(',');
    
    // Create data rows
    const dataRows = reportData.map(item => {
      return visibleColumns.map(col => {
        // Ensure value is handled properly for CSV export (quoted if contains commas)
        const value = item[col] !== null && item[col] !== undefined ? item[col] : '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    }).join('\n');
    
    // Combine into CSV content
    const csvContent = `${headerRow}\n${dataRows}`;
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Box sx={{ p: 2 }}>
          <Grid container spacing={3}>
            {/* Left column - Report Configuration */}
            <Grid item xs={12} md={4}>
              <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Report Title</Typography>
                <TextField
                  fullWidth
                  name="reportTitle"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="subtitle1" gutterBottom>Report Format</Typography>
                <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                  <Select
                    value={reportFormat}
                    onChange={handleReportFormatChange}
                  >
                    <MenuItem value="screen">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TableChartIcon sx={{ mr: 1 }} />
                        Screen View
                      </Box>
                    </MenuItem>
                    <MenuItem value="pdf">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PdfIcon sx={{ mr: 1 }} />
                        PDF Download
                      </Box>
                    </MenuItem>
                    <MenuItem value="excel">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TableChartIcon sx={{ mr: 1 }} />
                        Excel Download
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
                
                <Divider sx={{ my: 2 }} />
                
                {/* Report Filters */}
                <Typography variant="subtitle1" gutterBottom>
                  Report Filters
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }} size="small">
                  <InputLabel>Customer Status</InputLabel>
                  <Select
                    name="status"
                    value={reportFilters.status}
                    onChange={handleReportFilterChange}
                    label="Customer Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="blocked">Blocked</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth sx={{ mb: 2 }} size="small">
                  <InputLabel>Risk Level</InputLabel>
                  <Select
                    name="risk_level"
                    value={reportFilters.risk_level}
                    onChange={handleReportFilterChange}
                    label="Risk Level"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
                
                <FormGroup sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={reportFilters.has_purchases}
                        onChange={handleCheckboxChange}
                        name="has_purchases"
                      />
                    }
                    label="Has Purchases"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={reportFilters.has_pawns}
                        onChange={handleCheckboxChange}
                        name="has_pawns"
                      />
                    }
                    label="Has Pawns"
                  />
                </FormGroup>
                
                <TextField
                  name="last_transaction_days"
                  label="Last Transaction Within Days"
                  type="number"
                  value={reportFilters.last_transaction_days}
                  onChange={handleReportFilterChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  sx={{ mb: 2 }}
                />
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      name="date_created_from"
                      label="Created From"
                      type="date"
                      value={reportFilters.date_created_from}
                      onChange={handleReportFilterChange}
                      fullWidth
                      variant="outlined"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      name="date_created_to"
                      label="Created To"
                      type="date"
                      value={reportFilters.date_created_to}
                      onChange={handleReportFilterChange}
                      fullWidth
                      variant="outlined"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<ClearIcon />}
                    onClick={clearReportFilters}
                  >
                    Clear Filters
                  </Button>
                  
                  <Button
                    variant="contained"
                    startIcon={<AssessmentIcon />}
                    onClick={generateReport}
                    disabled={reportLoading}
                  >
                    {reportLoading ? <CircularProgress size={24} /> : 'Generate Report'}
                  </Button>
                </Box>
              </Paper>
            </Grid>
            
            {/* Right column - Column Selection and Report Results */}
            <Grid item xs={12} md={8}>
              {/* Column Selection */}
              <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Report Columns</Typography>
                
                {Object.entries(columnGroups).map(([groupName, columns]) => (
                  <Box key={groupName} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {groupName}
                    </Typography>
                    <Grid container>
                      {columns.map(column => {
                        // Check directly in reportColumns first, then fall back to headerPreferences
                        const isChecked = column in reportColumns
                          ? reportColumns[column]
                          : headerPreferences[`show_${column}`] || false;
                        
                        return (
                          <Grid item xs={6} sm={4} key={column}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={isChecked}
                                  onChange={handleReportColumnChange}
                                  name={column}
                                  size="small"
                                />
                              }
                              label={formatColumnName(column)}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                    <Divider sx={{ mt: 1 }} />
                  </Box>
                ))}
              </Paper>
              
              {/* Report Results */}
              {reportFormat === 'screen' && reportData.length > 0 && (
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                    <Typography variant="h6">{reportTitle}</Typography>
                    <Tooltip title="Export to CSV">
                      <IconButton onClick={exportTableToCsv}>
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          {Object.entries(reportColumns)
                            .filter(([_, isVisible]) => isVisible)
                            .map(([column]) => (
                              <TableCell key={column}>
                                {formatColumnName(column)}
                              </TableCell>
                            ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.map((row, index) => (
                          <TableRow key={index}>
                            {Object.entries(reportColumns)
                              .filter(([_, isVisible]) => isVisible)
                              .map(([column]) => (
                                <TableCell key={column}>
                                  {column === 'status' ? (
                                    <Chip
                                      label={row[column]}
                                      color={row[column] === 'active' ? 'success' : 'default'}
                                      size="small"
                                    />
                                  ) : column === 'risk_level' ? (
                                    <Chip
                                      label={row[column]}
                                      color={
                                        row[column] === 'high' ? 'error' :
                                        row[column] === 'normal' ? 'primary' : 'success'
                                      }
                                      size="small"
                                    />
                                  ) : column.includes('amount') ? (
                                    row[column] !== undefined && row[column] !== null
                                      ? `$${parseFloat(row[column]).toFixed(2)}`
                                      : '-'
                                  ) : (
                                    row[column] !== undefined && row[column] !== null 
                                      ? (typeof row[column] === 'object' 
                                          ? JSON.stringify(row[column])
                                          : row[column])
                                      : '-'
                                  )}
                                </TableCell>
                              ))}
                          </TableRow>
                        ))}
                        {reportData.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={Object.values(reportColumns).filter(Boolean).length} align="center">
                              No data found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Total Records: {reportData.length}
                  </Typography>
                </Paper>
              )}
              
              {reportError && (
                <Paper elevation={1} sx={{ p: 2, bgcolor: '#fdeded' }}>
                  <Typography color="error">{reportError}</Typography>
                </Paper>
              )}
              
              {reportFormat === 'screen' && reportData.length === 0 && !reportLoading && !reportError && (
                <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
                  <AssessmentIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Configure your report and click "Generate Report"
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    The report results will appear here
                  </Typography>
                </Paper>
              )}
            </Grid>
          </Grid>
    </Box>
  );
};

export default CustomerReporting;
