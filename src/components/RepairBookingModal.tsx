import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { api } from '../services/api.js';
import { X, Wrench, CheckCircle, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

export const RepairBookingModal: React.FC = () => {
  const { isRepairModalOpen, setIsRepairModalOpen, user, showToast } = useApp();

  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [deviceType, setDeviceType] = useState('Laptop');
  const [brandModel, setBrandModel] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('₹1,500 - ₹3,500 (Diagnostic Free)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<any | null>(null);

  if (!isRepairModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !brandModel || !issueDescription) {
      showToast('Incomplete', 'Please fill in all required fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticket = await api.createRepairTicket({
        customerName,
        customerPhone,
        customerEmail: user?.email || '',
        deviceType,
        brandModel,
        issueDescription,
        estimatedCost: 2500
      });
      setCreatedTicket(ticket);
      showToast('Repair Ticket Created', `Ticket ${ticket.ticketNumber} registered successfully.`, 'success');
    } catch (e: any) {
      showToast('Booking Failed', e.message || 'Error creating ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#0d0d0d] text-[#e0e0e0] rounded-xl shadow-2xl border border-[#1a1a1a] overflow-hidden my-auto">
        {createdTicket ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-serif italic text-white">
              Repair Booked at Kumta Lab!
            </h3>
            <p className="text-xs text-[#777]">
              Bring your device to Systech Computer Solutions, Kumta for complimentary initial bench inspection.
            </p>

            <div className="p-4 rounded-lg bg-[#121212] font-mono text-xs text-left space-y-2 border border-[#222]">
              <div className="flex justify-between">
                <span className="text-[#666]">Ticket Number:</span>
                <strong className="text-cyan-400 text-sm">{createdTicket.ticketNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">Device:</span>
                <span className="font-sans font-medium text-white">{createdTicket.brandModel} ({createdTicket.deviceType})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">Initial Status:</span>
                <span className="text-amber-400 font-bold">Received & Logged</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">Store Hours:</span>
                <span className="text-[#aaa]">Mon - Sat: 9 AM - 8 PM</span>
              </div>
            </div>

            <button
              onClick={() => {
                setCreatedTicket(null);
                setIsRepairModalOpen(false);
              }}
              className="w-full py-3 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-colors"
            >
              Done & Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#161616] border border-[#262626] text-cyan-400 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif italic text-white">
                    Book Lab Diagnostics & Repair
                  </h3>
                  <p className="text-xs text-[#777]">Kumta Technician Bench Assignment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRepairModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#181818] border border-[#262626] flex items-center justify-center text-[#777] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#080808] border border-[#222] text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                  />
                </div>
                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Mobile / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="+91 1234567890"
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#080808] border border-[#222] text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Device Category *</label>
                  <select
                    value={deviceType}
                    onChange={e => setDeviceType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#080808] border border-[#222] text-white focus:border-cyan-500 outline-none"
                  >
                    <option value="Laptop" className="bg-[#111]">Laptop / MacBook</option>
                    <option value="Desktop PC" className="bg-[#111]">Desktop / Workstation</option>
                    <option value="Display / Monitor" className="bg-[#111]">Monitor / LCD Panel</option>
                    <option value="Motherboard" className="bg-[#111]">Standalone Motherboard</option>
                    <option value="Data Recovery" className="bg-[#111]">Storage / SSD Recovery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#aaa] font-medium mb-1">Brand & Model *</label>
                  <input
                    type="text"
                    required
                    value={brandModel}
                    onChange={e => setBrandModel(e.target.value)}
                    placeholder="e.g. Dell Inspiron 15 / Apple M1"
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#080808] border border-[#222] text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#aaa] font-medium mb-1">Issue Description / Symptoms *</label>
                <textarea
                  required
                  rows={3}
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  placeholder="Describe the issue (e.g. No display, blue screen of death, liquid spill, broken hinge, slow performance)..."
                  className="w-full px-3.5 py-2.5 rounded-md bg-[#080808] border border-[#222] text-white focus:border-cyan-500 outline-none placeholder-[#555]"
                />
              </div>

              {/* Service guarantee banner */}
              <div className="p-3 rounded-lg bg-[#111] border border-[#1e1e1e] text-[#888] text-[11px] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Zero diagnostic fees if repair is approved. Genuine OEM components with 90-day warranty.</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:bg-[#222] disabled:text-[#555] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-cyan-950/40 transition-all flex items-center justify-center gap-2"
              >
                <Wrench className="w-4 h-4" />
                {isSubmitting ? 'Registering Ticket...' : 'Confirm Lab Booking'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
