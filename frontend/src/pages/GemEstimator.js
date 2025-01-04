import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Grid,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControlLabel,
  Checkbox,
  Slider,
  Radio,
  RadioGroup
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { HexColorPicker } from 'react-colorful';
import MetalEstimator from './MetalEstimator';

function GemEstimator() {
  const [metalFormState, setMetalFormState] = useState({});
  const [totalMetalValue, setTotalMetalValue] = useState(0);

  const handleMetalFormChange = (formState) => {
      setMetalFormState(formState);
  };

  const handleTotalMetalValueChange = (value) => {
      setTotalMetalValue(value);
  };

  // Primary gem form
  const [primaryDiamondForm, setPrimaryDiamondForm] = useState({
    shape: '',
    clarity: '',
    color: 'Colorless',
    quantity: 1,
    weight: 0,
    cut: '',
    labGrown: false,
    exactColor: 'D',
    size: ''
  });

  // Secondary gem form
  const [secondaryDiamondForm, setSecondaryDiamondForm] = useState({
    shape: '',
    clarity: '',
    color: 'Colorless',
    quantity: 1,
    weight: 0,
    cut: '',
    labGrown: false,
    exactColor: 'D',
    size: ''
  });

  const initialStoneForm = {
    name: '',
    shape: '',
    color: '#000000',
    weight: '',
    width: '',
    depth: '',
    quantity: 1,
    authentic: false,
    valuationType: 'each'
  };

  const [primaryStoneForm, setPrimaryStoneForm] = useState(initialStoneForm);
  const [secondaryStoneForm, setSecondaryStoneForm] = useState(initialStoneForm);

  const [estimatedItems, setEstimatedItems] = useState([]);
  const [totalDiamondValue, setTotalDiamondValue] = useState(0);
  const [estimates, setEstimates] = useState({
    pawn: 0,
    buy: 0,
    retail: 0
  });

  const [diamondValuationType, setDiamondValuationType] = useState('each');

  const [exactColor, setExactColor] = useState('D');

  const colorScale = Array.from({length: 23}, (_, i) => 
    String.fromCharCode(68 + i) // Starting from 'D'
  );

  const [diamondShapes, setDiamondShapes] = useState([]);

  const [diamondClarity, setDiamondClarity] = useState([]);

  const [diamondSizes, setDiamondSizes] = useState([]);

  const [diamondCuts, setDiamondCuts] = useState([]);

  const [diamondColors, setDiamondColors] = useState([]);

  const [stoneTypes, setStoneTypes] = useState([]);

  const [stoneShapes, setStoneShapes] = useState([]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch Stone Shapes
        const stoneShapesResponse = await axios.get('http://localhost:5000/api/stone_shape');
        const stoneShapesWithImages = stoneShapesResponse.data.map(shape => ({
          name: shape.shape,
          image: shape.image_path.replace('.jpg', '.png')
        }));
        setStoneShapes(stoneShapesWithImages);

        // Fetch Stone Types
        const stoneTypesResponse = await axios.get('http://localhost:5000/api/stone_type');
        const typesWithImages = stoneTypesResponse.data.map(type => ({
          name: type.type,
          image: type.image_path.replace('.jpg', '.png')
        }));
        setStoneTypes(typesWithImages);

        // Fetch Diamond Shapes
        const shapesResponse = await axios.get('http://localhost:5000/api/diamond_shape');
        const shapesWithImages = shapesResponse.data.map(shape => ({
          name: shape.shape,
          image: shape.image_path.replace('.jpg', '.png')
        }));
        setDiamondShapes(shapesWithImages);

        // Fetch Diamond Clarity
        const clarityResponse = await axios.get('http://localhost:5000/api/diamond_clarity');
        const clarityWithImages = clarityResponse.data.map(clarity => ({
          name: clarity.name,
          image: clarity.image_path
        }));
        setDiamondClarity(clarityWithImages);

        // Fetch Diamond Cuts
        const cutsResponse = await axios.get('http://localhost:5000/api/diamond_cut');
        setDiamondCuts(cutsResponse.data);

        // Fetch Diamond Colors
        const diamondColorResponse = await axios.get('http://localhost:5000/api/diamond_color');
        setDiamondColors(diamondColorResponse.data);
        
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchAllData();
  }, []);

  const fetchDiamondSizes = async (diamondShapeId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/diamond_size_weight/${diamondShapeId}`);
      setDiamondSizes(response.data);
    } catch (error) {
      console.error('Error fetching diamond sizes:', error);
      setDiamondSizes([]);
    }
  };
  
  useEffect(() => {
    // Calculate estimates whenever total values change
    const totalValue = totalMetalValue + totalDiamondValue;
    setEstimates({
      pawn: totalValue * 0.5,    // 50% of total value
      buy: totalValue * 0.7,    // 70% of total value
      retail: totalValue * 0.8,  // 80% of total value
    });
  }, [totalMetalValue, totalDiamondValue]);

  const [activeTab, setActiveTab] = useState('primary_gem_diamond');

  const getCurrentForm = () => {
    return activeTab.startsWith('primary') ? primaryDiamondForm : secondaryDiamondForm;
  };

  const setCurrentForm = (updater) => {
    if (activeTab.startsWith('primary')) {
      setPrimaryDiamondForm(updater);
    } else {
      setSecondaryDiamondForm(updater);
    }
  };

  const getCurrentStoneForm = () => {
    return activeTab.startsWith('primary') ? primaryStoneForm : secondaryStoneForm;
  };

  const setCurrentStoneForm = (newForm) => {
    if (activeTab.startsWith('primary')) {
      setPrimaryStoneForm(newForm);
    } else {
      setSecondaryStoneForm(newForm);
    }
  };

  const handleExactColorChange = (event, newValue) => {
    setExactColor(colorScale[newValue]);
    
    // Update the current form with the exact color
    setCurrentForm(prev => ({
      ...prev,
      exactColor: colorScale[newValue]
    }));
  };

  const handleDiamondChange = (event) => {
    const { name, value } = event.target;
    
    // If shape is changed, fetch corresponding sizes
    if (name === 'shape') {      
      // Find the shape object
      const selectedShape = diamondShapes.find((shape, index) => {
        if (shape.name === value) {
          shape.id = index + 1; // Store the ID based on index
          return true;
        }
        return false;
      });
      if (selectedShape) {
        fetchDiamondSizes(selectedShape.id);
      } else {
        console.error("No shape found for:", value);
      }
    }

    setCurrentForm(prev => ({
      ...prev,
      [name]: value,
      // Reset size when shape changes
      ...(name === 'shape' && { size: '' })
    }));
  };

  const addDiamond = () => {
    const currentForm = getCurrentForm();
    const newItem = {
      type: activeTab.startsWith('primary') ? 'Primary Diamond' : 'Secondary Diamond',
      description: `${currentForm.shape} ${currentForm.clarity} ${currentForm.color} ${currentForm.exactColor} ${currentForm.cut}`,
      weight: currentForm.weight+' ct',
      quantity: currentForm.quantity,
      labGrown: currentForm.labGrown,
      valuationType: currentForm.quantity > 1 ? diamondValuationType : 'each',
    };

    setEstimatedItems(prev => [...prev, newItem]);
    
    // Reset the current form after adding
    const resetForm = {
      shape: '',
      clarity: '',
      color: 'Colorless',
      quantity: 1,
      weight: 0,
      cut: '',
      labGrown: false,
      exactColor: 'D',
      size: ''
    };
    setCurrentForm(resetForm);
    
    // Reset exact color to default
    setExactColor('D');
    
    // Reset valuation type to default
    setDiamondValuationType('each');
  };

  const handleStoneChange = (event) => {
    const { name, value } = event.target;
    setCurrentStoneForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStoneTypeChange = (event) => {
    const selectedStone = stoneTypes.find(stone => stone.name === event.target.value);
    setCurrentStoneForm(prev => ({
      ...prev,
      name: selectedStone ? selectedStone.name : '',
    }));
  };

  const handleDiamondValuationTypeChange = (event) => {
    setDiamondValuationType(event.target.value);
  };

  const addStone = () => {
    const currentForm = getCurrentStoneForm();
    const newStone = {
      type:  activeTab.startsWith('primary') ? 'Primary Stone' : 'Secondary Stone',
      description: `${currentForm.name} - ${currentForm.color}`,
      dimension: currentForm.shape,
      weight: currentForm.weight+' ct',
      quantity: currentForm.quantity,
      labGrown: false,
      estimatedValue: calculateStoneValue(),
      isPrimary: activeTab.startsWith('primary')
    };

    setEstimatedItems(prev => [...prev, newStone]);

    // Reset the form after adding
    if (activeTab.startsWith('primary')) {
      setPrimaryStoneForm(initialStoneForm);
    } else {
      setSecondaryStoneForm(initialStoneForm);
    }
  };

  const [currentStone, setCurrentStone] = useState({
    type: '',
    color: '',
    weight: '',
    isNatural: true,
    isCertified: false
  });

  const [estimatedStones, setEstimatedStones] = useState([]);

  const renderStoneEstimationTab = () => (
    <Grid container spacing={2} sx={{ p: 2 }}>
      {/* Quantity and Authentic */}
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={6} sm={5}>
          <TextField
            fullWidth
            label="Quantity"
            type="number"
            value={getCurrentStoneForm().quantity}
            onChange={(e) => setCurrentStoneForm(prev => ({
              ...prev, 
              quantity: parseInt(e.target.value) || 1
            }))}
            InputProps={{
              inputProps: { min: 1, max: 100 }
            }}
          />
        </Grid>
        <Grid item xs={6} sm={7}>
          <Box sx={{ ml: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={getCurrentStoneForm().authentic || false}
                  onChange={(e) => setCurrentStoneForm(prev => ({
                    ...prev,
                    authentic: e.target.checked
                  }))}
                />
              }
              label="Authentic"
            />
          </Box>
        </Grid>
      </Grid>

      {/* Stone Type and Color */}
      <Grid container spacing={3} sx={{ mt: 0 }}>
        {/* Stone Type */}
        <Grid item xs={12} md={8}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Type *</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            {stoneTypes.map((stone) => (
              <Paper
                key={stone.name}
                elevation={getCurrentStoneForm().name === stone.name ? 8 : 1}
                sx={{
                  p: 1,
                  cursor: 'pointer',
                  width: 80,
                  height: 80,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => handleStoneTypeChange({ target: { value: stone.name } })}
              >
                <Box
                  component="img"
                  src={stone.image}
                  alt={stone.name}
                  sx={{ width: 40, height: 40 }}
                />
                <Typography variant="caption" align="center">
                  {stone.name}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Grid>

        {/* Stone Color Picker */}
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Color *</Typography>
          <Box sx={{ width: 160, mb: 2 }}>
            <HexColorPicker
              color={getCurrentStoneForm().color || '#000000'}
              onChange={(color) => setCurrentStoneForm(prev => ({
                ...prev,
                color: color
              }))}
              style={{ width: '100%', height: '160px' }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                bgcolor: getCurrentStoneForm().color || '#000000',
                border: '2px solid',
                borderColor: 'divider'
              }}
            />
            <Typography>
              {getCurrentStoneForm().color || '#000000'}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Stone Shape */}
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Shape *</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {stoneShapes.map((shape) => (
            <Paper
              key={shape.name}
              elevation={getCurrentStoneForm().shape === shape.name ? 8 : 1}
              sx={{
                p: 1,
                cursor: 'pointer',
                width: 80,
                height: 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => setCurrentStoneForm(prev => ({
                ...prev,
                shape: shape.name
              }))}
            >
              <Box
                component="img"
                src={shape.image}
                alt={shape.name}
                sx={{ width: 40, height: 40 }}
              />
              <Typography variant="caption" align="center">
                {shape.name}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* Size Section */}
      <Grid container spacing={1} sx={{ mt: 0, mb: 0, alignItems: 'center' }}>
        <Grid item>
          <Typography variant="subtitle1" sx={{ mb: 0 }}>Size</Typography>
        </Grid>
        {getCurrentStoneForm().quantity > 1 && (
          <Grid item>
            <FormControl sx={{ minWidth: 120 }}>
              <Select
                value={getCurrentStoneForm().valuationType}
                onChange={(e) => setCurrentStoneForm(prev => ({
                  ...prev, 
                  valuationType: e.target.value
                }))}
                displayEmpty
                size="small"
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    border: 'none'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    border: 'none'
                  }
                }}
              >
                <MenuItem value="each">Each</MenuItem>
                <MenuItem value="total">Total</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}
      </Grid>

      {/* Measurements Container */}
      <Grid container spacing={2} sx={{ mt: -1 }}>
        {/* Weight */}
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Weight (Carats) *"
            type="number"
            value={getCurrentStoneForm().weight}
            onChange={(e) => setCurrentStoneForm(prev => ({
              ...prev, 
              weight: e.target.value
            }))}
            InputProps={{
              inputProps: { min: 0, step: 0.01 }
            }}
          />
        </Grid>

        {/* Width */}
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Width (mm)"
            type="number"
            value={getCurrentStoneForm().width}
            onChange={(e) => setCurrentStoneForm(prev => ({
              ...prev, 
              width: e.target.value
            }))}
            InputProps={{
              inputProps: { min: 0, step: 0.1 }
            }}
          />
        </Grid>

        {/* Depth */}
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Depth (mm)"
            type="number"
            value={getCurrentStoneForm().depth}
            onChange={(e) => setCurrentStoneForm(prev => ({
              ...prev, 
              depth: e.target.value
            }))}
            InputProps={{
              inputProps: { min: 0, step: 0.1 }
            }}
          />
        </Grid>
      </Grid>

      {/* Add Stone Button */}
      <Grid item xs={12}>
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth 
          onClick={addStone}
          disabled={
            !getCurrentStoneForm().name || 
            !getCurrentStoneForm().shape || 
            !getCurrentStoneForm().color || 
            !getCurrentStoneForm().weight 
          }
        >
          Add Stone
        </Button>
      </Grid>

      {/* Add button to switch between primary and secondary gems */}
      <Grid item xs={12} sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ flexGrow: 1, mr: 2 }}>
          Est. {activeTab.startsWith('primary') ? 'Primary' : 'Secondary'} {activeTab.includes('diamond') ? 'Diamond' : 'Stone'} Value: ${estimatedItems.filter(item => item.type === (activeTab.includes('diamond') ? 'Diamond' : 'Stone')).reduce((total, stone) => total + stone.estimatedValue, 0).toFixed(2)}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => {
            if (activeTab.startsWith('primary')) {
              setActiveTab('secondary_gem_stone');
            } else {
              setActiveTab('primary_gem_stone');
            }
          }}
        >
           {activeTab.startsWith('primary') ? 'Secondary Gem' : 'Primary Gem'}
        </Button>
      </Grid>
    </Grid>
  );

  const renderDiamondEstimationTab = () => (
    <Grid container spacing={2} sx={{ p: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={6}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Cut *</InputLabel>
            <Select
              value={getCurrentForm().cut}
              label="Cut"
              onChange={(e) => setCurrentForm(prev => ({
                ...prev, 
                cut: e.target.value
              }))}
            >
              {diamondCuts.map((cut) => (
                <MenuItem key={cut.name} value={cut.name}>{cut.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <Grid container spacing={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Grid item xs={12}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth 
                onClick={addDiamond}
                disabled={!getCurrentForm().shape || !getCurrentForm().clarity || !getCurrentForm().cut}
              >
                ADD DIAMOND
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12} sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flexGrow: 1, mr: 2 }}>
          Est. {activeTab.startsWith('primary') ? 'Primary' : 'Secondary'} {activeTab.includes('diamond') ? 'Diamond' : 'Stone'} Value: ${estimatedItems.filter(item => item.type === (activeTab.includes('diamond') ? 'Diamond' : 'Stone')).reduce((total, stone) => total + stone.estimatedValue, 0).toFixed(2)}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => {
            if (activeTab.startsWith('primary')) {
              setActiveTab('secondary_gem_diamond');
            } else {
              setActiveTab('primary_gem_diamond');
            }
          }}
        >
          {activeTab.startsWith('primary') ? 'Secondary' : 'Primary'} {activeTab.includes('diamond') ? 'Diamond' : 'Stone'}
        </Button>
      </Grid>
    </Grid>
  );

  const calculateStoneValue = () => {
    // This is a simplified placeholder. Have to replace with actual valuation logic
    const baseValues = {
      'Ruby': 1000,
      'Sapphire': 800,
      'Emerald': 1200,
      'Amethyst': 100,
      'Topaz': 150,
      'Opal': 200,
      'Tanzanite': 650,
      'Aquamarine': 300,
      'Tourmaline': 400
    };

    const colorMultipliers = {
      'Pigeon Blood Red': 2.5,
      'Blue': 1.8,
      'Deep Green': 2.0,
      // Add more color multipliers
    };

    const baseValue = baseValues[getCurrentStoneForm().name] || 500;
    const colorMultiplier = colorMultipliers[getCurrentStoneForm().color] || 1;
    const weightMultiplier = Math.pow(parseFloat(getCurrentStoneForm().weight), 1.5);

    return Math.round(baseValue * colorMultiplier * weightMultiplier);
  };

  const renderTabButtons = () => {
    if (activeTab.startsWith('primary')) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 0, mr: 2 }}>
            ESTIMATE PRIMARY GEM
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControl sx={{ mr: 2 }}>
              <RadioGroup 
                row 
                value={activeTab} 
                onChange={handleTabChange}
              >
                <FormControlLabel 
                  value="primary_gem_diamond" 
                  control={<Radio />} 
                  label="Diamond" 
                />
                <FormControlLabel 
                  value="primary_gem_stone" 
                  control={<Radio />} 
                  label="Stone" 
                />
              </RadioGroup>
            </FormControl>
          </Box>
        </Box>
      );
    } else {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 0, mr: 2 }}>
            EST. SECONDARY GEM
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControl sx={{ mr: 2 }}>
              <RadioGroup 
                row 
                value={activeTab} 
                onChange={handleTabChange}
              >
                <FormControlLabel 
                  value="secondary_gem_diamond" 
                  control={<Radio />} 
                  label="Diamond" 
                />
                <FormControlLabel 
                  value="secondary_gem_stone" 
                  control={<Radio />} 
                  label="Stone" 
                />
              </RadioGroup>
            </FormControl>
          </Box>
        </Box>
      );
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleNextTab = () => {
    if (activeTab < 2) {
      setActiveTab(prevTab => prevTab + 1);
    }
  };

  // Function to determine color category based on exact color
  const getColorCategory = (exactColor) => {
    const colorCategories = [
      { name: 'Colorless', range: 'D-F', start: 'D', end: 'F' },
      { name: 'Near Colorless', range: 'G-J', start: 'G', end: 'J' },
      { name: 'Faint Color', range: 'K-M', start: 'K', end: 'M' },
      { name: 'Very Light Color', range: 'N-R', start: 'N', end: 'R' },
      { name: 'Light Color', range: 'S-Z', start: 'S', end: 'Z' }
    ];

    return colorCategories.find(
      category => exactColor >= category.start && exactColor <= category.end
    )?.name || 'Colorless';
  };

  return (
    <Container maxWidth="lg">
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Metal Estimation Section */}
        <Grid item xs={12} md={3}>
        <MetalEstimator 
                onMetalValueChange={handleTotalMetalValueChange}
                setMetalFormState={handleMetalFormChange} />
        </Grid>
        {/* Diamond Estimation Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '500px', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 0, mr: 2 }}>
                {activeTab.startsWith('primary') ? 'EST. PRIMARY GEM' : 'EST. SECONDARY GEM'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControl sx={{ mr: 2 }}>
                  <RadioGroup 
                    row 
                    value={activeTab} 
                    onChange={handleTabChange}
                  >
                    {activeTab.startsWith('primary') ? (
                      <>
                        <FormControlLabel 
                          value="primary_gem_diamond" 
                          control={<Radio />} 
                          label="Diamond" 
                        />
                        <FormControlLabel 
                          value="primary_gem_stone" 
                          control={<Radio />} 
                          label="Stone" 
                        />
                      </>
                    ) : (
                      <>
                        <FormControlLabel 
                          value="secondary_gem_diamond" 
                          control={<Radio />} 
                          label="Diamond" 
                        />
                        <FormControlLabel 
                          value="secondary_gem_stone" 
                          control={<Radio />} 
                          label="Stone" 
                        />
                      </>
                    )}
                  </RadioGroup>
                </FormControl>
              </Box>
            </Box>
            
            {(activeTab === 'primary_gem_diamond' || activeTab === 'secondary_gem_diamond') && (
              <Box>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={6} sm={5}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      name="quantity"
                      type="number"
                      value={getCurrentForm().quantity}
                      onChange={handleDiamondChange}
                      inputProps={{ min: "1" }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={7}>
                  <Box sx={{ ml: 3 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={getCurrentForm().labGrown}
                          onChange={(e) => setCurrentForm(prev => ({
                            ...prev, 
                            labGrown: e.target.checked
                          }))}
                          name="labGrown"
                        />
                      }
                      label="Lab Grown"
                    />
                  </Box>
                  </Grid>
                </Grid>
                <Box sx={{ mb: 3 }}></Box>
                {/* Shape Selection */}
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Shape *</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  {diamondShapes.map((shape) => (
                    <Paper
                      key={shape.name}
                      elevation={getCurrentForm().shape === shape.name ? 8 : 1}
                      sx={{
                        p: 1,
                        cursor: 'pointer',
                        width: 80,
                        height: 80,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={() => {
                        // Simulate an event object similar to a form input
                        const event = {
                          target: {
                            name: 'shape',
                            value: shape.name
                          }
                        };
                        
                        // Update current form and call handleDiamondChange
                        setCurrentForm(prev => ({ ...prev, shape: shape.name }));
                        handleDiamondChange(event);
                      }}
                    >
                      <Box
                        component="img"
                        src={shape.image}
                        alt={shape.name}
                        sx={{ width: 40, height: 40 }}
                      />
                      <Typography variant="caption" align="center">
                        {shape.name}
                      </Typography>
                    </Paper>
                  ))}
                </Box>

                {/* Size Section */}
                <Grid container spacing={1} sx={{ mb: 0.5, alignItems: 'center' }}>
                  <Grid item>
                    <Typography variant="subtitle1" sx={{ mb: 0 }}>Size</Typography>
                  </Grid>
                  {getCurrentForm().quantity > 1 && (
                    <Grid item>
                      <FormControl sx={{ minWidth: 120 }}>
                        <Select
                          value={diamondValuationType}
                          onChange={handleDiamondValuationTypeChange}
                          displayEmpty
                          size="small"
                          sx={{
                            '& .MuiOutlinedInput-notchedOutline': {
                              border: 'none'
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              border: 'none'
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              border: 'none'
                            }
                          }}
                        >
                          <MenuItem value="each">Each</MenuItem>
                          <MenuItem value="total">Total</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                </Grid>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Weight (carats) *"
                      name="weight"
                      type="number"
                      value={getCurrentForm().weight}
                      onChange={handleDiamondChange}
                      inputProps={{ step: "0.01", min: "0" }}
                    />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        {/* Size Dropdown */}
                    <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
                      <InputLabel>Diamond Size</InputLabel>
                      <Select
                        fullWidth
                        displayEmpty
                        value={getCurrentForm().size || ''}
                        name="size"
                        onChange={(e) => {
                          const selectedSize = e.target.value;
                          
                          // Find the selected size object
                          const selectedSizeObj = diamondSizes.find(sizeObj => sizeObj.size === selectedSize);
                          
                          // Update the form with selected size and weight
                          setCurrentForm(prev => ({
                            ...prev, 
                            size: selectedSize,
                            weight: selectedSizeObj ? selectedSizeObj.weight : 0
                          }));
                        }}
                      >
                        {diamondSizes.map((sizeObj) => (
                          <MenuItem key={sizeObj.size} value={sizeObj.size}>
                            {sizeObj.size}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                </Grid>
                  </Grid>

                {/* Color Selection */}
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Color *</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  {diamondColors.map((color) => (
                    <Paper
                      key={color.name}
                      elevation={
                        // Highlight if the current exact color falls in this category
                        getColorCategory(exactColor) === color.name ? 8 : 1
                      }
                      sx={{
                        p: 1,
                        cursor: 'pointer',
                        width: 80,
                        height: 80,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: color.color,
                        transition: 'all 0.3s ease',
                      }}
                      onClick={() => {
                        // When clicking, set the exact color to the start of the range
                        const startColor = color.range.split('-')[0];
                        setCurrentForm(prev => ({ 
                          ...prev, 
                          color: color.name,
                          exactColor: startColor
                        }));
                        // Update exact color state
                        setExactColor(startColor);
                      }}
                    >
                      <Typography variant="caption" align="center" sx={{ mt: 1 }}>
                        {color.name}
                      </Typography>
                      <Typography variant="caption" align="center">
                        {color.range}
                      </Typography>
                    </Paper>
                  ))}
                </Box>

                {/* Color Scale Slider */}
                <Box sx={{ width: '100%', px: 2, mt: 2 }}>
                  <Typography gutterBottom>
                    Exact Color: {exactColor}
                  </Typography>
                  <Slider
                    value={colorScale.indexOf(exactColor)}
                    onChange={handleExactColorChange}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => colorScale[value]}
                    step={1}
                    marks
                    min={0}
                    max={colorScale.length - 1}
                  />
                </Box>

                {/* Clarity Selection */}
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Clarity *</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  {diamondClarity.map((clarity) => (
                    <Paper
                      key={clarity.name}
                      elevation={getCurrentForm().clarity === clarity.name ? 8 : 1}
                      sx={{
                        p: 1,
                        cursor: 'pointer',
                        width: 80,
                        height: 80,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={() => setCurrentForm(prev => ({ ...prev, clarity: clarity.name }))}
                    >
                      <Box
                        component="img"
                        src={clarity.image}
                        alt={clarity.name}
                        sx={{ width: 40, height: 40 }}
                      />
                      <Typography variant="caption" align="center">
                        {clarity.name}
                      </Typography>
                    </Paper>
                  ))}
                </Box>

                {renderDiamondEstimationTab()}
              </Box>
            )}

            {(activeTab === 'primary_gem_stone' || activeTab === 'secondary_gem_stone') && (
              <Box>
                {renderStoneEstimationTab()}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Summary Section */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '500px', overflow: 'auto' }}>
          <Typography variant="h6">Price Estimates</Typography>
            <Typography variant="body2">Pawn: ${estimates.pawn.toFixed(2)}</Typography>
            <Typography variant="body2">Buy: ${estimates.buy.toFixed(2)}</Typography>
            <Typography variant="body2">Retail: ${estimates.retail.toFixed(2)}</Typography>

            <Typography variant="h6">SUMMARY</Typography>
            <Typography variant="subtitle1">Metal</Typography>
            <Typography variant="body2">Type: {metalFormState.type}</Typography>
            <Typography variant="body2">Purity: {metalFormState.purity.purity || metalFormState.purity.value}</Typography>
            <Typography variant="body2">Category: {metalFormState.metalCategory}</Typography>
            <Typography variant="body2">Color: {metalFormState.jewelryColor}</Typography>
            <Typography variant="body2">Weight: {metalFormState.weight}g</Typography>

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
              {activeTab.startsWith('primary') ? 'Primary' : 'Secondary'} {activeTab.includes('diamond') ? 'Diamond' : 'Stone'}
            </Typography>
            {activeTab.includes('diamond') ? (
              <>
                <Typography variant="body2">Shape: {activeTab.startsWith('primary') ? primaryDiamondForm.shape : secondaryDiamondForm.shape}</Typography>
                <Typography variant="body2">Clarity: {activeTab.startsWith('primary') ? primaryDiamondForm.clarity : secondaryDiamondForm.clarity}</Typography>
                <Typography variant="body2">Color: {activeTab.startsWith('primary') ? primaryDiamondForm.color : secondaryDiamondForm.color}</Typography>
                <Typography variant="body2">Cut: {activeTab.startsWith('primary') ? primaryDiamondForm.cut : secondaryDiamondForm.cut}</Typography>
                <Typography variant="body2">Weight: {activeTab.startsWith('primary') ? primaryDiamondForm.weight : secondaryDiamondForm.weight} ct</Typography>
                <Typography variant="body2">Quantity: {activeTab.startsWith('primary') ? primaryDiamondForm.quantity : secondaryDiamondForm.quantity}</Typography>
                <Typography variant="body2">Lab Grown: {activeTab.startsWith('primary') ? (primaryDiamondForm.labGrown? 'Yes' : 'No') : (secondaryDiamondForm.labGrown ? 'Yes' : 'No')}</Typography>
                <Typography variant="body2">Exact Color: {activeTab.startsWith('primary') ? primaryDiamondForm.exactColor : secondaryDiamondForm.exactColor}</Typography>
              </>
            ) : (
              <>
                <Typography variant="body2">Type: {activeTab.startsWith('primary') ? primaryStoneForm.name : secondaryStoneForm.name}</Typography>
                <Typography variant="body2">Shape: {activeTab.startsWith('primary') ? primaryStoneForm.shape : secondaryStoneForm.shape}</Typography>
                <Typography variant="body2">Color: {activeTab.startsWith('primary') ? primaryStoneForm.color : secondaryStoneForm.color}</Typography>
                <Typography variant="body2">Weight: {activeTab.startsWith('primary') ? primaryStoneForm.weight : secondaryStoneForm.weight} ct</Typography>
                <Typography variant="body2">Quantity: {activeTab.startsWith('primary') ? primaryStoneForm.quantity : secondaryStoneForm.quantity}</Typography>
                <Typography variant="body2">Authentic: {activeTab.startsWith('primary') ? primaryStoneForm.authentic? 'Yes' : 'No' : secondaryStoneForm.authentic? 'Yes' : 'No'}</Typography>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={1} sx={{ mt: 3 }}>
        {/* Estimated Items Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mt: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Estimated Items</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Weight</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {estimatedItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.weight}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => {
                            const newItems = [...estimatedItems];
                            newItems.splice(index, 1);
                            setEstimatedItems(newItems);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

    </Container>
  );
}

export default GemEstimator;
