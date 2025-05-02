import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Grid, Paper, TextField, Button, FormControl,
  InputLabel, Select, MenuItem, CircularProgress, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Container
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import config from '../config';

// Converts a Buffer-like object (from backend) to a base64 data URL for image preview
function bufferToDataUrl(bufferObj) {
  if (!bufferObj || !bufferObj.data) return null;
  const base64 = btoa(
    new Uint8Array(bufferObj.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return `data:image/jpeg;base64,${base64}`;
}

const CustomerEditor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  
  // States for the component
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [showCamera, setShowCamera] = useState(false);
  const [currentCaptureMode, setCurrentCaptureMode] = useState('customer'); // 'customer', 'id_front', or 'id_back'
  
  // Refs for camera functionality
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  // Get customer data from location state if available
  useEffect(() => {
    if (location.state?.customer) {
      setFormData(location.state.customer);
    }
  }, [location]);
  
  // Helper function to convert dataURL to File object
  const urlToFile = async (url, filename = 'customer-photo.jpg') => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const mime = blob.type || 'image/jpeg';
      return new File([blob], filename, { type: mime });
    } catch (e) { 
      console.error('Error converting URL to file:', e);
      return null; 
    }
  };

  // Camera functions
  useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
    // eslint-disable-next-line
  }, [showCamera]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Unable to access camera.');
      setShowCamera(false);
    }
  };
  
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };
  
  const captureImage = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Create a canvas element to capture the image
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert the canvas to a data URL
    const dataUrl = canvas.toDataURL('image/jpeg');
    
    // Convert data URL to File object for easier handling
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `${currentCaptureMode}_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        // Set the appropriate image based on the capture mode
        if (currentCaptureMode === 'customer') {
          setFormData(prev => ({ ...prev, image: file }));
        } else if (currentCaptureMode === 'id_front') {
          setFormData(prev => ({ ...prev, id_image_front: file }));
        } else if (currentCaptureMode === 'id_back') {
          setFormData(prev => ({ ...prev, id_image_back: file }));
        }
        
        setShowCamera(false);
      });
  };

  // Form handling functions
  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    
    try {
      // Create FormData object for multipart/form-data submission (for images)
      const submitData = new FormData();
      
      // Add all text fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === 'image' || key === 'id_image_front' || key === 'id_image_back') {
            // Skip image fields, we'll handle them separately
          } else {
            submitData.append(key, value);
          }
        }
      });
      
      // Add image files if they exist
      if (formData.image) {
        if (formData.image instanceof File) {
          submitData.append('image', formData.image);
        } else if (typeof formData.image === 'string' && formData.image.startsWith('data:')) {
          // Convert base64/dataURL to File
          const file = await fetch(formData.image)
            .then(res => res.blob())
            .then(blob => new File([blob], 'customer-image.jpg', { type: 'image/jpeg' }));
          submitData.append('image', file);
        }
      }
      
      if (formData.id_image_front) {
        if (formData.id_image_front instanceof File) {
          submitData.append('id_image_front', formData.id_image_front);
        } else if (typeof formData.id_image_front === 'string' && formData.id_image_front.startsWith('data:')) {
          const file = await fetch(formData.id_image_front)
            .then(res => res.blob())
            .then(blob => new File([blob], 'id-front.jpg', { type: 'image/jpeg' }));
          submitData.append('id_image_front', file);
        }
      }
      
      if (formData.id_image_back) {
        if (formData.id_image_back instanceof File) {
          submitData.append('id_image_back', formData.id_image_back);
        } else if (typeof formData.id_image_back === 'string' && formData.id_image_back.startsWith('data:')) {
          const file = await fetch(formData.id_image_back)
            .then(res => res.blob())
            .then(blob => new File([blob], 'id-back.jpg', { type: 'image/jpeg' }));
          submitData.append('id_image_back', file);
        }
      }
      
      const url = formData.id 
        ? `${config.apiUrl}/customers/${formData.id}` 
        : `${config.apiUrl}/customers`;
      
      const method = formData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          // Do not set Content-Type for FormData
        },
        body: submitData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Something went wrong');
      }
      
      const result = await response.json();
      showSnackbar(formData.id ? 'Customer updated successfully' : 'Customer created successfully', 'success');
      
      // Navigate back to the previous page or home
      if (location.state?.returnTo) {
        navigate(location.state.returnTo);
      } else {
        navigate('/');
      }
      
    } catch (error) {
      console.error('Error saving customer:', error);
      showSnackbar(error.message || 'Failed to save customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Navigate back to the previous page or home
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    } else {
      navigate('/');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          {formData.id ? 'Edit Customer' : 'Register New Customer'}
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            {/* Image Capture/Upload on the left */}
            <Grid item xs={12} sm={3} md={3} sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-start' }}>
              {formData.image ? (
                <Box sx={{ position: 'relative', width: '100%' }}>
                  <img
                    src={
                      formData.image instanceof File || formData.image instanceof Blob
                        ? URL.createObjectURL(formData.image)
                        : typeof formData.image === 'string'
                          ? formData.image
                          : undefined
                    }
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 180,
                      objectFit: 'cover',
                      width: '100%',
                      height: 180,
                      display: 'block',
                      borderRadius: 8,
                      border: '1px solid #e0e0e0',
                    }}
                  />
                  <Button
                    variant="text"
                    sx={{
                      position: 'absolute',
                      bottom: 14,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 2,
                      width: '70%',
                      minWidth: 140,
                      minHeight: 36,
                      padding: '5px 0',
                      background: 'rgba(255,255,255,0.80)',
                      color: '#222',
                      fontWeight: 600,
                      fontSize: 16,
                      lineHeight: 1.2,
                      textTransform: 'none',
                      border: '1.5px solid #e0e0e0',
                      borderRadius: 10,
                      boxShadow: '0 2px 12px 0 rgba(0,0,0,0.08)',
                      transition: 'background 0.2s, color 0.2s',
                      '&:hover': { background: 'rgba(255,255,255,0.95)', color: '#111' },
                      '&:active': { background: 'rgba(240,240,240,1)', color: '#1976d2' },
                    }}
                    onClick={() => {
                      setShowCamera(true);
                      setCurrentCaptureMode('customer');
                    }}
                  >
                    Retake Photo
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 1, mb: 1, minHeight: 180, fontSize: 20, py: 3, px: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textTransform: 'none', position: 'relative', overflow: 'hidden' }}
                  onClick={() => {
                    setShowCamera(true);
                    setCurrentCaptureMode('customer');
                  }}
                >
                  Capture Photo
                </Button>
              )}

              {/* ID Document Images */}
              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>ID Images</Typography>
              {formData.id_image_front ? (
                <Box sx={{ position: 'relative', width: '100%', mb: 2 }}>
                  <img
                    src={
                      formData.id_image_front instanceof File || formData.id_image_front instanceof Blob
                        ? URL.createObjectURL(formData.id_image_front)
                        : typeof formData.id_image_front === 'string'
                          ? formData.id_image_front
                          : undefined
                    }
                    alt="ID Front"
                    style={{
                      maxWidth: '100%',
                      height: 180,
                      objectFit: 'cover',
                      width: '100%',
                      display: 'block',
                      borderRadius: 8,
                      border: '1px solid #e0e0e0',
                    }}
                  />
                  <Button
                    variant="text"
                    sx={{
                      position: 'absolute',
                      bottom: 14,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 2,
                      width: '70%',
                      minWidth: 140,
                      minHeight: 36,
                      padding: '5px 0',
                      background: 'rgba(255,255,255,0.80)',
                      color: '#222',
                      fontWeight: 600,
                      fontSize: 16,
                      lineHeight: 1.2,
                      textTransform: 'none',
                      border: '1.5px solid #e0e0e0',
                      borderRadius: 10,
                      boxShadow: '0 2px 12px 0 rgba(0,0,0,0.08)',
                      transition: 'background 0.2s, color 0.2s',
                      '&:hover': { background: 'rgba(255,255,255,0.95)', color: '#111' },
                      '&:active': { background: 'rgba(240,240,240,1)', color: '#1976d2' },
                    }}
                    onClick={() => {
                      setShowCamera(true);
                      setCurrentCaptureMode('id_front');
                    }}
                  >
                    Retake Photo
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 1, mb: 2, minHeight: 180, fontSize: 20, py: 3, px: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textTransform: 'none', position: 'relative', overflow: 'hidden' }}
                  onClick={() => {
                    setShowCamera(true);
                    setCurrentCaptureMode('id_front');
                  }}
                >
                  Capture ID Front
                </Button>
              )}

              {formData.id_image_back ? (
                <Box sx={{ position: 'relative', width: '100%' }}>
                  <img
                    src={
                      formData.id_image_back instanceof File || formData.id_image_back instanceof Blob
                        ? URL.createObjectURL(formData.id_image_back)
                        : typeof formData.id_image_back === 'string'
                          ? formData.id_image_back
                          : undefined
                    }
                    alt="ID Back"
                    style={{
                      maxWidth: '100%',
                      height: 180,
                      objectFit: 'cover',
                      width: '100%',
                      display: 'block',
                      borderRadius: 8,
                      border: '1px solid #e0e0e0',
                    }}
                  />
                  <Button
                    variant="text"
                    sx={{
                      position: 'absolute',
                      bottom: 14,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 2,
                      width: '70%',
                      minWidth: 140,
                      minHeight: 36,
                      padding: '5px 0',
                      background: 'rgba(255,255,255,0.80)',
                      color: '#222',
                      fontWeight: 600,
                      fontSize: 16,
                      lineHeight: 1.2,
                      textTransform: 'none',
                      border: '1.5px solid #e0e0e0',
                      borderRadius: 10,
                      boxShadow: '0 2px 12px 0 rgba(0,0,0,0.08)',
                      transition: 'background 0.2s, color 0.2s',
                      '&:hover': { background: 'rgba(255,255,255,0.95)', color: '#111' },
                      '&:active': { background: 'rgba(240,240,240,1)', color: '#1976d2' },
                    }}
                    onClick={() => {
                      setShowCamera(true);
                      setCurrentCaptureMode('id_back');
                    }}
                  >
                    Retake Photo
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 1, minHeight: 180, fontSize: 20, py: 3, px: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textTransform: 'none', position: 'relative', overflow: 'hidden' }}
                  onClick={() => {
                    setShowCamera(true);
                    setCurrentCaptureMode('id_back');
                  }}
                >
                  Capture ID Back
                </Button>
              )}
            </Grid>

            {/* Main Fields on the right */}
            <Grid item xs={12} sm={9} md={9}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="first_name"
                    label="First Name"
                    value={formData.first_name || ''}
                    onChange={handleFormChange}
                    fullWidth
                    required
                    error={!formData.first_name}
                    helperText={!formData.first_name ? 'First name is required' : ''}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="last_name"
                    label="Last Name"
                    value={formData.last_name || ''}
                    onChange={handleFormChange}
                    fullWidth
                    required
                    error={!formData.last_name}
                    helperText={!formData.last_name ? 'Last name is required' : ''}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="email"
                    label="Email"
                    type="email"
                    value={formData.email || ''}
                    onChange={handleFormChange}
                    fullWidth
                    required={!formData.isGuest}
                    error={!formData.isGuest && !formData.email}
                    helperText={!formData.isGuest && !formData.email ? 'Email is required' : ''}
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="phone"
                    label="Phone Number"
                    value={formData.phone || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    name="date_of_birth"
                    label="Date of Birth"
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>Gender</InputLabel>
                    <Select
                      name="gender"
                      value={formData.gender || ''}
                      onChange={handleFormChange}
                      label="Gender"
                    >
                      <MenuItem value="">Not Specified</MenuItem>
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Address Fields */}
              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                Address Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    name="address_line1"
                    label="Address Line 1"
                    value={formData.address_line1 || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="address_line2"
                    label="Address Line 2"
                    value={formData.address_line2 || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="city"
                    label="City"
                    value={formData.city || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="state"
                    label="State/Province"
                    value={formData.state || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="postal_code"
                    label="Postal Code"
                    value={formData.postal_code || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="country"
                    label="Country"
                    value={formData.country || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
              </Grid>

              {/* ID Information */}
              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                ID Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="id_type"
                    label="ID Type"
                    value={formData.id_type || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="id_number"
                    label="ID Number"
                    value={formData.id_number || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="id_expiry_date"
                    label="ID Expiry Date"
                    type="date"
                    value={formData.id_expiry_date || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="status"
                      value={formData.status || 'active'}
                      onChange={handleFormChange}
                      label="Status"
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Additional Information */}
              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                Additional Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="height"
                    label="Height (cm)"
                    value={formData.height || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="weight"
                    label="Weight (kg)"
                    value={formData.weight || ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="notes"
                    label="Notes"
                    value={formData.notes || ''}
                    onChange={handleFormChange}
                    fullWidth
                    multiline
                    rows={4}
                    margin="dense"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={handleCancel}
              sx={{ minWidth: 100 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={loading || !formData.first_name || !formData.last_name || (!formData.isGuest && !formData.email)}
              sx={{ minWidth: 150 }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  <span>{formData.id ? 'Saving...' : 'Creating...'}</span>
                </Box>
              ) : (
                formData.id ? 'Save Changes' : 'Create Customer'
              )}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onClose={() => { stopCamera(); setShowCamera(false); }} maxWidth="xs" fullWidth>
        <DialogTitle>
          {currentCaptureMode === 'id_front' ? 'Capture ID Front' : 
           currentCaptureMode === 'id_back' ? 'Capture ID Back' : 
           'Capture Customer Photo'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: '100%', maxHeight: 240, background: '#222', borderRadius: 8 }}
            />
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
              onClick={captureImage}
            >
              Capture
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { stopCamera(); setShowCamera(false); }}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CustomerEditor;
