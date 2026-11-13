import React from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Laptop,
  Wrench,
  ShieldCheck,
  Phone,
  MapPin,
  Clock,
  Mail,
  ArrowUp,
  Video,
  Cpu,
  Keyboard
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { setCurrentView, setIsRepairModalOpen, setIsRepairTrackerOpen, setSelectedCategory } = useApp();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryNav = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentView('store');
    const el = document.getElementById('laptop-catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-white dark:bg-[#050505] text-slate-600 dark:text-[#777] text-xs border-t border-slate-200 dark:border-[#1a1a1a] transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 sm:gap-8 pb-6 sm:pb-10 border-b border-slate-200 dark:border-[#1a1a1a]">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
                  SYS<span className="text-cyan-600 dark:text-cyan-400">TECH</span>
                </span>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
                  Computer Solutions • Kumta
                </p>
              </div>
            </div>

            <p className="text-slate-600 dark:text-[#777] text-xs leading-relaxed max-w-sm">
              Your premier computer partner in Kumta, Uttara Kannada. Sourcing certified refurbished business workstations, brand-new ultrabooks, CCTV surveillance kits, custom liquid-cooled rigs, and chip-level diagnostic laboratory services.
            </p>
          </div>

          {/* Catalog Col */}
          <div className="space-y-2.5 sm:space-y-3">
            <h4 className="text-slate-900 dark:text-white font-bold text-sm tracking-wide">
              Hardware Departments
            </h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs">
              <li>
                <button onClick={() => handleCategoryNav('laptops')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer">
                  Laptops & MacBooks
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryNav('accessories')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer">
                  Accessories & Peripherals
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryNav('cctv')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer">
                  CCTV & Surveillance
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryNav('custom_pc')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer">
                  Custom Gaming & Creator PCs
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryNav('all')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer">
                  All Showroom Inventory
                </button>
              </li>
            </ul>
          </div>

          {/* Services & Lab Col */}
          <div className="space-y-2.5 sm:space-y-3">
            <h4 className="text-slate-900 dark:text-white font-bold text-sm tracking-wide">
              Lab & Diagnostics
            </h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs">
              <li>
                <button
                  onClick={() => setIsRepairModalOpen(true)}
                  className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer"
                >
                  Book Laptop Repair
                </button>
              </li>
              <li>
                <button
                  onClick={() => setIsRepairTrackerOpen(true)}
                  className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer"
                >
                  Track Repair Ticket
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Col */}
          <div className="space-y-2.5 sm:space-y-3">
            <h4 className="text-slate-900 dark:text-white font-bold text-sm tracking-wide">
              Kumta Counter
            </h4>
            <div className="space-y-1.5 sm:space-y-2 text-xs">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span>Kumta, Uttara Kannada, Karnataka - 581343</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <a href="tel:+919448155198" className="hover:text-cyan-600 dark:hover:text-cyan-400 font-mono font-bold">
                  +91 94481 55198
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>9:00 AM – 8:00 PM (Mon-Sat)</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 text-[10.5px] sm:text-[11px] text-slate-500 dark:text-[#666] text-center sm:text-left">
          <p>© {new Date().getFullYear()} SYSTECH Computer Solutions Kumta. All Rights Reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            <span>Genuine Spares</span>
            <span>•</span>
            <span>GST Registered</span>
            <span>•</span>
            <button
              onClick={scrollToTop}
              className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 font-semibold cursor-pointer"
            >
              Back to top <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
