import React from 'react';
import { useApp } from '../context/AppContext.js';
import { Laptop, Keyboard, Video, Cpu, ArrowRight, ShieldCheck, Wrench, Sparkles } from 'lucide-react';

export const CategoryDepartmentGrid: React.FC = () => {
  const {
    selectedCategory,
    setSelectedCategory,
    setIsCctvSurveyModalOpen,
    setIsCustomPcModalOpen
  } = useApp();

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    const catalogEl = document.getElementById('laptop-catalog');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const departments = [
    {
      id: 'laptops',
      title: 'Laptops & MacBooks',
      tagline: 'Refurbished & Brand New',
      description: 'Lenovo ThinkPad, Dell Latitude, Apple MacBook M1/M2/M3 with 40-point diagnostics & up to 1-Year Store Warranty.',
      icon: Laptop,
      badge: 'Certified',
      stats: '12+ Units in Kumta Stock',
      bgGradient: 'from-blue-600/10 via-cyan-600/5 to-transparent',
      borderColor: 'border-blue-500/20 hover:border-blue-500/50',
      actionText: 'Explore Laptops',
      onPrimaryClick: () => handleSelectCategory('laptops')
    },
    {
      id: 'accessories',
      title: 'Accessories & Peripherals',
      tagline: 'Keyboards, SSDs & Chargers',
      description: 'Mechanical keyboards, 100W GaN fast chargers, rugged portable SSDs, dual-display hubs, and ballistic sleeves.',
      icon: Keyboard,
      badge: 'Fast Delivery',
      stats: 'Genuine Brands Only',
      bgGradient: 'from-purple-600/10 via-indigo-600/5 to-transparent',
      borderColor: 'border-purple-500/20 hover:border-purple-500/50',
      actionText: 'Browse Accessories',
      onPrimaryClick: () => handleSelectCategory('accessories')
    },
    {
      id: 'cctv',
      title: 'CCTV & Security Solutions',
      tagline: 'Kumta Onsite Setup & Solar 4G',
      description: 'Hikvision, CP Plus 4K IP Surveillance, 360° WiFi PTZ, and Solar 4G cameras for plantations, homes & retail shops.',
      icon: Video,
      badge: 'Free Site Survey',
      stats: 'Full Setup & App Support',
      bgGradient: 'from-emerald-600/10 via-teal-600/5 to-transparent',
      borderColor: 'border-emerald-500/20 hover:border-emerald-500/50',
      actionText: 'View CCTV Kits',
      onPrimaryClick: () => handleSelectCategory('cctv'),
      secondaryAction: {
        text: 'Plan Package & Survey',
        onClick: () => setIsCctvSurveyModalOpen(true)
      }
    },
    {
      id: 'custom_pc',
      title: 'Custom Gaming & Creator PCs',
      tagline: 'Liquid Cooled & Bench Tested',
      description: 'Custom Intel Core i7/i9 & AMD Ryzen 7/9 rigs with RTX 4070/4080 GPUs. Cable-managed, stress-tested & ready in Kumta.',
      icon: Cpu,
      badge: 'Custom Built',
      stats: '3-Year Parts Warranty',
      bgGradient: 'from-amber-600/10 via-orange-600/5 to-transparent',
      borderColor: 'border-amber-500/20 hover:border-amber-500/50',
      actionText: 'View PC Rigs',
      onPrimaryClick: () => handleSelectCategory('custom_pc'),
      secondaryAction: {
        text: 'Interactive PC Builder',
        onClick: () => setIsCustomPcModalOpen(true)
      }
    }
  ];

  return (
    <section id="catalog-categories" className="py-6 sm:py-10 md:py-12 px-3 sm:px-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 sm:mb-8 gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Store Departments</span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Explore Hardware & Specialized Tech
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#888] mt-1 max-w-2xl">
            Choose a department to instantly filter our inventory, or launch our dedicated CCTV planner and Custom PC builder.
          </p>
        </div>

        {/* Show all filter button */}
        <button
          onClick={() => handleSelectCategory('all')}
          className={`self-start sm:self-auto px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-[#161616] text-slate-700 dark:text-[#aaa] border border-slate-200 dark:border-[#262626] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          View All Inventory
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {departments.map(dept => {
          const Icon = dept.icon;
          const isSelected = selectedCategory === dept.id;

          return (
            <div
              key={dept.id}
              className={`group relative rounded-2xl p-4 sm:p-5 lg:p-6 flex flex-col justify-between border transition-all duration-200 bg-white dark:bg-[#121212] ${
                isSelected
                  ? 'border-cyan-500 ring-2 ring-cyan-500/20 shadow-md'
                  : `border-slate-200 dark:border-[#222] ${dept.borderColor} hover:shadow-xs`
              }`}
            >
              {/* Header inside card */}
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-100 dark:bg-[#181818] border border-slate-200 dark:border-[#2a2a2a] flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1a1a1a] text-slate-700 dark:text-[#aaa] border border-slate-200 dark:border-[#2a2a2a]">
                    {dept.badge}
                  </span>
                </div>

                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  {dept.tagline}
                </p>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {dept.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-[#888] mt-1.5 leading-relaxed">
                  {dept.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 dark:border-[#1e1e1e] space-y-2">
                <button
                  type="button"
                  onClick={dept.onPrimaryClick}
                  className={`w-full py-2 sm:py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#1a1a1a] hover:bg-slate-200 dark:hover:bg-[#222] text-slate-900 dark:text-white border border-slate-200 dark:border-[#2a2a2a]'
                  }`}
                >
                  <span>{dept.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {dept.secondaryAction && (
                  <button
                    type="button"
                    onClick={dept.secondaryAction.onClick}
                    className="w-full py-1.5 sm:py-2 px-3 rounded-xl text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <span>{dept.secondaryAction.text}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
