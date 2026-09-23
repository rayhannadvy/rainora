import { useEffect, useState } from 'react';
import { Save, Loader2, Tag, Percent, XCircle, Search } from 'lucide-react';
import { authFetch } from '../../lib/adminApi';
import { useToast } from '../../contexts/ToastContext';

export default function AdminOffers() {
  const { success, error: toastError } = useToast();
  const [products, setProducts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [banner, setBanner] = useState({ offer_banner_title: '', offer_banner_subtitle: '' });
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerSaved, setBannerSaved] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'active'
  const [search, setSearch] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    const [prodRes, settingsRes] = await Promise.all([fetch('/api/products'), fetch('/api/settings')]);
    const prodData = await prodRes.json();
    const settingsData = await settingsRes.json();
    const list = Array.isArray(prodData) ? prodData : [];
    setProducts(list);
    setDrafts(
      Object.fromEntries(
        list.map((p) => [
          p.id,
          {
            original_price: p.original_price != null ? p.original_price : '',
            price: p.price != null ? p.price : '',
          },
        ])
      )
    );
    setBanner({
      offer_banner_title: settingsData?.offer_banner_title || 'Special Offers',
      offer_banner_subtitle: settingsData?.offer_banner_subtitle || '',
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleDraftChange = (productId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [field]: value,
      },
    }));
  };

  const saveDiscount = async (product) => {
    setSavingId(product.id);
    try {
      const currentDraft = drafts[product.id] || {};
      const origVal = currentDraft.original_price;
      const priceVal = currentDraft.price;

      const original_price = origVal === '' || origVal == null ? null : Number(origVal);
      const price = priceVal === '' || priceVal == null ? Number(product.price) : Number(priceVal);

      if (price <= 0) {
        toastError('Offer price must be greater than 0');
        return;
      }

      if (original_price !== null && original_price <= price) {
        toastError('Original price must be greater than the offer price to create a valid discount.');
        return;
      }

      const res = await authFetch('/api/products', {
        method: 'PUT',
        body: JSON.stringify({ id: product.id, price, original_price }),
      });
      if (!res.ok) throw new Error('Failed to update product pricing');
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, price, original_price } : p))
      );
      success(`Special offer price saved for "${product.name}"`);
      await fetchAll();
    } catch (err) {
      toastError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const removeOffer = async (product) => {
    setSavingId(product.id);
    try {
      const currentDraft = drafts[product.id] || {};
      const priceVal = currentDraft.price;
      const price = priceVal === '' || priceVal == null ? Number(product.price) : Number(priceVal);

      const res = await authFetch('/api/products', {
        method: 'PUT',
        body: JSON.stringify({ id: product.id, price, original_price: null }),
      });
      if (!res.ok) throw new Error('Failed to remove offer');
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, price, original_price: null } : p))
      );
      success(`Special offer removed for "${product.name}"`);
      await fetchAll();
    } catch (err) {
      toastError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const saveBanner = async (e) => {
    e.preventDefault();
    setBannerSaving(true);
    setBannerSaved(false);
    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(banner),
      });
      if (!res.ok) throw new Error('Failed to save banner text');
      setBannerSaved(true);
      success('Special offers banner text updated');
      setTimeout(() => setBannerSaved(false), 2000);
    } catch (err) {
      toastError(err.message);
    } finally {
      setBannerSaving(false);
    }
  };

  if (loading) return <p className="text-neutral-500 text-center py-20">Loading offers...</p>;

  const onOffer = products.filter((p) => p.original_price && Number(p.original_price) > Number(p.price));

  const filteredProducts = products.filter((p) => {
    if (filter === 'active' && (!p.original_price || Number(p.original_price) <= Number(p.price))) {
      return false;
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      return p.name.toLowerCase().includes(query) || (p.brand && p.brand.toLowerCase().includes(query));
    }
    return true;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-white text-2xl font-serif mb-1">Offers & Discounts</h1>
        <p className="text-neutral-500 text-sm">
          Set both the original price and the new discounted offer price. When an original price is higher than the offer price, the item appears in the Special Offers section. {onOffer.length} product(s) currently on offer.
        </p>
      </div>

      <form onSubmit={saveBanner} className="bg-neutral-950 border border-white/10 p-5 space-y-4 rounded-lg">
        <h2 className="text-white text-sm font-medium flex items-center gap-2">
          <Tag size={15} className="text-orange-500" /> Special Offers Banner Text
        </h2>
        <div>
          <label className="text-neutral-400 text-xs uppercase tracking-wide">Banner Title</label>
          <input
            value={banner.offer_banner_title}
            onChange={(e) => setBanner((b) => ({ ...b, offer_banner_title: e.target.value }))}
            className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
            placeholder="Special Offers"
          />
        </div>
        <div>
          <label className="text-neutral-400 text-xs uppercase tracking-wide">Banner Subtitle</label>
          <textarea
            value={banner.offer_banner_subtitle}
            onChange={(e) => setBanner((b) => ({ ...b, offer_banner_subtitle: e.target.value }))}
            rows={2}
            className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm resize-none"
            placeholder="Grab these export pieces before the discount runs out..."
          />
        </div>
        <button
          type="submit"
          disabled={bannerSaving}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-black font-semibold px-4 py-2 text-sm cursor-pointer"
        >
          {bannerSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {bannerSaved ? 'Saved!' : 'Save Banner'}
        </button>
      </form>

      <div className="bg-neutral-950 border border-white/10 rounded-lg">
        <div className="px-5 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-white text-sm font-medium">Manage Product Pricing & Offers</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Edit both the regular price and discounted offer price for each item.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-neutral-900 border border-white/10 text-white text-xs outline-none focus:border-orange-500 w-44"
              />
            </div>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === 'all' ? 'bg-orange-500 text-black' : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              All ({products.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === 'active' ? 'bg-orange-500 text-black' : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              Active Offers ({onOffer.length})
            </button>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {filteredProducts.length === 0 ? (
            <p className="text-neutral-500 text-xs text-center py-10">No products found.</p>
          ) : (
            filteredProducts.map((p) => {
              const draft = drafts[p.id] || { original_price: '', price: '' };
              const origNum = draft.original_price !== '' && draft.original_price != null ? Number(draft.original_price) : null;
              const priceNum = draft.price !== '' && draft.price != null ? Number(draft.price) : Number(p.price);

              const hasDiscount = origNum !== null && origNum > priceNum;
              const savings = hasDiscount ? origNum - priceNum : 0;
              const discountPercent = hasDiscount ? Math.round((savings / origNum) * 100) : 0;

              return (
                <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.02]">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <img src={p.image_url} alt={p.name} className="w-12 h-14 object-cover shrink-0 rounded border border-white/5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm truncate font-medium">{p.name}</p>
                        {hasDiscount && (
                          <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 text-[10px] px-1.5 py-0.5 rounded border border-green-500/20 shrink-0 font-medium">
                            <Percent size={10} /> {discountPercent}% OFF
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-500 text-xs mt-0.5">
                        Brand: <span className="text-neutral-300">{p.brand || 'N/A'}</span> &middot; Category: <span className="text-neutral-300 capitalize">{p.category}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div>
                      <label className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1">
                        Original Price (TK)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 1800"
                        value={draft.original_price}
                        onChange={(e) => handleDraftChange(p.id, 'original_price', e.target.value)}
                        className="w-28 bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-orange-400 uppercase tracking-wider block mb-1">
                        Offer Price (TK)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 1400"
                        value={draft.price}
                        onChange={(e) => handleDraftChange(p.id, 'price', e.target.value)}
                        className="w-28 bg-neutral-900 border border-orange-500/40 focus:border-orange-500 outline-none text-white px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 pt-4">
                      <button
                        onClick={() => saveDiscount(p)}
                        disabled={savingId === p.id}
                        className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-black text-xs font-semibold px-3 py-1.5 cursor-pointer rounded"
                      >
                        {savingId === p.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Save
                      </button>

                      {p.original_price && (
                        <button
                          onClick={() => removeOffer(p)}
                          disabled={savingId === p.id}
                          title="Remove discount (keep as regular price)"
                          className="flex items-center gap-1 text-neutral-400 hover:text-red-400 text-xs px-2 py-1.5 transition-colors cursor-pointer"
                        >
                          <XCircle size={14} /> Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
