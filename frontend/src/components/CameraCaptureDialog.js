import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

// Live camera preview + capture. Calls onCapture(File) with a JPEG of the
// current frame. The camera is started when the dialog opens and always
// released when it closes or unmounts. Prefers the rear camera on
// phones/tablets (facingMode: environment); desktops use the default webcam.
export default function CameraCaptureDialog({ open, title = 'Take Photo', onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  // The dialog may mount the <video> before or after the stream is ready;
  // attach whichever arrives second.
  const attachVideo = (el) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) el.srcObject = streamRef.current;
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setReady(false);
  };

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setError('');
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser can’t access a camera. Use Upload Image instead.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        if (!cancelled) {
          setError(err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in the browser, or use Upload Image.'
            : 'No camera is available. Use Upload Image instead.');
        }
      }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, [open]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="warning">{error}</Alert>
        ) : (
          <Box sx={{ position: 'relative', bgcolor: 'black', borderRadius: 1, overflow: 'hidden', aspectRatio: '4 / 3' }}>
            <Box component="video" ref={attachVideo} autoPlay playsInline muted
              onLoadedMetadata={() => setReady(true)}
              sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            {!ready && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress sx={{ color: 'white' }} />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" startIcon={<PhotoCameraIcon />} onClick={handleCapture} disabled={!ready || !!error}>
          Capture
        </Button>
      </DialogActions>
    </Dialog>
  );
}
