import { useEffect, useState } from 'react';
import { Trash2, Plus, X, Loader2, Pencil, Star, FolderPlus, Tag, Check } from 'lucide-react';
import { authFetch } from '../../lib/adminApi';
import { CATEGORIES, SIZES, DEFAULT_STOCK, totalStock } from '../../lib/constants';
import { useToast } from '../../contexts/ToastContext';

const emptyForm = {
  name: '',
  brand: '',
  category: CATEGORIES[0].key,
  price: '',
  original_price: '',
  description: '',
  stock: { ...DEFAULT_STOCK },
  image_url: '',
};

export default function AdminProducts() {
  const { success, error: toastError } = useToast();
  const [products, setProducts] = useState([]);
  const [featuredIds, setFeaturedIds] = useState([]);
  const [categories, setCategories] = useState(CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [featuredBusyId, setFeaturedBusyId] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Category Manager modal state
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatKey, setNewCatKey] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState('');
  const [catSuccess, setCatSuccess] = useState('');

  // Inline category add inside product form
  const [inlineAddingCat, setInlineAddingCat] = useState(false);
  const [inlineCatLabel, setInlineCatLabel] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [prodRes, featRes, catRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/featured'),
        fetch('/api/categories'),
      ]);
      const prodData = await prodRes.json();
      const featData = await featRes.json();
      const catData = await catRes.json();
      setProducts(Array.isArray(prodData) ? prodData : []);
      setFeaturedIds(Array.isArray(featData) ? featData : []);
      if (Array.isArray(catData) && catData.length > 0) {
        setCategories(catData);
      }
    } catch {
      setError('Could not load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const setStockQty = (s, qty) => {
    setForm((f) => ({ ...f, stock: { ...f.stock, [s]: Math.max(0, Number(qty) || 0) } }));
  };

  const resetForm = () => {
    setForm({ ...emptyForm, category: categories[0]?.key || 'pants' });
    setImageFile(null);
    setImagePreview('');
    setShowForm(false);
    setEditingId(null);
    setError('');
    setInlineAddingCat(false);
    setInlineCatLabel('');
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      brand: p.brand || '',
      category: p.category || categories[0]?.key || 'pants',
      price: p.price != null ? String(p.price) : '',
      original_price: p.original_price != null ? String(p.original_price) : '',
      description: p.description || '',
      stock: { ...DEFAULT_STOCK, ...(p.sizes || {}) },
      image_url: p.image_url || '',
    });
    setImageFile(null);
    setImagePreview(p.image_url || '');
    setShowForm(true);
    setError('');
    setInlineAddingCat(false);
    setInlineCatLabel('');
  };

  // Add category from the Manager modal
  const handleAddCategory = async (e) => {
    if (e) e.preventDefault();
    if (!newCatLabel.trim()) {
      setCatError('Category name is required.');
      return;
    }
    setCatSaving(true);
    setCatError('');
    setCatSuccess('');
    try {
      const res = await authFetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          label: newCatLabel.trim(),
          key: newCatKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add category');
      setCategories(data);
      const addedName = newCatLabel.trim();
      setCatSuccess(`Category "${addedName}" added successfully!`);
      success(`Category "${addedName}" added successfully!`);
      setNewCatLabel('');
      setNewCatKey('');
      setTimeout(() => setCatSuccess(''), 3000);
    } catch (err) {
      setCatError(err.message);
      toastError(err.message);
    } finally {
      setCatSaving(false);
    }
  };

  // Quick inline add from the Add/Edit Product form
  const handleQuickAddCategory = async () => {
    if (!inlineCatLabel.trim()) return;
    setCatSaving(true);
    try {
      const res = await authFetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ label: inlineCatLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add category');
      setCategories(data);
      const added =
        data.find((c) => c.label.toLowerCase() === inlineCatLabel.trim().toLowerCase()) ||
        data[data.length - 1];
      if (added) {
        setForm((f) => ({ ...f, category: added.key }));
        success(`Category "${added.label}" added and selected`);
      }
      setInlineCatLabel('');
      setInlineAddingCat(false);
    } catch (err) {
      toastError(err.message);
    } finally {
      setCatSaving(false);
    }
  };

  // Delete an empty custom category
  const handleDeleteCategory = async (key, label) => {
    if (!window.confirm(`Are you sure you want to remove the category "${label}"?`)) return;
    setCatSaving(true);
    setCatError('');
    try {
      const res = await authFetch('/api/categories', {
        method: 'DELETE',
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete category');
      setCategories(data);
      if (categoryFilter === key) setCategoryFilter('all');
      success(`Category "${label}" removed successfully`);
    } catch (err) {
      setCatError(err.message);
      toastError(err.message);
    } finally {
      setCatSaving(false);
    }
  };

  const uploadImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          const res = await authFetch('/api/upload', {
            method: 'POST',
            body: JSON.stringify({
              fileName: `${Date.now()}_${file.name}`,
              fileBase64: base64,
              contentType: file.type,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Upload failed');
          resolve(data.url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.brand || !form.price) {
      setError('Name, brand and price are required.');
      return;
    }
    if (!imageFile && !form.image_url) {
      setError('Please upload a product image.');
      return;
    }
    setSaving(true);
    try {
      let imageUrl = form.image_url;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      const payload = {
        name: form.name,
        brand: form.brand,
        category: form.category,
        price: Number(form.price),
        original_price: form.original_price ? Number(form.original_price) : null,
        description: form.description,
        sizes: form.stock,
        image_url: imageUrl,
      };
      const res = await authFetch('/api/products', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save product');

      // Refresh component state in place
      if (editingId) {
        setProducts((prev) => prev.map((p) => (p.id === editingId ? data : p)));
        success(`Product "${data.name}" updated successfully`);
      } else {
        setProducts((prev) => [data, ...prev]);
        success(`Product "${data.name}" added successfully`);
      }

      resetForm();
      fetchAll();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name || 'this product'}" permanently?`)) return;
    try {
      const res = await authFetch('/api/products', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setProducts((prev) => prev.filter((p) => p.id !== id));
      success(`Product "${name || 'item'}" deleted successfully`);
      fetchAll();
    } catch (err) {
      toastError(err.message);
    }
  };

  const toggleFeatured = async (id, name) => {
    setFeaturedBusyId(id);
    const isFeatured = featuredIds.includes(id);
    try {
      const res = await authFetch('/api/featured', {
        method: isFeatured ? 'DELETE' : 'POST',
        body: JSON.stringify({ product_id: id }),
      });
      if (!res.ok) throw new Error('Failed to update featured status');
      setFeaturedIds((prev) => (isFeatured ? prev.filter((x) => x !== id) : [...prev, id]));
      success(
        isFeatured
          ? `Unpinned "${name || 'Product'}" from Featured Pieces`
          : `Pinned "${name || 'Product'}" to Featured Pieces`
      );
    } catch (err) {
      toastError(err.message);
    } finally {
      setFeaturedBusyId(null);
    }
  };

  const filteredProducts =
    categoryFilter === 'all' ? products : products.filter((p) => p.category === categoryFilter);

  return (
    <div>
      <div className="mb-6 bg-neutral-950 border border-white/10 px-4 py-3 rounded-lg text-xs text-neutral-400 flex items-center gap-2">
        <Star size={13} className="text-orange-500 fill-orange-500 shrink-0" />
        <span>
          Use the <Star size={12} className="inline text-orange-500 fill-orange-500 -mt-0.5" /> star to pin a product to the homepage's Featured Pieces section.
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-2xl font-serif">Products</h1>
          <p className="text-neutral-500 text-xs mt-0.5">
            {products.length} product(s) across {categories.length} categories
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              setCatError('');
              setCatSuccess('');
              setNewCatLabel('');
              setNewCatKey('');
              setShowCategoryManager(true);
            }}
            className="flex items-center gap-2 border border-white/20 hover:border-orange-500/60 bg-neutral-900 text-neutral-300 hover:text-white px-3.5 py-2.5 text-sm transition-colors cursor-pointer"
          >
            <FolderPlus size={16} className="text-orange-500" />
            <span>Manage Categories ({categories.length})</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-black font-semibold px-4 py-2.5 text-sm cursor-pointer"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 text-xs uppercase tracking-wide border transition-colors cursor-pointer ${
            categoryFilter === 'all'
              ? 'bg-orange-500 border-orange-500 text-black font-semibold'
              : 'border-white/20 text-neutral-400 hover:border-white/40'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategoryFilter(c.key)}
            className={`px-3 py-1.5 text-xs uppercase tracking-wide border transition-colors cursor-pointer ${
              categoryFilter === c.key
                ? 'bg-orange-500 border-orange-500 text-black font-semibold'
                : 'border-white/20 text-neutral-400 hover:border-white/40'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-500 py-20 justify-center">
          <Loader2 className="animate-spin" size={18} /> Loading products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <p className="text-neutral-500 text-center py-20">No products in this view yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((p) => {
            const isFeatured = featuredIds.includes(p.id);
            const onSale = p.original_price && Number(p.original_price) > Number(p.price);
            const stockTotal = totalStock(p.sizes);
            return (
              <div key={p.id} className="bg-neutral-950 border border-white/10 flex flex-col">
                <div className="relative">
                  <img src={p.image_url} alt={p.name} className="w-full h-48 object-cover" />
                  {onSale && (
                    <span className="absolute top-2 left-2 bg-orange-500 text-black text-[10px] font-bold px-2 py-1 uppercase">
                      Offer
                    </span>
                  )}
                  {stockTotal === 0 && (
                    <span className="absolute bottom-2 left-2 bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 uppercase">
                      Out of Stock
                    </span>
                  )}
                  <button
                    onClick={() => toggleFeatured(p.id, p.name)}
                    disabled={featuredBusyId === p.id}
                    title={isFeatured ? 'Remove from Featured Pieces' : 'Add to Featured Pieces'}
                    className={`absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                      isFeatured ? 'bg-orange-500 text-black' : 'bg-black/60 text-white hover:bg-black/80'
                    }`}
                  >
                    <Star size={15} className={isFeatured ? 'fill-black' : ''} />
                  </button>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-white text-sm font-medium">{p.name}</p>
                  <p className="text-neutral-500 text-xs">{p.brand}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-orange-500 text-sm">{p.price}TK</p>
                    {onSale && <p className="text-neutral-600 text-xs line-through">{p.original_price}TK</p>}
                  </div>
                  <p className="text-neutral-600 text-xs mt-1 capitalize">
                    {categories.find((c) => c.key === p.category)?.label || p.category} &middot;{' '}
                    {stockTotal} in stock
                  </p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {SIZES.map((s) => {
                      const qty = Number(p.sizes?.[s] ?? 0);
                      return (
                        <span
                          key={s}
                          className={`text-[10px] px-1.5 py-0.5 border ${
                            qty > 0
                              ? 'border-orange-500/60 text-white font-bold'
                              : 'border-white/10 text-neutral-700 line-through'
                          }`}
                        >
                          {s}:{qty}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-auto pt-3 flex items-center gap-3 border-t border-white/5 mt-3">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-neutral-300 hover:text-orange-500 text-xs py-1"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-red-500 hover:text-red-400 text-xs py-1"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={resetForm} className="absolute inset-0 bg-black/80" />
          <div className="relative bg-neutral-950 border border-white/10 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8">
            <button onClick={resetForm} className="absolute top-5 right-5 text-neutral-400 hover:text-orange-500 cursor-pointer">
              <X size={20} />
            </button>
            <h2 className="text-white text-xl font-serif mb-6">
              {editingId ? 'Edit Product' : 'Add New Product'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-neutral-400 text-xs uppercase tracking-wide">Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-1.5 w-full text-neutral-400 text-xs file:mr-3 file:py-2 file:px-3 file:border-0 file:bg-orange-500 file:text-black file:text-xs file:font-semibold"
                />
                {imagePreview && (
                  <img src={imagePreview} alt="preview" className="mt-2 w-full h-40 object-cover" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 text-xs uppercase tracking-wide">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
                    placeholder="Classic Denim Jeans"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs uppercase tracking-wide">Brand</label>
                  <input
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
                    placeholder="Jack & Jones"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-neutral-400 text-xs uppercase tracking-wide">Category</label>
                  <button
                    type="button"
                    onClick={() => {
                      setInlineAddingCat(!inlineAddingCat);
                      setInlineCatLabel('');
                    }}
                    className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Plus size={13} /> {inlineAddingCat ? 'Choose Existing' : 'New Category'}
                  </button>
                </div>

                {inlineAddingCat ? (
                  <div className="p-3 bg-neutral-900/90 border border-orange-500/40 rounded space-y-2">
                    <p className="text-xs text-neutral-300">
                      Add a new category (e.g. <span className="text-orange-400">Hoodie</span>, <span className="text-orange-400">Jacket</span>, <span className="text-orange-400">Panjabi</span>):
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={inlineCatLabel}
                        onChange={(e) => setInlineCatLabel(e.target.value)}
                        placeholder="e.g. Hoodies & Jackets"
                        className="flex-1 bg-black border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAddCategory();
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={catSaving || !inlineCatLabel.trim()}
                        onClick={handleQuickAddCategory}
                        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-semibold px-3.5 py-2 text-xs cursor-pointer shrink-0"
                      >
                        {catSaving ? 'Adding...' : 'Add & Select'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 text-xs uppercase tracking-wide">Price (TK)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
                    placeholder="1500"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs uppercase tracking-wide">
                    Original Price (optional \u2014 creates an Offer)
                  </label>
                  <input
                    type="number"
                    value={form.original_price}
                    onChange={(e) => setForm((f) => ({ ...f, original_price: e.target.value }))}
                    className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
                    placeholder="1800"
                  />
                </div>
              </div>
              <div>
                <label className="text-neutral-400 text-xs uppercase tracking-wide">Short Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1.5 w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2.5 text-sm"
                  placeholder="Good quality denim, comfortable fit"
                />
              </div>
              <div>
                <label className="text-neutral-400 text-xs uppercase tracking-wide">Stock per Size</label>
                <div className="grid grid-cols-5 gap-2 mt-1.5">
                  {SIZES.map((s) => (
                    <div key={s}>
                      <p className="text-center text-neutral-500 text-xs mb-1">{s}</p>
                      <input
                        type="number"
                        min={0}
                        value={form.stock[s]}
                        onChange={(e) => setStockQty(s, e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 focus:border-orange-500 outline-none text-white px-2 py-2 text-sm text-center"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-neutral-600 text-[11px] mt-1.5">
                  Set a size's stock to 0 to mark it as unavailable/sold out.
                </p>
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-black font-semibold py-3 transition-colors"
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowCategoryManager(false)} className="absolute inset-0 bg-black/80" />
          <div className="relative bg-neutral-950 border border-white/10 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 rounded-lg shadow-2xl">
            <button
              onClick={() => setShowCategoryManager(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-orange-500 cursor-pointer"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <FolderPlus className="text-orange-500" size={22} />
              <h2 className="text-white text-xl font-serif">Manage Categories</h2>
            </div>
            <p className="text-neutral-400 text-xs mb-6 leading-relaxed">
              Add new product categories (e.g. Hoodies, Jackets, Panjabis, Winter Wear) or manage existing ones.
              Categories appear automatically in product filters, shop pages, and homepage showcases.
            </p>

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="bg-neutral-900/70 border border-white/10 p-4 rounded-lg space-y-3 mb-6">
              <h3 className="text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={14} className="text-orange-500" /> Add New Category
              </h3>
              <div>
                <label className="text-neutral-400 text-[11px] uppercase tracking-wide">Category Name</label>
                <input
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  placeholder="e.g. Hoodies & Jackets"
                  className="mt-1 w-full bg-black border border-white/10 focus:border-orange-500 outline-none text-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-neutral-500 text-[11px]">
                  Slug key will be generated automatically.
                </p>
                <button
                  type="submit"
                  disabled={catSaving || !newCatLabel.trim()}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-semibold px-4 py-2 text-xs rounded transition-colors cursor-pointer shrink-0"
                >
                  {catSaving ? 'Saving...' : 'Add Category'}
                </button>
              </div>
              {catError && <p className="text-red-400 text-xs">{catError}</p>}
              {catSuccess && (
                <p className="text-green-400 text-xs flex items-center gap-1.5">
                  <Check size={14} /> {catSuccess}
                </p>
              )}
            </form>

            {/* Active Categories List */}
            <div className="space-y-2">
              <h3 className="text-white text-xs font-semibold uppercase tracking-wider mb-2">
                Active Categories ({categories.length})
              </h3>
              <div className="border border-white/10 rounded-lg divide-y divide-white/5 overflow-hidden">
                {categories.map((c) => {
                  const count = products.filter((p) => p.category === c.key).length;
                  const isDefault = ['pants', 'full_sleeve', 'half_sleeve', 'polo', 'tshirt'].includes(c.key);
                  return (
                    <div key={c.key} className="flex items-center justify-between px-4 py-3 bg-neutral-900/30 hover:bg-neutral-900/50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white text-sm font-medium">{c.label}</p>
                          <span className="text-[10px] bg-white/5 border border-white/10 text-neutral-400 px-1.5 py-0.5 font-mono">
                            {c.key}
                          </span>
                        </div>
                        <p className="text-neutral-500 text-xs mt-0.5">
                          {count} {count === 1 ? 'product' : 'products'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {count === 0 && !isDefault ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c.key, c.label)}
                            title="Delete category"
                            className="text-neutral-500 hover:text-red-400 p-1.5 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : (
                          <span className="text-[10px] text-neutral-600 italic">
                            {count > 0 ? `${count} active` : 'Default'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCategoryManager(false)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs px-5 py-2.5 rounded cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
