import { useEffect, useState, useMemo } from 'react';
import ProductCard from './ProductCard';

export default function RelatedProducts({ currentProduct, onSelectProduct }) {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAllProducts(data);
      })
      .catch((err) => console.error('Error fetching related products:', err))
      .finally(() => setLoading(false));
  }, []);

  const related = useMemo(() => {
    if (!currentProduct || allProducts.length === 0) return [];

    const candidates = allProducts.filter((p) => p.id !== currentProduct.id);

    // Score based on Category, Brand, and Price Proximity
    const scored = candidates.map((p) => {
      let score = 0;
      if (p.category && currentProduct.category && p.category === currentProduct.category) {
        score += 10;
      }
      if (p.brand && currentProduct.brand && p.brand.toLowerCase() === currentProduct.brand.toLowerCase()) {
        score += 5;
      }
      if (p.price && currentProduct.price) {
        const diffRatio = Math.abs(p.price - currentProduct.price) / currentProduct.price;
        if (diffRatio <= 0.3) {
          score += 4;
        } else if (diffRatio <= 0.5) {
          score += 2;
        }
      }
      return { product: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map((s) => s.product);
  }, [currentProduct, allProducts]);

  if (loading || related.length === 0) return null;

  return (
    <div className="mt-14 pt-10 border-t border-white/10 text-left">
      <div className="mb-6">
        <p className="text-orange-500 uppercase tracking-[0.25em] text-[11px] font-semibold mb-1">
          Curated Recommendations
        </p>
        <h3 className="text-white text-xl md:text-2xl font-serif">You May Also Like</h3>
        <p className="text-neutral-500 text-xs mt-1">
          Pieces sharing similar cuts, fabrics, and styling.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        {related.map((p, idx) => (
          <ProductCard
            key={p.id}
            product={p}
            index={idx}
            onOpen={(item) => {
              if (onSelectProduct) onSelectProduct(item);
            }}
          />
        ))}
      </div>
    </div>
  );
}
