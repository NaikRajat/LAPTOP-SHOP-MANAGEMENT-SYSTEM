import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  X,
  User as UserIcon,
  LogOut,
  Package,
  Wrench,
  Shield,
  Mail,
  Phone,
  Calendar,
  Clock,
  MapPin,
  Save,
  CheckCircle,
  Edit3,
  Lock,
  KeyRound,
  Send,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../services/api.js';
import { Order, RepairTicket } from '../types.js';
import { validateEmail, sanitizeMobileDigits, validateIndianMobile, validateStrongPassword } from '../utils/validation.js';
import { PasswordRequirements } from './PasswordRequirements.js';

export const UserProfileModal: React.FC = () => {
  const {
    isUserProfileOpen,
    setIsUserProfileOpen,
    user,
    logout,
    isAdmin,
    setCurrentView,
    setIsRepairTrackerOpen,
    updateProfile,
    showToast
  } = useApp();

  const [orders, setOrders] = useState<Order[]>([]);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(false);

  // Editable Profile & Address states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [addressLine1, setAddressLine1] = useState(user?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(user?.addressLine2 || '');
  const [city, setCity] = useState(user?.city || 'Kumta');
  const [state, setState] = useState(user?.state || 'Karnataka');
  const [postalCode, setPostalCode] = useState(user?.postalCode || '581343');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Validation errors
  const [profilePhoneError, setProfilePhoneError] = useState<string | null>(null);
  const [profileEmailError, setProfileEmailError] = useState<string | null>(null);

  // Password Management states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAddressLine1(user.addressLine1 || '');
      setAddressLine2(user.addressLine2 || '');
      setCity(user.city || 'Kumta');
      setState(user.state || 'Karnataka');
      setPostalCode(user.postalCode || '581343');
      setProfilePhoneError(null);
      setProfileEmailError(null);
      setPasswordSuccessMsg(null);
      setPasswordErrorMsg(null);
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  }, [user, isUserProfileOpen]);

  useEffect(() => {
    if (isUserProfileOpen && user) {
      setLoading(true);
      Promise.all([
        api.getOrders().catch(() => []),
        api.getRepairs().catch(() => [])
      ]).then(([allOrders, allRepairs]) => {
        const userOrders = allOrders.filter((o: Order) => o.customerEmail === user.email || String(o.userId) === String(user.id));
        const userRepairs = allRepairs.filter((r: RepairTicket) => r.customerPhone === user.phone || (user.name && r.customerName.toLowerCase().includes(user.name.toLowerCase())));
        setOrders(userOrders);
        setRepairs(userRepairs);
        setLoading(false);
      });
    }
  }, [isUserProfileOpen, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfilePhoneError(null);
    setProfileEmailError(null);

    if (!name.trim()) {
      showToast('Validation Error', 'Full Name is required.', 'error');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailVal = validateEmail(cleanEmail);
    if (!emailVal.valid) {
      const err = emailVal.error || 'Please enter a valid email address.';
      setProfileEmailError(err);
      showToast('Validation Error', err, 'error');
      return;
    }

    const cleanPhone = sanitizeMobileDigits(phone);
    if (cleanPhone) {
      const phoneVal = validateIndianMobile(cleanPhone);
      if (!phoneVal.valid) {
        const err = phoneVal.error || 'Please enter a valid 10-digit mobile number.';
        setProfilePhoneError(err);
        showToast('Validation Error', err, 'error');
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim() || 'Kumta',
        state: state.trim() || 'Karnataka',
        postalCode: postalCode.trim() || '581343'
      });
      setIsEditing(false);
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Could not save profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendResetLink = async () => {
    if (!user?.email) return;
    setPasswordLoading(true);
    setPasswordErrorMsg(null);
    setPasswordSuccessMsg(null);

    try {
      const res = await api.forgotPassword(user.email);
      setPasswordSuccessMsg(res.message || `Password reset link sent to ${user.email}. Check your inbox to proceed.`);
      showToast('Password Reset Email Sent', `Link sent to ${user.email}`, 'success');
    } catch (err: any) {
      const msg = err.message || 'Failed to send password reset link. Please try again.';
      setPasswordErrorMsg(msg);
      showToast('Reset Failed', msg, 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMsg(null);
    setPasswordSuccessMsg(null);

    const passVal = validateStrongPassword(newPassword);
    if (!passVal.valid) {
      const err = passVal.error || 'Password must meet all complexity requirements.';
      setPasswordErrorMsg(err);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordErrorMsg('New passwords do not match. Please re-enter.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.changePassword(newPassword, currentPassword || undefined);
      setPasswordSuccessMsg(res.message || 'Password updated successfully!');
      showToast('Password Updated', 'Your account password has been updated securely.', 'success');
      setNewPassword('');
      setConfirmNewPassword('');
      setCurrentPassword('');
      setIsChangingPassword(false);
    } catch (err: any) {
      const msg = err.message || 'Failed to update password. Please verify current password.';
      setPasswordErrorMsg(msg);
      showToast('Password Change Failed', msg, 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!isUserProfileOpen || !user) return null;

  const hasAddress = Boolean(user.address || user.addressLine1 || user.city);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#262626] overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#222] flex items-center justify-between bg-slate-50 dark:bg-[#161616]">
          <div className="flex items-center gap-3">
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
              alt={user.name}
              className="w-12 h-12 rounded-full border-2 border-cyan-500 object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</h3>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  isAdmin
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                }`}>
                  {isAdmin ? 'Store Owner / Admin' : 'Verified Customer'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#888] flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-cyan-500" /> {user.email}
                {user.phone && (
                  <>
                    <span className="text-slate-300 dark:text-[#444]">•</span>
                    <Phone className="w-3.5 h-3.5 text-cyan-500" /> {user.phone}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUserProfileOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#222] text-slate-600 dark:text-[#aaa] hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {isAdmin && (
              <button
                onClick={() => {
                  setCurrentView('admin');
                  setIsUserProfileOpen(false);
                }}
                className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 text-left transition-all cursor-pointer"
              >
                <Shield className="w-4 h-4 text-cyan-500 mb-1" />
                <p className="text-xs font-bold text-slate-900 dark:text-white">Admin Dashboard</p>
                <p className="text-[10px] text-slate-500 dark:text-[#777]">Manage inventory & sales</p>
              </button>
            )}

            <button
              onClick={() => {
                setIsRepairTrackerOpen(true);
                setIsUserProfileOpen(false);
              }}
              className="p-3 rounded-xl border border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#161616] hover:border-slate-300 dark:hover:border-[#333] text-left transition-all cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-cyan-500 mb-1" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">Repair Tracker</p>
              <p className="text-[10px] text-slate-500 dark:text-[#777]">Live bench diagnostic status</p>
            </button>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#161616] text-left">
              <Calendar className="w-4 h-4 text-emerald-500 mb-1" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">Customer Since</p>
              <p className="text-[10px] text-slate-500 dark:text-[#777]">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Member'}
              </p>
            </div>
          </div>

          {/* Profile & Delivery Address Section */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#262626] bg-slate-50/50 dark:bg-[#161616]/50 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#222] pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Profile & Delivery Address
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-medium flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {isEditing ? 'Cancel Editing' : 'Edit Details'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-[#aaa] font-bold mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white text-xs outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-700 dark:text-[#aaa] font-bold">Mobile Number *</label>
                      <span className="text-[10px] text-slate-400 font-mono">{phone.length}/10 digits</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      value={phone}
                      onChange={e => {
                        const digits = sanitizeMobileDigits(e.target.value);
                        setPhone(digits);
                        if (profilePhoneError) setProfilePhoneError(null);
                      }}
                      placeholder="9876543210 (10 digits)"
                      className={`w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0a0a0a] border ${
                        profilePhoneError ? 'border-red-500 ring-1 ring-red-500/20' : 'border-slate-300 dark:border-[#333]'
                      } text-slate-900 dark:text-white text-xs outline-none focus:border-cyan-500`}
                    />
                    {profilePhoneError && (
                      <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{profilePhoneError}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-[#aaa] font-bold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (profileEmailError) setProfileEmailError(null);
                    }}
                    placeholder="email@mail.com"
                    className={`w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0a0a0a] border ${
                      profileEmailError ? 'border-red-500 ring-1 ring-red-500/20' : 'border-slate-300 dark:border-[#333]'
                    } text-slate-900 dark:text-white text-xs outline-none focus:border-cyan-500`}
                  />
                  {profileEmailError ? (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{profileEmailError}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">Used for order confirmations and customer records.</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-[#222]">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-2">Delivery Address (Saved for Checkout)</h5>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-slate-600 dark:text-[#999] text-[11px] mb-1">House / Flat / Building No. *</label>
                      <input
                        type="text"
                        value={addressLine1}
                        onChange={e => setAddressLine1(e.target.value)}
                        placeholder="e.g. Flat 302, Green Meadows"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white text-xs outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-[#999] text-[11px] mb-1">Street / Area / Landmark *</label>
                      <input
                        type="text"
                        value={addressLine2}
                        onChange={e => setAddressLine2(e.target.value)}
                        placeholder="e.g. Near Old Bus Stand, Main Road"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white text-xs outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-600 dark:text-[#999] text-[11px] mb-1">City *</label>
                        <input
                          type="text"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          placeholder="Kumta"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white text-xs outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-[#999] text-[11px] mb-1">State *</label>
                        <input
                          type="text"
                          value={state}
                          onChange={e => setState(e.target.value)}
                          placeholder="Karnataka"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white text-xs outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-[#999] text-[11px] mb-1">PIN Code *</label>
                        <input
                          type="text"
                          value={postalCode}
                          onChange={e => setPostalCode(e.target.value)}
                          placeholder="581343"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white text-xs outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Saving to Database...' : 'Save Profile Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-[#222] text-slate-700 dark:text-[#bbb] text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600 dark:text-[#aaa]">
                  <div>
                    <span className="block text-[11px] text-slate-400">Full Name</span>
                    <strong className="text-slate-900 dark:text-white font-medium">{user.name || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Mobile Number</span>
                    <strong className="text-slate-900 dark:text-white font-medium">{user.phone || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Email Address</span>
                    <strong className="text-slate-900 dark:text-white font-medium truncate block">{user.email || 'Not provided'}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-[#222]">
                  <span className="block text-[11px] text-slate-400 mb-0.5">Saved Delivery Address</span>
                  {hasAddress ? (
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                      {user.addressLine1 && <span>{user.addressLine1}, </span>}
                      {user.addressLine2 && <span>{user.addressLine2}, </span>}
                      <span>{user.city || 'Kumta'}, </span>
                      <span>{user.state || 'Karnataka'} - </span>
                      <span className="font-mono">{user.postalCode || '581343'}</span>
                    </p>
                  ) : (
                    <p className="text-slate-400 italic">No delivery address saved yet. Click "Edit Details" or enter address during checkout.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Security & Password Management Section (Exclusively accessible to logged-in user in Profile) */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#262626] bg-slate-50/50 dark:bg-[#161616]/50 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#222] pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Security & Password Management
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Firebase Auth</span>
            </div>

            {/* Success and Error Feedback Messages */}
            {passwordSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                <span className="font-medium">{passwordSuccessMsg}</span>
              </div>
            )}
            {passwordErrorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span className="font-medium">{passwordErrorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Option A: Send Password Reset Link */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#222] bg-white dark:bg-[#121212] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs mb-1">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Send Password Reset Link</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-[#888] mb-3 leading-relaxed">
                    Dispatches an official Firebase password reset email to <strong className="text-slate-700 dark:text-slate-300 font-medium">{user.email}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={passwordLoading}
                  onClick={handleSendResetLink}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#202020] dark:hover:bg-[#282828] text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{passwordLoading ? 'Sending link...' : 'Email Reset Link'}</span>
                </button>
              </div>

              {/* Option B: Direct Password Change */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#222] bg-white dark:bg-[#121212] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs mb-1">
                    <Lock className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Change Password Directly</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-[#888] mb-3 leading-relaxed">
                    Set a new strong password immediately with real-time complexity validation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(!isChangingPassword);
                    setPasswordErrorMsg(null);
                    setPasswordSuccessMsg(null);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isChangingPassword ? 'Cancel Form' : 'Change Password'}</span>
                </button>
              </div>
            </div>

            {/* Direct Password Change Form (When Opened) */}
            {isChangingPassword && (
              <form onSubmit={handleChangePasswordSubmit} className="pt-3 border-t border-slate-200 dark:border-[#222] space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-[#aaa] font-bold mb-1">
                    Current Password (Optional verification)
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password if previously set"
                      className="w-full pl-3 pr-10 py-2 rounded-xl bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white text-xs outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-[#aaa] font-bold mb-1">
                    New Password * <span className="text-[11px] font-normal text-slate-400">(e.g. SysTech@123)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={e => {
                        setNewPassword(e.target.value);
                        if (passwordErrorMsg) setPasswordErrorMsg(null);
                      }}
                      placeholder="Enter new strong password"
                      className="w-full pl-3 pr-10 py-2 rounded-xl bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white text-xs outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {/* Real-time Password Complexity Rules Indicator */}
                  <PasswordRequirements password={newPassword} />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-[#aaa] font-bold mb-1">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      required
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className={`w-full pl-3 pr-10 py-2 rounded-xl bg-white dark:bg-[#0a0a0a] border ${
                        confirmNewPassword && confirmNewPassword !== newPassword ? 'border-red-500' : 'border-slate-300 dark:border-[#333]'
                      } text-slate-900 dark:text-white text-xs outline-none focus:border-cyan-500`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirmNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {confirmNewPassword && confirmNewPassword !== newPassword && (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">Passwords do not match</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={passwordLoading || !newPassword || newPassword !== confirmNewPassword}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{passwordLoading ? 'Updating Password...' : 'Save New Password'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setNewPassword('');
                      setConfirmNewPassword('');
                      setCurrentPassword('');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-[#222] text-slate-700 dark:text-[#bbb] text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Orders Section */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-cyan-500" /> My Orders & Store Pickups
            </h4>

            {orders.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-[#262626] text-center text-xs text-slate-500 dark:text-[#777]">
                No recent orders found for this account.
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map(order => (
                  <div
                    key={order.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#161616] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">#{order.orderNumber}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-[#888] mt-0.5">
                        {order.items?.length || 1} item(s) • {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                      {order.address && (
                        <p className="text-[10px] text-slate-400 truncate max-w-sm mt-0.5">
                          Delivery: {order.address}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                        ₹{order.total.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {order.paymentMethod === 'upi_online' ? 'UPI Online' : 'Pay at Store'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Repair Tickets */}
          {repairs.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-cyan-500" /> Active Repair Tickets
              </h4>
              <div className="space-y-2">
                {repairs.map(repair => (
                  <div
                    key={repair.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#161616] flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{repair.ticketNumber}</span>
                      <p className="text-[11px] text-slate-600 dark:text-[#aaa] mt-0.5">{repair.deviceModel}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {repair.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Unmistakable Log Out Button */}
        <div className="p-4 border-t border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#161616] flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500 dark:text-[#777] truncate max-w-full">
            Logged in as <strong className="text-slate-700 dark:text-slate-300">{user.email}</strong>
          </div>

          <button
            onClick={() => {
              logout();
              setIsUserProfileOpen(false);
            }}
            className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs cursor-pointer ml-auto"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      </div>
    </div>
  );
};
