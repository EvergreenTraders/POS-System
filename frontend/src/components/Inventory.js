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
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(4),
  borderRadius: theme.spacing(2),
  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)',
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
});

function Inventory() {
  const [formData, setFormData] = useState({
    type: 'simple',
    sku: '',
    name: '',
    published: true,
    is_featured: false,
    visibility_in_catalog: 'visible',
    tax_status: 'taxable',
    in_stock: true,
    backorders_allowed: false,
    sold_individually: false,
    weight_oz: '',
    allow_customer_reviews: true,
    regular_price: '',
    categories: '',
    images: '',
    position: '',
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: e.target.type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5432/api/jewellery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: 'Jewellery item added successfully!',
          severity: 'success',
        });
        // Reset form
        setFormData({
          type: 'simple',
          sku: '',
          name: '',
          published: true,
          is_featured: false,
          visibility_in_catalog: 'visible',
          tax_status: 'taxable',
          in_stock: true,
          backorders_allowed: false,
          sold_individually: false,
          weight_oz: '',
          allow_customer_reviews: true,
          regular_price: '',
          categories: '',
          images: '',
          position: '',
        });
      } else {
        throw new Error('Failed to add jewellery item');
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error adding jewellery item: ' + error.message,
        severity: 'error',
      });
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 4, mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
        Inventory Management - Jewellery
      </Typography>
      
      <StyledPaper elevation={3}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormSection>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="SKU"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  required
                  margin="normal"
                />
                <FormControl fullWidth margin="normal">
                  <InputLabel>Type</InputLabel>
                  <Select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    label="Type"
                  >
                    <MenuItem value="simple">Simple</MenuItem>
                    <MenuItem value="variable">Variable</MenuItem>
                    <MenuItem value="grouped">Grouped</MenuItem>
                  </Select>
                </FormControl>
              </FormSection>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormSection>
                <Typography variant="h6" gutterBottom>
                  Pricing & Weight
                </Typography>
                <TextField
                  fullWidth
                  label="Regular Price"
                  name="regular_price"
                  type="number"
                  value={formData.regular_price}
                  onChange={handleChange}
                  required
                  margin="normal"
                  InputProps={{
                    startAdornment: <span>$</span>,
                  }}
                />
                <TextField
                  fullWidth
                  label="Weight (oz)"
                  name="weight_oz"
                  type="number"
                  value={formData.weight_oz}
                  onChange={handleChange}
                  margin="normal"
                />
              </FormSection>
            </Grid>

            <Grid item xs={12}>
              <FormSection>
                <Typography variant="h6" gutterBottom>
                  Visibility & Status
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.published}
                          onChange={handleChange}
                          name="published"
                        />
                      }
                      label="Published"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.is_featured}
                          onChange={handleChange}
                          name="is_featured"
                        />
                      }
                      label="Featured"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Visibility in Catalog</InputLabel>
                      <Select
                        name="visibility_in_catalog"
                        value={formData.visibility_in_catalog}
                        onChange={handleChange}
                        label="Visibility in Catalog"
                      >
                        <MenuItem value="visible">Visible</MenuItem>
                        <MenuItem value="catalog">Catalog</MenuItem>
                        <MenuItem value="search">Search</MenuItem>
                        <MenuItem value="hidden">Hidden</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </FormSection>
            </Grid>

            <Grid item xs={12}>
              <FormSection>
                <Typography variant="h6" gutterBottom>
                  Inventory
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.in_stock}
                          onChange={handleChange}
                          name="in_stock"
                        />
                      }
                      label="In Stock"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.backorders_allowed}
                          onChange={handleChange}
                          name="backorders_allowed"
                        />
                      }
                      label="Allow Backorders"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.sold_individually}
                          onChange={handleChange}
                          name="sold_individually"
                        />
                      }
                      label="Sold Individually"
                    />
                  </Grid>
                </Grid>
              </FormSection>
            </Grid>

            <Grid item xs={12}>
              <FormSection>
                <Typography variant="h6" gutterBottom>
                  Additional Information
                </Typography>
                <TextField
                  fullWidth
                  label="Categories"
                  name="categories"
                  value={formData.categories}
                  onChange={handleChange}
                  margin="normal"
                  helperText="Separate categories with commas"
                />
                <TextField
                  fullWidth
                  label="Image URLs"
                  name="images"
                  value={formData.images}
                  onChange={handleChange}
                  margin="normal"
                  helperText="Enter image URLs separated by commas"
                />
                {formData.images && (
                  <ImagePreview
                    src={formData.images.split(',')[0]}
                    alt="Product preview"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
              </FormSection>
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                sx={{
                  mt: 2,
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                }}
              >
                Add Jewellery Item
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

export default Inventory;
