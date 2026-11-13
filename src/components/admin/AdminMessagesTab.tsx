import React, { useState, useEffect } from 'react';
import { ContactMessage } from '../../types.js';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.js';
import {
  MessageSquare,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  Trash2,
  ExternalLink
} from 'lucide-react';

export const AdminMessagesTab: React.FC = () => {
  const { showToast } = useApp();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const data = await api.getMessages();
      setMessages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleMarkRead = async (msgId: string) => {
    try {
      await api.markMessageRead(msgId);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, read: true } : m));
      showToast('Marked as Read', 'Inquiry archived.', 'info');
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
            Customer Inquiries & Desk Messages ({messages.length})
          </h2>
          <p className="text-xs text-[#777] mt-0.5 font-sans">
            Direct messages received from the storefront contact form and model procurement desk.
          </p>
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-[#666] font-mono text-xs">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center text-[#666] font-mono text-xs bg-[#0d0d0d] rounded-xl border border-[#1a1a1a]">
            No customer inquiries yet.
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`p-4 sm:p-6 rounded-xl bg-[#0d0d0d] border shadow-xs transition-all ${
                msg.read
                  ? 'border-[#1a1a1a] opacity-80'
                  : 'border-cyan-900/60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1a1a1a]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#141414] border border-cyan-900/40 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <strong className="text-white text-base block font-serif italic truncate">
                      {msg.name}
                    </strong>
                    <span className="text-xs text-cyan-400 font-mono truncate block">
                      Subject: {msg.subject}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <span className="text-[11px] text-[#666] font-mono">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </span>
                  {!msg.read && (
                    <button
                      onClick={() => handleMarkRead(msg.id)}
                      className="px-3 py-1 rounded-md bg-[#141414] border border-cyan-900/50 hover:bg-[#1a1a1a] text-cyan-400 text-xs font-mono cursor-pointer"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>

              <div className="py-2 text-xs text-[#ccc] leading-relaxed font-sans bg-[#111] border border-[#1e1e1e] p-4 rounded-lg my-3">
                "{msg.message}"
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
                <a
                  href={`tel:${msg.phone}`}
                  className="px-3.5 py-2 rounded-md bg-[#141414] border border-emerald-900/50 text-emerald-400 font-mono flex items-center gap-1.5 hover:border-emerald-500 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Customer ({msg.phone})
                </a>

                {msg.email && (
                  <a
                    href={`mailto:${msg.email}`}
                    className="px-3.5 py-2 rounded-md bg-[#141414] border border-[#222] text-[#bbb] font-mono flex items-center gap-1.5 hover:border-cyan-500 hover:text-white transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" /> Email ({msg.email})
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
