import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Box,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(4),
  borderRadius: theme.spacing(2),
  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
}));

const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const ImagePreview = styled('img')({
  width: '100%',
  maxHeight: '200px',
  objectFit: 'contain',
  marginTop: '10px',
  borderRadius: '8px',
  border: '2px solid #ddd',
});

const MetalTypeChip = styled(Chip)(({ selected, theme }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: selected ? theme.palette.primary.main : 'default',
  color: selected ? 'white' : 'inherit',
  '&:hover': {
    backgroundColor: selected ? theme.palette.primary.dark : 'default',
  },
}));

function CoinsBullions() {
  const [formData, setFormData] = useState({
    name: '',
    metalType: 'gold',
    purity: '',
    weight: '',
    mintMark: '',
    year: '',
    condition: 'uncirculated',
    certification: '',
    serialNumber: '',
    price: '',
    quantity: '',
    description: '',
    images: '',
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const metalTypes = ['gold', 'silver', 'platinum', 'palladium'];
  const conditions = ['uncirculated', 'proof', 'brilliant uncirculated', 'circulated'];
  const certificationBodies = ['PCGS', 'NGC', 'ANACS', 'ICG', 'None'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMetalTypeSelect = (metal) => {
    setFormData(prev => ({
      ...prev,
      metalType: metal
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5432/api/coins-bullions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: 'Item added successfully!',
          severity: 'success',
        });
        // Reset form
        setFormData({
          name: '',
          metalType: 'gold',
          purity: '',
          weight: '',
          mintMark: '',
          year: '',
          condition: 'uncirculated',
          certification: '',
          serialNumber: '',
          price: '',
          quantity: '',
          description: '',
          images: '',
        });
      } else {
        throw new Error('Failed to add item');
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error adding item: ' + error.message,
        severity: 'error',
      });
    }
  };

  return (
    <Container maxWidth="md">
      {/* <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom 
        sx={{ 
          mt: 4, 
          mb: 2, 
          fontWeight: 'bold', 
          color: '#1a472a',
          textAlign: 'center',
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        Coins & Bullions
      </Typography> */}
      
      <StyledPaper elevation={3}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormSection>
                <Typography variant="h6" gutterBottom color="primary">
                  Basic Information
                </Typography>
                <TextField
                  fullWidth
                  label="Product Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  margin="normal"
                />
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Metal Type
                  </Typography>
                  <Box>
                    {metalTypes.map((metal) => (
                      <MetalTypeChip
                        key={metal}
                        label={metal.charAt(0).toUpperCase() + metal.slice(1)}
                        onClick={() => handleMetalTypeSelect(metal)}
                        selected={formData.metalType === metal}
                      />
                    ))}
                  </Box>
                </Box>
              </FormSection>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormSection>
                <Typography variant="h6" gutterBottom color="primary">
                  Specifications
                </Typography>
                <TextField
                  fullWidth
                  label="Purity (e.g., .999)"
                  name="purity"
                  value={formData.purity}
                  onChange={handleChange}
                  required
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Weight (oz)"
                  name="weight"
                  type="number"
                  value={formData.weight}
                  onChange={handleChange}
                  required
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Mint Mark"
                  name="mintMark"
                  value={formData.mintMark}
                  onChange={handleChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Year"
                  name="year"
                  type="number"
                  value={formData.year}
                  onChange={handleChange}
                  margin="normal"
                />
              </FormSection>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormSection>
                <Typography variant="h6" gutterBottom color="primary">
                  Condition & Certification
                </Typography>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Condition</InputLabel>
                  <Select
                    name="condition"
                    value={formData.condition}
                    onChange={handleChange}
                    label="Condition"
                  >
                    {conditions.map((condition) => (
                      <MenuItem key={condition} value={condition}>
                        {condition.charAt(0).toUpperCase() + condition.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Certification</InputLabel>
                  <Select
                    name="certification"
                    value={formData.certification}
                    onChange={handleChange}
                    label="Certification"
                  >
                    {certificationBodies.map((cert) => (
                      <MenuItem key={cert} value={cert}>
                        {cert}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Serial Number"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  margin="normal"
                />
              </FormSection>
            </Grid>

            <Grid item xs={12}>
              <FormSection>
                <Typography variant="h6" gutterBottom color="primary">
                  Pricing & Stock
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Price"
                      name="price"
                      type="number"
                      value={formData.price}
                      onChange={handleChange}
                      required
                      margin="normal"
                      InputProps={{
                        startAdornment: <span>$</span>,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      name="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={handleChange}
                      required
                      margin="normal"
                    />
                  </Grid>
                </Grid>
              </FormSection>
            </Grid>

            <Grid item xs={12}>
              <FormSection>
                <Typography variant="h6" gutterBottom color="primary">
                  Additional Information
                </Typography>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  multiline
                  rows={4}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Images (URLs)"
                  name="images"
                  value={formData.images}
                  onChange={handleChange}
                  margin="normal"
                  helperText="Enter image URLs separated by commas"
                />
              </FormSection>
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                sx={{ mt: 2 }}
              >
                Add Item
              </Button>
            </Grid>
          </Grid>
        </form>
      </StyledPaper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default CoinsBullions;
