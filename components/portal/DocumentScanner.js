'use client';

import { useRef, useState } from 'react';

// ============================================================
// DocumentScanner — simple file upload. Admin reviews later.
// ============================================================

export default function DocumentScanner({ label, onCapture, uploaded, previewUrl, uploading }) {
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
              onClick={() => fileInputRef.current?.click()}
              style={{ background: 'transparent', border: 'none', color: 'rgba(0,0,0,.4)', fontSize: 13, cursor: 'pointer', padding: '8px 12px', minHeight: 36 }}
            >
              Replace
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFile} />
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
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
      )}
      <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{uploading ? 'Uploading...' : `Upload ${label}`}</span>
      <span style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', textAlign: 'center' }}>
        Tap to choose a photo or PDF from your device
      </span>
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}
