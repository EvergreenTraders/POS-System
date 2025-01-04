import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Typography,
  Paper
} from '@mui/material';
import axios from 'axios';

const MetalEstimator = ({ onMetalValueChange, setMetalFormState }) => {
  const [metalFormState, setMetalForm] = useState({
    type: '',
    metalCategory: '',
    jewelryColor: '',
    weight: '',
    price: '',
    purity: { purity: '', value: 0 }
  });

  const [metalTypes, setMetalTypes] = useState([]);
  const [metalCategories, setMetalCategories] = useState([]);
  const [metalPurities, setMetalPurities] = useState([]);
  const [metalColors, setMetalColors] = useState([]);
  const [totalMetalValue, setTotalMetalValue] = useState(0);

  useEffect(() => {
    setMetalFormState(metalFormState);
    onMetalValueChange(totalMetalValue);
  }, [metalFormState, totalMetalValue]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch Metal Types
        const typesResponse = await axios.get('http://localhost:5000/api/metal_type');
        setMetalTypes(typesResponse.data);

        // Fetch Metal Categories
        const categoriesResponse = await axios.get('http://localhost:5000/api/metal_category');
        setMetalCategories(categoriesResponse.data);

        // Fetch Metal Colors
        const colorsResponse = await axios.get('http://localhost:5000/api/metal_color');
        setMetalColors(colorsResponse.data);

      } catch (error) {
        console.error('Error fetching metal data:', error);
      }
    };

    fetchAllData();
  }, []);

  const fetchPurities = async (metalTypeId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/metal_purity/${metalTypeId}`);
      setMetalPurities(response.data);
    } catch (error) {
      console.error('Error fetching metal purities:', error);
      setMetalPurities([]);
    }
  };

  const handleMetalChange = (event) => {
    const { name, value } = event.target;
    if (name === 'type') {
      const selectedMetalType = metalTypes.find(type => type.type === value);
      if (selectedMetalType) {
        fetchPurities(selectedMetalType.id);
      }
    
    setMetalForm(prev => ({
      ...prev,
      type: value,
      purity: { purity: '', value: 0 }
    }));
    return;
  }
  
  // For purity, find the full purity object
  if (name === 'purity') {
    const selectedPurity = metalPurities.find(p => p.id === value);
    setMetalForm(prev => ({
      ...prev,
      purity: selectedPurity || { purity: '', value: 0 }
    }));
  } else {
    setMetalForm(prev => ({
      ...prev,
      [name]: value
    }));
  }
};

  const addMetal = () => {
    const newItem = {
      type: 'Metal',
      description: `${metalFormState.type} ${metalFormState.metalCategory} ${metalFormState.purity?.purity || ''} ${metalFormState.jewelryColor}`,
      dimension: `${metalFormState.size}`,
      weight: metalFormState.weight + ' g',
      quantity: 1,
      estimatedValue: totalMetalValue
    };

   // onAddMetal(newItem);
    onMetalValueChange(totalMetalValue);

    // Reset form
    setMetalForm({
      type: '',
      metalCategory: '',
      jewelryColor: '',
      weight: '',
      price: '',
      purity: { purity: '', value: 0 }
    });
  };

  const calculateMetalValue = () => {
    // Only calculate if all necessary fields are filled
    if (metalFormState.weight && metalFormState.price && metalFormState.purity) {
      const percentageFactor = 0.7; 
      setTotalMetalValue(metalFormState.price * metalFormState.purity.value * metalFormState.weight * percentageFactor);
    }
      
      else {
      // Reset metal value if fields are incomplete
      setTotalMetalValue(0);
    }
  };

  useEffect(() => {
    calculateMetalValue();
  }, [metalFormState.weight, metalFormState.price, metalFormState.purity]);

  return (
    <Paper sx={{ p: 2, height: '500px', overflow: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>ESTIMATE METAL</Typography>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Metal Type *</InputLabel>
        <Select
          name="type"
          value={metalFormState.type}
          onChange={handleMetalChange}
          required
        >
          {metalTypes.map(type => (
            <MenuItem key={type.id} value={type.type}>{type.type}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {metalFormState.type === 'Gold' && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select Jewelry Color *</InputLabel>
          <Select
            name="jewelryColor"
            value={metalFormState.jewelryColor}
            onChange={handleMetalChange}
            required
          >
            {metalColors.map(color => (
              <MenuItem key={color.id} value={color.color}>{color.color}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Metal Purity *</InputLabel>
        <Select
          name="purity"
          value={metalFormState.purity?.id || ''}
          onChange={handleMetalChange}
          required
        >
          {metalPurities.map(purity => (
            <MenuItem key={purity.id} value={purity.id}>
              {purity.purity === null 
                ? `${purity.value}` 
                : (purity.value === null 
                  ? purity.purity 
                  : `${purity.purity} - ${purity.value}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Metal Category *</InputLabel>
        <Select
          name="metalCategory"
          value={metalFormState.metalCategory}
          onChange={handleMetalChange}
          required
        >
          {metalCategories.map(category => (
            <MenuItem key={category.id} value={category.category}>{category.category}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="Weight (g) *"
        name="weight"
        value={metalFormState.weight}
        onChange={handleMetalChange}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Spot Price/oz"
        name="price"
        value={metalFormState.price}
        onChange={handleMetalChange}
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        onClick={addMetal}
        fullWidth
        sx={{ mt: 2 }}
        disabled={!metalFormState.type || !metalFormState.purity || !metalFormState.metalCategory || !metalFormState.weight || (metalFormState.type === 'Gold' && !metalFormState.jewelryColor)}
      >
        Add Metal
      </Button>

      <Typography variant="h6" sx={{ mt: 2 }}>
        Est. Metal Value: ${totalMetalValue.toFixed(2)}
      </Typography>

    </Paper>
  );
};

export default MetalEstimator;