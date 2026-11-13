import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../../types.js';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.js';
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  Store,
  Printer,
  ChevronDown,
  Search,
  IndianRupee,
  ShieldCheck,
  User,
  Phone,
  Mail
} from 'lucide-react';

export const AdminOrdersTab: React.FC = () => {
  const { showToast } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await api.updateOrderStatus(orderId, status);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      showToast('Order Status Updated', `Order marked as ${status.replace('_', ' ')}.`, 'success');
    } catch (e: any) {
      showToast('Update Failed', e.message || 'Error updating order status', 'error');
    }
  };

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-[#181408] border border-amber-900/50 text-amber-400';
      case 'processing':
        return 'bg-[#0b141d] border border-blue-900/50 text-blue-400';
      case 'ready_for_pickup':
        return 'bg-[#150d1d] border border-purple-900/50 text-purple-400';
      case 'dispatched':
        return 'bg-[#09171b] border border-cyan-900/50 text-cyan-400';
      case 'delivered':
        return 'bg-[#08180e] border border-emerald-900/50 text-emerald-400';
      case 'cancelled':
        return 'bg-[#1a0c0c] border border-red-900/50 text-red-400';
      default:
        return 'bg-[#141414] border border-[#222] text-[#888]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="bg-[#0d0d0d] p-5 rounded-xl border border-[#1a1a1a] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif italic text-white">
            Customer Orders & Bench Allocations ({filteredOrders.length})
          </h2>
          <p className="text-xs text-[#777] mt-0.5 font-sans">
            Process pickups, courier dispatches, and warranty activations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#666] font-mono">Filter:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md bg-[#080808] text-xs text-white border border-[#222] font-mono outline-none focus:border-cyan-500"
          >
            <option value="all" className="bg-[#111]">All Statuses</option>
            <option value="pending" className="bg-[#111]">Pending</option>
            <option value="processing" className="bg-[#111]">Processing</option>
            <option value="ready_for_pickup" className="bg-[#111]">Ready for Pickup</option>
            <option value="dispatched" className="bg-[#111]">Dispatched</option>
            <option value="delivered" className="bg-[#111]">Delivered</option>
            <option value="cancelled" className="bg-[#111]">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-[#666] font-mono text-xs">
            Loading orders list...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-[#666] font-mono text-xs bg-[#0d0d0d] rounded-xl border border-[#1a1a1a]">
            No customer orders matching this filter.
          </div>
        ) : (
          filteredOrders.map(order => (
            <div
              key={order.id}
              className="p-4 sm:p-6 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] shadow-xs space-y-4"
            >
              {/* Order Meta Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1a1a1a]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#141414] border border-cyan-900/40 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-mono text-sm font-bold text-cyan-400">
                      {order.orderNumber}
                    </span>
                    <p className="text-xs text-[#777] truncate">
                      Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Status Switcher Dropdown */}
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#666] font-mono">Status:</span>
                    <select
                      value={order.status}
                      onChange={e => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold cursor-pointer outline-none ${getStatusBadge(order.status)}`}
                    >
                      <option value="pending" className="bg-[#111]">Pending Verification</option>
                      <option value="processing" className="bg-[#111]">Processing & Allocating</option>
                      <option value="ready_for_pickup" className="bg-[#111]">Ready for Pickup</option>
                      <option value="dispatched" className="bg-[#111]">Dispatched via Courier</option>
                      <option value="delivered" className="bg-[#111]">Delivered & Closed</option>
                      <option value="cancelled" className="bg-[#111]">Cancelled</option>
                    </select>
                  </div>

                  <span className="text-xs font-mono font-bold text-cyan-400 bg-[#141414] border border-cyan-900/40 px-3 py-1.5 rounded-md">
                    ₹{order.total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Customer & Fulfillment Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
                <div className="p-3 rounded-lg bg-[#111] border border-[#1e1e1e]">
                  <span className="text-[10px] uppercase font-mono text-[#666] block mb-1">Customer Info</span>
                  <p className="font-medium text-white">{order.customerName}</p>
                  <p className="text-[#777] text-[11px] font-mono">{order.customerPhone}</p>
                  <p className="text-[#777] text-[11px] truncate font-mono">{order.customerEmail}</p>
                </div>

                <div className="p-3 rounded-lg bg-[#111] border border-[#1e1e1e]">
                  <span className="text-[10px] uppercase font-mono text-[#666] block mb-1">Fulfillment Mode</span>
                  <div className="flex items-center gap-1.5 font-medium text-white">
                    {order.fulfillment === 'pickup' ? (
                      <>
                        <Store className="w-4 h-4 text-emerald-400" />
                        <span>Kumta Store Counter Pickup</span>
                      </>
                    ) : (
                      <>
                        <Truck className="w-4 h-4 text-cyan-400" />
                        <span>Karnataka Express Courier</span>
                      </>
                    )}
                  </div>
                  <p className="text-[#777] text-[11px] mt-0.5 font-mono">
                    {order.address || 'Direct counter collection at Kumta branch'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#111] border border-[#1e1e1e]">
                  <span className="text-[10px] uppercase font-mono text-[#666] block mb-1">Payment & Discounts</span>
                  <p className="font-medium text-white capitalize">
                    {order.paymentMethod?.replace('_', ' ') || 'Pay on Pickup'}
                  </p>
                  {order.promoCodeUsed && (
                    <p className="text-emerald-400 font-mono text-[11px] mt-0.5">
                      Applied Code: {order.promoCodeUsed} (-₹{order.discount?.toLocaleString('en-IN')})
                    </p>
                  )}
                </div>
              </div>

              {/* Items in Order */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] uppercase font-mono text-[#666] tracking-wider">
                  Hardware Ordered ({order.items.length} items)
                </span>
                <div className="divide-y divide-[#161616]">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-[#141414] border border-[#222] p-1 shrink-0 flex items-center justify-center">
                          <img src={it.image} alt={it.title} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <strong className="text-white block font-serif italic">{it.title}</strong>
                          <span className="text-[11px] text-[#777] font-mono">
                            SKU: {it.sku} • Qty: {it.quantity}
                          </span>
                          {it.extendedCare && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-[#141414] border border-cyan-900/50 text-cyan-400 font-mono text-[10px]">
                              + 2-Yr Care Plan
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-serif italic text-cyan-400">
                        ₹{(it.price * it.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
