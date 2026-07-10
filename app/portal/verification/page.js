'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================
// /portal/verification — shown when crew member has completed
// onboarding but admin hasn't approved them yet.
// Polls every 10s and auto-redirects to /portal/schedule when approved.
// ============================================================

export default function VerificationPending() {
  const router = useRouter();
  const [status, setStatus] = useState('pending_verification');
  const [employeeName, setEmployeeName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/employee/me');
        if (!res.ok) {
          router.push('/portal');
          return;
        }
        const data = await res.json();
        if (!mounted) return;

        const empStatus = data.employee?.status;
        setStatus(empStatus);
        setEmployeeName(data.employee?.name || '');
        setLoading(false);

        if (empStatus === 'active' || empStatus === 'onboarded') {
          // Approved! Redirect to schedule.
          router.push('/portal/schedule');
        } else if (empStatus === 'rejected') {
          // Rejected — show rejection screen (stays on this page)
        } else if (empStatus === 'pending' || !data.employee?.onboarding_completed_at) {
          // Onboarding not actually complete — send back
          router.push('/portal/onboard');
        }
      } catch {
        // Network error — keep waiting
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#FAFAFA', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
        <div className="w-8 h-8 border-3 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin" />
      </div>
    );
  }

  // Rejected state
  if (status === 'rejected') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center safe-top safe-bottom" style={{ background: '#FAFAFA', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: '40px 28px' }}>
        <div className="w-full max-w-md flex flex-col items-center text-center">
          <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Not Approved</h1>
          <p style={{ fontSize: 15, color: 'rgba(0,0,0,.5)', lineHeight: 1.6, marginBottom: 24 }}>
            Hi {employeeName}, your application wasn&apos;t approved at this time. Please call us at{' '}
            <a href="tel:+15873250751" style={{ color: '#f97316', fontWeight: 600 }}>(587) 325-0751</a>{' '}
            if you have any questions.
          </p>
          <button
            onClick={() => router.push('/portal')}
            style={{ padding: '12px 32px', borderRadius: 12, border: 'none', background: '#f97316', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Pending verification
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center safe-top safe-bottom" style={{ background: '#FAFAFA', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: '40px 28px' }}>
      <div className="w-full max-w-md flex flex-col items-center text-center">
        {/* Animated checkmark in circle */}
        <div style={{ width: 96, height: 96, borderRadius: 48, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: -4, borderRadius: 52, border: '3px solid rgba(59,130,246,0.2)', animation: 'pulse-ring 2s ease-out infinite' }} />
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
          Onboarding Complete!
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(0,0,0,.5)', lineHeight: 1.6, marginBottom: 8 }}>
          Nice work, {employeeName}. We&apos;ve received all your documents.
        </p>
        <p style={{ fontSize: 15, color: 'rgba(0,0,0,.5)', lineHeight: 1.6, marginBottom: 28 }}>
          Our team is reviewing your ID and documents now. You&apos;ll get a text message as soon as you&apos;re approved and can start picking up shifts.
        </p>

        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 14, padding: '14px 20px', marginBottom: 24 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B82F6', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#3B82F6' }}>Waiting for approval</span>
        </div>

        <p style={{ fontSize: 13, color: 'rgba(0,0,0,.3)', lineHeight: 1.5 }}>
          This page checks automatically every 10 seconds.<br />
          You can close the app — we&apos;ll text you when it&apos;s done.
        </p>

        <button
          onClick={() => router.push('/portal')}
          style={{ marginTop: 24, padding: '10px 24px', borderRadius: 10, border: '1px solid rgba(0,0,0,.1)', background: 'transparent', color: 'rgba(0,0,0,.4)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          Back to Login
        </button>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
