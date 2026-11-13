import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Wrench,
  Cpu,
  Monitor,
  Droplets,
  HardDrive,
  Clock,
  ArrowRight,
  Search,
  CheckCircle,
  Phone
} from 'lucide-react';

export const RepairLabSection: React.FC = () => {
  const { setIsRepairModalOpen, setIsRepairTrackerOpen } = useApp();
  const [quickTicketId, setQuickTicketId] = useState('');

  const services = [
    {
      icon: Cpu,
      title: 'Chip-Level Motherboard Diagnostics',
      desc: 'Short-circuit tracing, power IC replacement, BGA reballing & BIOS reprogramming done under stereo microscope.',
      turnaround: '24 - 48 Hours',
      badge: 'Advanced Lab'
    },
    {
      icon: Monitor,
      title: 'Display & Glass Hinge Reconstruction',
      desc: 'FHD, OLED, 144Hz screen replacement and structural metal hinge reinforcement without replacing top chassis.',
      turnaround: 'Same-Day Service',
      badge: 'Original Panels'
    },
    {
      icon: Droplets,
      title: 'Liquid Damage Ultrasonic Decontamination',
      desc: 'Ultrasonic board wash, corrosion removal, trace rewiring and sensor testing for coffee/water spills.',
      turnaround: 'Same-Day / 24h',
      badge: '90%+ Recovery'
    },
    {
      icon: HardDrive,
      title: 'SSD High-Speed Clone & RAM Expansion',
      desc: 'NVMe Gen4 speed upgrades, instant zero-loss OS cloning, and thermal paste repasting with Arctic MX-4.',
      turnaround: '30 - 60 Minutes',
      badge: 'Fast Bench'
    }
  ];

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10" id="repairs">
      <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl p-4 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden border border-slate-200 dark:border-[#1a1a1a] transition-colors">
        {/* Top Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between mb-5 sm:mb-8 gap-3.5 sm:gap-4 border-b border-slate-200 dark:border-[#1a1a1a] pb-4 sm:pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider border border-cyan-500/30 mb-2 sm:mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
              Kumta Chip-Level Clean Lab
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight text-slate-900 dark:text-white">
              Precision Diagnostics & Laptop Repair Lab
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#888] max-w-2xl mt-1">
              Equipped with digital oscilloscopes, hot-air rework stations, and authentic manufacturer spares. All repairs covered by our 90-day store warranty.
            </p>
          </div>

          {/* Quick Ticket Status Box */}
          <div className="bg-slate-50 dark:bg-[#121212] p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-[#222] max-w-sm w-full shrink-0">
            <span className="text-[10px] font-mono text-slate-500 dark:text-[#666] uppercase tracking-wider block mb-1.5 font-bold">
              Live Repair Status Lookup
            </span>
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
              <input
                type="text"
                value={quickTicketId}
                onChange={e => setQuickTicketId(e.target.value.toUpperCase())}
                placeholder="e.g. TK-2025-0814"
                className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs bg-white dark:bg-[#080808] border border-slate-300 dark:border-[#262626] rounded-lg text-slate-900 dark:text-white font-mono uppercase focus:ring-1 focus:ring-cyan-500 outline-none placeholder-slate-400 dark:placeholder-[#555]"
              />
              <button
                onClick={() => setIsRepairTrackerOpen(true)}
                className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" /> Track
              </button>
            </div>
          </div>
        </div>

        {/* 4 Service Offerings Grid */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-5 sm:mb-8">
          {services.map((svc, idx) => {
            const Icon = svc.icon;
            return (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#1e1e1e] flex flex-col justify-between hover:border-slate-300 dark:hover:border-[#333] transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#262626] text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white dark:bg-[#181818] text-slate-600 dark:text-[#888] border border-slate-200 dark:border-[#262626]">
                      {svc.badge}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm sm:text-base mb-1 text-slate-900 dark:text-white">
                    {svc.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-[#888] leading-relaxed mb-3 sm:mb-4">
                    {svc.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-slate-200 dark:border-[#1e1e1e] text-xs text-slate-500 dark:text-[#888] font-mono">
                  <span className="flex items-center gap-1 text-[10.5px] sm:text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> {svc.turnaround}
                  </span>
                  <button
                    onClick={() => setIsRepairModalOpen(true)}
                    className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 font-sans font-bold text-xs flex items-center gap-0.5 group-hover:translate-x-1 transition-transform cursor-pointer"
                  >
                    Book <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner Actions */}
        <div className="relative z-10 p-3.5 sm:p-5 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#1e1e1e] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Need urgent diagnosis or on-site device support?
          </p>

          <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 shrink-0">
            <a
              href="tel:+919448155198"
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#222] text-slate-800 dark:text-white text-xs font-bold flex items-center justify-center gap-2 border border-slate-300 dark:border-[#2a2a2a] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Lab: +91 94481 55198</span>
            </a>
            <button
              onClick={() => setIsRepairModalOpen(true)}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Book Repair Online</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
