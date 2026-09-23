import { useEffect, useState } from 'react';
import { Loader2, Phone, MapPin } from 'lucide-react';
import { authFetch } from '../../lib/adminApi';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/customers')
      .then((r) => r.json())
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-serif mb-1">Customers</h1>
        <p className="text-neutral-500 text-sm">
          Automatically built from your orders \u2014 every unique phone number becomes a customer
          record.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-500 py-20 justify-center">
          <Loader2 className="animate-spin" size={18} /> Loading customers...
        </div>
      ) : customers.length === 0 ? (
        <p className="text-neutral-500 text-center py-20">No customers yet \u2014 they'll appear here after your first order.</p>
      ) : (
        <div className="bg-neutral-950 border border-white/10 divide-y divide-white/5">
          {customers.map((c) => (
            <div key={c.phone} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-[160px]">
                <p className="text-white text-sm">{c.name}</p>
                <p className="text-neutral-500 text-xs flex items-center gap-1 mt-0.5">
                  <Phone size={11} /> {c.phone}
                </p>
              </div>
              <div className="text-neutral-500 text-xs flex items-center gap-1 flex-1 min-w-[180px]">
                <MapPin size={11} className="shrink-0" />
                <span className="truncate">{c.address}</span>
              </div>
              <div className="text-center w-20">
                <p className="text-white text-sm">{c.order_count}</p>
                <p className="text-neutral-600 text-[10px] uppercase">Orders</p>
              </div>
              <div className="text-center w-24">
                <p className="text-orange-500 text-sm">{c.total_spent}TK</p>
                <p className="text-neutral-600 text-[10px] uppercase">Spent</p>
              </div>
              <div className="text-neutral-500 text-xs w-24 text-right">
                {new Date(c.last_order_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
