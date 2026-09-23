import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingBag, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../contexts/CartContext';
import CartDrawer from './CartDrawer';
import Logo from './Logo';
import LogoBadge from './LogoBadge';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { count, total, lastAdded, toastVisible, dismissToast } = useCart();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop' },
    { to: '/#new-collection', label: 'New' },
    { to: '/#offers', label: 'Offers' },
    { to: '/#about', label: 'About' },
    { to: '/#contact', label: 'Contact' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled ? 'bg-black/95 backdrop-blur border-b border-white/10 py-2' : 'bg-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between relative">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoBadge size={38} />
            <Logo />
          </Link>

          <nav className="hidden md:flex items-center gap-10">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.to}
                className="text-sm tracking-wide text-neutral-300 hover:text-orange-500 transition-colors uppercase"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 text-white hover:text-orange-500 transition-colors px-2.5 py-1.5 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer"
              aria-label="Open cart"
            >
              <div className="relative flex items-center justify-center">
                <ShoppingBag size={21} />
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-black text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </div>
              {count > 0 && (
                <div className="hidden sm:flex flex-col items-start leading-none pr-1">
                  <span className="text-[10px] uppercase text-neutral-400 font-medium tracking-wider">Bag</span>
                  <span className="text-xs font-semibold text-orange-500 font-mono mt-0.5">{total}TK</span>
                </div>
              )}
            </button>

            <button
              className="md:hidden text-white cursor-pointer p-1"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Added to Bag Toast Notification */}
          <AnimatePresence>
            {toastVisible && lastAdded && (
              <motion.div
                initial={{ opacity: 0, y: -15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full right-5 md:right-8 mt-2 z-50 w-76 sm:w-84 bg-neutral-950/95 backdrop-blur-md border border-orange-500/40 shadow-2xl p-3.5 rounded-lg text-left"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                  <div className="flex items-center gap-1.5 text-xs text-orange-400 font-medium">
                    <CheckCircle size={14} className="text-orange-500" />
                    <span>Added to Bag</span>
                  </div>
                  <button
                    onClick={dismissToast}
                    className="text-neutral-500 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex gap-3 items-center">
                  <img
                    src={lastAdded.product.image_url}
                    alt={lastAdded.product.name}
                    className="w-11 h-13 object-cover rounded border border-white/10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-medium truncate">{lastAdded.product.name}</p>
                    <p className="text-neutral-400 text-[11px] mt-0.5">
                      Size: <span className="text-orange-400 font-semibold">{lastAdded.size}</span> &middot; Qty: {lastAdded.qty}
                    </p>
                    <p className="text-white text-xs font-mono font-semibold mt-0.5">
                      {lastAdded.product.price * lastAdded.qty}TK
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-neutral-400">
                    Subtotal: <span className="text-white font-mono font-semibold">{total}TK</span>
                  </span>
                  <button
                    onClick={() => {
                      dismissToast();
                      setCartOpen(true);
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-black text-xs font-semibold px-3 py-1 rounded transition-colors cursor-pointer"
                  >
                    View Bag &rarr;
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {menuOpen && (
          <div className="md:hidden mt-3 border-t border-white/10 bg-black/95 px-5 py-4 flex flex-col gap-4">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.to}
                className="text-sm tracking-wide text-neutral-300 hover:text-orange-500 uppercase"
              >
                {l.label}
              </a>
            ))}
          </div>
        )}
      </header>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
