'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Search } from 'lucide-react';

// ============================================================
// AddressAutocomplete — Mapbox-powered address search.
// Works in both light and dark themes via the `dark` prop.
// Returns the full Mapbox feature object to the parent via onSelect.
// ============================================================

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
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const debounceRef = useRef(null);

  const fetchSuggestions = async (query) => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (query.length < 2) {
      setSuggestions([]);
      setHasSearched(false);
      setSearchError(false);
      return;
    }
    if (!token) {
      setSuggestions([]);
      setHasSearched(true);
      setSearchError(true);
      return;
    }
    setLoading(true);
    try {
      const proximity = '-114.0719,51.0447';
      const bbox = '-114.3,50.9,-113.9,51.2';
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=ca&proximity=${proximity}&bbox=${bbox}&types=address,poi,neighborhood&limit=6&autocomplete=true`
      );
      if (!res.ok) throw new Error(`Mapbox API returned ${res.status}`);
      const data = await res.json();
      setSuggestions(data.features || []);
      setHasSearched(true);
      setSearchError(false);
    } catch (err) {
      console.error('[AddressAutocomplete] Mapbox fetch error:', err);
      setSuggestions([]);
      setHasSearched(true);
      setSearchError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (val) => {
    onChange(val);
    setShowDropdown(true);
    setHighlighted(-1);
    setHasSearched(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250);
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
  const itemActive = dark ? 'rgba(249,115,22,0.12)' : '#fff7ed';
  const mainText = dark ? 'rgba(255,255,255,0.9)' : '#111827';
  const subText = dark ? 'rgba(255,255,255,0.4)' : '#6b7280';
  const loadingColor = dark ? 'rgba(255,255,255,0.4)' : '#9ca3af';
  const noResultColor = dark ? 'rgba(255,255,255,0.3)' : '#9ca3af';

  const showResults = showDropdown && (loading || suggestions.length > 0 || (hasSearched && suggestions.length === 0));

  const errorColor = dark ? 'rgba(255,200,100,0.7)' : '#b45309';
  const errorBg = dark ? 'rgba(255,200,100,0.08)' : '#fffbeb';

  return (
    <div style={{ position: 'relative', zIndex: 9999 }}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (value && value.length >= 2) setShowDropdown(true); }}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={className}
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: 16,
          color: inputColor,
          background: inputBg,
          border: `1px solid ${inputBorder}`,
          borderRadius: 12,
          outline: 'none',
          boxSizing: 'border-box',
          ...style,
        }}
      />
      {showResults && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 9999,
          marginTop: 4,
          background: dropdownBg,
          borderRadius: 12,
          border: `1px solid ${dropdownBorder}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          maxHeight: 288,
          overflowY: 'auto',
        }}>
          {loading && (
            <div style={{ padding: '14px 16px', fontSize: 14, color: loadingColor, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 16, height: 16, border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Searching addresses...
            </div>
          )}
          {!loading && suggestions.length === 0 && hasSearched && (
            <div style={{ padding: '14px 16px', fontSize: 14, color: searchError ? errorColor : noResultColor, background: searchError ? errorBg : 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={14} />
              {searchError
                ? 'Address search unavailable — you can still type your full address manually.'
                : 'No addresses found. Try a different search.'}
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
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  background: highlighted === i ? itemActive : 'transparent',
                  border: 'none',
                  borderBottom: i < suggestions.length - 1 ? `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6'}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <MapPin size={14} color="#f97316" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
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
