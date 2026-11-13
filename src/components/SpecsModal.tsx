import React from 'react';
import { useApp } from '../context/AppContext.js';
import {
  X,
  CheckCircle,
  ShieldCheck,
  Cpu,
  Layers,
  HardDrive,
  Monitor,
  Gamepad2,
  Battery,
  Terminal,
  Usb,
  Phone,
  ShoppingCart
} from 'lucide-react';

export const SpecsModal: React.FC = () => {
  const { specsModalProduct, setSpecsModalProduct, addToCart } = useApp();

  if (!specsModalProduct) return null;

  const product = specsModalProduct;
  const isRefurb = product.condition === 'refurbished';
  const hasSavings = product.originalPrice && product.originalPrice > product.price;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={() => setSpecsModalProduct(null)}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#0d0d0d] text-slate-900 dark:text-[#e0e0e0] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#1a1a1a] overflow-hidden my-auto max-h-[92vh] flex flex-col transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-[#1a1a1a] bg-slate-50 dark:bg-[#080808] gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              <span
                className={`px-2 py-0.5 rounded text-[9.5px] sm:text-[10px] font-mono font-bold tracking-wider uppercase border ${
                  isRefurb
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                }`}
              >
                {isRefurb ? 'Certified Refurbished (Grade A+)' : 'Brand New Sealed'}
              </span>
              <span className="font-mono text-[11px] sm:text-xs text-slate-500 dark:text-[#777]">
                SKU: {product.sku}
              </span>
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug break-words">
              {product.title}
            </h3>
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1 mt-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">{product.specs?.tagline || product.specs?.warranty || 'Verified at Kumta Store'}</span>
            </p>
          </div>

          <button
            onClick={() => setSpecsModalProduct(null)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200 dark:bg-[#181818] hover:bg-slate-300 dark:hover:bg-[#222] border border-slate-300 dark:border-[#262626] text-slate-600 dark:text-[#888] hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Body: Specs Grid */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4 text-xs">
          {/* Price & Stock Banner */}
          <div className="flex flex-col xs:flex-row xs:items-baseline justify-between bg-slate-50 dark:bg-[#111] p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-[#1e1e1e] gap-2">
            <div>
              <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 dark:text-[#666] uppercase tracking-wider font-bold">Branch In-Store Price:</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                {hasSavings && (
                  <span className="text-xs text-slate-400 line-through font-mono">
                    ₹{product.originalPrice!.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
            <span className="text-[11px] sm:text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg shrink-0 self-start xs:self-auto">
              {product.stock > 0 ? `Ready for Kumta Pickup (${product.stock} units)` : 'Out of Stock'}
            </span>
          </div>

          <h4 className="text-xs uppercase tracking-wider text-slate-500 dark:text-[#777] font-bold flex items-center gap-1.5 pt-0.5">
            <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            System Specifications & Hardware Profile
          </h4>

          {/* Specs Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#1c1c1c]">
              <span className="text-[10px] font-mono text-slate-500 dark:text-[#666] uppercase font-bold">Processor / CPU</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono text-[11px]">
                {product.specs?.cpu || 'Multi-Core Intel / AMD Processor'}
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#1c1c1c]">
              <span className="text-[10px] font-mono text-slate-500 dark:text-[#666] uppercase font-bold">RAM / Memory</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono text-[11px]">
                {product.specs?.ram || 'High-Speed DDR4/DDR5 Dual Channel'}
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#1c1c1c]">
              <span className="text-[10px] font-mono text-slate-500 dark:text-[#666] uppercase font-bold">Storage & Expansion</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono text-[11px]">
                {product.specs?.storage || 'High-Speed NVMe PCIe Gen4 SSD'}
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#1c1c1c]">
              <span className="text-[10px] font-mono text-slate-500 dark:text-[#666] uppercase font-bold">Display Panel & Res</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono text-[11px]">
                {product.specs?.display || 'High Color-Accurate Anti-Glare Display'}
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#1c1c1c]">
              <span className="text-[10px] font-mono text-slate-500 dark:text-[#666] uppercase font-bold">Graphics / GPU</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono text-[11px]">
                {product.specs?.gpu || 'Integrated or Dedicated GPU Solution'}
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#1c1c1c]">
              <span className="text-[10px] font-mono text-slate-500 dark:text-[#666] uppercase font-bold">Battery Health & Runtime</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono text-[11px]">
                {product.specs?.battery || 'Original Tested High-Capacity Battery Pack'}
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#1c1c1c]">
              <span className="text-[10px] font-mono text-slate-500 dark:text-[#666] uppercase font-bold">Operating System</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono text-[11px]">
                {product.specs?.os || 'Windows 11 Professional / macOS Official'}
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#1c1c1c]">
              <span className="text-[10px] font-mono text-slate-500 dark:text-[#666] uppercase font-bold">Ports & Connectivity</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono text-[11px]">
                {product.specs?.ports || 'Thunderbolt / USB-C, USB-A, HDMI, Wi-Fi 6E'}
              </p>
            </div>
          </div>

          {/* Warranty Banner */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#111] border border-emerald-500/30 flex items-center gap-2.5 sm:gap-3">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-xs">Condition & Warranty Coverage</p>
              <p className="text-[10.5px] sm:text-[11px] text-slate-600 dark:text-[#888] leading-snug">
                {product.specs?.warranty || 'Covered by official warranty & direct Systech Kumta store bench service.'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-5 border-t border-slate-200 dark:border-[#1a1a1a] bg-slate-50 dark:bg-[#080808] flex flex-col xs:flex-row items-stretch xs:items-center justify-end gap-2 sm:gap-3">
          <button
            onClick={() => setSpecsModalProduct(null)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#161616] hover:bg-slate-100 dark:hover:bg-[#202020] border border-slate-200 dark:border-[#2a2a2a] text-slate-700 dark:text-[#aaa] hover:text-slate-900 dark:hover:text-white font-bold text-xs transition-colors cursor-pointer text-center"
          >
            Close
          </button>
          <a
            href="tel:+919448155198"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#161616] hover:bg-slate-100 dark:hover:bg-[#202020] border border-slate-200 dark:border-[#2a2a2a] text-slate-900 dark:text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all"
          >
            <Phone className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Counter: +91 94481 55198</span>
          </a>
          <button
            onClick={() => {
              addToCart(product);
              setSpecsModalProduct(null);
            }}
            disabled={product.stock <= 0}
            className="px-4 sm:px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-200 dark:disabled:bg-[#222] disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};
