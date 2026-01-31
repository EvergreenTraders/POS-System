import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Alert,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import {
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import config from '../config';
import axios from 'axios';
import { injectPDFScript } from '../utils/printUtils';
import AuthorizationFormDialog from './AuthorizationFormDialog';

const API_BASE_URL = config.apiUrl;

const LinkedAccountsManager = ({ customerId, customerName, open, onClose }) => {
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  const [openAuthorizationDialog, setOpenAuthorizationDialog] = useState(false);
  const [allCustomers, setAllCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [linkType, setLinkType] = useState('full_access');
  const [notes, setNotes] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  useEffect(() => {
    if (open && customerId) {
      fetchLinkedAccounts();
    }
  }, [open, customerId]);

  const fetchLinkedAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/customers/${customerId}/linked-accounts`);
      setLinkedAccounts(response.data);
    } catch (err) {
      console.error('Error fetching linked accounts:', err);
      setError('Failed to load linked accounts');
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    setLoadingCustomers(true);
    try {
      // Use search endpoint with query parameters
      const response = await axios.get(`${API_BASE_URL}/customers/search`, {
        params: {
          first_name: searchTerm,
          last_name: searchTerm,
          phone: searchTerm,
          email: searchTerm
        }
      });

      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }

      // Filter out the current customer
      const filtered = response.data.filter(c => c.id !== parseInt(customerId));
      return filtered;
    } catch (err) {
      console.error('Error searching customers:', err);
      return [];
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleOpenLinkDialog = () => {
    setSelectedCustomer(null);
    setLinkType('full_access');
    setNotes('');
    setAllCustomers([]);
    setOpenLinkDialog(true);
  };

  const handleCloseLinkDialog = () => {
    setOpenLinkDialog(false);
    setSelectedCustomer(null);
    setLinkType('full_access');
    setNotes('');
    setError(null);
  };

  const handleProceedToAuthorization = () => {
    if (!selectedCustomer) {
      setError('Please select a customer to link');
      return;
    }
    // Open authorization dialog
    setOpenAuthorizationDialog(true);
  };

  const handlePrintAuthorizationForm = async () => {
    if (!selectedCustomer) {
      setError('Please select a customer to link');
      return;
    }

    // Fetch business info for logo, name, and address
    let businessName = 'Business Name';
    let businessAddress = '';
    let logoUrl = '';

    try {
      const response = await axios.get(`${API_BASE_URL}/business-info`);
      if (response.data) {
        businessName = response.data.business_name || 'Business Name';
        businessAddress = response.data.address || '';
        if (response.data.logo) {
          logoUrl = `data:${response.data.logo_mimetype};base64,${response.data.logo}`;
        }
      }
    } catch (error) {
      console.error('Error fetching business info:', error);
    }

    // Fetch primary customer details for email and phone
    let primaryCustomerEmail = '';
    let primaryCustomerPhone = '';

    try {
      const customerResponse = await axios.get(`${API_BASE_URL}/customers/${customerId}`);
      if (customerResponse.data) {
        primaryCustomerEmail = customerResponse.data.email || '';
        primaryCustomerPhone = customerResponse.data.phone || '';
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }

    // Create the printable form HTML
    const printWindow = window.open('', '_blank');
    const formHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Account Linking Authorization Form</title>
        <style>
          @page {
            size: A4;
            margin: 0.5in;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none; }
            @page {
              margin-top: 0.5in;
              margin-bottom: 0.5in;
            }
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.3;
            padding: 15px;
            max-width: 8.5in;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #333;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .logo-container {
            max-width: 120px;
          }
          .logo {
            max-width: 100%;
            max-height: 60px;
          }
          .business-info {
            text-align: center;
            flex: 1;
          }
          .business-name {
            font-size: 18px;
            font-weight: bold;
            margin: 0 0 3px 0;
          }
          .business-address {
            font-size: 9px;
            color: #666;
            margin: 0;
          }
          h1 {
            text-align: center;
            color: #333;
            font-size: 16px;
            margin: 10px 0;
            text-transform: uppercase;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .section {
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 4px;
          }
          .section-title {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 8px;
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 4px;
          }
          .field {
            margin: 5px 0;
            display: flex;
          }
          .label {
            font-weight: bold;
            min-width: 90px;
            font-size: 10px;
          }
          .value {
            border-bottom: 1px dotted #666;
            flex: 1;
            padding: 2px 5px;
            font-size: 10px;
          }
          .auth-section {
            margin: 15px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          .auth-text {
            font-size: 10px;
            line-height: 1.4;
            margin: 8px 0;
            text-align: justify;
          }
          .permissions-list {
            font-size: 10px;
            margin: 5px 0 5px 15px;
            padding: 0;
          }
          .permissions-list li {
            margin: 3px 0;
          }
          .signature-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
          }
          .signature-box {
            border: 1px solid #333;
            padding: 8px;
            min-height: 70px;
          }
          .sig-label {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 40px;
          }
          .signature-line {
            border-top: 1px solid #333;
            margin-top: 35px;
            padding-top: 3px;
            text-align: center;
            font-size: 9px;
          }
          .button-container {
            margin: 15px 0;
            text-align: center;
          }
          button {
            background-color: #1976d2;
            color: white;
            border: none;
            padding: 8px 16px;
            font-size: 13px;
            cursor: pointer;
            border-radius: 4px;
            margin: 0 8px;
          }
          button:hover {
            background-color: #1565c0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoUrl ? `<div class="logo-container"><img src="${logoUrl}" alt="Logo" class="logo" /></div>` : '<div class="logo-container"></div>'}
          <div class="business-info">
            <h2 class="business-name">${businessName}</h2>
            ${businessAddress ? `<p class="business-address">${businessAddress}</p>` : ''}
          </div>
          <div class="logo-container"></div>
        </div>

        <h1>Account Linking Authorization Form</h1>

        <div class="info-grid">
          <div class="section">
            <div class="section-title">Primary Account Holder</div>
            <div class="field">
              <span class="label">Name:</span>
              <span class="value">${customerName || ''}</span>
            </div>
            <div class="field">
              <span class="label">Phone:</span>
              <span class="value">${primaryCustomerPhone || ''}</span>
            </div>
            <div class="field">
              <span class="label">Email:</span>
              <span class="value">${primaryCustomerEmail || ''}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Linked Account</div>
            <div class="field">
              <span class="label">Name:</span>
              <span class="value">${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}</span>
            </div>
            <div class="field">
              <span class="label">Phone:</span>
              <span class="value">${selectedCustomer.phone || ''}</span>
            </div>
            <div class="field">
              <span class="label">Email:</span>
              <span class="value">${selectedCustomer.email || ''}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Authorization Details</div>
          <div class="field">
            <span class="label">Link Type:</span>
            <span class="value">${linkType === 'full_access' ? 'Full Access' : linkType === 'view_only' ? 'View Only' : 'Payment Only'}</span>
          </div>
          <div class="field">
            <span class="label">Date:</span>
            <span class="value">${new Date().toLocaleDateString()}</span>
          </div>
          ${notes ? `<div class="field"><span class="label">Notes:</span><span class="value">${notes}</span></div>` : ''}
        </div>

        <div class="auth-section">
          <p class="auth-text">I, <strong>${customerName || ''}</strong>, hereby authorize the linking of my account with the account of <strong>${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}</strong> with <strong>${linkType === 'full_access' ? 'Full Access' : linkType === 'view_only' ? 'View Only' : 'Payment Only'}</strong> permissions.</p>

          <p class="auth-text">The linked account holder is authorized to:</p>
          <ul class="permissions-list">
            ${linkType === 'full_access' ? `
              <li>View all account information and transaction history</li>
              <li>Make payments and conduct transactions on my behalf</li>
              <li>Update account information</li>
            ` : linkType === 'view_only' ? `
              <li>View account information and transaction history only</li>
              <li>No transaction, payment, or modification capabilities</li>
            ` : `
              <li>Make payments on my behalf</li>
              <li>Limited access to account information</li>
            `}
          </ul>

          <p class="auth-text">I understand that I am responsible for all actions taken by the linked account holder and may revoke this authorization at any time.</p>
        </div>

        <div class="signature-row">
          <div class="signature-box">
            <div class="sig-label">Primary Account Holder Signature</div>
            <div class="signature-line">${customerName || ''}</div>
          </div>
          <div class="signature-box">
            <div class="sig-label">Date</div>
            <div class="signature-line"></div>
          </div>
        </div>

        <div class="button-container no-print">
          <button onclick="window.print()">Print / Save as PDF</button>
          <button onclick="window.close()">Close</button>
        </div>

        <script>
          // Automatically focus the window for better print experience
          window.onload = function() {
            window.focus();
          };
        </script>
      </body>
      </html>
    `;

    // Open with PDF support for testing
    const pdfReadyHTML = injectPDFScript(formHTML, `authorization_form_${customerId}_${selectedCustomer.id}`);
    printWindow.document.write(pdfReadyHTML);
    printWindow.document.close();
  };

  const handleAuthorizationComplete = async (authorizationData) => {
    setLoading(true);
    setError(null);
    try {
      // Create the account link
      const linkResponse = await axios.post(`${API_BASE_URL}/customers/${customerId}/link-account`, {
        linked_customer_id: selectedCustomer.id,
        link_type: linkType,
        notes: notes
      });

      const linkId = linkResponse.data.id;

      // Save the authorization
      await axios.post(`${API_BASE_URL}/linked-account-authorization`, {
        link_id: linkId,
        customer_id: selectedCustomer.id,
        authorized_by_name: authorizationData.authorized_by_name,
        signature_data: authorizationData.signature_data,
        ip_address: null, // You can add IP tracking if needed
        user_agent: navigator.userAgent
      });

      await fetchLinkedAccounts();
      setOpenAuthorizationDialog(false);
      handleCloseLinkDialog();
    } catch (err) {
      console.error('Error creating link:', err);
      setError(err.response?.data?.error || 'Failed to create account link');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async (linkId) => {
    if (!window.confirm('Are you sure you want to unlink this account?')) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/customers/account-links/${linkId}`);
      await fetchLinkedAccounts();
    } catch (err) {
      console.error('Error deleting link:', err);
      setError('Failed to unlink account');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (link) => {
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/customers/account-links/${link.id}`, {
        is_active: !link.is_active
      });
      await fetchLinkedAccounts();
    } catch (err) {
      console.error('Error toggling link:', err);
      setError('Failed to update account link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Linked Accounts for {customerName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Link other customer accounts to allow this customer to access their transactions.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenLinkDialog}
                disabled={loading}
              >
                Link Account
              </Button>
            </Box>

            {loading && !linkedAccounts.length ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : linkedAccounts.length === 0 ? (
              <Alert severity="info">
                No linked accounts. Click "Link Account" to add one.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Link Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {linkedAccounts.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell>{link.linked_customer_name}</TableCell>
                        <TableCell>{link.linked_customer_email || 'N/A'}</TableCell>
                        <TableCell>{link.linked_customer_phone || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip
                            label={link.link_type}
                            size="small"
                            color={link.link_type === 'full_access' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={link.is_active ? 'Active' : 'Inactive'}
                            size="small"
                            color={link.is_active ? 'success' : 'default'}
                            onClick={() => handleToggleActive(link)}
                            sx={{ cursor: 'pointer' }}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(link.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteLink(link.id)}
                            disabled={loading}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {linkedAccounts.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Total linked accounts: {linkedAccounts.length}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Link Account Dialog */}
      <Dialog open={openLinkDialog} onClose={handleCloseLinkDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Link Customer Account</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Type at least 2 characters to search for customers
            </Typography>

            <Autocomplete
              fullWidth
              options={allCustomers}
              getOptionLabel={(option) => {
                if (!option) return '';
                return `${option.first_name} ${option.last_name} - ${option.email || option.phone || 'No contact'}`;
              }}
              value={selectedCustomer}
              onChange={(event, newValue) => {
                setSelectedCustomer(newValue);
              }}
              onInputChange={async (event, value, reason) => {
                if (reason === 'input' && value && value.length >= 2) {
                  const results = await searchCustomers(value);
                  setAllCustomers(results);
                } else if (reason === 'clear' || !value) {
                  setAllCustomers([]);
                }
              }}
              loading={loadingCustomers}
              filterOptions={(x) => x}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Customer to Link"
                  required
                  placeholder="Type name, email or phone (min 2 chars)"
                  helperText="Start typing to search - results will appear as you type"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingCustomers ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              noOptionsText={loadingCustomers ? "Searching..." : "Type to search for customers (min 2 characters)"}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Link Type</InputLabel>
              <Select
                value={linkType}
                label="Link Type"
                onChange={(e) => setLinkType(e.target.value)}
              >
                <MenuItem value="full_access">Full Access</MenuItem>
                <MenuItem value="view_only">View Only</MenuItem>
                <MenuItem value="limited">Limited</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this account link..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrintAuthorizationForm}
            disabled={loading || !selectedCustomer}
          >
            Print Authorization Form
          </Button>
          <Button
            variant="contained"
            onClick={handleProceedToAuthorization}
            disabled={loading || !selectedCustomer}
          >
            {loading ? <CircularProgress size={20} /> : 'Proceed to Authorization'}
          </Button>
           <Button onClick={handleCloseLinkDialog} disabled={loading}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Authorization Dialog */}
      <AuthorizationFormDialog
        open={openAuthorizationDialog}
        onClose={() => setOpenAuthorizationDialog(false)}
        onAuthorized={handleAuthorizationComplete}
        primaryCustomerName={customerName}
        linkedCustomer={selectedCustomer}
        linkType={linkType}
      />
    </>
  );
};

export default LinkedAccountsManager;
