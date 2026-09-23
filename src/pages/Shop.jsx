import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import { CATEGORIES } from '../lib/constants';

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCat = searchParams.get('cat') || 'all';

  const fetchProducts = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()).catch(() => null),
    ])
      .then(([prodData, catData]) => {
        if (Array.isArray(prodData)) setProducts(prodData);
        else setError('Failed to load products.');
        if (Array.isArray(catData) && catData.length > 0) setCategories(catData);
      })
      .catch(() => setError('Failed to load products.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = useMemo(() => {
    if (activeCat === 'all') return products;
    return products.filter((p) => p.category === activeCat);
  }, [products, activeCat]);

  return (
    <div className="bg-black min-h-screen">
      <Header />

      <section className="pt-32 pb-10 px-5 md:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <p className="text-orange-500 uppercase tracking-[0.3em] text-xs mb-3">The Collection</p>
          <h1 className="font-serif text-4xl md:text-5xl text-white">Shop RAINORA</h1>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-3 mb-14">
          <button
            onClick={() => setSearchParams({})}
            className={`px-4 py-2 text-xs uppercase tracking-wide border transition-colors ${
              activeCat === 'all'
                ? 'bg-orange-500 border-orange-500 text-black font-semibold'
                : 'border-white/20 text-neutral-300 hover:border-orange-500'
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setSearchParams({ cat: c.key })}
              className={`px-4 py-2 text-xs uppercase tracking-wide border transition-colors ${
                activeCat === c.key
                  ? 'bg-orange-500 border-orange-500 text-black font-semibold'
                  : 'border-white/20 text-neutral-300 hover:border-orange-500'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-neutral-500 py-20">Loading collection...</div>
        )}
        {error && <div className="text-center text-red-500 py-20">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center text-neutral-500 py-20">No products in this category yet.</div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 pb-16">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} onOpen={setActive} index={i} />
            ))}
          </div>
        )}
      </section>

      <Footer />
      <ProductModal product={active} onClose={() => setActive(null)} />
    </div>
  );
}
