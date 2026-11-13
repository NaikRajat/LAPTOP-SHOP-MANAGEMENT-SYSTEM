import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { X, Cpu, Zap, ShoppingCart, CheckCircle, ShieldCheck, Layers, HelpCircle } from 'lucide-react';
import { Product } from '../types.js';

export const CustomPcBuilderModal: React.FC = () => {
  const { isCustomPcModalOpen, setIsCustomPcModalOpen, addToCart, showToast } = useApp();

  // Part options
  const CPUS = [
    { id: 'i7-14700k', name: 'Intel Core i7-14700K (20 Cores, 5.6GHz)', price: 38500, wattage: 253 },
    { id: 'i9-14900k', name: 'Intel Core i9-14900K (24 Cores, 6.0GHz)', price: 54900, wattage: 300 },
    { id: 'ryzen7-7800x3d', name: 'AMD Ryzen 7 7800X3D (Best Gaming CPU)', price: 37900, wattage: 120 },
    { id: 'ryzen9-7900x', name: 'AMD Ryzen 9 7900X (12-Core Creator)', price: 39900, wattage: 170 },
    { id: 'ryzen5-7600x', name: 'AMD Ryzen 5 7600X (6-Core Esports)', price: 19800, wattage: 105 }
  ];

  const GPUS = [
    { id: 'rtx-4080s', name: 'NVIDIA GeForce RTX 4080 Super 16GB GDDR6X', price: 98000, wattage: 320 },
    { id: 'rtx-4070tis', name: 'NVIDIA GeForce RTX 4070 Ti Super 16GB', price: 79900, wattage: 285 },
    { id: 'rtx-4070s', name: 'NVIDIA GeForce RTX 4070 Super 12GB', price: 58900, wattage: 220 },
    { id: 'rtx-4060', name: 'NVIDIA GeForce RTX 4060 8GB OC', price: 28500, wattage: 115 },
    { id: 'none', name: 'Integrated Graphics (Office & Coding)', price: 0, wattage: 0 }
  ];

  const RAMS = [
    { id: 'ram-64-ddr5', name: '64GB (2x32GB) Corsair Vengeance DDR5 6000MHz', price: 18900, wattage: 15 },
    { id: 'ram-32-ddr5', name: '32GB (2x16GB) Corsair Vengeance RGB DDR5 6000MHz', price: 10499, wattage: 10 },
    { id: 'ram-16-ddr5', name: '16GB (1x16GB) Kingston Fury DDR5 5600MHz', price: 4800, wattage: 5 }
  ];

  const STORAGES = [
    { id: 'ssd-2tb-990pro', name: '2TB Samsung 990 Pro PCIe 4.0 NVMe (7450 MB/s)', price: 17499, wattage: 8 },
    { id: 'ssd-1tb-gen4', name: '1TB Kingston KC3000 PCIe 4.0 NVMe (7000 MB/s)', price: 8499, wattage: 6 },
    { id: 'ssd-500gb', name: '500GB Crucial P3 Plus PCIe Gen4', price: 3800, wattage: 5 }
  ];

  const COOLERS = [
    { id: 'cool-360aio', name: 'DeepCool LS720 360mm ARGB Liquid AIO Cooler', price: 9499, wattage: 20 },
    { id: 'cool-240aio', name: 'DeepCool LE520 240mm ARGB Liquid Cooler', price: 5800, wattage: 15 },
    { id: 'cool-air', name: 'DeepCool AK400 High-Performance Tower Air Cooler', price: 2600, wattage: 8 }
  ];

  const CASES = [
    { id: 'case-glass', name: 'Lian Li O11 Dynamic EVO Dual-Chamber Tempered Glass', price: 12500 },
    { id: 'case-mesh', name: 'NZXT H5 Flow High-Airflow Compact ATX', price: 7900 },
    { id: 'case-antech', name: 'Ant Esports ICE-410TG Mid-Tower with 4x ARGB Fans', price: 3999 }
  ];

  const PSUS = [
    { id: 'psu-850', name: 'MSI MAG A850GL 850W 80+ Gold PCIe 5.0 Fully Modular', price: 8900, capacity: 850 },
    { id: 'psu-750', name: 'Corsair CX750 750W 80+ Bronze Certified', price: 6200, capacity: 750 },
    { id: 'psu-650', name: 'DeepCool PK650D 650W 80+ Bronze Power Supply', price: 4400, capacity: 650 }
  ];

  const [selectedCpu, setSelectedCpu] = useState(CPUS[0]);
  const [selectedGpu, setSelectedGpu] = useState(GPUS[2]);
  const [selectedRam, setSelectedRam] = useState(RAMS[1]);
  const [selectedStorage, setSelectedStorage] = useState(STORAGES[1]);
  const [selectedCooler, setSelectedCooler] = useState(COOLERS[0]);
  const [selectedCase, setSelectedCase] = useState(CASES[1]);
  const [selectedPsu, setSelectedPsu] = useState(PSUS[0]);
  const [assemblyCare, setAssemblyCare] = useState(true);

  if (!isCustomPcModalOpen) return null;

  // Motherboard baseline cost
  const motherboardCost = 14500;
  const assemblyFee = assemblyCare ? 2500 : 0; // Professional thermal paste, cable management & 24h stress test

  const totalWattage = selectedCpu.wattage + selectedGpu.wattage + selectedRam.wattage + selectedStorage.wattage + selectedCooler.wattage + 70; // 70W mobo/fans
  const totalPrice = selectedCpu.price + selectedGpu.price + selectedRam.price + selectedStorage.price + selectedCooler.price + selectedCase.price + selectedPsu.price + motherboardCost + assemblyFee;

  const isWattageSafe = selectedPsu.capacity >= totalWattage * 1.25;

  const handleAddToCart = () => {
    const customPc: Product = {
      id: `custom-pc-${Date.now()}`,
      title: `SysTech Custom Rig: ${selectedCpu.name.split('(')[0].trim()} + ${selectedGpu.name.split(' ')[2] || 'GPU'}`,
      brand: 'SysTech Custom Kumta',
      sku: `PC-CUST-${Date.now().toString().slice(-5)}`,
      condition: 'brand_new',
      category: 'custom_pc',
      price: totalPrice,
      originalPrice: Math.round(totalPrice * 1.15),
      stock: 3,
      image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80',
      rating: 5.0,
      reviewsCount: 1,
      active: true,
      featured: true,
      createdAt: new Date().toISOString(),
      description: `${selectedCpu.name} • ${selectedGpu.name} • ${selectedRam.name} • ${selectedStorage.name} • ${selectedCooler.name} • ${selectedCase.name}`,
      specs: {
        cpu: selectedCpu.name,
        gpu: selectedGpu.name,
        ram: selectedRam.name,
        storage: selectedStorage.name,
        battery: `${selectedPsu.capacity}W Power Supply (${totalWattage}W Draw)`,
        warranty: '3-Year Individual Parts Warranty + 1-Year Free Kumta Tech Bench Maintenance',
        tagline: `${totalWattage}W Build • Assembled & Tested at Kumta Lab`
      }
    };

    addToCart(customPc);
    setIsCustomPcModalOpen(false);
    showToast('Custom Rig Added!', `Your custom build has been assembled and added to the cart!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#262626] overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#222] flex items-center justify-between bg-slate-50 dark:bg-[#161616]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Interactive Custom PC Builder & Wattage Calc
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#888]">
                Customized components, live PSU headroom check, and Kumta bench assembly
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCustomPcModalOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#222] text-slate-600 dark:text-[#aaa] hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Builder Interface */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto space-y-4">
          {/* Live Wattage & Compatibility Strip */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-[#181818] border border-slate-200 dark:border-[#262626] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${isWattageSafe ? 'text-amber-500' : 'text-red-500'}`} />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">Estimated Power Consumption:</span>
                <span className="ml-1.5 font-mono font-bold text-slate-900 dark:text-white">{totalWattage} W</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-[#888]">Selected PSU:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">{selectedPsu.capacity} W</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                isWattageSafe ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'
              }`}>
                {isWattageSafe ? 'Headroom Safe (+25%)' : 'PSU Upgrade Recommended'}
              </span>
            </div>
          </div>

          {/* Configuration Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* CPU */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-[#222] bg-white dark:bg-[#161616]">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                <span>Processor (CPU)</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono">₹{selectedCpu.price.toLocaleString('en-IN')}</span>
              </label>
              <select
                value={selectedCpu.id}
                onChange={e => setSelectedCpu(CPUS.find(c => c.id === e.target.value)!)}
                className="w-full p-2 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-300 dark:border-[#333] rounded-lg text-slate-900 dark:text-white"
              >
                {CPUS.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (+₹{c.price.toLocaleString('en-IN')})</option>
                ))}
              </select>
            </div>

            {/* GPU */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-[#222] bg-white dark:bg-[#161616]">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                <span>Graphics Card (GPU)</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono">₹{selectedGpu.price.toLocaleString('en-IN')}</span>
              </label>
              <select
                value={selectedGpu.id}
                onChange={e => setSelectedGpu(GPUS.find(g => g.id === e.target.value)!)}
                className="w-full p-2 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-300 dark:border-[#333] rounded-lg text-slate-900 dark:text-white"
              >
                {GPUS.map(g => (
                  <option key={g.id} value={g.id}>{g.name} (+₹{g.price.toLocaleString('en-IN')})</option>
                ))}
              </select>
            </div>

            {/* RAM */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-[#222] bg-white dark:bg-[#161616]">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                <span>Memory (RAM)</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono">₹{selectedRam.price.toLocaleString('en-IN')}</span>
              </label>
              <select
                value={selectedRam.id}
                onChange={e => setSelectedRam(RAMS.find(r => r.id === e.target.value)!)}
                className="w-full p-2 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-300 dark:border-[#333] rounded-lg text-slate-900 dark:text-white"
              >
                {RAMS.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (+₹{r.price.toLocaleString('en-IN')})</option>
                ))}
              </select>
            </div>

            {/* Storage */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-[#222] bg-white dark:bg-[#161616]">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                <span>NVMe Gen4 SSD</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono">₹{selectedStorage.price.toLocaleString('en-IN')}</span>
              </label>
              <select
                value={selectedStorage.id}
                onChange={e => setSelectedStorage(STORAGES.find(s => s.id === e.target.value)!)}
                className="w-full p-2 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-300 dark:border-[#333] rounded-lg text-slate-900 dark:text-white"
              >
                {STORAGES.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (+₹{s.price.toLocaleString('en-IN')})</option>
                ))}
              </select>
            </div>

            {/* Cooling */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-[#222] bg-white dark:bg-[#161616]">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                <span>Thermal Cooling</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono">₹{selectedCooler.price.toLocaleString('en-IN')}</span>
              </label>
              <select
                value={selectedCooler.id}
                onChange={e => setSelectedCooler(COOLERS.find(c => c.id === e.target.value)!)}
                className="w-full p-2 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-300 dark:border-[#333] rounded-lg text-slate-900 dark:text-white"
              >
                {COOLERS.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (+₹{c.price.toLocaleString('en-IN')})</option>
                ))}
              </select>
            </div>

            {/* Cabinet */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-[#222] bg-white dark:bg-[#161616]">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                <span>Chassis / Cabinet</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono">₹{selectedCase.price.toLocaleString('en-IN')}</span>
              </label>
              <select
                value={selectedCase.id}
                onChange={e => setSelectedCase(CASES.find(c => c.id === e.target.value)!)}
                className="w-full p-2 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-300 dark:border-[#333] rounded-lg text-slate-900 dark:text-white"
              >
                {CASES.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (+₹{c.price.toLocaleString('en-IN')})</option>
                ))}
              </select>
            </div>

            {/* Power Supply */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-[#222] bg-white dark:bg-[#161616]">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                <span>Power Supply (PSU)</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono">₹{selectedPsu.price.toLocaleString('en-IN')}</span>
              </label>
              <select
                value={selectedPsu.id}
                onChange={e => setSelectedPsu(PSUS.find(p => p.id === e.target.value)!)}
                className="w-full p-2 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-300 dark:border-[#333] rounded-lg text-slate-900 dark:text-white"
              >
                {PSUS.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (+₹{p.price.toLocaleString('en-IN')})</option>
                ))}
              </select>
            </div>

            {/* Motherboard & Assembly */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-[#222] bg-white dark:bg-[#161616] flex flex-col justify-between">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex justify-between">
                  <span>Motherboard (WiFi + BT)</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-mono">₹{motherboardCost.toLocaleString('en-IN')}</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-[#777]">
                  Tier-1 B760/B650 Gaming Motherboard with PCIe 5.0, WiFi 6E & 2.5G LAN included.
                </p>
              </div>

              <label className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-[#222] cursor-pointer">
                <input
                  type="checkbox"
                  checked={assemblyCare}
                  onChange={e => setAssemblyCare(e.target.checked)}
                  className="rounded text-cyan-600"
                />
                <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                  Kumta Bench Assembly, Thermal Grizzly Paste & 24hr Burn-in Test (+₹2,500)
                </span>
              </label>
            </div>
          </div>

          {/* Pricing & Add to Cart Bar */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#181818] border border-slate-200 dark:border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-[#888]">Total Estimated Rig Cost (Includes GST):</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                ₹{totalPrice.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" /> 3-Year Warranty on all components + Free OS Setup
              </p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full sm:w-auto py-3 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <ShoppingCart className="w-4 h-4" /> Add Custom Build to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
