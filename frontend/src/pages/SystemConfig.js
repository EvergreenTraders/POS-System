import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Box,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  InputAdornment
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import config from '../config';

const API_BASE_URL = config.apiUrl;

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2, 0),
  borderRadius: theme.spacing(1),
}));

const ConfigSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ padding: '20px 0' }}>
      {value === index && children}
    </div>
  );
}

function SystemConfig() {
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const [generalSettings, setGeneralSettings] = useState({
    businessName: 'Evergreen POS',
    address: '',
    phone: '',
    email: '',
    currency: 'USD',
    timezone: 'UTC'
  });

  const [securitySettings, setSecuritySettings] = useState({
    requirePasswordChange: true,
    sessionTimeout: 30,
    maxLoginAttempts: 3,
    twoFactorAuth: false,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    lowStockAlerts: true,
    orderConfirmations: true,
    dailyReports: false,
  });

  const [isCameraEnabled, setIsCameraEnabled] = useState(false);

  const [priceEstimates, setPriceEstimates] = useState({});
  const [preciousMetalNames, setPreciousMetalNames] = useState({});
  const [preciousMetalTypeId, setPreciousMetalTypeId] = useState('');
  const [isLivePricing, setIsLivePricing] = useState(false);
  const [isPerDay, setIsPerDay] = useState(false);
  const [isPerTransaction, setIsPerTransaction] = useState(false);
  const [updateMethod, setUpdateMethod] = useState(null);
  const [spotPrices, setSpotPrices] = useState({});
  const [caratConversion, setCaratConversion] = useState(null);
  const [isCaratConversionEnabled, setIsCaratConversionEnabled] = useState(false);
  const [gramsInput, setGramsInput] = useState('');
  const [diamondEstimates, setDiamondEstimates] = useState([]);
  const [quoteExpirationDays, setQuoteExpirationDays] = useState(30);
  const [originalDays, setOriginalDays] = useState(30);
  const [configId, setConfigId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPreciousMetalNames = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/precious_metal_type`);
        const data = response.data;
        const names = {};
        data.forEach(metal => {
          names[metal.id] = metal.type;
        });
        setPreciousMetalNames(names);
      } catch (error) {
        console.error('Error fetching precious metal names:', error);
      }
    };

    const fetchLivePricing = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/live_pricing`);
        const data = response.data;
        setIsLivePricing(data[0].islivepricing);
        setIsPerDay(data[0].per_day);
        setIsPerTransaction(data[0].per_transaction);
      } catch (error) {
        console.error('Error fetching live pricing:', error);
      }
    }
    const fetchSpotPrices = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/spot_prices`);
        const prices = {};
        response.data.forEach(item => {
          prices[item.precious_metal_type_id] = item.spot_price;
        })
        setSpotPrices(prices); 
      } catch (error) {
        console.error('Error fetching spot prices:', error);
      }
    };

    const fetchPriceEstimates = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/price_estimates`);
        const data = response.data;
        const estimates = {};
        data.forEach((estimate) => {
          const metalType = estimate.precious_metal_type_id;
          if (!estimates[metalType]) {
            estimates[metalType] = [];
          }
          estimates[metalType].push(estimate);
        });
        setPriceEstimates(estimates); // Store organized data in state
      } catch (error) {
        console.error('Error fetching price estimates:', error);
      }
    };

    const fetchDiamondEstimates = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/diamond_estimates`);
        setDiamondEstimates(response.data);
      } catch (error) {
        console.error('Error fetching diamond estimates:', error);
        setSnackbar({
          open: true,
          message: 'Failed to fetch diamond estimates',
          severity: 'error',
        });
      }
    };

    const fetchUserPreference = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user_preferences`);
        const cameraPreference = response.data.find(pref => pref.preference_name === 'cameraEnabled');
        setIsCameraEnabled(cameraPreference ? cameraPreference.preference_value === 'true' : false);
        const caratConversionPreference = response.data.find(pref => pref.preference_name === 'caratConversion');
        setIsCaratConversionEnabled(caratConversionPreference ? caratConversionPreference.preference_value === 'true' : false);
      } catch (error) {
        console.error('Error fetching camera preference:', error);
      }
    };

    const fetchCaratConversion = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/carat-conversion`);
        if (response.data && response.data.length > 0) {
          setCaratConversion(response.data[0]);
          setGramsInput(response.data[0].grams.toString());
        }
      } catch (error) {
        console.error('Error fetching carat conversion:', error);
        setSnackbar({
          open: true,
          message: 'Failed to fetch carat conversion data',
          severity: 'error',
        });
      }
    };

    const fetchQuoteExpirationConfig = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/quote-expiration/config`);
        const config = response.data;
        setQuoteExpirationDays(config.days);
        setOriginalDays(config.days);
        setConfigId(config.id);
      } catch (error) {
        console.error('Error fetching quote expiration config:', error);
        if (error.response?.status !== 404) {
          setSnackbar({
            open: true,
            message: 'Failed to fetch quote expiration configuration',
            severity: 'error'
          });
        }
      }
    };

    fetchPreciousMetalNames();
    fetchLivePricing();
    fetchSpotPrices();
    fetchPriceEstimates();
    fetchDiamondEstimates();
    fetchUserPreference();
    fetchCaratConversion();
    fetchQuoteExpirationConfig();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleGeneralSettingsChange = (event) => {
    const { name, value } = event.target;
    setGeneralSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSecuritySettingsChange = (event) => {
    const { name, checked, value } = event.target;
    setSecuritySettings(prev => ({
      ...prev,
      [name]: event.target.type === 'checkbox' ? checked : value
    }));
  };

  const handleNotificationSettingsChange = (event) => {
    const { name, checked } = event.target;
    setNotificationSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSpotPriceChange = (event, metalType) => {
    const { name, value } = event.target;
    setSpotPrices((prev) => ({
      ...prev,
      [metalType]: value
    }));
  };

  const handlePriceEstimatesChange = (event, metalType) => {
    const { name, value } = event.target;
    setPreciousMetalTypeId(metalType); // Save the current metal type ID
    setPriceEstimates((prev) => {
      const updatedEstimates = prev[metalType].map((estimate) => 
        estimate.transaction_type === name ? { ...estimate, estimate: Number(value) } : estimate
      );
      return {
        ...prev,
        [metalType]: updatedEstimates,
      };
    });
  };

  const handleDiamondEstimatesChange = async (event, transactionType) => {
    const { value } = event.target;
    const newValue = Number(value);

    // Update local state first for immediate feedback
    setDiamondEstimates(prevEstimates => 
      prevEstimates.map(estimate => 
        estimate.transaction_type === transactionType 
          ? { ...estimate, estimate: newValue }
          : estimate
      )
    );

    try {
      // Then update the server
      await axios.put(`${API_BASE_URL}/diamond_estimates`, {
        transaction_type: transactionType,
        estimate: newValue
      });
    } catch (error) {
      console.error('Error updating diamond estimates:', error);
      // Revert the local state on error
      setDiamondEstimates(prevEstimates => 
        prevEstimates.map(estimate => 
          estimate.transaction_type === transactionType 
            ? { ...estimate, estimate: estimate.estimate }
            : estimate
        )
      );
      setSnackbar({
        open: true,
        message: 'Failed to update diamond estimate',
        severity: 'error',
      });
    }
  };

  const handleSaveSettings = async () => {

    try {
      // Make a PUT request to update spot prices
      const updateSpotPrices = Object.keys(spotPrices).map(metalType => {
        return axios.put(`${API_BASE_URL}/spot_prices`, {
          precious_metal_type_id: metalType,
          spot_price: spotPrices[metalType],
        });
      });
  
      // Wait for all spot price updates to complete
      await Promise.all(updateSpotPrices);

      // Make a PUT request to update price estimates
      const updatePriceEstimates = Object.keys(priceEstimates).map(metalType => {
        return axios.put(`${API_BASE_URL}/price_estimates`, {
          precious_metal_type_id: metalType,
          estimates: priceEstimates[metalType],
        });
      });
  
      // Wait for all price estimate updates to complete
      await Promise.all(updatePriceEstimates);

      setSnackbar({
        open: true,
        message: 'Settings updated successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      const errorMessage = error.response?.data?.message || 'An unexpected error occurred.';
      setSnackbar({
        open: true,
        message: 'Failed to update settings: ' + errorMessage,
        severity: 'error',
      });
    }
  };

  const handleLivePricingChange = async (event) => {
    const newLivePricing = event.target.checked;
    const selectedValue = event.target.value;

    const newPerDay = selectedValue === 'daily';
    const newPerTransaction = selectedValue === 'transaction';
    setIsLivePricing(newLivePricing);
    setIsPerDay(newPerDay);
    setIsPerTransaction(newPerTransaction);

    try {
      const response = await axios.put(`${API_BASE_URL}/live_pricing`, {
        isLivePricing: newLivePricing,
        per_day: newPerDay,
        per_transaction: newPerTransaction
      });
    } catch (error) {
      console.error('Error updating live pricing:', error);
    }
  };

  const handleCameraToggle = async (event) => {
    const newValue = event.target.checked;
    setIsCameraEnabled(newValue);
    try {
      await axios.put(`${API_BASE_URL}/user_preferences`, {
        name: 'cameraEnabled',
        value: newValue.toString()
      });
    } catch (error) {
      console.error('Error updating camera preference:', error);
      setIsCameraEnabled(!newValue); // Revert on error
      setSnackbar({
        open: true,
        message: 'Failed to update camera settings',
        severity: 'error',
      });
    }
  };

  const handleCaratConversionUpdate = async (newGrams) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/carat-conversion`, {
        grams: parseFloat(newGrams)
      });
      setCaratConversion(response.data);
      setGramsInput(response.data.grams.toString());
      setSnackbar({
        open: true,
        message: 'Carat conversion updated successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error updating carat conversion:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update carat conversion',
        severity: 'error',
      });
    }
  };

  const handleCaratConversionToggle = async (event) => {
    const newValue = event.target.checked;
    setIsCaratConversionEnabled(newValue);
    try {
      await axios.put(`${API_BASE_URL}/user_preferences`, {
        name: 'caratConversion',
        value: newValue.toString()
      });
    } catch (error) {
      console.error('Error updating carat conversion:', error);
      setIsCaratConversionEnabled(!newValue); 
      setSnackbar({
        open: true,
        message: 'Failed to update carat conversion',
        severity: 'error',
      });
    }
  };

  const handleDaysChange = async (event) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= 0) {
      setQuoteExpirationDays(value);
      
      if (value < 1) {
        setSnackbar({
          open: true,
          message: 'Days must be a positive number',
          severity: 'error'
        });
        return;
      }

      setLoading(true);
      try {
        let response;
        if (configId) {
          response = await axios.put(`${API_BASE_URL}/quote-expiration/config/${configId}`, {
            days: value,
            updated_by: 'user'
          });
        } else {
          response = await axios.post(`${API_BASE_URL}/quote-expiration/config`, {
            days: value,
            created_by: 'user'
          });
        }

        setOriginalDays(value);
        setConfigId(response.data.config.id);
        setSnackbar({
          open: true,
          message: 'Quote expiration configuration saved successfully',
          severity: 'success'
        });
      } catch (error) {
        console.error('Error saving quote expiration config:', error);
        setSnackbar({
          open: true,
          message: 'Failed to save quote expiration configuration',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (quoteExpirationDays < 1) {
      setSnackbar({
        open: true,
        message: 'Days must be a positive number',
        severity: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      let response;
      if (configId) {
        // Update existing configuration
        response = await axios.put(`${API_BASE_URL}/quote-expiration/config/${configId}`, {
          days: quoteExpirationDays,
          updated_by: 'user' // You might want to get this from user context
        });
      } else {
        // Create new configuration
        response = await axios.post(`${API_BASE_URL}/quote-expiration/config`, {
          days: quoteExpirationDays,
          created_by: 'user' // You might want to get this from user context
        });
      }

      setOriginalDays(quoteExpirationDays);
      setConfigId(response.data.config.id);
      setSnackbar({
        open: true,
        message: 'Quote expiration configuration saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving quote expiration config:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save quote expiration configuration',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const hasChanges = quoteExpirationDays !== originalDays;

  return (
    <Container>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="General" />
          <Tab label="Security" />
          <Tab label="Notifications" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <StyledPaper elevation={2}>
          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Business Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Business Name"
                  name="businessName"
                  value={generalSettings.businessName}
                  onChange={handleGeneralSettingsChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={generalSettings.email}
                  onChange={handleGeneralSettingsChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={generalSettings.phone}
                  onChange={handleGeneralSettingsChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Currency"
                  name="currency"
                  value={generalSettings.currency}
                  onChange={handleGeneralSettingsChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  multiline
                  rows={2}
                  value={generalSettings.address}
                  onChange={handleGeneralSettingsChange}
                />
              </Grid>
            </Grid>
          </ConfigSection>

          <ConfigSection>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quote Expiration Days"
                  type="number"
                  value={quoteExpirationDays}
                  onChange={handleDaysChange}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">days</InputAdornment>,
                  }}
                  helperText="Number of days before a quote expires"
                  inputProps={{ min: 1 }}
                  disabled={loading}
                />
              </Grid>
            </Grid>
          </ConfigSection>

          <ConfigSection>
            <Box display="flex" alignItems="center">
              <Typography variant="h6" gutterBottom>
                Camera
              </Typography>
              <Switch
                checked={isCameraEnabled}
                onChange={handleCameraToggle}
                color="primary"
              />
            </Box>
          </ConfigSection>

          <ConfigSection>
            <Box display="flex" alignItems="center">
              <Typography variant="h6" gutterBottom>
                Carat to Gram Conversion
              </Typography>
              <Switch
                checked={isCaratConversionEnabled}
                onChange={handleCaratConversionToggle}
                color="primary"
              />
            </Box>
            <Box sx={{ mt: 1 }}>
              <TextField
                label="Grams per Carat"
                type="number"
                value={gramsInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setGramsInput(value);
                }}
                onBlur={() => {
                  if (gramsInput && !isNaN(gramsInput)) {
                    handleCaratConversionUpdate(gramsInput);
                  }
                }}
                inputProps={{
                  step: "0.01",
                  min: "0",
                }}
                size="small"
                sx={{ width: '200px' }}
                disabled={!isCaratConversionEnabled}
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Standard conversion: 1 carat = 0.2 grams
              </Typography>
            </Box>
          </ConfigSection>

          <ConfigSection>
            <Box display="flex" alignItems="center">
              <Typography variant="h6" gutterBottom>
                Live Pricing
              </Typography>
              <Switch
                checked={isLivePricing}
                onChange={handleLivePricingChange}
                color="primary"
              />
            </Box>
            {isLivePricing ? (
              <div>
                <div>
                  <label>
                    <input
                      type="radio"
                      value="daily"
                      checked={isPerDay}
                      onChange={handleLivePricingChange}
                      style={{ accentColor: 'green' }}
                    />
                    Update Spot Prices Daily
                  </label>
                </div>
                <div>
                <label>
                  <input
                    type="radio"
                    value="transaction"
                    checked={isPerTransaction}
                    onChange={handleLivePricingChange}
                    style={{ accentColor: 'green' }}
                  />
                  Update Spot Prices for Each Transaction
                </label>
                </div>
              </div>
            ) : (
              <Grid container spacing={2}>
                {Object.keys(preciousMetalNames).map((metal) => (
                  <Grid item xs={12} sm={3} key={metal}>
                    <TextField
                      label={`${preciousMetalNames[metal]} Spot Price`}
                      value={spotPrices[metal]}
                      onChange={(e) => handleSpotPriceChange(e, metal)}
                      fullWidth
                    />
                  </Grid>
                ))}
              </Grid>
            )}
            <Box mt={2}>
              <Typography variant="h6" gutterBottom>
                Price Estimates
              </Typography>
              <Grid container spacing={3}>
                {Array.isArray(diamondEstimates) && 
                  [...diamondEstimates]
                    .sort((a, b) => a.id - b.id)
                    .map((estimate) => (
                      <Grid item xs={12} sm={4} key={estimate.transaction_type}>
                        <TextField
                          fullWidth
                          label={`Diamond ${estimate.transaction_type} Percentage`}
                          type="number"
                          value={estimate.estimate}
                          onChange={(event) => handleDiamondEstimatesChange(event, estimate.transaction_type)}
                          inputProps={{ min: 0, max: 100 }}
                        />
                      </Grid>
                    ))
                }
                {Object.entries(priceEstimates).map(([key, estimates]) => (
                  estimates.map((estimate) => (
                    <Grid item xs={12} sm={4} key={estimate.transaction_type}>
                      <TextField
                        fullWidth
                        label={`${preciousMetalNames[key]} ${estimate.transaction_type} Percentage`}
                        name={estimate.transaction_type}
                        type="number"
                        value={estimate.estimate}
                        onChange={(event) => handlePriceEstimatesChange(event, key)}
                        inputProps={{ min: 0, max: 100 }}
                      />
                    </Grid>
                  ))
                ))}
              </Grid>
            </Box>
          </ConfigSection>
        </StyledPaper>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <StyledPaper elevation={2}>
          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Security Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.requirePasswordChange}
                      onChange={handleSecuritySettingsChange}
                      name="requirePasswordChange"
                    />
                  }
                  label="Require Password Change Every 90 Days"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.twoFactorAuth}
                      onChange={handleSecuritySettingsChange}
                      name="twoFactorAuth"
                    />
                  }
                  label="Enable Two-Factor Authentication"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Session Timeout (minutes)"
                  name="sessionTimeout"
                  value={securitySettings.sessionTimeout}
                  onChange={handleSecuritySettingsChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Login Attempts"
                  name="maxLoginAttempts"
                  value={securitySettings.maxLoginAttempts}
                  onChange={handleSecuritySettingsChange}
                />
              </Grid>
            </Grid>
          </ConfigSection>
        </StyledPaper>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <StyledPaper elevation={2}>
          <ConfigSection>
            <Typography variant="h6" gutterBottom>
              Notification Preferences
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onChange={handleNotificationSettingsChange}
                      name="emailNotifications"
                    />
                  }
                  label="Enable Email Notifications"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.lowStockAlerts}
                      onChange={handleNotificationSettingsChange}
                      name="lowStockAlerts"
                    />
                  }
                  label="Low Stock Alerts"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.orderConfirmations}
                      onChange={handleNotificationSettingsChange}
                      name="orderConfirmations"
                    />
                  }
                  label="Order Confirmations"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.dailyReports}
                      onChange={handleNotificationSettingsChange}
                      name="dailyReports"
                    />
                  }
                  label="Daily Reports"
                />
              </Grid>
            </Grid>
          </ConfigSection>
        </StyledPaper>
      </TabPanel>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveSettings}
          size="large"
        >
          Save Settings
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default SystemConfig;
