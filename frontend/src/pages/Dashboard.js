import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Container,
} from '@mui/material';
import {
  TrendingUp,
  ShoppingCart,
  Receipt,
  CurrencyExchange,
  Inventory,
  Person,
  TrendingUpOutlined,
} from '@mui/icons-material';

function StatCard({ title, value, icon, change, timeFrame }) {
  const isPositive = !change.includes('-');
  const IconComponent = icon;
  
  return (
    <Paper sx={{ p: 3, height: '100%', bgcolor: 'white', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography color="text.secondary" variant="body1" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{ 
          backgroundColor: '#e7f7ed', 
          borderRadius: '50%', 
          width: 48, 
          height: 48, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <IconComponent sx={{ color: '#00a862', fontSize: 24 }} />
        </Box>
      </Box>
      <Typography 
        variant="body2" 
        sx={{ 
          color: isPositive ? '#00a862' : '#d32f2f',
          display: 'flex',
          alignItems: 'center',
          mt: 0.5
        }}
      >
        <TrendingUpOutlined 
          sx={{ 
            fontSize: 16, 
            mr: 0.5,
            transform: !isPositive ? 'rotate(180deg)' : 'none'
          }} 
        />
        {change} vs {timeFrame}
      </Typography>
    </Paper>
  );
}

function TransactionItem({ title, subtitle, amount, time }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Box>
        <Typography variant="subtitle1">{title}</Typography>
        <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <Typography variant="subtitle1">{amount}</Typography>
        <Typography variant="body2" color="text.secondary">{time}</Typography>
      </Box>
    </Box>
  );
}

function Dashboard() {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 1 }}>
        Dashboard Overview
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
        Welcome back! Here's what's happening today.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Keep your existing Sales and Orders cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Daily Revenue"
            value="$2,854"
            icon={CurrencyExchange}
            change="12.5%"
            timeFrame="last month"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Pawns"
            value="124"
            icon={Inventory}
            change="8.2%"
            timeFrame="last month"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="New Customers"
            value="48"
            icon={Person}
            change="-3.1%"
            timeFrame="last month"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Sales Growth"
            value="15.2%"
            icon={TrendingUp}
            change="2.3%"
            timeFrame="last month"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Transactions
            </Typography>
            <TransactionItem
              title="Gold Necklace 18K"
              subtitle="Pawned by John Doe"
              amount="$580.00"
              time="2 hours ago"
            />
            {/* Add more transaction items as needed */}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Expiring Pawns
            </Typography>
            <TransactionItem
              title="Diamond Ring"
              subtitle="Due in 3 days"
              amount="$1,200.00"
              time={<Typography color="success.main">Contact customer</Typography>}
            />
            {/* Add more expiring pawns as needed */}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;
