import React, { useState, useEffect } from 'react';
import { PromoCode } from '../../types.js';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.js';
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle,
  Percent,
  IndianRupee,
  Clock,
  Sparkles,
  X
} from 'lucide-react';

export const AdminPromotionsTab: React.FC = () => {
  const { showToast } = useApp();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  // New promo modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('flat');
  const [discountValue, setDiscountValue] = useState<number>(5000);
  const [minOrder, setMinOrder] = useState<number>(40000);
  const [expiresAt, setExpiresAt] = useState('2026-12-31');

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const data = await api.getPromoCodes();
      setPromos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue) {
      showToast('Validation Error', 'Code and discount value required', 'error');
      return;
    }

    try {
      await api.createPromoCode({
        code: code.trim().toUpperCase(),
        description: description || 'Exclusive Store Promotional Offer',
        discountType,
        discountValue: Number(discountValue),
        minOrder: Number(minOrder) || 0,
        expiresAt: expiresAt || '2026-12-31',
        active: true
      });
      showToast('Offer Published!', `Code ${code.toUpperCase()} is now live for customer checkout.`, 'success');
      setIsModalOpen(false);
      setCode('');
      setDescription('');
      fetchPromos();
    } catch (e: any) {
      showToast('Publish Error', e.message || 'Error creating promo code', 'error');
    }
  };

  const handleTogglePromo = async (promo: PromoCode) => {
    try {
      await api.updatePromoCode(promo.id, { active: !promo.active });
      setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, active: !promo.active } : p));
      showToast('Promo Updated', `${promo.code} is now ${!promo.active ? 'active' : 'paused'}.`, 'info');
    } catch (e: any) {
      showToast('Error', e.message, 'error');
    }
  };

  const handleDeletePromo = async (promo: PromoCode) => {
    if (!confirm(`Delete promo code ${promo.code}?`)) return;
    try {
      await api.deletePromoCode(promo.id);
      setPromos(prev => prev.filter(p => p.id !== promo.id));
      showToast('Promo Deleted', `${promo.code} removed from system.`, 'info');
    } catch (e: any) {
      showToast('Error', e.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <div className="bg-[#0d0d0d] p-5 rounded-xl border border-[#1a1a1a] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif italic text-white">
            Publish Offers & Discount Promo Codes
          </h2>
          <p className="text-xs text-[#777] mt-0.5 font-sans">
            Create coupon codes that customers can apply in real-time during cart checkout.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Publish New Offer
        </button>
      </div>

      {/* Promos Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 py-16 text-center text-[#666] font-mono text-xs">
            Loading active promotional codes...
          </div>
        ) : promos.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-[#666] font-mono text-xs">
            No promo codes found. Click "Publish New Offer" to create your first customer discount!
          </div>
        ) : (
          promos.map(promo => {
            const isFlat = promo.discountType === 'flat';
            return (
              <div
                key={promo.id}
                className={`p-5 rounded-xl bg-[#0d0d0d] border shadow-xs flex flex-col justify-between transition-all ${
                  promo.active
                    ? 'border-[#1a1a1a] hover:border-cyan-900/50'
                    : 'border-dashed border-[#222] opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-md bg-[#141414] text-cyan-400 font-mono font-bold text-sm tracking-wider border border-cyan-900/50 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      {promo.code}
                    </span>

                    <button
                      onClick={() => handleTogglePromo(promo)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
                        promo.active
                          ? 'bg-[#141414] border-emerald-900/50 text-emerald-400'
                          : 'bg-[#141414] border-[#222] text-[#666]'
                      }`}
                    >
                      {promo.active ? '● Active' : '○ Paused'}
                    </button>
                  </div>

                  <h3 className="font-serif italic text-base text-white mb-1">
                    {isFlat
                      ? `Flat ₹${promo.discountValue.toLocaleString('en-IN')} Off`
                      : `${promo.discountValue}% Instant Discount`}
                  </h3>
                  <p className="text-xs text-[#888] mb-3 font-sans">
                    {promo.description}
                  </p>

                  <div className="space-y-1.5 font-mono text-[11px] text-[#aaa] pt-2 border-t border-[#1a1a1a]">
                    <div className="flex justify-between">
                      <span className="text-[#666]">Min Cart Order:</span>
                      <strong className="text-white">₹{promo.minOrder?.toLocaleString('en-IN') || 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666]">Times Applied:</span>
                      <span className="text-cyan-400 font-bold">{promo.usageCount || 0} customers</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666]">Expires:</span>
                      <span className="text-[#888]">{promo.expiresAt}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#1a1a1a] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">
                    {promo.active ? 'Ready at Checkout' : 'Paused by Owner'}
                  </span>
                  <button
                    onClick={() => handleDeletePromo(promo)}
                    className="p-1.5 rounded-md text-[#666] hover:text-red-400 hover:bg-[#181818] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Promo Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-md bg-[#0d0d0d] text-[#e0e0e0] rounded-xl shadow-2xl border border-[#1a1a1a] overflow-hidden my-auto">
            <div className="p-4 sm:p-6 border-b border-[#1a1a1a] bg-[#080808] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-serif italic text-white">
                  Publish New Offer Coupon
                </h3>
                <p className="text-xs text-[#777] font-sans">Live discount rule applied instantly at checkout.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#181818] border border-[#262626] flex items-center justify-center text-[#777] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="p-4 sm:p-6 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#aaa] font-medium mb-1">Coupon Code Name *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FESTIVE8000"
                  className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] font-mono font-bold uppercase text-xs text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                />
              </div>

              <div>
                <label className="block text-[#aaa] font-medium mb-1">Offer Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Special Festival Discount on All Laptops"
                  className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] text-xs text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] text-xs text-white focus:border-cyan-500 outline-none"
                  >
                    <option value="flat" className="bg-[#111]">Flat Amount (₹)</option>
                    <option value="percentage" className="bg-[#111]">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    value={discountValue}
                    onChange={e => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] font-mono font-bold text-xs text-cyan-400 focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Min Order Value (₹)</label>
                  <input
                    type="number"
                    value={minOrder}
                    onChange={e => setMinOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] font-mono text-xs text-white focus:border-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-md bg-[#080808] border border-[#222] font-mono text-xs text-white focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-cyan-950/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Tag className="w-4 h-4" />
                  Publish Live Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
