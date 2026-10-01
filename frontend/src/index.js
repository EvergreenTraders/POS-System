import React from 'react';
import { createRoot } from 'react-dom/client';
import { SnackbarProvider } from 'notistack';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Required for every enqueueSnackbar() call (notistack) — without it
        those success/error messages are silently dropped. */}
    <SnackbarProvider
      maxSnack={3}
      autoHideDuration={4000}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <App />
    </SnackbarProvider>
  </React.StrictMode>
);
