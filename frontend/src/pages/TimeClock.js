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
} from '@mui/material';
import {
  Login as ClockInIcon,
  Logout as ClockOutIcon,
  AccessTime as ClockIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import config from '../config';

function TimeClock() {
  const { user } = useAuth();
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [clockOutDialogOpen, setClockOutDialogOpen] = useState(false);

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

  const fetchSessionHistory = useCallback(async () => {
    if (!user?.id) return;
    setHistoryLoading(true);
    try {
      const response = await fetch(`${config.apiUrl}/employee-sessions/employee/${user.id}?limit=50`);
      if (response.ok) {
        const data = await response.json();
        setSessionHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch session history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClockStatus();
    fetchSessionHistory();
  }, [fetchClockStatus, fetchSessionHistory]);

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
        fetchSessionHistory();
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
        fetchSessionHistory();
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

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return '-';
    const ms = new Date(clockOut) - new Date(clockIn);
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const getElapsedTime = () => {
    if (!clockInTime) return '';
    const ms = new Date() - clockInTime;
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

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
            Clocked in at {clockInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            {' '} — Elapsed: {getElapsedTime()}
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
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : clockedIn ? <ClockOutIcon /> : <ClockInIcon />}
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

      {/* Session History */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClockIcon /> Session History
        </Typography>

        {historyLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Clock In</TableCell>
                  <TableCell>Clock Out</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessionHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No session history found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sessionHistory.map((session) => (
                    <TableRow key={session.session_id}>
                      <TableCell>
                        {new Date(session.clock_in_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        {new Date(session.clock_in_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </TableCell>
                      <TableCell>
                        {session.clock_out_time
                          ? new Date(session.clock_out_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {formatDuration(session.clock_in_time, session.clock_out_time)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={session.status === 'clocked_in' ? 'Clocked In' : 'Clocked Out'}
                          size="small"
                          color={session.status === 'clocked_in' ? 'success' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))
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
                You clocked in at {clockInTime.toLocaleTimeString('en-US', {
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
    </Box>
  );
}

export default TimeClock;
