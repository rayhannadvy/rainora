import { useEffect, useState } from 'react';
import { Save, Loader2, Lock, Mail, Key, CheckCircle2, Shield } from 'lucide-react';
import { authFetch } from '../../lib/adminApi';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';


const emptyForm = {
  shop_name: '',
  tagline: '',
  logo_url: '',
  facebook: '',
  instagram: '',
  whatsapp: '',
  phone: '',
  address: '',
};

export default function AdminSettings() {
  const { success: toastSuccess, error: toastError } = useToast();
  const { refresh } = useSettings();
  const [form, setForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { user, refreshUser } = useAuth();
  const [currentEmailDisplay, setCurrentEmailDisplay] = useState(user?.email || 'admin@rainora.com');

  // Change Email Flow State
  const [emailStep, setEmailStep] = useState('idle'); // 'idle' | 'otp'
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailDevOtp, setEmailDevOtp] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Change Password Flow State
  const [passStep, setPassStep] = useState('idle'); // 'idle' | 'otp' | 'new_password'
  const [passOtp, setPassOtp] = useState('');
  const [passDevOtp, setPassDevOtp] = useState('');
  const [passToken, setPassToken] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  useEffect(() => {
    if (user?.email) setCurrentEmailDisplay(user.email);
    authFetch('/api/admin-account')
      .then((r) => r.json())
      .then((data) => {
        if (data?.email) {
          setCurrentEmailDisplay(data.email);
        }
      })
      .catch(() => {});
  }, [user]);


  // 1. Send OTP to new email
  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (newEmail.trim().toLowerCase() === currentEmailDisplay.toLowerCase()) {
      setEmailError('New email must be different from current email.');
      return;
    }
    setEmailLoading(true);
    try {
      const res = await authFetch('/api/otp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send',
          newEmail: newEmail.trim(),
          purpose: 'change-email',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code');
      if (data.dev_otp) setEmailDevOtp(data.dev_otp);
      setEmailStep('otp');
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  // 2. Verify OTP & apply new email
  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    if (!emailOtp || emailOtp.trim().length < 6) {
      setEmailError('Please enter the 6-digit verification code.');
      return;
    }
    setEmailLoading(true);
    try {
      const verifyRes = await authFetch('/api/otp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'verify',
          email: newEmail.trim(),
          otp: emailOtp.trim(),
          purpose: 'change-email',
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Invalid verification code');

      const changeRes = await authFetch('/api/otp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'change-email',
          newEmail: newEmail.trim(),
          verification_token: verifyData.verification_token,
        }),
      });
      const changeData = await changeRes.json();
      if (!changeRes.ok) throw new Error(changeData.error || 'Failed to update email');

      setCurrentEmailDisplay(changeData.email || newEmail.trim());
      if (typeof refreshUser === 'function') refreshUser();
      setEmailSuccess('Email updated successfully!');
      toastSuccess('Email updated successfully!');
      setNewEmail('');
      setEmailOtp('');
      setEmailDevOtp('');
      setEmailStep('idle');
    } catch (err) {
      setEmailError(err.message);
      toastError(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  // 3. Send OTP to current email for password change
  const handleSendPassOtp = async () => {
    setPassError('');
    setPassSuccess('');
    setPassLoading(true);
    try {
      const res = await authFetch('/api/otp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send',
          purpose: 'change-password',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code');
      if (data.dev_otp) setPassDevOtp(data.dev_otp);
      setPassStep('otp');
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  // 4. Verify password change OTP
  const handleVerifyPassOtp = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    if (!passOtp || passOtp.trim().length < 6) {
      setPassError('Please enter the 6-digit verification code.');
      return;
    }
    setPassLoading(true);
    try {
      const res = await authFetch('/api/otp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'verify',
          email: currentEmailDisplay,
          otp: passOtp.trim(),
          purpose: 'change-password',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid verification code');
      setPassToken(data.verification_token);
      setPassStep('new_password');
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  // 5. Apply new password
  const handleApplyNewPassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    if (!newPass || newPass.length < 6) {
      setPassError('Password must be at least 6 characters long.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Passwords do not match.');
      return;
    }
    setPassLoading(true);
    try {
      const res = await authFetch('/api/otp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'change-password',
          verification_token: passToken,
          newPassword: newPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      setPassSuccess('Password changed successfully!');
      toastSuccess('Password changed successfully!');
      setNewPass('');
      setConfirmPass('');
      setPassOtp('');
      setPassDevOtp('');
      setPassToken('');
      setPassStep('idle');
    } catch (err) {
      setPassError(err.message);
      toastError(err.message);
    } finally {
      setPassLoading(false);
    }
  };


  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setForm({ ...emptyForm, ...data });
          setLogoPreview(data.logo_url || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          const res = await authFetch('/api/upload', {
            method: 'POST',
            body: JSON.stringify({
              fileName: `logo_${Date.now()}_${file.name}`,
              fileBase64: base64,
              contentType: file.type,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Upload failed');
          resolve(data.url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      let logoUrl = form.logo_url;
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }
      const payload = { ...form, logo_url: logoUrl };
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      setForm(payload);
      setLogoFile(null);
      refresh();
      setSaved(true);
      toastSuccess('Store settings saved successfully');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-neutral-500 text-center py-20">Loading settings...</p>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-serif mb-1">Settings</h1>
        <p className="text-neutral-500 text-sm">
          Your shop's logo, social links and contact details \u2014 shown live across the header,
          footer and checkout.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-neutral-400 text-xs uppercase tracking-wide">Logo</label>
          <div className="flex items-center gap-4 mt-1.5">
            {logoPreview && (
              <img src={logoPreview} alt="logo preview" className="w-16 h-16 rounded-full object-cover border border-white/10" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="text-neutral-400 text-xs file:mr-3 file:py-2 file:px-3 file:border-0 file:bg-orange-500 file:text-black file:text-xs file:font-semibold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-neutral-400 text-xs uppercase tracking-wide">Shop Name</label>
            <input
              value={form.shop_name}
              onChange={(e) => setForm((f) => ({ ...f, shop_name: e.target.value }))}
              className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-neutral-400 text-xs uppercase tracking-wide">Tagline</label>
            <input
              value={form.tagline}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-neutral-400 text-xs uppercase tracking-wide">Facebook Page Link</label>
          <input
            value={form.facebook}
            onChange={(e) => setForm((f) => ({ ...f, facebook: e.target.value }))}
            className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
            placeholder="https://facebook.com/yourpage"
          />
        </div>
        <div>
          <label className="text-neutral-400 text-xs uppercase tracking-wide">Instagram Link</label>
          <input
            value={form.instagram}
            onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
            className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
            placeholder="https://instagram.com/yourpage"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-neutral-400 text-xs uppercase tracking-wide">
              WhatsApp Number (with country code, no +)
            </label>
            <input
              value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
              className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
              placeholder="8801XXXXXXXXX"
            />
          </div>
          <div>
            <label className="text-neutral-400 text-xs uppercase tracking-wide">Phone (display)</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
              placeholder="01XXXXXXXXX"
            />
          </div>
        </div>
        <div>
          <label className="text-neutral-400 text-xs uppercase tracking-wide">Shop Address</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            rows={2}
            className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-black font-semibold px-4 py-2.5 text-sm cursor-pointer"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </form>

      {/* Admin Login & Security */}
      <div className="mt-14 pt-8 border-t border-white/10 space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-orange-500" />
            <h2 className="text-white text-xl font-serif">Admin Security & Credentials</h2>
          </div>
          <p className="text-neutral-500 text-sm">
            Update your login email or password using secure email OTP verification.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-neutral-900 border border-white/10 px-3 py-1.5 text-xs text-neutral-300">
            <span className="text-neutral-500">Current Login Email:</span>
            <span className="text-orange-400 font-mono">{currentEmailDisplay}</span>
          </div>
        </div>

        {/* ---------------- CARD 1: CHANGE EMAIL WITH OTP ---------------- */}
        <div className="bg-neutral-950 border border-white/10 p-5 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Mail size={16} className="text-orange-400" />
            <h3 className="text-white text-sm font-semibold uppercase tracking-wider">Change Admin Email</h3>
          </div>
          <p className="text-neutral-400 text-xs mb-4">
            A 6-digit verification code will be sent to your new email address to confirm ownership.
          </p>

          {emailSuccess && (
            <div className="p-3 mb-4 bg-green-950/40 border border-green-500/30 text-green-400 text-xs rounded flex items-center gap-2">
              <CheckCircle2 size={15} /> {emailSuccess}
            </div>
          )}

          {emailStep === 'idle' && (
            <form onSubmit={handleSendEmailOtp} className="space-y-4">
              <div>
                <label className="text-neutral-400 text-xs uppercase tracking-wide">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
                  placeholder="yourname@gmail.com"
                />
              </div>

              {emailError && <p className="text-red-500 text-xs">{emailError}</p>}

              <button
                type="submit"
                disabled={emailLoading}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-black font-semibold px-4 py-2.5 text-sm transition-colors cursor-pointer"
              >
                {emailLoading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Send Code to New Email
              </button>
            </form>
          )}

          {emailStep === 'otp' && (
            <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
              <p className="text-xs text-neutral-300">
                Enter the 6-digit code sent to <span className="text-orange-400 font-mono">{newEmail}</span>:
              </p>

              {emailDevOtp && (
                <div className="p-2 bg-orange-950/50 border border-orange-500/30 text-orange-300 text-xs rounded">
                  <span className="font-semibold">Local Dev Code:</span> <code className="font-mono text-sm tracking-widest">{emailDevOtp}</code>
                </div>
              )}

              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full sm:w-60 bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2 text-center text-lg font-mono tracking-widest"
                  placeholder="123456"
                  autoFocus
                />
              </div>

              {emailError && <p className="text-red-500 text-xs">{emailError}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={emailLoading || emailOtp.length < 6}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-black font-semibold px-4 py-2.5 text-sm transition-colors cursor-pointer"
                >
                  {emailLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Verify & Update Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailStep('idle');
                    setEmailOtp('');
                    setEmailError('');
                  }}
                  className="text-neutral-400 hover:text-white text-xs px-3 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ---------------- CARD 2: CHANGE PASSWORD WITH OTP ---------------- */}
        <div className="bg-neutral-950 border border-white/10 p-5 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Key size={16} className="text-orange-400" />
            <h3 className="text-white text-sm font-semibold uppercase tracking-wider">Change Admin Password</h3>
          </div>
          <p className="text-neutral-400 text-xs mb-4">
            Verify ownership with a 6-digit code sent to your current admin email before setting a new password.
          </p>

          {passSuccess && (
            <div className="p-3 mb-4 bg-green-950/40 border border-green-500/30 text-green-400 text-xs rounded flex items-center gap-2">
              <CheckCircle2 size={15} /> {passSuccess}
            </div>
          )}

          {passStep === 'idle' && (
            <div className="space-y-4">
              {passError && <p className="text-red-500 text-xs">{passError}</p>}

              <button
                type="button"
                onClick={handleSendPassOtp}
                disabled={passLoading}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-white/10 text-white font-semibold px-4 py-2.5 text-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {passLoading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Send Reset Code to {currentEmailDisplay}
              </button>
            </div>
          )}

          {passStep === 'otp' && (
            <form onSubmit={handleVerifyPassOtp} className="space-y-4">
              <p className="text-xs text-neutral-300">
                Enter the 6-digit code sent to <span className="text-orange-400 font-mono">{currentEmailDisplay}</span>:
              </p>

              {passDevOtp && (
                <div className="p-2 bg-orange-950/50 border border-orange-500/30 text-orange-300 text-xs rounded">
                  <span className="font-semibold">Local Dev Code:</span> <code className="font-mono text-sm tracking-widest">{passDevOtp}</code>
                </div>
              )}

              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={passOtp}
                  onChange={(e) => setPassOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full sm:w-60 bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2 text-center text-lg font-mono tracking-widest"
                  placeholder="123456"
                  autoFocus
                />
              </div>

              {passError && <p className="text-red-500 text-xs">{passError}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={passLoading || passOtp.length < 6}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-black font-semibold px-4 py-2.5 text-sm transition-colors cursor-pointer"
                >
                  {passLoading ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                  Verify Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPassStep('idle');
                    setPassOtp('');
                    setPassError('');
                  }}
                  className="text-neutral-400 hover:text-white text-xs px-3 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {passStep === 'new_password' && (
            <form onSubmit={handleApplyNewPassword} className="space-y-4">
              <div className="p-2.5 bg-green-950/40 border border-green-500/30 text-green-400 text-xs rounded flex items-center gap-2">
                <CheckCircle2 size={14} /> Code verified! Please set your new password.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 text-xs uppercase tracking-wide">New Password</label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
                    placeholder="At least 6 characters"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs uppercase tracking-wide">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
                    placeholder="Confirm password"
                  />
                </div>
              </div>

              {passError && <p className="text-red-500 text-xs">{passError}</p>}

              <button
                type="submit"
                disabled={passLoading}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-black font-semibold px-4 py-2.5 text-sm transition-colors cursor-pointer"
              >
                {passLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                Save New Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}


