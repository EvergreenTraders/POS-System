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
  Slider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

// Diamond shape images
const diamondShapes = [
  { name: 'Round', image: '/images/diamonds/round.png' },
  { name: 'Oval', image: '/images/diamonds/oval.png' },
  { name: 'Heart', image: '/images/diamonds/heart.png' },
  { name: 'Cushion', image: '/images/diamonds/cushion.png' },
  { name: 'Princess', image: '/images/diamonds/princess.png' },
  { name: 'Baguette', image: '/images/diamonds/baguette.png' },
  { name: 'Emerald', image: '/images/diamonds/emerald.png' },
  { name: 'Trillion', image: '/images/diamonds/trillion.png' },
  { name: 'Marquise', image: '/images/diamonds/marquise.png' },
  { name: 'Pear', image: '/images/diamonds/pear.png' },
];

// Diamond clarity images
const diamondClarity = [
  { name: 'Flawless', image: '/images/clarity/fl.png' },
  { name: 'IF', image: '/images/clarity/if.png' },
  { name: 'VVS1/VVS2', image: '/images/clarity/vvs.png' },
  { name: 'VS1/VS2', image: '/images/clarity/vs.png' },
  { name: 'SI1', image: '/images/clarity/si1.png' },
  { name: 'SI2', image: '/images/clarity/si2.png' },
  { name: 'I1', image: '/images/clarity/i1.png' },
  { name: 'I2/I3', image: '/images/clarity/i2.png' },
];

// Diamond color samples
const diamondColors = [
  { 
    name: 'Colorless', 
    color: '#ffffff',
    range: 'D-F'
  },
  { 
    name: 'Near Colorless', 
    color: '#f7f7e8',
    range: 'G-J'
  },
  { 
    name: 'Faint Color', 
    color: '#f7f3d9',
    range: 'K-M'
  },
  { 
    name: 'Very Light Color', 
    color: '#f7efc5',
    range: 'N-R'
  },
  { 
    name: 'Light Color', 
    color: '#f7ebb2',
    range: 'S-Z'
  },
];

// Diamond cut grades
const diamondCuts = [
  { name: 'Excellent', value: 'EX' },
  { name: 'Very Good', value: 'VG' },
  { name: 'Good', value: 'G' },
  { name: 'Fair', value: 'F' },
  { name: 'Poor', value: 'P' },
];

function Estimator() {
  const [metalForm, setMetalForm] = useState({
    metalType: '',
    metalStyle: '',
    type: '',
    jewelryColor: '',
    purity: '',
    metalCategory: '',
    weight: '',
    size: '',
    spotPrice: '',
    scrap: false,
  });

  const [diamondForm, setDiamondForm] = useState({
    shape: '',
    clarity: '',
    color: 'Colorless', // Set default color
    depth: '',
    width: '',
    quantity: 1,
    weight: '',
    cut: '',
    labGrown: false,
    exactColor: 'D' // Set default exact color
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
  const [metalStyles, setMetalStyles] = useState([]);
  const [metalColors, setMetalColors] = useState([]);
  const [metalPurities, setMetalPurities] = useState([]);
  const [metalCategories, setMetalCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  const [diamondValuationType, setDiamondValuationType] = useState('each');

  const [exactColor, setExactColor] = useState('D');

  const colorScale = Array.from({length: 23}, (_, i) => 
    String.fromCharCode(68 + i) // Starting from 'D'
  );

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

  const handleExactColorChange = (event, newValue) => {
    setExactColor(colorScale[newValue]);
    
    // Update the diamond form with the exact color
    setDiamondForm(prev => ({
      ...prev,
      exactColor: colorScale[newValue]
    }));
  };

  useEffect(() => {
    const fetchMetalData = async () => {
      try {
        const typesResponse = await axios.get('http://localhost:5000/api/metal_type');
        const stylesResponse = await axios.get('http://localhost:5000/api/metal_style');
        const colorsResponse = await axios.get('http://localhost:5000/api/metal_color');
        const puritiesResponse = await axios.get('http://localhost:5000/api/metal_purity');
        const categoriesResponse = await axios.get('http://localhost:5000/api/metal_style_category');

        // Check if the responses are successful
        if (typesResponse.status === 200) {
          setMetalTypes(typesResponse.data);
        } else {
          console.error('Failed to fetch metal types:', typesResponse.status);
        }

        if (stylesResponse.status === 200) {
          setMetalStyles(stylesResponse.data);
        } else {
          console.error('Failed to fetch metal styles:', stylesResponse.status);
        }

        if (colorsResponse.status === 200) {
          setMetalColors(colorsResponse.data);
        } else {
          console.error('Failed to fetch metal colors:', colorsResponse.status);
        }

        if (puritiesResponse.status === 200) {
          setMetalPurities(puritiesResponse.data);
        } else {
          console.error('Failed to fetch metal purities:', puritiesResponse.status);
        }
        
        if (categoriesResponse.status === 200) {
          setMetalCategories(categoriesResponse.data);
        } else {
          console.error('Failed to fetch categories:', categoriesResponse.status);
        }
      } catch (error) {
        console.error('Error fetching metal data:', error);
      }
    };

    fetchMetalData();
  }, []);

  const handleCategoryChange = async (event) => {
    const categoryId = event.target.value;
    setSelectedCategory(categoryId);
    console.log("Selected Category:", categoryId);
    try {
      const response = await axios.get(`http://localhost:5000/api/metal_style_subcategory?category_id=${categoryId}`);
      setSubcategories(response.data);
      console.log("Fetched Subcategories:", response.data);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  useEffect(() => {
    // Calculate estimates whenever total values change
    const totalValue = totalMetalValue + totalDiamondValue;
    setEstimates({
      pawn: totalValue * 0.5,    // 50% of total value
      buy: totalValue * 0.7,     // 70% of total value
      consign: totalValue * 0.8,  // 80% of total value
      trade: totalValue * 0.6     // 60% of total value
    });
  }, [totalMetalValue, totalDiamondValue]);

  const handleMetalChange = (event) => {
    const { name, value } = event.target;
    
    if (name === 'purity') {
      // Find the full purity object when purity is selected
      const selectedPurity = metalPurities.find(p => p.id === value);
      setMetalForm(prev => ({
        ...prev,
        purity: selectedPurity // Store the entire purity object
      }));
    } else {
      // For other fields, continue to update as before
      setMetalForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleDiamondChange = (event) => {
    const { name, value } = event.target;
    setDiamondForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDiamondValuationTypeChange = (event) => {
    setDiamondValuationType(event.target.value);
  };

  const addDiamond = () => {
    
    const newItem = {
      type: 'Diamond',
      description: `${diamondForm.shape} ${diamondForm.clarity} ${diamondForm.color} ${diamondForm.exactColor} ${diamondForm.cut}`,
      weight: diamondForm.weight,
      quantity: diamondForm.quantity,
      valuationType: diamondForm.quantity > 1 ? diamondValuationType : 'each',
    };

    setEstimatedItems(prev => [...prev, newItem]);
    
    // Reset diamond form after adding
    setDiamondForm({
      shape: '',
      clarity: '',
      color: 'Colorless',
      depth: '',
      width: '',
      quantity: 1,
      weight: '',
      cut: '',
      labGrown: false,
      exactColor: 'D'
    });
    
    // Reset exact color to default
    setExactColor('D');
    
    // Reset valuation type to default
    setDiamondValuationType('each');
  };

  const addMetal = () => {
    // Add metal to estimated items
    const newItem = {
      type: 'Metal',
      description: `${metalForm.metalType} ${metalForm.metalStyle} ${metalForm.metalCategory} ${selectedSubcategory} ${metalForm.jewelryColor} ${metalForm.purity?.purity || ''}`,
      dimension: `${metalForm.size}`,
      weight: metalForm.weight,
      quantity: 1,
      value: totalMetalValue
    };

    setEstimatedItems(prev => [...prev, newItem]);
  };


  const calculateMetalValue = () => {
    // Only calculate if all necessary fields are filled
    if (metalForm.weight && metalForm.spotPrice && metalForm.purity) {
      const percentageFactor = 0.7; 
      setTotalMetalValue(metalForm.spotPrice * metalForm.purity.value * metalForm.weight * percentageFactor);
    }
      
      else {
      // Reset metal value if fields are incomplete
      setTotalMetalValue(0);
    }
  };

  useEffect(() => {
    calculateMetalValue();
  }, [metalForm.weight, metalForm.spotPrice, metalForm.purity]);


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
                name="metalType"
                value={metalForm.metalType}
                onChange={handleMetalChange}
                required
              >
                {metalTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>{type.type}</MenuItem>
                ))}
              </Select>
            </FormControl>

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
                    {purity.purity}{purity.value !== null ? ` - ${purity.value}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Metal Style</InputLabel>
              <Select
                name="metalStyle"
                value={metalForm.metalStyle}
                onChange={handleMetalChange}
              >
                {metalStyles.map(style => (
                  <MenuItem key={style.id} value={style.id}>{style.style}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Category</InputLabel>
              <Select
                name="metalCategory"
                value={metalForm.metalCategory}
                onChange={handleMetalChange}
              >
                {metalCategories.map(category => (
                  <MenuItem key={category.id} value={category.id}>{category.category_name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Subcategory</InputLabel>
              <Select
                name="subcategory"
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                disabled={!selectedCategory} // Disable if no category is selected
              >
                {subcategories.map(subcategory => (
                  <MenuItem key={subcategory.id} value={subcategory.id}>{subcategory.sub_category}</MenuItem>
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
              name="spotPrice"
              value={metalForm.spotPrice}
              onChange={handleMetalChange}
              sx={{ mb: 2 }}
            />

            <Button
              variant="contained"
              onClick={() => addMetal()}
              fullWidth
              sx={{ mt: 2 }}
              disabled={!metalForm.metalType || !metalForm.jewelryColor || !metalForm.purity}
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
            <Typography variant="h6" sx={{ mb: 2 }}>ESTIMATE DIAMONDS</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6} sm={5}>
                <TextField
                  fullWidth
                  label="Quantity"
                  name="quantity"
                  type="number"
                  value={diamondForm.quantity}
                  onChange={handleDiamondChange}
                  inputProps={{ min: "1" }}
                />
              </Grid>
              <Grid item xs={6} sm={7}>
              <Box sx={{ ml: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={diamondForm.labGrown || false}
                      onChange={(e) => setDiamondForm(prev => ({
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
                  elevation={diamondForm.shape === shape.name ? 8 : 1}
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
                  onClick={() => setDiamondForm(prev => ({ ...prev, shape: shape.name }))}
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
            <Grid container spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
              <Grid item>
                <Typography variant="subtitle1" sx={{ mb: 0 }}>Size</Typography>
              </Grid>
              {diamondForm.quantity > 1 && (
                <Grid item>
                  <FormControl sx={{ minWidth: 120 }}>
                    <Select
                      value={diamondValuationType}
                      onChange={handleDiamondValuationTypeChange}
                      displayEmpty
                      size="small"
                    >
                      <MenuItem value="each">Each</MenuItem>
                      <MenuItem value="total">Total</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Weight (carats) *"
                  name="weight"
                  type="number"
                  value={diamondForm.weight}
                  onChange={handleDiamondChange}
                  inputProps={{ step: "0.01", min: "0" }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Depth (mm)"
                  name="depth"
                  type="number"
                  value={diamondForm.depth}
                  onChange={handleDiamondChange}
                  inputProps={{ step: "0.1" }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Width (mm)"
                  name="width"
                  type="number"
                  value={diamondForm.width}
                  onChange={handleDiamondChange}
                  inputProps={{ step: "0.1" }}
                />
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
                    setDiamondForm(prev => ({ 
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
                  elevation={diamondForm.clarity === clarity.name ? 8 : 1}
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
                  onClick={() => setDiamondForm(prev => ({ ...prev, clarity: clarity.name }))}
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

            {/* Cut Grade */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Cut *</Typography>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <Select
                name="cut"
                value={diamondForm.cut}
                onChange={handleDiamondChange}
                required
              >
                {diamondCuts.map((cut) => (
                  <MenuItem key={cut.name} value={cut.value}>{cut.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Quantity and Add Button */}
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6}>
                <Button
                  variant="contained"
                  onClick={addDiamond}
                  fullWidth
                  sx={{ mt: 2 }}
                  disabled={!diamondForm.shape || !diamondForm.clarity || !diamondForm.color || !diamondForm.cut || !diamondForm.weight}
                >
                  Add Diamond
                </Button>
              </Grid>
              <Grid item xs={6}>
              <Typography variant="h6" sx={{ mb: 2 }}>Est. Diamond Value: ${totalDiamondValue.toFixed(2)}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Summary Section */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '500px', overflow: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>SUMMARY</Typography>
            <Typography variant="subtitle1">Metal Selection</Typography>
            <Typography variant="body2">Type: {metalForm.metalType}</Typography>
            <Typography variant="body2">Style: {metalForm.metalStyle}</Typography>
            <Typography variant="body2">Category: {metalForm.metalCategory}</Typography>
            <Typography variant="body2">Subcategory: {selectedSubcategory}</Typography>
            <Typography variant="body2">Color: {metalForm.jewelryColor}</Typography>
            <Typography variant="body2">Purity: {metalForm.purity.purity}</Typography>
            <Typography variant="body2">Weight: {metalForm.weight}g</Typography>

            <Typography variant="subtitle1" sx={{ mt: 2 }}>Diamond Selection</Typography>
            <Typography variant="body2">Shape: {diamondForm.shape}</Typography>
            <Typography variant="body2">Clarity: {diamondForm.clarity}</Typography>
            <Typography variant="body2">Color: {diamondForm.color}</Typography>
            <Typography variant="body2">Cut: {diamondForm.cut}</Typography>
            <Typography variant="body2">Quantity: {diamondForm.quantity}</Typography>
            <Typography variant="body2">Weight: {diamondForm.weight}ct</Typography>
            <Typography variant="body2">Lab Grown: {diamondForm.labGrown ? 'Yes' : 'No'}</Typography>
            <Typography variant="body2">Exact Color: {diamondForm.exactColor}</Typography>

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
