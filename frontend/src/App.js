import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Jewellery from './pages/Jewellery';
import CoinsBullions from './pages/CoinsBullions';
import SystemConfig from './pages/SystemConfig';
import Employees from './pages/Employees';

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

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Layout component for authenticated pages
const AuthenticatedLayout = ({ children }) => (
  <Box sx={{ display: 'flex', minHeight: '100vh' }}>
    <Navbar />
    <Sidebar />
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        mt: 8,
        ml: '50px', // Same as drawer width
      }}
    >
      {children}
    </Box>
  </Box>
);

function App() {
  return (
    <CartProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <Dashboard />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <Products />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <Orders />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/jewellery"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <Jewellery />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/coins-bullions"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <CoinsBullions />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <Jewellery />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <Orders />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/system-config/settings"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <SystemConfig />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/system-config/employees"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <Employees />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </CartProvider>
  );
}

export default App;
