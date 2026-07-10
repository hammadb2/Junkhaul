'use client';

import { useState, useMemo } from 'react';
import { ITEM_PRICING } from '@/lib/itemPricing';

// ============================================================
// AddItemPicker — lets users add items to their booking.
// Works in both the itemized photo flow AND the manual load
// size flow. Users can search or browse by category, pick
// an item, set quantity, and mark it for dump or donate.
// ============================================================

const CATEGORIES = [
  { key: 'furniture', label: 'Furniture' },
  { key: 'mattress', label: 'Beds & Mattresses' },
  { key: 'freon', label: 'Appliances (Freon)' },
  { key: 'appliance', label: 'Appliances' },
  { key: 'ewaste', label: 'Electronics' },
  { key: 'outdoor', label: 'Outdoor' },
  { key: 'construction', label: 'Renovation' },
  { key: 'misc', label: 'Boxes & Misc' },
];

// Build a searchable list from the catalog
const ALL_ITEMS = Object.entries(ITEM_PRICING).map(([key, val]) => ({
  key,
  ...val,
}));

export function buildItemFromKey(key, quantity = 1) {
  const cat = ITEM_PRICING[key];
  if (!cat) return null;
  return {
    key,
    name: cat.name,
    original_name: cat.name,
    quantity,
    unit_price: cat.price,
    line_total: cat.price * quantity,
    category: cat.category,
    is_freon: cat.category === 'freon',
    is_hazmat: false,
    donatable: cat.donatable,
    avg_kg: cat.avg_kg,
    note: cat.note || null,
    disposal: 'dump',
  };
}

export default function AddItemPicker({ onAdd, compact = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [qty, setQty] = useState(1);
  const [disposal, setDisposal] = useState('dump');

  const filtered = useMemo(() => {
    let list = ALL_ITEMS;
    if (category) list = list.filter((i) => i.category === category);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    return list;
  }, [search, category]);

  const selectedItem = selectedKey ? ITEM_PRICING[selectedKey] : null;

  const handleAdd = () => {
    if (!selectedKey) return;
    const item = buildItemFromKey(selectedKey, qty);
    if (!item) return;
    // Respect donatable flag
    if (!item.donatable) item.disposal = 'dump';
    else item.disposal = disposal;
    onAdd(item);
    // Reset
    setSelectedKey(null);
    setQty(1);
    setDisposal('dump');
    setSearch('');
    setCategory(null);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm font-medium text-gray-500 hover:border-orange-400 hover:text-orange-500 transition-colors ${compact ? '' : 'mt-2'}`}
      >
        + Add an item
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900 text-sm">Add an item</span>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
        autoFocus
      />

      {/* Category tabs */}
      {!search.trim() && (
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setCategory(null)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${!category ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${category === c.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Item list */}
      <div className="max-h-48 overflow-y-auto space-y-1">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No items found</p>
        )}
        {filtered.map((item) => (
          <button
            key={item.key}
            onClick={() => setSelectedKey(item.key)}
            className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedKey === item.key
                ? 'bg-orange-50 border border-orange-300'
                : 'hover:bg-gray-50 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-900">{item.name}</span>
              {item.category === 'freon' && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Freon</span>
              )}
              {!item.donatable && item.category !== 'freon' && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">No donate</span>
              )}
            </div>
            <span className="text-gray-500 text-xs">${item.price}</span>
          </button>
        ))}
      </div>

      {/* Selected item config */}
      {selectedItem && (
        <div className="border-t border-gray-200 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">{selectedItem.name}</span>
            <span className="text-sm text-gray-500">${selectedItem.price} each</span>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Quantity:</span>
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-7 h-7 rounded-full border border-gray-300 text-sm"
            >−</button>
            <span className="text-sm w-6 text-center">{qty}</span>
            <button
              onClick={() => setQty(qty + 1)}
              className="w-7 h-7 rounded-full border border-gray-300 text-sm"
            >+</button>
          </div>

          {/* Disposal toggle (only if donatable) */}
          {selectedItem.donatable && (
            <div className="flex gap-1">
              <button
                onClick={() => setDisposal('dump')}
                className={`text-xs px-3 py-1.5 rounded-full font-medium ${disposal === 'dump' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                Dump
              </button>
              <button
                onClick={() => setDisposal('donate')}
                className={`text-xs px-3 py-1.5 rounded-full font-medium ${disposal === 'donate' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                Donate (free)
              </button>
            </div>
          )}
          {!selectedItem.donatable && (
            <p className="text-xs text-gray-400">This item can only go to dump.</p>
          )}

          {/* Add button */}
          <button
            onClick={handleAdd}
            className="w-full bg-[#f97316] text-white text-sm font-medium py-2 rounded-lg"
          >
            Add {qty > 1 ? `${qty}x ` : ''}{selectedItem.name} — ${selectedItem.price * qty}
          </button>
        </div>
      )}
    </div>
  );
}
