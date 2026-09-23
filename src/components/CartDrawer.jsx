import { useState } from 'react';
import { X, Plus, Minus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';

export default function CartDrawer({ open, onClose }) {
  const { success: toastSuccess, error: toastError } = useToast();
  const { items, updateQty, removeItem, total, clearCart } = useCart();
  const { settings } = useSettings();
  const [step, setStep] = useState('cart'); // cart | checkout | success
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  const close = () => {
    onClose();
    setTimeout(() => {
      setStep('cart');
      setError('');
    }, 300);
  };

  const whatsappUrl = (order) => {
    let msg = `Hello RAINORA! I just placed an order:%0A%0A`;
    order.items.forEach((i) => {
      msg += `- ${i.name} | Size: ${i.size} | Qty: ${i.qty} | ${i.price * i.qty}TK%0A`;
    });

    msg += `%0ATotal: ${order.total}TK%0AName: ${order.customer_name}%0APhone: ${order.customer_phone}%0AAddress: ${order.customer_address}%0A%0APlease confirm availability.`;
    return `https://wa.me/${settings.whatsapp}?text=${msg}`;
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('Please fill in your name, phone and address.');
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.name.trim(),
          customer_phone: form.phone.trim(),
          customer_address: form.address.trim(),
          items: items.map((i) => ({
            product_id: i.id,
            name: i.name,
            brand: i.brand,
            price: i.price,
            size: i.size,
            qty: i.qty,
          })),
          total,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');
      setLastOrder(data);
      clearCart();
      setStep('success');
      toastSuccess(`Order #${data.id} placed successfully!`);
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div
        onClick={close}
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`absolute top-0 right-0 h-full w-full max-w-md bg-neutral-950 border-l border-white/10 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <h2 className="text-lg font-serif tracking-wide text-white">
            {step === 'cart' ? 'Your Bag' : step === 'checkout' ? 'Checkout' : 'Order Placed'}
          </h2>
          <button onClick={close} className="text-neutral-400 hover:text-orange-500">
            <X size={22} />
          </button>
        </div>

        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.length === 0 && (
                <p className="text-neutral-500 text-sm mt-10 text-center">Your bag is empty.</p>
              )}
              {items.map((item) => (
                <div key={item.key} className="flex gap-3 border-b border-white/5 pb-4">
                  <img src={item.image_url} alt={item.name} className="w-16 h-20 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.name}</p>
                    <p className="text-xs text-neutral-500">{item.brand} &middot; Size {item.size}</p>
                    <p className="text-orange-500 text-sm mt-1">{item.price}TK</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQty(item.key, item.qty - 1)}
                        className="w-6 h-6 flex items-center justify-center border border-white/20 text-white rounded hover:border-orange-500"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm text-white w-4 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.key, item.qty + 1)}
                        className="w-6 h-6 flex items-center justify-center border border-white/20 text-white rounded hover:border-orange-500"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => removeItem(item.key)}
                        className="ml-auto text-neutral-500 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="px-6 py-5 border-t border-white/10 space-y-3">
                <div className="flex justify-between text-white">
                  <span>Total</span>
                  <span className="text-orange-500 font-semibold">{total}TK</span>
                </div>
                <button
                  onClick={() => setStep('checkout')}
                  className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-black font-semibold py-3 rounded transition-colors"
                >
                  Checkout
                </button>
                <button
                  onClick={clearCart}
                  className="w-full text-center text-xs text-neutral-500 hover:text-neutral-300 py-1"
                >
                  Clear Bag
                </button>
              </div>
            )}
          </>
        )}

        {step === 'checkout' && (
          <form onSubmit={handlePlaceOrder} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col">
            <p className="text-neutral-500 text-sm mb-4">
              Enter your details and we'll confirm your order by phone or WhatsApp.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-neutral-400 text-xs uppercase tracking-wide">Full Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-neutral-400 text-xs uppercase tracking-wide">Phone Number</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div>
                <label className="text-neutral-400 text-xs uppercase tracking-wide">Delivery Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  rows={3}
                  className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm resize-none"
                  placeholder="House, road, area, city"
                />
              </div>
            </div>

            <div className="mt-6 bg-neutral-900 border border-white/10 p-4 text-sm">
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>{items.length} item(s)</span>
                <span>{total}TK</span>
              </div>
              <div className="flex justify-between text-white font-semibold">
                <span>Total</span>
                <span className="text-orange-500">{total}TK</span>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

            <div className="mt-auto pt-6 space-y-2">
              <button
                type="submit"
                disabled={placing}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-black font-semibold py-3 transition-colors"
              >
                {placing ? <Loader2 size={16} className="animate-spin" /> : null}
                {placing ? 'Placing Order...' : 'Place Order'}
              </button>
              <button
                type="button"
                onClick={() => setStep('cart')}
                className="w-full text-center text-xs text-neutral-500 hover:text-neutral-300 py-1"
              >
                &larr; Back to Bag
              </button>
            </div>
          </form>
        )}

        {step === 'success' && lastOrder && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
            <CheckCircle2 size={48} className="text-orange-500 mb-4" />
            <h3 className="text-white text-lg font-serif mb-2">Your Order is Placed!</h3>
            <p className="text-neutral-400 text-sm mb-6">
              We've received your order. Our team will contact you shortly to confirm.
            </p>
            <a
              href={whatsappUrl(lastOrder)}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-orange-500 hover:bg-orange-600 text-black font-semibold py-3 transition-colors mb-2"
            >
              Confirm via WhatsApp
            </a>
            <button
              onClick={close}
              className="w-full text-center text-xs text-neutral-500 hover:text-neutral-300 py-2"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
