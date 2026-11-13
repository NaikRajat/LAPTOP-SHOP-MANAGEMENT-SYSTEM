import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { X, Video, ShieldCheck, CheckCircle, Phone, Calendar, MapPin, ShoppingCart, HelpCircle } from 'lucide-react';
import { Product } from '../types.js';

export const CctvSurveyModal: React.FC = () => {
  const { isCctvSurveyModalOpen, setIsCctvSurveyModalOpen, addToCart, showToast, user } = useApp();

  const [propertyType, setPropertyType] = useState<'home' | 'shop' | 'farm' | 'office'>('shop');
  const [cameraCount, setCameraCount] = useState<number>(4);
  const [cameraType, setCameraType] = useState<'5mp_ip' | '4k_uhd' | 'ptz_wifi' | 'solar_4g'>('5mp_ip');
  const [storageDays, setStorageDays] = useState<number>(30);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState('Kumta Town');
  const [submitted, setSubmitted] = useState(false);

  if (!isCctvSurveyModalOpen) return null;

  // Pricing calculation
  const baseCameraPrices: Record<string, number> = {
    '5mp_ip': 3200,
    '4k_uhd': 4800,
    'ptz_wifi': 4299,
    'solar_4g': 9800
  };

  const nvrCost = cameraType === 'solar_4g' || cameraType === 'ptz_wifi' ? 0 : cameraCount <= 4 ? 4500 : 7500;
  const storageCost = storageDays === 15 ? 3200 : storageDays === 30 ? 5499 : 8900;
  const cableAccessoriesCost = cameraType === 'solar_4g' ? 500 : cameraCount * 900;
  const installationLabor = cameraCount * 750;

  const equipmentTotal = (baseCameraPrices[cameraType] * cameraCount) + nvrCost + storageCost + cableAccessoriesCost;
  const packageTotal = equipmentTotal + installationLabor;

  const handleAddPackageToCart = () => {
    const customCctvPackage: Product = {
      id: `cctv-pkg-${Date.now()}`,
      title: `SysTech ${cameraCount}-Camera ${cameraType === 'solar_4g' ? 'Solar 4G' : cameraType === '4k_uhd' ? '4K Ultra-HD' : '5MP Audio'} CCTV Package`,
      brand: 'Hikvision / CP Plus',
      sku: `CCTV-PKG-${cameraCount}CH`,
      condition: 'brand_new',
      category: 'cctv',
      price: packageTotal,
      originalPrice: Math.round(packageTotal * 1.2),
      stock: 5,
      image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80',
      rating: 5.0,
      reviewsCount: 18,
      active: true,
      createdAt: new Date().toISOString(),
      description: `Complete ${cameraCount}-camera setup tailored for ${propertyType.toUpperCase()} in Kumta. Includes ${storageDays}-day surveillance recording HDD, cables & professional installation.`,
      specs: {
        warranty: '2-Year On-Site Manufacturer Warranty & Local Kumta Support',
        tagline: `${cameraCount} Cameras • ${storageDays} Days Storage • On-Site Setup`
      }
    };

    addToCart(customCctvPackage);
    setIsCctvSurveyModalOpen(false);
    showToast('CCTV Package Added', `${cameraCount}-Camera Security Package added to your cart!`, 'success');
  };

  const handleBookSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone || !customerName) {
      showToast('Missing Details', 'Please enter your name and contact phone number.', 'error');
      return;
    }
    setSubmitted(true);
    showToast('Survey Booked', 'Our Kumta surveillance team will call you within 2 hours to confirm inspection time.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#262626] overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#222] flex items-center justify-between bg-slate-50 dark:bg-[#161616]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                CCTV Security Package & Site Survey
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#888]">
                Professional surveillance planning & installation across Kumta & Uttara Kannada
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCctvSurveyModalOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#222] text-slate-600 dark:text-[#aaa] hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">Site Survey Scheduled!</h4>
            <p className="text-sm text-slate-600 dark:text-[#aaa] max-w-md mx-auto">
              Thank you, <strong className="text-slate-900 dark:text-white">{customerName}</strong>. Our senior CCTV field engineer will call you at <strong className="text-slate-900 dark:text-white">{customerPhone}</strong> to schedule the free pre-installation site inspection in {location}.
            </p>
            <div className="pt-4 flex justify-center gap-3">
              <button
                onClick={() => {
                  setSubmitted(false);
                  setIsCctvSurveyModalOpen(false);
                }}
                className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider"
              >
                Back to Store
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Step 1: Property Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                1. Property / Installation Site
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'home', label: 'Home / Villa', desc: 'Courtyards & gates' },
                  { id: 'shop', label: 'Shop / Showroom', desc: 'Counters & cash desks' },
                  { id: 'farm', label: 'Farm / Plantation', desc: 'Betel nut & estates' },
                  { id: 'office', label: 'Office / Complex', desc: 'Corridors & parking' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPropertyType(item.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      propertyType === item.id
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs'
                        : 'border-slate-200 dark:border-[#222] bg-white dark:bg-[#161616] text-slate-700 dark:text-[#aaa] hover:border-slate-300 dark:hover:border-[#333]'
                    }`}
                  >
                    <p className="text-xs font-bold">{item.label}</p>
                    <p className="text-[10px] text-slate-500 dark:text-[#777] mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Camera Type & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  2. Camera Technology
                </label>
                <select
                  value={cameraType}
                  onChange={e => setCameraType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#161616] border border-slate-300 dark:border-[#2a2a2a] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="5mp_ip">Hikvision 5MP Night Vision Audio Dome (Popular)</option>
                  <option value="4k_uhd">CP Plus 8MP (4K) Weatherproof Bullet</option>
                  <option value="ptz_wifi">TP-Link Tapo 360° WiFi PTZ (No DVR needed)</option>
                  <option value="solar_4g">Solar 4G LTE PTZ (No Power/WiFi needed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  3. Number of Cameras
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 8, 16].map(count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setCameraCount(count)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        cameraCount === count
                          ? 'border-cyan-500 bg-cyan-600 text-white shadow-xs'
                          : 'border-slate-200 dark:border-[#222] bg-white dark:bg-[#161616] text-slate-700 dark:text-[#aaa]'
                      }`}
                    >
                      {count} Cams
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3: Storage Days */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                4. Continuous Video Recording History
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { days: 15, label: '15 Days Storage', detail: '1TB Surveillance HDD' },
                  { days: 30, label: '30 Days Storage', detail: '2TB Purple 24/7 HDD' },
                  { days: 60, label: '60 Days Storage', detail: '4TB Enterprise Drive' }
                ].map(item => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => setStorageDays(item.days)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      storageDays === item.days
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs'
                        : 'border-slate-200 dark:border-[#222] bg-white dark:bg-[#161616] text-slate-700 dark:text-[#aaa]'
                    }`}
                  >
                    <p className="text-xs font-bold">{item.label}</p>
                    <p className="text-[10px] text-slate-500 dark:text-[#777]">{item.detail}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Estimate Summary Box */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#181818] border border-slate-200 dark:border-[#262626] space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-600 dark:text-[#888]">
                <span>Hardware & Cables ({cameraCount}x cameras, NVR, {storageDays}d HDD):</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">₹{equipmentTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600 dark:text-[#888]">
                <span>Kumta Professional Installation & Mobile Setup:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">+₹{installationLabor.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-[#333] pt-2 flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Complete Package Estimate:</span>
                  <p className="text-[10px] text-cyan-600 dark:text-cyan-400">Includes 2-Year Onsite Guarantee & Free Remote App Configuration</p>
                </div>
                <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                  ₹{packageTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Step 4: Contact for Site Inspection or Direct Add */}
            <form onSubmit={handleBookSurvey} className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold mb-1 text-slate-700 dark:text-slate-300">Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#161616] border border-slate-300 dark:border-[#2a2a2a] rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1 text-slate-700 dark:text-slate-300">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="+91 1234567890"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#161616] border border-slate-300 dark:border-[#2a2a2a] rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1 text-slate-700 dark:text-slate-300">Town / Area</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Kumta / Honnavar / Ankola"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#161616] border border-slate-300 dark:border-[#2a2a2a] rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="submit"
                  className="py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Calendar className="w-4 h-4" /> Book Free Site Survey
                </button>

                <button
                  type="button"
                  onClick={handleAddPackageToCart}
                  className="py-3 px-4 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <ShoppingCart className="w-4 h-4" /> Add Package to Cart
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
