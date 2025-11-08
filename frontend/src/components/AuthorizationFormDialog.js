import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  Paper,
  Alert
} from '@mui/material';
import SignatureCanvas from 'react-signature-canvas';
import config from '../config';
import axios from 'axios';

const API_BASE_URL = config.apiUrl;

const AuthorizationFormDialog = ({ open, onClose, onAuthorized, primaryCustomerName, linkedCustomer }) => {
  const [template, setTemplate] = useState(null);
  const [authorizedByName, setAuthorizedByName] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const signatureRef = useRef(null);

  useEffect(() => {
    if (open) {
      fetchTemplate();
      if (linkedCustomer) {
        setAuthorizedByName(`${linkedCustomer.first_name} ${linkedCustomer.last_name}`);
      }
    }
  }, [open, linkedCustomer]);

  const fetchTemplate = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/linked-account-authorization-template`);
      setTemplate(response.data);
    } catch (err) {
      console.error('Error fetching authorization template:', err);
      setError('Failed to load authorization form');
    }
  };

  const handleClearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const handleSubmit = async () => {
    if (!authorizedByName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!consentChecked) {
      setError('Please check the consent box to proceed');
      return;
    }

    if (signatureRef.current && signatureRef.current.isEmpty()) {
      setError('Please provide your signature');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const signatureData = signatureRef.current ? signatureRef.current.toDataURL() : null;

      // Return authorization data to parent component
      onAuthorized({
        authorized_by_name: authorizedByName,
        signature_data: signatureData,
        consent_given: consentChecked
      });

      handleClose();
    } catch (err) {
      console.error('Error submitting authorization:', err);
      setError('Failed to submit authorization');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAuthorizedByName('');
    setConsentChecked(false);
    setError(null);
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
    onClose();
  };

  const replaceTemplatePlaceholders = (text) => {
    if (!text) return '';
    return text
      .replace(/\{\{CUSTOMER_NAME\}\}/g, linkedCustomer ? `${linkedCustomer.first_name} ${linkedCustomer.last_name}` : '[Customer Name]')
      .replace(/\{\{PRIMARY_CUSTOMER_NAME\}\}/g, primaryCustomerName || '[Primary Customer]');
  };

  if (!template) {
    return null;
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {template.form_title}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f9f9f9' }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
              {replaceTemplatePlaceholders(template.form_content)}
            </Typography>
          </Paper>

          <TextField
            fullWidth
            label="Your Full Name"
            value={authorizedByName}
            onChange={(e) => setAuthorizedByName(e.target.value)}
            required
            margin="normal"
            helperText="Enter your legal name as it appears on your ID"
          />

          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Signature *
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 1,
                backgroundColor: '#fff',
                border: '2px solid #ddd',
                borderRadius: 1
              }}
            >
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  width: 500,
                  height: 200,
                  className: 'signature-canvas',
                  style: { width: '100%', height: '200px' }
                }}
              />
            </Paper>
            <Button
              size="small"
              onClick={handleClearSignature}
              sx={{ mt: 1 }}
            >
              Clear Signature
            </Button>
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                required
              />
            }
            label={replaceTemplatePlaceholders(template.consent_text)}
          />

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
            By signing this form, you authorize the account link and agree to share your account information.
            This authorization is recorded with a timestamp and IP address for security purposes.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || !authorizedByName || !consentChecked}
        >
          {loading ? 'Submitting...' : 'Authorize and Link Account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuthorizationFormDialog;
