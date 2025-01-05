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
  RadioGroup,
  Tab,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import MetalEstimator from './MetalEstimator';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import CloudUpload from '@mui/icons-material/CloudUpload';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import CloseIcon from '@mui/icons-material/Close';

function GemEstimator() {
  const [metalFormState, setMetalFormState] = useState({});
  const [totalMetalValue, setTotalMetalValue] = useState(0);
  const [addMetal, setAddMetal] = useState([]);

  const handleMetalFormChange = (formState) => {
      setMetalFormState(formState);
  };

  const handleTotalMetalValueChange = (value) => {
      setTotalMetalValue(value);
  };

  const handleAddMetal = (newItem) => {
    setAddMetal(prev => [...prev, newItem]); 
  };

  const handleDeleteMetal = (index) => {
    setAddMetal(prev => prev.filter((_, i) => i !== index)); // Deletes the selected metal
  };

  const handleDeleteGem = (index, type, isPrimary) => {
    const gemPosition = isPrimary ? 'primary' : 'secondary';
    console.log("gem", gemPosition, isPrimary,type);
  
    if (type === 'diamond') {
      setDiamondSummary(prev => prev.filter((_, i) => i !== index));
    } else {
      setStoneSummary(prev => prev.filter((_, i) => i !== index));
    }
        
    // Clear the gem type when deleted
    setAddedGemTypes(prev => ({
      ...prev,
      [gemPosition]: null
    }));
  };

  const handleFinishEstimation = () => {
    const newItem = {
      weight: addMetal[0].weight,
      purity: addMetal[0].purity?.purity || addMetal[0].purity.value,
      type: addMetal[0].preciousMetalType + " " +  addedGemTypes.primary + " " + addedGemTypes.secondary,
      category: addMetal[0].metalCategory,
      priceEstimates: {
        pawn: priceEstimates.pawn,
        buy: priceEstimates.buy,
        retail: priceEstimates.retail
      }
    };
    setEstimatedItems(prev => [...prev, newItem]);

    // Clear all summaries
    setAddMetal([]);
    setDiamondSummary([]);
    setStoneSummary([]);
    setAddedGemTypes({
      primary: null,
      secondary: null
    });
  };

  const [addedGemTypes, setAddedGemTypes] = useState({
    primary: null,  // can be 'diamond' or 'stone'
    secondary: null // can be 'diamond' or 'stone'
  });

  const [diamondSummary, setDiamondSummary] = useState([]);

  const [stoneSummary, setStoneSummary] = useState([]);

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
  const [priceEstimates, setPriceEstimates] = useState({
    pawn: 0,
    buy: 0,
    retail: 0
  });
  const [priceEstimatePercentages, setPriceEstimatePercentages] = useState({
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

  const [stoneColors, setStoneColors] = useState([]);

  useEffect(() => {
    const savedSettings = localStorage.getItem('priceEstimateSettings');
    if (savedSettings) {
      setPriceEstimatePercentages(JSON.parse(savedSettings));
    }
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

        // Fetch Stone Colors
        const stoneColorsResponse = await axios.get('http://localhost:5000/api/stone_color');
        setStoneColors(stoneColorsResponse.data);

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
    setPriceEstimates({
      pawn: totalValue * (priceEstimatePercentages.pawn / 100),
      buy: totalValue * (priceEstimatePercentages.buy / 100),
      retail: totalValue * (priceEstimatePercentages.retail / 100)
    });
  }, [totalMetalValue, totalDiamondValue, priceEstimatePercentages]);

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

  const [images, setImages] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = React.useRef(null);
  const [stream, setStream] = useState(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Clean up camera resources when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Handle video initialization when showCamera changes
  useEffect(() => {
    if (showCamera && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play().then(() => {
          setIsVideoReady(true);
        }).catch(err => {
          console.error("Error playing video:", err);
        });
      };
    }
  }, [showCamera, stream]);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newImages = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: 'upload'
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const startCamera = async () => {
    setIsVideoReady(false); // Reset video ready state
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please make sure you have given permission.");
    }
  };

  const stopCamera = () => {
    setIsVideoReady(false);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setShowCamera(false);
  };

  const captureImage = () => {
    if (!videoRef.current || !isVideoReady) {
      console.log("Video ref:", videoRef.current, "Ready:", isVideoReady);
      alert("Camera is not ready yet. Please wait a moment.");
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(blob => {
        if (!blob) {
          alert("Failed to capture image. Please try again.");
          return;
        }
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const newImage = {
          file,
          url: URL.createObjectURL(file),
          type: 'capture'
        };
        setImages(prev => [...prev, newImage]);
        stopCamera();
      }, 'image/jpeg', 0.8);
    } catch (err) {
      console.error("Error capturing image:", err);
      alert("Failed to capture image. Please try again.");
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
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
    const isPrimary = activeTab.startsWith('primary');
  
  // Check if we can add this type of gem
    const gemPosition = isPrimary ? 'primary' : 'secondary';
    if (addedGemTypes[gemPosition] === 'stone') {
      alert(`Please delete the existing ${gemPosition} stone before adding a diamond`);
      return;
    }
    const newItem = {
      shape: currentForm.shape,
      clarity: currentForm.clarity,
      color: currentForm.color,
      exactColor: currentForm.exactColor,
      cut: currentForm.cut,
      size: currentForm.size,
      weight: currentForm.weight,
      quantity: currentForm.quantity,
      labGrown: currentForm.labGrown,
      isPrimary: activeTab.startsWith('primary'),
      type: 'diamond'
    };

    setDiamondSummary(prev => [...prev, newItem]);
    setAddedGemTypes(prev => ({
      ...prev,
      [gemPosition]: 'diamond'
    }));
    
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
    const isPrimary = activeTab.startsWith('primary');

    // Check if we can add this type of gem
    const gemPosition = isPrimary ? 'primary' : 'secondary';
    if (addedGemTypes[gemPosition] === 'diamond') {
      alert(`Please delete the existing ${gemPosition} diamond before adding a stone`);
      return;
    }
    const newStone = {
      name:  currentForm.name,
      shape: currentForm.shape,
      weight: currentForm.weight+' ct',
      color: currentForm.color,
      quantity: currentForm.quantity,
      authentic: currentForm.authentic,
      isPrimary: activeTab.startsWith('primary'),
      type: 'stone'
    };

    setStoneSummary(prev => [...prev, newStone]);
    setAddedGemTypes(prev => ({
      ...prev,
      [gemPosition]: 'stone'
    }));

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
              <FormControl fullWidth>
                  <Typography variant="subtitle1"  sx={{ mb: 1}}>Color *</Typography>
                  <Grid container sx={{  border: '1px solid black',   boxSizing: 'border-box'}}>
                      {stoneColors.map((color, index) => (
                          <Grid item xs={6} key={color.id}>
                              <Paper
                                  onClick={() => {
                                      setCurrentStoneForm(prev => ({
                                          ...prev,
                                          color: color.color
                                      }));
                                  }}

                                  sx={{
                                      p: 1.5,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      textAlign: 'center',
                                      border: '1px solid black',
                                      borderRadius: 0,
                                      backgroundColor: getCurrentStoneForm().color === color.color ? 'mediumseagreen':'none'
                                    }}
                              >
                                  {color.color}
                              </Paper>
                          </Grid>
                      ))}
                  </Grid>
              </FormControl>
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
          Est. {activeTab.startsWith('primary') ? 'Primary' : 'Secondary'} {activeTab.includes('diamond') ? 'Diamond' : 'Stone'} Value: 0
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
          Est. {activeTab.startsWith('primary') ? 'Primary' : 'Secondary'} {activeTab.includes('diamond') ? 'Diamond' : 'Stone'} Value: 0
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

  // Add state for transaction types
  const [itemTransactionTypes, setItemTransactionTypes] = useState({});

  // Add handler for transaction type change
  const handleTransactionTypeChange = (index, value) => {
    setItemTransactionTypes(prev => ({
      ...prev,
      [index]: value
    }));
  };

  useEffect(() => {
    // Set default transaction type to 'pawn' for new items
    setItemTransactionTypes(prev => {
      const newTypes = { ...prev };
      estimatedItems.forEach((_, index) => {
        if (!newTypes[index]) {
          newTypes[index] = 'pawn';
        }
      });
      return newTypes;
    });
  }, [estimatedItems]);

  // Add state for edited prices
  const [editedPrices, setEditedPrices] = useState({});

  // Add handler for price change
  const handlePriceChange = (index, value) => {
    const numValue = parseFloat(value) || 0;
    setEditedPrices(prev => ({
      ...prev,
      [index]: numValue
    }));
  };

  useEffect(() => {
    // Initialize edited prices with default values
    setEditedPrices(prev => {
      const newPrices = { ...prev };
      estimatedItems.forEach((item, index) => {
        if (!newPrices[index]) {
          newPrices[index] = item.priceEstimates.pawn;
        }
      });
      return newPrices;
    });
  }, [estimatedItems]);

  // Add states for dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [itemDetails, setItemDetails] = useState({});

  // Add handlers for dialog
  const handleOpenDialog = (index) => {
    setSelectedItemIndex(index);
    setItemDetails(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        brand: prev[index]?.brand || '',
        additionalInfo: prev[index]?.additionalInfo || '',
        isVintage: prev[index]?.isVintage || false,
        stamps: prev[index]?.stamps || ''
      }
    }));
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItemIndex(null);
  };

  const handleDetailChange = (field, value) => {
    if (selectedItemIndex === null) return;
    
    setItemDetails(prev => ({
      ...prev,
      [selectedItemIndex]: {
        ...prev[selectedItemIndex],
        [field]: value
      }
    }));
  };

  return (
    <Container maxWidth="lg">
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Metal Estimation Section */}
        <Grid item xs={12} md={3}>
        <MetalEstimator 
                onMetalValueChange={handleTotalMetalValueChange}
                onAddMetal={handleAddMetal}
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
          <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Typography variant="h6">Images</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUpload />}
                sx={{ flex: 1 }}
              >
                Upload
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                />
              </Button>
              <Button
                variant="outlined"
                onClick={showCamera ? stopCamera : startCamera}
                startIcon={<PhotoCamera />}
                sx={{ flex: 1 }}
              >
                {showCamera ? 'Stop' : 'Camera'}
              </Button>
            </Box>

            {/* Camera Preview */}
            {showCamera && (
              <Box sx={{ position: 'relative', mb: 2 }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{ width: '100%', borderRadius: '8px' }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <Button
                    variant="contained"
                    onClick={captureImage}
                    startIcon={<PhotoCamera />}
                    size="small"
                  >
                    Capture
                  </Button>
                </Box>
              </Box>
            )}

            {/* Image Gallery */}
            {images.length > 0 && (
              <ImageList sx={{ width: '100%', height: 200, mb: 2 }} cols={2} rowHeight={100}>
                {images.map((image, index) => (
                  <ImageListItem key={index} sx={{ position: 'relative' }}>
                    <img
                      src={image.url}
                      alt={`Uploaded ${index + 1}`}
                      loading="lazy"
                      style={{ height: '100%', objectFit: 'cover' }}
                    />
                    <IconButton
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
                      }}
                      size="small"
                      onClick={() => removeImage(index)}
                    >
                      <CloseIcon sx={{ color: 'white' }} fontSize="small" />
                    </IconButton>
                  </ImageListItem>
                ))}
              </ImageList>
            )}

            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6">Price Estimates</Typography>
            <Typography variant="body2">Pawn: ${priceEstimates.pawn.toFixed(2)}</Typography>
            <Typography variant="body2">Buy: ${priceEstimates.buy.toFixed(2)}</Typography>
            <Typography variant="body2">Retail: ${priceEstimates.retail.toFixed(2)}</Typography>

            <Typography variant="h6" sx={{ mt: 2 }}>SUMMARY</Typography>
            <Grid container spacing={2} >
            {addMetal.map((metal, index) => (
                <Grid item xs={12} key={index}>
                    <Paper sx={{ p: 2, border: '1px solid black', borderRadius: 1, position: 'relative' }}>
                      <div>
                        <Typography variant="subtitle2">Metal</Typography>
                        <Typography variant="body2">Precious Metal Type: {metal.preciousMetalType}</Typography>
                        <Typography variant="body2">Non Precious Metal Type: {metal.nonPreciousMetalType}</Typography>
                        <Typography variant="body2">Purity: {metal.purity.purity || metal.purity.value}</Typography>
                        <Typography variant="body2">Category: {metal.metalCategory}</Typography>
                        <Typography variant="body2">Color: {metal.jewelryColor}</Typography>
                        <Typography variant="body2">Weight: {metal.weight}g</Typography>
                        <Typography variant="body2">Estimated Value: ${metal.estimatedValue.toFixed(2)}</Typography>
                        </div>
                        <IconButton variant="outlined" onClick={() => handleDeleteMetal(index)}
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  minWidth: 'auto'
                              }}
                          >
                              <DeleteIcon />
                          </IconButton>
                    </Paper>
                </Grid>
            ))}
        </Grid>

            <Grid container spacing={2} sx={{ mt: 0.25 }}>
                {diamondSummary.map((diamond, index) => (
                    <Grid item xs={12} key={index}>
                        <Paper sx={{ p: 2, border: '1px solid black', borderRadius: 1, position: 'relative'}}>
                          <div>
                            <Typography variant="subtitle2">{diamond.isPrimary ? 'Primary' : 'Secondary'} Diamond</Typography>
                            <Typography variant="body2">Shape: {diamond.shape}</Typography>
                            <Typography variant="body2">Clarity: {diamond.clarity}</Typography>
                            <Typography variant="body2">Color: {diamond.color}</Typography>
                            <Typography variant="body2">Cut: {diamond.cut}</Typography>
                            <Typography variant="body2">Weight: {diamond.weight}</Typography>
                            <Typography variant="body2">Quantity: {diamond.quantity}</Typography>
                            <Typography variant="body2">Lab Grown: {diamond.labGrown ? 'Yes' : 'No'}</Typography>
                            <Typography variant="body2">Exact Color: {diamond.exactColor}</Typography>
                          </div>
                          <IconButton variant="outlined" onClick={() => handleDeleteGem(index, diamond.type, diamond.isPrimary)}
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  minWidth: 'auto'
                              }}
                          >
                              <DeleteIcon />
                          </IconButton>
                          </Paper>
                    </Grid>
                ))}
            </Grid>
            
            <Grid container spacing={2} sx={{ mt: 0.25 }}>
                {stoneSummary.map((stone, index) => (
                    <Grid item xs={12} key={index}>
                        <Paper sx={{ p: 2, border: '1px solid black', borderRadius: 1, position: 'relative'}}>
                          <div>
                            <Typography variant="subtitle2">{stone.isPrimary ? 'Primary' : 'Secondary'} Stone</Typography>
                            <Typography variant="body2">Type: {stone.name}</Typography>
                            <Typography variant="body2">Shape: {stone.shape}</Typography>
                            <Typography variant="body2">Color: {stone.color}</Typography>
                            <Typography variant="body2">Weight: {stone.weight}</Typography>
                            <Typography variant="body2">Quantity: {stone.quantity}</Typography>
                            <Typography variant="body2">Authentic: {stone.authentic ? 'Yes' : 'No'}</Typography>
                            </div>
                            <IconButton variant="outlined" onClick={() => handleDeleteGem(index, stone.type, stone.isPrimary)}
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  minWidth: 'auto'
                              }}
                          >
                              <DeleteIcon />
                          </IconButton>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Finish Button */} 
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleFinishEstimation}
              disabled={addMetal.length === 0}
              fullWidth
            >
              Finish
            </Button>
          </Box>
    </Paper>
</Grid>
      </Grid>

      <Grid container spacing={1} sx={{ mt: 3 }}>
        {/* Estimated Items Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mt: 3, mb: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Estimated Items</Typography>
              <Typography variant="body2" color="text.secondary">
                {estimatedItems.length} {estimatedItems.length === 1 ? 'item' : 'items'}
              </Typography>
            </Box>
            
            {estimatedItems.length === 0 ? (
              <Box sx={{ 
                py: 6, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                bgcolor: 'grey.50',
                borderRadius: 1
              }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  No items estimated yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Complete your estimation above to see items here
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Transaction Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Price</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {estimatedItems.map((item, index) => (
                      <TableRow 
                        key={index}
                        onClick={() => handleOpenDialog(index)}
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            bgcolor: 'action.hover',
                            '& .action-buttons': {
                              opacity: 1
                            }
                          }
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box>
                              <Typography sx={{ fontWeight: 500, mb: 0.5 }}>
                                {item.weight}g {item.purity} {item.type}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {item.category}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={itemTransactionTypes[index] || 'pawn'}
                            onChange={(e) => handleTransactionTypeChange(index, e.target.value)}
                            size="small"
                            sx={{ 
                              minWidth: 150,
                              '& .MuiSelect-select': {
                                py: 1
                              }
                            }}
                          >
                            <MenuItem value="pawn">
                              <Box>
                                <Typography variant="body2">Pawn</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ${item.priceEstimates.pawn.toFixed(2)}
                                </Typography>
                              </Box>
                            </MenuItem>
                            <MenuItem value="buy">
                              <Box>
                                <Typography variant="body2">Buy</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ${item.priceEstimates.buy.toFixed(2)}
                                </Typography>
                              </Box>
                            </MenuItem>
                            <MenuItem value="retail">
                              <Box>
                                <Typography variant="body2">Retail</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ${item.priceEstimates.retail.toFixed(2)}
                                </Typography>
                              </Box>
                            </MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <TextField 
                            type="number"
                            value={editedPrices[index] || item.priceEstimates[itemTransactionTypes[index] || 'pawn']}
                            onChange={(e) => handlePriceChange(index, e.target.value)}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                              sx: {
                                '& input': {
                                  py: 1
                                }
                              }
                            }}
                            size="small"
                            sx={{ width: 150 }}
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Box className="action-buttons" sx={{ 
                            opacity: 0.7,
                            transition: 'opacity 0.2s',
                            display: 'flex',
                            gap: 1 
                          }}>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(index);
                              }}
                              size="small"
                              sx={{ color: 'primary.main' }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                const newItems = [...estimatedItems];
                                newItems.splice(index, 1);
                                setEstimatedItems(newItems);
                              }}
                              size="small"
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={1} sx={{ mt: 3 }}>
        {/* Remove the standalone image section */}
      </Grid>

      {/* Details Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Item Details</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Brand"
              value={selectedItemIndex !== null ? itemDetails[selectedItemIndex]?.brand || '' : ''}
              onChange={(e) => handleDetailChange('brand', e.target.value)}
              fullWidth
            />
            <TextField
              label="Additional Information/Damages"
              value={selectedItemIndex !== null ? itemDetails[selectedItemIndex]?.additionalInfo || '' : ''}
              onChange={(e) => handleDetailChange('additionalInfo', e.target.value)}
              multiline
              rows={4}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedItemIndex !== null ? itemDetails[selectedItemIndex]?.isVintage || false : false}
                  onChange={(e) => handleDetailChange('isVintage', e.target.checked)}
                />
              }
              label="Vintage"
            />
            <TextField
              label="Stamps/Engraving"
              value={selectedItemIndex !== null ? itemDetails[selectedItemIndex]?.stamps || '' : ''}
              onChange={(e) => handleDetailChange('stamps', e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default GemEstimator;
