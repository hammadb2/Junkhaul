'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';

// ============================================================
// SelfieCapture — proper selfie capture using front camera.
// Shows a face guide overlay, captures at high quality.
// Falls back to file upload if camera not available.
// ============================================================

const videoConstraints = {
  facingMode: { ideal: 'user' },
  width: { ideal: 1280 },
  height: { ideal: 1280 },
};

export default function SelfieCapture({ onCapture, uploaded, previewUrl }) {
  const [mode, setMode] = useState('idle'); // idle | camera | captured | fallback
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturedImg, setCapturedImg] = useState(null);
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => { /* cleanup */ };
  }, []);

  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
  }, []);

  const handleCameraError = useCallback((err) => {
    console.warn('Selfie camera error:', err);
    setCameraError('Camera not available. You can upload a photo instead.');
    setMode('fallback');
  }, []);

  const capture = useCallback(() => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot({
      width: 720,
      height: 720,
    });
    if (imageSrc) {
      setCapturedImg(imageSrc);
      setMode('captured');
    }
  }, []);

  const confirmCapture = async () => {
    const res = await fetch(capturedImg);
    const blob = await res.blob();
    const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
    await onCapture(file);
    setMode('idle');
    setCapturedImg(null);
  };

  const retakeCapture = () => {
    setCapturedImg(null);
    setMode('camera');
    setCameraReady(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
      setMode('idle');
    }
  };

  // Already uploaded — show preview
  if (uploaded && mode === 'idle') {
    return (
      <div className="dark-card" style={{ padding: 16, borderRadius: 16, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {previewUrl ? (
            <img src={previewUrl} alt="Selfie" style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover', border: '2px solid #22C55E' }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 28, background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Crew selfie</div>
            <div style={{ fontSize: 13, color: '#22C55E', fontWeight: 500 }}>Uploaded</div>
          </div>
          <button
            onClick={() => setMode('camera')}
            style={{ background: 'transparent', border: 'none', color: 'rgba(0,0,0,.4)', fontSize: 13, cursor: 'pointer', padding: 4 }}
          >
            Retake
          </button>
        </div>
      </div>
    );
  }

  // Captured — show preview
  if (mode === 'captured' && capturedImg) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '1' }}>
          <img src={capturedImg} alt="Selfie preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={retakeCapture}
            style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,.1)', background: '#F0F0F2', color: '#1a1a1a', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Retake
          </button>
          <button
            onClick={confirmCapture}
            style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: '#f97316', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Use Photo
          </button>
        </div>
      </div>
    );
  }

  // Camera mode — front camera with face guide
  if (mode === 'camera') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '1' }}>
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.92}
            videoConstraints={videoConstraints}
            onUserMedia={handleCameraReady}
            onUserMediaError={handleCameraError}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            mirrored={false}
          />

          {/* Face guide overlay */}
          {cameraReady && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: '60%',
                height: '75%',
                border: '3px dashed rgba(255,255,255,0.5)',
                borderRadius: '50%',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)',
              }} />
            </div>
          )}

          {/* Label */}
          <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 13, fontWeight: 500, padding: '4px 12px', borderRadius: 20 }}>
              Center your face in the circle
            </span>
          </div>
        </div>

        {cameraError && (
          <div style={{ fontSize: 13, color: '#ea580c', textAlign: 'center' }}>{cameraError}</div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setMode('fallback')}
            style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,.1)', background: '#F0F0F2', color: '#1a1a1a', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Upload Instead
          </button>
          <button
            onClick={capture}
            disabled={!cameraReady}
            style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: cameraReady ? '#f97316' : '#ccc', color: 'white', fontSize: 14, fontWeight: 600, cursor: cameraReady ? 'pointer' : 'not-allowed' }}
          >
            Capture
          </button>
        </div>
      </div>
    );
  }

  // Fallback — file upload
  if (mode === 'fallback') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="dark-card"
          style={{ padding: 24, borderRadius: 16, border: '2px dashed rgba(0,0,0,.15)', background: '#F0F0F2', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Upload Selfie</span>
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,.4)' }}>Take a selfie or choose from gallery</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <button
          onClick={() => setMode('camera')}
          style={{ background: 'transparent', border: 'none', color: '#f97316', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          ← Try camera again
        </button>
      </div>
    );
  }

  // Idle — initial state
  return (
    <div className="dark-card" style={{ padding: 16, borderRadius: 16, border: '1px solid rgba(0,0,0,.06)', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: '#F0F0F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Crew selfie</div>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,.4)' }}>Tap to take a selfie</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setMode('camera')}
          style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#f97316', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Take Selfie
        </button>
        <button
          onClick={() => setMode('fallback')}
          style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid rgba(0,0,0,.1)', background: '#F0F0F2', color: '#1a1a1a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Upload File
        </button>
      </div>
    </div>
  );
}
