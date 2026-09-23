import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, Mail, CheckCircle2, Loader2, Lock } from 'lucide-react';
import supabase from '../lib/supabase';
import Logo from '../components/Logo';
import LogoBadge from '../components/LogoBadge';

export default function AdminLogin() {
  const [mode, setMode] = useState('login'); // 'login' | 'forgot_email' | 'forgot_otp' | 'forgot_password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Forgot password flow states
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Regular Sign In
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate('/admin');
  };

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!resetEmail || !resetEmail.trim()) {
      setError('Please enter your admin email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          email: resetEmail.trim(),
          purpose: 'forgot-password',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code.');
      if (data.dev_otp) setDevOtp(data.dev_otp);
      setMode('forgot_otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.trim().length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          email: resetEmail.trim(),
          otp: otp.trim(),
          purpose: 'forgot-password',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid verification code.');
      setVerificationToken(data.verification_token);
      setMode('forgot_password');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password & Sign In
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-password',
          email: resetEmail.trim(),
          verification_token: verificationToken,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.');

      setSuccessMessage('Password reset successfully! Signing you in...');

      // Auto sign in with the new password
      const loginRes = await supabase.auth.signInWithPassword({
        email: resetEmail.trim(),
        password: newPassword,
      });

      if (!loginRes.error) {
        setTimeout(() => navigate('/admin'), 1200);
      } else {
        setTimeout(() => {
          setEmail(resetEmail);
          setMode('login');
          setSuccessMessage('Password updated. Please log in with your new password.');
        }, 1500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchBackToLogin = () => {
    setError('');
    setSuccessMessage('');
    setMode('login');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-5 py-12">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <LogoBadge size={64} className="mx-auto mb-3" />
          <Logo textClass="text-3xl" className="justify-center" />
          <p className="text-neutral-500 text-xs uppercase tracking-widest mt-3">Admin Panel</p>
        </div>

        {/* ----------------- LOGIN MODE ----------------- */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            {successMessage && (
              <div className="p-3 bg-green-950/40 border border-green-500/30 text-green-400 text-xs rounded">
                {successMessage}
              </div>
            )}

            <div>
              <label className="text-neutral-400 text-xs uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-4 py-3 text-sm"
                placeholder="you@rainora.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-neutral-400 text-xs uppercase tracking-wide">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setError('');
                    setSuccessMessage('');
                    setMode('forgot_email');
                  }}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-4 py-3 text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-black font-semibold py-3 transition-colors cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ----------------- FORGOT PASSWORD: STEP 1 (EMAIL) ----------------- */}
        {mode === 'forgot_email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="mb-2">
              <h2 className="text-white text-lg font-serif">Recover Password</h2>
              <p className="text-neutral-400 text-xs mt-1">
                Enter your admin email address to receive a 6-digit verification code.
              </p>
            </div>

            <div>
              <label className="text-neutral-400 text-xs uppercase tracking-wide">Admin Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-4 py-3 text-sm"
                placeholder="you@rainora.com"
                autoFocus
              />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-black font-semibold py-3 transition-colors cursor-pointer"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              Send Verification Code
            </button>

            <button
              type="button"
              onClick={switchBackToLogin}
              className="w-full flex items-center justify-center gap-1 text-neutral-400 hover:text-white text-xs py-2 transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} /> Back to Sign In
            </button>
          </form>
        )}

        {/* ----------------- FORGOT PASSWORD: STEP 2 (ENTER OTP) ----------------- */}
        {mode === 'forgot_otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="mb-2">
              <h2 className="text-white text-lg font-serif">Enter Verification Code</h2>
              <p className="text-neutral-400 text-xs mt-1">
                We sent a 6-digit OTP code to <span className="text-orange-400 font-mono">{resetEmail}</span>.
              </p>
            </div>

            {devOtp && (
              <div className="p-2.5 bg-orange-950/50 border border-orange-500/30 text-orange-300 text-xs rounded">
                <span className="font-semibold">Local Dev Code:</span> <code className="font-mono text-sm tracking-widest">{devOtp}</code>
              </div>
            )}

            <div>
              <label className="text-neutral-400 text-xs uppercase tracking-wide">6-Digit Code</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-4 py-3 text-center text-xl font-mono tracking-widest"
                placeholder="123456"
                autoFocus
              />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-black font-semibold py-3 transition-colors cursor-pointer"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
              Verify Code
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
              >
                Resend Code
              </button>
              <button
                type="button"
                onClick={switchBackToLogin}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* ----------------- FORGOT PASSWORD: STEP 3 (NEW PASSWORD) ----------------- */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="mb-2">
              <div className="flex items-center gap-2 text-green-400 text-xs mb-1">
                <CheckCircle2 size={15} /> Code verified successfully
              </div>
              <h2 className="text-white text-lg font-serif">Set New Password</h2>
              <p className="text-neutral-400 text-xs mt-1">
                Choose a new secure password for your admin account.
              </p>
            </div>

            {successMessage && (
              <div className="p-3 bg-green-950/40 border border-green-500/30 text-green-400 text-xs rounded">
                {successMessage}
              </div>
            )}

            <div>
              <label className="text-neutral-400 text-xs uppercase tracking-wide">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-4 py-3 text-sm"
                placeholder="At least 6 characters"
                autoFocus
              />
            </div>

            <div>
              <label className="text-neutral-400 text-xs uppercase tracking-wide">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-4 py-3 text-sm"
                placeholder="Confirm password"
              />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-black font-semibold py-3 transition-colors cursor-pointer"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              Save New Password & Sign In
            </button>
          </form>
        )}

        <a href="/" className="block text-center text-neutral-600 hover:text-neutral-400 text-xs mt-8">
          &larr; Back to site
        </a>
      </div>
    </div>
  );
}
