import React from 'react';
import {
  Box, Typography, Paper, Grid, Container, Card, CardContent, 
  CardMedia, Divider, Chip, Button
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

// Helper function to convert buffer to data URL for image preview
function bufferToDataUrl(bufferObj) {
  if (!bufferObj || !bufferObj.data) return null;
  const base64 = btoa(
    new Uint8Array(bufferObj.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return `data:image/jpeg;base64,${base64}`;
}

const CustomerTicket = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const customer = location.state?.customer;

  if (!customer) {
    return (
      <Container maxWidth="md" sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" color="error">Customer information not available</Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/')} 
            sx={{ mt: 2 }}
          >
            Return to Home
          </Button>
        </Paper>
      </Container>
    );
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  // Determine image source
  const getImageSource = () => {
    if (!customer.image) return '/placeholder-profile.png';
    
    if (customer.image instanceof File || customer.image instanceof Blob) {
      return URL.createObjectURL(customer.image);
    } else if (typeof customer.image === 'string') {
      return customer.image;
    } else if (customer.image && customer.image.data) {
      return bufferToDataUrl(customer.image);
    }
    return '/placeholder-profile.png';
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Customer Details</Typography>
          <Box>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/')}
              size="small"
              sx={{ mr: 1 }}
            >
              Back
            </Button>
            <Button 
              variant="contained" 
              onClick={() => navigate('/quote-manager', { state: { customer } })}
              size="small"
            >
              Create Quote
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {/* Customer image and basic info */}
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 2 }}>
              <CardMedia
                component="img"
                height="200"
                image={getImageSource()}
                alt={`${customer.first_name} ${customer.last_name}`}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {`${customer.first_name} ${customer.last_name}`}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Customer ID: {customer.id}
                </Typography>
                <Chip 
                  label={customer.status ? customer.status.toUpperCase() : 'ACTIVE'} 
                  color={customer.status === 'inactive' ? 'error' : 'success'} 
                  size="small" 
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Created:</strong> {formatDate(customer.created_at)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Customer details */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Contact Information</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Email:</strong> {customer.email || 'Not provided'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Phone:</strong> {customer.phone || 'Not provided'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="body2">
                      <strong>Address:</strong> {customer.address_line1 ? 
                        `${customer.address_line1}${customer.address_line2 ? ', ' + customer.address_line2 : ''}, 
                        ${customer.city || ''} ${customer.state || ''} ${customer.postal_code || ''}, 
                        ${customer.country || ''}`.replace(/\s+/g, ' ').trim() 
                        : 
                        'Not provided'
                      }
                    </Typography>
                  </Grid>
                </Grid>

                {customer.id_type && (
                  <>
                    <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>ID Information</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2">
                          <strong>ID Type:</strong> {customer.id_type || 'Not provided'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2">
                          <strong>ID Number:</strong> {customer.id_number || 'Not provided'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2">
                          <strong>ID Expiry:</strong> {formatDate(customer.id_expiry_date)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2">
                          <strong>Issuing Authority:</strong> {customer.id_issuing_authority || 'Not provided'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </>
                )}

                {(customer.height || customer.weight || customer.notes) && (
                  <>
                    <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Additional Information</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      {customer.height && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2">
                            <strong>Height:</strong> {customer.height} cm
                          </Typography>
                        </Grid>
                      )}
                      {customer.weight && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2">
                            <strong>Weight:</strong> {customer.weight} kg
                          </Typography>
                        </Grid>
                      )}
                      {customer.notes && (
                        <Grid item xs={12}>
                          <Typography variant="body2">
                            <strong>Notes:</strong> {customer.notes}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default CustomerTicket;