import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Trash2, Search, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { authFetch } from '../../lib/adminApi';
import { ORDER_STATUSES, statusColor } from '../../lib/constants';
import { useToast } from '../../contexts/ToastContext';

export default function AdminOrders() {
  const { success, error: toastError, info: toastInfo } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/orders');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      const res = await authFetch('/api/orders', {
        method: 'PUT',
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      success(`Order #${id} status updated to ${status}`);
    } catch (err) {
      toastError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteSingleOrder = async (id) => {
    if (!window.confirm(`Are you sure you want to delete order #${id}?`)) return;
    setDeletingId(id);
    try {
      const res = await authFetch('/api/orders', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete order');
      setOrders((prev) => prev.filter((o) => o.id !== id));
      setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
      success(`Order #${id} deleted successfully`);
    } catch (err) {
      toastError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const deleteSelectedOrders = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!window.confirm(`Are you sure you want to delete ${count} selected order(s)?`)) return;
    setBulkDeleting(true);
    try {
      const res = await authFetch('/api/orders', {
        method: 'DELETE',
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error('Failed to delete selected orders');
      setOrders((prev) => prev.filter((o) => !selectedIds.includes(o.id)));
      setSelectedIds([]);
      success(`${count} order(s) deleted successfully`);
    } catch (err) {
      toastError(err.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const clearOrdersByStatus = async (status) => {
    const count = orders.filter((o) => o.status === status).length;
    if (count === 0) {
      toastInfo(`There are no ${status} orders to clear.`);
      return;
    }
    if (!window.confirm(`Are you sure you want to clear all ${count} ${status} order(s)?`)) return;
    setBulkDeleting(true);
    try {
      const res = await authFetch('/api/orders', {
        method: 'DELETE',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`Failed to clear ${status} orders`);
      setOrders((prev) => prev.filter((o) => o.status !== status));
      setSelectedIds([]);
      success(`All ${status} orders cleared (${count} orders)`);
    } catch (err) {
      toastError(err.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const clearAllOrders = async () => {
    const count = orders.length;
    if (count === 0) return;
    if (!window.confirm(`Are you sure you want to delete ALL ${count} orders? This cannot be undone!`)) return;
    setBulkDeleting(true);
    try {
      const res = await authFetch('/api/orders', {
        method: 'DELETE',
        body: JSON.stringify({ clearAll: true }),
      });
      if (!res.ok) throw new Error('Failed to clear all orders');
      setOrders([]);
      setSelectedIds([]);
      success(`All ${count} orders deleted successfully`);
    } catch (err) {
      toastError(err.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelectAll = (filteredList) => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map((o) => o.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = o.customer_name?.toLowerCase().includes(q);
      const matchPhone = o.customer_phone?.toLowerCase().includes(q);
      const matchAddress = o.customer_address?.toLowerCase().includes(q);
      const matchId = String(o.id).includes(q);
      return matchName || matchPhone || matchAddress || matchId;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-serif mb-1">Orders</h1>
          <p className="text-neutral-500 text-sm">
            Track, update, or clear orders that have piled up.
          </p>
        </div>

        {/* Quick clear buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => clearOrdersByStatus('Delivered')}
            disabled={bulkDeleting || orders.filter((o) => o.status === 'Delivered').length === 0}
            className="text-xs px-3 py-1.5 rounded bg-neutral-900 border border-white/10 text-neutral-300 hover:text-white hover:border-white/20 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Clear Delivered ({orders.filter((o) => o.status === 'Delivered').length})
          </button>
          <button
            onClick={() => clearOrdersByStatus('Cancelled')}
            disabled={bulkDeleting || orders.filter((o) => o.status === 'Cancelled').length === 0}
            className="text-xs px-3 py-1.5 rounded bg-neutral-900 border border-white/10 text-neutral-300 hover:text-white hover:border-white/20 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Clear Cancelled ({orders.filter((o) => o.status === 'Cancelled').length})
          </button>
          <button
            onClick={clearAllOrders}
            disabled={bulkDeleting || orders.length === 0}
            className="text-xs px-3 py-1.5 rounded bg-red-950/30 border border-red-500/30 text-red-400 hover:bg-red-900/40 hover:text-red-300 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs uppercase tracking-wide border rounded transition-colors ${
              statusFilter === 'all'
                ? 'bg-orange-500 border-orange-500 text-black font-semibold'
                : 'border-white/10 text-neutral-400 hover:text-white'
            }`}
          >
            All ({orders.length})
          </button>
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs uppercase tracking-wide border rounded transition-colors ${
                statusFilter === s
                  ? 'bg-orange-500 border-orange-500 text-black font-semibold'
                  : 'border-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              {s} ({orders.filter((o) => o.status === s).length})
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-neutral-900 border border-white/10 text-white text-xs outline-none focus:border-orange-500 w-full sm:w-48 rounded"
          />
        </div>
      </div>

      {/* Bulk action toolbar when items are selected */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-orange-950/30 border border-orange-500/30 px-4 py-2.5 rounded-lg text-xs">
          <span className="text-orange-300 font-medium">
            {selectedIds.length} order(s) selected
          </span>
          <button
            onClick={deleteSelectedOrders}
            disabled={bulkDeleting}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-semibold transition-colors cursor-pointer"
          >
            {bulkDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Delete Selected
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-500 py-20 justify-center">
          <Loader2 className="animate-spin" size={18} /> Loading orders...
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 bg-neutral-950 border border-white/10 rounded-lg text-neutral-500">
          <p className="text-sm">No orders found.</p>
        </div>
      ) : (
        <div className="bg-neutral-950 border border-white/10 divide-y divide-white/5 rounded-lg overflow-hidden">
          {/* Select all header */}
          <div className="px-5 py-3 bg-white/[0.02] flex items-center justify-between text-xs text-neutral-400">
            <button
              onClick={() => toggleSelectAll(sorted)}
              className="flex items-center gap-2 text-neutral-400 hover:text-white cursor-pointer"
            >
              {selectedIds.length === sorted.length && sorted.length > 0 ? (
                <CheckSquare size={16} className="text-orange-500" />
              ) : (
                <Square size={16} />
              )}
              <span>Select All Displayed ({sorted.length})</span>
            </button>
            <span className="text-[11px] text-neutral-600">Click row to view details &middot; Trash icon to delete</span>
          </div>

          {sorted.map((o) => {
            const isOpen = expandedId === o.id;
            const isSelected = selectedIds.includes(o.id);
            const isDeletingThis = deletingId === o.id;

            return (
              <div key={o.id} className={isSelected ? 'bg-orange-500/5' : ''}>
                <div className="flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  {/* Selection Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectOne(o.id);
                    }}
                    className="text-neutral-500 hover:text-white cursor-pointer shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare size={16} className="text-orange-500" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>

                  {/* Order info click target */}
                  <div
                    onClick={() => setExpandedId(isOpen ? null : o.id)}
                    className="flex-1 min-w-0 flex flex-wrap items-center gap-4 cursor-pointer"
                  >
                    <span className="text-neutral-500 text-xs w-12 font-mono">#{o.id}</span>
                    <div className="flex-1 min-w-[140px]">
                      <p className="text-white text-sm font-medium">{o.customer_name}</p>
                      <p className="text-neutral-500 text-xs">{o.customer_phone}</p>
                    </div>
                    <span className="text-neutral-500 text-xs w-24">
                      {new Date(o.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-orange-500 text-sm font-semibold w-20">{o.total}TK</span>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={o.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateStatus(o.id, e.target.value);
                    }}
                    disabled={updatingId === o.id}
                    className={`text-xs border rounded px-2 py-1.5 bg-neutral-900 outline-none cursor-pointer ${statusColor(o.status)}`}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  {/* Single Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSingleOrder(o.id);
                    }}
                    disabled={isDeletingThis}
                    title="Delete order"
                    className="text-neutral-500 hover:text-red-400 p-1.5 rounded transition-colors cursor-pointer"
                  >
                    {isDeletingThis ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>

                  {/* Expand Chevron */}
                  <button
                    onClick={() => setExpandedId(isOpen ? null : o.id)}
                    className="text-neutral-500 hover:text-white p-1"
                  >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Expanded Details */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 bg-black/40 border-t border-white/5 space-y-2.5">
                    <p className="text-neutral-400 text-xs">
                      Delivery Address: <span className="text-neutral-200">{o.customer_address}</span>
                    </p>
                    <div className="space-y-1.5 bg-neutral-900/60 p-3 rounded border border-white/5">
                      {(o.items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-neutral-300">
                          <span>
                            {item.name} &middot; <span className="text-orange-400 font-mono">Size {item.size}</span> &middot; Qty {item.qty}
                          </span>
                          <span className="font-mono text-white">{item.price * item.qty}TK</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
