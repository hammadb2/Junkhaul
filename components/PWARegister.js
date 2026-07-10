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

    // Only show the "Add to Home Screen" prompt on crew portal pages
    const isPortal = window.location.pathname.startsWith('/portal');
    const isOnboarding = window.location.pathname.includes('/portal/onboard');

    if (isIOS && !isStandalone && isPortal && !isOnboarding) {
      // Check if user previously dismissed
      const dismissed = localStorage.getItem('jh-ios-prompt-dismissed');
      if (!dismissed) {
        // Show after a short delay so it doesn't appear instantly
        const timer = setTimeout(() => setShowIosPrompt(true), 2000);
        return () => clearTimeout(timer);
      }
    }

    // Auto-subscribe to push after login (if on portal pages)
    if (isPortal && !isOnboarding) {
      // Wait for SW to be ready, then request permission and subscribe
      const timer = setTimeout(async () => {
        await requestPermissionAndSubscribe();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const requestPermissionAndSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!('Notification' in window)) return;

    try {
      // Request notification permission if not already granted
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
      }
      if (Notification.permission === 'denied') return;

      // Now subscribe
      await subscribeToPush();
    } catch (e) {
      console.warn('Push permission/subscription failed:', e);
    }
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const reg = await navigator.serviceWorker.ready;

      // Check existing subscription
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY not set');
          return;
        }

        // Convert VAPID key to Uint8Array
        const convertedKey = urlBase64ToUint8Array(vapidKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      }

      // Send subscription to server
      const res = await fetch('/api/employee/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      if (!res.ok) {
        console.warn('Push subscribe API failed:', res.status);
      }
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
