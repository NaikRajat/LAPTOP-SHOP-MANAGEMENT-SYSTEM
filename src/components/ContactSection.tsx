import React, { useState } from 'react';
import { api } from '../services/api.js';
import { useApp } from '../context/AppContext.js';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle,
  MessageSquare,
  ShieldCheck,
  Store
} from 'lucide-react';

export const ContactSection: React.FC = () => {
  const { showToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('Laptop Procurement / Inquiry');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !message) {
      showToast('Missing Info', 'Please enter your name, phone, and message', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.sendMessage({
        name,
        email: email || 'customer@kumta.in',
        phone,
        subject,
        message
      });
      setSubmitted(true);
      showToast('Message Sent', 'Your message has reached our Kumta technician desk.', 'success');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to send message', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10" id="contact">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-5 sm:mb-8">
        <div>
          <span className="text-[11px] sm:text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
            Visit or Message Us
          </span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Connect with Kumta Tech Counter
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#888] mt-1">
            Have questions about laptop models, trade-ins, CCTV installations or custom PC builds? Reach out directly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8">
        {/* Left 5 Cols: Store Details & Map Info */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-[#1a1a1a] shadow-xs space-y-4 sm:space-y-5 transition-colors">
            <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b border-slate-200 dark:border-[#1a1a1a]">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  SYSTECH Computer Solutions
                </h3>
                <p className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
                  Retail Showroom & Diagnostic Lab
                </p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4 text-xs">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 dark:text-white text-xs">Showroom Address</strong>
                  <p className="text-slate-600 dark:text-[#888] leading-relaxed mt-0.5">
                    Main Road, Near Bus Stand Area, Kumta, Uttara Kannada, Karnataka - 581343
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3">
                <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 dark:text-white text-xs">Technician Direct Line</strong>
                  <a
                    href="tel:+919448155198"
                    className="text-cyan-600 dark:text-cyan-400 font-mono font-bold hover:underline"
                  >
                    +91 94481 55198
                  </a>
                  <p className="text-[11px] text-slate-500 dark:text-[#777]">Calls & WhatsApp inquiries welcomed</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3">
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 dark:text-white text-xs">Store & Counter Hours</strong>
                  <p className="text-slate-600 dark:text-[#888]">
                    Monday – Saturday: 9:00 AM – 8:00 PM
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">Sunday: On-Call Support</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3">
                <Mail className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 dark:text-white text-xs">Email Desk</strong>
                  <p className="text-slate-600 dark:text-[#888] font-mono">
                    support@systechsolutions.in
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#1e1e1e] text-xs flex items-center gap-2.5 sm:gap-3">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-xs">Same-Day Walk-ins Welcome</p>
                <p className="text-[11px] text-slate-500 dark:text-[#888]">Bring any faulty laptop for instant bench inspection and quotation.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Contact Form */}
        <div className="lg:col-span-7">
          <div className="p-4 sm:p-6 lg:p-8 rounded-2xl bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-[#1a1a1a] shadow-xs transition-colors">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1">
              Send a Direct Inquiry to the Owner
            </h3>
            <p className="text-xs text-slate-600 dark:text-[#888] mb-4 sm:mb-6">
              Inquire about bulk laptop orders, specific PC configurations, CCTV site visits, or repair updates.
            </p>

            {submitted ? (
              <div className="py-8 sm:py-12 text-center space-y-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Message Delivered!</h4>
                <p className="text-xs text-slate-600 dark:text-[#888] max-w-sm mx-auto">
                  Thank you! Our Kumta technician has received your message and will get back to you shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-3 sm:mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] text-slate-700 dark:text-[#ccc] hover:text-slate-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-[#aaa] font-bold mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#222] focus:border-cyan-500 text-slate-900 dark:text-white outline-none placeholder-slate-400 dark:placeholder-[#555]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-[#aaa] font-bold mb-1">Phone / WhatsApp Number *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 1234567890"
                      className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#222] focus:border-cyan-500 text-slate-900 dark:text-white outline-none placeholder-slate-400 dark:placeholder-[#555]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-[#aaa] font-bold mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="email@mail.com"
                      className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#222] focus:border-cyan-500 text-slate-900 dark:text-white outline-none placeholder-slate-400 dark:placeholder-[#555]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-[#aaa] font-bold mb-1">Inquiry Subject</label>
                    <select
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#222] focus:border-cyan-500 text-slate-900 dark:text-white outline-none"
                    >
                      <option value="Laptop Procurement / Inquiry">Laptop Procurement / Model Request</option>
                      <option value="Accessories & Peripherals">Keyboard / SSD / Accessories Inquiry</option>
                      <option value="CCTV Installation Survey">CCTV Camera Installation Survey</option>
                      <option value="Custom PC Setup">Custom Gaming / Workstation PC Build</option>
                      <option value="Repair / Diagnostic Status">Repair / Diagnostic Question</option>
                      <option value="Corporate / Institution Supply">School / Office IT Supply</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-[#aaa] font-bold mb-1">Your Message / Requirements *</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Tell us what you are looking for (e.g., budget, preferred specs, required turnaround)..."
                    className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#222] focus:border-cyan-500 text-slate-900 dark:text-white outline-none placeholder-slate-400 dark:placeholder-[#555]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-200 dark:disabled:bg-[#222] disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Sending Message...' : 'Submit Inquiry to Desk'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
