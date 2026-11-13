import React, { useState, useEffect } from 'react';
import { RepairTicket, RepairStatus } from '../../types.js';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.js';
import {
  Wrench,
  Clock,
  CheckCircle,
  Cpu,
  Phone,
  User,
  AlertCircle,
  Save
} from 'lucide-react';

export const AdminRepairsTab: React.FC = () => {
  const { showToast } = useApp();
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await api.getRepairTickets();
      setTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleStatusChange = async (ticketId: string, status: RepairStatus) => {
    try {
      await api.updateRepairTicket(ticketId, { status });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
      showToast('Repair Stage Updated', `Ticket moved to ${status.replace('_', ' ')}.`, 'success');
    } catch (e: any) {
      showToast('Error', e.message, 'error');
    }
  };

  const handleUpdateCost = async (ticketId: string, cost: number) => {
    try {
      await api.updateRepairTicket(ticketId, { estimatedCost: cost });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, estimatedCost: cost } : t));
      showToast('Cost Updated', `Ticket cost updated to ₹${cost}.`, 'info');
    } catch (e: any) {
      showToast('Error', e.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0d0d0d] p-5 rounded-xl border border-[#1a1a1a] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif italic text-white">
            Kumta Clean Lab Repair Bench ({tickets.length})
          </h2>
          <p className="text-xs text-[#777] mt-0.5 font-sans">
            Real-time diagnostic staging, oscilloscope findings, and pickup notifications.
          </p>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-[#666] font-mono text-xs">
            Loading active repair bench tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center text-[#666] font-mono text-xs bg-[#0d0d0d] rounded-xl border border-[#1a1a1a]">
            No active repair tickets logged.
          </div>
        ) : (
          tickets.map(ticket => (
            <div
              key={ticket.id}
              className="p-4 sm:p-6 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1a1a1a]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#141414] border border-cyan-900/40 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-mono text-sm font-bold text-cyan-400">
                      {ticket.ticketNumber}
                    </span>
                    <h3 className="font-serif italic text-base text-white truncate">
                      {ticket.brandModel} ({ticket.deviceType})
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={ticket.status}
                    onChange={e => handleStatusChange(ticket.id, e.target.value as RepairStatus)}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-md text-xs font-mono font-bold bg-[#141414] border border-cyan-900/40 text-cyan-400 outline-none cursor-pointer"
                  >
                    <option value="received" className="bg-[#111]">1. Received & Barcoded</option>
                    <option value="diagnosing" className="bg-[#111]">2. Diagnostic Bench Testing</option>
                    <option value="in_progress" className="bg-[#111]">3. Chip Soldering / Spares</option>
                    <option value="testing" className="bg-[#111]">4. Quality & Thermal Burn-In</option>
                    <option value="ready" className="bg-[#111]">5. Ready for Customer Pickup</option>
                    <option value="completed" className="bg-[#111]">Completed & Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
                <div className="p-3 rounded-lg bg-[#111] border border-[#1e1e1e]">
                  <span className="text-[10px] uppercase font-mono text-[#666] block mb-1">Customer Contact</span>
                  <p className="font-medium text-white">{ticket.customerName}</p>
                  <a href={`tel:${ticket.customerPhone}`} className="text-cyan-400 font-mono flex items-center gap-1 mt-0.5 hover:underline">
                    <Phone className="w-3.5 h-3.5" /> {ticket.customerPhone}
                  </a>
                </div>

                <div className="p-3 rounded-lg bg-[#111] border border-[#1e1e1e]">
                  <span className="text-[10px] uppercase font-mono text-[#666] block mb-1">Reported Problem</span>
                  <p className="text-[#bbb] font-normal">{ticket.issueDescription}</p>
                </div>

                <div className="p-3 rounded-lg bg-[#111] border border-[#1e1e1e] flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-mono text-[#666] block mb-1">Service & Parts Cost (₹)</span>
                  <div className="flex items-center gap-2">
                    <span className="font-serif italic text-base text-cyan-400">
                      ₹{ticket.estimatedCost?.toLocaleString('en-IN') || 0}
                    </span>
                    <button
                      onClick={() => {
                        const newCost = prompt('Enter new service cost (₹):', String(ticket.estimatedCost || 0));
                        if (newCost !== null) handleUpdateCost(ticket.id, Number(newCost));
                      }}
                      className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline uppercase tracking-wider"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
