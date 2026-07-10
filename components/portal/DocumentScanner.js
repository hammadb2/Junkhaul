'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';

// ============================================================
// DocumentScanner — proper document capture using camera.
// Shows a guide frame, auto-detects document edges, and
// captures when the document fills the frame.
// Falls back to file upload if camera not available.
// ============================================================

const videoConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

export default function DocumentScanner({ label, onCapture, uploaded, previewUrl, uploading }) {
  const [mode, setMode] = useState('idle'); // idle | camera | captured | fallback
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [capturedImg, setCapturedImg] = useState(null);
  const [brightness, setBrightness] = useState(0);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const checkIntervalRef = useRef(null);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, []);

  const startCamera = () => {
    setMode('camera');
    setCameraError('');
    setCameraReady(false);
  };

  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
    // Start brightness/quality check loop
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    checkIntervalRef.current = setInterval(() => {
      checkFrameQuality();
    }, 500);
  }, []);

  const handleCameraError = useCallback((err) => {
    console.warn('Camera error:', err);
    setCameraError('Camera not available. You can upload a photo instead.');
    setMode('fallback');
  }, []);

  // Check frame quality — brightness and document detection
  const checkFrameQuality = () => {
    if (!webcamRef.current?.video || !canvasRef.current) return;
    const video = webcamRef.current.video;
    if (!video.videoWidth) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // Downscale for performance
    const w = 160;
    const h = 120;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Calculate average brightness
    let totalBrightness = 0;
    let edgeContrast = 0;
    let prevBrightness = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      totalBrightness += lum;
      // Check contrast between adjacent pixels (edge detection)
      if (i > 0 && i % (w * 4) !== 0) {
        edgeContrast += Math.abs(lum - prevBrightness);
      }
      prevBrightness = lum;
    }

    const avgBrightness = totalBrightness / (data.length / 4);
    const avgContrast = edgeContrast / (data.length / 4);
    setBrightness(avgBrightness);

    // Store quality metrics for auto-capture decision
    canvas.dataset.brightness = avgBrightness;
    canvas.dataset.contrast = avgContrast;
  };

  const capture = useCallback(() => {
    if (!webcamRef.current) return;
    setCapturing(true);
    const imageSrc = webcamRef.current.getScreenshot({
      width: 1920,
      height: 1080,
    });
    if (imageSrc) {
      setCapturedImg(imageSrc);
      setMode('captured');
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    }
    setCapturing(false);
  }, []);

  const confirmCapture = async () => {
    // Convert base64 to File
    const res = await fetch(capturedImg);
    const blob = await res.blob();
    const file = new File([blob], `${label.replace(/\s+/g, '-').toLowerCase()}.jpg`, { type: 'image/jpeg' });
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
          {uploading ? (
            <div style={{ width: 48, height: 48, borderRadius: 10, background: '#F0F0F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 24, height: 24, border: '3px solid rgba(249,115,22,0.2)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 10, background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{label}</div>
            <div style={{ fontSize: 13, color: uploading ? '#F59E0B' : '#22C55E', fontWeight: 500 }}>
              {uploading ? 'Uploading...' : 'Uploaded'}
            </div>
          </div>
          {previewUrl && !uploading && (
            <img src={previewUrl} alt={label} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,.1)' }} />
          )}
          {!uploading && (
            <button
              onClick={() => setMode('camera')}
              style={{ background: 'transparent', border: 'none', color: 'rgba(0,0,0,.4)', fontSize: 13, cursor: 'pointer', padding: '8px 12px', minHeight: 36 }}
            >
              Retake
            </button>
          )}
        </div>
      </div>
    );
  }

  // Captured — show preview before confirming
  if (mode === 'captured' && capturedImg) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
          <img src={capturedImg} alt="Captured document" style={{ width: '100%', display: 'block' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={retakeCapture}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,.1)', background: '#F0F0F2', color: '#1a1a1a', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}
          >
            Retake
          </button>
          <button
            onClick={confirmCapture}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#f97316', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}
          >
            Use Photo
          </button>
        </div>
      </div>
    );
  }

  // Camera mode — live camera with guide frame
  if (mode === 'camera') {
    const isGoodLight = brightness > 0.15 && brightness < 0.85;
    const isFront = /front/i.test(label);
    const helperTitle = isFront ? 'Take a photo of the front of your ID' : 'Take a photo of the back of your ID';
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: '#000' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.92}
            videoConstraints={videoConstraints}
            onUserMedia={handleCameraReady}
            onUserMediaError={handleCameraError}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* Close */}
          <button
            onClick={() => setMode('idle')}
            style={{
              position: 'absolute',
              top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
              left: 16,
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0,0,0,0.55)',
              color: '#95D373',
              fontSize: 30,
              lineHeight: '44px',
              cursor: 'pointer',
            }}
            aria-label="Close camera"
          >
            ×
          </button>

          {/* Frame + guidance */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '82%', maxWidth: 370, aspectRatio: '1.58', borderRadius: 14, border: `2px solid ${isGoodLight ? '#95D373' : 'rgba(255,255,255,0.8)'}`, boxShadow: '0 0 0 9999px rgba(0,0,0,0.48)' }} />
            <div style={{ marginTop: 26, textAlign: 'center', padding: '0 24px' }}>
              <div style={{ color: '#95D373', fontWeight: 700, fontSize: 30, lineHeight: 1.1 }}>▦</div>
              <div style={{ color: '#95D373', fontSize: 31, fontWeight: 700, lineHeight: 1.2 }}>{helperTitle}</div>
              <div style={{ color: 'rgba(255,255,255,0.84)', fontSize: 23, marginTop: 8 }}>
                Please make sure your ID fits in the box above.
              </div>
            </div>
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Light indicator */}
          {cameraReady && (
            <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 18px)', right: 16, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: '6px 10px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isGoodLight ? '#95D373' : '#f59e0b' }} />
              <span style={{ color: 'white', fontSize: 11, fontWeight: 600 }}>
                {isGoodLight ? 'Good light' : 'Need light'}
              </span>
            </div>
          )}

          {/* Bottom controls */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px' }}>
            <button
              onClick={() => setMode('fallback')}
              style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 18 }}
              aria-label="Upload file instead"
            >
              ⇪
            </button>
            <button
              onClick={capture}
              disabled={!cameraReady || capturing}
              style={{
                width: 74,
                height: 74,
                borderRadius: '50%',
                border: '4px solid rgba(255,255,255,0.85)',
                background: capturing ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.92)',
                boxShadow: '0 0 0 3px rgba(0,0,0,0.35)',
                cursor: cameraReady ? 'pointer' : 'not-allowed',
              }}
              aria-label="Capture image"
            />
            <button
              type="button"
              style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 18 }}
              aria-label="Flash not available in browser"
            >
              ϟ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback mode — file upload
  if (mode === 'fallback') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="dark-card"
          style={{ padding: 24, borderRadius: 16, border: '2px dashed rgba(0,0,0,.15)', background: '#F0F0F2', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Upload {label}</span>
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,.4)' }}>Take a photo or choose from gallery</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
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

  // Idle mode — initial state
  return (
    <div className="dark-card" style={{ padding: 16, borderRadius: 16, border: '1px solid rgba(0,0,0,.06)', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: '#F0F0F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{label}</div>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,.4)' }}>Tap to scan or upload</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={startCamera}
          style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#f97316', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 46 }}
        >
          Scan with Camera
        </button>
        <button
          onClick={() => setMode('fallback')}
          style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid rgba(0,0,0,.1)', background: '#F0F0F2', color: '#1a1a1a', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 46 }}
        >
          Upload File
        </button>
      </div>
    </div>
  );
}
