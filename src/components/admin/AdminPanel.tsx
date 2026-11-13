import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingBag,
  Wrench,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Bell,
  RefreshCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { AdminDashboardTab } from './AdminDashboardTab.js';
import { AdminProductsTab } from './AdminProductsTab.js';
import { AdminPromotionsTab } from './AdminPromotionsTab.js';
import { AdminOrdersTab } from './AdminOrdersTab.js';
import { AdminRepairsTab } from './AdminRepairsTab.js';
import { AdminMessagesTab } from './AdminMessagesTab.js';
import { AdminTestsTab } from './AdminTestsTab.js';

export const AdminPanel: React.FC = () => {
  const {
    setCurrentView,
    activeAdminTab,
    setActiveAdminTab,
    user
  } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Analytics & KPIs', icon: LayoutDashboard },
    { id: 'products', label: 'Inventory & Gadgets', icon: Package },
    { id: 'promotions', label: 'Promos & Discount Codes', icon: Tag },
    { id: 'orders', label: 'Customer Orders', icon: ShoppingBag },
    { id: 'repairs', label: 'Lab Repair Bench', icon: Wrench },
    { id: 'messages', label: 'Customer Inquiries', icon: MessageSquare },
    { id: 'tests', label: 'Automated Test Suite', icon: Sparkles }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Admin Top Navigation & Status Bar */}
        <div className="bg-[#0d0d0d] rounded-xl p-5 sm:p-6 border border-[#1a1a1a] shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('store')}
              className="px-3 py-2 rounded-md bg-[#161616] border border-[#262626] text-[#ccc] hover:text-white hover:bg-[#202020] transition-colors flex items-center gap-1.5 text-xs font-mono"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>Back to Store</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-[#141414] border border-cyan-900/50 text-cyan-400 font-mono font-bold text-[10px] uppercase tracking-wider">
                  Store Owner Control Center
                </span>
                <span className="text-xs text-[#666] font-mono hidden sm:inline">Kumta Branch Hub</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-serif italic text-white mt-1">
                SysTech Management Portal
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs bg-[#111] px-3.5 py-2 rounded-md border border-[#222] flex items-center gap-2 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[#888]">
                Logged in as <strong className="text-white font-sans">{user?.name || 'Administrator'}</strong>
              </span>
            </div>

            <button
              onClick={() => setCurrentView('store')}
              className="px-3.5 py-2 rounded-md bg-[#161616] border border-[#262626] text-[#bbb] hover:text-white hover:bg-[#202020] text-xs font-mono transition-colors cursor-pointer"
            >
              View Storefront
            </button>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeAdminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveAdminTab(item.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-950/40'
                    : 'bg-[#0d0d0d] text-[#777] hover:text-white border border-[#1a1a1a] hover:border-[#2a2a2a]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="animate-in fade-in duration-150">
          {activeAdminTab === 'dashboard' && <AdminDashboardTab />}
          {activeAdminTab === 'products' && <AdminProductsTab />}
          {activeAdminTab === 'promotions' && <AdminPromotionsTab />}
          {activeAdminTab === 'orders' && <AdminOrdersTab />}
          {activeAdminTab === 'repairs' && <AdminRepairsTab />}
          {activeAdminTab === 'messages' && <AdminMessagesTab />}
          {activeAdminTab === 'tests' && <AdminTestsTab />}
        </div>
      </div>
    </div>
  );
};
