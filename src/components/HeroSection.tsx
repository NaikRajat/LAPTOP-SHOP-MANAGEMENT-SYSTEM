import React from 'react';
import { Laptop, Phone, Wrench, ShieldCheck, CheckCircle, IndianRupee, Sparkles, Video, Cpu } from 'lucide-react';
import { useApp } from '../context/AppContext.js';

export const HeroSection: React.FC = () => {
  const { setIsRepairModalOpen, setIsCctvSurveyModalOpen, setIsCustomPcModalOpen, setSelectedCategory } = useApp();

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 pt-1 sm:pt-4 md:pt-6 pb-2 sm:pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-6 items-stretch">
        {/* Left Banner: Kumta Showroom Photo */}
        <div className="lg:col-span-6 relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-[#1a1a1a] shadow-sm flex flex-col justify-end min-h-[190px] xs:min-h-[220px] sm:min-h-[340px] lg:min-h-[440px] group">
          <img
            src="https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=1200&auto=format&fit=crop&q=80"
            alt="SYSTECH Computer Solutions Showroom and Lab in Kumta"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>

          {/* Top Tag Badge */}
          <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl bg-slate-950/80 backdrop-blur-md text-white font-semibold text-[10.5px] sm:text-xs border border-white/10 shadow-xs">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400"></span>
              Kumta Tech Lab & Retail Showroom
            </span>
          </div>

          {/* Bottom Banner Card */}
          <div className="relative z-10 p-3 sm:p-5 md:p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1.5 sm:gap-4">
              <div>
                <p className="text-base sm:text-xl font-bold text-white tracking-tight">SYSTECH Computer Solutions</p>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">Kumta, Uttara Kannada, Karnataka - 581343</p>
              </div>
              <div className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold shrink-0 self-start sm:self-auto">
                <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> OPEN NOW
              </div>
            </div>
          </div>
        </div>

        {/* Right Hero Text & Direct Actions */}
        <div className="lg:col-span-6 flex flex-col justify-between p-4 sm:p-6 lg:p-8 rounded-2xl bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-[#1a1a1a] shadow-xs">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-bold text-[9px] sm:text-[10px] uppercase tracking-wider mb-2.5 sm:mb-4">
              <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Certified Tech Partner in Kumta
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug sm:leading-tight mb-2 sm:mb-3">
              Laptops, CCTV Security, Custom PCs & Precision Hardware
            </h1>

            <p className="text-slate-600 dark:text-[#888] text-xs sm:text-sm lg:text-base mb-3.5 sm:mb-5 leading-relaxed">
              Explore factory-fresh brand new ultrabooks, multi-point certified refurbished laptops, CCTV surveillance kits for homes & farms, custom gaming rigs, and chip-level motherboard diagnostics in Kumta.
            </p>

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3 mb-3.5 sm:mb-5">
              <div className="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#1e1e1e]">
                <Laptop className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 dark:text-cyan-400 mb-1" />
                <p className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-white">Laptops & MacBooks</p>
                <p className="text-[9.5px] sm:text-[10px] text-slate-500 dark:text-[#777]">Brand new & Grade A+ refurbs</p>
              </div>

              <div className="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#1e1e1e]">
                <Video className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 mb-1" />
                <p className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-white">CCTV & Surveillance</p>
                <p className="text-[9.5px] sm:text-[10px] text-slate-500 dark:text-[#777]">Free on-site Kumta survey</p>
              </div>

              <div className="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#1e1e1e]">
                <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 mb-1" />
                <p className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-white">Custom PC Builds</p>
                <p className="text-[9.5px] sm:text-[10px] text-slate-500 dark:text-[#777]">RTX 40-Series & Liquid Cool</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col xs:flex-row flex-wrap items-stretch xs:items-center gap-2 sm:gap-3 pt-1">
            <a
              href="#laptop-catalog"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all text-center"
            >
              <Laptop className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Browse Catalog
            </a>

            <button
              onClick={() => setIsRepairModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 dark:bg-[#161616] border border-cyan-500/30 hover:border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Schedule Repair
            </button>

            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-transparent border border-slate-300 dark:border-[#333] hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-700 dark:text-white font-bold text-xs uppercase tracking-wider transition-all text-center"
            >
              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Contact Store
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
