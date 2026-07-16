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
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { WarningAmber as WarningIcon } from '@mui/icons-material';

// Shared popup for surfacing everything blocking a store close (open drawers/safes,
// or any other error returned by /api/store-sessions/check-open-drawers), instead of
// a single inline warning that's easy to miss or silently never render.
export default function CloseStoreIssuesDialog({ open, onClose, message, issues = [] }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cannot Close Store</DialogTitle>
      <DialogContent>
        {issues.length === 0 ? (
          <Alert severity="error">{message || 'Failed to check store closure prerequisites'}</Alert>
        ) : (
          <>
            <Alert severity="error" sx={{ mb: 1 }}>
              The following drawers/safes are still open. Close them before closing the store.
            </Alert>
            <List dense sx={{ pt: 0 }}>
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
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>OK</Button>
      </DialogActions>
    </Dialog>
  );
}
