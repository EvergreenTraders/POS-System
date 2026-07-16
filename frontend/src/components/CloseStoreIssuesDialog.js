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
import { WarningAmber as WarningIcon } from '@mui/icons-material';

// Shared popup for surfacing everything blocking/relevant to a store close (open
// drawers/safes from /api/store-sessions/check-open-drawers, plus who's still
// clocked in from /api/employee-sessions/clocked-in), instead of a single inline
// warning that's easy to miss or silently never render.
export default function CloseStoreIssuesDialog({
  open, onClose, message, issues = [], clockedInEmployees = [], onClockOut, clockingOutId,
}) {
  const hasIssues = issues.length > 0;
  const hasClockedIn = clockedInEmployees.length > 0;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cannot Close Store</DialogTitle>
      <DialogContent>
        {!hasIssues && !hasClockedIn ? (
          <Alert severity="error">{message || 'Failed to check store closure prerequisites'}</Alert>
        ) : (
          <>
            {hasIssues && (
              <>
                <Alert severity="error" sx={{ mb: 1 }}>
                  The following drawers/safes are still open. Close them before closing the store.
                </Alert>
                <List dense sx={{ pt: 0, mb: hasClockedIn ? 2 : 0 }}>
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
                <List dense sx={{ pt: 0 }}>
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
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>OK</Button>
      </DialogActions>
    </Dialog>
  );
}
