import { motion } from 'framer-motion';
import { SIZES, isSizeAvailable, totalStock } from '../lib/constants';

export default function ProductCard({ product, onOpen, index = 0, badge }) {
  const stock = product.sizes || {};
  const outOfStock = totalStock(stock) === 0;
  const onSale = !!(product.original_price && product.original_price > product.price);
  const resolvedBadge = badge || (onSale ? 'sale' : null);
  const discountPct = onSale
    ? Math.round(100 - (product.price / product.original_price) * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: (index % 6) * 0.06 }}
      onClick={() => onOpen(product)}
      className="group cursor-pointer"
    >
      <div className="relative overflow-hidden bg-neutral-900 aspect-[3/4]">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {outOfStock && (
          <span className="absolute top-3 left-3 bg-neutral-800 text-neutral-300 text-[10px] font-bold px-2 py-1 uppercase tracking-wide">
            Sold Out
          </span>
        )}
        {!outOfStock && resolvedBadge === 'new' && (
          <span className="absolute top-3 left-3 bg-orange-500 text-black text-[10px] font-bold px-2 py-1 uppercase tracking-wide">
            New
          </span>
        )}
        {!outOfStock && resolvedBadge === 'sale' && (
          <span className="absolute top-3 left-3 bg-orange-500 text-black text-[10px] font-bold px-2 py-1 uppercase tracking-wide">
            {discountPct ? `-${discountPct}%` : 'Sale'}
          </span>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      </div>
      <div className="pt-3">
        <p className="text-white text-sm tracking-wide">{product.name}</p>
        <p className="text-neutral-500 text-xs mt-0.5">{product.brand}</p>
        <p className="text-neutral-600 text-xs mt-0.5 line-clamp-1">{product.description}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-orange-500 text-sm font-medium">{product.price}TK</span>
          {onSale && (
            <span className="text-neutral-600 text-xs line-through">{product.original_price}TK</span>
          )}
        </div>
        <div className="flex gap-1.5 mt-2">
          {SIZES.map((s) => (
            <span
              key={s}
              className={`text-[10px] px-1.5 py-0.5 border ${
                isSizeAvailable(stock, s)
                  ? 'border-orange-500/60 text-white font-bold'
                  : 'border-white/10 text-neutral-700 line-through'
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
