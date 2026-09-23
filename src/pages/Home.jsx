import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Tag } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import Logo from '../components/Logo';
import LogoBadge from '../components/LogoBadge';
import { useSettings } from '../contexts/SettingsContext';
import { CATEGORIES } from '../lib/constants';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7 } },
};

const DEFAULT_SECTION_ORDER = ['offers', 'new_collection', 'featured', 'categories'];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [featuredIds, setFeaturedIds] = useState([]);
  const [newCollectionExcluded, setNewCollectionExcluded] = useState([]);
  const [sectionOrder, setSectionOrder] = useState(DEFAULT_SECTION_ORDER);
  const [categories, setCategories] = useState(CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const { settings } = useSettings();

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/featured').then((r) => r.json()).catch(() => []),
      fetch('/api/new-collection').then((r) => r.json()).catch(() => []),
      fetch('/api/homepage-sections').then((r) => r.json()).catch(() => []),
      fetch('/api/categories').then((r) => r.json()).catch(() => null),
    ])
      .then(([productsData, featuredData, excludedData, sectionsData, categoriesData]) => {
        setProducts(Array.isArray(productsData) ? productsData : []);
        setFeaturedIds(Array.isArray(featuredData) ? featuredData : []);
        setNewCollectionExcluded(Array.isArray(excludedData) ? excludedData : []);
        if (Array.isArray(categoriesData) && categoriesData.length > 0) {
          setCategories(categoriesData);
        }
        if (Array.isArray(sectionsData) && sectionsData.length > 0) {
          const order = sectionsData
            .filter((s) => s.enabled !== false)
            .sort((a, b) => a.position - b.position)
            .map((s) => s.section_key);
          if (order.length > 0) setSectionOrder(order);
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const newArrivals = useMemo(
    () =>
      [...products]
        .filter((p) => !newCollectionExcluded.includes(p.id))
        .sort((a, b) => b.id - a.id)
        .slice(0, 8),
    [products, newCollectionExcluded]
  );


  const offers = useMemo(
    () => products.filter((p) => p.original_price && Number(p.original_price) > Number(p.price)),
    [products]
  );

  // Featured Pieces is admin-curated (see Admin Dashboard). Falls back to the
  // first 4 products so the section never looks empty for a brand-new shop.
  const featured = useMemo(() => {
    if (featuredIds.length > 0) {
      return products.filter((p) => featuredIds.includes(p.id));
    }
    return products.slice(0, 4);
  }, [products, featuredIds]);

  const sections = {
    offers: !loading && offers.length > 0 && (
      <section key="offers" id="offers" className="py-16 px-5 md:px-8 max-w-7xl mx-auto scroll-mt-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
          className="mb-10"
        >
          <p className="text-orange-500 uppercase tracking-[0.3em] text-xs mb-3 flex items-center gap-2">
            <Tag size={14} /> Limited Time
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-white">
            {settings.offer_banner_title || 'Special Offers'}
          </h2>
          <p className="text-neutral-400 mt-3 max-w-lg text-sm">
            {settings.offer_banner_subtitle ||
              'Grab these export pieces before the discount runs out — limited stock, real savings.'}
          </p>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {offers.map((p, i) => (
            <ProductCard key={p.id} product={p} onOpen={setActive} index={i} badge="sale" />
          ))}
        </div>
      </section>
    ),
    new_collection: !loading && newArrivals.length > 0 && (
      <section
        key="new_collection"
        id="new-collection"
        className="py-16 px-5 md:px-8 max-w-7xl mx-auto scroll-mt-24"
      >
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <p className="text-orange-500 uppercase tracking-[0.3em] text-xs mb-3 flex items-center gap-2">
              <Sparkles size={14} /> Just Arrived
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-white">New Collection</h2>
          </div>
          <Link to="/shop" className="text-neutral-400 hover:text-orange-500 text-sm hidden md:block">
            View All &rarr;
          </Link>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-6">
          {newArrivals.map((p, i) => (
            <ProductCard key={p.id} product={p} onOpen={setActive} index={i} badge="new" />
          ))}
        </div>
      </section>
    ),
    featured: !loading && featured.length > 0 && (
      <section key="featured" className="py-16 px-5 md:px-8 max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <p className="text-orange-500 uppercase tracking-[0.3em] text-xs mb-3">Handpicked</p>
            <h2 className="font-serif text-3xl md:text-4xl text-white">Featured Pieces</h2>
          </div>
          <Link to="/shop" className="text-neutral-400 hover:text-orange-500 text-sm hidden md:block">
            View All &rarr;
          </Link>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {featured.map((p, i) => (
            <ProductCard key={p.id} product={p} onOpen={setActive} index={i} />
          ))}
        </div>
      </section>
    ),
    categories: (
      <section key="categories" className="py-24 px-5 md:px-8 max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
          className="text-center mb-14"
        >
          <p className="text-orange-500 uppercase tracking-[0.3em] text-xs mb-3">Shop by Category</p>
          <h2 className="font-serif text-3xl md:text-4xl text-white">Find Your Fit</h2>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {categories.map((c, i) => (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Link
                to={`/shop?cat=${c.key}`}
                className="group block border border-white/10 hover:border-orange-500/60 px-4 py-10 text-center transition-colors"
              >
                <span className="text-white text-sm md:text-base tracking-wide group-hover:text-orange-500 transition-colors">
                  {c.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    ),
  };

  return (
    <div className="bg-black min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-16">
        <img
          src="/uploads/asset1.jpg"
          alt="Rainora collection"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="relative z-10 text-center px-6 max-w-3xl"
        >
          <LogoBadge size={88} className="mx-auto mb-6" />
          <p className="text-orange-500 uppercase tracking-[0.3em] text-xs md:text-sm mb-6">
            Men's Export Fashion
          </p>
          <h1>
            <Logo textClass="text-5xl md:text-7xl" className="justify-center" />
          </h1>
          <p className="text-neutral-300 mt-6 text-base md:text-lg">
            Treasury of the finest export collection &mdash; branded denim, shirts &amp; tees, curated
            for the modern man.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 mt-10 bg-orange-500 hover:bg-orange-600 text-black font-semibold px-8 py-3.5 transition-colors"
          >
            Explore Collection <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* Sections render in admin-configurable order (see Admin > Homepage Sections) */}
      {sectionOrder.map((key) => sections[key] || null)}

      {/* About — always fixed at the end */}
      <section id="about" className="py-24 px-5 md:px-8 max-w-4xl mx-auto text-center">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-100px' }} variants={fadeUp}>
          <p className="text-orange-500 uppercase tracking-[0.3em] text-xs mb-4">Our Story</p>
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-6">Crafted for the Export Standard</h2>
          <p className="text-neutral-400 leading-relaxed">
            RAINORA brings you genuine export-quality menswear &mdash; branded denim pants, full &amp;
            half sleeve shirts, polos and tees sourced directly from surplus export stock. Every piece
            is hand-checked for quality, so you get international brands at honest prices, right here
            in Chattogram.
          </p>
        </motion.div>
      </section>

      <Footer />
      <ProductModal product={active} onClose={() => setActive(null)} />
    </div>
  );
}
