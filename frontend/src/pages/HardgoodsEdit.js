import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Button, Box, Grid,
  TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Divider
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';
import config from '../config';

const API_BASE_URL = config.apiUrl;

const HardgoodsEdit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  const existingItem = location.state?.item;
  const isEditMode = !!existingItem;

  // Form state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [skus, setSkus] = useState([]);

  const [formData, setFormData] = useState({
    tracking_type: 'ITEM',
    category_id: '',
    subcategory_id: '',
    sku_id: '',
    short_desc: '',
    long_desc: '',
    brand: '',
    model: '',
    serial_number: '',
    imei: '',
    mac_address: '',
    condition: 'GOOD',
    condition_notes: '',
    cost_price: '',
    retail_price: '',
    minimum_price: '',
    status: 'HOLD',
    location: '',
    bin_location: '',
    quantity: 1,
    notes: '',
    source: ''
  });

  // Load initial data
  useEffect(() => {
    fetchCategories();
    fetchSkus();

    if (existingItem) {
      setFormData({
        tracking_type: existingItem.tracking_type || 'ITEM',
        category_id: existingItem.category_id || '',
        subcategory_id: existingItem.subcategory_id || '',
        sku_id: existingItem.sku_id || '',
        short_desc: existingItem.short_desc || '',
        long_desc: existingItem.long_desc || '',
        brand: existingItem.brand || '',
        model: existingItem.model || '',
        serial_number: existingItem.serial_number || '',
        imei: existingItem.imei || '',
        mac_address: existingItem.mac_address || '',
        condition: existingItem.condition || 'GOOD',
        condition_notes: existingItem.condition_notes || '',
        cost_price: existingItem.cost_price || '',
        retail_price: existingItem.retail_price || '',
        minimum_price: existingItem.minimum_price || '',
        status: existingItem.status || 'HOLD',
        location: existingItem.location || '',
        bin_location: existingItem.bin_location || '',
        quantity: existingItem.quantity || 1,
        notes: existingItem.notes || '',
        source: existingItem.source || ''
      });

      if (existingItem.category_id) {
        fetchSubcategories(existingItem.category_id);
      }
    }
  }, [existingItem]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/hardgoods/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSubcategories = async (categoryId) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/hardgoods/categories/${categoryId}/subcategories`);
      setSubcategories(response.data);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  const fetchSkus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/hardgoods/sku`);
      setSkus(response.data);
    } catch (error) {
      console.error('Error fetching SKUs:', error);
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    // Handle category change - fetch subcategories
    if (field === 'category_id') {
      setFormData(prev => ({ ...prev, subcategory_id: '' }));
      fetchSubcategories(value);
    }

    // Handle SKU selection - populate from SKU
    if (field === 'sku_id' && value) {
      const selectedSku = skus.find(s => s.sku_id === value);
      if (selectedSku) {
        setFormData(prev => ({
          ...prev,
          short_desc: selectedSku.sku_name,
          brand: selectedSku.brand || '',
          model: selectedSku.model || '',
          category_id: selectedSku.category_id,
          subcategory_id: selectedSku.subcategory_id || '',
          cost_price: selectedSku.cost_price || '',
          retail_price: selectedSku.default_price || ''
        }));
        fetchSubcategories(selectedSku.category_id);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.category_id) {
      enqueueSnackbar('Please select a category', { variant: 'error' });
      return;
    }

    if (!formData.short_desc) {
      enqueueSnackbar('Please enter a description', { variant: 'error' });
      return;
    }

    if (['SKU', 'HYBRID'].includes(formData.tracking_type) && !formData.sku_id) {
      enqueueSnackbar('Please select a SKU for this tracking type', { variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        created_by: user?.employee_id,
        last_updated_by: user?.employee_id,
        category_id: parseInt(formData.category_id),
        subcategory_id: formData.subcategory_id ? parseInt(formData.subcategory_id) : null,
        quantity: parseInt(formData.quantity) || 1,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        retail_price: formData.retail_price ? parseFloat(formData.retail_price) : null,
        minimum_price: formData.minimum_price ? parseFloat(formData.minimum_price) : null
      };

      if (isEditMode) {
        await axios.put(`${API_BASE_URL}/hardgoods/${existingItem.item_id}`, payload);
        enqueueSnackbar('Item updated successfully', { variant: 'success' });
      } else {
        await axios.post(`${API_BASE_URL}/hardgoods`, payload);
        enqueueSnackbar('Item created successfully', { variant: 'success' });
      }

      navigate('/inventory/hardgoods');
    } catch (error) {
      console.error('Error saving item:', error);
      enqueueSnackbar(error.response?.data?.error || 'Error saving item', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const conditionOptions = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'];
  const statusOptions = ['HOLD', 'ACTIVE', 'IN_PROCESS', 'SOLD', 'PAWN', 'SCRAP'];
  const trackingTypeOptions = ['ITEM', 'SKU', 'HYBRID', 'BUCKET'];

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          {isEditMode ? `Edit Item: ${existingItem.item_id}` : 'Add New Hardgoods Item'}
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Tracking Type & Category */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" sx={{ mb: 1 }}>
                Classification
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={3}>
              <FormControl fullWidth required>
                <InputLabel>Tracking Type</InputLabel>
                <Select
                  value={formData.tracking_type}
                  label="Tracking Type"
                  onChange={handleChange('tracking_type')}
                  disabled={isEditMode}
                >
                  {trackingTypeOptions.map(opt => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category_id}
                  label="Category"
                  onChange={handleChange('category_id')}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.category_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Subcategory</InputLabel>
                <Select
                  value={formData.subcategory_id}
                  label="Subcategory"
                  onChange={handleChange('subcategory_id')}
                >
                  <MenuItem value="">None</MenuItem>
                  {subcategories.map(sub => (
                    <MenuItem key={sub.id} value={sub.id}>{sub.subcategory_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={handleChange('status')}
                >
                  {statusOptions.map(opt => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* SKU Selection (for SKU/HYBRID types) */}
            {['SKU', 'HYBRID'].includes(formData.tracking_type) && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Select SKU</InputLabel>
                  <Select
                    value={formData.sku_id}
                    label="Select SKU"
                    onChange={handleChange('sku_id')}
                  >
                    {skus.map(sku => (
                      <MenuItem key={sku.sku_id} value={sku.sku_id}>
                        {sku.sku_id} - {sku.sku_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Item Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2, mb: 1 }}>
                Item Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Short Description"
                value={formData.short_desc}
                onChange={handleChange('short_desc')}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Brand"
                value={formData.brand}
                onChange={handleChange('brand')}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Model"
                value={formData.model}
                onChange={handleChange('model')}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Long Description"
                value={formData.long_desc}
                onChange={handleChange('long_desc')}
              />
            </Grid>

            {/* Identification */}
            {['ITEM', 'HYBRID'].includes(formData.tracking_type) && (
              <>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Serial Number"
                    value={formData.serial_number}
                    onChange={handleChange('serial_number')}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="IMEI"
                    value={formData.imei}
                    onChange={handleChange('imei')}
                    helperText="For phones/tablets"
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="MAC Address"
                    value={formData.mac_address}
                    onChange={handleChange('mac_address')}
                    helperText="For electronics"
                  />
                </Grid>
              </>
            )}

            {/* Condition */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2, mb: 1 }}>
                Condition & Location
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Condition</InputLabel>
                <Select
                  value={formData.condition}
                  label="Condition"
                  onChange={handleChange('condition')}
                >
                  {conditionOptions.map(opt => (
                    <MenuItem key={opt} value={opt}>{opt.replace('_', ' ')}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={handleChange('location')}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Bin Location"
                value={formData.bin_location}
                onChange={handleChange('bin_location')}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Quantity"
                value={formData.quantity}
                onChange={handleChange('quantity')}
                inputProps={{ min: 1 }}
                disabled={formData.tracking_type === 'ITEM'}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Condition Notes"
                value={formData.condition_notes}
                onChange={handleChange('condition_notes')}
                placeholder="Describe any wear, damage, or special conditions"
              />
            </Grid>

            {/* Pricing */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2, mb: 1 }}>
                Pricing
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Cost Price"
                value={formData.cost_price}
                onChange={handleChange('cost_price')}
                inputProps={{ step: 0.01, min: 0 }}
                InputProps={{ startAdornment: '$' }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Retail Price"
                value={formData.retail_price}
                onChange={handleChange('retail_price')}
                inputProps={{ step: 0.01, min: 0 }}
                InputProps={{ startAdornment: '$' }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Price"
                value={formData.minimum_price}
                onChange={handleChange('minimum_price')}
                inputProps={{ step: 0.01, min: 0 }}
                InputProps={{ startAdornment: '$' }}
                helperText="Floor price for negotiation"
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2, mb: 1 }}>
                Additional Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Source"
                value={formData.source}
                onChange={handleChange('source')}
                placeholder="BUY, PAWN, CONSIGNMENT, etc."
              />
            </Grid>

            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                value={formData.notes}
                onChange={handleChange('notes')}
              />
            </Grid>

            {/* Actions */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/inventory/hardgoods')}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={24} /> : (isEditMode ? 'Update Item' : 'Create Item')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default HardgoodsEdit;
