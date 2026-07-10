'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Search } from 'lucide-react';

// ============================================================
// AddressAutocomplete — Mapbox-powered address search.
// Works in both light and dark themes via the `dark` prop.
// Returns the full Mapbox feature object to the parent.
// ============================================================

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing address...',
  className = '',
  dark = false,
  style = {},
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  const fetchSuggestions = async (query) => {
    if (query.length < 2 || !MAPBOX_TOKEN) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const proximity = '-114.0719,51.0447';
      const bbox = '-114.3,50.9,-113.9,51.2';
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=ca&proximity=${proximity}&bbox=${bbox}&types=address,poi,neighborhood&limit=6&autocomplete=true`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch { setSuggestions([]); }
    finally { setLoading(false); }
  };

  const handleChange = (val) => {
    onChange(val);
    setShowDropdown(true);
    setHighlighted(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 200);
  };

  const selectSuggestion = (s) => {
    onChange(s.place_name);
    if (onSelect) onSelect(s);
    setSuggestions([]);
    setShowDropdown(false);
    setHighlighted(-1);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && highlighted >= 0) { e.preventDefault(); selectSuggestion(suggestions[highlighted]); }
    else if (e.key === 'Escape') { setShowDropdown(false); }
  };

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Theme-based styles
  const inputBg = dark ? '#1A1A1E' : '#fff';
  const inputBorder = dark ? 'rgba(255,255,255,0.08)' : '#d1d5db';
  const inputColor = dark ? 'rgba(255,255,255,0.9)' : '#111827';
  const dropdownBg = dark ? '#161618' : '#fff';
  const dropdownBorder = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const itemHover = dark ? 'rgba(255,255,255,0.04)' : '#fff7ed';
  const itemActive = dark ? 'rgba(249,115,22,0.08)' : '#fff7ed';
  const mainText = dark ? 'rgba(255,255,255,0.9)' : '#111827';
  const subText = dark ? 'rgba(255,255,255,0.4)' : '#6b7280';
  const loadingColor = dark ? 'rgba(255,255,255,0.4)' : '#9ca3af';

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => value && value.length >= 2 && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="street-address"
        className={className}
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: 14,
          color: inputColor,
          background: inputBg,
          border: `1px solid ${inputBorder}`,
          borderRadius: 12,
          outline: 'none',
          ...style,
        }}
      />
      {showDropdown && (suggestions.length > 0 || loading) && (
        <div style={{
          position: 'absolute', zIndex: 50, left: 0, right: 0, marginTop: 4,
          background: dropdownBg, borderRadius: 12, border: `1px solid ${dropdownBorder}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)', maxHeight: 288, overflowY: 'auto',
        }}>
          {loading && (
            <div style={{ padding: '12px 16px', fontSize: 14, color: loadingColor, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 16, height: 16, border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Searching addresses...
            </div>
          )}
          {suggestions.map((s, i) => {
            const parts = (s.place_name || '').split(',');
            const mainAddr = parts[0] || s.place_name;
            const area = parts.slice(1).join(',').trim();
            return (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                onMouseEnter={() => setHighlighted(i)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px',
                  background: highlighted === i ? itemActive : 'transparent',
                  border: 'none', borderBottom: i < suggestions.length - 1 ? `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6'}` : 'none',
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                }}
              >
                <MapPin size={14} color="#f97316" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: mainText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mainAddr}</div>
                  {area && <div style={{ fontSize: 12, color: subText, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{area}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
