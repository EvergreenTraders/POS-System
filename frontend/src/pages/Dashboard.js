import React from 'react';
import {
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import {
  TrendingUp,
  ShoppingCart,
  Receipt,
} from '@mui/icons-material';

function Dashboard() {
  return (
    <div>
      {/* <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography> */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <TrendingUp sx={{ fontSize: 40, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6">Total Sales</Typography>
            <Typography variant="h4">$1,234</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <ShoppingCart sx={{ fontSize: 40, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6">Products</Typography>
            <Typography variant="h4">50</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Receipt sx={{ fontSize: 40, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6">Orders Today</Typography>
            <Typography variant="h4">25</Typography>
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
}

export default Dashboard;
