'use client';

// ============================================================
// Conversational AI booking flow (Pricing Engine Phase 10).
//
// Added ALONGSIDE the existing static multi-step form at /book, not a
// replacement — see app/api/chat-booking/route.js for why. Reuses the
// exact same pricing/booking pipeline (quoteCustomerPrice,
// createQuoteDecision, the same Stripe deposit flow), and reuses the
// existing PaymentStep component once a booking is created, so the
// deposit-payment experience is identical to the form flow.
// ============================================================

import { useState, useRef, useEffect } from 'react';
import PaymentStep from '@/components/booking/PaymentStep';

function newSessionId() {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function toCompressedBase64(file, maxDim = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Bubble({ role, children }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
          isUser ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function ChatBookingPage() {
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return newSessionId();
    const existing = localStorage.getItem('jh_chat_session');
    if (existing) return existing;
    const id = newSessionId();
    localStorage.setItem('jh_chat_session', id);
    return id;
  });
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm the Junk Haul booking assistant. What do you need hauled away? You can describe it, or attach a photo." },
  ]);
  const [input, setInput] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const fileRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    e.target.value = '';
    if (files.length === 0) return;
    const encoded = await Promise.all(files.map((f) => toCompressedBase64(f)));
    setPendingPhotos((p) => [...p, ...encoded]);
  };

  const send = async () => {
    if (!input.trim() && pendingPhotos.length === 0) return;
    const userText = input.trim();
    const photoCount = pendingPhotos.length;
    setMessages((m) => [
      ...m,
      { role: 'user', content: userText || (photoCount ? `[${photoCount} photo${photoCount > 1 ? 's' : ''} attached]` : '') },
    ]);
    setInput('');
    setSending(true);
    setError(null);
    const photosToSend = pendingPhotos;
    setPendingPhotos([]);
    try {
      const res = await fetch('/api/chat-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: userText, photos: photosToSend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      if (data.booking?.client_secret) setBooking(data.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">Book with our AI assistant</h1>
        <p className="text-xs text-gray-500">
          Prefer a form? <a href="/book" className="text-orange-600 underline">Use the step-by-step booking flow</a> instead.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role}>{m.content}</Bubble>
        ))}
        {sending && <Bubble role="assistant">…</Bubble>}
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      {booking ? (
        <div className="border-t border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Confirm &amp; pay</h2>
          <p className="text-xs text-gray-500 mb-3">Just a $50 deposit today, the rest on pickup day.</p>
          <PaymentStep
            clientSecret={booking.client_secret}
            total={booking.total}
            balance_due={booking.balance_due}
            breakdown={booking.breakdown}
            onPaid={() => {
              setMessages((m) => [...m, { role: 'assistant', content: `You're all booked — reference ${booking.booking_ref}. See you then!` }]);
              setBooking(null);
            }}
          />
        </div>
      ) : (
        <div className="border-t border-gray-100 p-3">
          {pendingPhotos.length > 0 && (
            <div className="flex gap-2 mb-2">
              {pendingPhotos.map((p, i) => (
                <img key={i} src={`data:image/jpeg;base64,${p}`} alt="attached" className="w-12 h-12 object-cover rounded-lg" />
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input type="file" accept="image/*" multiple ref={fileRef} onChange={handleFiles} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-10 h-10 shrink-0 rounded-full border border-gray-300 flex items-center justify-center text-lg"
              aria-label="Attach photo"
            >
              📷
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type a message…"
              rows={1}
              className="flex-1 resize-none border border-gray-300 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || (!input.trim() && pendingPhotos.length === 0)}
              className="px-4 py-2 rounded-2xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
