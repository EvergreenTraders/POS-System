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
  FormGroup,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

function Estimator() {
  const [metalForm, setMetalForm] = useState({
    type: '',
    metalCategory: '',
    jewelryColor: '',
    weight: '',
    price: '',
    purity: { purity: '', value: 0 }
  });

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

  const [primaryStoneForm, setPrimaryStoneForm] = useState({
    quantity: 1,
    name: '',
    shape: '',
    color: '',
    weight: '',
    width: '',
    depth: '',
    valuationType: 'each'
  });

  const [secondaryStoneForm, setSecondaryStoneForm] = useState({
    quantity: 1,
    name: '',
    shape: '',
    color: '',
    weight: '',
    width: '',
    depth: '',
    valuationType: 'each'
  });

  const [stoneForm, setStoneForm] = useState({
    quantity: 1,
    name: '',
    shape: '',
    color: '',
    weight: '',
    width: '',
    depth: '',
    valuationType: 'each'
  });

  const [estimatedItems, setEstimatedItems] = useState([]);
  const [totalDiamondValue, setTotalDiamondValue] = useState(0);
  const [totalMetalValue, setTotalMetalValue] = useState(0);
  const [estimates, setEstimates] = useState({
    pawn: 0,
    buy: 0,
    consign: 0,
    trade: 0
  });

  const [metalTypes, setMetalTypes] = useState([]);
  const [metalCategories, setMetalCategories] = useState([]);
  const [metalPurities, setMetalPurities] = useState([]);
  const [diamondValuationType, setDiamondValuationType] = useState('each');

  const [exactColor, setExactColor] = useState('D');

  const colorScale = Array.from({length: 23}, (_, i) => 
    String.fromCharCode(68 + i) // Starting from 'D'
  );

  const [metalColors, setMetalColors] = useState([]);

  const [diamondShapes, setDiamondShapes] = useState([]);

  const [diamondClarity, setDiamondClarity] = useState([]);

  const [diamondSizes, setDiamondSizes] = useState([]);

  const [diamondCuts, setDiamondCuts] = useState([]);

  const [diamondColors, setDiamondColors] = useState([]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
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

        // Fetch Metal Types
        const typesResponse = await axios.get('http://localhost:5000/api/metal_type');
        setMetalTypes(typesResponse.data);

        // Fetch Metal Categories
        const categoriesResponse = await axios.get('http://localhost:5000/api/metal_category');
        setMetalCategories(categoriesResponse.data);

        // Fetch Metal Colors
        const colorsResponse = await axios.get('http://localhost:5000/api/metal_color');
        setMetalColors(colorsResponse.data);

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

  const fetchPurities = async (metalTypeId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/metal_purity/${metalTypeId}`);
      setMetalPurities(response.data);
      console.log("metalPurities", response.data);
    } catch (error) {
      console.error('Error fetching metal purities:', error);
      setMetalPurities([]); // Reset purities if fetch fails
    }
  };

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
      consign: totalValue * 0.8,  // 80% of total value
      trade: totalValue * 0.6     // 60% of total value
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
      weight: currentForm.weight,
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

  const handleMetalChange = (event) => {
    const { name, value } = event.target;
    
    // When metal type changes, fetch corresponding purities
    if (name === 'type') {
      const selectedMetalType = metalTypes.find(type => type.id === value);
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

  const handleStoneChange = (event) => {
    const { name, value } = event.target;
    setStoneForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDiamondValuationTypeChange = (event) => {
    setDiamondValuationType(event.target.value);
  };


  const addMetal = () => {
    // Add metal to estimated items
    const newItem = {
      type: 'Metal',
      description: `${metalForm.type} ${metalForm.metalCategory} ${metalForm.purity?.purity || ''} ${metalForm.jewelryColor}`,
      dimension: `${metalForm.size}`,
      weight: metalForm.weight,
      quantity: 1,
      estimatedValue: totalMetalValue
    };

    setEstimatedItems(prev => [...prev, newItem]);
  };

  const addStone = () => {
    if (stoneForm.name && stoneForm.shape && stoneForm.color && 
        stoneForm.weight && stoneForm.width && stoneForm.depth) {
      const newStone = {
        ...stoneForm,
        id: Date.now(),
        estimatedValue: calculateStoneValue()
      };
      
      setEstimatedItems(prev => [...prev, newStone]);
      
      // Reset form
      setStoneForm({
        quantity: 1,
        name: '',
        shape: '',
        color: '',
        weight: '',
        width: '',
        depth: '',
        valuationType: 'each'
      });
    }
  };

  const calculateMetalValue = () => {
    // Only calculate if all necessary fields are filled
    if (metalForm.weight && metalForm.price && metalForm.purity) {
      const percentageFactor = 0.7; 
      setTotalMetalValue(metalForm.price * metalForm.purity.value * metalForm.weight * percentageFactor);
    }
      
      else {
      // Reset metal value if fields are incomplete
      setTotalMetalValue(0);
    }
  };

  useEffect(() => {
    calculateMetalValue();
  }, [metalForm.weight, metalForm.price, metalForm.purity]);

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
      {/* Quantity */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Quantity"
          type="number"
          value={stoneForm.quantity}
          onChange={(e) => setStoneForm(prev => ({
            ...prev, 
            quantity: parseInt(e.target.value) || 1
          }))}
          InputProps={{
            inputProps: { min: 1, max: 100 }
          }}
        />
      </Grid>

      {/* Stone Name/Type */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Stone Name</InputLabel>
          <Select
            value={stoneForm.name}
            label="Stone Name"
            onChange={(e) => setStoneForm(prev => ({
              ...prev, 
              name: e.target.value,
              color: '' // Reset color when type changes
            }))}
          >
            {[
              'Ruby', 'Sapphire', 'Emerald', 
              'Amethyst', 'Topaz', 'Opal', 
              'Tanzanite', 'Aquamarine', 'Tourmaline'
            ].map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* Stone Shape */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Stone Shape</InputLabel>
          <Select
            value={stoneForm.shape}
            label="Stone Shape"
            onChange={(e) => setStoneForm(prev => ({
              ...prev, 
              shape: e.target.value
            }))}
          >
            {[
              'Round', 'Oval', 'Emerald', 'Pear', 
              'Marquise', 'Princess', 'Cushion', 
              'Radiant', 'Asscher', 'Heart'
            ].map(shape => (
              <MenuItem key={shape} value={shape}>{shape}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* Stone Color (Dynamic based on stone type) */}
      <Grid item xs={12} md={6}>
        <FormControl 
          fullWidth 
          disabled={!stoneForm.name}
        >
          <InputLabel>Stone Color</InputLabel>
          <Select
            value={stoneForm.color}
            label="Stone Color"
            onChange={(e) => setStoneForm(prev => ({
              ...prev, 
              color: e.target.value
            }))}
          >
            {stoneForm.name && {
              'Ruby': ['Pigeon Blood Red', 'Pinkish Red', 'Purplish Red'],
              'Sapphire': ['Blue', 'Yellow', 'Pink', 'White', 'Green'],
              'Emerald': ['Deep Green', 'Bluish Green', 'Yellowish Green'],
              'Amethyst': ['Light Purple', 'Deep Purple', 'Lavender'],
              'Topaz': ['Blue', 'Yellow', 'White', 'Pink'],
              'Opal': ['White', 'Black', 'Fire', 'Crystal'],
              'Tanzanite': ['Blue', 'Violet'],
              'Aquamarine': ['Blue', 'Greenish Blue'],
              'Tourmaline': ['Green', 'Pink', 'Watermelon', 'Blue']
            }[stoneForm.name].map(color => (
              <MenuItem key={color} value={color}>{color}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      {/* Size Section */}
      <Grid container spacing={1} sx={{ mt: 0, mb: 0, alignItems: 'center' }}>
        <Grid item>
          <Typography variant="subtitle1" sx={{ mb: 0 }}>Size</Typography>
        </Grid>
        {stoneForm.quantity > 1 && (
          <Grid item>
            <FormControl sx={{ minWidth: 120 }}>
              <Select
                value={stoneForm.valuationType}
                onChange={(e) => setStoneForm(prev => ({
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
            label="Weight (Carats)"
            type="number"
            value={stoneForm.weight}
            onChange={(e) => setStoneForm(prev => ({
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
            value={stoneForm.width}
            onChange={(e) => setStoneForm(prev => ({
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
            value={stoneForm.depth}
            onChange={(e) => setStoneForm(prev => ({
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
            !stoneForm.name || 
            !stoneForm.shape || 
            !stoneForm.color || 
            !stoneForm.weight || 
            !stoneForm.width || 
            !stoneForm.depth
          }
        >
          Add Stone
        </Button>
      </Grid>

      {/* Estimated Stones Table */}
      {estimatedItems.filter(item => item.type === 'Stone').length > 0 && (
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Estimated Stones</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Qty</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Shape</TableCell>
                  <TableCell>Color</TableCell>
                  <TableCell>Weight (ct)</TableCell>
                  <TableCell>Width (mm)</TableCell>
                  <TableCell>Depth (mm)</TableCell>
                  <TableCell>Est. Value</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {estimatedItems.filter(item => item.type === 'Stone').map((stone) => (
                  <TableRow key={stone.id}>
                    <TableCell>{stone.quantity}</TableCell>
                    <TableCell>{stone.name}</TableCell>
                    <TableCell>{stone.shape}</TableCell>
                    <TableCell>{stone.color}</TableCell>
                    <TableCell>{stone.weight}</TableCell>
                    <TableCell>{stone.width}</TableCell>
                    <TableCell>{stone.depth}</TableCell>
                    <TableCell>${stone.estimatedValue.toLocaleString()}</TableCell>
                    <TableCell>
                      <IconButton 
                        onClick={() => setEstimatedItems(prev => 
                          prev.filter(s => s.id !== stone.id)
                        )}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      )}

      {/* Total Estimated Stone Value */}
      <Grid item xs={12} sx={{ mt: 2 }}>
        <Typography variant="h6">
          Est. Stone Value: $
          {estimatedItems.filter(item => item.type === 'Stone')
            .reduce((total, stone) => total + stone.estimatedValue, 0)
            .toLocaleString()}
        </Typography>
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
                <MenuItem key={cut.name} value={cut.name}>
                  {cut.name}
                </MenuItem>
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
                Finish
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12} sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flexGrow: 1, mr: 2 }}>
          Est. {activeTab.startsWith('primary') ? 'Primary' : 'Secondary'} Gem Value: ${totalDiamondValue.toFixed(2)}
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
          {activeTab.startsWith('primary') ? 'Secondary Gem' : 'Primary Gem'}
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

    const baseValue = baseValues[stoneForm.name] || 500;
    const colorMultiplier = colorMultipliers[stoneForm.color] || 1;
    const weightMultiplier = Math.pow(parseFloat(stoneForm.weight), 1.5);

    return Math.round(baseValue * colorMultiplier * weightMultiplier);
  };

  const renderTabButtons = () => {
    if (activeTab.startsWith('primary')) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant={activeTab === 'primary_gem_diamond' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('primary_gem_diamond')}
            sx={{ mr: 2 }}
          >
            Diamond
          </Button>
          <Button
            variant={activeTab === 'primary_gem_stone' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('primary_gem_stone')}
          >
            Stone
          </Button>
        </Box>
      );
    } else {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant={activeTab === 'secondary_gem_diamond' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('secondary_gem_diamond')}
            sx={{ mr: 2 }}
          >
            Diamond
          </Button>
          <Button
            variant={activeTab === 'secondary_gem_stone' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('secondary_gem_stone')}
          >
            Stone
          </Button>
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
          <Paper sx={{ p: 2, height: '500px', overflow: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>ESTIMATE METAL</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Metal Type *</InputLabel>
              <Select
                name="type"
                value={metalForm.type}
                onChange={handleMetalChange}
                required
              >
                {metalTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>{type.type}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {metalTypes.find(type => type.type === 'Gold')?.id === metalForm.type && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Jewelry Color *</InputLabel>
                <Select
                  name="jewelryColor"
                  value={metalForm.jewelryColor}
                  onChange={handleMetalChange}
                  required
                >
                  {metalColors.map(color => (
                    <MenuItem key={color.id} value={color.id}>{color.color}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Metal Purity *</InputLabel>
              <Select
                name="purity"
                value={metalForm.purity?.id || ''} // Use id for value
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
                value={metalForm.metalCategory}
                onChange={handleMetalChange}
                required
              >
                {metalCategories.map(category => (
                  <MenuItem key={category.id} value={category.id}>{category.category}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Weight (g)"
              name="weight"
              value={metalForm.weight}
              onChange={handleMetalChange}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Spot Price/oz"
              name="price"
              value={metalForm.price}
              onChange={handleMetalChange}
              sx={{ mb: 2 }}
            />

            <Button
              variant="contained"
              onClick={() => addMetal()}
              fullWidth
              sx={{ mt: 2 }}
              disabled={!metalForm.type || !metalForm.purity || !metalForm.metalCategory || (metalTypes.find(type => type.type === 'Gold')?.id === metalForm.type && !metalForm.jewelryColor)}
            >
              Add Metal
            </Button>

            <Typography variant="h6" sx={{ mt: 2 }}>
              Est. Metal Value: ${totalMetalValue.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>

        {/* Diamond Estimation Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '500px', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 0, mr: 2 }}>
                {activeTab.startsWith('primary') ? 'ESTIMATE PRIMARY GEM' : 'ESTIMATE SECONDARY GEM'}
              </Typography>
              
              {renderTabButtons()}
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
            <Typography variant="h6" sx={{ mb: 2 }}>SUMMARY</Typography>
            <Typography variant="subtitle1">Metal Selection</Typography>
            <Typography variant="body2">Type: {metalForm.type}</Typography>
            <Typography variant="body2">Purity: {metalForm.purity.purity}</Typography>
            <Typography variant="body2">Category: {metalForm.metalCategory}</Typography>
            <Typography variant="body2">Color: {metalForm.jewelryColor}</Typography>
            <Typography variant="body2">Weight: {metalForm.weight}g</Typography>

            <Typography variant="subtitle1" sx={{ mt: 2 }}>Primary Gem Diamond Selection</Typography>
            <Typography variant="body2">Shape: {primaryDiamondForm.shape}</Typography>
            <Typography variant="body2">Clarity: {primaryDiamondForm.clarity}</Typography>
            <Typography variant="body2">Color: {primaryDiamondForm.color}</Typography>
            <Typography variant="body2">Cut: {primaryDiamondForm.cut}</Typography>
            <Typography variant="body2">Weight: {primaryDiamondForm.weight} ct</Typography>
            <Typography variant="body2">Quantity: {primaryDiamondForm.quantity}</Typography>
            <Typography variant="body2">Lab Grown: {primaryDiamondForm.labGrown? 'Yes' : 'No'}</Typography>
            <Typography variant="body2">Exact Color: {primaryDiamondForm.exactColor}</Typography>

            <Typography variant="subtitle1" sx={{ mt: 2 }}>Primary Gem Stone Selection</Typography>
            <Typography variant="body2">Name: {primaryStoneForm.name}</Typography>
            <Typography variant="body2">Shape: {primaryStoneForm.shape}</Typography>
            <Typography variant="body2">Color: {primaryStoneForm.color}</Typography>
            <Typography variant="body2">Weight: {primaryStoneForm.weight} ct</Typography>
            <Typography variant="body2">Quantity: {primaryStoneForm.quantity}</Typography>

            <Typography variant="subtitle1" sx={{ mt: 2 }}>Secondary Gem Diamond Selection</Typography>
            <Typography variant="body2">Shape: {secondaryDiamondForm.shape}</Typography>
            <Typography variant="body2">Clarity: {secondaryDiamondForm.clarity}</Typography>
            <Typography variant="body2">Color: {secondaryDiamondForm.color}</Typography>
            <Typography variant="body2">Cut: {secondaryDiamondForm.cut}</Typography>
            <Typography variant="body2">Weight: {secondaryDiamondForm.weight} ct</Typography>
            <Typography variant="body2">Quantity: {secondaryDiamondForm.quantity}</Typography>
            <Typography variant="body2">Lab Grown: {secondaryDiamondForm.labGrown ? 'Yes' : 'No'}</Typography>
            <Typography variant="body2">Exact Color: {secondaryDiamondForm.exactColor}</Typography>

            <Typography variant="subtitle1" sx={{ mt: 2 }}>Secondary Gem Stone Selection</Typography>
            <Typography variant="body2">Name: {secondaryStoneForm.name}</Typography>
            <Typography variant="body2">Shape: {secondaryStoneForm.shape}</Typography>
            <Typography variant="body2">Color: {secondaryStoneForm.color}</Typography>
            <Typography variant="body2">Weight: {secondaryStoneForm.weight} ct</Typography>
            <Typography variant="body2">Quantity: {secondaryStoneForm.quantity}</Typography>

            <Typography variant="subtitle1" sx={{ mt: 2 }}>Price Estimates</Typography>
            <Typography variant="body2">Pawn: ${estimates.pawn.toFixed(2)}</Typography>
            <Typography variant="body2">Buy: ${estimates.buy.toFixed(2)}</Typography>
            <Typography variant="body2">Consign: ${estimates.consign.toFixed(2)}</Typography>
            <Typography variant="body2">Trade: ${estimates.trade.toFixed(2)}</Typography>
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
                    <TableCell>Dimensions</TableCell>
                    <TableCell>Weight</TableCell>
                    <TableCell>Carats</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Lab Grown</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {estimatedItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.dimension}</TableCell>
                      <TableCell>{item.weight}</TableCell>
                      <TableCell>{item.carats}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.labGrown ? 'Yes' : 'No'}</TableCell>
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

export default Estimator;
