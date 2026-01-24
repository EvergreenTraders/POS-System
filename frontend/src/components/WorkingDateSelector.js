import React from 'react';
import { Box, TextField, Switch, FormControlLabel, Typography, Alert } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const WorkingDateSelector = ({ workingDate, setWorkingDate, isEnabled, setIsEnabled }) => {
  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 2, border: '1px solid rgba(0,0,0,0.1)' }}>
      <FormControlLabel
        control={
          <Switch
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            color="warning"
          />
        }
        label={
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonthIcon fontSize="small" />
            Use Custom Working Date
          </Typography>
        }
      />

      {isEnabled && (
        <>
          <TextField
            type="date"
            fullWidth
            label="Working Date"
            value={workingDate}
            onChange={(e) => setWorkingDate(e.target.value)}
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <Alert severity="warning" sx={{ mt: 1 }}>
            Testing Mode: All transactions will use {new Date(workingDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })} as the date.
          </Alert>
        </>
      )}
    </Box>
  );
};

export default WorkingDateSelector;
