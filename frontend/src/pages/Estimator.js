import React, { useState } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

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
  { name: 'Colorless', color: '#ffffff' },
  { name: 'Near Colorless', color: '#f7f7e8' },
  { name: 'Faint Color', color: '#f7f3d9' },
  { name: 'Very Light Color', color: '#f7efc5' },
  { name: 'Light Color', color: '#f7ebb2' },
];

function Estimator() {
  const [currentTab, setCurrentTab] = useState(0);
  const [metalForm, setMetalForm] = useState({
    metalType: '',
    metalStyle: '',
    type: '',
    jewelryColor: '',
    purity: '',
    weight: '',
    size: '',
    spotPrice: '',
    scrap: false,
  });

  const [diamondForm, setDiamondForm] = useState({
    shape: '',
    clarity: '',
    color: '',
    length: '',
    width: '',
    quantity: 1,
  });

  const [estimatedItems, setEstimatedItems] = useState([]);
  const [totalDiamondValue, setTotalDiamondValue] = useState(0);
  const [totalMetalValue, setTotalMetalValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleMetalChange = (event) => {
    const { name, value } = event.target;
    setMetalForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDiamondChange = (event) => {
    const { name, value } = event.target;
    setDiamondForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addDiamond = () => {
    // Add diamond to estimated items
    const newItem = {
      type: 'Diamond',
      description: `${diamondForm.shape} ${diamondForm.clarity} ${diamondForm.color}`,
      dimension: `${diamondForm.length}x${diamondForm.width}`,
      carats: calculateCarats(diamondForm.length, diamondForm.width),
      quantity: diamondForm.quantity,
    };
    setEstimatedItems([...estimatedItems, newItem]);
  };

  const calculateCarats = (length, width) => {
    // This is a simplified calculation - you should implement proper carat calculation
    return ((parseFloat(length) * parseFloat(width)) / 100).toFixed(2);
  };

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 2, mb: 2 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="ESTIMATE METAL" />
          <Tab label="ESTIMATE DIAMONDS" />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          {currentTab === 0 ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Metal Type</InputLabel>
                  <Select
                    name="metalType"
                    value={metalForm.metalType}
                    onChange={handleMetalChange}
                  >
                    <MenuItem value="gold">Gold</MenuItem>
                    <MenuItem value="silver">Silver</MenuItem>
                    <MenuItem value="platinum">Platinum</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Metal Style</InputLabel>
                  <Select
                    name="metalStyle"
                    value={metalForm.metalStyle}
                    onChange={handleMetalChange}
                  >
                    <MenuItem value="ring">Ring</MenuItem>
                    <MenuItem value="necklace">Necklace</MenuItem>
                    <MenuItem value="bracelet">Bracelet</MenuItem>
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

                <Typography variant="h6" sx={{ mt: 2 }}>
                  Est. Metal Value: ${totalMetalValue.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
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
                      <Typography variant="caption">{shape.name}</Typography>
                    </Paper>
                  ))}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Length (mm)"
                      name="length"
                      value={diamondForm.length}
                      onChange={handleDiamondChange}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Width (mm)"
                      name="width"
                      value={diamondForm.width}
                      onChange={handleDiamondChange}
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={addDiamond}
                  sx={{ mt: 2 }}
                >
                  Add Diamond
                </Button>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="h6">
                  Est. Diamond Value: ${totalDiamondValue.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>QTY</TableCell>
              <TableCell>DESCRIPTION</TableCell>
              <TableCell>DIMENSION</TableCell>
              <TableCell>CARATS</TableCell>
              <TableCell>GRAMS</TableCell>
              <TableCell>TOTAL</TableCell>
              <TableCell>DEL</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {estimatedItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.dimension}</TableCell>
                <TableCell>{item.carats}</TableCell>
                <TableCell>{item.grams || '-'}</TableCell>
                <TableCell>${item.total || '0.00'}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
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
    </Container>
  );
}

export default Estimator;
