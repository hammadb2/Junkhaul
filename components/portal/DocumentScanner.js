'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { loadOpenCV } from '@/lib/opencvLoader';
import { scanLicenseBarcode, licenseToJSON } from '@/lib/barcodeScanner';

// ============================================================
// DocumentScanner — real document scanner using OpenCV.js.
//
// Flow:
// 1. Live camera with real-time edge detection overlay
// 2. Capture → edge detect → perspective-correct → enhance
// 3. License back: also scans PDF417 barcode (AAMVA parse)
// 4. All client-side WASM, no server needed.
// ============================================================

const videoConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

// ---- Document-type-aware overlay copy ----
const SCANNER_COPY = {
  sin_document: {
    title: 'Scan SIN document',
    subtitle: 'Position the document flat on a dark surface',
    frameHint: 'Make sure all four corners are visible',
  },
  drivers_license_front: {
    title: 'Scan driver\'s license — front',
    subtitle: 'Hold the front of your license facing the camera',
    frameHint: 'Fit the license inside the frame',
  },
  drivers_license_back: {
    title: 'Scan driver\'s license — back',
    subtitle: 'Flip your license over to the barcode side',
    frameHint: 'The barcode will be read automatically',
  },
  default: {
    title: 'Scan document',
    subtitle: 'Position the document flat on a dark surface',
    frameHint: 'Make sure all four corners are visible',
  },
};

function getScannerCopy(docType) {
  return SCANNER_COPY[docType] || SCANNER_COPY.default;
}

export default function DocumentScanner({ label, docType, onCapture, uploaded, previewUrl, uploading, onBarcodeData }) {
  const [mode, setMode] = useState('idle'); // idle | loading | camera | captured | processing | fallback
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturedImg, setCapturedImg] = useState(null);
  const [processedImg, setProcessedImg] = useState(null);
  const [edgesFound, setEdgesFound] = useState(false);
  const [cvReady, setCvReady] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [barcodeResult, setBarcodeResult] = useState(null);
  const webcamRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const processCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const streamRef = useRef(null);
  const cvRef = useRef(null);

  const copy = getScannerCopy(docType);
  const isLicenseBack = docType === 'drivers_license_back';

  // Pre-load OpenCV.js as soon as component mounts
  useEffect(() => {
    let cancelled = false;
    loadOpenCV()
      .then((cv) => {
        if (!cancelled) {
          cvRef.current = cv;
          setCvReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setCvReady(false);
      });
    return () => {
      cancelled = true;
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, []);

  // ---- Real-time edge detection on live video ----
  const startEdgeDetection = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = setInterval(() => {
      const video = webcamRef.current?.video;
      const canvas = previewCanvasRef.current;
      const cv = cvRef.current;
      if (!video || !canvas || !cv || video.readyState < 2) return;

      try {
        const src = cv.imread(video);
        const gray = new cv.Mat();
        const blur = new cv.Mat();
        const thresh = new cv.Mat();
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
        cv.Canny(blur, thresh, 50, 150);
        cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        // Find the largest rectangular-ish contour
        let maxArea = 0;
        let bestContour = null;
        for (let i = 0; i < contours.size(); i++) {
          const cnt = contours.get(i);
          const area = cv.contourArea(cnt);
          if (area < src.rows * src.cols * 0.02) continue; // too small
          const peri = cv.arcLength(cnt, true);
          const approx = new cv.Mat();
          cv.approxPolyDP(cnt, approx, 0.04 * peri, true);
          if (approx.rows === 4 && area > maxArea) {
            maxArea = area;
            bestContour = approx;
          } else {
            approx.delete();
          }
        }

        // Draw edges on preview canvas
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0);

        if (bestContour) {
          setEdgesFound(true);
          ctx.strokeStyle = '#95D373';
          ctx.lineWidth = 3;
          ctx.beginPath();
          const pts = [];
          for (let i = 0; i < 4; i++) {
            const x = bestContour.data32S[i * 2];
            const y = bestContour.data32S[i * 2 + 1];
            pts.push({ x, y });
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();

          // Draw corner circles
          pts.forEach(({ x, y }) => {
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#95D373';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
          });

          bestContour.delete();
        } else {
          setEdgesFound(false);
        }

        src.delete();
        gray.delete();
        blur.delete();
        thresh.delete();
        contours.delete();
        hierarchy.delete();
      } catch (e) {
        // Silently skip frames where detection fails
      }
    }, 400);
  }, []);

  const stopEdgeDetection = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  }, []);

  const startCamera = () => {
    if (!cvReady) {
      setMode('loading');
      loadOpenCV()
        .then((cv) => {
          cvRef.current = cv;
          setCvReady(true);
          setMode('camera');
          setCameraError('');
          setCameraReady(false);
        })
        .catch(() => {
          setCameraError('Could not load scanner. Try uploading a file instead.');
          setMode('fallback');
        });
      return;
    }
    setMode('camera');
    setCameraError('');
    setCameraReady(false);
  };

  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
    startEdgeDetection();
  }, [startEdgeDetection]);

  const handleCameraError = useCallback((err) => {
    console.warn('Camera error:', err);
    setCameraError('Camera not available. You can upload a photo instead.');
    setMode('fallback');
  }, []);

  // ---- Process captured image: edge detect + perspective correct + enhance ----
  const processCapturedImage = useCallback(async (imageSrc) => {
    setMode('processing');
    setProcessingMsg('Detecting edges...');
    const cv = cvRef.current;
    if (!cv) {
      setProcessingMsg('');
      setCapturedImg(imageSrc);
      setProcessedImg(null);
      setMode('captured');
      return;
    }

    try {
      // Load captured image into a canvas for OpenCV
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const src = cv.imread(img);

      // Edge detection pipeline (same as jscanify)
      setProcessingMsg('Finding document...');
      const gray = new cv.Mat();
      const blur = new cv.Mat();
      const thresh = new cv.Mat();
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();

      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
      cv.Canny(blur, thresh, 50, 150);
      cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      // Find largest 4-point contour
      let maxArea = 0;
      let corners = null;
      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        if (area < src.rows * src.cols * 0.03) continue;
        const peri = cv.arcLength(cnt, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.04 * peri, true);
        if (approx.rows === 4 && area > maxArea) {
          maxArea = area;
          corners = [];
          for (let j = 0; j < 4; j++) {
            corners.push({
              x: approx.data32S[j * 2],
              y: approx.data32S[j * 2 + 1],
            });
          }
        }
        approx.delete();
      }

      let resultCanvas;
      if (corners) {
        // Order corners: top-left, top-right, bottom-right, bottom-left
        corners.sort((a, b) => a.y - b.y);
        const top = corners.slice(0, 2).sort((a, b) => a.x - b.x);
        const bottom = corners.slice(2, 4).sort((a, b) => a.x - b.x);
        const ordered = [top[0], top[1], bottom[1], bottom[0]];

        // Perspective transform
        setProcessingMsg('Correcting perspective...');
        const resultWidth = 1700;
        const resultHeight = Math.round(resultWidth * (ordered[2].y - ordered[0].y) / (ordered[1].x - ordered[0].x));

        const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          ordered[0].x, ordered[0].y,
          ordered[1].x, ordered[1].y,
          ordered[2].x, ordered[2].y,
          ordered[3].x, ordered[3].y,
        ]);
        const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          0, 0,
          resultWidth, 0,
          resultWidth, resultHeight,
          0, resultHeight,
        ]);
        const M = cv.getPerspectiveTransform(srcTri, dstTri);
        const warped = new cv.Mat();
        cv.warpPerspective(src, warped, M, new cv.Size(resultWidth, resultHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255));

        // Enhance: increase contrast + sharpen
        setProcessingMsg('Enhancing...');
        const enhanced = new cv.Mat();
        cv.convertScaleAbs(warped, enhanced, 1.15, 0);

        resultCanvas = document.createElement('canvas');
        cv.imshow(resultCanvas, enhanced);

        srcTri.delete();
        dstTri.delete();
        M.delete();
        warped.delete();
        enhanced.delete();
      } else {
        // No document edges found — use original
        resultCanvas = document.createElement('canvas');
        resultCanvas.width = src.cols;
        resultCanvas.height = src.rows;
        cv.imshow(resultCanvas, src);
      }

      src.delete();
      gray.delete();
      blur.delete();
      thresh.delete();
      contours.delete();
      hierarchy.delete();

      const processedDataUrl = resultCanvas.toDataURL('image/jpeg', 0.92);
      setCapturedImg(imageSrc);
      setProcessedImg(processedDataUrl);
      setProcessingMsg('');
      setMode('captured');

      // ---- Barcode scan for license back ----
      if (isLicenseBack && onBarcodeData) {
        setProcessingMsg('Reading barcode...');
        const barcodeCanvas = document.createElement('canvas');
        barcodeCanvas.width = img.width;
        barcodeCanvas.height = img.height;
        barcodeCanvas.getContext('2d').drawImage(img, 0, 0);
        const result = await scanLicenseBarcode(barcodeCanvas);
        if (result.raw) {
          setBarcodeResult(result);
          if (result.parsed) {
            onBarcodeData(licenseToJSON(result.parsed));
          }
        }
        setProcessingMsg('');
      }

      return resultCanvas;
    } catch (e) {
      console.warn('Processing failed, using raw capture:', e);
      setProcessingMsg('');
      setCapturedImg(imageSrc);
      setProcessedImg(null);
      setMode('captured');
    }
  }, [isLicenseBack, onBarcodeData]);

  // ---- Capture ----
  const capture = useCallback(() => {
    if (!webcamRef.current || !cameraReady) return;
    stopEdgeDetection();
    const imageSrc = webcamRef.current.getScreenshot({ width: 1920, height: 1080 });
    if (imageSrc) {
      processCapturedImage(imageSrc);
    }
  }, [cameraReady, stopEdgeDetection, processCapturedImage]);

  // ---- Confirm (use processed image if available) ----
  const confirmCapture = async () => {
    const imgToUse = processedImg || capturedImg;
    const res = await fetch(imgToUse);
    const blob = await res.blob();
    const file = new File([blob], `${(label || 'doc').replace(/\s+/g, '-').toLowerCase()}.jpg`, { type: 'image/jpeg' });
    await onCapture(file);
    setMode('idle');
    setCapturedImg(null);
    setProcessedImg(null);
    setBarcodeResult(null);
  };

  const retakeCapture = () => {
    setCapturedImg(null);
    setProcessedImg(null);
    setBarcodeResult(null);
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

  const closeCamera = () => {
    stopEdgeDetection();
    setMode('idle');
  };

  // ---- RENDER ----

  // Already uploaded
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

  // Loading OpenCV
  if (mode === 'loading') {
    return (
      <div className="dark-card" style={{ padding: 20, borderRadius: 16, textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(249,115,22,0.2)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 14, color: 'rgba(0,0,0,.6)' }}>Loading scanner engine...</div>
      </div>
    );
  }

  // Processing captured image
  if (mode === 'processing') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {capturedImg && (
          <img src={capturedImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.3 }} />
        )}
        <div style={{ width: 52, height: 52, border: '4px solid rgba(149,211,115,0.3)', borderTopColor: '#95D373', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 20 }} />
        <div style={{ color: 'white', fontSize: 17, fontWeight: 600 }}>{processingMsg || 'Processing...'}</div>
      </div>
    );
  }

  // Captured — show processed + original side by side
  if (mode === 'captured' && capturedImg) {
    const displayImg = processedImg || capturedImg;
    const wasProcessed = !!processedImg;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
          <img src={displayImg} alt="Scanned document" style={{ width: '100%', display: 'block' }} />
          {wasProcessed && (
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(34,197,94,0.85)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8 }}>
              EDGES DETECTED · CORRECTED
            </div>
          )}
        </div>
        {wasProcessed && (
          <details style={{ fontSize: 12, color: 'rgba(0,0,0,.5)' }}>
            <summary style={{ cursor: 'pointer' }}>View original capture</summary>
            <img src={capturedImg} alt="Original" style={{ width: '100%', marginTop: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,.1)' }} />
          </details>
        )}
        {barcodeResult && (
          <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 12, padding: 12, border: '1px solid rgba(34,197,94,0.25)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#22C55E', marginBottom: 4 }}>Barcode read successfully</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,.6)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {barcodeResult.raw?.substring(0, 80)}...
            </div>
            {barcodeResult.parsed && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#1a1a1a' }}>
                {barcodeResult.parsed.firstName} {barcodeResult.parsed.lastName}
                {barcodeResult.parsed.dateOfBirth && ` · DOB: ${barcodeResult.parsed.dateOfBirth.toISOString().split('T')[0]}`}
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={retakeCapture} style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,.1)', background: '#F0F0F2', color: '#1a1a1a', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}>
            Retake
          </button>
          <button onClick={confirmCapture} style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#f97316', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}>
            Use Photo
          </button>
        </div>
      </div>
    );
  }

  // Camera mode — full-screen scanner
  if (mode === 'camera') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: '#000' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* Live camera */}
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.92}
            videoConstraints={videoConstraints}
            onUserMedia={handleCameraReady}
            onUserMediaError={handleCameraError}
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
          />

          {/* Edge detection overlay canvas (hidden, used by OpenCV) */}
          <canvas ref={previewCanvasRef} style={{ display: 'none' }} />

          {/* Live edge preview — shows detected edges over camera */}
          {cameraReady && cvReady && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              border: edgesFound ? '3px solid #95D373' : '3px solid transparent',
              transition: 'border-color 0.3s',
            }}>
              {edgesFound && (
                <div style={{ position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center' }}>
                  <span style={{ background: 'rgba(149,211,115,0.9)', color: '#000', fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 10 }}>
                    Document detected
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={closeCamera}
            style={{
              position: 'absolute',
              top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
              left: 14,
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0,0,0,0.55)',
              color: '#fff',
              fontSize: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
            }}
            aria-label="Close scanner"
          >
            ✕
          </button>

          {/* Guide frame + copy */}
          <div style={{
            position: 'absolute', top: '25%', left: 0, right: 0, bottom: '30%',
            pointerEvents: 'none', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'flex-start',
          }}>
            {/* Doc frame */}
            <div style={{
              width: '84%',
              maxWidth: 400,
              aspectRatio: '1.58',
              borderRadius: 16,
              border: `2px solid ${edgesFound ? '#95D373' : 'rgba(255,255,255,0.5)'}`,
              boxShadow: edgesFound
                ? '0 0 0 9999px rgba(0,0,0,0.5), inset 0 0 60px rgba(149,211,115,0.06)'
                : '0 0 0 9999px rgba(0,0,0,0.5)',
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }} />

            {/* Guidance text */}
            <div style={{ marginTop: 32, textAlign: 'center', padding: '0 32px' }}>
              <div style={{ color: '#95D373', fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>
                {copy.title}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 17, marginTop: 8, lineHeight: 1.4 }}>
                {copy.subtitle}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 6 }}>
                {copy.frameHint}
              </div>
              {isLicenseBack && (
                <div style={{ color: '#95D373', fontSize: 13, marginTop: 10, fontWeight: 600 }}>
                  Barcode will be read automatically
                </div>
              )}
            </div>
          </div>

          {/* Bottom controls */}
          <div style={{
            position: 'absolute', left: 0, right: 0,
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40,
            padding: '0 24px', zIndex: 10,
          }}>
            {/* Gallery button */}
            <button
              onClick={() => { stopEdgeDetection(); setMode('fallback'); }}
              style={{
                width: 48, height: 48, borderRadius: 14,
                border: 'none', background: 'rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 22, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Choose from gallery"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </button>

            {/* Shutter button */}
            <button
              onClick={capture}
              disabled={!cameraReady}
              style={{
                width: 78,
                height: 78,
                borderRadius: '50%',
                border: '5px solid rgba(255,255,255,0.85)',
                background: cameraReady ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                boxShadow: '0 0 0 4px rgba(0,0,0,0.3)',
                cursor: cameraReady ? 'pointer' : 'not-allowed',
                transition: 'transform 0.15s',
              }}
              aria-label="Capture document"
            />

            {/* Flash placeholder */}
            <div style={{ width: 48, height: 48 }} />
          </div>

          {/* Camera error */}
          {cameraError && (
            <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, textAlign: 'center' }}>
              <span style={{ background: 'rgba(239,68,68,0.8)', color: '#fff', fontSize: 13, padding: '8px 16px', borderRadius: 10 }}>
                {cameraError}
              </span>
            </div>
          )}
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Upload {label}</span>
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,.4)' }}>Take a photo or choose from gallery</span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileUpload} />
        <button onClick={() => setMode('camera')} style={{ background: 'transparent', border: 'none', color: '#f97316', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          Try scanner again
        </button>
      </div>
    );
  }

  // Idle — initial state
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
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,.4)' }}>
            {cvReady ? 'Tap to scan — edges detected automatically' : 'Loading scanner engine...'}
          </div>
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
