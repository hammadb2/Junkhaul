'use client';

import { useRef, useState } from 'react';

// ============================================================
// SelfieCapture — simple file upload. Admin reviews later.
// ============================================================

export default function SelfieCapture({ onCapture, uploaded, previewUrl, uploading }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
  };

  // Already uploaded
  if (uploaded) {
    return (
      <div className="dark-card" style={{ padding: 16, borderRadius: 16, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {uploading ? (
            <div style={{ width: 56, height: 56, borderRadius: 28, background: '#F0F0F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, border: '3px solid rgba(249,115,22,0.2)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : previewUrl ? (
            <img src={previewUrl} alt="Selfie" style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover', border: '2px solid #22C55E' }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 28, background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Crew selfie</div>
            <div style={{ fontSize: 13, color: uploading ? '#F59E0B' : '#22C55E', fontWeight: 500 }}>
              {uploading ? 'Uploading...' : 'Uploaded'}
            </div>
          </div>
          {!uploading && (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ background: 'transparent', border: 'none', color: 'rgba(0,0,0,.4)', fontSize: 13, cursor: 'pointer', padding: '8px 12px', minHeight: 36 }}
            >
              Replace
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handleFile} />
      </div>
    );
  }

  // Not uploaded — upload card
  return (
    <div
      className="dark-card"
      style={{
        padding: 20,
        borderRadius: 16,
        border: dragOver ? '2px dashed #f97316' : '2px dashed rgba(0,0,0,.12)',
        background: dragOver ? 'rgba(249,115,22,0.04)' : '#F0F0F2',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onCapture(file);
      }}
    >
      {uploading ? (
        <div style={{ width: 36, height: 36, border: '3px solid rgba(249,115,22,0.2)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      ) : (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
      )}
      <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{uploading ? 'Uploading...' : 'Upload selfie'}</span>
      <span style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', textAlign: 'center' }}>
        Tap to choose a photo of yourself from your device
      </span>
      <input ref={fileInputRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}
