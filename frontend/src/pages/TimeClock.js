import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  Divider,
} from '@mui/material';
import {
  Login as ClockInIcon,
  Logout as ClockOutIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import config from '../config';

function TimeClock() {
  const { user } = useAuth();
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clockOutDialogOpen, setClockOutDialogOpen] = useState(false);

  // Report state
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [lunchDeduct, setLunchDeduct] = useState(0.50);
  const [lunchAfterHours, setLunchAfterHours] = useState(6.00);
  const [report, setReport] = useState([]);
  const [storeName, setStoreName] = useState('');
  const [reportLoading, setReportLoading] = useState(true);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Manager auth state
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [managerUsername, setManagerUsername] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchClockStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${config.apiUrl}/employee-sessions/clocked-in`);
      if (response.ok) {
        const clockedInEmployees = await response.json();
        const currentSession = clockedInEmployees.find(
          emp => emp.employee_id === user.id
        );
        if (currentSession) {
          setClockedIn(true);
          setClockInTime(new Date(currentSession.clock_in_time));
        } else {
          setClockedIn(false);
          setClockInTime(null);
        }
      }
    } catch (error) {
      console.error('Failed to check clock status:', error);
    }
  }, [user]);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const response = await fetch(
        `${config.apiUrl}/employee-sessions/report?start_date=${startDate}&end_date=${endDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setReport(data.report || []);
        setStoreName(data.store?.store_code || data.store?.store_name || '');
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setReportLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchClockStatus();
  }, [fetchClockStatus]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleClockIn = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`${config.apiUrl}/employee-sessions/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: user.id }),
      });
      if (response.ok) {
        const data = await response.json();
        setClockedIn(true);
        setClockInTime(new Date(data.clock_in_time));
        fetchReport();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to clock in');
      }
    } catch (error) {
      console.error('Error clocking in:', error);
      alert('Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = () => {
    setClockOutDialogOpen(true);
  };

  const confirmClockOut = async () => {
    if (!user?.id) return;
    setLoading(true);
    setClockOutDialogOpen(false);
    try {
      const response = await fetch(`${config.apiUrl}/employee-sessions/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: user.id }),
      });
      if (response.ok) {
        setClockedIn(false);
        setClockInTime(null);
        fetchReport();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to clock out');
      }
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  const getElapsedTime = () => {
    if (!clockInTime) return '';
    const ms = new Date() - clockInTime;
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  // Calculate hours worked for an employee across all sessions in the report period,
  // applying lunch deductions: deduct lunchDeduct hours for every lunchAfterHours worked
  const calculateHours = (sessions) => {
    let totalMs = 0;
    let allComplete = true;

    for (const s of sessions) {
      if (!s.clock_in_time) continue;
      if (!s.clock_out_time) {
        allComplete = false;
        continue;
      }
      totalMs += new Date(s.clock_out_time) - new Date(s.clock_in_time);
    }

    if (totalMs === 0 && !allComplete) return null; // still clocked in, no completed sessions

    const rawHours = totalMs / 3600000;

    // Apply lunch deductions
    let deductions = 0;
    if (lunchAfterHours > 0 && lunchDeduct > 0) {
      deductions = Math.floor(rawHours / lunchAfterHours) * lunchDeduct;
    }

    const netHours = Math.max(0, rawHours - deductions);
    return { raw: rawHours, net: netHours, hasIncomplete: !allComplete };
  };

  // Get earliest clock in and latest clock out for display
  const getTimeRange = (sessions) => {
    const completeSessions = sessions.filter(s => s.clock_in_time);
    if (completeSessions.length === 0) return { clockIn: null, clockOut: null };

    const clockIns = completeSessions.map(s => new Date(s.clock_in_time));
    const clockOuts = completeSessions
      .filter(s => s.clock_out_time)
      .map(s => new Date(s.clock_out_time));

    return {
      clockIn: new Date(Math.min(...clockIns)),
      clockOut: clockOuts.length > 0 ? new Date(Math.max(...clockOuts)) : null,
    };
  };

  const formatTime = (date) => {
    if (!date) return '\u2014';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Edit handlers
  const handleEditClick = () => {
    if (isAuthorized) return; // already authorized
    setAuthDialogOpen(true);
  };

  const handleManagerAuth = async () => {
    if (!managerUsername || !managerPassword) {
      setAuthError('Please enter username and password');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      const response = await fetch(`${config.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: managerUsername, password: managerPassword }),
      });

      if (!response.ok) {
        setAuthError('Invalid credentials');
        setAuthLoading(false);
        return;
      }

      const data = await response.json();
      if (data.user.role !== 'Store Manager' && data.user.role !== 'Store Owner') {
        setAuthError('Only Store Managers or Store Owners can edit time entries');
        setAuthLoading(false);
        return;
      }

      setIsAuthorized(true);
      setAuthDialogOpen(false);
      setManagerUsername('');
      setManagerPassword('');
      setSnackbar({
        open: true,
        message: `Edit mode enabled — approved by ${data.user.first_name} ${data.user.last_name}`,
        severity: 'success',
      });
    } catch (error) {
      setAuthError('Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const openEditDialog = (empName, session) => {
    setEditSession({ ...session, employee_name: empName });
    // Format datetime-local values
    const inTime = session.clock_in_time
      ? new Date(session.clock_in_time).toISOString().slice(0, 16)
      : '';
    const outTime = session.clock_out_time
      ? new Date(session.clock_out_time).toISOString().slice(0, 16)
      : '';
    setEditClockIn(inTime);
    setEditClockOut(outTime);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editSession) return;
    setEditSaving(true);
    try {
      const body = {};
      if (editClockIn) body.clock_in_time = new Date(editClockIn).toISOString();
      if (editClockOut) body.clock_out_time = new Date(editClockOut).toISOString();

      const response = await fetch(`${config.apiUrl}/employee-sessions/${editSession.session_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setSnackbar({ open: true, message: 'Time entry updated', severity: 'success' });
        setEditDialogOpen(false);
        fetchReport();
        fetchClockStatus();
      } else {
        const err = await response.json();
        setSnackbar({ open: true, message: err.error || 'Failed to update', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update time entry', severity: 'error' });
    } finally {
      setEditSaving(false);
    }
  };

  // Compute report totals
  const totalHours = report.reduce((sum, emp) => {
    const hours = calculateHours(emp.sessions);
    return sum + (hours ? hours.net : 0);
  }, 0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Time Clock
      </Typography>

      {/* Clock In/Out Action */}
      <Paper sx={{ p: 4, mb: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {user?.firstName} {user?.lastName}
        </Typography>

        {clockedIn && clockInTime && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Clocked in at{' '}
            {clockInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            {' '}&mdash; Elapsed: {getElapsedTime()}
          </Typography>
        )}

        {!clockedIn && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            You are currently clocked out.
          </Typography>
        )}

        <Button
          variant="contained"
          size="large"
          startIcon={
            loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : clockedIn ? (
              <ClockOutIcon />
            ) : (
              <ClockInIcon />
            )
          }
          onClick={clockedIn ? handleClockOut : handleClockIn}
          disabled={loading}
          sx={{
            px: 6,
            py: 2,
            fontSize: '1.1rem',
            bgcolor: clockedIn ? 'error.main' : 'success.main',
            '&:hover': {
              bgcolor: clockedIn ? 'error.dark' : 'success.dark',
            },
          }}
        >
          {clockedIn ? 'Clock OUT' : 'Clock IN'}
        </Button>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Reporting Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          Reporting
        </Typography>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Date Range
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                type="date"
                size="small"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                sx={{ width: 160 }}
              />
              <Typography variant="body2">to</Typography>
              <TextField
                type="date"
                size="small"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                sx={{ width: 160 }}
              />
            </Box>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Lunch Break
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2">Deduct</Typography>
              <TextField
                type="number"
                size="small"
                value={lunchDeduct}
                onChange={(e) => setLunchDeduct(parseFloat(e.target.value) || 0)}
                inputProps={{ step: 0.25, min: 0 }}
                sx={{ width: 80 }}
              />
              <Typography variant="body2">after every</Typography>
              <TextField
                type="number"
                size="small"
                value={lunchAfterHours}
                onChange={(e) => setLunchAfterHours(parseFloat(e.target.value) || 0)}
                inputProps={{ step: 0.5, min: 0 }}
                sx={{ width: 80 }}
              />
              <Typography variant="body2">hrs worked</Typography>
            </Box>
          </Box>

          <Box sx={{ ml: 'auto' }}>
            {!isAuthorized ? (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEditClick}
              >
                Edit
              </Button>
            ) : (
              <Chip label="Edit Mode Active" color="warning" onDelete={() => setIsAuthorized(false)} />
            )}
          </Box>
        </Box>

        {/* Report Table */}
        {reportLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Store</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Time IN</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Time OUT</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Hours</TableCell>
                  {isAuthorized && <TableCell sx={{ fontWeight: 700 }} />}
                </TableRow>
              </TableHead>
              <TableBody>
                {report.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAuthorized ? 6 : 5} align="center">
                      No data for selected date range.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {report.map((emp, idx) => {
                      const timeRange = getTimeRange(emp.sessions);
                      const hours = calculateHours(emp.sessions);
                      const hasSessions = emp.sessions.length > 0;

                      return (
                        <TableRow
                          key={emp.employee_id}
                          sx={{ bgcolor: idx % 2 === 0 ? '#e3f2fd' : 'white' }}
                        >
                          <TableCell>{emp.employee_name}</TableCell>
                          <TableCell>{emp.store_code}</TableCell>
                          <TableCell>
                            {hasSessions ? formatTime(timeRange.clockIn) : '\u2014'}
                          </TableCell>
                          <TableCell>
                            {hasSessions ? formatTime(timeRange.clockOut) : '\u2014'}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            {hours
                              ? hours.net.toFixed(2) + (hours.hasIncomplete ? '*' : '')
                              : '\u2014'}
                          </TableCell>
                          {isAuthorized && (
                            <TableCell>
                              {emp.sessions.map((session) => (
                                <Button
                                  key={session.session_id}
                                  size="small"
                                  onClick={() => openEditDialog(emp.employee_name, session)}
                                  sx={{ minWidth: 'auto', p: 0.5 }}
                                >
                                  <EditIcon fontSize="small" />
                                </Button>
                              ))}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {/* Totals row */}
                    <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>TOTAL:</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                        {totalHours.toFixed(2)}
                      </TableCell>
                      {isAuthorized && <TableCell />}
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Clock Out Confirmation Dialog */}
      <Dialog
        open={clockOutDialogOpen}
        onClose={() => setClockOutDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Clock Out</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to clock out?
          </Typography>
          {clockInTime && (
            <>
              <Typography variant="body2" color="text.secondary">
                You clocked in at{' '}
                {clockInTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total time: {getElapsedTime()}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClockOutDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={confirmClockOut} variant="contained" color="primary" disabled={loading}>
            Confirm Clock Out
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manager Authorization Dialog */}
      <Dialog
        open={authDialogOpen}
        onClose={() => {
          setAuthDialogOpen(false);
          setAuthError('');
          setManagerUsername('');
          setManagerPassword('');
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Manager Authorization Required</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            A Store Manager or Store Owner must authorize editing time entries.
          </Typography>
          {authError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {authError}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Username"
            value={managerUsername}
            onChange={(e) => setManagerUsername(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
            autoFocus
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={managerPassword}
            onChange={(e) => setManagerPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleManagerAuth();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAuthDialogOpen(false);
              setAuthError('');
              setManagerUsername('');
              setManagerPassword('');
            }}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleManagerAuth}
            variant="contained"
            disabled={authLoading}
          >
            {authLoading ? 'Verifying...' : 'Authorize'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Time Entry — {editSession?.employee_name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Clock In"
              type="datetime-local"
              value={editClockIn}
              onChange={(e) => setEditClockIn(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Clock Out"
              type="datetime-local"
              value={editClockOut}
              onChange={(e) => setEditClockOut(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={editSaving}>
            {editSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TimeClock;
