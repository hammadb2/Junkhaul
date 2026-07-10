'use client';

import { useEffect, useState } from 'react';

// ============================================================
// PWARegister — registers service worker, handles push
// subscription, and shows "Add to Home Screen" prompt on iOS.
// Rendered once in the root layout.
// ============================================================

export default function PWARegister() {
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((e) => {
        console.warn('SW registration failed:', e);
      });
    }

    // Detect iOS Safari not in standalone mode
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    // Don't show the prompt on the onboarding page — it has its own Step 0
    const isOnboarding = window.location.pathname.includes('/portal/onboard');

    if (isIOS && !isStandalone && !isOnboarding) {
      // Check if user previously dismissed
      const dismissed = localStorage.getItem('jh-ios-prompt-dismissed');
      if (!dismissed) {
        // Show after a short delay so it doesn't appear instantly
        const timer = setTimeout(() => setShowIosPrompt(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const reg = await navigator.serviceWorker.ready;

      // Check existing subscription
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        // Convert VAPID key to Uint8Array
        const convertedKey = urlBase64ToUint8Array(vapidKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      }

      // Send subscription to server
      await fetch('/api/employee/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
    } catch (e) {
      console.warn('Push subscription failed:', e);
    }
  };

  const dismissIosPrompt = () => {
    setShowIosPrompt(false);
    localStorage.setItem('jh-ios-prompt-dismissed', '1');
  };

  return (
    <>
      {/* Attempt push subscription on mount (silently) */}
      <PushSubscribeOnMount onReady={subscribeToPush} />

      {/* iOS Add to Home Screen prompt */}
      {showIosPrompt && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 safe-bottom">
          <div className="max-w-md mx-auto bg-gray-900 text-white rounded-2xl p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-sm">JH</span>
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">Add Junk Haul to your Home Screen</div>
                <div className="text-xs text-gray-300 mt-1">
                  Tap <span className="font-semibold">Share</span>{' '}
                  <span className="text-orange-400">⎙</span> then{' '}
                  <span className="font-semibold">Add to Home Screen</span>{' '}
                  <span className="text-orange-400">＋</span> to install the app with push notifications.
                </div>
              </div>
              <button
                onClick={dismissIosPrompt}
                className="text-gray-400 hover:text-white text-lg leading-none flex-shrink-0"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Attempt push subscription after service worker is ready
function PushSubscribeOnMount({ onReady }) {
  useEffect(() => {
    // Only attempt if notifications are supported and permission is granted or default
    if (!('Notification' in window)) return;
    if (Notification.permission === 'denied') return;

    // Request permission after a delay (don't be aggressive)
    const timer = setTimeout(async () => {
      if (Notification.permission === 'default') {
        // Don't auto-prompt — wait for user action
        return;
      }
      if (Notification.permission === 'granted') {
        onReady();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [onReady]);

  return null;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
