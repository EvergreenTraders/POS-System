import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemIcon,
  ListItemText,
  Typography,
  CircularProgress,
} from '@mui/material';
import { WarningAmber as WarningIcon, LocalParking as ParkingIcon } from '@mui/icons-material';

// Shared popup for surfacing everything relevant to a store close: open drawers/safes
// from /api/store-sessions/check-open-drawers (hard block), who's still clocked in from
// /api/employee-sessions/clocked-in, and parked workspaces from /api/parked-workspaces
// (requires a delete-or-keep decision) — instead of separate warnings that are easy to
// miss or appear at different points in the close-store flow.
export default function CloseStoreIssuesDialog({
  open, onClose, message,
  issues = [], clockedInEmployees = [], onClockOut, clockingOutId,
  parkedWorkspaces = [], onDeleteParkedWorkspace, deletingParkedId, onKeepParkedWorkspaces,
}) {
  const hasIssues = issues.length > 0;
  const hasClockedIn = clockedInEmployees.length > 0;
  const hasParked = parkedWorkspaces.length > 0;
  const nothingToShow = !hasIssues && !hasClockedIn && !hasParked;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{hasIssues ? 'Cannot Close Store' : hasParked ? 'Parked Tickets Found' : 'Review Before Closing'}</DialogTitle>
      <DialogContent>
        {nothingToShow ? (
          <Alert severity="error">{message || 'Failed to check store closure prerequisites'}</Alert>
        ) : (
          <>
            {hasIssues && (
              <>
                <Alert severity="error" sx={{ mb: 1 }}>
                  The following drawers/safes are still open. Close them before closing the store.
                </Alert>
                <List dense sx={{ pt: 0, mb: 2 }}>
                  {issues.map((issue) => (
                    <ListItem key={issue.session_id} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <WarningIcon color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={issue.drawer_name}
                        secondary={issue.drawer_type === 'safe' ? 'Safe' : 'Drawer'}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
            {hasClockedIn && (
              <>
                <Alert severity="warning" sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Currently Clocked-In Employees ({clockedInEmployees.length}):
                  </Typography>
                </Alert>
                <List dense sx={{ pt: 0, mb: hasParked ? 2 : 0 }}>
                  {clockedInEmployees.map((emp) => (
                    <ListItem
                      key={emp.session_id}
                      disableGutters
                      secondaryAction={
                        onClockOut && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            disabled={clockingOutId === emp.session_id}
                            startIcon={clockingOutId === emp.session_id ? <CircularProgress size={14} /> : null}
                            onClick={() => onClockOut(emp)}
                          >
                            Clock Out
                          </Button>
                        )
                      }
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={emp.image ? `data:image/jpeg;base64,${emp.image}` : undefined}
                          sx={{ width: 32, height: 32 }}
                        >
                          {!emp.image && (emp.first_name ? emp.first_name[0].toUpperCase() : '?')}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={emp.employee_name}
                        secondary={`${emp.role} - since ${new Date(emp.clock_in_time).toLocaleTimeString()}`}
                        sx={{ pr: 10 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
            {hasParked && (
              <Alert severity="info" sx={{ mb: 1 }}>
                There {parkedWorkspaces.length === 1 ? 'is' : 'are'} {parkedWorkspaces.length} parked ticket{parkedWorkspaces.length !== 1 ? 's' : ''} still open.
                Delete individual tickets below, or keep them for later.
              </Alert>
            )}
            {hasParked && (
              <List dense sx={{ pt: 0 }}>
                {parkedWorkspaces.map((pw) => (
                  <ListItem
                    key={pw.id}
                    disableGutters
                    secondaryAction={
                      onDeleteParkedWorkspace && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          disabled={deletingParkedId === pw.id}
                          startIcon={deletingParkedId === pw.id ? <CircularProgress size={14} /> : null}
                          onClick={() => onDeleteParkedWorkspace(pw)}
                        >
                          Delete
                        </Button>
                      )
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ParkingIcon color="action" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={pw.customer_name || 'Unknown Customer'}
                      secondary={`Written by ${pw.parked_by_employee_name || 'unknown'} - ${new Date(pw.parked_at).toLocaleTimeString()}`}
                      sx={{ pr: 10 }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {hasParked && !hasIssues ? (
          <Button variant="contained" onClick={onKeepParkedWorkspaces}>Keep & Continue</Button>
        ) : (
          <Button variant="contained" onClick={onClose}>OK</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
