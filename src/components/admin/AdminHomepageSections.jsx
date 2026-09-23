import { useEffect, useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Star,
  Layers,
  Search,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Tag,
  Percent,
} from 'lucide-react';
import { authFetch } from '../../lib/adminApi';
import { useToast } from '../../contexts/ToastContext';

const LABELS = {
  offers: 'Special Offers',
  new_collection: 'New Collection',
  featured: 'Featured Pieces',
  categories: 'Shop by Category',
};

export default function AdminHomepageSections({ initialTab = 'sections' }) {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState(initialTab); // 'sections' | 'offers' | 'new_collection' | 'featured'
  const [sections, setSections] = useState([]);
  const [products, setProducts] = useState([]);
  const [featuredIds, setFeaturedIds] = useState([]);
  const [excludedNewIds, setExcludedNewIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Offers state
  const [drafts, setDrafts] = useState({});
  const [savingOfferId, setSavingOfferId] = useState(null);
  const [banner, setBanner] = useState({ offer_banner_title: '', offer_banner_subtitle: '' });
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerSaved, setBannerSaved] = useState(false);
  const [offersFilter, setOffersFilter] = useState('all'); // 'all' | 'active'

  // Section saving
  const [savingSections, setSavingSections] = useState(false);
  const [savedSections, setSavedSections] = useState(false);

  // Action loading states
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [secRes, prodRes, featRes, newRes, settingsRes] = await Promise.all([
        fetch('/api/homepage-sections').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
        fetch('/api/featured').then((r) => r.json()),
        fetch('/api/new-collection').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()).catch(() => null),
      ]);

      const prodList = Array.isArray(prodRes) ? prodRes : [];
      setSections(Array.isArray(secRes) ? secRes.sort((a, b) => a.position - b.position) : []);
      setProducts(prodList);
      setFeaturedIds(Array.isArray(featRes) ? featRes : []);
      setExcludedNewIds(Array.isArray(newRes) ? newRes : []);

      setDrafts(
        Object.fromEntries(
          prodList.map((p) => [
            p.id,
            {
              original_price: p.original_price != null ? p.original_price : '',
              price: p.price != null ? p.price : '',
            },
          ])
        )
      );

      if (settingsRes) {
        setBanner({
          offer_banner_title: settingsRes.offer_banner_title || 'Special Offers',
          offer_banner_subtitle: settingsRes.offer_banner_subtitle || '',
        });
      }
    } catch (err) {
      console.error('Error fetching homepage curation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Section order & visibility handlers
  const moveSection = (index, dir) => {
    setSections((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((s, i) => ({ ...s, position: i }));
    });
  };

  const toggleSectionEnabled = (key) => {
    setSections((prev) =>
      prev.map((s) => (s.section_key === key ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleSaveSections = async () => {
    setSavingSections(true);
    setSavedSections(false);
    try {
      const res = await authFetch('/api/homepage-sections', {
        method: 'PUT',
        body: JSON.stringify({
          sections: sections.map((s, i) => ({
            section_key: s.section_key,
            position: i,
            enabled: s.enabled,
          })),
        }),
      });
      if (!res.ok) throw new Error('Failed to save sections');
      setSavedSections(true);
      success('Homepage layout and visibility saved successfully');
      setTimeout(() => setSavedSections(false), 2000);
    } catch (err) {
      toastError(err.message);
    } finally {
      setSavingSections(false);
    }
  };

  // Featured Pieces curation handlers
  const toggleFeatured = async (product) => {
    const isCurrentlyFeatured = featuredIds.includes(product.id);
    setActionLoadingId(product.id);
    try {
      const method = isCurrentlyFeatured ? 'DELETE' : 'POST';
      const res = await authFetch('/api/featured', {
        method,
        body: JSON.stringify({ product_id: product.id }),
      });
      if (!res.ok) throw new Error('Failed to update featured pieces');

      setFeaturedIds((prev) =>
        isCurrentlyFeatured ? prev.filter((id) => id !== product.id) : [...prev, product.id]
      );
      success(
        isCurrentlyFeatured
          ? `Unpinned "${product.name}" from Featured Pieces`
          : `Pinned "${product.name}" to Featured Pieces`
      );
    } catch (err) {
      toastError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // New Collection curation handlers
  const toggleNewCollection = async (product) => {
    const isExcluded = excludedNewIds.includes(product.id);
    setActionLoadingId(product.id);
    try {
      const action = isExcluded ? 'include' : 'remove';
      const res = await authFetch('/api/new-collection', {
        method: 'POST',
        body: JSON.stringify({ action, product_id: product.id }),
      });
      if (!res.ok) throw new Error('Failed to update new collection');

      setExcludedNewIds((prev) =>
        isExcluded ? prev.filter((id) => id !== product.id) : [...prev, product.id]
      );
      success(
        isExcluded
          ? `Restored "${product.name}" to New Collection`
          : `Removed "${product.name}" from New Collection`
      );
    } catch (err) {
      toastError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Special Offers curation handlers
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
    setSavingOfferId(product.id);
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
      await fetchAllData();
    } catch (err) {
      toastError(err.message);
    } finally {
      setSavingOfferId(null);
    }
  };

  const removeOffer = async (product) => {
    setSavingOfferId(product.id);
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
      await fetchAllData();
    } catch (err) {
      toastError(err.message);
    } finally {
      setSavingOfferId(null);
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

  const onOfferProducts = products.filter(
    (p) => p.original_price && Number(p.original_price) > Number(p.price)
  );

  const filteredProducts = products.filter((p) => {
    if (activeTab === 'offers' && offersFilter === 'active') {
      if (!p.original_price || Number(p.original_price) <= Number(p.price)) {
        return false;
      }
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <p className="text-neutral-500 text-center py-20">Loading homepage curation...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub-tabs */}
      <div>
        <h1 className="text-white text-2xl font-serif mb-1">Homepage Curation</h1>
        <p className="text-neutral-500 text-sm">
          Control which products and showcase sections appear on your storefront homepage.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab('sections')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs uppercase tracking-wider rounded font-medium transition-colors cursor-pointer ${
            activeTab === 'sections'
              ? 'bg-orange-500 text-black font-semibold'
              : 'bg-neutral-900 text-neutral-400 hover:text-white'
          }`}
        >
          <Layers size={14} />
          <span>Section Layout ({sections.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('offers')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs uppercase tracking-wider rounded font-medium transition-colors cursor-pointer ${
            activeTab === 'offers'
              ? 'bg-orange-500 text-black font-semibold'
              : 'bg-neutral-900 text-neutral-400 hover:text-white'
          }`}
        >
          <Tag size={14} />
          <span>Special Offers ({onOfferProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('new_collection')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs uppercase tracking-wider rounded font-medium transition-colors cursor-pointer ${
            activeTab === 'new_collection'
              ? 'bg-orange-500 text-black font-semibold'
              : 'bg-neutral-900 text-neutral-400 hover:text-white'
          }`}
        >
          <Sparkles size={14} />
          <span>New Collection ({products.length - excludedNewIds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('featured')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs uppercase tracking-wider rounded font-medium transition-colors cursor-pointer ${
            activeTab === 'featured'
              ? 'bg-orange-500 text-black font-semibold'
              : 'bg-neutral-900 text-neutral-400 hover:text-white'
          }`}
        >
          <Star size={14} />
          <span>Featured Pieces ({featuredIds.length})</span>
        </button>
      </div>

      {/* ================= TAB 1: SECTION LAYOUT ================= */}
      {activeTab === 'sections' && (
        <div className="space-y-4">
          <div className="bg-neutral-950 border border-white/10 p-4 rounded-lg">
            <p className="text-neutral-400 text-xs leading-relaxed">
              Reorder the sections that appear on your homepage below the hero. Use the arrows to
              move a section up or down, and the eye icon to hide/show it.
            </p>
          </div>

          <div className="bg-neutral-950 border border-white/10 divide-y divide-white/5 rounded-lg overflow-hidden">
            {sections.map((s, i) => (
              <div key={s.section_key} className="flex items-center gap-4 px-5 py-4">
                <span className="text-neutral-600 text-sm w-6 font-mono">{i + 1}</span>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      s.enabled ? 'text-white' : 'text-neutral-600 line-through'
                    }`}
                  >
                    {LABELS[s.section_key] || s.section_key}
                  </p>
                </div>
                <button
                  onClick={() => toggleSectionEnabled(s.section_key)}
                  title={s.enabled ? 'Hide section' : 'Show section'}
                  className={`p-2 rounded cursor-pointer ${
                    s.enabled ? 'text-orange-500 hover:bg-orange-500/10' : 'text-neutral-600 hover:bg-white/5'
                  }`}
                >
                  {s.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveSection(i, -1)}
                    disabled={i === 0}
                    className="p-2 rounded text-neutral-400 hover:text-orange-500 hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    onClick={() => moveSection(i, 1)}
                    disabled={i === sections.length - 1}
                    className="p-2 rounded text-neutral-400 hover:text-orange-500 hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveSections}
              disabled={savingSections}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-black font-semibold px-5 py-2.5 text-sm rounded cursor-pointer transition-colors"
            >
              {savingSections ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {savedSections ? 'Saved!' : 'Save Section Order'}
            </button>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SPECIAL OFFERS ================= */}
      {activeTab === 'offers' && (
        <div className="space-y-6">
          {/* Banner Settings Form */}
          <form onSubmit={saveBanner} className="bg-neutral-950 border border-white/10 p-5 space-y-4 rounded-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-white text-sm font-medium flex items-center gap-2">
                <Tag size={15} className="text-orange-500" /> Special Offers Banner Text
              </h2>
              <span className="text-neutral-500 text-xs font-mono">
                {onOfferProducts.length} product(s) active on offer
              </span>
            </div>
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
              <input
                value={banner.offer_banner_subtitle}
                onChange={(e) => setBanner((b) => ({ ...b, offer_banner_subtitle: e.target.value }))}
                className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
                placeholder="Limited export pieces at special discount pricing"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={bannerSaving}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-semibold px-4 py-2 text-xs rounded transition-colors cursor-pointer"
              >
                {bannerSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {bannerSaved ? 'Saved!' : 'Save Banner Text'}
              </button>
            </div>
          </form>

          {/* Pricing & Offers Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setOffersFilter('all')}
                  className={`px-3 py-1.5 text-xs uppercase tracking-wide border transition-colors cursor-pointer ${
                    offersFilter === 'all'
                      ? 'bg-orange-500 border-orange-500 text-black font-semibold'
                      : 'border-white/20 text-neutral-400 hover:text-white'
                  }`}
                >
                  All Products ({products.length})
                </button>
                <button
                  onClick={() => setOffersFilter('active')}
                  className={`px-3 py-1.5 text-xs uppercase tracking-wide border transition-colors cursor-pointer ${
                    offersFilter === 'active'
                      ? 'bg-orange-500 border-orange-500 text-black font-semibold'
                      : 'border-white/20 text-neutral-400 hover:text-white'
                  }`}
                >
                  Active Offers ({onOfferProducts.length})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white pl-8 pr-3 py-1.5 text-xs rounded"
                />
              </div>
            </div>

            <div className="bg-neutral-950 border border-white/10 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-900 text-neutral-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 w-32">Original Price (TK)</th>
                      <th className="py-3 px-4 w-32">Offer Price (TK)</th>
                      <th className="py-3 px-4 text-center w-28">Discount</th>
                      <th className="py-3 px-4 text-right w-44">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-neutral-500">
                          No products found matching the filter.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const draft = drafts[p.id] || {};
                        const orig = Number(draft.original_price);
                        const price = Number(draft.price);
                        const isDiscount = orig > 0 && price > 0 && orig > price;
                        const pct = isDiscount ? Math.round(((orig - price) / orig) * 100) : null;
                        const isSaving = savingOfferId === p.id;
                        const hasActiveOffer = p.original_price && Number(p.original_price) > Number(p.price);

                        return (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="w-10 h-12 object-cover rounded border border-white/10 shrink-0"
                                />
                                <div>
                                  <p className="text-white font-medium">{p.name}</p>
                                  <p className="text-neutral-500 text-[11px]">{p.brand}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-neutral-400 capitalize">{p.category}</td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                min={0}
                                value={draft.original_price ?? ''}
                                onChange={(e) => handleDraftChange(p.id, 'original_price', e.target.value)}
                                placeholder="None"
                                className="w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-2 py-1.5 text-xs text-center font-mono rounded"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                min={0}
                                value={draft.price ?? ''}
                                onChange={(e) => handleDraftChange(p.id, 'price', e.target.value)}
                                className="w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-2 py-1.5 text-xs text-center font-mono rounded font-semibold text-orange-400"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              {pct !== null ? (
                                <span className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-400 border border-orange-500/30 font-bold px-2 py-0.5 rounded text-[11px]">
                                  <Percent size={11} /> {pct}% OFF
                                </span>
                              ) : (
                                <span className="text-neutral-600 text-[11px]">&mdash;</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => saveDiscount(p)}
                                  disabled={isSaving}
                                  className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-semibold px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer"
                                >
                                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                  <span>Save</span>
                                </button>
                                {hasActiveOffer && (
                                  <button
                                    onClick={() => removeOffer(p)}
                                    disabled={isSaving}
                                    title="Remove Offer"
                                    className="p-1.5 border border-white/10 hover:border-red-500/40 text-neutral-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: FEATURED PIECES ================= */}
      {activeTab === 'featured' && (
        <div className="space-y-4">
          <div className="bg-neutral-950 border border-white/10 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-neutral-400 text-xs leading-relaxed">
              Pin or unpin pieces in the <span className="text-orange-500">Featured Pieces</span> showcase.
              Pinned items appear prominently on the homepage.
            </p>
            <div className="relative w-full sm:w-64 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by name, brand..."
                className="w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white pl-8 pr-3 py-1.5 text-xs rounded"
              />
            </div>
          </div>

          <div className="bg-neutral-950 border border-white/10 rounded-lg divide-y divide-white/5 overflow-hidden">
            {filteredProducts.map((p) => {
              const isPinned = featuredIds.includes(p.id);
              const isLoadingThis = actionLoadingId === p.id;

              return (
                <div
                  key={p.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors ${
                    isPinned ? 'bg-orange-500/[0.02]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-12 h-14 object-cover rounded border border-white/10 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">{p.name}</p>
                        {isPinned && (
                          <span className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-400 border border-orange-500/30 text-[10px] px-2 py-0.5 rounded font-semibold">
                            <Star size={10} className="fill-orange-400" /> Pinned
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-500 text-xs mt-0.5">
                        Brand: <span className="text-neutral-300">{p.brand}</span> &middot; Category:{' '}
                        <span className="text-neutral-300 capitalize">{p.category}</span> &middot; Price:{' '}
                        <span className="text-orange-500 font-mono font-medium">{p.price}TK</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleFeatured(p)}
                    disabled={isLoadingThis}
                    className={`text-xs px-3.5 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto ${
                      isPinned
                        ? 'bg-neutral-900 border border-red-500/30 text-red-400 hover:bg-red-950/40'
                        : 'bg-orange-500 hover:bg-orange-600 text-black'
                    }`}
                  >
                    {isLoadingThis ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : isPinned ? (
                      <>
                        <Trash2 size={14} /> Unpin from Featured
                      </>
                    ) : (
                      <>
                        <Plus size={14} /> Pin as Featured
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 4: NEW COLLECTION ================= */}
      {activeTab === 'new_collection' && (
        <div className="space-y-4">
          <div className="bg-neutral-950 border border-white/10 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-neutral-300 text-xs font-medium">Automatic New Collection Showcase</p>
              <p className="text-neutral-500 text-xs mt-0.5 leading-relaxed">
                When you add any new product, it automatically joins the New Collection. If you want to
                hide a specific piece from this section, click "Remove" below.
              </p>
            </div>
            <div className="relative w-full sm:w-64 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter products..."
                className="w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white pl-8 pr-3 py-1.5 text-xs rounded"
              />
            </div>
          </div>

          <div className="bg-neutral-950 border border-white/10 rounded-lg divide-y divide-white/5 overflow-hidden">
            {filteredProducts.map((p) => {
              const isExcluded = excludedNewIds.includes(p.id);
              const isLoadingThis = actionLoadingId === p.id;

              return (
                <div
                  key={p.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors ${
                    !isExcluded ? 'bg-green-500/[0.02]' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-12 h-14 object-cover rounded border border-white/10 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">{p.name}</p>
                        {!isExcluded ? (
                          <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/30 text-[10px] px-2 py-0.5 rounded font-semibold">
                            <CheckCircle2 size={10} /> Active in New Collection
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-400 border border-white/10 text-[10px] px-2 py-0.5 rounded font-semibold">
                            Excluded from Showcase
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-500 text-xs mt-0.5">
                        Brand: <span className="text-neutral-300">{p.brand}</span> &middot; Category:{' '}
                        <span className="text-neutral-300 capitalize">{p.category}</span> &middot; Price:{' '}
                        <span className="text-orange-500 font-mono font-medium">{p.price}TK</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleNewCollection(p)}
                    disabled={isLoadingThis}
                    className={`text-xs px-3.5 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto ${
                      !isExcluded
                        ? 'bg-neutral-900 border border-red-500/30 text-red-400 hover:bg-red-950/40'
                        : 'bg-green-600 hover:bg-green-500 text-white'
                    }`}
                  >
                    {isLoadingThis ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : !isExcluded ? (
                      <>
                        <XCircle size={14} /> Remove from New Collection
                      </>
                    ) : (
                      <>
                        <Plus size={14} /> Include in New Collection
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
