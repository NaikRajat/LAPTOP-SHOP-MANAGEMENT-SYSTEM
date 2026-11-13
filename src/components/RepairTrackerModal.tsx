import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { api } from '../services/api.js';
import { RepairTicket } from '../types.js';
import {
  X,
  Search,
  CheckCircle,
  Clock,
  Wrench,
  Cpu,
  ShieldCheck,
  Phone,
  AlertCircle
} from 'lucide-react';

export const RepairTrackerModal: React.FC = () => {
  const { isRepairTrackerOpen, setIsRepairTrackerOpen } = useApp();
  const [searchQuery, setSearchQuery] = useState('TK-2025-0814');
  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTicket = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getRepairTicket(q.trim());
      if (res) {
        setTicket(res);
      } else {
        setError('No repair ticket found with that reference. Please verify the ID or contact the store.');
        setTicket(null);
      }
    } catch (e: any) {
      setError(e.message || 'Error looking up repair status');
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isRepairTrackerOpen) {
      fetchTicket(searchQuery);
    }
  }, [isRepairTrackerOpen]);

  if (!isRepairTrackerOpen) return null;

  const stages = [
    { key: 'received', label: '1. Received & Barcoded' },
    { key: 'diagnosing', label: '2. Diagnostic Bench Testing' },
    { key: 'in_progress', label: '3. Chip-Level Soldering / Spares' },
    { key: 'testing', label: '4. Quality & Thermal Burn-In' },
    { key: 'ready', label: '5. Ready for Counter Pickup' }
  ];

  const getStageIndex = (status: string) => {
    switch (status) {
      case 'received': return 0;
      case 'diagnosing': return 1;
      case 'in_progress': return 2;
      case 'testing': return 3;
      case 'ready':
      case 'completed': return 4;
      default: return 0;
    }
  };

  const currentStageIndex = ticket ? getStageIndex(ticket.status) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-xl bg-[#0d0d0d] text-[#e0e0e0] rounded-xl shadow-2xl border border-[#1a1a1a] overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#1a1a1a] bg-[#080808] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#161616] border border-[#262626] text-cyan-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-serif italic text-white">
                Live Repair Tracker
              </h3>
              <p className="text-xs text-[#777]">Kumta Laboratory Bench Status</p>
            </div>
          </div>
          <button
            onClick={() => setIsRepairTrackerOpen(false)}
            className="w-8 h-8 rounded-full bg-[#181818] border border-[#262626] flex items-center justify-center text-[#777] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-5 border-b border-[#1a1a1a] bg-[#0a0a0a]">
          <form
            onSubmit={e => {
              e.preventDefault();
              fetchTicket(searchQuery);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value.toUpperCase())}
              placeholder="Search Ticket ID (e.g. TK-2025-0814)..."
              className="flex-1 px-4 py-2 text-xs bg-[#050505] border border-[#222] rounded-md font-mono uppercase text-white focus:border-cyan-500 outline-none placeholder-[#555]"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-[#222] text-white font-bold text-xs uppercase tracking-wider rounded-md shadow-sm transition-colors"
            >
              {loading ? 'Searching...' : 'Lookup'}
            </button>
          </form>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs">
          {error && (
            <div className="p-4 rounded-lg bg-[#1a0f0f] border border-red-900/50 text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {ticket && (
            <div className="space-y-5">
              {/* Ticket Meta Card */}
              <div className="p-4 rounded-lg bg-[#111] border border-[#1e1e1e] space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-bold text-sm text-cyan-400">
                      {ticket.ticketNumber}
                    </span>
                    <h4 className="font-serif italic text-base text-white mt-0.5">
                      {ticket.brandModel} ({ticket.deviceType})
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1c1608] border border-amber-900/50 text-amber-400">
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-[11px] text-[#888] pt-1">
                  <span className="font-semibold text-white">Reported Issue:</span>{' '}
                  {ticket.issueDescription}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1e1e1e] font-mono text-[11px]">
                  <div>
                    <span className="text-[#666]">Technician:</span>{' '}
                    <span className="text-white font-semibold">{ticket.technician || 'Senior Lab Tech'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#666]">Est. Cost:</span>{' '}
                    <span className="text-emerald-400 font-bold">₹{ticket.estimatedCost?.toLocaleString('en-IN') || 'TBD'}</span>
                  </div>
                </div>
              </div>

              {/* Progress Stepper */}
              <div>
                <h5 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#666] mb-4">
                  Diagnostic & Service Progression
                </h5>

                <div className="space-y-4">
                  {stages.map((stage, idx) => {
                    const isDone = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;

                    return (
                      <div key={stage.key} className="flex items-start gap-3 relative">
                        {idx < stages.length - 1 && (
                          <div
                            className={`absolute left-3.5 top-7 w-0.5 h-7 ${
                              idx < currentStageIndex
                                ? 'bg-emerald-500/80'
                                : 'bg-[#222]'
                            }`}
                          ></div>
                        )}

                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${
                            isCurrent
                              ? 'bg-cyan-500 text-black ring-4 ring-cyan-500/20 font-bold'
                              : isDone
                              ? 'bg-[#151515] border border-emerald-900/60 text-emerald-400'
                              : 'bg-[#141414] border border-[#222] text-[#555]'
                          }`}
                        >
                          {isDone && !isCurrent ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <span className="font-mono text-xs">{idx + 1}</span>
                          )}
                        </div>

                        <div className="pt-1 flex-1">
                          <span
                            className={`font-semibold ${
                              isCurrent
                                ? 'text-cyan-400 font-serif italic text-sm'
                                : isDone
                                ? 'text-white'
                                : 'text-[#666]'
                            }`}
                          >
                            {stage.label}
                          </span>
                          {isCurrent && (
                            <p className="text-[11px] text-[#777] mt-0.5 font-sans">
                              Active at Kumta station. Bench diagnostics running.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1a1a1a] bg-[#080808] flex flex-wrap items-center justify-between gap-2">
          <a
            href="tel:+919448155198"
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" /> Call Tech Desk (+91 94481 55198)
          </a>
          <button
            onClick={() => setIsRepairTrackerOpen(false)}
            className="px-4 py-2 rounded-md bg-[#161616] border border-[#262626] hover:bg-[#202020] text-[#aaa] hover:text-white text-xs font-mono transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
