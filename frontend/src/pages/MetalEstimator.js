import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Grid,
  Typography,
  Paper,
  Box
} from '@mui/material';
import axios from 'axios';

const MetalEstimator = ({ onMetalValueChange, onAddMetal, setMetalFormState }) => {
  const [metalFormState, setMetalForm] = useState({
    preciousMetalType: '',
    nonPreciousMetalType: '',
    metalCategory: '',
    jewelryColor: '',
    weight: '',
    spotPrice: 0,
    purity: { purity: '', value: 0 },
    value: ''
  });

  const [preciousMetalTypes, setPreciousMetalTypes] = useState([]);
  const [nonPreciousMetalTypes, setNonPreciousMetalTypes] = useState([]);
  const [metalCategories, setMetalCategories] = useState([]);
  const [metalPurities, setMetalPurities] = useState([]);
  const [metalColors, setMetalColors] = useState([]);
  const [totalMetalValue, setTotalMetalValue] = useState(0);
  const [metalSpotPrice, setMetalSpotPrice] = useState({USDXAG: 0, USDXAU: 0, USDXPD: 0, USDXPT: 0 });

  useEffect(() => {
    setMetalFormState(metalFormState);
    onMetalValueChange(totalMetalValue);
  }, [metalFormState, totalMetalValue]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch Precious Metal Types
        const preciousMetalTypesResponse = await axios.get('http://localhost:5000/api/precious_metal_type');
        setPreciousMetalTypes(preciousMetalTypesResponse.data);

        // Fetch Non-Precious Metal Types
        const nonPreciousMetalTypesResponse = await axios.get('http://localhost:5000/api/non_precious_metal_type');
        setNonPreciousMetalTypes(nonPreciousMetalTypesResponse.data);

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
    fetchSpotPrice();
  }, []);

  const fetchPurities = async (preciousMetalTypeId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/metal_purity/${preciousMetalTypeId}`);
      setMetalPurities(response.data);
    } catch (error) {
      console.error('Error fetching metal purities:', error);
      setMetalPurities([]);
    }
  };

  const fetchSpotPrice = async () => {
    try {
     const response = await axios.get('https://api.metalpriceapi.com/v1/latest?api_key=8b7bc38e033b653f05f39fd6dc809ca4&base=USD&currencies=XPD,XAU,XAG,XPT');
     setMetalSpotPrice({
        USDXAG: response.data.rates.USDXAG,
        USDXAU: response.data.rates.USDXAU,
        USDXPD: response.data.rates.USDXPD,
        USDXPT: response.data.rates.USDXPT
      });
    } catch (error) {
      console.error('Error fetching spot price:', error);
    }
  };

  const handleMetalChange = (event) => {
    const { name, value } = event.target;

    if (name === 'preciousMetalType') {
      const selectedPreciousMetalType = preciousMetalTypes.find(type => type.type === value);
      if (selectedPreciousMetalType) {
        fetchPurities(selectedPreciousMetalType.id);
      }
      setMetalForm(prev => ({
        ...prev,
        preciousMetalType: value,
        purity: { purity: '', value: 0 },
        spotPrice: 
        selectedPreciousMetalType.type === 'Silver' ? metalSpotPrice.USDXAG :
        selectedPreciousMetalType.type === 'Gold' ? metalSpotPrice.USDXAU :
        selectedPreciousMetalType.type === 'Platinum' ? metalSpotPrice.USDXPT : 
        selectedPreciousMetalType.type === 'Palladium' ? metalSpotPrice.USDXPD : 0 
      }));
      return;
    }
    if (name === 'nonPreciousMetalType') {
      setMetalForm(prev => ({
        ...prev,
        nonPreciousMetalType: value,
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
    }

    // if (name === 'spotPrice') {
    //   setMetalForm(prev => ({
    //     ...prev,
    //     spotPrice: { spotPrice: '', value: 0 }
    //   }))
    // } 
    else if (name === 'value') {
      setMetalForm(prev => ({
        ...prev,
        purity: {
          ...prev.purity,
          value: value
        }
      }));
    }
    else {
      setMetalForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const addMetal = () => {
    const newItem = {
      preciousMetalType: metalFormState.preciousMetalType,
      nonPreciousMetalType: metalFormState.nonPreciousMetalType,
      metalCategory: metalFormState.metalCategory,
      jewelryColor: metalFormState.jewelryColor,
      weight: metalFormState.weight,
      purity: metalFormState.purity,
      estimatedValue: totalMetalValue
    };

    onAddMetal(newItem); 
    onMetalValueChange(totalMetalValue);

    // Reset form
    setMetalForm({
      preciousMetalType: '',
      nonPreciousMetalType: '',
      metalCategory: '',
      jewelryColor: '',
      weight: '',
      spotPrice: '',
      purity: { purity: '', value: 0 },
      value: ''
    });
  };

  const calculateMetalValue = () => {
    // Only calculate if all necessary fields are filled
    if (metalFormState.weight && metalFormState.spotPrice && metalFormState.purity) {
      const percentageFactor = 0.7; 
      setTotalMetalValue(metalFormState.spotPrice * metalFormState.purity.value * metalFormState.weight * percentageFactor);
    }
      
      else {
      // Reset metal value if fields are incomplete
      setTotalMetalValue(0);
    }
  };

  useEffect(() => {
    calculateMetalValue();
  }, [metalFormState.weight, metalFormState.spotPrice, metalFormState.purity]);

  return (
    <Paper sx={{ p: 2, height: '500px', overflow: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>ESTIMATE METAL</Typography>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Precious Metal Type *</InputLabel>
        <Select
          name="preciousMetalType"
          value={metalFormState.preciousMetalType}
          onChange={handleMetalChange}
          required
        >
          {preciousMetalTypes.map(type => (
            <MenuItem key={type.id} value={type.type}>{type.type}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Non-Precious Metal Type</InputLabel>
        <Select
          name="nonPreciousMetalType"
          value={metalFormState.nonPreciousMetalType}
          onChange={handleMetalChange}
          required
        >
          {nonPreciousMetalTypes.map(type => (
            <MenuItem key={type.id} value={type.type}>{type.type}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {metalFormState.preciousMetalType === 'Gold' && (
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
    <Grid container spacing={2}>
      <Grid item xs={12} sm={metalFormState.preciousMetalType === 'Platinum' || metalFormState.preciousMetalType === 'Palladium' ? 12 : 6}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel> Purity *</InputLabel>
          <Select
            name="purity"
            value={metalFormState.purity?.id || ''}
            onChange={(e) => {
              handleMetalChange(e);
              const selectedPurityObj = metalPurities.find(p => p.id === e.target.value);
              setMetalFormState(prev => ({
                ...prev,
                value: selectedPurityObj ? selectedPurityObj.value : ''
              }));
            }}
            required
          >
            {metalPurities.map(purity => (
              <MenuItem key={purity.id} value={purity.id}>
                {metalFormState.preciousMetalType === 'Platinum' || metalFormState.preciousMetalType === 'Palladium' 
                  ? purity.value 
                  : purity.purity}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={metalFormState.preciousMetalType !== 'Platinum' && metalFormState.preciousMetalType !== 'Palladium' ? 6 : 0}>
        {metalFormState.preciousMetalType !== 'Platinum' && metalFormState.preciousMetalType !== 'Palladium' && (
          <TextField
            fullWidth
            label="Value"
            name="value"
            type="decimal"
            value={metalFormState.purity?.value || ''} 
            onChange={handleMetalChange}
            inputProps={{ 
              min: 0,
              inputMode: 'decimal',
              pattern: '[0-9]*\\.?[0-9]*'
            }}
          />
        )}
      </Grid>
    </Grid>

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
        name="spotPrice"
        value={metalFormState.spotPrice || ''}
        onChange={handleMetalChange}
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        onClick={addMetal}
        fullWidth
        sx={{ mt: 2 }}
        disabled={!metalFormState.preciousMetalType ||!metalFormState.purity || !metalFormState.metalCategory || !metalFormState.weight || (metalFormState.type === 'Gold' && !metalFormState.jewelryColor)}
      >
        Add Metal
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', mr: 0 }}>
          Est. Metal Value: $
        </Typography>
        <TextField
          size="small"
          type="decimal"
          value={totalMetalValue.toFixed(1)}
          variant="standard"
          onChange={(e) => {
            const newValue = parseFloat(e.target.value);
            setTotalMetalValue(newValue);
            onMetalValueChange(newValue);
          }}
          inputProps={{ 
            min: 0,
            inputMode: 'decimal',
            pattern: '[0-9]*\\.?[0-9]*',
            style: { width: '100px' }
          }}
          sx={{ 
            ml: 1,
            '& .MuiInputBase-root': {
              ml: 0,
              pl: 0
            }
          }}
        />
      </Box>

    </Paper>
  );
};

export default MetalEstimator;