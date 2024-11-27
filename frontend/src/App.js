import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Jewellery from './pages/Jewellery';
import CoinsBullions from './components/CoinsBullions';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1a472a', // Dark green
      light: '#2e7d32', // Lighter green
      dark: '#0d3319', // Darker green
    },
    secondary: {
      main: '#66bb6a', // Complementary green
    },
    background: {
      default: '#e8f5e9', // Light green background
      paper: '#ffffff',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a472a',
        },
      },
    },
  },
});

function App() {
  return (
    <CartProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Navbar />
            <Sidebar />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 3,
                mt: 8,
                ml: '240px', // Same as drawer width
              }}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/inventory/jewellery" element={<Jewellery />} />
                <Route path="/inventory/coins-bullions" element={<CoinsBullions />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </ThemeProvider>
    </CartProvider>
  );
}

export default App;
