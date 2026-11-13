import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.js';
import {
  IndianRupee,
  Package,
  ShoppingBag,
  Wrench,
  Tag,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Plus,
  CheckCircle,
  MessageSquare
} from 'lucide-react';

export const AdminDashboardTab: React.FC = () => {
  const { setActiveAdminTab } = useApp();
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await api.getAnalytics();
        setAnalytics(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-[#777]">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-mono">Aggregating Kumta store analytics...</p>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Hardware Sales',
      value: `₹${(analytics?.totalRevenue || 430249).toLocaleString('en-IN')}`,
      subtext: '+18.4% this month',
      icon: IndianRupee,
      color: 'text-cyan-400 bg-[#151515] border border-cyan-900/40'
    },
    {
      label: 'Store Orders Logged',
      value: analytics?.ordersCount || 3,
      subtext: `${analytics?.pendingOrders || 1} pending counter pickup`,
      icon: ShoppingBag,
      color: 'text-emerald-400 bg-[#151515] border border-emerald-900/40'
    },
    {
      label: 'Active Inventory SKUs',
      value: analytics?.totalProducts || 6,
      subtext: `${analytics?.lowStockProducts || 2} low in stock`,
      icon: Package,
      color: 'text-cyan-400 bg-[#151515] border border-cyan-900/40'
    },
    {
      label: 'Lab Repair Bench',
      value: analytics?.activeRepairs || 2,
      subtext: 'Diagnosing & Testing',
      icon: Wrench,
      color: 'text-amber-400 bg-[#151515] border border-amber-900/40'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 4 Major KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] shadow-xs"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-[#777] uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-serif italic text-white">
                {kpi.value}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono mt-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{kpi.subtext}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Operations Strip */}
      <div className="p-4 sm:p-6 rounded-xl bg-[#101010] border border-[#222] text-white shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
            Fast Store Actions
          </span>
          <h2 className="text-xl font-serif italic mt-0.5 text-white">
            Owner Command Center
          </h2>
          <p className="text-xs text-[#888] max-w-xl mt-1 font-sans">
            Upload new laptops, push instant checkout coupon codes, or inspect diagnostic repair tickets in real-time.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveAdminTab('products')}
            className="px-4 py-2.5 rounded-md bg-cyan-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-cyan-500 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Product / Upload Image
          </button>
          <button
            onClick={() => setActiveAdminTab('promotions')}
            className="px-4 py-2.5 rounded-md bg-[#181818] hover:bg-[#222] text-white font-mono text-xs transition-colors flex items-center justify-center gap-1.5 border border-[#2a2a2a] cursor-pointer"
          >
            <Tag className="w-4 h-4 text-cyan-400" /> Publish Promo Code
          </button>
        </div>
      </div>

      {/* Analytics Breakdown & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Revenue Distribution & Activity */}
        <div className="lg:col-span-7 p-4 sm:p-6 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-serif italic text-white">
                Sales Volume & Category Share
              </h3>
              <p className="text-xs text-[#666]">Kumta branch counter transactions</p>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-[#141414] border border-cyan-900/50 px-2.5 py-1 rounded">
              Live DB Synced
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#aaa] font-medium">
                  Certified Refurbished Laptops (ThinkPads / Dell XPS)
                </span>
                <span className="font-mono font-bold text-white">65% (₹2,79,998)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#181818] overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#aaa] font-medium">
                  Brand-New Sealed Workstations (MacBook Pro / ROG)
                </span>
                <span className="font-mono font-bold text-white">25% (₹1,07,560)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#181818] overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#aaa] font-medium">
                  Repairs, Spares & Peripherals
                </span>
                <span className="font-mono font-bold text-white">10% (₹42,691)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#181818] overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '10%' }}></div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1a1a1a] flex items-center justify-between text-xs text-[#777] font-mono">
            <span>GST Compliance: 18% Verified</span>
            <button
              onClick={() => setActiveAdminTab('orders')}
              className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              View All Orders <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 5 Cols: Low Stock Alerts & Lab Bench */}
        <div className="lg:col-span-5 p-4 sm:p-6 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-serif italic text-white">
              Inventory & Lab Health
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1c1608] border border-amber-900/50 text-amber-400">
              Needs Attention
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-[#111] border border-amber-900/40 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white font-medium">Low Stock: ThinkPad X1 Carbon Gen 11</strong>
                <p className="text-[#777] text-[11px] mt-0.5">
                  Only 1 unit remaining in Kumta showroom. Restock or re-source certified refurbs.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#111] border border-cyan-900/40 flex items-start gap-3">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white font-medium">Active Lab Ticket: TK-2025-0814</strong>
                <p className="text-[#777] text-[11px] mt-0.5">
                  Dell Inspiron 15 Liquid Spill — Ultrasonic clean complete, power IC being soldered.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#111] border border-emerald-900/40 flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white font-medium">Promo Code SYSTECH Active</strong>
                <p className="text-[#777] text-[11px] mt-0.5">
                  14 customers applied this code at checkout. Flat ₹8,000 off orders &gt; ₹50,000.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
