'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Share, Plus, Check, CheckCircle, X, Lock, Phone, MapPin,
  Camera, FileText, IdCard, Car, User, Calculator, PenTool, Landmark,
  AlertTriangle, ChevronRight, Sparkles,
} from 'lucide-react';
import DocumentScanner from '@/components/portal/DocumentScanner';
import SelfieCapture from '@/components/portal/SelfieCapture';

// ============================================================
// /portal/onboard — multi-step crew onboarding flow (dark theme).
// Entry via invite link: /portal/onboard?token=XXX
// Steps 0–8: install app → account → documents → TD1 Federal →
// TD1AB → contract e-sign → banking → acknowledgments → complete.
// ============================================================

const STEP_LABELS = [
  'Install App',
  'Account',
  'Documents',
  'TD1 Federal',
  'TD1AB Alberta',
  'Contract',
  'Banking',
  'Acknowledgments',
  'Complete',
];

const TD1_BASIC_PERSONAL = 15705;
const TD1AB_BASIC_PERSONAL = 22182;
const SPOUSAL_AMOUNT = 15705;

function uploadDoc(docType, file) {
  const fd = new FormData();
  fd.append('doc_type', docType);
  fd.append('file', file);
  return fetch('/api/employee/documents', { method: 'POST', body: fd });
}

function OnboardInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(null);
  const [inviteError, setInviteError] = useState('');

  // Step 1 form
  const [accountForm, setAccountForm] = useState({ password: '', phone: '', address: '' });
  const [pwErrors, setPwErrors] = useState([]);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressFocused, setAddressFocused] = useState(false);

  // Step 2 form
  const [personal, setPersonal] = useState({ name: '', email: '', address: '' });
  const [sinFile, setSinFile] = useState(null);
  const [licenseFront, setLicenseFront] = useState(null);
  const [licenseBack, setLicenseBack] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfieUrl, setSelfieUrl] = useState(null);
  const [uploading, setUploading] = useState('');
  const [docStatus, setDocStatus] = useState({ sin_document: 'pending', drivers_license: 'pending' });

  // Step 3/4 TD1 forms
  const [td1Federal, setTd1Federal] = useState({
    total_income_other_employers: '', spousal_amount: '', dependents_count: '', other_deductions: '', total_claim: '',
  });
  const [td1Ab, setTd1Ab] = useState({
    total_income_other_employers: '', spousal_amount: '', dependents_count: '', other_deductions: '', total_claim: '',
  });

  // Step 5 contract
  const [contract, setContract] = useState({ signature_typed: '', agreed: false });

  // Step 6 banking
  const [banking, setBanking] = useState({
    bank_name: '', institution_number: '', transit_number: '', account_number: '',
  });

  // Step 7 acknowledgments
  const [acks, setAcks] = useState({ tickets: false, phone: false, data: false, company_card: false });

  // Step 8 complete
  const [completeData, setCompleteData] = useState(null);

  // ---- Step 0: validate invite ----
  const validateInvite = useCallback(async () => {
    const effectiveToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('jh-onboard-token') : null);

    // First, check if the user is already logged in (has a valid session).
    // If so, they may have started onboarding but not finished — let them
    // continue without needing the invite token.
    if (!effectiveToken) {
      try {
        const meRes = await fetch('/api/employee/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.employee && !meData.employee.onboarded) {
            // Already logged in, onboarding not complete — skip to step 2
            setInvite({
              email: meData.employee.email,
              first_name: meData.employee.name?.split(' ')[0] || '',
              last_name: meData.employee.name?.split(' ').slice(1).join(' ') || '',
            });
            setPersonal({
              name: meData.employee.name || '',
              email: meData.employee.email || '',
              address: '',
            });
            setLoading(false);
            // Skip password creation step — they already have an account
            setStep(2);
            return;
          }
        }
      } catch { /* ignore — fall through to token check */ }

      setInviteError('No invite token found in the link. Please use the link from your invite email.');
      setLoading(false);
      return;
    }
    if (token && typeof localStorage !== 'undefined') {
      localStorage.setItem('jh-onboard-token', token);
    }
    const res = await fetch(`/api/employee/onboard/invite?token=${encodeURIComponent(effectiveToken)}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      // Token invalid/expired — check if user is already logged in
      try {
        const meRes = await fetch('/api/employee/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.employee && !meData.employee.onboarded) {
            setInvite({
              email: meData.employee.email,
              first_name: meData.employee.name?.split(' ')[0] || '',
              last_name: meData.employee.name?.split(' ').slice(1).join(' ') || '',
            });
            setPersonal({
              name: meData.employee.name || '',
              email: meData.employee.email || '',
              address: '',
            });
            // Skip password creation — they already have an account
            setStep(2);
            return;
          }
        }
      } catch { /* ignore */ }

      setInviteError(data.error || 'This invite is invalid or expired.');
      if (data.invite) setInvite(data.invite);
      return;
    }
    setInvite(data.invite);
    setPersonal({
      name: `${data.invite.first_name || ''} ${data.invite.last_name || ''}`.trim(),
      email: data.invite.email || '',
      address: '',
    });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { validateInvite(); }, [validateInvite]);

  // ---- Password validation ----
  const validatePw = (pw) => {
    const errs = [];
    if (pw.length < 8) errs.push('At least 8 characters');
    if (!/[0-9]/.test(pw)) errs.push('At least one number');
    if (!/[^A-Za-z0-9]/.test(pw)) errs.push('At least one special character');
    return errs;
  };

  const onPwChange = (val) => {
    setAccountForm({ ...accountForm, password: val });
    setPwErrors(validatePw(val));
  };

  // ---- Address autocomplete via Mapbox ----
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const searchAddress = useCallback(async (query) => {
    if (!query || query.length < 3 || !MAPBOX_TOKEN) { setAddressSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=ca&limit=5&types=address&autocomplete=true&proximity=-114.0719,51.0447&bbox=-114.3,50.9,-113.9,51.2`
      );
      const data = await res.json();
      setAddressSuggestions((data.features || []).map((f) => f.place_name));
    } catch { setAddressSuggestions([]); }
  }, [MAPBOX_TOKEN]);

  const onAddressChange = (val) => {
    setAccountForm({ ...accountForm, address: val });
    setAddressFocused(true);
    searchAddress(val);
  };

  // ---- Step 1 submit: create account ----
  const createAccount = async (e) => {
    e.preventDefault();
    setError('');
    const pwErrs = validatePw(accountForm.password);
    if (pwErrs.length > 0) { setError('Password: ' + pwErrs.join(', ')); return; }
    const phoneClean = accountForm.phone.replace(/[\s\-\(\)]/g, '');
    if (!phoneClean || phoneClean.length < 10) { setError('A valid phone number is required.'); return; }
    if (!accountForm.address.trim() || accountForm.address.trim().length < 5) {
      setError('Your home address is required.'); return;
    }
    setSaving(true);
    const res = await fetch('/api/employee/onboard/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: accountForm.password, phone: accountForm.phone, address: accountForm.address }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Could not create account'); return; }
    setPersonal((p) => ({ ...p, address: accountForm.address }));
    setStep(2);
  };

  // ---- Step 2: document uploads ----
  const handleUpload = async (docType, file, label) => {
    if (!file) return;
    setUploading(docType); setError('');
    try {
      const res = await uploadDoc(docType, file);
      const d = await res.json();
      if (!res.ok) { setError(d.error || `${label} upload failed`); return; }
      setDocStatus((s) => ({ ...s, [docType]: 'uploaded' }));
    } finally {
      setUploading('');
    }
  };

  const handleSelfieUpload = async (file) => {
    if (!file) return;
    setUploading('selfie'); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/employee/selfie', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Selfie upload failed'); return; }
      setSelfieUrl(d.selfie_url);
    } finally {
      setUploading('');
    }
  };

  const submitPersonal = async (e) => {
    e?.preventDefault();
    setError('');
    if (docStatus.sin_document === 'pending') { setError('Please upload your SIN document photo.'); return; }
    if (docStatus.drivers_license === 'pending') { setError("Please upload both sides of your driver's license."); return; }
    if (!personal.address.trim()) { setError('Please enter your address.'); return; }
    setStep(3);
  };

  // ---- TD1 save ----
  const calcTotal = (form, basic) => {
    const spousal = parseFloat(form.spousal_amount) || 0;
    const other = parseFloat(form.other_deductions) || 0;
    return basic + spousal + other;
  };

  const submitTd1 = async (form_type, form, basic, nextStep) => {
    setSaving(true); setError('');
    const total_claim = form.total_claim !== '' ? parseFloat(form.total_claim) : calcTotal(form, basic);
    const res = await fetch('/api/employee/onboard/td1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form_type, data: { ...form, total_claim } }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Could not save TD1 form'); return; }
    setStep(nextStep);
  };

  // ---- Contract sign ----
  const submitContract = async (e) => {
    e.preventDefault();
    setError('');
    if (!contract.agreed) { setError('You must check "I agree" to continue.'); return; }
    if (!contract.signature_typed.trim()) { setError('Please type your full legal name as your signature.'); return; }
    setSaving(true);
    const res = await fetch('/api/employee/onboard/contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature_typed: contract.signature_typed.trim(), contract_version: '1.0' }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Could not sign contract'); return; }
    setStep(6);
  };

  // ---- Banking ----
  const submitBanking = async (e) => {
    e.preventDefault();
    setError('');
    if (banking.institution_number && banking.institution_number.length !== 3) { setError('Institution number must be 3 digits.'); return; }
    if (banking.transit_number && banking.transit_number.length !== 5) { setError('Transit number must be 5 digits.'); return; }
    if (!banking.account_number.trim()) { setError('Account number is required.'); return; }
    setSaving(true);
    const res = await fetch('/api/employee/onboard/banking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(banking),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Could not save banking info'); return; }
    setStep(7);
  };

  // ---- Acknowledgments ----
  const submitAcks = async (e) => {
    e.preventDefault();
    setError('');
    if (!acks.tickets || !acks.phone || !acks.data || !acks.company_card) {
      setError('Please check all four acknowledgments to continue.'); return;
    }
    setSaving(true);
    const res = await fetch('/api/employee/onboard/acknowledgments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(acks),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Could not save acknowledgments'); return; }
    setStep(8);
  };

  // ---- Complete ----
  const completeOnboarding = async () => {
    setSaving(true); setError('');
    const res = await fetch('/api/employee/onboard/complete', { method: 'POST' });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Onboarding incomplete'); setCompleteData(data); return; }
    if (typeof localStorage !== 'undefined') localStorage.removeItem('jh-onboard-token');
    setCompleteData({ ok: true, completed_at: data.completed_at });
  };

  // ============ Shared UI helpers ============
  const isStandalone = typeof window !== 'undefined' && (window.navigator?.standalone || window.matchMedia?.('(display-mode: standalone)')?.matches);
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  const ProgressBar = () => (
    <div style={{ position: 'sticky', top: 0, zIndex: 10, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="progress-line" style={{ borderRadius: 0 }}>
        <div className="progress-line-fill" style={{ width: `${(step / 8) * 100}%` }} />
      </div>
      <div style={{ padding: '6px 24px 0', background: '#FAFAFA' }}>
        <span style={{ fontSize: 13, color: 'rgba(0,0,0,.6)' }}>Step {step} of 8 · {STEP_LABELS[step]}</span>
      </div>
    </div>
  );

  const BackBtn = ({ onBack }) => (
    <button
      onClick={onBack}
      className="glass-btn"
      style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 14px)', left: 16, zIndex: 20, width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <ArrowLeft size={20} color="rgba(0,0,0,.6)" />
    </button>
  );

  const ContinueBtn = ({ label = 'Continue', disabled = false, onClick }) => (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={saving || disabled}
      className="btn-primary safe-bottom"
      style={{ width: '100%', minHeight: 52, fontSize: 16, position: 'sticky', bottom: 0 }}
    >
      {saving ? '...' : label}
    </button>
  );

  const ErrorBanner = () => error ? (
    <div className="slide-up" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: 14, padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
      {error}
    </div>
  ) : null;

  const StepShell = ({ children, onBack, showProgress = true }) => (
    <>
      {showProgress && <ProgressBar />}
      {onBack && <BackBtn onBack={onBack} />}
      <div style={{ maxWidth: 448, margin: '0 auto', padding: '24px', paddingBottom: '80px', flex: 1 }}>
        {children}
      </div>
    </>
  );

  const Headline = ({ title, subtitle }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 16, color: 'rgba(0,0,0,.6)', marginTop: 4 }}>{subtitle}</div>}
    </div>
  );

  const DarkInput = ({ label, value, onChange, ...props }) => (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', display: 'block', marginBottom: 6 }}>{label}</label>}
      <input
        value={value}
        onChange={onChange}
        className="dark-input"
        style={{ width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 16, color: '#1a1a1a', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12 }}
        {...props}
      />
    </div>
  );

  // ============ STEP 0: Save to Home Screen ============
  if (step === 0) {
    if (loading) {
      return (
        <Shell>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(249,115,22,0.2)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
            <div style={{ color: 'rgba(0,0,0,.4)', fontSize: 14 }}>Validating your invite...</div>
          </div>
        </Shell>
      );
    }

    if (inviteError && !invite) {
      return (
        <Shell>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ textAlign: 'center', maxWidth: 400 }}>
              <img src="/crew-logo.png" alt="Junk Haul Crew" style={{ width: 72, height: 72, borderRadius: 16, margin: '0 auto 16px' }} />
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>Junk Haul Crew</div>
              <div style={{ fontSize: 14, color: 'rgba(0,0,0,.6)', marginBottom: 24 }}>Onboarding Portal</div>
              <div className="dark-card" style={{ padding: 24, textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={32} color="#EF4444" style={{ margin: '0 auto 12px' }} />
                <div style={{ color: '#EF4444', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Invite problem</div>
                <div style={{ color: 'rgba(0,0,0,.6)', fontSize: 14 }}>{inviteError}</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', marginTop: 16 }}>Contact your manager for a new invite link.</div>
              </div>
            </div>
          </div>
        </Shell>
      );
    }

    const carouselFrames = isIOS
      ? [
          { icon: Share, title: 'Tap the Share button', sub: 'In Safari, tap the share icon at the bottom' },
          { icon: Plus, title: 'Add to Home Screen', sub: 'Scroll down and tap "Add to Home Screen"' },
          { icon: Check, title: 'Tap Add', sub: 'Confirm by tapping "Add" in the top right' },
        ]
      : [
          { icon: Plus, title: 'Open browser menu', sub: 'Tap the three dots menu icon' },
          { icon: Plus, title: 'Add to Home screen', sub: 'Select "Add to Home screen"' },
          { icon: Check, title: 'Tap Add', sub: 'Confirm the installation' },
        ];

    return (
      <Shell>
        <StepShell showProgress={false}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/crew-logo.png" alt="Junk Haul Crew" style={{ width: 72, height: 72, borderRadius: 16, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>Welcome to the crew</div>
          </div>

          {/* Invite card */}
          {invite && (
            <div className="dark-card" style={{ padding: 16, marginBottom: 24, border: '1px solid rgba(249,115,22,0.2)' }}>
              <div style={{ fontSize: 12, color: '#f97316', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>You&apos;re invited to join</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a' }}>{invite.first_name} {invite.last_name}</div>
              <div style={{ fontSize: 14, color: 'rgba(0,0,0,.6)' }}>{invite.email}</div>
              {invite.pay_rate != null && (
                <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,.06)', borderRadius: 999, padding: '4px 12px', fontSize: 14 }}>
                  <span style={{ color: 'rgba(0,0,0,.6)' }}>Pay rate</span>
                  <span className="tabular" style={{ fontWeight: 700, color: '#1a1a1a' }}>${Number(invite.pay_rate).toFixed(2)}</span>
                  <span style={{ fontSize: 12, color: 'rgba(0,0,0,.4)' }}>/hr</span>
                </div>
              )}
            </div>
          )}

          {isStandalone ? (
            <div className="dark-card" style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}>
              <CheckCircle size={40} color="#22C55E" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a' }}>App installed!</div>
              <div style={{ fontSize: 14, color: 'rgba(0,0,0,.6)', marginTop: 4 }}>You&apos;re ready to continue.</div>
            </div>
          ) : (
            <>
              <Headline title="Save to your Home Screen" subtitle="Install the app for the best experience — works offline, push notifications, and full-screen." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {carouselFrames.map((frame, i) => {
                  const Icon = frame.icon;
                  return (
                    <div key={i} className="dark-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={24} color="#f97316" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'rgba(0,0,0,.4)', marginBottom: 2 }}>Step {i + 1}</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>{frame.title}</div>
                        <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginTop: 2 }}>{frame.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <ErrorBanner />
          <div style={{ marginTop: 24 }}>
            <ContinueBtn label="Continue" onClick={() => setStep(1)} />
            {!isStandalone && (
              <button onClick={() => setStep(1)} style={{ width: '100%', background: 'transparent', border: 'none', color: 'rgba(0,0,0,.4)', fontSize: 14, padding: '12px 0', marginTop: 8 }}>Skip for now</button>
            )}
          </div>
        </StepShell>
      </Shell>
    );
  }

  // ============ STEP 1: Account Creation ============
  if (step === 1) {
    return (
      <Shell>
        <StepShell onBack={() => setStep(0)}>
          <Headline title="Set up your account" subtitle="Create your password and contact info" />

          {invite && (
            <div className="dark-card" style={{ padding: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={20} color="#f97316" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{invite.first_name} {invite.last_name}</div>
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)' }}>{invite.email}</div>
              </div>
            </div>
          )}

          <form onSubmit={createAccount}>
            <DarkInput label="Password" type="password" value={accountForm.password} onChange={(e) => onPwChange(e.target.value)} placeholder="Create a strong password" required autoComplete="new-password" />

            {accountForm.password && (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { check: accountForm.password.length >= 8, label: '8+ characters' },
                  { check: /[0-9]/.test(accountForm.password), label: '1 number' },
                  { check: /[^A-Za-z0-9]/.test(accountForm.password), label: '1 special character' },
                ].map((req, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    {req.check ? <Check size={14} color="#22C55E" /> : <X size={14} color="rgba(0,0,0,.3)" />}
                    <span style={{ color: req.check ? '#22C55E' : 'rgba(0,0,0,.4)' }}>{req.label}</span>
                  </div>
                ))}
              </div>
            )}

            <DarkInput label="Mobile phone" type="tel" value={accountForm.phone} onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })} placeholder="(587) 555-0123" required autoComplete="tel" />

            <div style={{ marginBottom: 16, position: 'relative' }}>
              <label style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', display: 'block', marginBottom: 6 }}>Home address</label>
              <input
                value={accountForm.address}
                onChange={(e) => onAddressChange(e.target.value)}
                onFocus={() => setAddressFocused(true)}
                onBlur={() => setTimeout(() => setAddressFocused(false), 200)}
                placeholder="Start typing your address..."
                required
                autoComplete="street-address"
                className="dark-input"
                style={{ width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 16, color: '#1a1a1a', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12 }}
              />
              {addressFocused && addressSuggestions.length > 0 && (
                <div style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, marginTop: 4, background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: 240, overflowY: 'auto' }}>
                  {addressSuggestions.map((s, i) => (
                    <button key={i} type="button" onClick={() => { setAccountForm({ ...accountForm, address: s }); setAddressSuggestions([]); setAddressFocused(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: 14, color: 'rgba(0,0,0,.6)', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(0,0,0,.04)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <MapPin size={14} color="#f97316" /> {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ErrorBanner />
            <ContinueBtn label="Create account & continue" />
          </form>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Lock size={12} /> Your data is encrypted and stored securely.
          </div>
        </StepShell>
      </Shell>
    );
  }

  // ============ STEP 2: Personal Info + Documents ============
  if (step === 2) {
    return (
      <Shell>
        <StepShell onBack={() => setStep(1)}>
          <Headline title="Your documents" subtitle="Scan or upload your photo ID and selfie" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <SelfieCapture
              uploaded={!!selfieUrl}
              previewUrl={selfieUrl}
              uploading={uploading === 'selfie'}
              onCapture={async (file) => {
                setSelfieFile(file);
                await handleSelfieUpload(file);
              }}
            />
            <DocumentScanner
              label="SIN document"
              uploaded={docStatus.sin_document === 'uploaded'}
              uploading={uploading === 'sin_document'}
              onCapture={async (file) => {
                setSinFile(file);
                await handleUpload('sin_document', file, 'SIN document');
              }}
            />
            <DocumentScanner
              label="Driver's license — front"
              uploaded={docStatus.drivers_license === 'uploaded'}
              uploading={uploading === 'sin_document' || uploading === 'drivers_license'}
              onCapture={async (file) => {
                setLicenseFront(file);
                await handleUpload('drivers_license', file, "Driver's license — front");
              }}
            />
            <DocumentScanner
              label="Driver's license — back"
              uploaded={docStatus.drivers_license === 'uploaded'}
              uploading={uploading === 'drivers_license'}
              onCapture={async (file) => {
                setLicenseBack(file);
                await handleUpload('drivers_license', file, "Driver's license — back");
              }}
            />
          </div>

          <div className="dark-card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <User size={16} color="rgba(0,0,0,.6)" />
              <span style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', textTransform: 'uppercase', letterSpacing: 1 }}>Personal Info</span>
            </div>
            <div style={{ fontSize: 14, color: '#1a1a1a', marginBottom: 4 }}>{personal.name}</div>
            <div style={{ fontSize: 14, color: 'rgba(0,0,0,.6)', marginBottom: 12 }}>{personal.email}</div>
            <DarkInput label="Address" value={personal.address} onChange={(e) => setPersonal({ ...personal, address: e.target.value })} placeholder="Street, city, province, postal code" />
          </div>

          <ErrorBanner />
          <ContinueBtn label="Continue" onClick={submitPersonal} />
        </StepShell>
      </Shell>
    );
  }

  // ============ STEP 3: TD1 Federal ============
  if (step === 3) {
    return (
      <Shell>
        <StepShell onBack={() => setStep(2)}>
          <Headline title="Tax info — Federal" subtitle="Let's get your TD1 sorted" />
          <form onSubmit={(e) => { e.preventDefault(); submitTd1('federal', td1Federal, TD1_BASIC_PERSONAL, 4); }}>
            <Td1FieldsDark form={td1Federal} setForm={setTd1Federal} basic={TD1_BASIC_PERSONAL} spousalDefault={SPOUSAL_AMOUNT} />
            <ErrorBanner />
            <ContinueBtn label="Save & continue" />
          </form>
        </StepShell>
      </Shell>
    );
  }

  // ============ STEP 4: TD1AB Alberta ============
  if (step === 4) {
    return (
      <Shell>
        <StepShell onBack={() => setStep(3)}>
          <Headline title="Tax info — Alberta" subtitle="Provincial tax form" />
          <form onSubmit={(e) => { e.preventDefault(); submitTd1('ab', td1Ab, TD1AB_BASIC_PERSONAL, 5); }}>
            <Td1FieldsDark form={td1Ab} setForm={setTd1Ab} basic={TD1AB_BASIC_PERSONAL} spousalDefault={SPOUSAL_AMOUNT} />
            <ErrorBanner />
            <ContinueBtn label="Save & continue" />
          </form>
        </StepShell>
      </Shell>
    );
  }

  // ============ STEP 5: Contract E-Sign ============
  if (step === 5) {
    return (
      <Shell>
        <StepShell onBack={() => setStep(4)}>
          <Headline title="Sign your contract" subtitle="Read and sign below" />
          <form onSubmit={submitContract}>
            <div className="dark-card" style={{ padding: 16, marginBottom: 20, maxHeight: 260, overflowY: 'auto', fontSize: 14, color: 'rgba(0,0,0,.6)', lineHeight: 1.6 }}>
              <p style={{ fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Junk Haul Crew — Employment Agreement (v1.0)</p>
              <p style={{ marginBottom: 8 }}>This agreement is between Junk Haul (&ldquo;the Company&rdquo;) and the undersigned employee (&ldquo;you&rdquo;).</p>
              <p style={{ marginBottom: 8 }}><strong>1. Role.</strong> You are hired as a crew member responsible for junk removal services, including driving, loading, and customer interaction.</p>
              <p style={{ marginBottom: 8 }}><strong>2. Pay.</strong> You will be paid at the agreed hourly rate. Overtime applies per provincial employment standards.</p>
              <p style={{ marginBottom: 8 }}><strong>3. Schedule.</strong> Shifts are assigned via the crew portal. You are responsible for clocking in and out accurately.</p>
              <p style={{ marginBottom: 8 }}><strong>4. Conduct.</strong> You agree to perform duties safely, courteously, and in compliance with all laws and Company policies.</p>
              <p style={{ marginBottom: 8 }}><strong>5. Termination.</strong> Either party may end employment with notice as required by law.</p>
              <p style={{ marginBottom: 8 }}><strong>6. Confidentiality.</strong> Customer and Company information must be kept confidential.</p>
              <p>By typing your name below, you acknowledge you have read and agree to this contract.</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', display: 'block', marginBottom: 6 }}>Type your full legal name as your signature</label>
              <input
                value={contract.signature_typed}
                onChange={(e) => setContract({ ...contract, signature_typed: e.target.value })}
                placeholder="Sign here"
                className="dark-input"
                style={{ width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 18, fontStyle: 'italic', color: '#1a1a1a', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12, borderBottom: '2px solid rgba(0,0,0,.15)' }}
              />
            </div>

            <button
              type="button"
              onClick={() => setContract({ ...contract, agreed: !contract.agreed })}
              className="dark-card"
              style={{ width: '100%', padding: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: contract.agreed ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(0,0,0,.06)', background: contract.agreed ? 'rgba(249,115,22,0.08)' : '#fff', borderRadius: 14, marginBottom: 16 }}
            >
              <div style={{ width: 24, height: 24, borderRadius: 6, border: contract.agreed ? 'none' : '2px solid rgba(0,0,0,.15)', background: contract.agreed ? '#f97316' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {contract.agreed && <Check size={16} color="white" />}
              </div>
              <span style={{ fontSize: 14, color: '#1a1a1a' }}>I have read and agree to the employment contract above.</span>
            </button>

            <ErrorBanner />
            <ContinueBtn label="Sign & continue" disabled={!contract.agreed || !contract.signature_typed.trim()} />
          </form>
        </StepShell>
      </Shell>
    );
  }

  // ============ STEP 6: Banking ============
  if (step === 6) {
    return (
      <Shell>
        <StepShell onBack={() => setStep(5)}>
          <Headline title="Direct deposit" subtitle="Where should we send your pay?" />
          <form onSubmit={submitBanking}>
            <DarkInput label="Bank name" value={banking.bank_name} onChange={(e) => setBanking({ ...banking, bank_name: e.target.value })} placeholder="e.g. RBC, TD, Scotiabank" />
            <DarkInput label="Institution number (3 digits)" value={banking.institution_number} onChange={(e) => setBanking({ ...banking, institution_number: e.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="e.g. 003" inputMode="numeric" />
            <DarkInput label="Transit number (5 digits)" value={banking.transit_number} onChange={(e) => setBanking({ ...banking, transit_number: e.target.value.replace(/\D/g, '').slice(0, 5) })} placeholder="e.g. 01234" inputMode="numeric" />
            <DarkInput label="Account number" value={banking.account_number} onChange={(e) => setBanking({ ...banking, account_number: e.target.value.replace(/\s/g, '') })} placeholder="Your bank account number" inputMode="numeric" />

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(0,0,0,.4)', marginBottom: 16 }}>
              <Lock size={12} /> Your account details are encrypted at rest.
            </div>

            <ErrorBanner />
            <ContinueBtn label="Save & continue" />
          </form>
        </StepShell>
      </Shell>
    );
  }

  // ============ STEP 7: Acknowledgments ============
  if (step === 7) {
    const items = [
      { key: 'tickets', text: 'I acknowledge that any traffic tickets received while driving for work are my responsibility.' },
      { key: 'phone', text: 'I acknowledge that my phone is required for work and I will keep it charged.' },
      { key: 'data', text: 'I acknowledge that I will use my data plan for work apps and will not seek reimbursement.' },
      { key: 'company_card', text: 'I acknowledge that any company card usage is for work expenses only.' },
    ];
    return (
      <Shell>
        <StepShell onBack={() => setStep(6)}>
          <Headline title="Quick acknowledgments" subtitle="Tap each one to confirm" />
          <form onSubmit={submitAcks}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {items.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => setAcks({ ...acks, [it.key]: !acks[it.key] })}
                  className="dark-card"
                  style={{ width: '100%', padding: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', border: acks[it.key] ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(0,0,0,.06)', background: acks[it.key] ? 'rgba(249,115,22,0.08)' : '#fff', borderRadius: 14 }}
                >
                  <div style={{ width: 24, height: 24, borderRadius: 6, border: acks[it.key] ? 'none' : '2px solid rgba(0,0,0,.15)', background: acks[it.key] ? '#f97316' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {acks[it.key] && <Check size={16} color="white" />}
                  </div>
                  <span style={{ fontSize: 14, color: '#1a1a1a', flex: 1 }}>{it.text}</span>
                </button>
              ))}
            </div>
            <ErrorBanner />
            <ContinueBtn label="Continue" disabled={!acks.tickets || !acks.phone || !acks.data || !acks.company_card} />
          </form>
        </StepShell>
      </Shell>
    );
  }

  // ============ STEP 8: Complete ============
  if (step === 8) {
    const done = completeData?.ok;
    return (
      <Shell>
        <StepShell onBack={!done && !completeData?.missing ? () => setStep(7) : undefined}>
          <Headline title="Final step" subtitle="Verify everything and finish your onboarding" />

          {!done && !completeData?.missing && (
            <>
              <div className="dark-card" style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}>
                <CheckCircle size={40} color="#22C55E" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 16, color: '#1a1a1a' }}>Everything looks good. Click below to finish.</div>
              </div>
              <ErrorBanner />
              <ContinueBtn label="Complete onboarding" onClick={completeOnboarding} />
            </>
          )}

          {!done && completeData?.missing && (
            <div className="dark-card" style={{ padding: 24, border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={32} color="#EF4444" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 18, fontWeight: 600, color: '#EF4444', textAlign: 'center', marginBottom: 8 }}>Not quite done</div>
              <div style={{ fontSize: 14, color: 'rgba(0,0,0,.6)', marginBottom: 12 }}>Some items still need attention:</div>
              <ul style={{ fontSize: 14, color: 'rgba(0,0,0,.6)', listStyle: 'disc', paddingLeft: 20, marginBottom: 16 }}>
                {completeData.missing.map((m, i) => <li key={i} style={{ marginBottom: 4 }}>{m}</li>)}
              </ul>
              <button onClick={() => { setCompleteData(null); setError(''); }} className="btn-ghost" style={{ width: '100%', minHeight: 48 }}>Go back to fix</button>
            </div>
          )}

          {done && (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <div className="celebrate" style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <CheckCircle size={48} color="#3B82F6" />
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Onboarding complete!</div>
              <div style={{ fontSize: 15, color: 'rgba(0,0,0,.5)', marginBottom: 8, lineHeight: 1.6 }}>
                Our team is reviewing your documents now.
              </div>
              <div style={{ fontSize: 15, color: 'rgba(0,0,0,.5)', marginBottom: 32, lineHeight: 1.6 }}>
                You&apos;ll get a text message as soon as you&apos;re approved.
              </div>
              <button onClick={() => router.push('/portal/verification')} className="btn-primary safe-bottom" style={{ width: '100%', minHeight: 52, fontSize: 16, background: '#3B82F6' }}>
                Continue
              </button>
            </div>
          )}
        </StepShell>
      </Shell>
    );
  }

  return null;
}

// ============ TD1 shared fields (dark theme) ============
function Td1FieldsDark({ form, setForm, basic, spousalDefault }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const autoTotal = (Number(form.spousal_amount) || 0) + (Number(form.other_deductions) || 0) + basic;

  const inputStyle = {
    width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 16,
    color: '#1a1a1a', background: '#F0F0F2',
    border: '1px solid rgba(0,0,0,.06)', borderRadius: 12,
  };
  const labelStyle = { fontSize: 13, color: 'rgba(0,0,0,.6)', display: 'block', marginBottom: 6 };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Total income from all employers this year</label>
        <input value={form.total_income_other_employers} onChange={set('total_income_other_employers')} placeholder="0" inputMode="numeric" className="dark-input" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Spousal amount (if applicable)</label>
        <input value={form.spousal_amount} onChange={set('spousal_amount')} placeholder={`e.g. ${spousalDefault.toLocaleString()}`} inputMode="numeric" className="dark-input" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Number of dependents</label>
        <input value={form.dependents_count} onChange={set('dependents_count')} placeholder="0" inputMode="numeric" className="dark-input" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Other deductions</label>
        <input value={form.other_deductions} onChange={set('other_deductions')} placeholder="0" inputMode="numeric" className="dark-input" style={inputStyle} />
      </div>

      {/* Live-updating total claim card */}
      <div className="dark-card" style={{ padding: 20, marginBottom: 16, border: '1px solid rgba(249,115,22,0.3)', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginBottom: 4 }}>Total claim amount (auto-calculated)</div>
        <div className="tabular" style={{ fontSize: 34, fontWeight: 700, color: '#f97316' }}>
          ${autoTotal.toLocaleString()}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Override total claim (optional)</label>
        <input value={form.total_claim} onChange={set('total_claim')} placeholder={`Auto: $${autoTotal.toLocaleString()}`} inputMode="numeric" className="dark-input" style={inputStyle} />
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', marginTop: 4 }}>Leave blank to use auto-calculated amount.</div>
      </div>
    </div>
  );
}

// ============ shell wrapper ============
function Shell({ children }) {
  return <main className="min-h-dvh flex flex-col safe-top safe-bottom" style={{ background: '#FAFAFA' }}>{children}</main>;
}

export default function OnboardPage() {
  return (
    <Suspense fallback={<Shell><div style={{ textAlign: 'center', color: 'rgba(0,0,0,.4)', padding: 48 }}>Loading...</div></Shell>}>
      <OnboardInner />
    </Suspense>
  );
}
