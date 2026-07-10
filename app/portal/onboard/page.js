'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ============================================================
// /portal/onboard — multi-step crew onboarding flow.
// Entry via invite link: /portal/onboard?token=XXX
// Steps 0–7: invite validation → personal info → TD1 Federal →
// TD1AB → contract e-sign → banking → acknowledgments → complete.
// ============================================================

const STEP_LABELS = [
  'Account',
  'Personal Info',
  'TD1 Federal',
  'TD1AB Alberta',
  'Contract',
  'Banking',
  'Acknowledgments',
  'Complete',
];

// Default TD1 claim amounts (2024-ish CRA baselines)
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

  // Step 0 form
  const [accountForm, setAccountForm] = useState({ password: '', phone: '', address: '' });
  const [pwErrors, setPwErrors] = useState([]);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressFocused, setAddressFocused] = useState(false);

  // Step 1 form
  const [personal, setPersonal] = useState({ name: '', email: '', address: '' });
  const [sinFile, setSinFile] = useState(null);
  const [licenseFront, setLicenseFront] = useState(null);
  const [licenseBack, setLicenseBack] = useState(null);
  const [uploading, setUploading] = useState('');
  const [docStatus, setDocStatus] = useState({ sin_document: 'pending', drivers_license: 'pending' });

  // Step 2/3 TD1 forms
  const [td1Federal, setTd1Federal] = useState({
    total_income_other_employers: '',
    spousal_amount: '',
    dependents_count: '',
    other_deductions: '',
    total_claim: '',
  });
  const [td1Ab, setTd1Ab] = useState({
    total_income_other_employers: '',
    spousal_amount: '',
    dependents_count: '',
    other_deductions: '',
    total_claim: '',
  });

  // Step 4 contract
  const [contract, setContract] = useState({ signature_typed: '', agreed: false });

  // Step 5 banking
  const [banking, setBanking] = useState({
    bank_name: '',
    institution_number: '',
    transit_number: '',
    account_number: '',
  });

  // Step 6 acknowledgments
  const [acks, setAcks] = useState({ tickets: false, phone: false, data: false, company_card: false });

  // Step 7 complete
  const [completeData, setCompleteData] = useState(null);

  // ---- Step 0: validate invite ----
  const validateInvite = useCallback(async () => {
    if (!token) {
      setInviteError('No invite token found in the link. Please use the link from your invite email.');
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/employee/onboard/invite?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
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
  }, [token]);

  useEffect(() => {
    validateInvite();
  }, [validateInvite]);

  // ---- Step 0: password validation ----
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

  // ---- Step 0: address autocomplete via Mapbox ----
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const searchAddress = useCallback(async (query) => {
    if (!query || query.length < 3 || !MAPBOX_TOKEN) { setAddressSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=ca&limit=5&types=address`
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

  // ---- Step 0 submit: create account ----
  const createAccount = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password
    const pwErrs = validatePw(accountForm.password);
    if (pwErrs.length > 0) { setError('Password: ' + pwErrs.join(', ')); return; }

    // Validate phone
    const phoneClean = accountForm.phone.replace(/[\s\-\(\)]/g, '');
    if (!phoneClean || phoneClean.length < 10) { setError('A valid phone number is required.'); return; }

    // Validate address
    if (!accountForm.address.trim() || accountForm.address.trim().length < 5) {
      setError('Your home address is required.'); return;
    }

    setSaving(true);
    const res = await fetch('/api/employee/onboard/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        password: accountForm.password,
        phone: accountForm.phone,
        address: accountForm.address,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Could not create account'); return; }
    setPersonal((p) => ({ ...p, address: accountForm.address }));
    setStep(1);
  };

  // ---- Step 1: document uploads ----
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

  const submitPersonal = async (e) => {
    e.preventDefault();
    setError('');
    if (docStatus.sin_document === 'pending') { setError('Please upload your SIN document photo.'); return; }
    if (docStatus.drivers_license === 'pending') { setError('Please upload both sides of your driver\'s license.'); return; }
    if (!personal.address.trim()) { setError('Please enter your address.'); return; }
    setStep(2);
  };

  // ---- Step 2/3: TD1 save ----
  const calcTotal = (form, basic) => {
    const base = basic;
    const spousal = parseFloat(form.spousal_amount) || 0;
    const dependents = (parseFloat(form.dependents_count) || 0) * 0; // dependents handled via other unless specified
    const other = parseFloat(form.other_deductions) || 0;
    return base + spousal + dependents + other;
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

  // ---- Step 4: contract sign ----
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
    setStep(5);
  };

  // ---- Step 5: banking ----
  const submitBanking = async (e) => {
    e.preventDefault();
    setError('');
    if (banking.institution_number && banking.institution_number.length !== 3) {
      setError('Institution number must be 3 digits.'); return;
    }
    if (banking.transit_number && banking.transit_number.length !== 5) {
      setError('Transit number must be 5 digits.'); return;
    }
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
    setStep(6);
  };

  // ---- Step 6: acknowledgments ----
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
    setStep(7);
  };

  // ---- Step 7: complete ----
  const completeOnboarding = async () => {
    setSaving(true); setError('');
    const res = await fetch('/api/employee/onboard/complete', { method: 'POST' });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Onboarding incomplete'); setCompleteData(data); return; }
    setCompleteData({ ok: true, completed_at: data.completed_at });
  };

  // ============ render helpers ============
  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent';
  const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';
  const cardCls = 'bg-white rounded-2xl border border-gray-200 p-5 shadow-sm';

  const ProgressBar = () => (
    <div className="bg-white border-b border-gray-100 px-5 py-3 sticky top-0 z-10 safe-top">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-700">Step {step} of 7</span>
          <span className="text-xs text-gray-400">{STEP_LABELS[step]}</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${s <= step ? 'bg-orange-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const NavButtons = ({ onBack, onNext, nextLabel = 'Next', nextDisabled = false }) => (
    <div className="flex gap-3 mt-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm active:scale-[0.98] transition-transform"
        >
          Back
        </button>
      )}
      <button
        type="submit"
        disabled={saving || nextDisabled}
        className="flex-[2] bg-orange-500 text-white font-bold py-3.5 rounded-xl disabled:bg-orange-300 active:scale-[0.98] transition-transform shadow-lg shadow-orange-200 text-sm"
      >
        {saving ? '…' : nextLabel}
      </button>
    </div>
  );

  // ============ STEP 0: invite validation + account ============
  if (step === 0) {
    if (loading) {
      return (
        <Shell>
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-10 h-10 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4" />
            <div className="text-gray-400 text-sm">Validating your invite…</div>
          </div>
        </Shell>
      );
    }
    return (
      <Shell>
        <div className="flex-1 overflow-y-auto px-5 pt-8 pb-8">
          <div className="max-w-md mx-auto">
            {/* Logo header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-500 rounded-2xl mb-3 shadow-lg shadow-orange-200">
                <span className="text-white font-black text-xl">JH</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">Junk Haul Crew</div>
              <div className="text-sm text-gray-400 mt-0.5">Onboarding Portal</div>
            </div>

            {inviteError && !invite && (
              <div className="bg-white rounded-2xl border border-red-100 p-6 text-center shadow-sm">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="text-red-600 font-semibold text-sm mb-2">Invite problem</div>
                <div className="text-gray-600 text-sm">{inviteError}</div>
                <div className="text-xs text-gray-400 mt-4">
                  Contact your manager for a new invite link.
                </div>
              </div>
            )}

            {inviteError && invite && (
              <div className="bg-white rounded-2xl border border-red-100 p-5 mb-4 shadow-sm">
                <div className="text-red-600 font-medium text-sm mb-1">{inviteError}</div>
                <div className="text-gray-400 text-xs">Invite for {invite.email}</div>
              </div>
            )}

            {invite && !inviteError && (
            <>
              {/* Invite card */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 p-5 mb-5">
                <div className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-2">You&apos;re invited to join</div>
                <div className="text-xl font-bold text-gray-900">
                  {invite.first_name} {invite.last_name}
                </div>
                <div className="text-sm text-gray-600 mt-0.5">{invite.email}</div>
                {invite.pay_rate != null && (
                  <div className="mt-3 inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-sm shadow-sm">
                    <span className="text-gray-500">Pay rate</span>
                    <span className="font-bold text-gray-900">${Number(invite.pay_rate).toFixed(2)}</span>
                    <span className="text-gray-400 text-xs">/hr</span>
                  </div>
                )}
              </div>

              {/* Account form */}
              <form onSubmit={createAccount} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="font-bold text-gray-900 mb-1 text-lg">Create your account</div>
                <div className="text-sm text-gray-400 mb-5">Set up your password and contact info to get started.</div>

                <div className="space-y-4">
                  {/* Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={accountForm.password}
                      onChange={(e) => onPwChange(e.target.value)}
                      placeholder="Create a strong password"
                      required
                      autoComplete="new-password"
                      className={`w-full px-4 py-3 rounded-xl border text-base ${
                        accountForm.password && pwErrors.length > 0
                          ? 'border-amber-300 bg-amber-50'
                          : accountForm.password && pwErrors.length === 0
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200'
                      } focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent`}
                    />
                    {/* Password requirements */}
                    {accountForm.password && (
                      <div className="mt-2 space-y-1">
                        {[
                          { check: accountForm.password.length >= 8, label: '8+ characters' },
                          { check: /[0-9]/.test(accountForm.password), label: '1 number' },
                          { check: /[^A-Za-z0-9]/.test(accountForm.password), label: '1 special character' },
                        ].map((req, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs">
                            <span className={req.check ? 'text-green-600' : 'text-gray-400'}>
                              {req.check ? '✓' : '○'}
                            </span>
                            <span className={req.check ? 'text-green-600 font-medium' : 'text-gray-400'}>
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Mobile phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={accountForm.phone}
                      onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                      placeholder="(587) 555-0123"
                      required
                      autoComplete="tel"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                    <div className="text-xs text-gray-400 mt-1">We use this to contact you about shifts and jobs.</div>
                  </div>

                  {/* Address with autocomplete */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Home address <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={accountForm.address}
                      onChange={(e) => onAddressChange(e.target.value)}
                      onFocus={() => setAddressFocused(true)}
                      onBlur={() => setTimeout(() => setAddressFocused(false), 200)}
                      placeholder="Start typing your address…"
                      required
                      autoComplete="street-address"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                    {/* Autocomplete dropdown */}
                    {addressFocused && addressSuggestions.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                        {addressSuggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setAccountForm({ ...accountForm, address: s });
                              setAddressSuggestions([]);
                              setAddressFocused(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 border-b border-gray-50 last:border-0 flex items-center gap-2"
                          >
                            <span className="text-orange-400 flex-shrink-0">📍</span>
                            <span className="truncate">{s}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">Type your address and select from the list.</div>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl disabled:bg-orange-300 mt-6 text-base active:scale-[0.98] transition-transform shadow-lg shadow-orange-200"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account…
                    </span>
                  ) : (
                    'Create account & continue →'
                  )}
                </button>
              </form>

              <div className="text-center mt-5">
                <div className="text-xs text-gray-400">
                  🔒 Your data is encrypted and stored securely.
                </div>
              </div>
            </>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  // ============ STEP 1: personal info / SIN / license ============
  if (step === 1) {
    const FilePicker = ({ file, setFile, docType, label, hint }) => (
      <div>
        <label className={labelCls}>{label}</label>
        <label className="block">
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFile(f);
              if (f) handleUpload(docType, f, label);
            }}
            disabled={uploading === docType}
          />
          <span className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-200 cursor-pointer ${
            file ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700'
          } ${uploading === docType ? 'opacity-50' : ''}`}>
            {uploading === docType ? 'Uploading…' : file ? `✓ ${file.name}` : 'Choose file'}
          </span>
        </label>
        {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
      </div>
    );

    return (
      <Shell>
        <ProgressBar />
        <div className="max-w-md mx-auto px-5 py-6">
          <form onSubmit={submitPersonal} className={cardCls}>
            <div className="font-semibold text-gray-900 mb-1">Personal Information</div>
            <div className="text-xs text-gray-400 mb-4">Pre-filled from your invite. Upload your documents below.</div>

            <div className="space-y-3">
              <div>
                <label className={labelCls}>Full legal name</label>
                <input value={personal.name} readOnly className={inputCls + ' bg-gray-50 text-gray-500'} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input value={personal.email} readOnly className={inputCls + ' bg-gray-50 text-gray-500'} />
              </div>
              <div>
                <label className={labelCls}>Address</label>
                <input
                  value={personal.address}
                  onChange={(e) => setPersonal({ ...personal, address: e.target.value })}
                  placeholder="Street, city, province, postal code"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="border-t border-gray-100 my-4" />

            <div className="space-y-4">
              <FilePicker
                file={sinFile}
                setFile={setSinFile}
                docType="sin_document"
                label="SIN document photo"
                hint="A clear photo of your Social Insurance Number document."
              />
              <FilePicker
                file={licenseFront}
                setFile={setLicenseFront}
                docType="drivers_license"
                label="Driver's license — front"
                hint="Photo of the front of your license."
              />
              <FilePicker
                file={licenseBack}
                setFile={setLicenseBack}
                docType="drivers_license"
                label="Driver's license — back"
                hint="Photo of the back of your license."
              />
            </div>

            {error && <div className="text-red-500 text-sm mt-3">{error}</div>}
            <NavButtons onNext={submitPersonal} nextLabel="Continue" />
          </form>
        </div>
      </Shell>
    );
  }

  // ============ STEP 2: TD1 Federal ============
  if (step === 2) {
    return (
      <Shell>
        <ProgressBar />
        <div className="max-w-md mx-auto px-5 py-6">
          <form onSubmit={(e) => { e.preventDefault(); submitTd1('federal', td1Federal, TD1_BASIC_PERSONAL, 3); }} className={cardCls}>
            <div className="font-semibold text-gray-900 mb-1">TD1 — Federal Tax Form</div>
            <div className="text-xs text-gray-400 mb-4">
              Basic personal amount: <span className="font-medium text-gray-600">${TD1_BASIC_PERSONAL.toLocaleString()}</span>
            </div>

            <Td1Fields form={td1Federal} setForm={setTd1Federal} basic={TD1_BASIC_PERSONAL} spousalDefault={SPOUSAL_AMOUNT} />

            {error && <div className="text-red-500 text-sm mt-3">{error}</div>}
            <NavButtons onBack={() => setStep(1)} nextLabel="Save & continue" />
          </form>
        </div>
      </Shell>
    );
  }

  // ============ STEP 3: TD1AB ============
  if (step === 3) {
    return (
      <Shell>
        <ProgressBar />
        <div className="max-w-md mx-auto px-5 py-6">
          <form onSubmit={(e) => { e.preventDefault(); submitTd1('ab', td1Ab, TD1AB_BASIC_PERSONAL, 4); }} className={cardCls}>
            <div className="font-semibold text-gray-900 mb-1">TD1AB — Alberta Provincial Tax Form</div>
            <div className="text-xs text-gray-400 mb-4">
              Basic personal amount: <span className="font-medium text-gray-600">${TD1AB_BASIC_PERSONAL.toLocaleString()}</span>
            </div>

            <Td1Fields form={td1Ab} setForm={setTd1Ab} basic={TD1AB_BASIC_PERSONAL} spousalDefault={SPOUSAL_AMOUNT} />

            {error && <div className="text-red-500 text-sm mt-3">{error}</div>}
            <NavButtons onBack={() => setStep(2)} nextLabel="Save & continue" />
          </form>
        </div>
      </Shell>
    );
  }

  // ============ STEP 4: contract e-sign ============
  if (step === 4) {
    return (
      <Shell>
        <ProgressBar />
        <div className="max-w-md mx-auto px-5 py-6">
          <form onSubmit={submitContract} className={cardCls}>
            <div className="font-semibold text-gray-900 mb-3">Employment Contract</div>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 max-h-64 overflow-y-auto space-y-2">
              <p><strong>Junk Haul Crew — Employment Agreement (v1.0)</strong></p>
              <p>This agreement is between Junk Haul (&ldquo;the Company&rdquo;) and the undersigned employee (&ldquo;you&rdquo;).</p>
              <p>1. <strong>Role.</strong> You are hired as a crew member responsible for junk removal services, including driving, loading, and customer interaction.</p>
              <p>2. <strong>Pay.</strong> You will be paid at the agreed hourly rate. Overtime applies per provincial employment standards.</p>
              <p>3. <strong>Schedule.</strong> Shifts are assigned via the crew portal. You are responsible for clocking in and out accurately.</p>
              <p>4. <strong>Conduct.</strong> You agree to perform duties safely, courteously, and in compliance with all laws and Company policies.</p>
              <p>5. <strong>Termination.</strong> Either party may end employment with notice as required by law.</p>
              <p>6. <strong>Confidentiality.</strong> Customer and Company information must be kept confidential.</p>
              <p>By typing your name below, you acknowledge you have read and agree to this contract.</p>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className={labelCls}>Type your full legal name as your signature</label>
                <input
                  value={contract.signature_typed}
                  onChange={(e) => setContract({ ...contract, signature_typed: e.target.value })}
                  placeholder="Full legal name"
                  className={inputCls}
                />
              </div>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={contract.agreed}
                  onChange={(e) => setContract({ ...contract, agreed: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300"
                />
                <span>I have read and agree to the employment contract above.</span>
              </label>
            </div>

            {error && <div className="text-red-500 text-sm mt-3">{error}</div>}
            <NavButtons onBack={() => setStep(3)} nextLabel="Sign & continue" nextDisabled={!contract.agreed || !contract.signature_typed.trim()} />
          </form>
        </div>
      </Shell>
    );
  }

  // ============ STEP 5: banking ============
  if (step === 5) {
    return (
      <Shell>
        <ProgressBar />
        <div className="max-w-md mx-auto px-5 py-6">
          <form onSubmit={submitBanking} className={cardCls}>
            <div className="font-semibold text-gray-900 mb-1">Direct Deposit — Banking Info</div>
            <div className="text-xs text-gray-400 mb-4">Your account details are encrypted at rest.</div>

            <div className="space-y-3">
              <div>
                <label className={labelCls}>Bank name</label>
                <input
                  value={banking.bank_name}
                  onChange={(e) => setBanking({ ...banking, bank_name: e.target.value })}
                  placeholder="e.g. RBC, TD, Scotiabank"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Institution number (3 digits)</label>
                <input
                  value={banking.institution_number}
                  onChange={(e) => setBanking({ ...banking, institution_number: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                  placeholder="e.g. 003"
                  inputMode="numeric"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Transit number (5 digits)</label>
                <input
                  value={banking.transit_number}
                  onChange={(e) => setBanking({ ...banking, transit_number: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                  placeholder="e.g. 01234"
                  inputMode="numeric"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Account number</label>
                <input
                  value={banking.account_number}
                  onChange={(e) => setBanking({ ...banking, account_number: e.target.value.replace(/\s/g, '') })}
                  placeholder="Your bank account number"
                  inputMode="numeric"
                  className={inputCls}
                />
              </div>
            </div>

            {error && <div className="text-red-500 text-sm mt-3">{error}</div>}
            <NavButtons onBack={() => setStep(4)} nextLabel="Save & continue" />
          </form>
        </div>
      </Shell>
    );
  }

  // ============ STEP 6: acknowledgments ============
  if (step === 6) {
    const items = [
      { key: 'tickets', text: 'I acknowledge that any traffic tickets received while driving for work are my responsibility.' },
      { key: 'phone', text: 'I acknowledge that my phone is required for work and I will keep it charged.' },
      { key: 'data', text: 'I acknowledge that I will use my data plan for work apps and will not seek reimbursement.' },
      { key: 'company_card', text: 'I acknowledge that any company card usage is for work expenses only.' },
    ];
    return (
      <Shell>
        <ProgressBar />
        <div className="max-w-md mx-auto px-5 py-6">
          <form onSubmit={submitAcks} className={cardCls}>
            <div className="font-semibold text-gray-900 mb-4">Acknowledgments</div>
            <div className="space-y-3">
              {items.map((it) => (
                <label key={it.key} className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={acks[it.key]}
                    onChange={(e) => setAcks({ ...acks, [it.key]: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300"
                  />
                  <span>{it.text}</span>
                </label>
              ))}
            </div>
            {error && <div className="text-red-500 text-sm mt-3">{error}</div>}
            <NavButtons onBack={() => setStep(5)} nextLabel="Continue" nextDisabled={!acks.tickets || !acks.phone || !acks.data || !acks.company_card} />
          </form>
        </div>
      </Shell>
    );
  }

  // ============ STEP 7: complete ============
  if (step === 7) {
    const done = completeData?.ok;
    return (
      <Shell>
        <ProgressBar />
        <div className="max-w-md mx-auto px-5 py-6">
          <div className={cardCls + ' text-center'}>
            {!done && !completeData?.missing && (
              <>
                <div className="text-lg font-bold text-gray-900 mb-2">Final step</div>
                <div className="text-sm text-gray-500 mb-4">
                  Click below to verify everything and finish your onboarding.
                </div>
                <button
                  onClick={completeOnboarding}
                  disabled={saving}
                  className="w-full bg-orange-500 text-white font-semibold py-3 rounded-lg disabled:bg-orange-300"
                >
                  {saving ? 'Verifying…' : 'Complete onboarding'}
                </button>
              </>
            )}

            {!done && completeData?.missing && (
              <>
                <div className="text-lg font-bold text-red-500 mb-2">Not quite done</div>
                <div className="text-sm text-gray-600 mb-3">Some items still need attention:</div>
                <ul className="text-left text-sm text-gray-700 list-disc list-inside space-y-1 mb-4">
                  {completeData.missing.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
                <button
                  onClick={() => setError('')}
                  className="text-sm text-gray-500 underline"
                >
                  Go back to fix
                </button>
              </>
            )}

            {done && (
              <>
                <div className="text-4xl mb-3">✅</div>
                <div className="text-lg font-bold text-gray-900 mb-1">You&apos;re all set!</div>
                <div className="text-sm text-gray-500 mb-5">
                  Onboarding complete. You can now view your schedule and clock in.
                </div>
                <button
                  onClick={() => router.push('/portal/schedule')}
                  className="w-full bg-orange-500 text-white font-semibold py-3 rounded-lg"
                >
                  Go to schedule →
                </button>
              </>
            )}

            {error && <div className="text-red-500 text-sm mt-3">{error}</div>}
          </div>
        </div>
      </Shell>
    );
  }

  return null;
}

// ============ TD1 shared fields ============
function Td1Fields({ form, setForm, basic, spousalDefault }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const autoTotal = (Number(form.spousal_amount) || 0) + (Number(form.other_deductions) || 0) + basic;
  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Total income from all employers this year (if more than one)</label>
        <input
          value={form.total_income_other_employers}
          onChange={set('total_income_other_employers')}
          placeholder="0"
          inputMode="numeric"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Spousal amount (if applicable)</label>
        <input
          value={form.spousal_amount}
          onChange={set('spousal_amount')}
          placeholder={`e.g. ${spousalDefault.toLocaleString()}`}
          inputMode="numeric"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Number of dependents</label>
        <input
          value={form.dependents_count}
          onChange={set('dependents_count')}
          placeholder="0"
          inputMode="numeric"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Other deductions</label>
        <input
          value={form.other_deductions}
          onChange={set('other_deductions')}
          placeholder="0"
          inputMode="numeric"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Total claim amount</label>
        <input
          value={form.total_claim}
          onChange={set('total_claim')}
          placeholder={`Auto: $${autoTotal.toLocaleString()}`}
          inputMode="numeric"
          className={inputCls}
        />
        <div className="text-xs text-gray-400 mt-1">
          Leave blank to auto-calculate (${autoTotal.toLocaleString()}) or enter a custom amount.
        </div>
      </div>
    </div>
  );
}

// ============ shell wrapper ============
function Shell({ children }) {
  return <main className="min-h-dvh bg-gray-50 flex flex-col safe-top safe-bottom">{children}</main>;
}

export default function OnboardPage() {
  return (
    <Suspense fallback={<Shell><div className="text-center text-gray-400 py-12">Loading…</div></Shell>}>
      <OnboardInner />
    </Suspense>
  );
}
