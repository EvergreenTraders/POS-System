import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Jewellery from './pages/Jewellery';
import CoinsBullions from './pages/CoinsBullions';
import SystemConfig from './pages/SystemConfig';
import Employees from './pages/Employees';
import GemEstimator from './pages/GemEstimator';
import Pawns from './pages/Pawns';
import Checkout from './pages/Checkout';
import QuoteManager from './pages/QuoteManager';
import CustomerManager from './pages/CustomerManager';
import CustomerEditor from './pages/CustomerEditor';
import CustomerTicket from './pages/CustomerTicket';
import CustomerReporting from './pages/CustomerReporting';
import Cart from './pages/Cart';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1a472a',
      light: '#2e7d32',
      dark: '#0d3319',
    },
    secondary: {
      main: '#66bb6a',
    },
    background: {
      default: '#e8f5e9',
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
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  if (!token || !user) {
    // Save the current path for redirection after login
    const currentPath = window.location.pathname;
    sessionStorage.setItem('redirectAfterLogin', currentPath);
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Layout component for authenticated pages
const AuthenticatedLayout = ({ children }) => {
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  const requestFullScreen = async (element) => {
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
      setIsFullScreen(true);
    } catch (err) {
      console.error('Error attempting to enable full-screen:', err);
    }
  };

  const handleFullScreen = () => {
    const element = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
      requestFullScreen(element);
    }
  };

  React.useEffect(() => {
    const handleUserInteraction = () => {
      handleFullScreen();
      // Remove event listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keypress', handleUserInteraction);
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keypress', handleUserInteraction);

    // Cleanup function
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keypress', handleUserInteraction);
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          mt: 8,
          transition: theme => theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <Home />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
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
                path="/gem-estimator"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <GemEstimator />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bullion-estimator"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <CoinsBullions />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <CustomerManager />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <Checkout />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quote-manager"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <QuoteManager />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="inventory/coins-bullions"
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
              <Route
                path="/pawns"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <Pawns />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <CustomerManager />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer-reporting"
                element={
                  <ProtectedRoute>
                    <CustomerReporting />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer-editor"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <CustomerEditor />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer-ticket"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <CustomerTicket />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cart"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <Cart />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quotes"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <QuoteManager />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
