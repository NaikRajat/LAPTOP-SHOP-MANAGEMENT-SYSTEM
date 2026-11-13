import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.js';
import { api } from '../services/api.js';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  ArrowRight,
  ArrowLeft,
  Check,
  RefreshCw,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Laptop
} from 'lucide-react';
import { validateEmail, sanitizeMobileDigits, validateIndianMobile, validateStrongPassword } from '../utils/validation.js';
import { PasswordRequirements } from './PasswordRequirements.js';

type AuthStep = 'email' | 'signin' | 'signup' | 'verify';

export const AuthModal: React.FC = () => {
  const {
    isAuthOpen,
    setIsAuthOpen,
    authInitialTab,
    login,
    register,
    googleLogin,
    sendVerificationCode,
    verifyCodeAndLogin,
    showToast
  } = useApp();

  // Navigation flow: 'email' -> 'signin' (existing) OR 'signup' (new) -> 'verify' (if OTP requested)
  const [step, setStep] = useState<AuthStep>('email');
  const [authPurpose, setAuthPurpose] = useState<'login' | 'register'>('login');

  // Input states
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field validation errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // OTP states
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [maxAttemptsExceeded, setMaxAttemptsExceeded] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Loading & feedback states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [googlePopupBlocked, setGooglePopupBlocked] = useState(false);

  // Reset modal state when opening
  useEffect(() => {
    if (isAuthOpen) {
      setStep('email');
      setAuthPurpose('login');
      setEmail('');
      setName('');
      setPhone('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setEmailError(null);
      setPhoneError(null);
      setPasswordError(null);
      setOtpDigits(['', '', '', '', '', '']);
      setSessionId(null);
      setExpiresAt(null);
      setSecondsRemaining(300);
      setResendCooldown(0);
      setAttemptsRemaining(null);
      setMaxAttemptsExceeded(false);
      setIsExpired(false);
      setLoading(false);
      setErrorMessage(null);
      setInfoMessage(null);
      setGooglePopupBlocked(false);
    }
  }, [isAuthOpen, authInitialTab]);

  // Expiration countdown for OTP
  useEffect(() => {
    if (!expiresAt || step !== 'verify') return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
        setErrorMessage('Verification code has expired. Please request a new one.');
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, step]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const cooldownTimer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(cooldownTimer);
  }, [resendCooldown]);

  // Focus first OTP box on verify step
  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  if (!isAuthOpen) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Step 1: Check if email belongs to an existing account (Read-only check, does NOT create account)
  const handleEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setEmailError(null);

    const targetEmail = email.trim().toLowerCase();
    const emailVal = validateEmail(targetEmail);
    if (!emailVal.valid) {
      const err = emailVal.error || 'Please enter a valid email address.';
      setEmailError(err);
      setErrorMessage(err);
      return;
    }

    setLoading(true);
    try {
      const res = await api.checkEmail(targetEmail);
      if (res.exists) {
        // Existing account: show Sign In options
        if (res.name) {
          setName(res.name);
        }
        setPassword('');
        setAuthPurpose('login');
        setStep('signin');
      } else {
        // New account: show Sign Up form with required fields
        setPassword('');
        setConfirmPassword('');
        setAuthPurpose('register');
        setStep('signup');
      }
    } catch (err: any) {
      console.error('Email check failed:', err);
      // Fallback: If network check fails, direct to sign in
      setStep('signin');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Existing account - Password Sign In
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      setIsAuthOpen(false);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Option: Existing account - Trigger Email OTP
  const handleRequestOtp = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    const targetEmail = email.trim().toLowerCase();
    const emailVal = validateEmail(targetEmail);
    if (!emailVal.valid) {
      setErrorMessage(emailVal.error || 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendVerificationCode(targetEmail, name.trim(), 'login');
      if (res.success && res.sessionId) {
        setAuthPurpose('login');
        setSessionId(res.sessionId);
        setExpiresAt(res.expiresAt);
        setSecondsRemaining(Math.max(0, Math.floor((res.expiresAt - Date.now()) / 1000)));
        setResendCooldown(res.cooldownSeconds || 60);
        setOtpDigits(['', '', '', '', '', '']);
        setAttemptsRemaining(5);
        setMaxAttemptsExceeded(false);
        setIsExpired(false);
        setStep('verify');
        setInfoMessage(res.message || `Verification code sent to ${targetEmail}`);
        showToast('Verification Code Sent', `Code sent to ${targetEmail}`, 'info');
      } else {
        throw new Error('Server did not return a valid session.');
      }
    } catch (err: any) {
      console.error('Failed to send verification code:', err);
      const msg = err.message || 'Unable to send verification code right now. Please try again.';
      setErrorMessage(msg);
      if (err.cooldownRemaining) {
        setResendCooldown(err.cooldownRemaining);
      }
      showToast('Unable to Send Code', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: New account - Validate inputs and send OTP before registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setEmailError(null);
    setPhoneError(null);
    setPasswordError(null);

    const targetName = name.trim();
    const targetEmail = email.trim().toLowerCase();
    const targetPhone = sanitizeMobileDigits(phone);

    if (!targetName) {
      setErrorMessage('Full Name is required.');
      return;
    }

    const emailVal = validateEmail(targetEmail);
    if (!emailVal.valid) {
      const err = emailVal.error || 'Please enter a valid email address.';
      setEmailError(err);
      setErrorMessage(err);
      return;
    }

    const phoneVal = validateIndianMobile(targetPhone);
    if (!phoneVal.valid) {
      const err = phoneVal.error || 'Please enter a valid 10-digit mobile number.';
      setPhoneError(err);
      setErrorMessage(err);
      return;
    }

    const passVal = validateStrongPassword(password);
    if (!passVal.valid) {
      const err = passVal.error || 'Password must meet all complexity requirements.';
      setPasswordError(err);
      setErrorMessage(err);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      // Deliver OTP code to verify actual mailbox ownership before creating account
      const res = await sendVerificationCode(targetEmail, targetName, 'register');
      if (res.success && res.sessionId) {
        setAuthPurpose('register');
        setSessionId(res.sessionId);
        setExpiresAt(res.expiresAt);
        setSecondsRemaining(Math.max(0, Math.floor((res.expiresAt - Date.now()) / 1000)));
        setResendCooldown(res.cooldownSeconds || 60);
        setOtpDigits(['', '', '', '', '', '']);
        setAttemptsRemaining(5);
        setMaxAttemptsExceeded(false);
        setIsExpired(false);
        setStep('verify');
        setInfoMessage(res.message || `Verification code sent to ${targetEmail}`);
        showToast('Verification Code Sent', `Code sent to ${targetEmail}`, 'info');
      } else {
        throw new Error('Server did not return a valid session.');
      }
    } catch (err: any) {
      console.error('Registration OTP dispatch failed:', err);
      const msg = err.message || 'Unable to send verification code right now. Please try again.';
      setErrorMessage(msg);
      if (err.cooldownRemaining) {
        setResendCooldown(err.cooldownRemaining);
      }
      showToast('Unable to Send Code', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Verify 6-digit OTP (completes registration or logs in)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const code = otpDigits.join('').trim();
    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }
    if (!sessionId) {
      setErrorMessage('Verification session expired. Please request a new code.');
      return;
    }
    if (isExpired) {
      setErrorMessage('Verification code has expired. Please request a new code.');
      return;
    }
    if (maxAttemptsExceeded) {
      setErrorMessage('Maximum attempts exceeded. Please request a new code.');
      return;
    }

    setLoading(true);
    try {
      if (authPurpose === 'register') {
        await verifyCodeAndLogin(
          email.trim().toLowerCase(),
          code,
          sessionId,
          name.trim(),
          phone.trim(),
          password,
          'register'
        );
      } else {
        await verifyCodeAndLogin(
          email.trim().toLowerCase(),
          code,
          sessionId,
          name.trim(),
          undefined,
          undefined,
          'login'
        );
      }
      setIsAuthOpen(false);
    } catch (err: any) {
      console.error('Verification error:', err);
      const msg = err.message || 'Invalid or expired verification code.';
      setErrorMessage(msg);

      if (typeof err.attemptsRemaining === 'number') {
        setAttemptsRemaining(err.attemptsRemaining);
      }
      if (err.maxAttemptsExceeded) {
        setMaxAttemptsExceeded(true);
        setAttemptsRemaining(0);
      }
      if (err.expired) {
        setIsExpired(true);
      }
      showToast('Verification Failed', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP in Step 4
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setErrorMessage(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const res = await sendVerificationCode(email.trim().toLowerCase(), name.trim(), authPurpose);
      if (res.success && res.sessionId) {
        setSessionId(res.sessionId);
        setExpiresAt(res.expiresAt);
        setSecondsRemaining(Math.max(0, Math.floor((res.expiresAt - Date.now()) / 1000)));
        setResendCooldown(res.cooldownSeconds || 60);
        setOtpDigits(['', '', '', '', '', '']);
        setAttemptsRemaining(5);
        setMaxAttemptsExceeded(false);
        setIsExpired(false);
        setInfoMessage(`A fresh verification code was sent to ${email.trim().toLowerCase()}.`);
        showToast('OTP Resent', `New code sent to ${email.trim().toLowerCase()}`, 'info');
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      console.error('Failed to resend code:', err);
      const msg = err.message || 'Unable to send verification code right now. Please try again.';
      setErrorMessage(msg);
      if (err.cooldownRemaining) {
        setResendCooldown(err.cooldownRemaining);
      }
      showToast('Unable to Resend OTP', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 6-digit OTP input mechanics
  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned && value !== '') return;

    const char = cleaned.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otpDigits[index] !== '') {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      } else if (index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  // Google Sign-In with popup
  const handleGoogleClick = async () => {
    setLoading(true);
    setErrorMessage(null);
    setGooglePopupBlocked(false);
    try {
      await googleLogin();
      setIsAuthOpen(false);
    } catch (e: any) {
      console.error('Google Sign-In error:', e);
      if (e.message && e.message.includes('popup')) {
        setGooglePopupBlocked(true);
      }
      setErrorMessage(e.message || 'Error connecting with Google Sign-In');
    } finally {
      setLoading(false);
    }
  };

  const isFullCodeEntered = otpDigits.join('').length === 6;

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="auth-card"
        className="relative w-full max-w-md bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#222] overflow-hidden my-auto transition-all"
      >
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100 dark:border-[#1e1e1e] flex items-center justify-between bg-slate-50/75 dark:bg-[#161616]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {step === 'email' && 'Welcome to SysTech'}
                {step === 'signin' && 'Sign In'}
                {step === 'signup' && 'Create Your Account'}
                {step === 'verify' && 'Enter Verification Code'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {step === 'email' && 'Enter your email to sign in or create an account'}
                {step === 'signin' && 'Sign in to continue to your account'}
                {step === 'signup' && 'Complete your profile to register'}
                {step === 'verify' && `Code sent to ${email}`}
              </p>
            </div>
          </div>
          <button
            id="auth-close-btn"
            onClick={() => setIsAuthOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-[#222] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            id="auth-error-banner"
            className="mx-5 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{errorMessage}</p>
              {googlePopupBlocked && (
                <p className="mt-1 text-[11px] text-red-500/90">
                  Tip: Popups may be blocked in your browser. Please allow popups or use email sign in below.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Global Info Banner */}
        {infoMessage && !errorMessage && (
          <div
            id="auth-info-banner"
            className="mx-5 mt-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-800 dark:text-cyan-300 text-xs flex items-start gap-2.5"
          >
            <Mail className="w-4 h-4 shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-400" />
            <p className="flex-1 font-medium">{infoMessage}</p>
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-4">
          {/* STEP 1: Enter Email Flow */}
          {step === 'email' && (
            <div className="space-y-4">
              {/* Google Button */}
              <button
                id="google-signin-btn-email"
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-[#2a2a2a] bg-white dark:bg-[#181818] hover:bg-slate-50 dark:hover:bg-[#202020] text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-2.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-2">
                <div className="h-px flex-1 bg-slate-200 dark:bg-[#222]" />
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  or continue with email
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-[#222]" />
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailCheck} className="space-y-4">
                <div>
                  <label
                    htmlFor="auth-email-input"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Email Address <span className="text-cyan-600">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="auth-email-input"
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="name@example.com"
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border ${
                        emailError ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-slate-300 dark:border-[#2a2a2a] focus:border-cyan-500'
                      } bg-slate-50 dark:bg-[#181818] text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-1`}
                    />
                  </div>
                  {emailError && (
                    <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{emailError}</span>
                    </p>
                  )}
                </div>

                <button
                  id="auth-email-continue-btn"
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking account...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 pt-1">
                By continuing, you agree to SysTech Computer Solutions' terms and privacy policy.
              </p>
            </div>
          )}

          {/* STEP 2: Existing Account - Sign In Flow */}
          {step === 'signin' && (
            <div className="space-y-4">
              {/* Active email pill with Change button */}
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#181818] border border-slate-200 dark:border-[#222] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <Mail className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                  <span className="font-semibold text-slate-900 dark:text-white truncate">
                    {email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setErrorMessage(null);
                  }}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline text-[11px] font-bold shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Password Form */}
              <form onSubmit={handlePasswordSignIn} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="signin-password"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Password <span className="text-cyan-600">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#181818] text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="signin-submit-btn"
                  type="submit"
                  disabled={loading || !password}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider: Or verify with OTP */}
              <div className="flex items-center gap-3 my-2">
                <div className="h-px flex-1 bg-slate-200 dark:bg-[#222]" />
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  or sign in without password
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-[#222]" />
              </div>

              {/* Email OTP Verification Button */}
              <button
                id="signin-otp-btn"
                type="button"
                onClick={handleRequestOtp}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#202020] text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Mail className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Sign in with Email OTP</span>
              </button>

              {/* Google Button */}
              <button
                id="google-signin-btn-signin"
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-[#2a2a2a] bg-white dark:bg-[#181818] hover:bg-slate-50 dark:hover:bg-[#202020] text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-2.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          {/* STEP 3: New Account - Sign Up Form */}
          {step === 'signup' && (
            <div className="space-y-4">
              {/* Google Button */}
              <button
                id="google-signin-btn-signup"
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-[#2a2a2a] bg-white dark:bg-[#181818] hover:bg-slate-50 dark:hover:bg-[#202020] text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-2.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="h-px flex-1 bg-slate-200 dark:bg-[#222]" />
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  or register with email
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-[#222]" />
              </div>

              {/* Registration Form with 5 required fields */}
              <form onSubmit={handleRegister} className="space-y-3">
                {/* 1. Full Name */}
                <div>
                  <label
                    htmlFor="signup-fullname"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Full Name <span className="text-cyan-600">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="signup-fullname"
                      type="text"
                      required
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#181818] text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* 2. Mobile Number (10 Numerical Digits Only) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="signup-phone"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Mobile Number <span className="text-cyan-600">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">{phone.length}/10 digits</span>
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="signup-phone"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      required
                      value={phone}
                      onChange={(e) => {
                        const digits = sanitizeMobileDigits(e.target.value);
                        setPhone(digits);
                        if (phoneError) setPhoneError(null);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="9876543210 (10 digits)"
                      className={`w-full pl-10 pr-3.5 py-2 rounded-xl border ${
                        phoneError ? 'border-red-500 ring-1 ring-red-500/20' : 'border-slate-300 dark:border-[#2a2a2a] focus:border-cyan-500'
                      } bg-slate-50 dark:bg-[#181818] text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none`}
                    />
                  </div>
                  {phoneError && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{phoneError}</span>
                    </p>
                  )}
                </div>

                {/* 3. Email Address */}
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Email Address <span className="text-cyan-600">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="name@example.com"
                      className={`w-full pl-10 pr-3.5 py-2 rounded-xl border ${
                        emailError ? 'border-red-500 ring-1 ring-red-500/20' : 'border-slate-300 dark:border-[#2a2a2a] focus:border-cyan-500'
                      } bg-slate-50 dark:bg-[#181818] text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none`}
                    />
                  </div>
                  {emailError && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{emailError}</span>
                    </p>
                  )}
                </div>

                {/* 4. Password with Real-Time Requirements Indicator */}
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Password <span className="text-cyan-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Create a strong password (e.g. SysTech@123)"
                      className={`w-full pl-10 pr-10 py-2 rounded-xl border ${
                        passwordError ? 'border-red-500 ring-1 ring-red-500/20' : 'border-slate-300 dark:border-[#2a2a2a] focus:border-cyan-500'
                      } bg-slate-50 dark:bg-[#181818] text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Real-time Password Complexity Rules Indicator */}
                  <PasswordRequirements password={password} />
                  {passwordError && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{passwordError}</span>
                    </p>
                  )}
                </div>

                {/* 5. Confirm Password */}
                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Confirm Password <span className="text-cyan-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className={`w-full pl-10 pr-10 py-2 rounded-xl border ${
                        confirmPassword && confirmPassword !== password
                          ? 'border-red-500 bg-red-50/10'
                          : 'border-slate-300 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#181818]'
                      } text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-cyan-500`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">Passwords do not match</p>
                  )}
                </div>

                <button
                  id="signup-submit-btn"
                  type="submit"
                  disabled={loading || !name.trim() || phone.length !== 10 || !password || password !== confirmPassword}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Email & Create Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-slate-400">
                  A 6-digit verification code will be sent to your email to confirm ownership.
                </p>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer"
                >
                  Already have an account? <span className="font-bold underline">Sign In</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Email OTP Verification Flow */}
          {step === 'verify' && (
            <div className="space-y-4">
              {/* Sent-to pill with Change button */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#181818] border border-slate-200 dark:border-[#222] text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-600" /> Sent to:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('signin');
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                    className="text-cyan-600 dark:text-cyan-400 hover:underline text-[11px] font-bold cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
                <p className="font-mono text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {email}
                </p>
              </div>

              {/* Countdown timer & attempts */}
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Expires in:</span>
                  <span
                    className={`font-mono font-bold ${
                      secondsRemaining <= 60 ? 'text-red-500 animate-pulse' : 'text-cyan-600 dark:text-cyan-400'
                    }`}
                  >
                    {formatTime(secondsRemaining)}
                  </span>
                </div>

                {attemptsRemaining !== null && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Attempts:</span>
                    <span
                      className={`font-bold ${
                        attemptsRemaining <= 2 ? 'text-red-500 font-mono' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {attemptsRemaining}/5
                    </span>
                  </div>
                )}
              </div>

              {/* 6 Digit Input Boxes */}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-center font-semibold text-xs text-slate-700 dark:text-slate-300 mb-2.5">
                    Enter the 6-digit code
                  </label>
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (inputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={handlePaste}
                        disabled={loading || isExpired || maxAttemptsExceeded}
                        className={`w-9 h-11 sm:w-12 sm:h-13 text-center text-lg sm:text-xl font-bold font-mono rounded-lg sm:rounded-xl border transition-all focus:outline-none ${
                          digit
                            ? 'border-cyan-500 bg-cyan-50/20 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400'
                            : 'border-slate-300 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#181818] text-slate-900 dark:text-white'
                        } ${
                          isExpired || maxAttemptsExceeded
                            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-[#202020]'
                            : 'focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  id="auth-verify-otp-btn"
                  type="submit"
                  disabled={loading || !isFullCodeEntered || isExpired || maxAttemptsExceeded}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying code...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Sign In</span>
                      <Check className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {/* Resend OTP */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-[#222]">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading || resendCooldown > 0}
                    className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                  </button>

                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Check your spam folder if delayed
                  </span>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
