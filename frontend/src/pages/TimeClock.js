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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material';
import {
  Login as ClockInIcon,
  Logout as ClockOutIcon,
  Edit as EditIcon,
  SupervisorAccount as ForceIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import config from '../config';

function TimeClock() {
  const { user } = useAuth();
  const isManager = user?.role === 'Store Manager' || user?.role === 'Store Owner';
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

  // Employee filter state (managers only)
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]); // empty = all

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Session picker state (for employees with multiple sessions)
  const [editPickerTarget, setEditPickerTarget] = useState(null);

  // Manager auth state
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [managerUsername, setManagerUsername] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Force clock state
  const [forceDialogOpen, setForceDialogOpen] = useState(false);
  const [forceTarget, setForceTarget] = useState(null); // { employee_id, employee_name, action: 'in'|'out' }
  const [forceLoading, setForceLoading] = useState(false);
  const [clockedInEmployeeIds, setClockedInEmployeeIds] = useState(new Set());

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchClockStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${config.apiUrl}/employee-sessions/clocked-in`);
      if (response.ok) {
        const clockedInEmployees = await response.json();
        setClockedInEmployeeIds(new Set(clockedInEmployees.map(e => e.employee_id)));
        const currentSession = clockedInEmployees.find(
          emp => emp.employee_id == user.id
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

  // Fetch employee list for the filter dropdown (managers only)
  const fetchEmployees = useCallback(async () => {
    if (!isManager) return;
    try {
      const response = await fetch(`${config.apiUrl}/employees`);
      if (response.ok) {
        const data = await response.json();
        const active = data.filter(e => e.status === 'Active');
        setAllEmployees(active);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  }, [isManager]);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      let url = `${config.apiUrl}/employee-sessions/report?start_date=${startDate}&end_date=${endDate}`;
      if (!isManager && user?.id) {
        // Non-managers can only see their own
        url += `&employee_ids=${user.id}`;
      } else if (isManager && selectedEmployeeIds.length > 0) {
        url += `&employee_ids=${selectedEmployeeIds.join(',')}`;
      }
      const response = await fetch(url);
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
  }, [startDate, endDate, isManager, user?.id, selectedEmployeeIds]);

  useEffect(() => {
    fetchClockStatus();
    fetchEmployees();
  }, [fetchClockStatus, fetchEmployees]);

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
        window.dispatchEvent(new CustomEvent('clockStatusChanged'));
      } else {
        const error = await response.json();
        alert(error.details || error.error || 'Failed to clock in');
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
        window.dispatchEvent(new CustomEvent('clockStatusChanged'));
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

  // Calculate hours for a single day's sessions, applying lunch deduction per day
  const calculateDayHours = (sessions) => {
    let totalMs = 0;
    let hasIncomplete = false;

    for (const s of sessions) {
      if (!s.clock_in_time) continue;
      if (!s.clock_out_time) {
        hasIncomplete = true;
        continue;
      }
      const inT = new Date(s.clock_in_time); inT.setSeconds(0, 0);
      const outT = new Date(s.clock_out_time); outT.setSeconds(0, 0);
      totalMs += outT - inT;
    }

    if (totalMs === 0 && hasIncomplete) return null;

    const rawHours = totalMs / 3600000;
    let deductions = 0;
    if (lunchAfterHours > 0 && lunchDeduct > 0) {
      deductions = Math.floor(rawHours / lunchAfterHours) * lunchDeduct;
    }

    return { raw: rawHours, net: Math.max(0, rawHours - deductions), hasIncomplete };
  };

  // Generate all dates in range (descending) and group sessions by date for an employee
  const buildEmployeeDays = (sessions) => {
    // Generate all dates in the range (most recent first)
    const dates = [];
    const end = new Date(endDate);
    const start = new Date(startDate);
    for (let d = new Date(end); d >= start; d.setDate(d.getDate() - 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    return dates.map(dateStr => {
      const daySessions = sessions.filter(s => {
        const sessionDate = new Date(s.clock_in_time).toISOString().split('T')[0];
        return sessionDate === dateStr;
      });
      return { date: dateStr, sessions: daySessions };
    });
  };

  // Calculate raw total minutes for an employee (no deduction) — matches sum of displayed session rows
  const calculateEmployeeRawMinutes = (sessions) => {
    let total = 0;
    for (const s of sessions) {
      if (!s.clock_in_time || !s.clock_out_time) continue;
      const inT = new Date(s.clock_in_time); inT.setSeconds(0, 0);
      const outT = new Date(s.clock_out_time); outT.setSeconds(0, 0);
      total += Math.round((outT - inT) / 60000);
    }
    return total;
  };

  // Calculate lunch deduction in minutes for an employee across all days
  const calculateEmployeeLunchMinutes = (sessions) => {
    const days = buildEmployeeDays(sessions);
    let deductionMinutes = 0;
    for (const day of days) {
      if (day.sessions.length === 0) continue;
      const dayHrs = calculateDayHours(day.sessions);
      if (dayHrs) deductionMinutes += Math.round((dayHrs.raw - dayHrs.net) * 60);
    }
    return deductionMinutes;
  };

  // Keep for grand total calculation
  const calculateEmployeeTotal = (sessions) => {
    const days = buildEmployeeDays(sessions);
    let total = 0;
    for (const day of days) {
      if (day.sessions.length === 0) continue;
      const dayHrs = calculateDayHours(day.sessions);
      if (dayHrs) total += dayHrs.net;
    }
    return total;
  };

  const formatTime = (date) => {
    if (!date) return '\u2014';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatHoursMinutes = (hours) => {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  // Edit handlers
  const handleEditClick = () => {
    if (isAuthorized) return; // already authorized
    // Auto-authorize if the current user is a Store Manager or Store Owner
    if (user?.role === 'Store Manager' || user?.role === 'Store Owner') {
      setIsAuthorized(true);
      setSnackbar({ open: true, message: 'Edit mode enabled', severity: 'success' });
      return;
    }
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

  // Force clock handlers
  const handleForceClick = (employeeId, employeeName, action) => {
    setForceTarget({ employee_id: employeeId, employee_name: employeeName, action });
    setForceDialogOpen(true);
  };

  const confirmForceClock = async () => {
    if (!forceTarget) return;
    setForceLoading(true);
    try {
      const endpoint = forceTarget.action === 'in' ? 'clock-in' : 'clock-out';
      const response = await fetch(`${config.apiUrl}/employee-sessions/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: forceTarget.employee_id }),
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: `${forceTarget.employee_name} force clocked ${forceTarget.action === 'in' ? 'IN' : 'OUT'}`,
          severity: 'success',
        });
        setForceDialogOpen(false);
        setForceTarget(null);
        fetchClockStatus();
        fetchReport();
        window.dispatchEvent(new CustomEvent('clockStatusChanged'));
      } else {
        const err = await response.json();
        setSnackbar({ open: true, message: err.error || 'Failed to force clock', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to force clock employee', severity: 'error' });
    } finally {
      setForceLoading(false);
    }
  };

  // Compute report totals
  const totalHours = report.reduce((sum, emp) => sum + calculateEmployeeTotal(emp.sessions), 0);
  const grandNetMinutes = Math.round(totalHours * 60);

  return (
    <Box>

      {/* Reporting Section */}
      <Paper sx={{ p: 3 }}>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            sx={{ width: 150 }}
          />
          <Typography variant="body2">to</Typography>
          <TextField
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            sx={{ width: 150 }}
          />

          <Divider orientation="vertical" flexItem />

          <Typography variant="body2">Lunch:</Typography>
          <TextField
            type="number"
            size="small"
            value={lunchDeduct}
            onChange={(e) => setLunchDeduct(parseFloat(e.target.value) || 0)}
            inputProps={{ step: 0.25, min: 0 }}
            sx={{ width: 65 }}
          />
          <Typography variant="body2">after</Typography>
          <TextField
            type="number"
            size="small"
            value={lunchAfterHours}
            onChange={(e) => setLunchAfterHours(parseFloat(e.target.value) || 0)}
            inputProps={{ step: 0.5, min: 0 }}
            sx={{ width: 65 }}
          />
          <Typography variant="body2">hrs</Typography>

          {isManager && allEmployees.length > 0 && (
            <>
              <Divider orientation="vertical" flexItem />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  multiple
                  displayEmpty
                  value={selectedEmployeeIds}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes('__all__')) {
                      if (selectedEmployeeIds.length === allEmployees.length) {
                        setSelectedEmployeeIds([]);
                      } else {
                        setSelectedEmployeeIds(allEmployees.map(emp => emp.employee_id));
                      }
                    } else {
                      setSelectedEmployeeIds(val);
                    }
                  }}
                  input={<OutlinedInput />}
                  renderValue={(selected) => {
                    if (selected.length === 0) return 'All Employees';
                    if (selected.length === allEmployees.length) return 'All Employees';
                    return allEmployees
                      .filter(emp => selected.includes(emp.employee_id))
                      .map(emp => `${emp.first_name} ${emp.last_name}`)
                      .join(', ');
                  }}
                >
                  <MenuItem value="__all__">
                    <Checkbox checked={selectedEmployeeIds.length === 0 || selectedEmployeeIds.length === allEmployees.length} />
                    <ListItemText primary="All Employees" />
                  </MenuItem>
                  {allEmployees.map((emp) => (
                    <MenuItem key={emp.employee_id} value={emp.employee_id}>
                      <Checkbox checked={selectedEmployeeIds.includes(emp.employee_id)} />
                      <ListItemText primary={`${emp.first_name} ${emp.last_name}`} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          {isManager && (
            <>
              <Divider orientation="vertical" flexItem />
              {!isAuthorized ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEditClick}
                  sx={{ textTransform: 'none' }}
                >
                  Edit
                </Button>
              ) : (
                <Chip label="Edit Mode" color="warning" size="small" onDelete={() => setIsAuthorized(false)} />
              )}
            </>
          )}
        </Box>

        {/* Report Table */}
        {reportLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" sx={{ tableLayout: 'auto', width: 'auto', '& td, & th': { py: 0.3, px: 1.5 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Store</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Time IN</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Time OUT</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Hours</TableCell>
                  {isAuthorized && <TableCell sx={{ fontWeight: 700 }} />}
                </TableRow>
              </TableHead>
              <TableBody>
                {report.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAuthorized ? 7 : 6} align="center">
                      No data for selected date range.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {report.map((emp, empIdx) => {
                      const days = buildEmployeeDays(emp.sessions);
                      const empNetMinutes = Math.round(calculateEmployeeTotal(emp.sessions) * 60);
                      const empTotal = calculateEmployeeTotal(emp.sessions);
                      const empBg = empIdx % 2 === 0 ? '#f5f5f5' : 'white';
                      const colCount = isAuthorized ? 7 : 6;

                      const rows = [];
                      let isFirstRow = true;

                      days.forEach((day) => {
                        const dateLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        });

                        if (day.sessions.length === 0) {
                          rows.push(
                            <TableRow key={`${emp.employee_id}-${day.date}`} sx={{ bgcolor: empBg }}>
                              <TableCell>{isFirstRow ? emp.employee_name : ''}</TableCell>
                              <TableCell>{dateLabel}</TableCell>
                              <TableCell>{emp.store_code}</TableCell>
                              <TableCell>{'\u2014'}</TableCell>
                              <TableCell>{'\u2014'}</TableCell>
                              <TableCell>{'\u2014'}</TableCell>
                              {isAuthorized && <TableCell />}
                            </TableRow>
                          );
                          isFirstRow = false;
                        } else {
                          const dayHrs = calculateDayHours(day.sessions);
                          const dayLunchMinutes = dayHrs ? Math.round((dayHrs.raw - dayHrs.net) * 60) : 0;

                          day.sessions.forEach((session, sIdx) => {
                            const clockIn = session.clock_in_time ? new Date(session.clock_in_time) : null;
                            const clockOut = session.clock_out_time ? new Date(session.clock_out_time) : null;
                            const inTrunc = clockIn ? (d => { d.setSeconds(0,0); return d; })(new Date(clockIn)) : null;
                            const outTrunc = clockOut ? (d => { d.setSeconds(0,0); return d; })(new Date(clockOut)) : null;
                            const rawMinutes = inTrunc && outTrunc
                              ? Math.round((outTrunc.getTime() - inTrunc.getTime()) / 60000)
                              : null;
                            // Apply lunch deduction to the first session of the day
                            const sessionMinutes = rawMinutes !== null && sIdx === 0
                              ? Math.max(0, rawMinutes - dayLunchMinutes)
                              : rawMinutes;

                            rows.push(
                              <TableRow key={`${emp.employee_id}-${session.session_id}`} sx={{ bgcolor: empBg }}>
                                <TableCell>{isFirstRow ? emp.employee_name : ''}</TableCell>
                                <TableCell>{sIdx === 0 ? dateLabel : ''}</TableCell>
                                <TableCell>{emp.store_code}</TableCell>
                                <TableCell>{formatTime(clockIn)}</TableCell>
                                <TableCell>{formatTime(clockOut)}</TableCell>
                                <TableCell>
                                  {sessionMinutes !== null
                                    ? `${Math.floor(sessionMinutes / 60)}h ${sessionMinutes % 60}m`
                                    : clockIn && !clockOut
                                      ? '*'
                                      : '\u2014'}
                                </TableCell>
                                {isAuthorized && (
                                  <TableCell sx={{ py: 0 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Button
                                        size="small"
                                        startIcon={<EditIcon />}
                                        onClick={() => openEditDialog(emp.employee_name, session)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem', minWidth: 0, px: 0.5 }}
                                      >
                                        Edit
                                      </Button>
                                      {isFirstRow && (
                                        clockedInEmployeeIds.has(emp.employee_id) ? (
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            startIcon={<ForceIcon />}
                                            onClick={() => handleForceClick(emp.employee_id, emp.employee_name, 'out')}
                                            sx={{ textTransform: 'none', fontSize: '0.75rem', minWidth: 0, px: 0.5 }}
                                          >
                                            Force OUT
                                          </Button>
                                        ) : (
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            color="success"
                                            startIcon={<ForceIcon />}
                                            onClick={() => handleForceClick(emp.employee_id, emp.employee_name, 'in')}
                                            sx={{ textTransform: 'none', fontSize: '0.75rem', minWidth: 0, px: 0.5 }}
                                          >
                                            Force IN
                                          </Button>
                                        )
                                      )}
                                    </Box>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                            isFirstRow = false;
                          });
                        }
                      });

                      // Employee subtotal row
                      rows.push(
                        <TableRow key={`${emp.employee_id}-total`} sx={{ bgcolor: empBg }}>
                          <TableCell colSpan={4} sx={{ borderBottom: 'none' }} />
                          <TableCell sx={{ fontWeight: 700 }}>TOTAL:</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {`${Math.floor(empNetMinutes / 60)}h ${empNetMinutes % 60}m`}
                          </TableCell>
                          {isAuthorized && <TableCell />}
                        </TableRow>
                      );

                      // Separator between employees
                      if (empIdx < report.length - 1) {
                        rows.push(
                          <TableRow key={`${emp.employee_id}-sep`}>
                            <TableCell colSpan={colCount} sx={{ p: 0, borderBottom: '2px solid #ccc' }} />
                          </TableRow>
                        );
                      }

                      return rows;
                    })}
                    {/* Grand total row */}
                    {report.length > 1 && (
                      <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                        <TableCell colSpan={4} />
                        <TableCell sx={{ fontWeight: 700 }}>All Employees:</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {`${Math.floor(grandNetMinutes / 60)}h ${grandNetMinutes % 60}m`}
                        </TableCell>
                        {isAuthorized && <TableCell />}
                      </TableRow>
                    )}
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

      {/* Session Picker Dialog (for employees with multiple sessions) */}
      <Dialog
        open={Boolean(editPickerTarget)}
        onClose={() => setEditPickerTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Select Session to Edit — {editPickerTarget?.employee_name}</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Clock In</TableCell>
                <TableCell>Clock Out</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {editPickerTarget?.sessions.map((session) => (
                <TableRow key={session.session_id}>
                  <TableCell>
                    {new Date(session.clock_in_time).toLocaleTimeString('en-US', {
                      hour: '2-digit', minute: '2-digit', hour12: true,
                    })}
                  </TableCell>
                  <TableCell>
                    {session.clock_out_time
                      ? new Date(session.clock_out_time).toLocaleTimeString('en-US', {
                          hour: '2-digit', minute: '2-digit', hour12: true,
                        })
                      : '\u2014'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => {
                        openEditDialog(editPickerTarget.employee_name, session);
                        setEditPickerTarget(null);
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPickerTarget(null)} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Force Clock Confirmation Dialog */}
      <Dialog
        open={forceDialogOpen}
        onClose={() => { setForceDialogOpen(false); setForceTarget(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Force Clock {forceTarget?.action === 'in' ? 'IN' : 'OUT'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to force clock{' '}
            <strong>{forceTarget?.employee_name}</strong>{' '}
            {forceTarget?.action === 'in' ? 'IN' : 'OUT'}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setForceDialogOpen(false); setForceTarget(null); }}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={confirmForceClock}
            variant="contained"
            color={forceTarget?.action === 'in' ? 'success' : 'error'}
            disabled={forceLoading}
          >
            {forceLoading ? 'Processing...' : `Force Clock ${forceTarget?.action === 'in' ? 'IN' : 'OUT'}`}
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
