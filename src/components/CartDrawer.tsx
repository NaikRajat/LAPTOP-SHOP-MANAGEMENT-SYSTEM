import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { api, getValidAuthToken } from '../services/api.js';
import { Product } from '../types.js';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Timer,
  ArrowLeft,
  CheckCircle,
  ShieldCheck,
  Store,
  Truck,
  Tag,
  Lock,
  Phone,
  Info,
  Layers,
  ChevronRight,
  CreditCard,
  QrCode,
  MapPin,
  AlertCircle
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    toggleCartAddon,
    appliedPromo,
    applyPromo,
    removePromo,
    clearCart,
    fulfillment,
    setFulfillment,
    cartSubtotal,
    protectionFee,
    deliveryFee,
    estimatedTax,
    cartTotal,
    totalSavings,
    user,
    token,
    updateProfile,
    setIsRepairModalOpen,
    addToCart,
    showToast,
    openAuthModal
  } = useApp();

  // Timer countdown: 14 min 48 sec
  const [secondsRemaining, setSecondsRemaining] = useState(14 * 60 + 48);
  const [promoInput, setPromoInput] = useState('SYSTECH');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Checkout modal state
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isValidatingAuth, setIsValidatingAuth] = useState(false);
  const [pendingCheckoutAfterAuth, setPendingCheckoutAfterAuth] = useState(false);
  const [karnatakaCourierNotice, setKarnatakaCourierNotice] = useState(false);

  // Form states with saved profile prefill
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [houseBuilding, setHouseBuilding] = useState(user?.addressLine1 || '');
  const [streetArea, setStreetArea] = useState(user?.addressLine2 || '');
  const [city, setCity] = useState(user?.city || 'Kumta');
  const [state, setState] = useState(user?.state || 'Karnataka');
  const [pincode, setPincode] = useState(user?.postalCode || '581343');

  // Detect local development environment for demo safety
  const isLocalDev = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.localhost')
  );

  const [paymentMethod, setPaymentMethod] = useState<'store_pickup_cash' | 'upi_online'>(() =>
    isLocalDev ? 'store_pickup_cash' : 'upi_online'
  );
  const [upiLocalNotice, setUpiLocalNotice] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  const handleSelectUpi = () => {
    if (isLocalDev) {
      setUpiLocalNotice(true);
      showToast('Payment Notice', 'For now, only Pay at Store option is available.', 'info');
      setPaymentMethod('store_pickup_cash');
      return;
    }
    setPaymentMethod('upi_online');
  };

  // Sync user details and saved address when user changes or logs in
  useEffect(() => {
    if (user) {
      if (user.name) setCustomerName(user.name);
      if (user.email) setCustomerEmail(user.email);
      if (user.phone) setCustomerPhone(user.phone);
      if (user.addressLine1) setHouseBuilding(user.addressLine1);
      if (user.addressLine2) setStreetArea(user.addressLine2);
      if (user.city) setCity(user.city);
      if (user.state) setState(user.state);
      if (user.postalCode) setPincode(user.postalCode);
    }
  }, [user]);

  // If user signed in after clicking "Proceed to Secure Checkout", automatically continue to checkout with saved info
  useEffect(() => {
    if (pendingCheckoutAfterAuth && user) {
      setPendingCheckoutAfterAuth(false);
      setCustomerName(user.name || '');
      setCustomerEmail(user.email || '');
      if (user.phone) setCustomerPhone(user.phone);
      if (user.addressLine1) setHouseBuilding(user.addressLine1);
      if (user.addressLine2) setStreetArea(user.addressLine2);
      if (user.city) setCity(user.city);
      if (user.state) setState(user.state);
      if (user.postalCode) setPincode(user.postalCode);
      setIsCheckingOut(true);
    }
  }, [user, pendingCheckoutAfterAuth]);

  // Keep fulfillment as pickup since Karnataka Express is temporarily disabled
  useEffect(() => {
    if (fulfillment !== 'pickup') {
      setFulfillment('pickup');
    }
  }, [fulfillment, setFulfillment]);

  // Countdown effect
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s} min`;
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setIsApplyingPromo(true);
    await applyPromo(promoInput);
    setIsApplyingPromo(false);
  };

  // Secure checkout button auth check
  const isUserAuthenticated = Boolean(user || (token && token !== 'undefined' && token !== 'null'));

  const handleProceedToCheckout = async () => {
    if (!isUserAuthenticated) {
      setPendingCheckoutAfterAuth(true);
      showToast('Sign In Required', 'Please sign in or create an account to proceed to checkout.', 'info');
      openAuthModal('login');
      return;
    }

    setIsValidatingAuth(true);
    try {
      // Validate session with the backend
      const res = await api.getCurrentUser();
      if (res && res.user) {
        setCustomerName(res.user.name || user?.name || '');
        setCustomerEmail(res.user.email || user?.email || '');
        if (res.user.phone) setCustomerPhone(res.user.phone);
        setIsCheckingOut(true);
      } else {
        setPendingCheckoutAfterAuth(true);
        showToast('Session Expired', 'Please sign in to proceed to checkout.', 'info');
        openAuthModal('login');
      }
    } catch (err: any) {
      setPendingCheckoutAfterAuth(true);
      showToast('Sign In Required', 'Please sign in to proceed to checkout.', 'info');
      openAuthModal('login');
    } finally {
      setIsValidatingAuth(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verify that the Firebase Authentication user is still authenticated & refresh token before checkout
    let freshToken: string | null = null;
    try {
      freshToken = await getValidAuthToken(true);
    } catch (tokErr) {
      console.warn('Token refresh during checkout:', tokErr);
    }

    if (!freshToken && !isUserAuthenticated) {
      showToast('Authentication Required', 'Please sign in before completing your order.', 'error');
      setIsCheckingOut(false);
      setPendingCheckoutAfterAuth(true);
      openAuthModal('login');
      return;
    }

    if (!customerName.trim()) {
      showToast('Missing Details', 'Please provide your Full Name', 'error');
      return;
    }
    if (!customerPhone.trim()) {
      showToast('Missing Details', 'Please provide your Mobile / WhatsApp Number', 'error');
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      showToast('Missing Details', 'Please provide a valid Email Address', 'error');
      return;
    }
    if (!houseBuilding.trim() || !streetArea.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      showToast('Incomplete Address', 'Please fill in all delivery address fields (House/Building, Street/Area, City, State, and PIN Code)', 'error');
      return;
    }

    if (isLocalDev && paymentMethod === 'upi_online') {
      showToast('Payment Notice', 'For now, only Pay at Store option is available.', 'info');
      setPaymentMethod('store_pickup_cash');
      setUpiLocalNotice(true);
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const fullDeliveryAddress = `${houseBuilding.trim()}, ${streetArea.trim()}, ${city.trim()}, ${state.trim()} - ${pincode.trim()}`;
      const orderData = {
        customerName: customerName.trim(),
        customerEmail: user?.email || customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        address: fullDeliveryAddress,
        addressLine1: houseBuilding.trim(),
        addressLine2: streetArea.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: pincode.trim(),
        pincode: pincode.trim(),
        fulfillment: 'pickup' as const,
        items: cart.map(item => ({
          productId: item.product.id,
          title: item.product.title,
          sku: item.product.sku,
          price: item.product.price,
          quantity: item.quantity,
          image: item.product.image,
          extendedCare: item.extendedCare,
          dataMigration: item.dataMigration
        })),
        subtotal: cartSubtotal,
        protectionFee,
        deliveryFee: 0,
        tax: estimatedTax,
        discount: appliedPromo ? appliedPromo.discount : 0,
        promoCodeUsed: appliedPromo?.code,
        total: cartTotal,
        paymentMethod
      };

      const newOrder = await api.createOrder(orderData);

      // Persist / update the latest address and contact info to user profile in PostgreSQL
      try {
        await updateProfile({
          name: customerName.trim(),
          email: customerEmail.trim().toLowerCase(),
          phone: customerPhone.trim(),
          address: fullDeliveryAddress,
          addressLine1: houseBuilding.trim(),
          addressLine2: streetArea.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: pincode.trim()
        });
      } catch (profileErr) {
        console.warn('Profile sync during order placement:', profileErr);
      }

      setCompletedOrder(newOrder);
      clearCart();
      showToast('Order Placed Successfully!', `Order ${newOrder.orderNumber} is confirmed.`, 'success');
    } catch (e: any) {
      showToast('Order Error', e.message || 'Failed to place order', 'error');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col">
        {/* Interactive Top Action & Status Bar */}
        <div className="w-full bg-[#0a0a0a] border-b border-[#1a1a1a] py-2.5 sm:py-3">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs">
            <nav className="flex items-center gap-1.5 sm:gap-2 text-[#777]">
              <button
                onClick={() => setIsCartOpen(false)}
                className="hover:text-cyan-400 flex items-center gap-1 font-medium transition-colors"
              >
                Catalog
              </button>
              <span>/</span>
              <span className="text-white font-bold">Shopping Cart & Order</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded bg-[#121212] border border-[#222] text-[11px] sm:text-xs">
                <Timer className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
                <span className="text-[#777] hidden xs:inline">Items held:</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {formatTimer(secondsRemaining)}
                </span>
              </div>

              <button
                onClick={() => setIsCartOpen(false)}
                className="font-mono text-xs text-cyan-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Cart Content Area */}
        <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 w-full flex-1">
          {/* Cart Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between pb-4 sm:pb-6 border-b border-[#1a1a1a] gap-3 mb-6 sm:mb-8">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-serif italic tracking-tight text-white">
                  Your Cart & Service Order
                </h1>
                <span className="px-2.5 py-0.5 rounded bg-[#161616] text-cyan-400 border border-[#262626] font-mono font-bold text-xs">
                  {cart.length} Hardware Units
                </span>
              </div>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="py-20 text-center bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-8">
              <Store className="w-16 h-16 text-[#333] mx-auto mb-4" />
              <h2 className="text-xl font-serif italic text-white">Your cart is empty</h2>
              <p className="text-xs text-[#777] max-w-sm mx-auto mt-2 mb-6">
                Explore our catalog of certified refurbished ThinkPads, brand-new MacBooks, and high-performance accessories.
              </p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="px-6 py-2.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
              >
                Browse Showroom Laptops
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT: 8 Columns Cart Items */}
              <div className="lg:col-span-8 space-y-6">
                {cart.map((item, idx) => {
                  const prod = item.product;
                  const isRefurb = prod.condition === 'refurbished';
                  const savings = prod.originalPrice && prod.originalPrice > prod.price
                    ? prod.originalPrice - prod.price
                    : 0;

                  return (
                    <div
                      key={`${prod.id}-${idx}`}
                      className="p-4 sm:p-6 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] shadow-sm hover:border-[#2a2a2a] transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
                        {/* Thumbnail Aspect Box */}
                        <div className="relative w-full sm:w-44 h-40 sm:h-44 rounded-lg bg-[#080808] border border-[#1e1e1e] flex items-center justify-center p-2 shrink-0 overflow-hidden">
                          <img
                            src={prod.image}
                            alt={prod.title}
                            className="w-full h-full object-contain"
                          />
                          <span
                            className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border ${
                              isRefurb
                                ? 'bg-[#151515] text-emerald-400 border-emerald-900/50'
                                : 'bg-[#151515] text-cyan-400 border-cyan-900/50'
                            }`}
                          >
                            {isRefurb ? 'Grade A+' : 'Brand New'}
                          </span>
                        </div>

                        {/* Specs & Controls */}
                        <div className="flex flex-col flex-1 justify-between h-full gap-3 min-w-0 w-full">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap text-xs text-[#666] font-mono">
                                <span>SKU: {prod.sku}</span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 font-sans text-emerald-400 font-semibold">
                                  {isRefurb ? '🔋 98% Battery Health' : '🔒 Factory Sealed'}
                                </span>
                              </div>

                              <h2 className="text-lg sm:text-xl font-serif italic text-white pt-1">
                                {prod.title}
                              </h2>
                              <p className="text-xs text-[#777] mt-0.5 leading-relaxed">
                                {prod.description || prod.specs?.cpu || 'Core performance workstation'}
                              </p>
                            </div>

                            {/* Price Tier */}
                            <div className="text-left sm:text-right shrink-0">
                              <div className="text-xl sm:text-2xl font-serif italic text-cyan-400">
                                ₹{prod.price.toLocaleString('en-IN')}
                              </div>
                              {prod.originalPrice && (
                                <div className="text-xs text-[#555] line-through font-mono">
                                  ₹{prod.originalPrice.toLocaleString('en-IN')} Mkt
                                </div>
                              )}
                              {savings > 0 && (
                                <div className="text-[11px] font-mono font-bold text-emerald-400">
                                  Save ₹{savings.toLocaleString('en-IN')}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Tech Spec Chips Row */}
                          {prod.specs && (
                            <div className="flex flex-wrap gap-1.5 py-1">
                              {prod.specs.cpu && (
                                <span className="px-2 py-0.5 rounded bg-[#151515] border border-[#222] font-mono text-[10px] text-[#888]">
                                  CPU: {prod.specs.cpu.split('(')[0].substring(0, 16)}
                                </span>
                              )}
                              {prod.specs.ram && (
                                <span className="px-2 py-0.5 rounded bg-[#151515] border border-[#222] font-mono text-[10px] text-[#888]">
                                  RAM: {prod.specs.ram.split(' ')[0]}
                                </span>
                              )}
                              {prod.specs.storage && (
                                <span className="px-2 py-0.5 rounded bg-[#151515] border border-[#222] font-mono text-[10px] text-[#888]">
                                  SSD: {prod.specs.storage.split(' ')[0]}
                                </span>
                              )}
                              {prod.specs.display && (
                                <span className="px-2 py-0.5 rounded bg-[#151515] border border-[#222] font-mono text-[10px] text-[#888]">
                                  DISP: {prod.specs.display.split('(')[0].substring(0, 12)}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Included Benefit Banner */}
                          <div className="p-2.5 rounded-lg bg-[#111] border border-[#1e1e1e] flex items-center gap-2 text-xs">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-[#888]">
                              <strong className="text-white">Included:</strong>{' '}
                              {isRefurb
                                ? '1-Yr SysTech Certified Store Warranty & 40-Point Diagnostic Check (Free)'
                                : 'Factory Sealed: Full AppleCare / OEM Eligibility + SysTech Setup'}
                            </span>
                          </div>

                          {/* Controls Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-3">
                              <div className="inline-flex items-center rounded-md bg-[#141414] p-1 border border-[#262626]">
                                <button
                                  onClick={() => updateQuantity(prod.id, item.quantity - 1)}
                                  className="w-6 h-6 rounded bg-[#1c1c1c] text-[#ccc] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                  aria-label="Decrease"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-8 text-center font-mono text-xs font-bold text-white">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(prod.id, item.quantity + 1)}
                                  className="w-6 h-6 rounded bg-[#1c1c1c] text-[#ccc] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                  aria-label="Increase"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <span className="text-[11px] text-[#555] font-mono">
                                {prod.stock} unit(s) in lab
                              </span>
                            </div>

                            <div className="flex items-center gap-3 ml-auto sm:ml-0">
                              <button
                                onClick={() => removeFromCart(prod.id)}
                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Add-on 1: Extended Care Toggle */}
                      <div className="p-3 rounded-lg bg-[#111] border border-[#1e1e1e] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs">
                        <label className="flex items-start sm:items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!item.extendedCare}
                            onChange={() => toggleCartAddon(prod.id, 'extendedCare')}
                            className="w-4 h-4 rounded text-cyan-600 accent-cyan-500 cursor-pointer mt-0.5 sm:mt-0"
                          />
                          <div>
                            <span className="font-semibold text-white">
                              SysTech Extended Care & Accidental Damage
                            </span>
                            <p className="text-[11px] text-[#777]">
                              Covers spills, drops, display panel stress, and power surge protection.
                            </p>
                          </div>
                        </label>
                        <span className="font-mono text-xs font-bold text-white shrink-0 pl-6 sm:pl-0">
                          + ₹6,499.00 <span className="text-[#666] font-normal">/ 2 Yrs</span>
                        </span>
                      </div>

                      {/* Add-on 2: Free Data Migration */}
                      <div className="p-3 rounded-lg bg-[#111] border border-[#1e1e1e] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs">
                        <label className="flex items-start sm:items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!item.dataMigration}
                            onChange={() => toggleCartAddon(prod.id, 'dataMigration')}
                            className="w-4 h-4 rounded text-cyan-600 accent-cyan-500 cursor-pointer mt-0.5 sm:mt-0"
                          />
                          <div>
                            <span className="font-semibold text-white">
                              Complimentary Bench OS Setup & Data Migration
                            </span>
                            <p className="text-[11px] text-[#777]">
                              Clean driver initialization, bloatware cleanup, and files transfer from your previous machine.
                            </p>
                          </div>
                        </label>
                        <span className="font-mono text-xs font-bold text-emerald-400 shrink-0 pl-6 sm:pl-0">
                          FREE INCLUDED
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT: 4 Columns Sticky Order Summary */}
              <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
                {/* Fulfillment Selection Card */}
                <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] shadow-sm space-y-3">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#666]">
                    Select Delivery or Pickup
                  </span>

                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#111] border border-[#222]">
                    <button
                      type="button"
                      onClick={() => setFulfillment('pickup')}
                      className={`py-2 px-2 rounded-md text-center font-medium text-xs transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        fulfillment === 'pickup'
                          ? 'bg-[#181818] border border-cyan-500/30 text-cyan-400 font-bold'
                          : 'text-[#777] hover:text-[#bbb]'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Store className="w-3.5 h-3.5" /> Store Pickup
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        showToast('Delivery Option', 'Karnataka Express Courier Dispatch will be available soon.', 'info');
                        setKarnatakaCourierNotice(true);
                      }}
                      className="py-2 px-2 rounded-md text-center font-medium text-xs transition-all flex flex-col items-center justify-center gap-0.5 bg-[#0e0e0e] border border-dashed border-[#262626] text-[#666] opacity-60 hover:opacity-80 cursor-not-allowed select-none"
                      title="Karnataka Express Courier Dispatch will be available soon"
                    >
                      <span className="flex items-center gap-1 line-through text-[#666]">
                        <Truck className="w-3.5 h-3.5 text-[#555]" /> Karnataka Express
                      </span>
                      <span className="text-[9px] text-amber-500/90 font-mono tracking-wider uppercase font-semibold">
                        Courier Dispatch (Unavailable)
                      </span>
                    </button>
                  </div>

                  {karnatakaCourierNotice && (
                    <div className="p-2.5 rounded-lg bg-amber-950/25 border border-amber-800/40 text-[11px] text-amber-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        Karnataka Express Courier Dispatch will be available soon.
                      </span>
                      <button
                        type="button"
                        onClick={() => setKarnatakaCourierNotice(false)}
                        className="text-amber-400 hover:text-amber-200 p-0.5 cursor-pointer"
                        aria-label="Close notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Mode Details */}
                  <div className="p-3 rounded-lg bg-[#111] border border-[#1e1e1e] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white flex items-center gap-1">
                        📍 Kumta Tech Bench
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">FREE</span>
                    </div>
                    <p className="text-[#777] text-[11px]">
                      Kumta, Uttara Kannada, Karnataka - 581343 • Open until 8 PM
                    </p>
                  </div>
                </div>

                {/* Calculation Card */}
                <div className="p-5 sm:p-6 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] shadow-sm space-y-4">
                  <h2 className="text-lg font-serif italic text-white">
                    Order Summary
                  </h2>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-[#888]">
                      <span>Hardware Subtotal ({cart.length} items)</span>
                      <span className="font-mono font-semibold text-white">
                        ₹{cartSubtotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {protectionFee > 0 && (
                      <div className="flex justify-between text-[#888]">
                        <span>2-Yr Accidental Care Plan</span>
                        <span className="font-mono font-semibold text-white">
                          ₹{protectionFee.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-[#888]">
                      <span>Estimated GST / Taxes (18%)</span>
                      <span className="font-mono text-white">
                        ₹{estimatedTax.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Promo row */}
                    {appliedPromo && (
                      <div className="flex items-center justify-between text-emerald-400 bg-[#121212] border border-emerald-900/40 px-3 py-1.5 rounded-lg font-medium">
                        <span className="flex items-center gap-1.5 text-xs font-mono">
                          <Tag className="w-3.5 h-3.5" /> Code: {appliedPromo.code}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">
                            -₹{appliedPromo.discount.toLocaleString('en-IN')}
                          </span>
                          <button
                            onClick={removePromo}
                            className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Promo Input Box */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={e => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="Promo code (SYSTECH)"
                      className="flex-1 px-3 py-2 text-xs bg-[#080808] border border-[#222] rounded-md text-white font-mono uppercase focus:border-cyan-500 outline-none placeholder-[#555]"
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={isApplyingPromo}
                      className="px-4 py-2 rounded-md bg-[#181818] border border-[#2a2a2a] hover:bg-[#222] text-white font-mono text-xs transition-colors cursor-pointer"
                    >
                      {isApplyingPromo ? 'Checking...' : appliedPromo ? 'Re-Apply' : 'Apply'}
                    </button>
                  </div>

                  <div className="h-px bg-[#1a1a1a]"></div>

                  {/* Total Calculation */}
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-lg font-serif italic text-white">
                        Total Due
                      </span>
                      <p className="text-[11px] text-[#555]">Ready for Kumta pickup today</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl sm:text-3xl font-serif italic text-cyan-400">
                        ₹{cartTotal.toLocaleString('en-IN')}
                      </div>
                      {totalSavings > 0 && (
                        <span className="text-[11px] font-mono text-emerald-400">
                          You saved ₹{totalSavings.toLocaleString('en-IN')} on this order
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Proceed to Checkout CTA */}
                  <button
                    onClick={handleProceedToCheckout}
                    disabled={isValidatingAuth}
                    className="w-full py-3.5 px-4 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:bg-[#222] disabled:text-[#555] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-cyan-950/40 transition-all cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    {isValidatingAuth ? 'Verifying Session...' : 'Proceed to Secure Checkout'}
                  </button>

                  {/* Direct Technician Hotline */}
                  <div className="p-3 rounded-lg bg-[#111] border border-[#1e1e1e] flex items-center gap-3 text-xs">
                    <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="font-semibold text-white">
                        Need help before buying?
                      </span>
                      <p className="text-[#777]">
                        Speak with Kumta tech:{' '}
                        <a href="tel:+919448155198" className="font-mono font-bold text-cyan-400 underline">
                          +91 94481 55198
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Checkout Modal */}
      {isCheckingOut && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#0d0d0d] rounded-xl shadow-2xl border border-[#1a1a1a] overflow-hidden my-auto text-white">
            {!isUserAuthenticated ? (
              <div className="p-6 sm:p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-serif italic text-white">
                  Authentication Required
                </h3>
                <p className="text-xs text-[#777]">
                  Please sign in or create an account to complete your order.
                </p>
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => {
                      setIsCheckingOut(false);
                      setPendingCheckoutAfterAuth(true);
                      openAuthModal('login');
                    }}
                    className="w-full py-3 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Sign In / Register
                  </button>
                  <button
                    onClick={() => setIsCheckingOut(false)}
                    className="py-3 px-4 rounded-md bg-[#161616] border border-[#2a2a2a] text-[#aaa] hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : completedOrder ? (
              <div className="p-6 sm:p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-serif italic text-white">
                  Order Confirmed!
                </h3>
                <p className="text-xs text-[#777]">
                  Your order has been allocated to the Kumta Tech Bench.
                </p>

                <div className="p-4 rounded-lg bg-[#121212] font-mono text-xs text-left space-y-2 border border-[#222]">
                  <div className="flex justify-between">
                    <span className="text-[#666]">Order Ref:</span>
                    <strong className="text-cyan-400">{completedOrder.orderNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666]">Customer:</span>
                    <span>{completedOrder.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666]">Contact:</span>
                    <span>{completedOrder.customerPhone}</span>
                  </div>
                  {completedOrder.address && (
                    <div className="flex justify-between">
                      <span className="text-[#666]">Delivery:</span>
                      <span className="text-right truncate max-w-[220px]">{completedOrder.address}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#666]">Payment Method:</span>
                    <span className="text-cyan-400 font-bold">
                      {completedOrder.paymentMethod === 'upi_online' ? 'UPI' : 'Pay at Store'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#222] pt-1.5">
                    <span className="text-[#666]">Total Due:</span>
                    <strong className="text-white">
                      ₹{completedOrder.total.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => {
                      setCompletedOrder(null);
                      setIsCheckingOut(false);
                      setIsCartOpen(false);
                    }}
                    className="w-full py-3 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Done & Return to Store
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
                  <div>
                    <h3 className="text-lg font-serif italic text-white">
                      Complete Your Order
                    </h3>
                    <p className="text-xs text-[#777]">Kumta Bench Pickup & Verification</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCheckingOut(false)}
                    className="w-8 h-8 rounded-full bg-[#181818] border border-[#262626] flex items-center justify-center text-[#777] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#aaa] font-medium mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#080808] border border-[#222] text-xs text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#aaa] font-medium mb-1">Mobile / WhatsApp Number *</label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="+91 1234567890"
                        className="w-full px-3.5 py-2.5 rounded-md bg-[#080808] border border-[#222] text-xs text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#aaa] font-medium mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={e => setCustomerEmail(e.target.value)}
                        placeholder="email@mail.com"
                        className="w-full px-3.5 py-2.5 rounded-md bg-[#080808] border border-[#222] text-xs text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                      />
                    </div>
                  </div>

                  {/* Delivery Address Section (House/Building, Street/Area, City, State, PIN Code) */}
                  <div className="p-3.5 rounded-lg bg-[#111] border border-[#222] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Delivery Address *
                      </span>
                      {user?.addressLine1 && (
                        <span className="text-[10px] text-cyan-400 font-medium">Prefilled from saved profile</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[#888] text-[11px] mb-1">House / Building *</label>
                        <input
                          type="text"
                          required
                          value={houseBuilding}
                          onChange={e => setHouseBuilding(e.target.value)}
                          placeholder="Flat / House / Building No."
                          className="w-full px-3 py-2 rounded-md bg-[#080808] border border-[#262626] text-xs text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                        />
                      </div>

                      <div>
                        <label className="block text-[#888] text-[11px] mb-1">Street / Area *</label>
                        <input
                          type="text"
                          required
                          value={streetArea}
                          onChange={e => setStreetArea(e.target.value)}
                          placeholder="Street / Area / Landmark"
                          className="w-full px-3 py-2 rounded-md bg-[#080808] border border-[#262626] text-xs text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[#888] text-[11px] mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          placeholder="Kumta"
                          className="w-full px-3 py-2 rounded-md bg-[#080808] border border-[#262626] text-xs text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                        />
                      </div>

                      <div>
                        <label className="block text-[#888] text-[11px] mb-1">State *</label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={e => setState(e.target.value)}
                          placeholder="Karnataka"
                          className="w-full px-3 py-2 rounded-md bg-[#080808] border border-[#262626] text-xs text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                        />
                      </div>

                      <div>
                        <label className="block text-[#888] text-[11px] mb-1">PIN Code *</label>
                        <input
                          type="text"
                          required
                          value={pincode}
                          onChange={e => setPincode(e.target.value)}
                          placeholder="581343"
                          className="w-full px-3 py-2 rounded-md bg-[#080808] border border-[#262626] text-xs text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-[#666]">This address will be automatically saved to your profile for future orders.</p>
                  </div>

                  <div>
                    <label className="block text-[#aaa] font-medium mb-1.5">Payment Method *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleSelectUpi}
                        className={`p-3 rounded-lg border text-left text-xs transition-all relative ${
                          isLocalDev
                            ? 'border-[#262626] bg-[#0d0d0d] text-[#777] cursor-pointer hover:border-[#383838]'
                            : (paymentMethod === 'upi_online'
                                ? 'border-cyan-500 bg-[#161616] text-cyan-400 font-bold shadow-xs cursor-pointer'
                                : 'border-[#222] bg-[#111] text-[#888] hover:text-[#bbb] cursor-pointer')
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">📱</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className={`font-bold ${isLocalDev ? 'text-[#aaa]' : 'text-white'}`}>UPI Payment</p>
                              {isLocalDev && (
                                <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                                  Demo Mode
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#666]">Instant QR / Google Pay / PhonePe</p>
                            {isLocalDev && (
                              <p className="text-[10px] text-amber-400/90 mt-1 font-medium">
                                Temporarily unavailable for demo
                              </p>
                            )}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('store_pickup_cash');
                          setUpiLocalNotice(false);
                        }}
                        className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                          paymentMethod === 'store_pickup_cash'
                            ? 'border-cyan-500 bg-[#161616] text-cyan-400 font-bold shadow-xs'
                            : 'border-[#222] bg-[#111] text-[#888] hover:text-[#bbb]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">🏪</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-bold text-white">Pay at Store</p>
                              {isLocalDev && (
                                <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                                  Available
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#777]">Pay upon counter pickup & inspection</p>
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Localhost Demo Notice Banner */}
                    {isLocalDev && (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                        <p className="text-[11px] font-medium leading-tight text-amber-200">
                          For now, only Pay at Store option is available.
                        </p>
                      </div>
                    )}
                  </div>


                  {/* Summary recap */}
                  <div className="p-3 rounded-md bg-[#121212] border border-[#222] flex justify-between items-center text-xs">
                    <span className="text-[#888]">Total Amount to Pay:</span>
                    <strong className="text-base text-cyan-400 font-serif italic">
                      ₹{cartTotal.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="w-full py-3.5 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:bg-[#222] disabled:text-[#555] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-cyan-950/40 transition-all flex items-center justify-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {isSubmittingOrder ? 'Placing Order...' : 'Confirm & Place Order'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
