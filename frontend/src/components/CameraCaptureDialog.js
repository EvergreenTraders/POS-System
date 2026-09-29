import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
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

// ============================================================================
// Shared image capture & upload for the whole app — every camera capture and
// every image file picker goes through this file.
//
//   CameraView          live camera preview (inline) + optional Capture button
//   CameraCaptureDialog the same CameraView inside a dialog (default export)
//   ImageFileInput      hidden <input type="file"> for images
//   readFileAsDataUrl / toImageResults   file → data URL helpers
//
// Every capture/selection is reported as an "image result":
//   { file: File, dataUrl: string }
// so each screen keeps its own storage choice — upload the File, keep a
// data URL (survives localStorage/workspace persistence), or make an object
// URL with URL.createObjectURL(result.file).
// ============================================================================

export const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

// FileList / File[] → [{ file, dataUrl }]
export const toImageResults = (files) =>
  Promise.all(Array.from(files || []).map(async file => ({ file, dataUrl: await readFileAsDataUrl(file) })));

const CAMERA_ERROR_MESSAGES = {
  unsupported: 'This browser can’t access a camera. Use Upload instead.',
  denied: 'Camera permission was denied. Allow camera access in the browser, or use Upload instead.',
  unavailable: 'No camera is available. Use Upload instead.',
};

// ── CameraView ──────────────────────────────────────────────────────────────
// Starts the camera while `active` and always releases it when inactive or
// unmounted. Capture draws the current frame to a canvas and calls
// onCapture({ file, dataUrl }) (JPEG). The parent can trigger capture itself
// through the ref (ref.current.capture()) — e.g. from a dialog's action bar —
// and follow readiness with onReadyChange.
//
// Props:
//   active            start/stop the camera (default true)
//   facingMode        'environment' (rear, default) | 'user' (front)
//   resolution        optional { width, height } ideal capture size
//   quality           JPEG quality 0–1 (default 0.9)
//   fileNamePrefix    captured file name prefix (default 'photo')
//   onCapture         (result) => void
//   onError           (message, error) => void; when omitted the message is
//                     shown inline instead of the preview
//   onReadyChange     (ready: boolean) => void
//   showCaptureButton render the built-in Capture button (default true)
//   captureButtonProps / captureLabel   customise the built-in button
//   videoStyle / sx   styling for the <video> / wrapper
export const CameraView = forwardRef(function CameraView({
  active = true,
  facingMode = 'environment',
  resolution,
  quality = 0.9,
  fileNamePrefix = 'photo',
  onCapture,
  onError,
  onReadyChange,
  showCaptureButton = true,
  captureLabel = 'Capture',
  captureButtonProps,
  videoStyle,
  sx,
}, ref) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const updateReady = useCallback((value) => {
    setReady(value);
    if (onReadyChange) onReadyChange(value);
  }, [onReadyChange]);

  // The <video> may mount before or after the stream is ready; attach
  // whichever arrives second.
  const attachVideo = useCallback((el) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) el.srcObject = streamRef.current;
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    setError('');
    const fail = (key, err) => {
      if (cancelled) return;
      const message = CAMERA_ERROR_MESSAGES[key];
      if (onError) onError(message, err); else setError(message);
    };
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { fail('unsupported'); return; }
      try {
        const video = { facingMode };
        if (resolution?.width) video.width = { ideal: resolution.width };
        if (resolution?.height) video.height = { ideal: resolution.height };
        const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error('Camera error:', err);
        fail(err?.name === 'NotAllowedError' ? 'denied' : 'unavailable', err);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      updateReady(false);
    };
    // resolution is an object literal at most call sites — compare its values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, facingMode, resolution?.width, resolution?.height]);

  const capture = useCallback(() => new Promise((resolve) => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { resolve(null); return; }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    canvas.toBlob(blob => {
      if (!blob) { resolve(null); return; }
      const result = {
        file: new File([blob], `${fileNamePrefix}-${Date.now()}.jpg`, { type: 'image/jpeg' }),
        dataUrl,
      };
      if (onCapture) onCapture(result);
      resolve(result);
    }, 'image/jpeg', quality);
  }), [quality, fileNamePrefix, onCapture]);

  useImperativeHandle(ref, () => ({ capture, isReady: () => ready }), [capture, ready]);

  if (!active) return null;
  if (error) return <Alert severity="warning" sx={sx}>{error}</Alert>;

  return (
    <Box sx={sx}>
      <Box sx={{ position: 'relative' }}>
        <Box component="video" ref={attachVideo} autoPlay playsInline muted
          onCanPlay={() => updateReady(true)}
          style={{ width: '100%', display: 'block', ...videoStyle }} />
        {!ready && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        )}
      </Box>
      {showCaptureButton && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <Button variant="contained" size="small" startIcon={<PhotoCameraIcon />}
            onClick={capture} disabled={!ready} {...captureButtonProps}>
            {captureLabel}
          </Button>
        </Box>
      )}
    </Box>
  );
});

// ── CameraCaptureDialog ─────────────────────────────────────────────────────
// CameraView in a dialog with Cancel / Capture. onCapture(result) is called
// with { file, dataUrl }; the parent closes the dialog (onClose).
// Pass title={null} for no title bar; contentSx / actionsSx /
// captureButtonSx let each screen keep its own look (e.g. its brand colour).
export default function CameraCaptureDialog({
  open,
  title = 'Take Photo',
  facingMode = 'environment',
  resolution,
  quality,
  fileNamePrefix,
  maxWidth = 'sm',
  captureLabel = 'Capture',
  contentSx,
  actionsSx,
  captureButtonSx,
  onClose,
  onCapture,
}) {
  const cameraRef = useRef(null);
  const [ready, setReady] = useState(false);

  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      {title && <DialogTitle>{title}</DialogTitle>}
      <DialogContent sx={contentSx}>
        <CameraView
          ref={cameraRef}
          active={open}
          facingMode={facingMode}
          resolution={resolution}
          quality={quality}
          fileNamePrefix={fileNamePrefix}
          onCapture={onCapture}
          onReadyChange={setReady}
          showCaptureButton={false}
          videoStyle={{ borderRadius: 8, background: '#000', maxHeight: '60vh', objectFit: 'contain' }}
        />
      </DialogContent>
      <DialogActions sx={actionsSx}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" startIcon={<PhotoCameraIcon />}
          onClick={() => cameraRef.current?.capture()} disabled={!ready}
          sx={{ textTransform: 'none', ...captureButtonSx }}>
          {captureLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Shared look of the transaction screens' item-photo dialogs (Buy / Pawn /
// Trade): no title, black preview, Cancel left / Capture right.
export const ITEM_PHOTO_DIALOG_PROPS = {
  title: null,
  contentSx: { p: 1.5, bgcolor: '#000' },
  actionsSx: { justifyContent: 'space-between', px: 2 },
};

// ── ImageFileInput ──────────────────────────────────────────────────────────
// Hidden image file picker. Open it with ref.current.click(), a
// <label htmlFor={id}>, or by rendering it inside <Button component="label">.
// onSelect receives [{ file, dataUrl }] (dataUrl is null when
// readAsDataUrl={false}); the input is reset so the same file can be picked
// again. `capture` ('environment' | 'user') asks phones to open the camera
// directly instead of the gallery.
export const ImageFileInput = forwardRef(function ImageFileInput({
  id,
  multiple = false,
  capture,
  accept = 'image/*',
  readAsDataUrl = true,
  onSelect,
}, ref) {
  return (
    <input
      ref={ref}
      id={id}
      type="file"
      hidden
      accept={accept}
      multiple={multiple}
      capture={capture}
      onChange={async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;
        onSelect(readAsDataUrl ? await toImageResults(files) : files.map(file => ({ file, dataUrl: null })));
      }}
    />
  );
});
